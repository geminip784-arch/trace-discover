// games.js — pure functions only. No DOM, no storage, no audio.
// The rules of the games book (Slice 5D): the match sets, where cards sit, the
// release hit-test, the hints, the roads of follow the path, the on-road check,
// completion and the attempt-log entry. match.js and path.js put them on screen.
// Every random choice takes `rand` (Math.random by default) so tests can repeat it.
//
// Layout units: every game is drawn on a board 1280 x 640 units. The board is
// scaled to fit the screen right of the button column (boardFit), so cards,
// lines and traces are all kept in units and stay put when the screen changes.

import { ROOMS, THINGS } from '../data/finds.js';
import { COLORS, ROAD_LAYOUTS, LANES } from '../data/games.js';
import { shuffle, groupWord } from './finds.js';

export const GAMES = ['numbers', 'colors', 'path'];
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
  h: 128,
  rows: [94, 244, 394, 544],
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

export const makeSet = (game, rand = Math.random) => (game === 'numbers' ? numbersSet(rand) : colorsSet(rand));

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

// A board: one of the hand-designed layouts, with the homes in a shuffled order.
// road: { animal, from, to (rows), points, length }.
export function pathBoard(rand = Math.random, layout = Math.floor(rand() * ROAD_LAYOUTS.length)) {
  const homes = pick(HOME_ORDERS, rand);
  const roads = PATH.animals.map((animal, from) => {
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
export const boardDone = (home) => PATH.animals.every((a) => home.includes(a));

// ---------------------------------------------------------------------------
// The attempt log: one "game" entry per release. Stroke and find entries keep their format.
//   match games: game, set (1..3), from, to (the cards' labels; to is null when
//                she let go away from every card), ok, ms
//   follow the path: game 'path', road (the animal), ok (home reached) or not
//                (left the road), ms. ms: since the game opened.
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
