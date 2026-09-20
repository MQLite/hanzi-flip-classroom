import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createWorkshopScene(host, onFallback) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 70);
  camera.position.set(5.4, 7.8, 11.8);
  camera.lookAt(0, 0.35, 0);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer, frame, active = false, simple = false, available = true, disposed = false;
  let wordLength = 0, collected = 0, revision, addStart = 0, rewardStart = 0;
  const geometries = new Set(), materials = new Set();
  const material = color => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75 }); materials.add(m); return m; };
  const wood = material(0xc69565), edge = material(0x93643f), pale = material(0xf7dfb0);
  const green = material(0x507966), dark = material(0x315246), gold = material(0xedb95b), metal = material(0x9eaea3);
  const boxGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.065);
  geometries.add(boxGeometry);
  function box(w, h, d, x, y, z, mat, parent = scene) {
    const mesh = new THREE.Mesh(boxGeometry, mat);
    mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  box(7.7, 0.28, 3.6, 0, 0, 0, wood);
  box(7.8, 0.1, 3.7, 0, 0.13, 0, pale);
  // Visible joinery, desk legs and plank seams make the tabletop readable as wood.
  for (const x of [-3.25, 3.25]) for (const z of [-1.25, 1.25]) box(0.24, 1.3, 0.25, x, -0.75, z, edge);
  box(6.7, 0.16, 0.16, 0, -1.04, -1.25, wood);
  for (const z of [-1.05, -0.35, 0.35, 1.05]) box(7.35, 0.008, 0.012, 0, 0.185, z, wood);
  // Collection shelf with two levels, side uprights and backing.
  box(3.1, 1.85, 0.12, -1.25, 1.11, -1.42, wood);
  for (const x of [-2.82, 0.32]) box(0.12, 1.95, 0.62, x, 1.16, -1.22, edge);
  for (const y of [0.38, 1.17, 2.08]) box(3.26, 0.12, 0.7, -1.25, y, -1.15, pale);
  const finished = Array.from({ length: 8 }, (_, i) => box(0.53, 0.42, 0.35, -2.36 + (i % 4) * 0.73, i < 4 ? 0.66 : 1.45, -1.05, i % 2 ? pale : gold));
  // Recessed slots and thick movable tiles.
  const draftGroup = new THREE.Group(); scene.add(draftGroup);
  const blocks = [];
  for (let i = 0; i < 8; i++) {
    const x = -2.62 + i * 0.65;
    box(0.57, 0.04, 0.65, x, 0.205, 0.43, edge);
    blocks.push(box(0.52, 0.25, 0.58, x, 0.37, 0.43, i % 2 ? pale : gold, draftGroup));
  }
  // Short roller conveyor leading from the assembly slots toward the stamp.
  box(4.8, 0.18, 0.98, 0.15, -0.01, 2.1, dark);
  for (const z of [1.6, 2.6]) box(5, 0.24, 0.09, 0.15, 0.12, z, green);
  const rollerGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.9, 12);
  geometries.add(rollerGeometry);
  const rollers = [];
  for (let i = 0; i < 15; i++) {
    const roller = new THREE.Mesh(rollerGeometry, i % 2 ? metal : pale);
    roller.rotation.x = Math.PI / 2; roller.position.set(-2.12 + i * 0.32, 0.13, 2.1);
    roller.castShadow = true; scene.add(roller); rollers.push(roller);
  }
  for (const x of [-1.85, 2.15]) box(0.15, 1.12, 0.16, x, -0.55, 2.1, green);
  // Press: base, back column, overhanging arm, shaft and rubber stamp head.
  box(1.02, 0.18, 1.1, 2.6, 0.3, -0.62, green);
  box(0.28, 1.65, 0.25, 2.92, 1.07, -1, dark);
  box(0.94, 0.24, 0.65, 2.62, 1.85, -0.83, green);
  const stamp = new THREE.Group(); scene.add(stamp);
  box(0.13, 0.72, 0.13, 2.43, 1.39, -0.55, metal, stamp);
  box(0.69, 0.18, 0.6, 2.43, 1.05, -0.55, wood, stamp);
  box(0.68, 0.08, 0.59, 2.43, 0.92, -0.55, dark, stamp);
  box(0.65, 0.15, 0.2, 3.17, 1.72, -0.8, gold);
  const parcel = box(0.92, 0.29, 0.58, -1.7, 0.38, 2.1, gold);
  const starGeometry = new THREE.OctahedronGeometry(0.09); geometries.add(starGeometry);
  const stars = Array.from({length: 9}, () => { const s = new THREE.Mesh(starGeometry, gold); scene.add(s); return s; });
  const floorGeometry = new THREE.PlaneGeometry(24, 18); geometries.add(floorGeometry);
  const floorMaterial = new THREE.ShadowMaterial({opacity:0.14}); materials.add(floorMaterial);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.42; floor.receiveShadow = true; scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xfff9e9, 0xc0d2c4, 3));
  const sun = new THREE.DirectionalLight(0xfff3d5, 3.4); sun.position.set(-3, 8, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-7; sun.shadow.camera.right=7; sun.shadow.camera.top=6; sun.shadow.camera.bottom=-6; scene.add(sun);

  function settle() {
    addStart = rewardStart = 0; stamp.position.y = 0; parcel.visible = false;
    blocks.forEach((block, i) => { block.visible = i < wordLength; block.position.y = 0.37; });
    finished.forEach((block,i) => { block.visible = i < collected; });
    stars.forEach(star => { star.visible = false; });
  }
  function resize() {
    if (!renderer || disposed) return;
    const {width, height} = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    const zoom = width > 600 && height >= 250 ? 0.85 : 1;
    camera.position.set(5.4,7.8,11.8).multiplyScalar((camera.aspect < 1.6 ? 1.6 / camera.aspect : 1) * zoom);
    camera.lookAt(0,0.35,0);
    camera.updateProjectionMatrix(); renderer.setSize(width,height,false);
  }
  function draw(t) {
    frame = undefined;
    if (!active || simple || disposed || document.hidden) return;
    if (addStart) {
      const p = Math.min((t-addStart)/300,1);
      if (wordLength) blocks[wordLength-1].position.y = 0.37 + (1-p) * 0.8;
      if (p === 1) addStart = 0;
    }
    if (rewardStart) {
      const p = Math.min((t-rewardStart)/950,1);
      stamp.position.y = -Math.sin(Math.min(p/0.35,1)*Math.PI)*0.42;
      parcel.visible = p < 1;
      if (p < 0.65) parcel.position.set(-1.7 + p/0.65*3.5,0.38,2.1);
      else parcel.position.set(1.8-(p-0.65)/0.35*3,0.38+(p-0.65)/0.35*1.2,2.1-(p-0.65)/0.35*3.15);
      rollers.forEach(roller => { roller.rotation.y = p*5; });
      stars.forEach((star,i) => { star.visible = p < 1; star.position.set(-1+Math.cos(i)*p*2,1.3+Math.sin(i)*p+ p,0); star.scale.setScalar(1-p); });
      if (p === 1) settle();
    }
    renderer.render(scene,camera);
    frame = requestAnimationFrame(draw);
  }
  function schedule() { cancelAnimationFrame(frame); if (active && !simple && !document.hidden && !disposed) frame=requestAnimationFrame(draw); }
  function fallback(message) { simple=true; settle(); host.dataset.mode='simple'; if(renderer) renderer.domElement.hidden=true; cancelAnimationFrame(frame); if(message) onFallback(message); }
  function contextLost(event) { event.preventDefault(); available=false; fallback('立体显示暂不可用，已切换简化显示，组词和得分已保留。'); }
  function contextRestored() { available=true; }
  function visibility() { if(document.hidden) settle(); schedule(); }
  try {
    renderer = new THREE.WebGLRenderer({alpha:true,antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-label','木质工作台、拼词字块、滚轴传送带、盖章器和收集架');
    host.prepend(renderer.domElement); host.dataset.mode='webgl'; renderer.domElement.addEventListener('webglcontextlost',contextLost); renderer.domElement.addEventListener('webglcontextrestored',contextRestored); resize();
  } catch { available=false; fallback('当前设备使用简化显示，课堂可以照常进行。'); }
  const observer = new ResizeObserver(resize); observer.observe(host);
  document.addEventListener('visibilitychange',visibility); settle();
  return {
    update({length, count, key}) {
      const added = revision === key && length > wordLength;
      if (revision !== key) settle();
      wordLength = Math.min(length,8); collected = Math.min(count,8); revision=key;
      settle(); if(added && !reduced && active && !simple) addStart=performance.now();
    },
    reward() { if(!reduced && active && !simple) rewardStart=performance.now(); },
    setActive(value) { active=value; settle(); if(value) resize(); schedule(); },
    setSimple(value) { if(value) fallback(); else if(renderer && available) { simple=false; host.dataset.mode='webgl'; renderer.domElement.hidden=false; resize(); schedule(); } else onFallback('此设备暂不支持立体显示，请继续使用简化显示。'); },
    dispose() { disposed=true; cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange',visibility); renderer?.domElement.removeEventListener('webglcontextlost',contextLost); renderer?.domElement.removeEventListener('webglcontextrestored',contextRestored); geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose()); sun.shadow.dispose(); renderer?.dispose(); renderer?.domElement.remove(); },
  };
}
