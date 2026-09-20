import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createWorkshopScene(host, onFallback) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-9, 9, 4.5, -4.5, 0.1, 60);
  camera.position.set(0, -5.2, 24); camera.lookAt(0, 0, 0);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer, frame, active = false, simple = false, available = true, disposed = false;
  let blocks = [], optionKey = '', revision, selected = '', rewardStart = 0;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const material = color => { const m = new THREE.MeshStandardMaterial({color, roughness:0.74}); materials.add(m); return m; };
  const wood = material(0xdcb17c), edge = material(0xa76d43), cream = material(0xfff2d3), green = material(0x36756a), mint = material(0xc0d7c4), coral = material(0xe39371), gold = material(0xf2c16d);
  const geometry = new RoundedBoxGeometry(1, 1, 1, 3, 0.10); geometries.add(geometry);
  function box(w, h, d, x, y, z, mat, parent = scene) {
    const mesh = new THREE.Mesh(geometry, mat); mesh.scale.set(w,h,d); mesh.position.set(x,y,z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  box(17.65,8.95,0.5,0,0,-0.35,edge);
  const tabletop=box(17.5,8.8,0.28,0,0,-0.05,wood);
  // Fine grain is a single reusable texture, never a frame-by-frame canvas.
  const grain = document.createElement('canvas'); grain.width=1024; grain.height=512;
  const ctx = grain.getContext('2d'); ctx.fillStyle='#deb889'; ctx.fillRect(0,0,1024,512);
  for(let i=0;i<110;i++) {
    const y=i*4.9; ctx.strokeStyle=i%3 ? '#a9754320' : '#fff4ce35'; ctx.lineWidth=i%4 ? 0.7 : 1.5;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.bezierCurveTo(310,y+Math.sin(i)*9,700,y-Math.cos(i)*12,1024,y+3); ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(grain); texture.colorSpace=THREE.SRGBColorSpace; textures.add(texture);
  const grainMat=new THREE.MeshStandardMaterial({map:texture,roughness:0.88}); materials.add(grainMat);
  tabletop.material=grainMat;
  // The tray is recessed into its raised green lip.
  box(5.15,3.7,0.16,-0.8,0.9,0.18,green);
  box(4.83,3.36,0.08,-0.8,0.92,0.27,mint);
  box(4.42,1.50,0.065,-0.8,1.15,0.32,material(0xa7c7b5));
  box(2.35,2.48,0.12,-5.55,1.36,0.23,cream);
  box(0.7,0.32,0.18,-5.55,2.65,0.34,coral).rotation.z=-0.06;
  box(3.64,5.95,0.20,5.15,0.02,0.23,green);
  box(3.42,5.73,0.15,5.2,0.04,0.40,cream);
  const metal=material(0xaeb8a7);
  for(let i=0;i<8;i++) box(0.15,0.10,0.14,3.52,2.35-i*0.64,0.57,metal);
  const pencil=new THREE.Group(); pencil.position.set(7.6,-0.3,0.31); pencil.rotation.z=-0.12; scene.add(pencil);
  box(0.16,3.0,0.16,0,0,0,gold,pencil); box(0.18,0.4,0.18,0,1.6,0,coral,pencil);
  const tipGeo=new THREE.ConeGeometry(0.10,0.36,6); geometries.add(tipGeo);
  const tip=new THREE.Mesh(tipGeo,edge); tip.position.y=-1.67; tip.rotation.z=Math.PI; pencil.add(tip);
  box(0.85,0.45,0.28,-6.5,-3.24,0.29,coral).rotation.z=-0.16;
  box(0.38,0.46,0.29,-6.57,-3.23,0.3,cream).rotation.z=-0.16;
  const sparkGeo=new THREE.OctahedronGeometry(0.11); geometries.add(sparkGeo);
  const sparks=Array.from({length:12},()=>{const m=new THREE.Mesh(sparkGeo,gold);m.visible=false;scene.add(m);return m;});
  scene.add(new THREE.HemisphereLight(0xfff9ed,0x9b8f71,2.9));
  const sun=new THREE.DirectionalLight(0xfff0d1,3.0);sun.position.set(-5,7,12);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-11;sun.shadow.camera.right=11;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;
  sun.shadow.normalBias=0.035; sun.shadow.bias=-0.0003; scene.add(sun);

  function project(position) {
    const p=position.clone().project(camera);return {x:(p.x+1)*host.clientWidth/2,y:(1-p.y)*host.clientHeight/2};
  }
  function placeLabels() {
    const mobile=host.clientWidth<=720, scale=host.clientWidth/18;
    // Project the desk typography as well as the buttons: tall and short
    // projectors see the same physical arrangement, without percentage drift.
    const overlays=['.desk-intro','.desk-kicker','.workshop-target-card','.desk-intro p','.desk-tray-caption','.desk-submit','.desk-palette-caption','#desk-notebook'];
    if(mobile) overlays.forEach(selector=>host.querySelector(selector).removeAttribute('style'));
    else {
      const intro=host.querySelector('.desk-intro');Object.assign(intro.style,{left:'0',top:'0',width:'100%',height:'100%'});
      function anchor(selector,x,y,width,center=true){
        const element=host.querySelector(selector),p=project(new THREE.Vector3(x,y,.5));
        Object.assign(element.style,{position:'absolute',left:`${p.x}px`,top:`${p.y}px`,width:`${width*scale}px`,transform:center?'translate(-50%, -50%)':'none',margin:'0'});
        return element;
      }
      anchor('.desk-kicker',-5.55,3.20,2.8);
      const target=anchor('.workshop-target-card',-5.55,1.38,2.2);target.style.height=`${2.2*scale}px`;
      host.querySelector('#workshop-target').style.fontSize=`${Math.min(94,scale*1.1)}px`;
      anchor('.desk-intro p',-5.55,-.53,3.2);
      anchor('.desk-tray-caption',-.8,2.00,4.6);
      const submit=anchor('.desk-submit',-.8,.36,4.6);submit.style.transform='translateX(-50%)';
      anchor('.desk-palette-caption',-5.68,-1.17,7,false);
      const paper=anchor('#desk-notebook',3.83,2.55,2.78,false);
      const bottom=project(new THREE.Vector3(3.83,-2.54,.5));
      paper.style.bottom='auto';paper.style.right='auto';paper.style.height=`${bottom.y-parseFloat(paper.style.top)}px`;
    }
    if(mobile)host.querySelector('#workshop-target').style.removeProperty('font-size');
    blocks.forEach(block=>{
      const p=project(block.mesh.position.clone().add(new THREE.Vector3(0,0,0.22)));
      const w=host.clientWidth / (camera.right-camera.left) * block.width;
      block.button.style.left=`${p.x}px`;block.button.style.top=`${p.y}px`;
      block.button.style.width=`${w}px`;block.button.style.height=`${Math.max(42,host.clientHeight/(camera.top-camera.bottom)*0.95)}px`;
      block.button.style.fontSize=`${Math.max(13,Math.min(34,(w-26)/(Math.max(2,[...block.word].length)+0.8)))}px`;
      block.button.style.zIndex=block.word===selected?'6':'4';
    });
  }
  function resize() {
    if(disposed || !host.clientWidth || !host.clientHeight)return;
    const ratio=host.clientWidth/host.clientHeight;
    camera.left=-9;camera.right=9;camera.top=9/ratio;camera.bottom=-9/ratio;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    renderer?.setSize(host.clientWidth,host.clientHeight,false);placeLabels();
    if(renderer && !simple && available) renderer.render(scene,camera);
  }
  function settle() {
    blocks.forEach(b=>{b.mesh.position.copy(b.to);b.start=0;});
    rewardStart=0;sparks.forEach(s=>{s.visible=false;});placeLabels();
  }
  function draw(t) {
    frame=undefined;
    if(!active||simple||disposed||document.hidden||!available)return;
    blocks.forEach(b=>{
      if(!b.start)return;
      const p=Math.min((t-b.start)/580,1), eased=1-Math.pow(1-p,3);
      b.mesh.position.lerpVectors(b.from,b.to,eased); b.mesh.position.z+=Math.sin(p*Math.PI)*0.8;
      if(p===1)b.start=0;
    });
    if(rewardStart){
      const p=Math.min((t-rewardStart)/850,1);
      sparks.forEach((s,i)=>{s.visible=p<1;s.position.set(-0.8+Math.cos(i*2.4)*p*2.1,1.15+Math.sin(i*2.4)*p*1.5,0.8+p);s.scale.setScalar(1-p);});
      if(p===1)rewardStart=0;
    }
    placeLabels(); renderer.render(scene,camera);
    if(blocks.some(b=>b.start)||rewardStart)frame=requestAnimationFrame(draw);
  }
  function schedule(){cancelAnimationFrame(frame);if(active&&!simple&&!disposed&&!document.hidden&&available)frame=requestAnimationFrame(draw);}
  function fallback(message){simple=true;host.dataset.mode='simple';if(renderer)renderer.domElement.hidden=true;cancelAnimationFrame(frame);settle();if(message)onFallback(message);}
  function contextLost(event){event.preventDefault();available=false;fallback('立体显示暂不可用，已切换简化桌面，词语和得分已保留。');}
  function contextRestored(){available=true;}
  function visibility(){if(document.hidden)settle();schedule();}
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-label','木质组词桌面，立体词语方块、中央选词托盘和词语记录本');
    host.prepend(renderer.domElement);host.dataset.mode='webgl';
    renderer.domElement.addEventListener('webglcontextlost',contextLost);renderer.domElement.addEventListener('webglcontextrestored',contextRestored);
  }catch{available=false;fallback('当前设备使用简化桌面，课堂可以照常进行。');}
  const observer=new ResizeObserver(()=>{resize();schedule();});observer.observe(host);
  document.addEventListener('visibilitychange',visibility);resize();
  return {
    update({options=[],value='',key}){
      const changed=key!==revision;revision=key;
      const nextKey=JSON.stringify([key,options]);
      if(nextKey!==optionKey){
        blocks.forEach(b=>scene.remove(b.mesh));blocks=[];optionKey=nextKey;
        const buttons=[...host.querySelectorAll('#workshop-tiles button')];
        const columns=Math.min(3,Math.max(1,options.length)),rows=Math.ceil(options.length/columns);
        options.forEach((word,i)=>{
          const width=2.65, x=-4.35+(i%columns)*3.08, y=rows===1?-2.00:-1.72-Math.floor(i/columns)*1.35;
          const home=new THREE.Vector3(x,y,0.44),mesh=box(width,1.1,0.43,x,y,0.44,i%3===0?cream:i%3===1?gold:coral);
          blocks.push({word,button:buttons[i],mesh,width,home,from:home.clone(),to:home.clone(),start:0});
        });
      }
      const selectionChanged=selected!==value;selected=value;
      blocks.forEach(b=>{
        const to=b.word===value?new THREE.Vector3(-0.8,1.15,0.66):b.home.clone();
        if(!b.to.equals(to)){
          b.from.copy(b.mesh.position);b.to.copy(to);
          if(!reduced&&active&&!simple&&!changed)b.start=performance.now();else{b.mesh.position.copy(to);b.start=0;}
        }
      });
      if(changed)settle();
      placeLabels();if(selectionChanged||changed)schedule();
    },
    reward(){if(!reduced&&active&&!simple){rewardStart=performance.now();schedule();}},
    setActive(value){active=value;settle();if(value)resize();schedule();},
    setSimple(value){if(value)fallback();else if(renderer&&available){simple=false;host.dataset.mode='webgl';renderer.domElement.hidden=false;resize();schedule();}else onFallback('此设备暂不支持立体显示，请继续使用简化桌面。');},
    dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);renderer?.domElement.removeEventListener('webglcontextlost',contextLost);renderer?.domElement.removeEventListener('webglcontextrestored',contextRestored);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.shadow.dispose();renderer?.dispose();renderer?.domElement.remove();},
  };
}
