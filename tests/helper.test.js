// Run: node --test tests/helper.test.js
// Slice 5J part 2: the fading helper in the copy-it round (src/progress.js
// HELPER, src/render.js copyHelperMarks, saved in td.helper by src/storage.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HELPER, startHelper, applyHelperCopy } from '../src/progress.js';
import { copyHelperMarks } from '../src/render.js';
import { copyStatus, copyLogEntry, scoreCopy, compareIds } from '../src/copy.js';
import { planChar, planStrokes } from '../src/variants.js';
import { readHelper, saveHelper, HELPER_KEY, testStore } from '../src/storage.js';
import { charFile } from '../src/session.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const others = (id) => compareIds(id).filter((i) => i !== id).map(load);

// A small in-memory store, as localStorage.
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};

// Run a list of copies ('pass', 'hint' = a pass after a hint, 'fail') from a state.
const run = (state, list) => list.reduce((s, x) => applyHelperCopy(s, { ok: x !== 'fail', hinted: x === 'hint' }), state);

// ---- the rules ----

test('every character starts at level 1; anything odd saved starts fresh', () => {
  assert.deepEqual(startHelper(null), { level: 1, passes: 0, fails: 0 });
  assert.deepEqual(startHelper({ level: 7 }), { level: 1, passes: 0, fails: 0 });
  assert.deepEqual(startHelper({ level: '2' }), { level: 1, passes: 0, fails: 0 });
  assert.deepEqual(startHelper({ level: 2, passes: 1, fails: 9 }), { level: 2, passes: 1, fails: 0 });
  assert.deepEqual(HELPER, { start: 1, top: 3, passesUp: 2, failsDown: 2 });
});

test('up a level after 2 passes at the current level without help, up to level 3', () => {
  let s = startHelper(null);
  s = run(s, ['pass']);
  assert.deepEqual(s, { level: 1, passes: 1, fails: 0 });
  s = run(s, ['pass']);
  assert.deepEqual(s, { level: 2, passes: 0, fails: 0 });
  s = run(s, ['pass', 'pass']);
  assert.deepEqual(s, { level: 3, passes: 0, fails: 0 });
  s = run(s, ['pass', 'pass', 'pass']);
  assert.equal(s.level, 3, 'level 3 is the top');
});

test('the passes need not be in a row: a fail between them does not undo the first', () => {
  const s = run(startHelper(null), ['pass', 'fail', 'pass']);
  assert.deepEqual(s, { level: 2, passes: 0, fails: 0 });
});

test('a pass after a hint (Jugnu helped) never moves the helper up, but ends a run of fails', () => {
  let s = run(startHelper(null), ['hint', 'hint', 'hint']);
  assert.deepEqual(s, { level: 1, passes: 0, fails: 0 });
  s = run({ level: 2, passes: 0, fails: 0 }, ['fail', 'hint', 'fail']);
  assert.equal(s.level, 2, 'the fails were not in a row');
});

test('down one level after 2 failed copies in a row, never below level 1', () => {
  assert.deepEqual(run({ level: 3, passes: 1, fails: 0 }, ['fail']), { level: 3, passes: 1, fails: 1 });
  assert.deepEqual(run({ level: 3, passes: 1, fails: 0 }, ['fail', 'fail']), { level: 2, passes: 0, fails: 0 });
  assert.deepEqual(run({ level: 3, passes: 0, fails: 0 }, ['fail', 'fail', 'fail', 'fail']), { level: 1, passes: 0, fails: 0 });
  assert.deepEqual(run({ level: 1, passes: 1, fails: 0 }, ['fail', 'fail']), { level: 1, passes: 1, fails: 0 });
  // A pass between two fails: no drop.
  assert.equal(run({ level: 3, passes: 0, fails: 0 }, ['fail', 'pass', 'fail']).level, 3);
});

test('across sittings: the counts are saved per character and carry on', () => {
  const store = memory();
  assert.equal(readHelper('M', store), null);
  saveHelper('M', run(startHelper(readHelper('M', store)), ['pass']), store);   // sitting 1
  saveHelper('M', run(startHelper(readHelper('M', store)), ['pass']), store);   // sitting 2
  assert.deepEqual(startHelper(readHelper('M', store)), { level: 2, passes: 0, fails: 0 });
  assert.equal(readHelper('N', store), null, 'each character has its own');
  assert.deepEqual(JSON.parse(store.getItem(HELPER_KEY)).M, { level: 2, passes: 0, fails: 0 });
});

test('saving never throws: a full or broken store just returns false; junk reads as fresh', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
  assert.equal(saveHelper('M', { level: 2, passes: 0, fails: 0 }, broken), false);
  assert.equal(readHelper('M', broken), null);
  const junk = memory();
  junk.setItem(HELPER_KEY, '{not json');
  assert.equal(readHelper('M', junk), null);
  assert.deepEqual(startHelper(readHelper('M', junk)), { level: 1, passes: 0, fails: 0 });
});

test('test mode keeps the helper in its own test key', () => {
  const real = memory();
  saveHelper('M', { level: 3, passes: 0, fails: 0 }, testStore(real));
  assert.equal(real.getItem(HELPER_KEY), null);
  assert.ok(real.getItem(`test.${HELPER_KEY}`));
});

// ---- what each level shows ----

test('level 1: a dotted ghost of the whole letter and the first start dot, which goes once she has drawn', () => {
  const a = load('A');
  const m = copyHelperMarks(a, 1);
  assert.equal(m.ghost.length, 3);
  assert.deepEqual(m.dots, [{ at: a.strokes[0].points[0], label: null }]);
  assert.deepEqual(copyHelperMarks(a, 1, [true, false, false]).dots, []);
  assert.equal(copyHelperMarks(a, 1, [true, false, false]).ghost.length, 3, 'the ghost stays');
});

test('level 2: start dots only, one per stroke she has not drawn, numbered', () => {
  const e = load('E');
  const m = copyHelperMarks(e, 2);
  assert.deepEqual(m.ghost, []);
  assert.deepEqual(m.dots.map((d) => d.label), [1, 2, 3, 4]);
  assert.deepEqual(copyHelperMarks(e, 2, [true, true, false, false]).dots.map((d) => d.label), [3, 4]);
});

test("level 2: two strokes that start together (M) never hide each other's dot", () => {
  const dots = copyHelperMarks(load('M'), 2).dots;
  assert.equal(dots.length, 2);
  const gap = Math.hypot(dots[0].at[0] - dots[1].at[0], dots[0].at[1] - dots[1].at[1]);
  assert.ok(gap > 0.12, `dots ${gap.toFixed(3)} apart`);
  assert.deepEqual(dots[0].at, load('M').strokes[0].points[0], 'the first stays on its start');
});

test('level 3: nothing on the lines', () => {
  assert.deepEqual(copyHelperMarks(load('E'), 3), { ghost: [], dots: [] });
});

test("level 2's dots follow the plan her strokes read as: E with its L first", () => {
  const e = load('E');
  const L = planStrokes(e, 1)[0].points; // stem and bottom bar in one
  const st = copyStatus([L], e, { others: others('E') });
  assert.equal(st.action, 'hint');
  assert.equal(st.plan, 1);
  assert.deepEqual(st.done, [true, false, false]);
  const dots = copyHelperMarks(planChar(e, st.plan), 2, st.done).dots;
  assert.deepEqual(dots.map((d) => d.at), [planStrokes(e, 1)[1].points[0], planStrokes(e, 1)[2].points[0]]);
});

test('every copy log entry records the helper level shown', () => {
  const m = load('M');
  const result = scoreCopy(m.strokes.map((s) => s.points), m, { others: others('M') });
  assert.equal(copyLogEntry({ char: 'M', result, attempt: 1, helper: 2 }).helper, 2);
  assert.equal(copyLogEntry({ char: 'M', result, attempt: 1 }).helper, null);
});

test('shape judging is the same at every level: the level is never an input to scoreCopy', () => {
  const src = readFileSync(new URL('../src/copy.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('export function scoreCopy'), src.indexOf('// A part to show on the model card'));
  assert.equal(/helper/i.test(body), false);
});
