import {describe,it,expect} from 'vitest';
import {createPoisonState,beginPoisonHiding,togglePoisonWord,sealPoison,beginPoisonReading,selectPoisonCard,cancelPoisonCard,revealPoisonCard,coverPoisonSecrets,nextPoisonRound} from '../src/poison-core.js';
import {getPoisonPool} from '../src/poison-vocabulary.js';
import {PARADISE_QUESTIONS,ZHONGWEN_QUESTIONS} from '../src/curriculum.js';
const words=()=>['苹果','香蕉','西瓜','牛奶','面包','饺子'].map((word,i)=>({id:`w${i}`,word,pinyin:'test'}));
const fresh=(extra={})=>createPoisonState({words:words(),poisonCount:2,random:()=>.5,...extra});
function reading(state=fresh(),poisons=['w0','w1']){state=beginPoisonHiding(state);for(const id of poisons)state=togglePoisonWord(state,id);return beginPoisonReading(sealPoison(state));}
const reveal=(state,id)=>revealPoisonCard(selectPoisonCard(state,id));
describe('witch poison round rules',()=>{
  it('snapshots inputs, validates cards/count and starts behind a cover',()=>{
    const input=words(),state=fresh({words:input});input[0].word='改';
    expect(state.words.find(w=>w.id==='w0').word).toBe('苹果');expect(state.phase).toBe('cover');expect(Object.isFrozen(state.words)).toBe(true);
    for(const extra of [{poisonCount:0},{poisonCount:3},{words:words().slice(0,2)},{words:[]}])expect(()=>fresh(extra)).toThrow();
    expect(()=>fresh({words:[...words(),words()[0]]})).toThrow();
  });
  it('only permits secret selection during hide and requires the exact poison count',()=>{
    let state=fresh();expect(togglePoisonWord(state,'w0').poisonIds).toEqual([]);
    state=beginPoisonHiding(state);state=togglePoisonWord(state,'w0');expect(sealPoison(state).phase).toBe('hide');
    state=togglePoisonWord(state,'w1');state=togglePoisonWord(state,'w2');expect(state.poisonIds).toEqual(['w0','w1']);
    state=sealPoison(state);expect(state.phase).toBe('ready');expect(state.feedback.message).not.toContain('苹果');
    expect(togglePoisonWord(state,'w2').poisonIds).toEqual(['w0','w1']);expect(selectPoisonCard(state,'w3').pendingId).toBeNull();expect(beginPoisonReading(state).phase).toBe('read');
  });
  it('requires a separate teacher reveal and supports correcting/changing a selected word',()=>{
    let state=selectPoisonCard(reading(),'w3');expect(state.results).toHaveLength(0);expect(state.pendingId).toBe('w3');
    const canceled=cancelPoisonCard(state);expect(canceled.pendingId).toBeNull();expect(canceled.results).toHaveLength(0);
    state=revealPoisonCard(state);expect(state.results).toEqual([{cardId:'w3',poison:false}]);expect(state.phase).toBe('read');
    expect(revealPoisonCard(state).results).toHaveLength(1);expect(selectPoisonCard(state,'w3').pendingId).toBeNull();
  });
  it('ends on the first poison even when two were hidden, without elimination state',()=>{
    const state=reveal(reading(),'w0');expect(state.phase).toBe('complete');expect(state.results).toEqual([{cardId:'w0',poison:true}]);
    expect(state).not.toHaveProperty('outIds');expect(state).not.toHaveProperty('players');expect(reveal(state,'w1').results).toHaveLength(1);
  });
  it('clears prior choices/results for a new witch and retains the lesson words',()=>{
    const old=reveal(reading(),'w0'),state=nextPoisonRound(old);
    expect(state.round).toBe(2);expect(state.phase).toBe('cover');expect(state.poisonCount).toBe(2);expect(state.results).toEqual([]);expect(state.poisonIds).toEqual([]);expect(state.pendingId).toBeNull();
    expect(new Set(state.words.map(w=>w.id))).toEqual(new Set(old.words.map(w=>w.id)));
  });
  it('covers unfinished secrets on interruptions, retaining the private choice',()=>{
    const hidden=togglePoisonWord(beginPoisonHiding(fresh()),'w0'),covered=coverPoisonSecrets(hidden);
    expect(covered.phase).toBe('cover');expect(covered.poisonIds).toEqual(['w0']);expect(beginPoisonHiding(covered).phase).toBe('hide');
    const state=reading();expect(coverPoisonSecrets(state)).toBe(state);
  });
  it('rejects unknown cards, repeated reveals and premature phase changes',()=>{
    const state=reading();expect(selectPoisonCard(state,'missing').pendingId).toBeNull();expect(revealPoisonCard(state).results).toEqual([]);
    expect(nextPoisonRound(state)).toBe(state);expect(beginPoisonReading(fresh()).phase).toBe('cover');
  });
});
describe('poison lesson vocabulary',()=>{
  it('supports small lessons and preserves lesson boundaries and bank data',()=>{
    const bank=[...PARADISE_QUESTIONS,...ZHONGWEN_QUESTIONS],before=JSON.stringify(bank),pool=getPoisonPool({source:'paradise',stage:'1A',lesson:1},bank);
    expect(pool.words.length).toBeGreaterThanOrEqual(2);expect(pool.label).toContain('第1课');expect(pool.words.some(w=>w.word==='澳大利亚')).toBe(false);expect(pool.note).not.toContain('不足9');expect(JSON.stringify(bank)).toBe(before);
    expect(getPoisonPool({source:'paradise',stage:'2A',lesson:1},bank).words.some(w=>w.word==='加拿大')).toBe(true);
  });
});
