// sort.js — Sort it, on screen. games.js makes the board and decides whether a
// drop is right; this file draws it and plays it.
// Six things wait in a row along the top; two baskets below, each with a
// sample thing on its front. She drags a thing into a basket: the right one
// takes it with a chime; a wrong one sends it bouncing gently back to its
// place, with no sound. Letting go away from both, it floats back. After 3
// wrong baskets in a row, the right basket wiggles once. On the first board,
// Jugnu carries the leftmost thing into its basket himself. Two boards make
// one play. Everything is in board units (1280 x 640). Every release goes into
// the attempt log as a "game" entry; Jugnu's move does not.
// Slice 5H: neither board repeats a board of her last play; a plain tap on a
// thing makes it wiggle (not a try, not logged).
// Child-screen rules: no text, no failure sound, nothing red as feedback,
// every thing at least 88 px, Jugnu the only character.
// Slice 5J part 2: showMe() (the "show me" button) has Jugnu carry a thing to
// its basket, then it slides back: nothing is sorted, and the log gets a help
// entry, never one of her moves.

import {
  SORT, sortPlay, sortKey, isPlainTap, thingHome, hitBasket, hitThing, basketSlot, startSort, dropThing, firstMoveThing,
  marginUnits, gameLogEntry, showsFirstMove, FIRST_MOVE_DELAY_MS, showMeSort, showMeLogEntry,
} from './games.js';
import { sortThingArt, basketArt } from '../data/games.js';
import { mountBoard, replay, JUGNU_IMG } from './match.js';
import { trackSinglePointer } from './input.js';
import { logAttempt, readLastPlay, saveLastPlay } from './storage.js';
import { chime, letterChime } from './audio.js';

const DROP_MS = 320;      // a thing settles into its basket
const BOUNCE_MS = 650;    // a wrong basket: the thing bounces back to its place
const FLOAT_MS = 380;     // let go away from both baskets: it floats back
const CARRY_MS = 1500;    // Jugnu carries the first thing
const HINT_DELAY_MS = 400;
const SLIDE_BACK_MS = 700; // show me: the thing slides back to its place
const BOARD_GLOW_MS = 1600; // all 6 sorted: everything glows, then the next board
const JUGNU_SIZE = 110;

const easeInOut = (f) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);
const easeOutBack = (f) => 1 + 2.2 * (f - 1) ** 3 + 1.2 * (f - 1) ** 2;

// game: 'sort-colors' or 'sort-kinds'. onDone(): both boards are sorted.
// Returns { stop, pause, resume }.
export function playSort(view, { game, onDone = () => {}, rand = Math.random }) {
  view.innerHTML = JUGNU_IMG;
  const buddy = view.querySelector('.buddy');
  const board = mountBoard(view);
  board.el.classList.add('st-board');

  // Both boards, drawn now so they can be saved: the next play avoids them.
  const plan = sortPlay(game, readLastPlay(game), rand);
  saveLastPlay(game, plan.map(sortKey));

  const opened = performance.now();
  let alive = true;
  let paused = false;
  let boardNo = 0;
  let sb = null;          // this board: { baskets, things }
  let state = null;
  let basketEls = [];
  let inBasket = [0, 0];  // how many things each basket holds
  let drag = null;        // { t, offset: [dx, dy] }
  let busy = true;        // a board is glowing, or Jugnu is carrying: no new drags
  const moving = new Set(); // spots of things gliding somewhere: not draggable
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
    timers.add(t);
  };
  const log = (t, to, ok) => logAttempt(gameLogEntry({
    game, set: boardNo, from: t.id, to: to === null ? null : sb.baskets[to].id, ok, ms: performance.now() - opened,
  }));

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

  // A thing's element is centred on [x, y] at the given size, in units.
  const place = (el, [x, y], size = SORT.size) => Object.assign(el.style, {
    left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`,
  });

  function newBoard() {
    boardNo += 1;
    for (const el of board.el.querySelectorAll('.st-thing, .st-basket')) el.remove();
    board.el.classList.remove('gm-glow');
    sb = plan[boardNo - 1];
    state = startSort();
    inBasket = [0, 0];
    moving.clear();
    basketEls = sb.baskets.map((b, i) => {
      const el = document.createElement('div');
      el.className = 'st-basket';
      el.innerHTML = basketArt(b.sample);
      place(el, [SORT.baskets[i].x, SORT.baskets[i].y], SORT.basket);
      board.el.appendChild(el);
      return el;
    });
    for (const t of sb.things) {
      const el = document.createElement('div');
      el.className = 'st-thing';
      el.setAttribute('role', 'button');
      el.innerHTML = sortThingArt(t.id);
      place(el, thingHome(t));
      board.el.appendChild(el);
      t.el = el;
    }
    busy = false;
    if (showsFirstMove(boardNo)) {
      busy = true;
      later(firstMove, FIRST_MOVE_DELAY_MS);
    }
  }

  // Glide a thing from where it is to `to` (and to `size`) with an easing.
  async function glide(t, to, ms, ease, size = SORT.size) {
    const from = [parseFloat(t.el.style.left) + parseFloat(t.el.style.width) / 2, parseFloat(t.el.style.top) + parseFloat(t.el.style.height) / 2];
    const fromSize = parseFloat(t.el.style.width);
    moving.add(t.spot);
    const ok = await tween(ms, (f) => {
      const e = ease(f);
      place(t.el, [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e], fromSize + (size - fromSize) * Math.min(1, e));
    });
    moving.delete(t.spot);
    return ok;
  }

  // The right basket: the thing settles on its rim, with a chime.
  async function intoBasket(t, r) {
    const slot = basketSlot(t.basket, inBasket[t.basket]);
    inBasket[t.basket] += 1;
    t.el.classList.remove('st-lift');
    t.el.classList.add('st-in');
    chime();
    replay(basketEls[t.basket], 'st-take');
    await glide(t, slot, DROP_MS, easeInOut, SORT.inSize);
    if (!alive || !r.done) return;
    busy = true;
    later(() => { board.el.classList.add('gm-glow'); letterChime(); }, 250);
    later(() => (boardNo >= SORT.boards ? onDone() : newBoard()), BOARD_GLOW_MS);
  }

  // Jugnu carries thing `t` from its place to its basket's rim. Resolves his
  // picture (still showing) when he arrives, or null if the game stopped.
  async function carry(t) {
    const j = document.createElement('img');
    j.className = 'gm-jugnu';
    j.src = 'assets/jugnu.svg';
    j.alt = '';
    board.el.appendChild(j);
    buddy.classList.add('away');
    const from = thingHome(t);
    const to = basketSlot(t.basket, inBasket[t.basket]);
    const placeJ = ([x, y]) => Object.assign(j.style, { left: `${x - JUGNU_SIZE / 2}px`, top: `${y - SORT.size / 2 - JUGNU_SIZE * 0.7}px`, width: `${JUGNU_SIZE}px` });
    placeJ(from);
    t.el.classList.add('st-lift');
    moving.add(t.spot);
    const ok = await tween(CARRY_MS, (f) => {
      const e = easeInOut(f);
      const p = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e - Math.sin(Math.PI * e) * 60];
      place(t.el, p);
      placeJ(p);
    });
    moving.delete(t.spot);
    return ok ? j : null;
  }
  const flyAway = (j, then = () => {}) => {
    j.classList.add('gm-fading');
    later(() => { j.remove(); buddy.classList.remove('away'); then(); }, 450);
  };

  // Jugnu flies to the leftmost thing and carries it into its basket (not logged).
  async function firstMove() {
    const t = firstMoveThing(sb);
    const j = await carry(t);
    if (!j) return;
    const r = dropThing(state, t, t.basket);
    state = r.state;
    await intoBasket(t, r);
    if (!alive) return;
    flyAway(j, () => { busy = false; });
  }

  // Show me (Slice 5J part 2): Jugnu carries the leftmost thing still on the
  // shelf to its basket, then it slides back to its place. Nothing is sorted;
  // state is untouched, and the log gets a help entry.
  async function showMe() {
    if (busy || paused || drag) return false;
    const t = showMeSort(sb, state);
    if (!t) return false;
    busy = true;
    logAttempt(showMeLogEntry({ game, set: boardNo, ms: performance.now() - opened }));
    const j = await carry(t);
    if (!j) return false;
    t.el.classList.remove('st-lift');
    flyAway(j);
    await glide(t, thingHome(t), SLIDE_BACK_MS, easeInOut);
    if (!alive) return false;
    busy = false;
    return true;
  }

  function release() {
    const d = drag;
    if (!d) return;
    drag = null;
    const { t } = d;
    if (isPlainTap(d.moved, board.s)) {
      // A tap, not a drag: the thing wiggles in its place. Not a try, not logged.
      t.el.classList.remove('st-lift');
      place(t.el, thingHome(t));
      replay(t.el, 'wig');
      return;
    }
    const center = [parseFloat(t.el.style.left) + SORT.size / 2, parseFloat(t.el.style.top) + SORT.size / 2];
    const to = hitBasket(center, marginUnits(board.s));
    const r = dropThing(state, t, to);
    state = r.state;
    log(t, to, r.ok);
    if (r.ok) return intoBasket(t, r);
    t.el.classList.remove('st-lift');
    if (!r.counted) return glide(t, thingHome(t), FLOAT_MS, easeInOut);
    // A wrong basket: bounce gently back to its place, no sound.
    glide(t, thingHome(t), BOUNCE_MS, easeOutBack);
    if (r.hint !== null) later(() => replay(basketEls[r.hint], 'wig'), HINT_DELAY_MS);
  }

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (p) => {
      if (paused || busy || drag) return;
      const u = board.toUnits(p);
      const t = hitThing(u, sb.things, [...state.placed, ...moving], marginUnits(board.s));
      if (!t) return;
      const [x, y] = thingHome(t);
      drag = { t, offset: [x - u[0], y - u[1]], down: u, moved: 0 };
      t.el.classList.add('st-lift');
    },
    onMove: (points) => {
      if (!drag) return;
      for (const p of points) {
        const q = board.toUnits(p);
        drag.moved = Math.max(drag.moved, Math.hypot(q[0] - drag.down[0], q[1] - drag.down[1]));
      }
      const u = board.toUnits(points[points.length - 1]);
      place(drag.t.el, [u[0] + drag.offset[0], u[1] + drag.offset[1]]);
    },
    onEnd: () => release(),
  });

  // A thing she was dragging goes straight back, not logged (a resize, or the tablet upright).
  function dropDrag() {
    if (!drag) return;
    const { t } = drag;
    drag = null;
    t.el.classList.remove('st-lift');
    place(t.el, thingHome(t));
  }
  board.onResize = dropDrag;

  newBoard();

  return {
    showMe,
    pause() { paused = true; dropDrag(); },
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
