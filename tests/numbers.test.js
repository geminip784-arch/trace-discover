// Run: node --test tests/numbers.test.js
// Slice 9B part 1: numbers 10 to 20, built from the digit glyphs side by side
// (data/glyphs.js numberGlyph, written by npm run glyphs). Uses the real files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLYPHS, NUMBER_IDS, NUMBER_GAP, MARGIN, plansOf } from '../data/glyphs.js';
import { STROKE_ORDER } from '../data/stroke-order.js';
import { planCount, planStrokes, startPlans, planCandidates, advancePlans, shownPlan, pickCandidate, scoreMark, scoreEitherWay } from '../src/variants.js';
import { DEFAULTS } from '../src/geometry.js';
import { initialState, applyLift, applyPlanPass, isLetterDone } from '../src/progress.js';
import { boxOf } from '../src/copy.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${id}.json`, import.meta.url), 'utf8'));
const MANIFEST = JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url), 'utf8'));
const inkOf = (strokes) => boxOf(strokes.map((s) => s.points));
const close = (a, b, tol = 0.0015) => Math.abs(a - b) <= tol;

test('the numbers are 10 to 20, each in the manifest after the lowercase letters (then the Urdu letters, Slice 10D)', () => {
  assert.deepEqual(NUMBER_IDS, ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20']);
  assert.deepEqual(MANIFEST.slice(62, 73), NUMBER_IDS);
  assert.ok(MANIFEST.slice(73).every((id) => id.startsWith('ur-')));
});

test('each number names its two digits, the left one unmoved', () => {
  for (const id of NUMBER_IDS) {
    const { digits } = load(id);
    assert.deepEqual(digits.map((d) => d.id), id.split(''), id);
    assert.equal(digits[0].x, 0, id);
    assert.ok(digits[1].x > 0, id);
    assert.equal(load(id).script, 'digit', id);
  }
});

test('every plan of a number is a plan of its left digit, then a plan of its right digit moved right', () => {
  for (const id of NUMBER_IDS) {
    const num = load(id);
    const [left, right] = num.digits.map((d) => load(d.id));
    const dx = num.digits[1].x;
    const want = [];
    for (let a = 0; a < planCount(left); a++) {
      for (let b = 0; b < planCount(right); b++) {
        want.push([
          ...planStrokes(left, a),
          ...planStrokes(right, b).map((s) => ({ ...s, points: s.points.map(([x, y]) => [x + dx, y]) })),
        ]);
      }
    }
    assert.equal(planCount(num), want.length, `${id}: ${planCount(num)} plans`);
    want.forEach((plan, p) => {
      const got = planStrokes(num, p);
      assert.equal(got.length, plan.length, `${id} plan ${p + 1}`);
      got.forEach((s, k) => {
        const where = `${id} plan ${p + 1} stroke ${k + 1}`;
        assert.equal(s.part, plan[k].part, where);
        assert.equal(s.kind, plan[k].kind, where);
        assert.equal(s.points.length, plan[k].points.length, where);
        s.points.forEach(([x, y], i) => assert.ok(close(x, plan[k].points[i][0]) && close(y, plan[k].points[i][1]), `${where} point ${i}`));
      });
    });
  }
});

test('stroke order is the left digit first, in every plan', () => {
  for (const id of NUMBER_IDS) {
    const num = load(id);
    const [left] = num.digits.map((d) => load(d.id));
    const split = inkOf(left.strokes).x1 + NUMBER_GAP / 2; // between the two digits
    for (let p = 0; p < planCount(num); p++) {
      const sides = planStrokes(num, p).map((s) => (inkOf([s]).x1 < split ? 'L' : 'R')).join('');
      assert.match(sides, /^L+R+$/, `${id} plan ${p + 1}: ${sides}`);
    }
  }
});

test('the two digits keep their height, sky line to grass line, with the same gap between their ink', () => {
  for (const id of NUMBER_IDS) {
    const num = load(id);
    const [left, right] = num.digits.map((d) => load(d.id));
    const nl = left.strokes.length;
    const l = inkOf(num.strokes.slice(0, nl));
    const r = inkOf(num.strokes.slice(nl));
    for (const [box, digit] of [[l, left], [r, right]]) {
      const own = inkOf(digit.strokes);
      assert.ok(close(box.y0, own.y0) && close(box.y1, own.y1), `${id}: the ${digit.id} keeps its height`);
      assert.ok(close(box.h, 1, 0.005), `${id}: the ${digit.id} is a full line high`);
      assert.ok(close(box.w, own.w), `${id}: the ${digit.id} keeps its width`);
    }
    assert.ok(close(l.x0, MARGIN), `${id} starts at the left margin`);
    assert.ok(close(r.x0 - l.x1, NUMBER_GAP, 0.003), `${id}: gap ${(r.x0 - l.x1).toFixed(3)}`);
    assert.ok(close(num.width, r.x1 + MARGIN, 0.002), `${id}: width ${num.width}`);
  }
});

test('the gap is a quarter of a line, and the digits never join into one stroke', () => {
  assert.equal(NUMBER_GAP, 0.25);
  for (const id of NUMBER_IDS) {
    for (const plan of plansOf(GLYPHS[id])) assert.ok(plan.every((s) => s.part.length > 0), id);
  }
});

test('stroke-order.js lists each number as its digits, the right one moved like the glyph', () => {
  for (const id of NUMBER_IDS) {
    const order = STROKE_ORDER[id];
    const [left, right] = id.split('').map((d) => STROKE_ORDER[d]);
    assert.equal(order.strokes.length, left.strokes.length + right.strokes.length, id);
    assert.ok(order.strokes.every((s, k) => s.say.startsWith(`the ${id[k < left.strokes.length ? 0 : 1]}: `)), id);
    assert.ok(close(order.width, load(id).width, 0.01), `${id}: ${order.width} vs ${load(id).width}`);
  }
});

// ---- the tracing rounds (1 and 2) ----

// Trace a number as the game does (src/game.js): each stroke is picked against
// every plan she still follows; a pass moves the plans on.
function trace(char, strokes, stage) {
  const score = (c, r, st) => scoreMark(c, r, st, DEFAULTS, scoreEitherWay);
  let alive = startPlans(char);
  let progress = initialState(char.strokes.length);
  const results = [];
  for (const s of strokes) {
    const pick = pickCandidate(s, planCandidates(char, alive), stage, score);
    results.push(pick.result);
    if (pick.result.ok) {
      alive = advancePlans(s, char, alive, stage, score);
      progress = applyPlanPass(progress, shownPlan(alive).done).state;
    } else {
      progress = applyLift(progress, { ok: false }).state;
    }
  }
  return { results, done: isLetterDone(progress) };
}

// A small sideways wobble, as a finger makes.
const wobble = (pts, a = 0.02) => pts.map(([x, y], i) => [x + a * Math.sin(i / 2), y + a * Math.cos(i / 3)]);

test('rounds 1 and 2: every number passes in every plan, with any allowed plan of each digit', () => {
  for (const id of NUMBER_IDS) {
    const num = load(id);
    for (let p = 0; p < planCount(num); p++) {
      for (const stage of [1, 2]) {
        const r = trace(num, planStrokes(num, p).map((s) => wobble(s.points)), stage);
        assert.ok(r.results.every((x) => x.ok), `${id} plan ${p + 1} stage ${stage}: ${r.results.map((x) => x.reason)}`);
        assert.ok(r.done, `${id} plan ${p + 1} stage ${stage}`);
      }
    }
  }
});

test('rounds 1 and 2: the right digit first does not count (left digit first)', () => {
  for (const id of NUMBER_IDS) {
    const num = load(id);
    const nl = load(num.digits[0].id).strokes.length;
    const first = num.strokes[nl].points; // the right digit's first stroke
    const r = trace(num, [first], 1);
    assert.equal(r.results[0].ok, false, `${id}: the ${id[1]} first`);
  }
});

test('17: the 1 in one go and the 7 in two strokes, or the other way about, both pass', () => {
  const num = load('17');
  const parts = (p) => planStrokes(num, p).map((s) => s.part);
  assert.deepEqual(parts(0), ['flag', 'stem', 'top bar', 'slant']);
  assert.deepEqual(parts(1), ['flag', 'stem', 'top bar and slant']);
  assert.deepEqual(parts(2), ['flag and stem', 'top bar', 'slant']);
  assert.deepEqual(parts(3), ['flag and stem', 'top bar and slant']);
  for (const p of [1, 2]) assert.ok(trace(num, planStrokes(num, p).map((s) => s.points), 1).done, `plan ${p + 1}`);
});
