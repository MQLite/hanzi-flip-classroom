import * as THREE from 'three';
import {mazePoint,sampleMazeWalk,mazeCameraFrame} from './maze-motion.js';

const el=(tag,cls)=>{const node=document.createElement(tag);node.className=cls;return node;};
export function createMazeScene(host,board,{onBusyChange=()=>{}}={}){
  const world=el('div','maze-world'),caption=el('p','maze-motion-status'),toggle=el('button','maze-scene-mode');
  caption.id='maze-motion-status';caption.setAttribute('role','status');caption.tabIndex=-1;toggle.id='maze-scene-mode';toggle.type='button';host.prepend(world);host.append(toggle,caption);
  const media=matchMedia('(prefers-reduced-motion: reduce)'),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-6,6,6,-6,.1,80),layout=new THREE.Group(),player=new THREE.Group(),gate=new THREE.Group(),confetti=new THREE.Group();scene.add(layout,player,gate,confetti);
  const geometry={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,14,10),cylinder:new THREE.CylinderGeometry(.5,.5,1,12),star:new THREE.OctahedronGeometry(.12),smile:new THREE.TorusGeometry(.052,.009,6,12,Math.PI)};
  const materials=new Map(),paperMaterials=[];
  function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.73,metalness:.02}));return materials.get(color);}
  function mesh(kind,color,size,position,parent=scene){const node=new THREE.Mesh(geometry[kind],material(color));node.scale.set(...size);node.position.set(...position);node.castShadow=true;node.receiveShadow=true;parent.add(node);return node;}
  mesh('box','#a5bd91',[9.65,.23,9.65],[0,-.17,0]);
  const sun=new THREE.DirectionalLight('#fff1d0',2.6);sun.position.set(-5,12,8);sun.castShadow=true;sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-8,right:8,top:9,bottom:-8,near:1,far:35});sun.shadow.normalBias=.025;sun.shadow.bias=-.0003;
  scene.add(new THREE.HemisphereLight('#fff7e4','#a3baa0',2.2),sun);
  // The explorer uses shared primitives so rounds never create another avatar or renderer.
  mesh('cylinder','#6f9fb7',[.31,.37,.29],[0,.48,0],player);mesh('box','#d4b46a',[.20,.23,.10],[0,.49,-.17],player);
  mesh('sphere','#edc498',[.18,.18,.17],[0,.80,0],player);mesh('sphere','#e8bc57',[.20,.11,.20],[0,.925,0],player);mesh('box','#e8bc57',[.37,.035,.12],[0,.92,.16],player);
  for(const x of [-.06,.06])mesh('sphere','#3d4a40',[.024,.028,.022],[x,.81,.16],player);
  const smile=mesh('smile','#946b4c',[1,1,1],[0,.755,.171],player);smile.rotation.z=Math.PI;
  const legs=[],arms=[];
  for(const sign of [-1,1]){const leg=new THREE.Group();leg.position.set(sign*.085,.29,0);player.add(leg);mesh('cylinder','#587b88',[.10,.25,.10],[0,-.13,0],leg);mesh('box','#8d7355',[.12,.075,.19],[0,-.27,.045],leg);legs.push(leg);
    const arm=new THREE.Group();arm.position.set(sign*.21,.62,0);player.add(arm);mesh('cylinder','#6f9fb7',[.08,.22,.08],[0,-.12,0],arm);mesh('sphere','#edc498',[.055,.055,.055],[0,-.25,0],arm);arms.push(arm);}
  mesh('box','#af8d67',[.035,.8,.035],[-4.62,.4,-3]);mesh('box','#d88972',[.30,.19,.025],[-4.48,.71,-3]);
  for(const x of [-.42,.42])mesh('box','#dcb65c',[.10,1.2,.14],[x,.6,.23],gate);mesh('box','#e9c66e',[.95,.13,.16],[0,1.22,.23],gate);mesh('star','#ecd078',[1,1,1],[0,1.54,.23],gate);
  const gateGlow=material('#e9c66e');gateGlow.emissive.set('#d5a83e');gateGlow.emissiveIntensity=.12;
  const paperColors=['#e4be64','#9fb9c7','#be9db5','#8fb599','#d89a76'];for(const color of paperColors)paperMaterials.push(new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false}));
  for(let i=0;i<60;i++){const paper=new THREE.Mesh(geometry.box,paperMaterials[i%5]);paper.scale.set(.09,.035,.14);confetti.add(paper);}confetti.visible=false;
  let renderer,state,tiles=new Map(),motion=null,frame=0,active=false,simple=false,available=true,disposed=false,settledCell=9;
  function rest(){legs.forEach(n=>n.rotation.set(0,0,0));arms.forEach(n=>n.rotation.set(0,0,0));player.rotation.z=0;}
  function status(){
    host.dataset.renderMode=simple||!available?'flat':'3d';host.dataset.motion=motion?.kind??'idle';host.dataset.avatarCell=String(settledCell);host.setAttribute('aria-busy',String(Boolean(motion)));
    caption.textContent=(host.dataset.renderMode==='3d'?'3D迷宫 · ':'平面迷宫 · ')+(motion?.kind==='walk'?'读对啦，小人正在走向下一格…':motion?.kind==='celebrate'?'到达出口！跳起来一起庆祝！':state?.phase==='complete'?'找到出口，可以选择下一课啦':'先读字，老师确认后小人再前进');
    toggle.textContent=host.dataset.renderMode==='3d'?'平面显示':'立体显示';toggle.setAttribute('aria-label',host.dataset.renderMode==='3d'?'切换平面迷宫':'切换立体迷宫');toggle.disabled=!available;
  }
  function project(){
    const width=world.clientWidth,height=world.clientHeight;
    for(const button of board.querySelectorAll('[data-maze-cell]')){
      const index=Number(button.dataset.mazeCell);button.classList.toggle('has-pawn',index===state?.position||(motion?.kind==='walk'&&index===motion.from));
      if(simple||!available){for(const key of ['position','left','top','width','height','transform'])button.style.removeProperty(key);button.querySelector('strong').style.removeProperty('font-size');continue;}
      if(!width||!height)continue;const point=new THREE.Vector3(...mazePoint(index)).project(camera),horizontal=new THREE.Vector3(mazePoint(index)[0]+.87,.14,mazePoint(index)[2]).project(camera),vertical=new THREE.Vector3(mazePoint(index)[0],.14,mazePoint(index)[2]+.87).project(camera);
      const w=Math.abs(horizontal.x-point.x)*width/2,h=Math.abs(vertical.y-point.y)*height/2;
      Object.assign(button.style,{position:'absolute',left:`${(point.x+1)*width/2}px`,top:`${(1-point.y)*height/2}px`,width:`${w}px`,height:`${h}px`,transform:'translate(-50%,-50%)'});button.querySelector('strong').style.fontSize=`${Math.max(15,Math.min(24,w*.67,h*.82))}px`;
    }
  }
  function draw(){if(disposed||!active||document.hidden||simple||!available||!renderer)return;try{renderer.render(scene,camera);}catch{fallback();}}
  function finish(){
    cancelAnimationFrame(frame);frame=0;const busy=Boolean(motion);motion=null;confetti.visible=false;gateGlow.emissiveIntensity=.12;rest();if(state){settledCell=state.position;player.position.set(...mazePoint(state.position));if(state.phase==='complete')player.rotation.y=0;}status();project();if(busy)onBusyChange(false);draw();
  }
  function fallback(){available=false;simple=true;finish();}
  function lost(event){event.preventDefault();fallback();}
  function restored(){available=true;status();}
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.addEventListener('webglcontextlost',lost);renderer.domElement.addEventListener('webglcontextrestored',restored);world.append(renderer.domElement);}catch{available=false;simple=true;}
  function resize(){if(disposed)return;const width=world.clientWidth,height=world.clientHeight;if(renderer&&width&&height){renderer.setSize(width,height,false);const fit=mazeCameraFrame(width/height);for(const key of ['left','right','top','bottom'])camera[key]=fit[key];camera.position.set(...fit.position);camera.lookAt(...fit.target);camera.updateProjectionMatrix();}project();draw();}
  function allowed(){return active&&!document.hidden&&!simple&&available&&!media.matches;}
  function celebrate(now){motion={kind:'celebrate',start:now,duration:1800};player.rotation.y=0;status();project();onBusyChange(true);}
  function tick(now){
    frame=0;if(!motion||disposed||!allowed()){finish();return;}const t=Math.max(0,Math.min(1,(now-motion.start)/motion.duration));
    if(motion.kind==='walk'){
      const pose=sampleMazeWalk(motion.from,motion.to,t);player.position.set(...pose.position);player.rotation.y=pose.heading;legs.forEach((leg,i)=>leg.rotation.x=pose.swing*(i?1:-1));arms.forEach((arm,i)=>arm.rotation.x=pose.swing*(i?-1:1));draw();if(!motion||disposed)return;
      if(t>=1){settledCell=state.position;rest();if(motion.win){celebrate(now);frame=requestAnimationFrame(tick);}else finish();}else frame=requestAnimationFrame(tick);return;
    }
    const goal=mazePoint(state.goal);player.position.set(goal[0],goal[1]+Math.abs(Math.sin(t*3*Math.PI))*.42*(1-t*.5),goal[2]);player.rotation.z=Math.sin(t*6*Math.PI)*.06;arms.forEach((arm,i)=>arm.rotation.z=(i?1:-1)*(2.4+Math.sin(t*10*Math.PI)*.18));confetti.visible=true;gateGlow.emissiveIntensity=.12+Math.sin(t*Math.PI)*.8;
    paperMaterials.forEach(m=>m.opacity=Math.sin(t*Math.PI)*.9);confetti.children.forEach((paper,i)=>{const angle=i*2.399963,r=.12+.66*Math.sin(t*Math.PI)*(.55+(i%4)*.13);paper.position.set(goal[0]+Math.cos(angle)*r,goal[1]+.4+2.2*Math.sin(t*Math.PI)*(.5+(i%7)/14),goal[2]+Math.sin(angle)*r);paper.rotation.set(t*9+i,t*7+i*.5,t*10+i*.3);});
    draw();if(t>=1)finish();else frame=requestAnimationFrame(tick);
  }
  const observer=new ResizeObserver(resize);observer.observe(world);
  function visibility(){if(document.hidden)finish();else resize();}
  function preference(){if(media.matches)finish();}
  document.addEventListener('visibilitychange',visibility);media.addEventListener('change',preference);
  const api={update(next){
    const previous=state,fresh=previous?.grid!==next.grid;state=next;
    if(fresh){finish();layout.clear();tiles=new Map();next.grid.forEach((open,index)=>{const [x,,z]=mazePoint(index);if(open){const tile=mesh('box','#fff3d7',[.965,.09,.965],[x,.035,z],layout);tile.castShadow=false;tiles.set(index,tile);}else{mesh('box','#608568',[.98,.58,.98],[x,.29,z],layout);mesh('box','#829b72',[.94,.045,.94],[x,.60,z],layout);}});gate.position.set(...mazePoint(next.goal));settledCell=next.position;player.position.set(...mazePoint(next.position));player.rotation.y=Math.PI/2;}
    for(const [index,tile]of tiles)tile.material=material(index===next.pendingIndex?'#ecd18a':index===next.position?'#b8d4af':next.visited.includes(index)?'#dae6bc':'#fff3d7');
    if(!fresh&&previous.position!==next.position){finish();state=next;const from=previous.position,to=next.position,a=mazePoint(from),b=mazePoint(to);
      if(allowed()&&Math.abs(a[0]-b[0])+Math.abs(a[2]-b[2])===1){settledCell=from;player.position.set(...a);motion={kind:'walk',from,to,win:next.phase==='complete',start:performance.now(),duration:620};status();onBusyChange(true);frame=requestAnimationFrame(tick);}else finish();
    }
    status();resize();
  },get isAnimating(){return Boolean(motion);},setActive(value){active=Boolean(value);if(!active)finish();else resize();},setSimple(value){simple=Boolean(value)||!available;finish();resize();},dispose(){disposed=true;active=false;finish();observer.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',preference);renderer?.domElement.removeEventListener('webglcontextlost',lost);renderer?.domElement.removeEventListener('webglcontextrestored',restored);Object.values(geometry).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());paperMaterials.forEach(m=>m.dispose());sun.shadow.dispose();renderer?.dispose();world.remove();toggle.remove();caption.remove();}};
  toggle.onclick=()=>api.setSimple(!simple);status();return api;
}
