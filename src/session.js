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
// The ABC book has two pages (Slice 9A): capitals, then lowercase, switched by a
// picture tile at the end of the grid. `tiles` is every letter of the book (both
// pages); `pages` holds each page's tiles in board order.
// The 123 book (Slice 9B part 2): 0 to 20 in rows of ten (`cols`), so each
// teen sits under its ones digit (17 under 7) and 20 under 0.
const UPPER = LATIN('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
const NUMBERS = [...LATIN('0123456789'), ...Array.from({ length: 11 }, (_, k) => String(10 + k)).map((id) => ({ id, glyph: id }))];
const LOWER = LATIN('abcdefghijklmnopqrstuvwxyz');
export const BOARDS = {
  abc: { tiles: [...UPPER, ...LOWER], pages: { upper: UPPER, lower: LOWER }, dir: 'ltr', script: 'latin' },
  num: { tiles: NUMBERS, dir: 'ltr', script: 'latin', cols: 10 },
  urdu: { tiles: URDU, dir: 'rtl', script: 'urdu' },
};

// Tile colors: each is dark enough to read on white (contrast at least 4.5 : 1;
// tests/session.test.js checks it). No red: red is never used for her letters.
export const TILE_COLORS = ['#1565C0', '#2E7D32', '#6A1B9A', '#AD1457', '#00695C', '#8D5B00', '#4527A0', '#00838F'];

export const tileColor = (index) => TILE_COLORS[index % TILE_COLORS.length];

// The pages of a book, in order ('upper', 'lower'); a book without pages has one, 'all'.
export const pagesOf = (book) => Object.keys(BOARDS[book]?.pages ?? { all: true });
// The page a character is on: 'lower' for a to z, 'upper' for the other ABC letters, 'all' elsewhere.
export function pageOf(id) {
  for (const board of Object.values(BOARDS)) {
    for (const [page, tiles] of Object.entries(board.pages ?? {})) if (tiles.some((t) => t.id === id)) return page;
  }
  return 'all';
}
// The tiles of one page of a book (the whole book when it has no pages).
export const pageTiles = (book, page = 'upper') => BOARDS[book]?.pages?.[page] ?? BOARDS[book]?.tiles ?? [];
// The page to show: the state's, or the book's first.
export const pageNow = (state) => state.page ?? pagesOf(state.book)[0];

// A character's tile color on its board (her letter's color in a find scene), or
// null. Colors count from the start of its page, so a has A's color.
export function tileColorOf(id) {
  for (const [book, board] of Object.entries(BOARDS)) {
    for (const page of pagesOf(book)) {
      const i = pageTiles(book, page).findIndex((t) => t.id === id);
      if (i >= 0) return tileColor(i);
    }
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

// Every tile of a board page with bright (tappable: it is in the manifest), star,
// and due (one of today's reviews, src/review.js; only a bright tile can be due).
// `page`: 'upper' or 'lower' for the ABC book (Slice 9A); other books have one page.
export function boardTiles(book, manifest, stars = [], due = [], page = pagesOf(book)[0]) {
  const recorded = new Set(manifest);
  const starred = new Set(stars);
  const dueSet = new Set(due);
  return pageTiles(book, page).map((t, i) => ({
    ...t,
    color: tileColor(i),
    bright: recorded.has(t.id),
    star: starred.has(t.id),
    due: recorded.has(t.id) && dueSet.has(t.id),
  }));
}

// The switch tile (Slice 9A): the page it turns to, and whether that page holds
// one of today's due letters (then the switch glows too), or null for a book
// with one page.
export function pageSwitch(book, page, manifest, due = []) {
  const pages = pagesOf(book);
  if (pages.length < 2) return null;
  const to = pages[(pages.indexOf(page) + 1) % pages.length];
  const recorded = new Set(manifest);
  return { to, due: pageTiles(book, to).some((t) => recorded.has(t.id) && due.includes(t.id)) };
}

// Every character on every board, ABC (capitals, then lowercase) then 123 then Urdu: the order reviews break ties in.
export const BOARD_ORDER = Object.values(BOARDS).flatMap((b) => b.tiles.map((t) => t.id));

// The books that hold at least one of today's due letters (they glow on the shelf).
export const booksWithDue = (due) => [...new Set(due.map(bookOf).filter(Boolean))];

// The file name of a character: data/chars/<charFile(id)>.json. Lowercase
// letters are lower-a ... lower-z (Slice 9A), so a.json and A.json never
// clash on a computer whose file names ignore capitals (Windows, Mac).
export const charFile = (id) => (/^[a-z]$/.test(id) ? `lower-${id}` : id);
// The id a file name stands for (charFile turned round).
export const fileChar = (name) => (/^lower-[a-z]$/.test(name) ? name.slice('lower-'.length) : name);

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

// The tile size (CSS px) for n tiles in a fixed number of columns (the 123
// book's rows of ten), in a w x h box: { cols, rows, size }.
export function gridForCols(n, cols, w, h, gap = 12, max = 190) {
  const rows = Math.ceil(n / cols);
  return { cols, rows, size: Math.floor(Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows, max)) };
}

// A board page's grid: the book's fixed columns, or the best fit (gridFor).
export const boardGrid = (book, n, w, h, gap = 12) => (BOARDS[book]?.cols
  ? gridForCols(n, BOARDS[book].cols, w, h, gap) : gridFor(n, w, h, gap));

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
  { id: 'drawing', color: '#00897B', spine: '#005B52', open: true },
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
//   board  a letter board: book is 'abc', 'num' or 'urdu'; page is 'lower' on the
//          ABC book's lowercase page (Slice 9A), otherwise left out (the first page)
//   games  the games book. Step 1 (no kind): a tile per kind of game. Step 2
//          (kind is 'match', 'path', 'sort', 'odd' or 'missing'): that kind's sets
//   play   one game from the games book: game is a tile's id ('numbers', 'path-rooms', ...)
//   drawing the Drawing book: its menu of free drawing and dot-to-dot pictures
//   dots   one dot-to-dot picture: level 1, 2 or 3 and picture ('house', 'car-building', ...)
//   paper  the free-drawing page
//   write  the tracing game for char; book is the board she returns to (or null);
//          review: true for a review (one copy-it round, src/review.js)
//   find   the find or count scene after the last round of char (same book)
//   toys   her shelf of finds, from the toy box on the bookshelf

// The first screen. ?char=X goes straight to writing X; ?door=1 always shows the door.
export function startScreen({ lastVisit = null, today, forceDoor = false, char = null } = {}) {
  if (char) return { screen: 'write', char, book: bookOf(char) };
  if (forceDoor || isFirstVisitToday(lastVisit, today)) return { screen: 'door' };
  return { screen: 'shelf' };
}

const SHELF = { screen: 'shelf' };
// A board screen: the first page leaves `page` out, so its state stays { screen, book }.
const boardState = (book, page) => (page && page !== pagesOf(book)[0] && pagesOf(book).includes(page)
  ? { screen: 'board', book, page } : { screen: 'board', book });
// The games menu: each kind of game and its sets (src/games.js GAME_ROWS;
// tests/games-menu.test.js checks they agree). The ids are her saved stars.
export const GAME_KINDS = {
  match: ['numbers', 'colors', 'letters', 'shadows', 'shapes'],
  path: ['path', 'path-rooms'],
  sort: ['sort-colors', 'sort-kinds'],
  odd: ['odd-kinds', 'odd-colors'],
  missing: ['missing-1', 'missing-2', 'missing-3', 'missing-4'],
};
const kindOfGame = (game) => Object.keys(GAME_KINDS).find((k) => GAME_KINDS[k].includes(game));
const setsOf = (game) => ({ screen: 'games', kind: kindOfGame(game) });
// The Drawing book's pictures, per level (data/drawings.js has their dots).
const SIX = ['house', 'sun', 'fish', 'car', 'cat', 'tree'];
const DRAW_PICTURES = { 1: SIX, 2: SIX, 3: ['car-building', 'house-tree', 'fish-sun', 'cat-house'] };

// The next screen after an event. An event that does not apply changes nothing
// (the same state comes back). Events:
//   { type: 'openDoor' }                 door  -> shelf
//   { type: 'openBook', book }           shelf -> board or games (locked books: no change)
//   { type: 'turnPage' }                 board -> the book's other page (ABC only)
//   { type: 'openChar', id, manifest, review } board -> write (faint characters: no change);
//                                        review: true when the tile is due for review
//   { type: 'openScene' }                write -> find (the same char and book)
//   { type: 'letterDone' }               write or find -> its board, on the letter's page (or the shelf)
//   { type: 'openToys' }                 shelf -> toys
//   { type: 'openKind', kind }           games step 1 -> step 2 (that kind's sets)
//   { type: 'openGame', game }           games step 2 -> play (only that kind's sets)
//   { type: 'gameDone' }                 play -> games step 2 (the game's kind)
//   { type: 'openPicture', level, picture } drawing -> dots (only the book's pictures)
//   { type: 'openPaper' }                drawing -> paper
//   { type: 'pictureDone' }              dots -> drawing
//   { type: 'back' }                     play -> games step 2; games step 2 -> step 1;
//                                        dots or paper -> drawing;
//                                        games step 1, drawing or toys -> shelf
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
      if (event.book === 'drawing') return { screen: 'drawing' };
      return BOARDS[event.book] ? { screen: 'board', book: event.book } : state;
    }
    case 'turnPage': {
      if (screen !== 'board') return state;
      const pages = pagesOf(state.book);
      if (pages.length < 2) return state;
      return boardState(state.book, pages[(pages.indexOf(pageNow(state)) + 1) % pages.length]);
    }
    case 'openChar': {
      if (screen !== 'board') return state;
      const onBoard = pageTiles(state.book, pageNow(state)).some((t) => t.id === event.id);
      if (!onBoard || !canLoad(event.id, event.manifest ?? [])) return state;
      const write = { screen: 'write', char: event.id, book: state.book };
      return event.review === true ? { ...write, review: true } : write;
    }
    case 'openScene':
      return screen === 'write' ? { screen: 'find', char: state.char, book: state.book } : state;
    case 'letterDone':
      if (screen !== 'write' && screen !== 'find') return state;
      return state.book ? boardState(state.book, pageOf(state.char)) : SHELF;
    case 'openToys':
      return screen === 'shelf' ? { screen: 'toys' } : state;
    case 'openKind':
      return screen === 'games' && !state.kind && Object.hasOwn(GAME_KINDS, event.kind ?? '') ? { screen: 'games', kind: event.kind } : state;
    case 'openGame':
      return screen === 'games' && (Object.hasOwn(GAME_KINDS, state.kind ?? '') && GAME_KINDS[state.kind].includes(event.game)) ? { screen: 'play', game: event.game } : state;
    case 'gameDone':
      return screen === 'play' ? setsOf(state.game) : state;
    case 'openPicture':
      return screen === 'drawing' && DRAW_PICTURES[event.level]?.includes(event.picture)
        ? { screen: 'dots', level: event.level, picture: event.picture } : state;
    case 'openPaper':
      return screen === 'drawing' ? { screen: 'paper' } : state;
    case 'pictureDone':
      return screen === 'dots' ? { screen: 'drawing' } : state;
    case 'back':
      if (screen === 'play') return setsOf(state.game);
      if (screen === 'games' && state.kind) return { screen: 'games' };
      if (screen === 'dots' || screen === 'paper') return { screen: 'drawing' };
      return screen === 'games' || screen === 'drawing' || screen === 'toys' ? SHELF : state;
    default:
      return state;
  }
}

// Which background tune plays on a screen: none at the door; a calm, quiet one while she writes.
export function tuneFor(screen) {
  if (screen === 'shelf' || screen === 'toys') return 'shelf';
  if (['board', 'find', 'games', 'play', 'drawing', 'dots', 'paper'].includes(screen)) return 'board';
  if (screen === 'write') return 'write';
  return null;
}
