// screens.js — the app shell: front door, bookshelf, letter boards, the games
// book and its games (match.js, path.js), the Drawing book (dots.js, paper.js),
// the writing screen around game.js,
// the find and count scene after it (scene.js) and her shelf of finds. session.js decides where each
// tap leads; this file draws the screens and plays the little animations.
// Child-screen rules: no text but the characters themselves, nothing red as
// feedback, every child target at least 88 CSS px, only Jugnu and the buttons
// float on the left.

import {
  BOARDS, BOOKS, BOARD_BOX, boardTiles, boardSpace, gridFor, localDay,
  startScreen, navigate, tuneFor, bookOf, tileColorOf, BOARD_ORDER, booksWithDue,
} from './session.js';
import {
  readLastVisit, saveLastVisit, readStars, saveStar, readMusic, saveMusic, readFinds,
  readGameStars, saveGameStar, readDrawStars, saveDrawStar, readMissingRounds,
  readReviews, saveReviews, readPracticeMore, savePracticeMore, logAttempt, useStore, testStore,
} from './storage.js';
import {
  enrolStars, pickToday, dueToday, recordPractice, recordReview, reviewLogEntry, isDay,
} from './review.js';
import { unlock, doorSound, popSound } from './audio.js';
import { setMusicOn, setTune, resumeMusic } from './music.js';
import { startGame } from './game.js';
import { HOUSE, DOOR, ICONS, STAR, TURN, DUE_MARK, bookCover } from './art.js';
import { isUpright } from './render.js';
import { startScene } from './scene.js';
import { afterWriting, lastGroupKind, findArt, SHELF_SHOWS } from './finds.js';
import { TOYBOX } from '../data/finds.js';
import { GAME_KINDS, gamesOf, kindStars, gameTile, kindOf } from './games.js';
import { gameNote } from './notes.js';
import { MENU, KIND_MENU } from '../data/games.js';
import { playMatch } from './match.js';
import { playPath } from './path.js';
import { playSort } from './sort.js';
import { playOdd } from './odd.js';
import { playMissing } from './missing.js';
import { playDots } from './dots.js';
import { playPaper } from './paper.js';
import { LEVELS, levelPictures, levelOpen, pictureId } from './drawing.js';
import { pictureSVG, previewSVG, LEVEL_MARK, PAPER_TILE } from '../data/drawings.js';

// The games menu's tiles: each game's frame color.
const GAME_COLORS = {
  numbers: '#1E88E5', colors: '#FB8C00', letters: '#3949AB', shadows: '#546E7A', shapes: '#8E24AA',
  path: '#43A047', 'path-rooms': '#00897B', 'sort-colors': '#E8590C', 'sort-kinds': '#6D4C41',
  'odd-kinds': '#C2185B', 'odd-colors': '#5E35B1',
  'missing-1': '#D81B60', 'missing-2': '#1E88E5', 'missing-3': '#F9A825', 'missing-4': '#00897B',
};
// The first step's tiles: each kind of game's frame color.
const KIND_COLORS = { match: '#1E88E5', path: '#43A047', sort: '#E8590C', odd: '#C2185B', missing: '#5E35B1' };

const DOOR_OPEN_MS = 1100; // the door swings open, then the bookshelf
const BOOK_OPEN_MS = 650;  // a book's cover opens, then its screen
const TILE_PICK_MS = 220;  // a bright character pops, then writing starts

const JUGNU_IMG = '<img class="buddy" src="assets/jugnu.svg" alt="" draggable="false">';

// els: { shell, area, lines, ink, fx, jugnu, rounds, home, back, music, turn }
// options: { manifest, params (URLSearchParams), now (Date) }
export function startShell(els, { manifest, params, now = new Date() }) {
  const debugOn = params.get('debug') === '1';
  // ?debug=1&today=2026-11-08 pretends the tablet's date is that day, to check
  // reviews. Everything saved then goes to separate test keys (storage.js
  // testStore), so her real progress is never touched.
  const debugToday = debugOn && isDay(params.get('today')) ? params.get('today') : null;
  if (debugToday) useStore(testStore(globalThis.localStorage));
  let state = startScreen({
    lastVisit: readLastVisit(),
    today: localDay(now),
    forceDoor: params.get('door') === '1',
    char: params.get('char'),
  });
  // index.html?scene=E opens the find (or count) scene of E straight away (for checks).
  const sceneChar = params.get('scene');
  if (sceneChar && bookOf(sceneChar)) state = navigate({ screen: 'write', char: sceneChar, book: bookOf(sceneChar) }, { type: 'openScene' });
  let busy = false;   // an opening animation is playing: taps wait
  let game = null;    // the running tracing game, while she writes
  let musicOn = readMusic();
  let upright = false; // the tablet is upright: the turn picture covers everything

  // ---- reviews (Slice 5I) ----
  // The tablet's calendar day, read afresh each time (the app may stay open past
  // midnight), or the pretend day of ?debug=1&today= (see the top of startShell).
  const todayNow = () => debugToday ?? localDay(new Date());

  // Today's due letters (at most 2): picked the first time a shelf or board is
  // drawn each day, then fixed for the day. Stars from before reviews existed
  // are added to the schedule once, first.
  function dueNow() {
    const today = todayNow();
    const before = readReviews();
    const reviews = pickToday(enrolStars(before, readStars(), today), today, BOARD_ORDER);
    if (reviews !== before) saveReviews(reviews);
    return dueToday(reviews, today);
  }

  // A practice or a review has finished: move the letter along its schedule,
  // update the practice-more list and, for a review, log it. Stars are never touched here.
  function recordSitting({ id, helped, failedCopies, wrongStarts, mirrored = 0 }, isReview) {
    const today = todayNow();
    const saved = { reviews: readReviews(), list: readPracticeMore() };
    const outcome = { helped, failedCopies, wrongStarts, mirrored };
    const out = isReview
      ? recordReview(saved, id, { ok: !helped, ...outcome }, today)
      : recordPractice(saved, id, outcome, today);
    saveReviews(out.reviews);
    savePracticeMore(out.list);
    if (isReview) logAttempt(reviewLogEntry(out.entry));
  }

  // ---- buttons ----
  els.home.innerHTML = ICONS.home;
  els.back.innerHTML = ICONS.back;
  if (els.showme) els.showme.innerHTML = ICONS.showMe;
  const showMusicIcon = () => {
    els.music.innerHTML = musicOn ? ICONS.musicOn : ICONS.musicOff;
    els.music.classList.toggle('off', !musicOn);
  };
  showMusicIcon();
  setMusicOn(musicOn);

  els.home.addEventListener('click', () => go(navigate(state, { type: 'home' })));
  els.back.addEventListener('click', () => go(navigate(state, { type: 'back' })));
  // Slice 5J part 2: Jugnu shows the current set again; the game decides what, and never moves for her.
  els.showme?.addEventListener('click', () => { if (state.screen === 'play') game?.showMe?.(); });
  els.music.addEventListener('click', () => {
    musicOn = !musicOn;
    saveMusic(musicOn);
    showMusicIcon();
    setMusicOn(musicOn && !upright);
  });

  // Sound may only start after a touch: every touch unlocks it.
  document.addEventListener('pointerdown', () => {
    unlock();
    resumeMusic();
  }, { capture: true });

  // The game's instruction line (Slice 5J part 2): small and grey at the top,
  // for a grown-up, the whole time she plays. null clears it.
  function showGameNote(text) {
    if (!els.note) return;
    els.note.classList.toggle('game', !!text);
    els.note.classList.toggle('on', !!text);
    if (text) els.note.textContent = text;
    els.note.hidden = !text;
  }

  // ---- moving between screens ----
  function go(next, extra = {}) {
    if (busy || next === state) return;
    if (game) {
      game.stop();
      game = null;
    }
    state = next;
    render(extra);
  }

  function render(extra = {}) {
    const { screen } = state;
    document.body.dataset.screen = screen;
    els.home.hidden = screen === 'door' || screen === 'shelf';
    els.back.hidden = !['games', 'play', 'drawing', 'dots', 'paper'].includes(screen);
    els.music.hidden = screen === 'door';
    if (els.showme) els.showme.hidden = screen !== 'play';
    showGameNote(screen === 'play' ? gameNote(kindOf(state.game)) : null);
    setTune(tuneFor(screen));

    const writing = screen === 'write';
    els.area.hidden = !writing;
    els.shell.hidden = writing;
    if (writing) return startWriting();

    els.shell.replaceChildren();
    const view = document.createElement('div');
    view.className = `view view-${screen}${screen === 'play' ? ` view-play-${state.game}` : ''}`;
    els.shell.appendChild(view);
    if (screen === 'door') drawDoor(view);
    else if (screen === 'shelf') drawShelf(view);
    else if (screen === 'board') drawBoard(view, extra.newStar);
    else if (screen === 'games') drawGames(view, extra.newGameStar);
    else if (screen === 'play') drawPlay(view);
    else if (screen === 'drawing') drawDrawingMenu(view, extra.newDrawStar);
    else if (screen === 'dots') drawDots(view);
    else if (screen === 'paper') drawPaper(view);
    else if (screen === 'find') drawFind(view, extra.newStar);
    else if (screen === 'toys') drawToys(view);
  }

  // ---- the front door ----
  function drawDoor(view) {
    view.innerHTML = `<div class="house">${HOUSE}
      <div class="door ready" role="button" aria-label="Open the door">${DOOR}</div>
      ${JUGNU_IMG.replace('buddy', 'buddy by-door')}</div>`;
    const door = view.querySelector('.door');
    door.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      door.classList.remove('ready');
      door.classList.add('open');
      doorSound();
      saveLastVisit(localDay(new Date()));
      setTimeout(() => {
        busy = false;
        go(navigate(state, { type: 'openDoor' }));
      }, DOOR_OPEN_MS);
    });
  }

  // ---- the bookshelf ----
  function drawShelf(view) {
    view.innerHTML = `${JUGNU_IMG.replace('buddy', 'buddy over-shelf')}
      <div class="toybox-btn" role="button" aria-label="Toy box">${TOYBOX}</div>
      <div class="shelf"><div class="books"></div><div class="plank"></div></div>`;
    view.querySelector('.toybox-btn').addEventListener('click', () => {
      if (busy) return;
      popSound();
      go(navigate(state, { type: 'openToys' }));
    });
    const row = view.querySelector('.books');
    const glowing = booksWithDue(dueNow()); // a book holding one of today's reviews glows
    for (const book of BOOKS) {
      const el = document.createElement('div');
      el.className = `book${book.open ? '' : ' locked'}${book.open && glowing.includes(book.id) ? ' due' : ''}`;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', book.id);
      el.innerHTML = `<div class="pages"></div><div class="cover">${bookCover(book)}</div>`;
      el.addEventListener('click', () => {
        if (busy) return;
        if (!book.open) return wiggle(el);
        busy = true;
        popSound();
        el.classList.add('opening');
        view.classList.add('book-open');
        setTimeout(() => {
          busy = false;
          go(navigate(state, { type: 'openBook', book: book.id }));
        }, BOOK_OPEN_MS);
      });
      row.appendChild(el);
    }
  }

  // A locked book or a faint character: a little wiggle, nothing else.
  function wiggle(el, cls = 'wiggle') {
    el.classList.remove(cls);
    void el.offsetWidth; // restart the animation
    el.classList.add(cls);
  }

  // ---- a letter board ----
  function drawBoard(view, newStar) {
    const board = BOARDS[state.book];
    view.innerHTML = `${JUGNU_IMG.replace('buddy', 'buddy at-left')}
      <div class="board"><div class="tiles" dir="${board.dir}"></div></div>`;
    const grid = view.querySelector('.tiles');
    grid.classList.add(`script-${board.script}`);
    const tiles = boardTiles(state.book, manifest, readStars(), dueNow());
    for (const t of tiles) {
      const el = document.createElement('div');
      el.className = `tile${t.bright ? ' bright' : ' faint'}`;
      el.style.setProperty('--c', t.color);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', t.id);
      el.innerHTML = `<span class="glyph">${t.glyph}</span>`;
      // Due for review: the tile glows gently and carries a small firefly light.
      if (t.due) {
        el.classList.add('due');
        const mark = document.createElement('span');
        mark.className = 'due-mark';
        mark.innerHTML = DUE_MARK;
        el.appendChild(mark);
      }
      if (t.star) {
        const star = document.createElement('span');
        star.className = `star${t.id === newStar ? ' new' : ''}`;
        star.innerHTML = STAR;
        el.appendChild(star);
      }
      el.addEventListener('click', () => {
        if (busy) return;
        if (!t.bright) return wiggle(el, 'shake');
        busy = true;
        popSound();
        el.classList.add('picked');
        setTimeout(() => {
          busy = false;
          go(navigate(state, { type: 'openChar', id: t.id, manifest, review: t.due }));
        }, TILE_PICK_MS);
      });
      grid.appendChild(el);
    }
    sizeBoard();
  }

  // The tile grid fills the board: as big as fits, never under 88 px on her tablet.
  function sizeBoard() {
    const grid = els.shell.querySelector('.tiles');
    if (!grid) return;
    const n = grid.children.length;
    const space = boardSpace(window.innerWidth, window.innerHeight);
    const { cols, size } = gridFor(n, space.w, space.h, BOARD_BOX.gap);
    grid.style.setProperty('--cols', cols);
    grid.style.setProperty('--size', `${size}px`);
    grid.style.setProperty('--gap', `${BOARD_BOX.gap}px`);
  }
  window.addEventListener('resize', sizeBoard);

  // ---- the games book (Slices 5D, 5F and 5H; the two-step menu) ----
  // Step 1: a big picture tile per kind of game (src/games.js GAME_KINDS), with
  // a tiny gold star for each of its sets she has finished. Step 2: that kind's
  // sets, one tile each, with a gold star on each she has finished. Missing
  // piece has a tile per level: a level opens after 3 finished rounds of the
  // one before; a locked tile is faint and wiggles. Back goes up one step.
  function drawGames(view, newGameStar) {
    view.innerHTML = `${JUGNU_IMG.replace('buddy', 'buddy at-left')}<div class="gm-menu"></div>`;
    const menu = view.querySelector('.gm-menu');
    const stars = readGameStars();
    const { kind } = state;
    if (kind) {
      const rounds = readMissingRounds();
      const ids = gamesOf(kind);
      menu.style.setProperty('--n', ids.length);
      for (const id of ids) addSet(gameTile(id, stars, rounds));
    } else {
      menu.style.setProperty('--n', GAME_KINDS.length);
      for (const k of GAME_KINDS) addKind(k);
    }

    function tile(color, art, label) {
      const el = document.createElement('div');
      el.className = 'gm-tile';
      el.style.setProperty('--c', color);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', label);
      el.innerHTML = art;
      menu.appendChild(el);
      return el;
    }
    // A tap pops the tile, then opens what it holds.
    function pick(el, event) {
      if (busy) return;
      busy = true;
      popSound();
      el.classList.add('picked');
      setTimeout(() => {
        busy = false;
        go(navigate(state, event));
      }, TILE_PICK_MS);
    }
    function addKind(k) {
      const el = tile(KIND_COLORS[k], KIND_MENU[k], k);
      el.dataset.kind = k;
      const n = kindStars(k, stars);
      if (n) {
        const row = document.createElement('span');
        row.className = 'gm-stars';
        row.innerHTML = STAR.repeat(n);
        el.appendChild(row);
      }
      el.addEventListener('click', () => pick(el, { type: 'openKind', kind: k }));
    }
    function addSet({ id, locked, star }) {
      const el = tile(GAME_COLORS[id], MENU[id], id);
      el.dataset.game = id;
      if (locked) el.classList.add('locked');
      if (star) {
        const s = document.createElement('span');
        s.className = `star${id === newGameStar ? ' new' : ''}`;
        s.innerHTML = STAR;
        el.appendChild(s);
      }
      el.addEventListener('click', () => {
        if (locked) return busy || wiggle(el, 'wig');
        pick(el, { type: 'openGame', game: id });
      });
    }
  }

  // ---- the Drawing book ----
  // The menu: free drawing (always open), then a row per level, marked with
  // 1, 2 or 3 dots. A level opens after 3 pictures of the one before it;
  // locked tiles are faint and wiggle. A finished picture shows in color with a star.
  function drawDrawingMenu(view, newDrawStar) {
    view.innerHTML = `${JUGNU_IMG.replace('buddy', 'buddy at-left')}
      <div class="dw-menu"><div class="dw-free" role="button" aria-label="paper">${PAPER_TILE}</div><div class="dw-levels"></div></div>`;
    const stars = readDrawStars();
    const pick = (el, event) => {
      if (busy) return;
      busy = true;
      popSound();
      el.classList.add('picked');
      setTimeout(() => {
        busy = false;
        go(navigate(state, event));
      }, TILE_PICK_MS);
    };
    const free = view.querySelector('.dw-free');
    free.addEventListener('click', () => pick(free, { type: 'openPaper' }));
    const levels = view.querySelector('.dw-levels');
    for (const level of LEVELS) {
      const open = levelOpen(level, stars);
      const row = document.createElement('div');
      row.className = `dw-level${open ? '' : ' locked'}`;
      row.innerHTML = `<span class="dw-mark">${LEVEL_MARK(level)}</span><div class="dw-row"></div>`;
      for (const p of levelPictures(level)) {
        const id = pictureId(level, p.id);
        const done = stars.includes(id);
        const el = document.createElement('div');
        el.className = `dw-tile${p.things.length > 1 ? ' wide' : ''}`;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', id);
        el.innerHTML = p.things.map((t) => `<span>${done ? pictureSVG(t) : previewSVG(t, level)}</span>`).join('');
        if (done) {
          const star = document.createElement('span');
          star.className = `star${id === newDrawStar ? ' new' : ''}`;
          star.innerHTML = STAR;
          el.appendChild(star);
        }
        el.addEventListener('click', () => {
          if (!open) return wiggle(el, 'wig');
          pick(el, { type: 'openPicture', level, picture: p.id });
        });
        row.querySelector('.dw-row').appendChild(el);
      }
      levels.appendChild(row);
    }
  }

  // A dot-to-dot picture. The tick earns its star; back to the menu.
  function drawDots(view) {
    const mine = state;
    const { level, picture } = state;
    game = playDots(view, {
      level,
      picture,
      onDone: () => {
        if (state !== mine) return;
        const id = pictureId(level, picture);
        const fresh = !readDrawStars().includes(id);
        saveDrawStar(id);
        go(navigate(state, { type: 'pictureDone' }), { newDrawStar: fresh ? id : null });
      },
    });
    if (upright) game.pause();
  }

  // The free-drawing page.
  function drawPaper(view) {
    game = playPaper(view);
    if (upright) game.pause();
  }

  // One game. Finishing it once earns its tile's star; back to the menu.
  function drawPlay(view) {
    const mine = state;
    const id = state.game;
    const onDone = () => {
      if (state !== mine) return;
      const fresh = !readGameStars().includes(id);
      saveGameStar(id);
      go(navigate(state, { type: 'gameDone' }), { newGameStar: fresh ? id : null });
    };
    const play = { path: playPath, sort: playSort, odd: playOdd, match: playMatch, missing: playMissing }[kindOf(id)];
    game = play(view, { game: id, onDone });
    if (upright) game.pause();
  }

  // ---- the find or count scene, after the last round ----
  // newStar: the star she just earned; it appears on the board after the scene.
  function drawFind(view, newStar) {
    const mine = state;
    const scene = startScene(view, {
      char: state.char,
      color: tileColorOf(state.char),
      lastKind: lastGroupKind(readFinds()),
      onDone: () => {
        if (state === mine) go(navigate(state, { type: 'letterDone' }), { newStar });
      },
    });
    if (!scene) return go(navigate(state, { type: 'letterDone' }), { newStar });
    game = scene; // go() stops it, and the turn picture pauses it
    if (upright) game.pause();
  }

  // ---- her shelf of finds: three planks of 8 places, newest first; a tap wiggles one ----
  // An object takes one place; a counted group of 3 or more takes two.
  function drawToys(view) {
    view.innerHTML = '<div class="finds"></div>';
    const shelf = view.querySelector('.finds');
    const rows = [[], [], []];
    let row = 0;
    let used = 0;
    for (const f of readFinds().slice(-SHELF_SHOWS).reverse()) {
      const art = findArt(f);
      if (!art) continue;
      const places = f.g && f.n >= 3 ? 2 : 1;
      if (used + places > 8) { row += 1; used = 0; }
      if (row > 2) break;
      rows[row].push({ art, places });
      used += places;
    }
    for (const items of rows) {
      const plank = document.createElement('div');
      plank.className = 'finds-row';
      for (const { art, places } of items) {
        const el = document.createElement('div');
        el.className = `find${places === 2 ? ' wide' : ''}`;
        el.setAttribute('role', 'button');
        el.innerHTML = art;
        el.addEventListener('click', () => {
          popSound();
          wiggle(el, 'wig');
        });
        plank.appendChild(el);
      }
      shelf.appendChild(plank);
    }
    sizeFinds();
  }

  // Three planks share the height; each find is as tall as its plank allows.
  function sizeFinds() {
    const shelf = els.shell.querySelector('.finds');
    if (!shelf) return;
    shelf.style.setProperty('--row', `${Math.max(96, Math.floor((shelf.clientHeight - 3 * 40) / 3))}px`);
  }
  window.addEventListener('resize', sizeFinds);

  // ---- writing ----
  async function startWriting() {
    const mine = state;
    const running = await startGame(els, {
      charId: state.char,
      manifest,
      debugOn,
      review: state.review === true,
      onDone: (done) => {
        if (state !== mine) return;
        const { id, star } = done;
        // A review never adds or takes a star. A practice Jugnu helped with still
        // glows and chimes, but earns no gold star.
        const isReview = state.review === true;
        const newStar = !isReview && star ? id : null;
        if (newStar) saveStar(id);
        recordSitting(done, isReview);
        // Then the find or count scene, when her character has one.
        go(navigate(state, { type: afterWriting(id) }), { newStar });
      },
    });
    // She may have pressed home while the character was loading.
    if (state !== mine) running.stop();
    else {
      game = running;
      if (upright) {
        // Pausing holds every animation on the page: take the picture away for
        // that moment, so its own animation starts again when it comes back.
        els.turn.hidden = true;
        game.pause?.();
        els.turn.hidden = false;
      }
    }
  }

  // ---- landscape only ----
  // Upright: pause the game and the music, then cover the screen with Jugnu and
  // a tablet turning sideways. Landscape again: the picture goes, and she carries
  // on where she was.
  if (els.turn) els.turn.innerHTML = TURN;
  function checkTurn() {
    if (!els.turn) return;
    const now = isUpright(window.innerWidth, window.innerHeight);
    if (now === upright) return;
    upright = now;
    if (upright) {
      game?.pause?.(); // before the picture shows, so its own animation keeps playing
      setMusicOn(false);
      els.turn.hidden = false;
    } else {
      els.turn.hidden = true;
      setMusicOn(musicOn);
      game?.resume?.();
    }
  }
  window.addEventListener('resize', checkTurn);
  window.matchMedia?.('(orientation: portrait)').addEventListener?.('change', checkTurn);

  checkTurn();
  render();
}
