// detective.js — pure functions only. No DOM, no storage, no audio.
// Dot Detective (Slice 10F): a letter's body without its dots, and she gives
// it the right ones. It practises what tells Urdu look-alikes apart (ب پ ت ٹ ث).
// It opens from a magnifying-glass tile on the Urdu board.
//
// Levels (one tile each; a level opens after 3 finished plays of the one before):
//   1 Look            the whole letter on a small card; she picks 1 of 3 dot tiles
//   2 Remember        the letter's find picture (the goat for ب); she picks 1 of 3 dot tiles
//   3 Do it herself   the find picture; she taps (or draws) the dots onto the body,
//                     judged as the copy round judges dots (src/urdu-dots.js)
// One play is DETECTIVE.lettersPerPlay letters, never one letter twice, and
// never the same letter as the last one of her last play. Finishing a play
// earns the level's star.
//
// The letters: the 26 letters of the families that differ only in their dots
// or a mark (URDU_FAMILIES). Levels 2 and 3 use only those with a picture word.
// A dot tile shows a dot pattern on a faint copy of the body: the right one, and
// two others from the letter's family (a family of two borrows a common pattern).

import { URDU_GLYPHS } from '../data/glyphs.js';
import { URDU_OBJECTS } from '../data/finds.js';
import { glyphCharacter } from './glyph-points.js';
import {
  URDU_FAMILIES, URDU_DOTS, familyOf, expectedMarks, readMarks, compareMarks, tapCanBeMark, extent, middleOf,
} from './urdu-dots.js';
import { gameLogEntry } from './games.js';

export const DETECTIVE = {
  lettersPerPlay: 4,
  levels: 3,
  opensAfter: 3,      // finished plays of a level before the next one opens
  hintAfter: 2,       // wrong tiles (levels 1 and 2) or failed judgings (level 3) before the right answer glows
  waitMs: 4000,       // level 3: judged this long after her last tap (each new tap restarts it), as the copy round's dot wait
};
export const DETECTIVE_GAMES = ['detective-1', 'detective-2', 'detective-3'];
export const isDetective = (game) => DETECTIVE_GAMES.includes(game);
export const detectiveLevel = (game) => Number(String(game).split('-')[1]);

// The letters as character files (the same as data/chars/, built from data/glyphs.js).
const CHARS = Object.fromEntries(URDU_FAMILIES.flat().map((id) => [id, glyphCharacter(id, URDU_GLYPHS[id])]));
export const detectiveChar = (id) => CHARS[id];

// Every family letter, in qaida order (the order of URDU_FAMILIES' letters on the board).
export const DETECTIVE_LETTERS = Object.keys(URDU_GLYPHS).filter((id) => URDU_FAMILIES.some((f) => f.includes(id)));
// A letter's find picture (Slice 10E), or null.
export const pictureOf = (id) => URDU_OBJECTS.find((o) => o.letter === id) ?? null;
// The letters a level uses: every family letter, or (levels 2 and 3) those with a picture word.
export const lettersFor = (level) => (level === 1 ? DETECTIVE_LETTERS : DETECTIVE_LETTERS.filter((id) => pictureOf(id)));

// ---- levels ----

// Whether a level is open: 1 always; the next after DETECTIVE.opensAfter finished plays of the one before.
// plays: { [level]: finished plays } (td.detective).
export const detectiveLevelOpen = (level, plays = {}) => level === 1 || (plays[level - 1] ?? 0) >= DETECTIVE.opensAfter;

// ---- dot patterns ----

// A letter's dots and mark as a pattern: { key, dots: [{ at }], marks: [{ part, points }] }.
// key: 'none', 'mark:small ṭ', 'mark:madd', or 'dots:<n>:<top|under>'.
export function patternOf(id) {
  const want = expectedMarks(CHARS[id]);
  const dots = want.dots.map((d) => ({ at: d.at }));
  const marks = want.marks.map((m) => ({ part: m.part, points: m.points }));
  let key = 'none';
  if (marks.length) key = `mark:${marks[0].part}`;
  else if (dots.length) key = `dots:${dots.length}:${want.dots[0].side}`;
  return { key, dots, marks };
}

// The body's box (line units), from its lines.
export function bodyBox(id) {
  const pts = CHARS[id].strokes.filter((s) => s.kind === 'line').flatMap((s) => s.points);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

// Common patterns a family of two borrows, placed on any body: n dots in a row
// (three: two, then one on top or under them), a little above or below the body.
export const BORROWED = ['dots:1:top', 'dots:2:top', 'dots:1:under', 'dots:3:top', 'dots:2:under', 'dots:3:under'];
export function placedPattern(key, id) {
  const [, n, side] = key.split(':');
  const b = bodyBox(id);
  const cx = (b.x0 + b.x1) / 2;
  const gap = 0.21;
  const y = side === 'top' ? b.y0 - 0.16 : b.y1 + 0.2;
  const row = (k, yy) => Array.from({ length: k }, (_, i) => ({ at: [cx + (i - (k - 1) / 2) * gap, yy] }));
  const dots = Number(n) === 3
    ? [...row(2, y), ...row(1, side === 'top' ? y - 0.17 : y + 0.17)]
    : row(Number(n), y);
  return { key, dots, marks: [] };
}

// The 3 dot tiles for a letter: [{ key, dots, marks }] in random order, and
// `right` (the index of the letter's own). The others are its family's
// patterns first, then borrowed ones, each different.
export function detectiveChoices(id, rand = Math.random) {
  const own = patternOf(id);
  const keys = new Set([own.key]);
  const others = [];
  for (const sib of shuffle(familyOf(id).filter((s) => s !== id), rand)) {
    // A sibling's dots, moved onto this letter's body (the same shape; its box may sit a little to one side).
    const dx = bodyBox(id).x0 - bodyBox(sib).x0;
    const dy = bodyBox(id).y1 - bodyBox(sib).y1;
    const moved = ([x, y]) => [x + dx, y + dy];
    const raw = patternOf(sib);
    const p = { key: raw.key, dots: raw.dots.map((d) => ({ at: moved(d.at) })), marks: raw.marks.map((m) => ({ part: m.part, points: m.points.map(moved) })) };
    if (keys.has(p.key)) continue;
    keys.add(p.key);
    others.push(p);
    if (others.length === 2) break;
  }
  for (const key of shuffle(BORROWED, rand)) {
    if (others.length === 2) break;
    if (keys.has(key)) continue;
    keys.add(key);
    others.push(placedPattern(key, id));
  }
  const tiles = shuffle([own, ...others], rand);
  return { tiles, right: tiles.findIndex((t) => t.key === own.key) };
}

// ---- a play ----

// The letters of one play: DETECTIVE.lettersPerPlay different letters of the
// level, the first never the last letter of her last play (`last`: its letters).
export function detectivePlay(level, last = [], rand = Math.random) {
  const pool = lettersFor(level);
  for (let tries = 0; tries < 50; tries++) {
    const picks = shuffle(pool, rand).slice(0, DETECTIVE.lettersPerPlay);
    if (!last.length || picks[0] !== last[last.length - 1]) return picks;
  }
  return shuffle(pool, rand).slice(0, DETECTIVE.lettersPerPlay);
}

// Levels 1 and 2: a tile tapped. state: { wrong: [indexes] }.
// Returns { state, ok, hint }: hint is the right index once she has picked DETECTIVE.hintAfter wrong ones, else null.
export const startPicking = () => ({ wrong: [] });
export function pickTile(state, round, index) {
  if (index === round.right) return { state, ok: true, hint: null };
  const wrong = state.wrong.includes(index) ? state.wrong : [...state.wrong, index];
  return { state: { wrong }, ok: false, hint: wrong.length >= DETECTIVE.hintAfter ? round.right : null };
}

// ---- level 3: her own dots ----

// Her strokes on the body (line units of the letter box), sorted by size: a
// dot (a tap or a tiny stroke), a mark (the little ṭ or the madd), or anything
// bigger, which is left out (she may trace the body with her finger).
export function sortTaps(strokes, cfg = URDU_DOTS) {
  const out = { dots: [], marks: [], other: [] };
  for (const pts of strokes) {
    if (!pts.length) continue;
    const e = extent(pts);
    if (e <= cfg.dotSize) out.dots.push(pts);
    else if (e <= cfg.markSize) out.marks.push(pts);
    else out.other.push(pts);
  }
  return out;
}

// Judge her dots on letter `id`, as the copy round judges them (on top or not;
// how many; the mark). Returns { ok, reason, need, side, part, count }:
// reason null when ok, else 'dot-count', 'dot-side' or 'missing-mark'
// (src/notes.js copyNote says it). count: the dots and marks she placed.
export function judgeDots(strokes, id) {
  const char = CHARS[id];
  const body = char.strokes.filter((s) => s.kind === 'line').map((s) => s.points);
  const sorted = sortTaps(strokes);
  const hers = readMarks(sorted.dots, sorted.marks, body);
  const tapForMark = tapCanBeMark(char, familyOf(id).map((f) => CHARS[f]));
  const problem = compareMarks(hers, expectedMarks(char), { tapForMark });
  const count = sorted.dots.length + sorted.marks.length;
  if (!problem) return { ok: true, reason: null, count };
  // A mark on a letter with no mark and no dots (ر with a ṭ): "It has no dots" is the kindest true line here.
  if (problem.reason === 'extra-mark') return { ok: false, reason: 'dot-count', need: 0, count };
  return { ok: false, reason: problem.reason, need: problem.need ?? null, side: problem.side ?? null, part: problem.part ?? null, count };
}

// Level 3: after her last tap, judge now (it is right: a success never waits)
// or after DETECTIVE.waitMs (each new tap restarts it). Nothing placed yet: wait.
export function dotsStatus(strokes, id) {
  const r = judgeDots(strokes, id);
  if (r.ok) return 'judge-now';
  return r.count > 0 ? 'judge-soon' : 'wait';
}

// Where her taps may go: the body's box with room round it for dots and marks (line units).
export const TAP_ROOM = 0.6;
export function inTapRoom([x, y], id, room = TAP_ROOM) {
  const b = bodyBox(id);
  return x >= b.x0 - room && x <= b.x1 + room && y >= Math.min(b.y0, 0) - room * 0.5 && y <= Math.max(b.y1, 1) + room;
}

// ---- where things sit (board units: the games' 1280 x 640 board) ----
// The clue on the left, the big letter in the middle (one line unit = `unit`,
// its four guide lines centred), the three dot tiles in a column on the right,
// one progress dot per letter at the top, Jugnu beside the clue.
export const DETECTIVE_LAYOUT = {
  clue: { x: 50, y: 170, w: 250, h: 300 },
  letter: { x: 320, y: 40, w: 580, h: 580, unit: 330 },
  tiles: [{ x: 930, y: 30, w: 320, h: 180 }, { x: 930, y: 230, w: 320, h: 180 }, { x: 930, y: 430, w: 320, h: 180 }],
  dots: { y: 616, gap: 40 },
  jugnu: { x: 120, y: 500, size: 110 },
};
// Letter units -> board units, for letter `id` centred in the letter box.
export function letterPlace(id, layout = DETECTIVE_LAYOUT) {
  const { x, y, w, h, unit } = layout.letter;
  const width = CHARS[id].width;
  const ox = x + (w - width * unit) / 2;
  const oy = y + (h - 1.5 * unit) / 2;
  return { unit, ox, oy, toBoard: ([lx, ly]) => [ox + lx * unit, oy + ly * unit], toLetter: ([bx, by]) => [(bx - ox) / unit, (by - oy) / unit] };
}
// The tile under a board point, or null.
export const hitTile = ([bx, by], layout = DETECTIVE_LAYOUT) => {
  const i = layout.tiles.findIndex((t) => bx >= t.x && bx <= t.x + t.w && by >= t.y && by <= t.y + t.h);
  return i === -1 ? null : i;
};

// ---- the log ----

// A tile (levels 1 and 2) or a judging (level 3): a "game" entry, from what she
// gave (a pattern key) to what was right.
export function detectiveLogEntry({ game, set, letter, gave, right, ok, ms, now = new Date() }) {
  return { ...gameLogEntry({ game, set, from: gave, to: right, ok, ms, now }), letter };
}

// A shuffled copy (Fisher-Yates).
function shuffle(list, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export { middleOf };
