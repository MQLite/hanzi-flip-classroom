import {hashLesson} from './lesson-appearance.js';
export const MAZE_SIZE=9;
const START=9,GOAL=71,clean=value=>typeof value==='string'?value.normalize('NFC').trim():'';
const sample=(random,n)=>{const value=Number(random());return Math.floor((Number.isFinite(value)?Math.max(0,Math.min(.999999999,value)):0)*n);};
function neighbors(index,grid){return [index-9,index+9,index-1,index+1].filter(n=>n>=0&&n<81&&grid[n]&&Math.abs(Math.floor(n/9)-Math.floor(index/9))+Math.abs(n%9-index%9)===1);}

export const mazeEncounters=Object.freeze({
  bomb:Object.freeze({icon:'💣', name:'炸弹', text:'后退 1 步', steps:-1}),
  hedgehog:Object.freeze({icon:'🦔', name:'刺猬', text:'后退 2 步', steps:-2}),
  butterfly:Object.freeze({icon:'🦋', name:'蝴蝶', text:'前进 3 步', steps:3}),
});

function routeToExit(grid){
  const queue=[START], previous=new Map([[START,null]]);
  for(let i=0;i<queue.length&&queue[i]!==GOAL;i++){
    for(const neighbor of neighbors(queue[i],grid)){
      if(previous.has(neighbor))continue;
      previous.set(neighbor,queue[i]);
      queue.push(neighbor);
    }
  }
  const route=[];
  for(let cell=GOAL;cell!=null;cell=previous.get(cell))route.push(cell);
  return Object.freeze(route.reverse());
}

function placeTraps(route,random){
  const finish=route.length-1;
  const early=Math.floor(finish/3), middle=Math.floor(2*finish/3);
  const pick=(first,last)=>route[first+sample(random,last-first+1)];
  // Leave enough route for the full effect and a final read at the exit.
  return Object.freeze({
    [pick(3,early)]:'bomb',
    [pick(early+2,middle)]:'hedgehog',
    [pick(middle+1,finish-4)]:'butterfly',
  });
}
function generate(random,strict=false){
  let grid=Array(81).fill(false);const stack=[10];grid[10]=true;
  while(stack.length){const current=stack.at(-1),row=Math.floor(current/9),col=current%9,candidates=[];
    for(const [dr,dc]of [[-2,0],[2,0],[0,-2],[0,2]]){const r=row+dr,c=col+dc,index=r*9+c;if(r>=1&&r<=7&&c>=1&&c<=7&&!grid[index])candidates.push(index);}
    if(!candidates.length){stack.pop();continue;}const next=candidates[sample(random,candidates.length)];grid[(current+next)/2]=true;grid[next]=true;stack.push(next);
  }
  grid[START]=grid[GOAL]=true;
  if(grid.filter((open,index)=>open&&index!==START&&index!==GOAL&&neighbors(index,grid).length===1).length<2){
    if(strict)return null;
    // A bounded comb layout guarantees observation/backtracking even for constant RNGs.
    grid=Array(81).fill(false);for(let row=1;row<=7;row++)for(const col of [1,3,5,7])grid[row*9+col]=true;for(let col=1;col<=7;col++)grid[9+col]=true;grid[START]=grid[GOAL]=true;
  }return grid;
}
function lessonGrid(key,variant,random,previous){
  const seed=hashLesson(key)^sample(random,0xffffffff),firstPassage=Boolean(variant%2),same=grid=>previous?.length===81&&grid.every((v,i)=>v===previous[i]);
  for(let attempt=0;attempt<128;attempt++){
    let value=(seed+Math.imul(attempt+1,2654435761))>>>0;const seeded=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;},grid=generate(seeded,true);
    if(grid&&grid[11]===firstPassage&&!same(grid))return grid;
  }
  // Two bounded comb orientations preserve connected branches and fixed entrance/exit.
  let grid=generate(()=>0);if(grid[11]!==firstPassage)grid=grid.toReversed();
  if(same(grid))grid[firstPassage?29:51]=true;return grid;
}
function freeze(state){for(const key of ['words','cells','grid','visited','trail','usedTraps'])Object.freeze(state[key]);return Object.freeze(state);}
export function createMazeState({words=[],random=Math.random,layoutKey='',layoutVariant=0,previousGrid=null}={}){
  if(!Array.isArray(words)||!words.length||typeof random!=='function')throw new TypeError('Choose lesson characters');
  const ids=new Set(),terms=new Set(),snapshot=words.map(word=>{const id=clean(word?.id),text=clean(word?.word);if(!id||ids.has(id)||terms.has(text)||!/^\p{Script=Han}{1,4}$/u.test(text))throw new TypeError('Distinct lesson characters required');ids.add(id);terms.add(text);return Object.freeze({id,word:text,pinyin:clean(word.pinyin)});});
  const grid=layoutKey?lessonGrid(String(layoutKey),layoutVariant,random,previousGrid):generate(random),offset=sample(random,snapshot.length);let index=0;
  const cells=grid.map(open=>open?snapshot[(offset+index++)%snapshot.length]:null);
  const exitRoute=routeToExit(grid);
  return freeze({phase:'play',words:snapshot,grid,cells,start:START,goal:GOAL,position:START,pendingIndex:null,visited:[START],steps:0,
    exitRoute,traps:placeTraps(exitRoute,random),usedTraps:[],trail:[START],move:null,feedback:'先观察路线；选相邻汉字，读对后再前进。'});
}
export function selectMazeCell(state,index){
  if(state.phase!=='play'||!Number.isInteger(index)||!neighbors(state.position,state.grid).includes(index))return state;
  return freeze({...state,pendingIndex:index,move:null,feedback:'学生先读出这个字，读对后老师再确认前进。'});
}

function extendTrail(trail,cell){
  const existing=trail.indexOf(cell);
  return existing===-1?[...trail,cell]:trail.slice(0,existing+1);
}

export function confirmMazeStep(state){
  if(state.phase!=='play'||state.pendingIndex===null||!neighbors(state.position,state.grid).includes(state.pendingIndex))return state;
  const chosen=state.pendingIndex;
  const kind=state.usedTraps.includes(chosen)?null:state.traps[chosen];
  const effect=mazeEncounters[kind];
  const path=[chosen];
  if(effect?.steps<0){
    const backward=Math.abs(effect.steps);
    // Undo the step onto the trap, then retrace the earlier path towards the start.
    path.push(...state.trail.slice(-backward).reverse());
  }else if(effect){
    const start=state.exitRoute.indexOf(chosen)+1;
    path.push(...state.exitRoute.slice(start,start+effect.steps));
  }

  const position=path.at(-1),complete=position===state.goal;
  const encounter=effect?Object.freeze({kind,cell:chosen}):null;
  const feedback=effect?`${effect.name}！${effect.text}。`:complete?'找到出口啦！':'前进一步！继续观察；遇到死路可以退回来。';
  return freeze({...state,position,pendingIndex:null,steps:state.steps+1,visited:[...new Set([...state.visited,...path])],
    trail:path.reduce(extendTrail,state.trail),usedTraps:encounter?[...state.usedTraps,chosen]:state.usedTraps,
    move:Object.freeze({path:Object.freeze(path),encounter}),phase:complete?'complete':'play',feedback});
}
export function cancelMazeStep(state){return state.phase==='play'&&state.pendingIndex!==null?freeze({...state,pendingIndex:null,feedback:'先留在这里，再观察、重新选方向。'}):state;}
