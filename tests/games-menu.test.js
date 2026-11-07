// Run: node --test tests/games-menu.test.js
// The two-step games menu: a tile per kind of game, then that kind's sets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigate, GAME_KINDS as NAV_KINDS } from '../src/session.js';
import {
  GAME_ROWS, GAME_KINDS, GAMES, gamesOf, kindOf, kindStars, gameTile, menuTileSize, MENU_TILE, MISSING,
} from '../src/games.js';
import { MENU, KIND_MENU } from '../data/games.js';
import { readGameStars, saveGameStar, GAME_STARS_KEY } from '../src/storage.js';

const SHELF = { screen: 'shelf' };
const STEP1 = { screen: 'games' };

// Every game id the one-step menu had (before the two-step menu). Her saved
// stars, last plays and log entries use these ids, so none may change.
const OLD_IDS = [
  'numbers', 'colors', 'letters', 'shadows', 'shapes', 'path', 'path-rooms', 'sort-colors', 'sort-kinds',
  'odd-kinds', 'odd-colors', 'missing-1', 'missing-2', 'missing-3', 'missing-4',
];

function memoryStore(data = {}) {
  const m = new Map(Object.entries(data));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test('five kinds, in order, and every game id kept in its kind', () => {
  assert.deepEqual(GAME_KINDS, ['match', 'path', 'sort', 'odd', 'missing']);
  assert.deepEqual(GAMES, OLD_IDS);
  assert.deepEqual(Object.keys(NAV_KINDS), GAME_KINDS, 'src/session.js agrees with src/games.js');
  for (const kind of GAME_KINDS) assert.deepEqual(NAV_KINDS[kind], gamesOf(kind), kind);
  for (const id of OLD_IDS) assert.ok(gamesOf(kindOf(id)).includes(id), id);
  assert.deepEqual(gamesOf('chess'), []);
});

test('every kind and every set has its own picture', () => {
  for (const kind of GAME_KINDS) assert.match(KIND_MENU[kind], /^<svg /, kind);
  for (const id of GAMES) assert.match(MENU[id], /^<svg /, id);
});

test('step 1 -> a kind -> a set -> back to the kind -> back to step 1 -> back to the shelf', () => {
  const step1 = navigate(SHELF, { type: 'openBook', book: 'games' });
  assert.deepEqual(step1, STEP1);
  for (const kind of GAME_KINDS) {
    const step2 = navigate(step1, { type: 'openKind', kind });
    assert.deepEqual(step2, { screen: 'games', kind });
    for (const game of gamesOf(kind)) {
      const play = navigate(step2, { type: 'openGame', game });
      assert.deepEqual(play, { screen: 'play', game });
      assert.deepEqual(navigate(play, { type: 'back' }), step2, `back from ${game}`);
      assert.deepEqual(navigate(play, { type: 'gameDone' }), step2, `${game} done`);
    }
    assert.deepEqual(navigate(step2, { type: 'back' }), STEP1);
    assert.deepEqual(navigate(step2, { type: 'home' }), SHELF);
  }
  assert.deepEqual(navigate(step1, { type: 'back' }), SHELF);
  assert.deepEqual(navigate(step1, { type: 'home' }), SHELF);
});

test('a tile only opens what its step holds', () => {
  // Step 1 holds kinds, not games; a kind's step holds only its own sets.
  assert.equal(navigate(STEP1, { type: 'openGame', game: 'numbers' }), STEP1);
  assert.equal(navigate(STEP1, { type: 'openKind', kind: 'chess' }), STEP1);
  assert.equal(navigate(STEP1, { type: 'openKind', kind: 'constructor' }), STEP1);
  const match = { screen: 'games', kind: 'match' };
  assert.equal(navigate(match, { type: 'openGame', game: 'path' }), match);
  assert.equal(navigate(match, { type: 'openKind', kind: 'path' }), match);
  assert.equal(navigate(SHELF, { type: 'openKind', kind: 'match' }), SHELF);
});

test('every tile is at least 140 px on both steps, and each row fits across', () => {
  const most = Math.max(GAME_KINDS.length, ...GAME_KINDS.map((k) => gamesOf(k).length));
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    for (const n of [GAME_KINDS.length, ...GAME_KINDS.map((k) => gamesOf(k).length)]) {
      const t = menuTileSize(w, h, n);
      assert.ok(t >= MENU_TILE.min && t >= 140, `${n} tiles at ${w}x${h}: ${t}`);
      const row = n * t + (n - 1) * MENU_TILE.gap;
      assert.ok(row <= w - MENU_TILE.left - MENU_TILE.right + 0.001, `${n} tiles fit across at ${w}x${h}`);
      assert.ok(t <= h - 100, `${n} tiles fit down at ${w}x${h}`);
    }
  }
  assert.equal(most, 5);
  assert.equal(menuTileSize(1280, 626, 5), 200);
});

test('stars saved by the old menu still show: on their set, and counted on their kind', () => {
  const saved = ['numbers', 'shapes', 'path-rooms', 'sort-kinds', 'odd-colors', 'missing-1'];
  const store = memoryStore({ [GAME_STARS_KEY]: JSON.stringify(saved) });
  const stars = readGameStars(store);
  assert.deepEqual(stars, saved);
  for (const id of GAMES) assert.equal(gameTile(id, stars, {}).star, saved.includes(id), id);
  assert.deepEqual(GAME_KINDS.map((k) => kindStars(k, stars)), [2, 1, 1, 1, 1]);
  assert.equal(GAME_KINDS.reduce((n, k) => n + kindStars(k, stars), 0), saved.length);
  // Every old star at once: each kind counts all its sets.
  const all = memoryStore({ [GAME_STARS_KEY]: JSON.stringify(OLD_IDS) });
  assert.deepEqual(GAME_KINDS.map((k) => kindStars(k, readGameStars(all))), [5, 2, 2, 2, 4]);
  // A new star still lands in the same place.
  saveGameStar('letters', store);
  assert.equal(kindStars('match', readGameStars(store)), 3);
  assert.deepEqual(GAME_KINDS.map((k) => kindStars(k, [])), [0, 0, 0, 0, 0]);
});

test('Missing piece levels 2 to 4 stay locked until earned; every other set is open', () => {
  const lockedWith = (rounds) => gamesOf('missing').filter((id) => gameTile(id, [], rounds).locked);
  assert.deepEqual(lockedWith({}), ['missing-2', 'missing-3', 'missing-4']);
  const n = MISSING.unlockAfter;
  assert.deepEqual(lockedWith({ 1: n - 1 }), ['missing-2', 'missing-3', 'missing-4']);
  assert.deepEqual(lockedWith({ 1: n }), ['missing-3', 'missing-4']);
  assert.deepEqual(lockedWith({ 1: n, 2: n }), ['missing-4']);
  assert.deepEqual(lockedWith({ 1: n, 2: n, 3: n }), []);
  assert.deepEqual(lockedWith({ 2: n, 3: n }), ['missing-2', 'missing-3', 'missing-4'], 'in order');
  for (const id of GAMES.filter((g) => kindOf(g) !== 'missing')) assert.equal(gameTile(id, [], {}).locked, false, id);
});

test('the tile rule in index.html matches menuTileSize', async () => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('--t: min(200px, calc((100vw - 160px - (var(--n) - 1) * 28px) / var(--n)), calc(100vh - 120px));'));
  assert.equal(MENU_TILE.left + MENU_TILE.right, 160);
  assert.match(html, /\.view-games, \.view-play \{ touch-action: none; \}/);
  assert.match(html, /\.gm-tile \{[^}]*touch-action: none;/);
});
