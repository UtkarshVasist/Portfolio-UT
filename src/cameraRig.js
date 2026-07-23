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
    this.zoom = 1;                       // current smoothed zoom multiplier
    this.zoomTarget = 1;                 // where the wheel wants it (damped toward)
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

    // scratch vectors reused by forward()/right() every frame — these
    // are called from the keyboard-input hot path, so avoiding a fresh
    // allocation each call matters over a long play session
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();

    // scroll-wheel zoom — a small, smooth range around the default framing
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const next = this.zoomTarget + e.deltaY * CONFIG.ZOOM_WHEEL_SENS;
      this.zoomTarget = Math.min(CONFIG.ZOOM_MAX, Math.max(CONFIG.ZOOM_MIN, next));
    }, { passive: false });
  }

  // camera-relative movement basis (so WASD feels aligned to the view).
  // Returns shared scratch vectors — callers must use the value before
  // the next forward()/right() call, not retain the reference.
  forward() {
    this._forward.set(-this.offset.x, 0, -this.offset.z);
    if (this._forward.lengthSq()) this._forward.normalize();
    else this._forward.set(0, 0, -1);
    return this._forward;
  }
  right() {
    const f = this.forward();
    return this._right.set(-f.z, 0, f.x);   // cross(forward, up) — was inverted
  }

  update(dt, playerPos) {
    const k = 1 - Math.exp(-CONFIG.CAM_LERP * dt);   // frame-rate-independent damping
    this.target.x += (playerPos.x - this.target.x) * k;
    this.target.z += (playerPos.z - this.target.z) * k;
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);

    // smooth, small zoom: damp toward the wheel's target and only touch
    // the projection when it actually moves, to keep this cheap
    const zk = 1 - Math.exp(-CONFIG.ZOOM_LERP * dt);
    const nextZoom = this.zoom + (this.zoomTarget - this.zoom) * zk;
    if (Math.abs(nextZoom - this.zoom) > 1e-5) {
      this.zoom = nextZoom;
      this.applyProjection();
    }
  }

  focusDistance() {
    return this.camera.position.distanceTo(this.target);
  }

  applyProjection() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / h;
    const halfH = this.frustumHalf * this.zoom;
    const halfW = halfH * aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }

  resize() {
    this.applyProjection();
  }
}
