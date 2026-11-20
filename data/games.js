// data/games.js — what the games book shows (Slices 5D and 5F, and Sort it), in docs/mockups/mockup4.html's
// style: flat shapes, soft outlines, a white shine. Every picture is inline SVG,
// so the games work offline. Slice 5M part 4: most game pictures are Twemoji
// (CC BY 4.0, data/twemoji.js; GAME_TWEMOJI below), each in its own colors,
// never recolored; the letter pictures and the shadows use the find library's
// objects (OBJECTS); the rest are drawn here.

import { THINGS, OBJECTS, ROOMS, BASKET, TOYBOX } from './finds.js';
import { PICTURES } from './drawings.js';
import { TWEMOJI } from './twemoji.js';

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const svg = (vb, body) => `<svg ${NS} viewBox="${vb}" class="art" style="overflow:visible">${body}</svg>`;
const objectArt = (id) => OBJECTS.find((o) => o.id === id).art; // a find-library picture (200 x 240)
// A countable thing's drawing (60 x 60 body), even when the count scenes show
// its Twemoji: Odd one out's color rows paint our cup, sock and crayon, and the
// colors game keeps our star (Twemoji's is golden orange).
const drawnThing = (id) => THINGS[id].drawn;

// Slice 5M part 4: the games' Twemoji pictures. A picture is Twemoji only when
// it is named with its word at a glance and (in the color games) is clearly its
// color; each keeps its own colors. One id is always the same picture, in every
// game. The pictures themselves are in data/twemoji.js (npm run twemoji).
export const GAME_TWEMOJI = {
  // fruit and food
  apple: { emoji: '1f34e' }, strawberry: { emoji: '1f353' }, lemon: { emoji: '1f34b' }, banana: { emoji: '1f34c' }, pear: { emoji: '1f350' },
  orange: { emoji: '1f34a' }, grapes: { emoji: '1f347' }, aubergine: { emoji: '1f346' }, carrot: { emoji: '1f955' },
  // things and toys
  crayon: { emoji: '1f58d' }, book: { emoji: '1f4d8' }, ball: { emoji: '26bd' }, car: { emoji: '1f697' }, 'car-blue': { emoji: '1f699' },
  balloon: { emoji: '1f388' }, kite: { emoji: '1fa81' }, yoyo: { emoji: '1fa80' }, teddy: { emoji: '1f9f8' },
  // clothes
  tshirt: { emoji: '1f455' }, cap: { emoji: '1f9e2' }, socks: { emoji: '1f9e6' }, hat: { emoji: '1f452' }, scarf: { emoji: '1f9e3' }, jeans: { emoji: '1f456' },
  // animals
  chick: { emoji: '1f425' }, whale: { emoji: '1f40b' }, frog: { emoji: '1f438' }, tiger: { emoji: '1f405' },
  pig: { emoji: '1f416' }, bee: { emoji: '1f41d' }, duck: { emoji: '1f986' }, dog: { emoji: '1f415' }, bird: { emoji: '1f426' },
  fish: { emoji: '1f41f' }, rabbit: { emoji: '1f407' }, cow: { emoji: '1f404' }, elephant: { emoji: '1f418' },
  // nature, homes and furniture
  tree: { emoji: '1f332' }, moon: { emoji: '1f319' }, 'pink-heart': { emoji: '1fa77' }, nest: { emoji: '1fab9' }, web: { emoji: '1f578' },
  bed: { emoji: '1f6cf' }, bathtub: { emoji: '1f6c1' }, sofa: { emoji: '1f6cb' },
};
// A game Twemoji in a box of the given size (default: the countable things'
// 60 x 60), with a little room round it; `shadow` adds a ground shadow (the
// path's travellers and homes). null when the id is not Twemoji.
export function gameEmoji(id, box = 60, { shadow = false } = {}) {
  const t = GAME_TWEMOJI[id];
  if (!t) return null;
  const pad = box * 0.06;
  const size = box - 2 * pad - (shadow ? box * 0.06 : 0);
  return svg(`0 0 ${box} ${box}`, (shadow ? `<ellipse cx="${box / 2}" cy="${box * 0.92}" rx="${box * 0.3}" ry="${box * 0.05}" fill="#000" opacity=".1"/>` : '')
    + `<svg x="${(box - size) / 2}" y="${pad}" width="${size}" height="${size}" viewBox="0 0 36 36">${TWEMOJI[t.emoji]}</svg>`);
}

// ---- colors to things ----

// The seven paint colors. Each set uses 4, each with one object of that color,
// picked from the color's pool (Slice 5H). Every object's main fill is its
// color (tests/games5h.test.js reads the art), so a many-colored picture never
// stands for one color.
export const COLORS = {
  red: { paint: '#FF4D4D', edge: '#D93636', things: ['apple', 'tomato', 'car', 'crayon'] },
  yellow: { paint: '#FFD43B', edge: '#E7B500', things: ['moon', 'banana', 'star', 'chick'] },
  blue: { paint: '#4D96FF', edge: '#2F74D9', things: ['tshirt', 'book', 'cap', 'whale'] },
  green: { paint: '#35C46A', edge: '#23994F', things: ['frog', 'alligator', 'pear', 'tree'] },
  orange: { paint: '#FF9A1F', edge: '#E07B00', things: ['orange', 'carrot', 'tiger'] },
  purple: { paint: '#9B5DE5', edge: '#7B3FC4', things: ['grapes', 'plum', 'aubergine'] },
  pink: { paint: '#FF8FD6', edge: '#E066B3', things: ['pink-heart', 'sock', 'pig'] },
};
// Slice 5M part 4: Twemoji for most (each clearly its color); our drawings for
// the tomato (too like Twemoji's apple), the star (Twemoji's is golden orange),
// the alligator (Twemoji's is said "crocodile"), the plum (no emoji) and the sock.
// The re-run color check (most of a picture's colored area must be its color)
// swapped in the moon for the lemon (big green leaves), the pear for the parrot
// (red and blue feathers), the red car for the strawberry (pale pink seeds) and
// a pink heart for the blossom (a deep pink middle), and chose the whole pig and
// the front-facing chick.

// A paint blob (60 x 60), with two little drops and a shine.
export const blob = (color) => {
  const { paint, edge } = COLORS[color];
  return svg('0 0 60 60',
    `<path d="M30 7 C41 5 47 13 51 19 C57 26 55 37 51 43 C46 51 36 55 28 53 C18 53 9 47 7 36 C5 26 11 17 18 12 C22 9 26 7 30 7 Z" fill="${paint}" stroke="${edge}" stroke-width="2.5"/>`
    + `<circle cx="53" cy="10" r="4.5" fill="${paint}"/><circle cx="9" cy="53" r="3.5" fill="${paint}"/>`
    + '<ellipse cx="21" cy="21" rx="7" ry="4.5" fill="#fff" opacity=".4" transform="rotate(-30 21 21)"/>');
};

// The objects drawn for the colors game (60 x 60, like the countable things).
// Slice 5H's plum (round, with a crease and a leaf): there is no plum emoji.
const NEW_THINGS = {
  plum: '<path d="M30 16 C46 14 54 26 52 38 C50 50 40 56 30 55 C18 55 8 47 8 35 C8 23 18 16 30 16 Z" fill="#8E44C9" stroke="#6C2CA3" stroke-width="3"/>'
    + '<path d="M30 18 C25 28 25 44 30 54" stroke="#6C2CA3" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>'
    + '<path d="M30 17 q1 -7 5 -10" stroke="#5B3A12" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<path d="M34 10 C40 2 50 4 52 8 C46 13 39 13 34 10 Z" fill="#35D07F" stroke="#23994F" stroke-width="1.5"/>'
    + '<ellipse cx="19" cy="30" rx="4" ry="7" fill="#fff" opacity=".4" transform="rotate(20 19 30)"/>',
};

// Every object of the colors game, as an SVG: its Twemoji, or our drawing.
export const colorThingArt = (id) => gameEmoji(id)
  ?? (id === 'alligator' ? objectArt('alligator') : svg('0 0 60 60', NEW_THINGS[id] ?? drawnThing(id)));

// The first object of a color.
export const colorThing = (color) => colorThingArt(COLORS[color].things[0]);

// ---- follow the path ----

// The animals (120 x 120) and their homes (140 x 140). Slice 5M part 4: the
// travellers are Twemoji, with a ground shadow, except our friendly purple
// spider (Twemoji's black spider could scare her).
const traveller = (id) => gameEmoji(id, 120, { shadow: true });
export const ANIMALS = {
  bee: { home: 'hive', art: traveller('bee') },
  duck: { home: 'pond', art: traveller('duck') },
  dog: { home: 'kennel', art: traveller('dog') },
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

// Slice 5H: five more animals and their homes, so each board picks 3 of 8.
Object.assign(ANIMALS, {
  bird: { home: 'nest', art: traveller('bird') },
  fish: { home: 'bowl', art: traveller('fish') },
  rabbit: { home: 'hutch', art: traveller('rabbit') },
  cow: { home: 'barn', art: traveller('cow') },
  spider: {
    home: 'web',
    art: svg('0 0 120 120',
      '<ellipse cx="60" cy="110" rx="40" ry="6" fill="#000" opacity=".1"/>'
      + '<g stroke="#2A2370" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M40 60 L18 44 L8 56 M38 68 L14 66 L6 80 M40 76 L20 88 L16 104 M46 82 L36 100 L38 112"/>'
      + '<path d="M80 60 L102 44 L112 56 M82 68 L106 66 L114 80 M80 76 L100 88 L104 104 M74 82 L84 100 L82 112"/></g>'
      + '<ellipse cx="60" cy="76" rx="24" ry="20" fill="#5B4BC4" stroke="#3E2F9E" stroke-width="3"/>'
      + '<circle cx="60" cy="50" r="22" fill="#6C5CE7" stroke="#3E2F9E" stroke-width="3"/>'
      + '<circle cx="51" cy="46" r="7" fill="#fff"/><circle cx="69" cy="46" r="7" fill="#fff"/>'
      + '<circle cx="52" cy="47" r="3.5" fill="#1E1E3F"/><circle cx="70" cy="47" r="3.5" fill="#1E1E3F"/>'
      + '<circle cx="44" cy="58" r="4" fill="#FF9EC4" opacity=".8"/><circle cx="76" cy="58" r="4" fill="#FF9EC4" opacity=".8"/>'
      + '<path d="M53 60 Q60 66 67 60" stroke="#1E1E3F" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      + '<ellipse cx="50" cy="38" rx="6" ry="3.5" fill="#fff" opacity=".35" transform="rotate(-30 50 38)"/>'),
  },
});

Object.assign(HOMES, {
  // Slice 5M part 4: the nest and the web are Twemoji; the other homes have no emoji.
  nest: gameEmoji('nest', 140, { shadow: true }),
  bowl: svg('0 0 140 140',
    '<ellipse cx="70" cy="132" rx="44" ry="6" fill="#000" opacity=".1"/>'
    + '<path d="M40 128 H100 L94 118 H46 Z" fill="#B7814A" stroke="#8A5A2E" stroke-width="3" stroke-linejoin="round"/>'
    + '<circle cx="70" cy="74" r="52" fill="#E3F6FF" stroke="#7FB8FF" stroke-width="4"/>'
    + '<path d="M22 84 Q70 70 118 84 Q114 116 70 124 Q26 116 22 84 Z" fill="#7FB8FF"/>'
    + '<path d="M38 116 q6 -6 12 0 M86 118 q6 -6 12 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>'
    + '<g fill="#FFD43B" stroke="#E7B500" stroke-width="2"><circle cx="54" cy="116" r="5"/><circle cx="66" cy="119" r="5"/><circle cx="80" cy="117" r="5"/></g>'
    + '<path d="M96 116 Q92 100 98 90 M102 116 Q106 104 100 94" stroke="#35C46A" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + '<rect x="34" y="18" width="72" height="12" rx="6" fill="#BDE6FF" stroke="#7FB8FF" stroke-width="3"/>'
    + '<ellipse cx="42" cy="56" rx="8" ry="14" fill="#fff" opacity=".6" transform="rotate(20 42 56)"/>'),
  hutch: svg('0 0 140 140',
    '<ellipse cx="70" cy="134" rx="58" ry="5" fill="#000" opacity=".1"/>'
    + '<path d="M28 108 V130 M112 108 V130" stroke="#8A5A2E" stroke-width="8" stroke-linecap="round"/>'
    + '<rect x="16" y="50" width="108" height="62" rx="6" fill="#E7A862" stroke="#B7814A" stroke-width="3"/>'
    + '<path d="M8 54 L24 26 H116 L132 54 Z" fill="#35A853" stroke="#23994F" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M26 32 H114" stroke="#7FD9A0" stroke-width="4" stroke-linecap="round" opacity=".7"/>'
    + '<rect x="26" y="60" width="54" height="42" rx="4" fill="#FFF6E5" stroke="#B7814A" stroke-width="3"/>'
    + '<path d="M36 60 V102 M46 60 V102 M56 60 V102 M66 60 V102 M26 74 H80 M26 88 H80" stroke="#9AA6B5" stroke-width="2"/>'
    + '<rect x="88" y="60" width="28" height="42" rx="4" fill="#C98544" stroke="#B7814A" stroke-width="3"/>'
    + '<circle cx="110" cy="82" r="3" fill="#5B3A12"/>'
    + '<ellipse cx="70" cy="118" rx="18" ry="5" fill="#FFD27A"/>'),
  barn: svg('0 0 140 140',
    '<ellipse cx="70" cy="134" rx="60" ry="5" fill="#000" opacity=".1"/>'
    + '<path d="M16 60 L70 20 L124 60 V130 H16 Z" fill="#E8594F" stroke="#B83E36" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M6 64 L70 14 L134 64" stroke="#FFFFFF" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M16 80 H124" stroke="#B83E36" stroke-width="2" opacity=".5"/>'
    + '<rect x="44" y="82" width="52" height="48" fill="#FFFFFF" stroke="#B83E36" stroke-width="3"/>'
    + '<path d="M44 82 L96 130 M96 82 L44 130 M70 82 V130" stroke="#E8594F" stroke-width="5"/>'
    + '<circle cx="70" cy="52" r="11" fill="#FFF6E5" stroke="#FFFFFF" stroke-width="4"/>'
    + '<path d="M70 44 V60 M62 52 H78" stroke="#B83E36" stroke-width="2.5"/>'),
  web: gameEmoji('web', 140, { shadow: true }),
});

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
    + `${gameEmoji('apple').replace('<svg ', '<svg x="104" y="30" width="96" height="96" ')}`),
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

// ---- letter to picture: each letter's sound-first find words (Slice 5H) ----
// Every letter with a find picture (all but X), and every one of its pictures
// that find scenes use: a set picks one of them at random. Pictures kept out of
// find scenes (finds: false: ice cream, eraser) are never used.
export const LETTER_WORDS = OBJECTS.filter((o) => o.finds !== false).reduce((acc, o) => {
  (acc[o.letter] ??= []).push(o.id);
  return acc;
}, {});
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

// ---- thing to its shadow ----
// Any find-library picture with an outline of its own (Slice 5H), ice cream and
// eraser included. Left out: plain round fruit and balls, and plain oblongs
// (a framed poster, a quilt, an envelope, a zip close-up), whose shadows are
// just a circle or a box. Slice 5M part 3: the teddy (once a heap of toys) has
// a clear outline of its own and joins in.
export const SHADOW_LEFT_OUT = ['tomato', 'orange', 'mango', 'nut', 'ball', 'tiger', 'quilt', 'envelope', 'zip'];
export const SHADOW_THINGS = OBJECTS.map((o) => o.id).filter((id) => !SHADOW_LEFT_OUT.includes(id));
// Shadows that look alike: a set never holds two of one group. Checked by eye on
// a sheet of every shadow side by side (horse and zebra share one outline);
// checked again on the Twemoji pictures in Slice 5M part 3 (docs/screenshots/slice-5m/).
export const SHADOW_LOOKALIKES = [
  ['horse', 'zebra', 'goat', 'yak'],     // four legs, a long head
  ['apple', 'lemon', 'yoyo'],            // round, with a bit on top
  ['hat', 'igloo', 'rainbow'],           // a dome
  ['bus', 'van'],                        // a box on wheels
  ['eraser', 'lunchbox', 'gift'],        // a box
  ['honey', 'ink', 'milk', 'juice'],     // a jar or a carton
  ['jellyfish', 'octopus'],              // a dome with legs
  ['fish', 'whale'],                     // a body and a tail
  ['frock', 'queen', 'umpire'],          // a long dress or coat (the queen and the umpire are dolls drawn alike)
  ['kettle', 'jug'],                     // a spout and a handle
  ['grapes', 'olive'],                   // a bunch of small rounds
  ['insect', 'ant'],                     // a bug with legs
  ['cake', 'cup', 'drum'],               // Slice 5M: a round heap (Twemoji)
  ['cat', 'dog'],                        // Slice 5M: four legs and a tail, side on (Twemoji)
];
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
  circle: { things: ['ball', 'clock', 'cookie', 'button'], paint: '#FF8FD6', edge: '#E066B3' },
  square: { things: ['block', 'window', 'gift', 'dice'], paint: '#4D96FF', edge: '#2F74D9' },
  triangle: { things: ['roof', 'slice', 'tent', 'party-hat'], paint: '#FFC21A', edge: '#E09A00' },
  rectangle: { things: ['door', 'book', 'phone', 'fridge'], paint: '#35C46A', edge: '#23994F' },
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
  // Slice 5H: two more things for each shape, each drawn inside its outline.
  cookie: '<circle class="outline" cx="50" cy="50" r="40" fill="#D9A066" stroke="#B7814A" stroke-width="4"/>'
    + '<circle cx="50" cy="50" r="33" fill="none" stroke="#C0853F" stroke-width="2" opacity=".5"/>'
    + '<g fill="#5B3A12"><circle cx="36" cy="38" r="5"/><circle cx="62" cy="34" r="4.5"/><circle cx="66" cy="60" r="5"/>'
    + '<circle cx="42" cy="64" r="4.5"/><circle cx="52" cy="48" r="3.5"/><circle cx="28" cy="54" r="3"/></g>'
    + shine(36, 28, 8, 4, -35),
  button: '<circle class="outline" cx="50" cy="50" r="40" fill="#9B5DE5" stroke="#7B3FC4" stroke-width="4"/>'
    + '<circle cx="50" cy="50" r="28" fill="none" stroke="#C9A6F2" stroke-width="4"/>'
    + '<g fill="#5A2A99"><circle cx="41" cy="41" r="6"/><circle cx="59" cy="41" r="6"/><circle cx="41" cy="59" r="6"/><circle cx="59" cy="59" r="6"/></g>'
    + shine(30, 26, 8, 4, -35),
  gift: '<rect class="outline" x="12" y="12" width="76" height="76" rx="6" fill="#9B5DE5" stroke="#7B3FC4" stroke-width="3"/>'
    + '<rect x="43" y="12" width="14" height="76" fill="#FFD43B"/><rect x="12" y="43" width="76" height="14" fill="#FFD43B"/>'
    + '<circle cx="40" cy="30" r="9" fill="none" stroke="#FFD43B" stroke-width="5"/><circle cx="60" cy="30" r="9" fill="none" stroke="#FFD43B" stroke-width="5"/>'
    + '<circle cx="50" cy="36" r="5" fill="#E7B500"/>'
    + shine(24, 22, 6, 3, -20),
  dice: '<rect class="outline" x="12" y="12" width="76" height="76" rx="12" fill="#FFFFFF" stroke="#4D6BFF" stroke-width="4"/>'
    + '<g fill="#2A2370"><circle cx="30" cy="30" r="7"/><circle cx="70" cy="30" r="7"/><circle cx="50" cy="50" r="7"/>'
    + '<circle cx="30" cy="70" r="7"/><circle cx="70" cy="70" r="7"/></g>',
  tent: '<polygon class="outline" points="50,14 92,86 8,86" fill="#35C46A" stroke="#23994F" stroke-width="3" stroke-linejoin="round"/>'
    + '<polygon points="50,38 66,86 34,86" fill="#1E6B3A"/>'
    + '<polygon points="50,38 66,86 58,86" fill="#7FD9A0"/>'
    + '<line x1="50" y1="16" x2="50" y2="38" stroke="#23994F" stroke-width="3"/>'
    + '<line x1="30" y1="56" x2="40" y2="40" stroke="#fff" stroke-width="3" opacity=".4" stroke-linecap="round"/>',
  'party-hat': '<polygon class="outline" points="50,14 92,86 8,86" fill="#4D96FF" stroke="#2F74D9" stroke-width="3" stroke-linejoin="round"/>'
    + '<g fill="#FFD43B"><circle cx="50" cy="44" r="5"/><circle cx="38" cy="66" r="5"/><circle cx="62" cy="66" r="5"/><circle cx="26" cy="80" r="4"/><circle cx="74" cy="80" r="4"/></g>'
    + '<polygon points="10,86 90,86 86,79 14,79" fill="#FF8FD6"/>'
    + '<circle cx="50" cy="20" r="6" fill="#FF8FD6"/>',
  phone: '<rect class="outline" x="26" y="8" width="48" height="84" rx="8" fill="#3B3B4F" stroke="#2A2370" stroke-width="3"/>'
    + '<rect x="31" y="18" width="38" height="58" rx="3" fill="#BDE6FF"/>'
    + '<rect x="35" y="24" width="12" height="12" rx="3" fill="#FFD43B"/><rect x="53" y="24" width="12" height="12" rx="3" fill="#35C46A"/>'
    + '<rect x="35" y="42" width="12" height="12" rx="3" fill="#FF8FD6"/><rect x="53" y="42" width="12" height="12" rx="3" fill="#4D96FF"/>'
    + '<rect x="44" y="11" width="12" height="3" rx="1.5" fill="#9AA6B5"/>'
    + '<circle cx="50" cy="84" r="4" fill="#9AA6B5"/>',
  fridge: '<rect class="outline" x="26" y="8" width="48" height="84" rx="6" fill="#E3F2FF" stroke="#7C88A6" stroke-width="3"/>'
    + '<line x1="26" y1="38" x2="74" y2="38" stroke="#7C88A6" stroke-width="3"/>'
    + '<rect x="32" y="16" width="5" height="16" rx="2.5" fill="#7C88A6"/><rect x="32" y="46" width="5" height="22" rx="2.5" fill="#7C88A6"/>'
    + '<circle cx="58" cy="58" r="5" fill="#FF8FD6"/><circle cx="62" cy="72" r="4" fill="#FFD43B"/>'
    + '<rect x="62" y="12" width="6" height="76" fill="#fff" opacity=".7"/>',
};
export const shapeThingArt = (thing) => svg('0 0 100 100', SHAPE_THINGS[thing]);

// ---- follow the path, set 2: furniture to rooms ----
// The furniture (120 x 120) and the rooms they go to. Slice 5M part 4: the bed,
// bathtub and sofa are Twemoji; the stove stays ours (no stove emoji). A room home is a framed
// picture of the room (ROOM_HOME is its size in units, wider than tall).
export const ROOM_HOME = { w: 220, h: 150 };
export const FURNITURE = {
  bed: { home: 'bedroom', art: gameEmoji('bed', 120, { shadow: true }) },

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
  bathtub: { home: 'bathroom', art: gameEmoji('bathtub', 120, { shadow: true }) },

  sofa: { home: 'living', art: gameEmoji('sofa', 120, { shadow: true }) },

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

// ---------------------------------------------------------------------------
// Sort it: two baskets, each marked with a sample thing on its front

// Our blue balloon (60 x 60): Odd one out's color rows paint it in four colors.
// Slice 5M part 4: Sort it's things are Twemoji now (GAME_TWEMOJI).
const SORT_NEW = {
  balloon: '<path d="M30 46 Q26 52 32 56 Q36 58 32 60" stroke="#9AA6B5" stroke-width="2" fill="none" stroke-linecap="round"/>'
    + '<ellipse cx="30" cy="24" rx="17" ry="21" fill="#4D96FF" stroke="#2F74D9" stroke-width="2.5"/>'
    + '<path d="M27 44 L33 44 L30 49 Z" fill="#2F74D9"/>'
    + '<ellipse cx="23" cy="15" rx="4" ry="7" fill="#fff" opacity=".45" transform="rotate(25 23 15)"/>',
};

// Every thing Sort it shows, as an SVG: its Twemoji, or our tomato.
export const sortThingArt = (id) => gameEmoji(id) ?? svg('0 0 60 60', drawnThing(id));

// The two sets. Each basket: its id (for the log), the sample on its front
// (never on the board), and the things it takes; a board shows 3 of each.
export const SORT_SETS = {
  'sort-colors': [
    { id: 'red', sample: 'apple', things: ['tomato', 'balloon', 'crayon', 'strawberry'] },
    { id: 'blue', sample: 'tshirt', things: ['book', 'car-blue', 'cap', 'whale'] },
  ],
  'sort-kinds': [
    { id: 'fruit', sample: 'apple', things: ['lemon', 'orange', 'grapes', 'banana', 'strawberry'] },
    { id: 'toys', sample: 'teddy', things: ['ball', 'kite', 'car', 'yoyo'] },
  ],
};

// A basket (150 x 150, from the find scenes) with a white badge on its front
// showing the sample.
const sampleIn = (id, x, y, size) => sortThingArt(id).replace('<svg ', `<svg x="${x}" y="${y}" width="${size}" height="${size}" `);
export const basketArt = (sample) => svg('0 0 150 150',
  `${inner(BASKET)}<circle cx="75" cy="106" r="31" fill="#fff" stroke="#B7814A" stroke-width="4"/>${sampleIn(sample, 51, 82, 48)}`);

// A basket on a menu tile: cropped to the basket itself (no sky above its handle).
const tileBasket = (sample, x) => basketArt(sample).replace(/^<svg [^>]*>/, `<svg ${NS} x="${x}" y="20" width="104" height="124" viewBox="0 22 150 130">`);

Object.assign(MENU, {
  'sort-colors': svg('0 0 200 160',
    `${tileBasket('apple', -4)}`
    + `${tileBasket('tshirt', 100)}`),
  'sort-kinds': svg('0 0 200 160',
    `${tileBasket('apple', -4)}`
    + `${tileBasket('teddy', 100)}`),
});

// ---------------------------------------------------------------------------
// Odd one out: a row of four, three alike and one different

// Slice 5M part 4: kind rows show Twemoji, each in its own colors; color rows
// show our drawings (option B): the same object painted in four colors, so only
// color tells the odd one apart. A row never mixes the two.

// The colors a thing can be painted in (color rows), and the recolorable things.
export const PAINTS = {
  red: { paint: '#FF4D4D', edge: '#D93636', light: '#FF9A9A' },
  blue: { paint: '#4D96FF', edge: '#2F74D9', light: '#BDE6FF' },
  yellow: { paint: '#FFD43B', edge: '#E7B500', light: '#FFF0A0' },
  green: { paint: '#35C46A', edge: '#23994F', light: '#A8E6BF' },
};
const recolor = (art, map) => Object.entries(map).reduce((a, [from, to]) => a.replaceAll(from, to), art);
const PAINTED = {
  ball: (p) => svg('0 0 60 60', `<circle cx="30" cy="30" r="21" fill="${p.paint}" stroke="${p.edge}" stroke-width="2"/>`
    + '<path d="M11 24 C20 32 40 32 49 24" stroke="#fff" stroke-width="5" fill="none"/>'
    + `<path d="M11 38 C20 46 40 46 49 38" stroke="${p.light}" stroke-width="5" fill="none"/>`),
  car: (p) => svg('0 4 100 100', recolor(inner(PICTURES.car.art), { '#4D96FF': p.paint, '#2F74D9': p.edge, '#7FB8FF': p.light, '#FF8FB8': p.light })),
  balloon: (p) => svg('0 0 60 60', recolor(SORT_NEW.balloon, { '#4D96FF': p.paint, '#2F74D9': p.edge })),
  cup: (p) => svg('0 0 60 60', recolor(drawnThing('cup'), { '#4D96FF': p.paint })),
  sock: (p) => svg('0 0 60 60', recolor(drawnThing('sock'), { '#FF8FD6': p.paint })),
  crayon: (p) => svg('0 0 60 60', recolor(drawnThing('crayon'), { '#FF6B6B': p.paint })),
  tshirt: (p) => svg('0 0 60 60', `<path d="M20 8 L8 16 L4 28 L14 31 L16 24 L16 54 L44 54 L44 24 L46 31 L56 28 L52 16 L40 8 Q30 16 20 8 Z" fill="${p.paint}" stroke="${p.edge}" stroke-width="2.5" stroke-linejoin="round"/>`
    + '<path d="M22 9 Q30 15 38 9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>'
    + `<rect x="16" y="38" width="28" height="5" fill="${p.light}"/>`),
  cap: (p) => svg('0 0 60 60', `<path d="M8 38 Q8 12 32 12 Q52 12 52 34 L52 38 Z" fill="${p.paint}" stroke="${p.edge}" stroke-width="2.5" stroke-linejoin="round"/>`
    + `<path d="M30 38 L58 38 Q58 46 46 46 L30 46 Z" fill="${p.edge}"/>`
    + `<circle cx="31" cy="12" r="4" fill="${p.light}"/>`
    + `<path d="M18 36 Q20 22 30 18" stroke="${p.light}" stroke-width="3" fill="none" stroke-linecap="round"/>`),
};

// Every thing Odd one out shows: its kind, its color and the rows it is for.
// Kind rows (rows: 'kind'): Twemoji (GAME_TWEMOJI), each said by its own color;
// every kind has things of several colors, so a fair row can always be made.
// Color rows (rows: 'color'): our painted things, id '<object>-<color>'
// (ball-red, cup-blue); the same object in two colors are twins. Slice 5M part
// 4 dropped the book (a plain colored box, hard to name at a glance).
const KIND_THINGS = {
  apple: ['fruit', 'red'], strawberry: ['fruit', 'red'], banana: ['fruit', 'yellow'], lemon: ['fruit', 'yellow'],
  grapes: ['fruit', 'purple'], orange: ['fruit', 'orange'],
  teddy: ['toy', 'brown'], ball: ['toy', 'white'], car: ['toy', 'red'], balloon: ['toy', 'red'], yoyo: ['toy', 'red'], kite: ['toy', 'blue'],
  bee: ['animal', 'yellow'], duck: ['animal', 'brown'], dog: ['animal', 'brown'], elephant: ['animal', 'grey'],
  chick: ['animal', 'yellow'], frog: ['animal', 'green'],
  tshirt: ['clothes', 'blue'], cap: ['clothes', 'blue'], socks: ['clothes', 'blue'], hat: ['clothes', 'yellow'],
  scarf: ['clothes', 'red'], jeans: ['clothes', 'blue'],
};
const PAINTED_KIND = { ball: 'toy', car: 'toy', balloon: 'toy', sock: 'clothes', tshirt: 'clothes', cap: 'clothes', cup: 'kitchen', crayon: 'school' };

// id -> { id, object, kind, color, painted, rows }
export const ODD_THINGS = Object.fromEntries([
  ...Object.entries(KIND_THINGS).map(([id, [kind, color]]) => [id, { id, object: id, kind, color, painted: false, rows: 'kind' }]),
  ...Object.entries(PAINTED_KIND).flatMap(([object, kind]) => Object.keys(PAINTS).map((color) => {
    const id = `${object}-${color}`;
    return [id, { id, object, kind, color, painted: true, rows: 'color' }];
  })),
]);
export const oddThingArt = (id) => {
  const t = ODD_THINGS[id];
  return t.painted ? PAINTED[t.object](PAINTS[t.color]) : gameEmoji(id);
};

// Slice 5M: the picture of a row's rule, above the row (src/games.js oddRule).
// color: a paint drop in the three alike's color; fruit: a fruit bowl; toy: the
// toy box; animal: a paw print; clothes: a clothes hanger.
const RULE_ART = {
  color: (p) => svg('0 0 100 100', `<path d="M50 6 C50 6 16 46 16 66 A34 34 0 0 0 84 66 C84 46 50 6 50 6 Z" fill="${p.paint}" stroke="${p.edge}" stroke-width="4" stroke-linejoin="round"/>`
    + '<ellipse cx="36" cy="64" rx="7" ry="12" fill="#fff" opacity=".55" transform="rotate(20 36 64)"/>'),
  fruit: () => svg('0 0 100 100', '<path d="M64 30 Q74 10 92 22" stroke="#FFD43B" stroke-width="10" fill="none" stroke-linecap="round"/>'
    + '<circle cx="30" cy="42" r="15" fill="#FF4D4D"/><path d="M30 28 q3 -8 9 -9" stroke="#35C46A" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + '<circle cx="54" cy="38" r="15" fill="#FFA94D"/><circle cx="76" cy="44" r="13" fill="#35C46A"/>'
    + '<path d="M6 50 H94 Q92 90 50 92 Q8 90 6 50 Z" fill="#4DB6E8" stroke="#2F8FC4" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M18 62 Q50 72 82 62" stroke="#fff" stroke-width="4" fill="none" opacity=".6" stroke-linecap="round"/>'),
  toy: () => TOYBOX.replace('viewBox="0 0 150 150"', 'viewBox="0 20 150 130"'),
  animal: () => svg('0 0 100 100', '<g fill="#9B6B43"><ellipse cx="50" cy="68" rx="24" ry="20"/>'
    + '<ellipse cx="20" cy="42" rx="10" ry="12"/><ellipse cx="38" cy="22" rx="10" ry="12"/><ellipse cx="62" cy="22" rx="10" ry="12"/><ellipse cx="80" cy="42" rx="10" ry="12"/></g>'),
  clothes: () => svg('0 0 100 100', '<path d="M42 20 Q42 8 50 8 Q60 8 60 18 Q60 26 50 30 V40" stroke="#8A94A6" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '<path d="M50 40 L10 72 Q6 78 14 78 H86 Q94 78 90 72 Z" stroke="#9B6B43" stroke-width="7" fill="none" stroke-linejoin="round"/>'),
};
export const ODD_RULE_ART = RULE_ART;
// color: the three alike's color, for a color row's paint drop.
export const oddRuleArt = (rule, color = null) => (rule === 'color' ? RULE_ART.color(PAINTS[color] ?? PAINTS.red) : RULE_ART[rule]?.() ?? '');

const tileGrid = (ids) => svg('0 0 200 160', ids.map((id, i) => oddThingArt(id).replace('<svg ', `<svg x="${[22, 108][i % 2]}" y="${[6, 84][Math.floor(i / 2)]}" width="70" height="70" `)).join(''));
Object.assign(MENU, {
  'odd-kinds': tileGrid(['apple', 'banana', 'grapes', 'ball']),
  'odd-colors': tileGrid(['ball-red', 'car-red', 'cup-red', 'cup-blue']),
});

// ---------------------------------------------------------------------------
// Slice 5H: Missing piece. The shapes and their pieces are drawn from
// geometry in src/games.js; here are level 4's pictures and the menu tiles.

// Level 4: find-library pictures on a square card tinted with their color.
// Each has one main color (tests/missing.test.js reads the art), and a round
// never shows two of one color, so the picture tells its pieces apart.
// Slice 5M part 3: re-paired for the Twemoji pictures: the fish is blue, the
// star golden orange, the juice box yellow and the cup a brown cup of tea, so
// lemon, orange and tiger came in.
export const MISSING_PICTURES = {
  apple: 'red', heart: 'red',
  banana: 'yellow', lemon: 'yellow',
  whale: 'blue', fish: 'blue',
  pear: 'green', parrot: 'green',
  orange: 'orange', tiger: 'orange',
  grapes: 'purple', octopus: 'purple',
  sock: 'pink',
};
export const missingPictureArt = (id) => objectArt(id);

// The menu tiles (200 x 160): a broken shape and its piece, and the level's
// dots in the corner (like the Drawing book's levels).
const levelDots = (n) => [...Array(n).keys()].map((i) => `<circle cx="${14 + i * 18}" cy="14" r="7" fill="#2A2370"/>`).join('');
const GAP = 'fill="#FFF8E7" stroke="#B9A88F" stroke-width="3" stroke-dasharray="7 6"';
Object.assign(MENU, {
  'missing-1': svg('0 0 200 160', levelDots(1)
    + '<circle cx="80" cy="88" r="56" fill="#FF4D4D" stroke="#D93636" stroke-width="4"/>'
    + `<path d="M80 88 L136 88 A56 56 0 0 0 80 32 Z" ${GAP}/>`
    + '<path d="M150 70 L196 70 A46 46 0 0 0 150 24 Z" fill="#FF4D4D" stroke="#D93636" stroke-width="4" stroke-linejoin="round" transform="rotate(-8 170 50)"/>'),
  'missing-2': svg('0 0 200 160', levelDots(2)
    + '<rect x="26" y="36" width="104" height="104" rx="6" fill="#4D96FF" stroke="#2F74D9" stroke-width="4"/>'
    + `<path d="M130 92 L130 140 L82 140 Z" ${GAP}/>`
    + '<path d="M190 96 L190 144 L142 144 Z" fill="#4D96FF" stroke="#2F74D9" stroke-width="4" stroke-linejoin="round"/>'
    + '<rect x="148" y="30" width="40" height="40" rx="4" fill="#4D96FF" stroke="#2F74D9" stroke-width="4"/>'),
  'missing-3': svg('0 0 200 160', levelDots(3)
    + '<rect x="20" y="36" width="110" height="110" rx="6" fill="#FFD43B" stroke="#E7B500" stroke-width="4"/>'
    + `<rect x="75" y="36" width="55" height="55" ${GAP}/><rect x="20" y="91" width="55" height="55" ${GAP}/>`
    + '<rect x="146" y="28" width="46" height="46" rx="3" fill="#FFD43B" stroke="#E7B500" stroke-width="4"/>'
    + '<rect x="146" y="96" width="46" height="46" rx="3" fill="#FFD43B" stroke="#E7B500" stroke-width="4"/>'),
  'missing-4': svg('0 0 200 160', levelDots(4)
    + '<rect x="22" y="30" width="118" height="118" rx="10" fill="#FFE3E3" stroke="#FF9A9A" stroke-width="4"/>'
    + `<svg x="30" y="34" width="102" height="110" viewBox="0 0 200 240">${inner(objectArt('apple'))}</svg>`
    + `<path d="M140 92 L140 148 L84 148 Z" ${GAP}/>`
    + '<path d="M192 100 L192 152 L140 152 Z" fill="#FFE3E3" stroke="#FF9A9A" stroke-width="4" stroke-linejoin="round"/>'),
});

// ---------------------------------------------------------------------------
// Slice 5N: Memory. A card's back is the same for every card: deep blue with
// a firefly's warm light in the middle and a few tiny sparkles (no picture, so
// no card gives a clue). Its face is a find-library picture on white.

const backBody = (x, y, w) => {
  const k = w / 100;
  const at = (v) => (v * k).toFixed(2);
  return `<g transform="translate(${x} ${y})">`
    + `<rect x="${at(2)}" y="${at(2)}" width="${at(96)}" height="${at(96)}" rx="${at(16)}" fill="#3F51B5" stroke="#2C3A8C" stroke-width="${at(4)}"/>`
    + `<rect x="${at(10)}" y="${at(10)}" width="${at(80)}" height="${at(80)}" rx="${at(10)}" fill="none" stroke="#6F7FD6" stroke-width="${at(3)}" stroke-dasharray="${at(6)} ${at(5)}"/>`
    + `<circle cx="${at(50)}" cy="${at(50)}" r="${at(26)}" fill="#5D6AD3"/>`
    + `<circle cx="${at(50)}" cy="${at(50)}" r="${at(17)}" fill="#FFF3C4"/>`
    + `<circle cx="${at(50)}" cy="${at(50)}" r="${at(9)}" fill="#FFE58A"/>`
    + `<g fill="#FFE58A"><circle cx="${at(24)}" cy="${at(26)}" r="${at(2.5)}"/><circle cx="${at(76)}" cy="${at(24)}" r="${at(2)}"/>`
    + `<circle cx="${at(74)}" cy="${at(76)}" r="${at(2.5)}"/><circle cx="${at(26)}" cy="${at(74)}" r="${at(2)}"/></g></g>`;
};
export const MEMORY_BACK = svg('0 0 100 100', backBody(0, 0, 100));
// A card's face: the find picture (200 x 240), cropped a little so it fills the card.
export const memoryFaceArt = (id) => objectArt(id).replace('viewBox="0 0 200 240"', 'viewBox="10 30 180 200"');

// The menu tiles (200 x 160): the level's grid in small, two cards face up and
// matching, and the level's dots in the corner.
const memoryTile = (level, rows, cols, up) => {
  const area = { x0: 20, y0: 30, w: 172, h: 126 };
  const gap = 6;
  const c = Math.min((area.h - (rows - 1) * gap) / rows, (area.w - (cols - 1) * gap) / cols);
  const x0 = area.x0 + (area.w - (cols * c + (cols - 1) * gap)) / 2;
  const y0 = area.y0 + (area.h - (rows * c + (rows - 1) * gap)) / 2;
  let body = levelDots(level);
  for (let slot = 0; slot < rows * cols; slot++) {
    const x = x0 + (slot % cols) * (c + gap);
    const y = y0 + Math.floor(slot / cols) * (c + gap);
    if (up.includes(slot)) {
      body += `<rect x="${x}" y="${y}" width="${c}" height="${c}" rx="${c * 0.16}" fill="#fff" stroke="#FFC21A" stroke-width="3"/>`
        + `<svg x="${x + c * 0.1}" y="${y + c * 0.1}" width="${c * 0.8}" height="${c * 0.8}" viewBox="0 0 36 36">${TWEMOJI['1f34e']}</svg>`;
    } else body += backBody(x, y, c);
  }
  return svg('0 0 200 160', body);
};
Object.assign(MENU, {
  'memory-1': memoryTile(1, 2, 3, [0, 4]),
  'memory-2': memoryTile(2, 3, 4, [1, 10]),
  'memory-3': memoryTile(3, 4, 4, [5, 14]),
});

// ---------------------------------------------------------------------------
// The menu's first step: a tile per kind of game (200 x 160). Each is a small
// fan of cards with the kind's first set on the front, so it reads as "a pile
// of games inside".
const KIND_FRONT = { match: 'numbers', path: 'path', sort: 'sort-colors', odd: 'odd-kinds', missing: 'missing-1', memory: 'memory-1' };
const fanCard = (turn) => `<rect x="30" y="16" width="140" height="124" rx="16" fill="#fff" stroke="#E3D3BE" stroke-width="4" transform="rotate(${turn} 100 78)"/>`;
export const KIND_MENU = Object.fromEntries(Object.entries(KIND_FRONT).map(([kind, id]) => [kind, svg('0 0 200 160',
  fanCard(-11) + fanCard(8) + fanCard(0)
  + MENU[id].replace('<svg ', '<svg x="38" y="24" width="124" height="108" '))]));
