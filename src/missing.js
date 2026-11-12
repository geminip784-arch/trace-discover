// missing.js — Missing piece, on screen (Slice 5H). games.js makes the rounds
// (each checked fair: exactly one piece fits each gap) and decides whether a
// drop is right; this file draws a round and plays it.
// Three shapes along the top, each with a gap (a dashed hole); the pieces wait
// in a row below. She drags a piece to a gap: the right one snaps in, and once
// a shape is whole it glows, with a chime. A wrong piece bounces gently back,
// with no sound; letting go away from every gap, it floats back (not a try).
// A plain tap on a piece makes it wiggle (not a try, not logged). After 3
// wrong tries in a row, the right piece for the gap she last tried wiggles.
// In the first round, Jugnu carries the first piece in himself. Three rounds
// make a play; every finished round counts toward opening the next level.
// Everything is drawn in one SVG in board units (1280 x 640), so a resize only
// rescales the board. Every release goes into the attempt log as a "game"
// entry; Jugnu's move does not.
// Child-screen rules: no text, no failure sound, nothing red as feedback,
// every piece's touch area at least 88 px, Jugnu the only character.
// Slice 5J part 2: showMe() (the "show me" button) has Jugnu carry the right
// piece to an empty gap, then it slides back: nothing is filled, and the log
// gets a help entry, never one of her moves.

import {
  MISSING, missingPlay, roundKey, missingLevel, partPoly, bbox, SHAPE_POLYS, shapeBoxes, partCentre, pieceHome,
  trayOf, pieceTrayScale, hitGap, hitPiece, startMissing, dropPiece, firstMovePiece, pieceLabel, marginUnits, gameLogEntry,
  showsFirstMove, FIRST_MOVE_DELAY_MS, isPlainTap, showMeMissing, showMeLogEntry,
} from './games.js';
import { COLORS, MISSING_PICTURES, missingPictureArt } from '../data/games.js';
import { MISSING_CUTS } from '../data/missing-cuts.js';
import { mountBoard, svgEl, replay, JUGNU_IMG } from './match.js';
import { trackSinglePointer } from './input.js';
import { logAttempt, readLastPlay, saveLastPlay, addMissingRound } from './storage.js';
import { chime, letterChime } from './audio.js';

const SNAP_MS = 300;       // a right piece settles into its gap
const BOUNCE_MS = 650;     // a wrong gap: the piece bounces back to its place
const FLOAT_MS = 380;      // let go away from every gap: it floats back
const CARRY_MS = 1600;     // Jugnu carries the first piece
const HINT_DELAY_MS = 400;
const SLIDE_BACK_MS = 700; // show me: the piece slides back to the shelf
const ROUND_GLOW_MS = 1600; // every gap filled: everything glows, then the next round
const JUGNU_SIZE = 110;
const S = MISSING.size;
const GAP_FILL = '#FFF8E7'; // the board's own color: a gap looks like a hole

const easeInOut = (f) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);
const easeOutBack = (f) => 1 + 2.2 * (f - 1) ** 3 + 1.2 * (f - 1) ** 2;
const pts = (poly, dx = 0, dy = 0) => poly.map(([x, y]) => `${(x * S + dx).toFixed(1)},${(y * S + dy).toFixed(1)}`).join(' ');

// A light tint of a color (for level 4's cards): mixed with white.
function tint(hex, white = 0.78) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `#${c.map((v) => Math.round(v + (255 - v) * white).toString(16).padStart(2, '0')).join('')}`;
}
// A paint's colors: a color name (levels 1 to 3) or a picture (level 4).
const colorsOf = (paint) => COLORS[MISSING_PICTURES[paint] ?? paint];
const inner = (art) => art.replace(/^<svg[^>]*>|<\/svg>$/g, '');

// game: 'missing-1' to 'missing-4'. onDone(): three rounds are done.
// Returns { stop, pause, resume }.
export function playMissing(view, { game, onDone = () => {}, rand = Math.random }) {
  view.innerHTML = JUGNU_IMG;
  const buddy = view.querySelector('.buddy');
  const board = mountBoard(view);
  board.el.classList.add('mp-board');
  const level = missingLevel(game);

  // The whole play, drawn now so it can be saved: the next play avoids it.
  const plan = missingPlay(level, readLastPlay(game), { rand, colors: Object.keys(COLORS), pictures: MISSING_PICTURES, cuts: MISSING_CUTS });
  saveLastPlay(game, plan.map(roundKey));

  const opened = performance.now();
  let alive = true;
  let paused = false;
  let roundNo = 0;
  let round = null;
  let state = null;
  let layer = null;       // this round's SVG group
  let shapeEls = [];      // each shape's glowing body
  let drag = null;        // { piece, offset, down, moved }
  let busy = true;        // a round is glowing, or Jugnu is carrying: no new drags
  const moving = new Set(); // slots of pieces gliding somewhere: not draggable
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
    timers.add(t);
  };
  const log = (piece, to, ok) => logAttempt(gameLogEntry({
    game, set: roundNo, from: pieceLabel(piece), to: to === null ? null : pieceLabel(round.gaps[to]), ok, ms: performance.now() - opened,
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

  // ---- drawing ----

  // A shape (or level 4's picture card) in its box, its gaps as dashed holes.
  function drawShape(sh, i) {
    const { x0, y0 } = shapeBoxes(round)[i];
    const g = svgEl('g', { transform: `translate(${x0} ${y0})`, class: 'mp-shape' }, layer);
    const body = svgEl('g', { class: 'mp-body' }, g);
    const c = colorsOf(sh.paint);
    if (sh.shape === 'card') {
      svgEl('rect', { x: 0, y: 0, width: S, height: S, rx: 18, fill: tint(c.paint), stroke: c.edge, 'stroke-width': 4 }, body);
      body.insertAdjacentHTML('beforeend', pictureSVG(sh.paint));
    } else {
      svgEl('polygon', { points: pts(SHAPE_POLYS[sh.shape]), fill: c.paint, stroke: c.edge, 'stroke-width': 4, 'stroke-linejoin': 'round' }, body);
    }
    for (const part of sh.parts) {
      const gap = round.gaps.findIndex((g) => g.shapeIdx === i && g.part === part);
      svgEl('polygon', { points: pts(partPoly(sh.shape, part)), class: 'mp-gap', fill: GAP_FILL, 'data-gap': gap }, body);
    }
    return body;
  }

  // Level 4's picture inside its card, cropped to fill it (data/missing-cuts.js);
  // the same place in the card and in its pieces.
  const pictureSVG = (id) => `<svg x="${S * 0.06}" y="${S * 0.06}" width="${S * 0.88}" height="${S * 0.88}" viewBox="${MISSING_CUTS[id].view}">${inner(missingPictureArt(id))}</svg>`;

  // A piece: its part of the shape, drawn about the centre of its own box.
  // outer: placed with a transform (where and how big); wig: what wiggles.
  function drawPiece(p) {
    const b = bbox(partPoly(p.shape, p.part));
    const [cx, cy] = [((b.x0 + b.x1) / 2) * S, ((b.y0 + b.y1) / 2) * S];
    const outer = svgEl('g', { class: 'mp-piece', 'data-piece': pieceLabel(p), 'data-right': p.right }, layer);
    const wig = svgEl('g', { class: 'mp-wig' }, outer);
    const c = colorsOf(p.paint);
    const poly = pts(partPoly(p.shape, p.part), -cx, -cy);
    if (p.shape === 'card') {
      const id = `mp-clip-${roundNo}-${p.slot}`;
      const clip = svgEl('clipPath', { id }, wig);
      svgEl('polygon', { points: poly }, clip);
      const pic = svgEl('g', { 'clip-path': `url(#${id})` }, wig);
      const shift = svgEl('g', { transform: `translate(${-cx} ${-cy})` }, pic);
      svgEl('rect', { x: 0, y: 0, width: S, height: S, rx: 18, fill: tint(c.paint) }, shift);
      shift.insertAdjacentHTML('beforeend', pictureSVG(p.paint));
      svgEl('polygon', { points: poly, fill: 'none', stroke: c.edge, 'stroke-width': 4, 'stroke-linejoin': 'round' }, wig);
    } else {
      svgEl('polygon', { points: poly, fill: c.paint, stroke: c.edge, 'stroke-width': 4, 'stroke-linejoin': 'round' }, wig);
    }
    p.el = outer;
    p.wig = wig;
    p.at = { x: 0, y: 0, k: 1 };
    return p;
  }

  const trayScale = (p) => pieceTrayScale(round, p);
  function place(p, x, y, k) {
    p.at = { x, y, k };
    p.el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)})`);
  }
  const toFront = (p) => layer.appendChild(p.el);

  function newRound() {
    roundNo += 1;
    round = plan[roundNo - 1];
    state = startMissing();
    moving.clear();
    layer?.remove();
    board.el.classList.remove('gm-glow');
    layer = svgEl('g', { class: 'mp-layer' }, board.svg);
    // The tray: a soft shelf behind the pieces.
    const t = trayOf(round);
    const top = t.ys[0] - t.box[1] / 2 - 14;
    const bottom = t.ys[t.ys.length - 1] + t.box[1] / 2 + 14;
    svgEl('rect', { x: 150, y: top, width: 980, height: bottom - top, rx: 30, class: 'mp-tray' }, layer);
    shapeEls = round.shapes.map(drawShape);
    for (const p of round.pieces) {
      drawPiece(p);
      const [x, y] = pieceHome(round, p);
      place(p, x, y, trayScale(p));
    }
    busy = false;
    if (showsFirstMove(roundNo)) {
      busy = true;
      later(firstMove, FIRST_MOVE_DELAY_MS);
    }
  }

  // Glide a piece to (x, y) at size k, with an easing.
  async function glide(p, [x, y], k, ms, ease) {
    const from = { ...p.at };
    moving.add(p.slot);
    const ok = await tween(ms, (f) => {
      const e = ease(f);
      place(p, from.x + (x - from.x) * e, from.y + (y - from.y) * e, from.k + (k - from.k) * Math.min(1, e));
    });
    moving.delete(p.slot);
    return ok;
  }

  // The right gap: the piece settles in. A shape with no gap left glows, with a chime.
  async function snapIn(p, gapIdx, r) {
    p.el.classList.remove('mp-lift');
    p.el.classList.add('mp-in');
    await glide(p, partCentre(round, gapIdx), 1, SNAP_MS, easeInOut);
    if (!alive) return;
    const shapeIdx = round.gaps[gapIdx].shapeIdx;
    const whole = round.gaps.every((g, i) => g.shapeIdx !== shapeIdx || r.state.filled.includes(i));
    chime();
    if (whole) replay(shapeEls[shapeIdx], 'mp-whole');
    if (!r.done) return;
    busy = true;
    addMissingRound(level);
    later(() => { board.el.classList.add('gm-glow'); letterChime(); }, 300);
    later(() => (roundNo >= MISSING.roundsPerPlay ? onDone() : newRound()), ROUND_GLOW_MS);
  }

  // Jugnu carries piece `p` from its shelf to gap `gapIdx`. Resolves his
  // picture (still showing) when he arrives, or null if the game stopped.
  async function carry(p, gapIdx) {
    const j = document.createElement('img');
    j.className = 'gm-jugnu';
    j.src = 'assets/jugnu.svg';
    j.alt = '';
    board.el.appendChild(j);
    buddy.classList.add('away');
    const from = [p.at.x, p.at.y];
    const fromK = p.at.k;
    const to = partCentre(round, gapIdx);
    const placeJ = ([x, y]) => Object.assign(j.style, { left: `${x - JUGNU_SIZE / 2}px`, top: `${y - 60 - JUGNU_SIZE * 0.7}px`, width: `${JUGNU_SIZE}px` });
    placeJ(from);
    toFront(p);
    p.el.classList.add('mp-lift');
    moving.add(p.slot);
    const ok = await tween(CARRY_MS, (f) => {
      const e = easeInOut(f);
      const at = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e - Math.sin(Math.PI * e) * 60];
      place(p, at[0], at[1], fromK + (1 - fromK) * e);
      placeJ(at);
    });
    moving.delete(p.slot);
    return ok ? j : null;
  }
  const flyAway = (j, then = () => {}) => {
    j.classList.add('gm-fading');
    later(() => { j.remove(); buddy.classList.remove('away'); then(); }, 450);
  };

  // Jugnu flies to the first gap's piece and carries it in (not logged).
  async function firstMove() {
    const p = firstMovePiece(round);
    const j = await carry(p, 0);
    if (!j) return;
    const r = dropPiece(state, round, p, 0);
    state = r.state;
    await snapIn(p, 0, r);
    if (!alive) return;
    flyAway(j, () => { busy = false; });
  }

  // Show me (Slice 5J part 2): Jugnu carries the right piece to the first empty
  // gap, then it slides back to the shelf. Nothing is filled; state is
  // untouched, and the log gets a help entry.
  async function showMe() {
    if (busy || paused || drag) return false;
    const p = showMeMissing(round, state);
    if (!p) return false;
    const gapIdx = p.right;
    busy = true;
    logAttempt(showMeLogEntry({ game, set: roundNo, ms: performance.now() - opened }));
    const j = await carry(p, gapIdx);
    if (!j) return false;
    p.el.classList.remove('mp-lift');
    flyAway(j);
    const [x, y] = pieceHome(round, p);
    await glide(p, [x, y], trayScale(p), SLIDE_BACK_MS, easeInOut);
    if (!alive) return false;
    busy = false;
    return true;
  }

  function release() {
    const d = drag;
    if (!d) return;
    drag = null;
    const p = d.piece;
    if (isPlainTap(d.moved, board.s)) {
      // A tap, not a drag: the piece wiggles in its place. Not a try, not logged.
      p.el.classList.remove('mp-lift');
      const [x, y] = pieceHome(round, p);
      place(p, x, y, trayScale(p));
      replay(p.wig, 'wig');
      return;
    }
    const to = hitGap([p.at.x, p.at.y], round, state.filled, marginUnits(board.s));
    const r = dropPiece(state, round, p, to);
    state = r.state;
    log(p, to, r.ok);
    if (r.ok) return snapIn(p, to, r);
    p.el.classList.remove('mp-lift');
    if (!r.counted) return glide(p, pieceHome(round, p), trayScale(p), FLOAT_MS, easeInOut);
    // A wrong gap: bounce gently back to its place, no sound.
    glide(p, pieceHome(round, p), trayScale(p), BOUNCE_MS, easeOutBack);
    if (r.hint !== null) {
      const right = round.pieces.find((q) => q.slot === r.hint);
      later(() => replay(right.wig, 'wig'), HINT_DELAY_MS + BOUNCE_MS);
    }
  }

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (pt) => {
      if (paused || busy || drag) return;
      const u = board.toUnits(pt);
      const p = hitPiece(u, round, [...state.placed, ...moving], marginUnits(board.s, 12));
      if (!p) return;
      drag = { piece: p, offset: [p.at.x - u[0], p.at.y - u[1]], down: u, moved: 0 };
      toFront(p);
      p.el.classList.add('mp-lift');
      place(p, p.at.x, p.at.y, 1);
    },
    onMove: (points) => {
      if (!drag) return;
      for (const pt of points) {
        const q = board.toUnits(pt);
        drag.moved = Math.max(drag.moved, Math.hypot(q[0] - drag.down[0], q[1] - drag.down[1]));
      }
      const u = board.toUnits(points[points.length - 1]);
      place(drag.piece, u[0] + drag.offset[0], u[1] + drag.offset[1], 1);
    },
    onEnd: () => release(),
  });

  // A piece she was dragging goes straight back, not logged (a resize, or the tablet upright).
  function dropDrag() {
    if (!drag) return;
    const p = drag.piece;
    drag = null;
    p.el.classList.remove('mp-lift');
    const [x, y] = pieceHome(round, p);
    place(p, x, y, trayScale(p));
  }
  board.onResize = dropDrag;

  newRound();

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
