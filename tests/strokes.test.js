// Run: node --test tests/strokes.test.js
// The eraser (src/strokes.js) and the hold-to-clear button (src/hold.js).
// Her crayon ink and her eraser strokes are kept in board units and drawn in
// order; an eraser stroke takes away only what it touches, and only her ink.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ERASER_WIDTH, inkStroke, eraseStroke, canvasSize, drawStroke, replay, paintAt,
} from '../src/strokes.js';
import { HOLD_MS, createHold } from '../src/hold.js';
import { boardFit } from '../src/games.js';

const BLUE = '#4D96FF';
const RED = '#FF4D4D';
const DPR = 1.5;

// A line of n points from a to b.
function line(a, b, n = 20) {
  return [...Array(n).keys()].map((i) => [a[0] + ((b[0] - a[0]) * i) / (n - 1), a[1] + ((b[1] - a[1]) * i) / (n - 1)]);
}
const ink = (pts, color = BLUE, width = 22) => ({ ...inkStroke(pts[0], color, width), pts });
const rub = (pts) => ({ ...eraseStroke(pts[0]), pts });

// A stand-in for the canvas 2D context: it records every stroke() with the
// settings and the path in canvas pixels.
function fakeCtx() {
  const calls = [];
  let t = [1, 0, 0, 1, 0, 0];
  let path = [];
  const px = (x, y) => [t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]];
  return {
    calls,
    globalCompositeOperation: 'source-over',
    setTransform(...m) { t = m; },
    clearRect(...r) { calls.push({ op: 'clear', r }); },
    beginPath() { path = []; },
    moveTo(x, y) { path.push(px(x, y)); },
    lineTo(x, y) { path.push(px(x, y)); },
    stroke() {
      calls.push({ op: 'stroke', mode: this.globalCompositeOperation, color: this.strokeStyle, width: this.lineWidth * t[0], path });
    },
  };
}

// ---- erasing affects only the touched area ----

test('the eraser takes away her ink only where it touched', () => {
  // A blue line across the paper, then one swipe of the eraser down through its middle.
  const strokes = [ink(line([100, 200], [700, 200])), rub(line([400, 120], [400, 280]))];
  assert.equal(paintAt(strokes, [400, 200]), null, 'erased where the eraser crossed');
  assert.equal(paintAt(strokes, [400 + ERASER_WIDTH / 2 - 2, 200]), null, 'erased across the eraser tip');
  assert.equal(paintAt(strokes, [400 + ERASER_WIDTH / 2 + 3, 200]), BLUE, 'just beyond the tip, still there');
  assert.equal(paintAt(strokes, [150, 200]), BLUE, 'the rest of the line is untouched');
  assert.equal(paintAt(strokes, [650, 200]), BLUE);
  assert.equal(paintAt(strokes, [400, 150]), null, 'nothing was there; nothing appears');
});

test('the eraser is about 40 units wide and round', () => {
  assert.equal(ERASER_WIDTH, 40);
  const dot = [eraseStroke([300, 300])];
  const strokes = [ink(line([200, 300], [400, 300]), RED), ...dot];
  assert.equal(paintAt(strokes, [300, 300]), null);
  assert.equal(paintAt(strokes, [318, 300]), null);
  assert.equal(paintAt(strokes, [323, 300]), RED, 'a tap rubs out a round spot, no more');
});

test('ink drawn after erasing shows again; ink erased stays erased', () => {
  const strokes = [
    ink(line([100, 200], [700, 200]), BLUE),
    rub(line([400, 120], [400, 280])),
    ink(line([400, 150], [400, 250]), RED, 10),
  ];
  assert.equal(paintAt(strokes, [400, 200]), RED, 'her new red line over the rubbed spot');
  assert.equal(paintAt(strokes, [410, 200]), null, 'beside it, still rubbed out');
  assert.equal(paintAt(strokes, [380, 200]), null);
});

test('rainbow ink is erased the same way', () => {
  const strokes = [ink(line([100, 100], [500, 100]), null), rub([[300, 100]])];
  assert.equal(paintAt(strokes, [200, 100]), 'rainbow');
  assert.equal(paintAt(strokes, [300, 100]), null);
});

test('on the canvas an eraser stroke cuts a hole (destination-out); ink paints over (source-over)', () => {
  // Only her ink is on this canvas, so a hole in it never reaches the paper,
  // the dots, the outlines or the colored picture (other layers).
  const ctx = fakeCtx();
  const strokes = [ink(line([100, 200], [700, 200])), rub(line([400, 120], [400, 280])), ink([[50, 50]], null)];
  replay(ctx, strokes, canvasSize(1, 1));
  const drawn = ctx.calls.filter((c) => c.op === 'stroke');
  assert.equal(drawn[0].mode, 'source-over');
  assert.equal(drawn[0].color, BLUE);
  assert.equal(drawn[1].mode, 'destination-out', 'the eraser');
  assert.equal(drawn[1].width, ERASER_WIDTH);
  assert.equal(drawn[2].mode, 'source-over', 'a rainbow tap after it');
  assert.equal(ctx.globalCompositeOperation, 'source-over', 'left as it was');
});

test('drawing her stroke a few points at a time adds only the new segments', () => {
  const s = ink(line([0, 0], [100, 0], 11), RED);
  const ctx = fakeCtx();
  drawStroke(ctx, s, 6);
  const [c] = ctx.calls;
  assert.equal(c.path.length, 6, 'from the last point already drawn to the end');
  assert.deepEqual(c.path[0], [50, 0]);
});

// ---- the result survives a resize ----

test('after a resize everything is redrawn in order, in the same place on the board', () => {
  // She draws and rubs out on the tablet in Chrome; then the browser bar hides
  // and the tablet turns upright and back. Her points come in as screen px and
  // are kept in units (board.toUnits), so they are the same at every size.
  const chrome = boardFit(1280, 626).s;
  const upright = boardFit(800, 1106).s;
  const toUnits = (s) => ([x, y]) => [x / s, y / s];
  const atChrome = (pts) => pts.map(([x, y]) => [x * chrome, y * chrome]).map(toUnits(chrome));
  const strokes = [ink(atChrome(line([100, 200], [700, 200]))), rub(atChrome(line([400, 120], [400, 280])))];

  for (const s of [chrome, boardFit(1280, 800).s, upright, chrome]) {
    const size = canvasSize(s, DPR);
    const ctx = fakeCtx();
    replay(ctx, strokes, size);
    assert.deepEqual(ctx.calls[0], { op: 'clear', r: [0, 0, size.width, size.height] }, 'the canvas is cleared first');
    const drawn = ctx.calls.filter((c) => c.op === 'stroke');
    assert.deepEqual(drawn.map((c) => c.mode), ['source-over', 'destination-out'], 'ink first, then the eraser: the same order');
    // Every point sits at its unit position times the new scale.
    const k = s * DPR;
    assert.deepEqual(drawn[1].path[0].map((v) => +v.toFixed(6)), [400 * k, 120 * k].map((v) => +v.toFixed(6)));
    assert.ok(Math.abs(drawn[1].width - ERASER_WIDTH * k) < 1e-9, 'the eraser keeps its size on the board');
    // A screen point at this size still lands on the erased spot.
    const u = toUnits(s)([400 * s, 200 * s]);
    assert.equal(paintAt(strokes, u), null);
    assert.equal(paintAt(strokes, toUnits(s)([150 * s, 200 * s])), BLUE);
  }
});

test('the canvas is sized for the board scale and the screen density', () => {
  const s = boardFit(1280, 626).s;
  const size = canvasSize(s, DPR);
  assert.equal(size.k, s * DPR);
  assert.equal(size.width, Math.round(1280 * s * DPR));
  assert.equal(size.height, Math.round(640 * s * DPR));
});

// ---- the clear button: press and hold ----

function holdLog() {
  const log = { progress: [], done: 0, short: 0 };
  const hold = createHold({
    onProgress: (f) => log.progress.push(f),
    onDone: () => { log.done++; },
    onShort: () => { log.short++; },
  });
  return { hold, log };
}

test('holding the clear button for one second clears, once', () => {
  assert.equal(HOLD_MS, 1000);
  const { hold, log } = holdLog();
  hold.press(0);
  for (let t = 16; t < 1000; t += 16) hold.tick(t);
  assert.equal(log.done, 0, 'not before a second');
  assert.ok(log.progress.at(-1) > 0.95 && log.progress.at(-1) < 1, 'the ring is nearly full');
  hold.tick(1000);
  assert.equal(log.done, 1);
  assert.equal(log.progress.at(-1), 1, 'the ring filled');
  hold.tick(1100);
  hold.release(1200);
  assert.equal(log.done, 1, 'once only');
  assert.equal(log.short, 0, 'no wiggle after it cleared');
});

test('the ring fills steadily while she holds', () => {
  const { hold, log } = holdLog();
  hold.press(0);
  hold.tick(250);
  hold.tick(500);
  hold.tick(750);
  assert.deepEqual(log.progress, [0, 0.25, 0.5, 0.75]);
});

test('a short tap does nothing but wiggle', () => {
  const { hold, log } = holdLog();
  hold.press(0);
  hold.tick(100);
  hold.release(150);
  assert.equal(log.done, 0);
  assert.equal(log.short, 1, 'the wiggle');
  assert.equal(log.progress.at(-1), 0, 'the ring empties');
});

test('letting go at 0.9 s does not clear; holding again starts from empty', () => {
  const { hold, log } = holdLog();
  hold.press(0);
  hold.tick(900);
  hold.release(900);
  assert.equal(log.done, 0);
  assert.equal(log.short, 1);
  hold.press(2000);
  hold.tick(2900);
  assert.equal(log.done, 0, 'the earlier 0.9 s does not count');
  hold.tick(3000);
  assert.equal(log.done, 1);
});

test('letting go after a full second clears even if no frame came in between', () => {
  const { hold, log } = holdLog();
  hold.press(0);
  hold.release(1050);
  assert.equal(log.done, 1);
  assert.equal(log.short, 0);
});

test('a pause cancels a hold without clearing or wiggling', () => {
  const { hold, log } = holdLog();
  hold.press(0);
  hold.tick(600);
  hold.cancel();
  hold.tick(1200);
  hold.release(1300);
  assert.equal(log.done, 0);
  assert.equal(log.short, 0);
  assert.equal(hold.holding(), false);
});
