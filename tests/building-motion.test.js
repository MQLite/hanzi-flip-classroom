import {it,expect} from 'vitest';
import * as THREE from 'three';
import {buildingBlocks,blockHome,blockRubble,sampleBlockMotion} from '../src/building-models.js';
it('four complete buildings have distinct finite three-dimensional blocks above the foundation',()=>{
  const signatures=[];for(const type of ['house','bridge','tower','building']){
    const blocks=buildingBlocks(type);expect(blocks).toHaveLength(16);expect(blocks.every(b=>b.size.every(n=>Number.isFinite(n)&&n>0)&&b.position.every(Number.isFinite)&&b.position[1]>=b.size[1]/2-.01)).toBe(true);
    expect(Math.max(...blocks.map(b=>b.position[1]+b.size[1]/2))).toBeGreaterThan(2);signatures.push(JSON.stringify(blocks));
  }expect(new Set(signatures).size).toBe(4);
});
it('unsupported tower pieces settle downward near their original footprints with bounded tilt',()=>{
  const blocks=buildingBlocks('tower'),homes=blocks.map(blockHome),rubble=blocks.map(blockRubble);
  expect(Math.max(...rubble.map(p=>p.position[1]))).toBeLessThan(2);
  for(const [i,pose]of rubble.entries()){
    expect(Math.hypot(pose.position[0]-homes[i].position[0],pose.position[2]-homes[i].position[2])).toBeLessThan(.2);
    expect(pose.position[1]).toBeLessThanOrEqual(homes[i].position[1]);expect(Math.max(...pose.rotation.map(Math.abs))).toBeLessThan(.2);
  }
});
it('drop, collapse and return sample exact endpoints and clearly move in between without mutating poses',()=>{
  const block=buildingBlocks('house')[4],home=blockHome(block),rubble=blockRubble(block,4),above={position:[...home.position],rotation:[0,.4,0]};above.position[1]+=4;
  for(const [kind,from,to]of [['drop',above,home],['collapse',home,rubble],['restore',rubble,home]]){
    const before=JSON.stringify({from,to});expect(sampleBlockMotion({from,to,kind,index:4,progress:0})).toEqual(from);expect(sampleBlockMotion({from,to,kind,index:4,progress:1})).toEqual(to);
    const mid=sampleBlockMotion({from,to,kind,index:4,progress:.5});expect(mid.position.every(Number.isFinite)).toBe(true);expect(mid).not.toEqual(from);expect(mid).not.toEqual(to);
    if(kind==='restore')expect(mid.position[1]).toBeGreaterThan(Math.max(from.position[1],to.position[1]));expect(JSON.stringify({from,to})).toBe(before);
  }
});
it('fallen roof panels stay above ground and retain a modest tilt instead of standing on a deep edge',()=>{
  for(const type of ['house','tower'])for(const [index,block]of buildingBlocks(type).entries())if(['gable','roof'].includes(block.kind)){
    const pose=blockRubble(block,index),geometry=new THREE.BoxGeometry(...block.size),mesh=new THREE.Mesh(geometry);
    mesh.position.set(...pose.position);mesh.rotation.set(...pose.rotation);const bounds=new THREE.Box3().setFromObject(mesh);
    expect(bounds.min.y).toBeGreaterThanOrEqual(.24);expect(bounds.max.y-bounds.min.y).toBeLessThan(block.size[1]+block.size[0]*.2+block.size[2]*.1);geometry.dispose();mesh.material.dispose();
  }
});
it('gravity samples never rise above the starting position or move an assembly outward',()=>{
  const home={position:[2,4,0],rotation:[0,0,0]},ground={position:[2.14,.8,.12],rotation:[.06,0,.14]};
  let previous=home.position[1];
  for(const kind of ['collapse','settle'])for(const progress of [0,.1,.25,.5,.75,1]){
    if(progress===0)previous=home.position[1];const pose=sampleBlockMotion({from:home,to:ground,kind,progress});
    expect(pose.position[1]).toBeLessThanOrEqual(previous);expect(pose.position[0]).toBeGreaterThanOrEqual(2);expect(pose.position[0]).toBeLessThanOrEqual(2.14);previous=pose.position[1];
  }
});
