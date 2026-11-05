// Run: node --test tests/games.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THINGS, ROOMS } from '../data/finds.js';
import { COLORS, ANIMALS, HOMES, ROAD_LAYOUTS, LANES, MENU, blob, colorThing } from '../data/games.js';
import {
  GAMES, PAIRS, BOARD, boardFit, CARDS, numbersSet, colorsSet, makeSet, cardsOf, hitCard, distToCard,
  marginUnits, RELEASE_MARGIN_PX, startMatch, dropCard, partnerCard, MATCH_HINT_AFTER,
  PATH, HOME_ORDERS, roadLine, pathBoard, nearestOnLine, onRoad, startsAtAnimal, startTrace, stepTrace,
  startMisses, missRoad, PATH_HINT_AFTER, boardDone, polylineLength, gameLogEntry,
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
const SCREENS = [[1280, 626], [1280, 800], [640, 626]];

// ---- the art ----

test('the Slice 5D games are still on the menu; every picture is inline SVG with nothing from the network', () => {
  for (const id of ['numbers', 'colors', 'path']) assert.ok(GAMES.includes(id), id);
  const all = [...Object.values(MENU), ...Object.keys(COLORS).flatMap((c) => [blob(c), colorThing(c)]),
    ...Object.values(ANIMALS).map((a) => a.art), ...Object.values(HOMES)];
  for (const s of all) {
    assert.ok(s.startsWith('<svg') && s.endsWith('</svg>'));
    assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(s));
  }
  assert.deepEqual(Object.values(ANIMALS).map((a) => a.home), ['hive', 'pond', 'kennel']);
});

test('the colors use the existing red apple, yellow lemon and blue cup', () => {
  assert.equal(COLORS.red.thing, 'apple');
  assert.equal(COLORS.yellow.thing, 'lemon');
  assert.equal(COLORS.blue.thing, 'cup');
  assert.ok(colorThing('red').includes(THINGS.apple.art));
  assert.deepEqual(['green', 'orange', 'purple'].map((c) => COLORS[c].thing), ['leaf', 'orange', 'grapes']);
});

// ---- sizes on her screen ----

test('every card, animal and home is at least 88 px on her screens', () => {
  for (const [w, h] of SCREENS) {
    const { s, left, top } = boardFit(w, h);
    assert.ok(left >= BOARD.left - 1e-9 && left + BOARD.w * s <= w - BOARD.right + 1e-9);
    assert.ok(top >= 0 && top + BOARD.h * s <= h);
    if (w >= 1280) {
      assert.ok(CARDS.left.w * s >= 88 && CARDS.h * s >= 88, `${w}x${h}`);
      assert.ok(120 * s >= 88, 'an animal');
    }
  }
});

// ---- draw a line to match: the sets ----

test('numbers to things: 4 different counts from 1 to 5, 4 different kinds from one room pool', () => {
  for (const seed of SEEDS) {
    const set = numbersSet(seeded(seed));
    const counts = set.pairs.map((p) => p.right.count);
    assert.equal(set.pairs.length, PAIRS);
    assert.equal(new Set(counts).size, 4);
    assert.ok(counts.every((n) => n >= 1 && n <= 5));
    assert.ok(set.pairs.every((p) => p.left.digit === p.right.count));
    const kinds = set.pairs.map((p) => p.right.kind);
    assert.equal(new Set(kinds).size, 4, 'no kind twice');
    assert.ok(Object.values(ROOMS).some((r) => kinds.every((k) => r.pool.includes(k))));
  }
});

test('colors to things: 4 different colors, one object of each, never two of one color', () => {
  for (const seed of SEEDS) {
    const set = colorsSet(seeded(seed));
    const colors = set.pairs.map((p) => p.left.color);
    assert.equal(new Set(colors).size, 4);
    assert.ok(colors.every((c) => COLORS[c]));
    assert.ok(set.pairs.every((p) => p.right.color === p.left.color && p.right.thing === COLORS[p.left.color].thing));
    assert.equal(new Set(set.pairs.map((p) => p.right.thing)).size, 4);
  }
});

test('both columns are shuffled, each shows every pair once, and no row starts out matched', () => {
  for (const game of ['numbers', 'colors']) {
    for (const seed of SEEDS) {
      const { rows } = makeSet(game, seeded(seed));
      assert.deepEqual([...rows.left].sort(), [0, 1, 2, 3]);
      assert.deepEqual([...rows.right].sort(), [0, 1, 2, 3]);
      assert.ok(rows.left.some((p, r) => rows.right[r] !== p));
    }
  }
});

// ---- the drop ----

const set = colorsSet(seeded(7));
const cards = cardsOf(set);
const L = (row) => cards.find((c) => c.side === 'left' && c.row === row);
const R = (row) => cards.find((c) => c.side === 'right' && c.row === row);
const centre = (c) => [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2];

test('hit-test: inside a card is on it; between the columns is on nothing', () => {
  assert.equal(hitCard(centre(R(2)), cards), R(2));
  assert.equal(hitCard([R(2).x0 + 1, R(2).y0 + 1], cards), R(2));
  assert.equal(hitCard([640, 320], cards, marginUnits(boardFit(1280, 626).s)), null);
  assert.equal(distToCard(centre(L(0)), L(0)), 0);
});

test('a release within 40 px of a card counts as on it, and no farther', () => {
  assert.equal(RELEASE_MARGIN_PX, 40);
  for (const [w, h] of SCREENS) {
    const { s } = boardFit(w, h);
    const m = marginUnits(s);
    const c = R(1);
    const y = (c.y0 + c.y1) / 2;
    const at = (px) => [c.x0 - px / s, y]; // px to the left of the card's edge, on her screen
    assert.equal(hitCard(at(0), cards, m), c);
    assert.equal(hitCard(at(39), cards, m), c, `39 px short at ${w}x${h}`);
    assert.equal(hitCard(at(40), cards, m), c, `40 px short at ${w}x${h}`);
    assert.equal(hitCard(at(41), cards, m), null, `41 px short at ${w}x${h}`);
  }
  // Between two cards of a column, the nearer one wins.
  const gapMid = (R(1).y1 + R(2).y0) / 2;
  assert.equal(hitCard([R(1).x0 + 10, gapMid - 2], cards, 40), R(1));
  assert.equal(hitCard([R(1).x0 + 10, gapMid + 2], cards, 40), R(2));
});

test('a drop is right only on the partner on the other side', () => {
  const from = L(0);
  const partner = partnerCard(cards, from);
  assert.equal(partner.side, 'right');
  assert.equal(partner.pair, from.pair);
  let r = dropCard(startMatch(), from, partner);
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.matched, [from.pair]);
  // From the right side to the left works the same way.
  const from2 = R(0);
  r = dropCard(r.state, from2, partnerCard(cards, from2));
  assert.equal(r.ok, from2.pair !== from.pair);
  // A wrong card, its own column, or nothing at all is wrong.
  const wrongRight = cards.find((c) => c.side === 'right' && c.pair !== L(1).pair);
  assert.equal(dropCard(startMatch(), L(1), wrongRight).ok, false);
  assert.equal(dropCard(startMatch(), L(1), L(2)).ok, false);
  assert.equal(dropCard(startMatch(), L(1), null).ok, false);
});

test('a set is done after all 4 pairs; a matched pair cannot be matched again', () => {
  let state = startMatch();
  let done = false;
  for (let row = 0; row < 4; row++) {
    const r = dropCard(state, L(row), partnerCard(cards, L(row)));
    assert.equal(r.ok, true);
    state = r.state;
    done = r.done;
    assert.equal(done, row === 3);
  }
  assert.equal(dropCard(state, L(0), partnerCard(cards, L(0))).ok, false);
});

test('hint: after 3 wrong drops in a row, the partner of the card she last tried wiggles once', () => {
  assert.equal(MATCH_HINT_AFTER, 3);
  const wrong = (from) => cards.find((c) => c.side !== from.side && c.pair !== from.pair);
  let state = startMatch();
  let r = dropCard(state, L(0), wrong(L(0)));
  assert.equal(r.hint, null);
  r = dropCard(r.state, L(1), null);
  assert.equal(r.hint, null);
  r = dropCard(r.state, R(3), wrong(R(3)));
  assert.equal(r.hint, R(3).pair, 'the third wrong drop in a row');
  assert.equal(partnerCard(cards, R(3)).side, 'left');
  // Once only: the count starts again.
  r = dropCard(r.state, L(0), null);
  assert.equal(r.hint, null);
  // A right drop resets the count.
  state = dropCard(startMatch(), L(0), null).state;
  state = dropCard(state, L(0), null).state;
  state = dropCard(state, L(1), partnerCard(cards, L(1))).state;
  assert.equal(state.wrongInRow, 0);
  assert.equal(dropCard(state, L(0), null).hint, null);
});

// ---- follow the path ----

const crossings = (a, b) => {
  let n = 0;
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      const [p, q, r, s] = [a[i - 1], a[i], b[j - 1], b[j]];
      const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
      if (!d) continue;
      const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d;
      const u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) n++;
    }
  }
  return n;
};

test('three road layouts, each with a version for both orders of the homes', () => {
  assert.equal(ROAD_LAYOUTS.length, 3);
  for (const layout of ROAD_LAYOUTS) {
    for (const order of HOME_ORDERS) {
      const roads = layout[order.join('')];
      assert.equal(roads.length, 3);
      roads.forEach((knots, from) => {
        assert.equal(knots[0][0], 0);
        assert.equal(knots.at(-1)[0], 1);
        assert.equal(knots[0][1], [0, 2, 4][from], 'starts at its animal');
        assert.equal(knots.at(-1)[1], [0, 2, 4][order[from]], 'ends at its home');
      });
    }
  }
});

test('every home is in another row than its animal, so the roads cross', () => {
  for (const order of HOME_ORDERS) assert.ok(order.every((to, from) => to !== from));
  for (let layout = 0; layout < 3; layout++) {
    for (const seed of SEEDS.slice(0, 20)) {
      const { roads } = pathBoard(seeded(seed), layout);
      const pairs = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => crossings(roads[a].points, roads[b].points));
      assert.ok(pairs.reduce((a, b) => a + b) >= 2, `layout ${layout}`);
      assert.ok(roads.every((r) => r.points.every(([x, y]) => x >= 0 && x <= BOARD.w && y - PATH.width / 2 >= 0 && y + PATH.width / 2 <= BOARD.h)));
      // Roads only touch at their crossings: never side by side for long.
      for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) {
        const close = roads[a].points.filter((p) => nearestOnLine(p, roads[b].points).dist < PATH.width).length;
        assert.ok(close / roads[a].points.length < 0.2, `layout ${layout}: roads ${a} and ${b} run together`);
      }
    }
  }
});

test('pathBoard picks every layout and both home orders', () => {
  const seen = new Set();
  for (const seed of SEEDS) {
    const b = pathBoard(seeded(seed));
    seen.add(`${b.layout}:${b.homes.join('')}`);
    assert.deepEqual(b.roads.map((r) => r.animal), ['bee', 'duck', 'dog']);
    assert.deepEqual(b.roads.map((r) => r.to), b.homes);
  }
  assert.equal(seen.size, 6);
});

// A simple road for the on-road tests: straight across at y = 320.
const straight = { animal: 'bee', points: roadLine([[0, 2], [1, 2]]) };
straight.length = polylineLength(straight.points);

test('on the road: within half the road width of its centre line', () => {
  const half = PATH.width / 2;
  assert.equal(onRoad([600, LANES[2]], straight), true);
  assert.equal(onRoad([600, LANES[2] + half - 0.5], straight), true);
  assert.equal(onRoad([600, LANES[2] + half], straight), true);
  assert.equal(onRoad([600, LANES[2] - half - 0.5], straight), false);
  assert.equal(onRoad([600, LANES[2] + 200], straight), false);
  // On a real winding road, every centre-line point is on it and a point
  // well off to the side is not.
  const { roads } = pathBoard(seeded(3), 1);
  for (const r of roads) {
    assert.ok(r.points.every((p) => onRoad(p, r)));
    assert.equal(nearestOnLine(r.points[10], r.points).dist, 0);
  }
});

test('a trace starts at the animal and reaches the home along the road', () => {
  assert.equal(startsAtAnimal([PATH.animalX + 20, LANES[2] - 10], straight), true);
  assert.equal(startsAtAnimal([PATH.animalX + 200, LANES[2]], straight), false);
  let state = startTrace();
  let last = null;
  for (let x = PATH.animalX; x <= PATH.homeX; x += 20) {
    last = stepTrace(state, [x, LANES[2] + 15], straight);
    assert.equal(last.on, true);
    state = last.state;
    if (last.done) break;
  }
  assert.equal(last.done, true);
  assert.ok(state.best >= straight.length - PATH.homeReach);
});

test('leaving the road stops the trace; a jump ahead does not count as progress', () => {
  let r = stepTrace(startTrace(), [PATH.animalX + 30, LANES[2]], straight);
  assert.equal(r.on, true);
  const off = stepTrace(r.state, [400, LANES[2] + PATH.width], straight);
  assert.equal(off.on, false);
  assert.equal(off.done, false);
  // Lifting near the start and touching down far along the road (a shortcut): no progress.
  r = stepTrace(r.state, [PATH.homeX - 10, LANES[2]], straight);
  assert.equal(r.on, true);
  assert.equal(r.done, false);
  assert.ok(r.state.best < 100);
});

test('hint: after she leaves the same road 3 times, Jugnu flies it once', () => {
  assert.equal(PATH_HINT_AFTER, 3);
  let m = startMisses();
  let r = missRoad(m, 'bee');
  assert.equal(r.demo, false);
  r = missRoad(r.misses, 'duck');
  assert.equal(r.demo, false);
  r = missRoad(r.misses, 'bee');
  assert.equal(r.demo, false);
  r = missRoad(r.misses, 'bee');
  assert.equal(r.demo, true, 'the third time off the bee road');
  assert.equal(r.misses.bee, 0, 'once: the count starts again');
  assert.equal(r.misses.duck, 1, 'the other roads keep their own count');
  m = r.misses;
  for (let i = 0; i < 2; i++) m = missRoad(m, 'bee').misses;
  assert.equal(missRoad(m, 'bee').demo, true);
});

test('the board is done when every animal is home', () => {
  assert.equal(boardDone(['bee', 'dog']), false);
  assert.equal(boardDone(['dog', 'bee', 'duck']), true);
});

// ---- the log ----

test('a game log entry: type game, the pair or road, right or wrong, ms', () => {
  const now = new Date('2026-11-04T09:00:00Z');
  assert.deepEqual(gameLogEntry({ game: 'colors', set: 2, from: 'red', to: 'apple', ok: true, ms: 812.6, now }),
    { type: 'game', time: '2026-11-04T09:00:00.000Z', game: 'colors', set: 2, from: 'red', to: 'apple', ok: true, ms: 813 });
  assert.deepEqual(gameLogEntry({ game: 'numbers', set: 1, from: '3', to: null, ok: false, ms: 40, now }),
    { type: 'game', time: '2026-11-04T09:00:00.000Z', game: 'numbers', set: 1, from: '3', to: null, ok: false, ms: 40 });
  assert.deepEqual(gameLogEntry({ game: 'path', road: 'duck', ok: false, ms: 5, now }),
    { type: 'game', time: '2026-11-04T09:00:00.000Z', game: 'path', road: 'duck', ok: false, ms: 5 });
});
