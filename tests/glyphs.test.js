// Run: node --test tests/glyphs.test.js
// The generated characters: data/glyphs.js (exact shapes) and the files
// `npm run glyphs` writes from them into data/chars/. Every generated file is
// also checked by tests/chars.test.js, like a recorded one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLYPHS, OVERRIDES, MIRROR_SYMMETRIC, MARGIN, plansOf } from '../data/glyphs.js';
import { STROKE_ORDER } from '../data/stroke-order.js';
import { CHAR_IDS } from '../src/recording.js';
import { scoreStroke, resample, meanPairDistance, nearestOnPath, dist, pathLength } from '../src/geometry.js';
import {
  strokePath, spacedPoints, glyphCharacter, characterText, joinGaps, cornerIndexes,
  pointCount, POINT_SPACING, MIN_POINTS,
} from '../src/glyph-points.js';

const dir = new URL('../data/chars/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir), 'utf8');
const load = (id) => JSON.parse(read(`${id}.json`));
const GENERATED = CHAR_IDS.filter((id) => !OVERRIDES.includes(id));
const LINE_Y = { sky: 0, fence: 0.5, grass: 1 };

// ---- the definitions ----

test('every capital and digit has a definition, and nothing else', () => {
  assert.deepEqual(Object.keys(GLYPHS).sort(), [...CHAR_IDS].sort());
});

test('each stroke\'s pieces join end to end, with no gaps', () => {
  for (const id of CHAR_IDS) {
    GLYPHS[id].strokes.forEach((s, k) => assert.doesNotThrow(() => strokePath(s), `${id} stroke ${k + 1}`));
  }
});

test('a piece that does not start where the last one ended is refused', () => {
  const bad = { pieces: [{ type: 'line', points: [[0, 0], [0, 1]] }, { type: 'line', points: [[0.2, 1], [0.5, 1]] }] };
  assert.throws(() => strokePath(bad), /piece 2 starts/);
});

test('start and end points sit on the guide lines the definition names', () => {
  for (const id of GENERATED) {
    const file = load(id);
    GLYPHS[id].strokes.forEach((s, k) => {
      const exact = strokePath(s);
      const saved = file.strokes[k].points;
      for (const [end, label, p, q] of [['start', s.from, exact[0], saved[0]], ['end', s.to, exact.at(-1), saved.at(-1)]]) {
        if (label === null) continue;
        assert.ok(label in LINE_Y, `${id} stroke ${k + 1} ${end}: unknown line ${label}`);
        assert.ok(Math.abs(p[1] - LINE_Y[label]) < 1e-9, `${id} stroke ${k + 1} ${end}: y ${p[1]} is not the ${label} line`);
        assert.equal(q[1], LINE_Y[label], `${id} stroke ${k + 1} ${end} in the file`);
      }
    });
  }
});

test('every character starts at the left margin, so widths are comparable', () => {
  for (const id of GENERATED) {
    const xs = load(id).strokes.flatMap((s) => s.points.map((p) => p[0]));
    const left = Math.min(...xs);
    assert.ok(left >= MARGIN - 0.03 && left <= MARGIN + 0.03, `${id}: leftmost x ${left}`);
  }
});

test('O, C, G and Q are circles from the sky line to the grass line; 0 is a narrower oval', () => {
  for (const id of ['O', 'C', 'G', 'Q']) {
    const pts = strokePath(GLYPHS[id].strokes[0]);
    const ys = pts.map((p) => p[1]);
    const xs = pts.map((p) => p[0]);
    const cx = MARGIN + 0.5;
    for (const p of pts) assert.ok(Math.abs(dist(p, [cx, 0.5]) - 0.5) < 1e-9, `${id} is a circle`);
    if (id !== 'C') assert.ok(Math.min(...ys) < 1e-9 && Math.max(...ys) > 1 - 1e-9, `${id} reaches both lines`);
    assert.ok(Math.min(...xs) - MARGIN < 1e-9, id);
  }
  const zero = load('0');
  const O = load('O');
  assert.ok(zero.width < O.width - 0.3, `0 is ${zero.width} wide, O is ${O.width}`);
});

test('the bumps of B, D, P and R are half circles', () => {
  for (const id of ['B', 'D', 'P', 'R']) {
    const arcs = GLYPHS[id].strokes[1].pieces.filter((p) => p.type === 'arc');
    assert.ok(arcs.length >= 1, id);
    for (const a of arcs) {
      assert.equal(a.rx, a.ry, `${id}: a circle, not an oval`);
      assert.equal(a.to - a.from, 180, `${id}: half a circle`);
    }
  }
});

// Mirror test: every point, mirrored about the middle of the character box,
// lands on the character's ink within 0.01.
const mirrorError = (char) => {
  const axis = char.width / 2;
  const lines = char.strokes.map((s) => s.points);
  let worst = 0;
  for (const pts of lines) {
    for (const [x, y] of pts) {
      const m = [2 * axis - x, y];
      worst = Math.max(worst, Math.min(...lines.map((l) => nearestOnPath(m, l).distance)));
    }
  }
  return worst;
};

test('mirror-symmetric characters mirror within 0.01', () => {
  for (const id of MIRROR_SYMMETRIC) {
    const err = mirrorError(load(id));
    assert.ok(err <= 0.01, `${id}: off by ${err.toFixed(4)}`);
  }
});

test('the mirror check does catch characters that are not symmetric', () => {
  for (const id of ['B', 'C', 'K', 'N', 'Z', '2']) assert.ok(mirrorError(load(id)) > 0.05, id);
});

// ---- matching data/stroke-order.js ----

test('stroke counts, order, directions and start points match stroke-order.js', () => {
  for (const id of CHAR_IDS) {
    const order = STROKE_ORDER[id];
    const strokes = GLYPHS[id].strokes.map(strokePath);
    assert.equal(strokes.length, order.strokes.length, `${id}: stroke count`);
    strokes.forEach((pts, k) => {
      const where = `${id} stroke ${k + 1}`;
      const rough = order.strokes[k].path;
      assert.ok(dist(pts[0], rough[0]) < 0.03, `${where}: starts ${dist(pts[0], rough[0]).toFixed(3)} from the stroke-order start`);
      // Same order and direction: this stroke matches rough stroke k going forward,
      // much better than backward or than any other rough stroke.
      const g = resample(pts, 32);
      const fwd = meanPairDistance(g, resample(rough, 32));
      const back = meanPairDistance(g, resample(rough, 32).reverse());
      assert.ok(fwd < 0.03, `${where}: follows the rough path (${fwd.toFixed(3)})`);
      assert.ok(fwd < back, `${where}: runs the same way`);
      order.strokes.forEach((other, j) => {
        if (j !== k) assert.ok(meanPairDistance(g, resample(other.path, 32)) > fwd, `${where}: closer to rough stroke ${j + 1}`);
      });
    });
  }
});

test('family and width match stroke-order.js', () => {
  for (const id of GENERATED) {
    const file = load(id);
    assert.equal(file.family, STROKE_ORDER[id].family, id);
    assert.ok(Math.abs(file.width - STROKE_ORDER[id].width) <= 0.01, `${id}: ${file.width} vs ${STROKE_ORDER[id].width}`);
  }
});

test('no glyph uses anyOrder: T and X in either order are two stroke plans', () => {
  for (const id of CHAR_IDS) assert.equal(GLYPHS[id].anyOrder, undefined, id);
  const order = (id, p) => plansOf(GLYPHS[id])[p].map((s) => s.part);
  assert.deepEqual(order('T', 0), ['stem', 'top bar']);
  assert.deepEqual(order('T', 1), ['top bar', 'stem']);
  assert.deepEqual(order('X', 1), ['second slant', 'first slant']);
});

// ---- stroke plans (Slice 5J) ----

// The plans agreed for Slice 5J: each character's plans, as part names.
const AGREED_PLANS = {
  B: [['stem', 'bumps'], ['stem', 'top bump', 'bottom bump']],
  E: [['stem', 'top bar', 'middle bar', 'bottom bar'], ['stem and bottom bar', 'top bar', 'middle bar']],
  G: [['curve', 'bar'], ['curve and bar']],
  H: [['stem', 'right stem', 'bar'], ['stem', 'bar', 'right stem']],
  K: [['stem', 'arm', 'leg'], ['stem', 'arm and leg']],
  L: [['stem', 'foot'], ['stem and foot']],
  M: [['stem', 'slants and right stem'], ['stem', 'first slant', 'second slant', 'right stem']],
  N: [['stem', 'slant and right side'], ['stem', 'slant', 'right side']],
  R: [['stem', 'bump', 'leg'], ['stem', 'bump and leg']],
  T: [['stem', 'top bar'], ['top bar', 'stem']],
  V: [['slants'], ['first slant', 'second slant']],
  W: [['zigzag'], ['first V', 'second V']],
  X: [['first slant', 'second slant'], ['second slant', 'first slant']],
  Y: [['left arm', 'right arm and stem'], ['left arm', 'right arm', 'stem']],
  Z: [['zigzag'], ['top bar', 'slant', 'bottom bar']],
  1: [['flag', 'stem'], ['flag and stem']],
  2: [['curve and foot'], ['curve', 'foot']],
  3: [['bumps'], ['top bump', 'bottom bump']],
  4: [['stem', 'slant', 'bar'], ['slant', 'bar', 'stem']],
  7: [['top bar', 'slant'], ['top bar and slant']],
  9: [['circle', 'stem'], ['circle and stem']],
};

test('the stroke plans are the agreed ones, and every other character has only its default', () => {
  for (const id of CHAR_IDS) {
    const plans = plansOf(GLYPHS[id]).map((p) => p.map((s) => s.part));
    if (AGREED_PLANS[id]) assert.deepEqual(plans, AGREED_PLANS[id], id);
    else assert.equal(plans.length, 1, `${id} has only its default plan`);
  }
});

test('every stroke of every plan has a short part name', () => {
  for (const id of CHAR_IDS) {
    for (const plan of plansOf(GLYPHS[id])) {
      for (const s of plan) assert.ok(typeof s.part === 'string' && s.part.length > 0 && s.part.length <= 24, `${id}: ${s.part}`);
    }
  }
});

// Every point of one drawing lies on the other's ink, both ways, within `tol`.
const sameShape = (a, b, tol) => {
  let worst = 0;
  for (const [from, to] of [[a, b], [b, a]]) {
    for (const pts of from) for (const p of pts) worst = Math.max(worst, Math.min(...to.map((l) => nearestOnPath(p, l).distance)));
  }
  return worst <= tol ? true : worst;
};

test('every plan has the same shape as the default (within 0.01), except the two noted', () => {
  // R's bump-and-leg stops its way back where the leg leaves (0.14 short of the stem),
  // and 9's circle-and-stem leaves out the stem's short top above the circle.
  const NOTED = { R: 0.15, 9: 0.26 };
  for (const id of CHAR_IDS) {
    const plans = plansOf(GLYPHS[id]).map((p) => p.map(strokePath));
    for (let p = 1; p < plans.length; p++) {
      const got = sameShape(plans[0], plans[p], NOTED[id] ?? 0.01);
      assert.equal(got, true, `${id} plan ${p + 1} differs by ${got}`);
    }
  }
});

test('no plan runs a part the other way: each plan stroke follows the default ink forwards', () => {
  // B's default stroke runs back along the middle to the stem and out again, so
  // its middle line is in it both ways; its 3-stroke plan is checked by hand below.
  for (const id of CHAR_IDS.filter((c) => c !== 'B')) {
    const plans = plansOf(GLYPHS[id]).map((p) => p.map(strokePath));
    const ink = plans[0];
    for (let p = 1; p < plans.length; p++) {
      for (const [k, pts] of plans[p].entries()) {
        // Walk along the plan stroke: the nearest default stroke's progress must not run backwards.
        const sample = resample(pts, 24);
        let last = null;
        for (const q of sample) {
          let best = null;
          ink.forEach((l, i) => {
            const n = nearestOnPath(q, l);
            if (!best || n.distance < best.distance) best = { ...n, i };
          });
          if (last && best.i === last.i && best.distance < 0.02 && last.distance < 0.02) {
            assert.ok(best.progress >= last.progress - 0.02, `${id} plan ${p + 1} stroke ${k + 1} runs backwards along default stroke ${best.i + 1}`);
          }
          last = best;
        }
      }
    }
  }
});

test("B's 3-stroke plan: the top bump comes back to the stem, the bottom bump starts there, both clockwise", () => {
  const [, top, low] = plansOf(GLYPHS.B)[1].map(strokePath);
  assert.ok(dist(top[0], [MARGIN, 0]) < 1e-9 && dist(top.at(-1), [MARGIN, 0.5]) < 1e-9);
  assert.ok(dist(low[0], [MARGIN, 0.5]) < 1e-9 && dist(low.at(-1), [MARGIN, 1]) < 1e-9);
  for (const bump of [top, low]) {
    const right = bump.reduce((a, b) => (b[0] > a[0] ? b : a));
    const iRight = bump.indexOf(right);
    // Out along the top of the bump first, then down round its right side: clockwise on screen.
    assert.ok(bump.slice(0, iRight).every((p) => p[1] <= right[1] + 1e-9));
  }
});

test("K's leg starts at the stem, where the arm ends, in every plan", () => {
  const k = load('K');
  assert.deepEqual(k.strokes[1].points.at(-1), [0.08, 0.5]);
  assert.deepEqual(k.strokes[2].points[0], [0.08, 0.5]);
  assert.deepEqual(k.plans[0].strokes[1].points.at(-1), [0.72, 1]);
});

test('the character files carry the plans: same format, each stroke with its part name', () => {
  for (const id of GENERATED) {
    const file = load(id);
    const plans = plansOf(GLYPHS[id]);
    assert.equal((file.plans ?? []).length, plans.length - 1, id);
    file.strokes.forEach((s, k) => assert.equal(s.part, plans[0][k].part, id));
    (file.plans ?? []).forEach((plan, p) => {
      assert.deepEqual(Object.keys(plan), ['strokes'], id);
      plan.strokes.forEach((s, k) => {
        assert.deepEqual(Object.keys(s), ['kind', 'part', 'points'], id);
        assert.equal(s.part, plans[p + 1][k].part, id);
        assert.equal(s.points.length, pointCount(pathLength(strokePath(plans[p + 1][k]))), `${id} plan ${p + 2} stroke ${k + 1}`);
      });
    });
  }
});

// ---- the generated files ----

test('the files in data/chars/ are up to date with data/glyphs.js (run npm run glyphs)', () => {
  for (const id of GENERATED) assert.equal(read(`${id}.json`), characterText(glyphCharacter(id, GLYPHS[id])), id);
});

test('data/chars/index.json lists all 36 characters in board order', () => {
  assert.deepEqual(JSON.parse(read('index.json')), CHAR_IDS);
});

test('the file format is the recorder\'s: same fields in the same order', () => {
  // Plus, since Slice 5J, each stroke's part name and the other stroke plans after the strokes.
  const letter = ['id', 'script', 'case', 'family', 'direction', 'width', 'strokes'];
  const digit = ['id', 'script', 'family', 'direction', 'width', 'strokes'];
  for (const id of GENERATED) {
    const keys = Object.keys(load(id)).filter((k) => k !== 'plans');
    assert.deepEqual(keys, /\d/.test(id) ? digit : letter, id);
    for (const s of load(id).strokes) assert.deepEqual(Object.keys(s), ['kind', 'part', 'points'], id);
  }
  assert.deepEqual(Object.keys(load('T')), ['id', 'script', 'case', 'family', 'direction', 'width', 'strokes', 'plans']);
  assert.equal(load('A').script, 'latin');
  assert.equal(load('7').script, 'digit');
});

test('at least 24 evenly spaced points per stroke, rounded to 3 decimals', () => {
  for (const id of GENERATED) {
    load(id).strokes.forEach((s, k) => {
      const where = `${id} stroke ${k + 1}`;
      assert.equal(s.kind, 'line', where);
      assert.ok(s.points.length >= MIN_POINTS, `${where}: ${s.points.length} points`);
      assert.equal(s.points.length, pointCount(pathLength(strokePath(GLYPHS[id].strokes[k]))), where);
      for (const p of s.points) for (const v of p) assert.equal(v, Math.round(v * 1000) / 1000, `${where}: ${v}`);
      const gaps = s.points.slice(1).map((p, i) => dist(p, s.points[i]));
      const most = Math.max(...gaps);
      const least = Math.min(...gaps);
      assert.ok(most <= POINT_SPACING + 0.002, `${where}: points ${most.toFixed(4)} apart`);
      assert.ok(most / least <= 1.2, `${where}: spacing from ${least.toFixed(4)} to ${most.toFixed(4)}`);
    });
  }
});

test('the same spacing as a recorded full-height stem: 24 points on a 1-unit line', () => {
  assert.equal(pointCount(1), 24);
  assert.equal(load('I').strokes[0].points.length, 24);
  assert.deepEqual(load('I').strokes[0].points[1], [0.08, 0.043]);
});

test('corners stay exactly where the definition puts them', () => {
  const M = load('M').strokes[1].points;
  for (const corner of [[0.5, 1], [0.92, 0]]) assert.ok(M.some((p) => p[0] === corner[0] && p[1] === corner[1]), `M ${corner}`);
  const W = load('W').strokes[0].points;
  for (const corner of [[0.29, 1], [0.5, 0], [0.71, 1]]) assert.ok(W.some((p) => p[0] === corner[0] && p[1] === corner[1]), `W ${corner}`);
  assert.deepEqual(cornerIndexes([[0, 0], [0, 0.5], [0, 1]]), []);
  assert.deepEqual(cornerIndexes([[0, 0], [0, 1], [1, 1]]), [1]);
  const square = spacedPoints([[0, 0], [0, 1], [1, 1]]);
  assert.ok(square.some((p) => p[0] === 0 && p[1] === 1));
});

// ---- scoring self-test ----

// Her finger never follows a line exactly: a gentle wave across the stroke,
// plus a tiny shake, starting a little off the start point.
function wobbly(points, amount = 0.03) {
  const pts = resample(points, Math.max(40, points.length));
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const t = i / (pts.length - 1);
    const off = amount * Math.sin(t * Math.PI * 6) + 0.006 * Math.sin(i * 2.7);
    return [p[0] + nx * off + 0.02, p[1] + ny * off + 0.01];
  });
}

test('tracing each generated stroke with a small wobble passes at stages 1, 2 and 3', () => {
  for (const id of GENERATED) {
    load(id).strokes.forEach((s, k) => {
      for (const stage of [1, 2, 3]) {
        const r = scoreStroke(wobbly(s.points), s.points, stage);
        assert.ok(r.ok, `${id} stroke ${k + 1} stage ${stage}: ${r.reason} (error ${r.error.toFixed(3)})`);
      }
    });
  }
});

test('tracing a generated stroke backwards fails as wrong-direction', () => {
  for (const id of GENERATED) {
    load(id).strokes.forEach((s, k) => {
      for (const stage of [1, 2, 3]) {
        const r = scoreStroke(wobbly([...s.points].reverse()), s.points, stage);
        assert.equal(r.ok, false, `${id} stroke ${k + 1} stage ${stage}`);
        assert.equal(r.reason, 'wrong-direction', `${id} stroke ${k + 1} stage ${stage}`);
      }
    });
  }
});

// ---- join gaps (the one-stroke rule, src/variants.js) ----

test('join gaps: where she may draw two strokes in one go', (t) => {
  const joined = {};
  for (const id of GENERATED) {
    const gaps = joinGaps(load(id));
    if (gaps.length === 0) continue;
    t.diagnostic(`${id}: ${gaps.map((g, k) => `${k + 1}->${k + 2} ${g.gap.toFixed(3)}${g.joins ? ' JOINS' : ''}`).join(', ')}`);
    const j = gaps.flatMap((g, k) => (g.joins ? [`${k + 1}-${k + 2}`] : []));
    if (j.length) joined[id] = j;
  }
  // The joins are on purpose: a corner (L, 7, 1, 4), a curve running into its bar (G),
  // or K's arm and leg meeting at the stem (Slice 5J).
  assert.deepEqual(joined, { G: ['1-2'], K: ['2-3'], L: ['1-2'], 1: ['1-2'], 4: ['2-3'], 7: ['1-2'] });
});
