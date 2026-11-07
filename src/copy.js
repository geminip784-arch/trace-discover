// copy.js — pure functions only. No DOM, no storage, no audio.
// Slice 5I: the copy-it round. She writes the whole letter on empty lines, beside
// a model card, and the letter is judged as a whole once she has finished it:
//
// 1. Her letter's box is fitted to the reference letter's box with one uniform
//    scale (no stretching), so where she writes on the lines never matters.
// 2. Size: her letter must be 75% to 125% of the model's own height (for every
//    capital and digit that is sky line to grass line; tests/copy.test.js checks).
// 3. Her strokes, in the order she drew them, are matched to the reference strokes
//    in their recorded order (anyOrder groups and one-stroke joins allowed, as in
//    every round). Each one is scored with scoreStroke at Stage 3: direction, then
//    shape, then start. The scoring thresholds are the existing DEFAULTS.stages[3].
// 4. A stroke that matches a later reference stroke is in the wrong order. A
//    reference stroke she never drew is missing. A stroke after the letter is
//    complete is extra.

import { DEFAULTS, pathLength, scoreStroke, scoreDot } from './geometry.js';
import { candidatesFor, nextStrokes, pickCandidate, variantLabel } from './variants.js';

// Her letter's size, as a share of the model's height.
export const COPY_SIZE = { min: 0.75, max: 1.25 };
// The copy round is always judged at the last stage's tolerances.
export const COPY_STAGE = 3;

// The box round a list of strokes (arrays of [x, y]): { x0, y0, x1, y1, w, h, cx, cy }.
export function boxOf(strokes) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const pts of strokes) {
    for (const [x, y] of pts) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x0 === Infinity) return null;
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// The reference letter's box, from every point of every stroke (lines and dots).
export const refBox = (char) => boxOf(char.strokes.map((s) => s.points));

// A tap, not a stroke (shorter than DEFAULTS.minLength).
export const isTap = (pts, cfg = DEFAULTS) => pts.length < 2 || pathLength(pts) < cfg.minLength;

// The strokes that take part. Taps are dropped unless the character has dots
// (Urdu nuqtas, the dot on i and j), where a tap is a real stroke.
export function usableStrokes(strokes, char, cfg = DEFAULTS) {
  const hasDots = char.strokes.some((s) => s.kind === 'dot');
  return strokes.filter((pts) => pts.length > 0 && (hasDots || !isTap(pts, cfg)));
}

// The model's measuring side: its height, or its width if that is longer (no
// capital or digit has one). Her size is measured along the same side.
const side = (box, tall) => (tall ? box.h : box.w);

// Fit her strokes to the reference box with one uniform scale, centre on centre.
// Returns { scale, size, sizeOk, strokes } (strokes fitted, in letter units), or
// a result with scale null when her letter has no height to measure.
export function fitLetter(strokes, char, size = COPY_SIZE, cfg = DEFAULTS) {
  const ref = refBox(char);
  const hers = boxOf(strokes);
  const tall = ref.h >= ref.w;
  const refSide = side(ref, tall);
  const herSide = hers ? side(hers, tall) : 0;
  if (!hers || herSide < cfg.minLength) return { scale: null, size: 0, sizeOk: false, strokes };
  const scale = refSide / herSide;
  const ratio = herSide / refSide;
  const fitted = strokes.map((pts) => pts.map(([x, y]) => [
    ref.cx + (x - hers.cx) * scale,
    ref.cy + (y - hers.cy) * scale,
  ]));
  // Rounded so 0.75 and 1.25 themselves pass, whatever the float error.
  const r = Math.round(ratio * 1e6) / 1e6;
  return { scale, size: ratio, sizeOk: r >= size.min && r <= size.max, strokes: fitted };
}

// Score one of her fitted strokes against what may come next. Returns
// { from, to, variant, ok, reason, startOk, directionOk, shapeOk, error }.
function scoreNext(pts, char, done, stage, cfg) {
  const next = nextStrokes(char, done);
  const k = next[0];
  if (char.strokes[k].kind === 'dot') {
    const r = scoreDot(pts, char.strokes[k].points[0], stage, cfg);
    return {
      from: k, to: k, variant: 'alone', ok: r.ok, reason: r.reason,
      startOk: r.ok, directionOk: true, shapeOk: r.ok, error: r.error,
    };
  }
  const pick = pickCandidate(pts, candidatesFor(char, done), stage, (c, ref, s) => scoreStroke(c, ref, s, cfg), cfg);
  const r = pick.result;
  let out = {
    from: pick.variant.from, to: pick.variant.to, variant: r.ok ? variantLabel(pick.variant) : 'none',
    ok: r.ok, reason: r.reason, startOk: r.startOk, directionOk: r.directionOk, shapeOk: r.shapeOk, error: r.error,
  };
  if (!r.ok) {
    // Out of order: it is a good copy of a later stroke that is not allowed yet.
    const allowed = new Set(next);
    for (let j = 0; j < char.strokes.length; j++) {
      if (done[j] || allowed.has(j) || char.strokes[j].kind !== 'line') continue;
      const later = scoreStroke(pts, char.strokes[j].points, stage, cfg);
      if (later.ok) {
        out = { ...out, from: j, to: j, variant: 'none', reason: 'wrong-order', startOk: later.startOk, directionOk: later.directionOk, shapeOk: later.shapeOk, error: later.error, expected: k };
        break;
      }
    }
  }
  return out;
}

// Judge her whole letter. `strokes` are her strokes in the order she drew them
// (arrays of [x, y] in letter units, anywhere on the lines).
// Returns {
//   ok, reason, wrongStroke, scale, size, sizeOk, strokes: [per-stroke results],
// }
// reason (null when ok): 'too-small' | 'too-big' | 'no-letter' for the size,
// else the first problem in drawing order: a scoreStroke reason, 'wrong-order',
// 'extra-stroke' or 'off-target' (a dot), else 'missing-stroke'.
// wrongStroke: the reference stroke Jugnu should show again (0-based), or null
// when the problem is the whole letter's size.
export function scoreCopy(strokes, char, { stage = COPY_STAGE, size = COPY_SIZE, cfg = DEFAULTS } = {}) {
  const used = usableStrokes(strokes, char, cfg);
  const fit = fitLetter(used, char, size, cfg);
  const results = [];
  const done = new Array(char.strokes.length).fill(false);
  if (fit.scale !== null) {
    for (const pts of fit.strokes) {
      if (done.every(Boolean)) {
        results.push({ from: null, to: null, variant: 'none', ok: false, reason: 'extra-stroke', startOk: false, directionOk: false, shapeOk: false, error: null });
        continue;
      }
      const r = scoreNext(pts, char, done, stage, cfg);
      results.push(r);
      for (let i = r.from; i <= r.to; i++) done[i] = true;
    }
  }
  const missing = done.indexOf(false);
  const firstBad = results.find((r) => !r.ok);
  let reason = null;
  let wrongStroke = null;
  if (fit.scale === null) reason = 'no-letter';
  else if (!fit.sizeOk) reason = fit.size < size.min ? 'too-small' : 'too-big';
  else if (firstBad) {
    reason = firstBad.reason;
    wrongStroke = firstBad.reason === 'wrong-order' ? firstBad.expected
      : firstBad.reason === 'extra-stroke' ? null : firstBad.from;
  } else if (missing !== -1) {
    reason = 'missing-stroke';
    wrongStroke = missing;
  }
  return {
    ok: reason === null,
    reason,
    wrongStroke,
    scale: fit.scale,
    size: fit.size,
    sizeOk: fit.sizeOk,
    strokes: results,
  };
}

// Judge now? Yes once she has drawn as many strokes as the letter has, or when
// fewer strokes already make a passing letter (she joined some). Otherwise the
// game waits CONFIG.copyWaitMs after her last lift and judges then.
export function copyReady(strokes, char, opts = {}) {
  const used = usableStrokes(strokes, char, opts.cfg ?? DEFAULTS);
  if (used.length === 0) return false;
  if (used.length >= char.strokes.length) return true;
  return scoreCopy(strokes, char, opts).ok;
}

const round4 = (v) => (Number.isFinite(v) ? Number(v.toFixed(4)) : null);

// One attempt-log entry for a judged copy (type 'copy'). Existing entry types are unchanged.
export function copyLogEntry({ char, result, attempt, helped = false, now = new Date() }) {
  return {
    type: 'copy',
    time: now.toISOString(),
    char,
    attempt,              // 1, 2 or 3: which copy of this round
    ok: result.ok,
    reason: result.reason,
    scale: round4(result.scale),
    size: round4(result.size),
    sizeOk: result.sizeOk,
    strokes: result.strokes.map((r) => ({
      stroke: r.from,
      variant: r.variant,
      ok: r.ok,
      reason: r.reason,
      startOk: r.startOk,
      directionOk: r.directionOk,
      shapeOk: r.shapeOk,
      error: round4(r.error),
    })),
    helped,               // true: the third failed copy, so the round ends with help
  };
}
