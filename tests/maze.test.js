import {it,expect} from 'vitest';
import {createMazeState,selectMazeCell,confirmMazeStep,cancelMazeStep} from '../src/maze-core.js';
const words=()=>['中','人','国','你'].map((word,i)=>({id:`m${i}`,word,pinyin:'test'}));
function neighbors(index,grid){return [index-9,index+9,index-1,index+1].filter(n=>n>=0&&n<81&&grid[n]&&Math.abs(Math.floor(n/9)-Math.floor(index/9))+Math.abs(n%9-index%9)===1);}
function route(state){const queue=[[state.start]],seen=new Set([state.start]);while(queue.length){const path=queue.shift(),last=path.at(-1);if(last===state.goal)return path;for(const n of neighbors(last,state.grid))if(!seen.has(n)){seen.add(n);queue.push([...path,n]);}}return [];}
it('all generated mazes have one reachable exit, at least two non-exit dead ends and lesson-only glyphs',()=>{
  for(let seed=0;seed<40;seed++){let value=seed+1;const random=()=>{value=(value*1664525+1013904223)>>>0;return value/2**32;};const state=createMazeState({words:words(),random});
    expect(state.grid).toHaveLength(81);expect(route(state).length).toBeGreaterThan(2);expect(state.grid.filter((open,i)=>open&&i!==state.start&&i!==state.goal&&neighbors(i,state.grid).length===1).length).toBeGreaterThanOrEqual(2);
    const seen=new Set([state.start]),queue=[state.start];while(queue.length)for(const n of neighbors(queue.shift(),state.grid))if(!seen.has(n)){seen.add(n);queue.push(n);}expect(seen.size).toBe(state.grid.filter(Boolean).length);expect(state.cells.filter(Boolean).every(c=>['中','人','国','你'].includes(c.word))).toBe(true);
  }
  for(const value of [0,1,NaN,Infinity])expect(route(createMazeState({words:words(),random:()=>value})).length).toBeGreaterThan(0);
});
it('selection never moves; teacher confirmation is required and walls or non-adjacent cells cannot be crossed',()=>{
  const initial=createMazeState({words:words(),random:()=>.5});expect(selectMazeCell(initial,0)).toBe(initial);expect(selectMazeCell(initial,initial.goal)).toBe(initial);expect(confirmMazeStep(initial)).toBe(initial);
  const target=neighbors(initial.position,initial.grid)[0],selected=selectMazeCell(initial,target);expect(selected.position).toBe(initial.position);expect(selected.steps).toBe(0);expect(cancelMazeStep(selected).pendingIndex).toBeNull();
  const moved=confirmMazeStep(selected);expect(moved.position).toBe(target);expect(moved.steps).toBe(1);expect(confirmMazeStep(moved)).toBe(moved);expect(initial.position).toBe(initial.start);
});
it('a route must be read step by step, completion is terminal, and new rounds/inputs remain independent',()=>{
  const input=words();let state=createMazeState({words:input});input[0].word='改';expect(state.words[0].word).toBe('中');const path=route(state);for(const index of path.slice(1))state=confirmMazeStep(selectMazeCell(state,index));
  expect(state.phase).toBe('complete');expect(state.position).toBe(state.goal);expect(state.steps).toBe(path.length-1);expect(selectMazeCell(state,path.at(-2))).toBe(state);expect(confirmMazeStep(state)).toBe(state);expect(Object.isFrozen(state.grid)).toBe(true);
  const next=createMazeState({words:state.words});expect(next.steps).toBe(0);expect(next.position).toBe(next.start);
  for(const bad of [[],[{id:'a',word:'abc'}],[{id:'a',word:'中'},{id:'a',word:'人'}]])expect(()=>createMazeState({words:bad})).toThrow();
});
it('a large personal-grade pool remains playable without truncating or rejecting saved characters',()=>{
  const pool=Array.from({length:200},(_,i)=>({id:`p${i}`,word:String.fromCodePoint(0x4e00+i)})),state=createMazeState({words:pool});
  expect(state.words).toHaveLength(200);expect(route(state).length).toBeGreaterThan(0);expect(state.cells.filter(Boolean)).toHaveLength(state.grid.filter(Boolean).length);
});
