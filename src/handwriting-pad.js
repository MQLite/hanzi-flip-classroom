const NS='http://www.w3.org/2000/svg';
function svgNode(tag,attributes={}){const n=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attributes))n.setAttribute(key,value);return n;}
const pathFor=points=>points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');

/** One mounted pad owns one gesture. Context changes dispose its listeners. */
export function mountHandwritingPad(svg,{geometry,state,onStroke,onCancel=()=>{}}){
  const controller=new AbortController(),options={signal:controller.signal};let gesture=null,disposed=false;
  const transform='translate(0 900) scale(1 -1)',shadow=svgNode('g',{transform,class:'glyph-shadow'}),ink=svgNode('g',{transform,class:'handwriting-ink'}),draft=svgNode('g',{transform,class:'handwriting-draft'});
  geometry.strokes.forEach((d,i)=>shadow.append(svgNode('path',{d,class:i===state.placed?'is-next':''})));
  for(const points of state.drawings[state.index])ink.append(svgNode('path',{d:pathFor(points)}));
  if(state.lastAttempt.length)draft.append(svgNode('path',{d:pathFor(state.lastAttempt),class:'handwriting-rejected'}));
  svg.append(shadow,ink,draft);
  const start=geometry.medians[state.placed]?.[0];
  if(start)svg.append(svgNode('circle',{cx:start[0],cy:900-start[1],r:18,class:'handwriting-start','aria-hidden':'true'}));
  function point(event){const matrix=svg.getScreenCTM();if(!matrix)return null;const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());return [p.x,900-p.y];}
  function inside(event){const box=svg.getBoundingClientRect();return event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom;}
  function release(id){try{if(svg.hasPointerCapture(id))svg.releasePointerCapture(id);}catch{/* The browser may already have released a cancelled pointer. */}}
  function cancel(){if(!gesture)return;const id=gesture.id;gesture=null;release(id);draft.replaceChildren();}
  function append(event){
    const p=point(event);if(!p||!gesture)return;
    const last=gesture.points.at(-1);if(!last||Math.hypot(p[0]-last[0],p[1]-last[1])>.35)gesture.points.push(p);
    if(gesture.points.length>2048)gesture.points=gesture.points.filter((_,i)=>i%2===0||i===gesture.points.length-1);
    gesture.path.setAttribute('d',pathFor(gesture.points));
  }
  svg.addEventListener('pointerdown',event=>{
    if(disposed||gesture||event.isPrimary===false||event.button!==0||state.placed>=state.characters[state.index].names.length||!inside(event))return;
    const p=point(event);if(!p)return;event.preventDefault();draft.replaceChildren();const path=svgNode('path');draft.append(path);gesture={id:event.pointerId,points:[p],path};path.setAttribute('d',pathFor([p]));try{svg.setPointerCapture(event.pointerId);}catch{/* Synthetic test/assistive pointers may not support capture. */}
  },options);
  svg.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;event.preventDefault();const events=event.getCoalescedEvents?.()??[];for(const sample of events.length?events:[event])append(sample);
  },options);
  svg.addEventListener('pointerup',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;event.preventDefault();
    if(!inside(event)){cancel();onCancel('请在田字格内完成这一笔。');return;}
    append(event);const {id,points}=gesture;gesture=null;release(id);draft.replaceChildren();if(!disposed)onStroke(points);
  },options);
  svg.addEventListener('pointercancel',event=>{if(gesture?.id===event.pointerId)cancel();},options);
  svg.addEventListener('lostpointercapture',event=>{if(gesture?.id===event.pointerId)cancel();},options);
  window.addEventListener('blur',cancel,options);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();},options);
  return {cancel,dispose(){disposed=true;cancel();controller.abort();}};
}
