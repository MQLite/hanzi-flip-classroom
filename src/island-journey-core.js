import {GAME_ORDER} from './game-order.js';
export function normalizeCourse(course={}){
 return {source:String(course.source??'personal'),stage:String(course.stage??''),lesson:Number(course.lesson)||1,grade:Number(course.grade)||1,revision:String(course.revision??'')};
}
export const courseKey=course=>JSON.stringify(normalizeCourse(course));
function freeze(state){Object.freeze(state.course);state.stages.forEach(Object.freeze);Object.freeze(state.stages);Object.freeze(state.completed);return Object.freeze(state);}
export function createJourney({course,availability=[],runId}={}){
 const stages=GAME_ORDER.map(game=>{const row=availability.find(r=>r.id===game.id);return {...game,available:row?.available===true,reason:row?.available?'':String(row?.reason??'本课尚未设置')};});
 const index=stages.findIndex(s=>s.available);
 return freeze({version:1,course:normalizeCourse(course),runId:String(runId??globalThis.crypto?.randomUUID?.()??Date.now()),stages,index,completed:[],status:index<0?'empty':'active',celebrated:false});
}
export function journeyProgress(state){
 if(!state)return {completed:0,total:0,complete:false,next:null};
 const total=state.stages.filter(s=>s.available).length;
 const next=state.stages.find((s,i)=>i>state.index&&s.available&&!state.completed.includes(s.id))?.id??null;
 return {completed:state.completed.length,total,complete:total>0&&state.completed.length===total,next};
}
export function completeJourneyStage(state,mode){
 if(state?.status!=='active'||state.stages[state.index]?.id!==mode||state.completed.includes(mode))return state;
 const completed=[...state.completed,mode],complete=completed.length===state.stages.filter(s=>s.available).length;
 return freeze({...state,completed,status:complete?'complete':'active'});
}
export function advanceJourney(state){
 if(state?.status!=='active'||!state.completed.includes(state.stages[state.index]?.id))return state;
 const index=state.stages.findIndex((s,i)=>i>state.index&&s.available&&!state.completed.includes(s.id));
 return index<0?state:freeze({...state,index});
}
export const pauseJourney=state=>state?.status==='active'?freeze({...state,status:'paused'}):state;
export const resumeJourney=state=>state?.status==='paused'?freeze({...state,status:'active'}):state;
export const markJourneyCelebrated=state=>state?.status==='complete'&&!state.celebrated?freeze({...state,celebrated:true}):state;
export function validateJourney(value){
 if(!value||value.version!==1||typeof value.runId!=='string'||!value.runId||value.runId.length>120||!value.course||!Array.isArray(value.stages)||value.stages.length!==11||!Array.isArray(value.completed)||value.completed.length>11)return null;
 if(!['active','paused','complete','empty'].includes(value.status)||typeof value.celebrated!=='boolean')return null;
 if(value.stages.some((s,i)=>s?.id!==GAME_ORDER[i].id||typeof s.available!=='boolean'||typeof s.reason!=='string'||s.reason.length>200))return null;
 if(!Number.isInteger(value.index)||value.index< -1||value.index>10)return null;
 const normalized=normalizeCourse(value.course);
 if(!['personal','textbook','paradise','zhongwen'].includes(normalized.source)||normalized.stage.length>30||normalized.revision.length>100||!Number.isInteger(normalized.lesson)||normalized.lesson<1||normalized.lesson>200||!Number.isInteger(normalized.grade)||normalized.grade<1||normalized.grade>4)return null;
 const clean=createJourney({course:normalized,availability:value.stages,runId:value.runId}),available=clean.stages.filter(s=>s.available);
 if(value.completed.some((id,i)=>id!==available[i]?.id))return null;
 if(!available.length)return value.status==='empty'&&value.index===-1&&!value.completed.length&&!value.celebrated?clean:null;
 if(value.status==='empty'||!clean.stages[value.index]?.available)return null;
 const current=available.findIndex(s=>s.id===clean.stages[value.index].id),done=value.completed.length;
 if(current!==done&&current!==done-1)return null;
 if((value.status==='complete')!==(done===available.length)||value.celebrated&&value.status!=='complete')return null;
 return freeze({...clean,index:value.index,completed:[...value.completed],status:value.status,celebrated:value.celebrated});
}
