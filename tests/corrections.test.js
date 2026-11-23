// Run: node --test tests/corrections.test.js
// Slice 5O part 2: corrections always on top. Whenever a reason is shown (a
// glowing part, Jugnu drawing a missing stroke, a size outline, the guide lines
// glowing), her own ink goes faint first, and the correction is drawn on the
// effects layer, which lies above her ink. Then a failed copy fades out and the
// rest of her ink comes back. And Jugnu rests where no button covers him.
// The screens need a browser, so (as in tests/no-first-move.test.js) their
// wiring is checked by reading the source; the brightness and the resting place
// are pure and checked directly. Every name here is made up.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INK, alphaBetween, computeLayout, letterOffset, letterToPx, modelCard } from '../src/render.js';
import { restingSpot, pictureBox, REST, perchFor } from '../src/jugnu.js';
import { CONFIG } from '../src/progress.js';
import { practiceLayout } from '../src/practice.js';
import { nameLayout, nameCopyLayout, nameWidth, nameOf } from '../src/name.js';
import { charFile } from '../src/session.js';

const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url)));

// The body of `function <name>` (or `async function <name>`) in a source, braces matched.
function body(source, name) {
  const at = source.search(new RegExp(`function ${name}\\s*\\(`));
  assert.ok(at >= 0, `function ${name} is there`);
  let i = source.indexOf('{', source.indexOf(')', at));
  const start = i;
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unbalanced ${name}`);
}

// ---- her ink goes faint ----

test('her ink goes faint, never away: fainter than ink off the path, and back to full after', () => {
  assert.ok(INK.faintAlpha > 0 && INK.faintAlpha < INK.dimAlpha, 'faint, but still there');
  assert.equal(alphaBetween(1, INK.faintAlpha, 0), 1);
  assert.ok(Math.abs(alphaBetween(1, INK.faintAlpha, 1) - INK.faintAlpha) < 1e-9);
  assert.ok(Math.abs(alphaBetween(1, INK.faintAlpha, 0.5) - (1 + INK.faintAlpha) / 2) < 1e-9);
  assert.equal(alphaBetween(INK.faintAlpha, 0, 2), 0, 'a fade from faint ends at nothing');
  assert.equal(alphaBetween(INK.faintAlpha, 1, -1), INK.faintAlpha);
  assert.ok(CONFIG.faintMs > 0 && CONFIG.faintMs < CONFIG.copyReasonMs);
});

test('the ink layer: strokes can go faint and come back, a fade starts from how bright a stroke is, and a touch finishes it all at once', () => {
  const ink = body(src('src/render.js'), 'createInk');
  assert.match(ink, /dimTo\(alpha, ms, ids = null\) \{/);
  assert.match(ink, /s\.fade = \{ ms, start: null, from: s\.alpha, to: alpha, drop: false \}/, 'going faint keeps the stroke');
  assert.match(ink, /s\.fade = \{ ms, start: null, from: s\.alpha, to: 0, drop: true \}/, 'a fade starts from how bright it is now');
  assert.match(ink, /if \(s\.fade && !s\.fade\.drop\) \{ s\.alpha = s\.fade\.to; s\.fade = null; \}/, 'settle: faint at once, never gone');
  assert.match(ink, /ids\(\) \{/);
});

test('corrections are drawn on the effects layer, which lies above her ink', () => {
  const html = src('index.html');
  const area = html.slice(html.indexOf('<div id="area"'), html.indexOf('</div>', html.indexOf('<div id="area"')));
  assert.ok(area.indexOf('<canvas id="ink">') >= 0 && area.indexOf('<canvas id="ink">') < area.indexOf('<svg id="fx"'), 'fx comes after the ink, so it is drawn on top');
  assert.ok(area.indexOf('<svg id="lines"') < area.indexOf('<canvas id="ink">'), 'the guide lines lie under her ink');
});

// ---- every screen that shows why a copy did not count ----

const SCREENS = [
  { file: 'src/game.js', what: 'the copy round (reviews)', judge: 'judgeCopy', shows: ['showOnCard', 'fx.partGlow', 'fx.outline', 'fx.beside'] },
  { file: 'src/practice-game.js', what: 'practice spaces 2 and 3', judge: 'judgeCopy', shows: ['showOnModel', 'fx.partGlow', 'fx.outline'] },
  { file: 'src/name-game.js', what: "her name's copy round", judge: 'judgeName', shows: ['showOnCard', 'fx.partGlow', 'fx.outline'] },
  { file: 'src/name-practice-game.js', what: "her name's practice screens 2 and 3", judge: 'judgeName', shows: ['showOnCard', 'fx.partGlow', 'fx.outline'] },
];

for (const { file, what, judge, shows } of SCREENS) {
  const s = src(file);

  test(`${what}: her ink goes faint before any reason is shown`, () => {
    const faint = body(s, 'faintFirst');
    assert.match(faint, /ink\.dimTo\(INK\.faintAlpha, CONFIG\.faintMs\);\s*await wait\(CONFIG\.faintMs\);\s*return alive;/);
    const why = body(s, 'showWhy');
    const first = why.indexOf('if (!(await faintFirst())) return false;');
    assert.ok(first > 0, 'showWhy starts by making her ink faint');
    for (const call of shows) {
      const at = why.indexOf(`${call}(`);
      assert.ok(at > first, `${call} comes after her ink is faint`);
    }
    assert.ok(!/fx\.\w+\(/.test(why.slice(0, first)), 'nothing is drawn before it');
  });

  test(`${what}: after the reason, her copy fades out and the rest of her ink comes back`, () => {
    const j = body(s, judge);
    const why = j.indexOf('await showWhy(result)');
    // A letter or a practice space: her whole copy fades. Her name (Slice 5O part 4): only the letter she rewrites.
    const name = judge === 'judgeName';
    const fade = j.indexOf(name ? 'for (const id of fading) ink.fade(id, CONFIG.copyFadeMs);' : 'for (const id of copy.ids) ink.fade(id, CONFIG.copyFadeMs);');
    const back = j.indexOf(name ? 'ink.dimTo(1, CONFIG.faintMs, ink.ids().filter((id) => !fading.includes(id)));' : 'ink.dimTo(1, CONFIG.faintMs, ink.ids().filter((id) => !copy.ids.includes(id)));');
    assert.ok(why > 0 && fade > why && back > fade, 'reason, then her copy (or that letter) fades, then the rest comes back');
  });

  test(`${what}: Jugnu rests at the resting spot`, () => {
    assert.match(s, /const home = \(\) => restingSpot\(layout, (layout\.)?offset\);/);
    assert.ok(!s.includes('jugnu.placeAt(home())'), 'he is put there by his perch rule (restAt), as hopTo does');
    assert.ok(!/const HOME = /.test(s), 'no old resting place left');
  });
}

// ---- Jugnu never behind a button ----

// The left column's buttons in px (index.html .btn: 96 px at left 16, a 7 px shadow below).
const buttons = (h) => [
  { name: 'home', x0: 16, x1: 112, y0: 16, y1: 16 + 96 + 7 },
  { name: 'back', x0: 16, x1: 112, y0: 128, y1: 128 + 96 + 7 },
  { name: 'undo', x0: 16, x1: 112, y0: 240, y1: 240 + 96 + 7 },
  { name: 'music', x0: 16, x1: 112, y0: h - 16 - 96, y1: h - 16 + 7 },
];
const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

function checkSpot(label, layout, offset, h) {
  const tail = letterToPx(layout, offset)(perchFor(restingSpot(layout, offset))); // he perches beside the spot, as beside a dot
  const box = pictureBox(tail, layout.unit);
  for (const b of buttons(h)) assert.ok(!overlaps(box, b), `${label}: Jugnu is clear of ${b.name} (${JSON.stringify(box)})`);
  assert.ok(box.x0 >= 0, `${label}: on the screen`);
  assert.ok(box.y1 <= h, `${label}: on the screen`);
}

const SIZES = [[1280, 626], [1280, 800]];

test('Jugnu rests clear of every button on a letter\'s rounds and its copy round', () => {
  for (const [w, h] of SIZES) {
    for (const id of ['L', 'W', 'M', 'I', '20', 'g']) {
      const c = load(id);
      const full = computeLayout(w, h, c.width);
      checkSpot(`${id} rounds ${w}x${h}`, full, letterOffset(full, c.width), h);
      const copy = { ...full, lineEnd: modelCard(full, 0, c).lineEnd };
      checkSpot(`${id} copy ${w}x${h}`, copy, letterOffset(copy, c.width), h);
    }
  }
});

test('Jugnu rests clear of every button on the practice page', () => {
  for (const [w, h] of SIZES) {
    for (const id of ['L', 'W', 'a', '20']) {
      const layout = practiceLayout(w, h, load(id).width);
      checkSpot(`practice ${id} ${w}x${h}`, layout, layout.offset, h);
    }
  }
});

test('Jugnu rests clear of every button in her name\'s rounds, copy round and practice page', () => {
  for (const [w, h] of SIZES) {
    for (const raw of ['Mia', 'Sara', 'Muhammad', 'Al']) {
      const width = nameWidth(nameOf(raw).letters.map(load));
      for (const [kind, layout] of [['rounds', nameLayout(w, h, width)], ['copy', nameCopyLayout(w, h, width)]]) {
        checkSpot(`${raw} ${kind} ${w}x${h}`, layout, layout.offset, h);
      }
    }
  }
});

test('the resting spot sits just under the undo button, in the button column', () => {
  const layout = computeLayout(1280, 626, 0.66);
  const offset = letterOffset(layout, 0.66);
  const box = pictureBox(letterToPx(layout, offset)(perchFor(restingSpot(layout, offset))), layout.unit);
  assert.ok(Math.abs(box.y0 - REST.below) < 1e-6, 'his picture starts just under undo');
  assert.ok(Math.abs((box.x0 + box.x1) / 2 - REST.x) < 1e-6, 'centred in the column');
});
