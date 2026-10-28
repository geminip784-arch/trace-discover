// Run: node --test tests/variants.test.js
// Uses the real recorded character files in data/chars/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { joinsNext, variantsFrom, variantLabel, pickVariant, JOIN_GAP } from '../src/variants.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${id}.json`, import.meta.url), 'utf8'));
const joins = (id) => {
  const { strokes } = load(id);
  return strokes.slice(0, -1).map((_, k) => joinsNext(strokes, k));
};

test('the join gap is 0.12 line units', () => {
  assert.equal(JOIN_GAP, 0.12);
});

test('L, 7 and 1: stroke 1 joins stroke 2', () => {
  for (const id of ['L', '7', '1']) assert.deepEqual(joins(id), [true], id);
});

test('4: only strokes 2 and 3 join', () => {
  assert.deepEqual(joins('4'), [false, true]);
});

test('E, F, H and T: no strokes join', () => {
  for (const id of ['E', 'F', 'H', 'T']) assert.ok(joins(id).every((j) => !j), id);
});

test('L: from stroke 1 there is alone and joined 1-2; from stroke 2 only alone', () => {
  const { strokes } = load('L');
  assert.deepEqual(variantsFrom(strokes, 0).map(variantLabel), ['alone', 'joined 1-2']);
  assert.deepEqual(variantsFrom(strokes, 1).map(variantLabel), ['alone']);
  const joined = variantsFrom(strokes, 0)[1];
  assert.deepEqual(joined.points, [...strokes[0].points, ...strokes[1].points]);
});

test('4: joined 2-3 starts at stroke 2, nothing joins from stroke 1', () => {
  const { strokes } = load('4');
  assert.deepEqual(variantsFrom(strokes, 0).map(variantLabel), ['alone']);
  assert.deepEqual(variantsFrom(strokes, 1).map(variantLabel), ['alone', 'joined 2-3']);
});

test('joins chain when the next pair also joins', () => {
  const line = (a, b) => ({ kind: 'line', points: [a, b] });
  const strokes = [line([0, 0], [0, 1]), line([0, 1], [1, 1]), line([1, 1], [1, 0]), line([0, 0.5], [1, 0.5])];
  assert.deepEqual(variantsFrom(strokes, 0).map(variantLabel), ['alone', 'joined 1-2', 'joined 1-3']);
  assert.deepEqual(variantsFrom(strokes, 1).map(variantLabel), ['alone', 'joined 2-3']);
});

test('a dot never joins', () => {
  const strokes = [{ kind: 'line', points: [[0, 0], [0, 1]] }, { kind: 'dot', points: [[0, 1]] }];
  assert.equal(joinsNext(strokes, 0), false);
});

test('L: drawing the stem only matches alone', () => {
  const { strokes } = load('L');
  const pick = pickVariant(strokes[0].points, variantsFrom(strokes, 0), 1);
  assert.equal(pick.result.ok, true);
  assert.equal(variantLabel(pick.variant), 'alone');
  assert.equal(pick.all[1].result.ok, false);
});

test('L: drawing the whole L in one go matches joined 1-2', () => {
  const { strokes } = load('L');
  const child = [...strokes[0].points, ...strokes[1].points];
  for (const stage of [1, 2]) {
    const pick = pickVariant(child, variantsFrom(strokes, 0), stage);
    assert.equal(pick.result.ok, true, `stage ${stage}`);
    assert.equal(pick.variant.to, 1);
    assert.equal(pick.all[0].result.ok, false);
  }
});

test('7, 1 and 4: drawing the joined strokes in one go passes', () => {
  for (const [id, k] of [['7', 0], ['1', 0], ['4', 1]]) {
    const { strokes } = load(id);
    const child = [...strokes[k].points, ...strokes[k + 1].points];
    const pick = pickVariant(child, variantsFrom(strokes, k), 2);
    assert.equal(pick.result.ok, true, id);
    assert.equal(variantLabel(pick.variant), `joined ${k + 1}-${k + 2}`, id);
  }
});

test('when no variant passes, the result is against the stroke alone', () => {
  const { strokes } = load('L');
  const backwards = [...strokes[0].points].reverse();
  const pick = pickVariant(backwards, variantsFrom(strokes, 0), 1);
  assert.equal(pick.result.ok, false);
  assert.equal(pick.result.reason, 'wrong-direction');
  assert.equal(variantLabel(pick.variant), 'alone');
});

test('when more than one passes, the lowest error wins', () => {
  const variants = [{ from: 0, to: 0, points: [] }, { from: 0, to: 1, points: [] }, { from: 0, to: 2, points: [] }];
  const errors = [0.09, 0.03, 0.05];
  let i = 0;
  const fake = () => ({ ok: true, reason: null, error: errors[i++] });
  assert.equal(pickVariant([], variants, 1, fake).variant.to, 1);
});
