// name-game.js — her name's rounds on screen (Slice 9C, "Write my name").
// The same rules as game.js (CLAUDE.md): no text, never red, never a buzzer,
// never erase her whole name, never snap her ink. Nothing animates while her
// finger is down.
//
// Her name sits on the four lines as one word (src/name.js nameLayout): the lines
// shrink to fit it and keep that size in every round. Each letter is its own
// character file, with its own glyph and stroke plans, placed box after box.
//
// Rounds 1 and 2 (PR 1 of Slice 9C) go letter by letter, in order:
//   round 1  the full track of the whole name; the letter she traces now has its
//            numbered start dot and arrow, and Jugnu flies each of its strokes first
//   round 2  the thinner track; only the next start dot of the letter she traces now
// Each letter's strokes are scored exactly as a single letter's (any allowed plan,
// a stroke traced the other way counts and is coached), and each letter lights
// up gold when it is done. Never stuck: Jugnu demonstrates after 3 misses on a
// stroke and draws it after 5; then only that letter is traced again, once
// (src/progress.js finishNameLetter). Any help means no gold star.
//
// Leeway: smaller lines would make the tolerances narrower on screen, so every
// tolerance is at least 45 px (src/geometry.js withMinLeeway). Long names are
// never stricter than single letters.
//
// Round 3 (the copy-it round) and the reward come in PR 2 of Slice 9C. For now,
// after round 2 the whole name glows and onDone hands back to the shell with no star.

import {
  drawLines, drawStageTrack, createInk, createFx, letterToPx, pxToLetter, START_DOT_RADIUS, trackLook, markPath,
} from './render.js';
import { trackSinglePointer } from './input.js';
import { DEFAULTS, dist, createLiveTracker, withMinLeeway } from './geometry.js';
import {
  variantLabel, pickCandidate, planCandidates, advancePlans, startPlans, planStrokes, planChar, scoreMark,
} from './variants.js';
import {
  CONFIG, ROUNDS, initialState, applyLift, applyPlanPass, roundCount, stageForRound,
  startRounds, markHelp, isHelp, finishRound, roundLights, isCopyRound, strokeLogEntry,
  startNameRound, finishNameLetter,
} from './progress.js';
import { traceNote } from './notes.js';
import { logAttempt, readProfile, readRounds, saveRounds, clearRounds } from './storage.js';
import { speak, unlock, hush, chime, letterChime, setProfile } from './audio.js';
import { createJugnu } from './jugnu.js';
import { createDebugPanel } from './debug.js';
import { loadChar, pauseAnimations } from './game.js';
import { NAME_ID, nameLayout, nameWidth, placeLetters, nameLogEntry } from './name.js';

const HOME = { x: 0.35, y: 0.65 };   // Jugnu's home, as in game.js
const TRAIL_WIDTH = 0.16;            // Jugnu's trail when he draws a stroke himself, line units
const LETTER_GLOW_WIDTH = 0.12;      // a letter's glow when it is done, line units
const LETTER_GLOW_MS = 900;          // one letter lights up this long
const NAME_GLOW_STEP_MS = 220;       // at the end, each letter of her name starts glowing this long after the one before

// Plays her name. els: { area, lines, ink, fx, jugnu, rounds, note }.
// letters: the character ids of her name, in order (src/name.js nameOf).
// Returns { pause, resume, stop }.
export async function startNameGame(els, { letters, manifest = [], debugOn = false, onDone = () => {} }) {
  const loaded = await Promise.all(letters.map((id) => loadChar(id, manifest)));
  if (letters.length === 0 || loaded.some((c) => !c)) {
    const panel = debugOn ? createDebugPanel(0) : null;
    panel?.message('A letter of the name could not be loaded');
    return { stop: () => panel?.remove(), pause() {}, resume() {} };
  }
  const placed = placeLetters(loaded); // each letter in the name's units
  const width = nameWidth(loaded);

  const ink = createInk(els.ink);
  const fx = createFx(els.fx);
  let layout = null;
  let cfg = DEFAULTS;                 // the stage tolerances with the 45 px floor, for this screen
  const toPx = (p) => letterToPx(layout, layout.offset)(p);
  const jugnu = createJugnu(els.jugnu, (p) => (layout ? toPx(p) : [0, 0]));
  const debug = debugOn ? createDebugPanel(0) : null;
  setProfile(readProfile());

  const rounds = roundCount(ROUNDS);
  let rp = startRounds(readRounds(NAME_ID), rounds);
  if (isCopyRound(rp.round, rounds)) rp = { round: 0, helped: rp.helped }; // round 3 comes in PR 2
  const sitting = { failedCopies: 0, wrongStarts: 0, mirrored: 0 };
  const stage = () => stageForRound(rp.round, rounds);

  let np = startNameRound(placed.length);        // which letter now, and which are done
  const cur = () => placed[np.letter];
  const freshLetter = () => ({ ...initialState(cur().strokes.length), stage: stage() });
  let progress = freshLetter();
  let following = startPlans(cur());
  const shown = () => following[0];
  const planNow = () => planStrokes(cur(), shown().plan);
  // This round, per letter, for the 'name' log entry; and the ink of each letter's passed strokes.
  const freshStats = () => placed.map((c) => ({ letter: c.id, ok: true, helped: false, misses: 0, wrongStarts: 0, reversed: 0 }));
  let stats = freshStats();
  let letterInk = placed.map(() => []);
  let reversedStrokes = [];
  let goodStrokes = 0;

  let phase = 'trace';
  let alive = true;
  let attempt = null;
  let holding = null;
  let turned = null;

  const score = (child, ref, st) => scoreMark(child, ref, st, cfg);
  const stageCfg = () => cfg.stages[progress.stage];
  const ref = () => planNow()[progress.current].points;
  const startDot = () => ref()[0];
  const home = () => [HOME.x - layout.offset, HOME.y];
  const bandWidth = () => trackLook(progress.stage).band * layout.unit;

  // Delayed steps, as in game.js: a touch-down cancels them while she traces,
  // and pauses them while Jugnu draws or the name glows.
  const timers = new Set();
  function later(fn, ms) {
    const t = { fn, remaining: ms, due: 0, handle: 0 };
    t.arm = () => {
      t.due = performance.now() + t.remaining;
      t.handle = setTimeout(() => { timers.delete(t); fn(); }, t.remaining);
    };
    t.arm();
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
  const resumeLater = () => { for (const t of timers) t.arm(); };

  function updateDebug() {
    debug?.message(`name (${placed.length} letters)  round ${rp.round + 1}/${rounds}  stage ${progress.stage}  letter ${np.letter + 1} ${cur()?.id ?? '-'}` +
      `  stroke ${progress.current + 1}  streak ${progress.streak}  retraced ${np.retraced.map((r) => (r ? 1 : 0)).join('')}` +
      `  help ${rp.helped ? 'yes (no star)' : 'no'}\nunit ${layout ? layout.unit.toFixed(0) : '-'} px  tolerance ${(stageCfg().tolerance * (layout?.unit ?? 0)).toFixed(0)} px`);
  }

  function drawLights(lit = -1) {
    if (!els.rounds) return;
    els.rounds.replaceChildren(...roundLights(rp, rounds).map((kind, i) => {
      const el = document.createElement('i');
      el.className = `rl ${kind}${i === lit ? ' lit' : ''}`;
      return el;
    }));
    els.rounds.hidden = false;
  }

  // The whole name's track: done letters gold, the letter she traces now with its
  // start dots (in the plan her strokes follow), the letters still to come without.
  function redraw() {
    drawLines(els.lines, layout);
    placed.forEach((c, i) => {
      const opts = { stage: progress.stage };
      if (np.done[i]) drawStageTrack(els.lines, layout, c, layout.offset, { ...opts, done: c.strokes.map(() => true), markers: false });
      else if (i === np.letter) drawStageTrack(els.lines, layout, planChar(c, shown().plan), layout.offset, { ...opts, done: progress.done });
      else drawStageTrack(els.lines, layout, c, layout.offset, { ...opts, done: c.strokes.map(() => false), markers: false });
    });
  }

  let noteTimer = 0;
  function showNote(text) {
    if (!els.note) return;
    clearTimeout(noteTimer);
    if (!text) return void els.note.classList.remove('on');
    els.note.textContent = text;
    els.note.hidden = false;
    els.note.classList.add('on');
    noteTimer = setTimeout(() => els.note.classList.remove('on'), CONFIG.noteMs);
  }

  function applyLayout() {
    const w = els.area.clientWidth || window.innerWidth;
    const h = els.area.clientHeight || window.innerHeight;
    layout = nameLayout(w, h, width);
    cfg = withMinLeeway(DEFAULTS, layout.unit);
    redraw();
    ink.resize(layout, layout.offset);
    fx.resize(layout, layout.offset);
    jugnu.resize(layout.unit);
  }

  function beginStroke() {
    redraw();
    updateDebug();
    if (np.letter === 0 && progress.done.every((d) => !d)) speak('start');
    if (progress.stage === 1) jugnu.demo(markPath(ref()), CONFIG.demoMs, CONFIG.hopMs);
    else jugnu.hopTo(startDot(), CONFIG.hopMs);
  }

  function react(reason, demo, tried) {
    showNote(traceNote(demo ? 'wrong-direction' : reason));
    if (reason === 'wrong-start') {
      const starts = new Map();
      for (const v of planCandidates(cur(), following)) starts.set(v.points[0].join(','), v.points[0]);
      for (const p of starts.values()) fx.pulse(toPx(p), START_DOT_RADIUS * layout.unit, CONFIG.pulseMs);
    }
    if (demo) {
      speak('wrongDirection');
      jugnu.demo(markPath(ref()), CONFIG.demoMs, CONFIG.hopMs);
    } else if (reason === 'wrong-direction') {
      speak('wrongDirection');
      jugnu.demo(markPath(tried), CONFIG.demoMs, CONFIG.hopMs);
    } else if (reason === 'wrong-start') {
      speak('wrongStart');
      jugnu.hopTo(startDot(), CONFIG.hopMs);
    } else {
      jugnu.hopTo(tried[0], CONFIG.hopMs);
      fx.glowPath(markPath(tried).map(toPx), bandWidth(), CONFIG.trackGlowMs);
    }
  }

  // Never stuck: Jugnu draws stroke k of the letter himself.
  async function assist(k, letterDone) {
    phase = 'held';
    speak('assist');
    const pts = markPath(planNow()[k].points);
    const trail = fx.trail(pts.map(toPx), TRAIL_WIDTH * layout.unit);
    await jugnu.demo(pts, CONFIG.assistMs, CONFIG.hopMs, (f) => trail.set(f));
    if (!alive) return;
    trail.fadeOut(CONFIG.trailFadeMs);
    redraw();
    await wait(CONFIG.trailFadeMs);
    if (!alive) return;
    if (letterDone) return endLetter();
    phase = 'trace';
    beginStroke();
  }

  // A letter's last stroke is done. If Jugnu drew one of its strokes, that letter
  // is traced again (once); otherwise it lights up and the next letter starts.
  async function endLetter() {
    phase = 'held';
    const i = np.letter;
    const assisted = progress.assisted;
    if (assisted) Object.assign(stats[i], { ok: false, helped: true });
    const f = finishNameLetter(np, { assisted });
    np = f.state;
    if (f.again) {
      for (const id of letterInk[i]) ink.fade(id, CONFIG.fadeMs);
      letterInk[i] = [];
      progress = freshLetter();
      following = startPlans(cur());
      await wait(CONFIG.fadeMs);
      if (!alive) return;
      phase = 'trace';
      return beginStroke();
    }
    // The letter lights up: its track turns gold and glows once.
    redraw();
    letterChime();
    fx.letterGlow(placed[i].strokes.map((s) => markPath(s.points).map(toPx)), LETTER_GLOW_WIDTH * layout.unit, LETTER_GLOW_MS);
    await wait(CONFIG.sparkleMs);
    if (!alive) return;
    if (f.roundDone) return endRound();
    progress = freshLetter();
    following = startPlans(cur());
    phase = 'trace';
    beginStroke();
  }

  // Every letter is done: Jugnu flies the usual way any stroke she traced the
  // other way (a habit, never a fail), the round is logged, and its light comes on.
  async function endRound() {
    phase = 'held';
    if (reversedStrokes.length > 0) {
      const paths = reversedStrokes;
      reversedStrokes = [];
      showNote(traceNote('reversed'));
      for (const pts of paths) {
        const flown = await jugnu.demo(pts, CONFIG.demoMs, CONFIG.hopMs);
        if (!alive || !flown) return;
      }
      jugnu.hopTo(home(), CONFIG.hopMs);
      await wait(CONFIG.hopMs);
      if (!alive) return;
    }
    logAttempt(nameLogEntry({ round: rp.round + 1, stage: stage(), letters: stats }));
    // A helped letter was traced again, so the round itself never starts again.
    const r = finishRound(rp, { assisted: false }, rounds);
    const finished = rp.round;
    rp = r.state;
    if (r.allDone || isCopyRound(rp.round, rounds)) {
      // PR 1: the copy-it round is not built yet, so her practice ends here.
      clearRounds(NAME_ID);
      drawLights(finished);
      return finishName();
    }
    saveRounds(NAME_ID, rp);
    drawLights(finished);
    letterChime();
    await wait(CONFIG.roundPauseMs);
    if (!alive) return;
    ink.clear();
    fx.clear();
    np = startNameRound(placed.length);
    stats = freshStats();
    letterInk = placed.map(() => []);
    progress = freshLetter();
    following = startPlans(cur());
    phase = 'trace';
    beginStroke();
  }

  // Her name glows, letter by letter, then the shell takes her back to the name book.
  async function finishName() {
    phase = 'held';
    redraw();
    speak('letterDone');
    letterChime();
    placed.forEach((c, i) => {
      later(() => fx.letterGlow(c.strokes.map((s) => markPath(s.points).map(toPx)), LETTER_GLOW_WIDTH * layout.unit, CONFIG.letterGlowMs), i * NAME_GLOW_STEP_MS);
    });
    await wait(CONFIG.letterGlowMs + placed.length * NAME_GLOW_STEP_MS);
    if (!alive) return;
    phase = 'done';
    // No star yet: the star needs round 3 (PR 2).
    onDone({ id: NAME_ID, star: false, helped: rp.helped, ...sitting, review: false, partial: true });
  }

  function styleFor(q) {
    const states = attempt.trackers.map((t) => t.update(q));
    const on = states.filter((s) => s.onPath);
    if (on.length > 0 && on.every((s) => s.wrongWay)) attempt.wrongWay = true;
    return { dim: !attempt.startOk || on.length === 0, glow: !attempt.wrongWay };
  }

  const toChar = (p) => {
    const q = pxToLetter(p, layout, layout.offset);
    return { u: { x: q[0], y: q[1] }, q };
  };

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
    hush();
    cancelLater();
    fx.clear();
    ink.settle();
    jugnu.restAt(startDot());
    const { u, q } = toChar(p);
    const candidates = planCandidates(cur(), following);
    attempt = {
      candidates,
      trackers: candidates.flatMap((v) => [createLiveTracker(v.points, progress.stage, cfg), createLiveTracker([...v.points].reverse(), progress.stage, cfg)]),
      startOk: candidates.some((v) => dist(q, v.points[0]) <= stageCfg().startRadius || dist(q, v.points[v.points.length - 1]) <= stageCfg().startRadius),
      wrongWay: false,
      points: [q],
    };
    ink.begin(u, styleFor(q));
  }

  function endStroke() {
    const a = attempt;
    attempt = null;
    const id = ink.end();
    const st = progress.stage;
    const current = progress.current;
    const letter = cur();
    const pick = pickCandidate(a.points, a.candidates, st, score, cfg);
    let result = pick.result;
    const counted = result.reason !== 'too-short';
    if (counted && !a.startOk) result = { ...result, ok: false, reason: 'wrong-start', startOk: false };
    if (counted && result.reason === 'wrong-start') {
      sitting.wrongStarts += 1;
      stats[np.letter].wrongStarts += 1;
    }
    if (counted && !result.ok) stats[np.letter].misses += 1;
    const variant = result.ok ? variantLabel(pick.variant) : 'none';
    let lift;
    if (result.ok) {
      following = advancePlans(a.points, letter, following, st, score);
      if (result.reversed) {
        reversedStrokes.push(pick.variant.points);
        stats[np.letter].reversed += 1;
      }
      if (following.length === 0) following = [{ plan: pick.variant.plan, done: progress.done }];
      lift = applyPlanPass(progress, shown().done);
      letterInk[np.letter].push(id);
    } else {
      lift = applyLift(progress, { ok: false, counted });
      if (lift.assist) following = [{ plan: shown().plan, done: lift.state.done }];
    }

    logAttempt({ ...strokeLogEntry({ char: letter.id, stage: st, pick, result, variant, counted, assisted: lift.assist }), in: NAME_ID, letter: np.letter });

    progress = lift.state;
    if (!rp.helped && isHelp(st, lift)) {
      rp = markHelp(rp);
      saveRounds(NAME_ID, rp);
    }
    updateDebug();

    if (result.ok) {
      chime();
      fx.sparkle(markPath(pick.variant.points).map(toPx), CONFIG.sparkleMs);
      if (lift.letterDone) return endLetter();
      goodStrokes += 1;
      if (goodStrokes % CONFIG.goodEvery === 0) speak('good');
      redraw();
      later(beginStroke, CONFIG.sparkleMs);
      return;
    }
    ink.fade(id, CONFIG.fadeMs);
    if (lift.assist) return assist(current, lift.letterDone);
    react(result.reason, lift.demo, pick.variant.points);
  }

  const stopTracking = trackSinglePointer(els.area, {
    onStart: (p) => {
      unlock();
      if (!layout || turned) return;
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

  function pause() {
    if (turned || !alive) return;
    if (holding) {
      const h = holding;
      holding = null;
      h();
    }
    if (attempt) {
      attempt = null;
      ink.drop();
    }
    hush();
    ink.settle();
    jugnu.pause();
    pauseLater();
    const playAnimations = pauseAnimations();
    turned = () => {
      playAnimations();
      jugnu.rewind();
      jugnu.resume();
      resumeLater();
    };
  }

  function resume() {
    if (!turned) return;
    const carryOn = turned;
    turned = null;
    if (alive) carryOn();
  }

  return {
    pause,
    resume,
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
      clearTimeout(noteTimer);
      if (els.note) { els.note.classList.remove('on'); els.note.hidden = true; }
      els.lines.replaceChildren();
      els.jugnu.hidden = true;
      if (els.rounds) {
        els.rounds.replaceChildren();
        els.rounds.hidden = true;
      }
      debug?.remove();
    },
  };
}
