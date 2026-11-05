// data/drawings.js — the Drawing book's pictures (Slice 5E), in
// docs/mockups/mockup4.html's style: flat shapes, soft edges, a white shine.
// Every picture lives in a 100 x 100 box; its dots and its colored "finished"
// version use the same coordinates, so the colors fill exactly where she drew.
// dots[1]: level 1 (6 to 8 dots, shown with a faint dashed outline).
// dots[2]: level 2 (up to 10, dots only); level 3 uses the level 2 dots.
// All pictures are closed: the last dot joins back to dot 1.

const NS = 'xmlns="http://www.w3.org/2000/svg"';

export const PICTURES = {
  house: {
    // Level 1, as asked: bottom left, top of the left wall, left roof edge, roof
    // peak, right roof edge, top of the right wall, bottom right, back to 1.
    dots: {
      1: [[20, 90], [20, 52], [8, 52], [50, 14], [92, 52], [80, 52], [80, 90]],
      2: [[20, 90], [20, 52], [29, 40.6], [29, 12], [42, 12], [42, 24.1], [50, 14], [80, 52], [80, 90]],
    },
    art: '<rect x="29" y="12" width="13" height="32" fill="#B55239"/><rect x="27" y="9" width="17" height="5" rx="2" fill="#8A3A27"/>'
      + '<polygon points="8,52 50,14 92,52" fill="#FF6B6B" stroke="#D94848" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<path d="M18 48 L50 20 L82 48" stroke="#FF9A9A" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>'
      + '<rect x="20" y="52" width="60" height="38" fill="#FFE8C2"/><rect x="20" y="52" width="60" height="4" fill="#F2CF98"/>'
      + '<rect x="43" y="66" width="14" height="24" rx="2" fill="#8A5A2B"/><circle cx="54" cy="79" r="1.4" fill="#FFD43B"/>'
      + '<g fill="#BDE6FF" stroke="#fff" stroke-width="2"><rect x="25" y="60" width="13" height="12" rx="2"/><rect x="62" y="60" width="13" height="12" rx="2"/></g>'
      + '<path d="M31.5 60 V72 M25 66 H38 M68.5 60 V72 M62 66 H75" stroke="#fff" stroke-width="1.5"/>',
  },
  sun: {
    dots: {
      1: ring(8, 30),
      2: ring(10, 30),
    },
    art: `<g fill="#FFC21A">${[...Array(8).keys()].map((i) => `<polygon points="50,3 55,14 45,14" transform="rotate(${i * 45 + 22.5} 50 50)"/>`).join('')}</g>`
      + '<circle cx="50" cy="50" r="30" fill="#FFD43B" stroke="#E7B500" stroke-width="2.5"/>'
      + '<circle cx="50" cy="50" r="22" fill="#FFE066"/>'
      + '<ellipse cx="38" cy="36" rx="7" ry="4" fill="#fff" opacity=".45" transform="rotate(-30 38 36)"/>'
      + '<circle cx="41" cy="47" r="3" fill="#2A2370"/><circle cx="59" cy="47" r="3" fill="#2A2370"/>'
      + '<circle cx="35" cy="56" r="3.5" fill="#FF9EC4" opacity=".8"/><circle cx="65" cy="56" r="3.5" fill="#FF9EC4" opacity=".8"/>'
      + '<path d="M42 58 Q50 65 58 58" stroke="#2A2370" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
  },
  fish: {
    dots: {
      1: [[10, 50], [42, 28], [72, 46], [92, 28], [92, 72], [72, 54], [42, 72]],
      2: [[8, 50], [22, 34], [46, 27], [72, 46], [92, 26], [86, 50], [92, 74], [72, 54], [46, 73], [22, 66]],
    },
    art: '<polygon points="72,47 92,27 86,50 92,73 72,53" fill="#FF7A00" stroke="#E06A00" stroke-width="2" stroke-linejoin="round"/>'
      + '<path d="M9 50 C16 34 32 27 46 27 C60 27 68 38 74 50 C68 62 60 73 46 73 C32 73 16 66 9 50 Z" fill="#FF9A1F" stroke="#E07B00" stroke-width="2.5"/>'
      + '<path d="M44 30 Q40 50 44 70 M56 32 Q52 50 56 68" stroke="#FFC46B" stroke-width="4" fill="none" stroke-linecap="round"/>'
      + '<path d="M40 27 Q48 16 60 22 Q54 25 52 30 Z" fill="#FF7A00"/>'
      + '<circle cx="24" cy="46" r="5" fill="#fff"/><circle cx="23" cy="46" r="2.6" fill="#2A2370"/>'
      + '<path d="M12 54 Q16 57 20 55" stroke="#C25A00" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + '<ellipse cx="34" cy="36" rx="6" ry="3" fill="#fff" opacity=".4" transform="rotate(-20 34 36)"/>'
      + '<g fill="none" stroke="#7FB8FF" stroke-width="2"><circle cx="8" cy="28" r="3.5"/><circle cx="14" cy="18" r="2.5"/></g>',
  },
  car: {
    dots: {
      1: [[6, 74], [6, 54], [24, 52], [34, 32], [68, 32], [80, 52], [94, 56], [94, 74]],
      2: [[6, 74], [6, 56], [22, 52], [32, 32], [50, 30], [68, 32], [80, 50], [95, 55], [95, 74]],
    },
    art: '<path d="M6 74 V56 Q6 52 12 52 H23 L33 33 Q34 31 37 31 H66 Q69 31 70 34 L80 51 L90 53 Q95 54 95 60 V74 Z" fill="#4D96FF" stroke="#2F74D9" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<path d="M28 50 L36 36 H49 V50 Z M53 50 V36 H65 L73 50 Z" fill="#BDE6FF" stroke="#fff" stroke-width="1.5"/>'
      + '<rect x="88" y="58" width="6" height="5" rx="2" fill="#FFE066"/><rect x="6" y="59" width="4" height="5" rx="1.5" fill="#FF8FB8"/>'
      + '<path d="M14 56 H90" stroke="#7FB8FF" stroke-width="2" opacity=".7"/>'
      + '<g fill="#2A2370"><circle cx="26" cy="76" r="10"/><circle cx="74" cy="76" r="10"/></g>'
      + '<g fill="#B8C2CF"><circle cx="26" cy="76" r="4.5"/><circle cx="74" cy="76" r="4.5"/></g>',
  },
  cat: {
    dots: {
      1: [[22, 84], [12, 56], [20, 16], [38, 34], [62, 34], [80, 16], [88, 56], [78, 84]],
      2: [[50, 90], [24, 82], [12, 56], [20, 16], [38, 34], [62, 34], [80, 16], [88, 56], [76, 82]],
    },
    art: '<path d="M50 90 Q30 90 23 83 Q12 72 12 56 L20 16 L38 34 H62 L80 16 L88 56 Q88 72 77 83 Q70 90 50 90 Z" fill="#F4A259" stroke="#D9853B" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<path d="M22 24 L33 36 L24 40 Z M78 24 L67 36 L76 40 Z" fill="#FF9EC4"/>'
      + '<path d="M44 36 L46 46 M50 35 V46 M56 36 L54 46" stroke="#D9853B" stroke-width="2.5" stroke-linecap="round"/>'
      + '<ellipse cx="37" cy="56" rx="5" ry="6.5" fill="#2A2370"/><ellipse cx="63" cy="56" rx="5" ry="6.5" fill="#2A2370"/>'
      + '<circle cx="38.5" cy="54" r="1.8" fill="#fff"/><circle cx="64.5" cy="54" r="1.8" fill="#fff"/>'
      + '<path d="M46 66 H54 L50 70 Z" fill="#FF8FB8"/>'
      + '<path d="M50 70 Q46 76 42 73 M50 70 Q54 76 58 73" stroke="#2A2370" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + '<path d="M30 66 H14 M30 70 L16 75 M70 66 H86 M70 70 L84 75" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'
      + '<circle cx="30" cy="72" r="3.5" fill="#FF9EC4" opacity=".7"/><circle cx="70" cy="72" r="3.5" fill="#FF9EC4" opacity=".7"/>',
  },
  tree: {
    dots: {
      1: [[42, 92], [42, 70], [18, 56], [26, 22], [74, 22], [82, 56], [58, 70], [58, 92]],
      2: [[42, 92], [42, 72], [16, 60], [20, 28], [50, 10], [80, 28], [84, 60], [58, 72], [58, 92]],
    },
    art: '<path d="M42 92 V66 H58 V92 Z" fill="#9B6B43" stroke="#7A5232" stroke-width="2"/>'
      + '<path d="M47 76 Q50 70 53 76" stroke="#7A5232" stroke-width="2" fill="none"/>'
      + '<path d="M42 71 Q16 66 16 50 Q12 32 22 24 Q32 10 50 10 Q68 10 78 24 Q88 32 84 50 Q84 66 58 71 Z" fill="#35C46A" stroke="#23994F" stroke-width="2.5"/>'
      + '<g fill="#4CD37E"><circle cx="34" cy="34" r="9"/><circle cx="60" cy="28" r="8"/><circle cx="68" cy="50" r="9"/><circle cx="36" cy="56" r="7"/></g>'
      + '<g fill="#FF4D4D"><circle cx="30" cy="44" r="3.5"/><circle cx="56" cy="42" r="3.5"/><circle cx="72" cy="36" r="3.5"/><circle cx="48" cy="60" r="3.5"/></g>'
      + '<ellipse cx="36" cy="24" rx="7" ry="3.5" fill="#fff" opacity=".35" transform="rotate(-20 36 24)"/>',
  },
  // Level 3 only (car and building).
  building: {
    dots: {
      2: [[25, 94], [25, 24], [40, 24], [40, 10], [60, 10], [60, 24], [75, 24], [75, 94]],
    },
    art: '<rect x="40" y="10" width="20" height="16" fill="#A68BD9" stroke="#7B5FC4" stroke-width="2"/>'
      + '<rect x="25" y="24" width="50" height="70" fill="#B39DE6" stroke="#7B5FC4" stroke-width="2.5"/>'
      + '<g fill="#FFE9A0" stroke="#fff" stroke-width="1.5">'
      + [32, 46, 60].map((y) => [30, 45, 60].map((x) => `<rect x="${x}" y="${y}" width="10" height="9" rx="1.5"/>`).join('')).join('')
      + '<rect x="45" y="13" width="10" height="8" rx="1.5"/></g>'
      + '<rect x="43" y="76" width="14" height="18" rx="2" fill="#5B3A12"/>'
      + '<rect x="28" y="27" width="5" height="40" rx="2.5" fill="#fff" opacity=".25"/>',
  },
};

// n points round a circle (centre 50, 50), the first at the top, clockwise.
function ring(n, r) {
  return [...Array(n).keys()].map((i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return [Math.round((50 + r * Math.cos(a)) * 10) / 10, Math.round((50 + r * Math.sin(a)) * 10) / 10];
  });
}

// The menu's pictures in order, and level 3's pairs (first thing, second thing).
export const LEVEL_PICTURES = ['house', 'sun', 'fish', 'car', 'cat', 'tree'];
export const PAIRS = [['car', 'building'], ['house', 'tree'], ['fish', 'sun'], ['cat', 'house']];

// A finished picture's colors, as an SVG (viewBox 0 0 100 100).
export const pictureSVG = (id) => `<svg ${NS} viewBox="0 0 100 100" class="art" style="overflow:visible">${PICTURES[id].art}</svg>`;

// A picture still to draw, for the menu: its dots joined by a faint dashed line.
export function previewSVG(id, level) {
  const dots = PICTURES[id].dots[Math.min(level, 2)] ?? PICTURES[id].dots[2];
  const pts = dots.map(([x, y]) => `${x},${y}`).join(' ');
  return `<svg ${NS} viewBox="0 0 100 100" class="art" style="overflow:visible">`
    + `<polygon points="${pts}" fill="none" stroke="#9AA0B8" stroke-width="2.5" stroke-dasharray="5 5" stroke-linejoin="round"/>`
    + dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#2A2370"/>`).join('')
    + '</svg>';
}

// ---- crayons: seven colors and a rainbow ----
export const CRAYONS = [
  { id: 'red', color: '#FF4D4D' },
  { id: 'orange', color: '#FF9A1F' },
  { id: 'yellow', color: '#FFD43B' },
  { id: 'green', color: '#35C46A' },
  { id: 'blue', color: '#4D96FF' },
  { id: 'purple', color: '#9B5DE5' },
  { id: 'pink', color: '#FF8FD6' },
  { id: 'rainbow', color: null },
];

const RAINBOW_STRIPES = ['#FF4D4D', '#FF9A1F', '#FFD43B', '#35C46A', '#4D96FF', '#9B5DE5'];

// One crayon standing up (60 x 120): a wrapped body and a sharpened tip.
export function crayonSVG(c) {
  const body = c.color
    ? `<rect x="14" y="30" width="32" height="84" rx="6" fill="${c.color}"/>`
    : RAINBOW_STRIPES.map((col, i) => `<rect x="14" y="${30 + i * 14}" width="32" height="${i === 5 ? 14 : 15}" fill="${col}"/>`).join('');
  const tip = c.color ?? '#FF4D4D';
  return `<svg ${NS} viewBox="0 0 60 120" class="art" style="overflow:visible">`
    + `<ellipse cx="30" cy="116" rx="20" ry="4" fill="#000" opacity=".12"/>${body}`
    + '<rect x="14" y="44" width="32" height="10" fill="#fff" opacity=".55"/><rect x="14" y="94" width="32" height="6" fill="#fff" opacity=".4"/>'
    + `<polygon points="14,30 46,30 30,4" fill="#FFD9A8"/><polygon points="24,14 36,14 30,4" fill="${tip}"/>`
    + '<rect x="18" y="34" width="5" height="76" rx="2.5" fill="#fff" opacity=".3"/></svg>';
}

// The big tick that finishes a picture, and the button that clears the paper.
export const TICK = `<svg ${NS} viewBox="0 0 100 100" class="art"><circle cx="50" cy="50" r="46" fill="#35D07F" stroke="#23A862" stroke-width="4"/>`
  + '<path d="M28 52 L44 68 L74 34" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const CLEAR = `<svg ${NS} viewBox="0 0 100 100" class="art"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#D6E6F5" stroke-width="4"/>`
  + '<g transform="rotate(-30 50 50)"><rect x="24" y="36" width="52" height="28" rx="7" fill="#FF9EC4"/><rect x="24" y="36" width="20" height="28" rx="7" fill="#4D96FF"/><rect x="36" y="36" width="8" height="28" fill="#4D96FF"/></g>'
  + '<g fill="#B8C2CF"><circle cx="26" cy="76" r="3"/><circle cx="36" cy="82" r="2.2"/><circle cx="18" cy="66" r="2"/></g></svg>';

// The menu's mark for each level: one, two or three dots (no numbers, no text).
export const LEVEL_MARK = (level) => `<svg ${NS} viewBox="0 0 24 ${level * 22}" class="art">`
  + [...Array(level).keys()].map((i) => `<circle cx="12" cy="${11 + i * 22}" r="8" fill="#2A2370"/>`).join('') + '</svg>';

// The free-drawing tile: white paper and a crayon.
export const PAPER_TILE = `<svg ${NS} viewBox="0 0 100 100" class="art" style="overflow:visible">`
  + '<rect x="10" y="14" width="66" height="76" rx="6" fill="#fff" stroke="#D6E6F5" stroke-width="3" transform="rotate(-6 43 52)"/>'
  + '<path d="M22 64 C32 40 44 76 54 50 S64 40 68 58" stroke="#4D96FF" stroke-width="5" fill="none" stroke-linecap="round" transform="rotate(-6 43 52)"/>'
  + '<path d="M24 40 Q34 30 46 38" stroke="#FF4D4D" stroke-width="5" fill="none" stroke-linecap="round" transform="rotate(-6 43 52)"/>'
  + '<g transform="translate(62 18) rotate(35) scale(.42)"><rect x="14" y="30" width="32" height="84" rx="6" fill="#35C46A"/><polygon points="14,30 46,30 30,4" fill="#FFD9A8"/><polygon points="24,14 36,14 30,4" fill="#35C46A"/></g></svg>';
