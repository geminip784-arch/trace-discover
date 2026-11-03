// Run: node --test tests/resize.test.js
// Her ink, finished strokes and the guide stay lined up through any change of
// screen size: rotation, the browser bar showing or hiding, split screen.
// The game keeps every point she draws in letter units (pxToLetter) and redraws
// them with inkTransform after a resize; the guide is drawn with letterToPx.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  computeLayout, letterOffset, letterToPx, pxToLetter, inkTransform, remapPx, isUpright,
} from '../src/render.js';

const L = JSON.parse(readFileSync(new URL('../data/chars/L.json', import.meta.url)));
const DPR = 1.5;

// Her tablet in Chrome (Slice 0), the bar hidden, half a split screen, and upright.
const SIZES = {
  chrome: [1280, 626],
  barHidden: [1280, 800],
  split: [640, 626],
  upright: [800, 1106],
};
const at = ([w, h]) => {
  const layout = computeLayout(w, h);
  return { layout, offset: letterOffset(layout, L.width) };
};

// Where the canvas puts a stored point, in CSS px: the ink's own transform.
function inkPx(t, [x, y]) {
  const [a, , , d, e, f] = inkTransform(t.layout, t.offset, DPR);
  return [(a * x + e) / DPR, (d * y + f) / DPR];
}

// She traces stroke k exactly along the guide at size `from`: the touches arrive
// in area px, and the game stores them in letter units.
function trace(from, k) {
  const toPx = letterToPx(from.layout, from.offset);
  return L.strokes[k].points.map((p) => {
    const [x, y] = toPx(p);
    return pxToLetter({ x, y }, from.layout, from.offset);
  });
}

// The largest distance, in CSS px, between her redrawn ink and the guide's track.
function worstGap(stored, k, t) {
  const toPx = letterToPx(t.layout, t.offset);
  return Math.max(...stored.map((q, i) => {
    const [ix, iy] = inkPx(t, q);
    const [gx, gy] = toPx(L.strokes[k].points[i]);
    return Math.hypot(ix - gx, iy - gy);
  }));
}

for (const [name, size] of Object.entries(SIZES)) {
  if (name === 'chrome') continue;
  test(`a stroke drawn in Chrome still sits on the guide after the size changes (${name})`, () => {
    const before = at(SIZES.chrome);
    const stored = trace(before, 0);
    assert.ok(worstGap(stored, 0, before) < 1e-6, 'on the guide before the change');
    const after = at(size);
    // The letter really moved on the screen, so a px-based ink would be off.
    const [bx] = letterToPx(before.layout, before.offset)(L.strokes[0].points[0]);
    const [ax] = letterToPx(after.layout, after.offset)(L.strokes[0].points[0]);
    assert.ok(Math.abs(ax - bx) > 10, 'the letter moved');
    assert.ok(worstGap(stored, 0, after) < 1e-6, `redrawn on the guide: ${worstGap(stored, 0, after)} px off`);
  });
}

test('rotation there and back: every stroke is still on the guide, in the same place as before', () => {
  const chrome = at(SIZES.chrome);
  const stored = L.strokes.map((_, k) => trace(chrome, k));
  for (const size of [SIZES.upright, SIZES.chrome, SIZES.barHidden, SIZES.chrome]) {
    const t = at(size);
    stored.forEach((s, k) => assert.ok(worstGap(s, k, t) < 1e-6));
  }
  stored.forEach((s, k) => s.forEach((q, i) => {
    assert.ok(Math.abs(q[0] - L.strokes[k].points[i][0]) < 1e-9);
    assert.ok(Math.abs(q[1] - L.strokes[k].points[i][1]) < 1e-9);
  }));
});

test('the same spot on the letter gives the same letter units at every size', () => {
  const p = L.strokes[0].points[3];
  for (const size of Object.values(SIZES)) {
    const t = at(size);
    const [x, y] = letterToPx(t.layout, t.offset)(p);
    const q = pxToLetter({ x, y }, t.layout, t.offset);
    assert.ok(Math.abs(q[0] - p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9);
  }
});

test('effects already on screen move with the letter (remapPx)', () => {
  const from = at(SIZES.chrome);
  const to = at(SIZES.upright);
  const { k, dx, dy } = remapPx(from.layout, from.offset, to.layout, to.offset);
  for (const p of L.strokes[1].points) {
    const [ox, oy] = letterToPx(from.layout, from.offset)(p);
    const [nx, ny] = letterToPx(to.layout, to.offset)(p);
    assert.ok(Math.hypot(k * ox + dx - nx, k * oy + dy - ny) < 1e-6);
  }
});

test('upright means taller than wide', () => {
  assert.equal(isUpright(800, 1106), true);
  assert.equal(isUpright(1280, 626), false);
  assert.equal(isUpright(1280, 800), false);
  assert.equal(isUpright(640, 626), false); // half a split screen is still landscape
  assert.equal(isUpright(700, 700), false);
});
