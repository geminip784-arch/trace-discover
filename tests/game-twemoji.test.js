// Slice 5M part 4: the game pictures become Twemoji (CC BY 4.0), never
// recolored. Each picture is named with its word at a glance; in the color
// games each is clearly its color. Odd one out's kind rows are Twemoji, its
// color rows our painted drawings (option B, no book). Our friendly spider
// stays in Follow the path, and Match shapes keeps all its drawings.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TWEMOJI } from '../data/twemoji.js';
import {
  GAME_TWEMOJI, gameEmoji, COLORS, colorThingArt, ANIMALS, HOMES, FURNITURE, SHAPES, shapeThingArt,
  SORT_SETS, sortThingArt, basketArt, ODD_THINGS, oddThingArt, MENU,
} from '../data/games.js';
import { codesUsed } from '../tools/twemoji.js';
import { oddPlay, ODD } from '../src/games.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const isTwemoji = (art, id) => art.includes(TWEMOJI[GAME_TWEMOJI[id].emoji]);
const hasAnyTwemoji = (art) => Object.values(TWEMOJI).some((body) => art.includes(body));

test('every game Twemoji is copied, and drawn exactly as Twemoji drew it (never recolored)', () => {
  const used = new Set(codesUsed());
  for (const [id, t] of Object.entries(GAME_TWEMOJI)) {
    assert.ok(used.has(t.emoji) && TWEMOJI[t.emoji], `${id}: ${t.emoji} copied`);
    const art = gameEmoji(id);
    assert.ok(art.includes(TWEMOJI[t.emoji]), `${id}: the picture, unchanged`);
    assert.doesNotMatch(art, /https?:\/\/(?!www\.w3\.org)/, id);
  }
  assert.equal(gameEmoji('spider'), null, 'not every id is Twemoji');
});

test('Match colors: Twemoji except our tomato, star, alligator, plum and sock', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(COLORS).map(([c, v]) => [c, v.things])), {
    red: ['apple', 'tomato', 'car', 'crayon'],
    yellow: ['moon', 'banana', 'star', 'chick'],
    blue: ['tshirt', 'book', 'cap', 'whale'],
    green: ['frog', 'alligator', 'pear', 'tree'],
    orange: ['orange', 'carrot', 'tiger'],
    purple: ['grapes', 'plum', 'aubergine'],
    pink: ['pink-heart', 'sock', 'pig'],
  });
  const OURS = ['tomato', 'star', 'alligator', 'plum', 'sock'];
  for (const c of Object.values(COLORS)) {
    for (const id of c.things) {
      if (OURS.includes(id)) assert.ok(!hasAnyTwemoji(colorThingArt(id)), `${id}: our drawing`);
      else assert.ok(isTwemoji(colorThingArt(id), id), `${id}: Twemoji`);
    }
  }
});

test('Match shapes keeps every one of our drawings', () => {
  for (const s of Object.values(SHAPES)) for (const t of s.things) assert.ok(!hasAnyTwemoji(shapeThingArt(t)), t);
});

test('Follow the path: Twemoji travellers except our friendly spider; the nest and web are Twemoji; three furniture', () => {
  for (const [id, a] of Object.entries(ANIMALS)) {
    if (id === 'spider') {
      assert.ok(!hasAnyTwemoji(a.art), 'our purple spider stays (the black Twemoji one could scare her)');
      assert.ok(a.art.includes('#6C5CE7'), 'it is the purple one');
    } else assert.ok(isTwemoji(a.art, id), id);
  }
  for (const [id, art] of Object.entries(HOMES)) {
    if (['nest', 'web'].includes(id)) assert.ok(isTwemoji(art, id), id);
    else assert.ok(!hasAnyTwemoji(art), `${id}: no emoji, our drawing`);
  }
  for (const [id, f] of Object.entries(FURNITURE)) {
    if (id === 'stove') assert.ok(!hasAnyTwemoji(f.art), 'no stove emoji: our drawing');
    else assert.ok(isTwemoji(f.art, id), id);
  }
});

test('Sort it: the approved things, all Twemoji except our tomato', () => {
  assert.deepEqual(SORT_SETS['sort-colors'], [
    { id: 'red', sample: 'apple', things: ['tomato', 'balloon', 'crayon', 'strawberry'] },
    { id: 'blue', sample: 'tshirt', things: ['book', 'car-blue', 'cap', 'whale'] },
  ]);
  assert.deepEqual(SORT_SETS['sort-kinds'], [
    { id: 'fruit', sample: 'apple', things: ['lemon', 'orange', 'grapes', 'banana', 'strawberry'] },
    { id: 'toys', sample: 'teddy', things: ['ball', 'kite', 'car', 'yoyo'] },
  ]);
  for (const sets of Object.values(SORT_SETS)) {
    for (const b of sets) {
      for (const id of [b.sample, ...b.things]) {
        if (id === 'tomato') assert.ok(!hasAnyTwemoji(sortThingArt(id)));
        else assert.ok(isTwemoji(sortThingArt(id), id), id);
      }
      assert.ok(isTwemoji(basketArt(b.sample), b.sample), `${b.id} basket shows its sample`);
    }
  }
});

test('one id is the same picture in every game', () => {
  for (const id of ['tshirt', 'book', 'cap', 'whale', 'car', 'crayon', 'apple']) assert.equal(sortThingArt(id), colorThingArt(id), id);
  for (const id of ['apple', 'strawberry', 'banana', 'lemon', 'grapes', 'orange', 'teddy', 'ball', 'car', 'balloon', 'yoyo', 'kite', 'tshirt', 'cap']) {
    assert.equal(oddThingArt(id), sortThingArt(id), id);
  }
});

test('Odd one out: kind things are Twemoji, color things our paintings; no book', () => {
  const kind = Object.values(ODD_THINGS).filter((t) => t.rows === 'kind');
  const color = Object.values(ODD_THINGS).filter((t) => t.rows === 'color');
  assert.equal(kind.length + color.length, Object.keys(ODD_THINGS).length);
  for (const t of kind) {
    assert.equal(t.painted, false);
    assert.ok(isTwemoji(oddThingArt(t.id), t.id), t.id);
  }
  for (const t of color) {
    assert.equal(t.painted, true);
    assert.ok(!hasAnyTwemoji(oddThingArt(t.id)), `${t.id}: our drawing`);
  }
  assert.ok(!Object.values(ODD_THINGS).some((t) => t.object === 'book'), 'the book left the color rows');
  assert.deepEqual([...new Set(color.map((t) => t.object))].sort(), ['ball', 'balloon', 'cap', 'car', 'crayon', 'cup', 'sock', 'tshirt']);
  // The new kind things.
  for (const id of ['chick', 'frog', 'hat', 'scarf', 'jeans', 'socks', 'yoyo', 'kite']) assert.equal(ODD_THINGS[id]?.rows, 'kind', id);
  for (const k of ODD.kindRowKinds) {
    const colors = new Set(kind.filter((t) => t.kind === k).map((t) => t.color));
    assert.ok(colors.size >= 3, `${k}: things of ${colors.size} colors`);
  }
});

test('Odd one out: a row never mixes Twemoji and our drawings', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const row of oddPlay('odd-kinds', seeded(seed))) assert.ok(row.items.every((t) => t.rows === 'kind'), `kind row ${seed}`);
    for (const row of oddPlay('odd-colors', seeded(seed))) assert.ok(row.items.every((t) => t.rows === 'color'), `color row ${seed}`);
  }
  assert.ok(MENU['odd-kinds'].includes(TWEMOJI[GAME_TWEMOJI.apple.emoji]), 'the kind tile shows Twemoji');
  assert.ok(!hasAnyTwemoji(MENU['odd-colors']), 'the color tile shows our paintings');
});
