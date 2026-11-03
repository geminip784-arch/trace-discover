// Run: node --test tests/track.test.js
// The track she sees is drawn at fixed sizes (docs/mockups/mockup4.html, 340 px
// letters). The scoring tolerance stays invisible: no drawn width may follow it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS } from '../src/geometry.js';
import { TRACK_LOOKS, DONE_LOOK, INK, trackLook, trackWidths, startMarkers, outerRadius, MARKERS, START_DOT_RADIUS } from '../src/render.js';

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

// ---------------------------------------------------------------------------
// Start markers

// Every set of finished strokes (more than she can ever reach, so stricter).
function* doneStates(n) {
  for (let mask = 0; mask < (1 << n) - 1; mask++) yield Array.from({ length: n }, (_, i) => (mask & (1 << i)) !== 0);
}

test('start markers never overlap on the real E, F, H, T and 4', () => {
  for (const id of ['E', 'F', 'H', 'T', '4']) {
    const char = load(id);
    for (const stage of [1, 2, 3]) {
      for (const done of doneStates(char.strokes.length)) {
        const ms = startMarkers(char, done, stage);
        for (let a = 0; a < ms.length; a++) {
          for (let b = a + 1; b < ms.length; b++) {
            const d = Math.hypot(ms[a].at[0] - ms[b].at[0], ms[a].at[1] - ms[b].at[1]);
            const need = outerRadius(ms[a]) + outerRadius(ms[b]);
            assert.ok(d >= need, `${id} stage ${stage} done ${done}: ${ms[a].kind} ${ms[a].stroke + 1} and ${ms[b].kind} ${ms[b].stroke + 1} overlap (${d.toFixed(3)} < ${need.toFixed(3)})`);
          }
        }
      }
    }
  }
});

test('only the next stroke gets the big numbered dot; the others a small number along their path', () => {
  for (const id of ['E', 'F', 'H', 'T', '4']) {
    const char = load(id);
    for (const done of doneStates(char.strokes.length)) {
      const next = done.indexOf(false);
      const ms = startMarkers(char, done, 1);
      const big = ms.filter((m) => m.kind === 'big');
      assert.equal(big.length, 1);
      assert.equal(big[0].stroke, next);
      assert.equal(big[0].label, next + 1);
      assert.equal(big[0].r, START_DOT_RADIUS);
      const small = ms.filter((m) => m.kind === 'small');
      assert.deepEqual(small.map((m) => m.stroke), done.map((d, i) => i).filter((i) => !done[i] && i !== next));
      for (const m of small) {
        assert.ok(m.f >= MARKERS.small.at - 1e-9 && m.f <= 0.5, `${id}: small ${m.stroke + 1} sits ${m.f} along`);
        const start = char.strokes[m.stroke].points[0];
        assert.ok(Math.hypot(m.at[0] - start[0], m.at[1] - start[1]) > 0.05, 'never at its own start');
      }
    }
  }
});

test('round 2: only the next start dot, no number; round 3: one small dot before the first stroke only', () => {
  const F = load('F');
  const r2 = startMarkers(F, [true, false, false], 2);
  assert.equal(r2.length, 1);
  assert.equal(r2[0].stroke, 1);
  assert.equal(r2[0].label, undefined);
  const r3 = startMarkers(F, [false, false, false], 3);
  assert.equal(r3.length, 1);
  assert.ok(r3[0].r < r2[0].r);
  assert.equal(r3[0].label, undefined);
  assert.deepEqual(startMarkers(F, [true, false, false], 3), []);
});
