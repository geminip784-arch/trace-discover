// glyph-points.js — pure functions only. No DOM, no storage.
// Turns the exact definitions in data/glyphs.js into character files: evenly
// spaced points in line units, rounded to 3 decimals, in the same format the
// recorder saves (src/recording.js buildCharacter).

import { resample, pathLength, dist } from './geometry.js';
import { buildCharacter, round3, joinGap, STROKE_POINTS } from './recording.js';

// Today's recordings put STROKE_POINTS (24) points on a full-height stem, so one
// point every 1/23 line units. Generated strokes keep that spacing: a longer
// stroke gets more points, and no stroke gets fewer than STROKE_POINTS.
export const POINT_SPACING = 1 / (STROKE_POINTS - 1);
export const MIN_POINTS = STROKE_POINTS;

const ARC_STEP_DEGREES = 0.25; // fine sampling of arcs before even spacing
const CORNER_DEGREES = 10;     // a turn sharper than this is a corner, kept exactly

// Fine points along one piece, in drawing order.
export function piecePoints(piece) {
  if (piece.type === 'line') return piece.points.map((p) => [...p]);
  if (piece.type === 'arc') {
    const { cx, cy, rx, ry, from, to } = piece;
    const steps = Math.max(8, Math.ceil(Math.abs(to - from) / ARC_STEP_DEGREES));
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
      out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return out;
  }
  throw new Error(`unknown piece type ${piece.type}`);
}

// One stroke's pieces joined end to end. Each piece must start where the one
// before it ended.
export function strokePath(stroke) {
  if (stroke.kind === 'dot') return [[...stroke.at]]; // a dot: its one target point
  const out = [];
  stroke.pieces.forEach((piece, i) => {
    const pts = piecePoints(piece);
    const last = out[out.length - 1];
    if (last && dist(last, pts[0]) > 1e-6) {
      throw new Error(`piece ${i + 1} starts ${dist(last, pts[0]).toFixed(4)} away from where piece ${i} ends`);
    }
    for (const p of pts) {
      const prev = out[out.length - 1];
      if (!prev || dist(prev, p) > 1e-9) out.push(p);
    }
  });
  return out;
}

// Indexes of the points where the path turns sharper than CORNER_DEGREES.
export function cornerIndexes(pts, degrees = CORNER_DEGREES) {
  const out = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
    const b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
    let turn = Math.abs(b - a) % (2 * Math.PI);
    if (turn > Math.PI) turn = 2 * Math.PI - turn;
    if ((turn * 180) / Math.PI > degrees) out.push(i);
  }
  return out;
}

// How many points a stroke of this length gets.
export const pointCount = (length) => Math.max(MIN_POINTS, Math.ceil(length / POINT_SPACING - 1e-9) + 1);

// Evenly spaced points along a fine path. Corners stay exactly where they are:
// the path is cut at each corner and every piece between corners is spaced
// evenly, with its share of the points.
export function spacedPoints(pts) {
  const cuts = [0, ...cornerIndexes(pts), pts.length - 1];
  const runs = [];
  for (let i = 1; i < cuts.length; i++) runs.push(pts.slice(cuts[i - 1], cuts[i] + 1));
  const lengths = runs.map(pathLength);
  const total = lengths.reduce((a, b) => a + b, 0);
  const gaps = pointCount(total) - 1;
  // Share the gaps between the runs by length (largest remainder), at least 1 each.
  const exact = lengths.map((l) => (l / total) * gaps);
  const share = exact.map((e) => Math.max(1, Math.floor(e)));
  let left = gaps - share.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => [e - Math.floor(e), i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; left > 0; j = (j + 1) % order.length, left--) share[order[j][1]]++;
  const out = [];
  runs.forEach((run, i) => {
    const r = resample(run, share[i] + 1);
    r[r.length - 1] = [...run[run.length - 1]]; // land exactly on the corner
    out.push(...(i === 0 ? r : r.slice(1)));
  });
  return out;
}

const roundPoint = ([x, y]) => [round3(x), round3(y)];

// One generated stroke: { kind, part, points } (part: its short name for the
// parent-facing lines; recorded files have none).
// A dot stroke (the dot of i and j) keeps its single point.
const strokeFile = (s) => (s.kind === 'dot'
  ? { kind: 'dot', part: s.part, points: [roundPoint(s.at)] }
  : { kind: 'line', part: s.part, points: spacedPoints(strokePath(s)).map(roundPoint) });

// The character file object for one glyph: the recorder's format, with each
// stroke's part name, plus anyOrder (before strokes) when the glyph has one,
// and its other stroke plans (Slice 5J, after strokes) when it has any.
export function glyphCharacter(id, glyph) {
  const strokes = glyph.strokes.map(strokeFile);
  const built = buildCharacter(id, strokes);
  const { strokes: plain, ...head } = built;
  const out = { ...head };
  if (glyph.anyOrder) out.anyOrder = glyph.anyOrder;
  out.strokes = plain.map((st, k) => ({ kind: st.kind, part: strokes[k].part, points: st.points }));
  if (glyph.plans?.length) out.plans = glyph.plans.map((plan) => ({ strokes: plan.map(strokeFile) }));
  return out;
}

// The file text: 2-space JSON, each [x, y] point and the anyOrder groups on one line.
export function characterText(char) {
  let text = JSON.stringify(char, null, 2);
  text = text.replace(/\[\s+(-?[\d.e+-]+),\s+(-?[\d.e+-]+)\s+\]/g, '[$1, $2]');
  text = text.replace(/"anyOrder": \[[^\]]*?\]\s*\]/s, (m) => m.replace(/\s+/g, '').replace('"anyOrder":', '"anyOrder": ').replace(/,/g, ', '));
  return `${text}\n`;
}

// Join gaps for every pair of strokes: [{ gap, joins }] (src/recording.js joinGap),
// where joins says the one-stroke rule lets her draw stroke k and k + 1 in one go.
// A pair with a dot in it (i, j) never joins: { gap: null, joins: false }.
export const joinGaps = (char) => char.strokes.slice(0, -1).map((_, k) => joinGap(char.strokes, k) ?? { gap: null, joins: false });
