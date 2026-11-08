// Run: node --test tests/copy.test.js
// The copy-it round (Slice 5I; judged by shape since Slice 5J): her whole letter
// is judged by its shape against the board's characters, every part must be
// there, and its size must be 75% to 125% of the model. Start points, direction
// and order are habits: logged and coached, never failed. Uses the real
// character files in data/chars/. More shape tests: tests/shape.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COPY_SIZE, COPY_STAGE, boxOf, refBox, fitLetter, scoreCopy as judgeAlone, copyReady as readyAlone,
  copyStatus as statusAlone, copyLogEntry, usableStrokes, compareIds, copyShow,
} from '../src/copy.js';
import { DEFAULTS } from '../src/geometry.js';
import { CONFIG, finishCopy, isCopyRound } from '../src/progress.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${id}.json`, import.meta.url), 'utf8'));
const MANIFEST = JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url), 'utf8'));

// As the game does: compared with the character's board and its look-alikes.
const othersOf = (char) => compareIds(char.id).map(load);
const scoreCopy = (strokes, char, opts = {}) => judgeAlone(strokes, char, { others: othersOf(char), ...opts });
const copyReady = (strokes, char, opts = {}) => readyAlone(strokes, char, { others: othersOf(char), ...opts });
const copyStatus = (strokes, char, opts = {}) => statusAlone(strokes, char, { others: othersOf(char), ...opts });

// Her copy of a letter: every stroke's points, scaled by `k` about the letter's
// top-left and moved by (dx, dy). That is "the same letter, smaller or bigger,
// somewhere else on the lines".
const copyOf = (char, { k = 1, dx = 0, dy = 0, order, reverse = [], drop = [] } = {}) => {
  const idx = order ?? char.strokes.map((_, i) => i);
  return idx
    .filter((i) => !drop.includes(i))
    .map((i) => {
      const pts = char.strokes[i].points.map(([x, y]) => [x * k + dx, y * k + dy]);
      return reverse.includes(i) ? pts.reverse() : pts;
    });
};

// A small, smooth wobble, as a real hand makes (deterministic).
const wobble = (strokes, amp = 0.02) => strokes.map((pts) => pts.map(([x, y], i) => [x + amp * Math.sin(i * 0.9), y + amp * Math.cos(i * 0.7)]));

test('the size band is 75% to 125%, and the copy round is judged at Stage 3', () => {
  assert.deepEqual(COPY_SIZE, { min: 0.75, max: 1.25 });
  assert.equal(COPY_STAGE, 3);
});

test('the scoring tolerances are untouched', () => {
  assert.deepEqual(DEFAULTS.stages[3], { startRadius: 0.12, tolerance: 0.16, dotRadius: 0.11 });
});

test('every capital and digit stands sky line to grass line, so its size is measured against that', () => {
  for (const id of MANIFEST) {
    const b = refBox(load(id));
    assert.ok(Math.abs(b.y0) < 0.005 && Math.abs(b.y1 - 1) < 0.005, `${id}: ${b.y0}..${b.y1}`);
    assert.ok(b.h >= b.w, `${id} is taller than wide`);
  }
});

test('every character, copied exactly, passes', () => {
  for (const id of MANIFEST) {
    const char = load(id);
    const r = scoreCopy(copyOf(char), char);
    assert.ok(r.ok, `${id}: ${r.reason}`);
    assert.equal(r.size, 1);
  }
});

test('a correct letter passes written smaller, bigger (within the band) and anywhere on the lines', () => {
  for (const id of ['L', 'A', 'E', 'S', '4', '8']) {
    const char = load(id);
    for (const k of [0.75, 0.8, 0.9, 1.1, 1.2, 1.25]) {
      for (const [dx, dy] of [[0, 0], [-1.4, 0.1], [1.8, -0.05], [0.3, 0.2]]) {
        const r = scoreCopy(copyOf(char, { k, dx, dy }), char);
        assert.ok(r.ok, `${id} at ${k} moved ${dx},${dy}: ${r.reason}`);
        assert.ok(Math.abs(r.size - k) < 1e-9);
        assert.ok(Math.abs(r.scale - 1 / k) < 1e-9);
      }
    }
  }
});

test('a correct letter with a gentle wobble still passes', () => {
  for (const id of ['L', 'H', 'O', '2']) {
    const char = load(id);
    const r = scoreCopy(wobble(copyOf(char, { k: 0.85, dx: -1 })), char);
    assert.ok(r.ok, `${id}: ${r.reason}`);
  }
});

test('too small fails', () => {
  const char = load('H');
  for (const k of [0.3, 0.6, 0.74]) {
    const r = scoreCopy(copyOf(char, { k }), char);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'too-small', String(k));
    assert.equal(r.sizeOk, false);
    assert.equal(copyShow(r), 'size'); // a dashed outline at the right size round her letter
  }
});

test('too big fails', () => {
  const char = load('H');
  for (const k of [1.26, 1.5, 2]) {
    const r = scoreCopy(copyOf(char, { k }), char);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'too-big', String(k));
  }
});

test('habits never fail a copy: strokes out of order, backwards or started elsewhere still pass', () => {
  const e = load('E');
  const order = scoreCopy(copyOf(e, { order: [0, 3, 1, 2] }), e);
  assert.ok(order.ok, order.reason);
  assert.equal(order.habits.order, 'different');
  assert.equal(order.habits.usual, false);
  const h = load('H');
  const back = scoreCopy(copyOf(h, { reverse: [1] }), h);
  assert.ok(back.ok, back.reason);
  assert.deepEqual(back.habits.directions, [true, false, true]);
  // A started-elsewhere stroke: the stem drawn from the middle down, then the rest up to the top.
  const l = load('L');
  const s = copyOf(l);
  const mid = Math.floor(s[0].length / 2);
  const start = scoreCopy([s[0].slice(mid), s[0].slice(0, mid + 1), s[1]], l);
  assert.ok(start.ok, start.reason);
  assert.equal(start.habits.usual, false);
});

test('when habits differ from the default plan, Jugnu replays the usual way once; a usual copy needs nothing', () => {
  const h = load('H');
  assert.equal(copyShow(scoreCopy(copyOf(h), h)), 'none');
  assert.equal(copyShow(scoreCopy(copyOf(h, { reverse: [0] }), h)), 'usual-way');
  // Another allowed plan also passes, and is coached the same way.
  const b = load('B');
  const three = scoreCopy(b.plans[0].strokes.map((x) => x.points), b);
  assert.ok(three.ok);
  assert.equal(three.habits.plan, 1);
  assert.equal(copyShow(three), 'usual-way');
});

test('a missing stroke fails and names the part: A with no crossbar, E with no middle bar, H with no bar', () => {
  for (const [id, drop, part] of [['A', [2], 'bar'], ['E', [2], 'middle bar'], ['H', [2], 'bar']]) {
    const char = load(id);
    const r = scoreCopy(copyOf(char, { drop }), char);
    assert.equal(r.ok, false, id);
    assert.equal(r.reason, 'missing-stroke', id);
    assert.equal(r.missing.part, part, id);
    assert.equal(copyShow(r), 'part'); // Jugnu draws it on the model
  }
});

test('joined versions are accepted: L in one go, 4 with strokes 2 and 3 in one go, 7 in one go', () => {
  const l = load('L');
  const lOne = [[...l.strokes[0].points, ...l.strokes[1].points].map(([x, y]) => [x * 0.9 - 1, y * 0.9])];
  const r = scoreCopy(lOne, l);
  assert.ok(r.ok, r.reason);
  assert.equal(r.strokes.length, 1);
  assert.equal(r.strokes[0].variant, 'joined 1-2');
  const four = load('4');
  const s = four.strokes.map((x) => x.points);
  assert.ok(scoreCopy([s[0], [...s[1], ...s[2]]], four).ok);
  const seven = load('7');
  assert.ok(scoreCopy([[...seven.strokes[0].points, ...seven.strokes[1].points]], seven).ok);
});

test('stray taps are ignored for letters without dots', () => {
  const char = load('L');
  const tap = [[2, 0.5]];
  const tiny = [[2, 0.5], [2.01, 0.5]];
  assert.equal(usableStrokes([tap, ...copyOf(char), tiny], char).length, 2);
  assert.ok(scoreCopy([tap, ...copyOf(char), tiny], char).ok);
});

test('nothing drawn, or only a flat line, has no size to measure', () => {
  const char = load('L');
  assert.equal(scoreCopy([], char).reason, 'no-letter');
  assert.equal(scoreCopy([[[0, 0.5], [0.5, 0.5]]], char).reason, 'no-letter');
  assert.equal(fitLetter([], char).scale, null);
});

test('the fit is one uniform scale, centre on centre', () => {
  const char = load('L');
  const fit = fitLetter(copyOf(char, { k: 0.8, dx: 1, dy: 0.1 }), char);
  const ref = refBox(char);
  const got = boxOf(fit.strokes);
  for (const key of ['x0', 'y0', 'x1', 'y1']) assert.ok(Math.abs(got[key] - ref[key]) < 1e-9, key);
});

test('judge now: once she has drawn as many strokes as the longest plan has, or fewer already pass', () => {
  const l = load('L');
  const strokes = copyOf(l);
  assert.equal(copyReady([], l), false);
  assert.equal(copyReady([strokes[0]], l), false); // half an L: wait for more
  assert.equal(copyReady(strokes, l), true);
  assert.equal(copyReady([[...strokes[0], ...strokes[1]]], l), true); // joined: complete in one
  // Two wrong strokes are still "as many as the letter has": judged at once.
  assert.equal(copyReady(copyOf(l, { reverse: [0, 1] }), l), true);
  const e = load('E');
  assert.equal(copyReady(copyOf(e, { drop: [3] }), e), false); // unfinished: see copyStatus
  // B: 2 strokes by default, 3 in its other plan. Stem and top bump only is not a B yet.
  const b = load('B');
  const b3 = b.plans[0].strokes.map((x) => x.points);
  assert.equal(copyReady(b3.slice(0, 2), b), false);
  assert.equal(copyReady(b3, b), true);
  assert.equal(copyReady(copyOf(b), b), true); // the default 2 strokes already pass
});

test('the wait after her last lift is 2 seconds for a whole letter, 5 for an unfinished one, and she gets 3 tries', () => {
  assert.equal(CONFIG.copyWaitMs, 2000);
  assert.equal(CONFIG.copyHintMs, 5000);
  assert.equal(CONFIG.copyTries, 3);
});

test('the last round is the copy round', () => {
  assert.deepEqual([0, 1, 2].map((r) => isCopyRound(r, 3)), [false, false, true]);
  assert.deepEqual([0, 1, 2, 3, 4].map((r) => isCopyRound(r, 5)), [false, false, false, false, true]);
});

test('finishCopy: a pass ends the round as any round does', () => {
  const r = finishCopy({ round: 2, helped: false }, { ok: true, fails: 1 }, 3);
  assert.deepEqual(r.state, { round: 3, helped: false });
  assert.equal(r.allDone, true);
  assert.equal(r.helpedOut, false);
});

test('finishCopy: a fail lets her try again, and the third fail ends the round with help (no star)', () => {
  const rp = { round: 2, helped: false };
  const a = finishCopy(rp, { ok: false, fails: 0 }, 3);
  assert.equal(a.again, true);
  assert.equal(a.fails, 1);
  assert.deepEqual(a.state, rp);
  const b = finishCopy(rp, { ok: false, fails: 1 }, 3);
  assert.equal(b.again, true);
  const c = finishCopy(rp, { ok: false, fails: 2 }, 3);
  assert.equal(c.again, false);
  assert.equal(c.helpedOut, true);
  assert.equal(c.allDone, true);
  assert.deepEqual(c.state, { round: 3, helped: true });
});

test('the copy log entry is a "copy" type with the shape match, the size, the habits and every stroke', () => {
  const char = load('H');
  const result = scoreCopy(copyOf(char, { k: 0.8, reverse: [1] }), char);
  const e = copyLogEntry({ char: 'H', result, attempt: 2, now: new Date('2026-11-07T10:00:00Z') });
  assert.equal(e.type, 'copy');
  assert.equal(e.time, '2026-11-07T10:00:00.000Z');
  assert.equal(e.char, 'H');
  assert.equal(e.attempt, 2);
  assert.equal(e.ok, true); // a stroke drawn backwards is a habit, not a fail
  assert.equal(e.reason, null);
  assert.equal(e.match.char, 'H');
  assert.equal(e.match.mirrored, false);
  assert.ok(e.match.distance < 0.3, String(e.match.distance)); // small: only the resampling moved
  assert.equal(e.lookalike, null);
  assert.equal(e.missing, null);
  assert.equal(e.mirrored, false);
  // Habits: plan used, starts, directions, order.
  assert.equal(e.plan, 0);
  assert.deepEqual(e.starts, [true, false, true]);
  assert.deepEqual(e.directions, [true, false, true]);
  assert.equal(e.order, 'usual');
  assert.equal(e.usual, false);
  assert.equal(e.scale, 1.25);
  assert.equal(e.size, 0.8);
  assert.equal(e.sizeOk, true);
  assert.equal(e.strokes.length, 3);
  assert.deepEqual(Object.keys(e.strokes[0]), ['stroke', 'variant', 'ok', 'reason', 'startOk', 'directionOk', 'shapeOk', 'error']);
  assert.equal(e.strokes[1].directionOk, false);
  assert.equal(e.helped, false);
  assert.doesNotThrow(() => JSON.stringify(e));
});

// ---- After her lift: judge, or wait and hint (copyStatus) ----

test('a complete letter (as many strokes as the model) is judged at once, right or wrong', () => {
  for (const id of ['L', 'H', 'E', '4']) {
    const char = load(id);
    assert.deepEqual(copyStatus(copyOf(char, { k: 0.9, dx: -1 }), char), { action: 'judge-now', next: null, plan: 0 }, id);
    assert.equal(copyStatus(copyOf(char, { reverse: [0] }), char).action, 'judge-now', id);
  }
});

test('a joined letter that passes is judged at once', () => {
  const l = load('L');
  const one = [[...l.strokes[0].points, ...l.strokes[1].points]];
  assert.equal(copyStatus(one, l).action, 'judge-now');
});

test('a joined letter that does not pass is judged after the 2-second wait, not hinted', () => {
  const l = load('L');
  // L in one go, but far too big: whole, yet it fails.
  const one = [[...l.strokes[0].points, ...l.strokes[1].points].map(([x, y]) => [x * 1.6, y * 1.6])];
  assert.equal(scoreCopy(one, l).reason, 'too-big');
  assert.equal(copyStatus(one, l).action, 'judge-soon');
  // L in one go, drawn backwards, is a whole L: it passes (direction is a habit) and is judged at once.
  const back = [[...l.strokes[0].points, ...l.strokes[1].points].reverse()];
  assert.equal(copyStatus(back, l).action, 'judge-now');
  assert.ok(scoreCopy(back, l).ok);
});

test('fewer strokes than the letter needs: wait for the hint, which shows the next stroke', () => {
  const cases = [
    ['L', [0], 1],
    ['H', [0], 1],
    ['H', [0, 1], 2],
    ['E', [0, 1, 2], 3],
    ['A', [0, 1], 2],
    ['4', [0], 1],
    ['K', [0, 1], 2],
  ];
  for (const [id, keep, next] of cases) {
    const char = load(id);
    const drop = char.strokes.map((_, i) => i).filter((i) => !keep.includes(i));
    for (const [k, dx] of [[1, 0], [0.8, -1.2], [1.2, 0.9]]) {
      const got = copyStatus(copyOf(char, { drop, k, dx }), char);
      assert.deepEqual(got, { action: 'hint', next, plan: 0 }, `${id} with strokes ${keep.map((i) => i + 1)} at ${k}`);
    }
  }
});

test('the hint still finds the next stroke when a stroke so far was drawn backwards', () => {
  const h = load('H');
  assert.deepEqual(copyStatus(copyOf(h, { drop: [2], reverse: [1] }), h), { action: 'hint', next: 2, plan: 0 });
});

test('4: stroke 1 alone reads as unfinished, though strokes 2 and 3 may be joined', () => {
  const four = load('4');
  const s = four.strokes.map((x) => x.points);
  assert.deepEqual(copyStatus([s[0]], four), { action: 'hint', next: 1, plan: 0 });
  assert.equal(copyStatus([s[0], [...s[1], ...s[2]]], four).action, 'judge-now');
  assert.deepEqual(copyStatus([s[0], s[1]], four), { action: 'hint', next: 2, plan: 0 });
});

test('T in either order (two plans): the hint shows whichever stroke she has not drawn', () => {
  const t = load('T');
  assert.deepEqual(copyStatus(copyOf(t, { drop: [1] }), t), { action: 'hint', next: 1, plan: 0 });
  // The bar first is T's second plan (bar, stem): next is its stroke 2, the stem.
  const got = copyStatus(copyOf(t, { drop: [0] }), t);
  assert.deepEqual(got, { action: 'hint', next: 1, plan: 1 });
  assert.equal(t.plans[0].strokes[1].part, 'stem');
});

test('only stray taps: the hint shows stroke 1', () => {
  const l = load('L');
  assert.deepEqual(copyStatus([[[1, 0.5]]], l), { action: 'hint', next: 0, plan: 0 });
});

test('a hint is not a failed copy: only a judged copy moves the count (finishCopy)', () => {
  // The game calls finishCopy only when it judges; a hint changes no state.
  const rp = { round: 2, helped: false };
  const two = finishCopy(rp, { ok: false, fails: 1 }, 3);
  assert.equal(two.fails, 2);
  assert.equal(two.again, true);
});
