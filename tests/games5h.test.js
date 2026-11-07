// Run: node --test tests/games5h.test.js
// Slice 5H, pull request 1: game variety. Every game draws from pools; every
// set still has exactly one right answer; a play never repeats the last play;
// and over many plays the pools are drawn evenly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBJECTS } from '../data/finds.js';
import {
  COLORS, blob, colorThingArt, LETTER_WORDS, SHADOW_THINGS, SHADOW_LEFT_OUT, SHADOW_LOOKALIKES, SHAPES,
  ANIMALS, HOMES, SORT_SETS,
} from '../data/games.js';
import {
  MATCH_GAMES, PAIRS, SETS_PER_PLAY, makeSet, matchPlay, setKey, freshPlay, numbersSet, colorsSet, lettersSet,
  shadowsSet, shapesSet, shadowsClash, MAX_COUNT, CARD_GAP, matViewBoxes, CARDS, boardFit,
  PATH, pathThings, pathPlay, pathKey, pathBoard, sortPlay, sortKey, SORT, oddPlay, oddKey, fairRow, ODD,
  isPlainTap, TAP_SLOP_PX,
} from '../src/games.js';
import { makeGroup, CELL } from '../src/finds.js';
import { LAST_PLAY_KEY, readLastPlay, saveLastPlay } from '../src/storage.js';
import { colorsOf, family } from './art-colors.js';

// A repeatable random source (mulberry32).
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
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const isInlineSvg = (s) => s.startsWith('<svg') && s.endsWith('</svg>') && !/https?:\/\/(?!www\.w3\.org)/.test(s);
const object = (id) => OBJECTS.find((o) => o.id === id);

// Many plays in a row, each told the keys of the one before (as the games do).
function chain(n, play, keysOf, rand) {
  const plays = [];
  let last = [];
  for (let i = 0; i < n; i++) {
    const p = play(last, rand);
    plays.push(p);
    last = keysOf(p);
  }
  return plays;
}

// Every value turns up about equally often: each within `tol` of the mean.
function assertEven(counts, pool, tol, what) {
  for (const id of pool) assert.ok(counts[id] > 0, `${what}: ${id} never turns up`);
  const n = pool.map((id) => counts[id]);
  const mean = n.reduce((a, b) => a + b, 0) / n.length;
  for (const id of pool) {
    assert.ok(Math.abs(counts[id] - mean) <= tol * mean, `${what}: ${id} turns up ${counts[id]} times, the mean is ${mean.toFixed(0)}`);
  }
}
const tally = (list) => list.reduce((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});

// ---------------------------------------------------------------------------
// Colors to things

// A picture's main fill: the color of its biggest solid shape (faint shines and
// ground shadows do not count, but white and cream do). And how much of its
// colored area is that color's family. Saturation from 0.3 counts as a color.
const MIN_S = 0.3;
const MAIN_SHARE = 0.75;
function mainFill(art) {
  const solid = colorsOf(art).filter((c) => c.area > 0 && c.opacity >= 0.6);
  const main = solid.reduce((a, c) => (c.area > a.area ? c : a)).color;
  const byFamily = {};
  for (const c of solid) {
    const f = family(c.color, MIN_S);
    if (f) byFamily[f] = (byFamily[f] ?? 0) + c.area;
  }
  const total = Object.values(byFamily).reduce((a, b) => a + b, 0);
  const fam = family(main, MIN_S);
  return { main, family: fam, share: (byFamily[fam] ?? 0) / total };
}

test('seven colors, each with 3 or 4 things; purple has grapes, plum and aubergine; pink is new', () => {
  assert.deepEqual(Object.keys(COLORS), ['red', 'yellow', 'blue', 'green', 'orange', 'purple', 'pink']);
  for (const c of Object.values(COLORS)) assert.ok(c.things.length >= 3 && c.things.length <= 4);
  assert.deepEqual(COLORS.purple.things, ['grapes', 'plum', 'aubergine']);
  assert.deepEqual(COLORS.pink.things, ['flower', 'sock', 'frock']);
  assert.deepEqual(COLORS.orange.things, ['orange', 'fish', 'juice'], 'no tiger: its picture is a framed poster');
  const all = Object.values(COLORS).flatMap((c) => c.things);
  assert.equal(new Set(all).size, all.length, 'no thing in two colors');
});

test('every color thing\'s main fill is its color, and most of its colored area too', () => {
  for (const [color, c] of Object.entries(COLORS)) {
    assert.equal(family(c.paint), color, `the ${color} paint`);
    assert.ok(isInlineSvg(blob(color)));
    for (const id of c.things) {
      const art = colorThingArt(id);
      assert.ok(isInlineSvg(art), id);
      const m = mainFill(art);
      assert.equal(m.family, color, `${id}: its main fill ${m.main} is ${m.family}, not ${color}`);
      assert.ok(m.share >= MAIN_SHARE, `${id}: only ${(m.share * 100).toFixed(0)}% of its colored area is ${color}`);
    }
  }
});

test('the main-fill check turns away many-colored pictures', () => {
  // The tiger poster (a brown frame), the cream frock with pink dots, the
  // kite and the umbrella (several colors each): none could stand for one color.
  assert.notEqual(mainFill(object('tiger').art).family, 'orange');
  assert.notEqual(mainFill(object('frock').art).family, 'pink');
  for (const id of ['kite', 'umbrella', 'yoyo']) assert.ok(mainFill(object(id).art).share < MAIN_SHARE, id);
  // The pink frock is the library's frock, painted pink.
  assert.equal(mainFill(colorThingArt('frock')).family, 'pink');
});

test('colors: every set has exactly one right answer for each paint', () => {
  for (const seed of SEEDS) {
    const set = colorsSet(seeded(seed));
    const colors = set.pairs.map((p) => p.left.color);
    assert.equal(new Set(colors).size, PAIRS);
    for (const p of set.pairs) {
      const fits = colors.filter((c) => c === mainFill(colorThingArt(p.right.thing)).family);
      assert.deepEqual(fits, [p.left.color], `${p.right.thing} fits only its own paint`);
    }
  }
});

// ---------------------------------------------------------------------------
// Letter to picture

test('letters: every set has exactly one right answer; ice cream and eraser never appear', () => {
  for (const seed of SEEDS) {
    const set = lettersSet(seeded(seed));
    const letters = set.pairs.map((p) => p.left.letter);
    for (const p of set.pairs) {
      const o = object(p.right.object);
      assert.notEqual(o.finds, false, o.id);
      assert.deepEqual(letters.filter((l) => o.word[0].toUpperCase() === l), [p.left.letter], `${o.word} starts with one letter of the set`);
    }
  }
});

// ---------------------------------------------------------------------------
// Thing to its shadow

test('shadows: any library picture with its own outline; plain rounds and boxes left out', () => {
  for (const id of [...SHADOW_THINGS, ...SHADOW_LEFT_OUT, ...SHADOW_LOOKALIKES.flat()]) assert.ok(object(id), id);
  assert.ok(SHADOW_THINGS.length >= 60);
  for (const id of ['ice-cream', 'eraser', 'elephant', 'fork']) assert.ok(SHADOW_THINGS.includes(id), id);
  for (const id of SHADOW_LEFT_OUT) assert.ok(!SHADOW_THINGS.includes(id), id);
  const grouped = SHADOW_LOOKALIKES.flat();
  assert.equal(new Set(grouped).size, grouped.length, 'each thing in one group at most');
  // The examples: orange and apple (orange is left out), horse and zebra (one outline).
  assert.ok(shadowsClash('horse', 'zebra'));
  assert.ok(!SHADOW_THINGS.includes('orange') || shadowsClash('orange', 'apple'));
  assert.ok(!shadowsClash('elephant', 'fork'));
});

test('shadows: every set has 4 things, no two whose shadows look alike', () => {
  for (const seed of SEEDS) {
    const things = shadowsSet(seeded(seed)).pairs.map((p) => p.left.object);
    assert.equal(new Set(things).size, PAIRS);
    for (const [i, a] of things.entries()) {
      assert.ok(SHADOW_THINGS.includes(a));
      for (const b of things.slice(i + 1)) assert.ok(!shadowsClash(a, b), `${a} and ${b} look alike`);
    }
  }
});

// ---------------------------------------------------------------------------
// Shape to thing (tests/games5f.test.js measures every thing's outline)

test('shapes: at least 4 things each, no thing under two shapes, one right answer per set', () => {
  const all = Object.values(SHAPES).flatMap((s) => s.things);
  assert.equal(new Set(all).size, all.length);
  for (const s of Object.values(SHAPES)) assert.ok(s.things.length >= 4);
  for (const seed of SEEDS) {
    for (const p of shapesSet(seeded(seed)).pairs) {
      assert.deepEqual(Object.keys(SHAPES).filter((k) => SHAPES[k].things.includes(p.right.thing)), [p.left.shape]);
    }
  }
});

// ---------------------------------------------------------------------------
// Numbers to things

test('numbers: counts up to 9 in rows of five, all four mats at one scale', () => {
  const seen = new Set();
  for (const seed of SEEDS) {
    const set = numbersSet(seeded(seed));
    const counts = set.pairs.map((p) => p.right.count);
    assert.equal(new Set(counts).size, PAIRS, 'one right answer: four different counts');
    assert.equal(new Set(set.pairs.map((p) => p.right.kind)).size, PAIRS);
    counts.forEach((n) => seen.add(n));
    const mats = set.pairs.map((p) => makeGroup(p.right.kind, p.right.count, -1, CARD_GAP));
    const boxes = matViewBoxes(mats);
    const sizes = boxes.map((b) => b.split(' ').slice(2).join(' '));
    assert.equal(new Set(sizes).size, 1, 'every mat in a viewBox of one size');
  }
  assert.equal(seen.size, MAX_COUNT, 'every count from 1 to 9 turns up');
  // 9 things: two rows (5 and 4), and on her screen each thing is still a good size.
  const nine = makeGroup('cup', 9, -1, CARD_GAP);
  assert.equal((nine.svg.match(/class="cnt/g) ?? []).length, 9);
  assert.equal(nine.W, 5 * CELL + 20);
  const { s } = boardFit(1280, 626);
  const fit = Math.min((CARDS.right.w - 20) / nine.W, (CARDS.h - 12) / nine.H);
  assert.ok(CELL * fit * s >= 36, `one thing is ${(CELL * fit * s).toFixed(0)} px`);
});

// ---------------------------------------------------------------------------
// Follow the path

test('follow the path: 8 animals, each with its own home; a board picks 3', () => {
  assert.equal(PATH.animals.length, 8);
  const homes = PATH.animals.map((a) => ANIMALS[a].home);
  assert.equal(new Set(homes).size, 8);
  for (const a of PATH.animals) {
    assert.ok(isInlineSvg(ANIMALS[a].art), a);
    assert.ok(isInlineSvg(HOMES[ANIMALS[a].home]), ANIMALS[a].home);
  }
  for (const seed of SEEDS) {
    const rand = seeded(seed);
    const things = pathThings('path', rand);
    assert.equal(new Set(things).size, 3);
    const { roads } = pathBoard(rand, undefined, things);
    assert.deepEqual(roads.map((r) => r.animal), things);
    assert.deepEqual(roads.map((r) => r.to).sort(), [0, 1, 2], 'one home per road: one right answer');
  }
});

// ---------------------------------------------------------------------------
// Never the last play again

const PLAYS = {
  ...Object.fromEntries(MATCH_GAMES.map((g) => [g, { play: (last, r) => matchPlay(g, last, r), keys: (p) => p.map(setKey), n: SETS_PER_PLAY }])),
  path: { play: (last, r) => pathPlay('path', last, r), keys: (p) => [pathKey(p)], n: 1 },
  'path-rooms': { play: (last, r) => pathPlay('path-rooms', last, r), keys: (p) => [pathKey(p)], n: 1 },
  'sort-colors': { play: (last, r) => sortPlay('sort-colors', last, r), keys: (p) => p.map(sortKey), n: SORT.boards },
  'sort-kinds': { play: (last, r) => sortPlay('sort-kinds', last, r), keys: (p) => p.map(sortKey), n: SORT.boards },
  'odd-kinds': { play: (last, r) => oddPlay('odd-kinds', r, last), keys: (p) => p.map(oddKey), n: ODD.rows },
  'odd-colors': { play: (last, r) => oddPlay('odd-colors', r, last), keys: (p) => p.map(oddKey), n: ODD.rows },
};

test('every game: a play never repeats a set of the play before, nor one of its own', () => {
  for (const [game, g] of Object.entries(PLAYS)) {
    const plays = chain(300, g.play, g.keys, seeded(game.length * 7919));
    let last = [];
    for (const p of plays) {
      const keys = g.keys(p);
      assert.equal(keys.length, g.n, game);
      assert.equal(new Set(keys).size, keys.length, `${game}: a set twice in one play`);
      assert.ok(!keys.some((k) => last.includes(k)), `${game}: a set from the last play`);
      last = keys;
    }
  }
});

test('the key names what a set holds, not where its cards are', () => {
  const a = makeSet('colors', seeded(4));
  const b = { ...a, rows: { left: [...a.rows.left].reverse(), right: [...a.rows.right].reverse() } };
  assert.equal(setKey(a), setKey(b));
  assert.equal(pathKey(['dog', 'bee', 'cow']), pathKey(['cow', 'dog', 'bee']));
});

test('freshPlay redraws a set it has seen, and gives up only if nothing new can be made', () => {
  let i = 0;
  const made = freshPlay(() => ['a', 'a', 'b', 'c'][i++ % 4], (x) => x, 2, ['a']);
  assert.deepEqual(made, ['b', 'c']);
  assert.throws(() => freshPlay(() => 'a', (x) => x, 1, ['a'], 10));
});

test('odd one out rows stay fair with the no-repeat rule', () => {
  for (const seed of SEEDS.slice(0, 60)) {
    for (const game of ['odd-kinds', 'odd-colors']) {
      for (const row of oddPlay(game, seeded(seed), [])) assert.ok(fairRow(row));
    }
  }
});

test('the last play is saved per game; anything broken reads as none', () => {
  const store = new Map();
  const ls = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  assert.deepEqual(readLastPlay('colors', ls), []);
  assert.equal(saveLastPlay('colors', ['a', 'b'], ls), true);
  assert.equal(saveLastPlay('path', ['x'], ls), true);
  assert.deepEqual(readLastPlay('colors', ls), ['a', 'b']);
  assert.deepEqual(readLastPlay('path', ls), ['x']);
  store.set(LAST_PLAY_KEY, '{nope');
  assert.deepEqual(readLastPlay('colors', ls), []);
  assert.equal(saveLastPlay('colors', ['c'], ls), true, 'a broken entry is replaced');
  assert.deepEqual(readLastPlay('colors', ls), ['c']);
  const full = { getItem: () => null, setItem: () => { throw new Error('full'); } };
  assert.equal(saveLastPlay('colors', ['a'], full), false);
});

// ---------------------------------------------------------------------------
// Drawn evenly over many plays

const PLAYS_N = 2000;
const matchPairs = (game, seed) => chain(PLAYS_N, PLAYS[game].play, PLAYS[game].keys, seeded(seed)).flat().flatMap((s) => s.pairs);

test('colors: every color, and every thing within its color, about equally often', () => {
  const pairs = matchPairs('colors', 11);
  assertEven(tally(pairs.map((p) => p.left.color)), Object.keys(COLORS), 0.1, 'colors');
  for (const [c, { things }] of Object.entries(COLORS)) {
    assertEven(tally(pairs.filter((p) => p.left.color === c).map((p) => p.right.thing)), things, 0.15, c);
  }
});

test('letters: every letter, and every picture within its letter, about equally often', () => {
  const pairs = matchPairs('letters', 12);
  assertEven(tally(pairs.map((p) => p.left.letter)), Object.keys(LETTER_WORDS), 0.2, 'letters');
  for (const [l, ids] of Object.entries(LETTER_WORDS)) {
    if (ids.length > 1) assertEven(tally(pairs.filter((p) => p.left.letter === l).map((p) => p.right.object)), ids, 0.3, l);
  }
});

test('shadows, shapes and counts: every one about equally often', () => {
  assertEven(tally(matchPairs('shadows', 13).map((p) => p.left.object)), SHADOW_THINGS, 0.3, 'shadows');
  const shapes = matchPairs('shapes', 14);
  for (const [k, { things }] of Object.entries(SHAPES)) {
    assertEven(tally(shapes.filter((p) => p.left.shape === k).map((p) => p.right.thing)), things, 0.15, k);
  }
  assertEven(tally(matchPairs('numbers', 15).map((p) => p.right.count)), [1, 2, 3, 4, 5, 6, 7, 8, 9], 0.15, 'counts');
});

test('follow the path and Sort it: every animal, piece and thing about equally often', () => {
  const animals = chain(PLAYS_N * 2, PLAYS.path.play, PLAYS.path.keys, seeded(16)).flat();
  assertEven(tally(animals), PATH.animals, 0.15, 'animals');
  const rooms = chain(PLAYS_N, PLAYS['path-rooms'].play, PLAYS['path-rooms'].keys, seeded(17)).flat();
  assertEven(tally(rooms), PATH.furniture, 0.15, 'furniture');
  for (const game of ['sort-colors', 'sort-kinds']) {
    const things = chain(PLAYS_N, PLAYS[game].play, PLAYS[game].keys, seeded(18)).flat().flatMap((b) => b.things);
    for (const [i, basket] of SORT_SETS[game].entries()) {
      assertEven(tally(things.filter((t) => t.basket === i).map((t) => t.id)), basket.things, 0.15, `${game} ${basket.id}`);
    }
  }
});

test('odd one out: every alike-kind and every color turns up in its rows', () => {
  const rows = chain(PLAYS_N, PLAYS['odd-kinds'].play, PLAYS['odd-kinds'].keys, seeded(19)).flat().filter((_, i) => i % ODD.rows);
  const alike = (row) => row.items.find((t, i) => i !== row.odd).kind;
  assertEven(tally(rows.map(alike)), ODD.kindRowKinds, 0.25, 'kind rows');
  const crows = chain(PLAYS_N, PLAYS['odd-colors'].play, PLAYS['odd-colors'].keys, seeded(20)).flat().filter((_, i) => i % ODD.rows);
  assertEven(tally(crows.map((row) => row.items.find((t, i) => i !== row.odd).color)), ['red', 'blue', 'yellow', 'green'], 0.25, 'color rows');
});

// ---------------------------------------------------------------------------
// A plain tap

test('a plain tap: her finger moved no more than 12 px, at any board scale', () => {
  assert.equal(TAP_SLOP_PX, 12);
  for (const s of [0.5, 0.875, 1]) {
    assert.equal(isPlainTap(0, s), true);
    assert.equal(isPlainTap(12 / s, s), true);
    assert.equal(isPlainTap(12 / s + 1, s), false);
  }
});

// ---------------------------------------------------------------------------
// The lunchbox

test('the lunchbox has stripes, not a star', () => {
  const art = object('lunchbox').art;
  assert.ok(!/l8 17 19 2/.test(art), 'no five-pointed star');
  assert.equal((art.match(/<rect x="22" y="\d+" width="156" height="11" fill="#FFD43B"\/>/g) ?? []).length, 2, 'two stripes');
});
