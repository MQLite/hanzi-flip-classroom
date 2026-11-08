import * as THREE from 'three';
import {blockHome,blockRubble,sampleBlockMotion} from './building-models.js';

export function buildingCameraFrame(blocks,aspect,phase){
  const direction=new THREE.Vector3(9,7,11).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  function include(block,pose){
    const rotation=new THREE.Euler(...pose.rotation),position=new THREE.Vector3(...pose.position);
    for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
      const point=new THREE.Vector3(x*(block.size[0]+.2),y*(block.size[1]+.22),z*(block.size[2]+.3)).applyEuler(rotation).add(position),px=point.dot(right),py=point.dot(up);
      minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
    }
  }
  blocks.forEach((block,index)=>{
    const home=blockHome(block);include(block,home);
    if(phase==='collapsed'||phase==='restored'){
      const rubble=blockRubble(block,index);include(block,rubble);
      for(const progress of [.25,.5,.75])for(const kind of ['collapse','restore'])include(block,sampleBlockMotion({from:kind==='collapse'?home:rubble,to:kind==='collapse'?rubble:home,kind,index,progress}));
    }
  });
  if(!blocks.length){minX=minY=-2;maxX=maxY=2;}
  const ratio=Number.isFinite(aspect)&&aspect>0?aspect:1,span=Math.max(3.2,maxY-minY,(maxX-minX)/ratio)*1.16;
  const target=right.clone().multiplyScalar((minX+maxX)/2).addScaledVector(up,(minY+maxY)/2),position=target.clone().addScaledVector(direction,18);
  return {left:-span*ratio/2,right:span*ratio/2,top:span/2,bottom:-span/2,target:target.toArray(),position:position.toArray()};
}
