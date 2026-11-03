// game.js — wires progress, variants and scoring to the screen for one character.
// Rules it keeps (CLAUDE.md): no text, never red, never a buzzer, never erase the
// whole letter, never snap her ink. Nothing animates and nothing plays while her
// finger is down: while she traces, a touch-down stops Jugnu, effects, fades and
// speech at once; while Jugnu draws a stroke or the letter glows, a touch-down
// pauses everything and her lift lets it carry on.
//
// Slice 5B: practice rounds (src/progress.js). Each round is the whole letter
// at its round's stage: full track and Jugnu's demonstrations, then a thinner
// track with the next start dot, then a faint track. Every finished round is
// saved per character, so she resumes at the same round. After the last one
// the letter glows, a chime plays, then onDone({ id, star }) hands back to the
// shell: star is true when no round needed Jugnu's help.

import {
  computeLayout, drawLines, drawStageTrack, letterOffset, createInk, createFx, toUnits, START_DOT_RADIUS, trackLook,
} from './render.js';
import { trackSinglePointer } from './input.js';
import { DEFAULTS, dist, createLiveTracker } from './geometry.js';
import { variantLabel, candidatesFor, nextStrokes, pickCandidate } from './variants.js';
import {
  CONFIG, ROUND_CONFIG, ROUNDS, initialState, applyLift, roundCount, stageForRound,
  startRounds, markHelp, isHelp, finishRound, starEarned, roundLights,
} from './progress.js';
import { logAttempt, readAttempts, readProfile, readRounds, saveRounds, clearRounds } from './storage.js';
import { speak, unlock, hush, chime, letterChime, setProfile } from './audio.js';
import { createJugnu } from './jugnu.js';
import { createDebugPanel, createCopyAttemptsButton } from './debug.js';
import { canLoad } from './session.js';

// Jugnu's home, near the left: area px from the left as line units, and height in line units.
const HOME = { x: 0.35, y: 0.65 };
// Width of Jugnu's glowing trail when he draws a stroke himself, in line units.
const TRAIL_WIDTH = 0.16;
// Width of the whole-letter glow at the end, in line units (its halo is 1.6 times this).
// Like every drawn width, it never comes from the scoring tolerance.
const LETTER_GLOW_WIDTH = 0.12;

// Only ids in the manifest are ever requested.
async function loadChar(id, manifest) {
  if (!canLoad(id, manifest)) return null;
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

// Plays one character. els: { area, lines, ink, fx, jugnu, rounds }.
// Returns { stop() }: stop() ends everything at once (the home button).
// A character that cannot be loaded gives an empty screen; only the debug panel says why.
export async function startGame(els, { charId, manifest = [], debugOn = false, onDone = () => {} }) {
  const char = await loadChar(charId, manifest);
  if (!char) {
    const panel = debugOn ? createDebugPanel(0) : null;
    panel?.message(canLoad(charId, manifest) ? `No file for ${charId}` : `${charId} is not in data/chars/index.json`);
    return { stop: () => panel?.remove() };
  }

  const strokes = char.strokes;
  const ink = createInk(els.ink);
  const fx = createFx(els.fx);
  let layout = null;
  let offset = 0;
  const toPx = ([x, y]) => [layout.originX + (offset + x) * layout.unit, layout.top + y * layout.unit];
  const jugnu = createJugnu(els.jugnu, (p) => (layout ? toPx(p) : [0, 0]));
  const debug = debugOn ? createDebugPanel(strokes.length) : null;
  const removeCopyButton = debugOn ? createCopyAttemptsButton(() => readAttempts()) : null;

  setProfile(readProfile());
  const rounds = roundCount(ROUNDS);
  let rp = startRounds(readRounds(char.id), rounds); // { round, helped }
  const freshRound = () => ({ ...initialState(strokes.length), stage: stageForRound(rp.round, rounds) });
  let progress = freshRound();
  let goodStrokes = 0; // passed strokes so far: a "good" line is said once per CONFIG.goodEvery
  // What a touch does now:
  // 'trace'  she draws a stroke and it is scored
  // 'held'   Jugnu is drawing a stroke, or the letter glows: a touch pauses it
  // 'done'   the letter is finished and the shell takes over: touches do nothing
  let phase = 'trace';
  let alive = true;    // false once stop() ran: async steps give up
  let attempt = null;  // the stroke her finger is drawing now
  let holding = null;  // while a finger holds a 'held' phase: how to resume

  const stageCfg = () => DEFAULTS.stages[progress.stage];
  // The stroke Jugnu demonstrates: the first unfinished one in the recorded order.
  const ref = () => strokes[progress.current].points;
  const startDot = () => ref()[0];
  const home = () => [HOME.x - offset, HOME.y];
  const bandWidth = () => trackLook(progress.stage).band * layout.unit;

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
    const { stage, streak, assisted } = progress;
    debug.status(`${char.id}  round ${rp.round + 1}/${rounds}  stage ${stage}  streak ${streak}  assisted ${assisted ? 'yes' : 'no'}  help ${rp.helped ? 'yes (no star)' : 'no'}`, progress.current);
  }

  // The round lights, top right: done, now, to come. `lit` lights one up.
  function drawLights(lit = -1) {
    if (!els.rounds) return;
    els.rounds.replaceChildren(...roundLights(rp, rounds).map((kind, i) => {
      const el = document.createElement('i');
      el.className = `rl ${kind}${i === lit ? ' lit' : ''}`;
      return el;
    }));
    els.rounds.hidden = false;
  }

  function redraw() {
    drawLines(els.lines, layout);
    drawStageTrack(els.lines, layout, char, offset, {
      stage: progress.stage,
      done: progress.done,
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
  // Stage 1: Jugnu flies it once, then perches at its start dot. Stage 2: Jugnu just
  // perches. Stage 3: Jugnu waits at home, out of the way.
  function beginStroke() {
    redraw();
    updateDebug();
    if (progress.done.every((d) => !d)) speak('start');
    if (progress.stage === 1) jugnu.demo(ref(), CONFIG.demoMs, CONFIG.hopMs);
    else if (progress.stage === 2) jugnu.hopTo(startDot(), CONFIG.hopMs);
    else jugnu.hopTo(home(), CONFIG.hopMs);
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
      fx.glowPath(tried.map(toPx), bandWidth(), CONFIG.trackGlowMs);
    }
  }

  // Never stuck: Jugnu draws stroke k himself, leaving a glowing trail.
  async function assist(k, letterDone) {
    phase = 'held';
    speak('assist');
    const pts = strokes[k].points;
    const trail = fx.trail(pts.map(toPx), TRAIL_WIDTH * layout.unit);
    await jugnu.demo(pts, CONFIG.assistMs, CONFIG.hopMs, (f) => trail.set(f));
    if (!alive) return;
    trail.fadeOut(CONFIG.trailFadeMs);
    redraw();
    await wait(CONFIG.trailFadeMs);
    if (!alive) return;
    if (letterDone) return endRound();
    phase = 'trace';
    beginStroke();
  }

  // Every stroke of the round is done. If Jugnu drew one, the round starts
  // again; otherwise its light comes on and the next round starts. After the
  // last round the whole letter glows.
  async function endRound() {
    phase = 'held';
    redraw();
    const r = finishRound(rp, { assisted: progress.assisted }, rounds);
    const finished = rp.round;
    rp = r.state;
    if (r.allDone) {
      clearRounds(char.id);
      drawLights(finished);
      return finishLetter();
    }
    saveRounds(char.id, rp);
    drawLights(r.repeat ? -1 : finished);
    letterChime();
    updateDebug();
    await wait(CONFIG.roundPauseMs);
    if (!alive) return;
    ink.clear();
    fx.clear();
    progress = freshRound();
    phase = 'trace';
    beginStroke();
  }

  // The last round is done: the whole letter glows and a chime plays, then the
  // shell takes her back to the board. star: no round needed Jugnu's help.
  async function finishLetter() {
    phase = 'held';
    redraw();
    updateDebug();
    speak('letterDone');
    letterChime();
    const lines = strokes.filter((s) => s.kind === 'line').map((s) => s.points.map(toPx));
    fx.letterGlow(lines, LETTER_GLOW_WIDTH * layout.unit, CONFIG.letterGlowMs);
    await wait(CONFIG.letterGlowMs);
    if (!alive) return;
    phase = 'done';
    onDone({ id: char.id, star: starEarned(rp) });
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
    if (progress.stage === 3) jugnu.stop(); // stays out of the way, right where it is
    else jugnu.restAt(startDot());
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
    const lift = applyLift(progress, { ok: result.ok, from: pick.variant.from, to: pick.variant.to, counted }, ROUND_CONFIG);

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
    if (!rp.helped && isHelp(stage, lift)) {
      rp = markHelp(rp);
      saveRounds(char.id, rp); // she may leave now: the help is remembered
    }
    if (debug) {
      debug.show(pick.variant.from, { ...result, variant, counted, assisted: lift.assist }, progress.current);
      updateDebug();
    }

    if (result.ok) {
      chime();
      fx.sparkle(pick.variant.points.map(toPx), CONFIG.sparkleMs);
      if (lift.letterDone) return endRound();
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

  const stopTracking = trackSinglePointer(els.area, {
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

  const listening = new AbortController();
  let resizePending = false;
  window.addEventListener('resize', () => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => { resizePending = false; if (alive) applyLayout(); });
  }, { signal: listening.signal });

  applyLayout();
  els.jugnu.hidden = false;
  jugnu.placeAt(home());
  drawLights();
  beginStroke();

  return {
    // She left (the home button): stop everything and leave a clean screen.
    stop() {
      if (!alive) return;
      alive = false;
      stopTracking();
      listening.abort();
      cancelLater();
      hush();
      jugnu.stop();
      fx.clear();
      ink.clear();
      els.lines.replaceChildren();
      els.jugnu.hidden = true;
      if (els.rounds) {
        els.rounds.replaceChildren();
        els.rounds.hidden = true;
      }
      debug?.remove();
      removeCopyButton?.();
    },
  };
}
