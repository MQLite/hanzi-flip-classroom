import {it,expect} from 'vitest';
import * as THREE from 'three';
import {mazePoint,sampleMazeWalk,mazeCameraFrame} from '../src/maze-motion.js';
it('maps actual start and exit cells to a consistent3D board and only walks one neighboring cell',()=>{
  expect(mazePoint(9)).toEqual([-4,.14,-3]);expect(mazePoint(71)).toEqual([4,.14,3]);
  expect(sampleMazeWalk(9,10,0).position).toEqual([-4,.14,-3]);expect(sampleMazeWalk(9,10,1).position).toEqual([-3,.14,-3]);
  const middle=sampleMazeWalk(9,10,.4);expect(middle.position[0]).toBeGreaterThan(-4);expect(middle.position[0]).toBeLessThan(-3);expect(Math.abs(middle.swing)).toBeGreaterThan(.1);
  for(const [from,to]of [[9,11],[8,9],[9,19],[-1,0]])expect(()=>sampleMazeWalk(from,to,.5)).toThrow();
});
it('keeps board, avatar and exit celebration bounds in frame on phone and projector',()=>{
  const bounds=[
    {xs:[-4.85,4.85],ys:[-.3,.65],zs:[-4.85,4.85]},
    {xs:[-4.5,4.5],ys:[.10,1.6],zs:[-4.4,4.4]},
    {xs:[3.2,4.8],ys:[.14,2.9],zs:[2.15,3.85]},
  ];
  for(const aspect of [346/360,432/420,365/330,852/440,1098/780]){
    const frame=mazeCameraFrame(aspect),camera=new THREE.OrthographicCamera(frame.left,frame.right,frame.top,frame.bottom,.1,80);camera.position.set(...frame.position);camera.lookAt(...frame.target);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
    for(const {xs,ys,zs}of bounds)for(const x of xs)for(const y of ys)for(const z of zs){const point=new THREE.Vector3(x,y,z).project(camera);expect(Math.abs(point.x)).toBeLessThan(.96);expect(Math.abs(point.y)).toBeLessThan(.96);}
  }
});
