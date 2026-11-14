// Run: node --test tests/chars.test.js
// Checks every recorded character file in data/chars/ (not the *.example.json files)
// and the manifest data/chars/index.json that lists them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { bookOf, BOARDS, charFile, fileChar } from '../src/session.js';

const dir = new URL('../data/chars/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.endsWith('.example.json') && f !== 'index.json');

const inRange = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

if (files.length === 0) {
  test('no recorded character files yet', () => {});
}

for (const file of files) {
  test(`data/chars/${file}`, () => {
    const char = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    assert.equal(char.id, fileChar(file.slice(0, -'.json'.length)), 'id matches the filename (lowercase: lower-<id>)');
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
    if (char.anyOrder !== undefined) checkAnyOrder(char.anyOrder, char.strokes.length);
    if (char.plans !== undefined) checkPlans(char.plans);
  });
}

// Optional "anyOrder": groups of stroke indexes (from 0) that may be drawn in any order.
// Each group has at least 2 different, valid indexes, and no stroke is in two groups.
export function checkAnyOrder(anyOrder, strokeCount) {
  assert.ok(Array.isArray(anyOrder), 'anyOrder is an array of groups');
  const seen = new Set();
  anyOrder.forEach((group, g) => {
    const where = `anyOrder group ${g + 1}`;
    assert.ok(Array.isArray(group) && group.length >= 2, `${where}: an array of at least 2 stroke indexes`);
    for (const i of group) {
      assert.ok(Number.isInteger(i) && i >= 0 && i < strokeCount, `${where}: ${i} is a stroke index from 0 to ${strokeCount - 1}`);
      assert.ok(!seen.has(i), `${where}: stroke index ${i} is used only once`);
      seen.add(i);
    }
  });
}

// Optional "plans" (Slice 5J): other allowed stroke plans, each { strokes } of
// line strokes, and dot strokes (the dot of i and j, Slice 9A).
export function checkPlans(plans) {
  assert.ok(Array.isArray(plans) && plans.length >= 1, 'plans is a list of at least one plan');
  plans.forEach((plan, p) => {
    assert.ok(Array.isArray(plan.strokes) && plan.strokes.length >= 1, `plan ${p + 2}: at least one stroke`);
    for (const s of plan.strokes) {
      assert.ok(s.kind === 'line' || s.kind === 'dot', `plan ${p + 2}: line or dot strokes`);
      if (s.kind === 'line') assert.ok(Array.isArray(s.points) && s.points.length >= 2, `plan ${p + 2}: a line needs at least 2 points`);
      else assert.equal(s.points.length, 1, `plan ${p + 2}: a dot has exactly 1 point`);
    }
  });
}

test('no character file uses anyOrder now: T in either order is two stroke plans (Slice 5J)', () => {
  for (const file of files) {
    const char = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    assert.equal(char.anyOrder, undefined, char.id);
  }
});

test('the anyOrder check rejects bad groups', () => {
  assert.doesNotThrow(() => checkAnyOrder([[0, 1]], 2));
  assert.doesNotThrow(() => checkAnyOrder([], 2));
  for (const bad of [{}, [0, 1], [[0]], [[0, 3]], [[0, 0]], [[0, 1], [1, 2]], [[0, 1.5]], [[-1, 0]]]) {
    assert.throws(() => checkAnyOrder(bad, 3), JSON.stringify(bad));
  }
});

// The manifest: the app reads it and never requests a file that is not in it.
test('data/chars/index.json lists exactly the recorded character files', () => {
  const manifest = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8'));
  assert.ok(Array.isArray(manifest), 'the manifest is a list of ids');
  assert.equal(new Set(manifest).size, manifest.length, 'no id is listed twice');
  const ids = files.map((f) => fileChar(f.slice(0, -'.json'.length)));
  for (const id of manifest) assert.ok(ids.includes(id), `${id} is in the manifest but data/chars/${charFile(id)}.json is missing`);
  for (const id of ids) assert.ok(manifest.includes(id), `data/chars/${charFile(id)}.json exists but ${id} is not in the manifest`);
  // Lowercase (Slice 9A) is in the manifest, so ?char=a and glyphs.html can load it,
  // but goes on the ABC board only in the second part of the slice.
  for (const id of manifest) assert.ok(bookOf(id) || /^[a-z]$/.test(id), `${id} is on one of the boards`);
});

// Character ids are plain ASCII, so file names never hold Urdu letters. An Urdu
// file stores its letter in "letter", and it must match the Urdu board.
test('character ids are ASCII; Urdu files carry the matching letter', () => {
  for (const file of files) {
    const char = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    assert.match(char.id, /^[A-Za-z0-9-]+$/, `${file}: the id is ASCII`);
    if (char.id.startsWith('ur-')) {
      const tile = BOARDS.urdu.tiles.find((t) => t.id === char.id);
      assert.ok(tile, `${file}: ${char.id} is an Urdu board id`);
      assert.equal(char.letter, tile.glyph, `${file}: "letter" is ${tile.glyph}`);
    }
  }
});
