import {it,expect} from 'vitest';
import {createBuildingState,drawBuildingWord,confirmBuildingWord,chooseBuildingChallengeWord,restoreBuilding,visibleBuildingWords} from '../src/building-core.js';
import {buildingBlueprint} from '../src/building-blueprint.js';
import {buildingSupport} from '../src/building-support.js';
import {blueprintBlockVisible} from '../src/building-blueprint-art.js';

const words=n=>Array.from({length:n},(_,i)=>({id:`w${i}`,word:String.fromCodePoint(0x4e00+i)}));
function built({n=4,structure='house',variant=0}={}){
  let state=createBuildingState({words:words(n),structure,variant,sentence:{id:'s',sentence:'我喜欢中文。'},random:()=>.999});
  for(let i=0;i<n;i++)state=confirmBuildingWord(drawBuildingWord(state));return state;
}
it('removing a lower brick drops the word above it while the independent column stays standing',()=>{
  const next=chooseBuildingChallengeWord(built(),'w0');
  expect(next.phase).toBe('collapsed');
  expect(next.fallenIds).toEqual(['w2']);
  expect(visibleBuildingWords(next)).toEqual(['w1','w2','w3']);
  expect(next.checkedIds).toEqual(['w0']);
  expect(chooseBuildingChallengeWord(next,'w1')).toBe(next);
});
it('top-down removal can clear a round honestly and sentence rescue restores every word',()=>{
  let state=built();
  for(const id of ['w2','w3','w0','w1']){
    state=chooseBuildingChallengeWord(state,id);
    expect(state.fallenIds).toEqual([]);
    expect(state.phase).toBe(id==='w1'?'cleared':'challenge');
  }
  expect(visibleBuildingWords(state)).toEqual([]);
  state=restoreBuilding(state);expect(state.phase).toBe('restored');
  expect(visibleBuildingWords(state)).toEqual(['w0','w1','w2','w3']);
  expect(state.detachedBlockIndices).toEqual([]);
});
it('cleans up detached cosmetic pieces while keeping fallen word bricks and the independent column visible',()=>{
  const state=chooseBuildingChallengeWord(built(),'w0'),blueprint=buildingBlueprint(state.structure,{words:state.words,variant:state.variant});
  const roof=blueprint.blocks.findIndex(b=>b.kind==='gable'),fallen=blueprint.blocks.findIndex(b=>b.wordId==='w2'),standing=blueprint.blocks.findIndex(b=>b.wordId==='w3');
  expect(state.detachedBlockIndices).toContain(roof);expect(blueprintBlockVisible(blueprint.blocks[roof],state,roof)).toBe(false);
  expect(blueprintBlockVisible(blueprint.blocks[fallen],state,fallen)).toBe(true);expect(blueprintBlockVisible(blueprint.blocks[standing],state,standing)).toBe(true);
  expect(blueprintBlockVisible(blueprint.blocks[roof],restoreBuilding(state),roof)).toBe(true);
});
it('every 1–16 word count in all sixteen silhouettes starts supported',()=>{
  const failures=[];
  for(const structure of ['house','bridge','tower','building'])for(let variant=0;variant<4;variant++)for(let n=1;n<=16;n++){
    const blueprint=buildingBlueprint(structure,{words:words(n),variant}),support=buildingSupport(blueprint);
    if(support.detachedBlockIndices.length)failures.push({structure,variant,n,unsupported:support.detachedBlockIndices.map(i=>({index:i,word:blueprint.blocks[i].wordId,position:blueprint.blocks[i].position}))});
  }
  expect(failures).toEqual([]);
});
it('all silhouettes and word counts reach a real round end and sentence restoration without deadlocks',()=>{
  for(const structure of ['house','bridge','tower','building'])for(let variant=0;variant<4;variant++)for(let n=1;n<=16;n++){
    let state=built({n,structure,variant});const originalIds=state.words.map(w=>w.id);
    for(const id of originalIds){state=chooseBuildingChallengeWord(state,id);if(['collapsed','cleared'].includes(state.phase))break;}
    expect(['collapsed','cleared']).toContain(state.phase);expect(state.pendingId).toBeNull();expect(new Set(state.checkedIds).size).toBe(state.checkedIds.length);
    state=restoreBuilding(state);expect(state.phase).toBe('restored');expect(visibleBuildingWords(state)).toEqual(originalIds);expect(state.fallenIds).toEqual([]);
  }
});
const b=(id,x,y,w=1,h=1,extra={})=>({wordId:id,size:[w,h,1],position:[x,y,0],...extra});
it('a roof spanning two piers falls when its center loses support, while the surviving pier stands',()=>{
  const blueprint={blocks:[b(null,0,.1,5,.2,{reveal:'base'}),b('left',-1,.7),b('right',1,.7),b('roof',0,1.7,3)]};
  expect(buildingSupport(blueprint).fallenIds).toEqual([]);
  expect(buildingSupport(blueprint,{removedWordIds:['left']})).toEqual({standingBlockIndices:[0,2],detachedBlockIndices:[3],fallenIds:['roof']});
});
it('joined bridge segments span real piers and a cut only drops the unbalanced unsupported segment',()=>{
  const blueprint={blocks:[b(null,-1,.5,.5,1,{reveal:'base'}),b(null,1,.5,.5,1,{reveal:'base'}),...[-1,0,1].map((x,i)=>b(`deck${i}`,x,1.5,1,1,{join:'deck'}))]};
  expect(buildingSupport(blueprint).fallenIds).toEqual([]);
  expect(buildingSupport(blueprint,{removedWordIds:['deck1']} ).fallenIds).toEqual([]);
  expect(buildingSupport(blueprint,{removedWordIds:['deck0']} ).fallenIds).toEqual(['deck1','deck2']);
  expect(buildingSupport(blueprint,{removedWordIds:['deck0','deck2']}).fallenIds).toEqual(['deck1']);
});
it('support loss cascades through multiple stories and detaches the trim instead of leaving it hovering',()=>{
  const blueprint={blocks:[b(null,0,.1,2,.2,{reveal:'base'}),b('low',0,.7),b('mid',0,1.7),b('high',0,2.7),b(null,0,3.3,1,.2,{reveal:'finish'})]};
  expect(buildingSupport(blueprint,{removedWordIds:['low']})).toEqual({standingBlockIndices:[0],detachedBlockIndices:[2,3,4],fallenIds:['mid','high']});
});
