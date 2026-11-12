// data/child-shapes.js — extra shapes for the copy-it round's recognizer
// (Slice 5J part 2). Each is a letter as a 4-year-old writes it, crudely but
// recognizably: M with its middle point stopping above the grass line, N with
// a short diagonal, W with a shallow middle, B with uneven bumps.
//
// They are only templates for shape judging (src/copy.js). They are never a
// track, a start dot, a stroke plan or the model card, and Jugnu never draws
// them: she always sees the model letter. A copy nearest a child shape is
// judged against it, part by part, as against the model.
//
// Line units, like data/glyphs.js: y = 0 sky line, 0.5 fence, 1 grass line.
// Stroke order and direction make no difference to $P; parts are named for the
// parent-facing lines ("Almost! The right leg is missing").

const m = 0.08;   // left margin (the stem)
const std = 0.72; // right edge of a standard letter
const wid = 0.92; // right edge of M and W
const mid = (m + wid) / 2;

// Straight lines through the key points.
const line = (...points) => points;
// Part of a circle or ellipse, from angle a0 to a1 (degrees on screen: 0 right, 90 down).
function arc(cx, cy, rx, ry, a0, a1, step = 6) {
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
}
const part = (name, points) => ({ part: name, points });

// M: the middle point stops at `d` (the model's reaches the grass line, 1).
const shallowM = (d) => [
  part('stem', line([m, 0], [m, 1])),
  part('first slant', line([m, 0], [mid, d])),
  part('second slant', line([mid, d], [wid, 0])),
  part('right stem', line([wid, 0], [wid, 1])),
];

export const CHILD_SHAPES = {
  M: [
    { name: 'middle at 0.6', strokes: shallowM(0.6) },
    { name: 'middle at 0.72', strokes: shallowM(0.72) },
    // Legs splayed out like a tent (the tops 0.08 in from the feet), the middle
    // point at 0.6. More splay than 0.08 lets the right leg stand in for a
    // missing second slant (tests/crude.test.js).
    { name: 'splayed, middle at 0.6', strokes: [
      part('stem', line([m + 0.08, 0], [m, 1])),
      part('first slant', line([m + 0.08, 0], [mid, 0.6])),
      part('second slant', line([mid, 0.6], [wid - 0.08, 0])),
      part('right stem', line([wid - 0.08, 0], [wid, 1])),
    ] },
  ],
  N: [
    // The diagonal stops at 0.8, and the right side goes up from there, short of the sky line.
    { name: 'short diagonal and right side', strokes: [
      part('stem', line([m, 0], [m, 1])),
      part('slant', line([m, 0], [std, 0.8])),
      part('right side', line([std, 0.8], [std, 0.12])),
    ] },
  ],
  W: [
    // The middle peak comes down only to 0.4.
    { name: 'middle at 0.4', strokes: [
      part('first V', line([m, 0], [0.29, 1], [mid, 0.4])),
      part('second V', line([mid, 0.4], [0.71, 1], [wid, 0])),
    ] },
  ],
  B: [
    // A small top bump down to 0.42, a big bottom bump below it.
    { name: 'small top bump, big bottom bump', strokes: [
      part('stem', line([m, 0], [m, 1])),
      part('top bump', [...line([m, 0], [0.3, 0]), ...arc(0.3, 0.21, 0.21, 0.21, -90, 90), ...line([0.3, 0.42], [m, 0.42])]),
      part('bottom bump', [...line([m, 0.42], [0.42, 0.42]), ...arc(0.42, 0.71, 0.29, 0.29, -90, 90), ...line([0.42, 1], [m, 1])]),
    ] },
  ],
};
