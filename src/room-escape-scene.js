import * as THREE from 'three';
import {CAT_TRAIL,CHEST_CARD_SPOT,CLUES,ENTRY_Z,EXIT_X,KEY_SPOT,PAINTING_SPOT,RUG_CENTER,TRAY_SPOT} from './room-escape-core.js';

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

function makePainting(scene){
  const wall=group(scene,PAINTING_SPOT.x,PAINTING_SPOT.y,PAINTING_SPOT.z);
  wall.rotation.y=Math.PI/2;
  box(wall,0x845d45,0,0,-.02,1.34,1.03,.18);
  box(wall,0x4e695b,0,0,.079,1.18,.86,.024);
  for(const x of [-.63,.63])box(wall,0x845d45,x,0,.18,.09,1,.24);
  for(const y of [-.47,.47])box(wall,0x9b744e,0,y,.18,1.19,.08,.24);
  box(wall,0x9e7852,0,-.26,.13,1.16,.075,.16);
  const brush=makeBrush(wall,0,-.16,.18);
  brush.scale.setScalar(1.14);
  const frame=group(wall,.67,0,.315);
  box(frame,0x9b653e,-.67,0,0,1.35,1.03,.085);
  box(frame,0xe3b674,-.67,0,.049,1.25,.93,.018);
  box(frame,0xf1d7a1,-.67,0,.066,1.13,.81,.024);
  round(frame,0xb7ca9c,-.67,-.03,.09,.47,.28,.014);
  round(frame,0x538676,-.67,-.03,.105,.43,.24,.012);
  round(frame,0x89a589,-.67,-.03,.117,.38,.195,.012);
  round(frame,0xe8b570,-.67,-.03,.132,.11,.062,.012);
  for(let i=0;i<16;i++){
    const angle=i*Math.PI/8;
    round(frame,0xd2ce9b,-.67+Math.cos(angle)*.35,-.03+Math.sin(angle)*.175,.135,.013,.013,.006);
  }
  return {frame,brush};
}

function makePaw(parent,x,y,z,color=0x425f50){
  const paw=group(parent,x,y,z);
  round(paw,color,0,-.033,0,.077,.057,.012);
  for(const [dx,dy] of [[-.085,.022],[-.04,.071],[.035,.076],[.083,.03]]){
    round(paw,color,dx,dy,0,.025,.035,.013);
  }
  return paw;
}

function makeClueCard(parent,x,y,z){
  const card=group(parent,x,y,z);
  box(card,0xe5c390,0,0,0,.49,.35,.033);
  box(card,0xffe5af,0,0,.024,.443,.31,.018);
  const paw=makePaw(card,0,-.016,.038);
  const dust=group(card,0,0,.06);
  round(dust,0x94897c,0,-.008,0,.19,.134,.018);
  round(dust,0xb4a494,-.13,.062,.008,.055,.055,.019);
  round(dust,0xb4a494,.11,-.08,.008,.06,.043,.018);
  return {card,paw,dust};
}

function garden(scene){
  const lawn=group(scene);
  box(lawn,0x64885f,0,-.27,6.2,27,.47,13);
  for(let i=0;i<6;i++){
    const stone=disk(lawn,i%2?0xb6a581:0x9b9f8d,EXIT_X+(i%2?.14:-.14),.012,4.18+i*.68,.62,.043,.29);
    stone.rotation.y=i*.62;
  }
  for(const [x,z] of [[-.8,4.45],[.45,5.25],[4.25,4.45],[5.04,5.18],[6.05,5.4]]){
    for(let i=0;i<3;i++){
      round(lawn,i%2?0x41735b:0x528365,x+(i-1)*.27,.21+i*.05,z,.35,.36,.32);
      round(lawn,i%2?0xffc770:0xe99eab,x+(i-1)*.24,.48+i*.055,z+.17,.065,.055,.065);
    }
  }
  for(const [x,z,h] of [[-1.6,3.75,3.7],[6.3,3.5,4.2],[7.1,2.2,3.45]]){
    box(lawn,0x755642,x,h*.38,z,.17,h*.76,.2);
    round(lawn,0x3e705b,x,h*.73,z,.66,h*.27,.62);
    round(lawn,0x527e61,x-.31,h*.67,z+.19,.5,h*.19,.48);
  }
  box(lawn,0x69524c,0,3.25,3.93,11.9,.2,.6);
  box(lawn,0x8f6c59,0,3.4,3.71,11.8,.13,.62);
  for(const x of [EXIT_X-1.29,EXIT_X+1.29]){
    box(lawn,0x604a3d,x,1.81,3.83,.24,.37,.23);
    box(lawn,0xffd180,x,1.81,3.95,.15,.21,.035);
    box(lawn,0x604a3d,x,2.015,3.87,.32,.06,.3);
    const lantern=new THREE.PointLight(0xffbe65,3.8,3.8,2);
    lantern.position.set(x,1.83,4.1);lawn.add(lantern);
  }
  box(lawn,0x795640,.12,1.82,3.76,1.48,1.15,.12);
  box(lawn,0xf1c67b,.12,1.82,3.831,1.28,.95,.04);
  box(lawn,0xa17554,.12,1.82,3.86,.07,.95,.04);
  box(lawn,0xa17554,.12,1.82,3.86,1.28,.07,.04);
  return lawn;
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
  box(scene,palette.wall,0,1.49,-3.67,11.5,2.98,.17);
  for(const x of [-5.63,5.63])box(scene,0xf4dfb6,x,1.49,0,.16,2.98,7.42);
  const ceiling=box(scene,0xf7e8cc,0,3.08,0,11.5,.18,7.49);
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
    box(scene,0xe8bc83,-3.4,height+.015,z,1.55,.045,.49);
  }
  for(const x of [-5,-1.8])box(scene,trim,x,1.07,-1.32,.085,.11,2.79);
  disk(scene,0xbb985e,0,.041,.85,1.8,.027,1.48);
  disk(scene,0x477f69,0,.058,.85,1.69,.032,1.37);
  disk(scene,0x62947b,0,.077,.85,1.54,.019,1.22);
  for(let i=0;i<32;i++){
    const angle=i*Math.PI/16;
    const stitch=box(scene,0xabbd93,Math.cos(angle)*1.44,.091,.85+Math.sin(angle)*1.12,.085,.009,.028);
    stitch.rotation.y=-angle-Math.PI/2;
  }
  const cushion=disk(scene,0xe7b97b,0,.091,.85,.48,.075,.4);
  const centerRing=new THREE.Mesh(new THREE.RingGeometry(.53,.575,48),new THREE.MeshBasicMaterial({color:0xffe9b5,side:THREE.DoubleSide}));
  centerRing.rotation.x=-Math.PI/2;
  centerRing.position.set(RUG_CENTER.x,.093,RUG_CENTER.z);
  scene.add(centerRing);
  const painting=makePainting(scene);
  const {x:tableX,y:tableTop,z:tableZ}=TRAY_SPOT;
  for(const x of [-.31,.31])for(const z of [-.22,.22]){
    box(scene,wood,tableX+x,1.14,tableZ+z,.09,.53,.09);
  }
  box(scene,0xad7952,tableX,tableTop-.058,tableZ,.83,.11,.67);
  box(scene,0xe5bd84,tableX,tableTop-.012,tableZ,.86,.045,.7);
  const tray=makeTray(scene,tableX,tableTop+.038,tableZ);
  const rugCard=makeClueCard(scene,RUG_CENTER.x,.111,RUG_CENTER.z+.52);
  rugCard.card.rotation.x=-Math.PI/2;
  rugCard.paw.visible=false;
  const smallDoorZ=ENTRY_Z;
  box(scene,0x375e52,3.92,.047,-2.31,3.27,.095,2.5);
  for(let row=0;row<5;row++)for(let column=0;column<7;column++){
    const colors=[0x81a99a,0x96b7a5,0x779e8e];
    box(scene,colors[(row+column*2)%3],2.52+column*.46,.094,-1.31-row*.5,.444,.012,.482);
  }
  box(scene,0x9c6944,3.635,.033,smallDoorZ,1.34,.067,.22);
  box(scene,0xffc973,3.635,.07,smallDoorZ+.035,1.29,.013,.085);
  box(scene,0xb88764,2.23,.46,-2.39,.14,.92,2.6);
  box(scene,0xd6b78f,2.62,.49,smallDoorZ,.72,.98,.16);
  box(scene,0xd6b78f,4.94,.49,smallDoorZ,1.3,.98,.16);
  for(const x of [2.98,4.29])box(scene,trim,x,.94,smallDoorZ,.13,1.88,.2);
  box(scene,trim,3.635,1.9,smallDoorZ,1.47,.15,.22);
  const entryDoor=group(scene,3.06,.075,smallDoorZ-.035);
  entryDoor.rotation.y=Math.PI/2;
  box(entryDoor,0x527b6d,.58,.88,0,1.17,1.75,.092);
  box(entryDoor,0x709487,.58,.88,.054,.96,1.44,.022);
  for(const x of [.17,.98])box(entryDoor,0x477062,x,.88,.069,.05,1.42,.021);
  round(entryDoor,0xffc970,1.02,.9,.12,.055,.055,.055);
  box(scene,0x9d6948,4.65,.5,-3.29,1.15,1,.47);
  for(const y of [.34,.67]){box(scene,0xc3996c,4.65,y,-3.04,1.04,.25,.07);box(scene,trim,4.65,y,-2.98,.14,.038,.035);}
  const chest=group(scene,4.56,0,-2.48);
  shadow(chest,0,.026,0,.68,.45);
  box(chest,0x825137,0,.23,0,.88,.44,.57);
  const lid=group(chest,0,.45,-.28);
  box(lid,0xc48b52,0,.07,.27,.92,.17,.59);
  const {x:cardX,y:cardY,z:cardZ}=CHEST_CARD_SPOT;
  box(scene,0xe1a850,cardX,cardY,cardZ-.029,.55,.39,.036);
  box(scene,0x4b5d4d,cardX,cardY,cardZ-.005,.48,.32,.018);
  const socketPaw=makePaw(scene,cardX,cardY,cardZ+.012,0xf4cb7d);
  socketPaw.scale.setScalar(1.17);
  const chestCard=makeClueCard(scene,cardX,cardY,cardZ+.025);
  chestCard.dust.visible=false;
  for(const x of [-.34,.34])box(chest,0xb5784a,x,.23,.29,.095,.41,.025);
  const key=group(scene,KEY_SPOT.x,KEY_SPOT.y,KEY_SPOT.z);
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
  const lock=group(door);
  for(const side of [-1,1]){
    for(const y of [.54,1.56]){
      box(door,0x2c574d,.91,y,side*.092,1.43,.67,.06);
      box(door,0x478073,.91,y,side*.129,1.3,.55,.04);
    }
    round(door,0xf1bd64,1.55,.96,side*.18,.064,.064,.064);
    const face=group(lock,1.32,.79,side*.18);
    mesh(new THREE.TorusGeometry(.105,.023,8,20),0x604d40,0,.12,0,1,1,1,face);
    box(face,0xf0bb62,0,0,0,.22,.17,.086);
    box(face,0x6a4b36,0,0,side*.053,.035,.065,.012);
  }
  return {door,lock,chestLid:lid,chestCard:chestCard.card,socketPaw,key,painting,tray,rugCard:rugCard.card,centerRing,cushion,ceiling};
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
  const carriedTray=makeTray(model,0,.64,.46);
  carriedTray.scale.setScalar(.9);
  const carriedBrush=makeBrush(model,0,.66,.46);
  carriedBrush.rotation.z=.25;
  carriedBrush.scale.setScalar(.82);
  const dustPuffs=Array.from({length:7},()=>round(inspection,0xb0a496,0,0,0,.038,.038,.038));
  return {root,model,legs,arms,inspection,card,brush,carriedTray,carriedBrush,dustPuffs};
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

function showInspection(player,state,camera,cleaning,sniffing){
  const inspect=state.rugClue!=='covered'&&state.key==='hidden';
  const seat=cleaning===undefined?(state.player.pose==='sit'?1:0):Math.max(0,1-cleaning/.2);
  const brushing=cleaning!==undefined&&cleaning>.2&&cleaning<.92;
  const sweep=brushing?Math.sin((cleaning-.2)*Math.PI*9):0;
  player.inspection.visible=inspect;
  player.model.rotation.x=inspect?.12*seat:0;
  player.arms[0].rotation.x=inspect?-1.07:0;
  player.arms[1].rotation.x=inspect?-1.07+sweep*.14:0;
  player.arms[1].rotation.z=inspect?.19+sweep*.43:.19;
  if(!inspect)return;
  if(sniffing)player.root.rotation.y=Math.atan2(state.cat.x-state.player.x,state.cat.z-state.player.z);
  else if(state.index<=6||state.phase==='match')player.root.rotation.y=Math.atan2(camera.position.x-state.player.x,camera.position.z-state.player.z);
  player.inspection.position.y=sniffing?.57:.76-seat*.2;
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
  const eye=index<4?[-2.85,2.54,3.46]:index<7?[1.1,2.1,2.95]:index<10?[2.3,2.66,3.46]:[4.85,2.24,.05];
  const clue=CLUES[index];
  const points=[];
  const add=(p,height=.34)=>points.push(new THREE.Vector3(p.x,p.y+height,p.z));
  for(const option of clue.choices){
    if(option.at){
      add(option.at);
      if(index!==11)add(option.at,clue.actor==='cat'?.75:1.48);
      if(option.pin!==option.at)add(option.pin);
    }
    if(index!==11)for(const point of option.via)add(point);
  }
  if(index!==11){add(state.player,.13);add(state.player,1.57);}
  if(index>=7&&index<=9){add(state.cat,.12);add(state.cat,.72);}
  if(index===11){add({x:EXIT_X,y:2,z:3.55});add({x:EXIT_X+.67,y:0,z:4.75});}
  return {eye:new THREE.Vector3(...eye),points};
}

function specialShot(mode){
  if(mode==='rug'){
    const {x,z}=RUG_CENTER;
    return {eye:new THREE.Vector3(x,3.75,z),up:new THREE.Vector3(0,0,-1),
      points:[new THREE.Vector3(x-1.86,0,z),new THREE.Vector3(x+1.86,0,z),new THREE.Vector3(x,0,z-1.54),new THREE.Vector3(x,0,z+1.54)]};
  }
  if(mode==='key'){
    return {eye:new THREE.Vector3(4.11,1.67,-1.18),
      points:[new THREE.Vector3(KEY_SPOT.x,KEY_SPOT.y+.2,KEY_SPOT.z),new THREE.Vector3(4.1,.13,-2.21),new THREE.Vector3(5.3,.32,-2.05)]};
  }
  if(mode==='entry'){
    return {eye:new THREE.Vector3(4.33,2.16,1.81),
      points:[new THREE.Vector3(2.8,.04,.13),new THREE.Vector3(4.52,2.1,ENTRY_Z),new THREE.Vector3(3.65,.12,-2.22),new THREE.Vector3(3.65,1.63,-.35)]};
  }
  if(mode==='painting'){
    const {x,y,z}=PAINTING_SPOT;
    return {eye:new THREE.Vector3(-3.89,2.18,1.41),
      points:[new THREE.Vector3(x,y+.48,z-.51),new THREE.Vector3(x,y-.51,z+.56),new THREE.Vector3(-4.55,1.63,-.75)]};
  }
  const intro=mode==='intro';
  const eye=new THREE.Vector3(intro?4.35:EXIT_X+.18,intro?2.05:2.15,intro?.33:9.6);
  const points=(intro?[[EXIT_X-1.1,0,3.55],[EXIT_X+1.1,2.35,3.55],[EXIT_X+.45,1.05,3.48]]:
    [[EXIT_X-2.45,2.9,3.8],[EXIT_X+2.45,2.9,3.8],[EXIT_X,.04,5.6],[EXIT_X,5.2,3.8]])
    .map(point=>new THREE.Vector3(...point));
  return {eye,points};
}

function makeTrail(scene){
  const trail=group(scene);
  for(let index=1;index<CAT_TRAIL.length;index++){
    const from=CAT_TRAIL[index-1],to=CAT_TRAIL[index];
    const dx=to.x-from.x,dz=to.z-from.z;
    const count=Math.max(1,Math.round(Math.hypot(dx,dz)/.34));
    const heading=Math.atan2(dx,dz);
    for(let i=0;i<count;i++){
      const ratio=(i+.65)/count;
      const offset=trail.children.length%2===0?.14:-.14;
      const print=group(trail,from.x+dx*ratio+Math.cos(heading)*offset,.054,from.z+dz*ratio-Math.sin(heading)*offset);
      print.rotation.y=heading+Math.PI;
      const paw=makePaw(print,0,0,0,0x547869);
      paw.rotation.x=-Math.PI/2;
    }
  }
  return trail;
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
  const ambient=new THREE.HemisphereLight(0xfff6df,0x8eaa93,2.4);scene.add(ambient);
  const light=new THREE.DirectionalLight(0xffe7bc,2.25);light.position.set(-5,9,7);scene.add(light);
  const props=furnishings(scene),player=makeChild(scene),cat=makeCat(scene);
  const porch=garden(scene);
  player.root.rotation.y=.18;cat.root.rotation.y=-.42;
  const footprints=makeTrail(scene);
  const camera=new THREE.PerspectiveCamera(58,1,.045,40);
  let frameState,shot,shotKey;
  function project({x,y,z}){
    const v=new THREE.Vector3(x,y+.28,z).project(camera);
    return {left:(v.x*.5+.5)*100,top:(.5-v.y*.5)*100};
  }
  function frameCamera(){
    if(!shot)return;
    camera.position.copy(shot.eye);
    camera.up.copy(shot.up??THREE.Object3D.DEFAULT_UP);
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
  function draw(state,{actor,beat=0,angle,doorAngle,catMoving=false,cleaning,intro=false,travelProgress=0}={}){
    const outside=state.phase==='escaped';
    const overhead=state.index===4&&state.phase==='clue';
    const showingPainting=state.index===1&&(state.phase==='solved'||travelProgress>=.56);
    const atChest=state.phase==='match'||state.phase==='key';
    const nextShot=outside?'garden':intro?'intro':overhead?'rug':showingPainting?'painting':atChest?'key':state.index===10?'entry':state.index;
    if(nextShot!==shotKey){
      shotKey=nextShot;
      shot=typeof shotKey==='string'?specialShot(shotKey):indoorShot(state);
      frameCamera();
      renderer.setClearColor(outside?0x3c476d:0xc9d9bf);
      ambient.color.setHex(outside?0xb6c4ff:0xfff6df);
      light.intensity=outside?.85:2.25;
    }
    frameState=state;
    porch.visible=outside||state.index===11;
    props.ceiling.visible=!overhead;
    props.cushion.visible=!overhead;
    const seat=cleaning===undefined?undefined:Math.max(0,1-cleaning/.2);
    setActor(player,state.player,{walking:actor==='player',beat,seat});setActor(cat,state.cat,{walking:actor==='cat'||catMoving,beat});
    if(Number.isFinite(angle))(actor==='cat'?cat:player).root.rotation.y=angle;
    else if(state.index===1)player.root.rotation.y=state.phase==='solved'?-Math.PI/2:Math.PI;
    else if(state.index===2)player.root.rotation.y=state.phase==='solved'?Math.PI/2:-Math.PI/2;
    const sniffing=state.index===7&&(state.phase==='solved'||travelProgress>.8);
    cat.model.rotation.x=sniffing?.18:0;
    if(sniffing)cat.root.rotation.y=Math.atan2(state.player.x-state.cat.x,state.player.z+.3-state.cat.z);
    if(atChest)cat.root.rotation.y=Math.atan2(KEY_SPOT.x-state.cat.x,KEY_SPOT.z-state.cat.z);
    if(outside){
      for(const character of [player,cat]){
        const {x,z}=character.root.position;
        character.root.rotation.y=Math.atan2(camera.position.x-x,camera.position.z-z);
      }
    }
    showInspection(player,state,camera,cleaning,sniffing);
    const carrying=state.index<=4;
    player.carriedBrush.visible=state.index===2&&state.tools.includes('brush')&&!state.tools.includes('tray');
    player.carriedTray.visible=carrying&&state.tools.includes('tray');
    if(player.carriedBrush.visible||player.carriedTray.visible){
      for(const arm of player.arms)arm.rotation.x=-1.05;
    }
    props.painting.frame.rotation.y=state.tools.includes('brush')?1.33:showingPainting?Math.min(1,(travelProgress-.56)/.34)*1.33:0;
    props.painting.brush.visible=state.index<=1||!state.tools.includes('brush');
    props.tray.visible=!state.tools.includes('tray');
    props.rugCard.visible=!overhead&&state.index>=4&&state.rugClue==='covered';
    props.centerRing.visible=!overhead&&state.index>=4&&state.index<=6;
    props.chestLid.rotation.x=state.key==='hidden'?0:-1.09;
    props.chestCard.visible=state.key!=='hidden';
    props.socketPaw.visible=state.key==='hidden';
    props.key.visible=state.key==='found';
    props.door.rotation.y=doorAngle??(state.doorOpen?1.35:0);
    props.lock.visible=!state.doorOpen;
    footprints.visible=state.index===9||(state.index===8&&(state.phase==='solved'||travelProgress>0));
    if(footprints.visible)for(const [index,print] of footprints.children.entries()){
      print.visible=state.index===9||state.phase==='solved'||(index+.65)/footprints.children.length<=travelProgress;
    }
    renderer.render(scene,camera);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);
  resize();
  return {project,draw};
}
