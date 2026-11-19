import * as THREE from 'three';
export function mazePoint(index){
  if(!Number.isInteger(index)||index<0||index>=81)throw new TypeError('Invalid maze cell');
  return [index%9-4,.14,Math.floor(index/9)-4];
}
export function sampleMazeWalk(from,to,progress){
  const a=mazePoint(from),b=mazePoint(to);if(Math.abs(a[0]-b[0])+Math.abs(a[2]-b[2])!==1)throw new TypeError('Walk one adjacent cell');
  const t=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
  return {position:[a[0]+(b[0]-a[0])*t,.14+(t===0||t===1?0:Math.sin(Math.PI*t)*.045),a[2]+(b[2]-a[2])*t],heading:Math.atan2(b[0]-a[0],b[2]-a[2]),swing:Math.sin(t*3*Math.PI)*Math.sin(t*Math.PI)*.55};
}
export function mazeCameraFrame(aspect){
  const direction=new THREE.Vector3(0,14,10).normalize(),right=new THREE.Vector3(1,0,0),up=new THREE.Vector3().crossVectors(direction,right);let min=Infinity,max=-Infinity;
  // Reserve height where it is used: walls and walking throughout the board,
  // with the tall celebration only around the exit at the front-right corner.
  const bounds=[{ys:[-.3,.65],zs:[-4.85,4.85]},{ys:[.14,1.35],zs:[-4.3,4.3]},{ys:[.14,2.9],zs:[2.15,3.85]}];
  for(const {ys,zs}of bounds)for(const y of ys)for(const z of zs){const value=new THREE.Vector3(0,y,z).dot(up);min=Math.min(min,value);max=Math.max(max,value);}
  const ratio=Number.isFinite(aspect)&&aspect>0?aspect:1,span=Math.max(max-min,9.7/ratio)*1.08,target=up.clone().multiplyScalar((min+max)/2),position=target.clone().addScaledVector(direction,21);
  return {left:-span*ratio/2,right:span*ratio/2,top:span/2,bottom:-span/2,target:target.toArray(),position:position.toArray()};
}
