import {EXPLORATIONS} from './exploration.js';
import {courseKey,completeJourneyStage,markJourneyCelebrated} from './island-journey-core.js';
import {loadJourneys,saveJourney} from './island-journey-storage.js';
import {showLessonCelebration} from './lesson-celebration.js';
function matches(scenario,state){return scenario&&state?.status==='active'&&state.stages[state.index]?.id==='explore'&&scenario.source===state.course.source&&scenario.stage===state.course.stage&&scenario.lesson===state.course.lesson;}
export function scenarioJourneyUrl(scenario,state,base=globalThis.location?.href){
 if(!matches(scenario,state))return scenario.href;
 const url=new URL(scenario.href,base);url.searchParams.set('journey',state.runId);url.searchParams.set('journeyCourse',JSON.stringify(state.course));url.searchParams.set('islandScenario',scenario.id);return url.href;
}
export function getExplorationJourney(scenarioId,search,rows){
 try{const params=new URLSearchParams(search),raw=params.get('journeyCourse');if(!raw||raw.length>1000||params.get('islandScenario')!==scenarioId)return null;
  const course=JSON.parse(raw),scenario=EXPLORATIONS.find(s=>s.id===scenarioId);
  return rows.find(state=>state.runId===params.get('journey')&&courseKey(state.course)===courseKey(course)&&matches(scenario,state))??null;
 }catch{return null;}
}
export function reportExplorationComplete(scenarioId,search,storage){
 const state=getExplorationJourney(scenarioId,search,loadJourneys(storage));if(!state)return null;
 const next=completeJourneyStage(state,'explore');return {state:next,saved:saveJourney(next,storage)};
}
/** Native game code calls reportComplete only after a successful current action. */
export function bindExplorationJourney(scenarioId){
 const search=location.search,initial=getExplorationJourney(scenarioId,search,loadJourneys());let awarded=false;
 const returnUrl=initial?new URL('./',location.href):null;
 if(returnUrl)for(const [key,value] of Object.entries({...initial.course,mode:'explore',journey:initial.runId,islandMap:'1'})){if(key!=='revision')returnUrl.searchParams.set(key,value);}
 function decorate(root=document){
  if(!returnUrl)return;
  for(const a of root.querySelectorAll('a[aria-label="返回情景探索"],a.quest-home,a[href="./"]')){
   a.href=returnUrl.href;a.setAttribute('aria-label','返回小岛地图');a.title='返回小岛地图';
   if(!a.classList.contains('room-quiet'))a.textContent='← 返回小岛地图';
  }
 }
 function reportComplete(){
  if(!initial||awarded)return false;const result=reportExplorationComplete(scenarioId,search);if(!result)return false;awarded=true;
  const celebrate=result.state.status==='complete'&&!result.state.celebrated;
  if(celebrate){saveJourney(markJourneyCelebrated(result.state));showLessonCelebration();}
  if(!result.saved){const note=document.createElement('p');note.setAttribute('role','status');note.textContent='浏览器未能保存，本次通关仅保留在本页。';document.body.append(note);}
  return celebrate;
 }
 return {decorate,reportComplete,returnUrl:returnUrl?.href??null};
}
