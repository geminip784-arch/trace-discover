// Run: node --test tests/plans.test.js
// Slice 5J: stroke plans in the tracing rounds (src/variants.js, src/progress.js).
// She may follow any allowed plan; each stroke is still checked for start,
// direction and shape against the next stroke of a plan she is still following.
// Uses the real character files in data/chars/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  planCount, planStrokes, planChar, startPlans, planCandidates, advancePlans, shownPlan, pickCandidate, scoreMark,
} from '../src/variants.js';
import { DEFAULTS, scoreStroke } from '../src/geometry.js';
import { initialState, applyLift, applyPlanPass, isLetterDone } from '../src/progress.js';
import { charFile } from '../src/session.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const pts = (char, plan, k) => planStrokes(char, plan)[k].points;
// Forwards only (scoreStroke); a dot (i, j, Slice 9A) is a tap at its place (scoreMark).
const forward = (c, r, st) => scoreMark(c, r, st, DEFAULTS, scoreStroke);

// Trace a whole letter as the game does: each stroke is picked against every
// plan she still follows; a pass moves the plans on and shows the first one.
function trace(char, strokes, stage = 1) {
  let alive = startPlans(char);
  let progress = initialState(char.strokes.length);
  const shown = [];
  const results = [];
  for (const s of strokes) {
    const pick = pickCandidate(s, planCandidates(char, alive), stage, forward);
    results.push(pick.result);
    if (pick.result.ok) {
      alive = advancePlans(s, char, alive, stage, forward);
      progress = applyPlanPass(progress, shownPlan(alive).done).state;
    } else {
      progress = applyLift(progress, { ok: false }).state;
    }
    shown.push(shownPlan(alive).plan);
  }
  return { alive, progress, shown, results, done: isLetterDone(progress) };
}

test('plan 0 is the default strokes; the others come from the file', () => {
  const b = load('B');
  assert.equal(planCount(b), 2);
  assert.equal(planStrokes(b, 0), b.strokes);
  assert.equal(planStrokes(b, 1).length, 3);
  assert.equal(planCount(load('A')), 1);
  assert.equal(planChar(b, 1).plans, undefined);
});

test('every plan, traced stroke by stroke at every stage, finishes the letter', () => {
  for (const id of JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url), 'utf8'))) {
    const char = load(id);
    for (let p = 0; p < planCount(char); p++) {
      for (const stage of [1, 2]) {
        const r = trace(char, planStrokes(char, p).map((s) => s.points), stage);
        assert.ok(r.results.every((x) => x.ok), `${id} plan ${p + 1} stage ${stage}: ${r.results.map((x) => x.reason)}`);
        assert.ok(r.done, `${id} plan ${p + 1} stage ${stage}`);
      }
    }
  }
});

test('B: the default plan shows until her strokes leave it, then her plan shows', () => {
  const b = load('B');
  const r = trace(b, [pts(b, 1, 0), pts(b, 1, 1), pts(b, 1, 2)]);
  assert.deepEqual(r.shown, [0, 1, 1]); // the stem is in both; the top bump alone is plan 2
  assert.ok(r.done);
  assert.equal(r.progress.strokeCount, 3);
});

test('R: 3 strokes (stem, bump, leg) or 2 (stem, then bump and leg in one go)', () => {
  const r = load('R');
  assert.ok(trace(r, r.strokes.map((s) => s.points)).done);
  const two = trace(r, [pts(r, 1, 0), pts(r, 1, 1)]);
  assert.ok(two.done);
  assert.deepEqual(two.shown, [0, 1]);
});

test('K: the "<" in one go after the stem', () => {
  const k = load('K');
  assert.ok(trace(k, [pts(k, 0, 0), pts(k, 1, 1)]).done);
});

test('M as 2 or 4, N as 2 or 3', () => {
  const m = load('M');
  assert.equal(planStrokes(m, 1).length, 4);
  assert.ok(trace(m, planStrokes(m, 1).map((s) => s.points)).done);
  const n = load('N');
  assert.equal(planStrokes(n, 1).length, 3);
  assert.ok(trace(n, planStrokes(n, 1).map((s) => s.points)).done);
});

test('H: stem, bar, stem; 4: slant and bar first, then the stem; T and X in either order', () => {
  for (const id of ['H', '4', 'T', 'X']) {
    const char = load(id);
    const r = trace(char, planStrokes(char, 1).map((s) => s.points));
    assert.ok(r.done, id);
    assert.equal(r.shown.at(-1), 1, id);
  }
});

test('9 in one stroke: the circle running into the stem', () => {
  const nine = load('9');
  assert.equal(planStrokes(nine, 1).length, 1);
  assert.ok(trace(nine, [pts(nine, 1, 0)]).done);
});

test('start and direction are still checked per stroke, in every plan', () => {
  const b = load('B');
  // The top bump drawn backwards, after the stem: wrong direction, nothing advances.
  const back = trace(b, [pts(b, 1, 0), [...pts(b, 1, 1)].reverse()]);
  assert.equal(back.results[1].ok, false);
  assert.equal(back.results[1].reason, 'wrong-direction');
  assert.deepEqual(back.progress.done, [true, false]);
  // R's bump and leg drawn far off to the side: off the path.
  const r = load('R');
  const off = trace(r, [pts(r, 0, 0), pts(r, 1, 1).map(([x, y]) => [x + 0.5, y])]);
  assert.equal(off.results[1].ok, false);
});

test('advancePlans is only for a passed stroke: one that fits no plan leaves none (on a miss the game keeps its plans)', () => {
  const b = load('B');
  const alive = startPlans(b);
  assert.deepEqual(advancePlans([[5, 5], [6, 6]], b, alive, 1), []);
  assert.equal(planCandidates(b, alive).filter((v) => v.plan === 1).length > 0, true);
});

test('applyPlanPass: the shown plan may have more strokes; the streak starts again', () => {
  const s = { ...initialState(2), streak: 2 };
  const r = applyPlanPass(s, [true, true, false]);
  assert.equal(r.state.strokeCount, 3);
  assert.equal(r.state.current, 2);
  assert.equal(r.state.streak, 0);
  assert.equal(r.letterDone, false);
  assert.equal(applyPlanPass(r.state, [true, true, true]).letterDone, true);
});
