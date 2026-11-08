import {createIslandMap} from './island-map.js';
import {createJourney,completeJourneyStage,advanceJourney,pauseJourney,resumeJourney,journeyProgress,courseKey,markJourneyCelebrated} from './island-journey-core.js';
import {isJourneyStageComplete} from './island-journey-data.js';
import {loadJourneys,saveJourney} from './island-journey-storage.js';
import './island-journey.css';
export function createIslandJourney({getContext,onLaunch,onConceal=()=>{},canLaunch=()=>true,onCelebrate}={}){
 let rows=loadJourneys(),active=null,storageWarning=false,transferring=false;
 const entry=document.createElement('button');entry.id='open-island-map';entry.textContent='小岛地图';document.querySelector('.site-header nav').prepend(entry);
 const strip=document.createElement('section');strip.id='island-journey-strip';strip.className='island-journey-strip';strip.hidden=true;strip.setAttribute('aria-label','本课小岛闯关');
 strip.innerHTML='<div><strong id="journey-current"></strong><span id="journey-progress" role="status"></span></div><div class="journey-actions"><button id="journey-next" class="primary" disabled>完成本关后前进</button><button id="journey-map">小岛地图</button><button id="journey-pause">暂停闯关</button></div>';
 document.querySelector('.lesson-toolbar').after(strip);
 const find=()=>rows.find(s=>courseKey(s.course)===courseKey(getContext().course))??null;
 function save(state){active=state;rows=[state,...rows.filter(s=>courseKey(s.course)!==courseKey(state.course))].slice(0,24);storageWarning=!saveJourney(state);update();}
 function setUrl(state){const url=new URL(location.href);for(const [key,value] of Object.entries({...state.course,mode:state.stages[state.index].id,journey:state.runId})){if(key!=='revision')url.searchParams.set(key,value);}history.replaceState(null,'',url);}
 function launch(){
  if(!active||active.status!=='active')return;
  setUrl(active);transferring=true;
  // Finishing outgoing game animations may synchronously render their old models.
  // No model can award or pause the destination journey until initialization ends.
  try{onLaunch(active.stages[active.index].id,active.course);}finally{transferring=false;update();}
 }
 function start(){if(!canLaunch())return;const context=getContext();save(createJourney({course:context.course,availability:context.availability}));launch();}
 function resume(){if(!canLaunch())return;const saved=find();if(!saved||!['active','paused'].includes(saved.status))return;save(advanceJourney(resumeJourney(saved)));launch();}
 function pause(){if(active?.status==='active')save(pauseJourney(active));else if(active?.status==='complete')active=null;const url=new URL(location.href);if(url.searchParams.has('journey')){url.searchParams.delete('journey');history.replaceState(null,'',url);}update();}
 const map=createIslandMap({onStart:start,onResume:resume,onRestart:start,onChallenge:mode=>{if(!canLaunch())return;const context=getContext();pause();onLaunch(mode,context.course,{independent:true});}});
 function open(){onConceal();const context=getContext();map.open({...context,state:find(),storageWarning:storageWarning?'浏览器未能保存，闯关进度仅保留在本页。':''});}
 function update(){
  const running=active?.status==='active'&&courseKey(active.course)===courseKey(getContext().course),complete=active?.status==='complete'&&courseKey(active.course)===courseKey(getContext().course);
  strip.hidden=!running&&!complete;document.body.classList.toggle('journey-active',running||complete);
  if(strip.hidden)return;
  const progress=journeyProgress(active),stage=active.stages[active.index];strip.querySelector('#journey-current').textContent=complete?'本课小岛已通关':`第${active.index+1}岛 · ${stage.label}`;
  strip.querySelector('#journey-progress').textContent=`${progress.completed} / ${progress.total} 岛${storageWarning?' · 仅本页保存':''}`;
  const next=strip.querySelector('#journey-next');next.disabled=complete||!active.completed.includes(stage.id);
  next.textContent=complete?'本课已通关':progress.next?`下一岛：${active.stages.find(s=>s.id===progress.next).label}`:'完成本关后前进';
  strip.querySelector('#journey-pause').hidden=complete;
 }
 function sync(mode,models){
  if(transferring){update();return;}
  if(active?.status==='active'){
   if(courseKey(active.course)!==courseKey(getContext().course)||active.stages[active.index]?.id!==mode)pause();
   else if(isJourneyStageComplete(mode,models)){const next=completeJourneyStage(active,mode);if(next!==active)save(next);}
  }
  update();
  if(active?.status==='complete'&&!active.celebrated&&onCelebrate){save(markJourneyCelebrated(active));map.close();onCelebrate();}
 }
 function next(){if(active?.status!=='active')return;const next=advanceJourney(active);if(next===active)return;save(next);launch();}
 entry.onclick=open;strip.querySelector('#journey-map').onclick=open;strip.querySelector('#journey-next').onclick=next;strip.querySelector('#journey-pause').onclick=pause;
 return {sync,open,pause,next,isActive:()=>active?.status==='active',getState:()=>active,
  restore(runId){const state=find();if(!state||state.runId!==runId||!['active','paused'].includes(state.status))return false;save(advanceJourney(resumeJourney(state)));launch();return true;},
  dispose(){map.dispose();entry.remove();strip.remove();document.body.classList.remove('journey-active');}};
}
