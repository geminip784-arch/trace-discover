// Run: node --test tests/chars.test.js
// Checks every recorded character file in data/chars/ (not the *.example.json files).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../data/chars/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.endsWith('.example.json'));

const inRange = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

if (files.length === 0) {
  test('no recorded character files yet', () => {});
}

for (const file of files) {
  test(`data/chars/${file}`, () => {
    const char = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    assert.equal(char.id, file.slice(0, -'.json'.length), 'id matches the filename');
    assert.ok(Array.isArray(char.strokes) && char.strokes.length >= 1, 'at least one stroke');
    char.strokes.forEach((stroke, i) => {
      const where = `stroke ${i + 1}`;
      assert.ok(Array.isArray(stroke.points), `${where}: has points`);
      if (stroke.kind === 'line') assert.ok(stroke.points.length >= 2, `${where}: a line needs at least 2 points`);
      else if (stroke.kind === 'dot') assert.equal(stroke.points.length, 1, `${where}: a dot has exactly 1 point`);
      else assert.fail(`${where}: kind must be line or dot, got ${stroke.kind}`);
      for (const p of stroke.points) {
        assert.ok(Array.isArray(p) && p.length === 2, `${where}: each point is [x, y]`);
        assert.ok(inRange(p[0], -0.2, 2), `${where}: x ${p[0]} is between -0.2 and 2`);
        assert.ok(inRange(p[1], -0.6, 1.6), `${where}: y ${p[1]} is between -0.6 and 1.6`);
      }
    });
  });
}
