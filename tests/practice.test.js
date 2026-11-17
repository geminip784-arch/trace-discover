// Run: node --test tests/practice.test.js
// Slice 5L: the practice page. Three spaces on one set of four lines (space 1
// traced, spaces 2 and 3 written on her own and judged like the copy-it round),
// a firefly per finished space, never stuck after 3 failed copies, a fresh page
// when all three are done, and a 'practice' log entry. It never touches stars,
// reviews or helper levels. Uses the real character files in data/chars/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PRACTICE, practiceLayout, spaceWidth, toSpace, fromSpace, scoreSpace, spaceStatus, startPage, finishTrace,
  judgeSpace, nextPage, fireflies, isPageDone, practiceLogEntry,
} from '../src/practice.js';
import { computeLayout, COPY_ROOM, BUTTONS_RIGHT, TAIL_LINE } from '../src/render.js';
import { DEFAULTS, withMinLeeway, MIN_LEEWAY_PX } from '../src/geometry.js';
import { compareIds, copyLogEntry } from '../src/copy.js';
import { copyNote } from '../src/notes.js';
import { charFile } from '../src/session.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const MANIFEST = JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url), 'utf8'));
const othersOf = (char) => compareIds(char.id).filter((id) => id !== char.id && MANIFEST.includes(id)).map(load);
// Her two tablet screens: in Chrome, and the installed app (CLAUDE.md).
const SCREENS = [[1280, 626], [1280, 800]];

// ---------------------------------------------------------------------------
// Layout: 3 spaces fit for every letter and number, on both screens

test('three spaces fit side by side for every letter and number, on both screens', () => {
  assert.ok(MANIFEST.length >= 73);
  for (const [w, h] of SCREENS) {
    for (const id of MANIFEST) {
      const char = load(id);
      const L = practiceLayout(w, h, char.width);
      assert.equal(L.spaces.length, 3);
      // In her writing room: right of the buttons, clear of the right edge.
      assert.ok(L.spaces[0].x0 >= BUTTONS_RIGHT - 1e-6, `${id} ${w}x${h}: space 1 under the buttons`);
      assert.ok(L.spaces[2].x1 <= w - PRACTICE.right + 1e-6, `${id} ${w}x${h}: space 3 off the screen`);
      // Side by side, not overlapping, each wide enough for the biggest copy that passes.
      for (let k = 0; k < 3; k++) {
        const s = L.spaces[k];
        assert.ok(s.x1 - s.x0 + 1e-6 >= COPY_ROOM.size * char.width * L.unit, `${id}: space ${k + 1} too narrow`);
        if (k > 0) assert.ok(s.x0 >= L.spaces[k - 1].x1 - 1e-6);
      }
      // Each character box sits inside its own space.
      for (let k = 0; k < 3; k++) {
        const x0 = L.originX + (L.offset + k * L.step) * L.unit;
        const x1 = x0 + char.width * L.unit;
        assert.ok(x0 >= L.spaces[k].x0 - 1e-6 && x1 <= L.spaces[k].x1 + 1e-6, `${id}: box ${k + 1} outside its space`);
      }
      // The four lines fit on the screen, and never grow past a single letter's.
      assert.ok(L.unit <= computeLayout(w, h).unit + 1e-9);
      assert.ok(L.top >= 0 && L.top + TAIL_LINE * L.unit <= h);
      // The lines run under every space's biggest copy that passes (125%, centred on its box).
      const grow = ((COPY_ROOM.size - 1) / 2) * char.width * L.unit;
      const first = L.originX + L.offset * L.unit - grow;
      const last = L.originX + (L.offset + 2 * L.step + char.width) * L.unit + grow;
      assert.ok(L.originX <= first + 1e-6 && L.lineEnd >= last - 1e-6, `${id} ${w}x${h}: the lines run under every space`);
    }
  }
});

test('the lines shrink only when three spaces need it; the 45 px floor keeps every tolerance', () => {
  const [w, h] = SCREENS[0];
  // A narrow letter keeps a single letter's size; a wide one (20) is smaller.
  const narrow = practiceLayout(w, h, load('l').width);
  assert.equal(narrow.unit, computeLayout(w, h).unit);
  const wide = practiceLayout(w, h, load('20').width);
  assert.ok(wide.unit < computeLayout(w, h).unit);
  assert.ok(wide.unit > 150, `20 is still written big: ${wide.unit.toFixed(0)} px`);
  for (const [sw, sh] of SCREENS) {
    for (const id of MANIFEST) {
      const L = practiceLayout(sw, sh, load(id).width);
      const s = withMinLeeway(DEFAULTS, L.unit).stages[1];
      for (const v of [s.startRadius, s.tolerance, s.dotRadius]) assert.ok(v * L.unit >= MIN_LEEWAY_PX - 1e-9, `${id}: under 45 px`);
    }
  }
});

test('toSpace and fromSpace move points between space 1 and space k', () => {
  const pts = [[0.1, 0.2], [0.5, 1]];
  assert.deepEqual(toSpace(pts, 2, 1.5), [[3.1, 0.2], [3.5, 1]]);
  assert.deepEqual(fromSpace(toSpace(pts, 2, 1.5), 2, 1.5).map((p) => p.map((v) => Number(v.toFixed(9)))), pts);
  assert.equal(spaceWidth(1), COPY_ROOM.size + COPY_ROOM.spare);
});

// ---------------------------------------------------------------------------
// Spaces 2 and 3: judged like the copy-it round, with its reasons

// Her letter as she might write it in space k: the model's strokes, scaled and moved.
const written = (char, k, step, { k: size = 1, drop = [] } = {}) => char.strokes
  .filter((_, i) => !drop.includes(i))
  .map((s) => toSpace(s.points.map(([x, y]) => [x * size, y * size + (1 - size) * 1]), k, step));

test('spaces 2 and 3: a good letter passes wherever the space is', () => {
  for (const id of ['A', 'E', 'g', 'k', '4', '7', '12', '20']) {
    const char = load(id);
    const { step } = practiceLayout(1280, 626, char.width);
    for (const k of [1, 2]) {
      const r = scoreSpace(written(char, k, step), char, k, step, { others: othersOf(char) });
      assert.equal(r.ok, true, `${id} in space ${k + 1}: ${r.reason}`);
      assert.equal(copyNote(r), null); // a usual pass: nothing to say
    }
  }
});

test('spaces 2 and 3: a copy that does not count says why, as in the copy-it round', () => {
  const A = load('A');
  const { step } = practiceLayout(1280, 626, A.width);
  // The crossbar left out.
  const bar = A.strokes.findIndex((s) => /bar/.test(s.part ?? ''));
  const noBar = scoreSpace(written(A, 1, step, { drop: [bar >= 0 ? bar : A.strokes.length - 1] }), A, 1, step, { others: othersOf(A) });
  assert.equal(noBar.ok, false);
  assert.match(noBar.reason, /missing-stroke|looks-like/);
  assert.match(copyNote(noBar), /^Almost!/);
  // Far too small.
  const tiny = scoreSpace(written(A, 2, step, { k: 0.4 }), A, 2, step, { others: othersOf(A) });
  assert.equal(tiny.ok, false);
  assert.equal(tiny.reason, 'too-small');
  assert.equal(copyNote(tiny), 'Make it bigger.');
  // A lowercase letter in the wrong place on the lines: the tail of g must go below the grass.
  const g = load('g');
  const gs = practiceLayout(1280, 626, g.width).step;
  const high = g.strokes.map((s) => toSpace(s.points.map(([x, y]) => [x, y - 0.45]), 1, gs));
  const r = scoreSpace(high, g, 1, gs, { others: othersOf(g) });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'position-tail');
  assert.equal(copyNote(r), 'Let the tail go below the grass.');
});

test('spaces 2 and 3: a letter stopped part way waits for a hint, as in the copy-it round', () => {
  const E = load('E');
  const { step } = practiceLayout(1280, 626, E.width);
  const first = written(E, 1, step).slice(0, 1);
  assert.equal(spaceStatus(first, E, 1, step, { others: othersOf(E) }).action, 'hint');
  assert.equal(spaceStatus(written(E, 1, step), E, 1, step, { others: othersOf(E) }).action, 'judge-now');
});

// ---------------------------------------------------------------------------
// The page: fireflies, never stuck, next page

test('a page: space 1 traced, then spaces 2 and 3, each lighting a firefly', () => {
  let page = startPage();
  assert.deepEqual(fireflies(page), ['now', 'next', 'next']);
  // A copy before space 1 is traced changes nothing.
  assert.equal(judgeSpace(page, { ok: true }).state, page);
  let r = finishTrace(page);
  page = r.state;
  assert.equal(r.pageDone, false);
  assert.deepEqual(fireflies(page), ['done', 'now', 'next']);
  r = judgeSpace(page, { ok: true });
  assert.equal(r.spaceDone, true);
  page = r.state;
  assert.deepEqual(fireflies(page), ['done', 'done', 'now']);
  r = judgeSpace(page, { ok: true });
  assert.equal(r.pageDone, true);
  assert.deepEqual(fireflies(r.state), ['done', 'done', 'done']);
  assert.equal(r.state.spaces.some((s) => s.helped), false);
});

test('never stuck: after 3 failed copies in a space, Jugnu writes it and it counts as done, with help', () => {
  let page = finishTrace(startPage()).state;
  let r = judgeSpace(page, { ok: false });
  assert.deepEqual([r.again, r.spaceDone, r.helpedOut, r.fails], [true, false, false, 1]);
  r = judgeSpace(r.state, { ok: false });
  assert.deepEqual([r.again, r.spaceDone, r.helpedOut, r.fails], [true, false, false, 2]);
  r = judgeSpace(r.state, { ok: false });
  assert.deepEqual([r.again, r.spaceDone, r.helpedOut, r.fails], [false, true, true, 3]);
  page = r.state;
  assert.deepEqual(page.spaces[1], { done: true, helped: true, fails: 3 });
  assert.deepEqual(fireflies(page), ['done', 'done', 'now']);
  // A pass after 2 fails: done with no help.
  let p3 = judgeSpace(page, { ok: false }).state;
  p3 = judgeSpace(p3, { ok: false }).state;
  r = judgeSpace(p3, { ok: true });
  assert.deepEqual([r.spaceDone, r.helpedOut, r.pageDone], [true, false, true]);
  assert.equal(r.state.spaces[2].helped, false);
  assert.equal(PRACTICE.tries, 3);
});

test('space 1: Jugnu drawing a stroke (round 1 rule) still finishes it, with help, and never starts it again', () => {
  const r = finishTrace(startPage(), { assisted: true });
  assert.deepEqual(r.state.spaces[0], { done: true, helped: true, fails: 0 });
  assert.equal(r.state.space, 1);
  // Tracing again does nothing once it is done.
  assert.equal(finishTrace(r.state).state, r.state);
});

test('next page: only once all three spaces are done, and then a fresh page', () => {
  let page = startPage();
  assert.equal(nextPage(page), page);
  page = finishTrace(page).state;
  page = judgeSpace(page, { ok: true }).state;
  assert.equal(nextPage(page), page); // not done yet
  page = judgeSpace(page, { ok: true }).state;
  assert.equal(isPageDone(page), true);
  const fresh = nextPage(page);
  assert.deepEqual(fresh, startPage());
  assert.deepEqual(fireflies(fresh), ['now', 'next', 'next']);
});

// ---------------------------------------------------------------------------
// The log: a new 'practice' type; nothing else changes

test('each space is logged as a "practice" entry', () => {
  const now = new Date('2026-11-17T10:00:00Z');
  const t = practiceLogEntry({ char: 'A', page: 1, space: 1, ok: true, done: true, trace: { misses: 2, wrongStarts: 1, reversed: 0 }, now });
  assert.deepEqual(t, {
    type: 'practice', time: now.toISOString(), char: 'A', page: 1, space: 1, kind: 'trace', ok: true, helped: false, done: true,
    attempt: null, reason: null, trace: { misses: 2, wrongStarts: 1, reversed: 0 }, copy: null,
  });
  const A = load('A');
  const { step } = practiceLayout(1280, 626, A.width);
  const result = scoreSpace(written(A, 1, step, { k: 0.4 }), A, 1, step, { others: othersOf(A) });
  const c = practiceLogEntry({ char: 'A', page: 2, space: 2, ok: false, attempt: 1, copy: copyLogEntry({ char: 'A', result, attempt: 1 }), now });
  assert.equal(c.type, 'practice');
  assert.equal(c.kind, 'copy');
  assert.equal(c.reason, 'too-small');
  assert.equal(c.copy.type, undefined); // never a 'copy' entry: the copy-it round's own entries stay its own
  assert.equal(c.copy.reason, 'too-small');
});

test('the practice page never touches stars, reviews, helper levels or the practice-more list', () => {
  // Its modules never import the storage functions that save them.
  const src = ['practice.js', 'practice-game.js'].map((f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')).join('\n');
  for (const name of ['saveStar', 'saveReviews', 'savePracticeMore', 'saveHelper', 'saveRounds', 'clearRounds', 'recordPractice', 'recordReview', 'applyHelperCopy']) {
    assert.equal(src.includes(name), false, `${name} is used`);
  }
});
