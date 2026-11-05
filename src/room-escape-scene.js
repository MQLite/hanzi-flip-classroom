import * as THREE from 'three';
import {EXIT_X} from './room-escape-core.js';

const palette={wood:0xa46945,trim:0x684837,wall:0xf1d7a6,green:0x357366,orange:0xf2a256,gold:0xffca58};
const cube=new THREE.BoxGeometry(1,1,1);
const sphere=new THREE.SphereGeometry(1,20,14);
const cylinder=new THREE.CylinderGeometry(1,1,1,28);
const materials=new Map();
function mesh(geometry,color,x,y,z,sx,sy,sz,parent){
  if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));
  const object=new THREE.Mesh(geometry,materials.get(color));
  object.position.set(x,y,z);object.scale.set(sx,sy,sz);parent.add(object);return object;
}
const box=(parent,color,x,y,z,w,h,d)=>mesh(cube,color,x,y,z,w,h,d,parent);
const round=(parent,color,x,y,z,w,h,d)=>mesh(sphere,color,x,y,z,w,h,d,parent);
const disk=(parent,color,x,y,z,w,h,d)=>mesh(cylinder,color,x,y,z,w,h,d,parent);
function group(parent,x=0,y=0,z=0){const node=new THREE.Group();node.position.set(x,y,z);parent.add(node);return node;}
function shadow(parent,x,y,z,w,d,opacity=.15){
  const object=new THREE.Mesh(new THREE.CircleGeometry(1,28),new THREE.MeshBasicMaterial({color:0x473426,transparent:true,opacity,depthWrite:false}));
  object.position.set(x,y,z);object.scale.set(w,d,1);object.rotation.x=-Math.PI/2;parent.add(object);
}
function sign(parent,text,x,y,z,{width=1.45,faceDown=false,color='#254d45'}={}){
  const canvas=document.createElement('canvas');canvas.width=420;canvas.height=116;
  const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(4,4,412,108,25);ctx.fill();
  ctx.font='bold 58px "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff6db';ctx.fillText(text,210,61);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(width,width*116/420),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));
  label.position.set(x,y,z);if(faceDown)label.rotation.x=-Math.PI/2;parent.add(label);return label;
}
function shelf(root){
  const wood=palette.wood;
  for(const x of [-.95,.95])box(root,wood,x,.99,0,.14,1.98,.43);
  for(const y of [.11,.68,1.27,1.92])box(root,wood,0,y,0,2,.13,.46);
  const colors=[0x4b7668,0xc46851,0xdeb462,0x6b87a5];
  for(let row=0;row<2;row++)for(let i=0;i<7;i++){
    const h=.27+(i%3)*.075;
    box(root,colors[(i+row)%4],-.74+i*.235,.19+row*.58+h/2,.06,.15,h,.27);
  }
  for(const x of [-.59,.41]){box(root,0xbaa079,x,1.57,.05,.46,.46,.33);box(root,0x825e45,x,1.59,.222,.14,.04,.016);}
}
function windowOnBack(root,x){
  box(root,0x6e6953,x,2.16,-3.544,1.9,1.24,.05);
  box(root,0x9ccec8,x,2.17,-3.51,1.72,1.03,.03);
  for(const dx of [-.84,0,.84])box(root,0xf2dca9,x+dx,2.16,-3.47,.06,1.06,.06);
  for(const y of [1.64,2.16,2.69])box(root,0xf2dca9,x,y,-3.47,1.73,.055,.06);
  box(root,0xb38558,x,1.57,-3.39,1.98,.09,.23);
}
function plant(root,x,z){
  shadow(root,x,.012,z,.47,.35);
  disk(root,0xc4785c,x,.22,z,.27,.44,.27);
  disk(root,0x6e4934,x,.446,z,.24,.018,.24);
  for(let i=0;i<6;i++){
    const angle=i*Math.PI/3;
    const leaf=round(root,i%2?0x508e63:0x6ba675,x+Math.cos(angle)*.22,.69+(i%3)*.12,z+Math.sin(angle)*.22,.17,.34,.14);
    leaf.rotation.z=Math.cos(angle)*.62;leaf.rotation.x=Math.sin(angle)*.62;
  }
}
function furnishings(scene){
  const wood=palette.wood,trim=palette.trim;
  box(scene,0x698e70,0,-.43,.58,13.7,.46,10.7);
  box(scene,0x9c7658,0,-.17,0,11.5,.33,7.55);
  const planks=[0xd3a778,0xe0b589,0xdab080,0xe4bb8f,0xcfa374];
  for(let row=0;row<15;row++)for(let column=0;column<4;column++){
    box(scene,planks[(row*3+column*2)%planks.length],-4.2075+column*2.805,.005,-3.48+row*.497,2.785,.032,.479);
  }
  box(scene,0xc4d19a,EXIT_X,-.047,4.65,2.8,.12,1.65);
  box(scene,0x97b48b,EXIT_X,.03,4.54,1.68,.06,1.46);
  // High rear walls and low cutaways leave the children and the doorway in view.
  box(scene,palette.wall,0,1.49,-3.67,11.5,2.98,.17);
  box(scene,0xf4dfb6,-5.63,1.38,-1.98,.16,2.76,3.4);
  box(scene,0xd0a579,-5.63,.37,1.62,.16,.74,3.91);
  box(scene,0xf3ddb6,5.63,1.39,-2.43,.16,2.78,2.48);
  box(scene,0xd0a579,5.63,.37,1.18,.16,.74,4.79);
  box(scene,trim,0,.12,-3.55,11.42,.2,.08);
  box(scene,wood,0,3.02,-3.67,11.65,.13,.25);
  for(const x of [-5.63,5.63])box(scene,trim,x,.76,1.54,.23,.1,4.16);
  windowOnBack(scene,.92);
  shelf(group(scene,-3.49,.88,-2.45));
  plant(scene,-4.96,2.72);plant(scene,4.93,1.7);
  // Raised wooden reading nook and four steps.
  shadow(scene,-3.4,.027,-.93,1.88,1.9,.21);
  box(scene,0x99704c,-3.4,.45,-1.28,3.18,.88,2.78);
  box(scene,0xd9ad78,-3.4,.86,-1.28,3.26,.08,2.84);
  for(let step=0;step<4;step++){
    const height=(step+1)*.22;
    const z=1.48-step*.46;
    box(scene,0xc78e59,-3.4,height/2,z,1.47,height,.46);
    box(scene,0xe8bc83,-3.4,height-.024,z,1.55,.048,.49);
  }
  for(const x of [-5,-1.8])box(scene,trim,x,1.07,-1.32,.085,.11,2.79);
  disk(scene,0xbb985e,0,.041,.85,1.8,.027,1.48);
  disk(scene,0x477f69,0,.058,.85,1.69,.032,1.37);
  disk(scene,0x62947b,0,.077,.85,1.54,.019,1.22);
  disk(scene,0xe7b97b,0,.091,.85,.48,.075,.4);
  const smallDoorZ=-1.05;
  box(scene,0xb88764,2.23,.46,-2.39,.14,.92,2.6);
  box(scene,0xd6b78f,2.62,.49,smallDoorZ,.72,.98,.16);
  box(scene,0xd6b78f,4.94,.49,smallDoorZ,1.3,.98,.16);
  for(const x of [2.98,4.29])box(scene,trim,x,.94,smallDoorZ,.13,1.88,.2);
  box(scene,trim,3.635,1.9,smallDoorZ,1.47,.15,.22);
  sign(scene,'储物间',3.64,2.12,-1.02,{width:1.26});
  box(scene,0x9d6948,4.65,.5,-3.29,1.15,1,.47);
  for(const y of [.34,.67]){box(scene,0xc3996c,4.65,y,-3.04,1.04,.25,.07);box(scene,trim,4.65,y,-2.98,.14,.038,.035);}
  const chest=group(scene,4.56,0,-2.48);
  shadow(chest,0,.026,0,.68,.45);
  box(chest,0x825137,0,.23,0,.88,.44,.57);
  const lid=group(chest,0,.45,-.28);
  box(lid,0xc48b52,0,.07,.27,.92,.17,.59);
  box(chest,0xe1a850,0,.36,.294,.16,.17,.045);
  for(const x of [-.34,.34])box(chest,0xb5784a,x,.23,.29,.095,.41,.025);
  const key=group(scene,4.56,1.04,-2.47);
  const ring=new THREE.TorusGeometry(.147,.043,12,24);
  mesh(ring,palette.gold,-.14,0,0,1,1,1,key);
  box(key,palette.gold,.11,0,0,.39,.084,.08);box(key,palette.gold,.22,-.064,0,.07,.15,.08);box(key,palette.gold,.29,-.037,0,.07,.105,.08);
  key.rotation.z=.34;key.visible=false;
  const doorZ=3.65;
  for(const [left,right] of [[-5.63,EXIT_X-.99],[EXIT_X+.99,5.63]]){
    box(scene,0xd0a579,(left+right)/2,.29,doorZ,right-left,.58,.16);
    box(scene,trim,(left+right)/2,.59,doorZ,right-left,.09,.22);
  }
  for(const x of [EXIT_X-.99,EXIT_X+.99])box(scene,trim,x,1.09,doorZ,.17,2.18,.23);
  box(scene,trim,EXIT_X,2.24,doorZ,2.16,.18,.27);
  const door=group(scene,EXIT_X-.91,0,doorZ);
  box(door,0x36685b,.91,1.06,0,1.82,2.1,.16);
  for(const y of [.54,1.56]){
    box(door,0x2c574d,.91,y,.092,1.43,.67,.06);
    box(door,0x478073,.91,y,.129,1.3,.55,.04);
  }
  round(door,0xf1bd64,1.55,.96,.18,.064,.064,.064);
  const lock=group(door,1.32,.79,.18);
  mesh(new THREE.TorusGeometry(.105,.023,8,20),0x604d40,0,.12,0,1,1,1,lock);
  box(lock,0xf0bb62,0,0,0,.22,.17,.086);box(lock,0x6a4b36,0,0,.053,.035,.065,.012);
  sign(scene,'出口',EXIT_X,2.47,doorZ+.02,{width:1.23});
  return {door,lock,chestLid:lid,key};
}

function makeChild(scene){
  const root=group(scene),model=group(root),legs=[];
  shadow(root,0,.024,0,.36,.26);
  const skin=0xd99c72,coat=0xf2b650,shoe=0x355264;
  for(const side of [-1,1]){
    const leg=group(model,side*.15,.45,0);
    box(leg,0x416879,0,-.17,0,.16,.37,.17);
    round(leg,shoe,0,-.37,.047,.12,.08,.18);
    legs.push(leg);
    const arm=round(model,coat,side*.34,.72,.005,.105,.25,.11);
    arm.rotation.z=side*.19;
    round(model,skin,side*.378,.51,.012,.078,.09,.079);
  }
  round(model,coat,0,.73,0,.29,.38,.22);
  round(model,0x33796a,0,.73,-.205,.18,.23,.10);
  round(model,skin,0,1.17,.035,.252,.258,.25);
  round(model,0x584339,0,1.25,-.025,.253,.215,.235);
  round(model,0xb95f4b,0,1.38,-.006,.275,.138,.264);
  round(model,0xc96c56,0,1.33,.165,.225,.033,.153);
  for(const x of [-.088,.088])round(model,0x42372f,x,1.16,.266,.026,.034,.018);
  return {root,model,legs};
}

function makeCat(scene){
  const root=group(scene),model=group(root),legs=[];
  shadow(root,0,.024,0,.46,.29);
  const fur=palette.orange,cream=0xffe4af,stripe=0xc97d45;
  round(model,fur,0,.32,-.06,.225,.242,.386);
  round(model,cream,0,.29,.17,.16,.154,.193);
  round(model,fur,0,.52,.225,.213,.198,.187);
  for(const side of [-1,1]){
    const ear=mesh(new THREE.ConeGeometry(.101,.237,4),fur,side*.142,.705,.217,1,1,.74,model);ear.rotation.z=-side*.19;
    round(model,0xe69c82,side*.133,.683,.261,.052,.084,.042);
    round(model,0x403b32,side*.086,.552,.389,.022,.038,.014);
    round(model,cream,side*.054,.482,.391,.076,.055,.043);
    for(const z of [-.23,.17]){
      const leg=group(model,side*.133,.26,z);
      round(leg,fur,0,-.09,0,.072,.151,.075);round(leg,cream,0,-.212,.025,.078,.045,.103);legs.push(leg);
    }
  }
  round(model,0x9a6053,0,.515,.43,.031,.021,.016);
  const tailPath=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.33,-.37),new THREE.Vector3(.015,.47,-.57),new THREE.Vector3(.03,.73,-.63),new THREE.Vector3(.1,.8,-.56)]);
  mesh(new THREE.TubeGeometry(tailPath,16,.058,8,false),stripe,0,0,0,1,1,1,model);
  return {root,model,legs};
}

function setActor(actor,p,{walking=false,beat=0}={}){
  actor.root.position.set(p.x,p.y,p.z);
  const seated=p.pose==='sit';
  actor.model.position.y=seated?-.22:walking?Math.abs(Math.sin(beat))*.035:0;
  actor.legs.forEach((leg,i)=>{leg.rotation.x=seated?-1.25:walking?Math.sin(beat+i*Math.PI)*.36:0;});
}

const cameraTarget=new THREE.Vector3(0,.3,.44);
export function createRoomScene(host,onProject){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});}catch{return null;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.setClearColor(0xc9d9bf);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.24;
  renderer.domElement.setAttribute('aria-label','立体密室，小朋友和猫咪');
  renderer.domElement.setAttribute('role','img');
  host.prepend(renderer.domElement);
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff6df,0x8eaa93,2.4));
  const light=new THREE.DirectionalLight(0xffe7bc,2.25);light.position.set(-5,9,7);scene.add(light);
  const props=furnishings(scene),player=makeChild(scene),cat=makeCat(scene);
  player.root.rotation.y=.18;cat.root.rotation.y=-.42;
  const footprintGroup=group(scene);
  for(let i=0;i<7;i++){
    const ratio=i/6;
    const x=.38+3.2*ratio,z=1.1-.27*ratio+(i%2===0?.14:-.14);
    const print=disk(footprintGroup,0x4d7564,x,.059,z,.072,.01,.14);
    print.rotation.y=1.25;
  }
  const camera=new THREE.OrthographicCamera();
  camera.position.set(4.3,11.5,14.7);camera.lookAt(cameraTarget);
  let frameState;
  function project({x,y,z}){
    const v=new THREE.Vector3(x,y+.28,z).project(camera);
    return {left:(v.x*.5+.5)*100,top:(.5-v.y*.5)*100};
  }
  function resize(){
    const w=host.clientWidth,h=host.clientHeight;
    if(!w||!h)return;
    const ratio=w/h,halfHeight=Math.max(5.75,7.2/ratio);
    camera.left=-halfHeight*ratio;camera.right=halfHeight*ratio;camera.top=halfHeight;camera.bottom=-halfHeight;
    camera.near=.1;camera.far=80;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    renderer.setSize(w,h,false);
    if(frameState)renderer.render(scene,camera);
    onProject();
  }
  function draw(state,{actor,beat=0,angle,doorAngle,catMoving=false}={}){
    frameState=state;
    setActor(player,state.player,{walking:actor==='player',beat});setActor(cat,state.cat,{walking:actor==='cat'||catMoving,beat});
    if(Number.isFinite(angle))(actor==='cat'?cat:player).root.rotation.y=angle;
    props.chestLid.rotation.x=state.key==='hidden'?0:-1.09;
    props.key.visible=state.key==='found';
    props.door.rotation.y=doorAngle??(state.doorOpen?1.35:0);
    props.lock.visible=!state.doorOpen;
    footprintGroup.visible=state.index===9&&state.phase==='clue';
    renderer.render(scene,camera);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);
  resize();
  return {project,draw};
}
