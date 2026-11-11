import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ROBOT = {
  shell: '#f8bb47', rim: '#ffdc7a', cream: '#fff0c9', teal: '#318d88',
  dark: '#183a49', joint: '#467783', mint: '#abfff0', cheek: '#f5a081',
};

function hullShape() {
  const shape = new THREE.Shape();
  shape.moveTo(1.17, 0);
  shape.quadraticCurveTo(.86, .33, .22, .41);
  shape.lineTo(-.64, .41);
  shape.quadraticCurveTo(-1.09, .35, -1.09, 0);
  shape.quadraticCurveTo(-1.09, -.35, -.64, -.41);
  shape.lineTo(.22, -.41);
  shape.quadraticCurveTo(.86, -.33, 1.17, 0);
  return shape;
}

function modelParts() {
  const shapes = new Map();
  const paints = new Map();
  const geometry = {
    box: () => new THREE.BoxGeometry(1, 1, 1),
    round: () => new RoundedBoxGeometry(1, 1, 1, 3, .15),
    sphere: () => new THREE.SphereGeometry(1, 20, 12),
    cylinder: () => new THREE.CylinderGeometry(.5, .5, 1, 16),
    roof: () => new THREE.CylinderGeometry(.24, Math.SQRT1_2, 1, 4, 1, false, Math.PI / 4),
    smile: () => new THREE.TorusGeometry(1, .16, 8, 22, Math.PI),
    shadow: () => new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2),
    wake: () => new THREE.RingGeometry(.86, 1, 28, 1, -.9, 1.8).rotateX(-Math.PI / 2),
    hull: () => new THREE.ExtrudeGeometry(hullShape(), {
      depth: .16, bevelEnabled: true, bevelThickness: .09, bevelSize: .09,
      bevelSegments: 3, curveSegments: 12,
    }).rotateX(-Math.PI / 2),
  };

  function paint(color, opacity = 1) {
    const key = `${color}:${opacity}`;
    if (!paints.has(key)) {
      const material = opacity === 1
        ? new THREE.MeshStandardMaterial({ color, roughness: .67 })
        : new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      paints.set(key, material);
    }
    return paints.get(key);
  }

  function add(parent, shape, color, size, position, opacity) {
    if (!shapes.has(shape)) shapes.set(shape, geometry[shape]());
    const part = new THREE.Mesh(shapes.get(shape), paint(color, opacity));
    part.scale.set(...size);
    part.position.set(...position);
    parent.add(part);
    return part;
  }

  return { add, paint, dispose() {
    shapes.forEach(shape => shape.dispose());
    paints.forEach(material => material.dispose());
  } };
}

function doudou(add) {
  const group = new THREE.Group();
  const { shell, rim, cream, teal, dark, joint, mint, cheek } = ROBOT;
  const put = (shape, color, size, position) => add(group, shape, color, size, position);
  put('round', teal, [.61, .5, .21], [0, .65, -.25]);
  put('round', cream, [.75, .59, .52], [0, .62, 0]);
  put('round', teal, [.32, .24, .045], [0, .63, .266]);
  put('round', mint, [.16, .057, .035], [0, .63, .29]);
  put('cylinder', joint, [.29, .17, .29], [0, .92, 0]);
  put('round', shell, [1.03, .72, .61], [0, 1.24, .018]);
  put('round', rim, [.91, .58, .11], [0, 1.24, .309]);
  put('round', dark, [.83, .51, .083], [0, 1.24, .36]);
  const mouth = put('smile', mint, [.079, .049, .08], [0, 1.19, .409]);
  mouth.rotation.z = Math.PI;
  const antenna = put('cylinder', teal, [.059, .26, .059], [.23, 1.66, -.034]);
  antenna.rotation.z = -.21;
  put('sphere', rim, [.092, .092, .092], [.257, 1.802, -.034]);

  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const eyeX = side * .168;
    put('sphere', mint, [.055, .078, .028], [eyeX, 1.285, .407]);
    put('sphere', '#ffffff', [.022, .028, .014], [eyeX - .012, 1.315, .431]);
    put('sphere', cheek, [.058, .029, .014], [side * .268, 1.192, .407]);
    put('round', teal, [.18, .3, .27], [side * .525, 1.23, .015]);
    put('round', rim, [.055, .16, .16], [side * .618, 1.23, .025]);

    const arm = new THREE.Group();
    arm.position.set(side * .396, .755, .025);
    arm.rotation.z = side * .22;
    group.add(arm);
    add(arm, 'sphere', joint, [.11, .11, .11], [0, 0, 0]);
    add(arm, 'round', shell, [.19, .255, .18], [0, -.13, 0]);
    add(arm, 'round', teal, [.16, .13, .17], [0, -.267, .013]);
    arms.push(arm);

    const leg = new THREE.Group();
    leg.position.set(side * .185, .374, 0);
    group.add(leg);
    add(leg, 'round', joint, [.157, .245, .154], [0, -.09, 0]);
    add(leg, 'round', teal, [.242, .135, .33], [0, -.304, .064]);
    add(leg, 'round', cream, [.221, .058, .293], [0, -.27, .071]);
    legs.push(leg);
  }
  return { group, arms, legs };
}

function ferry(parent, add) {
  add(parent, 'hull', '#884630', [1, .88, 1], [0, -.055, 0]);
  add(parent, 'hull', '#fae4a7', [1.02, .34, 1.04], [0, .156, 0]);
  add(parent, 'hull', '#aa633b', [.87, .31, .81], [-.014, .194, 0]);
  add(parent, 'round', '#26787d', [.18, .14, .68], [-.67, .294, 0]);
  add(parent, 'round', '#26787d', [.16, .14, .55], [.61, .294, 0]);
  add(parent, 'cylinder', '#754a30', [.045, .53, .045], [-.83, .465, -.21]);
  add(parent, 'round', '#e45b42', [.28, .17, .035], [-.962, .652, -.21]).rotation.z = -.12;
  add(parent, 'sphere', '#ffd88a', [.091, .09, .09], [1.016, .27, 0]);
  for (const side of [-1, 1]) {
    add(parent, 'round', '#bb6041', [1.11, .084, .055], [-.14, .251, side * .412]);
  }
  return [1, 1.3].map((size, index) => {
    const wake = add(parent, 'wake', '#ecfffc', [size * .65, 1, size * .45],
      [-.64 - index * .22, -.035 - index * .01, 0], .54 - index * .21);
    wake.rotation.y = Math.PI;
    return wake;
  });
}

function miniature(index, add) {
  const model = new THREE.Group();
  const put = (shape, color, size, position) => add(model, shape, color, size, position);
  const foundation = '#d2b081';
  const red = '#b14937';
  const gold = '#d99642';
  const green = '#397b72';

  switch (index) {
    case 0:
      put('box', foundation, [1.37, .29, .87], [0, .15, 0]);
      for (const [width, floor] of [[.9, .32], [.74, .59], [.56, .84]]) {
        put('box', red, [width * .72, .22, width * .68], [0, floor + .1, 0]);
        put('roof', green, [width, .19, width], [0, floor + .27, 0]);
      }
      put('sphere', gold, [.057, .09, .057], [0, 1.25, 0]);
      break;
    case 1:
      put('box', red, [1.74, .34, 1], [0, .18, 0]);
      put('box', foundation, [1.83, .083, 1.08], [0, .37, 0]);
      put('box', '#7a332a', [1.32, .26, .7], [0, .515, 0]);
      for (const x of [-.54, -.27, 0, .27, .54]) {
        put('cylinder', red, [.085, .27, .085], [x, .52, .373]);
      }
      put('roof', gold, [1.58, .22, .91], [0, .72, 0]);
      put('roof', '#eab66a', [1.28, .18, .63], [0, .87, 0]);
      break;
    case 2:
      put('box', foundation, [1.83, .24, .39], [0, .28, 0]).rotation.z = .18;
      for (const [x, y] of [[-.72, .24], [.63, .43]]) {
        put('box', foundation, [.51, .49, .52], [x, y, 0]);
        put('box', '#776042', [.11, .17, .012], [x, y + .04, .263]);
        for (const side of [-1, 1]) {
          put('box', '#e0c597', [.11, .14, .55], [x + side * .2, y + .27, 0]);
        }
        put('box', '#e0c597', [.12, .14, .08], [x, y + .27, .235]);
      }
      break;
    case 3:
      put('box', '#eee0c2', [1.82, .12, .99], [0, .068, .06]);
      put('box', '#d5be98', [1.64, .53, .75], [0, .4, -.09]);
      put('box', '#877253', [1.46, .38, .05], [0, .35, .3]);
      for (const x of [-.69, -.46, -.23, 0, .23, .46, .69]) {
        put('box', '#f1e3c8', [.112, .46, .12], [x, .374, .38]);
      }
      put('box', '#fff0d3', [1.75, .16, .93], [0, .66, -.015]);
      put('box', '#e4c89b', [1.51, .14, .77], [0, .8, -.06]);
      break;
  }
  model.rotation.y = index === 2 ? -.36 : .22;
  return model;
}

function stairway(points, add, paint) {
  const model = new THREE.Group();
  const treads = [];
  const colors = ['#a9967e', '#bda488', '#aa9378'];
  const steps = (points.length - 1) * 3;
  for (let step = 0; step <= steps; step += 1) {
    const fraction = step / Math.max(1, steps);
    const width = THREE.MathUtils.lerp(1.9, 1.11, fraction);
    const depth = THREE.MathUtils.lerp(.61, .4, fraction);
    const base = colors[step % colors.length];
    const tread = add(model, 'round', base, [width, .20, depth], [0, -.1, 0]);
    tread.rotation.y = .16 - fraction * .33;
    treads.push({ tread, base, position: step / 3 });
  }
  return { model, place(locate) {
    for (const { tread, position } of treads) {
      locate(position, tread.position);
      tread.position.y -= .106;
    }
  }, color(current, visited) {
    for (const { tread, base, position } of treads) {
      const color = position === current ? '#e5be7b' : position <= visited ? '#c4ac84' : base;
      tread.material = paint(color);
    }
  } };
}

export function createTourScene(host, { stage, points, onUnavailable }) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  canvas.className = 'tour-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 2, .1, 65);
  camera.position.set(0, 9, 18);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const sun = new THREE.DirectionalLight('#fff1d7', 2.45);
  sun.position.set(-5, 9, 7);
  const rim = new THREE.DirectionalLight('#d5f8ff', .85);
  rim.position.set(7, 4, -7);
  scene.add(new THREE.HemisphereLight('#fff9e7', '#a2b9c0', 1.75), sun, rim);

  const parts = modelParts();
  const traveler = new THREE.Group();
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const route = points.map(([x, y], index) => {
    const depth = stage === 'mountain' ? 17.5 + index * .41 : 18.7 + (51 - y) * .057;
    return { x, y, depth };
  });
  const river = stage === 'river';
  let robot;
  let wakes = [];
  let stairs;
  let landmarks = [];
  let observer;
  let frame = 0;
  let disposed = false;
  let current = 0;
  let destination = 0;
  let visited = 0;
  let movement;
  let onArrival;

  // A different camera depth per anchor gives real perspective while keeping feet on the map route.
  function project(x, y, depth, target) {
    target.set((x / 50 - 1) * camera.aspect, 1 - y / 50, 0);
    target.multiplyScalar(depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    target.z = -depth;
    return target.applyMatrix4(camera.matrixWorld);
  }

  function locate(position, target) {
    const index = Math.floor(position);
    const a = route[index];
    const b = route[index + 1] ?? a;
    const weight = position - index;
    const lerp = THREE.MathUtils.lerp;
    return project(lerp(a.x, b.x, weight), lerp(a.y, b.y, weight), lerp(a.depth, b.depth, weight), target);
  }

  function pose(phase = 0, envelope = 0) {
    locate(current, traveler.position);
    const stride = Math.sin(phase) * envelope;
    traveler.rotation.y = river ? -.23 + stride * .065 : 0;
    traveler.rotation.z = river ? stride * .034 : 0;
    traveler.position.y += river ? stride * .061 : 0;
    robot.group.rotation.y = river ? .17 : .17 - stride * .13;
    robot.group.position.y = river ? .29 : Math.abs(stride) * .135;
    robot.arms.forEach((arm, index) => { arm.rotation.x = stride * (index ? -.36 : .36); });
    robot.legs.forEach((leg, index) => { leg.rotation.x = stride * (index ? .48 : -.48); });
    wakes.forEach((wake, index) => { wake.position.x = -.64 - index * .22 - envelope * .15; });
  }

  function unavailable(event) {
    event?.preventDefault();
    dispose();
    onUnavailable?.();
  }

  function redraw() {
    if (disposed || document.hidden) return;
    try {
      renderer.render(scene, camera);
    } catch {
      unavailable();
    }
  }

  function layout() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    camera.aspect = width && height ? width / height : 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(width || 1, height || 1, false);
    stairs?.place(locate);
    landmarks.forEach((landmark, index) => {
      const { x, y, depth } = route[index];
      const offset = [[-4, -6], [-1, -9], [5, -3], [-1, -11]][index];
      project(x + offset[0], y + offset[1], depth + .8, landmark.position);
    });
    pose();
  }

  function resize() {
    if (disposed) return;
    layout();
    redraw();
  }

  function settle() {
    cancelAnimationFrame(frame);
    frame = 0;
    movement = undefined;
    current = destination;
    visited = Math.max(visited, destination);
    stairs?.color(current, visited);
    pose();
    const arrived = onArrival;
    onArrival = undefined;
    redraw();
    arrived?.();
  }

  function animate(now) {
    frame = 0;
    if (disposed || !movement) return;
    const { start, duration, from } = movement;
    const time = Math.min(1, (now - start) / duration);
    if (time === 1 || preference.matches || document.hidden) {
      settle();
      return;
    }
    current = THREE.MathUtils.lerp(from, destination, (1 - Math.cos(time * Math.PI)) / 2);
    pose(time * Math.PI * (river ? 2 : 4), Math.sin(time * Math.PI));
    redraw();
    if (!disposed) frame = requestAnimationFrame(animate);
  }

  function moveTo(index, { immediate = false, onArrival: arrived } = {}) {
    if (disposed || !Number.isInteger(index) || !route[index]) return;
    if (destination === index && !immediate && !movement) {
      arrived?.();
      return;
    }
    onArrival = arrived;
    destination = index;
    if (immediate || preference.matches || document.hidden) {
      settle();
      return;
    }
    cancelAnimationFrame(frame);
    const duration = (river ? 730 : 570) + Math.min(440, Math.abs(current - index) * 72);
    movement = { from: current, start: performance.now(), duration };
    frame = requestAnimationFrame(animate);
  }

  function preferenceChange() {
    if (movement && preference.matches) settle();
  }

  function visibilityChange() {
    if (movement && document.hidden) settle();
    if (!document.hidden) resize();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    onArrival = undefined;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    preference.removeEventListener('change', preferenceChange);
    document.removeEventListener('visibilitychange', visibilityChange);
    canvas.removeEventListener('webglcontextlost', unavailable);
    parts.dispose();
    renderer.dispose();
    if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    canvas.remove();
  }

  try {
    robot = doudou(parts.add);
    if (river) {
      robot.group.scale.setScalar(.88);
      wakes = ferry(traveler, parts.add);
    } else {
      parts.add(traveler, 'shadow', '#23332e', [.51, 1, .26], [0, .002, .018], .29);
    }
    if (stage === 'mountain') {
      stairs = stairway(route, parts.add, parts.paint);
      stairs.color(0, 0);
      scene.add(stairs.model);
    }
    if (stage === 'beijing') {
      landmarks = route.map((_, index) => miniature(index, parts.add));
      scene.add(...landmarks);
    }
    traveler.add(robot.group);
    scene.add(traveler);
    host.append(canvas);
    layout();
    renderer.render(scene, camera);
    canvas.addEventListener('webglcontextlost', unavailable);
    document.addEventListener('visibilitychange', visibilityChange);
    preference.addEventListener('change', preferenceChange);
    observer = new ResizeObserver(resize);
    observer.observe(host);
  } catch (error) {
    dispose();
    throw error;
  }

  return { moveTo, dispose };
}
