// Run: node --test tests/card.test.js
// The copy round's model card (Slice 5I): where it sits, and its markers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeLayout, letterOffset, modelCard, cardMarkers, fitUnit, CARD, BOARD } from '../src/render.js';
import { charFile } from '../src/session.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const MANIFEST = JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url), 'utf8'));
// Chrome in the tablet's landscape, and the installed app's full screen.
const SCREENS = [[1280, 626], [1280, 800]];
// The round lights, top right: 6 px down, 44 px tall (index.html, Slice 9A).
const LIGHTS_BOTTOM = 6 + 44;
// The button column on the left (src/session.js BOARD_BOX.left).
const BUTTONS_RIGHT = 136;

const cardFor = (id, w, h) => {
  const char = load(id);
  const full = computeLayout(w, h, char.width); // as src/game.js lays it out
  const layout = { ...full, lineEnd: modelCard(full, 0, char).lineEnd };
  const offset = letterOffset(layout, char.width);
  return { char, full, layout, offset, card: modelCard(full, offset, char) };
};

test('the card sits on the board at the right end of the lines, clear of the round lights', () => {
  for (const [w, h] of SCREENS) {
    for (const id of MANIFEST) {
      const { full, card } = cardFor(id, w, h);
      assert.ok(Math.abs(card.x + card.w - full.lineEnd) < 1e-9, id);
      assert.ok(card.y > LIGHTS_BOTTOM, `${id} at ${w}x${h}: card top ${card.y}`);
      assert.ok(card.y + card.h < h - BOARD.inset - BOARD.frame, id);
      assert.ok(card.lineEnd < card.x, id);
    }
  }
});

test('the card letter is big enough to read (at least 120 px tall) and smaller than hers', () => {
  for (const [w, h] of SCREENS) {
    const { full, card } = cardFor('W', w, h);
    assert.ok(card.k >= 120, `${card.k}`);
    assert.ok(card.k < full.unit * 0.75);
  }
});

test('the writing lines leave room for her widest letter at 125%', () => {
  for (const [w, h] of SCREENS) {
    for (const id of MANIFEST) {
      const { char, layout } = cardFor(id, w, h);
      const room = (layout.lineEnd - Math.max(layout.originX, BUTTONS_RIGHT)) / layout.unit;
      assert.ok(room >= 1.25 * char.width + 0.25 - 1e-9, `${id}: ${room}`);
    }
  }
});

test('Slice 9B: only a character too wide to copy at 125% gets smaller lines (20 on the full screen)', () => {
  const smaller = [];
  for (const [w, h] of SCREENS) {
    for (const id of MANIFEST) {
      const { char } = cardFor(id, w, h);
      const plain = computeLayout(w, h);
      const fitted = computeLayout(w, h, char.width);
      if (fitted.unit < plain.unit) smaller.push(`${id} ${w}x${h}`);
      else assert.deepEqual(fitted, plain, id);
    }
  }
  // Slice 10D: the widest Urdu letters (س ش ص ض) too, on the full screen only.
  assert.deepEqual(smaller, ['20 1280x800', 'ur-seen 1280x800', 'ur-sheen 1280x800', 'ur-suad 1280x800', 'ur-zuad 1280x800']);
  for (const id of ['ur-suad', 'ur-zuad']) assert.ok(computeLayout(1280, 800, load(id).width).unit >= 0.8 * computeLayout(1280, 800).unit, `${id} stays big`);
  const twenty = computeLayout(1280, 800, load('20').width);
  assert.ok(Math.abs(twenty.unit - fitUnit(1280, load('20').width)) < 1e-9);
  assert.ok(twenty.unit > 0.85 * computeLayout(1280, 800).unit, `20 stays big: ${twenty.unit}`);
  // The four lines stay centred.
  assert.ok(Math.abs(twenty.top + 0.75 * twenty.unit - 400) < 1e-9);
});

test('toMain puts the card letter inside the card', () => {
  const { char, layout, offset, card } = cardFor('A', 1280, 626);
  for (const s of char.strokes) {
    for (const p of s.points) {
      const [mx, my] = card.toMain(p);
      const px = layout.originX + (offset + mx) * layout.unit;
      const py = layout.top + my * layout.unit;
      assert.ok(px > card.x && px < card.x + card.w && py > card.y && py < card.y + card.h);
    }
  }
});

test('every stroke gets one numbered dot and every line stroke an arrow', () => {
  for (const id of MANIFEST) {
    const char = load(id);
    const { dots, arrows } = cardMarkers(char);
    // Slice 10D: dots side by side share the first one's number (any order).
    const numbered = char.strokes.map((_, i) => i + 1).filter((_, i) => !(char.strokes[i].kind === 'dot' && char.strokes[i - 1]?.kind === 'dot'));
    assert.deepEqual(dots.map((d) => d.label), numbered, id);
    assert.equal(arrows.length, char.strokes.filter((s) => s.kind === 'line').length, id);
  }
});

test('no two start dots on the card overlap (A and E start strokes together)', () => {
  for (const id of MANIFEST) {
    const { dots } = cardMarkers(load(id));
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const d = Math.hypot(dots[i].at[0] - dots[j].at[0], dots[i].at[1] - dots[j].at[1]);
        assert.ok(d >= 2 * (CARD.dot.r + CARD.dot.ring), `${id}: dots ${i + 1} and ${j + 1} are ${d.toFixed(3)} apart`);
      }
    }
  }
});

test('the first stroke\'s dot sits right on its start', () => {
  for (const id of MANIFEST) {
    const char = load(id);
    assert.deepEqual(cardMarkers(char).dots[0].at, char.strokes[0].points[0], id);
  }
});
