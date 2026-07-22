import * as THREE from 'three';
import { THEME, CONFIG, LAMPS, PROPS, NPCS } from '../config.js';

// Gas lamp posts with warm point lights, small ground clutter, and the
// wandering NPC figures. Returns { group, lampLights, npcs } — npcs carry
// their datum + the mesh (and live wander state) so the UI can hover-test
// them and the main loop can move them.

export function createProps() {
  const group = new THREE.Group();
  const lampLights = [];
  const npcMeshes = [];

  // ---- gas lamps ----
  const postMat = new THREE.MeshStandardMaterial({ color: 0x23232e, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: THEME.amberSoft, emissive: THEME.amber, emissiveIntensity: 2.4, roughness: 0.5,
  });
  for (const [x, z] of LAMPS) {
    const lamp = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8), postMat);
    post.position.y = 1.2; post.castShadow = true;
    lamp.add(post);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), glassMat);
    head.position.y = 2.5;
    lamp.add(head);
    const light = new THREE.PointLight(THEME.amber, 9, 9, 2);
    light.position.set(0, 2.5, 0);
    lamp.add(light);
    lamp.position.set(x, 0, z);
    lampLights.push({ light, base: 9, phase: Math.random() * 6 });
    group.add(lamp);
  }

  // ---- crates & barrels ----
  for (const p of PROPS) {
    let mesh;
    if (p.kind === 'crate') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x4a3620, roughness: 0.9 }),
      );
      mesh.position.set(p.pos[0], 0.35, p.pos[1]);
      mesh.rotation.y = Math.random() * 0.5;
    } else {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.4, 0.85, 12),
        new THREE.MeshStandardMaterial({ color: 0x33241a, roughness: 0.9 }),
      );
      mesh.position.set(p.pos[0], 0.42, p.pos[1]);
    }
    mesh.castShadow = true;
    group.add(mesh);
  }

  // ---- NPCs (static, simple low-poly figures) ----
  for (const n of NPCS) {
    const fig = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: n.coat, roughness: 0.85 });
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.1, 8), coatMat);
    coat.position.y = 0.55; coat.castShadow = true;
    fig.add(coat);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xb99b7a, roughness: 0.8 }),
    );
    head.position.y = 1.25; fig.add(head);
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10),
      new THREE.MeshStandardMaterial({ color: n.hat, roughness: 0.8 }),
    );
    hat.position.y = 1.42; fig.add(hat);
    if (n.umbrella) {
      const um = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 0.3, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x14141d, roughness: 0.9, side: THREE.DoubleSide }),
      );
      um.position.y = 1.85; fig.add(um);
    }
    fig.position.set(n.pos[0], 0, n.pos[1]);
    fig.userData.npc = n;
    group.add(fig);
    npcMeshes.push({
      data: n, group: fig,
      pos: new THREE.Vector3(n.pos[0], 1.3, n.pos[1]),   // kept live for hover hit-testing
      home: new THREE.Vector3(n.pos[0], 0, n.pos[1]),
      target: null,
      pauseUntil: Math.random() * 2,
      facing: 0,
    });
  }

  return { group, lampLights, npcs: npcMeshes };
}

// Gentle wander-and-pause movement so the plaza feels lived-in: each NPC
// idles, picks a nearby random spot within a small radius of its home,
// walks there slower than the player, pauses, repeats.
export function updateNPCs(npcs, dt, t) {
  for (const n of npcs) {
    if (!n.target) {
      if (t < n.pauseUntil) continue;
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * CONFIG.NPC_WANDER_RADIUS;
      n.target = new THREE.Vector3(n.home.x + Math.cos(ang) * r, 0, n.home.z + Math.sin(ang) * r);
    }
    const pos = n.group.position;
    const dx = n.target.x - pos.x, dz = n.target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) {
      n.target = null;
      n.pauseUntil = t + 1.2 + Math.random() * 2.6;
    } else {
      const step = Math.min(dist, CONFIG.NPC_SPEED * dt);
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
      const targetFacing = Math.atan2(dx, dz);
      let d = targetFacing - n.facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      n.facing += d * Math.min(1, 8 * dt);
      n.group.rotation.y = n.facing;
    }
    n.pos.set(pos.x, 1.3, pos.z);
  }
}

// ---- flying paper: a handful of wind-blown scraps drifting across the
// plaza, tumbling, wrapping around when they drift past the edge. ----
function resetPaper(p, initial, radius) {
  const angle = Math.random() * Math.PI * 2;
  const r = initial ? Math.random() * radius : radius + 1.2;
  p.mesh.position.set(Math.cos(angle) * r, 0.1 + Math.random() * 0.2, Math.sin(angle) * r);
  const windAngle = angle + Math.PI + (Math.random() - 0.5) * 1.3;   // roughly back across the plaza
  const speed = CONFIG.PAPER_SPEED * (0.6 + Math.random() * 0.8);
  p.vel.set(Math.cos(windAngle) * speed, 0, Math.sin(windAngle) * speed);
  p.spin = (Math.random() - 0.5) * 4;
  p.tumble = (Math.random() - 0.5) * 3;
  p.bobPhase = Math.random() * 10;
}

export function createFlyingPaper(radius = 11) {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(0.16, 0.22);
  const papers = [];
  for (let i = 0; i < CONFIG.PAPER_COUNT; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcfc2a0, roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.88,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    const p = { mesh, vel: new THREE.Vector3(), spin: 0, tumble: 0, bobPhase: 0 };
    resetPaper(p, true, radius);
    group.add(mesh);
    papers.push(p);
  }
  return { group, papers, radius };
}

export function updatePaper(papers, dt, t, radius) {
  for (const p of papers) {
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.position.y = 0.14 + Math.sin(t * 2.2 + p.bobPhase) * 0.05;
    p.mesh.rotation.y += p.spin * dt;
    p.mesh.rotation.x += p.tumble * dt;
    if (Math.hypot(p.mesh.position.x, p.mesh.position.z) > radius + 1.5) resetPaper(p, false, radius);
  }
}
