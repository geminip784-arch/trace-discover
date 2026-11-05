// games.js — pure functions only. No DOM, no storage, no audio.
// The rules of the games book (Slices 5D and 5F): the menu's rows, the match sets, where cards sit, the
// release hit-test, the hints, the roads of follow the path, the on-road check,
// completion and the attempt-log entry. match.js and path.js put them on screen.
// Every random choice takes `rand` (Math.random by default) so tests can repeat it.
//
// Layout units: every game is drawn on a board 1280 x 640 units. The board is
// scaled to fit the screen right of the button column (boardFit), so cards,
// lines and traces are all kept in units and stay put when the screen changes.

import { ROOMS, THINGS } from '../data/finds.js';
import {
  COLORS, ROAD_LAYOUTS, LANES, LETTER_PICTURES, SHADOW_THINGS, SHAPES, FURNITURE, SORT_SETS,
} from '../data/games.js';
import { shuffle, groupWord } from './finds.js';

// The menu: one row of picture tiles per kind of game, one tile per set. Each
// tile is its own game: it earns its own star and its id goes in the log.
export const GAME_ROWS = [
  { kind: 'match', games: ['numbers', 'colors', 'letters', 'shadows', 'shapes'] },
  { kind: 'path', games: ['path', 'path-rooms'] },
  { kind: 'sort', games: ['sort-colors', 'sort-kinds'] },
];
export const GAMES = GAME_ROWS.flatMap((r) => r.games);
export const MATCH_GAMES = GAME_ROWS.find((r) => r.kind === 'match').games;
export const kindOf = (game) => GAME_ROWS.find((r) => r.games.includes(game))?.kind ?? null;

// Jugnu shows the first move on the first set of every game, then she carries on.
export const FIRST_MOVE_DELAY_MS = 700;
export const showsFirstMove = (setNo) => setNo === 1;
export const SETS_PER_PLAY = 3;   // match games: three sets of 4 make one play
export const PAIRS = 4;
export const RELEASE_MARGIN_PX = 40; // a release this close to a card counts as on it
export const MATCH_HINT_AFTER = 3;   // wrong drops in a row, then the right partner wiggles
export const PATH_HINT_AFTER = 3;    // times off the same road, then Jugnu flies it

const pick = (list, rand) => list[Math.floor(rand() * list.length)];

// ---------------------------------------------------------------------------
// The board on screen (CSS px)

export const BOARD = { w: 1280, h: 640, left: 136, right: 24, top: 16, bottom: 16 };

// The board fits the space right of the buttons, centred: s px per unit.
export function boardFit(w, h, b = BOARD) {
  const s = Math.min((w - b.left - b.right) / b.w, (h - b.top - b.bottom) / b.h);
  return { s, left: b.left + (w - b.left - b.right - b.w * s) / 2, top: b.top + (h - b.top - b.bottom - b.h * s) / 2 };
}

// ---------------------------------------------------------------------------
// Draw a line to match

// Where the cards sit, in units: two columns of 4. The right cards are wider,
// so a placemat group fits.
export const CARDS = {
  left: { x: 300, w: 230 },
  right: { x: 960, w: 330 },
  h: 136,
  rows: [88, 236, 384, 532],
};

// A shuffled order of 0..n-1 that is not straight across from `other`
// (so no row starts out already matched).
function shuffledApart(n, other, rand) {
  for (let i = 0; i < 20; i++) {
    const order = shuffle([...Array(n).keys()], rand);
    if (!other || order.some((v, k) => v !== other[k])) return order;
  }
  return [...Array(n).keys()].reverse();
}

// Numbers to things: 4 different counts from 1 to 5, each with a different
// kind of thing from one room's pool. pair: { key, left: { digit }, right: { kind, count } }.
export function numbersSet(rand = Math.random) {
  const room = pick(Object.values(ROOMS).filter((r) => r.pool.length >= PAIRS), rand);
  const kinds = shuffle(room.pool, rand).slice(0, PAIRS);
  const counts = shuffle([1, 2, 3, 4, 5], rand).slice(0, PAIRS);
  const pairs = counts.map((n, i) => ({
    key: String(n),
    left: { digit: n, label: String(n) },
    right: { kind: kinds[i], count: n, label: groupWord(kinds[i], n) },
  }));
  return withOrder(pairs, rand);
}

// Colors to things: 4 of the 6 colors, each with its one object.
export function colorsSet(rand = Math.random) {
  const colors = shuffle(Object.keys(COLORS), rand).slice(0, PAIRS);
  const pairs = colors.map((c) => ({
    key: c,
    left: { color: c, label: c },
    right: { color: c, thing: COLORS[c].thing, label: COLORS[c].thing },
  }));
  return withOrder(pairs, rand);
}

// Both columns shuffled: rows.left[r] / rows.right[r] is the pair shown in row r.
function withOrder(pairs, rand) {
  const left = shuffle([...pairs.keys()], rand);
  return { pairs, rows: { left, right: shuffledApart(pairs.length, left, rand) } };
}

// Letter to picture: 4 of the recorded letters, each with its one object.
export function lettersSet(rand = Math.random) {
  const letters = shuffle(Object.keys(LETTER_PICTURES), rand).slice(0, PAIRS);
  const pairs = letters.map((l) => ({
    key: l,
    left: { letter: l, label: l },
    right: { object: LETTER_PICTURES[l], label: LETTER_PICTURES[l] },
  }));
  return withOrder(pairs, rand);
}

// Thing to its shadow: 4 different things; the right column shows their shadows.
export function shadowsSet(rand = Math.random) {
  const things = shuffle(SHADOW_THINGS, rand).slice(0, PAIRS);
  const pairs = things.map((t) => ({
    key: t,
    left: { object: t, label: t },
    right: { shadow: t, label: `${t}-shadow` },
  }));
  return withOrder(pairs, rand);
}

// Shape to thing: all 4 shapes, each with one of its two things.
export function shapesSet(rand = Math.random) {
  const pairs = Object.keys(SHAPES).map((shape) => {
    const thing = pick(SHAPES[shape].things, rand);
    return { key: shape, left: { shape, label: shape }, right: { thing, label: thing } };
  });
  return withOrder(pairs, rand);
}

const SET_MAKERS = { numbers: numbersSet, colors: colorsSet, letters: lettersSet, shadows: shadowsSet, shapes: shapesSet };
export const makeSet = (game, rand = Math.random) => SET_MAKERS[game](rand);

// The pair Jugnu matches when he shows the first move: the one on the top left card.
export const firstMovePair = (set) => set.rows.left[0];

// Every card of a set with its box in units: { side, row, pair, x0, y0, x1, y1, anchor }.
// anchor: where its line starts or ends (the inner edge, half way down).
export function cardsOf(set) {
  const out = [];
  for (const side of ['left', 'right']) {
    const { x, w } = CARDS[side];
    set.rows[side].forEach((pair, row) => {
      const y = CARDS.rows[row];
      out.push({
        side, row, pair,
        x0: x - w / 2, y0: y - CARDS.h / 2, x1: x + w / 2, y1: y + CARDS.h / 2,
        anchor: [side === 'left' ? x + w / 2 : x - w / 2, y],
      });
    });
  }
  return out;
}

// How far a point is from a card's box (0 inside).
export function distToCard([px, py], c) {
  const dx = Math.max(c.x0 - px, 0, px - c.x1);
  const dy = Math.max(c.y0 - py, 0, py - c.y1);
  return Math.hypot(dx, dy);
}

// The card a release lands on: the nearest card within `margin` units of the
// point (inside a card counts as 0). null when there is none.
export function hitCard(point, cards, margin = 0) {
  let best = null;
  for (const c of cards) {
    const d = distToCard(point, c);
    if (d <= margin && (!best || d < best.d)) best = { c, d };
  }
  return best ? best.c : null;
}

// The release margin in units, for a board drawn at s px per unit.
export const marginUnits = (s, px = RELEASE_MARGIN_PX) => px / s;

// One set being played: which pairs are matched and how many wrong drops in a row.
export const startMatch = () => ({ matched: [], wrongInRow: 0 });

// She lifted her finger after dragging from card `from`; `to` is the card the
// release landed on, or null. Returns { state, ok, hint, done }:
//   ok    she joined `from` to its partner on the other side
//   hint  after MATCH_HINT_AFTER wrong drops in a row: the pair whose partner
//         card should wiggle once (the partner of `from`); otherwise null
//   done  all 4 pairs are matched
export function dropCard(state, from, to) {
  if (state.matched.includes(from.pair)) return { state, ok: false, hint: null, done: false };
  const ok = !!to && to.side !== from.side && to.pair === from.pair;
  if (ok) {
    const matched = [...state.matched, from.pair];
    return { state: { matched, wrongInRow: 0 }, ok, hint: null, done: matched.length === PAIRS };
  }
  const wrongInRow = state.wrongInRow + 1;
  const hint = wrongInRow >= MATCH_HINT_AFTER ? from.pair : null;
  return { state: { ...state, wrongInRow: hint === null ? wrongInRow : 0 }, ok, hint, done: false };
}

// The card that wiggles for a hint: the partner, on the other side from `from`.
export const partnerCard = (cards, from) => cards.find((c) => c.pair === from.pair && c.side !== from.side);

// ---------------------------------------------------------------------------
// Follow the path

export const PATH = {
  animals: ['bee', 'duck', 'dog'],
  furniture: Object.keys(FURNITURE), // set 2: three of these on each board
  rows: [LANES[0], LANES[2], LANES[4]], // the animals' and homes' rows
  animalX: 150,
  homeX: 1130,
  width: 84,       // the road, in units
  reach: 80,       // a trace starts within this of the animal
  homeReach: 70,   // ... and arrives within this of the home end
};

// The homes' rows: never straight across from their animal, so every road crosses another.
export const HOME_ORDERS = [[1, 2, 0], [2, 0, 1]];

// Catmull-Rom through `pts`, a point about every `gap` units: a smooth road.
function smooth(pts, gap = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const steps = Math.max(2, Math.ceil(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / gap));
    const p0 = pts[Math.max(0, i - 1)];
    const [p1, p2] = [pts[i], pts[i + 1]];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function polylineLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

// The centre line of one road, in units, through its knots [t, lane].
export function roadLine(knots, p = PATH) {
  return smooth(knots.map(([t, lane]) => [p.animalX + t * (p.homeX - p.animalX), LANES[lane]]));
}

// What travels the roads: the three animals ('path'), or three of the four
// pieces of furniture in a shuffled order ('path-rooms').
export const pathThings = (game, rand = Math.random) => (game === 'path-rooms' ? shuffle(PATH.furniture, rand).slice(0, 3) : PATH.animals);

// A board: one of the hand-designed layouts, with the homes in a shuffled order.
// road: { animal, from, to (rows), points, length }; animal is whatever travels it.
export function pathBoard(rand = Math.random, layout = Math.floor(rand() * ROAD_LAYOUTS.length), things = PATH.animals) {
  const homes = pick(HOME_ORDERS, rand);
  const roads = things.map((animal, from) => {
    const points = roadLine(ROAD_LAYOUTS[layout][homes.join('')][from]);
    return { animal, from, to: homes[from], points, length: polylineLength(points) };
  });
  return { layout, homes, roads };
}

// The nearest point of a polyline: { dist, at (arc length there) }.
export function nearestOnLine([px, py], pts) {
  let best = { dist: Infinity, at: 0 };
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    const t = seg > 0 ? Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (seg * seg))) : 0;
    const d = Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
    if (d < best.dist) best = { dist: d, at: run + t * seg };
    run += seg;
  }
  return best;
}

// On the road: no farther than half the road's width from its centre line.
export const onRoad = (point, road, width = PATH.width) => nearestOnLine(point, road.points).dist <= width / 2;

// A trace may only start at the animal.
export const startsAtAnimal = (point, road) => Math.hypot(point[0] - road.points[0][0], point[1] - road.points[0][1]) <= PATH.reach;

// Tracing one road. stepTrace returns { state, on, done }: on is false the
// moment she leaves the road; done once she reaches the home end along it.
// Progress only counts a step at a time: jumping far ahead along the road (a
// shortcut across a bend) does not move it on.
export const startTrace = () => ({ best: 0 });
export function stepTrace(state, point, road, width = PATH.width) {
  const near = nearestOnLine(point, road.points);
  if (near.dist > width / 2) return { state, on: false, done: false };
  const best = near.at > state.best && near.at - state.best <= 1.5 * width ? near.at : state.best;
  return { state: { best }, on: true, done: best >= road.length - PATH.homeReach };
}

// She left `animal`'s road: count it. demo: Jugnu should fly that road now
// (every PATH_HINT_AFTER times off the same road).
export const startMisses = () => ({});
export function missRoad(misses, animal) {
  const n = (misses[animal] ?? 0) + 1;
  const demo = n >= PATH_HINT_AFTER;
  return { misses: { ...misses, [animal]: demo ? 0 : n }, demo };
}

// The board is done when every animal is home.
export const boardDone = (home, things = PATH.animals) => things.every((a) => home.includes(a));

// The road Jugnu travels when he shows the first move: the top one.
export const firstMoveRoad = (roads) => roads[0];

// ---------------------------------------------------------------------------
// Sort it: drag 6 things into the right one of two baskets. Two boards make a play.

export const SORT = {
  boards: 2,
  perBasket: 3,
  hintAfter: 3,                       // wrong baskets in a row, then the right basket wiggles
  size: 130,                          // a thing, in units
  row: { y: 140, xs: [240, 424, 608, 792, 976, 1160] }, // the things' places, left to right
  baskets: [{ x: 440, y: 470 }, { x: 900, y: 470 }],    // basket centres (set order: left, right)
  basket: 280,                        // a basket's width and height
  inSize: 84,                         // a thing once it is in a basket
};

// A board: 3 things for each basket from its pool, in a shuffled order along
// the row. thing: { id, basket (0 left, 1 right), spot (0..5 along the row) }.
// The samples on the baskets are never among them.
export function sortBoard(game, rand = Math.random) {
  const baskets = SORT_SETS[game];
  const picked = baskets.flatMap((b, i) => shuffle(b.things, rand).slice(0, SORT.perBasket).map((id) => ({ id, basket: i })));
  const order = shuffle(picked, rand);
  return { game, baskets: baskets.map((b) => ({ id: b.id, sample: b.sample })), things: order.map((t, spot) => ({ ...t, spot })) };
}

// Where a thing waits (its centre), and each basket's box, in units.
export const thingHome = (t) => [SORT.row.xs[t.spot], SORT.row.y];
export const basketBoxes = () => SORT.baskets.map(({ x, y }, i) => ({
  basket: i, x0: x - SORT.basket / 2, y0: y - SORT.basket / 2, x1: x + SORT.basket / 2, y1: y + SORT.basket / 2,
}));

// The basket a release lands on (within `margin` units), or null.
export const hitBasket = (point, margin = 0) => hitCard(point, basketBoxes(), margin)?.basket ?? null;

// The thing under her finger: the nearest waiting thing within `margin` units of its box.
export function hitThing(point, things, placed, margin = 0) {
  const boxes = things.filter((t) => !placed.includes(t.spot)).map((t) => {
    const [x, y] = thingHome(t);
    const h = SORT.size / 2;
    return { t, x0: x - h, y0: y - h, x1: x + h, y1: y + h };
  });
  return hitCard(point, boxes, margin)?.t ?? null;
}

// Where the k-th thing in a basket sits: along its rim.
export const basketSlot = (basket, k) => [SORT.baskets[basket].x + (k - 1) * 70, SORT.baskets[basket].y - 50];

// One board being played. dropThing: she let go of `thing` over basket `to`
// (0 or 1), or away from both (null). Returns { state, ok, counted, hint, done }:
//   ok       the right basket: the thing stays in it
//   counted  a wrong basket (letting go away from both is not a try)
//   hint     after SORT.hintAfter wrong baskets in a row: the basket that
//            should wiggle once (the right one for this thing); otherwise null
//   done     all 6 are in their baskets
export const startSort = () => ({ placed: [], wrongInRow: 0 });
export function dropThing(state, thing, to) {
  if (state.placed.includes(thing.spot) || to === null) return { state, ok: false, counted: false, hint: null, done: false };
  if (to === thing.basket) {
    const placed = [...state.placed, thing.spot];
    return { state: { placed, wrongInRow: 0 }, ok: true, counted: false, hint: null, done: placed.length === 2 * SORT.perBasket };
  }
  const wrongInRow = state.wrongInRow + 1;
  const hint = wrongInRow >= SORT.hintAfter ? thing.basket : null;
  return { state: { ...state, wrongInRow: hint === null ? wrongInRow : 0 }, ok: false, counted: true, hint, done: false };
}

// The thing Jugnu carries when he shows the first move: the leftmost one.
export const firstMoveThing = (board) => board.things.find((t) => t.spot === 0);

// ---------------------------------------------------------------------------
// The attempt log: one "game" entry per release. Stroke and find entries keep their format.
//   match games: game, set (1..3), from, to (the cards' labels; to is null when
//                she let go away from every card), ok, ms
//   sort it:     game 'sort-colors' or 'sort-kinds', set (board 1..2), from (the
//                thing), to (the basket's id, or null away from both), ok, ms
//   follow the path: game 'path' or 'path-rooms', road (the animal or the
//                furniture), ok (home reached) or not (left the road), ms.
//   ms: since the game opened. Jugnu's first move is not logged: it is not hers.
export function gameLogEntry({ game, set, from, to, road, ok, ms, now = new Date() }) {
  const entry = { type: 'game', time: now.toISOString(), game };
  if (set !== undefined) entry.set = set;
  if (from !== undefined) entry.from = from;
  if (to !== undefined) entry.to = to;
  if (road !== undefined) entry.road = road;
  entry.ok = ok === true;
  entry.ms = Math.max(0, Math.round(ms));
  return entry;
}

export const thingArt = (kind) => THINGS[kind]?.art ?? '';
