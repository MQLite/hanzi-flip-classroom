import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A physical XZ tabletop, seen obliquely. Glyphs are ink textures on the meshes;
// transparent native buttons are projected over them for keyboard/accessibility.
export function createWorkshopScene(host,onFallback){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(36,1,.1,100);
  const target=new THREE.Vector3(0,.35,.20),direction=new THREE.Vector3(2.5,16.8,20).normalize();
  let renderer,frame,active=false,simple=false,available=true,disposed=false;
  let blocks=[],finished=[],paletteKey='',recordKey='',targetKey='',roundKey,selection=[],effect=null,terminalFused=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const geometries=new Set(),materials=new Set(),textures=new Set();
  const rounded=new RoundedBoxGeometry(1,1,1,3,.08);geometries.add(rounded);
  const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.86,...extra});materials.add(m);return m;};
  function woodTexture(base,label='',size=512){
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,size,256);
    for(let i=0;i<95;i++){
      ctx.strokeStyle=i%3?'rgba(76,36,11,.15)':'rgba(255,225,163,.20)';ctx.lineWidth=i%4?.7:1.4;
      const y=i*2.8;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(size*.3,y+Math.sin(i*3)*8,size*.7,y+Math.cos(i)*13,size,y+2);ctx.stroke();
    }
    if(label){
      ctx.strokeStyle='#65411e66';ctx.lineWidth=2;ctx.strokeRect(12,12,size-24,232);
      const length=[...label].length;ctx.font=`700 ${Math.min(210,(size-28)/Math.max(length,1))}px KaiTi, STKaiti, serif`;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#efcd9455';ctx.fillText(label,size/2+2,140);
      ctx.fillStyle='#271f17';ctx.fillText(label,size/2,137);
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.add(texture);return texture;
  }
  const oak=mat(0xffffff,{map:woodTexture('#bd8650')}),walnut=mat(0xffffff,{map:woodTexture('#80502c')}),lightOak=mat(0xffffff,{map:woodTexture('#d7a76c')}),dark=mat(0x463323),brass=mat(0xa88b46,{metalness:.55,roughness:.4}),ink=mat(0x27332e),green=mat(0x657e63);
  const woodMats=[oak,lightOak,mat(0xffffff,{map:woodTexture('#c39357')})];
  function box(w,h,d,x,y,z,material,parent=scene){
    const mesh=new THREE.Mesh(rounded,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  // Five thick joined planks, with real gaps and deep front/side aprons.
  for(let i=0;i<5;i++)box(17.7,.76,1.91,0,-.38,-3.86+i*1.94,woodMats[i%3]);
  box(17.65,1.12,.32,0,-1.0,4.64,walnut);
  box(.32,1.12,9.25,8.66,-1.0,0,walnut);box(.32,1.12,9.25,-8.66,-1.0,0,walnut);
  for(const x of[-7.35,7.35])for(const z of[-3.8,3.8])box(.65,2.15,.65,x,-1.85,z,walnut);
  box(15,.27,.32,0,-2.45,3.8,oak);
  // Recessed candidate case with deep dividers, and an oak typesetting chase.
  box(5.5,.21,6.15,-5.6,.14,.45,walnut);
  for(const x of[-8.4,-2.80])box(.15,.48,6.30,x,.30,.45,oak);
  for(const z of[-2.7,3.6])box(5.75,.48,.18,-5.6,.30,z,oak);
  const rackDividers=[];
  box(6.25,.15,2.1,.6,.16,-1.20,walnut);
  for(const z of[-2.28,-.11])box(6.55,.39,.16,.6,.34,z,oak);
  for(const x of[-2.63,3.83])box(.16,.39,2.15,x,.34,-1.2,oak);
  box(5.8,.08,1.63,.6,.25,-1.2,dark);
  // Mechanical screw at the end of the composing rail.
  box(.7,.4,.7,3.8,.46,-1.2,brass);
  box(.13,.13,1.45,3.8,.83,-1.2,dark);
  // Right-hand physical rack, holding the completed word printing bars.
  box(3.3,.34,6.4,6.0,.22,-.12,walnut);
  for(const x of[4.26,7.73])box(.2,.7,6.65,x,.46,-.12,oak);
  for(let i=0;i<9;i++)box(3.5,.20,.12,6,.43,-3.25+i*.78,oak);
  // Ink roller and capped ink pot: useful printshop props rather than flat icons.
  const cylinder=new THREE.CylinderGeometry(.33,.33,1.50,24);geometries.add(cylinder);
  const roller=new THREE.Mesh(cylinder,ink);roller.rotation.z=Math.PI/2;roller.position.set(.5,.5,2.10);roller.castShadow=true;scene.add(roller);
  box(1.7,.14,.14,.5,.48,2.46,brass);box(.18,.16,1.35,.5,.46,3.10,walnut);
  const potGeo=new THREE.CylinderGeometry(.52,.48,.53,32);geometries.add(potGeo);
  const pot=new THREE.Mesh(potGeo,ink);pot.position.set(2.85,.3,2.65);pot.castShadow=true;scene.add(pot);
  const lid=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.12,32),brass);geometries.add(lid.geometry);lid.position.set(2.85,.61,2.65);scene.add(lid);
  // A small upright wooden target sign on the rear edge.
  const targetSign=new THREE.Group();targetSign.position.set(-5.5,1.15,-3.7);targetSign.rotation.y=.10;scene.add(targetSign);
  box(2.1,1.95,.30,0,0,0,walnut,targetSign);box(2.6,.25,.8,-5.5,.18,-3.7,oak);
  let targetFace;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,45),mat(0xe3d9c5));geometries.add(floor.geometry);floor.rotation.x=-Math.PI/2;floor.position.y=-3.0;floor.receiveShadow=true;scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xfff1d4,0x718173,2.05));
  const sun=new THREE.DirectionalLight(0xffedd0,3.3);sun.position.set(-7,13,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.035;scene.add(sun);
  const sparks=[];const sparkGeo=new THREE.OctahedronGeometry(.10);geometries.add(sparkGeo);
  for(let i=0;i<15;i++){const spark=new THREE.Mesh(sparkGeo,brass);spark.visible=false;scene.add(spark);sparks.push(spark);}
  function topFace(word,w,d,color='#d9af76'){
    const geo=new THREE.PlaneGeometry(w-.12,d-.12);geometries.add(geo);
    const material=mat(0xffffff,{map:woodTexture(color,word,Math.max(256,Math.round(256*(w-.12)/(d-.12)))),roughness:.91});
    const face=new THREE.Mesh(geo,material);face.rotation.x=-Math.PI/2;face.position.y=.351;return face;
  }
  function glyphBlock(word,width=1.02,depth=1.02,source='reference'){
    const group=new THREE.Group();box(width,.70,depth,0,0,0,source==='teacher'?green:woodMats[word.codePointAt(0)%3],group);group.add(topFace(word,width,depth,source==='teacher'?'#66aaa0':'#d9af76'));scene.add(group);return group;
  }
  function discard(group){
    scene.remove(group);group.traverse(child=>{
      if(child.isMesh&&child.geometry!==rounded){geometries.delete(child.geometry);child.geometry.dispose();const m=child.material;if(m.map){textures.delete(m.map);m.map.dispose();}materials.delete(m);m.dispose();}
    });
  }
  function project(v){const p=v.clone().project(camera);return{x:(p.x+1)*host.clientWidth/2,y:(1-p.y)*host.clientHeight/2};}
  function labels(){
    blocks.forEach(b=>{
      const center=b.mesh.position.clone();center.y+=.351*b.mesh.scale.y;const p=project(center);
      const corners=[[-.51,-.51],[.51,-.51],[.51,.51],[-.51,.51]].map(([x,z])=>project(center.clone().add(new THREE.Vector3(x*b.mesh.scale.x,0,z*b.mesh.scale.z))));
      const left=Math.min(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y));
      const width=Math.max(...corners.map(p=>p.x))-left,height=Math.max(...corners.map(p=>p.y))-top;
      const hitWidth=Math.max(28,width),hitHeight=Math.max(28,height);
      Object.assign(b.button.style,{left:`${left-(hitWidth-width)/2}px`,top:`${top-(hitHeight-height)/2}px`,width:`${hitWidth}px`,height:`${hitHeight}px`,transform:'none',clipPath:'none'});
      b.button.style.zIndex=String(Math.round(p.y));
    });
    const positions=[['.printshop-rack-label',new THREE.Vector3(-5,.6,3.95)],['.printshop-shelf-label',new THREE.Vector3(6,1.55,-3.6)]];
    for(const[selector,pos]of positions){const p=project(pos);Object.assign(host.querySelector(selector).style,{left:`${p.x}px`,top:`${p.y}px`});}
  }
  function resize(){
    if(disposed||!host.clientWidth||!host.clientHeight)return;
    camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();
    let distance=24;
    // Frame the working surface, not the complete furniture: the front apron
    // and lower legs may continue beyond the canvas, like a real desk in use.
    const corners=[];for(const x of[-8.7,8.7])for(const y of[0,1.15])for(const z of[-3.0,3.5])corners.push(new THREE.Vector3(x,y,z));
    for(let i=0;i<5;i++){
      camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateMatrixWorld();
      const projected=corners.map(p=>p.clone().project(camera));
      const extent=Math.max(...projected.flatMap(p=>[Math.abs(p.x)/.97,Math.abs(p.y)/.91]));distance*=extent;
    }
    camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateMatrixWorld();
    renderer?.setSize(host.clientWidth,host.clientHeight,false);labels();renderNow();
  }
  function renderNow(){if(renderer&&!simple&&available&&active&&!disposed)renderer.render(scene,camera);}
  function finishEffect(){
    if(!effect)return;const current=effect;effect=null;clearTimeout(current.timer);
    blocks.forEach(b=>{
      b.start=0;b.mesh.rotation.set(0,0,0);
      if(current.chosen.includes(b)&&(current.outcome==='incorrect'||current.returnTiles)){b.to.copy(b.home);b.mesh.position.copy(b.home);b.mesh.scale.setScalar(b.baseScale);b.mesh.visible=true;}
      else if(current.chosen.includes(b)&&current.outcome==='correct')b.mesh.visible=false;
      else{b.mesh.visible=true;b.mesh.position.copy(b.to);}
    });
    if(current.fused){if(terminalFused)discard(terminalFused);terminalFused=current.fused;terminalFused.visible=true;terminalFused.position.set(6,.85,-2.86+current.recordIndex*.78);}
    sparks.forEach(s=>s.visible=false);labels();current.resolve();
  }
  function draw(t){
    frame=undefined;if(!active||simple||disposed||document.hidden||!available)return;
    let moving=false;
    for(const b of blocks){if(!b.start)continue;const p=Math.min((t-b.start)/460,1),ease=1-(1-p)**3;b.mesh.position.lerpVectors(b.from,b.to,ease);b.mesh.position.y+=Math.sin(p*Math.PI)*1.2;if(p===1)b.start=0;else moving=true;}
    if(effect){
      const p=Math.min((t-effect.start)/effect.duration,1);moving=true;
      if(effect.outcome==='correct'){
        if(p<.35){effect.chosen.forEach((b,i)=>{b.mesh.position.lerpVectors(effect.starts[i],new THREE.Vector3(.6+(i-(effect.chosen.length-1)/2)*.48,.85,-1.2),p/.35);b.mesh.position.y+=Math.sin(p/.35*Math.PI)*.3;});}
        else{
          const q=Math.min((p-.35)/.65,1),ease=q*q*(3-2*q);
          effect.chosen.forEach((b,i)=>{b.mesh.visible=Boolean(effect.returnTiles);if(effect.returnTiles){b.mesh.position.lerpVectors(new THREE.Vector3(.6+(i-(effect.chosen.length-1)/2)*.48,.85,-1.2),b.home,ease);b.mesh.position.y+=Math.sin(q*Math.PI)*.9;b.mesh.scale.setScalar(b.baseScale);}});effect.fused.visible=true;
          effect.fused.position.lerpVectors(new THREE.Vector3(.6,.88,-1.2),new THREE.Vector3(6,.85,-2.86+effect.recordIndex*.78),ease);effect.fused.position.y+=Math.sin(q*Math.PI)*1.8;
          sparks.forEach((s,i)=>{s.visible=q<.7;s.position.set(.6+Math.cos(i*2.4)*q*3,1+Math.sin(i)*q+q*2,-1.2+Math.sin(i*2.4)*q*2);s.scale.setScalar(1-q);});
        }
      }else{
        effect.chosen.forEach((b,i)=>{
          const start=effect.starts[i];
          if(p<.22){b.mesh.position.copy(start);b.mesh.position.x+=Math.sin(p*110)*.12;}
          else{const q=(p-.22)/.78;b.mesh.position.lerpVectors(start,b.home,q);b.mesh.position.y+=Math.sin(q*Math.PI)*(1.4+(i%3)*.35);b.mesh.position.x+=Math.sin(q*Math.PI)*Math.sin(i*2.3)*1.0;b.mesh.rotation.z=Math.sin(q*Math.PI)*(.5-i%2);}
        });
      }
      if(p===1)finishEffect();
    }
    labels();renderNow();if(moving||effect)frame=requestAnimationFrame(draw);
  }
  function schedule(){cancelAnimationFrame(frame);if(active&&!simple&&!disposed&&!document.hidden&&available)frame=requestAnimationFrame(draw);}
  function fallback(message){simple=true;host.dataset.mode='simple';if(renderer)renderer.domElement.hidden=true;finishEffect();cancelAnimationFrame(frame);if(message)onFallback(message);}
  function lost(event){event.preventDefault();available=false;fallback('立体显示暂不可用，已切换简化排字台，进度已保留。');}
  function restored(){available=true;}
  function visibility(){if(document.hidden)finishEffect();else schedule();}
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.domElement.setAttribute('aria-label','有厚桌沿和桌腿的木质印刷桌、候选活字木块、排字框及成品印版架');host.prepend(renderer.domElement);host.dataset.mode='webgl';renderer.domElement.addEventListener('webglcontextlost',lost);renderer.domElement.addEventListener('webglcontextrestored',restored);
  }catch{available=false;fallback('当前设备使用简化排字台，融合与课堂得分照常可用。');}
  const observer=new ResizeObserver(()=>{resize();schedule();});observer.observe(host);document.addEventListener('visibilitychange',visibility);resize();
  return{
    update({palette=[],selections=[],records=[],totalSlots=palette.length,character='',key}){
      if(effect)return;
      const next=JSON.stringify([key,palette,totalSlots]);
      if(next!==paletteKey){
        const fresh=key!==roundKey;roundKey=key;
        paletteKey=next;blocks.forEach(b=>discard(b.mesh));blocks=[];
        const buttons=[...host.querySelectorAll('#workshop-tiles button')];
        rackDividers.forEach(mesh=>scene.remove(mesh));rackDividers.length=0;
        const cols=totalSlots>20?6:5,rows=Math.max(2,Math.ceil(totalSlots/cols));
        const dx=5.4/cols,dz=5.6/rows,baseScale=Math.min(1,dx/1.12,dz/1.15);
        for(let c=1;c<cols;c++)rackDividers.push(box(.05,.18,5.65,-8.3+c*dx,.27,.35,walnut));
        for(let r=1;r<rows;r++)rackDividers.push(box(5.4,.18,.06,-5.6,.27,-2.45+r*dz,walnut));
        palette.forEach((tile,i)=>{
          const mesh=glyphBlock(tile.character),slot=tile.slot??i;
          const home=new THREE.Vector3(-8.3+(slot%cols+.5)*dx,.31+.35*baseScale,-2.45+(Math.floor(slot/cols)+.5)*dz);
          mesh.scale.setScalar(baseScale);mesh.position.copy(home);
          const drop=fresh&&!reduced&&!simple&&host.clientWidth>720;
          if(drop)mesh.position.y+=.65+(slot%4)*.13;
          blocks.push({...tile,button:buttons[i],mesh,home,baseScale,from:mesh.position.clone(),to:home.clone(),start:drop?performance.now():0});
        });
      }
      selection=selections;
      blocks.forEach(b=>{const index=selections.indexOf(b.id),spacing=Math.min(1.15,5.5/Math.max(selections.length,1)),scale=index>=0?Math.min(1,spacing/1.14):b.baseScale;b.mesh.scale.setScalar(scale);const to=index>=0?new THREE.Vector3(.6+(index-(selections.length-1)/2)*spacing,.42+.35*scale,-1.2):b.home.clone();if(!to.equals(b.to)){b.from.copy(b.mesh.position);b.to.copy(to);if(!reduced&&active&&!simple)b.start=performance.now();else{b.mesh.position.copy(to);b.start=0;}}});
      const nextRecords=JSON.stringify(records);
      if(nextRecords!==recordKey){recordKey=nextRecords;finished.forEach(discard);finished=records.slice(-8).map((r,i)=>{const mesh=glyphBlock(r.word,2.86,.64,r.source);mesh.position.set(6,.85,-2.86+i*.78);mesh.scale.y=.7;return mesh;});}
      if(terminalFused){discard(terminalFused);terminalFused=null;}
      if(character!==targetKey){targetKey=character;if(targetFace){targetSign.remove(targetFace);const m=targetFace.material;textures.delete(m.map);m.map.dispose();materials.delete(m);m.dispose();geometries.delete(targetFace.geometry);targetFace.geometry.dispose();}if(character){const geo=new THREE.PlaneGeometry(1.82,1.64);geometries.add(geo);targetFace=new THREE.Mesh(geo,mat(0xffffff,{map:woodTexture('#cf9a5b',character,256)}));targetFace.position.z=.16;targetSign.add(targetFace);}}
      labels();schedule();
    },
    animateResult({outcome,word,source='reference',returnTiles=false,recordIndex=0}){
      finishEffect();return new Promise(resolve=>{
        const chosen=selection.map(id=>blocks.find(b=>b.id===id)).filter(Boolean);
        chosen.forEach(b=>{b.start=0;b.mesh.position.copy(b.to);});
        const fused=outcome==='correct'?glyphBlock(word,2.86,.64,source):null;if(fused)fused.visible=false;
        effect={outcome,returnTiles,chosen,starts:chosen.map(b=>b.mesh.position.clone()),fused,recordIndex:Math.min(7,recordIndex),start:performance.now(),duration:outcome==='correct'?1350:1050,resolve};
        // Bounded completion also covers hidden tabs, lost contexts, and mobile fallback.
        effect.timer=setTimeout(finishEffect,reduced||simple||!active||host.clientWidth<721?220:1600);
        if(!reduced&&!simple&&active)schedule();
      });
    },
    cancelAnimation(){finishEffect();},
    reward(){},
    setActive(value){active=value;if(!value)finishEffect();else resize();schedule();},
    setSimple(value){if(value)fallback();else if(renderer&&available){simple=false;host.dataset.mode='webgl';renderer.domElement.hidden=false;resize();schedule();}else onFallback('此设备暂不支持立体显示，可继续使用简化排字台。');},
    dispose(){disposed=true;finishEffect();cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);renderer?.domElement.removeEventListener('webglcontextlost',lost);renderer?.domElement.removeEventListener('webglcontextrestored',restored);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.shadow.dispose();renderer?.dispose();renderer?.domElement.remove();},
  };
}
