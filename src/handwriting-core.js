import {pointDistance} from './construction-core.js';

const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clamp=value=>Math.max(0,Math.min(100,value));
const average=values=>values.reduce((sum,n)=>sum+n,0)/values.length;
function cleanPath(points){
  if(!Array.isArray(points)||points.length<2||points.length>4096)return null;
  const clean=[];
  for(const p of points){
    if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<-64||p[0]>1088||p[1]<-188||p[1]>964)return null;
    if(!clean.length||distance(p,clean.at(-1))>.05)clean.push([p[0],p[1]]);
  }
  return clean.length>1?clean:null;
}
export function pathLength(points){let length=0;for(let i=1;i<points.length;i++)length+=distance(points[i-1],points[i]);return length;}
function pointAt(points,target){
  let walked=0;
  for(let i=1;i<points.length;i++){const segment=distance(points[i-1],points[i]);if(walked+segment>=target){const t=segment?(target-walked)/segment:0;return [points[i-1][0]+(points[i][0]-points[i-1][0])*t,points[i-1][1]+(points[i][1]-points[i-1][1])*t];}walked+=segment;}
  return [...points.at(-1)];
}
export function resamplePath(points,count=48){const length=pathLength(points);return Array.from({length:count},(_,i)=>pointAt(points,length*i/(count-1)));}
function frechet(a,b){
  let previous=Array(b.length).fill(Infinity);
  for(let i=0;i<a.length;i++){const current=[];for(let j=0;j<b.length;j++){const prior=i===0&&j===0?0:Math.min(previous[j],j?current[j-1]:Infinity,j?previous[j-1]:Infinity);current[j]=Math.max(distance(a[i],b[j]),prior);}previous=current;}
  return previous.at(-1);
}
function simplify(points,epsilon=18){
  if(points.length<=2)return points;let furthest=epsilon,index=-1;
  for(let i=1;i<points.length-1;i++){const d=pointDistance(points[i],[points[0],points.at(-1)]);if(d>furthest){furthest=d;index=i;}}
  if(index<0)return [points[0],points.at(-1)];return [...simplify(points.slice(0,index+1),epsilon).slice(0,-1),...simplify(points.slice(index),epsilon)];
}
function cosine(a,b){const lengths=Math.hypot(...a)*Math.hypot(...b);return lengths?(a[0]*b[0]+a[1]*b[1])/lengths:1;}
const vector=(a,b)=>[b[0]-a[0],b[1]-a[1]];
const reject=reason=>({accepted:false,score:0,reason,metrics:null});

/** Practice comparison against the reviewed ordered median; not a timed test. */
export function evaluateHandwritingStroke(points,median){
  const drawn=cleanPath(points),reference=cleanPath(median);if(!drawn||!reference)return reject('incomplete');
  const length=pathLength(drawn),referenceLength=pathLength(reference),ratio=length/referenceLength;
  if(length<12||!Number.isFinite(ratio)||ratio<.55||ratio>1.7)return reject('incomplete');
  const tolerance=Math.max(55,Math.min(100,referenceLength*.18));
  if(distance(drawn[0],reference[0])>tolerance||distance(drawn.at(-1),reference.at(-1))>tolerance){
    const backwards=distance(drawn[0],reference.at(-1))<tolerance&&distance(drawn.at(-1),reference[0])<tolerance;
    return reject(backwards?'direction':'position');
  }
  const a=resamplePath(drawn),b=resamplePath(reference),coverage=b.filter(p=>pointDistance(p,drawn)<=52).length/b.length;
  if(coverage<.78||frechet(a,b)>110)return reject('shape');
  // A visible terminal hook must not be replaced by a straight shortcut.
  const corners=simplify(reference),last=corners.at(-1),penultimate=corners.at(-2),before=corners.at(-3);
  if(before&&distance(last,penultimate)>=30&&cosine(vector(before,penultimate),vector(penultimate,last))<.57){
    const tail=Math.min(distance(last,penultimate)*.65,referenceLength*.1),drawTail=pointAt(drawn,Math.max(0,length-tail));
    if(cosine(vector(drawTail,drawn.at(-1)),vector(penultimate,last))<-.1)return reject('direction');
  }
  const center=path=>[average(path.map(p=>p[0])),average(path.map(p=>p[1]))],ca=center(a),cb=center(b);
  const shapeError=average(a.map((p,i)=>distance([p[0]-ca[0],p[1]-ca[1]],[b[i][0]-cb[0],b[i][1]-cb[1]])));
  const metrics={shape:clamp(100-shapeError/1.6),position:clamp(100-distance(ca,cb)/.9),length:clamp(100-Math.abs(Math.log(ratio))*80)};
  const score=Math.round(metrics.shape*.55+metrics.position*.3+metrics.length*.15);
  return score>=60?{accepted:true,score,reason:'correct',metrics}:reject('shape');
}

export function createHandwritingState(characters=[]){
  return {characters,index:0,placed:0,progress:characters.map(()=>0),completed:[],review:false,
    drawings:characters.map(()=>[]),strokeScores:characters.map(()=>[]),scores:characters.map(()=>null),lastAttempt:[],lastName:null,feedback:'ready'};
}
export function submitHandwritingStroke(state,points,geometry){
  const current=state.characters[state.index];if(!current||state.review||state.placed>=current.names.length)return state;
  const result=evaluateHandwritingStroke(points,geometry?.medians?.[state.placed]);
  const otherFitsBetter=result.score<96&&geometry?.medians?.some((median,i)=>{
    if(i===state.placed)return false;const match=evaluateHandwritingStroke(points,median);
    return match.accepted&&(!result.accepted||(match.score>result.score+4&&match.metrics.position>result.metrics.position+10));
  });
  if(!result.accepted||otherFitsBetter){
    const path=cleanPath(points),later=otherFitsBetter;
    return {...state,lastAttempt:path?resamplePath(path,Math.min(128,path.length*2)):[],lastName:null,feedback:later?'wrong-order':result.reason==='direction'?'wrong-direction':'retry'};
  }
  const index=state.index,placed=state.placed+1,progress=[...state.progress],drawings=[...state.drawings],strokeScores=[...state.strokeScores],scores=[...state.scores];
  progress[index]=placed;drawings[index]=[...drawings[index],resamplePath(cleanPath(points),128)];strokeScores[index]=[...strokeScores[index],result];
  const complete=placed===current.names.length;if(complete)scores[index]=Math.round(average(strokeScores[index].map(s=>s.score)));
  return {...state,placed,progress,drawings,strokeScores,scores,completed:complete?[...new Set([...state.completed,current.character])]:state.completed,lastAttempt:[],lastName:current.names[state.placed],feedback:complete?'complete':'accepted'};
}
export function undoHandwritingStroke(state){
  if(!state.placed)return {...state,lastAttempt:[],lastName:null,feedback:'ready'};
  const index=state.index,placed=state.placed-1,progress=[...state.progress],drawings=[...state.drawings],strokeScores=[...state.strokeScores],scores=[...state.scores];
  progress[index]=placed;drawings[index]=drawings[index].slice(0,-1);strokeScores[index]=strokeScores[index].slice(0,-1);scores[index]=null;
  return {...state,placed,progress,drawings,strokeScores,scores,completed:state.completed.filter(c=>c!==state.characters[index].character),lastAttempt:[],lastName:null,feedback:'ready',review:false};
}
export function rewriteHandwritingCharacter(state){
  const index=state.index,progress=[...state.progress],drawings=[...state.drawings],strokeScores=[...state.strokeScores],scores=[...state.scores];
  progress[index]=0;drawings[index]=[];strokeScores[index]=[];scores[index]=null;
  return {...state,placed:0,progress,drawings,strokeScores,scores,completed:state.completed.filter(c=>c!==state.characters[index]?.character),lastAttempt:[],lastName:null,feedback:'ready',review:false};
}
export function navigateHandwriting(state,delta=1){
  const index=Math.max(0,Math.min(state.characters.length-1,state.index+delta));if(index===state.index)return state;
  return {...state,index,placed:state.progress[index],lastAttempt:[],lastName:null,feedback:state.scores[index]===null?'ready':'complete',review:false};
}
