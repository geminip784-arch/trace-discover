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
    s('slant from the top right in to the middle of the stem', [[0.72, 0], [0.08, 0.5]]),
    s('slant from the middle out to the bottom right', [[0.24, 0.375], [0.72, 1]]),
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
    s('stem down from the top middle (either order is accepted)', [[0.4, 0], [0.4, 1]]),
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

export const FAMILIES = ['straight', 'curved', 'mixed'];
