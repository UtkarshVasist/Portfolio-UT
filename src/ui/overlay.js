import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CONFIG } from '../config.js';

// All screen-space UI: floating building labels + ENTER prompt (via
// CSS2DRenderer so they track 3D positions), the bottom HUD bar, the
// NPC hover tooltip, and the fade-to-black navigation transition.
export class Overlay {
  constructor(container, buildings) {
    this.container = container;
    this.buildings = buildings;
    this.near = null;
    this.hovered = null;
    this.transition = null;

    // CSS2D renderer for world-anchored labels
    this.css = new CSS2DRenderer();
    this.css.setSize(container.clientWidth, container.clientHeight);
    this.css.domElement.style.position = 'absolute';
    this.css.domElement.style.top = '0';
    this.css.domElement.style.left = '0';
    this.css.domElement.style.pointerEvents = 'none';
    container.appendChild(this.css.domElement);

    // one label object per building, parented to its group
    this.labels = new Map();
    for (const b of buildings) {
      const el = document.createElement('div');
      el.className = 'bldg-label';
      el.innerHTML =
        `<div class="bl-name">${b.data.name}</div>` +
        `<div class="bl-sub">${b.data.sub || ''}</div>` +
        `<div class="bl-enter">[ ENTER ]</div>`;
      const obj = new CSS2DObject(el);
      const topY = b.data.type === 'fountain' ? 2.6 : b.data.height + 1.4;
      obj.position.set(0, topY, 0);
      b.group.add(obj);
      this.labels.set(b.data.id, el);
    }

    // bottom HUD
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML =
      `<span class="key">WASD</span> MOVE` +
      `<span class="sep">•</span>` +
      `<span class="key">CLICK</span> GO` +
      `<span class="sep">•</span>` +
      `<span class="key">E</span> ENTER` +
      `<span id="hud-name"></span>`;
    container.appendChild(hud);
    this.hudName = hud.querySelector('#hud-name');

    // title
    const title = document.createElement('div');
    title.id = 'title';
    title.textContent = 'PORTFOLIO CITY';
    container.appendChild(title);

    // NPC tooltip
    this.tip = document.createElement('div');
    this.tip.id = 'npc-tip';
    this.tip.style.display = 'none';
    container.appendChild(this.tip);

    // fade overlay
    this.fade = document.createElement('div');
    this.fade.id = 'fade';
    container.appendChild(this.fade);
  }

  // "near" (physical proximity) and "hovered" (mouse pointer) are tracked
  // independently and can both be active at once — each just contributes
  // to whether a given building's label is highlighted.
  setNear(b) {
    if (b === this.near) return;
    this.near = b;
    this.refreshHighlights();
  }

  setHovered(b) {
    if (b === this.hovered) return;
    this.hovered = b;
    this.refreshHighlights();
  }

  refreshHighlights() {
    const nearId = this.near && this.near.data.id;
    const hovId = this.hovered && this.hovered.data.id;
    for (const [id, el] of this.labels) {
      el.classList.toggle('is-near', id === nearId || id === hovId);
    }
    const shown = this.near || this.hovered;
    this.hudName.textContent = shown ? '  •  ' + shown.data.name : '';
  }

  showTooltip(npc, sx, sy) {
    if (!npc) { this.tip.style.display = 'none'; return; }
    if (this.tip.dataset.name !== npc.name) {
      const q = npc.quotes[Math.floor(Math.random() * npc.quotes.length)];
      this.tip.innerHTML = `<div class="tip-name">${npc.name}</div><div class="tip-quote">“${q}”</div>`;
      this.tip.dataset.name = npc.name;
    }
    this.tip.style.display = 'block';
    const r = this.container.getBoundingClientRect();
    const w = this.tip.offsetWidth, h = this.tip.offsetHeight;
    let x = sx - r.left - w / 2, y = sy - r.top - h - 18;
    x = Math.max(8, Math.min(x, r.width - w - 8));
    y = Math.max(8, y);
    this.tip.style.transform = `translate(${x}px, ${y}px)`;
  }

  hideTooltip() { this.tip.style.display = 'none'; this.tip.dataset.name = ''; }

  startTransition(url) {
    if (this.transition) return;
    this.transition = { t: 0, url, done: false };
    this.fade.classList.add('active');
  }

  update(dt) {
    if (this.transition) {
      this.transition.t += dt / CONFIG.TRANSITION_TIME;
      if (this.transition.t >= 1 && !this.transition.done) {
        this.transition.done = true;
        window.location.href = this.transition.url;
      }
    }
  }

  render(scene, camera) { this.css.render(scene, camera); }

  resize() { this.css.setSize(this.container.clientWidth, this.container.clientHeight); }
}
