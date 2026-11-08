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
// the letter glows, a chime plays, then onDone({ id, star, ... }) hands back to the
// shell: star is true when no round needed Jugnu's help.
//
// Screen size: everything she draws is kept in letter units, and every change of
// size (rotation, the browser bar, split screen) redraws the guide, the track, her
// ink, the effects and Jugnu from those units. pause() and resume() hold the game
// while the tablet is upright; her place, round and strokes are kept.
//
// Slice 5I: the last round is the copy-it round. The lines are empty and the
// finished letter sits on a small model card at their right end, with a numbered
// start dot and an arrow on every stroke. Jugnu draws it once on the card, then
// she writes the whole letter anywhere on the lines. It is judged as a whole
// (src/copy.js) once she has drawn enough strokes, or CONFIG.copyWaitMs after her
// last lift when fewer strokes make the whole letter joined. If she stops part
// way, after CONFIG.copyHintMs Jugnu shows the next stroke on the card (a hint,
// not a fail). A fail: her letter fades and Jugnu draws, on the card, the stroke
// that went wrong (all of it when the size was wrong); she tries again. After
// CONFIG.copyTries failed copies the round counts as done, with help (no star).
//
// Slice 5I part 2: a review (`review: true`) is the copy-it round alone. It shows
// one round light, and never reads, saves or clears her saved practice rounds.
// onDone also reports the sitting, for the review schedule and the practice-more
// list (src/review.js): { id, star, helped, failedCopies, wrongStarts, mirrored, review }.
//
// Slice 5J: stroke plans and shape judging.
// - Rounds 1 and 2 accept any allowed stroke plan (src/variants.js): the
//   default plan is shown until her strokes leave it, then her plan's track,
//   start dots and help follow. Each stroke is still checked for start,
//   direction and shape.
// - The copy-it round is judged by shape (src/copy.js). Start points, direction
//   and order never fail a copy: when they differ from the default plan Jugnu
//   replays the usual way once on the card; a mirrored letter passes and Jugnu
//   shows it the right way round once.
// - A failed copy shows why before her letter fades: her letter beside the model
//   with the part she missed glowing, a dashed outline at the right size, Jugnu
//   drawing the missing part, or Jugnu tracing the whole model slowly.
// - A short parent-facing line (src/notes.js) at the top says what the app saw.

import {
  computeLayout, drawLines, drawStageTrack, letterOffset, createInk, createFx, letterToPx, pxToLetter,
  START_DOT_RADIUS, trackLook, modelCard, drawModelCard, CARD,
} from './render.js';
import { trackSinglePointer } from './input.js';
import { DEFAULTS, dist, createLiveTracker } from './geometry.js';
import {
  variantLabel, pickCandidate, planCandidates, advancePlans, startPlans, planStrokes, planChar,
} from './variants.js';
import {
  CONFIG, ROUNDS, initialState, applyLift, applyPlanPass, roundCount, stageForRound,
  startRounds, markHelp, isHelp, finishRound, starEarned, roundLights, isCopyRound, finishCopy,
} from './progress.js';
import { scoreCopy, copyStatus, copyLogEntry, copyShow, compareIds, boxOf, refBox } from './copy.js';
import { traceNote, copyNote } from './notes.js';
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
// Width of Jugnu's trail on the model card, in the card's own line units.
const CARD_TRAIL_WIDTH = 0.2;
// Her ink in the copy round: always full and glowing (nothing is judged until she has finished).
const PLAIN_INK = { dim: false, glow: true };

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
export async function startGame(els, { charId, manifest = [], debugOn = false, review = false, onDone = () => {} }) {
  const char = await loadChar(charId, manifest);
  if (!char) {
    const panel = debugOn ? createDebugPanel(0) : null;
    panel?.message(canLoad(charId, manifest) ? `No file for ${charId}` : `${charId} is not in data/chars/index.json`);
    return { stop: () => panel?.remove() };
  }

  const strokes = char.strokes; // the default plan: the model card and Jugnu's first demonstrations
  // The copy round compares her letter with the board's other characters (and look-alikes).
  const others = (await Promise.all(compareIds(char.id).filter((id) => id !== char.id).map((id) => loadChar(id, manifest)))).filter(Boolean);
  const ink = createInk(els.ink);
  const fx = createFx(els.fx);
  let layout = null;
  let offset = 0;
  const toPx = (p) => letterToPx(layout, offset)(p);
  const jugnu = createJugnu(els.jugnu, (p) => (layout ? toPx(p) : [0, 0]));
  const debug = debugOn ? createDebugPanel(strokes.length) : null;
  const removeCopyButton = debugOn ? createCopyAttemptsButton(() => readAttempts()) : null;

  setProfile(readProfile());
  const rounds = roundCount(ROUNDS);
  // A review starts at the last round (the copy-it round) and saves nothing to td.rounds.
  let rp = review ? { round: rounds - 1, helped: false } : startRounds(readRounds(char.id), rounds); // { round, helped }
  const keepRounds = (fn) => { if (!review) fn(); };
  // This sitting, for the practice-more list: judged copies that failed, and wrong starts.
  const sitting = { failedCopies: 0, wrongStarts: 0, mirrored: 0 };
  const freshRound = () => ({ ...initialState(strokes.length), stage: stageForRound(rp.round, rounds) });
  let progress = freshRound();
  // The stroke plans her strokes still follow this round ([{ plan, done }]); the first is shown.
  let following = startPlans(char);
  const shown = () => following[0];
  const planNow = () => planStrokes(char, shown().plan);
  let goodStrokes = 0; // passed strokes so far: a "good" line is said once per CONFIG.goodEvery
  // What a touch does now:
  // 'trace'  she draws a stroke and it is scored
  // 'held'   Jugnu is drawing a stroke, or the letter glows: a touch pauses it
  // 'done'   the letter is finished and the shell takes over: touches do nothing
  let phase = 'trace';
  let alive = true;    // false once stop() ran: async steps give up
  let attempt = null;  // the stroke her finger is drawing now
  let holding = null;  // while a finger holds a 'held' phase: how to resume
  let turned = null;   // while the tablet is upright (pause()): how to carry on
  let card = null;     // the copy round's model card for this screen size (render.js modelCard), else null
  let copy = null;     // the copy round: { strokes (her letter, letter units), ids (ink ids), fails }
  const isCopy = () => isCopyRound(rp.round, rounds);

  const stageCfg = () => DEFAULTS.stages[progress.stage];
  // The stroke Jugnu demonstrates: the first unfinished one of the shown plan.
  const ref = () => planNow()[progress.current].points;
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
    if (card) {
      debug.status(`${char.id}  round ${rp.round + 1}/${rounds}  copy it  failed copies ${copy?.fails ?? 0}/${CONFIG.copyTries}  help ${rp.helped ? 'yes (no star)' : 'no'}`, -1);
      return;
    }
    debug.status(`${char.id}  round ${rp.round + 1}/${rounds}  stage ${stage}  streak ${streak}  assisted ${assisted ? 'yes' : 'no'}  help ${rp.helped ? 'yes (no star)' : 'no'}`, progress.current);
  }

  // The round lights, top right: done, now, to come. `lit` lights one up.
  function drawLights(lit = -1) {
    if (!els.rounds) return;
    // A review shows only its one round's light.
    const lights = roundLights(rp, rounds);
    const first = review ? rounds - 1 : 0;
    els.rounds.replaceChildren(...lights.slice(first).map((kind, j) => {
      const i = j + first;
      const el = document.createElement('i');
      el.className = `rl ${kind}${i === lit ? ' lit' : ''}`;
      return el;
    }));
    els.rounds.hidden = false;
  }

  function redraw() {
    drawLines(els.lines, layout);
    if (card) return drawModelCard(els.lines, layout, card, char);
    drawStageTrack(els.lines, layout, planChar(char, shown().plan), offset, {
      stage: progress.stage,
      done: progress.done,
    });
  }

  // ---- the parent-facing line (src/notes.js), small, at the top ----
  let noteTimer = 0;
  function showNote(text) {
    if (!els.note) return;
    clearTimeout(noteTimer);
    if (!text) {
      els.note.classList.remove('on');
      return;
    }
    els.note.textContent = text;
    els.note.hidden = false;
    els.note.classList.add('on');
    noteTimer = setTimeout(() => els.note.classList.remove('on'), CONFIG.noteMs);
  }

  // The writing area's own size (it fills the screen), so the browser bar
  // showing or hiding is always seen.
  function applyLayout() {
    const w = els.area.clientWidth || window.innerWidth;
    const h = els.area.clientHeight || window.innerHeight;
    const full = computeLayout(w, h);
    if (isCopy()) {
      // The writing lines stop short of the model card at their right end.
      layout = { ...full, lineEnd: modelCard(full, 0, char).lineEnd };
      offset = letterOffset(layout, char.width);
      card = modelCard(full, offset, char);
    } else {
      layout = full;
      offset = letterOffset(layout, char.width);
      card = null;
    }
    redraw();
    ink.resize(layout, offset);
    fx.resize(layout, offset);
    jugnu.resize(layout.unit);
  }

  // A stroke has just become the current one.
  // Stage 1: Jugnu flies it once, then perches at its start dot. Stage 2: Jugnu just
  // perches. Stage 3: Jugnu waits at home, out of the way.
  function beginStroke() {
    if (card) return beginCopy();
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
    showNote(traceNote(demo ? 'wrong-direction' : reason));
    if (reason === 'wrong-start') {
      const starts = new Map();
      for (const v of planCandidates(char, following)) starts.set(v.points[0].join(','), v.points[0]);
      for (const p of starts.values()) fx.pulse(toPx(p), START_DOT_RADIUS * layout.unit, CONFIG.pulseMs);
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
    const pts = planNow()[k].points;
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

  // ---- the copy-it round ----

  // The round starts: Jugnu draws the whole letter on the model card, then she writes.
  async function beginCopy() {
    copy = { strokes: [], ids: [], fails: 0 };
    redraw();
    updateDebug();
    speak('copy');
    if (!(await showOnCard(modelPaths()))) return;
    phase = 'trace';
  }

  // The default plan's lines: the model letter, the usual way.
  const modelPaths = () => strokes.filter((s) => s.kind === 'line').map((s) => s.points);

  // Jugnu draws `paths` (letter units of the card's letter) on the model card,
  // each leaving a glowing trail, then the trails fade and he flies home.
  // `ms` is how long each path takes. Resolves false if stopped.
  async function showOnCard(paths, ms = CONFIG.copyDemoMs) {
    phase = 'held';
    const trails = [];
    for (const path of paths) {
      const pts = path.map(card.toMain);
      const trail = fx.trail(pts.map(toPx), CARD_TRAIL_WIDTH * card.k);
      trails.push(trail);
      const flown = await jugnu.demo(pts, ms, CONFIG.hopMs, (f) => trail.set(f));
      if (!alive || !flown) return false;
    }
    for (const t of trails) t.fadeOut(CONFIG.trailFadeMs);
    jugnu.hopTo(home(), CONFIG.hopMs);
    await wait(Math.max(CONFIG.trailFadeMs, CONFIG.hopMs));
    return alive;
  }

  // Her finger lifted in the copy round (src/copy.js copyStatus): judge now if
  // the letter is complete; judge after a short wait if it reads as a whole
  // joined letter; if it reads as unfinished, wait longer and then let Jugnu
  // show the next stroke on the card. Any new touch cancels the wait.
  function endCopyStroke(a) {
    const id = ink.end();
    copy.strokes.push(a.points);
    copy.ids.push(id);
    const { action, next, plan } = copyStatus(copy.strokes, char, { others });
    if (action === 'judge-now') judgeCopy();
    else if (action === 'judge-soon') later(judgeCopy, CONFIG.copyWaitMs);
    else later(() => hintCopy(planStrokes(char, plan)[next].points), CONFIG.copyHintMs);
  }

  // She stopped part way: Jugnu draws the next stroke on the card. Her strokes
  // stay on the lines, nothing is judged or logged, and it is not a failed copy.
  async function hintCopy(path) {
    if (phase !== 'trace') return;
    if (!(await showOnCard([path]))) return;
    phase = 'trace';
  }

  // Why the copy failed, shown while her letter is still there (src/copy.js copyShow).
  // Resolves false if stopped.
  async function showWhy(result) {
    const how = copyShow(result);
    if (how === 'part') return showOnCard([result.missing.points]);
    if (how === 'slow') return showOnCard(modelPaths(), CONFIG.copySlowMs);
    phase = 'held';
    const hers = boxOf(copy.strokes);
    if (how === 'size' && hers) {
      // A dashed outline the model's size, standing on the lines (sky line to
      // grass line, where a letter this size belongs), lined up with her letter.
      const model = refBox(char);
      const [x0, y0] = toPx([hers.cx - model.w / 2 - 0.08, model.y0 - 0.08]);
      const [x1, y1] = toPx([hers.cx + model.w / 2 + 0.08, model.y1 + 0.08]);
      fx.outline({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, CONFIG.copyReasonMs);
    }
    if (how === 'beside' && hers) {
      // Her letter, as small as the model's, on a card of its own just left of the model card.
      const k = card.k * 0.95;
      const scale = (1 / Math.max(hers.h, 0.01)) * k;
      const w = hers.w * scale;
      const h = hers.h * scale;
      const box = { w: w + 0.3 * card.k, h: card.h, x: card.x - w - 0.3 * card.k - 0.08 * layout.unit, y: card.y };
      const ox = box.x + 0.15 * card.k;
      const oy = box.y + (box.h - h) / 2;
      const lines = copy.strokes.map((pts) => pts.map(([x, y]) => [ox + (x - hers.x0) * scale, oy + (y - hers.y0) * scale]));
      fx.beside(lines, box, CARD.letter.width * card.k, CONFIG.copyReasonMs);
      if (result.missing) fx.partGlow(result.missing.points.map(card.toMain).map(toPx), CARD.letter.width * card.k, CONFIG.copyReasonMs);
    }
    await wait(CONFIG.copyReasonMs);
    return alive;
  }

  async function judgeCopy() {
    if (phase !== 'trace' || copy.strokes.length === 0) return;
    phase = 'held';
    const result = scoreCopy(copy.strokes, char, { others });
    const r = finishCopy(rp, { ok: result.ok, fails: copy.fails }, rounds);
    logAttempt(copyLogEntry({ char: char.id, result, attempt: copy.fails + 1, helped: r.helpedOut }));
    if (!result.ok) sitting.failedCopies += 1;
    if (result.ok && result.mirrored) sitting.mirrored += 1;
    sitting.wrongStarts += result.strokes.filter((x) => x.startOk === false && x.reason !== 'extra-stroke').length;
    debug?.copy(result);
    showNote(copyNote(result));
    if (result.ok) {
      chime();
      for (const pts of copy.strokes) fx.sparkle(pts.map(toPx), CONFIG.sparkleMs);
      await wait(CONFIG.sparkleMs);
      if (!alive) return;
      // Habits are coached, never failed: a mirrored letter, or one drawn another
      // way than the default plan, passes, and Jugnu shows the usual way once.
      if (copyShow(result) !== 'none' && !(await showOnCard(modelPaths()))) return;
      return afterRound(r, copy.strokes);
    }
    // Why it failed, while her letter is still there. Then her letter fades and she tries again.
    copy.fails = r.fails;
    updateDebug();
    speak('copyAgain');
    if (!(await showWhy(result))) return;
    for (const id of copy.ids) ink.fade(id, CONFIG.copyFadeMs);
    copy.strokes = [];
    copy.ids = [];
    if (r.helpedOut) return afterRound(r, null);
    phase = 'trace';
  }

  // Every stroke of the round is done. If Jugnu drew one, the round starts
  // again; otherwise its light comes on and the next round starts. After the
  // last round the whole letter glows.
  async function endRound() {
    phase = 'held';
    redraw();
    return afterRound(finishRound(rp, { assisted: progress.assisted }, rounds));
  }

  // A round ended with `r` (finishRound or finishCopy). herLetter: her copied
  // strokes, which glow at the end in place of the model.
  async function afterRound(r, herLetter = null) {
    phase = 'held';
    const finished = rp.round;
    rp = r.state;
    if (r.allDone) {
      keepRounds(() => clearRounds(char.id));
      drawLights(finished);
      return finishLetter(herLetter);
    }
    keepRounds(() => saveRounds(char.id, rp));
    drawLights(r.repeat ? -1 : finished);
    letterChime();
    updateDebug();
    await wait(CONFIG.roundPauseMs);
    if (!alive) return;
    ink.clear();
    fx.clear();
    progress = freshRound();
    following = startPlans(char);
    applyLayout(); // the copy round lays the screen out round its model card
    phase = 'trace';
    beginStroke();
  }

  // The last round is done: the whole letter glows and a chime plays, then the
  // shell takes her back to the board. star: no round needed Jugnu's help.
  // In the copy round her own letter glows; if Jugnu helped her out, the model does.
  async function finishLetter(herLetter = null) {
    phase = 'held';
    redraw();
    updateDebug();
    speak('letterDone');
    letterChime();
    const model = strokes.filter((s) => s.kind === 'line').map((s) => s.points);
    let lines = model.map((pts) => pts.map(toPx));
    let width = LETTER_GLOW_WIDTH * layout.unit;
    if (herLetter) lines = herLetter.map((pts) => pts.map(toPx));
    else if (card) {
      lines = model.map((pts) => pts.map(card.toMain).map(toPx));
      width *= CARD.scale;
    }
    fx.letterGlow(lines, width, CONFIG.letterGlowMs);
    await wait(CONFIG.letterGlowMs);
    if (!alive) return;
    phase = 'done';
    onDone({ id: char.id, star: starEarned(rp), helped: rp.helped, ...sitting, review });
  }

  // Ink style for her next point, from the live trackers. She is on the path when
  // any candidate has her on it; going the wrong way stops the glow until she lifts.
  function styleFor(q) {
    const states = attempt.trackers.map((t) => t.update(q));
    const on = states.filter((s) => s.onPath);
    if (on.length > 0 && on.every((s) => s.wrongWay)) attempt.wrongWay = true;
    return { dim: !attempt.startOk || on.length === 0, glow: !attempt.wrongWay };
  }

  // A touch in area px -> letter units: q for scoring, u for her ink.
  const toChar = (p) => {
    const q = pxToLetter(p, layout, offset);
    return { u: { x: q[0], y: q[1] }, q };
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
    if (card) {
      // Copy it: no track to follow, so her ink is always full.
      attempt = { copy: true, points: [q] };
      ink.begin(u, PLAIN_INK);
      return;
    }
    const candidates = planCandidates(char, following);
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
    if (a.copy) return endCopyStroke(a);
    const id = ink.end();
    const stage = progress.stage;
    const current = progress.current;
    const pick = pickCandidate(a.points, a.candidates, stage);
    let result = pick.result;
    // Too short to be a real try (a tap): logged, but never added to the fail streak.
    const counted = result.reason !== 'too-short';
    if (counted && !a.startOk) result = { ...result, ok: false, reason: 'wrong-start', startOk: false };
    if (counted && result.reason === 'wrong-start') sitting.wrongStarts += 1;
    const variant = result.ok ? variantLabel(pick.variant) : 'none';
    let lift;
    if (result.ok) {
      // A passed stroke: keep the plans it fits, and show the first of them.
      following = advancePlans(a.points, char, following, stage);
      if (following.length === 0) following = [{ plan: pick.variant.plan, done: progress.done }]; // cannot happen: the pick passed
      lift = applyPlanPass(progress, shown().done);
    } else {
      lift = applyLift(progress, { ok: false, counted });
      // Never stuck: Jugnu draws the shown plan's stroke, so from now on she follows that plan.
      if (lift.assist) following = [{ plan: shown().plan, done: lift.state.done }];
    }

    logAttempt({
      time: new Date().toISOString(),
      char: char.id,
      stage,
      plan: pick.variant.plan, // Slice 5J: which stroke plan the stroke was scored in (0: the default)
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
      keepRounds(() => saveRounds(char.id, rp)); // she may leave now: the help is remembered
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
        styles.push(attempt.copy ? PLAIN_INK : styleFor(q));
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

  // The tablet is upright: hold everything still. A stroke her finger is drawing
  // is dropped without being scored or logged; nothing else is lost.
  function pause() {
    if (turned || !alive) return;
    if (holding) {
      const h = holding;
      holding = null;
      h(); // undo her finger's hold first; the pause below holds everything again
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
      jugnu.rewind(); // a stroke Jugnu was demonstrating starts again from its start
      jugnu.resume();
      resumeLater();
    };
  }

  // Landscape again: carry on.
  function resume() {
    if (!turned) return;
    const carryOn = turned;
    turned = null;
    if (alive) carryOn();
  }

  return {
    pause,
    resume,
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
      clearTimeout(noteTimer);
      if (els.note) { els.note.classList.remove('on'); els.note.hidden = true; }
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
