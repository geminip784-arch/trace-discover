// finds.js — pure functions only. No DOM, no storage, no audio.
// The rules of the find and count scenes (Slices 5C and 5G): which place,
// which objects and where, the placemat groups, the counting order, the sizes on screen, the
// collection list and the attempt-log entry. scene.js draws and plays them.
// Every random choice takes `rand` (Math.random by default) so tests can repeat it.

import { OBJECTS, ROOMS, PLACES, THINGS } from '../data/finds.js';

export const FINDS = 3;          // right objects in a letter scene, when the letter has 3 or more
export const MIN_FINDS = 2;      // a letter with fewer find pictures than this has no scene
export const SPOTS = 7;          // objects in a letter scene: the right ones, then others up to 7
export const OTHERS = SPOTS - FINDS; // objects that do not start with her letter (5 when she finds 2)
export const HINT_MS = 10000;    // no find for this long: the objects left to find wiggle once
export const WORD_MS = 2000;     // a wrong tap shows that object's own word this long
export const GOLD_CHANCE = 0.25; // one golden item in the group she counts
export const MAX_FINDS = 500;    // the collection keeps this many, newest last
export const SHELF_SHOWS = 24;   // the shelf of finds shows up to the newest 24 (mockup4)

const pick = (list, rand) => list[Math.floor(rand() * list.length)];

// A shuffled copy (Fisher-Yates).
export function shuffle(list, rand = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Letters: find 3 (or 2)

// A picture that can stand in a find scene (finds: false pictures only show on her shelf).
export const inScenes = (o) => o.finds !== false;

// Slice 9A: a lowercase letter's scene is its capital's (the same pictures and places).
export const sceneLetter = (letter) => (/^[a-z]$/.test(letter) ? letter.toUpperCase() : letter);

// Her letter's find pictures.
export const objectsFor = (letter, objects = OBJECTS) => objects.filter((o) => o.letter === sceneLetter(letter) && inScenes(o));

// How many right objects her letter's scene has: 3, or 2 when only 2 exist.
export const targetsFor = (letter, objects = OBJECTS) => Math.min(FINDS, objectsFor(letter, objects).length);

// A letter has a scene when the library holds at least 2 of its pictures.
export const hasLetterScene = (letter, objects = OBJECTS) => objectsFor(letter, objects).length >= MIN_FINDS;

// How many of her letter's pictures each place holds.
export function roomCounts(letter, objects = OBJECTS) {
  const counts = Object.fromEntries(Object.keys(PLACES).map((r) => [r, 0]));
  for (const o of objectsFor(letter, objects)) for (const r of o.places) counts[r] += 1;
  return counts;
}

// The place that holds the most of her letter's pictures; a tie is broken at random.
export function roomFor(letter, rand = Math.random, objects = OBJECTS) {
  const counts = roomCounts(letter, objects);
  const most = Math.max(...Object.values(counts));
  return pick(Object.keys(counts).filter((r) => counts[r] === most), rand);
}

// `count` objects from `list`: the place's own first; then, borrowed from other
// places, portable things (food, toys, small objects) before animals, so a horse
// never turns up in the kitchen while a cup could have come instead.
export function preferPlace(list, place, count, rand = Math.random) {
  const own = shuffle(list.filter((o) => o.places.includes(place)), rand);
  const rest = list.filter((o) => !o.places.includes(place));
  const portable = shuffle(rest.filter((o) => !o.animal), rand);
  const animals = shuffle(rest.filter((o) => o.animal), rand);
  return [...own, ...portable, ...animals].slice(0, count);
}

// { room, targets, items }: `targets` (3, or 2) pictures that start with her
// letter and others up to 7 that do not, each on its own spot of the place, in
// random order. item: { ...object, right, spot }. null when the letter has no scene.
export function letterScene(letter, rand = Math.random, objects = OBJECTS) {
  if (!hasLetterScene(letter, objects)) return null;
  const room = roomFor(letter, rand, objects);
  const targets = targetsFor(letter, objects);
  const right = preferPlace(objectsFor(letter, objects), room, targets, rand);
  const others = preferPlace(objects.filter((o) => inScenes(o) && o.letter !== sceneLetter(letter)), room, SPOTS - targets, rand);
  const spots = shuffle(PLACES[room].spots, rand);
  const items = [...right.map((o) => ({ ...o, right: true })), ...others.map((o) => ({ ...o, right: false }))]
    .map((o, i) => ({ ...o, spot: spots[i] }));
  return { room, targets, items: shuffle(items, rand) };
}

// ---------------------------------------------------------------------------
// Numbers: pick the group, then count

// 1 to 9 (Slice 5C), and 10 to 20 in ten-frames (Slice 9B part 3).
export const hasNumberScene = (id) => /^([1-9]|1\d|20)$/.test(id);
export const isTeen = (n) => Number.isInteger(n) && n >= 10 && n <= 20;

// ---- 10 to 20 (Slice 9B part 3) ----
// The things stand in ten-frames: two rows of five per ten, the first frame
// filled first, then the extras in the second frame, row by row (17: a full
// frame and 7 more). Every group shows both frames, the empty places faint, so
// the three groups are drawn at the same size and she can see "ten and some more".
// The three groups stand one above another (ROW_SPOTS), each as wide as fits.
// The two wrong groups are also 10 to 20, and all three counts are at least
// TEEN_APART apart.
export const TEEN_APART = 3;
export const FRAME = { cols: 5, rows: 2, gap: 28 }; // gap: between the two frames, in placemat units
// Where the three placemats stand, on the 1280 x 640 stage, top to bottom.
export const ROW_SPOTS = [
  { x: 708, bottom: 212, maxW: 560, maxH: 190 },
  { x: 708, bottom: 418, maxW: 560, maxH: 190 },
  { x: 708, bottom: 624, maxW: 560, maxH: 190 },
];

// The two other counts for n (10 to 20): from 10 to 20, all three at least
// `apart` from each other. Every allowed pair is equally likely.
export function teenCounts(n, rand = Math.random, apart = TEEN_APART) {
  const pairs = [];
  for (let a = 10; a <= 20; a++) {
    for (let b = a + apart; b <= 20; b++) {
      if (Math.abs(a - n) >= apart && Math.abs(b - n) >= apart) pairs.push([a, b]);
    }
  }
  return shuffle(pick(pairs, rand), rand);
}

// Which frame (0 or 1), row and column item i stands in.
export const frameCell = (i) => ({ frame: Math.floor(i / 10), row: Math.floor((i % 10) / FRAME.cols), col: i % FRAME.cols });


// What comes after she finishes writing a character: its find or count scene
// ('openScene'), or, when it has none (a letter with fewer than 2 find
// pictures, such as U and X, or 0), straight back to its board and its star ('letterDone').
// The values are session.js navigate() event types.
export const afterWriting = (id, objects = OBJECTS) =>
  (hasLetterScene(id, objects) || hasNumberScene(id) ? 'openScene' : 'letterDone');

// { room, n, groups, right, frames }: 3 placemats, one with n things
// (groups[right]) and two with other counts: from 1 to 9 for 1 to 9; for 10 to
// 20 (Slice 9B part 3) from 10 to 20, at least TEEN_APART apart, in ten-frames
// (frames: true), one above another. The three counts differ, the three kinds
// differ, and the n group's kind is never `lastKind` (her last number scene's).
// group: { kind, count, gold (index of the golden item, or -1), spot }.
export function numberScene(n, { lastKind = null, rand = Math.random } = {}) {
  if (!Number.isInteger(n) || n < 1 || n > 20) return null;
  const frames = isTeen(n);
  const room = pick(Object.keys(ROOMS), rand);
  const { pool } = ROOMS[room];
  const spots = frames ? ROW_SPOTS : ROOMS[room].groups;
  const kinds = [pick(pool.filter((k) => k !== lastKind), rand)];
  kinds.push(...shuffle(pool.filter((k) => k !== kinds[0]), rand).slice(0, 2));
  const counts = [n, ...(frames ? teenCounts(n, rand) : shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((c) => c !== n), rand).slice(0, 2))];
  const gold = rand() < GOLD_CHANCE ? Math.floor(rand() * n) : -1;
  const order = shuffle([0, 1, 2], rand); // which placemat each group goes on
  const groups = [0, 1, 2].map((i) => ({ kind: kinds[i], count: counts[i], gold: i === 0 ? gold : -1, spot: spots[order[i]] }));
  // Left to right on screen (10 to 20: top to bottom).
  groups.sort((a, b) => a.spot.x - b.spot.x || a.spot.bottom - b.spot.bottom);
  return { room, n, groups, right: groups.findIndex((g) => g.count === n), frames };
}

// "4 cups", "1 cup".
export function groupWord(kind, count) {
  const t = THINGS[kind];
  return `${count} ${count === 1 ? t.one : t.many}`;
}

// A placemat of `n` things (mockup4's makeGroup): up to 5 a row, each in a
// 64 x 64 cell, every cell a <g class="cnt" data-i="..."> with a hidden number.
// gold: the index of the golden item, or -1. gapY: the room above each row for
// its counting numbers (the games' cards need less: they have no numbers).
// Returns { svg, W, H } (W x H units).
export const CELL = 64;
export function makeGroup(kind, n, gold = -1, gapY = 32) {
  const cols = Math.min(5, n);
  const rows = Math.ceil(n / 5);
  const W = Math.max(1, cols) * CELL + 20;
  const H = rows * (CELL + gapY) + 22;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="art" style="overflow:visible">`
    + `<ellipse cx="${W / 2}" cy="${H - 2}" rx="${W / 2}" ry="10" fill="#000" opacity=".1"/>`
    + `<rect x="0" y="${gapY - 14}" width="${W}" height="${H - gapY + 8}" rx="22" fill="#FFFFFF" opacity=".92" stroke="#F2C6D8" stroke-width="4"/>`;
  for (let i = 0; i < n; i++) {
    const x = 10 + (i % 5) * CELL;
    const y = gapY + Math.floor(i / 5) * (CELL + gapY);
    s += `<g transform="translate(${x},${y})"><g class="cnt${i === gold ? ' gold' : ''}" data-i="${i}">`
      + `<rect width="64" height="64" fill="transparent"/><g transform="translate(2,2)">${THINGS[kind].art}</g>`
      + '<text class="num" x="32" y="-6" text-anchor="middle" font-size="28" font-weight="600" font-family="Fredoka, sans-serif" fill="#FFD43B" stroke="#2A2370" stroke-width="3" paint-order="stroke"></text></g></g>';
  }
  return { svg: `${s}</svg>`, W, H };
}

// Ten-frames (Slice 9B part 3): `n` things (10 to 20) in two frames side by
// side, each two rows of five, the empty places faint. Each frame is a
// <g class="frame" data-f="..."> holding its outline, a hidden number (10 or 20,
// shown when she counts a full frame with one tap) and its cells; every thing is
// a <g class="cnt" data-i="..."> with a hidden number, as in makeGroup.
// Returns { svg, W, H, frames: [{ x, w }] } (W x H units).
export function makeTenFrames(kind, n, gold = -1, gapY = 32) {
  const fw = FRAME.cols * CELL + 20;
  const W = 2 * fw + FRAME.gap;
  const H = FRAME.rows * (CELL + gapY) + 22;
  const frames = [0, 1].map((f) => ({ x: f * (fw + FRAME.gap), w: fw }));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="art tens" style="overflow:visible">`
    + `<ellipse cx="${W / 2}" cy="${H - 2}" rx="${W / 2}" ry="10" fill="#000" opacity=".1"/>`;
  frames.forEach(({ x }, f) => {
    s += `<g class="frame" data-f="${f}">`
      + `<rect class="frame-mat" x="${x}" y="${gapY - 14}" width="${fw}" height="${H - gapY + 8}" rx="22" fill="#FFFFFF" stroke="#F2C6D8" stroke-width="4"/>`
      + `<text class="ten" x="${x + fw / 2}" y="${gapY - 22}" text-anchor="middle" font-size="40" font-weight="600" font-family="Fredoka, sans-serif" fill="#FFD43B" stroke="#2A2370" stroke-width="3.5" paint-order="stroke">${(f + 1) * 10}</text>`;
    for (let k = 0; k < 10; k++) {
      const i = f * 10 + k;
      const { row, col } = frameCell(i);
      const cx = x + 10 + col * CELL;
      const cy = gapY + row * (CELL + gapY);
      if (i >= n) {
        s += `<rect class="slot" x="${cx + 6}" y="${cy + 6}" width="52" height="52" rx="12" fill="none" stroke="#E8D9E2" stroke-width="3" stroke-dasharray="7 6"/>`;
        continue;
      }
      s += `<g transform="translate(${cx},${cy})"><g class="cnt${i === gold ? ' gold' : ''}" data-i="${i}">`
        + `<rect width="64" height="64" fill="transparent"/><g transform="translate(2,2)">${THINGS[kind].art}</g>`
        + '<text class="num" x="32" y="-6" text-anchor="middle" font-size="28" font-weight="600" font-family="Fredoka, sans-serif" fill="#FFD43B" stroke="#2A2370" stroke-width="3" paint-order="stroke"></text></g></g>';
    }
    s += '</g>';
  });
  return { svg: `${s}</svg>`, W, H, frames };
}

// A group's picture: ten-frames for 10 to 20, a placemat of rows of five below 10.
export const groupArt = (kind, n, gold = -1) => (n >= 10 ? makeTenFrames(kind, n, gold) : makeGroup(kind, n, gold));

// Counting on (Slice 9B part 3), for 10 to 20: a full ten-frame counts as ten
// with one tap (it glows and shows 10, or 20 for the second full frame), then
// she taps each extra and the count goes on from 11. A tap on an extra before
// the full frames are counted does not count (the frame to tap pulses).
// tapTens returns { state, number, frame }: frame is the frame that was
// counted (number 10 or 20), or null; number is null when the tap did not count.
// state.done: every thing is counted.
export const startCountOn = (n) => ({ n, tens: Math.floor(n / 10), frames: [], order: [], done: false });
export function tapTens(state, { frame = null, item = null } = {}) {
  const none = { state, number: null, frame: null };
  if (state.done) return none;
  const f = frame ?? (Number.isInteger(item) && item >= 0 && item < state.n ? frameCell(item).frame : null);
  // A tap on a full frame (on the frame, or on a thing in it).
  if (f !== null && f < state.tens) {
    if (state.frames.includes(f)) return none;
    const frames = [...state.frames, f];
    const number = frames.length * 10;
    return { state: { ...state, frames, done: number === state.n }, number, frame: f };
  }
  // An extra: only once the full frames are counted.
  if (!Number.isInteger(item) || item < 10 * state.tens || item >= state.n) return none;
  if (state.frames.length < state.tens || state.order.includes(item)) return none;
  const order = [...state.order, item];
  const number = 10 * state.tens + order.length;
  return { state: { ...state, order, done: number === state.n }, number, frame: null };
}
// The frame she should count next (it pulses after an early tap on an extra), or null.
export const nextFrame = (state) => (state.frames.length < state.tens ? [0, 1].find((f) => f < state.tens && !state.frames.includes(f)) : null);

// The counting note's step (src/audio.js countTone) for each number: 1 to 9 as
// before, one step higher each tap. Counting on starts the ten at step 4 and
// climbs half a step per extra, so 20 stays as low as 9 was.
export const countStep = (number, n) => (n >= 10 ? 4 + (number - 10) / 2 : number);

// Counting: she taps each item once; the numbers appear in the order she taps.
// tapCount returns { state, number }: number is the one to show on that item,
// or null when the item was already counted. state.done: every item has its number.
export const startCount = (n) => ({ n, order: [], done: false });
export function tapCount(state, item) {
  if (state.done || state.order.includes(item) || !Number.isInteger(item) || item < 0 || item >= state.n) {
    return { state, number: null };
  }
  const order = [...state.order, item];
  return { state: { ...state, order, done: order.length === state.n }, number: order.length };
}

// ---------------------------------------------------------------------------
// Sizes on screen (CSS px)

// The backdrop covers the screen (1280 x 640 scaled by s, centred).
export function sceneFit(w, h) {
  const s = Math.max(w / 1280, h / 640);
  return { s, left: (w - 1280 * s) / 2, top: (h - 640 * s) / 2 };
}

// A placemat on its spot: as wide as fits maxW, never above 1.2 times its size.
export const groupScale = (W, maxW) => Math.min(1.2, maxW / W);

// The group she counts sits in the middle of the space right of the button
// column (left 136 px, right margin 24 px), under the dots and above the word:
// as big as fits, never above 1.7 times its size.
export const COUNT_BOX = { left: 136, right: 24, top: 110, bottom: 140, max: 1.7 };
export function countScale(W, H, w, h, box = COUNT_BOX) {
  return Math.min(box.max, (w - box.left - box.right) / W, (h - box.top - box.bottom) / H);
}

// ---------------------------------------------------------------------------
// Her collection: { o: object id } for a find, { g: kind, n, gold } for a counted group.

export function addFind(list, entry, max = MAX_FINDS) {
  const out = [...list, entry];
  return out.length > max ? out.slice(out.length - max) : out;
}

// Only well-formed entries survive a load.
export function cleanFinds(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((e) => (e && typeof e === 'object')
    && ((typeof e.o === 'string' && OBJECTS.some((o) => o.id === e.o))
      || e.nm === 1 // her name card (Slice 9C part 2)
      || (typeof e.g === 'string' && THINGS[e.g] && Number.isInteger(e.n) && e.n >= 1 && e.n <= 20))); // 10 to 20: Slice 9B
}

// The picture of one saved find on her shelf, or null. Pictures kept out of
// find scenes (ice cream, eraser) still show, so nothing she found disappears.
export function findArt(entry, objects = OBJECTS) {
  if (entry?.g) return THINGS[entry.g] ? groupArt(entry.g, entry.n, entry.gold ? 0 : -1).svg : null;
  return objects.find((o) => o.id === entry?.o)?.art ?? null;
}

// Her name card (Slice 9C part 2): { nm: 1 }. Only one is ever kept: a newly
// earned one replaces the old, at the newest place. Her name itself is never
// stored here; the shelf reads it from the profile when it draws the card.
export const NAME_CARD = { nm: 1 };
export const isNameCard = (e) => e?.nm === 1;
export const addNameCard = (list, max = MAX_FINDS) => addFind(list.filter((e) => !isNameCard(e)), NAME_CARD, max);

// The kind of her last counted group (so the next number scene can avoid it).
export function lastGroupKind(list) {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].g) return list[i].g;
  return null;
}

// ---------------------------------------------------------------------------
// The attempt log: one "find" entry per tap in a scene. Stroke entries keep
// their own format; these carry type: 'find'.
//   scene 'letter': step 'find', word: the object she tapped
//   scene 'number': step 'group', count: the group she tapped; or
//                   step 'count', count: the number that item shows
//   ok: right or wrong; ms: since the scene opened.
export function findLogEntry({ char, scene, step, word, count, ok, ms, now = new Date() }) {
  const entry = { type: 'find', time: now.toISOString(), char, scene, step };
  if (word !== undefined) entry.word = word;
  if (count !== undefined) entry.count = count;
  entry.ok = ok === true;
  entry.ms = Math.max(0, Math.round(ms));
  return entry;
}
