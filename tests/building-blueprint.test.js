import {it,expect} from 'vitest';
import {buildingBlueprint} from '../src/building-blueprint.js';
import {createBuildingState,drawBuildingWord,confirmBuildingWord,beginBuildingChallenge,chooseBuildingChallengeWord,restoreBuilding,visibleBuildingWords} from '../src/building-core.js';
const words=n=>Array.from({length:n},(_,i)=>({id:`w${i}`,word:String.fromCodePoint(0x4e00+i)}));
it('every selected word owns exactly one complete front-facing brick at sparse and full counts',()=>{
  for(const type of ['house','bridge','tower','building'])for(const variant of [0,1,2,3])for(const n of [1,3,9,16]){
    const input=words(n),model=buildingBlueprint(type,{words:input,variant}),bricks=model.blocks.filter(b=>b.wordId);
    expect(bricks.map(b=>b.wordId).sort()).toEqual(input.map(w=>w.id).sort());expect(new Set(bricks.map(b=>b.wordId)).size).toBe(n);
    expect(model.blocks.every(b=>b.size.every(v=>Number.isFinite(v)&&v>0)&&b.position.every(Number.isFinite)&&b.position[1]>=b.size[1]/2-.01)).toBe(true);
    for(const brick of bricks){expect(brick.word).toBe(input.find(w=>w.id===brick.wordId).word);expect(brick.kind).toBe('box');}
    input[0].word='改';expect(bricks[0].word).not.toBe('改');expect(Object.isFrozen(model.blocks)).toBe(true);
  }
});
it('each building type has four geometrically different silhouettes, not only different paint',()=>{
  for(const type of ['house','bridge','tower','building']){
    const models=[0,1,2,3].map(variant=>buildingBlueprint(type,{words:words(9),variant}));
    expect(new Set(models.map(m=>JSON.stringify(m.blocks.map(b=>[b.kind,b.size,b.position])))).size).toBe(4);expect(new Set(models.map(m=>m.name)).size).toBe(4);
  }
});
it('safe or dangerous reads remove only their own brick, restoration puts all bricks back, and new challenges start whole',()=>{
  let state=createBuildingState({words:words(4),variant:3,sentence:{id:'s',sentence:'我喜欢中文。'},random:()=>.5});expect(state.variant).toBe(3);expect(visibleBuildingWords(state)).toEqual([]);
  state=confirmBuildingWord(drawBuildingWord(state));expect(visibleBuildingWords(state)).toEqual(state.builtIds);
  for(let i=1;i<4;i++)state=confirmBuildingWord(drawBuildingWord(state));state=beginBuildingChallenge(state,{random:()=>.5});
  const ids=state.words.map(w=>w.id),safe=ids.find(id=>id!==state.dangerId);state=chooseBuildingChallengeWord(state,safe);expect(visibleBuildingWords(state)).toEqual(ids.filter(id=>id!==safe));expect(visibleBuildingWords(chooseBuildingChallengeWord(state,safe))).toEqual(visibleBuildingWords(state));
  state=chooseBuildingChallengeWord(state,state.dangerId);expect(state.phase).toBe('collapsed');expect(visibleBuildingWords(state)).toEqual(ids.filter(id=>!state.checkedIds.includes(id)));
  state=restoreBuilding(state);expect(visibleBuildingWords(state)).toEqual(ids);state=beginBuildingChallenge(state);expect(visibleBuildingWords(state)).toEqual(ids);expect(state.variant).toBe(3);
});
