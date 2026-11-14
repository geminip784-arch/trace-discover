// Run: node --test tests/coords.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeLayout, toUnits } from '../src/render.js';
import { perchFor, PERCH } from '../src/jugnu.js';

// The tablet in Chrome, landscape (measured in Slice 0).
const layout = computeLayout(1280, 626);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('left edge: the start of the lines is x = 0, the sky line is y = 0', () => {
  const u = toUnits(layout.originX, layout.top, layout);
  close(u.x, 0);
  close(u.y, 0);
});

test('left edge of the screen is a little left of x = 0', () => {
  const u = toUnits(0, layout.top, layout);
  close(u.x, -layout.originX / layout.unit);
  assert.ok(u.x < 0);
});

test('middle of the screen is halfway along the lines and between sky and tail line', () => {
  const u = toUnits(640, 313, layout);
  close(u.x, (layout.lineEnd - layout.originX) / 2 / layout.unit);
  close(u.y, 0.75); // middle of 0 (sky) .. 1.5 (tail line)
});

test('grass and tail lines map to y = 1 and y = 1.5', () => {
  close(toUnits(640, layout.top + layout.unit, layout).y, 1);
  close(toUnits(640, layout.top + 1.5 * layout.unit, layout).y, 1.5);
});

// Slice 9A: the fourth line moved from 1.3 (ground) to 1.5 (tail line). The
// unit did not change, so capitals and digits keep their size; the four lines
// are centred, and all of them fit inside the writing board with room to spare.
test('the four lines at 1280 x 626: sky 55 px, fence 227, grass 399, tail line 571', () => {
  close(layout.unit, 0.55 * 626);
  const y = (u) => layout.top + u * layout.unit;
  assert.deepEqual([0, 0.5, 1, 1.5].map((u) => Math.round(y(u))), [55, 227, 399, 571]);
  // The parent note ends about 52 px down; the board's frame is 20 px from the bottom edge.
  assert.ok(y(0) > 52, 'the sky line is below the parent note');
  assert.ok(626 - 20 - y(1.5) >= 30, 'the tail line clears the bottom of the board');
});

test('full screen (1280 x 800, the installed app): the lines still fit, 70 px from each edge', () => {
  const full = computeLayout(1280, 800);
  close(full.top, (800 - 1.5 * full.unit) / 2);
  assert.equal(Math.round(full.top), 70);
});

test('right edge: the end of the lines and the edge of the screen', () => {
  const end = toUnits(layout.lineEnd, layout.top, layout);
  close(end.x, (layout.lineEnd - layout.originX) / layout.unit);
  const edge = toUnits(1280, layout.top, layout);
  close(edge.x, (1280 - layout.originX) / layout.unit);
  assert.ok(edge.x > end.x);
});

// Touches arrive in CSS px, so devicePixelRatio never enters toUnits. The same spot on
// the glass gives the same units whether the screen has 1 or 1.5 physical px per CSS px.
for (const dpr of [1, 1.5]) {
  test(`devicePixelRatio ${dpr}: the same spot on the screen gives the same units`, () => {
    const physical = { x: 900 * dpr, y: 400 * dpr };
    const u = toUnits(physical.x / dpr, physical.y / dpr, layout);
    close(u.x, (900 - layout.originX) / layout.unit);
    close(u.y, (400 - layout.top) / layout.unit);
  });
}

// Slice 9A: with the sky line at 55 px, the round lights (top right) sit above
// it: 6 px down and 44 px tall in index.html.
test('the round lights end above the sky line, in Chrome and full screen', () => {
  const css = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const top = Number(css.match(/#rounds \{[^}]*top: (\d+)px/)[1]);
  const size = Number(css.match(/#rounds \.rl \{[^}]*height: (\d+)px/)[1]);
  for (const h of [626, 800]) assert.ok(top + size < computeLayout(1280, h).top - 2, `at height ${h}`);
});

// Jugnu perches above and left of a start dot, but below and left of one on
// the sky line, so he never goes off the top of the screen.
test('Jugnu stays on screen when he perches at a start dot on the sky line', () => {
  for (const h of [626, 800]) {
    const l = computeLayout(1280, h);
    for (const dot of [[0.08, 0], [0.4, 0.2], [0.08, 0.5], [0.33, 1.5]]) {
      const [, y] = perchFor(dot);
      // The top of Jugnu's picture: 82/120 of his 0.32-unit size above his tail.
      const topPx = l.top + (y - 0.32 * (82 / 120)) * l.unit;
      assert.ok(topPx >= 0, `dot ${dot} at height ${h}: top ${topPx.toFixed(1)}`);
    }
  }
  assert.deepEqual(perchFor([0.5, 0.5]), [0.5 + PERCH[0], 0.5 + PERCH[1]]); // the usual perch is unchanged
});
