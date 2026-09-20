import * as THREE from 'three';
import { carriageWidth, createTrainModels } from './sentence-train-models.js';
import { createTrainEffects } from './sentence-train-effects.js';

const DEPARTURE_MS = 2400;
const TRANSFER_MS = 320;

export function createTrainScene(host, { onFallback = () => {} } = {}) {
  const surface = host.querySelector('.train-world');
  const viewport = host.querySelector('.train-track-scroll');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const models = createTrainModels();
  const effects = createTrainEffects();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dcece9');
  const camera = new THREE.OrthographicCamera(-14, 14, 6, -6, 0.1, 100);
  camera.position.set(3, 12, 26);
  camera.lookAt(0, 1.8, 1);
  const sunlight = new THREE.DirectionalLight('#fff1d0', 2.5);
  sunlight.position.set(-7, 13, 10);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunlight.shadow.camera, { left: -18, right: 18, top: 12, bottom: -12, near: 1, far: 40 });
  sunlight.shadow.normalBias = 0.035;
  sunlight.shadow.bias = -0.0003;
  scene.add(new THREE.HemisphereLight('#fff9e6', '#a5bda7', 1.6), sunlight, effects.group);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshStandardMaterial({ color: '#d7e7df', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.04;
  floor.receiveShadow = true;
  scene.add(floor);
  const engine = models.engine();
  scene.add(engine);
  const carriages = new Map();
  const destinations = new Map();
  const parkingPlaces = new Map();
  const movements = new Map();
  let renderer, terrain, state, paletteIdentity;
  let active = false, simple = false, failed = false, disposed = false;
  let frame = 0, resizeFrame = 0, lastWidth = -1, lastRevision = '';
  let departure = null, engineHome = new THREE.Vector3(), scale = 35, departureDistance = 28;

  function fallback(message = '已切换简化车厢，课堂进度保留。') {
    failed = true;
    simple = true;
    host.dataset.mode = 'simple';
    cancelAnimation();
    onFallback(message);
  }

  function contextLost(event) {
    event.preventDefault();
    fallback();
  }

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    surface.prepend(renderer.domElement);
    host.dataset.mode = 'webgl';
  } catch {
    fallback();
  }

  function project(button, position, width, height = 1.08) {
    if (!button) return;
    const point = position.clone().project(camera);
    const x = (point.x + 1) * surface.clientWidth / 2;
    const y = (1 - point.y) * surface.clientHeight / 2;
    Object.assign(button.style, {
      left: `${x}px`, top: `${y}px`, width: `${width * scale}px`, height: `${height * scale}px`,
    });
  }

  function projectControls() {
    if (!state || simple || failed) return;
    scene.updateMatrixWorld(true);
    for (const tile of state.palette) {
      const car = carriages.get(tile.id);
      if (!car) continue;
      const position = car.userData.plaque.getWorldPosition(new THREE.Vector3());
      const selected = state.selections.includes(tile.id);
      const candidate = host.querySelector(`#train-palette [data-tile="${CSS.escape(tile.id)}"]`);
      const chosen = host.querySelector(`#train-selected [data-tile="${CSS.escape(tile.id)}"]`);
      const slot = parkingPlaces.get(tile.id).clone().add(car.userData.plaque.position);
      project(candidate, selected ? slot : position, car.userData.width - 0.04);
      project(chosen, position, car.userData.width - 0.04);
    }
  }

  function render() {
    if (disposed || !active || simple || failed || document.hidden || !renderer) return;
    projectControls();
    renderer.render(scene, camera);
  }

  function scrollToLatest() {
    if (!state?.selections.length || viewport.scrollWidth <= viewport.clientWidth) return;
    const id = state.selections.at(-1);
    const button = host.querySelector(`#train-selected [data-tile="${CSS.escape(id)}"]`);
    if (!button) return;
    const left = parseFloat(button.style.left) - button.offsetWidth / 2;
    const right = left + button.offsetWidth;
    if (left < viewport.scrollLeft + 12) viewport.scrollLeft = Math.max(0, left - 12);
    else if (right > viewport.scrollLeft + viewport.clientWidth - 12) viewport.scrollLeft = right - viewport.clientWidth + 12;
  }

  function layout({ animate = false } = {}) {
    if (!state || simple || failed || !active || !state.palette.length) return;
    const total = state.palette.reduce((sum, tile) => sum + carriageWidth(tile.text) + 0.35, 0);
    const worldWidth = Math.max(23, total + 6.2);
    departureDistance = worldWidth + 4;
    const maxCar = Math.max(...state.palette.map(tile => carriageWidth(tile.text)));
    const columns = Math.min(state.palette.length, Math.max(3, Math.floor((worldWidth - 5) / (maxCar + 0.7))));
    const rows = Math.ceil(state.palette.length / columns);
    const width = innerWidth < 1000 ? Math.max(860, Math.ceil(worldWidth * 35)) : viewport.clientWidth;
    const height = innerWidth >= 1000 ? (innerHeight <= 800 ? 340 : 400) : 440;
    surface.style.width = `${width}px`;
    surface.style.height = `${height}px`;
    renderer.setSize(width, height, false);
    const viewWidth = worldWidth * 1.06;
    scale = width / viewWidth;
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = height / scale / 2;
    camera.bottom = -height / scale / 2;
    camera.updateProjectionMatrix();
    if (terrain) scene.remove(terrain);
    terrain = models.world(worldWidth, rows);
    scene.add(terrain);
    const start = -worldWidth / 2 + 3.8;
    engineHome.set(start, 0.35, 0.32);
    if (!departure) engine.position.copy(engineHome);
    let trainX = start + 1.55;
    for (const id of state.selections) {
      const car = carriages.get(id);
      if (!car) continue;
      destinations.set(id, new THREE.Vector3(trainX + car.userData.width / 2, 0.35, 0.32));
      trainX += car.userData.width + 0.35;
    }
    const yardWidth = worldWidth - 5.8;
    state.palette.forEach((tile, index) => {
      const car = carriages.get(tile.id);
      const x = -yardWidth / 2 + (index % columns + 0.5) * yardWidth / columns;
      const z = rows === 1 ? 3.55 : 2.9 + Math.floor(index / columns) * 3.15;
      const place = new THREE.Vector3(x, 0.12, z);
      parkingPlaces.set(tile.id, place);
      models.parking(terrain, x, z, car.userData.width, index);
      if (!state.selections.includes(tile.id)) destinations.set(tile.id, place);
      const target = destinations.get(tile.id);
      if (animate && !reduced.matches && car.position.distanceTo(target) > 0.02) {
        movements.set(tile.id, { from: car.position.clone(), to: target.clone(), start: performance.now() });
      } else {
        car.position.copy(target);
        movements.delete(tile.id);
      }
    });
    render();
    if (movements.size) scheduleFrame();
    else scrollToLatest();
  }

  function engineAt(seconds) {
    const distance = departureDistance * Math.min(1, seconds / (DEPARTURE_MS / 1000)) ** 3;
    return engineHome.clone().add(new THREE.Vector3(-distance, 0, 0));
  }

  function scheduleFrame() {
    if (!frame && active && !simple && !failed && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    if (!active || disposed || document.hidden || simple || failed) return;
    for (const [id, motion] of movements) {
      const car = carriages.get(id);
      const t = Math.min(1, (now - motion.start) / TRANSFER_MS);
      const eased = t * t * (3 - 2 * t);
      car.position.lerpVectors(motion.from, motion.to, eased);
      car.position.y += Math.sin(t * Math.PI) * 0.16;
      if (t === 1) movements.delete(id);
    }
    if (departure) {
      const seconds = (now - departure.started) / 1000;
      const shift = engineAt(seconds).x - engineHome.x;
      engine.position.copy(engineAt(seconds));
      for (const id of state.selections) {
        const car = carriages.get(id);
        car.position.copy(destinations.get(id));
        car.position.x += shift;
        car.userData.wheels.forEach(wheel => { wheel.rotation.z = seconds * 9; });
      }
      engine.userData.wheels.forEach(wheel => { wheel.rotation.z = seconds * 9; });
      effects.update(seconds, engineAt);
      if (now - departure.started >= DEPARTURE_MS) {
        const done = departure.resolve;
        departure = null;
        effects.clear();
        render();
        done();
        return;
      }
    }
    render();
    if (departure || movements.size) scheduleFrame();
    else scrollToLatest();
  }

  function cancelAnimation() {
    cancelAnimationFrame(frame);
    frame = 0;
    movements.clear();
    effects.clear();
    const pending = departure;
    departure = null;
    if (pending) pending.resolve();
    engine.position.copy(engineHome);
    for (const [id, target] of destinations) carriages.get(id)?.position.copy(target);
    render();
  }

  function queueLayout() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; layout(); });
  }

  const observer = new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width !== lastWidth) { lastWidth = width; queueLayout(); }
  });
  observer.observe(viewport);
  window.addEventListener('resize', queueLayout);
  function visibilityChanged() {
    if (document.hidden) cancelAnimation();
    else if (active) layout();
  }
  document.addEventListener('visibilitychange', visibilityChanged);

  return {
    update(next) {
      const newPalette = paletteIdentity !== next.palette;
      const changed = JSON.stringify([next.key, next.controlsRevision, next.selections]) !== lastRevision;
      state = next;
      if (newPalette) {
        movements.clear();
        for (const car of carriages.values()) scene.remove(car);
        carriages.clear();
        destinations.clear();
        parkingPlaces.clear();
        for (const [index, tile] of next.palette.entries()) {
          const car = models.carriage(tile.text, index, camera.quaternion);
          carriages.set(tile.id, car);
          scene.add(car);
        }
        paletteIdentity = next.palette;
      }
      if (changed || newPalette) {
        lastRevision = JSON.stringify([next.key, next.controlsRevision, next.selections]);
        layout({ animate: !newPalette });
      }
    },
    setActive(value) { active = value; if (value) layout(); else cancelAnimation(); },
    setSimple(value) {
      simple = failed || value;
      host.dataset.mode = simple ? 'simple' : 'webgl';
      cancelAnimation();
      if (!simple) layout();
    },
    animateDeparture() {
      cancelAnimation();
      if (simple || failed || reduced.matches || document.hidden || !active) return Promise.resolve();
      return new Promise(resolve => { departure = { started: performance.now(), resolve }; scheduleFrame(); });
    },
    cancelAnimation,
    dispose() {
      disposed = true;
      cancelAnimation();
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      window.removeEventListener('resize', queueLayout);
      document.removeEventListener('visibilitychange', visibilityChanged);
      renderer?.domElement.removeEventListener('webglcontextlost', contextLost);
      sunlight.shadow.dispose();
      effects.dispose();
      models.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      scene.clear();
    },
  };
}
