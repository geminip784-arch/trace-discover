// paper.js — free drawing (Slice 5E), and the pieces it shares with the
// dot-to-dot pictures (dots.js): an SVG ink layer (her lines between dots), the
// canvas crayon ink with its eraser (src/strokes.js) and the crayon row.
// Everything she draws is kept in board units (the 1280 x 640 board of
// src/games.js), so a resize or a rotation only rescales the board. No scoring
// and no logging here. Child-screen rules: no text, every crayon at least 88 px,
// Jugnu the only character.

import { CRAYONS, crayonSVG, CLEAR, ERASER } from '../data/drawings.js';
import { rainbowColor } from './drawing.js';
import { mountBoard, svgEl, replay as replayAnim, JUGNU_IMG } from './match.js';
import { inkStroke, eraseStroke, canvasSize, drawStroke, setUnits, replay, RAINBOW_CHUNK } from './strokes.js';
import { createHold } from './hold.js';
import { trackSinglePointer } from './input.js';
import { popSound } from './audio.js';

const FADE_MS = 450;
export const CRAYON_ROW = { x: 110, y: 514, w: 104, h: 116, gap: 4 }; // units; 8 crayons, the eraser, then one button

// An ink layer in an SVG group (her lines between dots in dots.js). A stroke is { color, width, pts } (pts in
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
    el: g,
  };
}

// Her crayon ink and the eraser, on one canvas over the board (src/strokes.js).
// The canvas is 1280 x 640 CSS px inside the board, so it takes the board's
// scale; its pixels are sized for that scale and the screen's devicePixelRatio,
// and after every resize it is redrawn from the stroke list, in order.
// The stroke she is drawing goes on the canvas a few segments at a time, in
// requestAnimationFrame. clip: the paper's rounded edge in units, or null.
// Returns { begin, erase, add, end, drop, resize, clearFade, stop, strokes }.
export function createCanvasInk(board, { clip = null } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'dw-canvas';
  board.el.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let strokes = [];
  let cur = null;   // the stroke she is drawing (also the last in strokes)
  let drawn = 0;    // how many of its points are on the canvas
  let size = null;
  let pending = false;
  let clearing = null;

  function fit() {
    size = canvasSize(board.s, globalThis.devicePixelRatio || 1);
    canvas.width = size.width; // this also resets the context
    canvas.height = size.height;
    setUnits(ctx, size.k, clip);
    replay(ctx, strokes, size);
    if (cur) drawn = cur.pts.length;
  }
  function frame() {
    pending = false;
    if (!cur) return;
    drawStroke(ctx, cur, drawn);
    drawn = cur.pts.length;
  }
  const request = () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(frame);
    }
  };
  // The fade of a clear finishes now: the canvas is empty and shows again.
  function finishClear() {
    if (clearing === null) return;
    clearTimeout(clearing);
    clearing = null;
    strokes = [];
    replay(ctx, strokes, size);
    canvas.classList.remove('dw-fading');
  }
  function start(stroke) {
    finishClear();
    cur = stroke;
    drawn = 0;
    strokes.push(stroke);
    request();
  }
  function drop() {
    if (!cur) return;
    strokes = strokes.filter((s) => s !== cur);
    cur = null;
    replay(ctx, strokes, size);
  }

  fit();
  return {
    // color: a crayon color, or null for the rainbow.
    begin(pt, color, width) { start(inkStroke(pt, color, width)); },
    erase(pt) { start(eraseStroke(pt)); },
    add(pts) {
      if (!cur) return;
      cur.pts.push(...pts);
      request();
    },
    end() {
      if (!cur) return;
      frame();
      cur = null;
    },
    // The stroke she was drawing is dropped (a resize, or the page paused).
    drop,
    resize: fit,
    // Everything fades, then the canvas is empty.
    clearFade() {
      drop();
      if (clearing !== null || !strokes.length) return;
      canvas.classList.add('dw-fading');
      clearing = setTimeout(finishClear, FADE_MS);
    },
    stop() { if (clearing !== null) clearTimeout(clearing); },
    strokes: () => strokes,
  };
}

// The crayon row along the bottom of the board: 8 crayons, the pink eraser,
// then one more button (clear, or the tick). A crayon or the eraser acts on
// finger-down and keeps the touch to itself, so the board never starts a line
// under it. With hold: true the button acts only after a press-and-hold
// (src/hold.js): a ring fills round it; a short tap only wiggles it.
// Returns { el, color(), eraser(), cancelHold(), remove() }.
export function createCrayonRow(board, { button, onButton, hold = false }) {
  const row = document.createElement('div');
  row.className = 'dw-crayons';
  let picked = CRAYONS[4]; // blue to start; or 'eraser'
  const all = [];
  const { x, y, w, h, gap } = CRAYON_ROW;
  const slot = (i, label, art, value, extra = '') => {
    const el = document.createElement('div');
    el.className = `dw-crayon${extra}${value === picked ? ' on' : ''}`;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', label);
    Object.assign(el.style, { left: `${x + i * (w + gap)}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    el.innerHTML = art;
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      picked = value;
      for (const o of all) o.classList.toggle('on', o === el);
      popSound();
    });
    all.push(el);
    row.appendChild(el);
  };
  CRAYONS.forEach((c, i) => slot(i, c.id, crayonSVG(c), c));
  slot(CRAYONS.length, 'eraser', ERASER, 'eraser', ' dw-eraser');

  const btn = document.createElement('div');
  btn.className = 'dw-button';
  btn.setAttribute('role', 'button');
  Object.assign(btn.style, { left: `${x + (CRAYONS.length + 1) * (w + gap) + 10}px`, top: `${y + 2}px`, width: `${h - 4}px`, height: `${h - 4}px` });
  btn.innerHTML = button;
  row.appendChild(btn);

  let holder = null;
  if (!hold) {
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      onButton();
    });
  } else {
    btn.insertAdjacentHTML('beforeend', '<svg class="dw-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50" pathLength="100"/></svg>');
    const ring = btn.querySelector('.dw-ring circle');
    let holdId = null;
    holder = createHold({
      onProgress: (f) => {
        ring.style.strokeDashoffset = String(100 * (1 - f));
        btn.classList.toggle('holding', f > 0 && f < 1);
      },
      onDone: () => { holdId = null; onButton(); },
      onShort: () => replayAnim(btn, 'wig'),
    });
    const step = (now) => {
      if (!holder.holding()) return;
      holder.tick(now);
      requestAnimationFrame(step);
    };
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (holdId !== null) return;
      holdId = e.pointerId;
      try { btn.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      holder.press(performance.now());
      requestAnimationFrame(step);
    });
    const letGo = (e) => {
      if (e.pointerId !== holdId) return;
      holdId = null;
      holder.release(performance.now());
    };
    btn.addEventListener('pointerup', letGo);
    btn.addEventListener('lostpointercapture', letGo);
    btn.addEventListener('pointercancel', (e) => {
      if (e.pointerId !== holdId) return;
      holdId = null;
      holder.cancel();
    });
  }

  board.el.appendChild(row);
  return {
    el: row,
    color: () => (picked === 'eraser' ? null : picked.color),
    eraser: () => picked === 'eraser',
    cancelHold: () => holder?.cancel(),
    remove: () => row.remove(),
  };
}

// A board point is on the crayon row (no drawing starts there).
export const onCrayonRow = ([, py]) => py >= CRAYON_ROW.y - 6;

// The free-drawing page: a big white paper, the crayon row with the eraser,
// and the clear button (press and hold). Returns { stop, pause, resume }.
export function playPaper(view) {
  view.innerHTML = JUGNU_IMG;
  const board = mountBoard(view);
  board.el.classList.add('dw-board');
  const PAPER = { x: 24, y: 18, w: 1232, h: 484 };
  svgEl('rect', { class: 'dw-paper', x: PAPER.x, y: PAPER.y, width: PAPER.w, height: PAPER.h, rx: 26 }, board.svg);
  const ink = createCanvasInk(board, { clip: { ...PAPER, r: 26 } });
  let paused = false;
  const crayons = createCrayonRow(board, {
    button: CLEAR,
    hold: true,
    onButton: () => { if (!paused) { popSound(); ink.clearFade(); } },
  });

  const stopTracking = trackSinglePointer(board.el, {
    onStart: (p) => {
      if (paused) return;
      const u = board.toUnits(p);
      if (onCrayonRow(u)) return;
      if (crayons.eraser()) ink.erase(u);
      else ink.begin(u, crayons.color(), 22);
    },
    onMove: (points) => ink.add(points.map(board.toUnits)),
    onEnd: () => ink.end(),
  });
  // The stroke she was drawing is dropped; everything else is redrawn to fit.
  board.onResize = () => { ink.drop(); ink.resize(); };

  return {
    pause() { paused = true; crayons.cancelHold(); ink.drop(); },
    resume() { paused = false; },
    stop() { stopTracking(); ink.stop(); board.stop(); },
  };
}
