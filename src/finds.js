// finds.js — pure functions only. No DOM, no storage, no audio.
// The rules of the find and count scenes (Slice 5C): which room, which objects
// and where, the placemat groups, the counting order, the sizes on screen, the
// collection list and the attempt-log entry. scene.js draws and plays them.
// Every random choice takes `rand` (Math.random by default) so tests can repeat it.

import { OBJECTS, ROOMS, THINGS } from '../data/finds.js';

export const FINDS = 3;          // right objects in a letter scene
export const OTHERS = 4;         // objects that do not start with her letter
export const HINT_MS = 10000;    // no find for this long: the objects left to find wiggle once
export const WORD_MS = 2000;     // a wrong tap shows that object's own word this long
export const GOLD_CHANCE = 0.25; // one golden item in the group she counts
export const MAX_FINDS = 500;    // the collection keeps this many, newest last
export const SHELF_SHOWS = 24;   // the shelf of finds shows the newest 24 (mockup4)

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
// Letters: find 3

export const objectsFor = (letter) => OBJECTS.filter((o) => o.letter === letter);

// A letter has a scene when the library holds at least 3 of its objects.
export const hasLetterScene = (letter) => objectsFor(letter).length >= FINDS;

// How many of her letter's objects each room holds.
export function roomCounts(letter) {
  const counts = Object.fromEntries(Object.keys(ROOMS).map((r) => [r, 0]));
  for (const o of objectsFor(letter)) for (const r of o.rooms) counts[r] += 1;
  return counts;
}

// The room that holds the most of her letter's objects; a tie is broken at random.
export function roomFor(letter, rand = Math.random) {
  const counts = roomCounts(letter);
  const most = Math.max(...Object.values(counts));
  return pick(Object.keys(counts).filter((r) => counts[r] === most), rand);
}

// `count` objects from `list`, the room's own first, the rest from other rooms.
function preferRoom(list, room, count, rand) {
  const own = shuffle(list.filter((o) => o.rooms.includes(room)), rand);
  const rest = shuffle(list.filter((o) => !o.rooms.includes(room)), rand);
  return [...own, ...rest].slice(0, count);
}

// { room, items }: 3 objects that start with her letter and 4 that do not, each
// on its own spot of the room, in random places. item: { ...object, right, spot }.
// null when the letter has no scene.
export function letterScene(letter, rand = Math.random) {
  if (!hasLetterScene(letter)) return null;
  const room = roomFor(letter, rand);
  const right = preferRoom(objectsFor(letter), room, FINDS, rand);
  const others = preferRoom(OBJECTS.filter((o) => o.letter !== letter), room, OTHERS, rand);
  const spots = shuffle(ROOMS[room].spots, rand);
  const items = [...right.map((o) => ({ ...o, right: true })), ...others.map((o) => ({ ...o, right: false }))]
    .map((o, i) => ({ ...o, spot: spots[i] }));
  return { room, items: shuffle(items, rand) };
}

// ---------------------------------------------------------------------------
// Numbers: pick the group, then count

export const hasNumberScene = (id) => /^[1-9]$/.test(id);

// { room, n, groups, right }: 3 placemats, one with n things (groups[right]) and
// two with other counts from 1 to 9. The three counts differ, the three kinds
// differ, and the n group's kind is never `lastKind` (her last number scene's).
// group: { kind, count, gold (index of the golden item, or -1), spot }.
export function numberScene(n, { lastKind = null, rand = Math.random } = {}) {
  if (!Number.isInteger(n) || n < 1 || n > 9) return null;
  const room = pick(Object.keys(ROOMS), rand);
  const { pool, groups: spots } = ROOMS[room];
  const kinds = [pick(pool.filter((k) => k !== lastKind), rand)];
  kinds.push(...shuffle(pool.filter((k) => k !== kinds[0]), rand).slice(0, 2));
  const counts = [n, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((c) => c !== n), rand).slice(0, 2)];
  const gold = rand() < GOLD_CHANCE ? Math.floor(rand() * n) : -1;
  const order = shuffle([0, 1, 2], rand); // which placemat each group goes on
  const groups = [0, 1, 2].map((i) => ({ kind: kinds[i], count: counts[i], gold: i === 0 ? gold : -1, spot: spots[order[i]] }));
  // Left to right on screen.
  groups.sort((a, b) => a.spot.x - b.spot.x);
  return { room, n, groups, right: groups.findIndex((g) => g.count === n) };
}

// "4 cups", "1 cup".
export function groupWord(kind, count) {
  const t = THINGS[kind];
  return `${count} ${count === 1 ? t.one : t.many}`;
}

// A placemat of `n` things (mockup4's makeGroup): up to 5 a row, each in a
// 64 x 64 cell, every cell a <g class="cnt" data-i="..."> with a hidden number.
// gold: the index of the golden item, or -1. Returns { svg, W, H } (W x H units).
export const CELL = 64;
export function makeGroup(kind, n, gold = -1) {
  const cols = Math.min(5, n);
  const rows = Math.ceil(n / 5);
  const gapY = 32;
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
      || (typeof e.g === 'string' && THINGS[e.g] && Number.isInteger(e.n) && e.n >= 1 && e.n <= 9)));
}

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
