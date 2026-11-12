// Run: node --test tests/direction.test.js
// Slice 5J part 2: direction coaches, never blocks. In the tracing rounds (1
// and 2) a stroke traced along the track the other way, from its far end,
// counts as done and is logged as a habit (src/variants.js scoreEitherWay).
// Off the track, or started in the middle, it still does not count.
// Also: M and N from the bottom (data/glyphs.js) in every round.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, scoreStroke } from '../src/geometry.js';
import {
  scoreEitherWay, betterPass, startPlans, planCandidates, advancePlans, shownPlan, pickCandidate, planStrokes, planCount, variantLabel,
} from '../src/variants.js';
import { initialState, applyLift, applyPlanPass, isLetterDone, strokeLogEntry } from '../src/progress.js';
import { scoreCopy, compareIds, copyStatus } from '../src/copy.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${id}.json`, import.meta.url), 'utf8'));
const others = (id) => compareIds(id).filter((i) => i !== id).map(load);
const back = (pts) => [...pts].reverse();
const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

// Trace a letter as game.js does in rounds 1 and 2: the touch-down start check
// (either end of any candidate), then pickCandidate and advancePlans with scoreEitherWay.
function trace(char, strokes, stage = 1) {
  let alive = startPlans(char);
  let progress = initialState(char.strokes.length);
  const out = [];
  for (const s of strokes) {
    const candidates = planCandidates(char, alive);
    const r0 = DEFAULTS.stages[stage].startRadius;
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= r0;
    const startOk = candidates.some((v) => near(s[0], v.points[0]) || near(s[0], v.points.at(-1)));
    const pick = pickCandidate(s, candidates, stage, scoreEitherWay);
    let result = pick.result;
    if (result.reason !== 'too-short' && !startOk) result = { ...result, ok: false, reason: 'wrong-start', startOk: false };
    if (result.ok) {
      alive = advancePlans(s, char, alive, stage, scoreEitherWay);
      progress = applyPlanPass(progress, shownPlan(alive).done).state;
    } else {
      progress = applyLift(progress, { ok: false }).state;
    }
    out.push({ pick, result, plan: shownPlan(alive).plan });
  }
  return { out, done: isLetterDone(progress), progress, alive };
}

test('scoreStroke is unchanged: a reversed stroke is still "wrong-direction" there', () => {
  const stem = load('L').strokes[0].points;
  assert.equal(scoreStroke(back(stem), stem, 1).reason, 'wrong-direction');
});

test('a stroke traced the other way along the track counts, marked reversed (rounds 1 and 2)', () => {
  const stem = load('L').strokes[0].points;
  for (const stage of [1, 2]) {
    const r = scoreEitherWay(back(stem), stem, stage);
    assert.equal(r.ok, true);
    assert.equal(r.reversed, true);
    assert.equal(r.directionOk, false);
    assert.equal(r.reason, null);
    const f = scoreEitherWay(stem, stem, stage);
    assert.equal(f.ok, true);
    assert.equal(f.reversed, false);
  }
});

test('off the track still does not count, whichever way she goes', () => {
  const stem = load('L').strokes[0].points;
  const off = shift(back(stem), 0.4, 0);
  for (const stage of [1, 2]) {
    const r = scoreEitherWay(off, stem, stage);
    assert.equal(r.ok, false);
    assert.equal(r.reversed, false);
    assert.notEqual(r.reason, null);
  }
  // A wobble well outside the track, going the other way: off-path.
  const wavy = back(stem).map(([x, y], i) => [x + (i % 2 ? 0.35 : -0.35), y]);
  assert.equal(scoreEitherWay(wavy, stem, 1).ok, false);
});

test('started in the middle of the stroke still does not count (the start check)', () => {
  const l = load('L');
  const stem = l.strokes[0].points;
  const half = back(stem).slice(0, Math.ceil(stem.length / 2)); // bottom to the middle
  const fromMiddle = back(half);                                   // middle to the bottom
  const t = trace(l, [fromMiddle]);
  assert.equal(t.out[0].result.ok, false);
  assert.equal(t.done, false);
});

test('every letter, every stroke of its default plan traced the other way, finishes in rounds 1 and 2', () => {
  for (const id of JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url), 'utf8'))) {
    const char = load(id);
    for (const stage of [1, 2]) {
      const t = trace(char, char.strokes.map((s) => back(s.points)), stage);
      assert.equal(t.done, true, `${id} reversed at stage ${stage}: ${t.out.map((o) => o.result.reason).join(',')}`);
      assert.ok(t.out.every((o) => o.result.ok), id);
    }
  }
});

test('a reversed stroke is logged as a habit (reversed, direction), never as a fail', () => {
  const l = load('L');
  const t = trace(l, [back(l.strokes[0].points), l.strokes[1].points]);
  const entries = t.out.map(({ pick, result }) => strokeLogEntry({
    char: 'L', stage: 1, pick, result, variant: result.ok ? variantLabel(pick.variant) : 'none', counted: true, assisted: false,
  }));
  assert.equal(entries[0].ok, true);
  assert.equal(entries[0].reason, null);
  assert.equal(entries[0].reversed, true);
  assert.equal(entries[0].directionOk, false);
  assert.equal(entries[0].habit, 'direction');
  assert.equal(entries[1].reversed, false);
  assert.equal(entries[1].habit, null);
  assert.equal(t.done, true);
});

test('a forward match always beats a reversed one (betterPass)', () => {
  assert.equal(betterPass({ reversed: false, error: 0.1 }, { reversed: true, error: 0.01 }), true);
  assert.equal(betterPass({ reversed: true, error: 0.01 }, { reversed: false, error: 0.1 }), false);
  assert.equal(betterPass({ error: 0.01 }, { error: 0.1 }), true);
});

// ---- M and N from the bottom (Slice 5J part 2) ----

const bottomPlan = (char) => planCount(char) - 1;

test('M and N have a plan that starts at the bottom left, in one stroke', () => {
  for (const id of ['M', 'N']) {
    const c = load(id);
    const s = planStrokes(c, bottomPlan(c));
    assert.equal(s.length, 1);
    assert.deepEqual(s[0].points[0], [0.08, 1]);
  }
});

test('M and N from the bottom pass rounds 1 and 2, and her plan (not the default traced back) is shown', () => {
  for (const id of ['M', 'N']) {
    const c = load(id);
    const pts = planStrokes(c, bottomPlan(c))[0].points;
    for (const stage of [1, 2]) {
      const t = trace(c, [pts], stage);
      assert.equal(t.done, true, `${id} stage ${stage}`);
      assert.equal(t.out[0].result.reversed, false, `${id}: forwards in its own plan`);
      assert.equal(t.out[0].plan, bottomPlan(c), `${id}: the bottom plan's track shows`);
    }
  }
});

test('M and N: a stem drawn up from the bottom, then the rest, also finishes (the default plan, stem reversed)', () => {
  for (const id of ['M', 'N']) {
    const c = load(id);
    const t = trace(c, [back(c.strokes[0].points), c.strokes[1].points], 1);
    assert.equal(t.done, true, id);
    assert.equal(t.out[0].result.reversed, true, id);
  }
});

test('M and N from the bottom pass round 3 (the copy-it round), judged at once', () => {
  for (const id of ['M', 'N']) {
    const c = load(id);
    const pts = planStrokes(c, bottomPlan(c))[0].points;
    const r = scoreCopy([pts], c, { others: others(id) });
    assert.equal(r.ok, true, `${id}: ${r.reason}`);
    assert.equal(copyStatus([pts], c, { others: others(id) }).action, 'judge-now', id);
    // Another plan than the default: Jugnu replays the usual way once.
    assert.equal(r.habits.usual, false, id);
  }
});
