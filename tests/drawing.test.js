// Run: node --test tests/drawing.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PICTURES, LEVEL_PICTURES, PAIRS, CRAYONS, pictureSVG, previewSVG, crayonSVG } from '../data/drawings.js';
import {
  LEVELS, DOT_REACH_PX, levelPictures, findPicture, pictureId, dotsFor, boxesFor, placeDots, reachUnits,
  startDots, nextDot, startsAtDot, stepDots, HINT_FIRST_MS, HINT_EVERY_MS, HINT_MAX, hintAt, startIdle, tickIdle,
  reachedIdle, levelOpen, UNLOCK_AFTER, rainbowColor, drawLogEntry, LEVEL1_DOTS, MAX_DOTS,
} from '../src/drawing.js';
import { boardFit, BOARD } from '../src/games.js';

const SCREENS = [[1280, 626], [1280, 800], [640, 626]];

// ---- the pictures ----

test('six pictures at levels 1 and 2; four pairs at level 3; the building only there', () => {
  assert.deepEqual(LEVEL_PICTURES, ['house', 'sun', 'fish', 'car', 'cat', 'tree']);
  assert.deepEqual(PAIRS, [['car', 'building'], ['house', 'tree'], ['fish', 'sun'], ['cat', 'house']]);
  assert.equal(levelPictures(1).length, 6);
  assert.equal(levelPictures(2).length, 6);
  assert.deepEqual(levelPictures(3).map((p) => p.id), ['car-building', 'house-tree', 'fish-sun', 'cat-house']);
  assert.equal(PICTURES.building.dots[1], undefined);
  assert.equal(findPicture(3, 'fish-sun').things.join(), 'fish,sun');
  assert.equal(findPicture(1, 'building'), null);
  assert.equal(pictureId(2, 'cat'), 'L2:cat');
});

test('every picture has the right number of dots for its level', () => {
  for (const id of LEVEL_PICTURES) {
    const n1 = dotsFor(id, 1).length;
    assert.ok(n1 >= LEVEL1_DOTS[0] && n1 <= LEVEL1_DOTS[1], `${id} level 1: ${n1} dots`);
    assert.ok(dotsFor(id, 2).length <= MAX_DOTS, `${id} level 2`);
    assert.ok(dotsFor(id, 2).length >= n1, `${id}: level 2 has no fewer dots than level 1`);
  }
  for (const p of levelPictures(3)) {
    for (const t of p.things) assert.ok(dotsFor(t, 3).length <= MAX_DOTS && dotsFor(t, 3) === PICTURES[t].dots[2], `${p.id} ${t}`);
  }
});

test('the house: 7 dots in the order asked, then back to dot 1', () => {
  const [bl, lw, lr, peak, rr, rw, br] = dotsFor('house', 1);
  assert.equal(dotsFor('house', 1).length, 7);
  assert.ok(bl[1] > lw[1] && bl[0] === lw[0], '1 bottom left, 2 straight above it: the top of the left wall');
  assert.ok(lr[0] < lw[0] && lr[1] === lw[1], '3 the left roof edge, out past the wall');
  assert.ok(peak[1] < lr[1] && peak[0] === 50, '4 the roof peak');
  assert.ok(rr[0] > rw[0] && rr[1] === rw[1], '5 the right roof edge, 6 the top of the right wall');
  assert.ok(br[0] === rw[0] && br[1] === bl[1], '7 bottom right, level with dot 1');
});

test('every dot sits inside the board and inside its picture box', () => {
  for (const level of LEVELS) {
    for (const p of levelPictures(level)) {
      p.things.forEach((t, k) => {
        const box = boxesFor(p.things)[k];
        for (const [x, y] of placeDots(dotsFor(t, level), box)) {
          assert.ok(x >= box.x && x <= box.x + box.size && y >= box.y && y <= box.y + box.size);
          assert.ok(x >= 0 && x <= BOARD.w && y >= 0 && y <= BOARD.h);
        }
      });
    }
  }
});

test('two dots in a row are always farther apart than the reach (so a touch never reaches the next dot by itself)', () => {
  for (const [w, h] of SCREENS.slice(0, 2)) {
    const { s } = boardFit(w, h);
    for (const level of LEVELS) {
      for (const p of levelPictures(level)) {
        p.things.forEach((t, k) => {
          const dots = placeDots(dotsFor(t, level), boxesFor(p.things)[k]);
          dots.forEach((a, i) => {
            const b = dots[(i + 1) % dots.length];
            assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) * s > DOT_REACH_PX + 4, `L${level} ${t} dots ${i + 1} and ${(i + 1) % dots.length + 1}`);
          });
        });
      }
    }
  }
});

test('every picture has its colored version, a preview and nothing from the network', () => {
  for (const id of Object.keys(PICTURES)) {
    for (const s of [pictureSVG(id), previewSVG(id, 1), previewSVG(id, 2)]) {
      assert.ok(s.startsWith('<svg') && s.endsWith('</svg>'));
      assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(s));
    }
  }
  assert.deepEqual(CRAYONS.map((c) => c.id), ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'rainbow']);
  assert.ok(CRAYONS.every((c) => crayonSVG(c).startsWith('<svg')));
});

// ---- reaching dots ----

const square = [[100, 100], [400, 100], [400, 400], [100, 400]];

test('reaching a dot: within 40 px of the next dot, and no farther', () => {
  assert.equal(DOT_REACH_PX, 40);
  for (const [w, h] of SCREENS) {
    const { s } = boardFit(w, h);
    const reach = reachUnits(s);
    const state = startDots(4);
    const at = (px) => [400 - px / s, 100]; // px short of dot 2, on her screen
    assert.equal(stepDots(state, at(0), square, reach).reached, 1);
    assert.equal(stepDots(state, at(39), square, reach).reached, 1, `39 px at ${w}x${h}`);
    assert.equal(stepDots(state, at(40), square, reach).reached, 1, `40 px at ${w}x${h}`);
    assert.equal(stepDots(state, at(41), square, reach).reached, null, `41 px at ${w}x${h}`);
  }
});

test('a line starts only at the dot she has reached', () => {
  const reach = 40;
  let state = startDots(4);
  assert.equal(startsAtDot([110, 95], square, state, reach), true);
  assert.equal(startsAtDot([400, 100], square, state, reach), false);
  state = stepDots(state, [400, 100], square, reach).state;
  assert.equal(startsAtDot([395, 110], square, state, reach), true);
  assert.equal(startsAtDot([100, 100], square, state, reach), false);
});

test('dot order: only the next dot counts; a later dot is never reached first', () => {
  const reach = 40;
  let state = startDots(4);
  assert.equal(nextDot(state), 1);
  // Straight to dot 3 (skipping dot 2): nothing.
  let r = stepDots(state, [400, 400], square, reach);
  assert.equal(r.reached, null);
  assert.equal(r.state.at, 0);
  // Several dots without lifting: 2, then 3.
  r = stepDots(state, [400, 100], square, reach);
  assert.equal(r.reached, 1);
  r = stepDots(r.state, [400, 400], square, reach);
  assert.equal(r.reached, 2);
  state = r.state;
  assert.equal(state.segments, 2);
  assert.equal(nextDot(state), 3);
});

test('closed shapes: after the last dot, the line joins back to dot 1, and that ends it', () => {
  const reach = 40;
  let state = startDots(4);
  const path = [[400, 100], [400, 400], [100, 400]];
  for (const p of path) state = stepDots(state, p, square, reach).state;
  assert.equal(state.done, false);
  assert.equal(nextDot(state), 0, 'the last line goes back to dot 1');
  const r = stepDots(state, [100, 100], square, reach);
  assert.equal(r.reached, 0);
  assert.equal(r.done, true);
  assert.equal(r.state.segments, 4);
  assert.equal(stepDots(r.state, [400, 100], square, reach).reached, null, 'nothing after the end');
  assert.equal(startsAtDot([100, 100], square, r.state, reach), false);
});

// ---- Jugnu's hint ----

test('Jugnu: at 8 s without progress, then every 15 s, at most 3 times for one dot', () => {
  assert.equal(HINT_FIRST_MS, 8000);
  assert.equal(HINT_EVERY_MS, 15000);
  assert.equal(HINT_MAX, 3);
  assert.deepEqual([0, 1, 2, 3].map(hintAt), [8000, 23000, 38000, Infinity]);
  // Tick in 250 ms steps, as the screen does, and note when he flies.
  let idle = startIdle();
  const flights = [];
  for (let t = 250; t <= 60000; t += 250) {
    const r = tickIdle(idle, 250);
    idle = r.idle;
    if (r.hint) flights.push(t);
  }
  assert.deepEqual(flights, [8000, 23000, 38000]);
});

test('Jugnu: reaching a dot starts the count again', () => {
  let idle = startIdle();
  idle = tickIdle(idle, 7900).idle;
  idle = reachedIdle();
  assert.equal(tickIdle(idle, 7900).hint, false, 'not 8 s since she reached a dot');
  let r = tickIdle(idle, 8000);
  assert.equal(r.hint, true);
  // After 3 hints, a new dot gives 3 more.
  idle = r.idle;
  idle = tickIdle(idle, 15000).idle;
  idle = tickIdle(idle, 15000).idle;
  assert.equal(idle.given, 3);
  assert.equal(tickIdle(idle, 60000).hint, false);
  r = tickIdle(reachedIdle(), 8000);
  assert.equal(r.hint, true);
});

// ---- levels ----

test('level 2 opens after 3 level 1 pictures; level 3 after 3 level 2 pictures', () => {
  assert.equal(UNLOCK_AFTER, 3);
  assert.equal(levelOpen(1, []), true);
  assert.equal(levelOpen(2, ['L1:house', 'L1:sun']), false);
  assert.equal(levelOpen(2, ['L1:house', 'L1:sun', 'L1:cat']), true);
  assert.equal(levelOpen(3, ['L1:house', 'L1:sun', 'L1:cat', 'L2:fish', 'L2:car']), false);
  assert.equal(levelOpen(3, ['L1:house', 'L1:sun', 'L1:cat', 'L2:fish', 'L2:car', 'L2:tree']), true);
  // Level 3 needs level 2 open as well.
  assert.equal(levelOpen(3, ['L2:fish', 'L2:car', 'L2:tree']), false);
  // Stars of level 3 do not count for level 2.
  assert.equal(levelOpen(2, ['L3:car-building', 'L3:fish-sun', 'L3:cat-house']), false);
});

// ---- crayons and the log ----

test('the rainbow crayon changes color as the line grows', () => {
  assert.notEqual(rainbowColor(0), rainbowColor(100));
  assert.equal(rainbowColor(0), rainbowColor(600));
  assert.match(rainbowColor(250), /^hsl\(\d+, 90%, 58%\)$/);
});

test('a draw log entry: picture, level, the dot reached, ms, and whether Jugnu helped', () => {
  const now = new Date('2026-11-05T10:00:00Z');
  assert.deepEqual(drawLogEntry({ picture: 'house', thing: 'house', level: 1, dot: 3, ms: 2450.4, helped: false, now }),
    { type: 'draw', time: '2026-11-05T10:00:00.000Z', picture: 'house', thing: 'house', level: 1, dot: 3, ms: 2450, helped: false });
  assert.equal(drawLogEntry({ picture: 'car-building', thing: 'building', level: 3, dot: 1, ms: 9, helped: true, now }).helped, true);
});

test('the navigation opens exactly the Drawing book\'s pictures', async () => {
  const { navigate } = await import('../src/session.js');
  const drawing = { screen: 'drawing' };
  for (const level of LEVELS) {
    for (const p of levelPictures(level)) {
      assert.deepEqual(navigate(drawing, { type: 'openPicture', level, picture: p.id }), { screen: 'dots', level, picture: p.id });
    }
  }
  assert.equal(navigate(drawing, { type: 'openPicture', level: 2, picture: 'cat-house' }), drawing);
});
