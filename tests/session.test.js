// Run: node --test tests/session.test.js
// The pure parts of the app shell: first visit of the day, the boards, navigation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARDS, URDU, BOOKS, TILE_COLORS, boardTiles, bookOf, canLoad, gridFor, boardSpace, BOARD_BOX,
  localDay, isFirstVisitToday, startScreen, navigate, tuneFor, isBookOpen,
  pagesOf, pageTiles, pageNow, pageOf, pageSwitch,
} from '../src/session.js';
import { tileColorOf } from '../src/session.js';
import { GAMES, kindOf } from '../src/games.js';

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

test('ABC is A to Z then a to z (two pages) and 123 is 0 to 20, left to right', () => {
  assert.equal(BOARDS.abc.tiles.map((t) => t.glyph).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
  assert.equal(BOARDS.abc.pages.upper.map((t) => t.glyph).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.equal(BOARDS.abc.pages.lower.map((t) => t.glyph).join(''), 'abcdefghijklmnopqrstuvwxyz');
  assert.deepEqual(BOARDS.num.tiles.map((t) => t.glyph), Array.from({ length: 21 }, (_, k) => String(k))); // Slice 9B: 0 to 20
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

test('tiles are at least 88 px on every board page at 1280 x 626 and in the full screen', () => {
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    const space = boardSpace(w, h);
    for (const book of Object.keys(BOARDS)) {
      for (const page of pagesOf(book)) {
        // A page of a book with two pages has the switch tile at the end too.
        const n = pageTiles(book, page).length + (pagesOf(book).length > 1 ? 1 : 0);
        const g = gridFor(n, space.w, space.h, BOARD_BOX.gap);
        assert.ok(g.size >= 88, `${book} ${page} at ${w}x${h}: ${g.size}px`);
        assert.ok(g.cols * g.rows >= n);
      }
    }
  }
  // Slice 9A: each ABC page, 26 letters and the switch, is 7 columns of 120 px tiles at 1280 x 626.
  const s = boardSpace(1280, 626);
  assert.deepEqual(gridFor(27, s.w, s.h, BOARD_BOX.gap), { cols: 7, rows: 4, size: 120 });
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

test('eight books in order, her name first; name, ABC, 123, Urdu, Games and Drawing open, the rest locked', () => {
  assert.deepEqual(BOOKS.map((b) => b.id), ['name', 'abc', 'num', 'urdu', 'shapes', 'games', 'drawing', 'stories']); // Slice 9C: her name first
  assert.deepEqual(BOOKS.filter((b) => b.open).map((b) => b.id), ['name', 'abc', 'num', 'urdu', 'games', 'drawing']); // Slice 5E opens Drawing
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
  for (const book of ['shapes', 'stories', 'nope']) {
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

test('Slice 5D: games -> a game -> back to its sets; home goes to the shelf', () => {
  const games = navigate(SHELF, { type: 'openBook', book: 'games' });
  assert.deepEqual(games, { screen: 'games' });
  for (const game of GAMES) {
    const sets = navigate(games, { type: 'openKind', kind: kindOf(game) });
    const play = navigate(sets, { type: 'openGame', game });
    assert.deepEqual(play, { screen: 'play', game });
    assert.deepEqual(navigate(play, { type: 'gameDone' }), sets);
    assert.deepEqual(navigate(play, { type: 'back' }), sets);
    assert.deepEqual(navigate(play, { type: 'home' }), SHELF);
  }
  const match = navigate(games, { type: 'openKind', kind: 'match' });
  assert.equal(navigate(match, { type: 'openGame', game: 'chess' }), match);
  assert.equal(navigate(SHELF, { type: 'openGame', game: 'path' }), SHELF);
  assert.equal(navigate(ABC, { type: 'gameDone' }), ABC);
  assert.equal(tuneFor('play'), 'board');
});

test('Slice 5E: shelf -> drawing -> a picture or the paper -> back to drawing; home to the shelf', () => {
  const drawing = navigate(SHELF, { type: 'openBook', book: 'drawing' });
  assert.deepEqual(drawing, { screen: 'drawing' });
  const dots = navigate(drawing, { type: 'openPicture', level: 1, picture: 'house' });
  assert.deepEqual(dots, { screen: 'dots', level: 1, picture: 'house' });
  assert.deepEqual(navigate(dots, { type: 'pictureDone' }), drawing);
  assert.deepEqual(navigate(dots, { type: 'back' }), drawing);
  assert.deepEqual(navigate(dots, { type: 'home' }), SHELF);
  assert.deepEqual(navigate(drawing, { type: 'openPicture', level: 3, picture: 'fish-sun' }), { screen: 'dots', level: 3, picture: 'fish-sun' });
  assert.equal(navigate(drawing, { type: 'openPicture', level: 3, picture: 'house' }), drawing);
  assert.equal(navigate(drawing, { type: 'openPicture', level: 1, picture: 'building' }), drawing);
  assert.equal(navigate(drawing, { type: 'openPicture', level: 4, picture: 'house' }), drawing);
  const paper = navigate(drawing, { type: 'openPaper' });
  assert.deepEqual(paper, { screen: 'paper' });
  assert.deepEqual(navigate(paper, { type: 'back' }), drawing);
  assert.deepEqual(navigate(paper, { type: 'home' }), SHELF);
  assert.deepEqual(navigate(drawing, { type: 'back' }), SHELF);
  assert.equal(navigate(SHELF, { type: 'openPaper' }), SHELF);
  for (const screen of ['drawing', 'dots', 'paper']) assert.equal(tuneFor(screen), 'board');
});

// ---- reviews (Slice 5I) ----
import { booksWithDue, BOARD_ORDER } from '../src/session.js';

test('a tile due for review is flagged; only a bright tile can be due', () => {
  const tiles = boardTiles('abc', ['A', 'B'], ['A'], ['A', 'C']);
  const by = Object.fromEntries(tiles.map((t) => [t.id, t]));
  assert.equal(by.A.due, true);
  assert.equal(by.A.star, true);
  assert.equal(by.B.due, false);
  assert.equal(by.C.due, false); // not in the manifest: faint, never due
  assert.ok(boardTiles('abc', ['A']).every((t) => t.due === false));
});

test('books that hold a due letter glow; board order is ABC, 123, Urdu', () => {
  assert.deepEqual(booksWithDue(['A', '3', 'B']).sort(), ['abc', 'num']);
  assert.deepEqual(booksWithDue([]), []);
  assert.deepEqual(booksWithDue(['a']), ['abc']); // a lowercase letter is in the ABC book
  assert.deepEqual(BOARD_ORDER.slice(0, 3), ['A', 'B', 'C']);
  assert.equal(BOARD_ORDER[26], 'a');
  assert.equal(BOARD_ORDER[52], '0');
  assert.equal(BOARD_ORDER[62], '10'); // Slice 9B: 10 to 20 after 9
  assert.equal(BOARD_ORDER[72], '20');
  assert.equal(BOARD_ORDER[73], 'ur-alif-madd');
  assert.deepEqual(booksWithDue(['17']), ['num']);
});

test('tapping a due tile opens a review; any other tile, a practice', () => {
  const board = { screen: 'board', book: 'abc' };
  assert.deepEqual(navigate(board, { type: 'openChar', id: 'L', manifest: ['L'], review: true }), { screen: 'write', char: 'L', book: 'abc', review: true });
  assert.deepEqual(navigate(board, { type: 'openChar', id: 'L', manifest: ['L'] }), { screen: 'write', char: 'L', book: 'abc' });
  const review = navigate(board, { type: 'openChar', id: 'L', manifest: ['L'], review: true });
  assert.deepEqual(navigate(review, { type: 'openScene' }), { screen: 'find', char: 'L', book: 'abc' });
  assert.deepEqual(navigate(review, { type: 'letterDone' }), board);
});

// ---- the ABC book's two pages (Slice 9A) ----

test('the ABC book opens on its capitals page; the switch turns to lowercase and back', () => {
  const abc = navigate({ screen: 'shelf' }, { type: 'openBook', book: 'abc' });
  assert.deepEqual(abc, { screen: 'board', book: 'abc' });
  assert.equal(pageNow(abc), 'upper');
  const lower = navigate(abc, { type: 'turnPage' });
  assert.deepEqual(lower, { screen: 'board', book: 'abc', page: 'lower' });
  assert.deepEqual(navigate(lower, { type: 'turnPage' }), abc);
  // Books with one page do not turn.
  const num = { screen: 'board', book: 'num' };
  assert.equal(navigate(num, { type: 'turnPage' }), num);
  assert.equal(navigate({ screen: 'shelf' }, { type: 'turnPage' }).screen, 'shelf');
});

test('a page shows only its own letters, and a letter opens only from its page', () => {
  const manifest = ['A', 'a'];
  assert.equal(boardTiles('abc', manifest).length, 26);
  assert.deepEqual(boardTiles('abc', manifest, [], [], 'lower').slice(0, 2).map((t) => [t.id, t.bright]), [['a', true], ['b', false]]);
  const lower = { screen: 'board', book: 'abc', page: 'lower' };
  assert.deepEqual(navigate(lower, { type: 'openChar', id: 'a', manifest }), { screen: 'write', char: 'a', book: 'abc' });
  assert.equal(navigate(lower, { type: 'openChar', id: 'A', manifest }), lower);
});

test('after a lowercase letter she comes back to the lowercase page; after a capital, to the capitals', () => {
  const lower = navigate({ screen: 'write', char: 'g', book: 'abc' }, { type: 'letterDone' });
  assert.deepEqual(lower, { screen: 'board', book: 'abc', page: 'lower' });
  const found = navigate(navigate({ screen: 'write', char: 'g', book: 'abc' }, { type: 'openScene' }), { type: 'letterDone' });
  assert.deepEqual(found, lower);
  assert.deepEqual(navigate({ screen: 'write', char: 'G', book: 'abc' }, { type: 'letterDone' }), { screen: 'board', book: 'abc' });
  assert.deepEqual(startScreen({ today: '2026-11-15', lastVisit: '2026-11-15', char: 'g' }), { screen: 'write', char: 'g', book: 'abc' });
});

test('each lowercase letter has its capital\'s color', () => {
  for (const ch of 'abcdefghijklmnopqrstuvwxyz') assert.equal(tileColorOf(ch), tileColorOf(ch.toUpperCase()), ch);
  assert.equal(pageOf('a'), 'lower');
  assert.equal(pageOf('A'), 'upper');
  assert.equal(pageOf('3'), 'all');
});

test('the switch tile: turns to the other page, and glows when that page has a letter due today', () => {
  const manifest = ['A', 'a', 'b'];
  assert.deepEqual(pageSwitch('abc', 'upper', manifest, []), { to: 'lower', due: false });
  assert.deepEqual(pageSwitch('abc', 'upper', manifest, ['a']), { to: 'lower', due: true });
  assert.deepEqual(pageSwitch('abc', 'lower', manifest, ['a']), { to: 'upper', due: false });
  assert.deepEqual(pageSwitch('abc', 'lower', manifest, ['A']), { to: 'upper', due: true });
  assert.equal(pageSwitch('num', 'all', manifest, []), null);
});

// ---------------------------------------------------------------------------
// Slice 5L: the pencil tile and practice mode

import { hasPencil, PRACTICE_BOOKS, boardTileCount, boardGrid } from '../src/session.js';

const ALL = BOARDS.abc.tiles.map((t) => t.id).concat(BOARDS.num.tiles.map((t) => t.id));

test('practice mode: the pencil badge only on starred, bright tiles; every other tile is faint', () => {
  const stars = ['E', 'H', '4', 'Q']; // Q is starred but not in this manifest
  for (const [book, page] of [['abc', 'upper'], ['abc', 'lower'], ['num', 'all']]) {
    const off = boardTiles(book, MANIFEST, stars, [], page === 'all' ? undefined : page);
    assert.ok(off.every((t) => t.pencil === false), 'no pencil outside practice mode');
    assert.ok(off.every((t) => t.open === t.bright), 'outside practice mode a tile opens when bright, as before');
    const on = boardTiles(book, MANIFEST, stars, [], page === 'all' ? undefined : page, true);
    for (const t of on) {
      const starred = stars.includes(t.id) && MANIFEST.includes(t.id);
      assert.equal(t.pencil, starred, `${t.id}`);
      assert.equal(t.open, starred, `${t.id}: only a pencil tile opens`);
      assert.equal(t.star, stars.includes(t.id)); // stars still show
    }
  }
  // Slice 10D: Urdu has its pencil tile too: only a starred Urdu letter shows the badge.
  const urdu = boardTiles('urdu', [...MANIFEST, 'ur-be', 'ur-te'], ['ur-be'], [], undefined, true);
  assert.deepEqual(urdu.filter((t) => t.pencil).map((t) => t.id), ['ur-be']);
  assert.deepEqual(PRACTICE_BOOKS, ['abc', 'num', 'urdu']);
  assert.equal(hasPencil('urdu'), true);
});

test('the pencil tile turns practice mode on and off; leaving the board ends it', () => {
  const board = { screen: 'board', book: 'abc' };
  const on = navigate(board, { type: 'togglePractice' });
  assert.deepEqual(on, { screen: 'board', book: 'abc', practice: true });
  assert.deepEqual(navigate(on, { type: 'togglePractice' }), board);
  // Turning the page keeps it; the lowercase page too.
  const lower = navigate(on, { type: 'turnPage' });
  assert.deepEqual(lower, { screen: 'board', book: 'abc', page: 'lower', practice: true });
  assert.deepEqual(navigate(lower, { type: 'togglePractice' }), { screen: 'board', book: 'abc', page: 'lower' });
  // 123 has one too; and since Slice 10D, Urdu.
  assert.deepEqual(navigate({ screen: 'board', book: 'num' }, { type: 'togglePractice' }), { screen: 'board', book: 'num', practice: true });
  assert.deepEqual(navigate({ screen: 'board', book: 'urdu' }, { type: 'togglePractice' }), { screen: 'board', book: 'urdu', practice: true });
  // Home leaves the board: practice mode is gone when she comes back.
  assert.deepEqual(navigate(on, { type: 'home' }), { screen: 'shelf' });
  assert.deepEqual(navigate(navigate(on, { type: 'home' }), { type: 'openBook', book: 'abc' }), board);
});

test('in practice mode a starred tile opens its practice page; back returns to its board, practice mode off', () => {
  const on = { screen: 'board', book: 'abc', practice: true };
  const page = navigate(on, { type: 'openPractice', id: 'E', manifest: MANIFEST, stars: ['E'] });
  assert.deepEqual(page, { screen: 'practice', char: 'E', book: 'abc' });
  // Not starred, not bright, not on this page, or not in practice mode: nothing happens.
  assert.equal(navigate(on, { type: 'openPractice', id: 'F', manifest: MANIFEST, stars: ['E'] }), on);
  assert.equal(navigate(on, { type: 'openPractice', id: 'Q', manifest: MANIFEST, stars: ['Q'] }), on);
  assert.equal(navigate(on, { type: 'openPractice', id: '4', manifest: MANIFEST, stars: ['4'] }), on);
  const off = { screen: 'board', book: 'abc' };
  assert.equal(navigate(off, { type: 'openPractice', id: 'E', manifest: MANIFEST, stars: ['E'] }), off);
  // In practice mode a tile never opens the usual tracing.
  assert.equal(navigate(on, { type: 'openChar', id: 'E', manifest: MANIFEST }), on);
  assert.deepEqual(navigate(off, { type: 'openChar', id: 'E', manifest: MANIFEST }), { screen: 'write', char: 'E', book: 'abc' });
  // Back from the practice page: the letter's own board page, practice mode off. Home: the shelf.
  assert.deepEqual(navigate(page, { type: 'back' }), off);
  assert.deepEqual(navigate({ screen: 'practice', char: 'e', book: 'abc' }, { type: 'back' }), { screen: 'board', book: 'abc', page: 'lower' });
  assert.deepEqual(navigate({ screen: 'practice', char: '4', book: 'num' }, { type: 'back' }), { screen: 'board', book: 'num' });
  assert.deepEqual(navigate(page, { type: 'home' }), { screen: 'shelf' });
  assert.equal(tuneFor('practice'), 'write');
  // ?practice=A (for checks) opens it straight away.
  assert.deepEqual(startScreen({ today: '2026-11-17', practice: 'A' }), { screen: 'practice', char: 'A', book: 'abc' });
  assert.ok(ALL.length > 0);
});

test('with the pencil tile, every board tile is still at least 88 px on both screens', () => {
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    const space = boardSpace(w, h);
    for (const [book, page] of [['abc', 'upper'], ['abc', 'lower'], ['num', 'all'], ['urdu', 'all']]) {
      const n = boardTileCount(book, page === 'all' ? undefined : page);
      const { size } = boardGrid(book, n, space.w, space.h, BOARD_BOX.gap);
      assert.ok(size >= 88, `${book} ${page} ${w}x${h}: ${size} px`);
    }
  }
  // The counts: 26 letters + "A a" + pencil; 21 numbers + pencil; 39 Urdu letters + pencil (Slice 10D) + magnifying glass (Slice 10F).
  assert.equal(boardTileCount('abc', 'upper'), 28);
  assert.equal(boardTileCount('abc', 'lower'), 28);
  assert.equal(boardTileCount('num'), 22);
  assert.equal(boardTileCount('urdu'), 41);
});
