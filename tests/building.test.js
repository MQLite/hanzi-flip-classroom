import {describe,it,expect} from 'vitest';
import {createBuildingState,drawBuildingWord,confirmBuildingWord,beginBuildingChallenge,restoreBuilding,chooseBuildingChallengeWord} from '../src/building-core.js';
const words=()=>['苹果','香蕉','西瓜','牛奶'].map((word,i)=>({id:`w${i}`,word,pinyin:'test'}));
const sentence={id:'s1',sentence:'我爱老师。',source:'本课课文'};
const fresh=(extra={})=>createBuildingState({words:words(),structure:'house',sentence,...extra});
function built(state=fresh()){for(let i=0;i<state.words.length;i++)state=confirmBuildingWord(drawBuildingWord(state));return state;}
describe('lesson building and sentence rescue',()=>{
  it('checks a freely chosen read word immediately and never reuses a collected safe card',()=>{
    const ready=built();expect(chooseBuildingChallengeWord(ready,'unknown')).toBe(ready);
    const direct=chooseBuildingChallengeWord(ready,'w0');expect(direct.checkedIds).toEqual(['w0']);expect(direct.pendingId).toBeNull();
    let state=beginBuildingChallenge(ready,{random:()=>.5});const safe=state.words.find(w=>w.id!==state.dangerId).id;
    state=chooseBuildingChallengeWord(state,safe);expect(state.phase).toBe('challenge');expect(state.checkedIds).toEqual([safe]);expect(chooseBuildingChallengeWord(state,safe)).toBe(state);
    state=chooseBuildingChallengeWord(state,state.dangerId);expect(state.phase).toBe('collapsed');expect(state.pendingId).toBeNull();expect(chooseBuildingChallengeWord(state,'w3')).toBe(state);
  });
  it('accepts four structures, validates selection and snapshots words/sentences',()=>{
    for(const structure of ['house','bridge','tower','building'])expect(fresh({structure}).structure).toBe(structure);
    for(const extra of [{structure:'castle'},{words:[]},{words:Array.from({length:17},(_,i)=>({id:String(i),word:'字'}))},{words:[...words(),words()[0]]}])expect(()=>fresh(extra)).toThrow();
    const input=words(),phrase={...sentence},state=fresh({words:input,sentence:phrase});input[0].word='改';phrase.sentence='改';
    expect(state.words.find(w=>w.id==='w0').word).toBe('苹果');expect(state.sentence.sentence).toBe('我爱老师。');expect(Object.isFrozen(state.words)).toBe(true);
  });
  it('requires draw then teacher confirmation, adds only one word and does not advance on repeated confirmation',()=>{
    let state=fresh();expect(confirmBuildingWord(state)).toBe(state);state=drawBuildingWord(state);
    expect(state.pendingId).toBeTruthy();expect(drawBuildingWord(state)).toBe(state);expect(state.builtIds).toHaveLength(0);
    state=confirmBuildingWord(state);expect(state.builtIds).toHaveLength(1);expect(state.pendingId).toBeNull();expect(confirmBuildingWord(state)).toBe(state);
    expect(beginBuildingChallenge(state)).toBe(state);state=built(state);expect(state.phase).toBe('built');expect(new Set(state.builtIds).size).toBe(4);expect(drawBuildingWord(state)).toBe(state);
  });
  it('random challenge has one hidden dangerous word, safe words are checked once and first danger collapses',()=>{
    let state=beginBuildingChallenge(built(),{random:()=>.5});expect(state.phase).toBe('challenge');expect(state.dangerId).toBeTruthy();
    const ids=state.challengeWords.map(w=>w.id);expect(new Set(ids).size).toBe(4);
    for(const id of ids){state=drawBuildingWord(state);expect(state.pendingId).toBe(id);const wasDanger=id===state.dangerId;state=confirmBuildingWord(state);expect(confirmBuildingWord(state)).toBe(state);if(wasDanger)break;expect(state.phase).toBe('challenge');}
    expect(state.phase).toBe('collapsed');expect(state.builtIds).toHaveLength(4);expect(drawBuildingWord(state)).toBe(state);expect(beginBuildingChallenge(state)).toBe(state);
  });
  it('restores only after collapse, retains the exact lesson sentence and supports a fresh challenge',()=>{
    const original=built();expect(restoreBuilding(original)).toBe(original);let state=beginBuildingChallenge(original,{random:()=>0});
    while(state.phase==='challenge')state=confirmBuildingWord(drawBuildingWord(state));
    state=restoreBuilding(state);expect(state.phase).toBe('restored');expect(state.sentence).toEqual(sentence);expect(state.builtIds).toHaveLength(4);expect(restoreBuilding(state)).toBe(state);
    state=beginBuildingChallenge(state,{random:()=>.8});expect(state.phase).toBe('challenge');expect(state.checkedIds).toEqual([]);expect(state.pendingId).toBeNull();
  });
  it('permits construction without a sentence but explains/disables the challenge, and creating again clears progress',()=>{
    const state=built(fresh({sentence:null}));expect(state.phase).toBe('built');expect(beginBuildingChallenge(state)).toBe(state);
    const next=fresh({words:state.words,structure:state.structure,sentence:state.sentence});expect(next.builtIds).toEqual([]);expect(next.phase).toBe('build');
  });
});
