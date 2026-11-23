// tests/crude-urdu.js — Urdu letters as a 4-year-old writes them (Slice 10C).
// Not a test file itself: tests/urdu-copy.test.js uses it.
//
// Each letter starts from its model (every allowed plan), then is made
// child-like by a "hand": wobbly lines, a slant, squashed or stretched, a size
// that is not quite the model's, round corners (س's teeth as bumps), a shallow
// tail, and dots drawn as taps, small blobs or short dabs, a little off their
// place but on the right side. Deterministic (a seeded random source).

import { seeded, wobble, slant } from './crude-letters.js';

export { seeded };

const r3 = (v) => Math.round(v * 1000) / 1000;

// Round corners: each point moved towards the average of its neighbours
// (a window of `k` points either side), the ends kept.
function roundCorners(pts, k) {
  if (pts.length < 3) return pts;
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p;
    const a = Math.max(0, i - k);
    const b = Math.min(pts.length - 1, i + k);
    let x = 0; let y = 0;
    for (let j = a; j <= b; j++) { x += pts[j][0]; y += pts[j][1]; }
    return [x / (b - a + 1), y / (b - a + 1)];
  });
}

// A dot as she draws it: a tap, a small blob (a tiny circle) or a short dab.
function drawDot([x, y], kind, rnd) {
  const jx = (rnd() - 0.5) * 0.06;
  const jy = (rnd() - 0.5) * 0.04;
  const cx = x + jx; const cy = y + jy;
  if (kind === 'tap') return [[r3(cx), r3(cy)]];
  if (kind === 'blob') return Array.from({ length: 9 }, (_, i) => [r3(cx + 0.03 * Math.cos(i * 0.8)), r3(cy + 0.03 * Math.sin(i * 0.8))]);
  return [[r3(cx - 0.04), r3(cy + 0.01)], [r3(cx), r3(cy)], [r3(cx + 0.04), r3(cy - 0.01)]]; // a dab
}

// The hands: how each crude letter is drawn.
export const URDU_HANDS = [
  { name: 'wobbly', wobble: 0.025, slant: 0, sx: 1, sy: 1, round: 0, shallow: 1, dot: 'tap' },
  { name: 'slanted', wobble: 0.015, slant: 0.12, sx: 1, sy: 1, round: 0, shallow: 1, dot: 'blob' },
  { name: 'squashed and wide', wobble: 0.015, slant: 0, sx: 1.15, sy: 0.85, round: 2, shallow: 1, dot: 'dab' },
  { name: 'narrow and tall', wobble: 0.015, slant: -0.06, sx: 0.85, sy: 1.1, round: 0, shallow: 1, dot: 'tap' },
  { name: 'round corners, shallow tail', wobble: 0.02, slant: 0.05, sx: 1, sy: 1, round: 4, shallow: 0.75, dot: 'blob' },
];

// One crude copy of a plan (`strokes`: the character file's strokes of that plan)
// in one hand. Lines are made child-like; dots and marks keep their place
// relative to the body, so they stay on the right side.
export function crudeCopy(strokes, hand, seed) {
  const rnd = seeded(seed);
  const shape = (pts) => {
    let out = pts.map(([x, y]) => [x * hand.sx, y > 1 ? 1 + (y - 1) * hand.shallow : 1 - (1 - y) * hand.sy]);
    if (hand.round) out = roundCorners(out, hand.round);
    return out;
  };
  const lines = strokes.filter((s) => s.kind === 'line').map((s) => shape(s.points));
  const wobbled = slant(wobble(lines, hand.wobble, rnd), hand.slant);
  let li = 0;
  return strokes.map((s) => {
    if (s.kind === 'line') return wobbled[li++].map(([x, y]) => [r3(x), r3(y)]);
    const [x, y] = slant([shape(s.kind === 'dot' ? s.points : [mid(s.points)])], hand.slant)[0][0];
    if (s.kind === 'dot') return drawDot([x, y], hand.dot, rnd);
    // A mark: its own shape, a little wobbly (a tapped mark is tested on its own).
    const m = mid(s.points);
    return wobble([s.points.map(([px, py]) => [px - m[0] + x, py - m[1] + y])], 0.01, rnd)[0].map(([px, py]) => [r3(px), r3(py)]);
  });
}

const mid = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
