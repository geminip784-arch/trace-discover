// data/games.js — what the games book shows (Slice 5D), in docs/mockups/mockup4.html's
// style: flat shapes, soft outlines, a white shine. Every picture is inline SVG,
// so the games work offline. The red apple, yellow lemon and blue cup come from
// data/finds.js (the countable things); the rest are drawn here.

import { THINGS } from './finds.js';

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
