// children.js — pure functions only. No DOM, no storage, no audio.
// Slice 8A: children's profiles. One tablet, up to 6 children. Each child has
// an id (c1, c2, ...; never reused), a name (a to z, as the name book needs),
// how the voice should say it (optional), an animal picture and a color.
// Everything personal is saved per child (src/storage.js childStore); only the
// device settings in SHARED_KEYS are shared.
//
// Names are never written in the code, the tests or the docs: tests use
// made-up names ("Sara", "Omar").

import { nameOf, charName } from './name.js';

export const MAX_CHILDREN = 6;
export const MAX_NAME = 40;

// The animal pictures a child can choose (their art is in src/art.js, Slice 8A part 2).
export const ANIMALS = ['cat', 'dog', 'rabbit', 'bear', 'owl', 'fox', 'elephant', 'fish'];
// The colors a child can choose: dark enough to read white on, and no red.
export const CHILD_COLORS = ['#1565C0', '#2E7D32', '#6A1B9A', '#AD1457', '#00695C', '#8D5B00', '#4527A0', '#00838F'];

// ---------------------------------------------------------------------------
// Keys
//
// Every key in localStorage starts 'td.'. A child's own copy of a key lives
// under 'td.child.<id>.' + the rest of the key: td.stars for c1 is
// td.child.c1.stars. Device settings stay under their own key, shared.

export const CHILDREN_KEY = 'td.children';   // { next, list: [child] }
export const CURRENT_KEY = 'td.current';     // the id of the child playing now
export const MIGRATION_KEY = 'td.migration'; // 'done' once the old progress was copied and checked
export const SHARED_KEYS = [
  CHILDREN_KEY, CURRENT_KEY, MIGRATION_KEY,
  'td.music',     // music on or off
  'td.lastVisit', // the day the door was last opened (the daily door rule)
  'td.profile',   // the setup page's name before Slice 8A, kept as a backup
  'td.welcomed',  // 'yes' once a parent has seen the children page (Slice 8A part 2)
];

export const WELCOMED_KEY = 'td.welcomed';

export const isChildId = (id) => typeof id === 'string' && /^c[1-9]\d*$/.test(id);
export const childPrefix = (id) => `td.child.${id}.`;
export const isShared = (key) => SHARED_KEYS.includes(key) || !key.startsWith('td.') || key.startsWith('td.child.');
// The key a child's copy of `key` is saved under.
export const childKey = (id, key) => (isShared(key) ? key : childPrefix(id) + key.slice('td.'.length));

// The personal keys saved before Slice 8A: the migration copies each to the first child.
export const LEGACY_KEYS = [
  'td.attempts', 'td.stars', 'td.rounds', 'td.helper', 'td.finds', 'td.games', 'td.drawings',
  'td.lastPlay', 'td.missing', 'td.reviews', 'td.practiceMore', 'td.pages',
];

// ---------------------------------------------------------------------------
// The children list

const field = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_NAME) : '');

// A clean child from anything; null when its id is not a child id.
export function cleanChild(c) {
  if (!c || typeof c !== 'object' || !isChildId(c.id)) return null;
  return {
    id: c.id,
    name: field(c.name),
    sayAs: field(c.sayAs),
    animal: ANIMALS.includes(c.animal) ? c.animal : ANIMALS[0],
    color: CHILD_COLORS.includes(c.color) ? c.color : CHILD_COLORS[0],
  };
}

const idNumber = (id) => Number(id.slice(1));

// A clean list from anything storage gave back: { next, list }. Ids are unique,
// at most MAX_CHILDREN children, and `next` is always above every id ever used.
export function cleanChildren(raw) {
  const list = [];
  for (const c of Array.isArray(raw?.list) ? raw.list : []) {
    const child = cleanChild(c);
    if (child && !list.some((x) => x.id === child.id) && list.length < MAX_CHILDREN) list.push(child);
  }
  const highest = Math.max(0, ...list.map((c) => idNumber(c.id)));
  const next = Number.isInteger(raw?.next) && raw.next > highest ? raw.next : highest + 1;
  return { next, list };
}

export const emptyChildren = () => ({ next: 1, list: [] });
export const childById = (state, id) => state.list.find((c) => c.id === id) ?? null;

// The name as the name book writes it ('Sara'), for comparing two names.
const wordOf = (name) => nameOf(name).word.toLowerCase();

// Can `name` be a child's name? exceptId: the child being renamed.
// { ok, reason }: reason null, 'none' (empty), 'unsupported' (not a to z) or
// 'taken' (another child already has it, in any case).
export function checkName(state, name, exceptId = null) {
  const n = nameOf(name);
  if (!n.ok) return { ok: false, reason: n.reason, bad: n.bad };
  if (state.list.some((c) => c.id !== exceptId && wordOf(c.name) === n.word.toLowerCase())) return { ok: false, reason: 'taken', bad: [] };
  return { ok: true, reason: null, bad: [] };
}

// The first animal and color no child has yet (the first ones when all are used).
export function freshLook(state) {
  const animal = ANIMALS.find((a) => !state.list.some((c) => c.animal === a)) ?? ANIMALS[0];
  const color = CHILD_COLORS.find((k) => !state.list.some((c) => c.color === k)) ?? CHILD_COLORS[0];
  return { animal, color };
}

// Add a child. { ok, state, child } or { ok: false, reason } ('full', or a checkName reason).
// checkNames: false lets the migration keep a name saved before names were checked.
export function addChild(state, { name = '', sayAs = '', animal, color } = {}, { checkNames = true } = {}) {
  if (state.list.length >= MAX_CHILDREN) return { ok: false, reason: 'full' };
  if (checkNames) {
    const check = checkName(state, name);
    if (!check.ok) return { ok: false, reason: check.reason, bad: check.bad };
  }
  const look = freshLook(state);
  const child = cleanChild({ id: `c${state.next}`, name, sayAs, animal: animal ?? look.animal, color: color ?? look.color });
  return { ok: true, state: { next: state.next + 1, list: [...state.list, child] }, child };
}

// Change a child's name, how to say it, animal or color (only the fields given).
// { ok, state, child, renamed } or { ok: false, reason } ('missing', or a checkName
// reason). renamed: the name book word changed, so that child's name book starts again.
export function updateChild(state, id, changes = {}, { checkNames = true } = {}) {
  const old = childById(state, id);
  if (!old) return { ok: false, reason: 'missing' };
  if (changes.name !== undefined && checkNames) {
    const check = checkName(state, changes.name, id);
    if (!check.ok) return { ok: false, reason: check.reason, bad: check.bad };
  }
  const child = cleanChild({ ...old, ...changes, id });
  const renamed = nameOf(old.name).word !== '' && nameOf(old.name).word !== nameOf(child.name).word;
  return { ok: true, state: { ...state, list: state.list.map((c) => (c.id === id ? child : c)) }, child, renamed };
}

// Take a child off the list. `next` stays, so the id is never given again.
export const removeChild = (state, id) => ({ ...state, list: state.list.filter((c) => c.id !== id) });

// The child who plays: the saved one if still on the list, else the first; null with no children.
export const currentOf = (state, saved) => (childById(state, saved) ?? state.list[0] ?? null)?.id ?? null;

// Is this key one of child `id`'s own (or its test-mode copy, prefix 'test.')?
export const isChildsKey = (key, id, testPrefix = 'test.') =>
  key.startsWith(childPrefix(id)) || key.startsWith(testPrefix + childPrefix(id));

// ---------------------------------------------------------------------------
// The migration (Slice 8A part 1)
//
// Before Slice 8A every personal key was saved once, for one child. The first
// open after the update copies each one to the first child's keys. The old keys
// are never changed or removed: they stay as a backup (a later slice removes
// them, once the copy is confirmed on the tablet). Only the attempt log changes
// on the way: each entry gets the child's id.

// What child `id`'s copy of an old key should hold, from the old key's text
// (null: nothing saved, nothing to copy).
export function migratedValue(key, text, id) {
  if (text === null || text === undefined) return null;
  if (key !== 'td.attempts') return text;
  let list;
  try { list = JSON.parse(text); } catch { return text; }
  if (!Array.isArray(list)) return text;
  return JSON.stringify(list.map((e) => (e && typeof e === 'object' && !Array.isArray(e) ? { ...e, child: e.child ?? id } : e)));
}

// The first child, from the setup page's old profile ({ name, sayAs }).
export function firstChild(profile) {
  return addChild(emptyChildren(), { name: profile?.name ?? '', sayAs: profile?.sayAs ?? '' }, { checkNames: false });
}

// ---------------------------------------------------------------------------
// The screens (Slice 8A part 2)

// The first-run setup is needed while there is no child, or a child has no name
// yet (a brand-new device, or old progress saved before a name was set).
export const needsSetup = (state) => state.list.length === 0 || state.list.some((c) => c.name === '');

// The gear on the front door opens the children page after a press and hold this long.
export const LOCK_MS = 3000;

// The children's tiles at the front door: as big as fits (up to TILES.max),
// never smaller than TILES.min, in one row or two. The room is right of the
// button column, as for the boards. Returns { size, cols, rows, gap }.
export const TILES = { min: 160, max: 220, gap: 24, left: 136, right: 24, top: 24, bottom: 24 };
export function childTileGrid(n, w, h, t = TILES) {
  const count = Math.max(1, Math.min(MAX_CHILDREN, n));
  const roomW = w - t.left - t.right;
  const roomH = h - t.top - t.bottom;
  let best = null;
  for (let rows = 1; rows <= 2; rows++) {
    const cols = Math.ceil(count / rows);
    if (rows > 1 && cols * (rows - 1) >= count) continue; // an empty row
    const size = Math.floor(Math.min(t.max, (roomW - (cols - 1) * t.gap) / cols, (roomH - (rows - 1) * t.gap) / rows));
    if (!best || size > best.size) best = { size, cols, rows, gap: t.gap };
  }
  return best;
}

// The font size for a name on its tile (px): big, but the whole name fits.
// An average letter of the tile font is about 0.58 of the font size wide.
export const tileFontSize = (name, size) => Math.floor(Math.min(size * 0.17, (size * 0.86) / (0.58 * Math.max(1, [...name].length))));

// The children page's line under the name field (parent-facing text).
// check: checkName's result; word: the name as the name book will write it.
export function childNameNote(check, word = '') {
  if (check.ok) return `The name book will write: ${word}`;
  if (check.reason === 'none') return '';
  if (check.reason === 'taken') return 'Another child already has this name.';
  if (check.reason === 'unsupported') return `The name book can only write the letters a to z. It cannot use: ${check.bad.map(charName).join(', ')}.`;
  return '';
}
