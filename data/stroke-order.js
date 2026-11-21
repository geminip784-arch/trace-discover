// data/stroke-order.js — the default stroke order for every character the recorder offers.
// These are defaults drafted from a written table; the school's letter chart may replace them.
// The rough paths follow the exact shapes in data/glyphs.js (tests/glyphs.test.js checks
// that they start in the same place and run the same way).
//
// Per character:
//   family  'straight', 'curved' or 'mixed' (written into the character file on save)
//   width   rough width in line units (the recorder sizes its dashed box to it)
//   strokes in drawing order; each { say, path }:
//     say   the stroke in words, for the parent
//     path  a rough path in line units (y = 0 sky line, 0.5 fence, 1 grass line),
//           only for the small reference picture. Never used for scoring.

// Points round an ellipse centred (cx, cy). Angles in degrees on screen:
// 0 = right, 90 = down, 180 = left, 270 (or -90) = up. Increasing angles go
// clockwise on screen, decreasing angles go anticlockwise.
function arc(cx, cy, rx, ry, from, to, steps = 16) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    pts.push([Math.round((cx + rx * Math.cos(a)) * 1000) / 1000, Math.round((cy + ry * Math.sin(a)) * 1000) / 1000]);
  }
  return pts;
}

// Join path pieces end to end, dropping a point that repeats the one before it.
function join(...pieces) {
  const out = [];
  for (const p of pieces.flat()) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 1e-6) out.push(p);
  }
  return out;
}

const s = (say, ...pieces) => ({ say, path: join(...pieces) });

import { NUMBER_IDS, numberShift, MARGIN, URDU_GLYPHS, piecePath } from './glyphs.js';

export const STROKE_ORDER = {
  A: { family: 'straight', width: 0.8, strokes: [
    s('slant from the top down to the bottom left', [[0.4, 0], [0.08, 1]]),
    s('slant from the top down to the bottom right', [[0.4, 0], [0.72, 1]]),
    s('crossbar left to right across the middle', [[0.24, 0.5], [0.56, 0.5]]),
  ] },
  B: { family: 'mixed', width: 0.8, strokes: [
    s('stem down', [[0.08, 0], [0.08, 1]]),
    s('from the top of the stem: upper bump round to the middle, then lower bump round to the bottom',
      [[0.08, 0], [0.41, 0]], arc(0.41, 0.25, 0.25, 0.25, -90, 90, 10), [[0.08, 0.5], [0.47, 0.5]],
      arc(0.47, 0.75, 0.25, 0.25, -90, 90, 10), [[0.08, 1]]),
  ] },
  C: { family: 'curved', width: 1.01, strokes: [
    s('one curve from the top right, round anticlockwise through the left, ending bottom right',
      arc(0.58, 0.5, 0.5, 0.5, -45, -315, 24)),
  ] },
  D: { family: 'mixed', width: 0.8, strokes: [
    s('stem down', [[0.08, 0], [0.08, 1]]),
    s('from the top of the stem, one big curve round to the bottom of the stem',
      [[0.08, 0], [0.22, 0]], arc(0.22, 0.5, 0.5, 0.5, -90, 90, 16), [[0.08, 1]]),
  ] },
  E: { family: 'straight', width: 0.66, strokes: [
    s('stem down', [[0.08, 0], [0.08, 1]]),
    s('top bar left to right', [[0.08, 0], [0.58, 0]]),
    s('middle bar left to right', [[0.08, 0.5], [0.5, 0.5]]),
    s('bottom bar left to right', [[0.08, 1], [0.58, 1]]),
  ] },
  F: { family: 'straight', width: 0.66, strokes: [
    s('stem down', [[0.08, 0], [0.08, 1]]),
    s('top bar left to right', [[0.08, 0], [0.58, 0]]),
    s('middle bar left to right', [[0.08, 0.5], [0.5, 0.5]]),
  ] },
  G: { family: 'mixed', width: 1.16, strokes: [
    s('C-curve from the top right, continuing up to the middle on the right',
      arc(0.58, 0.5, 0.5, 0.5, -45, -360, 26)),
    s('short bar from the middle inward, right to left', [[1.08, 0.5], [0.78, 0.5]]),
  ] },
  H: { family: 'straight', width: 0.8, strokes: [
    s('left stem down', [[0.08, 0], [0.08, 1]]),
    s('right stem down', [[0.72, 0], [0.72, 1]]),
    s('crossbar across the middle', [[0.08, 0.5], [0.72, 0.5]]),
  ] },
  I: { family: 'straight', width: 0.16, strokes: [
    s('one line down', [[0.08, 0], [0.08, 1]]),
  ] },
  J: { family: 'mixed', width: 0.66, strokes: [
    s('down from the top, curving round to the left at the bottom',
      [[0.58, 0], [0.58, 0.75]], arc(0.33, 0.75, 0.25, 0.25, 0, 180, 12)),
  ] },
  K: { family: 'straight', width: 0.8, strokes: [
    s('stem down', [[0.08, 0], [0.08, 1]]),
    s('arm from the top right in to the middle of the stem', [[0.72, 0], [0.08, 0.5]]),
    s('leg from the same point on the stem out to the bottom right', [[0.08, 0.5], [0.72, 1]]),
  ] },
  L: { family: 'straight', width: 0.66, strokes: [
    s('stem down', [[0.08, 0], [0.08, 1]]),
    s('foot left to right', [[0.08, 1], [0.58, 1]]),
  ] },
  M: { family: 'straight', width: 1, strokes: [
    s('left stem down', [[0.08, 0], [0.08, 1]]),
    s('from the top left: slant down to the middle bottom, up to the top right, down the right side',
      [[0.08, 0], [0.5, 1], [0.92, 0], [0.92, 1]]),
  ] },
  N: { family: 'straight', width: 0.8, strokes: [
    s('left stem down', [[0.08, 0], [0.08, 1]]),
    s('from the top left: slant down to the bottom right, then up the right side',
      [[0.08, 0], [0.72, 1], [0.72, 0]]),
  ] },
  O: { family: 'curved', width: 1.16, strokes: [
    s('one circle from the top, anticlockwise (left first), back to the top',
      arc(0.58, 0.5, 0.5, 0.5, -90, -450, 32)),
  ] },
  P: { family: 'mixed', width: 0.8, strokes: [
    s('stem down', [[0.08, 0], [0.08, 1]]),
    s('from the top of the stem, one bump round to the middle',
      [[0.08, 0], [0.47, 0]], arc(0.47, 0.25, 0.25, 0.25, -90, 90, 12), [[0.08, 0.5]]),
  ] },
  Q: { family: 'mixed', width: 1.16, strokes: [
    s('circle as O', arc(0.58, 0.5, 0.5, 0.5, -90, -450, 32)),
    s('short tail slanting down to the right from inside the bottom right', [[0.79, 0.71], [1.08, 1]]),
  ] },
  R: { family: 'mixed', width: 0.8, strokes: [
    s('stem down', [[0.08, 0], [0.08, 1]]),
    s('bump from the top round to the middle',
      [[0.08, 0], [0.47, 0]], arc(0.47, 0.25, 0.25, 0.25, -90, 90, 12), [[0.08, 0.5]]),
    s('leg slanting from the middle down to the bottom right', [[0.3, 0.5], [0.72, 1]]),
  ] },
  S: { family: 'curved', width: 0.66, strokes: [
    s('one curve from the top right, back over to the left, through the middle, round to the bottom left',
      arc(0.33, 0.25, 0.25, 0.25, -30, -270, 14), arc(0.33, 0.75, 0.25, 0.25, -90, 150, 14)),
  ] },
  T: { family: 'straight', width: 0.8, strokes: [
    s('stem down from the top middle (the bar first is also accepted)', [[0.4, 0], [0.4, 1]]),
    s('top bar left to right', [[0.08, 0], [0.72, 0]]),
  ] },
  U: { family: 'mixed', width: 0.8, strokes: [
    s('down the left, round the bottom, up the right',
      [[0.08, 0], [0.08, 0.68]], arc(0.4, 0.68, 0.32, 0.32, 180, 0, 16), [[0.72, 0]]),
  ] },
  V: { family: 'straight', width: 0.8, strokes: [
    s('slant down to the bottom middle and up to the top right', [[0.08, 0], [0.4, 1], [0.72, 0]]),
  ] },
  W: { family: 'straight', width: 1, strokes: [
    s('down, up to the middle, down, and up to the top right',
      [[0.08, 0], [0.29, 1], [0.5, 0], [0.71, 1], [0.92, 0]]),
  ] },
  X: { family: 'straight', width: 0.8, strokes: [
    s('slant from the top left down to the bottom right', [[0.08, 0], [0.72, 1]]),
    s('slant from the top right down to the bottom left', [[0.72, 0], [0.08, 1]]),
  ] },
  Y: { family: 'straight', width: 0.8, strokes: [
    s('short slant from the top left in to the middle', [[0.08, 0], [0.4, 0.5]]),
    s('slant from the top right in to the middle, then straight down to the bottom',
      [[0.72, 0], [0.4, 0.5], [0.4, 1]]),
  ] },
  Z: { family: 'straight', width: 0.8, strokes: [
    s('across the top, slant down to the bottom left, across the bottom',
      [[0.08, 0], [0.72, 0], [0.08, 1], [0.72, 1]]),
  ] },
  // Lowercase (Slice 9A). Small letters sit between the fence (0.5) and the
  // grass (1); tall letters reach the sky; tails reach the tail line (1.5).
  a: { family: 'mixed', width: 0.66, strokes: [
    s('round: from the top right, anticlockwise all the way round', arc(0.33, 0.75, 0.25, 0.25, -45, -360, 20)),
    s('stick down the right side, fence to grass', [[0.58, 0.5], [0.58, 1]]),
  ] },
  b: { family: 'mixed', width: 0.66, strokes: [
    s('tall stick down, sky to grass', [[0.08, 0], [0.08, 1]]),
    s('from the middle of the stick, up and round clockwise', arc(0.33, 0.75, 0.25, 0.25, 180, 540, 24)),
  ] },
  c: { family: 'curved', width: 0.587, strokes: [
    s('one curve from the top right, round anticlockwise, ending bottom right', arc(0.33, 0.75, 0.25, 0.25, -45, -315, 18)),
  ] },
  d: { family: 'mixed', width: 0.66, strokes: [
    s('round: from the top right, anticlockwise all the way round', arc(0.33, 0.75, 0.25, 0.25, -45, -360, 20)),
    s('tall stick down the right side, sky to grass', [[0.58, 0], [0.58, 1]]),
  ] },
  e: { family: 'curved', width: 0.66, strokes: [
    s('bar across the middle, left to right, then round anticlockwise, open at the bottom right',
      [[0.08, 0.75], [0.58, 0.75]], arc(0.33, 0.75, 0.25, 0.25, 0, -315, 20)),
  ] },
  f: { family: 'mixed', width: 0.647, strokes: [
    s('hook over the top from the right, then down to the grass', arc(0.42, 0.17, 0.17, 0.17, -30, -180, 10), [[0.25, 1]]),
    s('bar across the fence, left to right', [[0.08, 0.5], [0.48, 0.5]]),
  ] },
  g: { family: 'mixed', width: 0.66, strokes: [
    s('round: from the top right, anticlockwise all the way round', arc(0.33, 0.75, 0.25, 0.25, -45, -360, 20)),
    s('stick down the right side below the grass, hooking left at the tail line',
      [[0.58, 0.5], [0.58, 1.25]], arc(0.33, 1.25, 0.25, 0.25, 0, 180, 12)),
  ] },
  h: { family: 'mixed', width: 0.66, strokes: [
    s('tall stick down, sky to grass', [[0.08, 0], [0.08, 1]]),
    s('from the stick, up and over the arch, down to the grass', arc(0.33, 0.75, 0.25, 0.25, 180, 360, 12), [[0.58, 1]]),
  ] },
  i: { family: 'straight', width: 0.16, strokes: [
    s('stick down, fence to grass', [[0.08, 0.5], [0.08, 1]]),
    s('the dot: a tap above the stick', [[0.08, 0.25]]),
  ] },
  j: { family: 'mixed', width: 0.56, strokes: [
    s('stick down from the fence below the grass, hooking left at the tail line',
      [[0.48, 0.5], [0.48, 1.3]], arc(0.28, 1.3, 0.2, 0.2, 0, 180, 12)),
    s('the dot: a tap above the stick', [[0.48, 0.25]]),
  ] },
  k: { family: 'straight', width: 0.56, strokes: [
    s('tall stick down, sky to grass', [[0.08, 0], [0.08, 1]]),
    s('arm from the fence on the right in to the stick', [[0.48, 0.5], [0.08, 0.75]]),
    s('leg from the same point out to the grass on the right', [[0.08, 0.75], [0.48, 1]]),
  ] },
  l: { family: 'straight', width: 0.16, strokes: [
    s('tall stick down, sky to grass', [[0.08, 0], [0.08, 1]]),
  ] },
  m: { family: 'mixed', width: 1, strokes: [
    s('stick down, fence to grass', [[0.08, 0.5], [0.08, 1]]),
    s('from the stick: up and over, down, back up, over again, down',
      arc(0.29, 0.71, 0.21, 0.21, 180, 360, 10), [[0.5, 1], [0.5, 0.71]], arc(0.71, 0.71, 0.21, 0.21, 180, 360, 10), [[0.92, 1]]),
  ] },
  n: { family: 'mixed', width: 0.66, strokes: [
    s('stick down, fence to grass', [[0.08, 0.5], [0.08, 1]]),
    s('from the stick, up and over the arch, down to the grass', arc(0.33, 0.75, 0.25, 0.25, 180, 360, 12), [[0.58, 1]]),
  ] },
  o: { family: 'curved', width: 0.66, strokes: [
    s('one circle from the top, anticlockwise, back to the top', arc(0.33, 0.75, 0.25, 0.25, -90, -450, 24)),
  ] },
  p: { family: 'mixed', width: 0.66, strokes: [
    s('stick down from the fence to the tail line', [[0.08, 0.5], [0.08, 1.5]]),
    s('from the middle of the stick, up and round clockwise', arc(0.33, 0.75, 0.25, 0.25, 180, 540, 24)),
  ] },
  q: { family: 'mixed', width: 0.66, strokes: [
    s('round: from the top right, anticlockwise all the way round', arc(0.33, 0.75, 0.25, 0.25, -45, -360, 20)),
    s('stick down the right side from the fence to the tail line', [[0.58, 0.5], [0.58, 1.5]]),
  ] },
  r: { family: 'mixed', width: 0.587, strokes: [
    s('stick down, fence to grass', [[0.08, 0.5], [0.08, 1]]),
    s('from the stick, up and over a short shoulder', arc(0.33, 0.75, 0.25, 0.25, 180, 315, 10)),
  ] },
  s: { family: 'curved', width: 0.41, strokes: [
    s('one curve from the top right, back over to the left, through the middle, round to the bottom left',
      arc(0.205, 0.625, 0.125, 0.125, -30, -270, 12), arc(0.205, 0.875, 0.125, 0.125, -90, 150, 12)),
  ] },
  t: { family: 'straight', width: 0.56, strokes: [
    s('stick down from a little below the sky to the grass', [[0.28, 0.2], [0.28, 1]]),
    s('bar across the fence, left to right', [[0.08, 0.5], [0.48, 0.5]]),
  ] },
  u: { family: 'mixed', width: 0.66, strokes: [
    s('down from the fence, round the bottom, up to the fence', [[0.08, 0.5], [0.08, 0.75]], arc(0.33, 0.75, 0.25, 0.25, 180, 0, 12), [[0.58, 0.5]]),
    s('stick down the right side, fence to grass', [[0.58, 0.5], [0.58, 1]]),
  ] },
  v: { family: 'straight', width: 0.66, strokes: [
    s('slant down to the grass in the middle, and up to the fence on the right', [[0.08, 0.5], [0.33, 1], [0.58, 0.5]]),
  ] },
  w: { family: 'straight', width: 0.88, strokes: [
    s('down, up to the fence in the middle, down, and up to the fence on the right',
      [[0.08, 0.5], [0.26, 1], [0.44, 0.5], [0.62, 1], [0.8, 0.5]]),
  ] },
  x: { family: 'straight', width: 0.66, strokes: [
    s('slant from the top left down to the bottom right', [[0.08, 0.5], [0.58, 1]]),
    s('slant from the top right down to the bottom left', [[0.58, 0.5], [0.08, 1]]),
  ] },
  y: { family: 'straight', width: 0.66, strokes: [
    s('short slant from the fence on the left down to the grass in the middle', [[0.08, 0.5], [0.33, 1]]),
    s('long slant from the fence on the right, through the same point, down to the tail line', [[0.58, 0.5], [0.33, 1], [0.08, 1.5]]),
  ] },
  z: { family: 'straight', width: 0.66, strokes: [
    s('across the fence, slant down to the bottom left, across the grass', [[0.08, 0.5], [0.58, 0.5], [0.08, 1], [0.58, 1]]),
  ] },
  0: { family: 'curved', width: 0.66, strokes: [
    s('one oval from the top, anticlockwise, back to the top', arc(0.33, 0.5, 0.25, 0.5, -90, -450, 28)),
  ] },
  1: { family: 'straight', width: 0.38, strokes: [
    s('short flag slanting up to the top', [[0.08, 0.2], [0.3, 0]]),
    s('stem down', [[0.3, 0], [0.3, 1]]),
  ] },
  2: { family: 'mixed', width: 0.66, strokes: [
    s('curve over from the top left, slant down to the bottom left, then across the bottom',
      arc(0.33, 0.25, 0.25, 0.25, 200, 396.87, 14), [[0.08, 1], [0.58, 1]]),
  ] },
  3: { family: 'curved', width: 0.68, strokes: [
    s('from the top left, round the upper bump to the middle, round the lower bump to the bottom left',
      arc(0.33, 0.25, 0.25, 0.25, 200, 450, 14), arc(0.33, 0.75, 0.25, 0.25, -90, 160, 14)),
  ] },
  4: { family: 'straight', width: 0.66, strokes: [
    s('stem down', [[0.46, 0], [0.46, 1]]),
    s('diagonal from the top of the stem down-left to the crossbar line', [[0.46, 0], [0.08, 0.7]]),
    s('crossbar left to right', [[0.08, 0.7], [0.58, 0.7]]),
  ] },
  5: { family: 'mixed', width: 0.65, strokes: [
    s('from the top left, down to the middle, then round the belly to the bottom left',
      [[0.1, 0], [0.1, 0.556]], arc(0.307, 0.73, 0.27, 0.27, 220, 510, 16)),
    s('flag across the top, left to right', [[0.1, 0], [0.58, 0]]),
  ] },
  6: { family: 'curved', width: 0.66, strokes: [
    s('from the top right, curve down the left side and round into a loop at the bottom',
      arc(0.33, 0.75, 0.25, 0.75, -70, -180, 10), arc(0.33, 0.75, 0.25, 0.25, 180, -180, 24)),
  ] },
  7: { family: 'straight', width: 0.66, strokes: [
    s('top bar left to right', [[0.08, 0], [0.58, 0]]),
    s('slant down to the bottom left', [[0.58, 0], [0.24, 1]]),
  ] },
  8: { family: 'curved', width: 0.7, strokes: [
    s('from the top right, curve left and down into an S, then back up to the start',
      arc(0.35, 0.23, 0.23, 0.23, -30, -270, 14), arc(0.35, 0.73, 0.27, 0.27, -90, 270, 22),
      arc(0.35, 0.23, 0.23, 0.23, 90, -30, 8)),
  ] },
  9: { family: 'mixed', width: 0.66, strokes: [
    s('small circle at the top, anticlockwise', arc(0.33, 0.25, 0.25, 0.25, 0, -360, 20)),
    s('stem down the right side', [[0.58, 0], [0.58, 1]]),
  ] },
};

// Numbers 10 to 20 (Slice 9B): the left digit's strokes, then the right digit's,
// moved right as data/glyphs.js moves them. Family: the digits' own when they
// share one, otherwise mixed.
for (const id of NUMBER_IDS) {
  const [left, right] = id.split('').map((d) => STROKE_ORDER[d]);
  const dx = numberShift(id);
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const strokes = [
    ...left.strokes.map((st) => ({ say: `the ${id[0]}: ${st.say}`, path: st.path })),
    ...right.strokes.map((st) => ({ say: `the ${id[1]}: ${st.say}`, path: st.path.map(([x, y]) => [r3(x + dx), y]) })),
  ];
  // Width as a character file measures it: rightmost x plus the left margin.
  const width = r3(Math.max(...strokes.flatMap((st) => st.path.map((q) => q[0]))) + MARGIN);
  STROKE_ORDER[id] = { family: left.family === right.family ? left.family : 'mixed', width, strokes };
}

// ---- Urdu (Slice 10B) ----
// The words for each stroke of each letter's default plan, right to left. The
// rough paths, family and width are read from data/glyphs.js (URDU_GLYPHS), so
// they always match the shapes. A dot's path is its one point.
const BE = 'body: from the right tip down, along the grass line to the left, up to the left tip';
const JEEM = 'head from its left end along the top to the right, then the tail back down to the left, round below the grass and out to the right';
const DAL = 'from the top, slant down to the right, round and back along the grass line to the left';
const RE = 'from the top, slant down to the right, then curve below the grass to the left';
const SEEN = 'three teeth from the right, then down into the bowl and up to the left tip';
const SUAD = 'the loop from its lower left, up and round to the right and back along the grass line, then up to the tooth, down, and round the bowl to the left tip';
const TOE = ['body: from the left tip along the grass line to the right, round the top and back down', 'stem from the sky line down to the body'];
const AIN = 'small head from its top right, round to the left and back to the arm, then the tail down to the left, round below the grass and out to the right';
const KAF = 'the slant from the top right down to the left, then round and back along the grass line to the left tip';
const T_MARK = 'small ṭ above: a short stem down, then a little loop';
const THREE = (where) => [`dot ${where}, on the right`, `dot ${where}, on the left`, `dot ${where}, ${where === 'below' ? 'under' : 'on top of'} the other two`];
const URDU_SAY = {
  'ur-alif-madd': ['alif from just below the sky line straight down to the grass line', 'madd: a small wave above, right to left'],
  'ur-alif': ['alif from the sky line straight down to the grass line'],
  'ur-be': [BE, 'one dot below'],
  'ur-pe': [BE, ...THREE('below')],
  'ur-te': [BE, 'dot above, on the right', 'dot above, on the left'],
  'ur-tte': [BE, T_MARK],
  'ur-se': [BE, ...THREE('above')],
  'ur-jeem': [JEEM, 'one dot inside'],
  'ur-che': [JEEM, 'dot inside, on the right', 'dot inside, on the left', 'dot inside, under the other two'],
  'ur-bari-he': [JEEM],
  'ur-khe': [JEEM, 'one dot above the head'],
  'ur-dal': [DAL],
  'ur-ddal': [DAL, T_MARK],
  'ur-zal': [DAL, 'one dot above'],
  'ur-re': [RE],
  'ur-rre': [RE, T_MARK],
  'ur-ze': [RE, 'one dot above'],
  'ur-zhe': [RE, ...THREE('above')],
  'ur-seen': [SEEN],
  'ur-sheen': [SEEN, ...THREE('above')],
  'ur-suad': [SUAD],
  'ur-zuad': [SUAD, 'one dot above'],
  'ur-toe': TOE,
  'ur-zoe': [...TOE, 'one dot above, right of the stem'],
  'ur-ain': [AIN],
  'ur-ghain': [AIN, 'one dot above'],
  'ur-fe': ['the loop from the grass side, up round and back, then along the grass line to the left tip', 'one dot above the loop'],
  'ur-qaf': ['the loop, then the deep bowl round to the left tip', 'dot above, on the right', 'dot above, on the left'],
  'ur-kaf': [KAF],
  'ur-gaf': [KAF, 'the second slant above, from the right down to the left'],
  'ur-lam': ['from the sky line down, round the bowl below the grass, up to the left tip'],
  'ur-meem': ['the round head from its left, over the top, round and back, then straight down the tail'],
  'ur-noon': ['from the right tip down round the deep bowl, up to the left tip', 'one dot above'],
  'ur-wao': ['the round head from its bottom, round to the left, over the top and down its right side into the tail curving left'],
  'ur-chhoti-he': ['from the small tip at the top, round to the right, down, and back along the grass line to close the loop'],
  'ur-do-chashmi-he': ['from the top middle round the right eye, back along the grass line, round the left eye, out to the tail at the left'],
  'ur-hamza': ['the small head from its top right, round and back to the right, then the bar from right to left'],
  'ur-chhoti-ye': ['from the top right, curve down to the left, back to the right, round the deep bowl, up to the left tip'],
  'ur-bari-ye': ['from the top right down to the left, then the long sweep back to the right, ending in a point'],
};
const r3 = (v) => Math.round(v * 1000) / 1000;
// About a dozen points along a stroke, for the small reference picture.
function roughPath(st) {
  if (st.kind === 'dot') return [st.at.map(r3)];
  const fine = st.pieces.flatMap((p, i) => (i === 0 ? piecePath(p) : piecePath(p).slice(1)));
  const step = Math.max(1, Math.floor(fine.length / 12));
  const pts = fine.filter((_, i) => i % step === 0);
  if (pts[pts.length - 1] !== fine[fine.length - 1]) pts.push(fine[fine.length - 1]);
  return pts.map(([x, y]) => [r3(x), r3(y)]);
}
for (const [id, glyph] of Object.entries(URDU_GLYPHS)) {
  const say = URDU_SAY[id];
  if (!say || say.length !== glyph.strokes.length) throw new Error(`stroke-order.js: ${id} needs ${glyph.strokes.length} stroke words`);
  const strokes = glyph.strokes.map((st, k) => ({ say: say[k], path: roughPath(st) }));
  const kinds = new Set(glyph.strokes.filter((st) => !st.kind).flatMap((st) => st.pieces.map((p) => (p.type === 'line' ? 'line' : 'round'))));
  const family = kinds.has('round') ? (kinds.has('line') ? 'mixed' : 'curved') : 'straight';
  const xs = glyph.strokes.flatMap((st) => (st.kind === 'dot' ? [st.at[0]] : st.pieces.flatMap((p) => piecePath(p).map(([x]) => x))));
  STROKE_ORDER[id] = { family, width: r3(Math.max(...xs) + MARGIN), strokes };
}

export const FAMILIES = ['straight', 'curved', 'mixed'];
