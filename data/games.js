// data/games.js — what the games book shows (Slices 5D and 5F, and Sort it), in docs/mockups/mockup4.html's
// style: flat shapes, soft outlines, a white shine. Every picture is inline SVG,
// so the games work offline. The red apple, yellow lemon and blue cup come from
// data/finds.js (the countable things); the letter pictures and the shadows use
// the find library's objects (OBJECTS); the rest are drawn here.

import { THINGS, OBJECTS, ROOMS, BASKET } from './finds.js';
import { PICTURES } from './drawings.js';

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const svg = (vb, body) => `<svg ${NS} viewBox="${vb}" class="art" style="overflow:visible">${body}</svg>`;
const objectArt = (id) => OBJECTS.find((o) => o.id === id).art; // a find-library picture (200 x 240)

// ---- colors to things ----

// The seven paint colors. Each set uses 4, each with one object of that color,
// picked from the color's pool (Slice 5H). Every object's main fill is its
// color (tests/games5h.test.js reads the art), so a many-colored picture never
// stands for one color.
export const COLORS = {
  red: { paint: '#FF4D4D', edge: '#D93636', things: ['apple', 'tomato', 'strawberry', 'crayon'] },
  yellow: { paint: '#FFD43B', edge: '#E7B500', things: ['lemon', 'banana', 'star', 'duck'] },
  blue: { paint: '#4D96FF', edge: '#2F74D9', things: ['cup', 'book', 'blue-ball', 'whale'] },
  green: { paint: '#35C46A', edge: '#23994F', things: ['leaf', 'alligator', 'parrot', 'olive'] },
  orange: { paint: '#FF9A1F', edge: '#E07B00', things: ['orange', 'fish', 'juice'] },
  purple: { paint: '#9B5DE5', edge: '#7B3FC4', things: ['grapes', 'plum', 'aubergine'] },
  pink: { paint: '#FF8FD6', edge: '#E066B3', things: ['flower', 'sock', 'frock'] },
};

// A paint blob (60 x 60), with two little drops and a shine.
export const blob = (color) => {
  const { paint, edge } = COLORS[color];
  return svg('0 0 60 60',
    `<path d="M30 7 C41 5 47 13 51 19 C57 26 55 37 51 43 C46 51 36 55 28 53 C18 53 9 47 7 36 C5 26 11 17 18 12 C22 9 26 7 30 7 Z" fill="${paint}" stroke="${edge}" stroke-width="2.5"/>`
    + `<circle cx="53" cy="10" r="4.5" fill="${paint}"/><circle cx="9" cy="53" r="3.5" fill="${paint}"/>`
    + '<ellipse cx="21" cy="21" rx="7" ry="4.5" fill="#fff" opacity=".4" transform="rotate(-30 21 21)"/>');
};

// The objects drawn for the colors game (60 x 60, like the countable things).
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
  // Slice 5H: a plum (round, with a crease and a leaf) and an aubergine (long, with a green cap).
  plum: '<path d="M30 16 C46 14 54 26 52 38 C50 50 40 56 30 55 C18 55 8 47 8 35 C8 23 18 16 30 16 Z" fill="#8E44C9" stroke="#6C2CA3" stroke-width="3"/>'
    + '<path d="M30 18 C25 28 25 44 30 54" stroke="#6C2CA3" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>'
    + '<path d="M30 17 q1 -7 5 -10" stroke="#5B3A12" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<path d="M34 10 C40 2 50 4 52 8 C46 13 39 13 34 10 Z" fill="#35D07F" stroke="#23994F" stroke-width="1.5"/>'
    + '<ellipse cx="19" cy="30" rx="4" ry="7" fill="#fff" opacity=".4" transform="rotate(20 19 30)"/>',
  aubergine: '<path d="M38 14 C50 18 54 30 50 40 C46 52 32 58 20 54 C8 50 6 40 14 34 C22 28 24 18 38 14 Z" fill="#7B3FC4" stroke="#5A2A99" stroke-width="3"/>'
    + '<path d="M32 16 C34 8 44 6 50 12 C52 18 46 20 40 18 Z" fill="#35C46A" stroke="#23994F" stroke-width="2" stroke-linejoin="round"/>'
    + '<path d="M44 10 q4 -6 9 -6" stroke="#23994F" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
    + '<ellipse cx="20" cy="42" rx="4" ry="8" fill="#fff" opacity=".35" transform="rotate(55 20 42)"/>',
};

// Every object of the colors game, as an SVG. Most come from the countable
// things, Sort it and the find library; the pink frock is the library's frock
// painted pink (its own dress is cream with pink dots, so cream is its main fill).
const PINK_FROCK = () => objectArt('frock')
  .replace('fill="#FFF3E3" stroke="#F2D9A8"', 'fill="#FF8FD6" stroke="#E066B3"')
  .replace('fill="#F2D9A8"/>', 'fill="#E066B3"/>')
  .replace('<g fill="#FF8FB8">', '<g fill="#FFFFFF">')
  .replace('<g fill="#FFD43B">', '<g fill="#FFC2EA">');
const COLOR_ART = {
  strawberry: () => sortThingArt('strawberry'),
  banana: () => sortThingArt('banana'),
  'blue-ball': () => sortThingArt('blue-ball'),
  duck: () => ANIMALS.duck.art,
  whale: () => objectArt('whale'),
  alligator: () => objectArt('alligator'),
  parrot: () => objectArt('parrot'),
  olive: () => objectArt('olive'),
  fish: () => objectArt('fish'),
  juice: () => objectArt('juice'),
  frock: PINK_FROCK,
};
export const colorThingArt = (id) => (COLOR_ART[id] ? COLOR_ART[id]() : svg('0 0 60 60', NEW_THINGS[id] ?? THINGS[id].art));

// The first object of a color (the menu tile and Odd one out use these).
export const colorThing = (color) => colorThingArt(COLORS[color].things[0]);

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

// Slice 5H: five more animals and their homes, so each board picks 3 of 8.
// The fish, the rabbit and the nest are the find library's own pictures
// (200 x 240); the rest are drawn here in the same style.
Object.assign(ANIMALS, {
  bird: {
    home: 'nest',
    art: svg('0 0 120 120',
      '<ellipse cx="60" cy="110" rx="32" ry="6" fill="#000" opacity=".1"/>'
      + '<path d="M86 66 L112 52 L108 74 Z" fill="#2F74D9" stroke="#2F74D9" stroke-width="3" stroke-linejoin="round"/>'
      + '<path d="M50 100 V108 M66 100 V108" stroke="#FF9A1F" stroke-width="4" stroke-linecap="round"/>'
      + '<ellipse cx="60" cy="70" rx="34" ry="30" fill="#4D96FF" stroke="#2F74D9" stroke-width="3"/>'
      + '<ellipse cx="58" cy="80" rx="20" ry="16" fill="#BDE6FF"/>'
      + '<path d="M62 62 Q84 58 92 74 Q76 84 62 62 Z" fill="#2F74D9"/>'
      + '<circle cx="38" cy="46" r="22" fill="#4D96FF" stroke="#2F74D9" stroke-width="3"/>'
      + '<path d="M18 46 L4 52 L18 56 Z" fill="#FF9A1F" stroke="#E07B00" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<circle cx="32" cy="40" r="4.5" fill="#1E1E3F"/><circle cx="33" cy="39" r="1.6" fill="#fff"/>'
      + '<circle cx="42" cy="54" r="4" fill="#FF9EC4" opacity=".8"/>'
      + '<path d="M38 24 q2 -10 10 -10" stroke="#2F74D9" stroke-width="3" fill="none" stroke-linecap="round"/>'
      + '<ellipse cx="46" cy="64" rx="7" ry="4" fill="#fff" opacity=".35" transform="rotate(-30 46 64)"/>'),
  },
  fish: { home: 'bowl', art: objectArt('fish') },
  rabbit: { home: 'hutch', art: objectArt('rabbit') },
  cow: {
    home: 'barn',
    art: svg('0 0 120 120',
      '<ellipse cx="62" cy="112" rx="42" ry="6" fill="#000" opacity=".1"/>'
      + '<path d="M44 92 V110 M58 94 V110 M80 94 V110 M94 92 V110" stroke="#4A4F5C" stroke-width="8" stroke-linecap="round"/>'
      + '<path d="M104 62 Q116 70 110 86" stroke="#4A4F5C" stroke-width="3" fill="none" stroke-linecap="round"/>'
      + '<rect x="34" y="52" width="72" height="46" rx="22" fill="#FFFFFF" stroke="#9AA6B5" stroke-width="3"/>'
      + '<path d="M62 54 Q74 60 70 74 Q60 78 56 66 Q56 58 62 54 Z M88 72 Q100 72 100 84 Q92 92 84 84 Q82 76 88 72 Z" fill="#3B3B4F"/>'
      + '<path d="M14 26 Q8 18 12 12 M44 26 Q50 18 46 12" stroke="#E7C9A0" stroke-width="5" fill="none" stroke-linecap="round"/>'
      + '<ellipse cx="10" cy="36" rx="9" ry="5" fill="#3B3B4F" transform="rotate(-20 10 36)"/>'
      + '<ellipse cx="48" cy="36" rx="9" ry="5" fill="#3B3B4F" transform="rotate(20 48 36)"/>'
      + '<rect x="12" y="24" width="34" height="44" rx="16" fill="#FFFFFF" stroke="#9AA6B5" stroke-width="3"/>'
      + '<path d="M18 30 Q26 26 30 34 Q24 40 18 36 Z" fill="#3B3B4F"/>'
      + '<ellipse cx="29" cy="62" rx="17" ry="11" fill="#FFB3C7" stroke="#E68AA6" stroke-width="2.5"/>'
      + '<circle cx="23" cy="62" r="2.5" fill="#B5576F"/><circle cx="35" cy="62" r="2.5" fill="#B5576F"/>'
      + '<circle cx="22" cy="44" r="4" fill="#1E1E3F"/><circle cx="37" cy="44" r="4" fill="#1E1E3F"/>'
      + '<circle cx="23" cy="43" r="1.4" fill="#fff"/><circle cx="38" cy="43" r="1.4" fill="#fff"/>'),
  },
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
  nest: objectArt('nest'),
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
  web: svg('0 0 140 140',
    '<path d="M70 4 V18" stroke="#9AA6B5" stroke-width="2"/>'
    + '<circle cx="70" cy="74" r="60" fill="#F1F7FF" stroke="#D6E6F5" stroke-width="3"/>'
    + '<g stroke="#7C88A6" stroke-width="2.5" fill="none" stroke-linecap="round">'
    + '<path d="M70 14 V134 M10 74 H130 M28 32 L112 116 M112 32 L28 116"/>'
    + '<path d="M70 62 L78 66 L82 74 L78 82 L70 86 L62 82 L58 74 L62 66 Z"/>'
    + '<path d="M70 46 L90 54 L98 74 L90 94 L70 102 L50 94 L42 74 L50 54 Z"/>'
    + '<path d="M70 30 L101 43 L114 74 L101 105 L70 118 L39 105 L26 74 L39 43 Z"/></g>'
    + '<g fill="#BDE6FF"><circle cx="90" cy="54" r="3"/><circle cx="39" cy="105" r="3"/><circle cx="114" cy="74" r="2.5"/></g>'),
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
// just a circle or a box; and the toys, a heap rather than one thing.
export const SHADOW_LEFT_OUT = ['tomato', 'orange', 'mango', 'nut', 'ball', 'tiger', 'quilt', 'envelope', 'zip', 'toys'];
export const SHADOW_THINGS = OBJECTS.map((o) => o.id).filter((id) => !SHADOW_LEFT_OUT.includes(id));
// Shadows that look alike: a set never holds two of one group. Checked by eye on
// a sheet of every shadow side by side (horse and zebra share one outline).
export const SHADOW_LOOKALIKES = [
  ['horse', 'zebra', 'goat', 'yak'],     // four legs, a long head
  ['apple', 'lemon', 'yoyo'],            // round, with a bit on top
  ['hat', 'igloo', 'rainbow'],           // a dome
  ['bus', 'van'],                        // a box on wheels
  ['eraser', 'lunchbox', 'gift'],        // a box
  ['honey', 'ink', 'milk', 'juice'],     // a jar or a carton
  ['jellyfish', 'octopus'],              // a dome with legs
  ['fish', 'whale'],                     // a body and a tail
  ['frock', 'queen'],                    // a long dress
  ['kettle', 'jug'],                     // a spout and a handle
  ['grapes', 'olive'],                   // a bunch of small rounds
  ['insect', 'ant'],                     // a bug with legs
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

// ---------------------------------------------------------------------------
// Sort it: two baskets, each marked with a sample thing on its front

// The new things for Sort it (60 x 60, like the countable things).
const SORT_NEW = {
  strawberry: '<path d="M30 56 C14 46 8 33 12 23 C15 15 25 14 30 19 C35 14 45 15 48 23 C52 33 46 46 30 56 Z" fill="#FF4D4D" stroke="#D93636" stroke-width="2.5"/>'
    + '<g fill="#FFE066"><ellipse cx="22" cy="28" rx="1.6" ry="2.4"/><ellipse cx="38" cy="28" rx="1.6" ry="2.4"/><ellipse cx="30" cy="35" rx="1.6" ry="2.4"/>'
    + '<ellipse cx="22" cy="40" rx="1.6" ry="2.4"/><ellipse cx="38" cy="40" rx="1.6" ry="2.4"/><ellipse cx="30" cy="47" rx="1.6" ry="2.4"/></g>'
    + '<path d="M18 18 L26 16 L30 9 L34 16 L42 18 L35 22 L30 20 L25 22 Z" fill="#35C46A"/>',
  banana: '<path d="M10 14 Q12 44 40 50 Q52 52 55 45 Q50 47 42 44 Q22 38 18 12 Z" fill="#FFE14D" stroke="#E7B500" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<path d="M16 22 Q22 38 38 44" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>'
    + '<path d="M10 14 L14 8 L18 12" fill="#8A5A2B" stroke="#8A5A2B" stroke-width="2.5" stroke-linejoin="round"/>',
  teddy: '<circle cx="17" cy="13" r="7" fill="#B07A45"/><circle cx="43" cy="13" r="7" fill="#B07A45"/>'
    + '<circle cx="17" cy="13" r="3.5" fill="#E8B987"/><circle cx="43" cy="13" r="3.5" fill="#E8B987"/>'
    + '<ellipse cx="30" cy="45" rx="16" ry="13" fill="#B07A45"/><ellipse cx="30" cy="47" rx="8" ry="7" fill="#E8B987"/>'
    + '<circle cx="30" cy="24" r="15" fill="#C98E55"/><ellipse cx="30" cy="29" rx="7" ry="5" fill="#E8B987"/>'
    + '<circle cx="24" cy="21" r="2.2" fill="#2A2370"/><circle cx="36" cy="21" r="2.2" fill="#2A2370"/><ellipse cx="30" cy="27" rx="2.6" ry="2" fill="#2A2370"/>'
    + '<circle cx="15" cy="45" r="5" fill="#B07A45"/><circle cx="45" cy="45" r="5" fill="#B07A45"/>',
  top: '<rect x="27" y="4" width="6" height="12" rx="3" fill="#7A5232"/>'
    + '<path d="M8 26 Q30 8 52 26 L30 56 Z" fill="#9B5DE5" stroke="#7B3FC4" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<path d="M11 30 Q30 18 49 30 L45 36 Q30 26 15 36 Z" fill="#FFD43B"/>'
    + '<path d="M19 42 Q30 36 41 42 L37 47 Q30 44 23 47 Z" fill="#35C46A"/>'
    + '<ellipse cx="22" cy="22" rx="5" ry="2.5" fill="#fff" opacity=".45" transform="rotate(-20 22 22)"/>',
  'blue-ball': '<circle cx="30" cy="30" r="21" fill="#4D96FF"/><path d="M11 24 C20 32 40 32 49 24" stroke="#fff" stroke-width="5" fill="none"/>'
    + '<path d="M11 38 C20 46 40 46 49 38" stroke="#BDE6FF" stroke-width="5" fill="none"/>',
  balloon: '<path d="M30 46 Q26 52 32 56 Q36 58 32 60" stroke="#9AA6B5" stroke-width="2" fill="none" stroke-linecap="round"/>'
    + '<ellipse cx="30" cy="24" rx="17" ry="21" fill="#4D96FF" stroke="#2F74D9" stroke-width="2.5"/>'
    + '<path d="M27 44 L33 44 L30 49 Z" fill="#2F74D9"/>'
    + '<ellipse cx="23" cy="15" rx="4" ry="7" fill="#fff" opacity=".45" transform="rotate(25 23 15)"/>',
};

// The blue car: the Drawing book's car with its tail light made blue too, so
// nothing on it is red (tests/sort.test.js reads every color in the art).
const BLUE_CAR = inner(PICTURES.car.art).replace(/#FF8FB8/g, '#7FB8FF');

// Every thing Sort it shows, as an SVG.
export function sortThingArt(id) {
  if (id === 'car') return svg('0 4 100 100', BLUE_CAR);
  return svg('0 0 60 60', SORT_NEW[id] ?? NEW_THINGS[id] ?? THINGS[id].art);
}

// The two sets. Each basket: its id (for the log), the sample on its front
// (never on the board), and the things it takes; a board shows 3 of each.
export const SORT_SETS = {
  'sort-colors': [
    { id: 'red', sample: 'apple', things: ['tomato', 'ball', 'crayon', 'strawberry'] },
    { id: 'blue', sample: 'cup', things: ['book', 'car', 'blue-ball', 'balloon'] },
  ],
  'sort-kinds': [
    { id: 'fruit', sample: 'apple', things: ['lemon', 'orange', 'grapes', 'banana', 'strawberry'] },
    { id: 'toys', sample: 'teddy', things: ['ball', 'block', 'car', 'top'] },
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
    + `${tileBasket('cup', 100)}`),
  'sort-kinds': svg('0 0 200 160',
    `${tileBasket('apple', -4)}`
    + `${tileBasket('teddy', 100)}`),
});

// ---------------------------------------------------------------------------
// Odd one out: a row of four, three alike and one different

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
  cup: (p) => svg('0 0 60 60', recolor(THINGS.cup.art, { '#4D96FF': p.paint })),
  sock: (p) => svg('0 0 60 60', recolor(THINGS.sock.art, { '#FF8FD6': p.paint })),
  book: (p) => svg('0 0 60 60', recolor(THINGS.book.art, { '#4D96FF': p.paint })),
  crayon: (p) => svg('0 0 60 60', recolor(THINGS.crayon.art, { '#FF6B6B': p.paint })),
  tshirt: (p) => svg('0 0 60 60', `<path d="M20 8 L8 16 L4 28 L14 31 L16 24 L16 54 L44 54 L44 24 L46 31 L56 28 L52 16 L40 8 Q30 16 20 8 Z" fill="${p.paint}" stroke="${p.edge}" stroke-width="2.5" stroke-linejoin="round"/>`
    + '<path d="M22 9 Q30 15 38 9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>'
    + `<rect x="16" y="38" width="28" height="5" fill="${p.light}"/>`),
  cap: (p) => svg('0 0 60 60', `<path d="M8 38 Q8 12 32 12 Q52 12 52 34 L52 38 Z" fill="${p.paint}" stroke="${p.edge}" stroke-width="2.5" stroke-linejoin="round"/>`
    + `<path d="M30 38 L58 38 Q58 46 46 46 L30 46 Z" fill="${p.edge}"/>`
    + `<circle cx="31" cy="12" r="4" fill="${p.light}"/>`
    + `<path d="M18 36 Q20 22 30 18" stroke="${p.light}" stroke-width="3" fill="none" stroke-linecap="round"/>`),
};

// Every thing Odd one out shows: its kind and its color. A painted thing's id
// is '<object>-<color>' (ball-red, cup-blue); the same object in two colors are twins.
const FIXED = {
  apple: { kind: 'fruit', color: 'red', art: () => svg('0 0 60 60', THINGS.apple.art) },
  strawberry: { kind: 'fruit', color: 'red', art: () => sortThingArt('strawberry') },
  banana: { kind: 'fruit', color: 'yellow', art: () => sortThingArt('banana') },
  lemon: { kind: 'fruit', color: 'yellow', art: () => svg('0 0 60 60', THINGS.lemon.art) },
  grapes: { kind: 'fruit', color: 'purple', art: () => colorThing('purple') },
  orange: { kind: 'fruit', color: 'orange', art: () => colorThing('orange') },
  block: { kind: 'toy', color: 'yellow', art: () => svg('0 0 60 60', THINGS.block.art) },
  teddy: { kind: 'toy', color: 'brown', art: () => sortThingArt('teddy') },
  top: { kind: 'toy', color: 'purple', art: () => sortThingArt('top') },
  bee: { kind: 'animal', color: 'yellow', art: () => ANIMALS.bee.art },
  duck: { kind: 'animal', color: 'yellow', art: () => ANIMALS.duck.art },
  dog: { kind: 'animal', color: 'brown', art: () => ANIMALS.dog.art },
  elephant: { kind: 'animal', color: 'grey', art: () => objectArt('elephant') },
};
const PAINTED_KIND = { ball: 'toy', car: 'toy', balloon: 'toy', sock: 'clothes', tshirt: 'clothes', cap: 'clothes', cup: 'kitchen', book: 'school', crayon: 'school' };

// id -> { id, object, kind, color, painted }
export const ODD_THINGS = Object.fromEntries([
  ...Object.entries(FIXED).map(([id, t]) => [id, { id, object: id, kind: t.kind, color: t.color, painted: false }]),
  ...Object.entries(PAINTED_KIND).flatMap(([object, kind]) => Object.keys(PAINTS).map((color) => {
    const id = `${object}-${color}`;
    return [id, { id, object, kind, color, painted: true }];
  })),
]);
export const oddThingArt = (id) => {
  const t = ODD_THINGS[id];
  return t.painted ? PAINTED[t.object](PAINTS[t.color]) : FIXED[id].art();
};

const tileGrid = (ids) => svg('0 0 200 160', ids.map((id, i) => oddThingArt(id).replace('<svg ', `<svg x="${[22, 108][i % 2]}" y="${[6, 84][Math.floor(i / 2)]}" width="70" height="70" `)).join(''));
Object.assign(MENU, {
  'odd-kinds': tileGrid(['apple', 'banana', 'grapes', 'ball-blue']),
  'odd-colors': tileGrid(['apple', 'car-red', 'cup-red', 'cup-blue']),
});

// ---------------------------------------------------------------------------
// Slice 5H: Missing piece. The shapes and their pieces are drawn from
// geometry in src/games.js; here are level 4's pictures and the menu tiles.

// Level 4: find-library pictures on a square card tinted with their color.
// Each has one main color (tests/missing.test.js reads the art), and a round
// never shows two of one color, so the picture tells its pieces apart.
export const MISSING_PICTURES = {
  apple: 'red', heart: 'red',
  banana: 'yellow', star: 'yellow',
  whale: 'blue', cup: 'blue',
  pear: 'green', parrot: 'green',
  fish: 'orange', juice: 'orange',
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
// The menu's first step: a tile per kind of game (200 x 160). Each is a small
// fan of cards with the kind's first set on the front, so it reads as "a pile
// of games inside".
const KIND_FRONT = { match: 'numbers', path: 'path', sort: 'sort-colors', odd: 'odd-kinds', missing: 'missing-1' };
const fanCard = (turn) => `<rect x="30" y="16" width="140" height="124" rx="16" fill="#fff" stroke="#E3D3BE" stroke-width="4" transform="rotate(${turn} 100 78)"/>`;
export const KIND_MENU = Object.fromEntries(Object.entries(KIND_FRONT).map(([kind, id]) => [kind, svg('0 0 200 160',
  fanCard(-11) + fanCard(8) + fanCard(0)
  + MENU[id].replace('<svg ', '<svg x="38" y="24" width="124" height="108" '))]));
