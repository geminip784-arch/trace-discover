// copy.js — pure functions only. No DOM, no storage, no audio.
// The copy-it round (Slice 5I, judged by shape since Slice 5J). She writes the
// whole letter on empty lines, beside a model card, and the letter is judged as
// a whole once she has finished it.
//
// Pass or fail is decided by its shape alone:
// 1. Shape: her letter, as a cloud of points (src/pdollar.js, the $P
//    recognizer), is compared with every character on the same board, in every
//    allowed stroke plan, plus a few look-alikes from the other board
//    (LOOKALIKES) and the target turned left to right. Stroke count, order and
//    direction make no difference. The target must be the nearest (or a
//    character drawn the same way, SAME_SHAPE: O and 0), and near enough
//    (COPY_MATCH.maxDistance), so a scribble fails.
// 2. Every part: each part of the target must have her ink near it, so an A
//    with no crossbar fails even when it is still nearer A than anything else.
// 3. Size: her letter must be 75% to 125% of the model's own height.
// A mirrored letter (nearest to the target turned round) passes: reversals
// are a direction cue, never an error. Jugnu shows the right way round once.
//
// Habits (start points, direction, stroke order and plan) never decide pass or
// fail. They are read by fitting her strokes, in the order she drew them, to
// each allowed plan (scoreStroke at Stage 3, as before) and are logged; when
// they differ from the default plan, Jugnu replays the usual way once.

import { DEFAULTS, pathLength, scoreStroke, scoreDot, resample, meanPairDistance, nearestOnPath } from './geometry.js';
import { candidatesFor, nextStrokes, pickCandidate, variantLabel, planCount, planChar, planStrokes } from './variants.js';
import { cloudOf, mirrorStrokes, matchDistance } from './pdollar.js';
import { BOARDS } from './session.js';
import { CHILD_SHAPES } from '../data/child-shapes.js';

// Her letter's size, as a share of the model's height.
export const COPY_SIZE = { min: 0.75, max: 1.25 };
// The habit check reads her strokes at the last stage's tolerances.
export const COPY_STAGE = 3;

// Shape judging. Tune with her real `copy` log entries, never by guesswork.
export const COPY_MATCH = {
  maxDistance: 1.2,   // $P distance: further than this from every character is not a letter
  coverRadius: 0.2,   // line units: her ink this close to a point of a part covers it
  coverMin: 0.6,      // a part with less than this share covered is missing
  maxStretch: 1.5,    // her letter may be made up to this much wider or narrower to match a template's proportions
  closeCall: 0.35,    // another character nearer by less than this: the closer lines decide (see scoreCopy)
  closeKind: 1.1,     // in a close call the target wins unless the other is this many times closer
  inkRadius: 0.25,    // line units: her ink this close to the letter counts as part of it
  inkMin: 0.75,       // at least this share of her ink must be part of the letter (a scribble is not)
  maxInk: 1.8,        // her ink may be at most this many times as long as the letter's lines (a scribble is longer)
};

// Look-alikes from the other board, compared too (a 5 written for S is caught).
export const LOOKALIKES = {
  S: ['5'], 5: ['S'], Z: ['2'], 2: ['Z'], O: ['0'], 0: ['O'],
  I: ['1'], 1: ['I'], B: ['8'], 8: ['B'], G: ['6'], 6: ['G'],
};
// Characters children write the same way: each counts as the other.
export const SAME_SHAPE = [['O', '0']];
export const sameShape = (a, b) => a === b || SAME_SHAPE.some((g) => g.includes(a) && g.includes(b));

// The characters her letter is compared with: its board, then its look-alikes.
export function compareIds(id) {
  const board = Object.values(BOARDS).find((b) => b.tiles.some((t) => t.id === id));
  const ids = board ? board.tiles.map((t) => t.id) : [id];
  return [...new Set([...ids, ...(LOOKALIKES[id] ?? [])])];
}

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

// ---- shape ----

const linePoints = (strokes) => strokes.filter((s) => s.kind === 'line').map((s) => s.points);

// The character turned left to right inside its own box (x -> width - x).
export const mirrorChar = (char) => {
  const flip = (strokes) => strokes.map((s) => ({ ...s, points: s.points.map(([x, y]) => [char.width - x, y]) }));
  return { ...char, strokes: flip(char.strokes), plans: char.plans?.map((p) => ({ ...p, strokes: flip(p.strokes) })) };
};

// Width over height of a drawing (0 for a straight up-and-down line).
const aspectOf = (strokes) => {
  const b = boxOf(strokes);
  return b && b.h > 0 ? b.w / b.h : 1;
};

// Child shapes (Slice 5J part 2, data/child-shapes.js): a letter as a
// 4-year-old writes it (M's middle point stopping short, uneven bumps...), as a
// character of its own for judging: same id and box, its own named parts.
export const childShapes = (char) => CHILD_SHAPES[char.id] ?? [];
export function childChar(char, k) {
  const shape = childShapes(char)[k];
  return { id: char.id, width: char.width, strokes: shape.strokes.map((s) => ({ kind: 'line', part: s.part, points: s.points })) };
}

// A character's templates: one cloud per allowed plan (plans differ a little,
// for example where a stroke goes back over itself), each with its width over
// height, then one per child shape (`child`: its index, else null). Cached per
// character object.
const templateCache = new WeakMap();
function templatesOf(char) {
  if (!templateCache.has(char)) {
    const make = (strokes, p, mirrored, child = null) => ({ id: char.id, plan: p, child, mirrored, aspect: aspectOf(strokes), cloud: cloudOf(strokes) });
    const list = [];
    for (let p = 0; p < planCount(char); p++) list.push(make(linePoints(planStrokes(char, p)), p, false));
    childShapes(char).forEach((_, k) => list.push(make(linePoints(childChar(char, k).strokes), 0, false, k)));
    // The target turned round, unless it looks the same in a mirror.
    const flipped = cloudOf(mirrorStrokes(linePoints(char.strokes)));
    const symmetric = matchDistance(flipped, list[0].cloud) < 0.6;
    const mirrors = symmetric ? [] : Array.from({ length: planCount(char) }, (_, p) => make(mirrorStrokes(linePoints(planStrokes(char, p))), p, true));
    templateCache.set(char, { list, mirrors });
  }
  return templateCache.get(char);
}

// Her letter made wider or narrower (never more than `max` times) towards the
// proportions `aspect`, so a letter she wrote a little thin or a little wide
// still matches its own template.
function stretchTo(strokes, aspect, max) {
  const hers = aspectOf(strokes);
  const k = hers > 0 ? Math.min(max, Math.max(1 / max, aspect / hers)) : max;
  return k === 1 ? strokes : strokes.map((pts) => pts.map(([x, y]) => [x * k, y]));
}

// Her letter against the target (and its mirror image) and every other
// character in `others`. Returns { best: { id, plan, mirrored, distance }, ranked }.
export function recognize(strokes, char, others = [], match = COPY_MATCH) {
  const own = templatesOf(char);
  const pool = [...own.list, ...own.mirrors];
  for (const o of others) if (o.id !== char.id) pool.push(...templatesOf(o).list);
  const clouds = new Map(); // her cloud for each stretch
  const cloudFor = (t) => {
    const s = stretchTo(strokes, t.aspect, match.maxStretch);
    const key = s === strokes ? 1 : aspectOf(s).toFixed(4);
    if (!clouds.has(key)) clouds.set(key, cloudOf(s));
    return clouds.get(key);
  };
  const ranked = pool
    .map((t) => ({ id: t.id, plan: t.plan, child: t.child ?? null, mirrored: t.mirrored, distance: matchDistance(cloudFor(t), t.cloud) }))
    .sort((a, b) => a.distance - b.distance);
  return { best: ranked[0], ranked };
}

// ---- every part ----

// Her fitted ink moved (translation only, a few rounds) to sit as close as it
// can to the reference, so a part she left out does not pull the rest away.
function alignTo(strokes, refs, rounds = 4) {
  let out = strokes;
  for (let r = 0; r < rounds; r++) {
    let dx = 0; let dy = 0; let n = 0;
    for (const pts of out) {
      for (const p of resample(pts, 16)) {
        let best = null;
        for (const ref of refs) {
          const q = nearestPoint(p, ref);
          if (!best || q.d < best.d) best = q;
        }
        dx += best.at[0] - p[0]; dy += best.at[1] - p[1]; n += 1;
      }
    }
    if (n === 0) return out;
    dx /= n; dy /= n;
    out = out.map((pts) => pts.map(([x, y]) => [x + dx, y + dy]));
  }
  return out;
}

// The nearest point of a path to p: { at, d }.
function nearestPoint(p, pts) {
  let best = { at: pts[0], d: Infinity };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]; const b = pts[i];
    const sx = b[0] - a[0]; const sy = b[1] - a[1];
    const len2 = sx * sx + sy * sy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * sx + (p[1] - a[1]) * sy) / len2)) : 0;
    const q = [a[0] + t * sx, a[1] + t * sy];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < best.d) best = { at: q, d };
  }
  if (pts.length === 1) best = { at: pts[0], d: Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) };
  return best;
}

// Her ink, sampled every 0.02 line units.
function inkSamples(strokes) {
  const out = [];
  for (const pts of strokes) {
    if (pts.length === 1) { out.push(pts[0]); continue; }
    out.push(...resample(pts, Math.max(2, Math.ceil(pathLength(pts) / 0.02) + 1)));
  }
  return out;
}

// How much of each part her ink covers (0..1 each). Every bit of her ink
// belongs to the part it is nearest, and only covers that part: so the slants
// of an A do not cover its missing crossbar, though they pass close by its ends.
// A point of a part is covered when ink belonging to it lies within `radius`.
export function coverage(strokes, parts, radius = COPY_MATCH.coverRadius) {
  const ink = inkSamples(strokes);
  const owned = parts.map(() => []);
  for (const q of ink) {
    let best = -1;
    let bestD = Infinity;
    parts.forEach((ref, i) => {
      const d = nearestOnPath(q, ref).distance;
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0) owned[best].push(q);
  }
  return parts.map((ref, i) => {
    const pts = resample(ref, Math.max(8, Math.ceil(pathLength(ref) / 0.04)));
    const mine = owned[i];
    let covered = 0;
    for (const p of pts) if (mine.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= radius)) covered += 1;
    return covered / pts.length;
  });
}

// Her strokes laid over the character to compare them part by part: her box
// fitted to the character's box (the height exactly, the width as far as
// match.maxStretch allows), centre on centre, then moved to sit as close to
// the character as it can. null when her letter has no height.
export function fitToParts(strokes, char, cfg = DEFAULTS, match = COPY_MATCH) {
  const ref = boxOf(linePoints(char.strokes));
  const hers = boxOf(strokes);
  if (!ref || !hers || Math.max(hers.w, hers.h) < cfg.minLength) return null;
  const tall = ref.h >= ref.w;
  const ky = tall ? (hers.h > 0 ? ref.h / hers.h : 1) : ref.w / Math.max(hers.w, 1e-9);
  const wantX = hers.w > 1e-9 ? ref.w / hers.w : ky * match.maxStretch;
  const kx = Math.min(ky * match.maxStretch, Math.max(ky / match.maxStretch, wantX));
  const fitted = strokes.map((pts) => pts.map(([x, y]) => [ref.cx + (x - hers.cx) * kx, ref.cy + (y - hers.cy) * ky]));
  return alignTo(fitted, linePoints(char.strokes));
}

// The share of her ink that lies near the character (any part of any plan),
// once laid over it (fitToParts). A scribble leaves much of its ink far away.
export function inkExplained(strokes, char, cfg = DEFAULTS, match = COPY_MATCH) {
  const aligned = fitToParts(strokes, char, cfg, match);
  if (!aligned) return 0;
  const refs = linePoints(char.strokes);
  const ink = inkSamples(aligned);
  if (ink.length === 0) return 0;
  const near = ink.filter((q) => refs.some((r) => nearestOnPath(q, r).distance <= match.inkRadius)).length;
  return near / ink.length;
}

// Her ink's length over the character's, once laid over it (fitToParts).
export function inkRatio(strokes, char, cfg = DEFAULTS, match = COPY_MATCH) {
  const aligned = fitToParts(strokes, char, cfg, match);
  if (!aligned) return Infinity;
  const total = (list) => list.reduce((sum, pts) => sum + pathLength(pts), 0);
  return total(aligned) / Math.max(total(linePoints(char.strokes)), 1e-9);
}

// How far apart her ink and the character are, both ways, once laid over it
// (fitToParts): the mean distance from the character's lines to her ink and
// from her ink to the lines, averaged. 0: exactly on top of each other.
export function chamfer(strokes, char, cfg = DEFAULTS, match = COPY_MATCH) {
  const aligned = fitToParts(strokes, char, cfg, match);
  if (!aligned) return Infinity;
  const refs = linePoints(char.strokes);
  const ink = inkSamples(aligned);
  const model = inkSamples(refs);
  const near = (pts, paths) => pts.reduce((sum, q) => sum + Math.min(...paths.map((r) => (r.length === 1 ? Math.hypot(q[0] - r[0][0], q[1] - r[0][1]) : nearestOnPath(q, r).distance))), 0) / pts.length;
  return (near(model, aligned) + near(ink, refs)) / 2;
}

// Every part of every plan, with how much of it her ink covers, least covered
// first (ties: the shorter part, the finer name). Her strokes are laid over the
// character first (fitToParts). Each is { plan, stroke, part, points, coverage }.
export function partCoverage(strokes, char, cfg = DEFAULTS, match = COPY_MATCH) {
  const laid = fitToParts(strokes, char, cfg, match);
  if (!laid) return [];
  const parts = [];
  for (let p = 0; p < planCount(char); p++) {
    const lines = planStrokes(char, p).filter((s) => s.kind === 'line');
    const covered = coverage(laid, lines.map((s) => s.points));
    planStrokes(char, p).forEach((s, k) => {
      if (s.kind !== 'line') return;
      parts.push({ plan: p, stroke: k, part: s.part ?? null, points: s.points, coverage: covered[lines.indexOf(s)], length: pathLength(s.points) });
    });
  }
  return parts.sort((a, b) => a.coverage - b.coverage || a.length - b.length);
}

// The least covered part of `char` (any plan) by another model letter's lines,
// taking each part's better cover of: as they stand, and laid over `char`.
function missingFrom(lines, char, cfg, match) {
  const asIs = [];
  for (let p = 0; p < planCount(char); p++) {
    const own = planStrokes(char, p).filter((s) => s.kind === 'line');
    coverage(lines, own.map((s) => s.points)).forEach((c, i) => asIs.push(c));
  }
  const laid = partCoverage(lines, char, cfg, match);
  let k = 0;
  const flat = [];
  for (let p = 0; p < planCount(char); p++) {
    planStrokes(char, p).forEach((s, stroke) => {
      if (s.kind !== 'line') return;
      const l = laid.find((x) => x.plan === p && x.stroke === stroke);
      flat.push({ ...l, coverage: Math.max(l.coverage, asIs[k]) });
      k += 1;
    });
  }
  return flat.sort((a, b) => a.coverage - b.coverage || a.length - b.length)[0];
}

// ---- habits: start points, directions, order and plan ----

// Score one of her fitted strokes against what may come next in one plan
// (`pc`, planChar). Returns { from, to, variant, ok, reason, startOk, directionOk, shapeOk, error }.
function scoreNext(pts, pc, done, stage, cfg) {
  const next = nextStrokes(pc, done);
  const k = next[0];
  if (pc.strokes[k].kind === 'dot') {
    const r = scoreDot(pts, pc.strokes[k].points[0], stage, cfg);
    return {
      from: k, to: k, variant: 'alone', ok: r.ok, reason: r.reason,
      startOk: r.ok, directionOk: true, shapeOk: r.ok, error: r.error,
    };
  }
  const pick = pickCandidate(pts, candidatesFor(pc, done), stage, (c, ref, s) => scoreStroke(c, ref, s, cfg), cfg);
  const r = pick.result;
  let out = {
    from: pick.variant.from, to: pick.variant.to, variant: r.ok ? variantLabel(pick.variant) : 'none',
    ok: r.ok, reason: r.reason, startOk: r.startOk, directionOk: r.directionOk, shapeOk: r.shapeOk, error: r.error,
  };
  if (!r.ok) {
    // Out of order: it is a good copy of a later stroke that is not allowed yet.
    const allowed = new Set(next);
    for (let j = 0; j < pc.strokes.length; j++) {
      if (done[j] || allowed.has(j) || pc.strokes[j].kind !== 'line') continue;
      const later = scoreStroke(pts, pc.strokes[j].points, stage, cfg);
      if (later.ok) {
        out = { ...out, from: j, to: j, variant: 'none', reason: 'wrong-order', startOk: later.startOk, directionOk: later.directionOk, shapeOk: later.shapeOk, error: later.error, expected: k };
        break;
      }
    }
  }
  return out;
}

// Her fitted strokes, in drawing order, read as one plan: [per-stroke results]
// and the plan's strokes she never drew.
function readPlan(fitted, pc, stage, cfg) {
  const results = [];
  const done = new Array(pc.strokes.length).fill(false);
  for (const pts of fitted) {
    if (done.every(Boolean)) {
      results.push({ from: null, to: null, variant: 'none', ok: false, reason: 'extra-stroke', startOk: false, directionOk: false, shapeOk: false, error: null });
      continue;
    }
    const r = scoreNext(pts, pc, done, stage, cfg);
    results.push(r);
    for (let i = r.from; i <= r.to; i++) done[i] = true;
  }
  return { results, missing: done.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0) };
}

// The plan her strokes follow best (most strokes that pass, then fewest
// strokes extra or left out, then the earlier plan), and her habits in it.
// Returns { plan, strokes: [per-stroke results], starts, directions, order, usual }:
//   starts / directions: per stroke of hers, true when right
//   order: 'usual' or 'different' (a stroke out of order, one extra or one left out)
//   usual: the default plan, every start and direction right, in order
export function readHabits(fitted, char, stage = COPY_STAGE, cfg = DEFAULTS) {
  let best = null;
  for (let p = 0; p < planCount(char); p++) {
    const r = readPlan(fitted, planChar(char, p), stage, cfg);
    const good = r.results.filter((x) => x.ok).length;
    const off = r.results.filter((x) => x.reason === 'extra-stroke').length + r.missing.length;
    if (!best || good > best.good || (good === best.good && off < best.off)) best = { plan: p, good, off, ...r };
  }
  const strokes = best.results;
  const starts = strokes.map((x) => x.startOk === true);
  const directions = strokes.map((x) => x.directionOk === true);
  const different = strokes.some((x) => x.reason === 'wrong-order' || x.reason === 'extra-stroke') || best.missing.length > 0;
  const order = different ? 'different' : 'usual';
  const usual = best.plan === 0 && order === 'usual' && starts.every(Boolean) && directions.every(Boolean);
  return { plan: best.plan, strokes, starts, directions, order, usual };
}

// ---- the whole letter ----

// Judge her whole letter. `strokes` are her strokes in the order she drew them
// (arrays of [x, y] in letter units, anywhere on the lines). `others` are the
// characters to compare it with (compareIds), as loaded character files.
// Returns {
//   ok, reason, scale, size, sizeOk,
//   match:     { id, plan, mirrored, distance } the nearest template
//   lookalike: the character it looks like instead (reason 'looks-like'), else null
//   missing:   { plan, stroke, part, points, coverage } the part to show, else null
//   mirrored:  true when it passed as the target turned round
//   habits:    readHabits(...), strokes: habits.strokes
// }
// reason (null when ok), first that applies:
//   'no-letter'      nothing with any height to measure
//   'unrecognized'   too far from every character (a scribble)
//   'looks-like'     nearer another character (missing: the target's part that
//                    character does not have, if any: the part she left out)
//   'missing-stroke' nearest the target, but a part has no ink near it (missing: that part)
//   'too-small' | 'too-big'
export function scoreCopy(strokes, char, { stage = COPY_STAGE, size = COPY_SIZE, cfg = DEFAULTS, others = [], match = COPY_MATCH } = {}) {
  const used = usableStrokes(strokes, char, cfg);
  const fit = fitLetter(used, char, size, cfg);
  const habits = fit.scale === null
    ? { plan: 0, strokes: [], starts: [], directions: [], order: 'usual', usual: true }
    : readHabits(fit.strokes, char, stage, cfg);
  const out = {
    ok: false, reason: null, scale: fit.scale, size: fit.size, sizeOk: fit.sizeOk,
    match: null, lookalike: null, missing: null, mirrored: false, habits, strokes: habits.strokes,
  };
  if (fit.scale === null) return { ...out, reason: 'no-letter' };
  const { best: nearest, ranked } = recognize(used, char, others, match);
  let best = nearest;
  out.match = best;
  if (!(best.distance <= match.maxDistance)) return { ...out, reason: 'unrecognized' };
  const charOf = (id) => (id === char.id ? char : others.find((o) => o.id === id));
  // The shape a template stands for: the character, one of its child shapes, or the character turned round.
  const shapeOf = (t) => {
    const c = charOf(t.id);
    if (!c) return null;
    if (t.child !== null && t.child !== undefined) return childChar(c, t.child);
    return t.mirrored ? mirrorChar(c) : c;
  };
  // A close call: another character is only a little nearer. Then the one
  // whose lines and her ink lie closer together, both ways, wins (a slanted O is
  // not a G: nothing of hers lies along the G's bar), and the target gets the
  // benefit of the doubt (match.closeKind).
  if (!sameShape(best.id, char.id)) {
    const own = ranked.find((t) => sameShape(t.id, char.id));
    const otherChar = charOf(best.id);
    if (own && otherChar && own.distance - best.distance <= match.closeCall) {
      if (chamfer(used, shapeOf(own), cfg, match) <= match.closeKind * chamfer(used, shapeOf(best) ?? otherChar, cfg, match)) best = own;
    }
  }
  out.match = best;
  // Her letter is judged part by part against the shape it is nearest: the
  // character (turned round if mirrored) or one of its child shapes.
  const target = best.id === char.id ? shapeOf(best) : char;
  const parts = partCoverage(used, target, cfg, match);
  const looks = sameShape(best.id, char.id) ? target : shapeOf(best) ?? target;
  // A scribble: much of her ink is nowhere near the letter it is nearest, or
  // there is far more ink than the letter has.
  if (inkExplained(used, looks, cfg, match) < match.inkMin || inkRatio(used, looks, cfg, match) > match.maxInk) return { ...out, reason: 'unrecognized' };
  if (!sameShape(best.id, char.id)) {
    // The part she left out: the part of the target that the character her
    // letter looks like does not have (that character's own lines, laid over
    // the target as her ink would be). R written as P: the leg.
    // Both are model letters on the same lines, so they are compared as they
    // stand and also laid over the target (an I stands at the left, a T's stem in
    // the middle); a part either way covers is there.
    const least = missingFrom(linePoints(looks.strokes), char, cfg, match);
    return { ...out, reason: 'looks-like', lookalike: best.id, missing: least && least.coverage < match.coverMin ? strip(least, false, char) : null };
  }
  out.mirrored = best.mirrored && best.id === char.id;
  const gone = parts.find((p) => p.coverage < match.coverMin);
  if (gone) return { ...out, reason: 'missing-stroke', missing: best.child !== null && best.child !== undefined ? modelPart(gone, char) : strip(gone, out.mirrored, char) };
  if (!fit.sizeOk) return { ...out, reason: fit.size < size.min ? 'too-small' : 'too-big' };
  return { ...out, ok: true };
}

// A part to show on the model card: always the model's own way round.
function strip({ plan, stroke, part, coverage: c }, mirrored, char) {
  return { plan, stroke, part, points: planStrokes(char, plan)[stroke].points, coverage: Math.round(c * 1000) / 1000 };
}

// A child shape's missing part, shown on the model card as the model's part of
// the same name (child shapes name their parts as a plan does: M's "right stem").
function modelPart(gone, char) {
  for (let p = 0; p < planCount(char); p++) {
    const k = planStrokes(char, p).findIndex((s) => s.part === gone.part);
    if (k >= 0) return strip({ ...gone, plan: p, stroke: k }, false, char);
  }
  return { plan: null, stroke: null, part: gone.part, points: gone.points, coverage: Math.round(gone.coverage * 1000) / 1000 };
}

// What Jugnu does on the model card after a judged copy:
//   'none'        a usual pass
//   'usual-way'   a pass in a different plan, start, direction or order: he replays the default once
//   'right-way'   a mirrored pass: he shows the right way round once
//   'part'        he draws the missing part (missing-stroke)
//   'beside'      her letter beside the model, the missed part glowing (looks-like)
//   'size'        a dashed outline at the right size round her letter
//   'slow'        he traces the whole model slowly (unrecognized, no-letter)
export function copyShow(result) {
  if (result.ok) return result.mirrored ? 'right-way' : result.habits.usual ? 'none' : 'usual-way';
  switch (result.reason) {
    case 'looks-like': return 'beside';
    case 'missing-stroke': return 'part';
    case 'too-small': case 'too-big': return 'size';
    default: return 'slow';
  }
}

// The most strokes any plan has: with that many she has surely finished.
const mostStrokes = (char) => Math.max(...Array.from({ length: planCount(char) }, (_, p) => planStrokes(char, p).length));

// Judge now? Yes once she has drawn as many strokes as the longest plan has, or
// when fewer strokes already make a passing letter (a shorter plan, or joined).
export function copyReady(strokes, char, opts = {}) {
  const used = usableStrokes(strokes, char, opts.cfg ?? DEFAULTS);
  if (used.length === 0) return false;
  if (used.length >= mostStrokes(char)) return true;
  return scoreCopy(strokes, char, opts).ok;
}

// How far her strokes are from a reference reading, in line units: every one of
// her strokes is fitted (all together, one uniform scale) to the box of the
// reference strokes it is read as, and compared in either direction (so a
// backwards stroke still reads as the stroke she meant). Infinity: no height to fit.
function readingError(used, refs, cfg) {
  const ref = boxOf(refs);
  const hers = boxOf(used);
  const tall = ref.h >= ref.w;
  const refSide = side(ref, tall);
  const herSide = side(hers, tall);
  if (refSide < cfg.minLength || herSide < cfg.minLength) return Infinity;
  const k = refSide / herSide;
  let total = 0;
  used.forEach((pts, i) => {
    const c = resample(pts.map(([x, y]) => [ref.cx + (x - hers.cx) * k, ref.cy + (y - hers.cy) * k]), cfg.samples);
    const r = resample(refs[i], cfg.samples);
    total += Math.min(meanPairDistance(c, r), meanPairDistance(c, [...r].reverse()));
  });
  return total / used.length;
}

// Every way to read her strokes, in order, as one plan's strokes in their
// allowed order (joined versions and anyOrder groups included). Each reading is
// { refs (one reference path per stroke of hers), done (plan strokes covered) }.
function readings(n, pc, gap) {
  const out = [];
  const walk = (i, done, refs) => {
    if (i === n) return out.push({ refs, done });
    if (done.every(Boolean)) return; // more strokes than the plan has: no reading
    const next = nextStrokes(pc, done);
    const options = pc.strokes[next[0]].kind === 'dot'
      ? next.map((k) => ({ from: k, to: k, points: pc.strokes[k].points }))
      : candidatesFor(pc, done, gap);
    for (const v of options) {
      const d = [...done];
      for (let k = v.from; k <= v.to; k++) d[k] = true;
      walk(i + 1, d, [...refs, v.points]);
    }
  };
  walk(0, new Array(pc.strokes.length).fill(false), []);
  return out;
}

// After her lift, what the copy round does next:
//   'judge-now'  she has drawn as many strokes as the longest plan has, or her
//                letter already passes
//   'judge-soon' fewer strokes, but they read best as a whole letter (in some
//                plan, joined): judged CONFIG.copyWaitMs after her last lift
//   'hint'       fewer strokes, and they read best as the start of the letter:
//                after CONFIG.copyHintMs Jugnu shows `next` (a stroke of `plan`)
//                on the model card. Her strokes stay; it is not a failed copy.
// Returns { action, next, plan, done }: for 'hint', `done` is the strokes of
// `plan` her strokes read as (the helper's start dots follow it, Slice 5J part 2);
// otherwise null.
export function copyStatus(strokes, char, opts = {}) {
  const cfg = opts.cfg ?? DEFAULTS;
  const used = usableStrokes(strokes, char, cfg);
  if (used.length > 0 && copyReady(strokes, char, opts)) return { action: 'judge-now', next: null, plan: 0, done: null };
  let best = null;
  for (let p = 0; p < planCount(char); p++) {
    const pc = planChar(char, p);
    for (const r of readings(used.length, pc, opts.gap)) {
      const error = used.length === 0 ? 0 : readingError(used, r.refs, cfg);
      if (!best || error < best.error) best = { ...r, error, plan: p, pc };
    }
  }
  if (best && best.error < Infinity && best.done.every(Boolean)) return { action: 'judge-soon', next: null, plan: best.plan, done: null };
  if (!best || best.error === Infinity) return { action: 'hint', next: nextStrokes(char, new Array(char.strokes.length).fill(false))[0], plan: 0, done: null };
  return { action: 'hint', next: nextStrokes(best.pc, best.done)[0], plan: best.plan, done: best.done };
}

const childName = (t) => (t.child !== null && t.child !== undefined ? CHILD_SHAPES[t.id]?.[t.child]?.name ?? null : null);

const round4 = (v) => (Number.isFinite(v) ? Number(v.toFixed(4)) : null);

// One attempt-log entry for a judged copy (type 'copy'). Existing entry types are unchanged.
export function copyLogEntry({ char, result, attempt, helped = false, helper = null, now = new Date() }) {
  const h = result.habits;
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
    // child: the child shape it matched (data/child-shapes.js, Slice 5J part 2), else null.
    match: result.match ? { char: result.match.id, plan: result.match.plan, child: childName(result.match), mirrored: result.match.mirrored, distance: round4(result.match.distance) } : null,
    lookalike: result.lookalike,
    missing: result.missing ? { plan: result.missing.plan, stroke: result.missing.stroke, part: result.missing.part } : null,
    mirrored: result.mirrored,
    // Habits: never pass or fail, only coached.
    plan: h.plan,         // the stroke plan her strokes follow best (0: the default)
    starts: h.starts,     // per stroke of hers: started in the right place
    directions: h.directions, // per stroke of hers: went the right way
    order: h.order,       // 'usual' or 'different'
    usual: h.usual,
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
    helper,               // Slice 5J part 2: the helper level shown on the lines for this copy (1, 2 or 3)
  };
}
