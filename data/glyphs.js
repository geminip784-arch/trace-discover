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

// ---------------------------------------------------------------------------
// Lowercase a to z (Slice 9A). Plain print to match the capitals: round parts
// are true circles, sticks are straight. Kept together here so the style can be
// swapped in one place if the school's handwriting sheet differs.
//
// Four lines: sky 0, fence 0.5, grass 1, tail line 1.5 (src/render.js LINES).
// Small letters (a c e m n o r s u v w x z) sit between the fence and the grass.
// Tall letters (b d f h k l) reach the sky, t a little short of it. Tails
// (g j p q y) reach the tail line. i and j have a `dot` stroke: a tap target,
// scored with scoreDot.
//
// The one-go plans of a b d g h m n p q r u y run back over part of a stick
// ("down, back up, and round"), the way children draw them in one go: the only
// plans besides M and N from the bottom that run a part the other way
// (tests/glyphs.test.js lists them).

export const LOW = {
  bowl: 0.25,      // radius of the round part of a b c d e g o p q (fence to grass)
  bowlY: 0.75,     // its centre: halfway between the fence and the grass
  tail: 1.5,       // the tail line
  tTop: 0.2,       // t's stick starts a little below the sky line
  dotY: 0.25,      // the dot of i and j: halfway between the sky and the fence
  jHook: 0.2,      // radius of j's hook
  fHook: 0.17,     // radius of f's hook
  mArch: 0.21,     // radius of each arch of m (m is as wide as M)
  sBowl: 0.125,    // radius of each half of s (S at half size)
  kArm: 0.4,       // how far k's arm and leg reach right of the stick
  tBar: 0.4,       // length of t's and f's bar
};

// A dot stroke: one target point (the dot of i and j).
const dot = (part, x, y) => ({ part, kind: 'dot', from: null, to: null, at: [x, y] });

const lr = LOW.bowl;
const lc = m + lr;              // 0.33: centre x of the round part
const ly = LOW.bowlY;
const lx = m + 2 * lr;          // 0.58: the right side of the round part (the stick of a d g q)
const tl = LOW.tail;
const fx = m + LOW.fHook;       // f's stick
const jx = m + 2 * LOW.jHook;   // j's stick
const tx = m + LOW.tBar / 2;    // t's stick, in the middle of its bar
const mr = LOW.mArch;
const sr = LOW.sBowl;

// The round part of a d g q: anticlockwise from the upper right, round to its right side.
const lRound = () => arc(lc, ly, lr, lr, -45, -360);
// The round part of b p: from the stick at its middle, up and round clockwise.
const bRound = () => arc(lc, ly, lr, lr, 180, 540);
// An arch over from the stick (h n r m): from its left side up over the top.
const arch = (cx, r, to = 360) => arc(cx, 0.5 + r, r, r, 180, to);

const L = {
  aRound: stroke('round', null, null, lRound()),
  aStick: stroke('stick', 'fence', 'grass', line([lx, 0.5], [lx, 1])),
  tallStem: stroke('stick', 'sky', 'grass', line([m, 0], [m, 1])),
  smallStem: stroke('stick', 'fence', 'grass', line([m, 0.5], [m, 1])),
  tailStem: stroke('stick', 'fence', 'tail', line([m, 0.5], [m, tl])),
  bRound: stroke('round', null, null, bRound()),
  hArch: stroke('arch', null, 'grass', arch(lc, lr), line([lx, ly], [lx, 1])),
  eBar: stroke('bar', null, null, line([m, ly], [lx, ly])),
  eCurve: stroke('curve', null, null, arc(lc, ly, lr, lr, 0, -315)),
  fHook: stroke('hook and stick', null, 'grass', arc(fx + LOW.fHook, LOW.fHook, LOW.fHook, LOW.fHook, -30, -180), line([fx, LOW.fHook], [fx, 1])),
  fBar: stroke('bar', 'fence', 'fence', line([m, 0.5], [m + LOW.tBar, 0.5])),
  gTail: stroke('stick and tail', 'fence', null, line([lx, 0.5], [lx, tl - lr]), arc(lc, tl - lr, lr, lr, 0, 180)),
  iStick: stroke('stick', 'fence', 'grass', line([m, 0.5], [m, 1])),
  iDot: dot('dot', m, LOW.dotY),
  jTail: stroke('stick and tail', 'fence', null, line([jx, 0.5], [jx, tl - LOW.jHook]), arc(m + LOW.jHook, tl - LOW.jHook, LOW.jHook, LOW.jHook, 0, 180)),
  jDot: dot('dot', jx, LOW.dotY),
  kArm: stroke('arm', 'fence', null, line([m + LOW.kArm, 0.5], [m, ly])),
  kLeg: stroke('leg', null, 'grass', line([m, ly], [m + LOW.kArm, 1])),
  mArch1: stroke('first arch', null, 'grass', arch(m + mr, mr), line([m + 2 * mr, 0.5 + mr], [m + 2 * mr, 1])),
  mArch2: stroke('second arch', null, 'grass', arch(m + 3 * mr, mr), line([m + 4 * mr, 0.5 + mr], [m + 4 * mr, 1])),
  qStick: stroke('stick', 'fence', 'tail', line([lx, 0.5], [lx, tl])),
  rShoulder: stroke('shoulder', null, null, arch(lc, lr, 315)),
  tStick: stroke('stick', null, 'grass', line([tx, LOW.tTop], [tx, 1])),
  tBar: stroke('bar', 'fence', 'fence', line([m, 0.5], [m + LOW.tBar, 0.5])),
  uCup: stroke('cup', 'fence', 'fence', line([m, 0.5], [m, ly]), arc(lc, ly, lr, lr, 180, 0), line([lx, ly], [lx, 0.5])),
  uStick: stroke('stick', 'fence', 'grass', line([lx, 0.5], [lx, 1])),
  vSlant1: stroke('first slant', 'fence', 'grass', line([m, 0.5], [lc, 1])),
  vSlant2: stroke('second slant', 'grass', 'fence', line([lc, 1], [lx, 0.5])),
  xDown: stroke('first slant', 'fence', 'grass', line([m, 0.5], [lx, 1])),
  xUp: stroke('second slant', 'fence', 'grass', line([lx, 0.5], [m, 1])),
  yLeft: stroke('left arm', 'fence', 'grass', line([m, 0.5], [lc, 1])),
  yRight: stroke('right arm and tail', 'fence', 'tail', line([lx, 0.5], [lc, 1], [m, tl])),
};
// w: four slants between the fence and the grass, its middle up to the fence.
const wStep = 0.18;
const wx = (i) => m + i * wStep;

export const LOWERCASE = {
  a: { strokes: [L.aRound, L.aStick], plans: [
    [stroke('round and stick', null, 'grass', lRound(), line([lx, ly], [lx, 0.5], [lx, 1]))],
  ] },
  b: { strokes: [L.tallStem, L.bRound], plans: [
    [stroke('stick and round', 'sky', null, line([m, 0], [m, 1], [m, ly]), bRound())],
  ] },
  c: { strokes: [stroke('curve', null, null, arc(lc, ly, lr, lr, -45, -315))] },
  d: { strokes: [L.aRound, stroke('tall stick', 'sky', 'grass', line([lx, 0], [lx, 1]))], plans: [
    [stroke('round and stick', null, 'grass', lRound(), line([lx, ly], [lx, 0], [lx, 1]))],
  ] },
  e: { strokes: [merge('bar and curve', L.eBar, L.eCurve)], plans: [
    [L.eBar, L.eCurve],
  ] },
  f: { strokes: [L.fHook, L.fBar] },
  g: { strokes: [L.aRound, L.gTail], plans: [
    [stroke('round and tail', null, null, lRound(), line([lx, ly], [lx, 0.5], [lx, tl - lr]), arc(lc, tl - lr, lr, lr, 0, 180))],
  ] },
  h: { strokes: [L.tallStem, L.hArch], plans: [
    [stroke('stick and arch', 'sky', 'grass', line([m, 0], [m, 1], [m, ly]), arch(lc, lr), line([lx, ly], [lx, 1]))],
  ] },
  i: { strokes: [L.iStick, L.iDot], plans: [
    [L.iDot, L.iStick],
  ] },
  j: { strokes: [L.jTail, L.jDot], plans: [
    [L.jDot, L.jTail],
  ] },
  k: { strokes: [L.tallStem, L.kArm, L.kLeg], plans: [
    [L.tallStem, merge('arm and leg', L.kArm, L.kLeg)],
  ] },
  l: { strokes: [L.tallStem] },
  m: { strokes: [L.smallStem, stroke('arches', null, 'grass',
    arch(m + mr, mr), line([m + 2 * mr, 0.5 + mr], [m + 2 * mr, 1], [m + 2 * mr, 0.5 + mr]),
    arch(m + 3 * mr, mr), line([m + 4 * mr, 0.5 + mr], [m + 4 * mr, 1]))], plans: [
    [L.smallStem, L.mArch1, L.mArch2],
    [stroke('stick and arches', 'fence', 'grass', line([m, 0.5], [m, 1], [m, 0.5 + mr]),
      arch(m + mr, mr), line([m + 2 * mr, 0.5 + mr], [m + 2 * mr, 1], [m + 2 * mr, 0.5 + mr]),
      arch(m + 3 * mr, mr), line([m + 4 * mr, 0.5 + mr], [m + 4 * mr, 1]))],
  ] },
  n: { strokes: [L.smallStem, L.hArch], plans: [
    [stroke('stick and arch', 'fence', 'grass', line([m, 0.5], [m, 1], [m, ly]), arch(lc, lr), line([lx, ly], [lx, 1]))],
  ] },
  o: { strokes: [stroke('circle', 'fence', 'fence', arc(lc, ly, lr, lr, -90, -450))] },
  p: { strokes: [L.tailStem, L.bRound], plans: [
    [stroke('stick and round', 'fence', null, line([m, 0.5], [m, tl], [m, ly]), bRound())],
  ] },
  q: { strokes: [L.aRound, L.qStick], plans: [
    [stroke('round and stick', null, 'tail', lRound(), line([lx, ly], [lx, 0.5], [lx, tl]))],
  ] },
  r: { strokes: [L.smallStem, L.rShoulder], plans: [
    [stroke('stick and shoulder', 'fence', null, line([m, 0.5], [m, 1], [m, ly]), arch(lc, lr, 315))],
  ] },
  s: { strokes: [
    // S at half size: two small circles' parts, the lower one the upper turned round.
    stroke('curve', null, null, arc(m + sr, 0.5 + sr, sr, sr, -30, -270), arc(m + sr, 1 - sr, sr, sr, -90, 150)),
  ] },
  t: { strokes: [L.tStick, L.tBar], plans: [
    [L.tBar, L.tStick],
  ] },
  u: { strokes: [L.uCup, L.uStick], plans: [
    [merge('cup and stick', L.uCup, L.uStick)],
  ] },
  v: { strokes: [stroke('slants', 'fence', 'fence', line([m, 0.5], [lc, 1], [lx, 0.5]))], plans: [
    [L.vSlant1, L.vSlant2],
  ] },
  w: { strokes: [stroke('zigzag', 'fence', 'fence', line([wx(0), 0.5], [wx(1), 1], [wx(2), 0.5], [wx(3), 1], [wx(4), 0.5]))], plans: [
    [stroke('first V', 'fence', 'fence', line([wx(0), 0.5], [wx(1), 1], [wx(2), 0.5])),
      stroke('second V', 'fence', 'fence', line([wx(2), 0.5], [wx(3), 1], [wx(4), 0.5]))],
  ] },
  x: { strokes: [L.xDown, L.xUp], plans: [
    [L.xUp, L.xDown],
  ] },
  y: { strokes: [L.yLeft, L.yRight], plans: [
    [stroke('arms and tail', 'fence', 'tail', line([m, 0.5], [lc, 1], [lx, 0.5], [lc, 1], [m, tl]))],
  ] },
  z: { strokes: [stroke('zigzag', 'fence', 'grass', line([m, 0.5], [lx, 0.5], [m, 1], [lx, 1]))], plans: [
    [stroke('top', 'fence', 'fence', line([m, 0.5], [lx, 0.5])),
      stroke('slant', 'fence', 'grass', line([lx, 0.5], [m, 1])),
      stroke('bottom', 'grass', 'grass', line([m, 1], [lx, 1]))],
  ] },
};

Object.assign(GLYPHS, LOWERCASE);

// Lowercase letters that look the same in a mirror (checked like the capitals).
MIRROR_SYMMETRIC.push('i', 'l', 'o', 't', 'v', 'w', 'x');

// ---- Numbers 10 to 20 (Slice 9B) ----
// Two digits side by side, built from the digit glyphs above: the left digit's
// strokes, then the right digit's moved right, so stroke order is always left
// digit first. The right digit's ink starts NUMBER_GAP after the left digit's
// ink ends (the same gap for every number, whatever the digits' widths). Both
// digits keep their height. Every plan is one plan of the left digit followed by
// one plan of the right (every pairing; the default pairs the two defaults).
// `digits` says which digits a number is made of and how far each is moved
// (x, line units): the copy-it round (Slice 9B part 2) judges each digit on its own.

export const NUMBER_GAP = 0.25; // line units between the two digits' ink
export const NUMBER_IDS = Array.from({ length: 11 }, (_, k) => String(10 + k));

// The leftmost and rightmost x of a glyph's ink (every plan has the same shape; the default is measured).
function inkSpan(glyph) {
  const xs = [];
  for (const s of glyph.strokes) {
    for (const p of s.pieces) {
      if (p.type === 'line') for (const [x] of p.points) xs.push(x);
      else {
        const steps = Math.max(8, Math.ceil(Math.abs(p.to - p.from) / 0.25));
        for (let i = 0; i <= steps; i++) xs.push(arcPoint(p.cx, p.cy, p.rx, p.ry, p.from + ((p.to - p.from) * i) / steps)[0]);
      }
    }
  }
  return { left: Math.min(...xs), right: Math.max(...xs) };
}

// How far a number's right digit is moved right: its ink starts NUMBER_GAP after
// the left digit's ink ends (3's ink, for one, starts a little right of MARGIN).
export const numberShift = (id) => inkSpan(GLYPHS[id[0]]).right + NUMBER_GAP - inkSpan(GLYPHS[id[1]]).left;

const shiftPiece = (p, dx) => (p.type === 'line'
  ? { ...p, points: p.points.map(([x, y]) => [x + dx, y]) }
  : { ...p, cx: p.cx + dx });
const shiftStroke = (s, dx) => ({ ...s, pieces: s.pieces.map((p) => shiftPiece(p, dx)) });

export function numberGlyph(id) {
  const [left, right] = id.split('');
  const dx = numberShift(id);
  const pairs = plansOf(GLYPHS[left]).flatMap((a) => plansOf(GLYPHS[right]).map((b) => [...a, ...b.map((s) => shiftStroke(s, dx))]));
  const [strokes, ...plans] = pairs;
  return { digits: [{ id: left, x: 0 }, { id: right, x: Math.round(dx * 1000) / 1000 }], strokes, ...(plans.length ? { plans } : {}) };
}

export const NUMBERS = Object.fromEntries(NUMBER_IDS.map((id) => [id, numberGlyph(id)]));
Object.assign(GLYPHS, NUMBERS);

// ---------------------------------------------------------------------------
// Urdu letters (Slice 10). The isolated (stand-alone) form only, in a plain
// Naskh print as in a qaida. Slice 10A: six sample letters, for review on
// glyphs.html before the rest are made. They are not in the app yet (not in
// GLYPHS, no character files).
//
// Urdu letters are curved, so they add a third kind of piece:
//   curve(p0, p1, p2, ...)   a smooth curve through every point, in order
//                            (centripetal Catmull-Rom). Where two pieces of a
//                            stroke meet there may be a corner (the tip of ج's
//                            head); inside one curve there never is.
//
// Lines: the grass line is the Urdu baseline. Tall letters (ا) reach the sky
// line; bodies sit on the grass line; tails (ج ع) dip to just above the tail
// line; dots below sit about halfway to the tail line, dots inside ج on the
// grass line. The shapes follow Noto Naskh Arabic (assets/fonts/), drawn at the
// size where its alif runs from the sky line to the grass line (URDU_FONT).
//
// Each letter is drawn here in the font's own coordinates (x = 0 at the font
// letter's origin), then moved right or left so its leftmost ink sits at
// MARGIN, like every other character. `fontX` keeps where the font letter's
// origin lands, so glyphs.html can draw the font letter faintly behind it.
//
// Strokes: the body first, then the dots, which are taps (`dot`, scored with
// scoreDot like the dot of i and j). Most strokes run right to left; the head
// of ج runs left to right, as it is written, before turning back into the tail.

// The font size, in line units, at which the font's alif (671 of its 1000 units
// per em) runs from the sky line to the grass line. The font's baseline is the grass line.
export const URDU_FONT = { family: 'Noto Naskh Arabic', size: 1000 / 671, baseline: 1 };

const curve = (...points) => ({ type: 'curve', points });

// Points along a smooth curve through `points` (centripetal Catmull-Rom: no
// loops or overshoots between close points), `steps` per span, in order.
// The ends carry on in the direction of their neighbour.
export function curvePoints(points, steps = 120) {
  if (points.length < 2) return points.map((p) => [...p]);
  const ext = (a, b) => [2 * a[0] - b[0], 2 * a[1] - b[1]];
  const P = [ext(points[0], points[1]), ...points, ext(points[points.length - 1], points[points.length - 2])];
  const knot = (t, a, b) => t + Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]));
  const out = [[...points[0]]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const t0 = 0;
    const t1 = knot(t0, p0, p1);
    const t2 = knot(t1, p1, p2);
    const t3 = knot(t2, p2, p3);
    const lerp = (a, b, ta, tb, t) => (tb === ta ? [...a] : [
      ((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta),
      ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta),
    ]);
    for (let s = 1; s <= steps; s++) {
      const t = t1 + ((t2 - t1) * s) / steps;
      const a1 = lerp(p0, p1, t0, t1, t);
      const a2 = lerp(p1, p2, t1, t2, t);
      const a3 = lerp(p2, p3, t2, t3, t);
      const b1 = lerp(a1, a2, t0, t2, t);
      const b2 = lerp(a2, a3, t1, t3, t);
      out.push(s === steps ? [...p2] : lerp(b1, b2, t1, t2, t));
    }
  }
  return out;
}

// Fine points along any piece, in drawing order (line, arc or curve).
export function piecePath(piece) {
  if (piece.type === 'line') return piece.points.map((p) => [...p]);
  if (piece.type === 'curve') return curvePoints(piece.points);
  const steps = Math.max(8, Math.ceil(Math.abs(piece.to - piece.from) / 0.25));
  return Array.from({ length: steps + 1 }, (_, i) => arcPoint(piece.cx, piece.cy, piece.rx, piece.ry, piece.from + ((piece.to - piece.from) * i) / steps));
}

// Move a letter drawn in font coordinates so its leftmost ink sits at MARGIN.
const movePiece = (p, dx) => (p.type === 'arc' ? { ...p, cx: p.cx + dx } : { ...p, points: p.points.map(([x, y]) => [x + dx, y]) });
const moveStroke = (s, dx) => (s.kind === 'dot' ? { ...s, at: [s.at[0] + dx, s.at[1]] } : { ...s, pieces: s.pieces.map((p) => movePiece(p, dx)) });
function atMargin(glyph) {
  const xs = glyph.strokes.flatMap((s) => (s.kind === 'dot' ? [s.at[0]] : s.pieces.flatMap((p) => piecePath(p).map(([x]) => x))));
  const dx = MARGIN - Math.min(...xs);
  const r = (v) => Math.round(v * 1000) / 1000;
  return {
    ...glyph,
    fontX: r(dx),
    strokes: glyph.strokes.map((s) => moveStroke(s, dx)),
    ...(glyph.plans ? { plans: glyph.plans.map((plan) => plan.map((s) => moveStroke(s, dx))) } : {}),
  };
}

// Shared pieces (font coordinates), so every plan is drawn from the same geometry.
const U = {
  // ج: the head, from its left end along the top to its right tip (a corner),
  // then the tail back down to the left, round below the grass, and out to the right.
  jeemHead: curve([0.127, 0.56], [0.237, 0.495], [0.517, 0.515], [0.857, 0.56]),
  jeemTail: curve([0.857, 0.56], [0.637, 0.64], [0.337, 0.78], [0.177, 1.03], [0.237, 1.28], [0.507, 1.385], [0.907, 1.3]),
  // ع: the small head from its top right, round to the left and back to the
  // right arm's tip (a corner), then the tail as for ج.
  ainHead: curve([0.527, 0.42], [0.367, 0.335], [0.187, 0.4], [0.167, 0.58], [0.337, 0.7], [0.667, 0.6]),
  ainTail: curve([0.667, 0.6], [0.437, 0.71], [0.257, 0.86], [0.197, 1.09], [0.287, 1.33], [0.557, 1.405], [0.917, 1.3]),
};

// The six sample letters (Slice 10A), keyed by their ASCII ids (src/session.js URDU).
export const URDU_GLYPHS = Object.fromEntries(Object.entries({
  // ا alif: one stroke, from the sky line straight down to the grass line.
  'ur-alif': { letter: 'ا', strokes: [
    stroke('alif', 'sky', 'grass', line([0.197, 0], [0.197, 1])),
  ] },
  // ب be: the body from its right tip, down and along the grass line to the
  // left, up to its left tip; then one dot below.
  'ur-be': { letter: 'ب', strokes: [
    stroke('body', null, null, curve([1.007, 0.42], [1.037, 0.7], [0.957, 0.86], [0.587, 0.935], [0.257, 0.89], [0.147, 0.73], [0.152, 0.58])),
    dot('dot', 0.557, 1.2),
  ] },
  // ج jeem: the head and the tail in one go (a corner at the head's tip); then
  // the dot inside, on the grass line. Or the head, then the tail.
  'ur-jeem': { letter: 'ج', strokes: [
    stroke('head and tail', null, null, U.jeemHead, U.jeemTail),
    dot('dot', 0.557, 1),
  ], plans: [
    [stroke('head', null, null, U.jeemHead), stroke('tail', null, null, U.jeemTail), dot('dot', 0.557, 1)],
  ] },
  // د dal: from the top, slanting down to the right, round and back along the grass line to the left.
  'ur-dal': { letter: 'د', strokes: [
    stroke('body', null, null, curve([0.387, 0.43], [0.477, 0.62], [0.527, 0.8], [0.467, 0.93], [0.297, 0.965], [0.097, 0.88])),
  ] },
  // ع ain: the head and the tail in one go (a corner at the arm's tip). Or the head, then the tail.
  'ur-ain': { letter: 'ع', strokes: [
    stroke('head and tail', null, null, U.ainHead, U.ainTail),
  ], plans: [
    [stroke('head', null, null, U.ainHead), stroke('tail', null, null, U.ainTail)],
  ] },
  // ے bari ye: from the top right down to the left (a corner on the grass
  // line), then the long sweep back to the right, ending in a point.
  'ur-bari-ye': { letter: 'ے', strokes: [
    stroke('body', null, null,
      curve([0.537, 0.55], [0.427, 0.68], [0.227, 0.745], [0.147, 0.81], [0.122, 0.91]),
      curve([0.122, 0.91], [0.257, 0.96], [0.597, 0.985], [0.897, 0.965], [1.107, 0.84])),
  ] },
}).map(([id, g]) => [id, atMargin(g)]));
