import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { createIslandJourney } from "./island-journey.js";
import { createClassroomModel } from "./classroom-model.js";

export function createClassroomScene(host, face, onFallback) {
  let renderer,
    frame,
    flipStart = 0,
    rewardUntil = 0,
    simple = false,
    active = true,
    disposed = false,
    contextAvailable = true;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 11);
  const model = createClassroomModel(scene);
  const { card, stars } = model;
  scene.add(new THREE.HemisphereLight(0xfff3d9, 0x84988a, 2.2));
  const sun = new THREE.DirectionalLight(0xffecd0, 3.1);
  sun.position.set(-4, 7, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left:-12,right:12,top:10,bottom:-10});
  sun.shadow.normalBias = .035; scene.add(sun);
  let needsRender = true, wasAnimating = false;
  scene.add(sun.target);
  const journey = createIslandJourney({scene, camera, model, sun, host, face, invalidate: () => { needsRender = true; }});
  let glyph = null, currentCharacter = null, glyphRequest = null;
  function clearGlyph() {
    if (!glyph) return;
    card.remove(glyph);
    glyph.traverse(o => o.geometry?.dispose());
    glyph = null;
  }
  function positionModels() {
    needsRender = true;
    if (flipStart || journey.active) return;
    const bounds = host.getBoundingClientRect(), textBounds = face.getBoundingClientRect();
    if (!bounds.height || !textBounds.height) return;
    const units = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z / bounds.height;
    model.resize(textBounds.width * units + .12, textBounds.height * units + .12, bounds.width * units);
    const letter = face.querySelector('.hanzi');
    if (glyph && letter) {
      const r = letter.getBoundingClientRect();
      const size = Math.min(r.width, r.height) * units * .91;
      glyph.scale.set(size / 1024, size / 1024, 1);
      glyph.position.set((r.left+r.width/2-bounds.left-bounds.width/2)*units,
        -(r.top+r.height/2-bounds.top-bounds.height/2)*units, .26);
      glyph.visible = true;
      host.dataset.glyphState = 'ready';
      renderer?.domElement.setAttribute('aria-label', `汉字奇遇岛，立体汉字：${currentCharacter}`);
    }
  }
  async function setCharacter(character) {
    if (character === currentCharacter) { if(!flipStart) positionModels(); return; }
    currentCharacter = character;
    needsRender = true;
    glyphRequest?.abort(); clearGlyph();
    host.dataset.glyphState = character ? 'loading' : 'empty';
    renderer?.domElement.setAttribute('aria-label', '汉字奇遇岛');
    if (!character) return;
    const controller = new AbortController(); glyphRequest = controller;
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}strokes/${encodeURIComponent(character)}.json`, {signal:controller.signal});
      if (!response.ok) throw new Error('No stroke geometry');
      const data = await response.json();
      if (controller.signal.aborted || disposed) return;
      if (!Array.isArray(data.strokes) || !data.strokes.length || !data.strokes.every(p=>typeof p==='string' && /^[Mm]/.test(p) && !/[<>"&]/.test(p))) throw new Error('Invalid stroke geometry');
      const paths = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg">${data.strokes.map(d=>`<path d="${d}"/>`).join('')}</svg>`).paths;
      const group = new THREE.Group();
      for (const path of paths) for (const shape of path.toShapes()) {
        const geometry = new THREE.ExtrudeGeometry(shape, {depth:.10,bevelEnabled:false,steps:1,curveSegments:8});
        // Hanzi Writer coordinates run upward; align the standard 1024-unit em square.
        geometry.translate(-512,-388,0);
        const mesh = new THREE.Mesh(geometry,model.ink); mesh.castShadow=true; mesh.receiveShadow=true;group.add(mesh);
      }
      if (!group.children.length) throw new Error('Empty character');
      glyph=group; glyph.name='reading-glyph'; glyph.visible=false; card.add(glyph); positionModels();
    } catch(error) {
      if(controller.signal.aborted || disposed) return;
      clearGlyph(); host.dataset.glyphState='fallback';
    }
  }
  function fallback(message) {
    journey.finish();
    simple = true;
    host.dataset.mode = "simple";
    if (renderer) renderer.domElement.hidden = true;
    cancelAnimationFrame(frame);
    face.style.transform = "";
    face.style.opacity = "1";
    flipStart = 0;
    face.getAnimations().forEach((animation) => animation.cancel());
    if (message) onFallback(message);
  }
  function resize() {
    if (!renderer || disposed) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!flipStart) positionModels();
  }
  function draw(t) {
    if (simple || !active || disposed || document.hidden) return;
    const animating = journey.active || Boolean(flipStart) || (!reduced && t < rewardUntil);
    if (!needsRender && !animating && !wasAnimating) { frame = requestAnimationFrame(draw); return; }
    wasAnimating = animating; needsRender = false;
    let turn = 0;
    if (flipStart) {
      const p = Math.min((t - flipStart) / (reduced ? 1 : 650), 1);
      turn = Math.sin(p * Math.PI) * Math.PI;
      if (p === 1) { flipStart = 0; face.style.transform=""; positionModels(); }
    }
    card.rotation.y = turn;
    face.style.transform = `perspective(900px) rotateY(${turn > Math.PI / 2 ? turn - Math.PI : turn}rad)`;
    face.style.opacity = Math.abs(Math.cos(turn)) < 0.18 ? "0" : "1";
    stars.forEach((s, i) => {
      s.visible = !reduced && t < rewardUntil;
      if (s.visible) {
        const p = 1 - (rewardUntil - t) / 1000;
        s.position.set(
          Math.cos(i * 0.65) * p * 4,
          Math.sin(i * 0.65) * p * 3,
          1,
        );
        s.scale.setScalar((1 - p) * .14);
        s.rotation.set(p*2,i+p*3,.15);
      }
    });
    journey.update(t);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute("aria-label", "汉字奇遇岛");
    host.prepend(renderer.domElement);
    host.dataset.mode = "webgl";
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    renderer.domElement.addEventListener("webglcontextrestored", contextRestored);
    resize();
    frame = requestAnimationFrame(draw);
  } catch {
    contextAvailable = false;
    fallback("当前设备使用简化显示，课堂可以照常进行。");
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  function contextLost(event) {
    event.preventDefault();
    contextAvailable = false;
    fallback("立体显示暂不可用，已切换简化显示。");
  }
  function contextRestored() {
    contextAvailable = true;
    // Keep the accessible view until the teacher explicitly returns to 3D.
  }
  function visibility() {
    cancelAnimationFrame(frame);
    if (!document.hidden && !simple && active && !disposed) frame = requestAnimationFrame(draw);
  }
  document.addEventListener("visibilitychange", visibility);
  return {
    setCharacter,
    travelToNextIsland({final = false} = {}) {
      flipStart = 0;
      card.rotation.y = 0;
      face.style.transform = '';
      face.style.opacity = '1';
      positionModels();
      rewardUntil = performance.now() + 1000;
      return journey.start({animated: !simple && !reduced && active && contextAvailable && !document.hidden, final});
    },
    cancelJourney() { journey.finish(); },
    setActive(value) {
      journey.finish();
      active = value;
      cancelAnimationFrame(frame);
      flipStart = rewardUntil = 0;
      card.rotation.y = 0;
      face.style.transform = '';
      face.style.opacity = '1';
      face.getAnimations().forEach(animation => animation.cancel());
      if (value) { resize(); visibility(); }
    },
    flip() {
      flipStart = performance.now();
      if (simple && !reduced)
        face.animate(
          [
            { transform: "rotateY(0)" },
            { transform: "rotateY(80deg)" },
            { transform: "rotateY(0)" },
          ],
          { duration: 400 },
        );
    },
    reward() {
      rewardUntil = performance.now() + 1000;
    },
    setSimple(value) {
      if (value) fallback();
      else if (renderer && contextAvailable) {
        simple = false;
        host.dataset.mode = "webgl";
        renderer.domElement.hidden = false;
        resize();
        cancelAnimationFrame(frame);
        if (active && !document.hidden && !disposed) frame = requestAnimationFrame(draw);
      } else onFallback("此设备暂不支持立体显示，请继续使用简化显示。");
    },
    dispose() {
      disposed = true;
      journey.finish();
      cancelAnimationFrame(frame);
      observer.disconnect();
      glyphRequest?.abort();
      clearGlyph();
      model.dispose();
      document.removeEventListener('visibilitychange', visibility);
      renderer?.domElement.removeEventListener('webglcontextlost', contextLost);
      renderer?.domElement.removeEventListener('webglcontextrestored', contextRestored);
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => {
        if(object.geometry) geometries.add(object.geometry);
        if(object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      sun.shadow.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    },
  };
}
