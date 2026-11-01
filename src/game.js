// game.js — wires progress, variants and scoring to the screen for one character.
// Rules it keeps (CLAUDE.md): no text, never red, never a buzzer, never erase the
// whole letter, never snap her ink. Nothing animates and nothing plays while her
// finger is down: while she traces, a touch-down stops Jugnu, effects, fades and
// speech at once; while Jugnu draws a stroke or the reward plays, a touch-down
// pauses everything and her lift lets it carry on.

import {
  computeLayout, drawLines, drawStageTrack, letterOffset, createInk, createFx, toUnits, START_DOT_RADIUS,
} from './render.js';
import { trackSinglePointer } from './input.js';
import { DEFAULTS, dist, createLiveTracker } from './geometry.js';
import { variantLabel, candidatesFor, nextStrokes, pickCandidate } from './variants.js';
import { CONFIG, initialState, applyLift, completeLetter } from './progress.js';
import { logAttempt, readAttempts, readProfile } from './storage.js';
import { speak, replay, unlock, hush, chime, setProfile } from './audio.js';
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

// Every running animation on the page (effects, pictures, ink fades): pause them
// all while her finger is down, and play them again when she lifts.
function pauseAnimations() {
  const paused = [];
  for (const a of document.getAnimations?.() ?? []) {
    if (a.playState === 'running') {
      a.pause();
      paused.push(a);
    }
  }
  return () => { for (const a of paused) a.play(); };
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

  setProfile(readProfile());
  let progress = initialState(strokes.length);
  let goodStrokes = 0; // passed strokes so far: a "good" line is said once per CONFIG.goodEvery
  // What a touch does now:
  // 'trace'  she draws a stroke and it is scored
  // 'held'   Jugnu is drawing a stroke, or the reward plays: a touch pauses it
  // 'sleep'  finished for now: touches do nothing until reload
  let phase = 'trace';
  let attempt = null;  // the stroke her finger is drawing now
  let holding = null;  // while a finger holds a 'held' phase: how to resume

  const stageCfg = () => DEFAULTS.stages[progress.stage];
  // The stroke Jugnu demonstrates: the first unfinished one in the recorded order.
  const ref = () => strokes[progress.current].points;
  const startDot = () => ref()[0];
  const home = () => [HOME.x - offset, HOME.y];
  const pathWidth = () => 2 * stageCfg().tolerance * layout.unit;

  // Delayed steps. While she traces, a touch-down cancels them all; while a
  // 'held' phase plays, a touch-down pauses them and her lift resumes them.
  const timers = new Set();
  function later(fn, ms) {
    const t = { fn, remaining: ms, due: 0, handle: 0 };
    const arm = () => {
      t.due = performance.now() + t.remaining;
      t.handle = setTimeout(() => { timers.delete(t); fn(); }, t.remaining);
    };
    t.arm = arm;
    arm();
    timers.add(t);
  }
  const wait = (ms) => new Promise((resolve) => later(resolve, ms));
  function cancelLater() {
    for (const t of timers) clearTimeout(t.handle);
    timers.clear();
  }
  function pauseLater() {
    const now = performance.now();
    for (const t of timers) {
      clearTimeout(t.handle);
      t.remaining = Math.max(0, t.due - now);
    }
  }
  function resumeLater() {
    for (const t of timers) t.arm();
  }

  function updateDebug() {
    if (!debug) return;
    const { stage, streak, completed, finished, assisted, assistedInRow } = progress;
    debug.status(`stage ${stage}  streak ${streak}  letters ${completed}/${CONFIG.lettersPerStage}` +
      `  assisted ${assisted ? 'yes' : 'no'} (${assistedInRow} in a row)` +
      (finished ? '  finished for now' : ''), progress.current);
  }

  function redraw() {
    drawLines(els.lines, layout);
    if (progress.finished) return;
    drawStageTrack(els.lines, layout, char, offset, {
      stage: progress.stage,
      done: progress.done,
      active: nextStrokes(char, progress.done),
      tolerance: stageCfg().tolerance,
    });
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
    if (progress.done.every((d) => !d)) speak('start');
    if (progress.stage === 1) jugnu.demo(ref(), CONFIG.demoMs, CONFIG.hopMs);
    else jugnu.hopTo(startDot(), CONFIG.hopMs);
  }

  // What happens after a stroke that did not count. The reward waits; she tries again.
  // `tried` is the stroke she was scored against (with anyOrder, maybe not the current one).
  function react(reason, demo, tried) {
    if (reason === 'wrong-start') {
      for (const i of nextStrokes(char, progress.done)) {
        fx.pulse(toPx(strokes[i].points[0]), START_DOT_RADIUS * layout.unit, CONFIG.pulseMs);
      }
    }
    if (demo) {
      // Demonstrations use the recorded order.
      speak('wrongDirection');
      jugnu.demo(ref(), CONFIG.demoMs, CONFIG.hopMs);
    } else if (reason === 'wrong-direction') {
      speak('wrongDirection');
      jugnu.demo(tried, CONFIG.demoMs, CONFIG.hopMs);
    } else if (reason === 'wrong-start') {
      speak('wrongStart');
      jugnu.hopTo(startDot(), CONFIG.hopMs);
    } else {
      // off-path or too-short: Jugnu rests on the start dot and the track glows once.
      jugnu.hopTo(tried[0], CONFIG.hopMs);
      fx.glowPath(tried.map(toPx), pathWidth(), CONFIG.trackGlowMs);
    }
  }

  // Never stuck: Jugnu draws stroke k himself, leaving a glowing trail.
  async function assist(k, letterDone) {
    phase = 'held';
    speak('assist');
    const pts = strokes[k].points;
    const trail = fx.trail(pts.map(toPx), pathWidth());
    await jugnu.demo(pts, CONFIG.assistMs, CONFIG.hopMs, (f) => trail.set(f));
    trail.fadeOut(CONFIG.trailFadeMs);
    redraw();
    await wait(CONFIG.trailFadeMs);
    if (letterDone) return finishLetter();
    phase = 'trace';
    beginStroke();
  }

  // All strokes done: the whole letter glows (placeholder reward), then it restarts.
  async function finishLetter() {
    phase = 'held';
    speak('letterDone');
    redraw();
    const lines = strokes.filter((s) => s.kind === 'line').map((s) => s.points.map(toPx));
    fx.letterGlow(lines, pathWidth(), CONFIG.letterGlowMs);
    await wait(CONFIG.letterGlowMs);
    nextLetter();
  }

  // Count the letter, then the next stage, the same stage again, or finished for now.
  function nextLetter() {
    const done = completeLetter(progress);
    progress = done.state;
    ink.clear();
    fx.clear();
    if (done.finished) return goToSleep();
    phase = 'trace';
    beginStroke();
  }

  // Finished for now: Jugnu sleeps, the screen dims, touches do nothing until reload.
  function goToSleep() {
    phase = 'sleep';
    redraw();
    updateDebug();
    speak('end');
    jugnu.sleep(home());
    els.dimmer.classList.add('on');
    els.ear.hidden = true;
  }

  // Ink style for her next point, from the live trackers. She is on the path when
  // any candidate has her on it; going the wrong way stops the glow until she lifts.
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

  // Her finger went down while Jugnu draws or the reward plays: hold everything still.
  function hold() {
    hush();
    ink.settle();
    jugnu.pause();
    pauseLater();
    const playAnimations = pauseAnimations();
    holding = () => {
      playAnimations();
      jugnu.resume();
      resumeLater();
    };
  }

  function startStroke(p) {
    // Her finger is down: stop everything that moves or makes a sound.
    hush();
    cancelLater();
    fx.clear();
    ink.settle();
    jugnu.restAt(startDot());
    const { u, q } = toChar(p);
    const candidates = candidatesFor(char, progress.done);
    attempt = {
      candidates,
      trackers: candidates.map((v) => createLiveTracker(v.points, progress.stage)),
      // Touch-down check: too far from every start dot she may use and this stroke will not count.
      startOk: candidates.some((v) => dist(q, v.points[0]) <= stageCfg().startRadius),
      wrongWay: false,
      points: [q],
    };
    ink.begin(u, styleFor(q));
  }

  function endStroke() {
    const a = attempt;
    attempt = null;
    const id = ink.end();
    const stage = progress.stage;
    const current = progress.current;
    const pick = pickCandidate(a.points, a.candidates, stage);
    let result = pick.result;
    // Too short to be a real try (a tap): logged, but never added to the fail streak.
    const counted = result.reason !== 'too-short';
    if (counted && !a.startOk) result = { ...result, ok: false, reason: 'wrong-start', startOk: false };
    const variant = result.ok ? variantLabel(pick.variant) : 'none';
    const lift = applyLift(progress, { ok: result.ok, from: pick.variant.from, to: pick.variant.to, counted });

    logAttempt({
      time: new Date().toISOString(),
      char: char.id,
      stage,
      stroke: pick.variant.from,
      variant,
      ok: result.ok,
      reason: result.reason,
      startOk: result.startOk,
      directionOk: result.directionOk,
      shapeOk: result.shapeOk,
      error: Number.isFinite(result.error) ? Number(result.error.toFixed(4)) : null,
      counted,
      assisted: lift.assist, // true: after this try, Jugnu drew the stroke himself
    });

    progress = lift.state;
    if (debug) {
      debug.show(pick.variant.from, { ...result, variant, counted, assisted: lift.assist }, progress.current);
      updateDebug();
    }

    if (result.ok) {
      chime();
      fx.sparkle(pick.variant.points.map(toPx), CONFIG.sparkleMs);
      if (lift.letterDone) return finishLetter();
      goodStrokes += 1;
      if (goodStrokes % CONFIG.goodEvery === 0) speak('good');
      redraw();
      later(beginStroke, CONFIG.sparkleMs);
      return;
    }
    ink.fade(id, CONFIG.fadeMs);
    if (lift.assist) return assist(current, lift.letterDone);
    if (lift.droppedStage) redraw();
    react(result.reason, lift.demo, strokes[pick.variant.from].points);
  }

  trackSinglePointer(els.area, {
    onStart: (p) => {
      unlock();
      if (!layout) return;
      if (phase === 'held') return hold();
      if (phase === 'trace') startStroke(p);
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
      if (holding) {
        const resume = holding;
        holding = null;
        resume();
        return;
      }
      if (attempt) endStroke();
    },
  });

  els.ear.addEventListener('pointerdown', () => unlock());
  els.ear.addEventListener('click', () => {
    if (!attempt && !holding && phase !== 'sleep') replay();
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
