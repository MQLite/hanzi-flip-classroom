import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('classroom sample bank', () => {
  it('uses the modern teaching radical for 行 rather than the source Kangxi index', async () => {
    const { DEFAULT_QUESTIONS } = await import('../src/data.js');
    expect(DEFAULT_QUESTIONS.find(q => q.character === '行').radical).toBe('彳');
  });
  it('provides twelve complete distinct questions for each of four grades', async () => {
    expect(existsSync('src/data.js'), 'built-in bank exists').toBe(true);
    const { DEFAULT_QUESTIONS } = await import('../src/data.js');
    expect(DEFAULT_QUESTIONS).toHaveLength(48);
    expect(new Set(DEFAULT_QUESTIONS.map(q => q.id)).size).toBe(48);
    for (const grade of [1, 2, 3, 4]) {
      const questions = DEFAULT_QUESTIONS.filter(q => q.grade === grade);
      expect(questions).toHaveLength(12);
      expect(new Set(questions.map(q => q.character)).size).toBe(12);
      for (const q of questions) {
        expect([...q.character]).toHaveLength(1);
        expect(q.pinyin).toBeTruthy();
        expect(q.words).toHaveLength(2);
        expect(q.words.every(w => w.includes(q.character))).toBe(true);
        expect(q.sentence).toContain(q.character);
        expect(q.radical).toBeTruthy();
      }
    }
  });
  it('ships matching stroke vectors and source license for every built-in character', async () => {
    expect(existsSync('src/data.js'), 'built-in bank exists').toBe(true);
    const { DEFAULT_QUESTIONS } = await import('../src/data.js');
    for (const q of DEFAULT_QUESTIONS) {
      const data = JSON.parse(readFileSync(`public/strokes/${q.character}.json`, 'utf8'));
      expect(data.strokes.length, q.character).toBe(q.strokeCount);
      expect(data.medians.length, q.character).toBe(q.strokeCount);
      expect(data.radStrokes?.every(n => n >= 0 && n < q.strokeCount) ?? true).toBe(true);
    }
    expect(readFileSync('public/licenses/ARPHICPL.TXT', 'utf8')).toContain('Arphic');
  });
});
