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
// Urdu (Slice 10C, src/urdu-dots.js): the body is judged by shape against every
// Urdu letter's body (letters that share a body count as the same shape), then
// her dots and small marks: how many, and on top or not (scoreUrdu).
//
// Habits (start points, direction, stroke order and plan) never decide pass or
// fail. They are read by fitting her strokes, in the order she drew them, to
// each allowed plan (scoreStroke at Stage 3, as before) and are logged; when
// they differ from the default plan, Jugnu replays the usual way once.

import { DEFAULTS, pathLength, scoreStroke, scoreDot, resample, meanPairDistance, nearestOnPath } from './geometry.js';
import { candidatesFor, nextStrokes, pickCandidate, variantLabel, planCount, planChar, planStrokes, DOT_MAX } from './variants.js';
import { cloudOf, mirrorStrokes, matchDistance } from './pdollar.js';
import { BOARDS, pageOf, pageTiles } from './session.js';
import { CHILD_SHAPES } from '../data/child-shapes.js';
import { MARGIN } from '../data/glyphs.js';
import {
  isUrdu, sameBody, familyOf, sortSmall, readMarks, expectedMarks, compareMarks, marksToShow, memberMatching, marksSummary, middleOf, tapCanBeMark,
} from './urdu-dots.js';

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
  dotRadius: 0.22,    // Slice 9A: line units, once her letter is fitted: her dot this close to the dot of i or j counts
  dotShare: 0.4,      // a mark is a dot only if it is also no longer than this share of her longest stroke
};

// Look-alikes from the other board, compared too (a 5 written for S is caught).
export const LOOKALIKES = {
  S: ['5'], 5: ['S'], Z: ['2'], 2: ['Z'], O: ['0'], 0: ['O'],
  I: ['1'], 1: ['I'], B: ['8'], 8: ['B'], G: ['6'], 6: ['G'],
};
// Slice 9A: a lowercase letter is compared with every lowercase letter and these
// capitals and digits that look like one (a capital written for its lowercase
// letter, a 9 for a g, a 6 for a b...).
export const LOWER_LOOKALIKES = ['C', 'O', 'S', 'U', 'V', 'W', 'X', 'Z', 'P', 'K', 'Y', 'J', 'I', '0', '1', '2', '5', '6', '9'];
// Characters children write the same way: each counts as the other. Since
// Slice 9A also l and I (both a stick from the sky to the grass; i's lines are
// that stick too, and j's are J), and each
// lowercase letter that is its capital made smaller: these pass on shape, and
// the size check then asks for a capital-sized one to be smaller. Capitals are
// never compared with lowercase, so their judging is unchanged.
export const SAME_SHAPE = [
  ['O', '0', 'o'], ['I', 'l', 'i'], ['J', 'j'], // i and j by their lines: the dot is checked on its own
  ['C', 'c'], ['S', 's'], ['U', 'u'], ['V', 'v'], ['W', 'w'], ['X', 'x'], ['Z', 'z'], ['P', 'p'],
];
export const sameShape = (a, b) => a === b || SAME_SHAPE.some((g) => g.includes(a) && g.includes(b));

export const isLower = (id) => /^[a-z]$/.test(id);

// Lowercase letters whose mirror image is another letter (b and d, p and q):
// they have no "written the other way round" template, so a d written for b is
// read as d ("Almost! That looks like d."), never as a mirrored b.
export const MIRROR_IS_LETTER = ['b', 'd', 'p', 'q'];
// Letters that turn into each other (mirrored, upside down or both). A copy
// read as one of these says "That looks like d", never a missing part.
export const TURNED = {
  b: ['d', 'p', 'q'], d: ['b', 'p', 'q'], p: ['b', 'd', 'q'], q: ['b', 'd', 'p'],
  n: ['u'], u: ['n'], m: ['w', 'W'], w: ['m'],
};

// Numbers 10 to 20 (Slice 9B part 2): a character file with `digits`.
export const isNumber = (char) => Array.isArray(char?.digits);
const isTwoDigit = (id) => /^\d\d$/.test(id);

// The characters her letter is compared with: its board page, then its look-alikes.
// A digit is compared with the digits 0 to 9 only (never 10 to 20, which share
// its board), so its judging is as before Slice 9B. A number 10 to 20 loads its
// digits' lists: each digit is judged on its own (scoreNumber).
export function compareIds(id) {
  if (isTwoDigit(id)) return [...new Set(id.split('').flatMap(compareIds))];
  const entry = Object.entries(BOARDS).find(([, b]) => b.tiles.some((t) => t.id === id));
  const ids = entry ? pageTiles(entry[0], pageOf(id)).map((t) => t.id).filter((t) => !isTwoDigit(t)) : [id];
  const extra = isLower(id) ? LOWER_LOOKALIKES : (LOOKALIKES[id] ?? []);
  return [...new Set([...ids, ...extra])];
}

// ---- line position (Slice 9A, lowercase only) ----
// Where a lowercase letter sits on the lines is part of the letter (p and P
// have the same shape and height). A gentle check, after shape and size:
//   tails (g j p q y): her lowest ink at least `tailBelow` below the grass line
//   tall (b d f h k l): her highest ink at least `tallAbove` above the fence (t: `tAbove`)
//   small (the rest, and the body of i): at least `smallShare` of her ink
//     between `band` above the fence and `band` below the grass
// Line units: sky 0, fence 0.5, grass 1, tail line 1.5. Capitals and digits are never checked.
// Urdu (Slice 10C): a letter whose model dips at least `urduDipModel` below the
// grass line (a tail or a bowl: ر س ص ق ل م ن و ی, the ج and ع families) must
// dip at least `urduDipBelow` below it too. Letters that sit on the grass line are not checked.
export const POSITION = { tailBelow: 0.15, tallAbove: 0.2, tAbove: 0.1, band: 0.15, smallShare: 0.7, urduDipBelow: 0.15, urduDipModel: 0.2 };
export const LOWER_HEIGHTS = { tail: 'gjpqy', tall: 'bdfhklt' };
export function heightKind(id) {
  if (!isLower(id)) return null;
  if (LOWER_HEIGHTS.tail.includes(id)) return 'tail';
  return LOWER_HEIGHTS.tall.includes(id) ? 'tall' : 'small';
}
// The guide lines that glow with each position reason (y in line units).
export const POSITION_LINES = { 'position-tail': [1, 1.5], 'position-tall': [0, 0.5], 'position-small': [0.5, 1] };

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

// The reference letter's box, from its lines (a dot, on i and j, is checked on
// its own and never stretches the box), or every point when it has no lines.
export const refBox = (char) => {
  const lines = char.strokes.filter((s) => s.kind === 'line');
  return boxOf((lines.length ? lines : char.strokes).map((s) => s.points));
};

// ---- dots (Slice 9A: the dot of i and j) ----

// The dot strokes of a character's default plan: [{ stroke, part, at }].
export const dotsOf = (char) => char.strokes.flatMap((s, stroke) => (s.kind === 'dot' ? [{ stroke, part: s.part ?? 'dot', at: s.points[0] }] : []));

// Her strokes split into marks (taps or tiny strokes: her dots) and lines, for a
// character with dots. A mark is no longer than DOT_MAX and no longer than
// match.dotShare of her longest stroke, so a tiny letter's stick stays a line.
// Characters with no dots: every stroke is a line.
export function splitMarks(strokes, char, match = COPY_MATCH) {
  if (dotsOf(char).length === 0) return { lines: strokes, marks: [] };
  const longest = Math.max(0, ...strokes.map(pathLength));
  const isMark = (pts) => pathLength(pts) <= Math.min(DOT_MAX, match.dotShare * longest);
  return { lines: strokes.filter((p) => !isMark(p)), marks: strokes.filter(isMark) };
}

// A tap, not a stroke (shorter than DEFAULTS.minLength).
export const isTap = (pts, cfg = DEFAULTS) => pts.length < 2 || pathLength(pts) < cfg.minLength;

// The strokes that take part. Taps are dropped unless the character has dots
// (the dot on i and j) or is Urdu (Slice 10C: a tap is a dot, or a little ṭ by
// its place, and a dot on a letter with none is a mistake to name), where a tap is a real stroke.
export function usableStrokes(strokes, char, cfg = DEFAULTS) {
  const hasDots = isUrdu(char) || char.strokes.some((s) => s.kind === 'dot');
  return strokes.filter((pts) => pts.length > 0 && (hasDots || !isTap(pts, cfg)));
}

// The model's measuring side: its height, or its width if that is longer (no
// capital or digit has one). Her size is measured along the same side.
const side = (box, tall) => (tall ? box.h : box.w);

// Urdu (Slice 10D): a letter box this wide and this tall (line units) is measured both ways.
const URDU_MEASURE = 0.2;

// Fit her strokes to the reference box with one uniform scale, centre on centre.
// Returns { scale, size, sizeOk, strokes } (strokes fitted, in letter units), or
// a result with scale null when her letter has no height to measure.
// `extra` (her dots, Slice 9A) are moved by the same fit, but take no part in it.
export function fitLetter(strokes, char, size = COPY_SIZE, cfg = DEFAULTS, extra = []) {
  const ref = refBox(char);
  const hers = boxOf(strokes);
  // A lowercase letter is always measured on its height (Slice 9A): small, tall
  // or tail. So is a number 10 to 20 (Slice 9B), though it is wider than tall.
  const tall = ref.h >= ref.w || char.case === 'lower' || isNumber(char);
  const refSide = side(ref, tall);
  const herSide = hers ? side(hers, tall) : 0;
  if (!hers || herSide < cfg.minLength) return { scale: null, size: 0, sizeOk: false, strokes, extra };
  let scale = refSide / herSide;
  let ratio = herSide / refSide;
  // Slice 10D: an Urdu letter is measured on its height and width together (the
  // middle of the two ratios), so one written a little narrower but full height,
  // or wider but low, is judged on its whole size. A straight up-and-down letter
  // (ا) has no width to measure: its height alone.
  if (isUrdu(char) && ref.w >= URDU_MEASURE && ref.h >= URDU_MEASURE && hers.w >= cfg.minLength && hers.h >= cfg.minLength) {
    ratio = Math.sqrt((hers.w / ref.w) * (hers.h / ref.h));
    scale = 1 / ratio;
  }
  const move = (pts) => pts.map(([x, y]) => [
    ref.cx + (x - hers.cx) * scale,
    ref.cy + (y - hers.cy) * scale,
  ]);
  // Rounded so 0.75 and 1.25 themselves pass, whatever the float error.
  const r = Math.round(ratio * 1e6) / 1e6;
  return { scale, size: ratio, sizeOk: r >= size.min && r <= size.max, strokes: strokes.map(move), extra: extra.map(move) };
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
    const mirrors = symmetric || MIRROR_IS_LETTER.includes(char.id) ? [] : Array.from({ length: planCount(char) }, (_, p) => make(mirrorStrokes(linePoints(planStrokes(char, p))), p, true));
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

// Points of two parts closer than this lie on both (line units).
const OVERLAP = 0.02;

// How much of each part her ink covers (0..1 each). Every bit of her ink
// belongs to the part it is nearest, and only covers that part: so the slants
// of an A do not cover its missing crossbar, though they pass close by its ends.
// A point of a part is covered when ink belonging to it lies within `radius`.
// ownOnly (lowercase, Slice 9A): a part's points that lie on another part (u's
// stick runs back down over its cup) are left out, so each part is judged on
// the ink only it can have.
export function coverage(strokes, parts, radius = COPY_MATCH.coverRadius, { ownOnly = false } = {}) {
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
    let pts = resample(ref, Math.max(8, Math.ceil(pathLength(ref) / 0.04)));
    if (ownOnly) {
      const own = pts.filter((p) => parts.every((other, j) => j === i || nearestOnPath(p, other).distance > OVERLAP));
      if (own.length >= 2) pts = own;
    }
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
  // Slice 5O part 3: fitted by the height when hers has next to no width (a
  // straight up-and-down line judged as a wide letter such as e), never by a width of almost 0.
  const tall = ref.h >= ref.w || hers.w < cfg.minLength;
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
    const covered = coverage(laid, lines.map((s) => s.points), match.coverRadius, { ownOnly: char.case === 'lower' });
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

// For a lowercase target: a capital or digit her letter looks like that is the
// same shape as a lowercase letter (U as u, O as o) is named as that lowercase
// letter, so the line names a letter on her board ("That looks like u").
// Only the name: the shape judged is still the capital's.
function twinOf(id, char, ranked) {
  if (!isLower(char.id) || isLower(id)) return id;
  const group = SAME_SHAPE.find((g) => g.includes(id));
  return group?.find((c) => isLower(c) && ranked.some((r) => r.id === c)) ?? id;
}

// ---- habits: start points, directions, order and plan ----

// A stroke judged by its place: a dot, or an Urdu mark (Slice 10C).
const isSpot = (s) => s.kind === 'dot' || s.kind === 'mark';

// Score one of her fitted strokes against what may come next in one plan
// (`pc`, planChar). Returns { from, to, variant, ok, reason, startOk, directionOk, shapeOk, error }.
function scoreNext(pts, pc, done, stage, cfg) {
  const next = nextStrokes(pc, done);
  let k = next[0];
  if (isSpot(pc.strokes[k])) {
    // A dot, or an Urdu mark (Slice 10C) by its middle. Dots side by side may
    // come in any order: hers is read as the nearest one still to draw.
    const at = (j) => (pc.strokes[j].kind === 'dot' ? pc.strokes[j].points[0] : middleOf(pc.strokes[j].points));
    const spots = next.filter((j) => isSpot(pc.strokes[j]));
    const mine = middleOf(pts);
    k = spots.reduce((a, j) => (Math.hypot(at(j)[0] - mine[0], at(j)[1] - mine[1]) < Math.hypot(at(a)[0] - mine[0], at(a)[1] - mine[1]) ? j : a), spots[0]);
    const r = scoreDot(pts, at(k), stage, cfg);
    // Urdu: a dot or a mark has no start or direction to coach (only its order and place are read).
    const urdu = pc.script === 'urdu';
    return {
      from: k, to: k, variant: 'alone', ok: r.ok, reason: r.reason,
      startOk: urdu || r.ok, directionOk: true, shapeOk: r.ok, error: r.error,
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
//   'position-tail' | 'position-tall' | 'position-small'  lowercase only (Slice 9A):
//                    not where it belongs on the lines (checkPosition)
//   Urdu (Slice 10C, scoreUrdu): 'missing-mark', 'dot-count', 'dot-side', and
//                    'position-tail' for a tail or bowl that does not dip below the grass
export function scoreCopy(strokes, char, { stage = COPY_STAGE, size = COPY_SIZE, cfg = DEFAULTS, others = [], match = COPY_MATCH, position = POSITION } = {}) {
  if (isNumber(char)) return scoreNumber(strokes, char, { stage, size, cfg, others, match });
  if (isUrdu(char)) return scoreUrdu(strokes, char, { stage, size, cfg, others, match, position });
  const all = usableStrokes(strokes, char, cfg);
  // i and j (Slice 9A): her dots are checked on their own, after the shape;
  // the shape and the size are judged on her lines alone.
  const { lines: used, marks } = splitMarks(all, char, match);
  const fit = fitLetter(used, char, size, cfg, marks);
  // Her strokes, fitted, in the order she drew them (for the habits).
  const fittedOf = new Map([...used.map((p, i) => [p, fit.strokes[i]]), ...marks.map((p, i) => [p, fit.extra[i]])]);
  const habits = fit.scale === null
    ? { plan: 0, strokes: [], starts: [], directions: [], order: 'usual', usual: true }
    : readHabits(all.map((p) => fittedOf.get(p)), char, stage, cfg);
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
  // A letter turned into another (b, d, p, q; n, u; m, w) is read as that
  // letter, ahead of a look-alike digit or capital nearly as close (a p
  // turned round is a q, not a 9).
  const turnedInto = (id) => TURNED[char.id]?.includes(twinOf(id, char, ranked)) === true;
  if (!sameShape(best.id, char.id) && !turnedInto(best.id)) {
    const turned = ranked.find((t) => turnedInto(t.id) && !t.mirrored);
    if (turned && turned.distance - best.distance <= match.closeCall) best = turned;
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
    // A letter turned into another (b and d, n and u...): "That looks like d", no missing part.
    const lookalike = twinOf(best.id, char, ranked);
    if (turnedInto(best.id)) return { ...out, reason: 'looks-like', lookalike, missing: null };
    const least = missingFrom(linePoints(looks.strokes), char, cfg, match);
    return { ...out, reason: 'looks-like', lookalike, missing: least && least.coverage < match.coverMin ? strip(least, false, char) : null };
  }
  out.mirrored = best.mirrored && best.id === char.id;
  const gone = parts.find((p) => p.coverage < match.coverMin);
  if (gone) return { ...out, reason: 'missing-stroke', missing: best.child !== null && best.child !== undefined ? modelPart(gone, char) : strip(gone, out.mirrored, char) };
  // The dot of i and j: one of her marks near its place (turned round with a mirrored letter).
  const lost = missingDot(fit.extra, char, out.mirrored, match);
  if (lost) return { ...out, reason: 'missing-stroke', missing: lost };
  if (!fit.sizeOk) return { ...out, reason: fit.size < size.min ? 'too-small' : 'too-big' };
  // Lowercase: where it sits on the lines (her lines as she wrote them, not fitted).
  const placed = checkPosition(used, char, position);
  if (placed) return { ...out, reason: placed };
  return { ...out, ok: true };
}

// ---- Urdu (Slice 10C) ----

// Judge her Urdu letter: the body by shape, then her dots and marks
// (src/urdu-dots.js), then size and where it sits. Same result as scoreCopy,
// plus `dots` (marksSummary) and, for 'looks-like', `lookalikeId`; `lookalike`
// is the letter itself ("That looks like ر"). Her middling strokes are read as
// part of the body or as marks, whichever lets the body read best.
function scoreUrdu(strokes, char, { stage, size, cfg, others, match, position }) {
  const all = usableStrokes(strokes, char, cfg);
  const small = sortSmall(all);
  const n = small.middling.length;
  // Each reading of her middling strokes (as part of the body, or as marks).
  // The nearest wins; but a reading whose body is the target's family, nearly
  // as near (within match.closeCall), gets the benefit of the doubt (گ's second
  // slant drawn small is part of its body, not a mark).
  let nearest = null;
  let ownBest = null;
  for (let mask = 0; mask < (n <= 3 ? 1 << n : 1); mask++) {
    const asBody = n <= 3 ? small.middling.filter((_, i) => mask & (1 << i)) : small.middling;
    const body = all.filter((pts) => small.lines.includes(pts) || asBody.includes(pts));
    if (body.length === 0) continue;
    const rec = recognize(body, char, others, match);
    const reading = { body, marks: small.middling.filter((pts) => !asBody.includes(pts)), rec };
    if (!nearest || rec.best.distance < nearest.rec.best.distance) nearest = reading;
    if (sameBody(rec.best.id, char.id) && (!ownBest || rec.best.distance < ownBest.rec.best.distance)) ownBest = reading;
  }
  const pick = ownBest && ownBest.rec.best.distance <= nearest.rec.best.distance + match.closeCall ? ownBest : nearest;
  const empty = { ok: false, reason: 'no-letter', scale: null, size: 0, sizeOk: false, match: null, lookalike: null, missing: null, mirrored: false, dots: null };
  const noHabits = { plan: 0, strokes: [], starts: [], directions: [], order: 'usual', usual: true };
  if (!pick) return { ...empty, habits: noHabits, strokes: [] };
  const used = pick.body;
  const fit = fitLetter(used, char, size, cfg, [...small.dots, ...pick.marks]);
  if (fit.scale === null) return { ...empty, habits: noHabits, strokes: [] };
  const fittedOf = new Map([...used.map((p, i) => [p, fit.strokes[i]]), ...[...small.dots, ...pick.marks].map((p, i) => [p, fit.extra[i]])]);
  const habits = readHabits(all.map((p) => fittedOf.get(p)), char, stage, cfg);
  const hers = readMarks(fit.extra.slice(0, small.dots.length), fit.extra.slice(small.dots.length), fit.strokes);
  const out = {
    ok: false, reason: null, scale: fit.scale, size: fit.size, sizeOk: fit.sizeOk,
    match: null, lookalike: null, missing: null, mirrored: false, habits, strokes: habits.strokes, dots: marksSummary(hers),
  };
  const { ranked } = pick.rec;
  let best = pick.rec.best;
  out.match = best;
  if (!(best.distance <= match.maxDistance)) return { ...out, reason: 'unrecognized' };
  const charOf = (id) => (id === char.id ? char : others.find((o) => o.id === id));
  const shapeOf = (t) => {
    const c = sameBody(t.id, char.id) ? char : charOf(t.id);
    if (!c) return null;
    if (t.child !== null && t.child !== undefined) return childChar(c, t.child);
    return t.mirrored ? mirrorChar(c) : c;
  };
  // Shapes alike that differ in where they sit (د on the grass, ر dipping
  // below it): her ink decides, as long as the target's shape is within the
  // shape limit. Otherwise a close call, as for every other letter: the closer
  // lines decide, with the benefit of the doubt to the target.
  if (!sameBody(best.id, char.id)) {
    const own = ranked.find((t) => sameBody(t.id, char.id));
    const otherChar = charOf(best.id);
    const dips = Math.max(...inkSamples(used).map((p) => p[1])) >= 1 + position.urduDipBelow;
    if (own && otherChar && own.distance <= match.maxDistance
      && urduDips(char, position) !== urduDips(otherChar, position) && dips === urduDips(char, position)) best = own;
    else if (own && otherChar && own.distance - best.distance <= match.closeCall) {
      if (chamfer(used, shapeOf(own), cfg, match) <= match.closeKind * chamfer(used, shapeOf(best) ?? otherChar, cfg, match)) best = own;
    }
  }
  out.match = best;
  const mine = sameBody(best.id, char.id);
  const target = mine ? shapeOf(best) : char;
  const looks = mine ? target : shapeOf(best) ?? target;
  if (inkExplained(used, looks, cfg, match) < match.inkMin || inkRatio(used, looks, cfg, match) > match.maxInk) return { ...out, reason: 'unrecognized' };
  if (!mine) {
    // Her body is another family's: named as the letter her dots make with it (ز, not ر).
    const members = familyOf(best.id).map(charOf).filter(Boolean);
    const named = memberMatching(hers, members) ?? charOf(best.id);
    const least = missingFrom(linePoints(looks.strokes), char, cfg, match);
    return {
      ...out, reason: 'looks-like', lookalike: named.letter ?? named.id, lookalikeId: named.id,
      missing: least && least.coverage < match.coverMin ? strip(least, false, char) : null,
    };
  }
  out.mirrored = best.mirrored;
  const gone = partCoverage(used, target, cfg, match).find((p) => p.coverage < match.coverMin);
  if (gone) return { ...out, reason: 'missing-stroke', missing: best.child !== null && best.child !== undefined ? modelPart(gone, char) : strip(gone, out.mirrored, char) };
  // Her dots and marks: how many, and on top or not.
  const want = expectedMarks(char);
  const problem = compareMarks(hers, want, { tapForMark: tapCanBeMark(char, familyOf(char.id).map(charOf).filter(Boolean)) });
  if (problem) {
    if (problem.reason === 'extra-mark') {
      // A mark on a letter with none (ر with a little ṭ): the letter it makes, if there is one.
      const named = memberMatching(hers, familyOf(char.id).map(charOf).filter(Boolean));
      if (named) return { ...out, reason: 'looks-like', lookalike: named.letter ?? named.id, lookalikeId: named.id };
      return { ...out, reason: 'dot-count', need: 0, missing: null };
    }
    return { ...out, reason: problem.reason, need: problem.need ?? null, side: problem.side ?? null, missing: marksToShow(problem, want) };
  }
  if (!fit.sizeOk) return { ...out, reason: fit.size < size.min ? 'too-small' : 'too-big' };
  const placed = checkPosition(used, char, position);
  if (placed) return { ...out, reason: placed };
  return { ...out, ok: true };
}

// ---- numbers 10 to 20 (Slice 9B part 2) ----
// A number is judged digit by digit. Her strokes are split into a left and a
// right part by where they are (splitDigits), and each part is judged as that
// digit, exactly as a single digit is (scoreCopy against the digits 0 to 9 and
// their look-alikes): shape, every part, and size. Both must be right, and the
// whole number must be the right size (75% to 125% of the model's height).
// A reversed digit passes and is coached, as a single one is. Habits (start,
// direction, order: the right digit first is a habit) are read on the whole
// number, against its plans, and never fail it.
// Reasons, besides a digit's own (its look-alike named as the whole number:
// 17 with a 3 for its 7 "looks like 13"; its missing part named with its digit:
// "the slant of the 7"):
//   'missing-digit'  only one digit there (missingDigit: the one left out)
//   'swapped-digits' the two digits the wrong way round (21 for 12)

export const NUMBER_SPLIT = {
  minGap: 0.05,     // a gap this share of her height between strokes splits the two digits
  minAspect: 0.6,   // with no gap: her ink narrower than this share of the model's width over height is one digit
};

// Her strokes split into the left digit and the right one: { left, right }, or
// { one } when they make a single digit. Strokes go by the middle of their box,
// left to right; the cut is at the widest gap between them. With no gap (the
// digits touch), a letter as wide as a number is cut where both halves read best
// as the two digits; a narrow one is a single digit.
export function splitDigits(strokes, char, digitChars, opts = {}, split = NUMBER_SPLIT) {
  const box = boxOf(strokes);
  if (!box) return { one: strokes };
  const sorted = strokes.map((pts) => ({ pts, b: boxOf([pts]) })).sort((a, b) => a.b.cx - b.b.cx);
  let best = null;
  for (let k = 1; k < sorted.length; k++) {
    const leftEnd = Math.max(...sorted.slice(0, k).map((s) => s.b.x1));
    const rightStart = Math.min(...sorted.slice(k).map((s) => s.b.x0));
    if (!best || rightStart - leftEnd > best.gap) best = { k, gap: rightStart - leftEnd };
  }
  const cut = (k) => ({ left: sorted.slice(0, k).map((s) => s.pts), right: sorted.slice(k).map((s) => s.pts) });
  if (best && best.gap >= split.minGap * box.h) return cut(best.k);
  const model = refBox(char);
  if (sorted.length < 2 || box.w / Math.max(box.h, 1e-9) < split.minAspect * (model.w / model.h)) return { one: strokes };
  // Touching digits: the cut whose halves are nearest their two digits.
  let pick = null;
  for (let k = 1; k < sorted.length; k++) {
    const { left, right } = cut(k);
    const d = recognize(left, digitChars[0], [], opts.match).best.distance + recognize(right, digitChars[1], [], opts.match).best.distance;
    if (!pick || d < pick.d) pick = { k, d };
  }
  return cut(pick.k);
}

// Which digit (0 left, 1 right) stroke k of plan p of a number belongs to: by
// where its middle is, left or right of the right digit's place.
function digitOfStroke(char, p, k) {
  const b = boxOf([planStrokes(char, p)[k].points]);
  return b.cx >= char.digits[1].x + MARGIN ? 1 : 0;
}

// A digit's strokes moved to where it stands in the number (line units).
const placed = (strokes, dx) => strokes.map((s) => ({ ...s, points: s.points.map(([x, y]) => [x + dx, y]) }));

// One part of a digit, as the number's part to show: its points moved into the
// number, its name with its digit ("slant of the 7"), and `digit` (0 left, 1 right).
function digitPart(missing, i, char) {
  if (!missing) return null;
  const dx = char.digits[i].x;
  const name = missing.part ? `${missing.part} of the ${char.digits[i].id}` : null;
  return { ...missing, plan: null, stroke: null, part: name, digit: i, points: missing.points.map(([x, y]) => [x + dx, y]) };
}

// The whole digit `i` as a part to show (a missing digit): every stroke of its default plan.
function wholeDigit(i, char, digitChars) {
  const paths = placed(digitChars[i].strokes, char.digits[i].x).map((s) => s.points);
  return { plan: null, stroke: null, part: char.digits[i].id, digit: i, points: paths.flat(), paths, coverage: 0 };
}

const SIZE_REASONS = ['too-small', 'too-big'];

export function scoreNumber(strokes, char, { stage = COPY_STAGE, size = COPY_SIZE, cfg = DEFAULTS, others = [], match = COPY_MATCH } = {}) {
  const used = usableStrokes(strokes, char, cfg);
  const fit = fitLetter(used, char, size, cfg);
  const habits = fit.scale === null
    ? { plan: 0, strokes: [], starts: [], directions: [], order: 'usual', usual: true }
    : readHabits(fit.strokes, char, stage, cfg);
  const out = {
    ok: false, reason: null, scale: fit.scale, size: fit.size, sizeOk: fit.sizeOk,
    match: null, lookalike: null, missing: null, mirrored: false, habits, strokes: habits.strokes, digits: [],
  };
  if (fit.scale === null) return { ...out, reason: 'no-letter' };
  const digitChars = char.digits.map((d) => others.find((o) => o.id === d.id));
  if (digitChars.some((d) => !d)) throw new Error(`scoreNumber: load the digits of ${char.id} (compareIds)`);
  const othersOf = (d) => compareIds(d.id).filter((id) => id !== d.id).map((id) => others.find((o) => o.id === id)).filter(Boolean);
  const judge = (part, i) => scoreCopy(part, digitChars[i], { stage, size, cfg, others: othersOf(digitChars[i]), match });
  const numberMatch = (r, distance) => ({ id: char.id, plan: habits.plan, child: null, mirrored: r?.mirrored === true, distance });

  const split = splitDigits(used, char, digitChars, { match });
  if (split.one) {
    // One digit: the one left out is the one her ink is not (17 written as 7: the 1).
    const [a, b] = [0, 1].map((i) => judge(split.one, i));
    const gone = b.ok && !a.ok ? 0 : a.ok && !b.ok ? 1
      : (b.match?.distance ?? Infinity) < (a.match?.distance ?? Infinity) ? 0 : 1;
    const there = gone === 0 ? b : a;
    return { ...out, reason: 'missing-digit', missing: wholeDigit(gone, char, digitChars), match: there.match, digits: gone === 0 ? [null, b] : [a, null] };
  }
  const rs = [judge(split.left, 0), judge(split.right, 1)];
  out.digits = rs;
  const shapeFail = (r) => !r.ok && !SIZE_REASONS.includes(r.reason);
  const [l, r] = char.digits.map((d) => d.id);
  // The two digits the wrong way round: each part looks like the other digit.
  if (l !== r && rs.every(shapeFail) && rs[0].lookalike === r && rs[1].lookalike === l) {
    return { ...out, reason: 'swapped-digits', lookalike: `${r}${l}`, first: l, match: numberMatch(null, Math.max(...rs.map((x) => x.match?.distance ?? 0))) };
  }
  const bad = rs.findIndex(shapeFail);
  if (bad >= 0) {
    const x = rs[bad];
    // A digit too little to read on its own (17 with the 7's slant left out: a
    // flat bar): her whole number, laid over the model, shows the part she left out.
    if ((x.reason === 'no-letter' || x.reason === 'unrecognized') && shapeFail(rs[1 - bad]) === false) {
      const gone = partCoverage(used, char, cfg, match).find((p) => p.coverage < match.coverMin);
      if (gone) {
        const i = digitOfStroke(char, gone.plan, gone.stroke);
        const { points } = planStrokes(char, gone.plan)[gone.stroke];
        return { ...out, reason: 'missing-stroke', match: x.match ?? numberMatch(null, null),
          missing: { plan: gone.plan, stroke: gone.stroke, part: `${gone.part} of the ${char.digits[i].id}`, digit: i, points, coverage: Math.round(gone.coverage * 1000) / 1000 } };
      }
    }
    // A look-alike digit names the number it makes (17 with a 3: "13"); a letter keeps its name (S).
    const lookalike = x.lookalike && /^\d$/.test(x.lookalike) ? (bad === 0 ? `${x.lookalike}${r}` : `${l}${x.lookalike}`) : x.lookalike;
    return { ...out, reason: x.reason, lookalike, missing: digitPart(x.missing, bad, char), match: x.match };
  }
  if (!fit.sizeOk) return { ...out, reason: fit.size < size.min ? 'too-small' : 'too-big', match: numberMatch(null, 0) };
  const small = rs.find((x) => !x.ok);
  if (small) return { ...out, reason: small.reason, match: small.match };
  out.mirrored = rs.some((x) => x.mirrored);
  return { ...out, ok: true, match: numberMatch(out, Math.max(...rs.map((x) => x.match?.distance ?? 0))) };
}

// The line-position reason for her lowercase letter ('position-tail',
// 'position-tall' or 'position-small'), or null when it sits well (and for
// capitals and digits). `lines`: her strokes in letter units, as she wrote them.
export function checkPosition(lines, char, pos = POSITION) {
  if (isUrdu(char)) {
    if (lines.length === 0 || !urduDips(char, pos)) return null;
    return Math.max(...inkSamples(lines).map((p) => p[1])) >= 1 + pos.urduDipBelow ? null : 'position-tail';
  }
  const kind = heightKind(char.id);
  if (!kind || lines.length === 0) return null;
  const ys = inkSamples(lines).map((p) => p[1]);
  if (kind === 'tail') return Math.max(...ys) >= 1 + pos.tailBelow ? null : 'position-tail';
  if (kind === 'tall') return Math.min(...ys) <= 0.5 - (char.id === 't' ? pos.tAbove : pos.tallAbove) ? null : 'position-tall';
  const inside = ys.filter((y) => y >= 0.5 - pos.band && y <= 1 + pos.band).length;
  return inside / ys.length >= pos.smallShare ? null : 'position-small';
}

// Urdu (Slice 10C): the model's body dips below the grass line (a tail or a bowl).
export const urduDips = (char, pos = POSITION) => refBox(char).y1 >= 1 + pos.urduDipModel;

// The first dot of `char` with none of her fitted marks near it, as a part to
// show on the model card ({ plan: 0, stroke, part, points, coverage: 0 }), or null.
// A mark is near when its middle is within match.dotRadius of the dot.
export function missingDot(marks, char, mirrored = false, match = COPY_MATCH) {
  for (const d of dotsOf(char)) {
    const at = mirrored ? [char.width - d.at[0], d.at[1]] : d.at;
    const near = marks.some((pts) => {
      const cx = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
      const cy = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
      return Math.hypot(cx - at[0], cy - at[1]) <= match.dotRadius;
    });
    if (!near) return { plan: 0, stroke: d.stroke, part: d.part, points: [d.at], coverage: 0 };
  }
  return null;
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
//   'lines'       the guide lines it should reach or sit between glow (POSITION_LINES, Slice 9A)
//   'slow'        he traces the whole model slowly (unrecognized, no-letter)
export function copyShow(result) {
  if (result.ok) return result.mirrored ? 'right-way' : result.habits.usual ? 'none' : 'usual-way';
  switch (result.reason) {
    case 'looks-like': case 'swapped-digits': return 'beside';
    case 'missing-digit': return 'part';
    case 'missing-stroke': return 'part';
    case 'too-small': case 'too-big': return 'size';
    case 'position-tail': case 'position-tall': case 'position-small': return 'lines';
    // Urdu (Slice 10C): the letter's dots or mark glow on the card; with no dots to show, Jugnu writes it.
    case 'missing-mark': case 'dot-count': case 'dot-side': return result.missing ? 'part' : 'slow';
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
    const options = isSpot(pc.strokes[next[0]])
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

// Urdu (Slice 10C): her bigger strokes read best as a whole body (in some
// plan, its dots and marks left out), and she has drawn fewer small strokes
// than the letter has dots and marks.
function urduAwaitsDots(used, char, gap, cfg) {
  const { lines, dots, middling } = sortSmall(used);
  const want = expectedMarks(char);
  if (dots.length + middling.length >= want.dots.length + want.marks.length || lines.length === 0) return false;
  let best = null;
  for (let p = 0; p < planCount(char); p++) {
    const pc = planChar(char, p);
    const body = { ...pc, anyOrder: undefined, strokes: pc.strokes.filter((s) => s.kind === 'line') };
    for (const r of readings(lines.length, body, gap)) {
      const error = readingError(lines, r.refs, cfg);
      if (!best || error < best.error) best = { ...r, error };
    }
  }
  return best !== null && best.error < Infinity && best.done.every(Boolean);
}

// After her lift, what the copy round does next:
//   'judge-now'  her letter passes: a success is never kept waiting
//   'judge-soon' (Urdu, Slice 10C: with wait 'dots' when her body is whole and
//                dots or a mark are still to come, see urduAwaitsDots)
//                it does not pass yet, but it is whole: she has drawn as many
//                strokes as the longest plan has (Slice 5O: a slip in her last
//                stroke waits too, so she can undo it before it is judged), or
//                fewer that read best as a whole letter (in some plan, joined):
//                judged CONFIG.copyWaitMs after her last lift
//   'hint'       fewer strokes, and they read best as the start of the letter:
//                after CONFIG.copyHintMs Jugnu shows `next` (a stroke of `plan`)
//                on the model card. Her strokes stay; it is not a failed copy.
// Returns { action, next, plan, done }: for 'hint', `done` is the strokes of
// `plan` her strokes read as (the helper's start dots follow it, Slice 5J part 2);
// otherwise null.
export function copyStatus(strokes, char, opts = {}) {
  const cfg = opts.cfg ?? DEFAULTS;
  const used = usableStrokes(strokes, char, cfg);
  if (used.length > 0 && scoreCopy(strokes, char, opts).ok) return { action: 'judge-now', next: null, plan: 0, done: null };
  // Urdu (Slice 10C): her body is whole but she has drawn fewer dots and marks
  // than the letter has. No hint shows where they go: the letter is judged after
  // a longer wait (wait 'dots', CONFIG.copyDotWaitMs), which every new stroke restarts.
  if (isUrdu(char) && urduAwaitsDots(used, char, opts.gap, cfg)) return { action: 'judge-soon', wait: 'dots', next: null, plan: 0, done: null };
  // Complete but not passing: judged after the wait, with undo still there (Slice 5O).
  if (used.length >= mostStrokes(char)) return { action: 'judge-soon', next: null, plan: 0, done: null };
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
    // Urdu (Slice 10C): her dots and marks, on top or not; null for other letters.
    dots: result.dots ?? null,
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
