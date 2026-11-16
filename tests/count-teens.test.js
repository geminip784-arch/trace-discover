// Run: node --test tests/count-teens.test.js
// Slice 9B part 3: count scenes for 10 to 20 (src/finds.js). The things stand
// in ten-frames, the three groups one above another, and she counts on: one
// tap for a full ten-frame, then each extra from 11.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  numberScene, teenCounts, TEEN_APART, makeTenFrames, groupArt, makeGroup, frameCell, FRAME, ROW_SPOTS, CELL,
  startCountOn, tapTens, nextFrame, countStep, hasNumberScene, afterWriting, isTeen, countScale, groupScale,
  cleanFinds, findArt, startCount, tapCount,
} from '../src/finds.js';
import { ROOMS } from '../data/finds.js';

// A repeatable random sequence (a small linear congruential generator).
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const TEENS = Array.from({ length: 11 }, (_, k) => 10 + k);

// ---- which numbers have a scene ----

test('1 to 20 have a count scene; 0 and 21 do not', () => {
  for (let n = 1; n <= 20; n++) assert.ok(hasNumberScene(String(n)), n);
  for (const id of ['0', '21', '00', '1a']) assert.equal(hasNumberScene(id), false, id);
  assert.equal(afterWriting('17'), 'openScene');
  assert.equal(afterWriting('0'), 'letterDone');
  assert.ok(isTeen(10) && isTeen(20) && !isTeen(9) && !isTeen(21));
});

// ---- the three groups ----

test('the two wrong groups are between 10 and 20, and all three counts at least 3 apart', () => {
  assert.equal(TEEN_APART, 3);
  for (const n of TEENS) {
    for (let seed = 1; seed <= 60; seed++) {
      const scene = numberScene(n, { rand: seeded(seed * 31 + n) });
      const counts = scene.groups.map((g) => g.count);
      assert.equal(scene.frames, true);
      assert.equal(counts.length, 3);
      assert.equal(scene.groups[scene.right].count, n, `${n}: the right group`);
      assert.equal(counts.filter((c) => c === n).length, 1);
      for (const c of counts) assert.ok(c >= 10 && c <= 20, `${n}: ${counts}`);
      for (let a = 0; a < 3; a++) {
        for (let b = a + 1; b < 3; b++) assert.ok(Math.abs(counts[a] - counts[b]) >= 3, `${n}: ${counts}`);
      }
    }
  }
});

test('every allowed pair of wrong counts can come up, and nothing else', () => {
  for (const n of TEENS) {
    const allowed = new Set();
    for (let a = 10; a <= 20; a++) {
      for (let b = a + 3; b <= 20; b++) if (Math.abs(a - n) >= 3 && Math.abs(b - n) >= 3) allowed.add(`${a},${b}`);
    }
    assert.ok(allowed.size >= 1, `${n} has a choice`);
    const seen = new Set();
    const rand = seeded(n);
    for (let i = 0; i < 400; i++) seen.add(teenCounts(n, rand).sort((x, y) => x - y).join(','));
    assert.deepEqual([...seen].sort(), [...allowed].sort(), `${n}`);
  }
  // 15 is in the middle: its wrong groups come from 10 to 12 and 18 to 20.
  assert.ok([...Array(50)].every(() => teenCounts(15).every((c) => c <= 12 || c >= 18)));
});

test('the three placemats stand one above another, wide, in the same column', () => {
  const scene = numberScene(17, { rand: seeded(4) });
  const spots = scene.groups.map((g) => g.spot);
  assert.deepEqual(spots, ROW_SPOTS, 'top to bottom');
  assert.ok(spots.every((s) => s.x === spots[0].x && s.maxW >= 500));
  for (let i = 1; i < 3; i++) assert.ok(spots[i].bottom - spots[i - 1].bottom >= spots[i].maxH, 'no overlap');
  assert.ok(spots[2].bottom <= 640, 'on the stage');
  // Each placemat, as drawn, is at least 88 px tall: a big target for her tap.
  const art = makeTenFrames('apple', 17);
  for (const s of spots) {
    const k = Math.min(groupScale(art.W, s.maxW), s.maxH / art.H);
    assert.ok(art.H * k >= 88 && art.W * k >= 88, `${art.W * k} x ${art.H * k}`);
    assert.ok(s.bottom - art.H * k >= 0, 'clear of the top');
  }
  // Clear of the button column on the left (136 px) and the right edge.
  assert.ok(spots[0].x - spots[0].maxW / 2 >= 136 && spots[0].x + spots[0].maxW / 2 <= 1280);
});

test('1 to 9 keep their scenes: side by side, counts from 1 to 9, placemats of rows of five', () => {
  for (let n = 1; n <= 9; n++) {
    const scene = numberScene(n, { rand: seeded(n) });
    assert.ok(!scene.frames);
    assert.ok(scene.groups.every((g) => g.count >= 1 && g.count <= 9));
    assert.deepEqual(scene.groups.map((g) => g.spot), ROOMS[scene.room].groups);
    assert.equal(groupArt('cup', n).svg, makeGroup('cup', n).svg);
  }
  assert.equal(numberScene(21), null);
  assert.equal(numberScene(0), null);
});

// ---- ten-frames ----

test('ten-frames: two rows of five per ten, the first frame filled first, then the extras', () => {
  assert.deepEqual([FRAME.cols, FRAME.rows], [5, 2]);
  assert.deepEqual(frameCell(0), { frame: 0, row: 0, col: 0 });
  assert.deepEqual(frameCell(4), { frame: 0, row: 0, col: 4 });
  assert.deepEqual(frameCell(5), { frame: 0, row: 1, col: 0 });
  assert.deepEqual(frameCell(9), { frame: 0, row: 1, col: 4 });
  assert.deepEqual(frameCell(10), { frame: 1, row: 0, col: 0 });
  assert.deepEqual(frameCell(16), { frame: 1, row: 1, col: 1 });
  assert.deepEqual(frameCell(19), { frame: 1, row: 1, col: 4 });
});

const count = (re, s) => (s.match(re) ?? []).length;
const cellsIn = (svg, f) => {
  const part = svg.split('class="frame"')[f + 1];
  return { things: count(/class="cnt/g, part), slots: count(/class="slot"/g, part) };
};

test('every group 10 to 20 shows two frames: its things, and the empty places faint', () => {
  for (const n of TEENS) {
    const art = makeTenFrames('apple', n);
    assert.equal(count(/class="frame"/g, art.svg), 2, `${n}: two frames`);
    assert.equal(count(/class="cnt/g, art.svg), n, `${n} things`);
    assert.deepEqual(cellsIn(art.svg, 0), { things: 10, slots: 0 }, `${n}: a full first frame`);
    assert.deepEqual(cellsIn(art.svg, 1), { things: n - 10, slots: 20 - n }, `${n}: the extras`);
    for (let i = 0; i < n; i++) assert.ok(art.svg.includes(`data-i="${i}"`), `${n}: item ${i}`);
    // Same size whatever n is, so the three groups compare fairly.
    assert.equal(art.W, makeTenFrames('apple', 10).W);
    assert.equal(art.H, makeTenFrames('apple', 20).H);
    assert.ok(art.svg.includes('>10</text>') && art.svg.includes('>20</text>'), 'the frames\' hidden numbers');
  }
  assert.equal(makeTenFrames('apple', 17, 3).svg.match(/class="cnt gold" data-i="(\d+)"/)[1], '3');
});

test('17 is a full frame and 7 more: the extras fill the top row, then two below', () => {
  const svg = makeTenFrames('apple', 17).svg;
  const at = (i) => svg.match(new RegExp(`<g transform="translate\\(([\\d.]+),([\\d.]+)\\)"><g class="cnt[^"]*" data-i="${i}"`)).slice(1).map(Number);
  const [x10, y10] = at(10);
  const [x14, y14] = at(14);
  const [x15, y15] = at(15);
  const [x16] = at(16);
  assert.equal(y10, y14, 'top row');
  assert.ok(y15 > y10, 'then the row below');
  assert.equal(x15, x10, 'from the left again');
  assert.equal(x14 - x10, 4 * CELL);
  assert.equal(x16 - x15, CELL);
  assert.ok(x10 > at(4)[0], 'in the second frame, right of the first');
});

test('counting 10 to 20: each thing at least 88 px on both screens', () => {
  const art = makeTenFrames('apple', 17);
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    const k = countScale(art.W, art.H, w, h);
    assert.ok(CELL * k >= 88, `${w}x${h}: ${CELL * k} px`);
  }
});

// ---- counting on ----

// Tap through a list of targets; the numbers that came up (null: did not count).
function play(n, taps) {
  let state = startCountOn(n);
  const numbers = taps.map((t) => {
    const r = tapTens(state, t);
    state = r.state;
    return r.number;
  });
  return { state, numbers };
}
const extras = (n, from = 10) => Array.from({ length: n - from }, (_, k) => ({ item: from + k }));

test('17: one tap on the full frame counts ten, then the extras count on from 11 to 17', () => {
  const { state, numbers } = play(17, [{ frame: 0 }, ...extras(17)]);
  assert.deepEqual(numbers, [10, 11, 12, 13, 14, 15, 16, 17]);
  assert.equal(state.done, true);
  assert.deepEqual(state.frames, [0]);
});

test('every number 10 to 20 counts on: 10, then n - 10 more taps, ending on n', () => {
  for (const n of TEENS) {
    const taps = [{ frame: 0 }, ...(n === 20 ? [{ frame: 1 }] : extras(n))];
    const { state, numbers } = play(n, taps);
    const want = n === 20 ? [10, 20] : [10, ...Array.from({ length: n - 10 }, (_, k) => 11 + k)];
    assert.deepEqual(numbers, want, `${n}`);
    assert.ok(state.done, `${n} done`);
    assert.equal(numbers.length, n === 20 ? 2 : 1 + (n - 10), `${n}: taps`);
  }
});

test('10 is done with one tap; 20 with two (each full frame counts ten)', () => {
  assert.deepEqual(play(10, [{ frame: 0 }]).numbers, [10]);
  assert.ok(play(10, [{ frame: 0 }]).state.done);
  const twenty = play(20, [{ frame: 0 }, { frame: 1 }]);
  assert.deepEqual(twenty.numbers, [10, 20]);
  assert.ok(twenty.state.done);
  // A thing in a full frame counts that frame.
  assert.deepEqual(play(20, [{ item: 14 }, { item: 2 }]).numbers, [10, 20]);
});

test('a tap on a thing in the full frame counts the frame, once', () => {
  const { numbers } = play(13, [{ item: 7 }, { item: 2 }, { frame: 0 }, { item: 10 }, { item: 11 }, { item: 12 }]);
  assert.deepEqual(numbers, [10, null, null, 11, 12, 13]);
});

test('an extra before the ten does not count, and the frame to tap is the first', () => {
  let state = startCountOn(16);
  assert.equal(nextFrame(state), 0);
  const early = tapTens(state, { item: 12 });
  assert.equal(early.number, null);
  assert.deepEqual(early.state, state, 'nothing changes');
  state = tapTens(state, { frame: 0 }).state;
  assert.equal(nextFrame(state), null);
  assert.equal(tapTens(state, { item: 12 }).number, 11, 'any extra, in any order, is the next number');
});

test('the extras in any order count on; each counts once; nothing past the last', () => {
  const { state, numbers } = play(14, [{ frame: 0 }, { item: 13 }, { item: 10 }, { item: 13 }, { item: 12 }, { item: 11 }, { item: 11 }]);
  assert.deepEqual(numbers, [10, 11, 12, null, 13, 14, null]);
  assert.deepEqual(state.order, [13, 10, 12, 11]);
  assert.ok(state.done);
  // Things that are not there, and empty places, never count.
  assert.deepEqual(play(12, [{ frame: 0 }, { item: 15 }, { item: -1 }, { frame: 1 }, { item: 'x' }]).numbers, [10, null, null, null, null]);
});

test('the counting note climbs gently: counting on to 20 stays as low as 9 did', () => {
  for (let k = 1; k <= 9; k++) assert.equal(countStep(k, 9), k, 'unchanged for 1 to 9');
  assert.equal(countStep(10, 17), 4);
  assert.equal(countStep(17, 17), 7.5);
  assert.ok(countStep(20, 20) <= 9);
  for (let k = 11; k <= 20; k++) assert.ok(countStep(k, 20) > countStep(k - 1, 20), 'each a little higher');
});

test('1 to 9 still count one by one', () => {
  let s = startCount(4);
  const got = [0, 1, 1, 2, 3].map((i) => { const r = tapCount(s, i); s = r.state; return r.number; });
  assert.deepEqual(got, [1, 2, null, 3, 4]);
});

// ---- her collection ----

test('a counted group of 17 is kept on her shelf of finds, drawn in ten-frames', () => {
  assert.deepEqual(cleanFinds([{ g: 'apple', n: 17, gold: false }]), [{ g: 'apple', n: 17, gold: false }]);
  const art = findArt({ g: 'apple', n: 17 });
  assert.ok(art.includes('class="frame"'));
  assert.equal(count(/class="cnt/g, art), 17);
});
