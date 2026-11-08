import {it,expect} from 'vitest';
import * as THREE from 'three';
import {buildingCameraFrame} from '../src/building-camera.js';
import {buildingBlocks,blockHome,blockRubble} from '../src/building-models.js';
import {buildingBlueprint} from '../src/building-blueprint.js';
it('frames every assembled and scattered block on mobile and projector aspect ratios',()=>{
  for(const type of ['house','bridge','tower','building'])for(const aspect of [346/235,540/285])for(const phase of ['built','collapsed','restored']){
    const blocks=buildingBlocks(type),frame=buildingCameraFrame(blocks,aspect,phase),camera=new THREE.OrthographicCamera(frame.left,frame.right,frame.top,frame.bottom,.1,80);
    camera.position.set(...frame.position);camera.lookAt(...frame.target);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
    for(const [index,block]of blocks.entries()){
      const pose=phase==='collapsed'?blockRubble(block,index):blockHome(block),rotation=new THREE.Euler(...pose.rotation);
      for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
        const point=new THREE.Vector3(x*block.size[0],y*block.size[1],z*block.size[2]).applyEuler(rotation).add(new THREE.Vector3(...pose.position)).project(camera);
        expect(Math.abs(point.x)).toBeLessThan(.96);expect(Math.abs(point.y)).toBeLessThan(.96);
      }
    }
  }
});
it('fits all sparse/full lesson silhouettes and their remaining rubble without clipping word faces',()=>{
  for(const type of ['house','bridge','tower','building'])for(const variant of [0,1,2,3])for(const n of [1,16])for(const aspect of [346/235,540/285])for(const phase of ['built','collapsed']){
    const blocks=buildingBlueprint(type,{variant,words:Array.from({length:n},(_,i)=>({id:`w${i}`,word:'中文'}))}).blocks,frame=buildingCameraFrame(blocks,aspect,phase),camera=new THREE.OrthographicCamera(frame.left,frame.right,frame.top,frame.bottom,.1,80);camera.position.set(...frame.position);camera.lookAt(...frame.target);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
    blocks.forEach((block,index)=>{const pose=phase==='collapsed'?blockRubble(block,index):blockHome(block),rotation=new THREE.Euler(...pose.rotation);for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){const point=new THREE.Vector3(x*block.size[0],y*block.size[1],z*block.size[2]).applyEuler(rotation).add(new THREE.Vector3(...pose.position)).project(camera);expect(Math.abs(point.x)).toBeLessThan(.96);expect(Math.abs(point.y)).toBeLessThan(.96);}});
  }
});
