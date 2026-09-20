import * as THREE from 'three';

// Temporary scenery shares the island's geometry; only the stepping stones
// belong to this animation and need disposing when the journey ends.
export function createIslandJourney({scene, camera, model, sun, host, face, invalidate}) {
  const destination = new THREE.Vector3(13, 0, -16);
  let trip = null;
  host.dataset.journey = 'idle';

  function finish() {
    if (!trip) return;
    const completed = trip;
    trip = null;
    clearTimeout(completed.timer);
    completed.scenery?.removeFromParent();
    completed.stoneGeometry?.dispose();
    completed.stoneMaterial?.dispose();
    camera.position.set(0, 0, 11);
    camera.lookAt(0, 0, 0);
    sun.position.set(-4, 7, 8);
    sun.target.position.set(0, 0, 0);
    model.backdrop.visible = true;
    scene.background = null;
    face.inert = false;
    host.dataset.journey = 'idle';
    invalidate();
    completed.resolve();
  }

  function start({animated, final = false}) {
    finish();
    return new Promise(resolve => {
      const duration = animated ? (final ? 950 : 2000) : 180;
      trip = {resolve, duration, start:performance.now(), final};
      host.dataset.journey = final ? 'celebrating' : 'walking';
      face.inert = true;
      if (animated && !final) {
        const scenery = new THREE.Group();
        const island = model.world.clone(true);
        island.getObjectByName('reading-glyph')?.removeFromParent();
        island.position.copy(destination);
        scenery.add(island);
        const stoneGeometry = new THREE.CylinderGeometry(.55, .44, .19, 12);
        const stoneMaterial = new THREE.MeshStandardMaterial({color:0xe4d6ac, roughness:.9});
        for (let i = 0; i < 9; i++) {
          const t = (i + 1) / 10;
          const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
          stone.position.set(2 + t * 9, -1.75 + Math.sin(t * Math.PI) * .25, -3 - t * 11);
          stone.rotation.y = t * .8;
          stone.castShadow = stone.receiveShadow = true;
          scenery.add(stone);
        }
        Object.assign(trip, {scenery, stoneGeometry, stoneMaterial});
        scene.add(scenery);
        model.backdrop.visible = false;
        scene.background = new THREE.Color(0xe5eddf);
      }
      // Complete even when the tab is hidden or a device stops delivering frames.
      trip.timer = setTimeout(finish, duration + 60);
      invalidate();
    });
  }

  function update(time) {
    if (!trip) return;
    const p = Math.min(Math.max((time - trip.start) / trip.duration, 0), 1);
    if (p === 1) { finish(); return; }
    if (!trip.scenery) return;
    const eased = p * p * (3 - 2 * p);
    const arc = Math.sin(Math.PI * p);
    const x = destination.x * eased, z = destination.z * eased;
    camera.position.set(x, 4.5 * arc + Math.sin(p * Math.PI * 12) * .08 * arc, 11 + z + 4 * arc);
    camera.lookAt(x, -.6 * arc, z);
    sun.position.set(x - 4, 7, z + 8);
    sun.target.position.set(x, 0, z);
  }

  return {start, update, finish, get active() { return Boolean(trip); }};
}
