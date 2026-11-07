// odd.js — Odd one out, on screen. games.js makes the rows (each fair: exactly
// one picture stands alone) and decides whether a tap is right; this file
// draws a row and plays it.
// A row of four cards; she taps the one that is different. Right: it glows
// gold with a chime, then the next row. Wrong: that card wiggles, no sound.
// After 3 wrong taps in a row the odd one wiggles once. In the first row (the
// easiest) Jugnu flies to the odd one and taps it himself. Five dots along the
// top fill as the rows are done. Five rows make a play. Everything is in board
// units (1280 x 640). Every tap on a card goes into the attempt log as a
// "game" entry; Jugnu's does not.
// Slice 5H: no row repeats a row of her last play. (Here a tap is her answer,
// so a plain tap is played as one, unlike the drag games.)
// Child-screen rules: no text, no failure sound, nothing red as feedback, every
// card at least 88 px, Jugnu the only character.

import {
  ODD, oddPlay, oddKey, oddCards, hitOdd, startOdd, tapOdd, marginUnits, gameLogEntry, showsFirstMove, FIRST_MOVE_DELAY_MS,
} from './games.js';
import { oddThingArt } from '../data/games.js';
import { mountBoard, svgEl, replay, JUGNU_IMG } from './match.js';
import { trackSinglePointer } from './input.js';
import { logAttempt, readLastPlay, saveLastPlay } from './storage.js';
import { chime, letterChime } from './audio.js';

const NEXT_MS = 1300;     // a right answer glows, then the next row
const HINT_DELAY_MS = 650; // the hint waits for the wrong card's wiggle to end
const FLY_MS = 1400;      // Jugnu flies to the odd one
const JUGNU_SIZE = 110;
const DONE_MS = 1600;     // the last row: everything glows, then back to the menu

// game: 'odd-kinds' or 'odd-colors'. onDone(): five rows are done.
// Returns { stop, pause, resume }.
export function playOdd(view, { game, onDone = () => {}, rand = Math.random }) {
  view.innerHTML = JUGNU_IMG;
  const buddy = view.querySelector('.buddy');
  const board = mountBoard(view);
  board.el.classList.add('od-board');
  const rows = oddPlay(game, rand, readLastPlay(game));
  saveLastPlay(game, rows.map(oddKey));

  // The progress dots: one per row, filled when it is done.
  const dots = ODD.dots.xs.map((x) => svgEl('circle', { class: 'od-dot', cx: x, cy: ODD.dots.y, r: 14 }, board.svg));

  const opened = performance.now();
  let alive = true;
  let paused = false;
  let rowNo = 0;
  let row = null;
  let state = null;
  let cardEls = [];
  let busy = true;   // a row is glowing, or Jugnu is flying: taps wait
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
    timers.add(t);
  };

  // An animation that holds still while paused. f goes 0..1.
  function tween(ms, onFrame) {
    return new Promise((resolve) => {
      let t = 0;
      let last = null;
      const step = (now) => {
        if (!alive) return resolve(false);
        if (last !== null && !paused) t += now - last;
        last = now;
        const f = Math.min(1, t / ms);
        onFrame(f);
        if (f < 1) requestAnimationFrame(step);
        else resolve(true);
      };
      requestAnimationFrame(step);
    });
  }

  function nextRow() {
    rowNo += 1;
    row = rows[rowNo - 1];
    state = startOdd();
    for (const el of cardEls) el.remove();
    cardEls = oddCards().map((c, i) => {
      const el = document.createElement('div');
      el.className = 'od-card';
      el.setAttribute('role', 'button');
      Object.assign(el.style, { left: `${c.x0}px`, top: `${c.y0}px`, width: `${c.x1 - c.x0}px`, height: `${c.y1 - c.y0}px` });
      el.innerHTML = oddThingArt(row.items[i].id);
      board.el.appendChild(el);
      return el;
    });
    busy = false;
    if (showsFirstMove(rowNo)) {
      busy = true;
      later(firstMove, FIRST_MOVE_DELAY_MS);
    }
  }

  // Found: the odd one glows with a chime, its dot fills, then the next row.
  function found() {
    cardEls[row.odd].classList.add('od-right');
    for (const [i, el] of cardEls.entries()) if (i !== row.odd) el.classList.add('od-rest');
    dots[rowNo - 1].classList.add('on');
    chime();
    busy = true;
    if (rowNo >= ODD.rows) {
      later(() => { board.el.classList.add('gm-glow'); letterChime(); }, 400);
      later(onDone, DONE_MS);
    } else {
      later(nextRow, NEXT_MS);
    }
  }

  // Jugnu flies to the odd one and taps it (not logged: it is not her tap).
  async function firstMove() {
    const c = oddCards()[row.odd];
    const j = document.createElement('img');
    j.className = 'gm-jugnu';
    j.src = 'assets/jugnu.svg';
    j.alt = '';
    board.el.appendChild(j);
    buddy.classList.add('away');
    const from = [60, ODD.y];
    const to = [(c.x0 + c.x1) / 2, c.y0 + 10];
    const place = ([x, y]) => Object.assign(j.style, { left: `${x - JUGNU_SIZE / 2}px`, top: `${y - JUGNU_SIZE / 2}px`, width: `${JUGNU_SIZE}px` });
    const ok = await tween(FLY_MS, (f) => {
      const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
      place([from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e - Math.sin(Math.PI * e) * 120]);
    });
    if (!ok) return;
    replay(cardEls[row.odd], 'od-tap');
    state = tapOdd(state, row, row.odd).state;
    found();
    j.classList.add('gm-fading');
    later(() => { j.remove(); buddy.classList.remove('away'); }, 450);
  }

  function tap(place) {
    const r = tapOdd(state, row, place);
    state = r.state;
    logAttempt(gameLogEntry({ game, set: rowNo, from: row.items[place].id, ok: r.ok, ms: performance.now() - opened }));
    if (r.ok) return found();
    replay(cardEls[place], 'wig');
    if (r.hint !== null) later(() => replay(cardEls[r.hint], 'wig'), HINT_DELAY_MS);
  }

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (p) => {
      if (paused || busy) return;
      const place = hitOdd(board.toUnits(p), marginUnits(board.s, 20));
      if (place !== null) tap(place);
    },
    onMove: () => {},
    onEnd: () => {},
  });

  nextRow();

  return {
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
