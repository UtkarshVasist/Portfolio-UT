import * as THREE from 'three';
import { THEME } from '../config.js';

// One cool directional "moonlight" casting soft shadows, a low
// hemisphere fill so shadows aren't pure black, and a faint ambient.
// The warm accents all come from emissive materials + lamp point
// lights (see Props.js), which keeps the night palette cohesive.
export function addLighting(scene) {
  const moon = new THREE.DirectionalLight(THEME.moon, 2.7);
  moon.position.set(-14, 22, 10);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 80;
  const s = 26;
  moon.shadow.camera.left = -s;
  moon.shadow.camera.right = s;
  moon.shadow.camera.top = s;
  moon.shadow.camera.bottom = -s;
  moon.shadow.bias = -0.0004;
  scene.add(moon);

  const hemi = new THREE.HemisphereLight(0x3a4570, 0x0d0d16, 0.5);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x37406a, 0.3);
  scene.add(ambient);

  return { moon, hemi, ambient };
}
