// dots.js — a dot-to-dot picture on screen (Slice 5E). drawing.js decides
// which dots, whether she reached one and when Jugnu helps; this file draws it.
// The picture is numbered dots in dark ink; the next dot pulses green. She
// drags from the dot she reached; coming within 40 px of the next dot draws
// that line, and she can carry on through several dots without lifting. Nothing
// fails: if she lifts early or wanders, the unfinished part of her line fades,
// silently, and she carries on from the last dot. After 8 s without a new dot
// Jugnu flies to it (then every 15 s, at most 3 times per dot). Closing the
// shape fills it with its colors and a chime; level 3 then shows the second
// thing's dots beside it. At the end, a crayon row to color over it and a big
// tick that finishes. Everything is in board units. Each dot she reaches is a
// "draw" attempt-log entry.

import {
  findPicture, dotsFor, boxesFor, placeDots, reachUnits, startDots, nextDot, startsAtDot, stepDots,
  startIdle, tickIdle, reachedIdle, drawLogEntry,
} from './drawing.js';
import { PICTURES, TICK } from '../data/drawings.js';
import { mountBoard, svgEl, JUGNU_IMG } from './match.js';
import { createInk, createCrayonRow, onCrayonRow } from './paper.js';
import { trackSinglePointer } from './input.js';
import { logAttempt } from './storage.js';
import { chime, letterChime } from './audio.js';

const INK = '#1D2B8F';       // her line: the tracing ink's strong blue
const LINE_WIDTH = 13;       // units
const DOT_R = 17;            // units
const TICK_MS = 250;         // the idle clock's step
const FLY_MS = 1500;         // Jugnu flies from one dot to the next
const JUGNU_SIZE = 100;
const FILL_MS = 1300;        // the colors fill in, then the next thing (level 3) or the crayons

// level: 1, 2 or 3; picture: 'house', 'car-building', ...; onDone(): the tick.
// Returns { stop, pause, resume }.
export function playDots(view, { level, picture, onDone = () => {} }) {
  const pic = findPicture(level, picture);
  view.innerHTML = JUGNU_IMG;
  const buddy = view.querySelector('.buddy');
  const board = mountBoard(view);
  board.el.classList.add('dw-board');
  const boxes = boxesFor(pic.things);

  // Layers, bottom to top: the scene (level 3, at the end), the colors, her
  // coloring, the dashed outline (level 1), her lines, the dots.
  const scene = svgEl('g', { class: 'dw-scene' }, board.svg);
  svgEl('rect', { x: 12, y: 12, width: 1256, height: 616, rx: 30, fill: '#DDF1FF' }, scene);
  svgEl('rect', { x: 12, y: 448, width: 1256, height: 180, rx: 30, fill: '#9ED58A' }, scene);
  svgEl('rect', { x: 12, y: 448, width: 1256, height: 14, fill: '#7FC46B' }, scene);
  const artG = svgEl('g', {}, board.svg);
  const colorInk = createInk(board.svg, { width: 24 });
  const outlineG = svgEl('g', { class: 'dw-outline' }, board.svg);
  const lineInk = createInk(board.svg, { width: LINE_WIDTH });
  const dotsG = svgEl('g', { class: 'dw-dots' }, board.svg);

  const opened = performance.now();
  let alive = true;
  let paused = false;
  let part = -1;           // which thing she is drawing (level 3 has two)
  let dots = [];
  let state = null;
  let idle = startIdle();
  let helped = false;      // Jugnu flew to the next dot before she reached it
  let drawingLine = false; // her finger is drawing a line between dots
  let flying = false;
  let phase = 'dots';      // 'dots' | 'filling' | 'coloring'
  let dotEls = [];
  let crayons = null;
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

  function showPart(k) {
    part = k;
    const thing = pic.things[k];
    dots = placeDots(dotsFor(thing, level), boxes[k]);
    state = startDots(dots.length);
    idle = startIdle();
    helped = false;
    phase = 'dots';
    outlineG.replaceChildren();
    if (level === 1) {
      svgEl('polygon', { points: dots.map((p) => p.join(',')).join(' '), class: 'dw-dashed' }, outlineG);
    }
    dotsG.replaceChildren();
    dotEls = dots.map(([x, y], i) => {
      const g = svgEl('g', { class: 'dw-dot' }, dotsG);
      svgEl('circle', { cx: x, cy: y, r: DOT_R * 1.9, class: 'dw-dot-ring' }, g);
      svgEl('circle', { cx: x, cy: y, r: DOT_R, class: 'dw-dot-fill' }, g);
      const n = svgEl('text', { x, y, class: 'dw-dot-num' }, g);
      n.textContent = String(i + 1);
      return g;
    });
    markDots();
  }

  // The dot she reached glows softly; the next one pulses green.
  function markDots() {
    dotEls.forEach((g, i) => {
      g.classList.toggle('at', i === state.at && !state.done);
      g.classList.toggle('next', i === nextDot(state) && !state.done);
    });
  }

  function reached(i) {
    logAttempt(drawLogEntry({ picture, thing: pic.things[part], level, dot: i + 1, ms: performance.now() - opened, helped }));
    idle = reachedIdle();
    helped = false;
    markDots();
  }

  // The thing is drawn: its colors fill in under her lines, with a chime.
  function thingDone() {
    phase = 'filling';
    drawingLine = false;
    lineInk.end();
    chime();
    const thing = pic.things[part];
    const { x, y, size } = boxes[part];
    const g = svgEl('g', { class: 'dw-fill', transform: `translate(${x} ${y}) scale(${size / 100})` }, artG);
    g.innerHTML = PICTURES[thing].art;
    dotsG.classList.add('dw-fading');
    outlineG.classList.add('dw-fading');
    later(() => {
      dotsG.classList.remove('dw-fading');
      outlineG.classList.remove('dw-fading');
      dotsG.replaceChildren();
      outlineG.replaceChildren();
      if (part + 1 < pic.things.length) return showPart(part + 1);
      allDone();
    }, FILL_MS);
  }

  // Every thing is drawn: level 3 shows the whole picture in its scene; then
  // the crayons, to color over it if she likes, and the tick.
  function allDone() {
    if (pic.things.length > 1) scene.classList.add('on');
    letterChime();
    phase = 'coloring';
    crayons = createCrayonRow(board, { button: TICK, onButton: () => { if (!paused) onDone(); } });
    crayons.el.querySelector('.dw-button').classList.add('dw-tick');
  }

  // Jugnu flies from the dot she reached to the next one, once.
  async function fly() {
    flying = true;
    helped = true;
    const [a, b] = [dots[state.at], dots[nextDot(state)]];
    const j = document.createElement('img');
    j.className = 'gm-jugnu';
    j.src = 'assets/jugnu.svg';
    j.alt = '';
    board.el.appendChild(j);
    buddy.classList.add('away');
    const place = ([x, y]) => Object.assign(j.style, { left: `${x - JUGNU_SIZE / 2}px`, top: `${y - JUGNU_SIZE * 0.7}px`, width: `${JUGNU_SIZE}px` });
    await tween(FLY_MS, (f) => {
      const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
      place([a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e - Math.sin(Math.PI * e) * 40]);
    });
    if (!alive) return;
    j.classList.add('dw-fading');
    later(() => { j.remove(); buddy.classList.remove('away'); flying = false; }, 450);
  }

  // The idle clock: only while she is on the dots, not paused, and Jugnu is not flying.
  const clock = setInterval(() => {
    if (!alive || paused || flying || phase !== 'dots') return;
    const r = tickIdle(idle, TICK_MS);
    idle = r.idle;
    if (r.hint) fly();
  }, TICK_MS);

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (p) => {
      if (paused) return;
      const u = board.toUnits(p);
      if (phase === 'coloring') {
        if (!onCrayonRow(u)) colorInk.begin(u, crayons.color());
        return;
      }
      if (phase !== 'dots' || !startsAtDot(u, dots, state, reachUnits(board.s))) return;
      drawingLine = true;
      lineInk.begin(dots[state.at], INK);
      lineInk.add([u]);
    },
    onMove: (points) => {
      if (phase === 'coloring') return colorInk.add(points.map(board.toUnits));
      if (!drawingLine) return;
      for (const p of points) {
        const u = board.toUnits(p);
        lineInk.add([u]);
        const r = stepDots(state, u, dots, reachUnits(board.s));
        if (r.reached === null) continue;
        state = r.state;
        // The line she drew up to this dot stays; the next one starts here.
        lineInk.add([dots[r.reached]]);
        reached(r.reached);
        if (r.done) return thingDone();
        lineInk.cut();
      }
    },
    onEnd: () => {
      if (phase === 'coloring') return colorInk.end();
      if (!drawingLine) return;
      drawingLine = false;
      lineInk.end({ fade: true }); // the unfinished part fades; she goes on from the last dot
    },
  });

  // A line in progress is dropped, not scored (a resize, or the tablet upright).
  const dropLine = () => {
    drawingLine = false;
    lineInk.drop();
    colorInk.drop();
  };
  board.onResize = dropLine;

  showPart(0);

  return {
    pause() { paused = true; dropLine(); },
    resume() { paused = false; },
    stop() {
      if (!alive) return;
      alive = false;
      clearInterval(clock);
      for (const t of timers) clearTimeout(t);
      timers.clear();
      stopTracking();
      board.stop();
    },
  };
}
