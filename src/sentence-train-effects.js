import * as THREE from 'three';

/** A bounded, reusable effects pool. No timers or RAF live outside the scene. */
export function createTrainEffects() {
  const group = new THREE.Group();
  group.visible = false;
  const resources = [];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(0.22, '#ffffff');
  glow.addColorStop(0.5, '#ffffffaa');
  glow.addColorStop(1, '#ffffff00');
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  resources.push(texture);

  const bursts = [0xeaa425, 0xe3675a, 0x279ab2].map((color, index) => {
    const count = 48;
    const positions = new Float32Array(count * 3);
    const tails = new Float32Array(count * 6);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(tails, 3));
    const material = new THREE.PointsMaterial({ color, map: texture, size: 11, sizeAttenuation: false, transparent: true, depthWrite: false, toneMapped: false });
    const trailMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
    const points = new THREE.Points(geometry, material);
    const lines = new THREE.LineSegments(trailGeometry, trailMaterial);
    points.frustumCulled = lines.frustumCulled = false;
    group.add(points, lines);
    resources.push(geometry, trailGeometry, material, trailMaterial);
    return { points, lines, positions, tails, delay: 0.05 + index * 0.3, x: [-6, 5.4, 0][index], height: [4.05, 4.35, 4.0][index], count };
  });

  const puffGeometry = new THREE.SphereGeometry(1, 10, 8);
  resources.push(puffGeometry);
  const steam = Array.from({ length: 14 }, () => {
    const material = new THREE.MeshBasicMaterial({ color: '#fff7e6', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const puff = new THREE.Mesh(puffGeometry, material);
    group.add(puff);
    resources.push(material);
    return puff;
  });

  function update(seconds, engineAt) {
    group.visible = true;
    for (const burst of bursts) {
      const age = seconds - burst.delay;
      const expanding = Math.max(0, age - 0.48);
      const alive = age >= 0 && expanding < 1.6;
      burst.points.visible = burst.lines.visible = alive;
      if (!alive) continue;
      const fade = Math.max(0, 1 - expanding / 1.6);
      burst.points.material.opacity = fade;
      burst.lines.material.opacity = fade * 0.8;
      for (let i = 0; i < burst.count; i++) {
        let x, y, z, tx, ty, tz;
        if (age < 0.48) {
          x = burst.x;
          y = 0.7 + (burst.height - 0.7) * age / 0.48;
          z = 0.3;
          tx = x; ty = y - 0.38; tz = z;
          // A single luminous shell and a short trail rise before each burst.
          if (i > 0) { x = tx = 999; }
        } else {
          const angle = i * 2.399963;
          const radial = 0.6 + (i % 5) * 0.105;
          const travel = Math.min(expanding, 1) * 2.15;
          const dx = Math.cos(angle) * radial;
          const dy = Math.sin(angle) * radial;
          const dz = Math.sin(i * 1.77) * 0.24;
          x = burst.x + dx * travel;
          y = burst.height + dy * travel - expanding * expanding * 0.35;
          z = 0.3 + dz * travel;
          tx = x - dx * 0.27; ty = y - dy * 0.27; tz = z - dz * 0.27;
        }
        burst.positions.set([x, y, z], i * 3);
        burst.tails.set([x, y, z, tx, ty, tz], i * 6);
      }
      burst.points.geometry.attributes.position.needsUpdate = true;
      burst.lines.geometry.attributes.position.needsUpdate = true;
    }
    steam.forEach((puff, index) => {
      const emittedAt = index * 0.14;
      const age = seconds - emittedAt;
      puff.visible = age >= 0 && age < 1.2;
      if (!puff.visible) return;
      const source = engineAt(emittedAt);
      puff.position.set(source.x - 0.8 - age * 0.35, source.y + 2.2 + age * 1.3, source.z);
      puff.scale.setScalar(0.09 + age * 0.22);
      puff.material.opacity = 0.5 * (1 - age / 1.2);
    });
  }

  return {
    group,
    update,
    clear() { group.visible = false; },
    dispose() { group.clear(); resources.forEach(item => item.dispose()); },
  };
}
