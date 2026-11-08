import {buildingBlueprint} from './building-blueprint.js';
import {buildingSupport} from './building-support.js';
const clean=value=>typeof value==='string'?value.normalize('NFC').trim():'';
function shuffle(words,random){
  const result=[...words];for(let i=result.length-1;i>0;i--){const n=Number(random()),j=Math.floor((Number.isFinite(n)?Math.max(0,Math.min(.999999999,n)):0)*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
function freeze(state){
  for(const key of ['words','challengeWords']){state[key].forEach(Object.freeze);Object.freeze(state[key]);}
  for(const key of ['builtIds','checkedIds','fallenIds','detachedBlockIndices'])Object.freeze(state[key]);return Object.freeze(state);
}
export function createBuildingState({words=[],structure='house',sentence=null,variant=0,random=Math.random}={}){
  if(!Array.isArray(words)||!words.length||words.length>16||!['house','bridge','tower','building'].includes(structure)||typeof random!=='function')throw new TypeError('Choose a building and 1–16 lesson words');
  const ids=new Set(),terms=new Set(),snapshot=words.map(w=>{
    const id=clean(w?.id),word=clean(w?.word);if(!id||ids.has(id)||terms.has(word)||!/^\p{Script=Han}{1,12}$/u.test(word))throw new TypeError('Distinct valid lesson words required');
    ids.add(id);terms.add(word);return {id,word,pinyin:clean(w.pinyin)};
  });
  const rescue=sentence&&clean(sentence.sentence)&&clean(sentence.sentence).length<=160?Object.freeze({id:clean(sentence.id),sentence:clean(sentence.sentence),source:clean(sentence.source)}):null;
  return freeze({phase:'build',structure,variant:Number.isInteger(variant)&&variant>=0&&variant<4?variant:0,words:shuffle(snapshot,random),sentence:rescue,builtIds:[],checkedIds:[],challengeWords:[],fallenIds:[],detachedBlockIndices:[],pendingId:null});
}
export function visibleBuildingWords(state){return state.builtIds.filter(id=>!['challenge','collapsed','cleared'].includes(state.phase)||!state.checkedIds.includes(id));}
export function drawBuildingWord(state){
  if(!['build','challenge'].includes(state.phase)||state.pendingId)return state;
  const words=state.phase==='build'?state.words:state.challengeWords,used=state.phase==='build'?state.builtIds:state.checkedIds;
  const word=words.find(w=>!used.includes(w.id));return word?freeze({...state,pendingId:word.id}):state;
}
export function confirmBuildingWord(state){
  if(!['build','challenge'].includes(state.phase)||!state.pendingId)return state;
  if(state.phase==='build'){
    if(state.builtIds.includes(state.pendingId))return state;
    const builtIds=[...state.builtIds,state.pendingId];return freeze({...state,builtIds,pendingId:null,phase:builtIds.length===state.words.length?'built':'build'});
  }
  if(state.checkedIds.includes(state.pendingId))return state;
  const checkedIds=[...state.checkedIds,state.pendingId],blueprint=buildingBlueprint(state.structure,{words:state.words,variant:state.variant}),support=buildingSupport(blueprint,{removedWordIds:checkedIds});
  return freeze({...state,checkedIds,fallenIds:support.fallenIds,detachedBlockIndices:support.detachedBlockIndices,phase:support.fallenIds.length?'collapsed':checkedIds.length===state.words.length?'cleared':'challenge',pendingId:null});
}
export function beginBuildingChallenge(state,{random=Math.random}={}){
  if(!['built','restored'].includes(state.phase)||!state.sentence||typeof random!=='function')return state;
  const challengeWords=shuffle(state.words,random);
  return freeze({...state,phase:'challenge',challengeWords,checkedIds:[],fallenIds:[],detachedBlockIndices:[],pendingId:null});
}
export function restoreBuilding(state){return ['collapsed','cleared'].includes(state.phase)&&state.sentence?freeze({...state,phase:'restored',checkedIds:[],fallenIds:[],detachedBlockIndices:[],pendingId:null}):state;}
export function chooseBuildingChallengeWord(state,id){
  if(!['built','restored','challenge'].includes(state.phase)||!state.words.some(w=>w.id===id)||state.checkedIds.includes(id))return state;
  const ready=state.phase==='challenge'?state:beginBuildingChallenge(state);if(ready.phase!=='challenge')return state;
  return confirmBuildingWord(freeze({...ready,pendingId:id}));
}
