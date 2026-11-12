// tests/crude-letters.js — letters as a 4-year-old writes them (Slice 5J part 2).
// Not a test file itself: tests/crude.test.js and tools/crude-report.js use it.
//
// Each letter is drawn from its key points, the way she draws it, then made
// child-like: wobbly lines, uneven heights, a slight slant, a size that is not
// quite the model's, and the parts children leave short (M's middle point
// stopping above the grass line, N's diagonal stopping short, uneven bumps...).
// Everything is deterministic (a seeded random source), so every run draws
// exactly the same letters.

const m = 0.08;   // left margin (the stem)
const std = 0.72; // right edge of a standard letter
const nar = 0.58; // right edge of a narrow letter
const wid = 0.92; // right edge of M and W

// A deterministic random source.
export function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// Straight lines through the key points, a point every 0.02 line units.
export function poly(...pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.02));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

// Part of an ellipse, from angle a0 to a1 (degrees on screen: 0 right, 90 down).
export function bow(cx, cy, rx, ry, a0, a1) {
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 6));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
}
const join = (...parts) => parts.flat();

// A wobbly hand: the line drifts slowly off its course (up to `amp`) and shakes a little.
export function wobble(strokes, amp, rnd) {
  return strokes.map((pts) => {
    const phase = rnd() * 6;
    let along = 0;
    return pts.map(([x, y], i) => {
      if (i > 0) along += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
      return [x + amp * Math.sin(along * 9 + phase) + 0.01 * (rnd() - 0.5), y + amp * Math.cos(along * 7 + phase) + 0.01 * (rnd() - 0.5)];
    });
  });
}

// A slant: the top leans right by `k` line units for each unit of height.
export const slant = (strokes, k) => strokes.map((pts) => pts.map(([x, y]) => [x + k * (1 - y), y]));
// A size that is not the model's, standing on the grass line.
export const sized = (strokes, s) => strokes.map((pts) => pts.map(([x, y]) => [m + (x - m) * s, 1 - (1 - y) * s]));

// The crude letters: { id, name, strokes } before the hand is applied. `d` is
// how far down M's middle point (or W's middle peak) comes, and so on.
export const SHAPES = {
  M: [
    ...[0.55, 0.65, 0.75].map((d) => ({ name: `one stroke from the bottom, middle at ${d}`, strokes: [poly([m, 1], [m, 0.04], [0.5, d], [wid - 0.02, 0.08], [wid, 1])] })),
    ...[0.6, 0.7].map((d) => ({ name: `stem, then the rest, middle at ${d}`, strokes: [poly([m, 0], [m, 1]), poly([m, 0], [0.5, d], [wid, 0], [wid, 0.95])] })),
    { name: 'four strokes, middle at 0.65, right leg short', strokes: [poly([m, 0], [m, 1]), poly([m, 0], [0.48, 0.65]), poly([0.48, 0.65], [wid, 0.05]), poly([wid, 0.05], [wid, 0.85])] },
    { name: 'splayed legs, middle at 0.6', strokes: [poly([0, 1], [0.18, 0], [0.5, 0.6], [0.82, 0], [1, 1])] },
    { name: 'uneven peaks, middle at 0.7', strokes: [poly([m, 1], [m, 0], [0.45, 0.7], [wid, 0.15], [wid + 0.03, 1])] },
  ],
  N: [
    { name: 'one stroke from the bottom', strokes: [poly([m, 1], [m, 0.03], [std, 0.97], [std, 0.02])] },
    { name: 'diagonal stops at 0.8, right side short', strokes: [poly([m, 1], [m, 0], [std - 0.02, 0.8], [std, 0.15])] },
    { name: 'stem, then the rest, right side tall', strokes: [poly([m, 0.05], [m, 1]), poly([m, 0.05], [std, 1], [std + 0.02, -0.08])] },
    { name: 'three strokes, uneven', strokes: [poly([m, 0], [m, 0.95]), poly([m, 0], [std - 0.04, 0.9]), poly([std - 0.04, 0.9], [std, 0.1])] },
  ],
  W: [
    ...[0.3, 0.45].map((d) => ({ name: `one stroke, middle peak down to ${d}`, strokes: [poly([m, 0], [0.29, 1], [0.5, d], [0.71, 1], [wid, 0])] })),
    { name: 'uneven valleys and tops', strokes: [poly([m, 0.05], [0.27, 0.95], [0.5, 0.2], [0.73, 1], [wid + 0.02, -0.05])] },
    { name: 'two Vs, middle at 0.35', strokes: [poly([m, 0], [0.29, 1], [0.5, 0.35]), poly([0.5, 0.35], [0.71, 1], [wid, 0])] },
  ],
  K: [
    { name: 'arm and leg meet at 0.6', strokes: [poly([m, 0], [m, 1]), poly([std, 0], [m, 0.6]), poly([m, 0.6], [std, 1])] },
    { name: 'the "<" in one, apart from the stem', strokes: [poly([m, 0], [m, 1]), poly([std, 0.05], [m + 0.07, 0.5], [std, 1])] },
    { name: 'leg from the middle of the arm', strokes: [poly([m, 0], [m, 1]), poly([std, 0], [m, 0.5]), poly([0.3, 0.35], [std, 1])] },
    { name: 'short arm, long leg', strokes: [poly([m, 0], [m, 1]), poly([std - 0.1, 0.1], [m, 0.45]), poly([m, 0.45], [std + 0.05, 1])] },
  ],
  R: [
    { name: 'big bump, down to 0.6', strokes: [poly([m, 0], [m, 1]), join(poly([m, 0], [0.4, 0]), bow(0.4, 0.3, 0.3, 0.3, -90, 90), poly([0.4, 0.6], [m, 0.6])), poly([0.3, 0.6], [std, 1])] },
    { name: 'small bump, down to 0.4', strokes: [poly([m, 0], [m, 1]), join(poly([m, 0], [0.4, 0]), bow(0.4, 0.2, 0.2, 0.2, -90, 90), poly([0.4, 0.4], [m, 0.4])), poly([0.25, 0.4], [std, 1])] },
    { name: 'leg from the stem', strokes: [poly([m, 0], [m, 1]), join(poly([m, 0], [0.47, 0]), bow(0.47, 0.25, 0.25, 0.25, -90, 90), poly([0.47, 0.5], [m, 0.5])), poly([m, 0.5], [std, 1])] },
    { name: 'bump and leg in one, round bump', strokes: [poly([m, 0], [m, 1]), join(poly([m, 0], [0.35, 0]), bow(0.35, 0.26, 0.28, 0.26, -90, 90), poly([0.35, 0.52], [0.22, 0.52], [std, 1]))] },
  ],
  B: [
    { name: 'small top bump, big bottom bump', strokes: [poly([m, 0], [m, 1]), join(poly([m, 0], [0.3, 0]), bow(0.3, 0.2, 0.2, 0.2, -90, 90), poly([0.3, 0.4], [m, 0.4], [0.4, 0.4]), bow(0.4, 0.7, 0.3, 0.3, -90, 90), poly([0.4, 1], [m, 1]))] },
    { name: 'bumps one at a time, not back to the stem', strokes: [poly([m, 0], [m, 1]), join(poly([m, 0], [0.38, 0]), bow(0.38, 0.25, 0.25, 0.25, -90, 90), poly([0.38, 0.5], [m + 0.08, 0.5])), join(poly([m + 0.05, 0.5], [0.45, 0.5]), bow(0.45, 0.75, 0.25, 0.25, -90, 90), poly([0.45, 1], [m + 0.06, 1]))] },
    { name: 'round bumps, uneven', strokes: [poly([m, 0], [m, 1]), join(bow(m, 0.23, 0.36, 0.23, -90, 90), bow(m, 0.73, 0.5, 0.27, -90, 90))] },
  ],
  E: [
    { name: 'uneven bars, middle bar at 0.45', strokes: [poly([m, 0], [m, 1]), poly([m, 0], [0.5, 0.02]), poly([m, 0.45], [0.38, 0.45]), poly([m, 1], [0.6, 0.98])] },
    { name: 'L first, then top and middle', strokes: [poly([m, 0], [m, 1], [nar + 0.04, 1]), poly([m, 0], [nar - 0.06, 0]), poly([m, 0.55], [nar - 0.1, 0.55])] },
    { name: 'bars not touching the stem', strokes: [poly([m, 0], [m, 1]), poly([m + 0.05, 0.02], [nar, 0]), poly([m + 0.05, 0.5], [nar - 0.05, 0.52]), poly([m + 0.05, 0.98], [nar, 1])] },
    { name: 'long middle bar, short top', strokes: [poly([m, 0], [m, 1]), poly([m, 0], [0.42, 0]), poly([m, 0.5], [nar, 0.5]), poly([m, 1], [nar, 1])] },
  ],
};

// The hands each shape is drawn in: a wobble, a slant and a size.
export const HANDS = [
  { name: 'steady', amp: 0.012, slant: 0, size: 1 },
  { name: 'wobbly', amp: 0.03, slant: 0, size: 0.95 },
  { name: 'slanted right', amp: 0.02, slant: 0.12, size: 1.05 },
  { name: 'slanted left, small', amp: 0.02, slant: -0.08, size: 0.88 },
];

// Every crude letter: { id, name, hand, strokes }.
export function crudeLetters(ids = Object.keys(SHAPES), hands = HANDS) {
  const out = [];
  let seed = 7;
  for (const id of ids) {
    for (const shape of SHAPES[id]) {
      for (const hand of hands) {
        const rnd = seeded((seed += 101));
        const strokes = sized(slant(wobble(shape.strokes, hand.amp, rnd), hand.slant), hand.size);
        out.push({ id, name: shape.name, hand: hand.name, strokes });
      }
    }
  }
  return out;
}
