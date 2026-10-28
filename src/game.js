// game.js — wires progress, variants and scoring to the screen for one character.
// Rules it keeps (CLAUDE.md): no text, never red, never a buzzer, never erase the
// whole letter, never snap her ink. Nothing animates and nothing plays while her
// finger is down: every touch-down stops Jugnu, effects, fades and speech at once.

import {
  computeLayout, drawLines, drawStageTrack, letterOffset, createInk, createFx, toUnits, START_DOT_RADIUS,
} from './render.js';
import { trackSinglePointer } from './input.js';
import { DEFAULTS, dist, createLiveTracker } from './geometry.js';
import { variantsFrom, pickVariant, variantLabel } from './variants.js';
import { CONFIG, initialState, applyLift, completeLetter } from './progress.js';
import { logAttempt, readAttempts } from './storage.js';
import { speak, replay, unlock, hush, chime } from './audio.js';
import { createJugnu } from './jugnu.js';
import { createDebugPanel, createCopyAttemptsButton } from './debug.js';

// Jugnu's home, near the left: area px from the left as line units, and height in line units.
const HOME = { x: 0.35, y: 0.65 };

async function loadChar(id) {
  try {
    const res = await fetch(`data/chars/${encodeURIComponent(id)}.json`);
    if (!res.ok) return null;
    const char = await res.json();
    return Array.isArray(char?.strokes) && char.strokes.length > 0 ? char : null;
  } catch {
    return null;
  }
}

export async function startGame(els) {
  const params = new URLSearchParams(location.search);
  const debugOn = params.get('debug') === '1';
  const charId = params.get('char') || 'L';
  const char = await loadChar(charId);
  if (!char) {
    // An empty screen. Only the debug panel says why.
    if (debugOn) createDebugPanel(0).message(`No file for ${charId}`);
    return;
  }

  const strokes = char.strokes;
  const ink = createInk(els.ink);
  const fx = createFx(els.fx);
  let layout = null;
  let offset = 0;
  const toPx = ([x, y]) => [layout.originX + (offset + x) * layout.unit, layout.top + y * layout.unit];
  const jugnu = createJugnu(els.jugnu, (p) => (layout ? toPx(p) : [0, 0]));
  const debug = debugOn ? createDebugPanel(strokes.length) : null;
  if (debugOn) createCopyAttemptsButton(() => readAttempts());

  let progress = initialState(strokes.length);
  let locked = false;  // the letter's reward, or finished for now: touches do nothing
  let attempt = null;  // the stroke her finger is drawing now
  const timers = new Set();

  const stageCfg = () => DEFAULTS.stages[progress.stage];
  const ref = () => strokes[progress.current].points;
  const startDot = () => ref()[0];
  const home = () => [HOME.x - offset, HOME.y];
  const pathWidth = () => 2 * stageCfg().tolerance * layout.unit;

  // Delayed effects. A touch-down cancels them all.
  function later(fn, ms) {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  }
  function cancelLater() {
    for (const t of timers) clearTimeout(t);
    timers.clear();
  }

  function updateDebug() {
    if (!debug) return;
    const { stage, streak, completed, finished } = progress;
    debug.status(`stage ${stage}  streak ${streak}  letters ${completed}/${CONFIG.lettersPerStage}` +
      (finished ? '  finished for now' : ''), progress.current);
  }

  function redraw() {
    drawLines(els.lines, layout);
    if (progress.finished) return;
    drawStageTrack(els.lines, layout, char, offset,
      { stage: progress.stage, current: progress.current, tolerance: stageCfg().tolerance });
  }

  function applyLayout() {
    layout = computeLayout(window.innerWidth, window.innerHeight);
    offset = letterOffset(layout, char.width);
    redraw();
    ink.resize(layout);
    fx.resize(layout);
    jugnu.resize(layout.unit);
  }

  // A stroke has just become the current one.
  // Stage 1: Jugnu flies it once, then perches at its start dot. Stage 2: Jugnu just perches.
  function beginStroke() {
    redraw();
    updateDebug();
    if (progress.current === 0) speak('start');
    if (progress.stage === 1) jugnu.demo(ref(), CONFIG.demoMs, CONFIG.hopMs);
    else jugnu.hopTo(startDot(), CONFIG.hopMs);
  }

  // What happens after a stroke that did not count. The reward waits; she tries again.
  function react(reason, demo) {
    const dot = startDot();
    if (reason === 'wrong-start') fx.pulse(toPx(dot), START_DOT_RADIUS * layout.unit, CONFIG.pulseMs);
    if (demo || reason === 'wrong-direction') {
      speak('way');
      jugnu.demo(ref(), CONFIG.demoMs, CONFIG.hopMs);
    } else if (reason === 'wrong-start') {
      speak('start');
      jugnu.hopTo(dot, CONFIG.hopMs);
    } else {
      // off-path or too-short: Jugnu rests on the start dot and the track glows once.
      jugnu.hopTo(dot, CONFIG.hopMs);
      fx.glowPath(ref().map(toPx), pathWidth(), CONFIG.trackGlowMs);
    }
  }

  // All strokes done: the whole letter glows (placeholder reward), then it restarts.
  function finishLetter() {
    locked = true;
    speak('good');
    redraw();
    const lines = strokes.filter((s) => s.kind === 'line').map((s) => s.points.map(toPx));
    fx.letterGlow(lines, pathWidth(), CONFIG.letterGlowMs);
    setTimeout(() => {
      const done = completeLetter(progress);
      progress = done.state;
      ink.clear();
      fx.clear();
      if (done.finished) return goToSleep();
      locked = false;
      if (done.stageUp) speak('done');
      beginStroke();
    }, CONFIG.letterGlowMs);
  }

  // Finished for now: Jugnu sleeps, the screen dims, touches do nothing until reload.
  function goToSleep() {
    locked = true;
    redraw();
    updateDebug();
    speak('done');
    jugnu.sleep(home());
    els.dimmer.classList.add('on');
    els.ear.hidden = true;
  }

  // Ink style for her next point, from the live trackers. She is on the path when
  // any variant has her on it; going the wrong way stops the glow until she lifts.
  function styleFor(q) {
    const states = attempt.trackers.map((t) => t.update(q));
    const on = states.filter((s) => s.onPath);
    if (on.length > 0 && on.every((s) => s.wrongWay)) attempt.wrongWay = true;
    return { dim: !attempt.startOk || on.length === 0, glow: !attempt.wrongWay };
  }

  const toChar = (p) => {
    const u = toUnits(p.x, p.y, layout);
    return { u, q: [u.x - offset, u.y] };
  };

  trackSinglePointer(els.area, {
    onStart: (p) => {
      unlock();
      if (locked || !layout) return;
      // Her finger is down: stop everything that moves or makes a sound.
      hush();
      cancelLater();
      fx.clear();
      ink.settle();
      jugnu.restAt(startDot());
      const { u, q } = toChar(p);
      const variants = variantsFrom(strokes, progress.current);
      attempt = {
        variants,
        trackers: variants.map((v) => createLiveTracker(v.points, progress.stage)),
        // Touch-down check: too far from the start dot and this stroke will not count.
        startOk: dist(q, startDot()) <= stageCfg().startRadius,
        wrongWay: false,
        points: [q],
      };
      ink.begin(u, styleFor(q));
    },
    onMove: (points) => {
      if (!attempt) return;
      const us = [];
      const styles = [];
      for (const p of points) {
        const { u, q } = toChar(p);
        attempt.points.push(q);
        us.push(u);
        styles.push(styleFor(q));
      }
      ink.add(us, styles);
    },
    onEnd: () => {
      if (!attempt) return;
      const a = attempt;
      attempt = null;
      const id = ink.end();
      const index = progress.current;
      const stage = progress.stage;
      const pick = pickVariant(a.points, a.variants, stage);
      let result = pick.result;
      if (!a.startOk) result = { ...result, ok: false, reason: 'wrong-start', startOk: false };
      const variant = result.ok ? variantLabel(pick.variant) : 'none';

      logAttempt({
        time: new Date().toISOString(),
        char: char.id,
        stage,
        stroke: index,
        variant,
        ok: result.ok,
        reason: result.reason,
        startOk: result.startOk,
        directionOk: result.directionOk,
        shapeOk: result.shapeOk,
        error: Number.isFinite(result.error) ? Number(result.error.toFixed(4)) : null,
      });

      const lift = applyLift(progress, { ok: result.ok, to: pick.variant.to });
      progress = lift.state;
      if (debug) {
        debug.show(index, { ...result, variant }, progress.current);
        updateDebug();
      }

      if (result.ok) {
        chime();
        fx.sparkle(pick.variant.points.map(toPx), CONFIG.sparkleMs);
        if (lift.letterDone) return finishLetter();
        redraw();
        later(beginStroke, CONFIG.sparkleMs);
      } else {
        ink.fade(id, CONFIG.fadeMs);
        if (lift.droppedStage) redraw();
        react(result.reason, lift.demo);
      }
    },
  });

  els.ear.addEventListener('pointerdown', () => unlock());
  els.ear.addEventListener('click', () => {
    if (!attempt && !progress.finished) replay();
  });

  let resizePending = false;
  window.addEventListener('resize', () => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => { resizePending = false; applyLayout(); });
  });

  applyLayout();
  els.jugnu.hidden = false;
  els.ear.hidden = false;
  jugnu.placeAt(home());
  beginStroke();
}
