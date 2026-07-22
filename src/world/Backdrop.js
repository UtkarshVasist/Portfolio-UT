import * as THREE from 'three';
import { THEME } from '../config.js';

// A ring of dark building silhouettes surrounding the plaza, close and
// dense enough to frame every side (including the near/front arc), with
// fog doing the "dissolves into the night" work at the far edge. No
// window detail, no collision — pure atmosphere. InstancedMesh for cheapness.
export function createBackdrop() {
  const group = new THREE.Group();
  const COUNT = 55;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: THEME.backdrop, roughness: 1, metalness: 0,
    emissive: 0x0a0b12, emissiveIntensity: 0.2,
  });
  const inst = new THREE.InstancedMesh(geo, mat, COUNT);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  const rand = (i) => { const s = Math.sin(i * 91.7) * 43758.5453; return s - Math.floor(s); };

  let placed = 0;
  for (let i = 0; placed < COUNT && i < COUNT * 4; i++) {
    const ang = rand(i) * Math.PI * 2;
    // pulled in tight around the plaza edge (13-15.5) so only the very
    // center stays open; wider/shorter footprints read as "closer and
    // bigger" without growing the skyline vertically
    const radius = 16.5 + rand(i * 1.7) * 8;
    const x = Math.cos(ang) * radius;
    const z = Math.sin(ang) * radius;
    const w = 4 + rand(i * 3.1) * 7;
    const d = 4 + rand(i * 5.3) * 7;
    const h = 4 + rand(i * 7.9) * 8;
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(w, h, d);
    dummy.rotation.y = rand(i * 2.2) * Math.PI;
    dummy.updateMatrix();
    inst.setMatrixAt(placed, dummy.matrix);
    // very slight per-building lightness variation — just enough that
    // neighboring silhouettes read as separate structures, not a single mass
    const lightness = (rand(i * 9.3) - 0.5) * 0.16;
    tint.setHex(THEME.backdrop).offsetHSL(0, 0, lightness);
    inst.setColorAt(placed, tint);
    placed++;
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  group.add(inst);

  // a handful of faint warm window specks on the near backdrop, so it
  // isn't a dead black wall — kept sparse and dim
  const speckGeo = new THREE.PlaneGeometry(0.4, 0.5);
  const speckMat = new THREE.MeshStandardMaterial({
    color: 0x7a4a1c, emissive: 0xb8701f, emissiveIntensity: 0.7,
    transparent: true, opacity: 0.5, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 40; i++) {
    const ang = rand(i * 11.1) * Math.PI * 2;
    const radius = 16.5 + rand(i * 13.3) * 8;
    const m = new THREE.Mesh(speckGeo, speckMat);
    m.position.set(Math.cos(ang) * radius, 2 + rand(i * 17.7) * 14, Math.sin(ang) * radius);
    m.lookAt(0, m.position.y, 0);
    group.add(m);
  }

  return group;
}
