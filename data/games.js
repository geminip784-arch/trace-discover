// data/games.js — what the games book shows (Slices 5D and 5F), in docs/mockups/mockup4.html's
// style: flat shapes, soft outlines, a white shine. Every picture is inline SVG,
// so the games work offline. The red apple, yellow lemon and blue cup come from
// data/finds.js (the countable things); the letter pictures and the shadows use
// the find library's objects (OBJECTS); the rest are drawn here.

import { THINGS, OBJECTS, ROOMS } from './finds.js';

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const svg = (vb, body) => `<svg ${NS} viewBox="${vb}" class="art" style="overflow:visible">${body}</svg>`;

// ---- colors to things ----

// The six paint colors. Each set uses 4, each with one object of that color.
export const COLORS = {
  red: { paint: '#FF4D4D', edge: '#D93636', thing: 'apple' },
  yellow: { paint: '#FFD43B', edge: '#E7B500', thing: 'lemon' },
  blue: { paint: '#4D96FF', edge: '#2F74D9', thing: 'cup' },
  green: { paint: '#35C46A', edge: '#23994F', thing: 'leaf' },
  orange: { paint: '#FF9A1F', edge: '#E07B00', thing: 'orange' },
  purple: { paint: '#9B5DE5', edge: '#7B3FC4', thing: 'grapes' },
};

// A paint blob (60 x 60), with two little drops and a shine.
export const blob = (color) => {
  const { paint, edge } = COLORS[color];
  return svg('0 0 60 60',
    `<path d="M30 7 C41 5 47 13 51 19 C57 26 55 37 51 43 C46 51 36 55 28 53 C18 53 9 47 7 36 C5 26 11 17 18 12 C22 9 26 7 30 7 Z" fill="${paint}" stroke="${edge}" stroke-width="2.5"/>`
    + `<circle cx="53" cy="10" r="4.5" fill="${paint}"/><circle cx="9" cy="53" r="3.5" fill="${paint}"/>`
    + '<ellipse cx="21" cy="21" rx="7" ry="4.5" fill="#fff" opacity=".4" transform="rotate(-30 21 21)"/>');
};

// The objects drawn for this slice (60 x 60, like the countable things).
const NEW_THINGS = {
  leaf: '<path d="M30 5 C51 12 55 37 30 55 C5 37 9 12 30 5 Z" fill="#35C46A" stroke="#23994F" stroke-width="3"/>'
    + '<path d="M30 12 V52" stroke="#23994F" stroke-width="3" stroke-linecap="round"/>'
    + '<path d="M30 25 L40 18 M30 35 L20 28 M30 43 L39 37" stroke="#23994F" stroke-width="2.5" stroke-linecap="round"/>'
    + '<ellipse cx="22" cy="22" rx="4" ry="7" fill="#fff" opacity=".3" transform="rotate(25 22 22)"/>',
  orange: '<circle cx="30" cy="34" r="21" fill="#FF9A1F" stroke="#E07B00" stroke-width="3"/>'
    + '<g fill="#E07B00" opacity=".5"><circle cx="38" cy="38" r="1.6"/><circle cx="30" cy="44" r="1.6"/><circle cx="40" cy="28" r="1.6"/></g>'
    + '<ellipse cx="23" cy="27" rx="5" ry="3.5" fill="#fff" opacity=".45" transform="rotate(-30 23 27)"/>'
    + '<path d="M30 14 q1 -6 5 -8" stroke="#5B3A12" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<ellipse cx="40" cy="10" rx="7" ry="3.5" fill="#35D07F"/>',
  grapes: '<path d="M30 11 q2 -6 6 -8" stroke="#5B3A12" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<ellipse cx="41" cy="8" rx="7" ry="3.5" fill="#35D07F"/>'
    + '<g fill="#9B5DE5" stroke="#7B3FC4" stroke-width="2"><circle cx="20" cy="21" r="8"/><circle cx="30" cy="19" r="8"/><circle cx="40" cy="21" r="8"/>'
    + '<circle cx="25" cy="32" r="8"/><circle cx="35" cy="32" r="8"/><circle cx="30" cy="44" r="8"/></g>'
    + '<g fill="#fff" opacity=".45"><circle cx="17" cy="18" r="2.2"/><circle cx="27" cy="16" r="2.2"/><circle cx="22" cy="29" r="2.2"/><circle cx="27" cy="41" r="2.2"/></g>',
};

// One object of a color (60 x 60).
export const colorThing = (color) => {
  const k = COLORS[color].thing;
  return svg('0 0 60 60', NEW_THINGS[k] ?? THINGS[k].art);
};

// ---- follow the path ----

// The animals (120 x 120) and their homes (140 x 140).
export const ANIMALS = {
  bee: {
    home: 'hive',
    art: svg('0 0 120 120',
      '<ellipse cx="60" cy="108" rx="34" ry="6" fill="#000" opacity=".1"/>'
      + '<ellipse cx="44" cy="40" rx="20" ry="13" fill="#D7ECFF" opacity=".95" transform="rotate(-25 44 40)"/>'
      + '<ellipse cx="74" cy="38" rx="20" ry="13" fill="#D7ECFF" opacity=".95" transform="rotate(25 74 38)"/>'
      + '<ellipse cx="60" cy="70" rx="38" ry="28" fill="#FFD43B" stroke="#E7B500" stroke-width="3"/>'
      + '<path d="M44 45 Q40 70 44 96 M60 42 Q56 70 60 98 M76 45 Q72 70 76 96" stroke="#2A2370" stroke-width="9" fill="none" stroke-linecap="round"/>'
      + '<path d="M97 72 L110 76 L97 80 Z" fill="#2A2370"/>'
      + '<circle cx="28" cy="62" r="17" fill="#FFD43B" stroke="#E7B500" stroke-width="3"/>'
      + '<circle cx="23" cy="58" r="4" fill="#1E1E3F"/><circle cx="24" cy="57" r="1.4" fill="#fff"/>'
      + '<circle cx="18" cy="66" r="3.5" fill="#FF9EC4" opacity=".8"/>'
      + '<path d="M22 70 Q28 75 34 70" stroke="#1E1E3F" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      + '<path d="M26 46 Q22 34 14 32 M34 47 Q36 34 44 30" stroke="#2A2370" stroke-width="3" fill="none" stroke-linecap="round"/>'
      + '<circle cx="14" cy="32" r="3.5" fill="#2A2370"/><circle cx="44" cy="30" r="3.5" fill="#2A2370"/>'),
  },
  duck: {
    home: 'pond',
    art: svg('0 0 120 120',
      '<ellipse cx="62" cy="108" rx="40" ry="6" fill="#000" opacity=".1"/>'
      + '<path d="M22 72 Q20 104 60 104 Q104 104 104 74 Q96 82 84 80 Q80 56 58 58 Q40 60 36 74 Z" fill="#FFE14D" stroke="#E7B500" stroke-width="3"/>'
      + '<path d="M54 76 Q70 70 82 84 Q66 92 54 76 Z" fill="#FFD43B" stroke="#E7B500" stroke-width="2.5"/>'
      + '<circle cx="40" cy="44" r="22" fill="#FFE14D" stroke="#E7B500" stroke-width="3"/>'
      + '<path d="M18 46 Q4 48 6 54 Q12 60 24 54 Z" fill="#FF9A1F" stroke="#E07B00" stroke-width="2.5"/>'
      + '<circle cx="36" cy="38" r="4.5" fill="#1E1E3F"/><circle cx="37" cy="37" r="1.6" fill="#fff"/>'
      + '<circle cx="46" cy="50" r="4" fill="#FF9EC4" opacity=".8"/>'
      + '<path d="M40 22 q4 -8 10 -6" stroke="#E7B500" stroke-width="3" fill="none" stroke-linecap="round"/>'),
  },
  dog: {
    home: 'kennel',
    art: svg('0 0 120 120',
      '<ellipse cx="60" cy="110" rx="36" ry="6" fill="#000" opacity=".1"/>'
      + '<ellipse cx="60" cy="88" rx="30" ry="20" fill="#C98E55" stroke="#9B6B43" stroke-width="3"/>'
      + '<ellipse cx="30" cy="48" rx="13" ry="26" fill="#8A5A2E" transform="rotate(18 30 48)"/>'
      + '<ellipse cx="90" cy="48" rx="13" ry="26" fill="#8A5A2E" transform="rotate(-18 90 48)"/>'
      + '<circle cx="60" cy="50" r="30" fill="#D9A066" stroke="#9B6B43" stroke-width="3"/>'
      + '<ellipse cx="60" cy="64" rx="16" ry="12" fill="#F3D2A8"/>'
      + '<ellipse cx="60" cy="58" rx="7" ry="5" fill="#2A2370"/>'
      + '<path d="M60 63 V69 M60 69 Q54 74 50 70 M60 69 Q66 74 70 70" stroke="#2A2370" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      + '<path d="M56 74 Q60 84 64 74 Z" fill="#FF8FB8"/>'
      + '<circle cx="48" cy="44" r="4.5" fill="#1E1E3F"/><circle cx="72" cy="44" r="4.5" fill="#1E1E3F"/>'
      + '<circle cx="49" cy="43" r="1.6" fill="#fff"/><circle cx="73" cy="43" r="1.6" fill="#fff"/>'
      + '<circle cx="40" cy="56" r="4" fill="#FF9EC4" opacity=".7"/><circle cx="80" cy="56" r="4" fill="#FF9EC4" opacity=".7"/>'),
  },
};

export const HOMES = {
  hive: svg('0 0 140 140',
    '<path d="M70 4 V18" stroke="#9B6B43" stroke-width="6" stroke-linecap="round"/>'
    + '<path d="M20 10 H120" stroke="#9B6B43" stroke-width="8" stroke-linecap="round"/>'
    + '<ellipse cx="70" cy="134" rx="40" ry="5" fill="#000" opacity=".08"/>'
    + '<path d="M50 18 H90 Q104 30 104 42 Q118 56 116 72 Q126 90 116 106 Q110 124 70 126 Q30 124 24 106 Q14 90 24 72 Q22 56 36 42 Q36 30 50 18 Z" fill="#FFC84D" stroke="#D99400" stroke-width="3"/>'
    + '<path d="M38 42 H102 M26 72 H114 M24 104 H116" stroke="#E7A800" stroke-width="5" stroke-linecap="round"/>'
    + '<ellipse cx="70" cy="90" rx="13" ry="11" fill="#7A4A12"/>'
    + '<ellipse cx="50" cy="56" rx="8" ry="5" fill="#fff" opacity=".4"/>'),
  pond: svg('0 0 140 140',
    '<ellipse cx="70" cy="96" rx="64" ry="34" fill="#4D96FF" stroke="#2F74D9" stroke-width="3"/>'
    + '<ellipse cx="70" cy="94" rx="48" ry="22" fill="#7FB8FF"/>'
    + '<path d="M44 92 q8 -6 16 0 M78 102 q8 -6 16 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>'
    + '<path d="M104 92 a12 8 0 1 0 0.1 0 Z" fill="#35C46A"/><path d="M104 92 L116 88" stroke="#23994F" stroke-width="2"/>'
    + '<path d="M16 86 Q14 50 22 30 M24 88 Q26 56 34 40 M122 82 Q126 56 120 38" stroke="#35A853" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '<ellipse cx="22" cy="30" rx="4" ry="10" fill="#9B6B43"/><ellipse cx="34" cy="40" rx="4" ry="10" fill="#9B6B43"/><ellipse cx="120" cy="38" rx="4" ry="10" fill="#9B6B43"/>'),
  kennel: svg('0 0 140 140',
    '<ellipse cx="70" cy="132" rx="58" ry="6" fill="#000" opacity=".1"/>'
    + '<rect x="22" y="58" width="96" height="72" rx="6" fill="#E7A862" stroke="#B7814A" stroke-width="3"/>'
    + '<path d="M22 80 H118 M22 104 H118" stroke="#C98544" stroke-width="3" opacity=".6"/>'
    + '<path d="M10 64 L70 14 L130 64 Z" fill="#FF6B6B" stroke="#D94848" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M24 58 L70 22 L116 58" stroke="#FF9A9A" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>'
    + '<path d="M50 130 V100 A20 20 0 0 1 90 100 V130 Z" fill="#5B3A12"/>'
    + '<rect x="56" y="66" width="28" height="12" rx="6" fill="#fff"/><circle cx="56" cy="72" r="5" fill="#fff"/><circle cx="84" cy="72" r="5" fill="#fff"/>'),
};

// Three hand-designed road layouts. The board has five lanes, top to bottom;
// the animals and homes sit on lanes 0, 2 and 4. A road is a list of knots
// [t, lane]: t (0..1) of the way across it is on that lane, and it bends
// steeply from one lane to the next, so roads cross at wide angles and never
// share a lane. Each layout has a version for each order of the homes
// (src/games.js HOME_ORDERS: '120' puts the bee's home in the middle row, the
// duck's at the bottom, the dog's at the top; '201' the bottom, top and middle).
// Roads are listed bee, duck, dog.
export const LANES = [95, 207, 320, 433, 545];
export const ROAD_LAYOUTS = [
  { // the dog's road climbs straight over the others
    120: [
      [[0, 0], [0.2, 0], [0.3, 1], [0.75, 1], [0.85, 2], [1, 2]],
      [[0, 2], [0.3, 2], [0.4, 3], [0.6, 3], [0.7, 4], [1, 4]],
      [[0, 4], [0.45, 4], [0.58, 0], [1, 0]],
    ],
    201: [
      [[0, 0], [0.2, 0], [0.3, 1], [0.5, 1], [0.6, 3], [0.8, 3], [0.9, 4], [1, 4]],
      [[0, 2], [0.68, 2], [0.82, 0], [1, 0]],
      [[0, 4], [0.7, 4], [0.82, 2], [1, 2]],
    ],
  },
  { // long steps up and down
    120: [
      [[0, 0], [0.76, 0], [0.9, 2], [1, 2]],
      [[0, 2], [0.62, 2], [0.72, 3], [0.8, 3], [0.88, 4], [1, 4]],
      [[0, 4], [0.15, 4], [0.25, 3], [0.45, 3], [0.55, 1], [0.75, 1], [0.85, 0], [1, 0]],
    ],
    201: [
      [[0, 0], [0.05, 0], [0.15, 1], [0.5, 1], [0.6, 3], [0.75, 3], [0.85, 4], [1, 4]],
      [[0, 2], [0.25, 2], [0.38, 0], [1, 0]],
      [[0, 4], [0.18, 4], [0.28, 3], [0.4, 3], [0.48, 2], [1, 2]],
    ],
  },
  { // one big dive in the middle
    120: [
      [[0, 0], [0.45, 0], [0.55, 2], [1, 2]],
      [[0, 2], [0.25, 2], [0.35, 4], [1, 4]],
      [[0, 4], [0.08, 4], [0.18, 3], [0.55, 3], [0.65, 1], [0.82, 1], [0.9, 0], [1, 0]],
    ],
    201: [
      [[0, 0], [0.45, 0], [0.6, 4], [1, 4]],
      [[0, 2], [0.62, 2], [0.72, 1], [0.8, 1], [0.88, 0], [1, 0]],
      [[0, 4], [0.2, 4], [0.3, 3], [0.68, 3], [0.78, 2], [1, 2]],
    ],
  },
];

// ---- the menu: one picture per game (200 x 160) ----
export const MENU = {
  numbers: svg('0 0 200 160',
    '<text x="52" y="118" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" font-size="110" fill="#1565C0" stroke="#fff" stroke-width="6" paint-order="stroke">3</text>'
    + `<g transform="translate(104 34)"><g transform="translate(0 0)">${THINGS.cup.art}</g><g transform="translate(36 46)">${THINGS.cup.art}</g><g transform="translate(0 86) scale(1)">${THINGS.cup.art}</g></g>`),
  colors: svg('0 0 200 160',
    `<g transform="translate(6 30) scale(1.6)">${blob('red').replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`
    + `<g transform="translate(104 30) scale(1.6)">${THINGS.apple.art}</g>`),
  path: svg('0 0 200 160',
    '<path d="M20 120 C70 150 80 20 130 60 S170 110 186 40" stroke="#B7814A" stroke-width="30" fill="none" stroke-linecap="round"/>'
    + '<path d="M20 120 C70 150 80 20 130 60 S170 110 186 40" stroke="#F2D9A8" stroke-width="22" fill="none" stroke-linecap="round"/>'
    + '<path d="M20 120 C70 150 80 20 130 60 S170 110 186 40" stroke="#fff" stroke-width="3" stroke-dasharray="8 10" fill="none" stroke-linecap="round"/>'
    + `<g transform="translate(-6 74) scale(.6)">${ANIMALS.bee.art.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`
    + `<g transform="translate(140 -6) scale(.5)">${HOMES.hive.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`),
};

// ---------------------------------------------------------------------------
// Slice 5F: more match sets and the furniture path

const inner = (art) => art.replace(/^<svg[^>]*>|<\/svg>$/g, '');
const objectArt = (id) => OBJECTS.find((o) => o.id === id).art;

// ---- letter to picture: one object per recorded letter, its word unambiguous ----
export const LETTER_PICTURES = { E: 'egg', F: 'fork', H: 'hat', I: 'ice-cream', L: 'lemon', T: 'tiger' };
export const LETTER_INK = '#1D2B8F'; // the tracing ink (src/render.js INK.core)

// A recorded character (data/chars/<id>.json) drawn as one card: its strokes
// in the tracing ink, round ends, a little room round it. Line units, so the
// letter keeps the shape she traces.
export function letterArt(char, color = LETTER_INK) {
  const pad = 0.16;
  const w = char.width + 2 * pad;
  const lines = char.strokes.map((st) => (st.kind === 'dot' || st.points.length === 1
    ? `<circle cx="${st.points[0][0]}" cy="${st.points[0][1]}" r="0.08" fill="${color}"/>`
    : `<polyline points="${st.points.map((q) => q.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="0.15" stroke-linecap="round" stroke-linejoin="round"/>`)).join('');
  return svg(`${-pad} ${-pad} ${w.toFixed(3)} ${(1 + 2 * pad).toFixed(3)}`, lines);
}

// ---- thing to its shadow: the same art, filled dark grey ----
export const SHADOW_THINGS = ['elephant', 'fork', 'hat', 'lamp', 'flag', 'ice-cream', 'fan', 'honey'];
export const SHADOW_GREY = '#4A4F5C';
const SHADOW_FILTER = '<filter id="td-shadow" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" '
  + 'values="0 0 0 0 0.29  0 0 0 0 0.31  0 0 0 0 0.36  0 0 0 1 0"/></filter>';
export const objectPicture = (id) => objectArt(id);
// Every color becomes SHADOW_GREY; only the outline (the art's own alpha) is kept.
export const shadowArt = (id) => {
  const art = objectArt(id);
  const open = art.match(/^<svg[^>]*>/)[0];
  return `${open.replace('class="art"', 'class="art gm-shadow"')}<defs>${SHADOW_FILTER}</defs><g filter="url(#td-shadow)">${inner(art)}</g></svg>`;
};

// ---- shape to thing ----
// Every shape and thing is drawn in a 100 x 100 box with absolute coordinates
// only, from one outline: a circle, a square, a triangle or a tall rectangle.
// Everything else sits inside that outline, so its proportions are the
// shape's own (tests/games.test.js measures them).
export const SHAPES = {
  circle: { things: ['ball', 'clock'], paint: '#FF8FD6', edge: '#E066B3' },
  square: { things: ['block', 'window'], paint: '#4D96FF', edge: '#2F74D9' },
  triangle: { things: ['roof', 'slice'], paint: '#FFC21A', edge: '#E09A00' },
  rectangle: { things: ['door', 'book'], paint: '#35C46A', edge: '#23994F' },
};
const shine = (x, y, rx, ry, rot) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".4" transform="rotate(${rot} ${x} ${y})"/>`;
const SHAPE_BODY = {
  circle: (f, e) => `<circle class="outline" cx="50" cy="50" r="40" fill="${f}" stroke="${e}" stroke-width="4"/>${shine(36, 34, 9, 5, -35)}`,
  square: (f, e) => `<rect class="outline" x="12" y="12" width="76" height="76" rx="8" fill="${f}" stroke="${e}" stroke-width="4"/>${shine(30, 26, 9, 4, -20)}`,
  triangle: (f, e) => `<polygon class="outline" points="50,14 92,86 8,86" fill="${f}" stroke="${e}" stroke-width="4" stroke-linejoin="round"/>${shine(40, 46, 7, 4, -55)}`,
  rectangle: (f, e) => `<rect class="outline" x="26" y="8" width="48" height="84" rx="7" fill="${f}" stroke="${e}" stroke-width="4"/>${shine(38, 22, 4, 8, 0)}`,
};
export const shapeArt = (shape) => svg('0 0 100 100', SHAPE_BODY[shape](SHAPES[shape].paint, SHAPES[shape].edge));

export const SHAPE_THINGS = {
  ball: '<circle class="outline" cx="50" cy="50" r="40" fill="#FF6B6B" stroke="#E04848" stroke-width="3"/>'
    + '<path d="M13 42 Q50 58 87 42" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>'
    + '<path d="M14 62 Q50 78 86 62" stroke="#FFD43B" stroke-width="7" fill="none" stroke-linecap="round"/>'
    + shine(34, 28, 8, 5, -35),
  clock: '<circle class="outline" cx="50" cy="50" r="40" fill="#fff" stroke="#4D96FF" stroke-width="7"/>'
    + '<g fill="#2A2370"><rect x="48" y="16" width="4" height="9" rx="2"/><rect x="48" y="75" width="4" height="9" rx="2"/>'
    + '<rect x="16" y="48" width="9" height="4" rx="2"/><rect x="75" y="48" width="9" height="4" rx="2"/></g>'
    + '<line x1="50" y1="50" x2="50" y2="28" stroke="#2A2370" stroke-width="5" stroke-linecap="round"/>'
    + '<line x1="50" y1="50" x2="66" y2="58" stroke="#FF9A1F" stroke-width="5" stroke-linecap="round"/>'
    + '<circle cx="50" cy="50" r="5" fill="#2A2370"/>',
  block: '<rect class="outline" x="12" y="12" width="76" height="76" rx="8" fill="#FFD43B" stroke="#E7B500" stroke-width="3"/>'
    + '<rect x="24" y="24" width="52" height="52" rx="6" fill="none" stroke="#fff" stroke-width="4" opacity=".75"/>'
    + '<polygon points="50,34 55,45 67,46 58,54 61,66 50,59 39,66 42,54 33,46 45,45" fill="#FF8FD6"/>',
  window: '<rect class="outline" x="12" y="12" width="76" height="76" rx="5" fill="#fff" stroke="#B7814A" stroke-width="5"/>'
    + '<rect x="19" y="19" width="62" height="62" rx="2" fill="#BDE6FF"/>'
    + '<circle cx="66" cy="33" r="8" fill="#FFD43B"/>'
    + '<ellipse cx="34" cy="62" rx="12" ry="5" fill="#fff" opacity=".9"/>'
    + '<rect x="47" y="19" width="6" height="62" fill="#fff"/><rect x="19" y="47" width="62" height="6" fill="#fff"/>',
  roof: '<polygon class="outline" points="50,14 92,86 8,86" fill="#FF6B6B" stroke="#D94848" stroke-width="3" stroke-linejoin="round"/>'
    + '<line x1="34" y1="58" x2="66" y2="58" stroke="#D94848" stroke-width="3"/><line x1="24" y1="74" x2="76" y2="74" stroke="#D94848" stroke-width="3"/>'
    + '<line x1="42" y1="44" x2="58" y2="44" stroke="#D94848" stroke-width="3"/>'
    + '<circle cx="50" cy="64" r="6" fill="#BDE6FF" stroke="#fff" stroke-width="2"/>',
  slice: '<polygon class="outline" points="50,14 92,86 8,86" fill="#FFD27A" stroke="#E0A040" stroke-width="3" stroke-linejoin="round"/>'
    + '<polygon points="8,86 92,86 88,79 12,79" fill="#D98C3A"/>'
    + '<polygon points="50,24 82,77 18,77" fill="#FF7A45" opacity=".85"/>'
    + '<g fill="#C0392B"><circle cx="50" cy="48" r="6"/><circle cx="38" cy="66" r="6"/><circle cx="62" cy="66" r="6"/></g>'
    + '<g fill="#35C46A"><circle cx="50" cy="62" r="2.5"/><circle cx="42" cy="54" r="2"/></g>',
  door: '<rect class="outline" x="26" y="8" width="48" height="84" rx="6" fill="#B07A45" stroke="#7A5232" stroke-width="3"/>'
    + '<rect x="33" y="16" width="34" height="28" rx="3" fill="#C98E55"/><rect x="33" y="52" width="34" height="32" rx="3" fill="#C98E55"/>'
    + '<circle cx="64" cy="50" r="4" fill="#FFD43B"/>',
  book: '<rect class="outline" x="26" y="8" width="48" height="84" rx="5" fill="#4D96FF" stroke="#2F74D9" stroke-width="3"/>'
    + '<rect x="26" y="8" width="10" height="84" rx="3" fill="#2F74D9"/>'
    + '<rect x="70" y="12" width="4" height="76" fill="#fff" opacity=".8"/>'
    + '<polygon points="55,30 59,39 69,40 62,46 64,56 55,51 46,56 48,46 41,40 51,39" fill="#FFD43B"/>',
};
export const shapeThingArt = (thing) => svg('0 0 100 100', SHAPE_THINGS[thing]);

// ---- follow the path, set 2: furniture to rooms ----
// The furniture (120 x 120) and the rooms they go to. A room home is a framed
// picture of the room (ROOM_HOME is its size in units, wider than tall).
export const ROOM_HOME = { w: 220, h: 150 };
export const FURNITURE = {
  bed: {
    home: 'bedroom',
    art: svg('0 0 120 120',
      '<ellipse cx="60" cy="110" rx="52" ry="6" fill="#000" opacity=".1"/>'
      + '<rect x="8" y="30" width="14" height="76" rx="6" fill="#C2567F"/><rect x="98" y="58" width="14" height="48" rx="6" fill="#C2567F"/>'
      + '<rect x="14" y="66" width="92" height="22" rx="6" fill="#fff" stroke="#E3D3F5" stroke-width="2"/>'
      + '<rect x="22" y="50" width="28" height="18" rx="8" fill="#fff" stroke="#E3D3F5" stroke-width="2"/>'
      + '<path d="M44 56 H100 Q106 56 106 64 V84 H44 Z" fill="#FF8FC4"/>'
      + '<g fill="#fff" opacity=".8"><circle cx="58" cy="66" r="3"/><circle cx="76" cy="72" r="3"/><circle cx="92" cy="64" r="3"/><circle cx="66" cy="78" r="3"/></g>'),
  },
  stove: {
    home: 'kitchen',
    art: svg('0 0 120 120',
      '<ellipse cx="60" cy="112" rx="44" ry="6" fill="#000" opacity=".1"/>'
      + '<rect x="18" y="20" width="84" height="88" rx="8" fill="#E6ECF2" stroke="#9AA6B5" stroke-width="3"/>'
      + '<rect x="18" y="20" width="84" height="18" rx="6" fill="#B8C2CF"/>'
      + '<g fill="#2A2370"><circle cx="32" cy="29" r="4"/><circle cx="46" cy="29" r="4"/><circle cx="74" cy="29" r="4"/><circle cx="88" cy="29" r="4"/></g>'
      + '<rect x="28" y="50" width="64" height="44" rx="6" fill="#3A3F55"/><rect x="34" y="56" width="52" height="14" rx="4" fill="#5A6280"/>'
      + '<rect x="40" y="44" width="40" height="5" rx="2.5" fill="#9AA6B5"/>'
      + '<g fill="none" stroke="#FF9A1F" stroke-width="3" stroke-linecap="round"><path d="M28 14 q4 -6 0 -10"/><path d="M60 14 q4 -6 0 -10"/><path d="M92 14 q4 -6 0 -10"/></g>'),
  },
  bathtub: {
    home: 'bathroom',
    art: svg('0 0 120 120',
      '<ellipse cx="60" cy="112" rx="50" ry="6" fill="#000" opacity=".1"/>'
      + '<path d="M18 30 V20 Q18 10 28 10 Q36 10 36 18" stroke="#9AA6B5" stroke-width="5" fill="none" stroke-linecap="round"/>'
      + '<g fill="#fff" stroke="#BDE6FF" stroke-width="2"><circle cx="38" cy="50" r="10"/><circle cx="56" cy="46" r="12"/><circle cx="76" cy="50" r="10"/><circle cx="92" cy="54" r="8"/></g>'
      + '<path d="M8 58 H112 V68 Q112 98 84 98 H36 Q8 98 8 68 Z" fill="#fff" stroke="#7FB8FF" stroke-width="3"/>'
      + '<rect x="6" y="54" width="108" height="10" rx="5" fill="#4D96FF"/>'
      + '<rect x="26" y="98" width="8" height="12" rx="3" fill="#9AA6B5"/><rect x="86" y="98" width="8" height="12" rx="3" fill="#9AA6B5"/>'
      + '<path d="M70 44 q4 -8 12 -6 q-2 6 -12 6 z" fill="#FFD43B"/>'),
  },
  sofa: {
    home: 'living',
    art: svg('0 0 120 120',
      '<ellipse cx="60" cy="108" rx="54" ry="6" fill="#000" opacity=".1"/>'
      + '<rect x="18" y="34" width="84" height="40" rx="12" fill="#35B5A8"/>'
      + '<rect x="6" y="54" width="22" height="44" rx="10" fill="#2A968B"/><rect x="92" y="54" width="22" height="44" rx="10" fill="#2A968B"/>'
      + '<rect x="24" y="66" width="72" height="28" rx="8" fill="#43C7B9"/>'
      + '<line x1="60" y1="68" x2="60" y2="92" stroke="#2A968B" stroke-width="3"/>'
      + '<rect x="30" y="42" width="22" height="20" rx="6" fill="#FFD43B" transform="rotate(-8 41 52)"/>'
      + '<rect x="14" y="96" width="8" height="10" rx="3" fill="#7A4E2D"/><rect x="98" y="96" width="8" height="10" rx="3" fill="#7A4E2D"/>'),
  },
};

// The bathroom, drawn for this set in the find rooms' style (1280 x 640, the
// picture shows its left 940): blue tiles, a bathtub with bubbles, a towel, a
// sink with a mirror and a duck.
const BATHROOM = '<rect width="1280" height="640" fill="#E3F6FA"/>'
  + '<g stroke="#C6E9F1" stroke-width="3">'
  + [...Array(12).keys()].map((i) => `<line x1="${i * 110 + 40}" y1="0" x2="${i * 110 + 40}" y2="470"/>`).join('')
  + [...Array(5).keys()].map((i) => `<line x1="0" y1="${i * 100 + 60}" x2="1280" y2="${i * 100 + 60}"/>`).join('')
  + '</g>'
  + '<rect x="0" y="470" width="1280" height="170" fill="#BFD8E8"/>'
  + '<g fill="#AFCADB">' + [...Array(7).keys()].map((i) => `<rect x="${i * 190 + (i % 2) * 40}" y="520" width="150" height="40" rx="6"/>`).join('') + '</g>'
  + '<rect x="700" y="80" width="200" height="150" rx="70" fill="#fff" stroke="#9AA6B5" stroke-width="10"/>'
  + '<ellipse cx="760" cy="130" rx="30" ry="14" fill="#BDE6FF" opacity=".9" transform="rotate(-25 760 130)"/>'
  + '<rect x="790" y="250" width="20" height="40" rx="6" fill="#9AA6B5"/>'
  + '<path d="M680 300 H920 Q910 380 800 380 Q690 380 680 300 Z" fill="#fff" stroke="#9AA6B5" stroke-width="6"/>'
  + '<rect x="785" y="380" width="30" height="90" fill="#fff" stroke="#9AA6B5" stroke-width="6"/>'
  + '<rect x="545" y="140" width="110" height="200" rx="16" fill="#FF8FC4"/><rect x="545" y="300" width="110" height="16" fill="#fff" opacity=".7"/>'
  + '<rect x="535" y="126" width="130" height="18" rx="9" fill="#9AA6B5"/>'
  + '<path d="M80 90 V60 Q80 30 120 30 Q160 30 160 70" stroke="#9AA6B5" stroke-width="14" fill="none" stroke-linecap="round"/>'
  + '<g fill="#fff" stroke="#BDE6FF" stroke-width="4"><circle cx="160" cy="300" r="44"/><circle cx="240" cy="280" r="54"/><circle cx="330" cy="296" r="46"/><circle cx="410" cy="312" r="36"/></g>'
  + '<path d="M40 320 H500 V350 Q500 470 380 470 H160 Q40 470 40 350 Z" fill="#fff" stroke="#7FB8FF" stroke-width="8"/>'
  + '<rect x="30" y="306" width="480" height="34" rx="17" fill="#4D96FF"/>'
  + '<rect x="110" y="470" width="30" height="50" rx="10" fill="#9AA6B5"/><rect x="400" y="470" width="30" height="50" rx="10" fill="#9AA6B5"/>'
  + '<ellipse cx="300" cy="262" rx="30" ry="22" fill="#FFD43B"/><circle cx="326" cy="236" r="18" fill="#FFD43B"/><path d="M340 236 l16 4 -16 6 z" fill="#FF9A1F"/><circle cx="330" cy="230" r="3.5" fill="#2A2370"/>';

// The living room's backdrop has an empty floor, so a sofa stands in it here;
// the bedroom already has its bed and the kitchen its stove.
const LIVING_SOFA = `<g transform="translate(560 160) scale(3.4)">${inner(FURNITURE.sofa.art)}</g>`;

// Each room's picture, cropped to the part that tells the room apart.
const ROOM_VIEWS = {
  bedroom: { art: () => inner(ROOMS.bedroom.backdrop), view: '0 190 800 545' },
  kitchen: { art: () => inner(ROOMS.kitchen.backdrop), view: '300 60 980 668' },
  living: { art: () => inner(ROOMS.living.backdrop) + LIVING_SOFA, view: '300 60 980 668' },
  bathroom: { art: () => BATHROOM, view: '0 0 940 640' },
};
export const ROOM_IDS = Object.keys(ROOM_VIEWS);
export const roomArt = (room) => `<svg ${NS} viewBox="${ROOM_VIEWS[room].view}" preserveAspectRatio="xMidYMid slice" class="art">${ROOM_VIEWS[room].art()}</svg>`;

// ---- the menu: the new tiles (200 x 160) ----
Object.assign(MENU, {
  letters: svg('0 0 200 160',
    '<text x="52" y="118" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" font-size="110" fill="#1D2B8F" stroke="#fff" stroke-width="6" paint-order="stroke">E</text>'
    + `<g transform="translate(100 18) scale(.5)">${inner(objectArt('egg'))}</g>`),
  shadows: svg('0 0 200 160',
    `<g transform="translate(-4 20) scale(.52)">${inner(objectArt('elephant'))}</g>`
    + `<g transform="translate(96 20) scale(.52)">${inner(shadowArt('elephant'))}</g>`),
  shapes: svg('0 0 200 160',
    `<g transform="translate(4 30) scale(.95)">${SHAPE_BODY.triangle(SHAPES.triangle.paint, SHAPES.triangle.edge)}</g>`
    + `<g transform="translate(104 30) scale(.95)">${SHAPE_THINGS.roof}</g>`),
  'path-rooms': svg('0 0 200 160',
    '<path d="M20 120 C70 150 80 20 130 60 S170 110 186 40" stroke="#B7814A" stroke-width="30" fill="none" stroke-linecap="round"/>'
    + '<path d="M20 120 C70 150 80 20 130 60 S170 110 186 40" stroke="#F2D9A8" stroke-width="22" fill="none" stroke-linecap="round"/>'
    + '<path d="M20 120 C70 150 80 20 130 60 S170 110 186 40" stroke="#fff" stroke-width="3" stroke-dasharray="8 10" fill="none" stroke-linecap="round"/>'
    + `<g transform="translate(-8 74) scale(.6)">${inner(FURNITURE.bed.art)}</g>`
    + `<g transform="translate(118 2)"><rect x="0" y="0" width="82" height="58" rx="8" fill="#fff" stroke="#D6E6F5" stroke-width="4"/>`
    + `<svg x="5" y="5" width="72" height="48" viewBox="${ROOM_VIEWS.bedroom.view}" preserveAspectRatio="xMidYMid slice">${inner(ROOMS.bedroom.backdrop)}</svg></g>`),
});
