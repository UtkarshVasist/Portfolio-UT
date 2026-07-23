import * as THREE from 'three';
import { THEME, CONFIG, PLAYER_START } from '../config.js';

// The player: a small low-poly figure (trench coat + noir hat) that
// moves in continuous world space with smooth acceleration, faces its
// travel direction, and bobs while walking. Collision is circle-vs-box
// slide against building footprints.
export class Player {
  constructor() {
    this.group = new THREE.Group();
    this.pos = new THREE.Vector3(PLAYER_START[0], 0, PLAYER_START[1]);
    this.vel = new THREE.Vector3();
    this.desiredDir = new THREE.Vector3();   // from keyboard/click each frame
    this.moveTarget = null;                  // click-to-move destination
    this.facing = 0;                         // yaw radians
    this.bob = 0;
    this.speed = 0;

    // build the figure
    const coat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.32, 0.95, 10),
      new THREE.MeshStandardMaterial({ color: 0x343442, roughness: 0.8 }),
    );
    coat.position.y = 0.5; coat.castShadow = true;
    this.group.add(coat);
    const scarf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 0.14, 10),
      new THREE.MeshStandardMaterial({ color: 0xb35a1e, emissive: 0xb35a1e, emissiveIntensity: 0.35, roughness: 0.7 }),
    );
    scarf.position.y = 0.95; this.group.add(scarf);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xc9a175, roughness: 0.8 }),
    );
    head.position.y = 1.2; this.group.add(head);
    const hatBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.7 }),
    );
    hatBrim.position.y = 1.34; this.group.add(hatBrim);
    const hatTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.7 }),
    );
    hatTop.position.y = 1.45; this.group.add(hatTop);
    // little forward nub so facing direction is legible
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22 }),
    );
    nose.position.set(0, 1.18, 0.18); this.group.add(nose);

    // a small warm glow the character carries, so it always reads on the
    // dark plaza and casts a moving pool of light (nice game-feel too)
    const glow = new THREE.PointLight(0xffb066, 3.2, 5, 2);
    glow.position.set(0, 0.9, 0);
    this.group.add(glow);

    this.group.scale.setScalar(1.2);   // a touch larger so the character reads
    this.group.position.copy(this.pos);

    // scratch vectors reused every frame in update() — this runs
    // indefinitely at 60fps, so allocating fresh Vector3s here was
    // steady GC pressure that showed up as periodic stutter over a
    // longer play session
    this._dirScratch = new THREE.Vector3();
    this._to = new THREE.Vector3();
    this._desiredVel = new THREE.Vector3();
    this._next = new THREE.Vector3();
  }

  // buildings: array from createBuildings().meshes (with center/half/solid)
  update(dt, buildings) {
    // resolve desired direction: click-target takes over until reached,
    // but any keyboard input cancels it (handled in Controls)
    let dir = this._dirScratch.copy(this.desiredDir);
    if (this.moveTarget) {
      const to = this._to.subVectors(this.moveTarget, this.pos);
      to.y = 0;
      if (to.length() < 0.15) { this.moveTarget = null; dir.set(0, 0, 0); }
      else dir = to.normalize();
    }

    // accelerate toward desired velocity
    const desiredVel = this._desiredVel.copy(dir).multiplyScalar(CONFIG.PLAYER_SPEED);
    const a = 1 - Math.exp(-CONFIG.PLAYER_ACCEL * dt);
    this.vel.x += (desiredVel.x - this.vel.x) * a;
    this.vel.z += (desiredVel.z - this.vel.z) * a;

    // integrate + collide (slide) against building boxes
    const next = this._next.copy(this.pos).addScaledVector(this.vel, dt);
    this.collide(next, buildings);
    this.containInLitPlaza(next);
    this.pos.copy(next);
    this.pos.y = 0;

    // facing + bob
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.4) {
      const targetYaw = Math.atan2(this.vel.x, this.vel.z);
      let d = targetYaw - this.facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.facing += d * (1 - Math.exp(-12 * dt));
      this.bob += dt * this.speed * 3.4;
    }
    this.group.position.set(this.pos.x, Math.abs(Math.sin(this.bob)) * 0.08, this.pos.z);
    this.group.rotation.y = this.facing;

    this.desiredDir.set(0, 0, 0);   // consumed; Controls sets it each frame
  }

  // keeps the player inside the lit plaza — never out in the dark/blurred rim
  containInLitPlaza(next) {
    const dist = Math.hypot(next.x, next.z);
    if (dist <= CONFIG.PLAYER_MAX_RADIUS) return;
    const k = CONFIG.PLAYER_MAX_RADIUS / dist;
    next.x *= k; next.z *= k;
    // zero the outward radial component so the player doesn't keep pressing
    // into the boundary (still free to slide along it)
    const nx = next.x / CONFIG.PLAYER_MAX_RADIUS, nz = next.z / CONFIG.PLAYER_MAX_RADIUS;
    const outward = this.vel.x * nx + this.vel.z * nz;
    if (outward > 0) { this.vel.x -= outward * nx; this.vel.z -= outward * nz; }
  }

  collide(next, buildings) {
    const r = CONFIG.PLAYER_RADIUS;
    for (const b of buildings) {
      if (!b.solid) continue;
      const minX = b.center.x - b.half.x - r, maxX = b.center.x + b.half.x + r;
      const minZ = b.center.z - b.half.z - r, maxZ = b.center.z + b.half.z + r;
      if (next.x > minX && next.x < maxX && next.z > minZ && next.z < maxZ) {
        // push out along the axis of least penetration
        const penX = Math.min(next.x - minX, maxX - next.x);
        const penZ = Math.min(next.z - minZ, maxZ - next.z);
        if (penX < penZ) {
          next.x = (next.x - b.center.x > 0) ? maxX : minX;
          this.vel.x = 0;
        } else {
          next.z = (next.z - b.center.z > 0) ? maxZ : minZ;
          this.vel.z = 0;
        }
      }
    }
  }
}
