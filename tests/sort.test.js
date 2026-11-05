// Run: node --test tests/sort.test.js
// Sort it: the sets, the boards, where things and baskets sit, the drop rules,
// the hint, Jugnu's first move and the log. The color set is checked against
// every color actually drawn in each thing's picture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SORT_SETS, sortThingArt, basketArt, MENU } from '../data/games.js';
import { PICTURES } from '../data/drawings.js';
import {
  GAME_ROWS, SORT, sortBoard, thingHome, basketBoxes, hitBasket, hitThing, basketSlot, startSort, dropThing,
  firstMoveThing, showsFirstMove, marginUnits, RELEASE_MARGIN_PX, boardFit, BOARD, gameLogEntry,
} from '../src/games.js';

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
const GAMES = Object.keys(SORT_SETS);
const isInlineSvg = (s) => s.startsWith('<svg') && s.endsWith('</svg>') && !/https?:\/\/(?!www\.w3\.org)/.test(s);

// ---- reading the colors drawn in a picture ----

function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}
// A real color (not white, grey, near-black ink or a pale tint).
const chromatic = (hex) => { const c = hsl(hex); return c.s >= 0.4 && c.l >= 0.2 && c.l <= 0.85; };
const HUES = { red: (h) => h <= 15 || h >= 345, blue: (h) => h >= 195 && h <= 250 };

// The bounding box of a path, walking its commands (absolute and relative).
function pathBox(d) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  const ARGS = { m: 2, l: 2, h: 1, v: 1, q: 4, c: 6, s: 4, t: 2, a: 7, z: 0 };
  let x = 0; let y = 0; let sx = 0; let sy = 0;
  const xs = []; const ys = [];
  let cmd = null;
  let i = 0;
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) { cmd = toks[i++]; if (cmd.toLowerCase() === 'z') { x = sx; y = sy; continue; } }
    const lc = cmd.toLowerCase();
    const rel = cmd === lc;
    const n = toks.slice(i, i + ARGS[lc]).map(Number);
    i += ARGS[lc];
    const pts = [];
    if (lc === 'h') pts.push([rel ? x + n[0] : n[0], y]);
    else if (lc === 'v') pts.push([x, rel ? y + n[0] : n[0]]);
    else if (lc === 'a') pts.push([rel ? x + n[5] : n[5], rel ? y + n[6] : n[6]]);
    else for (let k = 0; k < n.length; k += 2) pts.push([rel ? x + n[k] : n[k], rel ? y + n[k + 1] : n[k + 1]]);
    for (const p of pts) { xs.push(p[0]); ys.push(p[1]); }
    [x, y] = pts[pts.length - 1];
    if (lc === 'm') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
  }
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

// Every element's colors, with a rough area for each filled shape.
function colorsOf(art) {
  const out = [];
  for (const [tag, name] of art.matchAll(/<(rect|circle|ellipse|polygon|path|line)\b[^>]*>/g)) {
    const attr = (a) => tag.match(new RegExp(`\\s${a}="([^"]+)"`))?.[1];
    const num = (a) => Number(attr(a));
    let area = 0;
    if (name === 'rect') area = num('width') * num('height');
    if (name === 'circle') area = Math.PI * num('r') ** 2;
    if (name === 'ellipse') area = Math.PI * num('rx') * num('ry');
    if (name === 'polygon') {
      const p = attr('points').trim().split(/[\s,]+/).map(Number);
      for (let k = 0; k < p.length; k += 2) area += (p[k] * p[(k + 3) % p.length] - p[(k + 2) % p.length] * p[k + 1]) / 2;
      area = Math.abs(area);
    }
    if (name === 'path') area = pathBox(attr('d'));
    for (const key of ['fill', 'stroke']) {
      const c = attr(key);
      if (c && /^#[0-9a-fA-F]{6}$/.test(c)) out.push({ color: c, area: key === 'fill' ? area : 0 });
    }
    // A <g fill="..."> around it is counted on the group itself.
  }
  for (const m of art.matchAll(/<g\b[^>]*\sfill="(#[0-9a-fA-F]{6})"/g)) out.push({ color: m[1], area: 0 });
  return out;
}

// A color-set thing is really its basket's color: its biggest colored shape is
// that color, and nothing drawn in it is the other basket's color.
function colorCheck(art, own, other) {
  const cs = colorsOf(art).filter((c) => chromatic(c.color));
  const biggest = cs.reduce((a, c) => (c.area > a.area ? c : a), { area: -1 });
  return {
    biggest: biggest.color,
    biggestIsOwn: HUES[own](hsl(biggest.color).h),
    otherColors: cs.filter((c) => HUES[other](hsl(c.color).h)).map((c) => c.color),
  };
}

// ---- the sets ----

test('Sort it has its own menu row: red or blue, fruit or toys', () => {
  const row = GAME_ROWS.find((r) => r.kind === 'sort');
  assert.deepEqual(row.games, ['sort-colors', 'sort-kinds']);
  assert.deepEqual(GAMES, ['sort-colors', 'sort-kinds']);
  for (const g of GAMES) assert.ok(isInlineSvg(MENU[g]), g);
  assert.deepEqual(SORT_SETS['sort-colors'].map((b) => b.id), ['red', 'blue']);
  assert.deepEqual(SORT_SETS['sort-kinds'].map((b) => b.id), ['fruit', 'toys']);
});

test('every basket: a sample on its front that is never on the board, and at least 4 things to pick 3 from', () => {
  for (const g of GAMES) {
    const [a, b] = SORT_SETS[g];
    for (const basket of [a, b]) {
      assert.ok(basket.things.length >= SORT.perBasket + 1, `${g} ${basket.id}: some variety`);
      assert.ok(!basket.things.includes(basket.sample), `${basket.id}: the sample is not on the board`);
      assert.ok(isInlineSvg(basketArt(basket.sample)));
      for (const id of [basket.sample, ...basket.things]) assert.ok(isInlineSvg(sortThingArt(id)), id);
    }
    assert.ok(a.things.every((t) => !b.things.includes(t) && t !== b.sample), `${g}: nothing could go in both`);
    assert.ok(b.things.every((t) => t !== a.sample));
  }
  assert.ok(!SORT_SETS['sort-kinds'][0].things.includes('tomato'), 'no arguing about tomatoes');
});

test('every red or blue thing is really that color, read from its own picture', () => {
  const [red, blue] = SORT_SETS['sort-colors'];
  for (const [basket, other] of [[red, 'blue'], [blue, 'red']]) {
    for (const id of [basket.sample, ...basket.things]) {
      const r = colorCheck(sortThingArt(id), basket.id, other);
      assert.ok(r.biggestIsOwn, `${id}: its biggest shape is ${r.biggest}, not ${basket.id}`);
      assert.deepEqual(r.otherColors, [], `${id}: has ${other} in it`);
    }
  }
});

test('the color check would catch a red car in the blue basket, or a blue one in the red', () => {
  const carSvg = (body, edge) => `<svg viewBox="0 0 100 100">${PICTURES.car.art.replaceAll('#4D96FF', body).replaceAll('#2F74D9', edge)}</svg>`;
  const red = colorCheck(carSvg('#FF4D4D', '#D93636'), 'blue', 'red');
  assert.equal(red.biggestIsOwn, false);
  assert.ok(red.otherColors.length > 0);
  const drawingCar = colorCheck(`<svg>${PICTURES.car.art}</svg>`, 'blue', 'red');
  assert.equal(drawingCar.biggestIsOwn, true, 'the Drawing book car is blue');
  assert.deepEqual(drawingCar.otherColors, [], 'its pink tail light is not counted as red...');
  const sortCar = colorCheck(sortThingArt('car'), 'blue', 'red');
  assert.ok(sortCar.biggestIsOwn && sortCar.otherColors.length === 0, '...and the sort car has no pink at all');
  assert.ok(!sortThingArt('car').includes('#FF8FB8'));
  // And the red ball the other way round.
  assert.equal(colorCheck(sortThingArt('ball'), 'blue', 'red').biggestIsOwn, false);
});

// ---- the boards ----

test('a board: 6 things, 3 for each basket, all different, in a shuffled row', () => {
  for (const g of GAMES) {
    const seen = new Set();
    let mixed = false;
    for (const seed of SEEDS) {
      const b = sortBoard(g, seeded(seed));
      assert.equal(b.things.length, 6);
      assert.deepEqual(b.things.map((t) => t.spot), [0, 1, 2, 3, 4, 5]);
      assert.equal(new Set(b.things.map((t) => t.id)).size, 6);
      for (const k of [0, 1]) {
        const mine = b.things.filter((t) => t.basket === k);
        assert.equal(mine.length, 3);
        assert.ok(mine.every((t) => SORT_SETS[g][k].things.includes(t.id)));
        assert.ok(b.things.every((t) => t.id !== SORT_SETS[g][k].sample), 'no sample on the board');
      }
      assert.deepEqual(b.baskets, SORT_SETS[g].map(({ id, sample }) => ({ id, sample })));
      b.things.forEach((t) => seen.add(t.id));
      if (b.things.slice(0, 3).some((t) => t.basket !== b.things[0].basket)) mixed = true;
    }
    assert.equal(seen.size, SORT_SETS[g].reduce((n, k) => n + k.things.length, 0), `${g}: every thing turns up`);
    assert.ok(mixed, 'the two kinds are mixed along the row');
  }
});

test('things and baskets fit the board, never overlap, and are at least 88 px', () => {
  const boxes = basketBoxes();
  assert.ok(boxes[0].x1 < boxes[1].x0, 'the baskets are apart');
  for (const bx of boxes) assert.ok(bx.x0 >= 12 && bx.x1 <= BOARD.w - 12 && bx.y0 >= 12 && bx.y1 <= BOARD.h);
  const h = SORT.size / 2;
  SORT.row.xs.forEach((x, i) => {
    assert.ok(x - h >= 12 && x + h <= BOARD.w - 12);
    if (i > 0) assert.ok(x - SORT.row.xs[i - 1] >= SORT.size + 20, 'room between things');
    assert.ok(SORT.row.y + h < Math.min(...boxes.map((bx) => bx.y0)) - 40, 'the row is clear of the baskets');
  });
  for (const [w, hh] of [[1280, 626], [1280, 800]]) {
    const { s } = boardFit(w, hh);
    assert.ok(SORT.size * s >= 88, `a thing: ${SORT.size * s} px`);
    assert.ok(SORT.basket * s >= 88);
  }
  for (const k of [0, 1]) {
    for (let n = 0; n < SORT.perBasket; n++) {
      const [x, y] = basketSlot(k, n);
      assert.ok(x > boxes[k].x0 && x < boxes[k].x1 && y > boxes[k].y0 && y < boxes[k].y1, 'a thing sits in its basket');
    }
  }
});

// ---- dropping ----

test('a release lands on a basket inside it or within 40 px, never farther', () => {
  const [left, right] = SORT.baskets;
  assert.equal(hitBasket([left.x, left.y]), 0);
  assert.equal(hitBasket([right.x, right.y]), 1);
  assert.equal(hitBasket([(left.x + right.x) / 2, left.y]), null, 'between the baskets');
  assert.equal(hitBasket([640, 140]), null, 'up in the row');
  const s = boardFit(1280, 626).s;
  const m = marginUnits(s);
  const edge = basketBoxes()[0].x0;
  assert.equal(hitBasket([edge - (RELEASE_MARGIN_PX - 1) / s, left.y], m), 0);
  assert.equal(hitBasket([edge - (RELEASE_MARGIN_PX + 1) / s, left.y], m), null);
});

test('she can pick up a waiting thing, never one already in a basket', () => {
  const b = sortBoard('sort-kinds', seeded(5));
  const t = b.things[2];
  assert.equal(hitThing(thingHome(t), b.things, []), t);
  assert.equal(hitThing(thingHome(t), b.things, [t.spot]), null);
  assert.equal(hitThing([640, 300], b.things, []), null);
});

test('the right basket keeps the thing; a wrong one sends it back; away from both is not a try', () => {
  const b = sortBoard('sort-colors', seeded(9));
  const t = b.things[0];
  const wrong = 1 - t.basket;
  let r = dropThing(startSort(), t, wrong);
  assert.deepEqual([r.ok, r.counted, r.hint, r.done], [false, true, null, false]);
  assert.equal(r.state.wrongInRow, 1);
  r = dropThing(r.state, t, null);
  assert.deepEqual([r.ok, r.counted], [false, false]);
  assert.equal(r.state.wrongInRow, 1, 'letting go away from both does not count');
  r = dropThing(r.state, t, t.basket);
  assert.equal(r.ok, true);
  assert.equal(r.state.wrongInRow, 0);
  assert.deepEqual(r.state.placed, [t.spot]);
  const again = dropThing(r.state, t, t.basket);
  assert.equal(again.ok, false, 'a thing in a basket cannot be dropped again');
});

test('hint: after 3 wrong baskets in a row, the right basket wiggles once', () => {
  const b = sortBoard('sort-kinds', seeded(11));
  const [t, u] = b.things;
  let st = startSort();
  let r = dropThing(st, t, 1 - t.basket);
  r = dropThing(r.state, u, null); // away: not a try, does not break the run
  r = dropThing(r.state, u, 1 - u.basket);
  assert.equal(r.hint, null);
  r = dropThing(r.state, t, 1 - t.basket);
  assert.equal(r.hint, t.basket, 'the right basket for the thing she just tried');
  assert.equal(r.state.wrongInRow, 0, 'once: the count starts again');
  r = dropThing(r.state, t, 1 - t.basket);
  assert.equal(r.hint, null);
  st = dropThing(dropThing(startSort(), t, 1 - t.basket).state, t, 1 - t.basket).state;
  st = dropThing(st, u, u.basket).state; // a right one breaks the run
  assert.equal(dropThing(st, t, 1 - t.basket).hint, null);
});

test('a board is done when all 6 are in their baskets; two boards make a play', () => {
  assert.equal(SORT.boards, 2);
  const b = sortBoard('sort-colors', seeded(13));
  let st = startSort();
  let r;
  for (const t of b.things) {
    r = dropThing(st, t, t.basket);
    st = r.state;
    assert.equal(r.done, st.placed.length === 6);
  }
  assert.ok(r.done);
});

test('Jugnu carries the leftmost thing on the first board only, and it counts as sorted', () => {
  const b = sortBoard('sort-kinds', seeded(17));
  const t = firstMoveThing(b);
  assert.equal(t.spot, 0);
  assert.equal(showsFirstMove(1), true);
  assert.equal(showsFirstMove(2), false);
  const r = dropThing(startSort(), t, t.basket);
  assert.ok(r.ok && !r.done, 'five are left for her');
});

// ---- the log ----

test('Sort it logs as the existing "game" entry: board, thing, basket, right or wrong', () => {
  const now = new Date('2026-11-05T09:00:00Z');
  assert.deepEqual(gameLogEntry({ game: 'sort-colors', set: 1, from: 'car', to: 'red', ok: false, ms: 1500.4, now }),
    { type: 'game', time: '2026-11-05T09:00:00.000Z', game: 'sort-colors', set: 1, from: 'car', to: 'red', ok: false, ms: 1500 });
  assert.deepEqual(gameLogEntry({ game: 'sort-kinds', set: 2, from: 'banana', to: 'fruit', ok: true, ms: 9, now }),
    { type: 'game', time: '2026-11-05T09:00:00.000Z', game: 'sort-kinds', set: 2, from: 'banana', to: 'fruit', ok: true, ms: 9 });
  assert.deepEqual(gameLogEntry({ game: 'sort-kinds', set: 2, from: 'top', to: null, ok: false, ms: 9, now }),
    { type: 'game', time: '2026-11-05T09:00:00.000Z', game: 'sort-kinds', set: 2, from: 'top', to: null, ok: false, ms: 9 });
});
