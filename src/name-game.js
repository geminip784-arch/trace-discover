// name-game.js — her name's rounds on screen (Slice 9C, "Write my name").
// The same rules as game.js (CLAUDE.md): no text, never red, never a buzzer,
// never erase her whole name, never snap her ink. Nothing animates while her
// finger is down.
//
// Her name sits on the four lines as one word (src/name.js nameLayout): the lines
// shrink to fit it and keep that size in every round. Each letter is its own
// character file, with its own glyph and stroke plans, placed box after box.
//
// Slice 5K: practising her name is rounds 1 and 2 only; then the star and her
// name card. The copy-it round below is what a review is, on a later day.
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
// The copy-it round (Slice 9C part 2; reviews only since Slice 5K): the lines are empty and her name
// stands on a model card above them, each letter with its numbered start dots
// and arrows. Jugnu writes it once on the card, then she writes her whole name
// anywhere on the lines. It is judged NAME_WAIT_MS after her last lift
// (src/name-copy.js scoreName): her strokes are given to the letters by where
// they are, and each letter is judged as it is on its own. Letters still to
// write at the end: Jugnu shows the next one on the card (a hint, not a fail).
// A fail shows why first, the letter it is about glowing on the card (or Jugnu
// drawing what is missing, a dashed outline at the right size, or the guide
// lines glowing), then her name fades and she writes it again. After 3 failed
// copies the review ends, with help. The fading helper (its own level,
// saved under 'name' in td.helper): level 1 the dotted ghost of her name and the
// first start dot, level 2 a start dot for each letter not begun, level 3 nothing.
// Habits (stroke order, the letters' order, a letter the other way round) never
// fail: Jugnu writes those letters the usual way on the card once.
//
// The reward: her name glows letter by letter, and Jugnu flies loops over it.
// onDone({ id: 'name', star, helped, failedCopies, wrongStarts, mirrored, review }):
// the shell saves the star, the review schedule and her name card.
//
// A review (`review: true`) is the copy-it round alone, with one round light,
// and never touches her saved rounds.

import {
  drawLines, drawStageTrack, createInk, createFx, letterToPx, pxToLetter, START_DOT_RADIUS, trackLook, markPath,
  drawModelCard, drawCopyHelper, nameHelperMarks, CARD,
} from './render.js';
import { trackSinglePointer } from './input.js';
import { DEFAULTS, dist, createLiveTracker, withMinLeeway } from './geometry.js';
import {
  variantLabel, pickCandidate, planCandidates, advancePlans, startPlans, planStrokes, planChar, scoreMark,
} from './variants.js';
import {
  CONFIG, ROUNDS, COPY_STAGE, initialState, applyLift, applyPlanPass, roundCount, stageForRound,
  startRounds, startReview, markHelp, isHelp, finishRound, roundLights, strokeLogEntry,
  startNameRound, finishNameLetter, finishCopy, starEarned, startHelper, applyHelperCopy,
} from './progress.js';
import { traceNote, nameCopyNote } from './notes.js';
import {
  logAttempt, readProfile, readRounds, saveRounds, clearRounds, readHelper, saveHelper,
} from './storage.js';
import { speak, unlock, hush, chime, letterChime, setProfile } from './audio.js';
import { createJugnu } from './jugnu.js';
import { createDebugPanel } from './debug.js';
import { loadChar, pauseAnimations } from './game.js';
import { NAME_ID, nameLayout, nameCopyLayout, nameWidth, placeLetters, nameLogEntry } from './name.js';
import { scoreName, nameCompareIds, assignStrokes, nameCopyLogEntry } from './name-copy.js';
import { refBox, POSITION_LINES } from './copy.js';

const HOME = { x: 0.35, y: 0.65 };   // Jugnu's home, as in game.js
const TRAIL_WIDTH = 0.16;            // Jugnu's trail when he draws a stroke himself, line units
const LETTER_GLOW_WIDTH = 0.12;      // a letter's glow when it is done, line units
const LETTER_GLOW_MS = 900;          // one letter lights up this long
const NAME_GLOW_STEP_MS = 220;       // at the end, each letter of her name starts glowing this long after the one before
const NAME_WAIT_MS = 3000;           // the copy round (reviews): her name is judged this long after her last lift
const NAME_DEMO_MS = 700;            // the copy round (reviews): Jugnu writes each stroke of her name on the card this fast
const CARD_TRAIL_WIDTH = 0.2;        // Jugnu's trail on the card, card units
const LINE_GLOW_WIDTH = 0.03;        // a guide line's gold glow (line position reasons), line units
const STARTED_NEAR = 0.3;            // level 2: a stroke starting this near a letter's start dot begins that letter
const CELEBRATE_MS = 2600;           // Jugnu's loops over her name
const PLAIN_INK = { dim: false, glow: true };

// Plays her name. els: { area, lines, ink, fx, jugnu, rounds, note }.
// letters: the character ids of her name, in order (src/name.js nameOf).
// Returns { pause, resume, stop }.
export async function startNameGame(els, { letters, manifest = [], debugOn = false, review = false, onDone = () => {} }) {
  const loaded = await Promise.all(letters.map((id) => loadChar(id, manifest)));
  // The copy round (reviews) compares each letter with its board, its look-alikes and its twin in the other case.
  const compared = [...new Set(letters.flatMap(nameCompareIds))];
  const byId = new Map((await Promise.all(compared.map(async (id) => [id, await loadChar(id, manifest)]))).filter(([, c]) => c));
  const othersOf = (id) => nameCompareIds(id).map((x) => byId.get(x)).filter(Boolean);
  if (letters.length === 0 || loaded.some((c) => !c)) {
    const panel = debugOn ? createDebugPanel(0) : null;
    panel?.message('A letter of the name could not be loaded');
    return { stop: () => panel?.remove(), pause() {}, resume() {} };
  }
  const placed = placeLetters(loaded); // each letter in the name's units
  const width = nameWidth(loaded);
  // The whole name as one character, for the model card and the helper.
  const nameChar = { id: NAME_ID, width, strokes: placed.flatMap((c) => c.strokes) };

  const ink = createInk(els.ink);
  const fx = createFx(els.fx);
  let layout = null;
  let cfg = DEFAULTS;                 // the stage tolerances with the 45 px floor, for this screen
  const toPx = (p) => letterToPx(layout, layout.offset)(p);
  const jugnu = createJugnu(els.jugnu, (p) => (layout ? toPx(p) : [0, 0]));
  const debug = debugOn ? createDebugPanel(0) : null;
  setProfile(readProfile());

  // A practice: rounds 1 and 2. A review: one copy-it round, which never reads or saves her rounds.
  const rounds = review ? 1 : roundCount(ROUNDS);
  let rp = review ? startReview() : startRounds(readRounds(NAME_ID), rounds);
  const keepRounds = (fn) => { if (!review) fn(); };
  const isCopy = () => review;
  let card = null;    // the copy round (reviews): the model card for this screen, else null
  let copy = null;    // the copy round (reviews): { strokes, ids, fails, hinted }
  let helper = startHelper(readHelper(NAME_ID));
  const sitting = { failedCopies: 0, wrongStarts: 0, mirrored: 0 };
  const stage = () => (review ? COPY_STAGE : stageForRound(rp.round, rounds));

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

  function updateDebug(result = null) {
    if (debug && card) {
      debug.message(`name  review  copy it  helper ${helper.level} (passes ${helper.passes}, fails ${helper.fails})  failed copies ${copy?.fails ?? 0}/${CONFIG.copyTries}` +
        `  help ${rp.helped ? 'yes (no star)' : 'no'}\nunit ${layout.unit.toFixed(0)} px` +
        (result ? `\n${result.ok ? 'PASS' : `not ok: ${result.reason} (letter ${result.letter === null ? '-' : result.letter + 1})`}  order ${result.habits.order}\n` +
          result.letters.map((x) => `  ${x.id}: ${x.ok ? 'ok' : x.reason}  strokes ${x.strokes}  distance ${x.distance ?? '-'}${x.lookalike ? `  looks like ${x.lookalike}` : ''}`).join('\n') : ''));
      return;
    }
    debug?.message(`name (${placed.length} letters)  round ${rp.round + 1}/${rounds}  stage ${progress.stage}  letter ${np.letter + 1} ${cur()?.id ?? '-'}` +
      `  stroke ${progress.current + 1}  streak ${progress.streak}  retraced ${np.retraced.map((r) => (r ? 1 : 0)).join('')}` +
      `  help ${rp.helped ? 'yes (no star)' : 'no'}\nunit ${layout ? layout.unit.toFixed(0) : '-'} px  tolerance ${(stageCfg().tolerance * (layout?.unit ?? 0)).toFixed(0)} px`);
  }

  function drawLights(lit = -1) {
    if (!els.rounds) return;
    // A review shows its one round's light.
    els.rounds.replaceChildren(...roundLights(rp, rounds).map((kind, i) => {
      const el = document.createElement('i');
      el.className = `rl ${kind}${i === lit ? ' lit' : ''}`;
      return el;
    }));
    els.rounds.hidden = false;
  }

  // The whole name's track: done letters gold, the letter she traces now with its
  // start dots (in the plan her strokes follow), the letters still to come without.
  // The copy round: letters she has begun (a stroke started near its start dot), for level 2's dots.
  function started() {
    return placed.map((c) => {
      const [sx, sy] = c.strokes[0].points[0];
      return (copy?.strokes ?? []).some((pts) => Math.hypot(pts[0][0] - sx, pts[0][1] - sy) <= STARTED_NEAR);
    });
  }

  function redraw() {
    drawLines(els.lines, layout);
    if (card) {
      drawModelCard(els.lines, layout, card, nameChar, placed);
      drawCopyHelper(els.lines, layout, nameChar, layout.offset, { level: helper.level, marks: nameHelperMarks(placed, helper.level, started()) });
      return;
    }
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
    if (isCopy()) {
      layout = nameCopyLayout(w, h, width);
      const { unit, originX, top, offset } = layout;
      const c = layout.card;
      // Card units (the name's own) -> the name's units on the lines, for Jugnu and the effects.
      card = { ...c, toMain: ([x, y]) => [(c.origin[0] + x * c.k - originX) / unit - offset, (c.origin[1] + y * c.k - top) / unit] };
    } else {
      layout = nameLayout(w, h, width);
      card = null;
    }
    cfg = withMinLeeway(DEFAULTS, layout.unit);
    redraw();
    ink.resize(layout, layout.offset);
    fx.resize(layout, layout.offset);
    jugnu.resize(layout.unit);
  }

  function beginStroke() {
    if (card) return beginCopy();
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
    return afterRound(finishRound(rp, { assisted: false }, rounds));
  }

  // A round ended with `r` (finishRound or finishCopy). her: her copied strokes, which glow at the end.
  async function afterRound(r, her = null) {
    phase = 'held';
    const finished = rp.round;
    rp = r.state;
    if (r.allDone) {
      keepRounds(() => clearRounds(NAME_ID));
      drawLights(finished);
      return finishName(her);
    }
    keepRounds(() => saveRounds(NAME_ID, rp));
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
    applyLayout();
    phase = 'trace';
    beginStroke();
  }

  // ---- the copy-it round (reviews only, Slice 5K) ----

  const namePaths = () => placed.flatMap((c) => c.strokes.map((s) => markPath(s.points)));

  async function beginCopy() {
    copy = { strokes: [], ids: [], fails: 0, hinted: false };
    progress = { ...progress, stage: COPY_STAGE };
    redraw();
    updateDebug();
    speak('copy');
    if (!(await showOnCard(namePaths(), NAME_DEMO_MS))) return;
    phase = 'trace';
  }

  // Jugnu draws `paths` (the name's own units) on the model card, each leaving a
  // glowing trail; then the trails fade and he flies home. Resolves false if stopped.
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

  function endCopyStroke() {
    const id = ink.end();
    copy.strokes.push(attemptPoints);
    copy.ids.push(id);
    if (helper.level < 3) redraw(); // level 1's first dot and level 2's dots go as she begins letters
    later(judgeName, NAME_WAIT_MS);
  }

  // She stopped before the last letters: Jugnu writes the next one on the card.
  // Nothing is judged or logged, and it is not a failed copy.
  async function hintName(result) {
    copy.hinted = true; // this copy had Jugnu's help: it cannot move the helper up
    if (!(await showOnCard(result.show.paths.map((p) => markPath(p))))) return;
    phase = 'trace';
  }

  // Why her name did not count, while it is still there. Resolves false if stopped.
  async function showWhy(result) {
    const how = result.reason;
    const paths = (result.show?.paths ?? []).map((p) => markPath(p));
    if (how === 'no-letter') return showOnCard(namePaths(), CONFIG.copySlowMs);
    if (how === 'unrecognized') return showOnCard(paths, CONFIG.copySlowMs);
    if (how === 'missing-letter' || how === 'missing-stroke' || (how === 'looks-like' && result.show && !result.show.whole)) return showOnCard(paths);
    phase = 'held';
    const k = result.letter;
    // The letter it is about glows on the card.
    for (const pts of paths) fx.partGlow(pts.map(card.toMain).map(toPx), CARD.letter.width * card.k, CONFIG.copyReasonMs);
    if (POSITION_LINES[how]) {
      for (const y of POSITION_LINES[how]) {
        const py = layout.top + y * layout.unit;
        fx.partGlow([[layout.originX, py], [layout.lineEnd, py]], LINE_GLOW_WIDTH * layout.unit, CONFIG.copyReasonMs);
      }
    }
    const hers = boxOfStrokes(assignStrokes(copy.strokes, placed).groups[k] ?? []);
    if ((how === 'too-small' || how === 'too-big' || how === 'wrong-case') && hers) {
      // A dashed outline the letter's own size, standing on the lines where her letter is.
      const model = refBox(loaded[k]);
      const [x0, y0] = toPx([hers.cx - model.w / 2 - 0.08, model.y0 - 0.08]);
      const [x1, y1] = toPx([hers.cx + model.w / 2 + 0.08, model.y1 + 0.08]);
      fx.outline({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, CONFIG.copyReasonMs);
    }
    await wait(CONFIG.copyReasonMs);
    return alive;
  }

  async function judgeName() {
    if (phase !== 'trace' || copy.strokes.length === 0) return;
    phase = 'held';
    const result = scoreName(copy.strokes, placed, loaded, { othersOf });
    showNote(nameCopyNote(result, letters));
    if (result.reason === 'unfinished') return hintName(result);
    const r = finishCopy(rp, { ok: result.ok, fails: copy.fails });
    logAttempt(nameCopyLogEntry({ result, attempt: copy.fails + 1, helper: helper.level, helped: r.helpedOut, review }));
    helper = applyHelperCopy(helper, { ok: result.ok, hinted: copy.hinted });
    saveHelper(NAME_ID, helper);
    if (!result.ok) sitting.failedCopies += 1;
    if (result.ok && result.mirrored) sitting.mirrored += 1;
    sitting.wrongStarts += result.letters.reduce((n, x) => n + (x.result?.strokes ?? []).filter((t) => t.startOk === false && t.reason !== 'extra-stroke').length, 0);
    updateDebug(result);
    if (result.ok) {
      chime();
      for (const pts of copy.strokes) fx.sparkle(pts.map(toPx), CONFIG.sparkleMs);
      await wait(CONFIG.sparkleMs);
      if (!alive) return;
      // Habits coach, never fail: Jugnu writes those letters the usual way on the card.
      if (!result.habits.usual) {
        const paths = result.habits.coach.flatMap((k) => placed[k].strokes.map((s) => markPath(s.points)));
        if (paths.length && !(await showOnCard(paths, NAME_DEMO_MS))) return;
      }
      return afterRound(r, copy.strokes);
    }
    copy.fails = r.fails;
    speak('copyAgain');
    if (!(await showWhy(result))) return;
    // Her name fades (the one place her writing fades: room for a fresh copy).
    for (const id of copy.ids) ink.fade(id, CONFIG.copyFadeMs);
    copy.strokes = [];
    copy.ids = [];
    copy.hinted = false;
    redraw(); // the helper may have dropped a level: her next try has more help at once
    if (r.helpedOut) return afterRound(r, null);
    phase = 'trace';
  }

  // ---- the reward ----
  // Her name glows letter by letter (her own writing in a review, the model if
  // Jugnu helped her out), Jugnu flies loops over it, then the shell takes over.
  async function finishName(her = null) {
    phase = 'held';
    redraw();
    speak('letterDone');
    letterChime();
    const groups = her ? assignStrokes(her, placed).groups : null;
    placed.forEach((c, i) => {
      const lines = groups?.[i] ?? c.strokes.map((s) => markPath(s.points));
      later(() => fx.letterGlow(lines.map((pts) => pts.map(toPx)), LETTER_GLOW_WIDTH * layout.unit, CONFIG.letterGlowMs), i * NAME_GLOW_STEP_MS);
    });
    await wait(placed.length * NAME_GLOW_STEP_MS);
    if (!alive) return;
    // Jugnu celebrates: loops along the top of her name, a trail of sparkles behind him.
    const loops = celebrationPath();
    later(() => fx.sparkle(loops.map(toPx), CELEBRATE_MS), CONFIG.hopMs);
    const flown = await jugnu.demo(loops, CELEBRATE_MS, CONFIG.hopMs);
    if (!alive || !flown) return;
    letterChime();
    jugnu.hopTo(home(), CONFIG.hopMs);
    await wait(Math.max(CONFIG.hopMs, CONFIG.letterGlowMs - CELEBRATE_MS));
    if (!alive) return;
    phase = 'done';
    onDone({ id: NAME_ID, star: starEarned(rp), helped: rp.helped, ...sitting, review });
  }

  // Loop-the-loops from the left of her name to the right, just above the sky line (name units).
  function celebrationPath() {
    const n = Math.max(3, Math.round(placed.length * 0.75));
    const r = 0.16;
    const pts = [];
    for (let i = 0; i <= n * 24; i++) {
      const t = i / (n * 24);
      const a = -Math.PI / 2 - t * n * 2 * Math.PI;
      pts.push([t * width + r * Math.cos(a), -0.3 + r * Math.sin(a)]);
    }
    return pts;
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

  let attemptPoints = null; // the copy round (reviews): her stroke now
  function startStroke(p) {
    hush();
    cancelLater();
    fx.clear();
    ink.settle();
    const { u, q } = toChar(p);
    if (card) {
      // Copy it: no track to follow, so her ink is always full. Jugnu stays where he is.
      jugnu.stop();
      attempt = { copy: true, points: [q] };
      attemptPoints = attempt.points;
      ink.begin(u, PLAIN_INK);
      return;
    }
    jugnu.restAt(startDot());
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
    if (a.copy) return endCopyStroke();
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
      keepRounds(() => saveRounds(NAME_ID, rp));
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

const boxOfStrokes = (strokes) => {
  const pts = strokes.flat();
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs); const x1 = Math.max(...xs); const y0 = Math.min(...ys); const y1 = Math.max(...ys);
  return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};
