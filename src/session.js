// session.js — pure functions only. No DOM, no storage, no audio.
// What is on each board, which characters are bright, the first visit of the
// day, and how she moves from screen to screen. screens.js wires it to the page.

// ---------------------------------------------------------------------------
// The boards

const LATIN = (s) => [...s].map((ch) => ({ id: ch, glyph: ch }));

// Urdu letters in qaida order. Ids are ASCII (file names stay plain);
// the letter itself is `glyph` here and `letter` in its character file.
export const URDU = [
  ['ur-alif-madd', 'آ'], ['ur-alif', 'ا'], ['ur-be', 'ب'], ['ur-pe', 'پ'], ['ur-te', 'ت'],
  ['ur-tte', 'ٹ'], ['ur-se', 'ث'], ['ur-jeem', 'ج'], ['ur-che', 'چ'], ['ur-bari-he', 'ح'],
  ['ur-khe', 'خ'], ['ur-dal', 'د'], ['ur-ddal', 'ڈ'], ['ur-zal', 'ذ'], ['ur-re', 'ر'],
  ['ur-rre', 'ڑ'], ['ur-ze', 'ز'], ['ur-zhe', 'ژ'], ['ur-seen', 'س'], ['ur-sheen', 'ش'],
  ['ur-suad', 'ص'], ['ur-zuad', 'ض'], ['ur-toe', 'ط'], ['ur-zoe', 'ظ'], ['ur-ain', 'ع'],
  ['ur-ghain', 'غ'], ['ur-fe', 'ف'], ['ur-qaf', 'ق'], ['ur-kaf', 'ک'], ['ur-gaf', 'گ'],
  ['ur-lam', 'ل'], ['ur-meem', 'م'], ['ur-noon', 'ن'], ['ur-wao', 'و'], ['ur-chhoti-he', 'ہ'],
  ['ur-do-chashmi-he', 'ھ'], ['ur-hamza', 'ء'], ['ur-chhoti-ye', 'ی'], ['ur-bari-ye', 'ے'],
].map(([id, glyph]) => ({ id, glyph }));

// dir 'rtl': the board fills right to left, starting top right.
export const BOARDS = {
  abc: { tiles: LATIN('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), dir: 'ltr', script: 'latin' },
  num: { tiles: LATIN('0123456789'), dir: 'ltr', script: 'latin' },
  urdu: { tiles: URDU, dir: 'rtl', script: 'urdu' },
};

// Tile colors: each is dark enough to read on white (contrast at least 4.5 : 1;
// tests/session.test.js checks it). No red: red is never used for her letters.
export const TILE_COLORS = ['#1565C0', '#2E7D32', '#6A1B9A', '#AD1457', '#00695C', '#8D5B00', '#4527A0', '#00838F'];

export const tileColor = (index) => TILE_COLORS[index % TILE_COLORS.length];

// A character's tile color on its board (her letter's color in a find scene), or null.
export function tileColorOf(id) {
  for (const board of Object.values(BOARDS)) {
    const i = board.tiles.findIndex((t) => t.id === id);
    if (i >= 0) return tileColor(i);
  }
  return null;
}

// The board each character is on, or null.
export function bookOf(id) {
  for (const [book, board] of Object.entries(BOARDS)) {
    if (board.tiles.some((t) => t.id === id)) return book;
  }
  return null;
}

// Every tile of a board with bright (tappable: it is in the manifest) and star.
export function boardTiles(book, manifest, stars = []) {
  const recorded = new Set(manifest);
  const starred = new Set(stars);
  return (BOARDS[book]?.tiles ?? []).map((t, i) => ({
    ...t,
    color: tileColor(i),
    bright: recorded.has(t.id),
    star: starred.has(t.id),
  }));
}

// The app only ever requests character files listed in the manifest.
export const canLoad = (id, manifest) => typeof id === 'string' && manifest.includes(id);

// The board on screen, in CSS px: it starts right of the left button column,
// keeps `margin` from the other edges, and its frame (border plus padding)
// takes `frame` from each of its width and height. screens.js uses these too.
export const BOARD_BOX = { left: 136, margin: 24, frame: 60, gap: 12 };

// The space the tiles have on a w x h screen.
export const boardSpace = (w, h, box = BOARD_BOX) => ({
  w: w - box.left - box.margin - box.frame,
  h: h - 2 * box.margin - box.frame,
});

// Columns and tile size (CSS px) for n square tiles in a w x h box, with `gap`
// between them: the column count that gives the biggest tiles, capped at `max`.
// When several give the same size, the one with the fewest empty spaces wins.
export function gridFor(n, w, h, gap = 12, max = 190) {
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const size = Math.floor(Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows, max));
    const empty = cols * rows - n;
    if (!best || size > best.size || (size === best.size && empty < best.empty)) best = { cols, rows, size, empty };
  }
  return { cols: best.cols, rows: best.rows, size: best.size };
}

// ---------------------------------------------------------------------------
// The bookshelf

// Books in shelf order, left to right. `open: false` books are faint with a
// lock: a tap makes them wiggle and does nothing else.
export const BOOKS = [
  { id: 'abc', color: '#E53935', spine: '#A82420', open: true },
  { id: 'num', color: '#1E88E5', spine: '#135FA6', open: true },
  { id: 'urdu', color: '#43A047', spine: '#2C7330', open: true },
  { id: 'shapes', color: '#8E24AA', spine: '#621878', open: false },
  { id: 'games', color: '#FB8C00', spine: '#B86400', open: true },
  { id: 'drawing', color: '#00897B', spine: '#005B52', open: false },
  { id: 'stories', color: '#EC407A', spine: '#B02A59', open: false },
];

export const isBookOpen = (id) => BOOKS.some((b) => b.id === id && b.open);

// ---------------------------------------------------------------------------
// The first visit of the day

// The tablet's own calendar date, as 'YYYY-MM-DD'.
export function localDay(date) {
  const pad = (v) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// lastVisit: the saved day (or null). The door shows when it is not today.
export const isFirstVisitToday = (lastVisit, today) => lastVisit !== today;

// ---------------------------------------------------------------------------
// Screens and navigation
//
// A screen state is { screen, book?, char? }:
//   door   the house front (first visit of the day, or ?door=1)
//   shelf  the bookshelf (home)
//   board  a letter board: book is 'abc', 'num' or 'urdu'
//   games  the games book (a placeholder for now)
//   write  the tracing game for char; book is the board she returns to (or null)
//   find   the find or count scene after the last round of char (same book)
//   toys   her shelf of finds, from the toy box on the bookshelf

// The first screen. ?char=X goes straight to writing X; ?door=1 always shows the door.
export function startScreen({ lastVisit = null, today, forceDoor = false, char = null } = {}) {
  if (char) return { screen: 'write', char, book: bookOf(char) };
  if (forceDoor || isFirstVisitToday(lastVisit, today)) return { screen: 'door' };
  return { screen: 'shelf' };
}

const SHELF = { screen: 'shelf' };

// The next screen after an event. An event that does not apply changes nothing
// (the same state comes back). Events:
//   { type: 'openDoor' }                 door  -> shelf
//   { type: 'openBook', book }           shelf -> board or games (locked books: no change)
//   { type: 'openChar', id, manifest }   board -> write (faint characters: no change)
//   { type: 'openScene' }                write -> find (the same char and book)
//   { type: 'letterDone' }               write or find -> its board (or the shelf)
//   { type: 'openToys' }                 shelf -> toys
//   { type: 'back' }                     games or toys -> shelf
//   { type: 'home' }                     any screen -> shelf
export function navigate(state, event) {
  const { screen } = state;
  switch (event?.type) {
    case 'home':
      return screen === 'shelf' ? state : SHELF;
    case 'openDoor':
      return screen === 'door' ? SHELF : state;
    case 'openBook': {
      if (screen !== 'shelf' || !isBookOpen(event.book)) return state;
      if (event.book === 'games') return { screen: 'games' };
      return BOARDS[event.book] ? { screen: 'board', book: event.book } : state;
    }
    case 'openChar': {
      if (screen !== 'board') return state;
      const onBoard = BOARDS[state.book].tiles.some((t) => t.id === event.id);
      if (!onBoard || !canLoad(event.id, event.manifest ?? [])) return state;
      return { screen: 'write', char: event.id, book: state.book };
    }
    case 'openScene':
      return screen === 'write' ? { screen: 'find', char: state.char, book: state.book } : state;
    case 'letterDone':
      if (screen !== 'write' && screen !== 'find') return state;
      return state.book ? { screen: 'board', book: state.book } : SHELF;
    case 'openToys':
      return screen === 'shelf' ? { screen: 'toys' } : state;
    case 'back':
      return screen === 'games' || screen === 'toys' ? SHELF : state;
    default:
      return state;
  }
}

// Which background tune plays on a screen: none at the door; a calm, quiet one while she writes.
export function tuneFor(screen) {
  if (screen === 'shelf' || screen === 'games' || screen === 'toys') return 'shelf';
  if (screen === 'board' || screen === 'find') return 'board';
  if (screen === 'write') return 'write';
  return null;
}
