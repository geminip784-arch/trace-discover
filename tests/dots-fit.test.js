// Run: node --test tests/dots-fit.test.js
// Slice 5O follow-up (before Slice 10C):
// 1. A tap shows as a round dot of her ink, the same color and thickness as
//    her strokes, with the same glow, on every writing screen (all of them draw
//    her ink with render.js createInk), so the dots of i and j (and later the
//    Urdu dots) show on the lines. A dot is an ordinary stroke of her ink, so
//    undo takes it away and it goes faint and fades like any stroke.
// 2. The setup page's "fits on one line" check, and the name book's, measure
//    her name as the copy screens write it (in slots), so a name that passes
//    setup always fits the copy screens.
// The canvas needs a browser, so the drawing is checked by reading the source;
// the rest is pure. Every name here is made up.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDot, INK } from '../src/render.js';
import {
  nameOf, nameWidth, slotNameWidth, nameFits, placeInSlots, nameCopyLayout, nameLayout, NAME_FIT, TABLET_WIDTH,
} from '../src/name.js';
import { charFile } from '../src/session.js';

const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const charsOf = (raw) => nameOf(raw).letters.map(load);

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

// ---- 1. a tap is a dot of ink ----

test('a tap, or a stroke that never moved, is a dot; a stroke that moved is not', () => {
  assert.equal(isDot([{ x: 0.3, y: 0.25 }]), true, 'a tap');
  assert.equal(isDot([{ x: 0.3, y: 0.25 }, { x: 0.3, y: 0.25 }, { x: 0.3, y: 0.25 }]), true, 'a finger that went down and up in one place');
  assert.equal(isDot([{ x: 0.3, y: 0.25 }, { x: 0.31, y: 0.25 }]), false);
  assert.equal(isDot([{ x: 0, y: 0 }, { x: 0, y: 1 }]), false);
  assert.equal(isDot([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 }], 1, 2), true, 'a run that stays put');
});

test('a dot is drawn round, as thick as her line, in her ink\'s colors, with its glow and its brightness', () => {
  const ink = body(src('src/render.js'), 'createInk');
  const run = body(ink, 'strokeRun');
  const dot = run.slice(run.indexOf('if (isDot(points, from, to))'), run.indexOf('c.beginPath();\n    c.moveTo'));
  assert.ok(dot.length > 0, 'a dot is handled before the line');
  assert.match(dot, /c\.arc\(x, y, width \/ 2, 0, Math\.PI \* 2\)/, 'round, its diameter the line\'s width');
  assert.match(dot, /if \(style\.glow\) for \(const layer of INK\.glow\) disc\(layer\.width, layer\.color, base \* layer\.alpha\);/, 'the same glow layers');
  assert.match(dot, /disc\(INK\.core\.width, INK\.core\.color, base\);/, 'the same core');
  // Its brightness is the stroke's own: dimmed off the path, faint while a reason
  // shows, fading after a failed copy (src/render.js alpha), so undo, faint and fade all work.
  assert.ok(run.indexOf('const base = alpha * (style.dim ? INK.dimAlpha : 1);') < run.indexOf('if (isDot('));
  assert.ok(INK.core.width > 0 && INK.glow.every((l) => l.width > INK.core.width), 'the glow lies wider than the core');
  assert.ok(!/a tap shows as a dot\n/.test(run) && !run.includes('if (from === to) c.lineTo'), 'the old zero-length line is gone');
});

test('every writing screen draws her ink with createInk, so the dot shows on all of them', () => {
  for (const file of ['src/game.js', 'src/name-game.js', 'src/practice-game.js', 'src/name-practice-game.js']) {
    assert.match(src(file), /const ink = createInk\(els\.ink\);/, file);
  }
});

// ---- 2. the name fits as the copy screens write it ----

test('her name in slots is never narrower than in print, and wider when it has narrow letters', () => {
  for (const raw of ['Sara', 'Mia', 'Lily', 'Muhammad', 'Isabella', 'Jill']) {
    const chars = charsOf(raw);
    assert.ok(slotNameWidth(chars) >= nameWidth(chars) - 1e-9, raw);
  }
  assert.ok(slotNameWidth(charsOf('Lily')) > nameWidth(charsOf('Lily')));
  assert.equal(slotNameWidth(charsOf('Sara')), nameWidth(charsOf('Sara')), 'no narrow letters: the same');
});

test('a name that fits in print but not in its slots is too long', () => {
  const chars = charsOf('Mmmmmmmlili');
  assert.equal(nameFits(nameWidth(chars)), true, 'it would have passed before');
  assert.equal(nameFits(slotNameWidth(chars)), false, 'too long for the copy screens');
});

test('a name that passes the check fits the copy screens and her rounds, on both of her screens', () => {
  const names = ['Sara', 'Mia', 'Lily', 'Muhammad', 'Isabella', 'Christopher', 'Alexandria', 'Wilhelmina', 'Maximilliam', 'Mmmmmmmiil', 'Mmmmmmmlll', 'Ommmmmmm'];
  for (const raw of names) {
    const chars = charsOf(raw);
    if (!nameFits(slotNameWidth(chars))) continue;
    for (const h of [626, 800]) {
      const width = slotNameWidth(chars);
      const copy = nameCopyLayout(TABLET_WIDTH, h, width);
      const left = copy.originX + copy.offset * copy.unit;
      const right = left + width * copy.unit;
      assert.ok(left >= NAME_FIT.left - 1e-6 && right <= TABLET_WIDTH - NAME_FIT.right + 1e-6, `${raw} ${h}: the copy screen`);
      assert.ok(copy.unit * (TABLET_WIDTH - NAME_FIT.left - NAME_FIT.right) / (copy.unit * width) >= NAME_FIT.room - 1e-9, `${raw}: room to write it a little bigger`);
      const rounds = nameLayout(TABLET_WIDTH, h, nameWidth(chars));
      const l2 = rounds.originX + rounds.offset * rounds.unit;
      assert.ok(l2 >= NAME_FIT.left - 1e-6 && l2 + nameWidth(chars) * rounds.unit <= TABLET_WIDTH - NAME_FIT.right + 1e-6, `${raw} ${h}: her rounds`);
    }
  }
  assert.ok(nameFits(slotNameWidth(charsOf('Ommmmmmm'))), 'every name of up to 8 letters still fits (the widest has no narrow letter)');
});

test('the setup page and the name book check the width in slots', () => {
  const setup = src('src/setup.js');
  assert.match(setup, /return slotNameWidth\(letters\.map\(\(id\) => byId\.get\(id\)\)\);/);
  assert.match(src('src/screens.js'), /if \(!nameFits\(slotNameWidth\(chars\)\)\) return say\('too-long'\);/);
  assert.equal(slotNameWidth(charsOf('Lily')), nameWidth(placeInSlots(charsOf('Lily'))));
});
