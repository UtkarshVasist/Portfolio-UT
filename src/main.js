import * as THREE from 'three';
import './ui/ui.css';
import { THEME, CONFIG } from './config.js';
import { CameraRig } from './cameraRig.js';
import { addLighting } from './fx/lighting.js';
import { createComposer } from './fx/post.js';
import { createGround } from './world/Ground.js';
import { createBuildings } from './world/Buildings.js';
import { createBackdrop } from './world/Backdrop.js';
import { createProps, createFlyingPaper, updateNPCs, updatePaper } from './world/Props.js';
import { createDust } from './fx/dust.js';
import { createRats, updateRats } from './world/Rats.js';
import { createOcclusionAura } from './fx/occlusionAura.js';
import { Player } from './player/Player.js';
import { Controls } from './player/Controls.js';
import { Overlay } from './ui/overlay.js';

const container = document.getElementById('app');

// ---- renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
container.appendChild(renderer.domElement);

// ---- scene + fog (fades everything to near-black at distance) ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(THEME.bg);
// backdrop ring sits at radius 24-42; keep fog past all of it so the near
// ring reads clearly and only the deep background (beyond the instances) fades
scene.fog = new THREE.Fog(THEME.bg, 40, 70);

// ---- camera ----
const rig = new CameraRig(container);

// ---- lights ----
addLighting(scene);

// ---- world ----
const ground = createGround();
scene.add(ground);
const groundPlane = ground.children[0];      // the disc, for raycasting

const backdrop = createBackdrop();
scene.add(backdrop);

const { group: bldgGroup, meshes: buildings } = createBuildings();
scene.add(bldgGroup);

const { group: propGroup, lampLights, npcs } = createProps();
scene.add(propGroup);

const { group: paperGroup, papers, radius: paperRadius } = createFlyingPaper(11);
scene.add(paperGroup);

const dust = createDust();
scene.add(dust.points);

const { group: ratGroup, rats } = createRats();
scene.add(ratGroup);

// ---- player ----
const player = new Player();
scene.add(player.group);

const occlusionAura = createOcclusionAura(player);
scene.add(occlusionAura.group);

// ---- UI ----
const overlay = new Overlay(container, buildings);

// ---- controls ----
let hoveredNPC = null;
let hoveredBuilding = null;
let lastPointer = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => { lastPointer = { x: e.clientX, y: e.clientY }; });

const controls = new Controls({
  dom: renderer.domElement,
  cameraRig: rig,
  player,
  buildings,
  npcs,
  ground: groundPlane,
  onEnter: (data) => overlay.startTransition(data.url),
  onHoverNPC: (npc, isTouch) => {
    hoveredNPC = npc;
    if (npc && isTouch) controls.touchHoverUntil = clock.elapsedTime + CONFIG.TOUCH_HOVER_TIME;
    if (!npc) overlay.hideTooltip();
  },
  onHoverBuilding: (b) => { hoveredBuilding = b; },
});

// ---- postprocessing ----
const post = createComposer(renderer, scene, rig.camera, container);

// ---- resize ----
function onResize() {
  const w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h);
  rig.resize();
  post.setSize(w, h);
  overlay.resize();
}
window.addEventListener('resize', onResize);

// ---- loop ----
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  const near = controls.update();
  player.update(dt, buildings);
  rig.update(dt, player.pos);
  occlusionAura.update();
  overlay.setNear(near);
  overlay.setHovered(hoveredBuilding);
  overlay.update(dt);

  // touch tooltip auto-expiry
  if (controls.touchHoverUntil && t > controls.touchHoverUntil) { hoveredNPC = null; controls.touchHoverUntil = 0; overlay.hideTooltip(); }
  if (hoveredNPC) overlay.showTooltip(hoveredNPC, lastPointer.x, lastPointer.y);

  // living details: lamp flicker, beacon blink, fountain shimmer
  for (const l of lampLights) l.light.intensity = l.base * (0.85 + 0.15 * Math.sin(t * 6 + l.phase));
  bldgGroup.traverse((o) => {
    if (o.userData.beacon) o.visible = (t * 0.8) % 1.8 < 1.0;
    if (o.userData.water) o.material.emissiveIntensity = 1.1 + 0.3 * Math.sin(t * 2);
  });

  // street life: NPCs wander, litter blows across the plaza
  updateNPCs(npcs, dt, t);
  updateRats(rats, dt, t);
  updatePaper(papers, dt, t, paperRadius);
  dust.update(dt);

  post.composer.render();
  overlay.render(scene, rig.camera);
  requestAnimationFrame(frame);
}
frame();

// debug handle: lets us drive a manual frame + capture when the preview
// pane's rAF/screenshot pipeline is being flaky
window.__city = {
  renderer, scene, camera: rig.camera, composer: post.composer,
  player, rig, buildings, controls, overlay, npcs, papers,
  step(n = 1) { for (let i = 0; i < n; i++) frame(); },
};
