// drawing.js — pure functions only. No DOM, no storage, no audio.
// The rules of the Drawing book (Slice 5E): the pictures of each level, where
// they sit on the board, reaching dots in order, closing a shape, Jugnu's idle
// hint, the level unlocks, the rainbow crayon and the "draw" attempt-log entry.
// dots.js and paper.js put them on screen. Coordinates are board units (the
// 1280 x 640 board of src/games.js), so everything she draws survives a resize.

import { PICTURES, LEVEL_PICTURES, PAIRS } from '../data/drawings.js';

export const LEVELS = [1, 2, 3];
export const DOT_REACH_PX = 40;   // her finger this close to the next dot reaches it
export const UNLOCK_AFTER = 3;    // finished pictures of a level that open the next one
export const LEVEL1_DOTS = [6, 8];
export const MAX_DOTS = 10;

// Jugnu's hint: after 8 s without reaching a dot, then every 15 s, at most 3
// times for the same dot. Reaching a dot starts the count again.
export const HINT_FIRST_MS = 8000;
export const HINT_EVERY_MS = 15000;
export const HINT_MAX = 3;

// ---- the pictures ----

// The menu's pictures for a level: { id, things } (level 3: two things).
export function levelPictures(level) {
  if (level === 3) return PAIRS.map(([a, b]) => ({ id: `${a}-${b}`, things: [a, b] }));
  return LEVEL_PICTURES.map((id) => ({ id, things: [id] }));
}

export const pictureId = (level, id) => `L${level}:${id}`;
export const findPicture = (level, id) => levelPictures(level).find((p) => p.id === id) ?? null;

// Which dots a thing uses at a level: level 1 its own, levels 2 and 3 the level 2 dots.
export const dotsFor = (thing, level) => PICTURES[thing].dots[level === 1 ? 1 : 2];

// Where each thing sits on the board: { x, y, size } in units (the thing's
// 100 x 100 box scaled to size). One thing sits in the middle; two sit side by side.
export const BOXES = {
  one: [{ x: 400, y: 24, size: 480 }],
  two: [{ x: 150, y: 70, size: 420 }, { x: 710, y: 70, size: 420 }],
};
export const boxesFor = (things) => (things.length === 1 ? BOXES.one : BOXES.two);

// A thing's dots in board units, inside its box.
export const placeDots = (dots, box) => dots.map(([x, y]) => [box.x + (x / 100) * box.size, box.y + (y / 100) * box.size]);

// ---- reaching dots in order ----

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const EPS = 1e-9; // exactly 40 px counts, whatever the rounding

// The reach in units, for a board drawn at s px per unit.
export const reachUnits = (s, px = DOT_REACH_PX) => px / s;

// Drawing one closed shape of n dots. at: the dot she has reached last (0 is
// dot 1, where she starts); segments: how many of its n lines are drawn.
export const startDots = (n) => ({ n, at: 0, segments: 0, done: false });

// The dot she draws to next (after the last dot, dot 1 again: the shape closes).
export const nextDot = (state) => (state.at + 1) % state.n;

// A line may only start at the dot she has reached.
export const startsAtDot = (point, dots, state, reach) => !state.done && dist(point, dots[state.at]) <= reach + EPS;

// Her finger moved to `point`. Returns { state, reached, done }: reached is the
// index of the dot she just reached (only ever the next one, never a later dot),
// or null; done once the last line has joined back to dot 1.
export function stepDots(state, point, dots, reach) {
  if (state.done) return { state, reached: null, done: true };
  const next = nextDot(state);
  if (dist(point, dots[next]) > reach + EPS) return { state, reached: null, done: false };
  const segments = state.segments + 1;
  const done = segments === state.n;
  return { state: { ...state, at: next, segments, done }, reached: next, done };
}

// ---- Jugnu's idle hint ----

// When the next hint is due, in ms without progress, after `given` hints for
// this dot. Infinity once 3 have been given.
export const hintAt = (given) => (given >= HINT_MAX ? Infinity : HINT_FIRST_MS + given * HINT_EVERY_MS);

// One idle clock per dot: tick(ms) adds time (only while she is not paused);
// it returns true when Jugnu should fly now. reached() starts it again.
export const startIdle = () => ({ ms: 0, given: 0 });
export function tickIdle(idle, ms) {
  const next = { ...idle, ms: idle.ms + ms };
  if (next.ms >= hintAt(idle.given)) return { idle: { ...next, given: idle.given + 1 }, hint: true };
  return { idle: next, hint: false };
}
export const reachedIdle = () => startIdle();

// ---- the levels and the stars ----

// A level is open when 3 pictures of the level before it are finished.
// stars: the finished pictures' ids ('L1:house', 'L3:car-building', ...).
export function levelOpen(level, stars) {
  if (level <= 1) return true;
  const before = stars.filter((s) => s.startsWith(`L${level - 1}:`)).length;
  return before >= UNLOCK_AFTER && levelOpen(level - 1, stars);
}

// ---- the rainbow crayon: its color changes as the line grows ----
export const rainbowColor = (length) => `hsl(${Math.round((length * 0.6) % 360)}, 90%, 58%)`;

// ---- the attempt log: one "draw" entry each time she reaches a dot ----
//   picture: the menu's picture ('house', 'car-building'); thing: what she is
//   drawing (differs only on level 3); level; dot: the number on the dot she
//   reached (1 when she closes the shape); ms: since the picture opened;
//   helped: Jugnu flew to this dot before she reached it.
export function drawLogEntry({ picture, thing, level, dot, ms, helped, now = new Date() }) {
  return { type: 'draw', time: now.toISOString(), picture, thing, level, dot, ms: Math.max(0, Math.round(ms)), helped: helped === true };
}
