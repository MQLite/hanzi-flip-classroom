import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

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
  const card = new THREE.Mesh(
    new RoundedBoxGeometry(5.5, 5.35, 0.26, 4, 0.16),
    new THREE.MeshStandardMaterial({ color: 0xfffcf1, roughness: 0.8 }),
  );
  card.castShadow = true;
  scene.add(card);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.12 }),
  );
  floor.position.z = -0.65;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const sun = new THREE.DirectionalLight(0xfff6d9, 3.2);
  sun.position.set(-4, 7, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const blocks = [];
  [
    [-3.55, 1.7, 0.53, 0xe4a572],
    [3.6, -1.35, 0.65, 0x6da894],
    [-3.5, -1.9, 0.36, 0xf5d070],
    [3.65, 2.05, 0.32, 0xa7c4ab],
  ].forEach(([x, y, s, color], i) => {
    const block = new THREE.Mesh(
      new RoundedBoxGeometry(s, s, s, 3, 0.06),
      new THREE.MeshStandardMaterial({ color, roughness: 0.55 }),
    );
    block.position.set(x, y, -0.2);
    block.userData.baseX = x;
    block.rotation.set(0.2, 0.3, 0.18 * (i % 2 ? 1 : -1));
    block.castShadow = true;
    scene.add(block);
    blocks.push(block);
  });
  const stars = Array.from({ length: 10 }, (_, i) => {
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.075),
      new THREE.MeshStandardMaterial({ color: 0xf5b04e }),
    );
    star.visible = false;
    scene.add(star);
    return star;
  });
  function fallback(message) {
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
    card.scale.x = innerHeight <= 800 && width > 600 ? 1.5 : 1;
    blocks.forEach((block) => {
      block.position.x = block.userData.baseX * card.scale.x;
    });
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  function draw(t) {
    if (simple || !active || disposed || document.hidden) return;
    let turn = 0;
    if (flipStart) {
      const p = Math.min((t - flipStart) / (reduced ? 1 : 650), 1);
      turn = Math.sin(p * Math.PI) * Math.PI;
      if (p === 1) flipStart = 0;
    }
    card.rotation.y = turn;
    face.style.transform = `perspective(900px) rotateY(${turn > Math.PI / 2 ? turn - Math.PI : turn}rad)`;
    face.style.opacity = Math.abs(Math.cos(turn)) < 0.18 ? "0" : "1";
    if (!reduced)
      blocks.forEach((b, i) => {
        b.rotation.y = 0.3 + Math.sin(t / 2400 + i) * 0.16;
      });
    stars.forEach((s, i) => {
      s.visible = !reduced && t < rewardUntil;
      if (s.visible) {
        const p = 1 - (rewardUntil - t) / 1000;
        s.position.set(
          Math.cos(i * 0.65) * p * 4,
          Math.sin(i * 0.65) * p * 3,
          1,
        );
        s.scale.setScalar(1 - p);
      }
    });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute("aria-label", "立体汉字卡片与学习积木");
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
    setActive(value) {
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
      cancelAnimationFrame(frame);
      observer.disconnect();
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
