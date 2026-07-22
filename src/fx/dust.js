import * as THREE from 'three';

// A handful of faint motes drifting up through the plaza — kept sparse
// and dim so it reads as atmosphere, not a snow/ash effect.
export function createDust(count = 26, radius = 13) {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const drift = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    positions[i * 3] = Math.cos(ang) * r;
    positions[i * 3 + 1] = Math.random() * 4.5;
    positions[i * 3 + 2] = Math.sin(ang) * r;
    speeds[i] = 0.035 + Math.random() * 0.05;
    drift[i * 2] = (Math.random() - 0.5) * 0.05;
    drift[i * 2 + 1] = (Math.random() - 0.5) * 0.05;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xaab0c8, size: 0.028, transparent: true, opacity: 0.18,
    depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);

  function update(dt) {
    const pos = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      let x = pos.getX(i) + drift[i * 2] * dt;
      let y = pos.getY(i) + speeds[i] * dt;
      let z = pos.getZ(i) + drift[i * 2 + 1] * dt;
      if (y > 4.5) y = 0;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  return { points, update };
}
