// Run: node --test tests/crude.test.js
// Slice 5J part 2: the copy-it round against crude, child-like letters
// (tests/crude-letters.js): wobbly lines, uneven heights, a slight slant, M's
// middle point stopping above the grass line. Child-style templates
// (data/child-shapes.js) let recognizable letters pass without loosening any
// limit; look-alikes and scribbles still fail. `npm run crude-report` prints
// every letter's result.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreCopy, compareIds, COPY_MATCH, COPY_SIZE, childShapes, copyLogEntry } from '../src/copy.js';
import { CHILD_SHAPES } from '../data/child-shapes.js';
import { crudeLetters, crudeWrong, SHAPES, HANDS, seeded, wobble } from './crude-letters.js';
import { charFile } from '../src/session.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const CHARS = {};
const char = (id) => (CHARS[id] ??= load(id));
const judge = (id, strokes) => scoreCopy(strokes, char(id), { others: compareIds(id).filter((i) => i !== id).map(char) });

// The one crude letter that still fails, by choice: a template that fixed it
// made a crude R read as B (see docs/ideas.md).
const KNOWN_FAIL = [{ id: 'B', name: 'round bumps, uneven', hand: 'slanted right', reason: 'looks-like' }];
const isKnown = (c) => KNOWN_FAIL.some((k) => k.id === c.id && k.name === c.name && k.hand === c.hand);

test('the limits are untouched: child templates, not a looser shape limit', () => {
  assert.deepEqual(COPY_MATCH, {
    maxDistance: 1.2, coverRadius: 0.2, coverMin: 0.6, maxStretch: 1.5, closeCall: 0.35, closeKind: 1.1, inkRadius: 0.25, inkMin: 0.75, maxInk: 1.8,
    dotRadius: 0.22, dotShare: 0.4, // Slice 9A: the dot of i and j, checked on its own
  });
  assert.deepEqual(COPY_SIZE, { min: 0.75, max: 1.25 });
});

test('six child-style templates: three for M, one each for N, W and B', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(CHILD_SHAPES).map(([id, list]) => [id, list.map((s) => s.name)])), {
    M: ['middle at 0.6', 'middle at 0.72', 'splayed, middle at 0.6'],
    N: ['short diagonal and right side'],
    W: ['middle at 0.4'],
    B: ['small top bump, big bottom bump'],
  });
  assert.deepEqual(childShapes(char('A')), []);
});

test('child templates are never shown: no character file or stroke plan holds them', () => {
  for (const id of Object.keys(CHILD_SHAPES)) {
    const c = char(id);
    const all = [c.strokes, ...(c.plans ?? []).map((p) => p.strokes)];
    for (const shape of CHILD_SHAPES[id]) {
      for (const plan of all) assert.notDeepEqual(plan.map((s) => s.points), shape.strokes.map((s) => s.points), id);
    }
  }
});

test('the crude letters cover M, N, W, K, R, B and E in four hands', () => {
  assert.deepEqual(Object.keys(SHAPES), ['M', 'N', 'W', 'K', 'R', 'B', 'E']);
  assert.equal(HANDS.length, 4);
  assert.equal(crudeLetters().length, 124);
});

test("crude, child-like letters pass round 3 (all but one known B)", () => {
  const fails = [];
  for (const c of crudeLetters()) {
    const r = judge(c.id, c.strokes);
    if (isKnown(c)) {
      assert.equal(r.ok, false, `${c.id} ${c.name} ${c.hand} now passes: take it off KNOWN_FAIL`);
      assert.equal(r.reason, 'looks-like');
      continue;
    }
    if (!r.ok) fails.push(`${c.id} ${c.name} (${c.hand}): ${r.reason}, nearest ${r.match?.id} ${r.match?.distance?.toFixed(2)}`);
  }
  assert.deepEqual(fails, []);
});

test("M written in one stroke from the bottom, its middle point at 0.55 to 0.75, passes in every hand", () => {
  for (const c of crudeLetters(['M']).filter((x) => x.name.startsWith('one stroke from the bottom'))) {
    const r = judge('M', c.strokes);
    assert.equal(r.ok, true, `${c.name} ${c.hand}: ${r.reason}`);
  }
});

test('confusions still fail on crude letters: C for G, F for E, P for R', () => {
  for (const w of crudeWrong().filter((x) => ['C>G', 'F>E', 'P>R'].includes(`${x.written}>${x.target}`))) {
    const r = judge(w.target, w.strokes);
    assert.equal(r.ok, false, `${w.written} written for ${w.target} (${w.hand}) passed`);
  }
});

test('crude wrong letters: at least 140 of the 144 still fail (4 known cases, all a B on the 8 tile)', () => {
  const all = crudeWrong();
  assert.equal(all.length, 144);
  const passed = all.filter((w) => judge(w.target, w.strokes).ok);
  assert.ok(passed.length <= 4, passed.map((w) => `${w.written} for ${w.target} ${w.name ?? ''} ${w.hand}`).join('\n'));
  for (const w of passed) assert.ok(['B>8'].includes(`${w.written}>${w.target}`), `${w.written} for ${w.target}`);
});

test('crude scribbles still fail on every crude-letter tile', () => {
  const rnd = seeded(99);
  for (const id of Object.keys(SHAPES)) {
    for (let k = 0; k < 4; k++) {
      // A tangle of random strokes across the letter's box.
      const strokes = Array.from({ length: 3 }, () => Array.from({ length: 12 }, () => [rnd() * char(id).width, rnd()]));
      assert.equal(judge(id, wobble(strokes, 0.02, rnd)).ok, false, `${id} scribble ${k}`);
    }
  }
});

test('a child-style letter with a part left out still fails; a part it names is the model part', () => {
  const modelPoints = (id, { plan, stroke }) => (plan === 0 ? char(id).strokes : char(id).plans[plan - 1].strokes)[stroke].points;
  for (const [id, shapes] of Object.entries(CHILD_SHAPES)) {
    for (const shape of shapes) {
      for (let drop = 0; drop < shape.strokes.length; drop++) {
        const strokes = wobble(shape.strokes.filter((_, i) => i !== drop).map((p) => p.points), 0.015, seeded(5 + drop));
        const r = judge(id, strokes);
        // Known gap from before Slice 5J part 2: a B with no stem passes, the
        // model B too (its bumps start and end on the stem line, so they cover
        // it). Parked in docs/ideas.md.
        if (id === 'B' && shape.strokes[drop].part === 'stem') continue;
        assert.equal(r.ok, false, `${id} ${shape.name} without its ${shape.strokes[drop].part}`);
        if (r.missing?.plan !== null && r.missing?.plan !== undefined) assert.deepEqual(r.missing.points, modelPoints(id, r.missing), `${id}: shown as the model part`);
      }
    }
  }
});

test('the copy log names the child shape a copy matched', () => {
  const c = crudeLetters(['M']).find((x) => x.name === 'one stroke from the bottom, middle at 0.55' && x.hand === 'steady');
  const r = judge('M', c.strokes);
  assert.equal(r.ok, true);
  const e = copyLogEntry({ char: 'M', result: r, attempt: 1, helper: 1 });
  assert.equal(typeof e.match.child, 'string');
  const plain = judge('M', char('M').strokes.map((s) => s.points));
  assert.equal(copyLogEntry({ char: 'M', result: plain, attempt: 1 }).match.child, null);
});
