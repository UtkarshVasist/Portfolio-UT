import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Unifies keyboard + pointer. Keyboard sets a camera-relative desired
// direction each frame (continuous, not grid). Pointer raycasts: a hit
// on a building walks to its door then enters; a hit on the ground is
// a click-to-move target; a hit on an NPC surfaces its tooltip; a
// click on the floating ENTER prompt enters directly.
export class Controls {
  constructor({ dom, cameraRig, player, buildings, npcs, ground, onEnter, onHoverNPC, onHoverBuilding }) {
    this.rig = cameraRig;
    this.player = player;
    this.buildings = buildings;
    this.npcs = npcs;
    this.ground = ground;
    this.onEnter = onEnter;
    this.onHoverNPC = onHoverNPC;
    this.onHoverBuilding = onHoverBuilding || (() => {});
    this.keys = new Set();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._dir = new THREE.Vector3();     // scratch for applyKeyboard(), reused every frame
    this.pendingEnter = null;     // building we're walking to, to auto-enter
    this.touchHoverUntil = 0;
    this.lastClick = { id: null, t: 0 };   // for double-click-to-skip-the-walk

    const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    window.addEventListener('keydown', (e) => {
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      if (MOVE.includes(e.code)) { this.keys.add(e.code); this.player.moveTarget = null; this.pendingEnter = null; }
      if (e.code === 'KeyE' && !e.repeat) this.tryEnterNearest();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    dom.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    dom.addEventListener('pointermove', (e) => this.onPointerMove(e));
    dom.addEventListener('pointerleave', () => { this.onHoverNPC(null); this.onHoverBuilding(null); });
    this._dom = dom;
  }

  setPointer(e) {
    const rect = this._dom.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  pick(objects, recursive = true) {
    this.raycaster.setFromCamera(this.pointer, this.rig.camera);
    return this.raycaster.intersectObjects(objects, recursive);
  }

  // which building's group an intersected object belongs to
  buildingFromHit(obj) {
    let o = obj;
    while (o) {
      if (o.userData && o.userData.building) return o.userData.building;
      o = o.parent;
    }
    return null;
  }

  npcFromScreen(e) {
    // NPCs are hover-tested in screen space (project their head point)
    const rect = this._dom.getBoundingClientRect();
    for (const n of this.npcs) {
      const p = n.pos.clone().project(this.rig.camera);
      const sx = rect.left + (p.x * 0.5 + 0.5) * rect.width;
      const sy = rect.top + (-p.y * 0.5 + 0.5) * rect.height;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (dx * dx + dy * dy < CONFIG.HOVER_RADIUS * CONFIG.HOVER_RADIUS) return n;
    }
    return null;
  }

  // which building (if any) the pointer is currently over, via raycast
  buildingFromScreen(e) {
    this.setPointer(e);
    const hits = this.pick(this.buildings.map((b) => b.group));
    if (!hits.length) return null;
    const data = this.buildingFromHit(hits[0].object);
    return this.buildings.find((x) => x.data === data) || null;
  }

  onPointerMove(e) {
    if (e.pointerType === 'touch') return;
    const n = this.npcFromScreen(e);
    this.onHoverNPC(n);
    if (n) { this.onHoverBuilding(null); this._dom.style.cursor = 'help'; return; }
    const b = this.buildingFromScreen(e);
    this.onHoverBuilding(b);
    this._dom.style.cursor = b ? 'pointer' : 'crosshair';
  }

  onPointerDown(e) {
    this.setPointer(e);

    // 1) NPC tap (touch) — briefly show tooltip
    const npc = this.npcFromScreen(e);
    if (npc) { this.onHoverNPC(npc, true); return; }

    // 2) building? — single click walks over then enters; a second click on
    // the same building within DOUBLE_CLICK_MS skips the walk and enters now
    const bHits = this.pick(this.buildings.map((b) => b.group));
    if (bHits.length) {
      const data = this.buildingFromHit(bHits[0].object);
      const b = this.buildings.find((x) => x.data === data);
      if (b) {
        const now = performance.now();
        const isDouble = this.lastClick.id === b.data.id && (now - this.lastClick.t) < CONFIG.DOUBLE_CLICK_MS;
        this.lastClick = { id: b.data.id, t: now };
        if (isDouble) {
          this.player.moveTarget = null;
          this.pendingEnter = null;
          this.onEnter(b.data);
        } else {
          this.walkToEnter(b);
        }
        return;
      }
    }

    // 3) ground → click-to-move
    const gHits = this.pick([this.ground], true);
    if (gHits.length) {
      this.player.moveTarget = gHits[0].point.clone();
      this.player.moveTarget.y = 0;
      this.pendingEnter = null;
    }
  }

  walkToEnter(b) {
    if (this.player.pos.distanceTo(b.door) < CONFIG.INTERACT_DIST) { this.onEnter(b.data); return; }
    this.player.moveTarget = b.door.clone();
    this.pendingEnter = b;
  }

  nearestBuilding() {
    let best = null, bd = CONFIG.INTERACT_DIST;
    for (const b of this.buildings) {
      const d = this.player.pos.distanceTo(b.door);
      if (d <= bd) { bd = d; best = b; }
    }
    return best;
  }

  tryEnterNearest() {
    const b = this.nearestBuilding();
    if (b) this.onEnter(b.data);
  }

  // called each frame before player.update — reuses a scratch vector
  // (this._dir) rather than allocating one every frame forever
  applyKeyboard() {
    const dir = this._dir.set(0, 0, 0);
    const f = this.rig.forward(), r = this.rig.right();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dir.add(f);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dir.sub(f);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dir.add(r);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dir.sub(r);
    if (dir.lengthSq() > 0) { dir.normalize(); this.player.desiredDir.copy(dir); }
  }

  // returns the building whose door is in range (for the ENTER prompt)
  update() {
    this.applyKeyboard();
    // auto-enter when we arrive at a building we were walking to
    if (this.pendingEnter && !this.player.moveTarget) {
      if (this.player.pos.distanceTo(this.pendingEnter.door) < CONFIG.INTERACT_DIST + 0.4) {
        const b = this.pendingEnter; this.pendingEnter = null; this.onEnter(b.data);
      } else {
        this.pendingEnter = null;
      }
    }
    return this.nearestBuilding();
  }
}
