// Run: node --test tests/session.test.js
// The pure parts of the app shell: first visit of the day, the boards, navigation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARDS, URDU, BOOKS, TILE_COLORS, boardTiles, bookOf, canLoad, gridFor, boardSpace, BOARD_BOX,
  localDay, isFirstVisitToday, startScreen, navigate, tuneFor, isBookOpen,
} from '../src/session.js';
import { tileColorOf } from '../src/session.js';

const MANIFEST = ['E', 'F', 'H', 'I', 'L', 'T', '1', '4', '7'];

// ---------------------------------------------------------------------------
// First visit of the day

test('localDay is the tablet calendar date, zero-padded', () => {
  assert.equal(localDay(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(localDay(new Date(2026, 10, 2, 0, 0)), '2026-11-02');
});

test('the door shows on the first visit of each day only', () => {
  assert.equal(isFirstVisitToday(null, '2026-11-02'), true);
  assert.equal(isFirstVisitToday('2026-11-01', '2026-11-02'), true);
  assert.equal(isFirstVisitToday('2026-11-02', '2026-11-02'), false);
  // A clock set back still counts as a new day: the door is never a problem.
  assert.equal(isFirstVisitToday('2026-11-03', '2026-11-02'), true);
});

test('startScreen: door on a new day, shelf later the same day, ?door=1 always the door', () => {
  const today = '2026-11-02';
  assert.deepEqual(startScreen({ lastVisit: null, today }), { screen: 'door' });
  assert.deepEqual(startScreen({ lastVisit: '2026-11-01', today }), { screen: 'door' });
  assert.deepEqual(startScreen({ lastVisit: today, today }), { screen: 'shelf' });
  assert.deepEqual(startScreen({ lastVisit: today, today, forceDoor: true }), { screen: 'door' });
});

test('startScreen: ?char=X goes straight to writing X, returning to its board', () => {
  const today = '2026-11-02';
  assert.deepEqual(startScreen({ lastVisit: null, today, char: 'L' }), { screen: 'write', char: 'L', book: 'abc' });
  assert.deepEqual(startScreen({ lastVisit: today, today, char: '7' }), { screen: 'write', char: '7', book: 'num' });
  assert.deepEqual(startScreen({ today, char: 'ur-be' }), { screen: 'write', char: 'ur-be', book: 'urdu' });
  assert.deepEqual(startScreen({ today, char: 'zz' }), { screen: 'write', char: 'zz', book: null });
});

// ---------------------------------------------------------------------------
// The boards

test('ABC is A to Z and 123 is 0 to 9, left to right', () => {
  assert.equal(BOARDS.abc.tiles.map((t) => t.glyph).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.equal(BOARDS.num.tiles.map((t) => t.glyph).join(''), '0123456789');
  assert.equal(BOARDS.abc.dir, 'ltr');
  assert.equal(BOARDS.num.dir, 'ltr');
});

test('the Urdu board: 39 letters in qaida order, right to left from the top right', () => {
  const order = 'آ ا ب پ ت ٹ ث ج چ ح خ د ڈ ذ ر ڑ ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن و ہ ھ ء ی ے'.split(' ');
  assert.equal(order.length, 39);
  assert.deepEqual(URDU.map((t) => t.glyph), order);
  assert.equal(BOARDS.urdu.dir, 'rtl');
  assert.equal(URDU[0].id, 'ur-alif-madd');
  assert.equal(URDU[1].id, 'ur-alif');
  assert.equal(URDU[2].id, 'ur-be');
});

test('every tile id is unique and ASCII', () => {
  const ids = Object.values(BOARDS).flatMap((b) => b.tiles.map((t) => t.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9-]+$/, id);
  for (const t of URDU) assert.match(t.id, /^ur-[a-z]+(-[a-z]+)*$/, t.id);
});

test('bright tiles are exactly the manifest characters on that board', () => {
  const bright = (book) => boardTiles(book, MANIFEST).filter((t) => t.bright).map((t) => t.id);
  assert.deepEqual(bright('abc'), ['E', 'F', 'H', 'I', 'L', 'T']);
  assert.deepEqual(bright('num'), ['1', '4', '7']);
  assert.deepEqual(bright('urdu'), []);
  assert.deepEqual(boardTiles('urdu', ['ur-be', 'ur-te']).filter((t) => t.bright).map((t) => t.glyph), ['ب', 'ت']);
  assert.equal(boardTiles('abc', MANIFEST).length, 26);
  assert.deepEqual(boardTiles('abc', []).filter((t) => t.bright), []);
});

test('stars show on the characters she completed', () => {
  const tiles = boardTiles('abc', MANIFEST, ['L', '7']);
  assert.deepEqual(tiles.filter((t) => t.star).map((t) => t.id), ['L']);
});

test('the app only loads characters in the manifest', () => {
  assert.equal(canLoad('L', MANIFEST), true);
  assert.equal(canLoad('B', MANIFEST), false);
  assert.equal(canLoad('L.example', MANIFEST), false);
  assert.equal(canLoad(null, MANIFEST), false);
});

test('bookOf finds the board of a character', () => {
  assert.equal(bookOf('A'), 'abc');
  assert.equal(bookOf('0'), 'num');
  assert.equal(bookOf('ur-bari-ye'), 'urdu');
  assert.equal(bookOf('nope'), null);
});

// WCAG relative-luminance contrast against white.
function contrastOnWhite(hex) {
  const ch = (i) => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * ch(0) + 0.7152 * ch(1) + 0.0722 * ch(2);
  return 1.05 / (lum + 0.05);
}

test('every tile color reads on white (contrast at least 4.5 : 1)', () => {
  for (const c of TILE_COLORS) assert.ok(contrastOnWhite(c) >= 4.5, `${c}: ${contrastOnWhite(c).toFixed(2)}`);
});

test('tiles are at least 88 px on every board at 1280 x 626 and in the full screen', () => {
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    const space = boardSpace(w, h);
    for (const [book, board] of Object.entries(BOARDS)) {
      const g = gridFor(board.tiles.length, space.w, space.h, BOARD_BOX.gap);
      assert.ok(g.size >= 88, `${book} at ${w}x${h}: ${g.size}px`);
      assert.ok(g.cols * g.rows >= board.tiles.length);
    }
  }
});

test('gridFor picks the column count with the biggest tiles', () => {
  assert.deepEqual(gridFor(4, 400, 400, 0, 1000), { cols: 2, rows: 2, size: 200 });
  assert.deepEqual(gridFor(4, 800, 200, 0, 1000), { cols: 4, rows: 1, size: 200 });
  assert.equal(gridFor(10, 2000, 2000, 0, 190).size, 190);
  // Same size either way: 0 to 9 as two full rows of 5, not 4 + 4 + 2.
  assert.deepEqual(gridFor(10, 1060, 692, 12, 190), { cols: 5, rows: 2, size: 190 });
});

// ---------------------------------------------------------------------------
// The bookshelf

test('seven books in order; ABC, 123, Urdu and Games open, the rest locked', () => {
  assert.deepEqual(BOOKS.map((b) => b.id), ['abc', 'num', 'urdu', 'shapes', 'games', 'drawing', 'stories']);
  assert.deepEqual(BOOKS.filter((b) => b.open).map((b) => b.id), ['abc', 'num', 'urdu', 'games']);
  assert.equal(isBookOpen('shapes'), false);
  assert.equal(isBookOpen('nope'), false);
});

// ---------------------------------------------------------------------------
// Navigation

const DOOR = { screen: 'door' };
const SHELF = { screen: 'shelf' };
const ABC = { screen: 'board', book: 'abc' };

test('door -> shelf', () => {
  assert.deepEqual(navigate(DOOR, { type: 'openDoor' }), SHELF);
  assert.equal(navigate(SHELF, { type: 'openDoor' }), SHELF);
});

test('shelf -> each open book; locked books do nothing', () => {
  assert.deepEqual(navigate(SHELF, { type: 'openBook', book: 'abc' }), ABC);
  assert.deepEqual(navigate(SHELF, { type: 'openBook', book: 'num' }), { screen: 'board', book: 'num' });
  assert.deepEqual(navigate(SHELF, { type: 'openBook', book: 'urdu' }), { screen: 'board', book: 'urdu' });
  assert.deepEqual(navigate(SHELF, { type: 'openBook', book: 'games' }), { screen: 'games' });
  for (const book of ['shapes', 'drawing', 'stories', 'nope']) {
    assert.equal(navigate(SHELF, { type: 'openBook', book }), SHELF, book);
  }
  assert.equal(navigate(ABC, { type: 'openBook', book: 'num' }), ABC);
});

test('board -> write for a bright character only', () => {
  assert.deepEqual(navigate(ABC, { type: 'openChar', id: 'L', manifest: MANIFEST }), { screen: 'write', char: 'L', book: 'abc' });
  assert.equal(navigate(ABC, { type: 'openChar', id: 'B', manifest: MANIFEST }), ABC); // faint
  assert.equal(navigate(ABC, { type: 'openChar', id: '7', manifest: MANIFEST }), ABC); // not on this board
  assert.equal(navigate(ABC, { type: 'openChar', id: 'L' }), ABC);                     // no manifest
});

test('write -> back to its board when the letter is done', () => {
  const write = { screen: 'write', char: 'L', book: 'abc' };
  assert.deepEqual(navigate(write, { type: 'letterDone' }), ABC);
  assert.deepEqual(navigate({ screen: 'write', char: 'zz', book: null }, { type: 'letterDone' }), SHELF);
  assert.equal(navigate(ABC, { type: 'letterDone' }), ABC);
});

test('home returns to the shelf from any screen; back leaves the games book', () => {
  for (const s of [DOOR, ABC, { screen: 'games' }, { screen: 'write', char: 'L', book: 'abc' }]) {
    assert.deepEqual(navigate(s, { type: 'home' }), SHELF, s.screen);
  }
  assert.equal(navigate(SHELF, { type: 'home' }), SHELF);
  assert.deepEqual(navigate({ screen: 'games' }, { type: 'back' }), SHELF);
  assert.equal(navigate(ABC, { type: 'back' }), ABC);
  assert.equal(navigate(ABC, { type: 'nothing' }), ABC);
});

test('music: the shelf tune, the board tune, silence at the door, a calm tune while she writes', () => {
  assert.equal(tuneFor('shelf'), 'shelf');
  assert.equal(tuneFor('games'), 'board'); // Slice 5D: the games play the board tune
  assert.equal(tuneFor('board'), 'board');
  assert.equal(tuneFor('write'), 'write');
  assert.equal(tuneFor('door'), null);
});

test('the writing tune is calmer and plays at a third of the volume', async () => {
  const { TUNES } = await import('../src/music.js');
  assert.equal(TUNES.write.volume, 1 / 3);
  assert.equal(TUNES.write.wave, 'sine');
  assert.ok(TUNES.write.bpm < TUNES.shelf.bpm && TUNES.write.bpm < TUNES.board.bpm);
  const rests = (t) => t.mel.filter((n) => n === null).length / t.mel.length;
  assert.ok(rests(TUNES.write) > rests(TUNES.board));
});

test('Slice 5C: write -> find scene -> its board; the shelf -> her finds and back', () => {
  const write = { screen: 'write', char: 'E', book: 'abc' };
  const find = navigate(write, { type: 'openScene' });
  assert.deepEqual(find, { screen: 'find', char: 'E', book: 'abc' });
  assert.deepEqual(navigate(find, { type: 'letterDone' }), ABC);
  assert.deepEqual(navigate({ screen: 'find', char: '4', book: 'num' }, { type: 'letterDone' }), { screen: 'board', book: 'num' });
  assert.equal(navigate(ABC, { type: 'openScene' }), ABC);
  assert.deepEqual(navigate(find, { type: 'home' }), SHELF);
  const toys = navigate(SHELF, { type: 'openToys' });
  assert.deepEqual(toys, { screen: 'toys' });
  assert.deepEqual(navigate(toys, { type: 'home' }), SHELF);
  assert.deepEqual(navigate(toys, { type: 'back' }), SHELF);
  assert.equal(navigate(ABC, { type: 'openToys' }), ABC);
  assert.equal(tuneFor('find'), 'board');
  assert.equal(tuneFor('toys'), 'shelf');
});

test('a character\'s tile color, for her letter in a find scene', () => {
  assert.equal(tileColorOf('A'), TILE_COLORS[0]);
  assert.equal(tileColorOf('E'), TILE_COLORS[4]);
  assert.equal(tileColorOf('4'), TILE_COLORS[4]);
  assert.equal(tileColorOf('zz'), null);
});

test('Slice 5D: games -> a game -> back to the games; home goes to the shelf', () => {
  const games = navigate(SHELF, { type: 'openBook', book: 'games' });
  assert.deepEqual(games, { screen: 'games' });
  for (const game of ['numbers', 'colors', 'path']) {
    const play = navigate(games, { type: 'openGame', game });
    assert.deepEqual(play, { screen: 'play', game });
    assert.deepEqual(navigate(play, { type: 'gameDone' }), games);
    assert.deepEqual(navigate(play, { type: 'back' }), games);
    assert.deepEqual(navigate(play, { type: 'home' }), SHELF);
  }
  assert.equal(navigate(games, { type: 'openGame', game: 'chess' }), games);
  assert.equal(navigate(SHELF, { type: 'openGame', game: 'path' }), SHELF);
  assert.equal(navigate(ABC, { type: 'gameDone' }), ABC);
  assert.equal(tuneFor('play'), 'board');
});
