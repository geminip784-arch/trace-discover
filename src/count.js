// count.js — Count, then pick the number, on screen (Slice 5N). A set in the
// Match kind, one tile per level. games.js makes the groups and decides what
// a tap does; finds.js counts (the same rules as the count scenes); this file
// draws a group and plays it.
// A group of things stands at the top. She taps each one to count it, and its
// number shows above it, with the count scenes' rising note. Level 1: 1 to 10,
// every thing counted one by one. Level 2: 11 to 20 in ten-frames, counting on:
// one tap on the full frame counts ten, then each extra counts on from 11 (a tap
// on an extra before the ten does not count, and the frame pulses). Once every
// thing is counted, three big number tiles rise below; the counting numbers stay
// on the things. She taps the tile that says how many: it glows gold with a
// chime. A wrong tile wiggles, with no sound; after 3 wrong tiles in a row the
// right one wiggles. 3 groups make a play; finishing one earns the level's star.
// Everything is in board units (1280 x 640), so a resize only rescales the
// board. Every number tile she taps goes into the attempt log as a "game" entry.
// Show me: while she counts, the things still to count breathe (or the full
// frame pulses); once the tiles are out, Jugnu points at the right one. She
// still taps it herself (logged as help, never her move).
// Child-screen rules: no text but the numbers, no failure sound, nothing red as
// feedback, every thing she taps at least 88 px, Jugnu the only character.

import {
  COUNT, countLevel, countPlay, countKey, countArt, countBoardBoxes, hitCount, countTiles, hitCountTile,
  startPick, pickNumber, showMeCount, marginUnits, gameLogEntry, showMeLogEntry,
} from './games.js';
import { startCount, tapCount, startCountOn, tapTens, nextFrame, countStep } from './finds.js';
import { mountBoard, svgEl, replay, JUGNU_IMG } from './match.js';
import { trackSinglePointer } from './input.js';
import { tileColorOf } from './session.js';
import { logAttempt, readLastPlay, saveLastPlay } from './storage.js';
import { chime, letterChime, countTone, goldTone } from './audio.js';

const NEXT_MS = 1800;      // the right tile glows, then the next group
const DONE_MS = 1800;      // the last group: everything glows, then back to the menu
const HINT_DELAY_MS = 650; // the hint waits for the wrong tile's wiggle to end
const NUDGE_MS = 1300;     // show me: the things still to count breathe this long
const POINT_MS = 1600;     // show me: Jugnu points at the right tile this long
const JUGNU_SIZE = 110;
const DOTS = { y: 520, xs: [1090, 1140, 1190] }; // one per group, right of the tiles

// game: 'count-1' or 'count-2'. onDone(): the three groups are done.
// Returns { showMe, stop, pause, resume }.
export function playCount(view, { game, onDone = () => {}, rand = Math.random }) {
  view.innerHTML = JUGNU_IMG;
  const buddy = view.querySelector('.buddy');
  const board = mountBoard(view);
  board.el.classList.add('ct-board');
  const level = countLevel(game);
  const plan = countPlay(level, readLastPlay(game), rand);
  saveLastPlay(game, plan.map(countKey));
  const dots = DOTS.xs.map((x) => svgEl('circle', { class: 'od-dot', cx: x, cy: DOTS.y, r: 14 }, board.svg));

  const opened = performance.now();
  let alive = true;
  let paused = false;
  let roundNo = 0;
  let round = null;
  let phase = 'count';  // 'count', then 'pick', then 'done'
  let counting = null;  // finds.js startCount / startCountOn
  let picking = null;   // games.js startPick
  let groupEl = null;
  let tileEls = [];
  let busy = true;      // a group is glowing, or Jugnu is showing: taps wait
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
    timers.add(t);
  };

  const cellEl = (i) => groupEl.querySelector(`.cnt[data-i="${i}"]`);
  const frameEl = (f) => groupEl.querySelector(`.frame[data-f="${f}"]`);

  // A new group, ready to count: the things at the top, no tiles yet.
  function nextRound() {
    roundNo += 1;
    round = plan[roundNo - 1];
    groupEl?.remove();
    for (const el of tileEls) el.remove();
    tileEls = [];
    const art = countArt(level, round.kind, round.n);
    const { fit } = countBoardBoxes(level, round.n);
    groupEl = document.createElement('div');
    groupEl.className = `ct-group sc-counting ready${level === 2 ? ' counting-on' : ''}`;
    Object.assign(groupEl.style, { left: `${fit.x}px`, top: `${fit.y}px`, width: `${art.W * fit.scale}px`, height: `${art.H * fit.scale}px` });
    groupEl.innerHTML = art.svg;
    board.el.appendChild(groupEl);
    if (level === 2) for (let f = 0; f < Math.floor(round.n / 10); f++) frameEl(f).classList.add('full');
    counting = level === 1 ? startCount(round.n) : startCountOn(round.n);
    picking = startPick();
    phase = 'count';
    busy = false;
  }

  // Every thing is counted: the three number tiles rise below. The counting numbers stay.
  function showTiles() {
    phase = 'pick';
    groupEl.classList.remove('ready');
    tileEls = countTiles().map((t, i) => {
      const el = document.createElement('div');
      el.className = 'ct-tile';
      el.setAttribute('role', 'button');
      el.style.animationDelay = `${i * 0.12}s`;
      Object.assign(el.style, { left: `${t.x0}px`, top: `${t.y0}px`, width: `${t.x1 - t.x0}px`, height: `${t.y1 - t.y0}px` });
      const n = round.choices[i];
      el.innerHTML = `<span class="ct-num" style="color:${tileColorOf(String(n)) ?? '#1D2B8F'}">${n}</span>`;
      board.el.appendChild(el);
      return el;
    });
  }

  // The right tile: it glows with a chime, the group cheers, its dot fills; then the next group.
  function found(index) {
    phase = 'done';
    busy = true;
    tileEls[index].classList.add('ct-right');
    groupEl.classList.add('cheer');
    dots[roundNo - 1].classList.add('on');
    chime();
    if (roundNo >= COUNT.groupsPerPlay) {
      later(() => { board.el.classList.add('gm-glow'); letterChime(); }, 400);
      later(onDone, DONE_MS);
    } else {
      later(nextRound, NEXT_MS);
    }
  }

  // A counting tap: a thing, or (level 2) a full frame.
  function countTap(target) {
    if (level === 1) {
      if (target?.item === undefined) return;
      const r = tapCount(counting, target.item);
      if (r.number === null) return;
      counting = r.state;
      const cell = cellEl(target.item);
      cell.querySelector('.num').textContent = String(r.number);
      cell.classList.add('counted');
      countTone(r.number);
      if (cell.classList.contains('gold')) goldTone();
    } else {
      const r = tapTens(counting, target);
      if (r.number === null) {
        // An extra before the ten: it does not count, and the frame to tap pulses.
        const f = nextFrame(counting);
        if (f !== null && f !== undefined) replay(frameEl(f), 'pulse');
        return;
      }
      counting = r.state;
      countTone(countStep(r.number, round.n));
      if (r.frame !== null) frameEl(r.frame).classList.add('counted-ten');
      else {
        const cell = cellEl(r.state.order[r.state.order.length - 1]);
        cell.querySelector('.num').textContent = String(r.number);
        cell.classList.add('counted');
      }
    }
    if (counting.done) showTiles();
  }

  // Her touch: counting, or picking a number tile.
  function tap(point) {
    if (phase === 'count') {
      const target = hitCount(point, level, round.n);
      if (target) countTap(target);
      return;
    }
    if (phase !== 'pick') return;
    const index = hitCountTile(point, marginUnits(board.s, 20));
    if (index === null) return;
    const r = pickNumber(picking, round, index);
    picking = r.state;
    logAttempt(gameLogEntry({ game, set: roundNo, from: String(round.choices[index]), to: String(round.n), ok: r.ok, ms: performance.now() - opened }));
    if (r.ok) return found(index);
    replay(tileEls[index], 'wig');
    if (r.hint !== null) later(() => replay(tileEls[r.hint], 'wig'), HINT_DELAY_MS);
  }

  // Show me: never her move. While she counts, what is left to count breathes;
  // once the tiles are out, Jugnu points at the right one. The log gets a help entry.
  function showMe() {
    if (busy || paused) return false;
    const m = showMeCount(phase, round, picking);
    if (!m) return false;
    busy = true;
    logAttempt(showMeLogEntry({ game, set: roundNo, ms: performance.now() - opened }));
    if (m.kind === 'count') {
      const f = level === 2 ? nextFrame(counting) : null;
      if (f !== null && f !== undefined) replay(frameEl(f), 'pulse');
      else {
        const left = [...groupEl.querySelectorAll('.cnt:not(.counted)')];
        left.forEach((el) => el.classList.add('ct-nudge'));
        later(() => left.forEach((el) => el.classList.remove('ct-nudge')), NUDGE_MS);
      }
      later(() => { busy = false; }, NUDGE_MS);
      return true;
    }
    const t = countTiles()[m.index];
    const j = document.createElement('img');
    j.className = 'gm-jugnu gm-point';
    j.src = 'assets/jugnu.svg';
    j.alt = '';
    Object.assign(j.style, { left: `${(t.x0 + t.x1) / 2 - JUGNU_SIZE / 2}px`, top: `${t.y0 - JUGNU_SIZE * 0.8}px`, width: `${JUGNU_SIZE}px` });
    board.el.appendChild(j);
    buddy.classList.add('away');
    tileEls[m.index].classList.add('ct-look');
    later(() => {
      tileEls[m.index]?.classList.remove('ct-look');
      j.classList.add('gm-fading');
      later(() => { j.remove(); buddy.classList.remove('away'); busy = false; }, 450);
    }, POINT_MS);
    return true;
  }

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (p) => {
      if (paused || busy) return;
      tap(board.toUnits(p));
    },
    onMove: () => {},
    onEnd: () => {},
  });

  nextRound();

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
