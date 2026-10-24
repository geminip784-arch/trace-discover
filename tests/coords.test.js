// Run: node --test tests/coords.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, toUnits } from '../src/render.js';

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

test('middle of the screen is halfway along the lines and between sky and ground', () => {
  const u = toUnits(640, 313, layout);
  close(u.x, (layout.lineEnd - layout.originX) / 2 / layout.unit);
  close(u.y, 0.65); // middle of 0 (sky) .. 1.3 (ground)
});

test('grass and ground lines map to y = 1 and y = 1.3', () => {
  close(toUnits(640, layout.top + layout.unit, layout).y, 1);
  close(toUnits(640, layout.top + 1.3 * layout.unit, layout).y, 1.3);
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
