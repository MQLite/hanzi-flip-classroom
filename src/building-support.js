// A small, deterministic gravity/support model for classroom toy blocks.
// See docs/building-support.md for the contact, bridge and decoration rules.
const CONTACT=.085, MOUNT=.18, EPS=1e-7;
const bottom=b=>b.position[1]-b.size[1]/2;
const top=b=>b.position[1]+b.size[1]/2;
const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
function hull(points){
  const sorted=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),lower=[],upper=[];
  for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(const p of [...sorted].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
function contains(points,center){const polygon=hull(points);return polygon.length>=3&&polygon.every((p,i)=>cross(p,polygon[(i+1)%polygon.length],center)>=-EPS);}
function contact(upper,lower,decorative=false){
  if(lower.position[1]>=upper.position[1]-EPS)return [];
  const gap=bottom(upper)-top(lower);
  if(gap>(decorative?MOUNT:CONTACT)||(!decorative&&gap<-CONTACT))return [];
  const limits=[0,2].map(axis=>[Math.max(upper.position[axis]-upper.size[axis]/2,lower.position[axis]-lower.size[axis]/2),Math.min(upper.position[axis]+upper.size[axis]/2,lower.position[axis]+lower.size[axis]/2)]);
  if(limits.some(([lo,hi])=>hi-lo<=EPS))return [];
  return [[limits[0][0],limits[1][0]],[limits[0][0],limits[1][1]],[limits[0][1],limits[1][0]],[limits[0][1],limits[1][1]]];
}
function connectedDeck(a,b){return a.join==='deck'&&b.join==='deck'&&Math.abs(a.position[1]-b.position[1])<CONTACT&&Math.abs(a.position[0]-b.position[0])<=(a.size[0]+b.size[0])/2+.065;}

/** Returns stable geometry and the local pieces that lose support after removal. */
export function buildingSupport(blueprint,{removedWordIds=[]}={}){
  const blocks=blueprint.blocks,removed=new Set(removedWordIds),standing=new Set(),remaining=blocks.map((_,i)=>i).filter(i=>!removed.has(blocks[i].wordId));
  const structural=remaining.filter(i=>blocks[i].wordId||blocks[i].reveal==='base'),groups=[],unassigned=new Set(structural);
  for(const index of structural){
    if(!unassigned.delete(index))continue;const group=[index];
    for(let at=0;at<group.length;at++)for(const candidate of [...unassigned])if(connectedDeck(blocks[group[at]],blocks[candidate])){group.push(candidate);unassigned.delete(candidate);}
    groups.push(group);
  }
  groups.sort((a,b)=>Math.min(...a.map(i=>bottom(blocks[i])))-Math.min(...b.map(i=>bottom(blocks[i]))));
  function supported(group,decorative=false){
    if(group.every(i=>bottom(blocks[i])<=.24+EPS))return true;
    const contacts=[],center=[0,0];let mass=0;
    for(const i of group){const b=blocks[i],weight=b.size.reduce((a,v)=>a*v,1);mass+=weight;center[0]+=b.position[0]*weight;center[1]+=b.position[2]*weight;
      for(const j of standing)contacts.push(...contact(b,blocks[j],decorative));
    }
    return contacts.length>0&&contains(contacts,center.map(v=>v/mass));
  }
  for(const group of groups)if(supported(group))group.forEach(i=>standing.add(i));
  // Trim is mounted on its original contact surfaces. It cannot carry word bricks.
  const decorations=remaining.filter(i=>!structural.includes(i)).sort((a,b)=>blocks[a].position[1]-blocks[b].position[1]);
  for(const index of decorations)if(blocks[index].attachedTo!==undefined?standing.has(blocks[index].attachedTo):supported([index],true))standing.add(index);
  const detachedBlockIndices=remaining.filter(i=>!standing.has(i));
  return {standingBlockIndices:[...standing].sort((a,b)=>a-b),detachedBlockIndices,fallenIds:detachedBlockIndices.map(i=>blocks[i].wordId).filter(Boolean)};
}

export function buildingBlockFallen(block,index,state){return (state.detachedBlockIndices??[]).includes(index)||(state.fallenIds??[]).includes(block.wordId);}
