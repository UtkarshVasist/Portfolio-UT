import * as THREE from 'three';
import { THEME } from '../config.js';

// The small plaza floor. A dark paved disc with a subtle grid and a
// soft glowing ring inlaid around the center — the sharp, in-focus
// stage the player roams. Its edge is intentionally soft so it melts
// into the fog/blur beyond.
export function createGround() {
  const group = new THREE.Group();

  // main paved disc
  const discGeo = new THREE.CircleGeometry(13, 64);
  discGeo.rotateX(-Math.PI / 2);
  const discMat = new THREE.MeshStandardMaterial({
    color: THEME.ground,
    roughness: 0.95,
    metalness: 0.0,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.receiveShadow = true;
  group.add(disc);

  // faint darker rim so the plaza reads as raised, edge fading out
  const rimGeo = new THREE.RingGeometry(12, 15.5, 64);
  rimGeo.rotateX(-Math.PI / 2);
  const rimMat = new THREE.MeshBasicMaterial({
    color: THEME.groundEdge, transparent: true, opacity: 0.9,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 0.01;
  group.add(rim);

  // subtle paving grid, drawn as thin lines
  const grid = new THREE.GridHelper(26, 26, 0x3a3d4e, 0x262838);
  grid.position.y = 0.02;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  group.add(grid);

  return group;
}
