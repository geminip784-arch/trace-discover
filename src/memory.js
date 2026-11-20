// memory.js — Memory, on screen (Slice 5N). games.js deals the board (no two
// look-alike pictures, never her last board's set) and decides what a tap
// does; this file draws the cards and plays them.
// Cards face down in a grid: 3 pairs (2 x 3), 6 pairs (3 x 4) or 8 pairs
// (4 x 4). She taps two. A pair that matches glows gold with a chime and stays
// face up; two that do not match stay face up for about 1.2 seconds, then turn
// back, with no sound, and taps wait meanwhile. When every pair is found the
// board glows, the level's finished boards go up by one (td.memory: 3 open the
// next level) and the game ends. One board makes a play.
// No text and no move counter. Everything is in board units (1280 x 640), so a
// resize only rescales the board. Every two cards she turns go into the
// attempt log as one "game" entry.
// Show me: every card still face down peeks face up for 1.5 seconds, then
// turns back. Nothing is found for her, and the log gets a help entry.
// Slice 5M: Jugnu never turns a card for her; the board is hers from the start.
// Upright, the turn-back and the peek wait, and taps wait too.
// Child-screen rules: no text, no failure sound, nothing red as feedback,
// every card at least 120 px on her tablet, Jugnu the only character.

import {
  MEMORY, memoryLevel, memoryPlay, memoryKey, memoryCards, hitMemory, startMemory, flipCard, hideMismatch,
  showMeMemory, gameLogEntry, showMeLogEntry,
} from './games.js';
import { MEMORY_BACK, memoryFaceArt } from '../data/games.js';
import { mountBoard, JUGNU_IMG } from './match.js';
import { trackSinglePointer } from './input.js';
import { logAttempt, readLastPlay, saveLastPlay, addMemoryBoard } from './storage.js';
import { chime, letterChime } from './audio.js';

const DONE_MS = 1800; // every pair found: the board glows, then back to the menu

// game: 'memory-1' to 'memory-3'. onDone(): every pair is found.
// Returns { showMe, stop, pause, resume }.
export function playMemory(view, { game, onDone = () => {}, rand = Math.random }) {
  view.innerHTML = JUGNU_IMG;
  const board = mountBoard(view);
  board.el.classList.add('mm-board');
  const level = memoryLevel(game);

  // The board, dealt now so it can be saved: the next play of this level avoids its pictures.
  const deal = memoryPlay(level, readLastPlay(game), rand);
  saveLastPlay(game, [memoryKey(deal)]);

  const opened = performance.now();
  let alive = true;
  let paused = false;
  let state = null;
  let cardEls = [];
  let busy = true; // two that do not match are showing, the cards peek, or the board is done: taps wait
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
    timers.add(t);
  };

  // A wait that holds still while the tablet is upright. Resolves false if the game stopped.
  function wait(ms) {
    return new Promise((resolve) => {
      let t = 0;
      let last = null;
      const step = (now) => {
        if (!alive) return resolve(false);
        if (last !== null && !paused) t += now - last;
        last = now;
        if (t >= ms) return resolve(true);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // Every card face down: its back (the same for all) and its face behind it.
  function newBoard() {
    state = startMemory();
    cardEls = memoryCards(level).map((box) => {
      const el = document.createElement('div');
      el.className = 'mm-card';
      el.setAttribute('role', 'button');
      Object.assign(el.style, { left: `${box.x0}px`, top: `${box.y0}px`, width: `${box.x1 - box.x0}px`, height: `${box.y1 - box.y0}px` });
      el.innerHTML = `<div class="mm-inner"><div class="mm-back">${MEMORY_BACK}</div>`
        + `<div class="mm-face">${memoryFaceArt(deal.cards[box.slot].pic)}</div></div>`;
      board.el.appendChild(el);
      return el;
    });
    busy = false;
  }

  // Every pair found: the board glows, the finished board is counted, then the game ends.
  function finish() {
    busy = true;
    addMemoryBoard(level);
    later(() => { board.el.classList.add('gm-glow'); letterChime(); }, 500);
    later(onDone, DONE_MS);
  }

  // Two that do not match: they stay face up a moment, then turn back, silently.
  async function turnBack(a, b) {
    busy = true;
    if (!(await wait(MEMORY.mismatchMs))) return;
    state = hideMismatch(state);
    cardEls[a].classList.remove('up');
    cardEls[b].classList.remove('up');
    busy = false;
  }

  function tap(slot) {
    const r = flipCard(state, deal, slot);
    if (!r.turned) return;
    state = r.state;
    cardEls[slot].classList.add('up');
    if (!r.pair) return;
    const { a, b, ok } = r.pair;
    logAttempt(gameLogEntry({ game, set: 1, from: deal.cards[a].pic, to: deal.cards[b].pic, ok, ms: performance.now() - opened }));
    if (!ok) return turnBack(a, b);
    cardEls[a].classList.add('matched');
    cardEls[b].classList.add('matched');
    chime();
    if (r.done) finish();
  }

  // Show me: every card still face down peeks for MEMORY.peekMs, then turns
  // back. A card she has just turned stays up. Never her move: the state is
  // untouched, and the log gets a help entry.
  async function showMe() {
    if (busy || paused) return false;
    const peek = showMeMemory(deal, state);
    if (!peek) return false;
    busy = true;
    logAttempt(showMeLogEntry({ game, set: 1, ms: performance.now() - opened }));
    for (const s of peek) cardEls[s].classList.add('up', 'peek');
    const ok = await wait(MEMORY.peekMs);
    if (!ok) return false;
    for (const s of peek) cardEls[s].classList.remove('up', 'peek');
    busy = false;
    return true;
  }

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (p) => {
      if (paused || busy) return;
      const slot = hitMemory(board.toUnits(p), level);
      if (slot !== null) tap(slot);
    },
    onMove: () => {},
    onEnd: () => {},
  });

  newBoard();

  return {
    showMe,
    pause() { paused = true; },
    resume() { paused = false; },
    stop() {
      if (!alive) return;
      alive = false;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      stopTracking();
      board.stop();
    },
  };
}
