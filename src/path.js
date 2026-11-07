// path.js — follow the path, on screen (Slices 5D and 5F). games.js holds the
// roads and decides whether her finger is on one; this file draws the board and
// plays it. Set 1 ('path'): three animals on the left, their homes on the right.
// Set 2 ('path-rooms'): three pieces of furniture and their rooms. First,
// Jugnu flies the top road himself and its traveller hops home; then she
// carries on. three wide roads that
// cross, the later road drawn over the earlier with its outline, like a bridge.
// Her trace glows while she stays on the road. Leaving it fades the trace and
// the animal wiggles (no sound); after 3 times off the same road, Jugnu flies
// it once. Reaching the home, the animal hops in with a chime. Everything is in
// board units (1280 x 640). Every arrival and every time off the road goes into
// the attempt log as a "game" entry.
// Slice 5H: set 1 picks 3 of 8 animals, never the same three as her last play;
// a plain tap on a traveller makes it wiggle (not a try, not logged).

import {
  PATH, pathBoard, pathPlay, pathKey, isPlainTap, startsAtAnimal, startTrace, stepTrace, startMisses, missRoad, boardDone,
  gameLogEntry, firstMoveRoad, FIRST_MOVE_DELAY_MS,
} from './games.js';
import { ANIMALS, HOMES, FURNITURE, ROOM_HOME, roomArt } from '../data/games.js';
import { mountBoard, svgEl, replay, JUGNU_IMG } from './match.js';
import { trackSinglePointer } from './input.js';
import { logAttempt, readLastPlay, saveLastPlay } from './storage.js';
import { chime, letterChime } from './audio.js';

const ANIMAL_SIZE = 120;  // units
const HOME_SIZE = 150;
const FADE_MS = 450;      // a trace fades
const HOP_MS = 750;       // the animal hops into its home
const DEMO_MS = 3000;     // Jugnu flies a road
const JUGNU_SIZE = 110;
const DONE_MS = 1800;     // every animal home: a glow, then back to the menu

const d = (pts) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}`;

// game: 'path' (animals) or 'path-rooms' (furniture). onDone(): every one is
// home. Returns { stop, pause, resume }.
export function playPath(view, { game = 'path', onDone = () => {}, rand = Math.random }) {
  view.innerHTML = JUGNU_IMG;
  const buddy = view.querySelector('.buddy');
  const board = mountBoard(view);
  const things = pathPlay(game, readLastPlay(game), rand);
  saveLastPlay(game, [pathKey(things)]);
  const { roads } = pathBoard(rand, undefined, things);
  const rooms = game === 'path-rooms';
  const artOf = (t) => (rooms ? FURNITURE[t].art : ANIMALS[t].art);
  const homeOf = (t) => (rooms ? roomArt(FURNITURE[t].home) : HOMES[ANIMALS[t].home]);

  const opened = performance.now();
  let alive = true;
  let paused = false;
  let trace = null;     // { road, state, pts }
  let demoing = true;   // Jugnu is flying a road: touches wait (he shows the first move)
  let misses = startMisses();
  const home = [];      // animals that are home
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
    timers.add(t);
  };
  const log = (road, ok) => logAttempt(gameLogEntry({ game, road, ok, ms: performance.now() - opened }));

  // An animation that holds still while the game is paused. f goes 0..1.
  function tween(ms, onFrame) {
    return new Promise((resolve) => {
      let t = 0;
      let last = null;
      const step = (now) => {
        if (!alive) return resolve(false);
        if (last === null) last = now;
        if (!paused) t += now - last;
        last = now;
        const f = Math.min(1, t / ms);
        onFrame(f);
        if (f < 1) requestAnimationFrame(step);
        else resolve(true);
      };
      requestAnimationFrame(step);
    });
  }

  // ---- the roads: drawn in order, so each later road crosses over the earlier ones ----
  const roadsG = svgEl('g', { class: 'gm-roads' }, board.svg);
  for (const r of roads) {
    const g = svgEl('g', { class: 'gm-road' }, roadsG);
    const line = d(r.points);
    svgEl('path', { class: 'gm-road-edge', d: line, 'stroke-width': PATH.width + 12 }, g);
    svgEl('path', { class: 'gm-road-top', d: line, 'stroke-width': PATH.width }, g);
    svgEl('path', { class: 'gm-road-mid', d: line }, g);
    r.g = g;
  }
  const traceEl = svgEl('path', { class: 'gm-trace', d: '' }, board.svg);

  // ---- the animals and their homes ----
  const place = (el, [x, y], w, h = w) => Object.assign(el.style, {
    left: `${x - w / 2}px`, top: `${y - h / 2}px`, width: `${w}px`, height: `${h}px`,
  });
  for (const r of roads) {
    const h = document.createElement('div');
    h.className = rooms ? 'gm-home gm-room' : 'gm-home';
    h.innerHTML = homeOf(r.animal);
    const end = r.points[r.points.length - 1];
    if (rooms) place(h, [end[0] + 10, end[1]], ROOM_HOME.w, ROOM_HOME.h);
    else place(h, end, HOME_SIZE);
    board.el.appendChild(h);
    r.homeEl = h;
    const a = document.createElement('div');
    a.className = 'gm-animal';
    a.setAttribute('role', 'button');
    a.innerHTML = artOf(r.animal);
    place(a, r.points[0], ANIMAL_SIZE);
    board.el.appendChild(a);
    r.el = a;
  }

  let framePending = false;
  const drawTrace = () => {
    framePending = false;
    traceEl.setAttribute('d', trace && trace.pts.length ? d(trace.pts.length === 1 ? [trace.pts[0], trace.pts[0]] : trace.pts) : '');
  };
  const requestDraw = () => {
    if (!framePending) {
      framePending = true;
      requestAnimationFrame(drawTrace);
    }
  };

  // Her trace fades away (she left the road, or let go before the home).
  function fadeTrace() {
    if (!trace) return;
    const ghost = traceEl.cloneNode();
    ghost.setAttribute('class', 'gm-trace gm-fading');
    board.svg.appendChild(ghost);
    later(() => ghost.remove(), FADE_MS);
    trace = null;
    drawTrace();
  }

  function leftRoad(r) {
    log(r.animal, false);
    fadeTrace();
    replay(r.el, 'wig');
    const m = missRoad(misses, r.animal);
    misses = m.misses;
    if (m.demo) later(() => demo(r), 600);
  }

  // Jugnu flies the road once, from the animal to its home. Resolves when he arrives.
  async function demo(r) {
    demoing = true;
    const j = document.createElement('img');
    j.className = 'gm-jugnu';
    j.src = 'assets/jugnu.svg';
    j.alt = '';
    board.el.appendChild(j);
    buddy.classList.add('away');
    const trail = svgEl('path', { class: 'gm-trail', d: d(r.points), pathLength: 1, 'stroke-dasharray': '0 2' }, board.svg);
    const at = (f) => {
      const i = Math.min(r.points.length - 1, Math.round(f * (r.points.length - 1)));
      return r.points[i];
    };
    await tween(DEMO_MS, (f) => {
      const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
      place(j, at(e), JUGNU_SIZE);
      trail.setAttribute('stroke-dasharray', `${e} 2`);
    });
    if (!alive) return false;
    j.classList.add('gm-fading');
    trail.classList.add('gm-fading');
    later(() => { j.remove(); trail.remove(); buddy.classList.remove('away'); demoing = false; }, FADE_MS);
    return true;
  }

  // Home: the traveller hops in with a chime. mine: she traced it (logged);
  // otherwise it was Jugnu's first move.
  async function arrive(r, mine = true) {
    if (mine) log(r.animal, true);
    home.push(r.animal);
    trace = null;
    drawTrace();
    r.g.classList.add('gm-done');
    chime();
    const [x0, y0] = r.points[0];
    const [x1, y1] = r.points[r.points.length - 1];
    await tween(HOP_MS, (f) => {
      const x = x0 + (x1 - x0) * f;
      const y = y0 + (y1 - y0) * f - Math.sin(Math.PI * f) * 160;
      place(r.el, [x, y], ANIMAL_SIZE * (1 - 0.35 * f));
    });
    if (!alive) return;
    r.el.classList.add('gm-home-in');
    r.homeEl.classList.add('gm-lit');
    if (boardDone(home, things)) {
      board.el.classList.add('gm-glow');
      letterChime();
      later(onDone, DONE_MS);
    }
  }

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (p) => {
      if (paused || demoing || trace) return;
      const u = board.toUnits(p);
      const r = roads.find((road) => !home.includes(road.animal) && startsAtAnimal(u, road));
      if (!r) return;
      trace = { road: r, state: startTrace(), pts: [u], moved: 0 };
      requestDraw();
    },
    onMove: (points) => {
      if (!trace) return;
      for (const p of points) {
        const u = board.toUnits(p);
        const r = trace.road;
        trace.moved = Math.max(trace.moved, Math.hypot(u[0] - trace.pts[0][0], u[1] - trace.pts[0][1]));
        const step = stepTrace(trace.state, u, r);
        if (!step.on) return leftRoad(r);
        trace.state = step.state;
        trace.pts.push(u);
        if (step.done) return arrive(r);
      }
      requestDraw();
    },
    onEnd: () => {
      // A tap on a traveller, not a trace: it wiggles. Not a try, not logged.
      if (trace && isPlainTap(trace.moved, board.s)) replay(trace.road.el, 'wig');
      fadeTrace();
    },
  });

  // A trace she was drawing is dropped, not logged (the tablet turned upright).
  const dropTrace = () => {
    trace = null;
    drawTrace();
  };
  board.onResize = dropTrace;

  // Jugnu's first move: he flies the top road and its traveller follows him home.
  later(async () => {
    const r = firstMoveRoad(roads);
    if (await demo(r)) arrive(r, false);
  }, FIRST_MOVE_DELAY_MS);

  return {
    pause() { paused = true; dropTrace(); },
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
