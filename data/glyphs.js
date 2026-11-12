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
// checks them. Each stroke also has a short `part` name ('bar', 'tail'...)
// for the parent-facing lines (src/notes.js: "Almost! The bar is missing").
//
// Stroke count, order, direction and start follow data/stroke-order.js.
//
// Stroke plans (Slice 5J). `strokes` is the default plan: the one the model
// card and Jugnu show. `plans` lists the other ways she may draw the same
// letter: a split (B's bumps one at a time), a merge (K's "<" in one go) or
// another order (H: stem, bar, stem). Every plan is built from the same exact
// lines and arcs, so every plan has the same shape (tests/glyphs.test.js
// checks it), and no plan runs any part the other way, except M and N from the
// bottom (Slice 5J part 2), whose stem runs up. Joins the one-stroke
// rule already accepts (src/variants.js, L in one go) are listed too, so the
// whole list is visible on glyphs.html.

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
const stroke = (part, from, to, ...pieces) => ({ part, from, to, pieces });

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


// Shared pieces, so every plan is drawn from exactly the same geometry.
const bTop = std - 0.06 - bump;   // centre x of B's upper bump
const bLow = std - bump;          // centre x of B's lower bump (and P's and R's bump)
const kArm = line([std, 0], [m, 0.5]);         // K: the arm, in to the stem at the fence
const kLeg = line([m, 0.5], [std, 1]);         // K: the leg, out from the same point
const rLegX = m + 0.22;                        // R: where the leg leaves the bump's return line
const mMid = (m + wid) / 2;
const wQ1 = m + (wid - m) / 4;
const wQ3 = wid - (wid - m) / 4;
const uR = (std - m) / 2;
const twoTop = arcPoint(two.cx, two.cy, two.r, two.r, twoLeave);

// Strokes used by more than one plan.
const S = {
  stem: stroke('stem', 'sky', 'grass', line([m, 0], [m, 1])),
  aLeft: stroke('left slant', 'sky', 'grass', line([mid, 0], [m, 1])),
  aRight: stroke('right slant', 'sky', 'grass', line([mid, 0], [std, 1])),
  bTopBump: stroke('top bump', 'sky', 'fence', line([m, 0], [bTop, 0]), arc(bTop, 0.25, bump, bump, -90, 90), line([bTop, 0.5], [m, 0.5])),
  bLowBump: stroke('bottom bump', 'fence', 'grass', line([m, 0.5], [bLow, 0.5]), arc(bLow, 0.75, bump, bump, -90, 90), line([bLow, 1], [m, 1])),
  eTop: stroke('top bar', 'sky', 'sky', line([m, 0], [nar, 0])),
  eMid: stroke('middle bar', 'fence', 'fence', line([m, 0.5], [nar - 0.08, 0.5])),
  eLow: stroke('bottom bar', 'grass', 'grass', line([m, 1], [nar, 1])),
  gCurve: stroke('curve', null, 'fence', arc(oc, 0.5, R, R, -45, -360)),
  gBar: stroke('bar', 'fence', 'fence', line([oc + R, 0.5], [oc + 0.2, 0.5])),
  hRight: stroke('right stem', 'sky', 'grass', line([std, 0], [std, 1])),
  hBar: stroke('bar', 'fence', 'fence', line([m, 0.5], [std, 0.5])),
  kArm: stroke('arm', 'sky', 'fence', kArm),
  kLeg: stroke('leg', 'fence', 'grass', kLeg),
  lFoot: stroke('foot', 'grass', 'grass', line([m, 1], [nar, 1])),
  rBump: stroke('bump', 'sky', 'fence', line([m, 0], [bLow, 0]), arc(bLow, 0.25, bump, bump, -90, 90), line([bLow, 0.5], [m, 0.5])),
  tStem: stroke('stem', 'sky', 'grass', line([mid, 0], [mid, 1])),
  tBar: stroke('top bar', 'sky', 'sky', line([m, 0], [std, 0])),
  xDown: stroke('first slant', 'sky', 'grass', line([m, 0], [std, 1])),
  xUp: stroke('second slant', 'sky', 'grass', line([std, 0], [m, 1])),
  yLeft: stroke('left arm', 'sky', 'fence', line([m, 0], [mid, 0.5])),
  oneFlag: stroke('flag', null, 'sky', line([m, 0.2], [m + 0.22, 0])),
  oneStem: stroke('stem', 'sky', 'grass', line([m + 0.22, 0], [m + 0.22, 1])),
  fourStem: stroke('stem', 'sky', 'grass', line([nar - 0.12, 0], [nar - 0.12, 1])),
  fourSlant: stroke('slant', 'sky', null, line([nar - 0.12, 0], [m, 0.7])),
  fourBar: stroke('bar', null, null, line([m, 0.7], [nar, 0.7])),
  sevenTop: stroke('top bar', 'sky', 'sky', line([m, 0], [nar, 0])),
  sevenSlant: stroke('slant', 'sky', 'grass', line([nar, 0], [m + 0.16, 1])),
  nineCircle: stroke('circle', null, null, arc(m + 0.25, 0.25, 0.25, 0.25, 0, -360)),
  nineStem: stroke('stem', 'sky', 'grass', line([nar, 0], [nar, 1])),
};
// The pieces of two strokes drawn as one (the second starts where the first ends).
const merge = (part, a, b) => stroke(part, a.from, b.to, ...a.pieces, ...b.pieces);

export const GLYPHS = {
  A: { strokes: [
    S.aLeft,
    S.aRight,
    // Crossbar on the fence, from slant to slant.
    stroke('bar', 'fence', 'fence', line([(mid + m) / 2, 0.5], [(mid + std) / 2, 0.5])),
  ] },
  B: { strokes: [
    S.stem,
    stroke('bumps', 'sky', 'grass',
      line([m, 0], [bTop, 0]),
      arc(bTop, 0.25, bump, bump, -90, 90),
      line([bTop, 0.5], [m, 0.5], [bLow, 0.5]),
      arc(bLow, 0.75, bump, bump, -90, 90),
      line([bLow, 1], [m, 1])),
  ], plans: [
    // The bumps one at a time: the top bump comes back to the stem, the bottom one starts there.
    [S.stem, S.bTopBump, S.bLowBump],
  ] },
  C: { strokes: [
    stroke('curve', null, null, arc(oc, 0.5, R, R, -45, -315)),
  ] },
  D: { strokes: [
    S.stem,
    stroke('curve', 'sky', 'grass', line([m, 0], [std - 0.5, 0]), arc(std - 0.5, 0.5, 0.5, 0.5, -90, 90), line([std - 0.5, 1], [m, 1])),
  ] },
  E: { strokes: [S.stem, S.eTop, S.eMid, S.eLow], plans: [
    // An L in one go first, then the top and middle bars.
    [merge('stem and bottom bar', S.stem, S.eLow), S.eTop, S.eMid],
  ] },
  F: { strokes: [S.stem, S.eTop, S.eMid] },
  G: { strokes: [
    // Round like C, carrying on up to the fence on the right, then the bar.
    S.gCurve,
    S.gBar,
  ], plans: [
    [merge('curve and bar', S.gCurve, S.gBar)], // join
  ] },
  H: { strokes: [S.stem, S.hRight, S.hBar], plans: [
    [S.stem, S.hBar, S.hRight],
  ] },
  I: { strokes: [S.stem] },
  J: { strokes: [
    stroke('hook', 'sky', null, line([nar, 0], [nar, 0.75]), arc(nar - 0.25, 0.75, 0.25, 0.25, 0, 180)),
  ] },
  K: { strokes: [
    S.stem,
    // The arm comes in to the stem at the fence, and the leg goes out from the same point.
    S.kArm,
    S.kLeg,
  ], plans: [
    [S.stem, merge('arm and leg', S.kArm, S.kLeg)], // the "<" in one go (join)
  ] },
  L: { strokes: [S.stem, S.lFoot], plans: [
    [merge('stem and foot', S.stem, S.lFoot)], // join
  ] },
  M: { strokes: [
    S.stem,
    stroke('slants and right stem', 'sky', 'grass', line([m, 0], [mMid, 1], [wid, 0], [wid, 1])),
  ], plans: [
    [S.stem,
      stroke('first slant', 'sky', 'grass', line([m, 0], [mMid, 1])),
      stroke('second slant', 'grass', 'sky', line([mMid, 1], [wid, 0])),
      stroke('right stem', 'sky', 'grass', line([wid, 0], [wid, 1]))],
    // From the bottom (Slice 5J part 2): one stroke from the bottom left, up, down, up, down.
    [stroke('zigzag', 'grass', 'grass', line([m, 1], [m, 0], [mMid, 1], [wid, 0], [wid, 1]))],
  ] },
  N: { strokes: [
    S.stem,
    stroke('slant and right side', 'sky', 'sky', line([m, 0], [std, 1], [std, 0])),
  ], plans: [
    [S.stem,
      stroke('slant', 'sky', 'grass', line([m, 0], [std, 1])),
      stroke('right side', 'grass', 'sky', line([std, 1], [std, 0]))],
    // From the bottom (Slice 5J part 2): one stroke from the bottom left, up, diagonal down, up.
    [stroke('zigzag', 'grass', 'sky', line([m, 1], [m, 0], [std, 1], [std, 0]))],
  ] },
  O: { strokes: [
    stroke('circle', 'sky', 'sky', arc(oc, 0.5, R, R, -90, -450)),
  ] },
  P: { strokes: [S.stem, S.rBump] },
  Q: { strokes: [
    stroke('circle', 'sky', 'sky', arc(oc, 0.5, R, R, -90, -450)),
    // Tail along the 45 degree line from the centre, from inside the circle out to the grass line.
    stroke('tail', null, 'grass', line([oc + 0.21, 0.5 + 0.21], [oc + R, 1])),
  ] },
  R: { strokes: [
    S.stem,
    S.rBump,
    stroke('leg', 'fence', 'grass', line([rLegX, 0.5], [std, 1])),
  ], plans: [
    // The bump runs straight into the leg: its way back stops where the leg leaves.
    [S.stem, stroke('bump and leg', 'sky', 'grass',
      line([m, 0], [bLow, 0]), arc(bLow, 0.25, bump, bump, -90, 90), line([bLow, 0.5], [rLegX, 0.5], [std, 1]))],
  ] },
  S: { strokes: [
    // Two half-height ovals, the lower one the upper turned round.
    stroke('curve', null, null, arc(m + 0.25, 0.25, 0.25, 0.25, -30, -270), arc(m + 0.25, 0.75, 0.25, 0.25, -90, 150)),
  ] },
  T: { strokes: [S.tStem, S.tBar], plans: [
    [S.tBar, S.tStem],
  ] },
  U: { strokes: [
    stroke('curve', 'sky', 'sky', line([m, 0], [m, 1 - uR]), arc(mid, 1 - uR, uR, uR, 180, 0), line([std, 1 - uR], [std, 0])),
  ] },
  V: { strokes: [
    stroke('slants', 'sky', 'sky', line([m, 0], [mid, 1], [std, 0])),
  ], plans: [
    [stroke('first slant', 'sky', 'grass', line([m, 0], [mid, 1])), stroke('second slant', 'grass', 'sky', line([mid, 1], [std, 0]))],
  ] },
  W: { strokes: [
    // The middle goes all the way up to the sky line.
    stroke('zigzag', 'sky', 'sky', line([m, 0], [wQ1, 1], [mMid, 0], [wQ3, 1], [wid, 0])),
  ], plans: [
    // Two V's.
    [stroke('first V', 'sky', 'sky', line([m, 0], [wQ1, 1], [mMid, 0])), stroke('second V', 'sky', 'sky', line([mMid, 0], [wQ3, 1], [wid, 0]))],
  ] },
  X: { strokes: [S.xDown, S.xUp], plans: [
    [S.xUp, S.xDown],
  ] },
  Y: { strokes: [
    S.yLeft,
    stroke('right arm and stem', 'sky', 'grass', line([std, 0], [mid, 0.5], [mid, 1])),
  ], plans: [
    [S.yLeft, stroke('right arm', 'sky', 'fence', line([std, 0], [mid, 0.5])), stroke('stem', 'fence', 'grass', line([mid, 0.5], [mid, 1]))],
  ] },
  Z: { strokes: [
    stroke('zigzag', 'sky', 'grass', line([m, 0], [std, 0], [m, 1], [std, 1])),
  ], plans: [
    [stroke('top bar', 'sky', 'sky', line([m, 0], [std, 0])),
      stroke('slant', 'sky', 'grass', line([std, 0], [m, 1])),
      stroke('bottom bar', 'grass', 'grass', line([m, 1], [std, 1]))],
  ] },

  // Digits: all narrow.
  0: { strokes: [
    // A narrow oval, so it is clearly not O.
    stroke('oval', 'sky', 'sky', arc(m + 0.25, 0.5, 0.25, 0.5, -90, -450)),
  ] },
  1: { strokes: [S.oneFlag, S.oneStem], plans: [
    [merge('flag and stem', S.oneFlag, S.oneStem)], // join
  ] },
  2: { strokes: [
    stroke('curve and foot', null, 'grass', arc(two.cx, two.cy, two.r, two.r, 200, twoLeave), line(twoTop, two.foot, [nar, 1])),
  ], plans: [
    [stroke('curve', null, 'grass', arc(two.cx, two.cy, two.r, two.r, 200, twoLeave), line(twoTop, two.foot)),
      stroke('foot', 'grass', 'grass', line(two.foot, [nar, 1]))],
  ] },
  3: { strokes: [
    stroke('bumps', null, null, arc(m + 0.25, 0.25, 0.25, 0.25, 200, 450), arc(m + 0.25, 0.75, 0.25, 0.25, -90, 160)),
  ], plans: [
    [stroke('top bump', null, 'fence', arc(m + 0.25, 0.25, 0.25, 0.25, 200, 450)),
      stroke('bottom bump', 'fence', null, arc(m + 0.25, 0.75, 0.25, 0.25, -90, 160))],
  ] },
  4: { strokes: [S.fourStem, S.fourSlant, S.fourBar], plans: [
    // The slant and the bar first (in one go too, by the join), then the stem.
    [S.fourSlant, S.fourBar, S.fourStem],
  ] },
  5: { strokes: [
    stroke('stem and belly', 'sky', null, line([fiveTop[0], 0], fiveTop), arc(fiveCx, five.cy, five.r, five.r, five.start, five.end)),
    stroke('flag', 'sky', 'sky', line([fiveTop[0], 0], [nar, 0])),
  ] },
  6: { strokes: [
    // Down the left side of a tall oval, then round a circle at the bottom.
    stroke('curve', null, null, arc(m + 0.25, 0.75, 0.25, 0.75, -70, -180), arc(m + 0.25, 0.75, 0.25, 0.25, 180, -180)),
  ] },
  7: { strokes: [S.sevenTop, S.sevenSlant], plans: [
    [merge('top bar and slant', S.sevenTop, S.sevenSlant)], // join
  ] },
  8: { strokes: [
    // Over the small top circle to the waist, all round the bigger bottom
    // circle, then up the right side of the top circle back to the start.
    stroke('loops', null, null,
      arc(eight.cx, eight.ru, eight.ru, eight.ru, -30, -270),
      arc(eight.cx, eightWaist + eight.rl, eight.rl, eight.rl, -90, 270),
      arc(eight.cx, eight.ru, eight.ru, eight.ru, 90, -30)),
  ] },
  9: { strokes: [S.nineCircle, S.nineStem], plans: [
    // The circle running straight into the stem: down from where the circle
    // closes (its right side), so the stem's short top above that is left out.
    [stroke('circle and stem', null, 'grass', arc(m + 0.25, 0.25, 0.25, 0.25, 0, -360), line([nar, 0.25], [nar, 1]))],
  ] },
};

// Every plan of a character: the default first, then the others.
export const plansOf = (glyph) => [glyph.strokes, ...(glyph.plans ?? [])];
