import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A modeled reading island: earth, grass, rocks, trees, books and raised glyphs.
export function createClassroomModel(scene) {
  const world = new THREE.Group(); scene.add(world);
  const mat=(color,roughness=.82)=>new THREE.MeshStandardMaterial({color,roughness});
  const cream=mat(0xffedc7),rim=mat(0x91ab81),stone=mat(0xb7c4a6),earth=mat(0xaf8870);
  const grass=mat(0x9dbb77),leaf=mat(0x668f67),lightLeaf=mat(0x91b57b),trunk=mat(0x94684e);
  const ink=mat(0x294e41,.58),gold=mat(0xf1bd5b,.44),paper=mat(0xfff6dc),coral=mat(0xd58c6b),blue=mat(0x749faf);
  const rounded=new RoundedBoxGeometry(1,1,1,4,.07);
  function mesh(geometry,material,parent=world){const m=new THREE.Mesh(geometry,material);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function box(w,h,d,x,y,z,material,parent=world){const m=mesh(rounded,material,parent);m.scale.set(w,h,d);m.position.set(x,y,z);return m;}
  const sphere=new THREE.SphereGeometry(1,20,14);
  function ball(x,y,z,sx,sy,sz,material,parent=world){const m=mesh(sphere,material,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;}
  const island=new THREE.Group();island.position.set(0,-1.78,-2.0);island.rotation.x=.32;world.add(island);
  const soil=mesh(new THREE.CylinderGeometry(6.6,5.6,.8,48),earth,island);soil.scale.z=.47;soil.position.y=-.32;
  const turf=mesh(new THREE.CylinderGeometry(6.67,6.6,.16,48),grass,island);turf.scale.z=.47;turf.position.y=.1;
  const rockGeometry=new THREE.DodecahedronGeometry(1,0);
  for(let i=0;i<11;i++){
    const a=i*Math.PI/10;
    const rock=mesh(rockGeometry,i%2?stone:earth,island);
    rock.position.set(Math.cos(a)*5.6,-.73-Math.sin(i)*.12,Math.sin(a)*2.0);
    rock.scale.set(.85,.48,.65);rock.rotation.set(i*.17,i*.35,0);
  }
  // Stepping stones and small clumps of grass are solid meshes on the island.
  for(let i=0;i<5;i++)ball((i-2)*.93,.22,1.9+Math.sin(i)*.15,.40,.08,.24,cream,island);
  for(const x of [-5.4,-3.8,3.5,5.3])for(let i=0;i<3;i++){
    const blade=mesh(new THREE.ConeGeometry(.09,.4+i*.05,5),leaf,island);
    blade.position.set(x+i*.13,.35,1.15);blade.rotation.z=(i-1)*.25;
  }
  const card=new THREE.Group();world.add(card);
  const frame=box(5.8,5.4,.55,0,0,-.22,rim,card);
  const inset=box(5.48,5.08,.22,0,0,.10,cream,card);
  const stand=box(6.1,.3,1.4,0,-2.74,.05,stone);
  const cap=box(6.3,.15,1.5,0,-2.55,.1,cream);
  const pins=[];
  for(const x of [-1,1])for(const y of [-1,1]){
    const pin=ball(x*2.7,y*2.53,.25,.06,.06,.035,gold,card);pins.push({pin,x,y});
  }
  // Book stacks anchor the learning theme; covers, page blocks and spines have depth.
  const books=new THREE.Group();books.position.set(-4.4,.18,.35);books.rotation.y=.16;island.add(books);
  for(let i=0;i<3;i++){
    const book=new THREE.Group();book.position.y=i*.36;book.rotation.y=(i-1)*.15;books.add(book);
    const cover=[coral,blue,ink][i];
    box(1.85,.08,1.32,0,.04,0,cover,book);box(1.7,.22,1.19,.035,.19,0,paper,book);
    box(1.85,.08,1.32,0,.34,0,cover,book);box(.12,.29,1.32,-.86,.19,0,cover,book);
    for(let j=0;j<3;j++)box(1.57,.008,.014,.06,.13+j*.055,.606,stone,book);
  }
  // Rounded forest canopy, branching trunk and roots, all lit in the same scene.
  const tree=new THREE.Group();tree.position.set(4.5,.18,-.55);island.add(tree);
  const stem=mesh(new THREE.CylinderGeometry(.13,.25,1.75,10),trunk,tree);stem.position.y=.86;
  for(const direction of [-1,1]){
    const branch=mesh(new THREE.CylinderGeometry(.07,.11,.85,8),trunk,tree);branch.position.set(direction*.24,1.38,0);branch.rotation.z=-direction*.55;
    ball(direction*.40,1.95,0,.74,.8,.62,direction===1?leaf:lightLeaf,tree);
  }
  ball(0,2.45,-.08,.77,.79,.67,leaf,tree);
  for(let i=0;i<3;i++)ball((i-1)*.4,.14,.14,.4,.17,.3,lightLeaf,tree);
  const shape=new THREE.Shape();
  for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.45:1;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(!i)shape.moveTo(x,y);else shape.lineTo(x,y);}
  shape.closePath();
  const starGeometry=new THREE.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2,steps:1});
  const trophy=mesh(starGeometry,gold,books);trophy.scale.setScalar(.43);trophy.position.set(0,1.55,.05);trophy.rotation.y=.25;
  box(.13,.38,.13,0,1.22,.10,gold,books);
  const stars=Array.from({length:10},()=>{const s=mesh(starGeometry,gold,scene);s.visible=false;return s;});
  // Distant clouds provide depth without competing with the reading surface.
  const cloudMat=mat(0xf8faf0);
  for(const sign of [-1,1])for(let i=0;i<3;i++)ball(sign*(4.3+i*.37),2.2+Math.sin(i)*.17,-2.3,.60,.24,.28,cloudMat);
  const backdrop=mesh(new THREE.PlaneGeometry(80,80),mat(0xe5eddf),scene);backdrop.position.z=-4;backdrop.castShadow=false;
  return {card,stars,ink,world,backdrop,
    resize(w,h,worldWidth){
      frame.scale.set(w+.32,h+.32,.55);inset.scale.set(w,h,.22);
      pins.forEach(({pin,x,y})=>pin.position.set(x*(w/2-.03),y*(h/2-.03),.25));
      stand.scale.x=w+.5;stand.position.y=-h/2-.3;cap.scale.x=w+.7;cap.position.y=-h/2-.12;
      const offset=Math.max(w/2+1.2,Math.min(4.5,worldWidth/2-1.2));
      books.position.x=-offset;tree.position.x=offset;
      books.visible=tree.visible=worldWidth>w+3.8;
    },
    dispose(){}
  };
}
