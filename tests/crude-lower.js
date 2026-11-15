// tests/crude-lower.js — lowercase letters as a 4-year-old writes them (Slice 9A).
// Not a test file itself: tests/lower.test.js uses it.
//
// Each letter starts from its model lines in an allowed stroke plan, then is
// made child-like: a wobbly line, a slight slant, a size that is not quite the
// model's (standing on the grass line, so it stays on the lines), and the
// slips children make with these letters: a round that does not quite close,
// a stick drawn a little away from its round, uneven arches, a tail that stops
// a little short. Deterministic (a seeded random source).

import { seeded, wobble, slant } from './crude-letters.js';

// The size she writes at, standing on the grass line (y = 1).
export const sizedOnGrass = (strokes, s, left = 0.08) => strokes.map((pts) => pts.map(([x, y]) => [left + (x - left) * s, 1 - (1 - y) * s]));
const move = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
// The first `share` of a stroke (a round that stops before it closes).
const shortOf = (pts, share) => pts.slice(0, Math.max(2, Math.round(pts.length * share)));

// Three hands: wobble (line units), slant (per unit of height) and size.
export const LOWER_HANDS = [
  { name: 'wobbly, leaning right, a little small', amp: 0.025, slant: 0.1, size: 0.88 },
  { name: 'wobbly, leaning left, a little big', amp: 0.03, slant: -0.07, size: 1.12 },
  { name: 'shaky, upright', amp: 0.02, slant: 0, size: 1 },
];

// A child's slip for some letters: (plan lines) -> plan lines. Applied to the default plan.
export const LOWER_SLIPS = {
  // The round stops short of closing (the last 12% left out); the stick a little to the right.
  a: (s) => [shortOf(s[0], 0.88), move(s[1], 0.04, 0)],
  d: (s) => [shortOf(s[0], 0.88), move(s[1], 0.04, 0)],
  g: (s) => [shortOf(s[0], 0.88), move(s[1], 0.03, 0)],
  q: (s) => [shortOf(s[0], 0.88), move(s[1], 0.04, 0)],
  // The round a little away from the stick.
  b: (s) => [s[0], move(s[1], 0.04, 0)],
  p: (s) => [s[0], move(s[1], 0.04, 0)],
  // An o that does not quite close.
  o: (s) => [shortOf(s[0], 0.9)],
  // m's second arch a little lower; h's and n's arch a little apart from the stick.
  m: (s) => [s[0], s[1].map(([x, y]) => [x, x > 0.5 ? y + 0.04 * (1 - y) : y])],
  h: (s) => [s[0], move(s[1], 0.03, 0)],
  n: (s) => [s[0], move(s[1], 0.03, 0)],
  // The tails stop a little short (still well below the grass).
  y: (s) => [s[0], shortOf(s[1], 0.9)],
  j: (s) => [shortOf(s[0], 0.93), s[1]],
  // t's bar a little high, f's bar a little low.
  t: (s) => [s[0], move(s[1], 0, -0.05)],
  f: (s) => [s[0], move(s[1], 0, 0.05)],
};

// Every crude letter: [{ id, plan, hand, slip, strokes }] for each allowed plan
// of each letter (`chars`: id -> character file), in each hand, with the
// letter's slip on its default plan too.
export function crudeLower(chars, planStrokesOf, hands = LOWER_HANDS, seed = 11) {
  const rnd = seeded(seed);
  const out = [];
  for (const [id, char] of Object.entries(chars)) {
    const plans = planStrokesOf(char);
    plans.forEach((lines, plan) => {
      const versions = [{ slip: false, lines }];
      if (plan === 0 && LOWER_SLIPS[id]) versions.push({ slip: true, lines: LOWER_SLIPS[id](lines) });
      for (const v of versions) {
        for (const hand of hands) {
          // Dots (one point) are kept as taps, only moved by the size and slant.
          const sized = sizedOnGrass(v.lines, hand.size);
          const leaned = slant(sized, hand.slant);
          const shaky = wobble(leaned.filter((p) => p.length > 1), hand.amp, rnd);
          let k = 0;
          const strokes = leaned.map((p) => (p.length > 1 ? shaky[k++] : p));
          out.push({ id, plan, hand: hand.name, slip: v.slip, strokes });
        }
      }
    });
  }
  return out;
}
