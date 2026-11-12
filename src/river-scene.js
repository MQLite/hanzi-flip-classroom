import * as THREE from 'three';
import {makeRiverTerrain, worldRiverPoint} from './river-terrain.js';

const haze = new THREE.Color('#c2d8dd');

function makeWater(yellow) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time:{value:0}, positionOnRiver:{value:new THREE.Vector2()}, heading:{value:new THREE.Vector2(1,0)},
      wake:{value:0}, riverColor:{value:new THREE.Color(yellow ? '#a3804e' : '#3b797f')},
      seaColor:{value:new THREE.Color('#427d91')}, haze:{value:haze},
    },
    vertexShader:`
      varying vec3 surfacePoint;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        surfacePoint = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader:`
      uniform float time, wake;
      uniform vec2 positionOnRiver, heading;
      uniform vec3 riverColor, seaColor, haze;
      varying vec3 surfacePoint;
      void main() {
        vec2 p = surfacePoint.xz;
        float a = dot(p, vec2(.31, .94)) * 2.1 - time * 1.55;
        float b = dot(p, vec2(.91, -.41)) * 4.0 + time * 2.2;
        float c = dot(p, vec2(.23, -.98)) * 8.2 - time * 1.4;
        vec3 n = normalize(vec3(.065 * cos(a) + .041 * cos(b), 1.0, .105 * cos(a) - .055 * cos(b) + .023 * cos(c)));
        vec3 view = normalize(cameraPosition - surfacePoint);
        float reflectSky = pow(1.0 - max(0.0, dot(view, n)), 3.0);
        float light = pow(max(0.0, dot(reflect(-normalize(vec3(-.36, .66, -.28)), n), view)), 38.0);
        vec3 color = mix(riverColor, seaColor, smoothstep(190.0, 205.0, p.x));
        color *= 1.0 + .075 * sin(a) + .031 * sin(b + c * .4);
        color = mix(color, haze, reflectSky * .42) + light * vec3(.32, .29, .21);
        vec2 delta = p - positionOnRiver;
        float aft = -dot(delta, heading);
        float across = abs(dot(delta, vec2(-heading.y, heading.x)));
        float edge = abs(across - (.52 + aft * .26));
        float foam = (1.0 - smoothstep(.03, .24, edge)) * smoothstep(0.9, 1.9, aft) * (1.0 - smoothstep(2.3, 8.0, aft));
        foam *= (.55 + .45 * sin(aft * 8.0 - time * 9.0 + across * 2.1)) * wake;
        color = mix(color, vec3(.83, .91, .84), foam * .86);
        gl_FragColor = vec4(mix(color, haze, smoothstep(33.0, 145.0, distance(cameraPosition, surfacePoint))), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(840, 780).rotateX(-Math.PI / 2), material);
  mesh.position.set(105, 0, 55);
  return mesh;
}

function makeSky() {
  return new THREE.Mesh(new THREE.SphereGeometry(290,24,16), new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false,
    uniforms:{horizon:{value:haze}, high:{value:new THREE.Color('#80b6d6')}},
    vertexShader:`varying vec3 direction;
      void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader:`varying vec3 direction;
      uniform vec3 horizon, high;
      float grain(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float cloudNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(grain(i), grain(i + vec2(1.0, 0.0)), f.x),
          mix(grain(i + vec2(0.0, 1.0)), grain(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec3 ray = normalize(direction);
        float tint = smoothstep(-.035, .66, ray.y);
        vec2 p = ray.xz * (4.0 / max(.16, ray.y));
        float cloud = cloudNoise(p) * .68 + cloudNoise(p * 2.3) * .23 + cloudNoise(p * 5.7) * .09;
        float veil = smoothstep(.54, .77, cloud) * smoothstep(.04, .26, ray.y);
        gl_FragColor = vec4(mix(mix(horizon, high, tint), vec3(.87, .92, .93), veil * .55), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
}

function makeBoat() {
  const boat = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(1.95, 0);
  shape.quadraticCurveTo(1.40, .79, .14, .81);
  shape.lineTo(-1.19, .71);
  shape.quadraticCurveTo(-1.67, .53, -1.74, 0);
  shape.quadraticCurveTo(-1.67, -.53, -1.19, -.71);
  shape.lineTo(.14, -.81);
  shape.quadraticCurveTo(1.40, -.79, 1.95, 0);
  function add(geometry, color, x = 0, y = 0, z = 0) {
    const part = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color, roughness:.78}));
    part.position.set(x, y, z);
    boat.add(part);
    return part;
  }
  const hull = new THREE.ExtrudeGeometry(shape, {depth:.37, bevelThickness:.14, bevelSize:.11, bevelSegments:3, curveSegments:12});
  add(hull.rotateX(-Math.PI / 2), '#714327', 0, -.13);
  add(new THREE.ShapeGeometry(shape, 18).rotateX(-Math.PI / 2), '#b98b5b', 0, .391);
  for (const side of [-1, 1]) {
    const rim = new THREE.CatmullRomCurve3([
      [1.90, .44, 0], [1.27, .43, side * .55], [.07, .42, side * .81], [-1.12, .44, side * .71], [-1.70, .46, 0],
    ].map(point => new THREE.Vector3(...point)));
    add(new THREE.TubeGeometry(rim, 28, .045, 5, false), '#dbb688');
    for (const x of [-.96, .55]) add(new THREE.BoxGeometry(.07,.59,.07), '#6e4933', x, .68, side * .47);
  }
  const cover = new THREE.CylinderGeometry(.59,.59,1.66,18,1,true,Math.PI,Math.PI).rotateZ(-Math.PI / 2);
  const awning = add(cover, '#454a38', -.20, .94);
  awning.material.side = THREE.DoubleSide;
  for (let x = -.96; x <= .59; x += .19) add(new THREE.BoxGeometry(.018,.012,1.12), '#95704b', x, .398);
  add(new THREE.BoxGeometry(.25,.13,.94), '#8b582f', .96,.48);
  return boat;
}

function disposeObjects(root) {
  root.traverse(object => {
    object.geometry?.dispose();
    object.material?.dispose();
    if (object.isInstancedMesh) object.dispose();
  });
}

export function createRiverScene(host, {onUnavailable, onLayout}) {
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, powerPreference:'low-power'});
  renderer.setClearColor(haze);
  const canvas = renderer.domElement;
  canvas.className = 'river-scene';
  canvas.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(haze, 43, 145);
  const camera = new THREE.PerspectiveCamera(55, 1, .17, 360);
  const sky = makeSky();
  sky.renderOrder = -1;
  const boat = makeBoat();
  const sun = new THREE.DirectionalLight('#fff0d4', 2.0);
  sun.position.set(-36, 64, -28);
  scene.add(sky, boat, sun, new THREE.HemisphereLight('#e3f2ff', '#928069', 2.05));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let route, terrain, water, progress = 0, sailing = false, frame = 0, previousFrame = -Infinity, disposed = false;
  let paused = false;

  function draw(now = 0) {
    if (disposed || paused || !route || document.hidden) return;
    const time = motion.matches ? 0 : now / 1000;
    boat.position.y = .035 + Math.sin(time * 2.4) * .039;
    boat.rotation.x = Math.sin(time * 2.3) * .018;
    boat.rotation.z = Math.cos(time * 1.9) * .012;
    water.material.uniforms.time.value = time;
    try { renderer.render(scene, camera); }
    catch { loseContext(); }
  }

  function animate(now) {
    frame = 0;
    if (now - previousFrame > 32) {
      previousFrame = now;
      draw(now);
    }
    schedule();
  }

  function schedule() {
    if (!frame && route && !disposed && !paused && !document.hidden && !motion.matches) frame = requestAnimationFrame(animate);
  }

  function pose() {
    const point = worldRiverPoint(route, progress);
    const direction = worldRiverPoint(route, progress + .1).sub(worldRiverPoint(route, progress - .1)).normalize();
    boat.position.copy(point);
    boat.rotation.y = -Math.atan2(direction.z, direction.x);
    const ahead = worldRiverPoint(route, progress + .42).sub(point).normalize();
    const back = worldRiverPoint(route, progress - .45).sub(point).normalize();
    const view = worldRiverPoint(route, progress + .40);
    const compact = camera.aspect < 1.15;
    camera.position.copy(point).addScaledVector(back, compact ? 9.4 : 10.5);
    camera.position.x += ahead.z * (compact ? 1 : 1.75);
    camera.position.z -= ahead.x * (compact ? 1 : 1.75);
    camera.position.y = compact ? 4.6 : 4.1;
    view.y = 1.05;
    camera.lookAt(view);
    camera.updateMatrixWorld();
    sky.position.copy(camera.position);
    const uniforms = water.material.uniforms;
    uniforms.positionOnRiver.value.set(point.x,point.z);
    uniforms.heading.value.set(direction.x,direction.z);
    uniforms.wake.value = sailing ? 1 : .21;
  }

  function layout() {
    if (disposed || !route) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1.15 ? 62 : 52;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
    renderer.setSize(width, height, false);
    pose();
    draw(performance.now());
    onLayout();
  }

  function setRoute(next) {
    if (route === next) return;
    for (const object of [terrain, water]) if (object) {
      scene.remove(object);
      disposeObjects(object);
    }
    route = next;
    progress = 0;
    terrain = makeRiverTerrain(route);
    water = makeWater(route.id === 'yellow');
    scene.add(terrain, water);
    layout();
    schedule();
  }

  function setProgress(step, moving = false) {
    if (!route || disposed) return;
    progress = step;
    sailing = moving;
    pose();
    if (motion.matches) draw();
    schedule();
  }

  function project(step) {
    const point = worldRiverPoint(route, step);
    point.y = 1.65;
    point.project(camera);
    return [THREE.MathUtils.clamp((point.x + 1) / 2, .14, .86), THREE.MathUtils.clamp((1 - point.y) / 2, .19, .53)];
  }

  function changeMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    draw(performance.now());
    schedule();
  }

  function setPaused(value) {
    if (paused === value) return;
    paused = value;
    changeMotion();
  }

  function loseContext(event) {
    event?.preventDefault();
    dispose();
    onUnavailable();
  }

  const observer = new ResizeObserver(layout);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    motion.removeEventListener('change', changeMotion);
    document.removeEventListener('visibilitychange', changeMotion);
    canvas.removeEventListener('webglcontextlost', loseContext);
    disposeObjects(scene);
    renderer.dispose();
    canvas.remove();
  }
  host.prepend(canvas);
  observer.observe(host);
  canvas.addEventListener('webglcontextlost', loseContext);
  motion.addEventListener('change', changeMotion);
  document.addEventListener('visibilitychange', changeMotion);
  return {setRoute, setProgress, setPaused, project, dispose};
}
