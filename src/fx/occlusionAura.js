import * as THREE from 'three';

// Classic isometric "see through occluders" effect. This is NOT a
// placeholder glow blob — it's an x-ray duplicate of the actual player
// mesh (same geometry, same colors, so the character looks exactly the
// same), rendered with a flipped depth test so it's only visible in the
// exact pixels a building currently occludes. A small soft glow rings
// just the silhouette's edge; the character itself stays fully crisp.
//
// The trick: transparent objects render after the opaque pass, so the
// depth buffer already holds whatever's nearest the camera by the time
// this runs. Flipping depthFunc from the default (draw when nearer than
// what's there) to GreaterDepth means it only draws where something
// nearer is ALREADY in the depth buffer — i.e. exactly where occluded.

function xrayMaterial(srcMat) {
  const m = srcMat.clone();
  m.transparent = true;
  m.depthWrite = false;
  m.depthTest = true;
  m.depthFunc = THREE.GreaterDepth;
  // The real player is normally self-lit by its own point light. We don't
  // duplicate that light here (it'd double the glow whenever the player
  // ISN'T occluded), so without it the clone reads as a near-invisible
  // dark smear against unlit walls — give it a baseline self-glow instead.
  if (!m.emissive || m.emissive.getHex() === 0x000000) m.emissive = m.color.clone();
  m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, 0.9);
  return m;
}

let _haloTex = null;
function haloRingTexture() {
  if (_haloTex) return _haloTex;
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const c = size / 2;
  // a ring, not a filled disc — transparent at center AND at the outer
  // edge, so it only softens the silhouette boundary, nothing else
  const grad = ctx.createRadialGradient(c, c, size * 0.3, c, c, size * 0.5);
  grad.addColorStop(0, 'rgba(255,214,160,0)');
  grad.addColorStop(0.6, 'rgba(255,205,150,0.45)');
  grad.addColorStop(1, 'rgba(255,195,130,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  _haloTex = new THREE.CanvasTexture(cv);
  return _haloTex;
}

export function createOcclusionAura(player) {
  const group = new THREE.Group();

  // sharp, full-detail x-ray copy of the player figure — identical
  // geometry/materials, just re-tested against the depth buffer inverted.
  // clone(true) copies player.group's CURRENT position/rotation (its
  // spawn point) onto the clone as a local transform; since the clone
  // becomes a child of `group` (which is itself synced to the player
  // every frame below), that inherited transform must be zeroed out or
  // the clone ends up rendering at spawn-position-plus-current-position.
  const clone = player.group.clone(true);
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  clone.traverse((o) => {
    if (o.isLight) { o.visible = false; return; }
    if (o.isMesh) {
      o.castShadow = false;
      o.material = Array.isArray(o.material) ? o.material.map(xrayMaterial) : xrayMaterial(o.material);
      o.renderOrder = 998;
    }
  });
  group.add(clone);

  // soft blurred glow right at the silhouette edge only (a ring texture,
  // transparent in the middle) — the character itself is never blurred
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloRingTexture(),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    opacity: 0.9,
  }));
  halo.material.depthFunc = THREE.GreaterDepth;
  // sized to hug the ~1.5-unit-tall character, not overshoot it — an
  // oversized halo clips into nearby unrelated geometry (e.g. the edge
  // of whatever the player is standing on) and falsely shows even when
  // the character itself is fully unoccluded
  halo.scale.set(0.8, 1.15, 1);
  halo.position.y = 0.85;
  halo.renderOrder = 997;
  group.add(halo);

  function update() {
    group.position.copy(player.group.position);
    group.rotation.copy(player.group.rotation);
  }

  return { group, update };
}
