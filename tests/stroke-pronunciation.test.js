import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const audioDir = new URL('public/audio/stroke-names/', root);
const readJson = url => JSON.parse(readFileSync(url, 'utf8').replace(/^\uFEFF/, ''));
const names = readJson(new URL('src/data/character-forms.json', root)).strokeNames;
const manifest = readJson(new URL('manifest.json', audioDir));

function inspectWave(bytes) {
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
  expect(bytes.toString('ascii', 8, 12)).toBe('WAVE');
  let format;
  let samples;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    expect(start + size).toBeLessThanOrEqual(bytes.length);
    if (kind === 'fmt ') format = {
      encoding: bytes.readUInt16LE(start), channels: bytes.readUInt16LE(start + 2),
      sampleRate: bytes.readUInt32LE(start + 4), bits: bytes.readUInt16LE(start + 14),
    };
    if (kind === 'data') samples = bytes.subarray(start, start + size);
    offset = start + size + (size % 2);
  }
  expect(format.encoding).toBe(1);
  expect(format.bits).toBe(16);
  expect(samples.length).toBeGreaterThan(format.sampleRate * format.channels * 2 * 0.15);
  let power = 0;
  let peak = 0;
  for (let offset = 0; offset < samples.length; offset += 2) {
    const sample = samples.readInt16LE(offset) / 32768;
    power += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  const rms = Math.sqrt(power / (samples.length / 2));
  expect(rms).toBeGreaterThan(0.005);
  expect(peak).toBeGreaterThan(0.05);
  return { durationSeconds: samples.length / (format.sampleRate * format.channels * 2), rms, peak };
}

function assertPronunciationPlan(plan) {
  expect(plan.names).toEqual(names);
  expect(plan.pronunciation.affectedNames).toEqual(names.filter(name => name.includes('撇')));
  expect(plan.pronunciation.sources.every(source => source.url.startsWith('https://learn.microsoft.com/'))).toBe(true);
  expect(plan.recordings.map(recording => recording.name)).toEqual(names);
  for (const recording of plan.recordings) {
    expect(recording.ssml).toContain('xml:lang="zh-CN"');
    expect(recording.ssml.replace(/<[^>]+>/g, '')).toBe(recording.name);
    const phones = [...recording.ssml.matchAll(/<phoneme alphabet="([^"]+)" ph="([^"]+)">([^<]+)<\/phoneme>/g)];
    expect(phones).toHaveLength([...recording.name].filter(character => character === '撇').length);
    for (const [, alphabet, phonemes, text] of phones) {
      expect(alphabet).toBe('x-microsoft-sapi');
      expect(text).toBe('撇');
      // The numbered Mandarin phone is the executable tone control, not a label in metadata.
      expect(phonemes.split(/\s+/)).toEqual(['pie', '3']);
    }
  }
}

describe('recorded Mandarin stroke pronunciation', () => {
  it('records explicit third-tone phonemes for every occurrence of 撇, retaining displayed names', () => {
    assertPronunciationPlan(manifest);
  });

  it.skipIf(process.platform !== 'win32')('rebuilds the same SSML from the generator without requiring an installed voice', () => {
    const output = execFileSync('pwsh', ['-NoProfile', '-File', fileURLToPath(new URL('scripts/prepare-stroke-audio.ps1', root)), '-PlanOnly'], { encoding: 'utf8' });
    const plan = JSON.parse(output.replace(/^\uFEFF/, ''));
    assertPronunciationPlan(plan);
    expect(plan.recordings.map(recording => recording.ssml)).toEqual(manifest.recordings.map(recording => recording.ssml));
  });

  it('ships exactly the catalog WAV set with non-silent PCM and matching generation hashes', () => {
    expect(readdirSync(audioDir).filter(file => file.endsWith('.wav')).sort()).toEqual(names.map(name => `${name}.wav`).sort());
    for (const recording of manifest.recordings) {
      const bytes = readFileSync(new URL(`${recording.name}.wav`, audioDir));
      const metrics = inspectWave(bytes);
      expect(recording.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
      expect(recording.bytes).toBe(bytes.length);
      expect(recording.validation.durationSeconds).toBeCloseTo(metrics.durationSeconds, 6);
      expect(recording.validation.rms).toBeCloseTo(metrics.rms, 6);
      expect(recording.validation.peak).toBeCloseTo(metrics.peak, 6);
    }
  });
});
