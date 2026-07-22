import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { THEME, BUILDINGS } from '../config.js';

// Builds the 5 hero buildings from BUILDINGS data. Each is a low-poly
// box body in a night tone, with a grid of emissive windows that glow
// (and get caught by bloom), a distinct silhouette per type, and an
// accent sign band. Returns { group, meshes } where meshes carry the
// building datum + a bounding box for collision + a door anchor.

const bodyColorFor = (type) => {
  if (type === 'brownstone') return THEME.stoneWarm;
  if (type === 'guild') return 0x2a2a33;
  if (type === 'kiosk') return 0x1e1f29;
  return THEME.stone;
};

// Roughly a third darker than the body — used on the top face so roofs
// read as a distinct, shadowed plane instead of matching the walls.
const _topColor = new THREE.Color();
const topColorFor = (type) => _topColor.setHex(bodyColorFor(type)).multiplyScalar(0.55).getHex();

// A box body whose top (+y) face is darker than its four side faces.
// BoxGeometry's default face-group order is [+x,-x,+y,-y,+z,-z], so a
// 6-material array maps straight onto that without extra geometry work.
function bodyMaterials(type) {
  const side = new THREE.MeshStandardMaterial({ color: bodyColorFor(type), roughness: 0.9, metalness: 0.05, ...BUMP });
  const top = new THREE.MeshStandardMaterial({ color: topColorFor(type), roughness: 0.95, metalness: 0.05, ...BUMP });
  return [side, side, top, top, side, side];
}

// Thin dark outline on a mesh's own geometry — the cheapest way to make
// a solid-color low-poly box read as a defined structure instead of a
// flat silhouette. "A little" definition: low opacity, no glow.
function addEdges(mesh, opacity = 0.4) {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 25);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x05060a, transparent: true, opacity }));
  mesh.add(line);
}

// One shared, subtly noisy canvas texture used as a bumpMap on every
// building body — "a little bit of texture" on otherwise flat facades,
// reacting to the moonlight rather than needing real photographic assets.
let _noiseTex = null;
function noiseBumpTexture() {
  if (_noiseTex) return _noiseTex;
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.random() * 22;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  _noiseTex = new THREE.CanvasTexture(cv);
  _noiseTex.wrapS = _noiseTex.wrapT = THREE.RepeatWrapping;
  _noiseTex.repeat.set(4, 4);
  return _noiseTex;
}
// standard shared bump settings, spread onto any body/roof material
const BUMP = { bumpMap: noiseBumpTexture(), bumpScale: 0.035 };

// Window quads are batched into at most two draw calls per building (lit +
// dim) instead of one Mesh per window — with dozens of windows per facade
// across several buildings, individual meshes were the single biggest
// contributor to draw-call count and frame hitches.
const _dummy = new THREE.Object3D();
function makeWindows(w, h, d, height, accent) {
  const group = new THREE.Group();
  const winMat = new THREE.MeshStandardMaterial({
    color: THEME.windowLit, emissive: THEME.windowLit,
    emissiveIntensity: 1.0, roughness: 1, metalness: 0,
  });
  const dimMat = new THREE.MeshStandardMaterial({
    color: 0x14131c, emissive: 0x3a2a16, emissiveIntensity: 0.3,
    roughness: 1, metalness: 0,
  });
  const winGeo = new THREE.PlaneGeometry(0.5, 0.7);

  const cols = Math.max(2, Math.floor(w / 1.1));
  const rows = Math.max(2, Math.floor(height / 1.3));
  const faces = [
    { n: [0, 0, 1], span: w, off: [0, 0, d / 2 + 0.02] },
    { n: [0, 0, -1], span: w, off: [0, 0, -d / 2 - 0.02] },
    { n: [1, 0, 0], span: d, off: [w / 2 + 0.02, 0, 0] },
    { n: [-1, 0, 0], span: d, off: [-w / 2 - 0.02, 0, 0] },
  ];
  let seed = w * 13.1 + height * 7.7;
  const litGeoms = [];
  const dimGeoms = [];
  for (const f of faces) {
    const fcols = Math.max(2, Math.floor(f.span / 1.1));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < fcols; c++) {
        seed += 1;
        const lit = (Math.sin(seed * 12.9898) * 43758.5453 % 1 + 1) % 1 > 0.42;
        const u = (c + 0.5) / fcols - 0.5;
        const v = (r + 0.6) / rows;
        _dummy.position.set(
          f.off[0] + f.n[2] * u * f.span,
          v * (height - 0.6) + 0.3,
          f.off[2] + f.n[0] * -u * f.span,
        );
        _dummy.lookAt(
          _dummy.position.x + f.n[0],
          _dummy.position.y,
          _dummy.position.z + f.n[2],
        );
        _dummy.updateMatrix();
        const geo = winGeo.clone().applyMatrix4(_dummy.matrix);
        (lit ? litGeoms : dimGeoms).push(geo);
      }
    }
  }
  if (litGeoms.length) group.add(new THREE.Mesh(mergeGeometries(litGeoms), winMat));
  if (dimGeoms.length) group.add(new THREE.Mesh(mergeGeometries(dimGeoms), dimMat));
  return group;
}

function makeTower(b) {
  const [w, d] = b.size;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, b.height, d), bodyMaterials(b.type));
  body.position.y = b.height / 2;
  body.castShadow = true; body.receiveShadow = true;
  addEdges(body);
  g.add(body);
  // stepped crown
  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.6, b.height * 0.16, d * 0.6),
    new THREE.MeshStandardMaterial({ color: 0x17171e, roughness: 0.9 }),
  );
  crown.position.y = b.height + b.height * 0.08;
  crown.castShadow = true;
  g.add(crown);
  // red beacon
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 3 }),
  );
  beacon.position.y = b.height + b.height * 0.16 + 0.3;
  beacon.userData.beacon = true;
  g.add(beacon);
  g.add(makeWindows(w, d, d, b.height, b.accent));
  return g;
}

function makeBlock(b, roofTrim) {
  const [w, d] = b.size;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, b.height, d), bodyMaterials(b.type));
  body.position.y = b.height / 2;
  body.castShadow = true; body.receiveShadow = true;
  addEdges(body);
  g.add(body);
  if (roofTrim) {
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.15, 0.18, d + 0.15),
      new THREE.MeshStandardMaterial({ color: roofTrim, emissive: roofTrim, emissiveIntensity: 0.3, roughness: 0.7 }),
    );
    trim.position.y = b.height + 0.05;
    g.add(trim);
  }
  g.add(makeWindows(w, d, d, b.height, b.accent));
  return g;
}

function makeKiosk(b) {
  const [w, d] = b.size;
  const g = new THREE.Group();
  // low booth with a glowing sign panel — the resume "stop"
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, b.height, d), bodyMaterials(b.type));
  base.position.y = b.height / 2;
  base.castShadow = true; base.receiveShadow = true;
  addEdges(base);
  g.add(base);
  // roof slab overhang
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.6, 0.2, d + 0.6),
    new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.8 }),
  );
  roof.position.y = b.height + 0.1;
  roof.castShadow = true;
  g.add(roof);
  // glowing route panel
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.8, b.height * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x0e0e16, emissive: b.accent, emissiveIntensity: 1.4 }),
  );
  panel.position.set(0, b.height * 0.62, d / 2 + 0.02);
  g.add(panel);
  return g;
}

function makeFountain(b) {
  // GitHub centerpiece: tiered basin + glowing teal water + pedestal
  const g = new THREE.Group();
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.5, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x23232e, roughness: 0.85, ...BUMP }),
  );
  basin.position.y = 0.25; basin.castShadow = true; basin.receiveShadow = true;
  addEdges(basin, 0.25);
  g.add(basin);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: THEME.teal, emissive: THEME.tealGlow, emissiveIntensity: 1.3, roughness: 0.4 }),
  );
  water.position.y = 0.5;
  water.userData.water = true;
  g.add(water);
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.34, 1.1, 12),
    new THREE.MeshStandardMaterial({ color: 0x1c1c26, roughness: 0.8 }),
  );
  pillar.position.y = 1.0; g.add(pillar);
  // octocat-ish silhouette orb on top
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x0b0d12, emissive: THEME.tealGlow, emissiveIntensity: 0.5, roughness: 0.6 }),
  );
  orb.position.y = 1.75; g.add(orb);
  return g;
}

function makeBillboard(b) {
  // small pole-mounted showcase sign near the tower — flavor signage
  // standing in for Project 01/02/03, all pointing at /projects.
  const g = new THREE.Group();
  const poleH = b.height * 0.6;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, poleH, 8),
    new THREE.MeshStandardMaterial({ color: 0x2c2028, roughness: 0.8 }),
  );
  pole.position.y = poleH / 2; pole.castShadow = true;
  g.add(pole);

  const panelW = 1.5, panelH = b.height * 0.4;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(panelW + 0.12, panelH + 0.12, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x3a2a30, roughness: 0.7, metalness: 0.2 }),
  );
  frame.position.y = poleH + panelH / 2;
  frame.castShadow = true;
  addEdges(frame, 0.3);
  g.add(frame);

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(panelW, panelH),
    new THREE.MeshStandardMaterial({ color: 0x0e0e16, emissive: b.accent, emissiveIntensity: 1.2, roughness: 0.6 }),
  );
  panel.position.set(0, poleH + panelH / 2, 0.05);
  g.add(panel);

  // three small lit ticks along the bottom — one per case study
  const tickMat = new THREE.MeshStandardMaterial({ color: b.accent, emissive: b.accent, emissiveIntensity: 1.6 });
  for (let i = 0; i < 3; i++) {
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14), tickMat);
    tick.position.set((i - 1) * 0.42, poleH + panelH * 0.22, 0.06);
    g.add(tick);
  }
  return g;
}

export function createBuildings() {
  const group = new THREE.Group();
  const meshes = [];
  for (const b of BUILDINGS) {
    let mesh;
    switch (b.type) {
      case 'tower':      mesh = makeTower(b); break;
      case 'guild':      mesh = makeBlock(b, THEME.brass); break;
      case 'brownstone': mesh = makeBlock(b, THEME.copper); break;
      case 'kiosk':      mesh = makeKiosk(b); break;
      case 'fountain':   mesh = makeFountain(b); break;
      case 'billboard':  mesh = makeBillboard(b); break;
      default:           mesh = makeBlock(b, THEME.copper);
    }
    mesh.position.set(b.pos[0], 0, b.pos[1]);
    mesh.userData.building = b;
    group.add(mesh);

    // collision footprint (skip fountain — player can stand at its rim)
    const half = b.type === 'fountain'
      ? { x: 1.5, z: 1.5 }
      : { x: b.size[0] / 2 + 0.2, z: b.size[1] / 2 + 0.2 };
    meshes.push({
      data: b,
      group: mesh,
      center: new THREE.Vector3(b.pos[0], 0, b.pos[1]),
      half,
      door: new THREE.Vector3(b.door[0], 0, b.door[1]),
      solid: b.type !== 'fountain' && b.type !== 'billboard',
    });
  }
  return { group, meshes };
}
