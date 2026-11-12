import * as THREE from 'three';
import {riverPosition} from './river-map.js';

const WIDTH = 216, DEPTH = 110;
const {clamp, lerp, smoothstep} = THREE.MathUtils;

export function worldRiverPoint(route, step) {
  const last = route.points.length - 1;
  const segment = clamp(Math.floor(step), 0, last - 1);
  const [x, z] = step < 0 || step > last
    ? route.points[segment].map((value, axis) => lerp(value, route.points[segment + 1][axis], step - segment))
    : riverPosition(route.points, segment, step - segment);
  return new THREE.Vector3(x * WIDTH, 0, z * DEPTH);
}

function hash(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function noise(x, z) {
  const column = Math.floor(x), row = Math.floor(z);
  const u = smoothstep(x - column, 0, 1), v = smoothstep(z - row, 0, 1);
  return lerp(lerp(hash(column, row), hash(column + 1, row), u),
    lerp(hash(column, row + 1), hash(column + 1, row + 1), u), v);
}

export const coast = (z, yellow) => 193 + Math.sin(z * .071) * 4.4 + Math.cos(z * .16) * (yellow ? 3.1 : 1.4);
const bendPlain = (x, z) => smoothstep(x, 72, 94) * (1 - smoothstep(x, 121, 143)) * (1 - smoothstep(z, 32, 52));

export function makeRiverTerrain(route) {
  const yellow = route.id === 'yellow';
  const samples = Array.from({length:137}, (_, index) => worldRiverPoint(route, index * .1 - 1.2));
  function distance(x, z) {
    let best = Infinity;
    for (const point of samples) best = Math.min(best, (point.x - x) ** 2 + (point.z - z) ** 2);
    return Math.sqrt(best);
  }
  function surface(x, z) {
    const downstream = smoothstep(x, 133, 197);
    const width = lerp(3.8, yellow ? 7.4 : 9.3, smoothstep(x, 27, 186));
    const bank = distance(x, z) - width + (noise(x * .28, z * .25) - .5) * 1.3;
    const coastDistance = coast(z, yellow) - x;
    const shelf = Math.min(bank, coastDistance);
    if (shelf < 0) return -Math.min(3, .12 - shelf * .39);
    const grain = noise(x * .12, z * .125);
    const contours = noise(x * .043, z * .046);
    const ranges = noise(x * .019 + 7, z * .027 + 4);
    const rise = smoothstep(shelf, -.2, yellow ? 23 : 15);
    const alpine = 1 - smoothstep(x, 35, 67);
    const highlands = (yellow ? 28 : 35) * (1 - downstream) * (.36 + contours * .73);
    const ridge = Math.pow(.24 + .66 * ranges + .10 * grain, 1.38) * highlands;
    const cliffs = (yellow ? 9 : 17) * (1 - downstream) * (1 - alpine) * Math.pow(contours, 1.2);
    const height = .17 + rise * (ridge + cliffs + alpine * Math.pow(contours, 2) * 34 + grain * 4);
    const detail = yellow ? Math.sin(height * 1.8 + noise(x * .035, z * .045) * 5) * .29
      : (noise(x * .43, z * .29) - .5) * 1.55;
    const plateau = height + rise * detail;
    return yellow ? lerp(plateau, .23 + rise * (1.1 + grain * 1.9), bendPlain(x, z)) : plateau;
  }

  const ground = new THREE.PlaneGeometry(335, 270, 241, 194);
  ground.rotateX(-Math.PI / 2);
  ground.translate(109, 0, 55);
  const position = ground.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const shade = new THREE.Color();
  const meadow = new THREE.Color(yellow ? '#9a955b' : '#60834f');
  const rock = new THREE.Color(yellow ? '#b9844e' : '#687669');
  const sand = new THREE.Color(yellow ? '#c6a878' : '#a4a887');
  const snow = new THREE.Color('#e8eef0');
  const wetland = new THREE.Color('#77864c');
  const field = new THREE.Color('#84945a');
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index), z = position.getZ(index), height = surface(x, z);
    position.setY(index, height);
  }
  ground.computeVertexNormals();
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index), z = position.getZ(index), height = position.getY(index);
    const grain = noise(x * .33, z * .35), broad = noise(x * .08, z * .105);
    shade.copy(meadow).lerp(rock, yellow ? .35 + broad * .53 : .08 + broad * .48);
    shade.lerp(rock, (1 - smoothstep(ground.attributes.normal.getY(index), .38, .94)) * .78);
    shade.lerp(sand, 1 - smoothstep(height, .3, yellow ? 3.8 : 2.4));
    if (yellow && height > 2) shade.multiplyScalar(.93 + Math.sin(height * 3.3 + broad * 4) * .075);
    if (yellow && height > .45) {
      const patch = noise(x * .075, z * .16) * .66 + (Math.sin(z * 1.8) + 1) * .12;
      shade.lerp(field, bendPlain(x,z) * patch);
    }
    if (yellow && x > 158 && height > .04) shade.lerp(wetland, smoothstep(x, 158, 183) * (1 - smoothstep(height, .8, 3)) * broad);
    if (x < 65) shade.lerp(snow, (1 - smoothstep(x, 39, 65)) * smoothstep(height + grain * 4, 20, 30));
    shade.multiplyScalar(.83 + grain * .25 + broad * .09);
    shade.toArray(colors, index * 3);
  }
  ground.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(ground, new THREE.MeshStandardMaterial({vertexColors:true, roughness:.96})));

  const trees = [];
  for (let index = 0; index < 1750; index++) {
    const along = hash(index, 23) * 12.5 - .25;
    const point = worldRiverPoint(route, along);
    const tangent = worldRiverPoint(route, along + .03).sub(point).normalize();
    const offset = (6.5 + hash(index, 8) ** 1.6 * 49) * (index % 2 ? 1 : -1);
    const x = point.x - tangent.z * offset, z = point.z + tangent.x * offset;
    const y = surface(x, z);
    const density = yellow ? (x < 75 || x > 159 ? .38 : .21) : (x < 58 ? .40 : .92);
    if (y < .48 || y > 22 || hash(index, 12) > density || x > coast(z, yellow) - 4) continue;
    const size = .48 + hash(index, 32) * .86;
    trees.push({x, y, z, size, color:hash(index, 41)});
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.075,.14,1,5), new THREE.MeshStandardMaterial({color:'#624831'}), trees.length);
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1), new THREE.MeshStandardMaterial({roughness:1}), trees.length * 2);
  const transform = new THREE.Object3D();
  const dark = new THREE.Color(yellow ? '#52653c' : '#295941');
  const light = new THREE.Color(yellow ? '#7d8b4e' : '#68924f');
  trees.forEach(({x,y,z,size,color}, index) => {
    transform.position.set(x,y + size * .62,z);
    transform.scale.set(size,size * 1.35,size);
    transform.updateMatrix();
    trunk.setMatrixAt(index, transform.matrix);
    for (let crown = 0; crown < 2; crown++) {
      transform.position.set(x + crown * size * .26,y + size * (1.42 + crown * .57),z - crown * size * .19);
      transform.scale.set(size * (.82 - crown * .28), size * (.84 - crown * .21), size * (.76 - crown * .28));
      transform.rotation.y = color * 6;
      transform.updateMatrix();
      leaves.setMatrixAt(index * 2 + crown, transform.matrix);
      leaves.setColorAt(index * 2 + crown, shade.copy(dark).lerp(light, color * .76 + crown * .24));
    }
  });
  group.add(trunk, leaves);
  if (yellow) {
    const reeds = new THREE.InstancedMesh(new THREE.ConeGeometry(.16,.85,4), new THREE.MeshStandardMaterial({color:'#687447',roughness:1}), 550);
    let count = 0;
    for (let index = 0; index < 900 && count < 550; index++) {
      const x = 161 + hash(index, 55) * 41, z = 33 + hash(index, 86) * 37;
      const y = surface(x, z);
      if (y < .07 || y > 1.05 || noise(x * .28,z * .28) < .43) continue;
      const size = .46 + hash(index, 95) * .75;
      transform.position.set(x,y + size * .34,z);
      transform.scale.set(.6 + size,size,1.05);
      transform.rotation.set(.16,.5,hash(index, 97) * .37 - .17);
      transform.updateMatrix();
      reeds.setMatrixAt(count++, transform.matrix);
    }
    reeds.count = count;
    group.add(reeds);
  }
  return group;
}
