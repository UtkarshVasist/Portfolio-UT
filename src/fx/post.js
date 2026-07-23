import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// EffectComposer chain that gives the scene its look:
//   render -> bloom (glowing windows/lamps) -> output (tone map + sRGB).
// No depth-of-field: that was reading as an overall haze rather than a
// deliberate focus effect. Fog (see main.js) does the "background
// dissolves into the night" job instead, and stays sharp everywhere else.
export function createComposer(renderer, scene, camera, container) {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // threshold raised so the lamps (bright point-light glass, ~2.4 emissive)
  // and the minority of "loom" windows stay the dominant bloom source,
  // while passive-lit windows read as flat warm light with no glow.
  // Bloom is inherently low-frequency/blurry, so running its several
  // downsample/blur mip passes at half resolution is basically free
  // visually but roughly quarters that part of the frame cost.
  const bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.55, 0.6, 0.68);
  composer.addPass(bloom);

  composer.addPass(new OutputPass());

  function setSize(width, height) {
    composer.setSize(width, height);
    bloom.setSize(width / 2, height / 2);
  }

  return { composer, bloom, setSize };
}
