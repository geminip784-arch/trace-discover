// paper.js — free drawing (Slice 5E), and the two pieces it shares with the
// dot-to-dot pictures (dots.js): an ink layer and the crayon row.
// Everything she draws is kept in board units (the 1280 x 640 board of
// src/games.js), so a resize or a rotation only rescales the board. No scoring
// and no logging here. Child-screen rules: no text, every crayon at least 88 px,
// Jugnu the only character.

import { CRAYONS, crayonSVG, CLEAR } from '../data/drawings.js';
import { rainbowColor } from './drawing.js';
import { mountBoard, svgEl, JUGNU_IMG } from './match.js';
import { trackSinglePointer } from './input.js';
import { popSound } from './audio.js';

const FADE_MS = 450;
export const CRAYON_ROW = { x: 140, y: 514, w: 104, h: 116, gap: 10 }; // units; 8 crayons, then one button
const RAINBOW_CHUNK = 18; // a rainbow line changes color every this many units

// An ink layer in an SVG group. A stroke is { color, width, pts } (pts in
// units; color null for the rainbow). Drawing happens in requestAnimationFrame.
export function createInk(parent, { width = 20 } = {}) {
  const g = svgEl('g', { class: 'dw-ink' }, parent);
  let cur = null; // { stroke, el, len }
  let pending = false;

  function draw() {
    pending = false;
    if (!cur) return;
    const { stroke } = cur;
    const pts = stroke.pts.length === 1 ? [stroke.pts[0], stroke.pts[0]] : stroke.pts;
    if (stroke.color) {
      cur.el.setAttribute('d', `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}`);
      return;
    }
    // Rainbow: a short piece every RAINBOW_CHUNK units, each a little further
    // round the colors. Pieces share their end points, so the line is unbroken.
    cur.el.replaceChildren();
    let len = 0;
    let pieceStart = 0;
    let piece = [pts[0]];
    const flush = () => {
      if (piece.length < 2) return;
      svgEl('path', {
        d: `M${piece.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}`,
        stroke: rainbowColor(pieceStart), 'stroke-width': stroke.width,
      }, cur.el);
    };
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      piece.push(pts[i]);
      if (len - pieceStart >= RAINBOW_CHUNK) {
        flush();
        piece = [pts[i]];
        pieceStart = len;
      }
    }
    flush();
  }
  const request = () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(draw);
    }
  };

  return {
    // color: a crayon color, or null for the rainbow.
    begin(pt, color, w = width) {
      const stroke = { color, width: w, pts: [pt] };
      const el = color
        ? svgEl('path', { class: 'dw-line', stroke: color, 'stroke-width': w }, g)
        : svgEl('g', { class: 'dw-line dw-rainbow' }, g);
      cur = { stroke, el };
      request();
    },
    add(pts) {
      if (!cur) return;
      cur.stroke.pts.push(...pts);
      request();
    },
    // The stroke so far stays; a new one goes on from its last point.
    cut() {
      if (!cur) return;
      const { color, width: w, pts } = cur.stroke;
      draw();
      this.begin(pts[pts.length - 1], color, w);
    },
    // Lift: the stroke stays, or (fade) fades away quietly.
    end({ fade = false } = {}) {
      if (!cur) return;
      draw();
      const el = cur.el;
      cur = null;
      if (fade) {
        el.classList.add('dw-fading');
        setTimeout(() => el.remove(), FADE_MS);
      }
    },
    // The stroke she was drawing is dropped at once (the tablet turned upright).
    drop() {
      if (!cur) return;
      cur.el.remove();
      cur = null;
    },
    drawing: () => cur !== null,
    // The whole layer fades, then it is empty.
    clearFade() {
      this.drop();
      const old = [...g.childNodes];
      for (const el of old) el.classList.add('dw-fading');
      setTimeout(() => { for (const el of old) el.remove(); }, FADE_MS);
    },
    el: g,
  };
}

// The crayon row along the bottom of the board, then one more button (clear,
// or the tick). A crayon acts on finger-down and keeps the touch to itself, so
// the board never starts a line under it. Returns { el, color(), remove() }.
export function createCrayonRow(board, { button, onButton }) {
  const row = document.createElement('div');
  row.className = 'dw-crayons';
  let picked = CRAYONS[4]; // blue to start
  const all = [];
  const { x, y, w, h, gap } = CRAYON_ROW;
  CRAYONS.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = `dw-crayon${c === picked ? ' on' : ''}`;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', c.id);
    Object.assign(el.style, { left: `${x + i * (w + gap)}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    el.innerHTML = crayonSVG(c);
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      picked = c;
      for (const o of all) o.classList.toggle('on', o === el);
      popSound();
    });
    all.push(el);
    row.appendChild(el);
  });
  const btn = document.createElement('div');
  btn.className = 'dw-button';
  btn.setAttribute('role', 'button');
  Object.assign(btn.style, { left: `${x + CRAYONS.length * (w + gap) + 14}px`, top: `${y + 2}px`, width: `${h - 4}px`, height: `${h - 4}px` });
  btn.innerHTML = button;
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    onButton();
  });
  row.appendChild(btn);
  board.el.appendChild(row);
  return { el: row, color: () => picked.color, remove: () => row.remove() };
}

// A board point is on the crayon row (no drawing starts there).
export const onCrayonRow = ([, py]) => py >= CRAYON_ROW.y - 6;

// The free-drawing page: a big white paper, the crayon row and the clear button.
// Returns { stop, pause, resume }.
export function playPaper(view) {
  view.innerHTML = JUGNU_IMG;
  const board = mountBoard(view);
  board.el.classList.add('dw-board');
  const PAPER = { x: 24, y: 18, w: 1232, h: 484 };
  svgEl('rect', { class: 'dw-paper', x: PAPER.x, y: PAPER.y, width: PAPER.w, height: PAPER.h, rx: 26 }, board.svg);
  const clip = svgEl('clipPath', { id: 'dw-paper-clip' }, svgEl('defs', {}, board.svg));
  svgEl('rect', { x: PAPER.x, y: PAPER.y, width: PAPER.w, height: PAPER.h, rx: 26 }, clip);
  const inkG = svgEl('g', { 'clip-path': 'url(#dw-paper-clip)' }, board.svg);
  const ink = createInk(inkG, { width: 22 });
  let paused = false;
  const crayons = createCrayonRow(board, {
    button: CLEAR,
    onButton: () => { if (!paused) { popSound(); ink.clearFade(); } },
  });

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (p) => {
      if (paused) return;
      const u = board.toUnits(p);
      if (onCrayonRow(u)) return;
      ink.begin(u, crayons.color());
    },
    onMove: (points) => ink.add(points.map(board.toUnits)),
    onEnd: () => ink.end(),
  });
  board.onResize = () => ink.drop();

  return {
    pause() { paused = true; ink.drop(); },
    resume() { paused = false; },
    stop() { stopTracking(); board.stop(); },
  };
}
