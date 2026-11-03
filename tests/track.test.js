// Run: node --test tests/track.test.js
// The track she sees is drawn at fixed sizes (docs/mockups/mockup4.html, 340 px
// letters). The scoring tolerance stays invisible: no drawn width may follow it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS } from '../src/geometry.js';
import { TRACK_LOOKS, DONE_LOOK, INK, trackLook, trackWidths } from '../src/render.js';

const MOCKUP_U = 340; // mockup4's letter height in px
const CHARS = JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url)));
const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${id}.json`, import.meta.url)));
const close = (a, b, tol = 0.006) => Math.abs(a - b) <= tol;

test('the track widths are mockup4 sizes in line units', () => {
  assert.equal(TRACK_LOOKS[1].band, 0.18);
  assert.ok(TRACK_LOOKS[1].dots, 'round 1 has a dotted centre line');
  assert.equal(TRACK_LOOKS[2].band, 0.09);
  assert.equal(TRACK_LOOKS[2].dots, undefined);
  assert.equal(TRACK_LOOKS[3].band, 0.065);
  assert.equal(TRACK_LOOKS[3].opacity, 0.05);
  assert.equal(DONE_LOOK.core, 0.08);
  assert.equal(DONE_LOOK.halo, 0.19);
  // The same sizes as the mockup's pixels at 340 px per unit.
  assert.ok(close(TRACK_LOOKS[1].band, 60 / MOCKUP_U));
  assert.ok(close(TRACK_LOOKS[2].band, 30 / MOCKUP_U));
  assert.ok(close(TRACK_LOOKS[3].band, 22 / MOCKUP_U));
  assert.ok(close(DONE_LOOK.core, 28 / MOCKUP_U));
  assert.ok(close(DONE_LOOK.halo, 64 / MOCKUP_U));
});

test('no drawn width is tied to the scoring tolerance', () => {
  for (const stage of [1, 2, 3]) {
    const { tolerance } = DEFAULTS.stages[stage];
    for (const w of trackWidths(stage)) {
      assert.notEqual(w, tolerance, `stage ${stage}: a width equals the tolerance`);
      assert.notEqual(w, 2 * tolerance, `stage ${stage}: a width equals twice the tolerance`);
    }
  }
  // Changing the tolerance changes nothing that is drawn.
  const saved = structuredClone(DEFAULTS.stages);
  const before = [1, 2, 3].map(trackWidths);
  try {
    for (const s of [1, 2, 3]) DEFAULTS.stages[s].tolerance = 0.5;
    assert.deepEqual([1, 2, 3].map(trackWidths), before);
  } finally {
    for (const s of [1, 2, 3]) DEFAULTS.stages[s] = saved[s];
  }
  // And the drawing code never reads it: not in render.js, not in game.js.
  const code = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const f of ['render.js', 'game.js']) {
    assert.doesNotMatch(code(f), /tolerance/, `${f} must not use the tolerance`);
  }
});

test('the ink is a strong blue and never red', () => {
  assert.equal(INK.core.color, '#1D2B8F');
  for (const layer of INK.glow) assert.equal(layer.color, '#4D6BFF');
});

test('no track runs past the sky or grass line by more than half its band', () => {
  for (const id of CHARS) {
    const char = load(id);
    for (const stage of [1, 2, 3]) {
      const looks = [trackLook(stage).band, DONE_LOOK.halo];
      for (const width of looks) {
        for (const stroke of char.strokes) {
          // Round line ends stick out by half the width beyond the points.
          const ys = stroke.points.map((p) => p[1]);
          const above = -(Math.min(...ys) - width / 2);
          const below = Math.max(...ys) + width / 2 - 1;
          assert.ok(above <= width / 2 + 1e-9, `${id} stage ${stage}: past the sky line`);
          assert.ok(below <= width / 2 + 1e-9, `${id} stage ${stage}: past the grass line`);
        }
      }
    }
  }
});
