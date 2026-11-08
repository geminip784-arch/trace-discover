// Run: node --test tests/order.test.js
// Strokes that may be drawn in any order ("anyOrder" in a character file). Since
// Slice 5J no generated character uses it (T's either order is two stroke plans,
// tests/plans.test.js), but character files may (later Urdu letters), so it is
// tested on T's default strokes with an anyOrder group added.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupOf, nextStrokes, candidatesFor, pickCandidate, variantLabel } from '../src/variants.js';
import { initialState, applyLift } from '../src/progress.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${id}.json`, import.meta.url), 'utf8'));
const { plans, ...tFile } = load('T');
const T = { ...tFile, anyOrder: [[0, 1]] };
const L = load('L');
const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

test('T: strokes 1 and 2 may be drawn in either order; L has no group', () => {
  assert.deepEqual(T.anyOrder, [[0, 1]]);
  assert.deepEqual(groupOf(T, 0), [0, 1]);
  assert.deepEqual(groupOf(T, 1), [0, 1]);
  assert.deepEqual(groupOf(L, 0), [0]);
});

test('T: at the start both strokes are next; after either one, only the other', () => {
  assert.deepEqual(nextStrokes(T, [false, false]), [0, 1]);
  assert.deepEqual(nextStrokes(T, [true, false]), [1]);
  assert.deepEqual(nextStrokes(T, [false, true]), [0]);
  assert.deepEqual(nextStrokes(T, [true, true]), []);
});

test('L: only the next stroke in the recorded order, with its joined version', () => {
  assert.deepEqual(nextStrokes(L, [false, false]), [0]);
  assert.deepEqual(candidatesFor(L, [false, false]).map(variantLabel), ['alone', 'joined 1-2']);
});

test('T: the stem first passes against stroke 1', () => {
  const pick = pickCandidate(T.strokes[0].points, candidatesFor(T, [false, false]), 2);
  assert.equal(pick.result.ok, true);
  assert.equal(pick.variant.from, 0);
});

test('T: the bar first passes against stroke 2', () => {
  for (const stage of [1, 2]) {
    const pick = pickCandidate(T.strokes[1].points, candidatesFor(T, [false, false]), stage);
    assert.equal(pick.result.ok, true, `stage ${stage}`);
    assert.equal(pick.variant.from, 1);
  }
});

test('T: bar first, then the stem: the letter is done (with progress)', () => {
  let s = initialState(T.strokes.length);
  let pick = pickCandidate(T.strokes[1].points, candidatesFor(T, s.done), 2);
  s = applyLift(s, { ok: pick.result.ok, from: pick.variant.from, to: pick.variant.to }).state;
  assert.equal(s.current, 0, 'Jugnu still demonstrates the stem');
  pick = pickCandidate(T.strokes[0].points, candidatesFor(T, s.done), 2);
  const r = applyLift(s, { ok: pick.result.ok, from: pick.variant.from, to: pick.variant.to });
  assert.equal(r.letterDone, true);
});

test('T: once the stem is done, a second stem does not pass', () => {
  const pick = pickCandidate(T.strokes[0].points, candidatesFor(T, [true, false]), 2);
  assert.equal(pick.result.ok, false);
  assert.equal(pick.variant.from, 1);
});

test('when several pass, the lowest error wins', () => {
  const candidates = [{ from: 0, to: 0, points: [] }, { from: 1, to: 1, points: [] }];
  const errors = [0.08, 0.02];
  let i = 0;
  const fake = () => ({ ok: true, reason: null, error: errors[i++] });
  assert.equal(pickCandidate([[0, 0], [0, 1]], candidates, 1, fake).variant.from, 1);
});

test('T: a bar drawn backwards is scored against the bar, not the stem', () => {
  const backwards = [...T.strokes[1].points].reverse();
  const pick = pickCandidate(backwards, candidatesFor(T, [false, false]), 1);
  assert.equal(pick.result.ok, false);
  assert.equal(pick.variant.from, 1);
  assert.equal(pick.result.reason, 'wrong-direction');
});

test('T: a stem drawn far to the side fails against the stem', () => {
  const pick = pickCandidate(shift(T.strokes[0].points, 0.5, 0), candidatesFor(T, [false, false]), 2);
  assert.equal(pick.result.ok, false);
});
