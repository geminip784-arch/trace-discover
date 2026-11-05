// Run: node --test tests/odd.test.js
// Odd one out: every row has exactly one odd one, for the right reason; the
// odd one lands in all four places; the first row is the easiest; the things'
// colors are read from their own pictures; taps, the hint, the layout and the log.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ODD_THINGS, PAINTS, oddThingArt, MENU } from '../data/games.js';
import {
  GAME_ROWS, ODD, singledOut, fairRow, kindRow, colorRow, oddPlay, startOdd, tapOdd, oddCards, hitOdd,
  showsFirstMove, marginUnits, boardFit, BOARD, gameLogEntry,
} from '../src/games.js';
import { family, biggestColor, hsl } from './art-colors.js';

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
const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);
const isInlineSvg = (s) => s.startsWith('<svg') && s.endsWith('</svg>') && !/https?:\/\/(?!www\.w3\.org)/.test(s);
const T = (id) => ODD_THINGS[id];
const alikeOf = (row) => row.items.filter((_, i) => i !== row.odd);

// ---- the menu and the things ----

test('Odd one out has its own menu row: by kind, by color', () => {
  assert.deepEqual(GAME_ROWS.find((r) => r.kind === 'odd').games, ['odd-kinds', 'odd-colors']);
  assert.equal(GAME_ROWS.length, 4);
  for (const g of ['odd-kinds', 'odd-colors']) assert.ok(isInlineSvg(MENU[g]), g);
});

test('every thing has a kind, a color and its own inline picture; painted things come in all four colors', () => {
  const kinds = new Set(['fruit', 'toy', 'animal', 'clothes', 'kitchen', 'school']);
  for (const t of Object.values(ODD_THINGS)) {
    assert.ok(kinds.has(t.kind), t.id);
    assert.ok(isInlineSvg(oddThingArt(t.id)), t.id);
  }
  const objects = new Set(Object.values(ODD_THINGS).filter((t) => t.painted).map((t) => t.object));
  for (const o of objects) for (const c of Object.keys(PAINTS)) assert.ok(T(`${o}-${c}`), `${o} in ${c}`);
});

test('every thing is the color it is said to be, read from its own picture', () => {
  for (const t of Object.values(ODD_THINGS)) {
    const art = oddThingArt(t.id);
    if (t.color === 'grey') {
      const c = biggestColor(art, { neutral: true });
      assert.ok(hsl(c).s < 0.4, `${t.id}: its biggest shape ${c} is grey`);
      continue;
    }
    const c = biggestColor(art);
    assert.equal(family(c), t.color, `${t.id}: its biggest colored shape is ${c}`);
  }
});

test('twins are the same picture in another color: nothing else changes', () => {
  for (const o of ['ball', 'car', 'balloon', 'cup', 'sock', 'book', 'crayon', 'tshirt', 'cap']) {
    const shapes = Object.keys(PAINTS).map((c) => oddThingArt(`${o}-${c}`).replace(/#[0-9A-Fa-f]{6}/g, '#'));
    assert.ok(shapes.every((s) => s === shapes[0]), `${o}: only the colors differ`);
  }
});

// ---- the referee ----

test('singledOut finds every picture that stands alone, by kind or by color', () => {
  const row = (ids) => ids.map(T);
  assert.deepEqual(singledOut(row(['apple', 'banana', 'grapes', 'ball-red'])), [{ index: 3, by: 'kind' }]);
  assert.deepEqual(singledOut(row(['apple', 'car-red', 'cup-red', 'cup-blue'])), [{ index: 3, by: 'color' }]);
  // Unfair rows the game must never make:
  assert.deepEqual(singledOut(row(['apple', 'strawberry', 'banana', 'ball-red'])).map((s) => s.index).sort(), [2, 3],
    'banana stands alone by color while the ball stands alone by kind');
  assert.deepEqual(singledOut(row(['apple', 'car-red', 'cup-red', 'ball-blue'])), [{ index: 3, by: 'color' }]);
  assert.equal(fairRow({ by: 'color', odd: 3, items: row(['apple', 'car-red', 'ball-red', 'car-blue']) }), false,
    'the apple stands alone by kind too');
});

// ---- the rows ----

test('kind rows: three of one kind, all different objects; the odd one another kind; color singles nothing out', () => {
  for (const seed of SEEDS) {
    const rand = seeded(seed);
    for (const easy of [false, true]) {
      const r = kindRow(rand, easy);
      assert.equal(r.by, 'kind');
      assert.ok(fairRow(r), r.items.map((t) => t.id).join());
      const alike = alikeOf(r);
      assert.equal(new Set(alike.map((t) => t.kind)).size, 1);
      assert.equal(new Set(r.items.map((t) => t.object)).size, 4, 'four different objects');
      assert.notEqual(r.items[r.odd].kind, alike[0].kind);
      assert.ok(alike.some((t) => t.color === r.items[r.odd].color), 'the odd one shares a color with one of the three');
    }
  }
});

test('color rows: three of one color, each a different kind; the odd one is a twin in another color', () => {
  for (const seed of SEEDS) {
    const rand = seeded(seed);
    for (const easy of [false, true]) {
      const r = colorRow(rand, easy);
      assert.equal(r.by, 'color');
      assert.ok(fairRow(r), r.items.map((t) => t.id).join());
      const alike = alikeOf(r);
      const odd = r.items[r.odd];
      assert.equal(new Set(alike.map((t) => t.color)).size, 1);
      assert.equal(new Set(alike.map((t) => t.kind)).size, 3, 'three different kinds');
      const twin = alike.find((t) => t.object === odd.object);
      assert.ok(twin, `${odd.id} is the twin of one of the three`);
      assert.equal(twin.kind, odd.kind);
      assert.notEqual(twin.color, odd.color, 'it differs only in color');
    }
  }
});

test('the odd one lands in each of the four places, about equally often', () => {
  for (const make of [kindRow, colorRow]) {
    for (const easy of [false, true]) {
      const counts = [0, 0, 0, 0];
      const rand = seeded(easy ? 99 : 7);
      for (let i = 0; i < 2000; i++) counts[make(rand, easy).odd] += 1;
      for (const n of counts) assert.ok(n >= 400 && n <= 600, `${make.name}${easy ? ' (easy)' : ''}: ${counts.join(' ')}`);
    }
  }
  // And within one play the places differ.
  const places = new Set();
  for (const seed of SEEDS.slice(0, 50)) for (const r of oddPlay('odd-kinds', seeded(seed))) places.add(r.odd);
  assert.equal(places.size, 4);
});

test('a play: five rows; the first (Jugnu taps it) is the easiest: three fruit and a toy, or three red and a blue twin', () => {
  for (const seed of SEEDS) {
    const kinds = oddPlay('odd-kinds', seeded(seed));
    assert.equal(kinds.length, ODD.rows);
    assert.ok(kinds.every((r) => r.by === 'kind' && fairRow(r)));
    assert.ok(alikeOf(kinds[0]).every((t) => t.kind === 'fruit'));
    assert.equal(kinds[0].items[kinds[0].odd].kind, 'toy');
    const colors = oddPlay('odd-colors', seeded(seed));
    assert.ok(colors.every((r) => r.by === 'color' && fairRow(r)));
    assert.ok(alikeOf(colors[0]).every((t) => t.color === 'red'));
    assert.equal(colors[0].items[colors[0].odd].color, 'blue');
  }
  assert.equal(showsFirstMove(1), true);
  assert.equal(showsFirstMove(2), false);
});

test('rows vary: every kind and every color turns up as the three alike', () => {
  const kinds = new Set();
  const colors = new Set();
  for (const seed of SEEDS) {
    kinds.add(alikeOf(kindRow(seeded(seed)))[0].kind);
    colors.add(alikeOf(colorRow(seeded(seed)))[0].color);
  }
  assert.deepEqual([...kinds].sort(), [...ODD.kindRowKinds].sort());
  assert.deepEqual([...colors].sort(), Object.keys(PAINTS).sort());
});

// ---- the screen ----

test('four cards in a row, inside the board, apart, and at least 88 px', () => {
  const cards = oddCards();
  assert.equal(cards.length, 4);
  cards.forEach((c, i) => {
    assert.ok(c.x0 >= 12 && c.x1 <= BOARD.w - 12 && c.y0 >= 12 && c.y1 <= BOARD.h - 12);
    if (i) assert.ok(c.x0 - cards[i - 1].x1 >= 30, 'room between cards');
  });
  assert.ok(ODD.dots.y + 14 < cards[0].y0, 'the dots sit above the cards');
  for (const [w, h] of [[1280, 626], [1280, 800]]) assert.ok(ODD.card * boardFit(w, h).s >= 88);
});

test('a tap lands on a card inside it or just beside it; in a gap, the nearer card', () => {
  const c = oddCards()[3];
  assert.equal(hitOdd([(c.x0 + c.x1) / 2, ODD.y]), 3);
  assert.equal(hitOdd([640, 600]), null);
  const m = marginUnits(boardFit(1280, 626).s, 20);
  assert.equal(hitOdd([c.x1 + m - 1, ODD.y], m), 3, 'just beside the last card');
  assert.equal(hitOdd([c.x1 + m + 1, ODD.y], m), null);
  const gap = (oddCards()[1].x0 + oddCards()[0].x1) / 2;
  assert.equal(hitOdd([gap - 1, ODD.y], m), 0, 'in a gap: the nearer card');
  assert.equal(hitOdd([gap + 1, ODD.y], m), 1);
});

// ---- tapping ----

test('a right tap finds it; a wrong tap does not; after 3 wrong taps in a row the odd one wiggles once', () => {
  const row = kindRow(seeded(3));
  const wrong = [0, 1, 2, 3].filter((i) => i !== row.odd);
  let r = tapOdd(startOdd(), row, wrong[0]);
  assert.deepEqual([r.ok, r.hint, r.done], [false, null, false]);
  r = tapOdd(r.state, row, wrong[1]);
  assert.equal(r.hint, null);
  r = tapOdd(r.state, row, wrong[0]);
  assert.equal(r.hint, row.odd, 'the third wrong tap: the odd one wiggles');
  r = tapOdd(r.state, row, wrong[2]);
  assert.equal(r.hint, null, 'once: the count starts again');
  r = tapOdd(r.state, row, row.odd);
  assert.deepEqual([r.ok, r.done], [true, true]);
  assert.equal(tapOdd(r.state, row, row.odd).ok, false, 'a found row takes no more taps');
});

// ---- the log ----

test('Odd one out logs as the existing "game" entry: row, the picture she tapped, right or wrong', () => {
  const now = new Date('2026-11-05T09:00:00Z');
  assert.deepEqual(gameLogEntry({ game: 'odd-colors', set: 3, from: 'cup-blue', ok: true, ms: 2200.2, now }),
    { type: 'game', time: '2026-11-05T09:00:00.000Z', game: 'odd-colors', set: 3, from: 'cup-blue', ok: true, ms: 2200 });
  assert.deepEqual(gameLogEntry({ game: 'odd-kinds', set: 2, from: 'banana', ok: false, ms: 10, now }),
    { type: 'game', time: '2026-11-05T09:00:00.000Z', game: 'odd-kinds', set: 2, from: 'banana', ok: false, ms: 10 });
});
