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
    color: THEME.backdrop, roughness: 0.88, metalness: 0,
    emissive: 0x0a0b12, emissiveIntensity: 0.26,
  });
  const inst = new THREE.InstancedMesh(geo, mat, COUNT);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  const rand = (i) => { const s = Math.sin(i * 91.7) * 43758.5453; return s - Math.floor(s); };

  // Two instances in the near-front arc (indices 8 and 26) land tall
  // enough with this formula to loom right over the plaza and block the
  // view — cut just those down instead of lowering the whole ring's range.
  const HEIGHT_CUT = { 8: 0.4, 26: 0.4 };

  let placed = 0;
  for (let i = 0; placed < COUNT && i < COUNT * 4; i++) {
    const ang = rand(i) * Math.PI * 2;
    // closer than the original ring (was 24-42) but kept clear of the
    // plaza edge (disc radius 13, rim to 15.5) so it frames the space
    // without looming over/blocking it; footprints are a bit wider and
    // capped shorter than before so they read as "closer and bigger"
    // without eating more of the sky
    const radius = 17 + rand(i * 1.7) * 7;
    const x = Math.cos(ang) * radius;
    const z = Math.sin(ang) * radius;
    const w = 3 + rand(i * 3.1) * 5;
    const d = 3 + rand(i * 5.3) * 5;
    const h = (5 + rand(i * 7.9) * 10) * (HEIGHT_CUT[placed] ?? 1);
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(w, h, d);
    dummy.rotation.y = rand(i * 2.2) * Math.PI;
    dummy.updateMatrix();
    inst.setMatrixAt(placed, dummy.matrix);
    // very slight per-building lightness variation — just enough that
    // neighboring silhouettes read as separate structures, not a single mass
    const lightness = (rand(i * 9.3) - 0.5) * 0.24;
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
    const radius = 17 + rand(i * 13.3) * 7;
    const m = new THREE.Mesh(speckGeo, speckMat);
    m.position.set(Math.cos(ang) * radius, 2 + rand(i * 17.7) * 14, Math.sin(ang) * radius);
    m.lookAt(0, m.position.y, 0);
    group.add(m);
  }

  return group;
}
