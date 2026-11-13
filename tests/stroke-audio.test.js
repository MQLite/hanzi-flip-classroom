import {it,expect,vi} from 'vitest';
import {createStrokeAudio} from '../src/stroke-audio.js';
import fs from 'node:fs';
it('loads the corrected pronunciation revision instead of a stale same-name recording',async()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../public/audio/stroke-names/manifest.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));let source;
  const audio=createStrokeAudio({createAudio:url=>{source=url;return {pause(){},currentTime:0,play:()=>Promise.resolve()};}});await audio.play('撇折');const url=new URL(source,'https://example.test/');expect(decodeURIComponent(url.pathname)).toContain('/撇折.wav');expect(url.searchParams.get('v')).toBe(manifest.assetVersion);audio.dispose();
});
it('cancels preceding and stale play promises, and suppresses muted audio',async()=>{
  const clips=[];const audio=createStrokeAudio({createAudio:url=>{let resolve;const clip={url,pause:vi.fn(),currentTime:0,play:vi.fn(()=>new Promise(r=>resolve=r)),finish:()=>resolve()};clips.push(clip);return clip;}});
  const first=audio.play('横');const second=audio.play('竖');expect(clips[0].pause).toHaveBeenCalled();clips[0].finish();await first;expect(clips[0].pause).toHaveBeenCalledTimes(2);audio.stop();clips[1].finish();await second;expect(clips[1].pause).toHaveBeenCalled();audio.setMuted(true);await audio.play('点');expect(clips).toHaveLength(2);audio.dispose();
});
it('handles rejected playback and rejects unknown names/teardown',async()=>{
  const createAudio=vi.fn(()=>({pause:vi.fn(),currentTime:0,play:()=>Promise.reject(Error('blocked'))}));const audio=createStrokeAudio({createAudio});expect(await audio.play('横')).toBe(false);expect(await audio.play('../secret')).toBe(false);audio.dispose();await audio.play('横');expect(createAudio).toHaveBeenCalledTimes(1);
});
it('waits for the actual end and releases a stalled or cancelled pronunciation',async()=>{
  vi.useFakeTimers();
  const clips=[];
  const audio=createStrokeAudio({createAudio:()=>{
    const clip=new EventTarget();
    clip.play=()=>Promise.resolve();clip.pause=vi.fn();clips.push(clip);
    return clip;
  }});
  try{
    const done=vi.fn();
    const first=audio.play('横',{waitForEnd:true}).then(done);
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
    clips[0].dispatchEvent(new Event('ended'));
    await first;
    expect(done).toHaveBeenCalledWith(true);
    const cancelled=audio.play('竖',{waitForEnd:true});
    const stalled=audio.play('点',{waitForEnd:true});
    expect(await cancelled).toBe(false);
    await vi.runAllTimersAsync();
    expect(await stalled).toBe(false);
    expect(clips[2].pause).toHaveBeenCalled();
  }finally{
    audio.dispose();
    vi.useRealTimers();
  }
});
