// strokes.js — her crayon ink and her eraser, as a list of strokes in board
// units (the 1280 x 640 board of src/games.js), drawn on one canvas.
// A stroke is { kind: 'ink' | 'erase', color, width, pts } (pts in units;
// color null for the rainbow; an eraser stroke has no color). Strokes are drawn
// in the order she made them. An eraser stroke cuts a round hole in the canvas
// ('destination-out'), so it only ever takes away her own ink: the paper, the
// dots, the outlines and the colored picture are on other layers underneath or
// on top and are never touched. After a resize or a rotation the canvas is
// redrawn from the list (replay), so what she erased stays erased.
// No DOM here: the drawing calls use only the canvas 2D context API, so tests
// can pass a stand-in.

import { rainbowColor } from './drawing.js';

export const ERASER_WIDTH = 40;   // units: the eraser's round tip
export const RAINBOW_CHUNK = 18;  // a rainbow line changes color every this many units

export const inkStroke = (pt, color, width) => ({ kind: 'ink', color, width, pts: [pt] });
export const eraseStroke = (pt, width = ERASER_WIDTH) => ({ kind: 'erase', color: null, width, pts: [pt] });

// The canvas backing store for a board drawn at s CSS px per unit, at the
// screen's devicePixelRatio: its size in pixels and the units-to-pixels factor.
export function canvasSize(s, dpr, board = { w: 1280, h: 640 }) {
  const k = s * dpr;
  return { width: Math.max(1, Math.round(board.w * k)), height: Math.max(1, Math.round(board.h * k)), k };
}

const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// Draw stroke's segments from point `from` on (0: the whole stroke). The
// canvas transform must already map units to pixels. A one-point stroke (a
// tap) shows as a round dot.
export function drawStroke(ctx, stroke, from = 0) {
  const { pts } = stroke;
  if (!pts.length || from >= pts.length) return;
  ctx.globalCompositeOperation = stroke.kind === 'erase' ? 'destination-out' : 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke.width;
  if (stroke.kind === 'erase' || stroke.color) {
    ctx.strokeStyle = stroke.kind === 'erase' ? '#000' : stroke.color;
    const start = Math.max(0, from - 1);
    ctx.beginPath();
    ctx.moveTo(pts[start][0], pts[start][1]);
    if (pts.length === 1) ctx.lineTo(pts[0][0], pts[0][1]);
    for (let i = start + 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  } else {
    // Rainbow: each segment takes the color for how far along the line it starts,
    // stepping every RAINBOW_CHUNK units.
    let len = 0;
    for (let i = 1; i < from; i++) len += dist(pts[i - 1], pts[i]);
    const seg = (a, b, at) => {
      ctx.strokeStyle = rainbowColor(Math.floor(at / RAINBOW_CHUNK) * RAINBOW_CHUNK);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    };
    if (pts.length === 1) seg(pts[0], pts[0], 0);
    for (let i = Math.max(1, from); i < pts.length; i++) {
      seg(pts[i - 1], pts[i], len);
      len += dist(pts[i - 1], pts[i]);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Units to canvas pixels (k from canvasSize), and the paper's rounded edge if
// the ink must stay on it: clip { x, y, w, h, r } in units.
export function setUnits(ctx, k, clip = null) {
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (clip) {
    ctx.beginPath();
    ctx.roundRect(clip.x, clip.y, clip.w, clip.h, clip.r);
    ctx.clip();
  }
}

// Clear the canvas and draw every stroke again, in order. size: from
// canvasSize. A clip set by setUnits stays in place (it is kept in pixels).
export function replay(ctx, strokes, { width, height, k }) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  for (const s of strokes) drawStroke(ctx, s);
}

// The distance from p to the segment a-b.
function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// The stroke covers point p (round caps and joins, as on the canvas).
export function covers(stroke, p) {
  const { pts } = stroke;
  const r = stroke.width / 2;
  if (pts.length === 1) return dist(p, pts[0]) <= r;
  for (let i = 1; i < pts.length; i++) if (segDist(p, pts[i - 1], pts[i]) <= r) return true;
  return false;
}

// What her ink shows at board point p after every stroke in order: a crayon
// color, 'rainbow', or null (nothing, or erased). The canvas does the same per
// pixel; this is the check the tests use.
export function paintAt(strokes, p) {
  let shown = null;
  for (const s of strokes) {
    if (!covers(s, p)) continue;
    shown = s.kind === 'erase' ? null : (s.color ?? 'rainbow');
  }
  return shown;
}
