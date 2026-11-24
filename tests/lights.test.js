// Slice 10D: the round lights (top right) never cover a letter's model ink:
// the Urdu marks above ک, گ and آ included. Every character, on both screens
// (Chrome 1280 x 626 and the installed app 1280 x 800), in tracing (its track
// and Jugnu's flight, with the widest glow round them, and an Urdu mark's
// target ring), in the copy-it round (the helper ghost and the model card) and
// on an Urdu practice page (each space). Her own ink can go anywhere she writes
// it; this checks what the app draws. (English practice pages, from before
// Slice 10: docs/ideas.md.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  writingLayout, letterToPx, roundLightsBox, ROUND_LIGHTS, INK, CARD, trackLook, DONE_LOOK, MARK_RING,
} from '../src/render.js';
import { markCentre, markReach } from '../src/variants.js';
import { practiceLayout } from '../src/practice.js';
import { charFile } from '../src/session.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const MANIFEST = JSON.parse(read('data/chars/index.json'));
const load = (id) => JSON.parse(read(`data/chars/${charFile(id)}.json`));
const SCREENS = [[1280, 626], [1280, 800]];
const URDU_MARKED = ['ur-kaf', 'ur-gaf', 'ur-alif-madd'];

// The widest thing drawn along a model stroke, in line units: her glow, the
// stage 1 track's band, the gold halo of a finished stroke.
const SPREAD = Math.max(...INK.glow.map((g) => g.width), INK.core.width, trackLook(1).band, DONE_LOOK.halo) / 2;

const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

// The boxes (px) of everything drawn for a character placed with `toPx` at
// `unit` px per line unit: each stroke grown by SPREAD, and (Slice 10D) each
// Urdu mark's dashed target ring at its widest (stage 1).
function inkBoxes(char, toPx, unit) {
  const pad = SPREAD * unit;
  const boxes = char.strokes.map((s) => {
    const pts = s.points.map(toPx);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return { id: s.part ?? s.kind, x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad };
  });
  for (const s of char.strokes.filter((st) => st.kind === 'mark')) {
    const [cx, cy] = toPx(markCentre(s.points));
    const r = (markReach(1) + MARK_RING.width) * unit;
    boxes.push({ id: `${s.part} ring`, x0: cx - r, x1: cx + r, y0: cy - r, y1: cy + r });
  }
  return boxes;
}
const clashes = (char, toPx, unit, lights) => inkBoxes(char, toPx, unit).filter((b) => overlaps(b, lights)).map((b) => b.id);

test('the round lights in index.html are where src/render.js says', () => {
  const css = read('index.html');
  const rounds = css.match(/#rounds \{[^}]*\}/)[0];
  assert.match(rounds, new RegExp(`top: ${ROUND_LIGHTS.top}px`));
  assert.match(rounds, new RegExp(`right: ${ROUND_LIGHTS.right}px`));
  assert.match(rounds, new RegExp(`gap: ${ROUND_LIGHTS.gap}px`));
  const rl = css.match(/#rounds \.rl \{[^}]*\}/)[0];
  assert.match(rl, new RegExp(`width: ${ROUND_LIGHTS.size}px`));
  assert.match(rl, new RegExp(`height: ${ROUND_LIGHTS.size}px`));
  assert.match(rl, new RegExp(`box-shadow: 0 ${ROUND_LIGHTS.shadow}px 0`));
  // Three at most: the practice page's three fireflies.
  assert.deepEqual(roundLightsBox(1280), { x0: 1100, x1: 1252, y0: 6, y1: 54 });
});

for (const [w, h] of SCREENS) {
  const lights = roundLightsBox(w);

  test(`${w} x ${h}: tracing, no letter's track, glow or mark ring reaches the round lights`, () => {
    for (const id of MANIFEST) {
      const char = load(id);
      const { layout, offset } = writingLayout(w, h, char);
      assert.deepEqual(clashes(char, letterToPx(layout, offset), layout.unit, lights), [], id);
    }
  });

  test(`${w} x ${h}: the copy-it round, neither the helper ghost nor the model card reaches the round lights`, () => {
    for (const id of MANIFEST) {
      const char = load(id);
      const { layout, offset, card } = writingLayout(w, h, char, true);
      assert.deepEqual(clashes(char, letterToPx(layout, offset), layout.unit, lights), [], `${id} ghost`);
      assert.ok(!overlaps({ x0: card.x, x1: card.x + card.w, y0: card.y, y1: card.y + card.h }, lights), `${id} card`);
    }
  });

  test(`${w} x ${h}: an Urdu practice page (spaces right to left), no space's letter or mark ring reaches the fireflies`, () => {
    for (const id of MANIFEST.filter((i) => i.startsWith('ur-'))) {
      const char = load(id);
      const layout = practiceLayout(w, h, char.width, undefined, { rtl: true });
      for (let k = 0; k < layout.spaces.length; k++) {
        assert.deepEqual(clashes(char, letterToPx(layout, layout.offset + k * layout.step), layout.unit, lights), [], `${id} space ${k + 1}`);
      }
      // The spaces themselves end left of the fireflies.
      assert.ok(Math.max(...layout.spaces.map((sp) => sp.x1)) <= lights.x0, id);
    }
  });

  test(`${w} x ${h}: the marks above ک, گ and آ (their ring included) are never under the round lights, on any screen`, () => {
    for (const id of URDU_MARKED) {
      const char = load(id);
      for (const copy of [false, true]) {
        const { layout, offset } = writingLayout(w, h, char, copy);
        assert.deepEqual(clashes(char, letterToPx(layout, offset), layout.unit, lights), [], `${id} ${copy ? 'copy' : 'tracing'}`);
      }
      const page = practiceLayout(w, h, char.width, undefined, { rtl: true });
      for (let k = 0; k < 3; k++) assert.deepEqual(clashes(char, letterToPx(page, page.offset + k * page.step), page.unit, lights), [], `${id} practice ${k + 1}`);
    }
  });
}

test('the card\'s frame never covers the card\'s own marks (an Urdu mark on the card is drawn inside it)', () => {
  for (const id of URDU_MARKED) {
    const char = load(id);
    const { card } = writingLayout(1280, 626, char, true);
    const ys = char.strokes.flatMap((s) => s.points).map((p) => card.origin[1] + p[1] * card.k);
    assert.ok(Math.min(...ys) - (CARD.letter.width / 2) * card.k >= card.y, id);
  }
});
