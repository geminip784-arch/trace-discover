// screens.js — the app shell: front door, bookshelf, letter boards, the games
// book, and the writing screen around game.js. session.js decides where each
// tap leads; this file draws the screens and plays the little animations.
// Child-screen rules: no text but the characters themselves, nothing red as
// feedback, every child target at least 88 CSS px, only Jugnu and the buttons
// float on the left.

import {
  BOARDS, BOOKS, BOARD_BOX, boardTiles, boardSpace, gridFor, localDay,
  startScreen, navigate, tuneFor,
} from './session.js';
import { readLastVisit, saveLastVisit, readStars, saveStar, readMusic, saveMusic } from './storage.js';
import { unlock, doorSound, popSound } from './audio.js';
import { setMusicOn, setTune, resumeMusic } from './music.js';
import { startGame } from './game.js';
import { HOUSE, DOOR, ICONS, STAR, bookCover } from './art.js';

const DOOR_OPEN_MS = 1100; // the door swings open, then the bookshelf
const BOOK_OPEN_MS = 650;  // a book's cover opens, then its screen
const TILE_PICK_MS = 220;  // a bright character pops, then writing starts

const JUGNU_IMG = '<img class="buddy" src="assets/jugnu.svg" alt="" draggable="false">';

// els: { shell, area, lines, ink, fx, jugnu, rounds, home, back, music }
// options: { manifest, params (URLSearchParams), now (Date) }
export function startShell(els, { manifest, params, now = new Date() }) {
  const debugOn = params.get('debug') === '1';
  let state = startScreen({
    lastVisit: readLastVisit(),
    today: localDay(now),
    forceDoor: params.get('door') === '1',
    char: params.get('char'),
  });
  let busy = false;   // an opening animation is playing: taps wait
  let game = null;    // the running tracing game, while she writes
  let musicOn = readMusic();

  // ---- buttons ----
  els.home.innerHTML = ICONS.home;
  els.back.innerHTML = ICONS.back;
  const showMusicIcon = () => {
    els.music.innerHTML = musicOn ? ICONS.musicOn : ICONS.musicOff;
    els.music.classList.toggle('off', !musicOn);
  };
  showMusicIcon();
  setMusicOn(musicOn);

  els.home.addEventListener('click', () => go(navigate(state, { type: 'home' })));
  els.back.addEventListener('click', () => go(navigate(state, { type: 'back' })));
  els.music.addEventListener('click', () => {
    musicOn = !musicOn;
    saveMusic(musicOn);
    showMusicIcon();
    setMusicOn(musicOn);
  });

  // Sound may only start after a touch: every touch unlocks it.
  document.addEventListener('pointerdown', () => {
    unlock();
    resumeMusic();
  }, { capture: true });

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
    els.back.hidden = screen !== 'games';
    els.music.hidden = screen === 'door';
    setTune(tuneFor(screen));

    const writing = screen === 'write';
    els.area.hidden = !writing;
    els.shell.hidden = writing;
    if (writing) return startWriting();

    els.shell.replaceChildren();
    const view = document.createElement('div');
    view.className = `view view-${screen}`;
    els.shell.appendChild(view);
    if (screen === 'door') drawDoor(view);
    else if (screen === 'shelf') drawShelf(view);
    else if (screen === 'board') drawBoard(view, extra.newStar);
    else if (screen === 'games') drawGames(view);
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
      <div class="shelf"><div class="books"></div><div class="plank"></div></div>`;
    const row = view.querySelector('.books');
    for (const book of BOOKS) {
      const el = document.createElement('div');
      el.className = `book${book.open ? '' : ' locked'}`;
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
    const tiles = boardTiles(state.book, manifest, readStars());
    for (const t of tiles) {
      const el = document.createElement('div');
      el.className = `tile${t.bright ? ' bright' : ' faint'}`;
      el.style.setProperty('--c', t.color);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', t.id);
      el.innerHTML = `<span class="glyph">${t.glyph}</span>`;
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
          go(navigate(state, { type: 'openChar', id: t.id, manifest }));
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

  // ---- the games book (the games come in Slice 5D) ----
  function drawGames(view) {
    view.innerHTML = JUGNU_IMG.replace('buddy', 'buddy in-middle');
  }

  // ---- writing ----
  async function startWriting() {
    const mine = state;
    const running = await startGame(els, {
      charId: state.char,
      manifest,
      debugOn,
      onDone: ({ id, star }) => {
        if (state !== mine) return;
        // A practice Jugnu helped with still glows and chimes, but earns no gold star.
        if (star) saveStar(id);
        go(navigate(state, { type: 'letterDone' }), { newStar: star ? id : null });
      },
    });
    // She may have pressed home while the character was loading.
    if (state !== mine) running.stop();
    else game = running;
  }

  render();
}
