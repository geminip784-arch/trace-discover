// recording.js — pure functions for the stroke recorder. No DOM, no storage.
// Points are [x, y] in line units, x = 0 at the left edge of the character box.

import { resample, pathLength, DEFAULTS, dist } from './geometry.js';
import { JOIN_GAP } from './variants.js';
import { STROKE_ORDER } from '../data/stroke-order.js';

// The recorder's picker, one row per group. Lowercase and Urdu get their own
// group here later; everything else reads CHAR_IDS.
export const CHAR_GROUPS = [
  { name: 'Capitals', ids: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
  { name: 'Digits', ids: '0123456789'.split('') },
];
export const CHAR_IDS = CHAR_GROUPS.flatMap((g) => g.ids);
export const SMOOTH_PASSES = 3;   // Chaikin corner-cutting passes for the Smooth button
export const STROKE_POINTS = 24;  // every line stroke is stored with this many points
export const SNAP_DEGREES = 15;   // straighten snaps to vertical/horizontal within this angle
// After snapping, straighten also puts the stroke on the guide lines:
export const VERTICAL_LINE_SNAP = { lines: [0, 1], within: 0.15 };        // each end of a vertical stroke
export const HORIZONTAL_LINE_SNAP = { lines: [0, 0.5, 1], within: 0.12 }; // a horizontal stroke's y

export const round3 = (v) => Math.round(v * 1000) / 1000 + 0; // + 0 turns -0 into 0

const roundPoint = ([x, y]) => [round3(x), round3(y)];

// Shorter than this is a stray tap, not a stroke (same limit the scorer uses).
export function isTooShort(points) {
  return points.length < 2 || pathLength(points) < DEFAULTS.minLength;
}

// A finished finger stroke: evenly spaced points, rounded to 3 decimals.
export function processStroke(points) {
  return resample(points, STROKE_POINTS).map(roundPoint);
}

// A tap recorded as a dot: the average of its points, so a tiny wobble doesn't matter.
export function tapToDot(points) {
  const x = points.reduce((s, p) => s + p[0], 0) / points.length;
  const y = points.reduce((s, p) => s + p[1], 0) / points.length;
  return [roundPoint([x, y])];
}

// The guide line nearest to y, if it is within `within`; otherwise null.
function nearestLine(y, { lines, within }) {
  let best = null;
  for (const line of lines) {
    if (Math.abs(y - line) <= within && (best === null || Math.abs(y - line) < Math.abs(y - best))) best = line;
  }
  return best;
}

// A straight line from the stroke's first point to its last. Within SNAP_DEGREES of
// vertical or horizontal it is made exactly vertical (start's x) or horizontal (start's y),
// then snapped onto the guide lines:
// - vertical: each end moves to the sky or grass line when close to it
//   (unless both ends would land on the same line);
// - horizontal: when the average y of the two ends is close to the sky, fence or
//   grass line, the whole stroke moves onto that line.
export function straighten(points, snapDegrees = SNAP_DEGREES) {
  let a = points[0];
  let b = points[points.length - 1];
  const dx = Math.abs(b[0] - a[0]);
  const dy = Math.abs(b[1] - a[1]);
  const limit = (snapDegrees * Math.PI) / 180;
  if (Math.atan2(dx, dy) <= limit) {
    // near vertical
    const ya = nearestLine(a[1], VERTICAL_LINE_SNAP);
    const yb = nearestLine(b[1], VERTICAL_LINE_SNAP);
    const same = ya !== null && ya === yb;
    a = [a[0], ya === null || same ? a[1] : ya];
    b = [a[0], yb === null || same ? b[1] : yb];
  } else if (Math.atan2(dy, dx) <= limit) {
    // near horizontal
    const line = nearestLine((a[1] + b[1]) / 2, HORIZONTAL_LINE_SNAP);
    const y = line === null ? a[1] : line;
    a = [a[0], y];
    b = [b[0], y];
  }
  return processStroke([a, b]);
}

// One pass of Chaikin corner cutting that keeps the first and last points:
// each segment is replaced by the points 1/4 and 3/4 along it.
export function chaikin(points) {
  if (points.length < 3) return points.map((p) => [...p]);
  const out = [[...points[0]]];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    out.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by], [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
  }
  out.push([...points[points.length - 1]]);
  return out;
}

// The Smooth button: SMOOTH_PASSES of chaikin(), then resampled like every
// recorded stroke (STROKE_POINTS evenly spaced points, 3 decimals).
// The first and last points do not move.
export function smooth(points, passes = SMOOTH_PASSES) {
  let pts = points;
  for (let i = 0; i < passes; i++) pts = chaikin(pts);
  return processStroke(pts);
}

// Join check: the gap from the end of stroke k to the start of stroke k + 1,
// and whether the one-stroke rule (JOIN_GAP, src/variants.js) would join them.
// null when there is no stroke k + 1 or either is a dot.
export function joinGap(strokes, k, gap = JOIN_GAP) {
  const a = strokes[k];
  const b = strokes[k + 1];
  if (!a || !b || a.kind !== 'line' || b.kind !== 'line') return null;
  const d = dist(a.points[a.points.length - 1], b.points[0]);
  return { gap: round3(d), joins: d <= gap };
}

// The default stroke order for a character, or null when there is none.
export const strokeOrderOf = (id) => STROKE_ORDER[id] ?? null;

// Saved characters whose number of strokes differs from the stroke-order list:
// [{ id, recorded, expected }], in CHAR_IDS order. Characters with no list are skipped.
export function strokeCountWarnings(saved, order = STROKE_ORDER) {
  const ids = [...CHAR_IDS.filter((id) => saved[id]), ...Object.keys(saved).filter((id) => !CHAR_IDS.includes(id))];
  const out = [];
  for (const id of ids) {
    const expected = order[id]?.strokes.length;
    const recorded = saved[id].strokes.length;
    if (expected !== undefined && recorded !== expected) out.push({ id, recorded, expected });
  }
  return out;
}

// The character's width: rightmost x plus leftmost x, so the right margin matches the left.
export function charWidth(strokes) {
  const xs = strokes.flatMap((s) => s.points.map((p) => p[0]));
  if (xs.length === 0) return 0;
  return round3(Math.max(...xs) + Math.min(...xs));
}

// The character file object (same fields as data/chars/L.example.json, minus picture and note).
export function buildCharacter(id, strokes, direction = 'ltr') {
  const isDigit = /^[0-9]$/.test(id);
  const char = { id, script: isDigit ? 'digit' : 'latin' };
  if (!isDigit) char.case = 'upper';
  char.family = strokeOrderOf(id)?.family ?? 'straight';
  char.direction = direction;
  char.width = charWidth(strokes);
  char.strokes = strokes.map((s) => ({ kind: s.kind, points: s.points.map(roundPoint) }));
  return char;
}

// One JSON bundle of every saved character, keyed by id, in CHAR_IDS order.
export function exportBundle(saved) {
  const ids = [...CHAR_IDS.filter((id) => saved[id]), ...Object.keys(saved).filter((id) => !CHAR_IDS.includes(id))];
  // Built as text, key by key: a JavaScript object would always put digit ids first.
  const body = ids.map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(saved[id], null, 2).replace(/\n/g, '\n  ')}`);
  const text = ids.length ? `{\n${body.join(',\n')}\n}` : '{}';
  // Keep each [x, y] point on one line so the bundle stays short enough to read.
  return text.replace(/\[\s+(-?[\d.e+-]+),\s+(-?[\d.e+-]+)\s+\]/g, '[$1, $2]');
}
