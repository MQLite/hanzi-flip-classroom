import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const carriageWidth = text => Math.max(2, text.length * 0.62 + 0.55);

/** Shared toy-world resources; only word textures vary between questions. */
export function createTrainModels() {
  const geometries = new Map();
  const materials = new Map();
  const labels = new Map();
  const textures = [];
  const palette = ['#dc916a', '#88b7a1', '#b1a2ca', '#dfb65f', '#7facbf', '#d99fa4', '#a1b87d'];

  function geometry(key, build) {
    if (!geometries.has(key)) geometries.set(key, build());
    return geometries.get(key);
  }

  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    return materials.get(color);
  }

  function mesh(parent, shape, color, position, scale = [1, 1, 1]) {
    const item = new THREE.Mesh(shape, material(color));
    item.position.set(...position);
    item.scale.set(...scale);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }

  function box(parent, color, position, size, rounded = true) {
    const shape = geometry(rounded ? 'rounded' : 'box', () => rounded
      ? new RoundedBoxGeometry(1, 1, 1, 2, 0.075)
      : new THREE.BoxGeometry(1, 1, 1));
    return mesh(parent, shape, color, position, size);
  }

  function sphere(parent, color, position, size) {
    return mesh(parent, geometry('sphere', () => new THREE.SphereGeometry(1, 16, 12)), color, position, size);
  }

  function cylinder(parent, color, position, radius, height) {
    return mesh(parent, geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 18)), color, position, [radius, height, radius]);
  }

  function label(parent, text, width, height, position, { foreground = '#304d4a', background = '#fff6db', font = 110 } = {}) {
    const key = `${text}:${width}:${height}:${foreground}:${background}:${font}`;
    if (!labels.has(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * 180);
      canvas.height = Math.ceil(height * 180);
      const context = canvas.getContext('2d');
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = foreground;
      context.font = `700 ${font}px "Microsoft YaHei", sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2 + 5);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      textures.push(texture);
      labels.set(key, new THREE.MeshBasicMaterial({ map: texture }));
    }
    const board = new THREE.Mesh(geometry('plane', () => new THREE.PlaneGeometry(1, 1)), labels.get(key));
    board.position.set(...position);
    board.scale.set(width, height, 1);
    parent.add(board);
    return board;
  }

  function wheels(parent, width) {
    const result = [];
    for (const x of [-width * 0.31, width * 0.31]) {
      for (const z of [-0.59, 0.59]) {
        const wheel = new THREE.Group();
        wheel.position.set(x, 0.29, z);
        const tire = cylinder(wheel, '#3d5960', [0, 0, 0], 0.3, 0.14);
        tire.rotation.x = Math.PI / 2;
        const hub = cylinder(wheel, '#e6ce8f', [0, 0, z > 0 ? 0.09 : -0.09], 0.16, 0.035);
        hub.rotation.x = Math.PI / 2;
        const spoke = box(wheel, '#ffefd0', [0, 0, z > 0 ? 0.12 : -0.12], [0.25, 0.055, 0.04]);
        spoke.rotation.z = Math.PI / 5;
        parent.add(wheel);
        result.push(wheel);
      }
    }
    return result;
  }

  function carriage(text, index, cameraQuaternion) {
    const group = new THREE.Group();
    const width = carriageWidth(text);
    box(group, '#947855', [0, 0.43, 0], [width + 0.13, 0.2, 1.22]);
    box(group, palette[index % palette.length], [0, 0.91, 0], [width, 0.87, 1.06]);
    box(group, '#fff0cd', [0, 1.38, 0], [width + 0.1, 0.15, 1.19]);
    box(group, '#506965', [width / 2 + 0.15, 0.42, 0], [0.4, 0.12, 0.16]);
    const plaque = new THREE.Group();
    plaque.position.set(0, 1.02, 0.94);
    plaque.quaternion.copy(cameraQuaternion);
    box(plaque, '#c7a772', [0, 0, 0], [width - 0.1, 0.9, 0.08]);
    label(plaque, text, width - 0.25, 0.76, [0, 0, 0.047]);
    group.add(plaque);
    group.userData = { width, plaque, wheels: wheels(group, width) };
    return group;
  }

  function engine() {
    const group = new THREE.Group();
    box(group, '#365f5c', [0, 0.52, 0], [2.45, 0.3, 1.32]);
    const boiler = cylinder(group, '#4f9790', [-0.46, 1.02, 0], 0.52, 1.5);
    boiler.rotation.z = Math.PI / 2;
    const nose = cylinder(group, '#ead299', [-1.24, 1.02, 0], 0.39, 0.1);
    nose.rotation.z = Math.PI / 2;
    sphere(group, '#fff7d8', [-1.31, 1.09, 0], [0.075, 0.17, 0.17]);
    box(group, '#487d75', [0.65, 1.18, 0], [1.08, 1.32, 1.15]);
    for (const z of [-0.59, 0.59]) {
      box(group, '#f6e3b5', [0.63, 1.43, z], [0.62, 0.62, 0.065]);
      box(group, '#93c8d1', [0.63, 1.44, z + Math.sign(z) * 0.04], [0.45, 0.43, 0.03]);
    }
    box(group, '#c16d52', [0.62, 1.95, 0], [1.45, 0.21, 1.48]);
    cylinder(group, '#385e5b', [-0.79, 1.73, 0], 0.17, 0.78);
    cylinder(group, '#d0ac68', [-0.79, 2.14, 0], 0.23, 0.14);
    cylinder(group, '#e5c472', [-0.18, 1.62, 0], 0.13, 0.21);
    box(group, '#bd805f', [-1.36, 0.45, 0], [0.23, 0.32, 1.27]);
    box(group, '#3d5658', [1.35, 0.44, 0], [0.4, 0.12, 0.15]);
    group.userData.wheels = wheels(group, 2.2);
    return group;
  }

  function tree(parent, x, z, size = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(size);
    cylinder(group, '#a58057', [0, 0.65, 0], 0.12, 1.3);
    sphere(group, '#81ad78', [0, 1.58, 0], [0.65, 0.94, 0.64]);
    sphere(group, '#9abd83', [-0.25, 1.78, 0.13], [0.52, 0.65, 0.5]);
    sphere(group, '#659c79', [0.3, 1.5, -0.1], [0.4, 0.55, 0.4]);
    parent.add(group);
  }

  function flowers(parent, x, z, count = 4) {
    for (let i = 0; i < count; i++) {
      const px = x + (i % 3) * 0.25;
      const pz = z + Math.floor(i / 3) * 0.24;
      cylinder(parent, '#7b9a62', [px, 0.15, pz], 0.022, 0.28);
      sphere(parent, i % 2 ? '#e8ae82' : '#f6d879', [px, 0.3, pz], [0.1, 0.075, 0.1]);
    }
  }

  function station(parent, x, z) {
    const building = new THREE.Group();
    building.position.set(x, 0, z);
    box(building, '#ddc7a1', [0, 0.12, 0], [5.8, 0.26, 2.65]);
    box(building, '#fae8be', [0, 1, 0], [4.5, 1.75, 1.95]);
    const roofShape = new THREE.Shape().moveTo(-2.6, 0).lineTo(0, 1).lineTo(2.6, 0).closePath();
    const roof = geometry('roof', () => new THREE.ExtrudeGeometry(roofShape, { depth: 2.4, bevelEnabled: true, bevelSize: 0.055, bevelThickness: 0.04, bevelSegments: 2, steps: 1 }));
    mesh(building, roof, '#cb8269', [0, 1.83, -1.2]);
    for (const sx of [-1.45, 1.45]) {
      box(building, '#a99169', [sx, 1.08, 1], [0.8, 0.91, 0.07]);
      box(building, '#a8c9c5', [sx, 1.09, 1.05], [0.61, 0.7, 0.045]);
      box(building, '#fceccc', [sx, 1.09, 1.08], [0.055, 0.7, 0.025]);
      box(building, '#fceccc', [sx, 1.09, 1.08], [0.61, 0.055, 0.025]);
    }
    box(building, '#6a9788', [0, 0.73, 1.01], [0.75, 1.2, 0.08]);
    sphere(building, '#e8ca80', [0.21, 0.72, 1.07], [0.045, 0.045, 0.03]);
    box(building, '#6d9a91', [0, 1.8, 1.42], [5.45, 0.12, 1]);
    for (const sx of [-2.5, 2.5]) cylinder(building, '#f4dfb7', [sx, 0.86, 1.74], 0.075, 1.65);
    box(building, '#496d62', [0, 2.1, 1.22], [2.3, 0.5, 0.08]);
    label(building, '句子小站', 2.15, 0.4, [0, 2.1, 1.27], { foreground: '#fff3cd', background: '#496d62', font: 67 });
    parent.add(building);
  }

  function world(width, yardRows) {
    const group = new THREE.Group();
    const depth = 9.8 + Math.max(0, yardRows - 1) * 3.5;
    box(group, '#c9b68f', [0, -0.51, 0.5], [width, 0.85, depth], true);
    box(group, '#b6ca93', [0, -0.08, 0.5], [width - 0.16, 0.22, depth - 0.12], true);
    box(group, '#d9d7b0', [0, 0.08, -0.7], [width - 1.2, 0.18, 2.2]);
    for (let x = -width / 2 + 0.5; x < width / 2 - 0.4; x += 0.47) {
      box(group, '#9a8668', [x, 0.2, 0.32], [0.22, 0.1, 1.72]);
    }
    for (const z of [-0.25, 0.9]) box(group, '#688581', [0, 0.29, z], [width - 0.75, 0.1, 0.08]);
    station(group, 1.25, -2.82);
    for (let x = -width / 2 + 4; x < width / 2 - 1; x += 0.55) {
      if (x > -1.9 && x < 4.4) continue;
      box(group, '#f4e8c6', [x, 0.6, -1.43], [0.1, 0.95, 0.1]);
      box(group, '#eeddb9', [x + 0.26, 0.73, -1.43], [0.55, 0.075, 0.075]);
    }
    for (const [x, z, size] of [[-width / 2 + 2, -3.4, 1.1], [-5, -3.3, 0.8], [5.4, -3.3, 1.1], [width / 2 - 2, -2.3, 0.85]]) tree(group, x, z, size);
    sphere(group, '#abc998', [-width / 2 + 3.9, 0.25, -3.2], [2.7, 1.45, 1.55]);
    sphere(group, '#98bd93', [width / 2 - 4.2, 0.22, -3.6], [2.4, 1.2, 1.35]);
    const tunnel = new THREE.Group();
    tunnel.position.set(-width / 2 + 0.85, 0.2, 0.32);
    sphere(tunnel, '#739a81', [-0.4, 0.74, -0.12], [1.35, 2.05, 1.9]);
    const entrance = new THREE.Mesh(geometry('portal', () => new THREE.CircleGeometry(1.29, 28)), material('#3a5c57'));
    entrance.rotation.y = Math.PI / 2;
    entrance.position.set(0.85, 1.05, 0);
    tunnel.add(entrance);
    const arch = mesh(tunnel, geometry('arch', () => new THREE.TorusGeometry(1.35, 0.23, 8, 24, Math.PI)), '#d3bd91', [0.91, 1.05, 0]);
    arch.rotation.y = Math.PI / 2;
    for (const z of [-1.35, 1.35]) box(tunnel, '#c2ac85', [0.91, 0.55, z], [0.46, 1.1, 0.45]);
    group.add(tunnel);
    flowers(group, width / 2 - 2.5, 3.7, 7);
    flowers(group, -width / 2 + 2.5, 3.75, 6);
    for (const x of [-width / 2 + 1.1, width / 2 - 1]) {
      cylinder(group, '#668776', [x, 1.25, -0.6], 0.055, 2.35);
      sphere(group, '#ffedbc', [x, 2.47, -0.6], [0.17, 0.2, 0.17]);
    }
    return group;
  }

  function parking(parent, x, z, width, index) {
    box(parent, '#c6d2a9', [x, 0.03, z], [width + 0.18, 0.1, 1.64]);
    for (const side of [-1, 1]) box(parent, '#e8deb9', [x + side * width / 2, 0.095, z], [0.05, 0.04, 1.5]);
    const number = label(parent, String(index + 1).padStart(2, '0'), 0.38, 0.25, [x, 0.13, z + 0.9], { foreground: '#779072', background: '#c6d2a9', font: 34 });
    number.rotation.x = -Math.PI / 2;
  }

  return {
    carriage, engine, world, parking, sphere, box,
    dispose() {
      for (const item of [...geometries.values(), ...materials.values(), ...labels.values(), ...textures]) item.dispose();
    },
  };
}
