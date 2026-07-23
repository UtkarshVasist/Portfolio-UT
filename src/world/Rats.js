import * as THREE from 'three';
import { CONFIG } from '../config.js';

// A handful of rats that dart around the plaza — unlike the NPCs' gentle
// home-tethered wander, these pick a fresh target anywhere in the whole
// lit area, sprint for it, freeze briefly, then dart again.

function makeRat() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x241f1a, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bodyMat);
  body.scale.set(1, 0.75, 1.6);
  body.position.y = 0.07;
  body.castShadow = true;
  g.add(body);

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.014, 0.22, 5), bodyMat);
  tail.position.set(0, 0.05, -0.16);
  tail.rotation.x = Math.PI / 2 + 0.25;
  g.add(tail);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.045, 6), bodyMat);
    ear.position.set(side * 0.05, 0.13, 0.09);
    ear.rotation.x = -0.4;
    g.add(ear);
  }

  return g;
}

export function createRats(count = 4, radius = CONFIG.PLAYER_MAX_RADIUS - 0.6) {
  const group = new THREE.Group();
  const rats = [];
  for (let i = 0; i < count; i++) {
    const mesh = makeRat();
    const ang = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    mesh.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    group.add(mesh);
    rats.push({
      mesh,
      target: null,
      pauseUntil: Math.random() * 1.5,
      facing: 0,
      wobblePhase: Math.random() * 10,
      radius,
    });
  }
  return { group, rats };
}

const RAT_SPEED = 3.4;          // faster than NPCs' 1.5 — a proper dart
const RAT_PAUSE_MIN = 0.4;
const RAT_PAUSE_MAX = 1.2;

export function updateRats(rats, dt, t) {
  for (const r of rats) {
    if (!r.target) {
      if (t < r.pauseUntil) continue;
      // pick anywhere in the full plaza, not just nearby — lets a dart
      // actually cross the space instead of pacing a small patch
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * r.radius;
      r.target = new THREE.Vector3(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
    }
    const pos = r.mesh.position;
    const dx = r.target.x - pos.x, dz = r.target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.1) {
      r.target = null;
      r.pauseUntil = t + RAT_PAUSE_MIN + Math.random() * (RAT_PAUSE_MAX - RAT_PAUSE_MIN);
    } else {
      const step = Math.min(dist, RAT_SPEED * dt);
      const nx = dx / dist, nz = dz / dist;
      // small perpendicular wobble for a scurrying, not gliding, gait
      const wobble = Math.sin(t * 16 + r.wobblePhase) * 0.35;
      pos.x += nx * step - nz * wobble * dt;
      pos.z += nz * step + nx * wobble * dt;

      const targetFacing = Math.atan2(dx, dz);
      let d = targetFacing - r.facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      r.facing += d * Math.min(1, 14 * dt);
      r.mesh.rotation.y = r.facing;
    }
  }
}
