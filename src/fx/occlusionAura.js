import * as THREE from 'three';

// Classic isometric "see through occluders" effect, kept deliberately
// plain: a single ring around the player, visible only in the pixels a
// building currently occludes — no glow, no character duplicate.
//
// The trick: transparent objects render after the opaque pass, so the
// depth buffer already holds whatever's nearest the camera by the time
// this runs. Flipping depthFunc from the default (draw when nearer than
// what's there) to GreaterDepth means it only draws where something
// nearer is ALREADY in the depth buffer — i.e. exactly where occluded.

let _ringTex = null;
function ringOutlineTexture() {
  if (_ringTex) return _ringTex;
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const c = size / 2;
  ctx.strokeStyle = 'rgba(225,225,225,0.85)';
  ctx.lineWidth = size * 0.07;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  _ringTex = new THREE.CanvasTexture(cv);
  return _ringTex;
}

export function createOcclusionAura(player) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: ringOutlineTexture(),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    opacity: 0.7,
  }));
  sprite.material.depthFunc = THREE.GreaterDepth;
  sprite.scale.set(0.85, 0.85, 1);

  function update() {
    sprite.position.set(player.group.position.x, 0.9, player.group.position.z);
  }

  return { group: sprite, update };
}
