import * as THREE from 'three';
import {BUILDING_TYPES,createBuildingArt} from './building-art.js';
import {buildingBlocks,blockHome,blockRubble,sampleBlockMotion} from './building-models.js';
import {buildingCameraFrame} from './building-camera.js';

const node=(tag,cls)=>{const el=document.createElement(tag);el.className=cls;return el;};
export function createBuildingScene(host,{onBusyChange=()=>{}}={}){
  const world=node('div','builder-world'),flat=node('div','builder-flat'),caption=node('p','builder-motion-status'),toggle=node('button','builder-scene-mode');
  caption.id='builder-motion-status';caption.setAttribute('role','status');caption.setAttribute('aria-live','polite');caption.tabIndex=-1;
  toggle.id='builder-scene-mode';toggle.type='button';host.append(world,flat,toggle,caption);
  const media=matchMedia('(prefers-reduced-motion: reduce)'),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,4,-4,.1,80);
  const assembly=new THREE.Group(),river=new THREE.Group(),particles=new THREE.Group();scene.add(assembly,river,particles);
  const geometries={box:new THREE.BoxGeometry(1,1,1),stud:new THREE.CylinderGeometry(.5,.5,1,12),roof:new THREE.CylinderGeometry(.045,.5,1,8),spire:new THREE.ConeGeometry(.5,1,8),dust:new THREE.SphereGeometry(1,7,5)};
  const shape=new THREE.Shape();shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(0,.5);shape.closePath();
  geometries.gable=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});geometries.gable.translate(0,0,-.5);
  const materials=new Map();
  function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.63,metalness:.025}));return materials.get(color);}
  function mesh(geometry,color,size,position,parent=scene){const m=new THREE.Mesh(geometry,material(color));m.scale.set(...size);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  mesh(geometries.stud,'#b5c9a0',[10.3,.3,8.8],[0,-.2,0]);mesh(geometries.stud,'#d8dfbf',[10.5,.08,9],[0,-.045,0]);
  mesh(geometries.box,'#94c5c8',[8,.025,3.35],[0,.02,0],river);
  const sun=new THREE.DirectionalLight('#fff2d7',3);sun.position.set(-4,10,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-8,right:8,top:9,bottom:-8,near:1,far:30});sun.shadow.normalBias=.035;sun.shadow.bias=-.0003;
  scene.add(new THREE.HemisphereLight('#fff9e8','#a5b9ac',2.1),sun);
  const dustMaterial=new THREE.MeshBasicMaterial({color:'#e4cca1',transparent:true,opacity:0,depthWrite:false});
  for(let i=0;i<20;i++){const puff=new THREE.Mesh(geometries.dust,dustMaterial);puff.scale.setScalar(.07+(i%4)*.025);particles.add(puff);}particles.visible=false;
  let renderer,state,blocks=[],descriptors=[],motion=null,frame=0,active=false,simple=false,available=true,disposed=false,partCount=0;
  function setPose(group,pose){group.position.set(...pose.position);group.rotation.set(...pose.rotation);}
  function currentPose(group){return {position:group.position.toArray(),rotation:[group.rotation.x,group.rotation.y,group.rotation.z]};}
  function captionText(){
    host.dataset.renderMode=simple||!available?'flat':'3d';host.dataset.motion=motion?.kind??'idle';host.setAttribute('aria-busy',String(Boolean(motion)));
    const moving={drop:'积木逐块落下，正在就位…',collapse:'轰隆！积木翻转，散落到地面…',restore:'魔法复原！积木正飞回原位…'};
    const settled={build:'大声读词，让积木一块块搭起来',built:'建筑搭好啦，准备随机读词挑战',challenge:'随机读词，看看建筑稳不稳',collapsed:'建筑倒塌了，读出本课句子来拯救',restored:'复原完成！建筑重新站起来啦'};
    caption.textContent=(host.dataset.renderMode==='3d'?'3D积木 · ':'平面显示 · ')+(motion?moving[motion.kind]:settled[state?.phase]??'准备搭建');
    toggle.textContent=host.dataset.renderMode==='3d'?'平面显示':'立体显示';toggle.disabled=!available;toggle.setAttribute('aria-label',host.dataset.renderMode==='3d'?'切换平面显示':'切换立体显示');
  }
  function draw(){
    if(disposed||!active||document.hidden||simple||!available||!renderer)return;
    try{renderer.render(scene,camera);}catch{fallback();}
  }
  function finish(){
    cancelAnimationFrame(frame);frame=0;const wasBusy=Boolean(motion);
    if(motion){for(const item of motion.items){item.group.visible=true;setPose(item.group,item.to);}motion=null;}
    assembly.position.set(0,0,0);particles.visible=false;captionText();if(wasBusy)onBusyChange(false);draw();
  }
  function fallback(){available=false;simple=true;finish();captionText();}
  function lost(event){event.preventDefault();fallback();}
  function restored(){available=true;captionText();}
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
    renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.addEventListener('webglcontextlost',lost);renderer.domElement.addEventListener('webglcontextrestored',restored);world.append(renderer.domElement);
  }catch{available=false;simple=true;}
  function resize(){
    if(disposed||!renderer)return;const width=world.clientWidth,height=world.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);const fit=buildingCameraFrame(descriptors,width/height,state?.phase);
    for(const key of ['left','right','top','bottom'])camera[key]=fit[key];camera.position.set(...fit.position);camera.lookAt(...fit.target);camera.updateProjectionMatrix();draw();
  }
  function makeBlock(description){
    const group=new THREE.Group(),size=description.size;assembly.add(group);
    mesh(geometries[description.kind],description.color,size,[0,0,0],group);
    if(description.kind==='box'&&!['window','door','rail'].includes(description.detail)){
      const nx=Math.min(3,Math.max(1,Math.floor(size[0]/.7))),nz=Math.min(2,Math.max(1,Math.floor(size[2]/.7)));
      for(let x=0;x<nx;x++)for(let z=0;z<nz;z++)mesh(geometries.stud,description.color,[.21,.09,.21],[(x-(nx-1)/2)*Math.min(.65,size[0]/nx),size[1]/2+.045,(z-(nz-1)/2)*Math.min(.65,size[2]/nz)],group);
    }
    if(description.detail==='window'&&size[0]>.6){
      mesh(geometries.box,'#e9dfbe',[size[0]*.61,size[1]*.67,.065],[0,.02,size[2]/2+.035],group);
      mesh(geometries.box,'#9ccbd4',[size[0]*.48,size[1]*.53,.075],[0,.02,size[2]/2+.075],group);
      mesh(geometries.box,'#e9dfbe',[.045,size[1]*.55,.08],[0,.02,size[2]/2+.12],group);
    }
    if(description.detail==='door')mesh(geometries.dust,'#f4d078',[.065,.065,.065],[size[0]*.3,0,size[2]/2+.07],group);
    if(description.detail==='rail')for(const x of [-size[0]*.43,size[0]*.43])mesh(geometries.box,description.color,[.13,.27,.2],[x,-size[1]/2-.13,0],group);
    return group;
  }
  function tick(now){
    frame=0;if(disposed||!active||document.hidden||simple||!available){finish();return;}
    if(!motion){draw();return;}let done=true;
    for(const item of motion.items){
      const progress=Math.max(0,Math.min(1,(now-item.start)/item.duration));item.group.visible=now>=item.start;
      setPose(item.group,sampleBlockMotion({...item,kind:motion.kind,progress}));if(progress<1)done=false;
    }
    const t=Math.max(0,Math.min(1,(now-motion.start)/motion.duration));
    if(motion.kind==='collapse'&&t<.25)assembly.position.x=Math.sin(t*120)*.09*(1-t*4);else assembly.position.x=0;
    particles.visible=motion.kind!=='drop'&&t>0&&t<1;dustMaterial.color.set(motion.kind==='restore'?'#e7bd5d':'#d2bb92');dustMaterial.opacity=Math.sin(Math.PI*t)*.55;
    particles.children.forEach((p,i)=>{const angle=i*2.399963,r=(motion.kind==='restore'?1-t:t)*3.1;p.position.set(Math.cos(angle)*r,.25+Math.sin(Math.PI*t)*(1+(i%4)*.33),Math.sin(angle)*r);});
    draw();if(done)finish();else frame=requestAnimationFrame(tick);
  }
  function animate(kind,indices){
    finish();const start=performance.now(),duration=kind==='drop'?620:kind==='collapse'?1350:1250,stagger=kind==='drop'?85:24;
    const items=indices.map((index,order)=>{
      const group=blocks[index],home=blockHome(descriptors[index]),to=kind==='collapse'?blockRubble(descriptors[index],index):home;
      const from=kind==='drop'?{position:[home.position[0],home.position[1]+4.4,home.position[2]],rotation:[0,(index%2?1:-1)*.35,0]}:currentPose(group);
      setPose(group,from);group.visible=kind!=='drop';return {group,from,to,index,start:start+order*stagger,duration};
    });
    if(!items.length)return;
    motion={kind,items,start,duration:duration+(items.length-1)*stagger};captionText();onBusyChange(true);
    if(media.matches||!active||document.hidden||simple||!available)finish();else frame=requestAnimationFrame(tick);
  }
  const observer=new ResizeObserver(resize);observer.observe(world);
  function visibility(){if(document.hidden)finish();else{resize();draw();}}
  function preference(){if(media.matches)finish();}
  document.addEventListener('visibilitychange',visibility);media.addEventListener('change',preference);
  toggle.onclick=()=>api.setSimple(!simple);
  const api={
    update(next){
      const fresh=state?.words!==next.words||state?.structure!==next.structure,previous=state,count=Math.ceil(16*next.builtIds.length/next.words.length);
      if(fresh){finish();assembly.clear();descriptors=buildingBlocks(next.structure);blocks=descriptors.map(makeBlock);}
      state=next;river.visible=next.structure==='bridge';host.setAttribute('aria-label',`${next.phase==='collapsed'?'已倒塌的':count===16?'完整的':'正在搭建的'}${BUILDING_TYPES[next.structure]}`);
      flat.replaceChildren(createBuildingArt({structure:next.structure,progress:count/16,phase:next.phase}));
      if(fresh){blocks.forEach((group,index)=>{group.visible=index<count;setPose(group,next.phase==='collapsed'?blockRubble(descriptors[index],index):blockHome(descriptors[index]));});}
      else if(next.phase==='collapsed'&&previous.phase!=='collapsed')animate('collapse',blocks.map((_,i)=>i));
      else if(next.phase==='restored'&&previous.phase==='collapsed')animate('restore',blocks.map((_,i)=>i));
      else if(count>partCount)animate('drop',Array.from({length:count-partCount},(_,i)=>i+partCount));
      partCount=count;host.dataset.parts=String(count);captionText();resize();
    },
    get isAnimating(){return Boolean(motion);},
    setActive(value){active=value;if(!value)finish();else{resize();draw();}},
    setSimple(value){simple=Boolean(value)||!available;finish();captionText();resize();},
    dispose(){disposed=true;active=false;finish();observer.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',preference);renderer?.domElement.removeEventListener('webglcontextlost',lost);renderer?.domElement.removeEventListener('webglcontextrestored',restored);Object.values(geometries).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());dustMaterial.dispose();sun.shadow.dispose();renderer?.dispose();host.replaceChildren();},
  };captionText();return api;
}
