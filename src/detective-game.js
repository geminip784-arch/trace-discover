// detective-game.js — Dot Detective on screen (Slice 10F). detective.js holds
// the rules (the letters of a play, the three dot tiles, the judging of her own
// dots); this file draws the board and plays it.
// A letter's body stands in the middle, on faint guide lines, without its dots.
// The clue sits on the left: the whole letter on a small card (level 1) or the
// letter's find picture (levels 2 and 3). Levels 1 and 2: three dot tiles on the
// right, each a faint copy of the body with a dot pattern; she taps one. The
// right one: its dots arrive on the body, the letter glows gold, a chime. A wrong
// one wiggles and fades (never red, no sound); after two, the right one glows.
// Level 3: she taps (or draws) the dots onto the body herself; judged at once
// when right, else 4 seconds after her last tap (src/urdu-dots.js, as the copy
// round): her dots go faint, the right ones glow, the line says why, then hers
// fade for a fresh try; after two, the right dots stay as faint targets. Undo
// takes back her last dot. 4 letters make a play; finishing one earns the
// level's star and counts towards the next level (td.detective).
// Show me: Jugnu points at the right tile (levels 1 and 2), or the right dots
// glow for a moment (level 3). Never her move; logged as help.
// Child-screen rules: no text, no failure sound, nothing red as feedback,
// every tile at least 88 px, Jugnu the only character.

import {
  DETECTIVE, DETECTIVE_LAYOUT as L, detectiveLevel, detectivePlay, detectiveChoices, detectiveChar, patternOf, pictureOf,
  startPicking, pickTile, judgeDots, dotsStatus, inTapRoom, letterPlace, hitTile, detectiveLogEntry, bodyBox,
} from './detective.js';
import { showMeLogEntry } from './games.js';
import { mountBoard, svgEl, replay } from './match.js';
import { trackSinglePointer } from './input.js';
import { logAttempt, readLastPlay, saveLastPlay, addDetectivePlay } from './storage.js';
import { chime, letterChime } from './audio.js';
import { copyNote } from './notes.js';
import { undoLogEntry } from './undo.js';
import { LINES } from './render.js';

const NEXT_MS = 1700;     // the letter glows, then the next one
const DONE_MS = 1800;     // the last letter: the board glows, then back to the levels
const REASON_MS = 2600;   // level 3: the right dots glow and the line shows this long
const POINT_MS = 1600;    // show me: Jugnu points at the right tile this long
const INK = '#1D2B8F';    // the letter's body, and her dots (as her ink)
const GOLD = '#FFD43B';

// game: 'detective-1' to 'detective-3'. onDone(): the play is finished.
// onNote(text): the line at the top (level 3 shows why a try did not count, then its own line again).
// Returns { showMe, undo, canUndo, stop, pause, resume }.
export function playDetective(view, { game, onDone = () => {}, onNote = () => {}, noteLine = null, rand = Math.random }) {
  view.innerHTML = '';
  const board = mountBoard(view);
  board.el.classList.add('dd-board');
  const level = detectiveLevel(game);
  const plan = detectivePlay(level, readLastPlay(game), rand);
  saveLastPlay(game, plan);
  const progress = plan.map((_, i) => svgEl('circle', {
    class: 'od-dot', cx: 640 + (i - (plan.length - 1) / 2) * L.dots.gap, cy: L.dots.y, r: 12,
  }, board.svg));
  // Jugnu rests on the board, beside the clue (the button column is full on this game).
  const jugnu = document.createElement('img');
  jugnu.className = 'dd-jugnu';
  jugnu.src = 'assets/jugnu.svg';
  jugnu.alt = '';
  Object.assign(jugnu.style, { left: `${L.jugnu.x - L.jugnu.size / 2}px`, top: `${L.jugnu.y - L.jugnu.size / 2}px`, width: `${L.jugnu.size}px` });
  board.el.appendChild(jugnu);

  const opened = performance.now();
  let alive = true;
  let paused = false;
  let busy = true;
  let roundNo = 0;
  let id = null;
  let place = null;
  let round = null;      // levels 1 and 2: { tiles, right }
  let picking = null;
  let layer = null;      // this letter's drawing
  let tileEls = [];
  let strokes = [];      // level 3: her dots and marks, in letter units
  let inkEls = [];
  let fails = 0;
  let judgeTimer = null;
  let current = null;    // level 3: her stroke in progress { points, el }
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
    timers.add(t);
    return t;
  };
  const cancel = (t) => { if (t) { clearTimeout(t); timers.delete(t); } };

  // A letter's lines, dots and marks in an SVG group: `toBoard` places letter units.
  function drawLetter(parent, char, toBoard, k, { body = true, dots = [], marks = [], color = INK, width = 0.075, cls = '' } = {}) {
    const g = svgEl('g', { class: cls }, parent);
    const pts = (list) => list.map(toBoard).map((p) => p.join(',')).join(' ');
    if (body) {
      for (const s of char.strokes.filter((st) => st.kind === 'line')) {
        svgEl('polyline', { points: pts(s.points), fill: 'none', stroke: color, 'stroke-width': width * k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      }
    }
    for (const d of dots) {
      const [cx, cy] = toBoard(d.at);
      svgEl('circle', { cx, cy, r: 0.06 * k, fill: color, class: 'dd-dot' }, g);
    }
    for (const m of marks) svgEl('polyline', { points: pts(m.points), fill: 'none', stroke: color, 'stroke-width': 0.6 * width * k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'dd-dot' }, g);
    return g;
  }

  // The four guide lines across the letter box (faint), as on the writing screens.
  function drawLines(parent) {
    const { x, w } = L.letter;
    for (const line of LINES) {
      const [, y] = place.toBoard([0, line.y]);
      const el = svgEl('line', { x1: x, x2: x + w, y1: y, y2: y, stroke: line.color, 'stroke-width': line.width * place.unit, opacity: 0.55, 'stroke-linecap': 'round' }, parent);
      if (line.dash) el.setAttribute('stroke-dasharray', line.dash.map((d) => d * place.unit).join(' '));
    }
  }

  // The clue: the whole letter on a card (level 1) or its find picture (levels 2 and 3).
  function drawClue(parent) {
    const { x, y, w, h } = L.clue;
    svgEl('rect', { x, y, width: w, height: h, rx: 22, class: 'dd-card' }, parent);
    const char = detectiveChar(id);
    if (level === 1) {
      const k = Math.min((w - 40) / char.width, (h - 40) / 1.5);
      const ox = x + (w - char.width * k) / 2;
      const oy = y + (h - 1.5 * k) / 2;
      const toCard = ([lx, ly]) => [ox + lx * k, oy + ly * k];
      for (const line of LINES) svgEl('line', { x1: x + 14, x2: x + w - 14, y1: oy + line.y * k, y2: oy + line.y * k, stroke: line.color, 'stroke-width': 2, opacity: 0.6 }, parent);
      const p = patternOf(id);
      drawLetter(parent, char, toCard, k, { dots: p.dots, marks: p.marks });
      return;
    }
    const pic = document.createElement('div');
    pic.className = 'dd-picture';
    Object.assign(pic.style, { left: `${x + 25}px`, top: `${y + 20}px`, width: `${w - 50}px`, height: `${h - 40}px` });
    pic.innerHTML = pictureOf(id).art;
    layer.appendChild(pic);
  }

  // A dot tile: a faint copy of the body with one dot pattern, on its own little card.
  function drawTile(i, pattern) {
    const t = L.tiles[i];
    const el = document.createElement('div');
    el.className = 'dd-tile';
    el.setAttribute('role', 'button');
    Object.assign(el.style, { left: `${t.x}px`, top: `${t.y}px`, width: `${t.w}px`, height: `${t.h}px` });
    el.style.animationDelay = `${i * 0.12}s`;
    const char = detectiveChar(id);
    const b = bodyBox(id);
    const ys = [b.y0, b.y1, ...pattern.dots.map((d) => d.at[1]), ...pattern.marks.flatMap((m) => m.points.map((q) => q[1]))];
    const xs = [b.x0, b.x1, ...pattern.dots.map((d) => d.at[0]), ...pattern.marks.flatMap((m) => m.points.map((q) => q[0]))];
    const box = { x0: Math.min(...xs) - 0.1, x1: Math.max(...xs) + 0.1, y0: Math.min(...ys) - 0.1, y1: Math.max(...ys) + 0.1 };
    const k = Math.min(t.w / (box.x1 - box.x0), t.h / (box.y1 - box.y0)) * 0.86;
    const ox = (t.w - (box.x1 - box.x0) * k) / 2 - box.x0 * k;
    const oy = (t.h - (box.y1 - box.y0) * k) / 2 - box.y0 * k;
    const svg = svgEl('svg', { viewBox: `0 0 ${t.w} ${t.h}`, width: t.w, height: t.h });
    const toTile = ([lx, ly]) => [ox + lx * k, oy + ly * k];
    svgEl('line', { x1: 10, x2: t.w - 10, y1: oy + k, y2: oy + k, stroke: '#4cc25a', 'stroke-width': 2, opacity: 0.6 }, svg);
    drawLetter(svg, char, toTile, k, { color: '#B8C4DC' });
    drawLetter(svg, char, toTile, k, { body: false, dots: pattern.dots, marks: pattern.marks, width: 0.11 });
    el.appendChild(svg);
    board.el.appendChild(el);
    return el;
  }

  function nextLetter() {
    roundNo += 1;
    id = plan[roundNo - 1];
    place = letterPlace(id);
    layer?.remove();
    for (const el of tileEls) el.remove();
    tileEls = [];
    for (const el of inkEls) el.remove();
    inkEls = [];
    strokes = [];
    fails = 0;
    layer = document.createElement('div');
    layer.className = 'dd-layer';
    board.el.appendChild(layer);
    const svg = svgEl('svg', { viewBox: '0 0 1280 640', class: 'dd-svg' });
    layer.appendChild(svg);
    drawClue(svg);
    drawLines(svg);
    drawLetter(svg, detectiveChar(id), place.toBoard, place.unit, { cls: 'dd-body' });
    if (level < 3) {
      round = detectiveChoices(id, rand);
      picking = startPicking();
      tileEls = round.tiles.map((p, i) => drawTile(i, p));
    }
    busy = false;
  }

  // The right dots on the big body (cls: 'dd-arrive' for a right answer, 'dd-show' to show them, 'dd-target' to stay as targets).
  function rightDots(cls) {
    const p = patternOf(id);
    return drawLetter(layer.querySelector('.dd-svg'), detectiveChar(id), place.toBoard, place.unit, { body: false, dots: p.dots, marks: p.marks, color: cls === 'dd-arrive' ? INK : GOLD, cls });
  }

  // The letter is whole: it glows, a chime, its progress dot fills; then the next letter or the end.
  function letterDone() {
    busy = true;
    cancel(judgeTimer);
    rightDots('dd-arrive');
    layer.classList.add('dd-whole');
    progress[roundNo - 1].classList.add('on');
    chime();
    if (roundNo >= plan.length) {
      later(() => { board.el.classList.add('gm-glow'); letterChime(); }, 400);
      later(() => { addDetectivePlay(level); onDone(); }, DONE_MS);
    } else {
      later(nextLetter, NEXT_MS);
    }
  }

  // Levels 1 and 2: a tile tapped.
  function tapTile(i) {
    if (tileEls[i].classList.contains('dd-gone')) return;
    const r = pickTile(picking, round, i);
    picking = r.state;
    logAttempt(detectiveLogEntry({ game, set: roundNo, letter: id, gave: round.tiles[i].key, right: round.tiles[round.right].key, ok: r.ok, ms: performance.now() - opened }));
    if (r.ok) {
      tileEls[i].classList.add('dd-right');
      return letterDone();
    }
    replay(tileEls[i], 'wig');
    later(() => tileEls[i].classList.add('dd-gone'), 500);
    if (r.hint !== null) later(() => tileEls[r.hint].classList.add('dd-look'), 650);
  }

  // Level 3: her dot or mark, drawn as she makes it (in board units).
  function inkFor(points) {
    const board3 = points.map((q) => place.toBoard(q));
    const svg = layer.querySelector('.dd-svg');
    if (board3.length === 1) return svgEl('circle', { cx: board3[0][0], cy: board3[0][1], r: 0.06 * place.unit, fill: INK, class: 'dd-ink' }, svg);
    return svgEl('polyline', { points: board3.map((q) => q.join(',')).join(' '), fill: 'none', stroke: INK, 'stroke-width': 0.05 * place.unit, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'dd-ink' }, svg);
  }

  // Level 3: judge her dots now.
  async function judge() {
    judgeTimer = null;
    if (busy || !strokes.length) return;
    const r = judgeDots(strokes, id);
    logAttempt(detectiveLogEntry({ game, set: roundNo, letter: id, gave: `${r.count}`, right: patternOf(id).key, ok: r.ok, ms: performance.now() - opened }));
    if (r.ok) return letterDone();
    busy = true;
    fails += 1;
    // Her dots go faint, the right ones glow and the line says why; then hers fade for a fresh try.
    for (const el of inkEls) el.classList.add('dd-faint');
    const shown = rightDots('dd-show');
    onNote(copyNote({ ok: false, reason: r.reason, need: r.need, side: r.side, missing: r.part ? { part: r.part } : null }));
    later(() => {
      shown.remove();
      for (const el of inkEls) el.remove();
      inkEls = [];
      strokes = [];
      onNote(noteLine);
      if (fails >= DETECTIVE.hintAfter && !layer.querySelector('.dd-target')) rightDots('dd-target');
      busy = false;
    }, REASON_MS);
  }

  function endStroke3() {
    const s = current;
    current = null;
    if (!s) return;
    strokes.push(s.points);
    inkEls.push(s.el);
    cancel(judgeTimer);
    const status = dotsStatus(strokes, id);
    if (status === 'judge-now') judge();
    else if (status === 'judge-soon') judgeTimer = later(judge, DETECTIVE.waitMs);
  }

  // Show me: never her move.
  function showMe() {
    if (busy || paused) return false;
    busy = true;
    logAttempt(showMeLogEntry({ game, set: roundNo, ms: performance.now() - opened }));
    if (level < 3) {
      const t = L.tiles[round.right];
      jugnu.classList.add('dd-point');
      Object.assign(jugnu.style, { left: `${t.x - L.jugnu.size * 0.55}px`, top: `${t.y + t.h / 2 - L.jugnu.size / 2}px` });
      tileEls[round.right].classList.add('dd-look');
      later(() => {
        tileEls[round.right]?.classList.remove('dd-look');
        jugnu.classList.remove('dd-point');
        Object.assign(jugnu.style, { left: `${L.jugnu.x - L.jugnu.size / 2}px`, top: `${L.jugnu.y - L.jugnu.size / 2}px` });
        busy = false;
      }, POINT_MS);
      return true;
    }
    const shown = rightDots('dd-show');
    later(() => { shown.remove(); busy = false; }, POINT_MS);
    return true;
  }

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (p) => {
      if (paused || busy) return;
      const at = board.toUnits(p);
      if (level < 3) {
        const i = hitTile(at);
        if (i !== null) tapTile(i);
        return;
      }
      const q = place.toLetter(at);
      if (!inTapRoom(q, id)) return;
      cancel(judgeTimer); // a new tap: the wait starts again from her next lift
      current = { points: [q], el: inkFor([q]) };
    },
    onMove: (points) => {
      if (!current) return;
      for (const p of points) current.points.push(place.toLetter(board.toUnits(p)));
      current.el.remove();
      current.el = inkFor(current.points);
    },
    onEnd: () => endStroke3(),
  });

  nextLetter();

  return {
    showMe,
    // Level 3 only: take back her last dot (nothing is judged until her next one).
    canUndo: () => level === 3 && !busy && !paused && !current && strokes.length > 0,
    undo() {
      if (!(level === 3 && !busy && !paused && !current && strokes.length > 0)) return false;
      cancel(judgeTimer);
      judgeTimer = null;
      strokes.pop();
      inkEls.pop()?.remove();
      logAttempt(undoLogEntry({ char: id, mode: 'detective', stroke: strokes.length, extra: { game, set: roundNo } }));
      return true;
    },
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
