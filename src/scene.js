// scene.js — the find and count scenes on screen (Slice 5C). finds.js decides
// what is in a scene; this file draws it and plays it.
// Child-screen rules: no text but the words under objects and the numbers,
// no failure sound, nothing red, every target at least 88 px, Jugnu the only
// character and on the left. Every tap on an object, a group or an item goes
// into the attempt log as a "find" entry.

import { ROOMS, BASKET } from '../data/finds.js';
import {
  FINDS, HINT_MS, WORD_MS, letterScene, numberScene, makeGroup, groupWord, startCount, tapCount,
  sceneFit, groupScale, countScale, COUNT_BOX, findLogEntry,
} from './finds.js';
import { logAttempt, saveFind } from './storage.js';
import { chime, letterChime, popSound, countTone, goldTone } from './audio.js';

const FOUND_MS = 1500;   // a found object glows and plays before it flies
const FLY_MS = 700;      // into the basket
const DONE_MS = 2200;    // the last glow and chime, then back to the board
const MOVE_MS = 800;     // the chosen group moves to the middle
const COUNTED_MS = 2600; // the word shows, then back to the board

const JUGNU_IMG = '<img class="buddy at-left" src="assets/jugnu.svg" alt="" draggable="false">';

// "egg" with its first letter in `color` (her letter's color), or plain.
function wordHTML(word, color) {
  const el = document.createElement('span');
  if (color) {
    const b = document.createElement('b');
    b.style.color = color;
    b.textContent = word.charAt(0);
    el.append(b, word.slice(1));
  } else {
    el.textContent = word;
  }
  return el;
}

// Restart a one-shot CSS animation class.
function replay(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// view: the screen's element. char: 'E' or '4'. color: her character's color.
// lastKind: the kind of her last counted group. onDone(): back to the board.
// Returns { stop, pause, resume }, or null when the character has no scene.
export function startScene(view, { char, color, lastKind = null, onDone = () => {}, rand = Math.random }) {
  const isNumber = /^[0-9]$/.test(char);
  const scene = isNumber ? numberScene(Number(char), { lastKind, rand }) : letterScene(char, rand);
  if (!scene) return null;

  const opened = performance.now();
  let alive = true;
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
    timers.add(t);
    return t;
  };
  const cancel = (t) => { clearTimeout(t); timers.delete(t); };
  const log = (fields) => logAttempt(findLogEntry({ char, scene: isNumber ? 'number' : 'letter', ...fields, ms: performance.now() - opened }));

  view.innerHTML = `<div class="sc-stage">${ROOMS[scene.room].backdrop}</div>${JUGNU_IMG}`;
  const stage = view.querySelector('.sc-stage');
  stage.firstElementChild.classList.add('sc-backdrop');

  function fit() {
    const { s, left, top } = sceneFit(view.clientWidth || innerWidth, view.clientHeight || innerHeight);
    stage.style.transform = `translate(${left}px, ${top}px) scale(${s})`;
  }
  fit();
  const listening = new AbortController();
  let placeCount = null; // set once a group is in the middle
  addEventListener('resize', () => { fit(); placeCount?.(); }, { signal: listening.signal });

  // A tap: pointerup on the same element as the pointerdown, so a palm or a
  // slide never counts. Every target ignores the other fingers.
  const onTap = (el, fn) => el.addEventListener('click', (e) => { e.stopPropagation(); if (alive) fn(e); }, { signal: listening.signal });

  const hooks = { pause: () => {}, resume: () => {} };
  if (isNumber) playNumber();
  else playLetter();

  // ---- letters: find 3 ----
  function playLetter() {
    const dots = document.createElement('div');
    dots.className = 'sc-dots';
    dots.innerHTML = '<i></i><i></i><i></i>';
    const basket = document.createElement('div');
    basket.className = 'sc-basket';
    basket.innerHTML = `<div class="sc-minis"></div>${BASKET}`; // the basket in the top-right corner, clear of every spot
    view.append(dots, basket);
    let found = 0;
    let hint = null;
    const armHint = () => {
      if (hint) cancel(hint);
      hint = later(() => {
        for (const it of items) if (it.right && !it.found) replay(it.el, 'wig');
        armHint();
      }, HINT_MS);
    };

    const items = scene.items.map((o) => {
      const el = document.createElement('div');
      const { x, bottom, w } = o.spot;
      el.className = 'sc-obj';
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', o.word);
      Object.assign(el.style, { left: `${x - w / 2}px`, top: `${bottom - 1.2 * w}px`, width: `${w}px` });
      el.innerHTML = o.art;
      const label = document.createElement('div');
      label.className = `sc-word${bottom > 560 ? ' above' : ''}`;
      el.appendChild(label);
      stage.appendChild(el);
      const it = { ...o, el, label, found: false, wordTimer: null };
      onTap(el, () => tapObject(it));
      return it;
    });

    function tapObject(it) {
      if (it.found || found >= FINDS) return;
      log({ step: 'find', word: it.word, ok: it.right });
      if (!it.right) {
        // Wiggle and say its own name (on screen) for a moment. No sound.
        replay(it.el, 'wig');
        it.label.replaceChildren(wordHTML(it.word, null));
        it.label.classList.add('show');
        if (it.wordTimer) cancel(it.wordTimer);
        it.wordTimer = later(() => it.label.classList.remove('show'), WORD_MS);
        return;
      }
      it.found = true;
      found += 1;
      saveFind({ o: it.id });
      if (it.wordTimer) cancel(it.wordTimer);
      it.label.replaceChildren(wordHTML(it.word, color));
      it.label.classList.add('show');
      it.el.classList.add('found', `rw-${it.reward}`);
      chime();
      if (found < FINDS) armHint();
      else if (hint) cancel(hint);
      const k = found;
      later(() => flyToBasket(it, k), FOUND_MS);
    }

    function flyToBasket(it, k) {
      const from = it.el.getBoundingClientRect();
      const to = basket.getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.className = 'sc-ghost';
      ghost.innerHTML = it.art;
      Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px` });
      view.appendChild(ghost);
      it.el.classList.add('gone');
      void ghost.offsetWidth;
      Object.assign(ghost.style, { left: `${to.left + to.width * 0.3}px`, top: `${to.top + to.height * 0.1}px`, width: `${to.width * 0.4}px` });
      popSound();
      later(() => {
        ghost.remove();
        const mini = document.createElement('div');
        mini.className = 'sc-mini';
        mini.innerHTML = it.art;
        basket.querySelector('.sc-minis').appendChild(mini);
        replay(basket, 'wig');
        dots.children[k - 1].classList.add('on');
        if (k === FINDS) finish();
      }, FLY_MS);
    }

    function finish() {
      view.classList.add('sc-done');
      letterChime();
      later(onDone, DONE_MS);
    }

    armHint();
    hooks.pause = () => { if (hint) cancel(hint); hint = null; };
    hooks.resume = () => { if (found < FINDS) armHint(); };
  }

  // ---- numbers: pick the group, then count ----
  function playNumber() {
    let chosen = false;
    const groups = scene.groups.map((g, i) => {
      const art = makeGroup(g.kind, g.count, g.gold);
      const k = groupScale(art.W, g.spot.maxW);
      const el = document.createElement('div');
      el.className = 'sc-group';
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', String(g.count));
      const w = art.W * k;
      const h = art.H * k;
      Object.assign(el.style, { left: `${g.spot.x - w / 2}px`, top: `${g.spot.bottom - h}px`, width: `${w}px` });
      el.innerHTML = art.svg;
      stage.appendChild(el);
      const it = { ...g, el, art, index: i };
      onTap(el, () => tapGroup(it));
      return it;
    });

    function tapGroup(it) {
      if (chosen) return;
      log({ step: 'group', count: it.count, ok: it.index === scene.right });
      if (it.index !== scene.right) {
        replay(it.el, 'wig');
        return;
      }
      chosen = true;
      popSound();
      for (const g of groups) if (g !== it) g.el.classList.add('gone');
      moveToMiddle(it);
    }

    // The chosen group leaves the room and grows in the middle of the screen.
    function moveToMiddle(it) {
      const from = it.el.getBoundingClientRect();
      const el = it.el;
      el.classList.add('sc-counting');
      view.appendChild(el);
      Object.assign(el.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px` });
      const word = document.createElement('div');
      word.className = 'sc-count-word';
      view.appendChild(word);
      placeCount = () => {
        const w = view.clientWidth || innerWidth;
        const h = view.clientHeight || innerHeight;
        const k = countScale(it.art.W, it.art.H, w, h);
        const gw = it.art.W * k;
        const gh = it.art.H * k;
        const left = COUNT_BOX.left + (w - COUNT_BOX.left - COUNT_BOX.right - gw) / 2;
        const top = COUNT_BOX.top + (h - COUNT_BOX.top - COUNT_BOX.bottom - gh) / 2;
        Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${gw}px` });
        Object.assign(word.style, { left: `${left + gw / 2}px`, top: `${top + gh + 16}px` });
      };
      void el.offsetWidth;
      placeCount();
      later(() => startCounting(it, word), MOVE_MS);
    }

    function startCounting(it, word) {
      let state = startCount(it.count);
      it.el.classList.add('ready');
      for (const cell of it.el.querySelectorAll('.cnt')) {
        const i = Number(cell.dataset.i);
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!alive) return;
          const r = tapCount(state, i);
          if (r.number === null) {
            if (!state.done) log({ step: 'count', count: state.order.indexOf(i) + 1, ok: false });
            return;
          }
          state = r.state;
          log({ step: 'count', count: r.number, ok: true });
          cell.querySelector('.num').textContent = String(r.number);
          cell.classList.add('counted');
          countTone(r.number);
          if (cell.classList.contains('gold')) goldTone();
          if (state.done) counted(it, word);
        }, { signal: listening.signal });
      }
    }

    function counted(it, word) {
      const text = groupWord(it.kind, it.count);
      const sp = text.indexOf(' ');
      const b = document.createElement('b');
      b.style.color = color;
      b.textContent = text.slice(0, sp);
      word.replaceChildren(b, text.slice(sp));
      word.classList.add('show');
      it.el.classList.add('cheer');
      saveFind({ g: it.kind, n: it.count, gold: it.gold >= 0 });
      later(() => { view.classList.add('sc-done'); letterChime(); }, 250);
      later(onDone, COUNTED_MS);
    }
  }

  return {
    scene,
    // The tablet is upright: no hint while the picture covers the scene.
    pause: () => hooks.pause(),
    resume: () => hooks.resume(),
    stop() {
      if (!alive) return;
      alive = false;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      listening.abort();
    },
  };
}
