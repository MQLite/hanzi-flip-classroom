const signature=ids=>[...ids].sort().join('|');

export function createPuzzleState(targets=[]){
  return {targets,selected:[],found:[],revealed:[],feedback:'ready'};
}
export function selectPuzzlePart(state,id){
  if(state.selected.length>=4||!state.targets.some(t=>t.parts.some(p=>p.id===id)))return state;
  return {...state,selected:[...state.selected,id],revealed:[],feedback:'ready'};
}
export function removePuzzlePart(state,index){
  if(!Number.isInteger(index)||index<0||index>=state.selected.length)return state;
  return {...state,selected:state.selected.filter((_,i)=>i!==index),revealed:[],feedback:'ready'};
}
export function checkPuzzle(state){
  const key=signature(state.selected);
  const revealed=state.targets.filter(t=>signature(t.parts.map(p=>p.id))===key).map(t=>t.character);
  if(!revealed.length)return {...state,revealed:[],feedback:'retry'};
  return {...state,selected:[],revealed,found:[...new Set([...state.found,...revealed])],feedback:'matched'};
}

export function createStrokeState(characters=[]){
  return {characters,index:0,placed:0,progress:characters.map(()=>0),completed:[],feedback:'ready',review:false};
}
export function pointDistance(point,median){
  if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||!Array.isArray(median)||median.length<2)return Infinity;
  let distance=Infinity;
  for(let i=1;i<median.length;i++){
    const [ax,ay]=median[i-1],[bx,by]=median[i];
    const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
    const t=length?Math.max(0,Math.min(1,((point[0]-ax)*dx+(point[1]-ay)*dy)/length)):0;
    distance=Math.min(distance,Math.hypot(point[0]-ax-t*dx,point[1]-ay-t*dy));
  }
  return distance;
}
export function placeStroke(state,{name,point}={},geometry){
  const current=state.characters[state.index];
  if(!current||state.placed>=current.names.length||state.review)return state;
  const expected=current.names[state.placed],aliases=current.aliases?.[state.placed]??[];
  if(name!==expected&&!aliases.includes(name))return {...state,feedback:'wrong-name'};
  const distance=pointDistance(point,geometry?.medians?.[state.placed]);
  // Pick the intended stroke, including closely spaced strokes of the same name.
  const other=geometry?.medians?.some((median,i)=>i!==state.placed&&pointDistance(point,median)+12<distance);
  if(distance>70||other)return {...state,feedback:'wrong-position'};
  const placed=state.placed+1,progress=[...state.progress];progress[state.index]=placed;
  const completed=placed===current.names.length?[...new Set([...state.completed,current.character])]:state.completed;
  return {...state,placed,progress,completed,review:completed.length===state.characters.length,feedback:placed===current.names.length?'complete':'placed'};
}
export function undoStroke(state){
  if(!state.placed)return state;
  const progress=[...state.progress];progress[state.index]=state.placed-1;
  return {...state,placed:state.placed-1,progress,completed:state.completed.filter(c=>c!==state.characters[state.index].character),feedback:'ready',review:false};
}
export function nextStrokeCharacter(state,delta=1){
  const index=Math.max(0,Math.min(state.characters.length-1,state.index+delta));
  if(index===state.index)return state;
  return {...state,index,placed:state.progress[index],feedback:'ready',review:false};
}
