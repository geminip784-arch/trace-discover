// data/glyphs.js — exact definitions of every capital A to Z and digit 0 to 9,
// in a ball-and-stick school print style. `npm run glyphs` turns them into
// data/chars/<id>.json (tools/make-glyphs.js). Do not hand-edit those files.
//
// Line units: y = 0 sky line, 0.5 fence, 1 grass line. x = 0 is the left edge
// of the character box. Every character starts at the same left margin, and the
// file's width is rightmost x + leftmost x, so the right margin matches.
//
// Each stroke is a list of pieces drawn end to end, in drawing order:
//   line(p0, p1, ...)                 straight lines through the points
//   arc(cx, cy, rx, ry, from, to)     part of a circle (rx = ry) or ellipse.
//                                     Angles in degrees on screen: 0 = right,
//                                     90 = down, 180 = left, 270 (or -90) = up.
//                                     from < to goes clockwise on screen,
//                                     from > to goes anticlockwise.
// and says which guide line it starts and ends on (`from` and `to`: 'sky',
// 'fence', 'grass', or null for a point between lines). tests/glyphs.test.js
// checks them.
//
// Stroke count, order, direction and start follow data/stroke-order.js.

export const MARGIN = 0.08; // left edge of every character (x of a left stem)

// Body widths (from the left margin to the rightmost ink).
export const BODY = {
  narrow: 0.5,   // E F J L S, and the digits
  standard: 0.64, // A B D H K N P R T U V X Y Z
  wide: 0.84,    // M W
  circle: 1,     // O C G Q: a full circle from sky line to grass line
};

// Characters left alone by the generator: hand recordings from recorder.html
// that override the generated file. Empty for now.
export const OVERRIDES = [];

// Characters that look the same in a mirror (left to right). The test checks
// every point against the mirror image within 0.01.
export const MIRROR_SYMMETRIC = ['A', 'H', 'I', 'M', 'O', 'T', 'U', 'V', 'W', 'X', 'Y', '0'];

const line = (...points) => ({ type: 'line', points });
const arc = (cx, cy, rx, ry, from, to) => ({ type: 'arc', cx, cy, rx, ry, from, to });
const stroke = (from, to, ...pieces) => ({ from, to, pieces });

// The point at `angle` on an ellipse, as arc() measures angles.
export function arcPoint(cx, cy, rx, ry, angle) {
  const a = (angle * Math.PI) / 180;
  return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
}

// The angle on a circle where a clockwise arc leaves along a straight line
// that runs to `target` (the line touches the circle there, with no corner).
// Used for the slant of 2.
function clockwiseTangentTo(cx, cy, r, [tx, ty]) {
  const dx = tx - cx;
  const dy = ty - cy;
  const d = Math.hypot(dx, dy);
  // The touching point is at angle (direction to target) - acos(r / d) for a
  // clockwise (increasing angle) arc.
  return ((Math.atan2(dy, dx) - Math.acos(r / d)) * 180) / Math.PI;
}

const m = MARGIN;
const std = m + BODY.standard; // 0.72: right edge of a standard letter
const nar = m + BODY.narrow;   // 0.58: right edge of a narrow letter or digit
const wid = m + BODY.wide;     // 0.92: right edge of M and W
const mid = (m + std) / 2;     // 0.40: the middle of a standard letter
const R = BODY.circle / 2;     // 0.5: radius of O, C, G, Q
const oc = m + R;              // 0.58: centre x of O, C, G, Q
const bump = 0.25;             // radius of the half-circle bumps of B, P, R (sky to fence)

// 2: a circle over the top, then a slant that leaves it without a corner.
const two = { cx: m + 0.25, cy: 0.25, r: 0.25, foot: [m, 1] };
const twoLeave = clockwiseTangentTo(two.cx, two.cy, two.r, two.foot) + 360;

// 5: a straight drop, then a round belly.
// The belly runs clockwise from its upper left (220) round to its lower left (510, the same as 150).
const five = { r: 0.27, cy: 0.73, start: 220, end: 510 };
const fiveCx = m + 0.02 - five.r * Math.cos((five.start * Math.PI) / 180);
const fiveTop = arcPoint(fiveCx, five.cy, five.r, five.r, five.start);

// 8: a smaller circle on a bigger one, touching at `eightWaist`.
const eight = { cx: m + 0.27, ru: 0.23, rl: 0.27 };
const eightWaist = 2 * eight.ru; // 0.46

export const GLYPHS = {
  A: { strokes: [
    stroke('sky', 'grass', line([mid, 0], [m, 1])),
    stroke('sky', 'grass', line([mid, 0], [std, 1])),
    // Crossbar on the fence, from slant to slant.
    stroke('fence', 'fence', line([(mid + m) / 2, 0.5], [(mid + std) / 2, 0.5])),
  ] },
  B: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('sky', 'grass',
      line([m, 0], [std - 0.06 - bump, 0]),
      arc(std - 0.06 - bump, 0.25, bump, bump, -90, 90),
      line([std - 0.06 - bump, 0.5], [m, 0.5], [std - bump, 0.5]),
      arc(std - bump, 0.75, bump, bump, -90, 90),
      line([std - bump, 1], [m, 1])),
  ] },
  C: { strokes: [
    stroke(null, null, arc(oc, 0.5, R, R, -45, -315)),
  ] },
  D: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('sky', 'grass', line([m, 0], [std - 0.5, 0]), arc(std - 0.5, 0.5, 0.5, 0.5, -90, 90), line([std - 0.5, 1], [m, 1])),
  ] },
  E: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('sky', 'sky', line([m, 0], [nar, 0])),
    stroke('fence', 'fence', line([m, 0.5], [nar - 0.08, 0.5])),
    stroke('grass', 'grass', line([m, 1], [nar, 1])),
  ] },
  F: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('sky', 'sky', line([m, 0], [nar, 0])),
    stroke('fence', 'fence', line([m, 0.5], [nar - 0.08, 0.5])),
  ] },
  G: { strokes: [
    // Round like C, carrying on up to the fence on the right.
    stroke(null, 'fence', arc(oc, 0.5, R, R, -45, -360)),
    stroke('fence', 'fence', line([oc + R, 0.5], [oc + 0.2, 0.5])),
  ] },
  H: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('sky', 'grass', line([std, 0], [std, 1])),
    stroke('fence', 'fence', line([m, 0.5], [std, 0.5])),
  ] },
  I: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
  ] },
  J: { strokes: [
    stroke('sky', null, line([nar, 0], [nar, 0.75]), arc(nar - 0.25, 0.75, 0.25, 0.25, 0, 180)),
  ] },
  K: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('sky', 'fence', line([std, 0], [m, 0.5])),
    // The leg kicks off the arm, a quarter of the way out from the stem.
    stroke(null, 'grass', line([m + 0.25 * (std - m), 0.375], [std, 1])),
  ] },
  L: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('grass', 'grass', line([m, 1], [nar, 1])),
  ] },
  M: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('sky', 'grass', line([m, 0], [(m + wid) / 2, 1], [wid, 0], [wid, 1])),
  ] },
  N: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('sky', 'sky', line([m, 0], [std, 1], [std, 0])),
  ] },
  O: { strokes: [
    stroke('sky', 'sky', arc(oc, 0.5, R, R, -90, -450)),
  ] },
  P: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('sky', 'fence', line([m, 0], [std - bump, 0]), arc(std - bump, 0.25, bump, bump, -90, 90), line([std - bump, 0.5], [m, 0.5])),
  ] },
  Q: { strokes: [
    stroke('sky', 'sky', arc(oc, 0.5, R, R, -90, -450)),
    // Tail along the 45 degree line from the centre, from inside the circle out to the grass line.
    stroke(null, 'grass', line([oc + 0.21, 0.5 + 0.21], [oc + R, 1])),
  ] },
  R: { strokes: [
    stroke('sky', 'grass', line([m, 0], [m, 1])),
    stroke('sky', 'fence', line([m, 0], [std - bump, 0]), arc(std - bump, 0.25, bump, bump, -90, 90), line([std - bump, 0.5], [m, 0.5])),
    stroke('fence', 'grass', line([m + 0.22, 0.5], [std, 1])),
  ] },
  S: { strokes: [
    // Two half-height ovals, the lower one the upper turned round.
    stroke(null, null, arc(m + 0.25, 0.25, 0.25, 0.25, -30, -270), arc(m + 0.25, 0.75, 0.25, 0.25, -90, 150)),
  ] },
  T: { anyOrder: [[0, 1]], strokes: [
    stroke('sky', 'grass', line([mid, 0], [mid, 1])),
    stroke('sky', 'sky', line([m, 0], [std, 0])),
  ] },
  U: { strokes: [
    stroke('sky', 'sky', line([m, 0], [m, 1 - (std - m) / 2]), arc(mid, 1 - (std - m) / 2, (std - m) / 2, (std - m) / 2, 180, 0), line([std, 1 - (std - m) / 2], [std, 0])),
  ] },
  V: { strokes: [
    stroke('sky', 'sky', line([m, 0], [mid, 1], [std, 0])),
  ] },
  W: { strokes: [
    // The middle goes all the way up to the sky line.
    stroke('sky', 'sky', line([m, 0], [m + (wid - m) / 4, 1], [(m + wid) / 2, 0], [wid - (wid - m) / 4, 1], [wid, 0])),
  ] },
  X: { strokes: [
    stroke('sky', 'grass', line([m, 0], [std, 1])),
    stroke('sky', 'grass', line([std, 0], [m, 1])),
  ] },
  Y: { strokes: [
    stroke('sky', 'fence', line([m, 0], [mid, 0.5])),
    stroke('sky', 'grass', line([std, 0], [mid, 0.5], [mid, 1])),
  ] },
  Z: { strokes: [
    stroke('sky', 'grass', line([m, 0], [std, 0], [m, 1], [std, 1])),
  ] },

  // Digits: all narrow.
  0: { strokes: [
    // A narrow oval, so it is clearly not O.
    stroke('sky', 'sky', arc(m + 0.25, 0.5, 0.25, 0.5, -90, -450)),
  ] },
  1: { strokes: [
    stroke(null, 'sky', line([m, 0.2], [m + 0.22, 0])),
    stroke('sky', 'grass', line([m + 0.22, 0], [m + 0.22, 1])),
  ] },
  2: { strokes: [
    stroke(null, 'grass', arc(two.cx, two.cy, two.r, two.r, 200, twoLeave), line(arcPoint(two.cx, two.cy, two.r, two.r, twoLeave), two.foot, [nar, 1])),
  ] },
  3: { strokes: [
    stroke(null, null, arc(m + 0.25, 0.25, 0.25, 0.25, 200, 450), arc(m + 0.25, 0.75, 0.25, 0.25, -90, 160)),
  ] },
  4: { strokes: [
    stroke('sky', 'grass', line([nar - 0.12, 0], [nar - 0.12, 1])),
    stroke('sky', null, line([nar - 0.12, 0], [m, 0.7])),
    stroke(null, null, line([m, 0.7], [nar, 0.7])),
  ] },
  5: { strokes: [
    stroke('sky', null, line([fiveTop[0], 0], fiveTop), arc(fiveCx, five.cy, five.r, five.r, five.start, five.end)),
    stroke('sky', 'sky', line([fiveTop[0], 0], [nar, 0])),
  ] },
  6: { strokes: [
    // Down the left side of a tall oval, then round a circle at the bottom.
    stroke(null, null, arc(m + 0.25, 0.75, 0.25, 0.75, -70, -180), arc(m + 0.25, 0.75, 0.25, 0.25, 180, -180)),
  ] },
  7: { strokes: [
    stroke('sky', 'sky', line([m, 0], [nar, 0])),
    stroke('sky', 'grass', line([nar, 0], [m + 0.16, 1])),
  ] },
  8: { strokes: [
    // Over the small top circle to the waist, all round the bigger bottom
    // circle, then up the right side of the top circle back to the start.
    stroke(null, null,
      arc(eight.cx, eight.ru, eight.ru, eight.ru, -30, -270),
      arc(eight.cx, eightWaist + eight.rl, eight.rl, eight.rl, -90, 270),
      arc(eight.cx, eight.ru, eight.ru, eight.ru, 90, -30)),
  ] },
  9: { strokes: [
    stroke(null, null, arc(m + 0.25, 0.25, 0.25, 0.25, 0, -360)),
    stroke('sky', 'grass', line([nar, 0], [nar, 1])),
  ] },
};

