import {hashLesson} from './lesson-appearance.js';
export const MAZE_SIZE=9;
const START=9,GOAL=71,clean=value=>typeof value==='string'?value.normalize('NFC').trim():'';
const sample=(random,n)=>{const value=Number(random());return Math.floor((Number.isFinite(value)?Math.max(0,Math.min(.999999999,value)):0)*n);};
function neighbors(index,grid){return [index-9,index+9,index-1,index+1].filter(n=>n>=0&&n<81&&grid[n]&&Math.abs(Math.floor(n/9)-Math.floor(index/9))+Math.abs(n%9-index%9)===1);}
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
function freeze(state){for(const key of ['words','cells','grid','visited'])Object.freeze(state[key]);return Object.freeze(state);}
export function createMazeState({words=[],random=Math.random,layoutKey='',layoutVariant=0,previousGrid=null}={}){
  if(!Array.isArray(words)||!words.length||typeof random!=='function')throw new TypeError('Choose lesson characters');
  const ids=new Set(),terms=new Set(),snapshot=words.map(word=>{const id=clean(word?.id),text=clean(word?.word);if(!id||ids.has(id)||terms.has(text)||!/^\p{Script=Han}{1,4}$/u.test(text))throw new TypeError('Distinct lesson characters required');ids.add(id);terms.add(text);return Object.freeze({id,word:text,pinyin:clean(word.pinyin)});});
  const grid=layoutKey?lessonGrid(String(layoutKey),layoutVariant,random,previousGrid):generate(random),offset=sample(random,snapshot.length);let index=0;
  const cells=grid.map(open=>open?snapshot[(offset+index++)%snapshot.length]:null);
  return freeze({phase:'play',words:snapshot,grid,cells,start:START,goal:GOAL,position:START,pendingIndex:null,visited:[START],steps:0,feedback:'先观察路线；选相邻汉字，读对后再前进。'});
}
export function selectMazeCell(state,index){
  if(state.phase!=='play'||!Number.isInteger(index)||!neighbors(state.position,state.grid).includes(index))return state;
  return freeze({...state,pendingIndex:index,feedback:'学生先读出这个字，读对后老师再确认前进。'});
}
export function confirmMazeStep(state){
  if(state.phase!=='play'||state.pendingIndex===null||!neighbors(state.position,state.grid).includes(state.pendingIndex))return state;
  const position=state.pendingIndex,complete=position===state.goal;
  return freeze({...state,position,pendingIndex:null,steps:state.steps+1,visited:state.visited.includes(position)?state.visited:[...state.visited,position],phase:complete?'complete':'play',feedback:complete?'找到出口啦！':'前进一步！继续观察；遇到死路可以退回来。'});
}
export function cancelMazeStep(state){return state.phase==='play'&&state.pendingIndex!==null?freeze({...state,pendingIndex:null,feedback:'先留在这里，再观察、重新选方向。'}):state;}
