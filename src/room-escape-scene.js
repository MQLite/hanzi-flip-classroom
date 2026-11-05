import * as THREE from 'three';
import {BRUSH_SPOT,CLUES,EXIT_X,RUG_CENTER,TRAY_SPOT} from './room-escape-core.js';

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

function makeBrush(parent,x,y,z){
  const brush=group(parent,x,y,z);
  box(brush,0xb56343,-.09,.045,0,.35,.07,.085);
  box(brush,0xe4ad65,.16,.05,0,.2,.095,.21);
  for(let row=0;row<5;row++)box(brush,0x76503b,.17,-.025,(row-2)*.04,.19,.078,.026);
  return brush;
}

function makeTray(parent,x,y,z){
  const tray=group(parent,x,y,z);
  box(tray,0x487f73,0,0,0,.65,.048,.45);
  for(const z of [-.212,.212])box(tray,0x77a996,0,.045,z,.65,.08,.04);
  for(const x of [-.303,.303])box(tray,0x77a996,x,.045,0,.046,.08,.41);
  return tray;
}

function makeClueCard(parent,x,y,z){
  const card=group(parent,x,y,z);
  box(card,0xe5c390,0,0,0,.49,.35,.033);
  box(card,0xffe5af,0,0,.024,.443,.31,.018);
  const paw=group(card,0,-.016,.038);
  round(paw,0x425f50,0,-.033,0,.077,.057,.012);
  for(const [dx,dy] of [[-.085,.022],[-.04,.071],[.035,.076],[.083,.03]]){
    round(paw,0x425f50,dx,dy,0,.025,.035,.013);
  }
  const dust=group(card,0,0,.06);
  round(dust,0x94897c,0,-.008,0,.19,.134,.018);
  round(dust,0xb4a494,-.13,.062,.008,.055,.055,.019);
  round(dust,0xb4a494,.11,-.08,.008,.06,.043,.018);
  return {card,paw,dust};
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
  // The camera stays under the ceiling and inside the four walls.
  box(scene,palette.wall,0,1.49,-3.67,11.5,2.98,.17);
  for(const x of [-5.63,5.63])box(scene,0xf4dfb6,x,1.49,0,.16,2.98,7.42);
  box(scene,0xf7e8cc,0,3.08,0,11.5,.18,7.49);
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
  const centerRing=new THREE.Mesh(new THREE.RingGeometry(.53,.575,48),new THREE.MeshBasicMaterial({color:0xffe9b5,side:THREE.DoubleSide}));
  centerRing.rotation.x=-Math.PI/2;
  centerRing.position.set(RUG_CENTER.x,.093,RUG_CENTER.z);
  scene.add(centerRing);
  const brush=makeBrush(scene,BRUSH_SPOT.x,.971,BRUSH_SPOT.z);
  const tray=makeTray(scene,TRAY_SPOT.x,.931,TRAY_SPOT.z);
  const rugCard=makeClueCard(scene,RUG_CENTER.x,.111,RUG_CENTER.z+.52);
  rugCard.card.rotation.x=-Math.PI/2;
  rugCard.paw.visible=false;
  const smallDoorZ=-1.05;
  box(scene,0xb88764,2.23,.46,-2.39,.14,.92,2.6);
  box(scene,0xd6b78f,2.62,.49,smallDoorZ,.72,.98,.16);
  box(scene,0xd6b78f,4.94,.49,smallDoorZ,1.3,.98,.16);
  for(const x of [2.98,4.29])box(scene,trim,x,.94,smallDoorZ,.13,1.88,.2);
  box(scene,trim,3.635,1.9,smallDoorZ,1.47,.15,.22);
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
    box(scene,0xf0d5ab,(left+right)/2,1.49,doorZ,right-left,2.98,.16);
    box(scene,trim,(left+right)/2,.59,doorZ,right-left,.09,.22);
  }
  box(scene,0xf0d5ab,EXIT_X,2.64,doorZ,1.98,.68,.16);
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
  return {door,lock,chestLid:lid,key,brush,tray,rugCard:rugCard.card,centerRing};
}

function makeChild(scene){
  const root=group(scene),model=group(root),legs=[],arms=[];
  shadow(root,0,.024,0,.36,.26);
  const skin=0xd99c72,coat=0xf2b650,shoe=0x355264;
  for(const side of [-1,1]){
    const leg=group(model,side*.15,.45,0);
    box(leg,0x416879,0,-.17,0,.16,.37,.17);
    round(leg,shoe,0,-.37,.047,.12,.08,.18);
    legs.push(leg);
    const arm=group(model,side*.32,.9,0);
    arm.rotation.z=side*.19;
    round(arm,coat,0,-.18,.005,.105,.25,.11);
    round(arm,skin,0,-.39,.012,.078,.09,.079);
    arms.push(arm);
  }
  round(model,coat,0,.73,0,.29,.38,.22);
  round(model,0x33796a,0,.73,-.205,.18,.23,.10);
  round(model,skin,0,1.17,.035,.252,.258,.25);
  round(model,0x584339,0,1.25,-.025,.253,.215,.235);
  round(model,0xb95f4b,0,1.38,-.006,.275,.138,.264);
  round(model,0xc96c56,0,1.33,.165,.225,.033,.153);
  for(const x of [-.088,.088])round(model,0x42372f,x,1.16,.266,.026,.034,.018);
  const inspection=group(root,0,.76,.43);
  makeTray(inspection,0,-.1,.012);
  const card=makeClueCard(inspection,0,.04,.067);
  card.card.rotation.x=-.21;
  const brush=makeBrush(inspection,.27,.12,.14);
  const dustPuffs=Array.from({length:7},()=>round(inspection,0xb0a496,0,0,0,.038,.038,.038));
  return {root,model,legs,arms,inspection,card,brush,dustPuffs};
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

function setActor(actor,p,{walking=false,beat=0,seat=p.pose==='sit'?1:0}={}){
  actor.root.position.set(p.x,p.y,p.z);
  actor.model.position.y=seat?-.22*seat:walking?Math.abs(Math.sin(beat))*.035:0;
  actor.legs.forEach((leg,i)=>{leg.rotation.x=seat?-1.25*seat:walking?Math.sin(beat+i*Math.PI)*.36:0;});
}

function showInspection(player,state,camera,cleaning){
  const inspect=state.index>=5&&state.index<=7&&state.rugClue!=='covered';
  const seat=cleaning===undefined?(state.player.pose==='sit'?1:0):Math.max(0,1-cleaning/.2);
  const brushing=cleaning!==undefined&&cleaning>.2&&cleaning<.92;
  const sweep=brushing?Math.sin((cleaning-.2)*Math.PI*9):0;
  player.inspection.visible=inspect;
  player.model.rotation.x=inspect?.12*seat:0;
  player.arms[0].rotation.x=inspect?-1.07:0;
  player.arms[1].rotation.x=inspect?-1.07+sweep*.14:0;
  player.arms[1].rotation.z=inspect?.19+sweep*.43:.19;
  if(!inspect)return;
  if(state.index<=6)player.root.rotation.y=Math.atan2(camera.position.x-state.player.x,camera.position.z-state.player.z);
  player.inspection.position.y=.76-seat*.2;
  player.brush.visible=state.tools.includes('brush')&&state.index===6&&state.rugClue!=='revealed';
  player.brush.position.x=.25+sweep*.23;
  player.brush.rotation.z=-.22+sweep*.35;
  const revealed=state.rugClue==='revealed'||cleaning>.79;
  player.card.paw.visible=revealed;
  player.card.dust.visible=!revealed;
  for(const [i,puff] of player.dustPuffs.entries()){
    puff.visible=brushing;
    if(!brushing)continue;
    const rise=((cleaning-.2)*5+i*.17)%1;
    puff.position.set((i-3)*.047+sweep*.1,.1+rise*.35,.17+rise*.11);
    puff.scale.setScalar(.019+(1-rise)*.035);
  }
}

function indoorShot(state){
  const {index}=state;
  const eye=index<4?[-2.85,2.54,3.46]:index===4?[-.4,2.72,3.46]:index<7?[1.1,2.1,2.95]:index<10?[2.3,2.66,3.46]:index===10?[4.55,2.36,2.46]:[4.85,2.24,.05];
  const clue=CLUES[index];
  const points=[];
  const add=(p,height=.34)=>points.push(new THREE.Vector3(p.x,p.y+height,p.z));
  for(const option of clue.choices){
    if(option.at){
      add(option.at);
      if(index!==11)add(option.at,clue.actor==='cat'?.75:1.48);
    }
    if(index!==11)for(const point of option.via)add(point);
  }
  if(index!==11){add(state.player,.13);add(state.player,1.57);}
  if(index>=7&&index<=10){add(state.cat,.12);add(state.cat,.72);}
  if(index===10)add({x:4.56,y:1,z:-2.48});
  if(index===11){add({x:EXIT_X,y:2,z:3.55});add({x:EXIT_X+.67,y:0,z:4.75});}
  return {eye:new THREE.Vector3(...eye),points};
}

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
  const camera=new THREE.PerspectiveCamera(58,1,.045,40);
  let frameState,shot;
  function project({x,y,z}){
    const v=new THREE.Vector3(x,y+.28,z).project(camera);
    return {left:(v.x*.5+.5)*100,top:(.5-v.y*.5)*100};
  }
  function frameCamera(){
    if(!shot)return;
    camera.position.copy(shot.eye);
    const aim=new THREE.Vector3();
    for(const point of shot.points)aim.add(point.clone().sub(shot.eye).normalize());
    camera.lookAt(shot.eye.clone().add(aim));camera.updateMatrixWorld();
    let halfHeight=Math.tan(THREE.MathUtils.degToRad(24));
    for(const point of shot.points){
      const relative=point.clone().applyMatrix4(camera.matrixWorldInverse);
      if(relative.z>=0)continue;
      halfHeight=Math.max(halfHeight,Math.abs(relative.y/relative.z)*1.22,Math.abs(relative.x/relative.z)*1.22/camera.aspect);
    }
    camera.fov=THREE.MathUtils.radToDeg(Math.atan(halfHeight)*2);
    camera.updateProjectionMatrix();
  }
  function resize(){
    const w=host.clientWidth,h=host.clientHeight;
    if(!w||!h)return;
    camera.aspect=w/h;frameCamera();
    renderer.setSize(w,h,false);
    if(frameState)renderer.render(scene,camera);
    onProject();
  }
  function draw(state,{actor,beat=0,angle,doorAngle,catMoving=false,cleaning}={}){
    if(state.index!==frameState?.index){shot=indoorShot(state);frameCamera();}
    frameState=state;
    const seat=cleaning===undefined?undefined:Math.max(0,1-cleaning/.2);
    setActor(player,state.player,{walking:actor==='player',beat,seat});setActor(cat,state.cat,{walking:actor==='cat'||catMoving,beat});
    if(Number.isFinite(angle))(actor==='cat'?cat:player).root.rotation.y=angle;
    showInspection(player,state,camera,cleaning);
    props.brush.visible=!state.tools.includes('brush');
    props.tray.visible=!state.tools.includes('tray');
    props.rugCard.visible=state.index>=4&&state.rugClue==='covered';
    props.centerRing.visible=state.index>=4&&state.index<=6;
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
