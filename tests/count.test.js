// Run: node --test tests/count.test.js
// Slice 5N: Count, then pick the number. A group she counts by tapping each
// thing, then three number tiles at least 2 apart. Level 1: 1 to 10; level 2:
// 11 to 20 in ten-frames, counting on. Two tiles in the Match kind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COUNT, COUNT_GAMES, MATCH_GAMES, countLevel, countArt, countFit, countBoxes, countBoardBoxes, hitCount,
  countChoices, countRound, countKey, countPlay, countTiles, hitCountTile, startPick, pickNumber, showMeCount,
  gamesOf, kindOf, gameTile, boardFit, BOARD, gameLogEntry,
} from '../src/games.js';
import { startCount, tapCount, startCountOn, tapTens } from '../src/finds.js';
import { THINGS } from '../data/finds.js';
import { MENU } from '../data/games.js';
import { navigate } from '../src/session.js';
import { setNote, gameNote, SET_NOTES } from '../src/notes.js';
import { clipById } from '../data/voice-script.js';

// A repeatable random source (mulberry32).
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const isInlineSvg = (s) => typeof s === 'string' && /^<svg [^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/.test(s) && s.endsWith('</svg>');
const SCREENS = [[1280, 626], [1280, 800]];
const range = (level) => {
  const [lo, hi] = COUNT.ranges[level];
  return [...Array(hi - lo + 1).keys()].map((i) => lo + i);
};
const src = readFileSync(new URL('../src/count.js', import.meta.url), 'utf8');

// ---- the menu ----

test('two tiles in Match, one per level; the draw-a-line sets are unchanged', () => {
  assert.deepEqual(COUNT_GAMES, ['count-1', 'count-2']);
  assert.deepEqual(gamesOf('match').slice(-2), COUNT_GAMES);
  assert.deepEqual(MATCH_GAMES, ['numbers', 'colors', 'letters', 'shadows', 'shapes']);
  for (const id of COUNT_GAMES) {
    assert.equal(kindOf(id), 'match');
    assert.ok(isInlineSvg(MENU[id]), id);
    assert.equal(gameTile(id, [], {}, {}).locked, false, `${id}: both levels are open`);
    assert.equal(gameTile(id, [id], {}, {}).star, true, `${id}: its own star`);
  }
  assert.deepEqual(COUNT_GAMES.map(countLevel), [1, 2]);
  const sets = { screen: 'games', kind: 'match' };
  for (const game of COUNT_GAMES) {
    const play = navigate(sets, { type: 'openGame', game });
    assert.deepEqual(play, { screen: 'play', game });
    assert.deepEqual(navigate(play, { type: 'gameDone' }), sets);
    assert.deepEqual(navigate(play, { type: 'back' }), sets);
  }
});

test('its own instruction line, with a voice clip; the draw-a-line sets keep theirs', () => {
  assert.equal(SET_NOTES.count, 'Count them, then tap the number');
  for (const id of COUNT_GAMES) assert.equal(setNote(id, kindOf(id)), 'Count them, then tap the number');
  for (const id of MATCH_GAMES) assert.equal(setNote(id, 'match'), gameNote('match'));
  assert.equal(setNote('odd-kinds', 'odd'), gameNote('odd'));
  assert.equal(clipById('game-count')?.words, 'Count them, then tap the number');
});

// ---- the numbers ----

test('the three numbers: the right one and two more, all in the level\'s range, at least 2 apart', () => {
  for (const level of COUNT.levels) {
    const seen = new Set();
    for (const n of range(level)) {
      for (let seed = 1; seed <= 60; seed++) {
        const c = countChoices(n, level, seeded(seed * 97 + n));
        assert.equal(c.length, 3);
        assert.ok(c.includes(n), `${n} is there`);
        for (const v of c) {
          assert.ok(range(level).includes(v), `level ${level}: ${v} in range`);
          seen.add(v);
        }
        for (const [i, a] of c.entries()) for (const b of c.slice(i + 1)) assert.ok(Math.abs(a - b) >= COUNT.apart, `${c}`);
      }
    }
    assert.deepEqual([...seen].sort((a, b) => a - b), range(level), `level ${level}: every number turns up as a tile`);
  }
  assert.deepEqual(COUNT.ranges, { 1: [1, 10], 2: [11, 20] });
  assert.equal(COUNT.apart, 2);
});

test('the right tile is not always in the same place', () => {
  const places = new Set();
  for (let seed = 1; seed <= 40; seed++) places.add(countRound(1, seeded(seed)).right);
  assert.deepEqual([...places].sort(), [0, 1, 2]);
});

test('a group: every number of the range turns up, each with a countable thing', () => {
  for (const level of COUNT.levels) {
    const ns = new Set();
    for (let seed = 1; seed <= 400; seed++) {
      const r = countRound(level, seeded(seed));
      ns.add(r.n);
      assert.equal(r.choices[r.right], r.n);
      assert.ok(THINGS[r.kind], r.kind);
    }
    assert.deepEqual([...ns].sort((a, b) => a - b), range(level));
  }
});

test('a play: 3 groups, each a different number and thing, none from the last play', () => {
  assert.equal(COUNT.groupsPerPlay, 3);
  for (const level of COUNT.levels) {
    const rand = seeded(level * 13);
    let last = [];
    for (let i = 0; i < 40; i++) {
      const play = countPlay(level, last, rand);
      assert.equal(play.length, 3);
      assert.equal(new Set(play.map((r) => r.n)).size, 3, 'three numbers');
      assert.equal(new Set(play.map((r) => r.kind)).size, 3, 'three kinds of things');
      for (const r of play) assert.ok(!last.includes(countKey(r)), `play ${i}: ${countKey(r)} was in the last play`);
      last = play.map(countKey);
    }
  }
  assert.equal(countKey({ kind: 'egg', n: 7 }), 'egg-7');
});

// ---- on the board ----

test('level 1 draws rows of five (10 too); level 2 draws ten-frames', () => {
  for (const n of range(1)) assert.doesNotMatch(countArt(1, 'egg', n).svg, /class="frame"/, `${n}: rows of five`);
  for (const n of range(2)) assert.match(countArt(2, 'egg', n).svg, /class="frame"/, `${n}: ten-frames`);
  const ten = countBoxes(1, 10).things;
  assert.equal(new Set(ten.map((b) => b.y0)).size, 2, '10 is two rows of five');
});

test('every thing she taps is at least 88 px, and the group stays in its area', () => {
  for (const [w, h] of SCREENS) {
    const { s } = boardFit(w, h);
    for (const level of COUNT.levels) {
      for (const n of range(level)) {
        const { things, fit, W, H } = countBoardBoxes(level, n);
        assert.equal(things.length, n);
        for (const t of things) assert.ok((t.x1 - t.x0) * s >= COUNT.minThingPx, `level ${level}, ${n} at ${w}x${h}: ${((t.x1 - t.x0) * s).toFixed(1)} px`);
        const a = COUNT.area;
        assert.ok(fit.x >= a.x0 - 1e-9 && fit.x + W * fit.scale <= a.x1 + 1e-9, `${n}: inside across`);
        assert.ok(fit.y >= a.y0 - 1e-9 && fit.y + H * fit.scale <= a.y1 + 1e-9, `${n}: inside down`);
        assert.ok(fit.scale <= COUNT.maxScale);
      }
    }
  }
  assert.deepEqual(countFit(100, 100), { scale: 2, x: 540, y: 125 }, 'a small group is centred at twice its size');
});

test('the number tiles: big, apart, below the group and on the board', () => {
  const tiles = countTiles();
  assert.equal(tiles.length, 3);
  for (const [w, h] of SCREENS) {
    const { s } = boardFit(w, h);
    for (const t of tiles) assert.ok((t.x1 - t.x0) * s >= 150, `a tile at ${w}x${h}: ${((t.x1 - t.x0) * s).toFixed(0)} px`);
  }
  for (const t of tiles) {
    assert.ok(t.y0 >= COUNT.area.y1, 'below the group');
    assert.ok(t.y1 <= BOARD.h - 12 && t.x0 >= 12 && t.x1 <= BOARD.w - 12, 'inside the board');
  }
  for (const [i, a] of tiles.entries()) for (const b of tiles.slice(i + 1)) assert.ok(b.x0 - a.x1 >= 40, 'apart');
  for (const t of tiles) assert.equal(hitCountTile([(t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2]), t.index);
  assert.equal(hitCountTile([640, 100]), null, 'the group is not a tile');
});

test('a tap while counting: on a thing, or on a full frame away from its things', () => {
  for (const level of COUNT.levels) {
    for (const n of range(level)) {
      const { things, frames } = countBoardBoxes(level, n);
      for (const t of things) assert.deepEqual(hitCount([(t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2], level, n), { item: t.item });
      assert.equal(hitCount([5, 5], level, n), null);
      if (level === 2) {
        // The frame's top edge, above its things.
        const f = frames[0];
        assert.deepEqual(hitCount([(f.x0 + f.x1) / 2, f.y0 + 2], level, n), { frame: 0 });
        const second = frames[1];
        assert.deepEqual(hitCount([(second.x0 + second.x1) / 2, second.y0 + 2], level, n), n === 20 ? { frame: 1 } : null, `${n}: the second frame counts only when full`);
      }
    }
  }
});

// ---- counting (the count scenes' own rules) ----

test('level 1: every thing tapped once counts 1, 2, 3 ... and then the tiles come', () => {
  let st = startCount(7);
  const shown = [];
  for (const i of [3, 0, 6, 1, 1, 5, 2, 4]) {
    const r = tapCount(st, i);
    st = r.state;
    if (r.number !== null) shown.push(r.number);
  }
  assert.deepEqual(shown, [1, 2, 3, 4, 5, 6, 7], 'a thing tapped twice counts once');
  assert.equal(st.done, true);
});

test('level 2: one tap counts the full frame as ten, then counting on; an extra before the ten does not count', () => {
  let st = startCountOn(17);
  assert.equal(tapTens(st, { item: 12 }).number, null, 'an extra first');
  let r = tapTens(st, { frame: 0 });
  assert.equal(r.number, 10);
  st = r.state;
  const shown = [];
  for (const i of [10, 11, 12, 13, 14, 15, 16]) {
    r = tapTens(st, { item: i });
    st = r.state;
    shown.push(r.number);
  }
  assert.deepEqual(shown, [11, 12, 13, 14, 15, 16, 17]);
  assert.equal(st.done, true);
});

// ---- picking the number ----

test('picking: the right tile; a wrong one wiggles, and after 3 the right one does', () => {
  const round = { n: 6, choices: [3, 6, 9], right: 1 };
  let st = startPick();
  let r = pickNumber(st, round, 0);
  assert.deepEqual([r.ok, r.hint, r.done], [false, null, false]);
  r = pickNumber(r.state, round, 2);
  assert.equal(r.hint, null);
  r = pickNumber(r.state, round, 0);
  assert.equal(r.hint, 1, 'the third wrong tile in a row: the right one wiggles');
  assert.equal(r.state.wrongInRow, 0, 'and the count starts again');
  r = pickNumber(r.state, round, 1);
  assert.deepEqual([r.ok, r.done], [true, true]);
  st = r.state;
  assert.equal(pickNumber(st, round, 1).ok, false, 'nothing more once found');
});

test('show me: what is left to count breathes, then Jugnu points; never a move', () => {
  const round = { n: 4, choices: [2, 4, 8], right: 1 };
  assert.deepEqual(showMeCount('count', round, startPick()), { kind: 'count' });
  assert.deepEqual(showMeCount('pick', round, startPick()), { kind: 'point', index: 1 });
  assert.equal(showMeCount('pick', round, { wrongInRow: 0, found: true }), null);
  assert.equal(showMeCount('done', round, startPick()), null);
  const body = src.slice(src.indexOf('function showMe()'), src.indexOf('const stopTracking'));
  assert.doesNotMatch(body, /pickNumber\(|tapCount\(|tapTens\(|found\(/, 'show me never counts or picks for her');
  assert.match(body, /gm-point/, 'Jugnu points');
  assert.match(body, /showMeLogEntry\(/, 'logged as help');
});

// ---- the log, and the screen rules ----

test('one game entry per number tile she taps: the number tapped and how many there are', () => {
  const e = gameLogEntry({ game: 'count-2', set: 3, from: '15', to: '17', ok: false, ms: 2500.6, now: new Date('2026-11-20T10:00:00Z') });
  assert.deepEqual(e, { type: 'game', time: '2026-11-20T10:00:00.000Z', game: 'count-2', set: 3, from: '15', to: '17', ok: false, ms: 2501 });
  assert.equal(src.split('gameLogEntry({').length - 1, 1, 'logged in one place');
  const tapBody = src.slice(src.indexOf('function tap(point)'), src.indexOf('function showMe()'));
  assert.ok(tapBody.indexOf('gameLogEntry({') > tapBody.indexOf("if (phase !== 'pick') return;"), 'counting taps are not logged');
});

test('the counting numbers stay while she picks; one finger; untouchable while upright; offline', () => {
  const show = src.slice(src.indexOf('function showTiles()'), src.indexOf('function found('));
  assert.doesNotMatch(show, /textContent = ''|remove\('counted'\)|\.num/, 'showTiles leaves the counting numbers');
  assert.match(src, /trackSinglePointer\(board\.el/);
  assert.match(src, /if \(paused \|\| busy\) return;/);
  assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|https?:\/\//);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /\.ct-tile \{[^}]*touch-action: none;/);
  assert.match(html, /\.gm-board \{[^}]*touch-action: none;/);
});
