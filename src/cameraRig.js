import * as THREE from 'three';
import { CONFIG } from './config.js';

// Orthographic camera locked to a fixed isometric angle, framing the
// courtyard, with a critically-damped follow of the player target.
// The fixed offset preserves the iso look; only the look-at target
// glides toward the player, which fixes the laggy/jittery feel.
export class CameraRig {
  constructor(container) {
    this.container = container;
    this.frustumHalf = 12.5;             // world units visible top-to-center; smaller = closer
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.target = new THREE.Vector3(0, 0.5, 0);

    // iso offset direction (azimuth yaw + elevation pitch)
    const az = CONFIG.ISO_AZIMUTH, el = CONFIG.ISO_ELEV;
    this.offset = new THREE.Vector3(
      Math.sin(az) * Math.cos(el),
      Math.sin(el),
      Math.cos(az) * Math.cos(el),
    ).multiplyScalar(44);

    this.camera.position.copy(this.target).add(this.offset);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.target);
    this.resize();
  }

  // camera-relative movement basis (so WASD feels aligned to the view)
  forward() {
    const f = new THREE.Vector3(-this.offset.x, 0, -this.offset.z);
    return f.lengthSq() ? f.normalize() : new THREE.Vector3(0, 0, -1);
  }
  right() {
    const f = this.forward();
    return new THREE.Vector3(-f.z, 0, f.x);   // cross(forward, up) — was inverted
  }

  update(dt, playerPos) {
    const k = 1 - Math.exp(-CONFIG.CAM_LERP * dt);   // frame-rate-independent damping
    this.target.x += (playerPos.x - this.target.x) * k;
    this.target.z += (playerPos.z - this.target.z) * k;
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
  }

  focusDistance() {
    return this.camera.position.distanceTo(this.target);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / h;
    const halfH = this.frustumHalf;
    const halfW = halfH * aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }
}
