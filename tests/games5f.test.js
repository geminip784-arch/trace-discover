// Run: node --test tests/games5f.test.js
// Slice 5F: the games menu in rows, three new match sets (letter to picture,
// thing to its shadow, shape to thing), follow the path set 2 (furniture to
// rooms) and Jugnu's first move. The Slice 5D games keep their tests in
// tests/games.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OBJECTS } from '../data/finds.js';
import {
  MENU, LETTER_WORDS, letterArt, SHADOW_THINGS, shadowArt, objectPicture, SHAPES, SHAPE_THINGS,
  shapeArt, shapeThingArt, FURNITURE, ROOM_IDS, ROOM_HOME, roomArt,
} from '../data/games.js';
import {
  GAME_ROWS, GAMES, MATCH_GAMES, kindOf, PAIRS, makeSet, lettersSet, shadowsSet, shapesSet, cardsOf,
  dropCard, startMatch, partnerCard, showsFirstMove, firstMovePair, PATH, pathThings, pathBoard,
  boardDone, firstMoveRoad, startsAtAnimal, stepTrace, startTrace, gameLogEntry, boardFit,
} from '../src/games.js';
import { navigate, charFile } from '../src/session.js';

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
const chars = JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url)));
const loadChar = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url)));
const isInlineSvg = (s) => s.startsWith('<svg') && s.endsWith('</svg>') && !/https?:\/\/(?!www\.w3\.org)/.test(s);

// ---- the menu ----

test('the menu: a row per kind of game, one tile per set, every id once', () => {
  assert.deepEqual(GAME_ROWS.map((r) => r.kind).slice(0, 2), ['match', 'path']);
  assert.deepEqual(MATCH_GAMES, ['numbers', 'colors', 'letters', 'shadows', 'shapes']);
  assert.deepEqual(GAME_ROWS[1].games, ['path', 'path-rooms']);
  assert.equal(new Set(GAMES).size, GAMES.length);
  assert.ok(GAME_ROWS.every((r) => r.games.length <= 5), 'a row fits across the screen');
  for (const id of GAMES) assert.ok(isInlineSvg(MENU[id]), `${id} has its tile picture`);
  assert.equal(kindOf('shapes'), 'match');
  assert.equal(kindOf('path-rooms'), 'path');
  assert.equal(kindOf('chess'), null);
});

test('every menu tile opens its own game (so each earns its own star)', () => {
  for (const game of GAMES) {
    const sets = { screen: 'games', kind: kindOf(game) };
    assert.deepEqual(navigate(sets, { type: 'openGame', game }), { screen: 'play', game });
  }
});

// ---- letter to picture ----

test('letter to picture: every letter with find pictures, each picture\'s word starting with its letter', () => {
  assert.deepEqual(Object.keys(LETTER_WORDS).sort().join(''), 'ABCDEFGHIJKLMNOPQRSTUVWYZ', 'every letter but X');
  for (const [letter, ids] of Object.entries(LETTER_WORDS)) {
    assert.ok(chars.includes(letter), `${letter} has a character file`);
    for (const id of ids) {
      const o = OBJECTS.find((x) => x.id === id);
      assert.ok(o, id);
      assert.equal(o.letter, letter);
      assert.equal(o.word[0].toUpperCase(), letter);
      assert.notEqual(o.finds, false, `${id} is kept out`);
    }
  }
  assert.deepEqual(LETTER_WORDS.E, ['egg', 'elephant', 'envelope'], 'no eraser');
});

test('letter sets: 4 different letters, each with one of its own pictures', () => {
  for (const seed of SEEDS) {
    const set = lettersSet(seeded(seed));
    assert.equal(set.pairs.length, PAIRS);
    assert.equal(new Set(set.pairs.map((p) => p.left.letter)).size, PAIRS);
    for (const p of set.pairs) assert.ok(LETTER_WORDS[p.left.letter].includes(p.right.object));
  }
});

test('a letter card is drawn from her letter file: one line per stroke, no text', () => {
  for (const id of Object.keys(LETTER_WORDS)) {
    const ch = loadChar(id);
    const art = letterArt(ch);
    assert.ok(isInlineSvg(art), id);
    assert.ok(!/<text/.test(art));
    assert.equal((art.match(/<polyline/g) ?? []).length, ch.strokes.filter((st) => st.kind === 'line').length, id);
  }
});

// ---- thing to its shadow ----

test('shadow sets: 4 different things, each with its own shadow', () => {
  for (const id of SHADOW_THINGS) assert.ok(OBJECTS.some((o) => o.id === id), id);
  for (const seed of SEEDS) {
    const set = shadowsSet(seeded(seed));
    assert.equal(new Set(set.pairs.map((p) => p.left.object)).size, PAIRS);
    for (const p of set.pairs) assert.equal(p.right.shadow, p.left.object);
  }
});

test('a shadow is the same art, every color turned to one dark grey', () => {
  for (const id of SHADOW_THINGS) {
    const art = objectPicture(id);
    const sh = shadowArt(id);
    assert.ok(isInlineSvg(sh));
    const body = art.replace(/^<svg[^>]*>|<\/svg>$/g, '');
    assert.ok(sh.includes(`<g filter="url(#td-shadow)">${body}</g>`), `${id}: the same drawing inside`);
    assert.match(sh, /feColorMatrix type="matrix" values="0 0 0 0 0.29 {2}0 0 0 0 0.31 {2}0 0 0 0 0.36 {2}0 0 0 1 0"/,
      'every color to #4A4F5C, the outline (alpha) kept');
  }
});

// ---- shape to thing ----

test('shape sets: all four shapes, each once, with one of its own things', () => {
  const seen = new Set();
  for (const seed of SEEDS) {
    const set = shapesSet(seeded(seed));
    assert.deepEqual(set.pairs.map((p) => p.left.shape).sort(), ['circle', 'rectangle', 'square', 'triangle']);
    for (const p of set.pairs) {
      assert.ok(SHAPES[p.left.shape].things.includes(p.right.thing));
      seen.add(p.right.thing);
    }
  }
  assert.equal(seen.size, Object.values(SHAPES).flatMap((x) => x.things).length, 'every thing turns up');
  for (const x of Object.values(SHAPES)) assert.ok(x.things.length >= 4, 'at least 4 things per shape');
});

// The bounding box of everything drawn (absolute coordinates only), and the
// outline element's own kind and box.
function measure(art) {
  const xs = [];
  const ys = [];
  const add = (x, y) => { xs.push(x); ys.push(y); };
  const num = (tag, a) => Number(tag.match(new RegExp(`\\s${a}="(-?[\\d.]+)"`))[1]);
  const pts = (str) => str.trim().split(/\s+/).map((p) => p.split(',').map(Number));
  let outline = null;
  for (const [tag, name] of art.matchAll(/<(rect|circle|ellipse|polygon|line|path)\b[^>]*>/g)) {
    let box;
    if (name === 'rect') box = [num(tag, 'x'), num(tag, 'y'), num(tag, 'x') + num(tag, 'width'), num(tag, 'y') + num(tag, 'height')];
    if (name === 'circle') box = [num(tag, 'cx') - num(tag, 'r'), num(tag, 'cy') - num(tag, 'r'), num(tag, 'cx') + num(tag, 'r'), num(tag, 'cy') + num(tag, 'r')];
    if (name === 'ellipse') box = [num(tag, 'cx') - num(tag, 'rx'), num(tag, 'cy') - num(tag, 'ry'), num(tag, 'cx') + num(tag, 'rx'), num(tag, 'cy') + num(tag, 'ry')];
    if (name === 'line') box = [Math.min(num(tag, 'x1'), num(tag, 'x2')), Math.min(num(tag, 'y1'), num(tag, 'y2')), Math.max(num(tag, 'x1'), num(tag, 'x2')), Math.max(num(tag, 'y1'), num(tag, 'y2'))];
    let poly = null;
    if (name === 'polygon') poly = pts(tag.match(/points="([^"]+)"/)[1]);
    if (name === 'path') {
      const d = tag.match(/\sd="([^"]+)"/)[1];
      assert.match(d, /^[MQLC\d\s.,-]+$/, 'absolute commands only');
      const n = d.match(/-?[\d.]+/g).map(Number);
      poly = [];
      for (let i = 0; i < n.length; i += 2) poly.push([n[i], n[i + 1]]);
    }
    if (poly) box = [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))];
    add(box[0], box[1]);
    add(box[2], box[3]);
    if (/class="outline"/.test(tag)) outline = { name, box, corners: poly ? poly.length : null };
  }
  assert.ok(outline, 'one outline element');
  return { all: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], outline };
}

// Which shape an outline's proportions fit; null if none.
function shapeOf({ name, box, corners }) {
  const w = box[2] - box[0];
  const h = box[3] - box[1];
  if (name === 'circle') return 'circle';
  if (name === 'polygon' && corners === 3) return w / h >= 0.8 && w / h <= 1.4 ? 'triangle' : null;
  if (name === 'rect') {
    if (Math.abs(w / h - 1) <= 0.05) return 'square';
    if (h / w >= 1.5) return 'rectangle';
  }
  return null;
}

test('each shape and each thing fits only its own shape: outline proportions, nothing sticking out', () => {
  for (const shape of Object.keys(SHAPES)) {
    const s = measure(shapeArt(shape));
    assert.equal(shapeOf(s.outline), shape, `the ${shape} card`);
    for (const thing of SHAPES[shape].things) {
      const art = SHAPE_THINGS[thing];
      const m = measure(art);
      assert.equal(shapeOf(m.outline), shape, `${thing} reads as a ${shape}`);
      m.all.forEach((v, i) => assert.ok(Math.abs(v - m.outline.box[i]) <= 1, `${thing}: everything stays inside its ${shape}`));
      assert.ok(isInlineSvg(shapeThingArt(thing)));
    }
  }
  // Clear differences: a square is square; a rectangle (the book, the door) is
  // clearly taller than wide; a roof and a pizza slice are triangles.
  const ratio = (t) => { const b = measure(SHAPE_THINGS[t]).outline.box; return (b[3] - b[1]) / (b[2] - b[0]); };
  assert.equal(ratio('window'), 1);
  assert.equal(ratio('block'), 1);
  assert.ok(ratio('door') >= 1.5 && ratio('book') >= 1.5);
  assert.equal(measure(SHAPE_THINGS.roof).outline.corners, 3);
  assert.equal(measure(SHAPE_THINGS.slice).outline.corners, 3);
});

// ---- every match set plays the same way ----

test('every match set: 4 pairs, each card has one partner, a set is done after 4', () => {
  for (const game of MATCH_GAMES) {
    for (const seed of SEEDS.slice(0, 40)) {
      const set = makeSet(game, seeded(seed));
      assert.equal(set.pairs.length, PAIRS);
      assert.equal(new Set(set.pairs.map((p) => p.left.label)).size, PAIRS, `${game}: labels differ`);
      assert.equal(new Set(set.pairs.map((p) => p.right.label)).size, PAIRS);
      assert.ok(set.rows.right.some((v, k) => v !== set.rows.left[k]), 'not already matched straight across');
      const cards = cardsOf(set);
      let st = startMatch();
      let r;
      for (const c of cards.filter((x) => x.side === 'left')) {
        r = dropCard(st, c, partnerCard(cards, c));
        assert.ok(r.ok);
        st = r.state;
      }
      assert.ok(r.done, game);
    }
  }
});

// ---- Jugnu shows the first move ----

test('Jugnu shows the first move on the first set only: the top left card to its partner', () => {
  assert.equal(showsFirstMove(1), true);
  assert.equal(showsFirstMove(2), false);
  assert.equal(showsFirstMove(3), false);
  for (const game of MATCH_GAMES) {
    const set = makeSet(game, seeded(7));
    const pair = firstMovePair(set);
    const cards = cardsOf(set);
    const from = cards.find((c) => c.side === 'left' && c.row === 0);
    assert.equal(from.pair, pair);
    const r = dropCard(startMatch(), from, partnerCard(cards, from));
    assert.ok(r.ok && !r.done, 'his move counts as matched; three pairs are left for her');
    assert.equal(r.state.wrongInRow, 0);
  }
});

// ---- follow the path, set 2: furniture to rooms ----

test('furniture to rooms: bed, stove, bathtub, sofa to bedroom, kitchen, bathroom, living room', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(FURNITURE).map(([k, f]) => [k, f.home])),
    { bed: 'bedroom', stove: 'kitchen', bathtub: 'bathroom', sofa: 'living' });
  assert.deepEqual(ROOM_IDS.sort(), ['bathroom', 'bedroom', 'kitchen', 'living']);
  for (const room of ROOM_IDS) assert.ok(isInlineSvg(roomArt(room)), room);
  for (const f of Object.values(FURNITURE)) assert.ok(isInlineSvg(f.art));
});

test('a furniture board: three different pieces, each on its own road to its room', () => {
  const seen = new Set();
  for (const seed of SEEDS) {
    const rand = seeded(seed);
    const things = pathThings('path-rooms', rand);
    assert.equal(things.length, 3);
    assert.equal(new Set(things).size, 3);
    assert.ok(things.every((t) => PATH.furniture.includes(t)));
    things.forEach((t) => seen.add(t));
    const { roads } = pathBoard(rand, undefined, things);
    assert.deepEqual(roads.map((r) => r.animal), things);
    assert.deepEqual(roads.map((r) => r.to).sort(), [0, 1, 2]);
    assert.ok(roads.every((r) => r.to !== r.from), 'the roads cross');
  }
  assert.equal(seen.size, 4, 'every piece turns up');
  const animals = pathThings('path', seeded(1));
  assert.equal(new Set(animals).size, 3);
  assert.ok(animals.every((a) => PATH.animals.includes(a)), 'set 1: three of its animals');
});

test('a furniture road plays like an animal road; the board is done when all three are home', () => {
  const things = ['sofa', 'bed', 'bathtub'];
  const { roads } = pathBoard(seeded(3), 0, things);
  const r = roads[1];
  assert.ok(startsAtAnimal(r.points[0], r));
  let st = startTrace();
  let step;
  for (const p of r.points) {
    step = stepTrace(st, p, r);
    st = step.state;
  }
  assert.ok(step.done);
  assert.equal(boardDone(['sofa', 'bed'], things), false);
  assert.equal(boardDone(['bathtub', 'sofa', 'bed'], things), true);
  assert.equal(firstMoveRoad(roads), roads[0], 'Jugnu flies the top road first');
});

test('a room picture is at least 88 px tall and fits on the board', () => {
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    const { s } = boardFit(w, h);
    assert.ok(ROOM_HOME.h * s >= 88 && ROOM_HOME.w * s >= 88);
  }
  assert.ok(PATH.homeX + 10 + ROOM_HOME.w / 2 <= 1280 - 12, 'inside the board frame');
});

// ---- the log ----

test('new games log as the existing "game" entry, with the game id', () => {
  const now = new Date('2026-11-05T09:00:00Z');
  assert.deepEqual(gameLogEntry({ game: 'letters', set: 1, from: 'E', to: 'egg', ok: true, ms: 900, now }),
    { type: 'game', time: '2026-11-05T09:00:00.000Z', game: 'letters', set: 1, from: 'E', to: 'egg', ok: true, ms: 900 });
  assert.deepEqual(gameLogEntry({ game: 'shadows', set: 2, from: 'hat', to: 'fan-shadow', ok: false, ms: 10, now }),
    { type: 'game', time: '2026-11-05T09:00:00.000Z', game: 'shadows', set: 2, from: 'hat', to: 'fan-shadow', ok: false, ms: 10 });
  assert.deepEqual(gameLogEntry({ game: 'shapes', set: 3, from: 'circle', to: null, ok: false, ms: 10, now }),
    { type: 'game', time: '2026-11-05T09:00:00.000Z', game: 'shapes', set: 3, from: 'circle', to: null, ok: false, ms: 10 });
  assert.deepEqual(gameLogEntry({ game: 'path-rooms', road: 'bathtub', ok: true, ms: 10, now }),
    { type: 'game', time: '2026-11-05T09:00:00.000Z', game: 'path-rooms', road: 'bathtub', ok: true, ms: 10 });
});
