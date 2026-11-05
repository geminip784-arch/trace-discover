// match.js — draw a line to match, on screen (Slices 5D and 5F): numbers,
// colors, letters, shadows and shapes all share this one engine. On the first
// set, Jugnu matches the top left card himself, then she carries on. games.js decides what is in a set and
// whether a drop is right; this file draws it and plays it.
// Child-screen rules: no text but the digits, no failure sound, nothing red as
// feedback, every card at least 88 px, Jugnu the only character. Every line and
// card is kept in board units (1280 x 640), so a resize or a rotation only
// rescales the board. Every release goes into the attempt log as a "game" entry.

import { makeGroup } from './finds.js';
import {
  BOARD, boardFit, SETS_PER_PLAY, makeSet, cardsOf, hitCard, marginUnits, startMatch, dropCard,
  partnerCard, gameLogEntry, showsFirstMove, firstMovePair, FIRST_MOVE_DELAY_MS,
} from './games.js';
import {
  blob, colorThing, letterArt, objectPicture, shadowArt, shapeArt, shapeThingArt, LETTER_PICTURES,
} from '../data/games.js';
import { trackSinglePointer } from './input.js';
import { tileColorOf } from './session.js';
import { logAttempt } from './storage.js';
import { chime, letterChime } from './audio.js';
import { STAR } from './art.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FADE_MS = 450;      // a wrong line fades
const SPARKLE_MS = 900;   // the star on a right partner
const HINT_DELAY_MS = 650; // the hint wiggle waits for the first wiggle to end
const SET_GLOW_MS = 1500; // all 4 matched: everything glows, then the next set
const CURVE = 190;        // how far a matched curve bows out of each card, in units
const FIRST_MOVE_MS = 1600; // Jugnu draws the first line
const JUGNU_SIZE = 110;

export const JUGNU_IMG = '<img class="buddy at-left" src="assets/jugnu.svg" alt="" draggable="false">';

// The board both games are drawn on: 1280 x 640 units, scaled to fit the screen
// right of the button column. Returns { el, svg, fit, s, toUnits, onResize, stop }.
export function mountBoard(view) {
  const el = document.createElement('div');
  el.className = 'gm-board';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${BOARD.w} ${BOARD.h}`);
  svg.classList.add('gm-svg');
  el.appendChild(svg);
  view.appendChild(el);
  const board = { el, svg, s: 1, onResize: null };
  board.fit = () => {
    const { s, left, top } = boardFit(view.clientWidth || innerWidth, view.clientHeight || innerHeight);
    board.s = s;
    el.style.transform = `translate(${left}px, ${top}px) scale(${s})`;
  };
  // trackSinglePointer gives CSS px from the board's top-left corner on screen.
  board.toUnits = (p) => [p.x / board.s, p.y / board.s];
  const listening = new AbortController();
  addEventListener('resize', () => { board.fit(); board.onResize?.(); }, { signal: listening.signal });
  board.stop = () => listening.abort();
  board.fit();
  return board;
}

export function svgEl(tag, attrs, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent?.appendChild(el);
  return el;
}

export function replay(el, cls) {
  el.classList.remove(cls);
  void el.getBoundingClientRect();
  el.classList.add(cls);
}

const curve = ([ax, ay], [bx, by]) => `M${ax} ${ay} C${ax + CURVE} ${ay} ${bx - CURVE} ${by} ${bx} ${by}`;

// The letters she recorded, for the letter cards (data/chars/<id>.json).
async function loadLetters() {
  const out = {};
  await Promise.all(Object.keys(LETTER_PICTURES).map(async (id) => {
    const res = await fetch(`data/chars/${encodeURIComponent(id)}.json`);
    out[id] = await res.json();
  }));
  return out;
}

// game: a match tile's id ('numbers', 'colors', 'letters', 'shadows', 'shapes').
// onDone(): three sets are done. Returns { stop, pause, resume }.
export function playMatch(view, { game, onDone = () => {}, rand = Math.random }) {
  view.innerHTML = JUGNU_IMG;
  const buddy = view.querySelector('.buddy');
  const board = mountBoard(view);
  const lines = svgEl('g', { class: 'gm-lines' }, board.svg);
  const live = svgEl('path', { class: 'gm-live', d: '' }, board.svg);
  const layer = document.createElement('div');
  layer.className = 'gm-cards';
  board.el.appendChild(layer);

  const opened = performance.now();
  let alive = true;
  let paused = false;
  let setNo = 0;
  let set = null;
  let cards = [];
  let state = null;
  let drag = null;        // { card, end, mine } (mine: hers, not Jugnu's)
  let busy = true;        // a set is glowing, or Jugnu is drawing: no new lines
  let letters = null;     // the letter cards' characters (letters only)
  let framePending = false;
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
    timers.add(t);
  };
  const log = (fields) => logAttempt(gameLogEntry({ game, set: setNo, ...fields, ms: performance.now() - opened }));

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

  function cardHTML(side, pair) {
    if (game === 'letters') return side === 'left' ? letterArt(letters[pair.left.letter]) : objectPicture(pair.right.object);
    if (game === 'shadows') return side === 'left' ? objectPicture(pair.left.object) : shadowArt(pair.right.shadow);
    if (game === 'shapes') return side === 'left' ? shapeArt(pair.left.shape) : shapeThingArt(pair.right.thing);
    if (game === 'numbers') {
      if (side === 'left') return `<span class="gm-digit" style="color:${tileColorOf(String(pair.left.digit))}">${pair.left.digit}</span>`;
      // Only the placemat: the strip above it (for counting numbers) is cropped off.
      const g = makeGroup(pair.right.kind, pair.right.count);
      return g.svg.replace(`viewBox="0 0 ${g.W} ${g.H}"`, `viewBox="0 14 ${g.W} ${g.H - 14}"`);
    }
    return side === 'left' ? blob(pair.left.color) : colorThing(pair.right.color);
  }

  function newSet() {
    setNo += 1;
    set = makeSet(game, rand);
    state = startMatch();
    cards = cardsOf(set);
    lines.replaceChildren();
    layer.replaceChildren();
    board.el.classList.remove('gm-glow');
    for (const c of cards) {
      const el = document.createElement('div');
      el.className = `gm-card gm-${c.side} gm-${game}`;
      Object.assign(el.style, { left: `${c.x0}px`, top: `${c.y0}px`, width: `${c.x1 - c.x0}px`, height: `${c.y1 - c.y0}px` });
      el.innerHTML = cardHTML(c.side, set.pairs[c.pair]);
      el.setAttribute('role', 'button');
      layer.appendChild(el);
      c.el = el;
    }
    busy = false;
    if (showsFirstMove(setNo)) {
      busy = true;
      later(firstMove, FIRST_MOVE_DELAY_MS);
    }
  }

  // Jugnu draws the line from the top left card to its partner, then that
  // pair is matched like one of hers (not logged: it is not her move).
  async function firstMove() {
    const from = cards.find((c) => c.side === 'left' && c.pair === firstMovePair(set));
    const to = partnerCard(cards, from);
    const j = document.createElement('img');
    j.className = 'gm-jugnu';
    j.src = 'assets/jugnu.svg';
    j.alt = '';
    board.el.appendChild(j);
    buddy.classList.add('away');
    from.el.classList.add('gm-lift');
    const place = ([x, y]) => Object.assign(j.style, { left: `${x - JUGNU_SIZE / 2}px`, top: `${y - JUGNU_SIZE * 0.75}px`, width: `${JUGNU_SIZE}px` });
    await tween(FIRST_MOVE_MS, (f) => {
      const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
      const p = [from.anchor[0] + (to.anchor[0] - from.anchor[0]) * e, from.anchor[1] + (to.anchor[1] - from.anchor[1]) * e];
      place(p);
      drag = { card: from, end: p };
      drawLive();
    });
    if (!alive) return;
    from.el.classList.remove('gm-lift');
    const r = dropCard(state, from, to);
    state = r.state;
    matched(from, r);
    j.classList.add('gm-fading');
    later(() => { j.remove(); buddy.classList.remove('away'); if (!r.done) busy = false; }, FADE_MS);
  }

  const label = (c) => (c ? set.pairs[c.pair][c.side].label : null);

  function drawLive() {
    framePending = false;
    live.setAttribute('d', drag ? `M${drag.card.anchor[0]} ${drag.card.anchor[1]} L${drag.end[0]} ${drag.end[1]}` : '');
  }
  const requestDraw = () => {
    if (!framePending) {
      framePending = true;
      requestAnimationFrame(drawLive);
    }
  };

  // A wrong line: a copy fades away while the live line clears at once.
  function fadeLine() {
    const ghost = live.cloneNode();
    ghost.setAttribute('class', 'gm-live gm-fading');
    board.svg.appendChild(ghost);
    later(() => ghost.remove(), FADE_MS);
    drag = null;
    drawLive();
  }

  function sparkle(c) {
    const el = document.createElement('div');
    el.className = 'gm-sparkle';
    el.innerHTML = STAR;
    Object.assign(el.style, { left: `${(c.x0 + c.x1) / 2 - 45}px`, top: `${(c.y0 + c.y1) / 2 - 45}px` });
    layer.appendChild(el);
    later(() => el.remove(), SPARKLE_MS);
  }

  function release() {
    const d = drag;
    if (!d?.mine) return; // Jugnu's line is his own
    const to = hitCard(d.end, cards, marginUnits(board.s));
    const r = dropCard(state, d.card, to);
    state = r.state;
    log({ from: label(d.card), to: label(to), ok: r.ok });
    d.card.el.classList.remove('gm-lift');
    if (!r.ok) {
      fadeLine();
      replay(d.card.el, 'wig');
      if (r.hint !== null) {
        const partner = partnerCard(cards, d.card);
        later(() => replay(partner.el, 'wig'), HINT_DELAY_MS);
      }
      return;
    }
    matched(d.card, r);
  }

  // A right line: it stays, glowing, and both cards light up.
  function matched(card, r) {
    drag = null;
    drawLive();
    const partner = partnerCard(cards, card);
    const [a, b] = card.side === 'left' ? [card.anchor, partner.anchor] : [partner.anchor, card.anchor];
    svgEl('path', { class: 'gm-halo', d: curve(a, b) }, lines);
    svgEl('path', { class: 'gm-core', d: curve(a, b) }, lines);
    card.el.classList.add('gm-matched');
    partner.el.classList.add('gm-matched');
    sparkle(partner);
    chime();
    if (r.done) {
      busy = true;
      later(() => { board.el.classList.add('gm-glow'); letterChime(); }, 300);
      later(() => (setNo >= SETS_PER_PLAY ? onDone() : newSet()), SET_GLOW_MS);
    }
  }

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (p) => {
      if (paused || busy || drag) return;
      const u = board.toUnits(p);
      const card = hitCard(u, cards, marginUnits(board.s));
      if (!card || state.matched.includes(card.pair)) return;
      drag = { card, end: u, mine: true };
      card.el.classList.add('gm-lift');
      requestDraw();
    },
    onMove: (points) => {
      if (!drag?.mine) return;
      drag.end = board.toUnits(points[points.length - 1]);
      requestDraw();
    },
    onEnd: () => release(),
  });

  // A line she was drawing is dropped, not scored (the tablet turned upright).
  function dropDrag() {
    if (!drag?.mine) return;
    drag.card.el.classList.remove('gm-lift');
    drag = null;
    drawLive();
  }
  board.onResize = dropDrag;

  if (game === 'letters') {
    loadLetters().then((chars) => { if (!alive) return; letters = chars; newSet(); });
  } else {
    newSet();
  }

  return {
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

