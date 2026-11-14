// Run: node --test tests/stroke-order.test.js
// data/stroke-order.js: a default stroke list for every capital and digit,
// matching the characters already recorded in data/chars/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STROKE_ORDER, FAMILIES } from '../data/stroke-order.js';
import { CHAR_IDS } from '../src/recording.js';
import { charFile } from '../src/session.js';

const dir = new URL('../data/chars/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8'));

test('every A to Z and 0 to 9 has a stroke list', () => {
  for (const id of CHAR_IDS) assert.ok(STROKE_ORDER[id], id);
  assert.equal(Object.keys(STROKE_ORDER).length, 62); // A to Z, 0 to 9, a to z (Slice 9A)
});

test('each entry has a family, a width and strokes with words and a rough path', () => {
  for (const [id, c] of Object.entries(STROKE_ORDER)) {
    assert.ok(FAMILIES.includes(c.family), `${id} family ${c.family}`);
    assert.ok(c.width > 0 && c.width <= 1.2, `${id} width`);
    assert.ok(c.strokes.length >= 1, id);
    for (const [k, s] of c.strokes.entries()) {
      assert.equal(typeof s.say, 'string', `${id} stroke ${k + 1}`);
      assert.ok(s.say.length > 0);
      // A dot (i, j) has a one-point path.
      assert.ok(s.path.length >= 2 || (/^[ij]$/.test(id) && s.path.length === 1), `${id} stroke ${k + 1} path`);
      for (const [x, y] of s.path) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y), `${id} stroke ${k + 1}`);
        assert.ok(x >= -0.05 && x <= c.width + 0.05, `${id} stroke ${k + 1} x ${x}`);
        assert.ok(y >= -0.05 && y <= 1.55, `${id} stroke ${k + 1} y ${y}`); // 1.5: the tail line
      }
    }
  }
});

test('the characters already recorded match the guide: stroke count and family', () => {
  for (const id of manifest) {
    const c = JSON.parse(readFileSync(new URL(`${charFile(id)}.json`, dir), 'utf8'));
    assert.equal(c.strokes.length, STROKE_ORDER[id].strokes.length, `${id} strokes`);
    assert.equal(c.family, STROKE_ORDER[id].family, `${id} family`);
  }
});

test('each recorded stroke starts near where the guide says it starts', () => {
  for (const id of manifest) {
    const c = JSON.parse(readFileSync(new URL(`${charFile(id)}.json`, dir), 'utf8'));
    c.strokes.forEach((s, k) => {
      const [gx, gy] = STROKE_ORDER[id].strokes[k].path[0];
      const [rx, ry] = s.points[0];
      assert.ok(Math.hypot(gx - rx, gy - ry) < 0.1, `${id} stroke ${k + 1}`);
    });
  }
});
