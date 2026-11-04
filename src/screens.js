// screens.js — the app shell: front door, bookshelf, letter boards, the games
// book and its games (match.js, path.js), the writing screen around game.js,
// the find and count scene after it (scene.js) and her shelf of finds. session.js decides where each
// tap leads; this file draws the screens and plays the little animations.
// Child-screen rules: no text but the characters themselves, nothing red as
// feedback, every child target at least 88 CSS px, only Jugnu and the buttons
// float on the left.

import {
  BOARDS, BOOKS, BOARD_BOX, boardTiles, boardSpace, gridFor, localDay,
  startScreen, navigate, tuneFor, bookOf, tileColorOf,
} from './session.js';
import {
  readLastVisit, saveLastVisit, readStars, saveStar, readMusic, saveMusic, readFinds,
  readGameStars, saveGameStar,
} from './storage.js';
import { unlock, doorSound, popSound } from './audio.js';
import { setMusicOn, setTune, resumeMusic } from './music.js';
import { startGame } from './game.js';
import { HOUSE, DOOR, ICONS, STAR, TURN, bookCover } from './art.js';
import { isUpright } from './render.js';
import { startScene } from './scene.js';
import { hasLetterScene, hasNumberScene, lastGroupKind, makeGroup, SHELF_SHOWS } from './finds.js';
import { OBJECTS, TOYBOX } from '../data/finds.js';
import { GAMES } from './games.js';
import { MENU } from '../data/games.js';
import { playMatch } from './match.js';
import { playPath } from './path.js';

// The games menu's tiles: each game's frame color.
const GAME_COLORS = { numbers: '#1E88E5', colors: '#FB8C00', path: '#43A047' };

const DOOR_OPEN_MS = 1100; // the door swings open, then the bookshelf
const BOOK_OPEN_MS = 650;  // a book's cover opens, then its screen
const TILE_PICK_MS = 220;  // a bright character pops, then writing starts

const JUGNU_IMG = '<img class="buddy" src="assets/jugnu.svg" alt="" draggable="false">';

// els: { shell, area, lines, ink, fx, jugnu, rounds, home, back, music, turn }
// options: { manifest, params (URLSearchParams), now (Date) }
export function startShell(els, { manifest, params, now = new Date() }) {
  const debugOn = params.get('debug') === '1';
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
    setMusicOn(musicOn && !upright);
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
    els.back.hidden = screen !== 'games' && screen !== 'play';
    els.music.hidden = screen === 'door';
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
  // Three big picture tiles, one per game; a gold star on each she has finished.
  function drawGames(view, newGameStar) {
    view.innerHTML = `${JUGNU_IMG.replace('buddy', 'buddy at-left')}<div class="gm-menu"></div>`;
    const menu = view.querySelector('.gm-menu');
    const stars = readGameStars();
    for (const id of GAMES) {
      const el = document.createElement('div');
      el.className = 'gm-tile';
      el.style.setProperty('--c', GAME_COLORS[id]);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', id);
      el.innerHTML = MENU[id];
      if (stars.includes(id)) {
        const star = document.createElement('span');
        star.className = `star${id === newGameStar ? ' new' : ''}`;
        star.innerHTML = STAR;
        el.appendChild(star);
      }
      el.addEventListener('click', () => {
        if (busy) return;
        busy = true;
        popSound();
        el.classList.add('picked');
        setTimeout(() => {
          busy = false;
          go(navigate(state, { type: 'openGame', game: id }));
        }, TILE_PICK_MS);
      });
      menu.appendChild(el);
    }
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
    game = id === 'path' ? playPath(view, { onDone }) : playMatch(view, { game: id, onDone });
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
      const art = f.g ? makeGroup(f.g, f.n, f.gold ? 0 : -1).svg : OBJECTS.find((o) => o.id === f.o)?.art;
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
      onDone: ({ id, star }) => {
        if (state !== mine) return;
        // A practice Jugnu helped with still glows and chimes, but earns no gold star.
        if (star) saveStar(id);
        // Then the find or count scene, when her character has one.
        const scene = hasLetterScene(id) || hasNumberScene(id);
        go(navigate(state, { type: scene ? 'openScene' : 'letterDone' }), { newStar: star ? id : null });
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
