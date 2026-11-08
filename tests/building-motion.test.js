import {it,expect} from 'vitest';
import * as THREE from 'three';
import {buildingBlocks,blockHome,blockRubble,sampleBlockMotion} from '../src/building-models.js';
it('four complete buildings have distinct finite three-dimensional blocks above the foundation',()=>{
  const signatures=[];for(const type of ['house','bridge','tower','building']){
    const blocks=buildingBlocks(type);expect(blocks).toHaveLength(16);expect(blocks.every(b=>b.size.every(n=>Number.isFinite(n)&&n>0)&&b.position.every(Number.isFinite)&&b.position[1]>=b.size[1]/2-.01)).toBe(true);
    expect(Math.max(...blocks.map(b=>b.position[1]+b.size[1]/2))).toBeGreaterThan(2);signatures.push(JSON.stringify(blocks));
  }expect(new Set(signatures).size).toBe(4);
});
it('collapsed tower parts spread over the ground rather than retaining an upright tower',()=>{
  const blocks=buildingBlocks('tower'),homes=blocks.map(blockHome),rubble=blocks.map(blockRubble);
  expect(Math.max(...rubble.map(p=>p.position[1]))).toBeLessThan(2);
  expect(rubble.filter((p,i)=>Math.hypot(p.position[0]-homes[i].position[0],p.position[2]-homes[i].position[2])>1).length).toBeGreaterThan(10);
  expect(rubble.every(p=>p.rotation.some(v=>Math.abs(v)>.5))).toBe(true);
});
it('drop, collapse and return sample exact endpoints and clearly move in between without mutating poses',()=>{
  const block=buildingBlocks('house')[4],home=blockHome(block),rubble=blockRubble(block,4),above={position:[...home.position],rotation:[0,.4,0]};above.position[1]+=4;
  for(const [kind,from,to]of [['drop',above,home],['collapse',home,rubble],['restore',rubble,home]]){
    const before=JSON.stringify({from,to});expect(sampleBlockMotion({from,to,kind,index:4,progress:0})).toEqual(from);expect(sampleBlockMotion({from,to,kind,index:4,progress:1})).toEqual(to);
    const mid=sampleBlockMotion({from,to,kind,index:4,progress:.5});expect(mid.position.every(Number.isFinite)).toBe(true);expect(mid).not.toEqual(from);expect(mid).not.toEqual(to);
    if(kind==='restore')expect(mid.position[1]).toBeGreaterThan(Math.max(from.position[1],to.position[1]));expect(JSON.stringify({from,to})).toBe(before);
  }
});
it('collapsed roof panels lie low on the ground rather than standing on their deep edge',()=>{
  for(const type of ['house','tower'])for(const [index,block]of buildingBlocks(type).entries())if(['gable','roof'].includes(block.kind)){
    const pose=blockRubble(block,index),geometry=new THREE.BoxGeometry(...block.size),mesh=new THREE.Mesh(geometry);
    mesh.position.set(...pose.position);mesh.rotation.set(...pose.rotation);const bounds=new THREE.Box3().setFromObject(mesh);
    expect(bounds.max.y).toBeLessThan(2.2);expect(bounds.min.y).toBeGreaterThanOrEqual(0);geometry.dispose();mesh.material.dispose();
  }
});
