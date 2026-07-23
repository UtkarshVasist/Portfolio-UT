// ============================================================
//  CONFIG — palette, tunables, and all world DATA in one place.
//  Everything here is meant to be edited freely; the scene is
//  generated from these values.
// ============================================================

// Night palette (ported from the old build's THEME)
export const THEME = {
  bg:        0x05060a,   // near-black base / fog color
  sky:       0x0d1117,   // deep navy up high
  amber:     0xff8c00,
  orange:    0xff6b00,
  amberSoft: 0xffb347,
  copper:    0xb87333,
  brass:     0xc5a028,
  teal:      0x2a5f5f,
  tealGlow:  0x3fa8a8,
  text:      '#e8d9b0',

  ground:    0x141620,   // plaza paving
  groundEdge:0x0b0c12,
  stone:     0x2e2f3c,   // building body base
  stoneWarm: 0x3d2c20,   // brownstone body
  backdrop:  0x0f1017,   // blurred silhouette city
  windowLit: 0xffb347,
  moon:      0xaebcd4,
};

export const CONFIG = {
  ISO_AZIMUTH: Math.PI / 4,      // 45° — classic iso yaw
  ISO_ELEV: 0.62,                // ~35° pitch
  CAM_ZOOM: 46,                  // orthographic units-to-pixels-ish; larger = closer
  CAM_LERP: 3.2,                 // damped follow speed
  ZOOM_MIN: 0.9,                 // scroll-wheel zoom range (1 = default frustum)
  ZOOM_MAX: 1.1,
  ZOOM_WHEEL_SENS: 0.0011,       // wheel-delta to zoom-target multiplier
  ZOOM_LERP: 5.5,                // damped approach speed toward the zoom target
  PLAYER_SPEED: 5.2,             // world units / sec
  PLAYER_ACCEL: 14,              // approach speed
  PLAYER_RADIUS: 0.42,
  INTERACT_DIST: 2.2,            // distance from a door to show ENTER
  TRANSITION_TIME: 0.55,
  HOVER_RADIUS: 26,              // px, NPC tooltip hit test
  TOUCH_HOVER_TIME: 3.5,
  PLAYER_MAX_RADIUS: 11.2,       // keeps the player inside the lit plaza disc (r=13)
  DOUBLE_CLICK_MS: 500,          // double-click a building to skip the walk-over
  NPC_WANDER_RADIUS: 1.2,        // how far an NPC strays from its home spot
  NPC_SPEED: 1.5,                // NPC wander speed, world units/sec — slower than the player
  PAPER_COUNT: 6,                // flying paper scraps drifting across the plaza
  PAPER_SPEED: 1.0,              // world units/sec
};

// ---- 5 core hero buildings, placed in the courtyard --------------
// Coordinates are world units on the X/Z ground plane. The player
// spawns near the center; GitHub is the central monument.
//   pos:   [x, z] center of the footprint
//   size:  [w, d] footprint on the ground
//   height:building height
//   door:  [x, z] the walkable spot the player approaches to enter
//   accent:emissive/glow tone for signage
export const BUILDINGS = [
  {
    id: 'projects', name: 'PROJECTS', sub: 'Portfolio', type: 'tower',
    url: '/projects', accent: THEME.amber, mm: '#ff8c00',
    pos: [0, -7.5], size: [5.5, 4], height: 8.5, door: [0, -5.0],
  },
  {
    id: 'about', name: 'ABOUT ME', sub: 'Bio', type: 'brownstone',
    url: '/about', accent: THEME.copper, mm: '#b87333',
    pos: [-8, -1], size: [3.5, 3], height: 4.2, door: [-6.0, -1],
  },
  {
    id: 'skills', name: 'SKILLS', sub: 'Expertise', type: 'guild',
    url: '/skills', accent: THEME.brass, mm: '#c5a028',
    pos: [8, -1], size: [3.5, 3], height: 4.6, door: [6.0, -1],
  },
  {
    id: 'resume', name: 'RESUME', sub: 'Résumé', type: 'kiosk',
    url: '/resume', accent: THEME.orange, mm: '#ff6b00',
    pos: [-5.5, 6], size: [2.6, 2], height: 2.6, door: [-4.0, 4.8],
  },
  {
    // centered exactly on the ground's brass compass ring (see Ground.js)
    id: 'github', name: 'GITHUB', sub: 'Open Source', type: 'fountain',
    url: 'https://github.com', accent: THEME.tealGlow, mm: '#3fa8a8',
    pos: [0, 0], size: [2.4, 2.4], height: 2.2, door: [0, 1.9],
  },
  // A single shared showcase billboard standing near the tower for
  // Project 01/02/03 — a middle ground between "no billboards" and
  // three separate buildings. Same destination as the Projects hub;
  // it's flavor signage, reusing every interaction path unmodified.
  {
    id: 'showcase', name: 'PROJECT SHOWCASE', sub: 'Case Studies', type: 'billboard',
    url: '/projects', accent: THEME.amber, mm: '#c5a028',
    pos: [3.2, -4.0], size: [1.2, 0.8], height: 3.0, door: [3.2, -2.0],
  },
];

// ---- NPCs — hover (mouse) or tap (touch) for name + a quote ------
// Placeholder flavor; swap in real names/quotes any time.
export const NPCS = [
  { pos: [-3.4, 3.6], coat: 0x24444a, hat: 0x141a20, umbrella: true, name: 'Vera Kessler',
    quotes: ['Best portfolio on this side of the river.', 'I heard the client cried tears of joy.', 'That grid alignment? Poetry.'] },
  { pos: [4.2, 4.2], coat: 0x4a3320, hat: 0x201612, name: 'Otto Renner',
    quotes: ['They redesigned my whole business overnight.', 'Never seen pixels so well-behaved.', "I'd hire them twice if I could."] },
  { pos: [-6.6, 3.0], coat: 0x252534, hat: 0x15151e, umbrella: true, name: 'Mabel Frost',
    quotes: ['The typography alone gave me chills.', 'Rumor has it they dream in Bézier curves.', 'Every project ships like clockwork.'] },
  { pos: [6.5, 2.5], coat: 0x3a2f4a, hat: 0x1a1622, name: 'Jonas Webb',
    quotes: ['The commit history alone tells a story.', 'I heard they debug in their sleep.', 'Cleanest codebase I\'ve ever reviewed.'] },
  { pos: [9.5, -4.5], coat: 0x2f4a3a, hat: 0x16221a, umbrella: true, name: 'Priya Shah',
    quotes: ['Every animation feels intentional.', 'They turned a bug report into a feature.', 'I\'d follow that career path in a heartbeat.'] },
  { pos: [-9.2, 4.6], coat: 0x442a2a, hat: 0x1c1414, name: 'Dex Ainsley',
    quotes: ['This place never quite sleeps.', 'Every corner\'s got something lit up.', 'Good spot for a late walk.'] },
  { pos: [8.6, 0.8], coat: 0x2a3a44, hat: 0x141c22, umbrella: true, name: 'Nell Ostrowski',
    quotes: ['The skyline out here has a real boulevard feel.', 'I keep circling back to look at that skyline.', 'Never seen a portfolio with this much atmosphere.'] },
];

// Gas lamp posts — warm point lights ring the plaza
export const LAMPS = [
  [-4.5, -3.5], [4.5, -3.5], [-8.5, 3.5], [8.5, 3.5], [0, 6.5],
];

// Small ground clutter (non-blocking visual props)
export const PROPS = [
  { pos: [-2.4, -2.2], kind: 'crate' },
  { pos: [3.0, -2.0], kind: 'barrel' },
  { pos: [6.0, 3.2], kind: 'crate' },
  { pos: [-7.2, 4.4], kind: 'barrel' },
  { pos: [8.0, 4.6], kind: 'crate' },
  { pos: [1.2, 7.6], kind: 'barrel' },
];

export const PLAYER_START = [0, 3];   // clear of the fountain, now centered at the origin
