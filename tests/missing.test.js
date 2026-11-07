// Run: node --test tests/missing.test.js
// Slice 5H, pull request 2: the Missing piece game's rules (src/games.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, MISSING_PICTURES, missingPictureArt, MENU } from '../data/games.js';
import { MISSING_CUTS } from '../data/missing-cuts.js';
import {
  MISSING, MISSING_GAMES, missingLevel, GAME_ROWS, GAMES, kindOf, SHAPE_POLYS, PARTS, partPoly, partKind, bbox,
  sameForm, missingRound, checkRound, fits, roundKey, missingPlay, missingLevelOpen, shapeBoxes, partCentre, gapBox,
  trayOf, pieceTrayScale, pieceHome, hitGap, hitPiece, startMissing, dropPiece, firstMovePiece, pieceLabel,
  pieceAllowed, boardFit, BOARD, gameLogEntry,
} from '../src/games.js';
import { navigate } from '../src/session.js';
import { MISSING_KEY, readMissingRounds, addMissingRound } from '../src/storage.js';
import { colorsOf, family } from './art-colors.js';

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
const OPTS = { colors: Object.keys(COLORS), pictures: MISSING_PICTURES, cuts: MISSING_CUTS };
const ROUNDS = 400; // generated rounds per level
const roundsOf = (level, n = ROUNDS, seed = level * 101) => {
  const rand = seeded(seed);
  return Array.from({ length: n }, () => missingRound(level, { ...OPTS, rand }));
};
const ALL = Object.fromEntries(MISSING.levels.map((l) => [l, roundsOf(l)]));
const area = (poly) => Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const isInlineSvg = (s) => s.startsWith('<svg') && s.endsWith('</svg>') && !/https?:\/\/(?!www\.w3\.org)/.test(s);

// ---------------------------------------------------------------------------
// Shapes and parts

test('every part is inside its shape: a quarter is a quarter of it, a half a half, a corner smaller', () => {
  for (const [shape, parts] of Object.entries(PARTS)) {
    const whole = area(SHAPE_POLYS[shape]);
    const sb = bbox(SHAPE_POLYS[shape]);
    for (const part of parts) {
      const poly = partPoly(shape, part);
      const b = bbox(poly);
      assert.ok(b.x0 >= sb.x0 - 1e-9 && b.y0 >= sb.y0 - 1e-9 && b.x1 <= sb.x1 + 1e-9 && b.y1 <= sb.y1 + 1e-9, `${shape} ${part}`);
      const share = area(poly) / whole;
      const want = { quarter: [0.24, 0.26], half: [0.2, 0.8], corner: [0.03, 0.35] }[partKind(part)];
      if (partKind(part) === 'quarter' || (partKind(part) === 'half' && shape !== 'triangle')) {
        const exact = partKind(part) === 'quarter' ? 0.25 : 0.5;
        assert.ok(Math.abs(share - exact) < 0.01, `${shape} ${part}: ${share.toFixed(3)}`);
      } else {
        assert.ok(share >= want[0] && share <= want[1], `${shape} ${part}: ${share.toFixed(3)}`);
      }
    }
  }
  assert.ok(!PARTS.circle.some((p) => p[0] === 'c'), 'a circle has no corners');
  assert.ok(!PARTS.triangle.some((p) => p[0] === 'q'), 'a triangle has no quarters');
});

test('outlines are compared by shape, ignoring size', () => {
  // The same part of a square, at any size, is the same outline.
  assert.ok(sameForm({ shape: 'square', part: 'q-tl' }, { shape: 'card', part: 'q-br' }), 'a square quarter is a square anywhere');
  // A rectangle's top half is about square: it looks like a square's quarter.
  assert.ok(sameForm({ shape: 'rectangle', part: 'h-t' }, { shape: 'square', part: 'q-tl' }));
  // A square's left half is a tall box, like a rectangle's quarter.
  assert.ok(sameForm({ shape: 'square', part: 'h-l' }, { shape: 'rectangle', part: 'q-br' }));
  // Different outlines.
  assert.ok(!sameForm({ shape: 'circle', part: 'q-tl' }, { shape: 'square', part: 'q-tl' }), 'a round edge is not a corner');
  assert.ok(!sameForm({ shape: 'circle', part: 'q-tl' }, { shape: 'circle', part: 'q-br' }), 'pieces are not turned: a quarter at another place is another outline');
  assert.ok(!sameForm({ shape: 'square', part: 'h-l' }, { shape: 'square', part: 'h-t' }), 'tall and wide');
  assert.ok(!sameForm({ shape: 'triangle', part: 'h-l' }, { shape: 'triangle', part: 'h-r' }));
});

// ---------------------------------------------------------------------------
// Every generated round: one right answer per gap

test('every gap: exactly one piece fits, the same part of the same shape in the same paint', () => {
  for (const [level, rounds] of Object.entries(ALL)) {
    for (const r of rounds) {
      assert.deepEqual(checkRound(r), [], `level ${level}: ${roundKey(r)}`);
      for (const [i, g] of r.gaps.entries()) {
        const fit = r.pieces.filter((p) => fits(p, g));
        assert.equal(fit.length, 1, `level ${level}: gap ${i}`);
        assert.equal(fit[0].right, i);
      }
    }
  }
});

test('no piece but the right one, and its twin in another paint, has the outline of any gap (sizes ignored)', () => {
  for (const [level, rounds] of Object.entries(ALL)) {
    for (const r of rounds) {
      for (const [i, g] of r.gaps.entries()) {
        for (const p of r.pieces) {
          if (!sameForm(p, g)) continue;
          if (p.right === i) continue;
          assert.ok(Number(level) !== 2, `level 2: only the right piece has gap ${i}'s outline (${pieceLabel(p)})`);
          assert.equal(p.decoyOf, i, `level ${level}: ${pieceLabel(p)} has the outline of gap ${i} (${pieceLabel(g)})`);
          assert.notEqual(p.paint, g.paint, 'the twin is another paint, so it does not fit');
        }
      }
      // No two gaps share an outline either.
      for (const [i, a] of r.gaps.entries()) for (const b of r.gaps.slice(i + 1)) assert.ok(!sameForm(a, b));
    }
  }
});

test('levels 1, 3 and 4: both clues matter for every gap', () => {
  for (const level of [1, 3, 4]) {
    for (const r of ALL[level]) {
      for (const g of r.gaps) {
        assert.ok(r.pieces.some((p) => sameForm(p, g) && p.paint !== g.paint), 'its outline in another paint');
        assert.ok(r.pieces.some((p) => p.paint === g.paint && !sameForm(p, g)), 'its paint with another outline');
      }
    }
  }
});

test('each level: its shapes, paints, gaps and pieces', () => {
  for (const [level, rounds] of Object.entries(ALL).map(([l, r]) => [Number(l), r])) {
    for (const r of rounds) {
      assert.equal(r.shapes.length, 3);
      const paints = r.shapes.map((s) => s.paint);
      if (level === 2) assert.equal(new Set(paints).size, 1, 'level 2: one paint');
      else assert.equal(new Set(paints).size, 3, 'never two broken shapes the same color');
      if (level === 4) {
        assert.ok(r.shapes.every((s) => s.shape === 'card'));
        assert.equal(new Set(paints.map((id) => MISSING_PICTURES[id])).size, 3, 'three pictures of three colors');
        assert.ok(r.pieces.every((p) => pieceAllowed(p, MISSING_CUTS)), 'every piece holds enough of its picture');
      } else {
        assert.equal(new Set(r.shapes.map((s) => s.shape)).size, 3, 'three different shapes');
        assert.ok(r.pieces.every((p) => new Set(r.pieces.map((q) => q.paint)).size === (level === 2 ? 1 : 3)));
      }
      const gapsPer = r.shapes.map((s) => s.parts.length).sort();
      assert.deepEqual(gapsPer, level === 3 ? [1, 1, 2] : [1, 1, 1]);
      assert.equal(r.pieces.length, level === 3 ? 8 : 6);
      assert.deepEqual(r.pieces.map((p) => p.slot), [...r.pieces.keys()]);
    }
  }
});

test('level 3: the two gaps of one shape are two quarters or two corners, apart', () => {
  for (const r of ALL[3]) {
    const sh = r.shapes.find((s) => s.parts.length === 2);
    assert.equal(sh.parts[0][0], sh.parts[1][0]);
    assert.notEqual(sh.parts[0], sh.parts[1]);
    assert.ok(['q', 'c'].includes(sh.parts[0][0]));
  }
});

test('rounds are random: every shape, part, paint and position turns up', () => {
  const seen = { shape: new Set(), part: new Set(), paint: new Set(), first: new Set(), slot0: new Set() };
  for (const level of [1, 2, 3]) {
    for (const r of ALL[level]) {
      for (const g of r.gaps) { seen.shape.add(g.shape); seen.part.add(`${g.shape}:${g.part}`); seen.paint.add(g.paint); }
      seen.first.add(r.shapes[0].shape);
      seen.slot0.add(r.pieces[0].right);
    }
  }
  assert.equal(seen.shape.size, 4);
  assert.equal(seen.paint.size, Object.keys(COLORS).length);
  for (const s of MISSING.shapes) for (const p of PARTS[s]) assert.ok(seen.part.has(`${s}:${p}`), `${s} ${p} never missing`);
  assert.equal(seen.first.size, 4, 'any shape on the left');
  assert.ok(seen.slot0.has(-1) && seen.slot0.has(0) && seen.slot0.has(2), 'right pieces and decoys anywhere in the tray');
  const pics = new Set(ALL[4].flatMap((r) => r.shapes.map((s) => s.paint)));
  assert.equal(pics.size, Object.keys(MISSING_PICTURES).length, 'every picture turns up');
});

test('a play never repeats a round of the last play, nor one of its own', () => {
  for (const level of MISSING.levels) {
    const rand = seeded(level * 7);
    let last = [];
    for (let i = 0; i < 150; i++) {
      const play = missingPlay(level, last, { ...OPTS, rand });
      const keys = play.map(roundKey);
      assert.equal(play.length, MISSING.roundsPerPlay);
      assert.equal(new Set(keys).size, keys.length);
      assert.ok(!keys.some((k) => last.includes(k)), `level ${level}: a round from the last play`);
      last = keys;
    }
  }
});

// ---------------------------------------------------------------------------
// Level 4's pictures

test('level 4: each picture is mostly its color; each has a crop and several cuts', () => {
  // Mostly: the color family covering most of its colored area (grapes are
  // many small purple rounds and one green leaf), at least 60% of it.
  for (const [id, color] of Object.entries(MISSING_PICTURES)) {
    const byFamily = {};
    for (const c of colorsOf(missingPictureArt(id))) {
      const f = c.opacity >= 0.6 && family(c.color, 0.3);
      if (f) byFamily[f] = (byFamily[f] ?? 0) + c.area;
    }
    const total = Object.values(byFamily).reduce((a, b) => a + b, 0);
    const [top, most] = Object.entries(byFamily).sort((a, b) => b[1] - a[1])[0];
    assert.equal(top, color, `${id} is mostly ${top}`);
    assert.ok(most / total >= 0.6, `${id}: ${(most / total * 100).toFixed(0)}% ${color}`);
    assert.ok(MISSING_CUTS[id], `${id} was measured (npm run missing-cuts)`);
    assert.match(MISSING_CUTS[id].view, /^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
    assert.ok(MISSING_CUTS[id].cuts.length >= 3, id);
    for (const c of MISSING_CUTS[id].cuts) assert.ok(PARTS.card.includes(c));
  }
  const colors = new Set(Object.values(MISSING_PICTURES));
  assert.ok(colors.size >= 3);
});

// ---------------------------------------------------------------------------
// Playing a round

test('a drop: the right piece snaps in; a wrong one is a try; away from every gap is not', () => {
  const r = ALL[1][0];
  const right = r.pieces.find((p) => p.right === 0);
  const twin = r.pieces.find((p) => p.decoyOf === 0);
  let s = startMissing();
  let d = dropPiece(s, r, twin, 0);
  assert.deepEqual([d.ok, d.counted], [false, true], 'its outline in another paint does not fit');
  d = dropPiece(d.state, r, right, null);
  assert.deepEqual([d.ok, d.counted], [false, false], 'let go away from every gap');
  d = dropPiece(d.state, r, right, 0);
  assert.equal(d.ok, true);
  assert.deepEqual(d.state.filled, [0]);
  assert.deepEqual(d.state.placed, [right.slot]);
  assert.equal(dropPiece(d.state, r, twin, 0).counted, false, 'a filled gap takes nothing');
  s = d.state;
  for (const i of [1, 2]) {
    d = dropPiece(s, r, r.pieces.find((p) => p.right === i), i);
    s = d.state;
  }
  assert.equal(d.done, true);
});

test('hint: after 3 wrong tries in a row, the right piece for the gap she last tried wiggles', () => {
  const r = ALL[1][3];
  const wrong = r.pieces.find((p) => p.decoyOf === 1);
  let s = startMissing();
  let d;
  for (let k = 1; k <= 3; k++) {
    d = dropPiece(s, r, wrong, 1);
    s = d.state;
    assert.equal(d.hint, k === 3 ? r.pieces.find((p) => p.right === 1).slot : null);
  }
  assert.equal(s.wrongInRow, 0, 'the count starts again after a hint');
});

test('Jugnu\'s first move is the first gap\'s right piece; the log names paint, shape and part', () => {
  const r = ALL[2][0];
  assert.equal(firstMovePiece(r).right, 0);
  assert.match(pieceLabel(r.gaps[0]), /^[a-z]+-(circle|square|triangle|rectangle)-(q|h|c)-[a-z]+$/);
  const e = gameLogEntry({ game: 'missing-2', set: 1, from: pieceLabel(r.pieces[0]), to: pieceLabel(r.gaps[0]), ok: false, ms: 500, now: new Date(0) });
  assert.deepEqual(Object.keys(e), ['type', 'time', 'game', 'set', 'from', 'to', 'ok', 'ms']);
  assert.equal(e.type, 'game');
});

// ---------------------------------------------------------------------------
// On the board

test('shapes and tray fit the board; every piece\'s touch area is at least 88 px', () => {
  for (const level of MISSING.levels) {
    for (const r of ALL[level].slice(0, 50)) {
      for (const b of shapeBoxes(r)) assert.ok(b.x0 >= 0 && b.x0 + MISSING.size <= BOARD.w && b.y0 >= 0);
      const t = trayOf(r);
      for (const p of r.pieces) {
        const [x, y] = pieceHome(r, p);
        const pb = bbox(partPoly(p.shape, p.part));
        const k = pieceTrayScale(r, p);
        const [w, h] = [(pb.x1 - pb.x0) * MISSING.size * k, (pb.y1 - pb.y0) * MISSING.size * k];
        assert.ok(w <= t.box[0] + 1 && h <= t.box[1] + 1, `level ${level}: ${pieceLabel(p)} fits its place`);
        assert.ok(x - t.box[0] / 2 >= 0 && x + t.box[0] / 2 <= BOARD.w && y + t.box[1] / 2 <= BOARD.h, 'inside the board');
        assert.ok(y - t.box[1] / 2 > MISSING.shapeTop + MISSING.size, 'below the shapes');
        assert.ok(k <= 1 && k >= t.scale - 1e-9, 'never bigger than its gap');
      }
      // Places in the tray do not overlap.
      const homes = r.pieces.map((p) => pieceHome(r, p));
      for (const [i, a] of homes.entries()) {
        for (const b of homes.slice(i + 1)) assert.ok(Math.abs(a[0] - b[0]) >= t.box[0] - 1e-9 || Math.abs(a[1] - b[1]) >= t.box[1] - 1e-9);
      }
    }
  }
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    const { s } = boardFit(w, h);
    for (const t of Object.values(MISSING.tray).filter((v) => v.box)) assert.ok(t.box[0] * s >= 88 && t.box[1] * s >= 88, `${w}x${h}`);
  }
});

test('a release on a gap finds it; a touch on a waiting piece finds it', () => {
  const r = ALL[3][0];
  for (const [i] of r.gaps.entries()) {
    assert.equal(hitGap(partCentre(r, i), r, []), i);
    assert.equal(hitGap(partCentre(r, i), r, [i]) === i, false, 'a filled gap is not a target');
    const b = gapBox(r, i);
    assert.ok(b.x1 > b.x0 && b.y1 > b.y0);
  }
  assert.equal(hitGap([640, 620], r, []), null);
  for (const p of r.pieces) {
    assert.equal(hitPiece(pieceHome(r, p), r, []).slot, p.slot);
    assert.equal(hitPiece(pieceHome(r, p), r, [p.slot]), null, 'a placed piece is not picked up again');
  }
});

// ---------------------------------------------------------------------------
// Levels, menu and storage

test('levels open like the Drawing book: after 3 finished rounds of the one before', () => {
  assert.equal(missingLevelOpen(1, {}), true);
  assert.equal(missingLevelOpen(2, { 1: 2 }), false);
  assert.equal(missingLevelOpen(2, { 1: 3 }), true);
  assert.equal(missingLevelOpen(3, { 1: 3, 2: 2 }), false);
  assert.equal(missingLevelOpen(4, { 1: 3, 2: 3, 3: 3 }), true);
  assert.equal(missingLevelOpen(4, { 2: 3, 3: 3 }), false, 'every level before must be open');
});

test('its own menu row: a tile per level, each its own game with its own star', () => {
  assert.deepEqual(GAME_ROWS.find((r) => r.kind === 'missing').games, MISSING_GAMES);
  assert.deepEqual(MISSING_GAMES, ['missing-1', 'missing-2', 'missing-3', 'missing-4']);
  for (const g of MISSING_GAMES) {
    assert.ok(GAMES.includes(g));
    assert.equal(kindOf(g), 'missing');
    assert.ok(isInlineSvg(MENU[g]), g);
    assert.deepEqual(navigate({ screen: 'games' }, { type: 'openGame', game: g }), { screen: 'play', game: g });
  }
  assert.equal(missingLevel('missing-3'), 3);
});

test('finished rounds per level are kept; anything broken reads as none', () => {
  const store = new Map();
  const ls = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  assert.deepEqual(readMissingRounds(ls), {});
  addMissingRound(1, ls);
  addMissingRound(1, ls);
  addMissingRound(2, ls);
  assert.deepEqual(readMissingRounds(ls), { 1: 2, 2: 1 });
  store.set(MISSING_KEY, '[1,2]');
  assert.deepEqual(readMissingRounds(ls), {});
  store.set(MISSING_KEY, '{"1":"x","2":3}');
  assert.deepEqual(readMissingRounds(ls), { 2: 3 });
  const full = { getItem: () => null, setItem: () => { throw new Error('full'); } };
  assert.equal(addMissingRound(1, full), false);
});
