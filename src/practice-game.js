// practice-game.js — the practice page on screen (Slice 5L), for one letter or number.
// The rules (src/practice.js): one set of four lines with three spaces side by side.
//   Space 1: the dotted letter to trace, with numbered start dots and arrows, like
//            round 1. Jugnu flies each stroke first; after 3 misses on a stroke he
//            shows it again, after 5 he draws it (the space then counts as done,
//            with help; nothing starts again). It stays on the page as her model.
//   Spaces 2 and 3: blank. Jugnu writes the letter on space 1 once, then she writes
//            it on her own, judged like the copy-it round (src/copy.js), with the
//            same reasons, shown on space 1 and in her space. After 3 failed copies
//            Jugnu writes it in her space, and the space counts as done, with help.
// Each finished space lights a firefly (top right). When all three are done her
// page glows and a big arrow tile offers a fresh page with the same letter.
// She can leave at any time with back or home (the shell calls stop()).
//
// Extra practice only: nothing here reads or saves stars, rounds, reviews,
// helper levels or the practice-more list. It only adds 'practice' entries
// (and her strokes, marked in: 'practice') to the attempt log, and each full
// page adds to that character's page count and sticker (Slice 5L part 2).
//
// The rules of game.js hold here too: no text for her, never red, never a buzzer,
// never snap her ink, and her whole letter fades only after a failed copy, once
// its reason has been shown. Nothing moves or plays while her finger is down.
//
// Slice 5O: undo one stroke (src/undo.js; the shell's undo button calls undo()).
// Space 1: her last stroke that counted goes, with what it scored. Spaces 2 and
// 3: her last stroke goes and the judging wait is cancelled (only the hint wait
// comes back). A finished space is never undone.

import {
  drawLines, drawStageTrack, drawPracticeSpaces, createInk, createFx, letterToPx, pxToLetter,
  START_DOT_RADIUS, trackLook, markPath, INK,
} from './render.js';
import { trackSinglePointer } from './input.js';
import { DEFAULTS, dist, createLiveTracker, withMinLeeway } from './geometry.js';
import {
  variantLabel, pickCandidate, planCandidates, advancePlans, startPlans, planStrokes, planChar, scoreMark,
} from './variants.js';
import { CONFIG, copyWaitFor, initialState, applyLift, applyPlanPass, strokeLogEntry } from './progress.js';
import { copyLogEntry, copyShow, compareIds, boxOf, refBox, POSITION_LINES } from './copy.js';
import { traceNote, copyNote } from './notes.js';
import {
  practiceLayout, startPage, finishTrace, judgeSpace, nextPage, fireflies, practiceLogEntry, toSpace, scoreSpace, spaceStatus,
} from './practice.js';
import { logAttempt, readProfile, savePracticePage } from './storage.js';
import { speak, unlock, hush, chime, letterChime, popSound, setProfile } from './audio.js';
import { createJugnu, restingSpot } from './jugnu.js';
import { loadChar, pauseAnimations } from './game.js';
import { DUE_MARK, NEXT_PAGE } from './art.js';
import { EMPTY_UNDO, pushUndo, popUndo, canUndo, undoLogEntry } from './undo.js';

const TRAIL_WIDTH = 0.16;       // Jugnu's glowing trail, line units
const LINE_GLOW_WIDTH = 0.03;   // a guide line's gold glow (lowercase line position)
const LETTER_GLOW_WIDTH = 0.12; // the whole page's glow at the end
const PART_GLOW_WIDTH = 0.09;   // the part she left out, glowing on space 1
const PLAIN_INK = { dim: false, glow: true }; // her copies: always full and glowing
const TRACE_STAGE = 1;          // space 1 is traced like round 1

// Plays practice pages for one character. els: { area, lines, ink, fx, jugnu, rounds, note, next }.
// Returns { stop(), pause(), resume() }.
export async function startPractice(els, { charId, manifest = [] }) {
  const char = await loadChar(charId, manifest);
  const rtl = char.direction === 'rtl'; // an Urdu letter (Slice 10D): Jugnu perches to the right of start dots
  if (!char) return { stop() {} };
  const strokes = char.strokes; // the default plan: the model, and Jugnu's demonstrations
  const others = (await Promise.all(compareIds(char.id).filter((id) => id !== char.id).map((id) => loadChar(id, manifest)))).filter(Boolean);
  const ink = createInk(els.ink);
  const fx = createFx(els.fx);
  let layout = null;
  let cfg = DEFAULTS; // the stage tolerances with the 45 px floor, for this screen
  const toPx = (p) => letterToPx(layout, layout.offset)(p);
  const jugnu = createJugnu(els.jugnu, (p) => (layout ? toPx(p) : [0, 0]), { rtl });
  setProfile(readProfile());

  let page = startPage();
  let pageNo = 1;               // pages this sitting (the log's `page`)
  let progress = initialState(strokes.length); // space 1's strokes (stage 1)
  let following = startPlans(char);
  const shown = () => following[0];
  const planNow = () => planStrokes(char, shown().plan);
  let reversedStrokes = [];
  let trace = { misses: 0, wrongStarts: 0, reversed: 0 }; // space 1, for the log
  let copy = null;              // spaces 2 and 3: { strokes, ids, hinted }
  let herCopies = [];           // her passed copies on this page (page units), for the glow at the end
  let goodStrokes = 0;
  let undoList = EMPTY_UNDO;    // Slice 5O: her strokes she may take back, last on top
  let phase = 'trace';          // 'trace' | 'held' | 'done' (as game.js)
  let alive = true;
  let attempt = null;
  let holding = null;
  let turned = null;

  const score = (child, ref, st) => scoreMark(child, ref, st, cfg);
  const stageCfg = () => cfg.stages[TRACE_STAGE];
  const ref = () => planNow()[progress.current].points;
  const startDot = () => ref()[0];
  const home = () => restingSpot(layout, layout.offset, undefined, rtl); // Slice 5O part 2: in the button column, under undo
  const bandWidth = () => trackLook(TRACE_STAGE).band * layout.unit;
  const modelPaths = () => strokes.map((s) => markPath(s.points));
  const allDone = (c) => c.strokes.map(() => true);

  // ---- delayed steps (as game.js) ----
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

  // ---- the fireflies, top right: one per space ----
  function drawLights(lit = -1) {
    if (!els.rounds) return;
    els.rounds.replaceChildren(...fireflies(page).map((kind, i) => {
      const el = document.createElement('i');
      el.className = `rl ff ${kind}${i === lit ? ' lit' : ''}`;
      el.innerHTML = DUE_MARK;
      return el;
    }));
    els.rounds.hidden = false;
  }

  // ---- the parent-facing line ----
  let noteTimer = 0;
  function showNote(text) {
    if (!els.note) return;
    clearTimeout(noteTimer);
    if (!text) { els.note.classList.remove('on'); return; }
    els.note.textContent = text;
    els.note.hidden = false;
    els.note.classList.add('on');
    noteTimer = setTimeout(() => els.note.classList.remove('on'), CONFIG.noteMs);
  }

  function redraw() {
    drawLines(els.lines, layout);
    drawPracticeSpaces(els.lines, layout, layout.spaces, page.space < page.spaces.length ? page.space : -1);
    // Space 1: the dotted track to trace; once traced, the model, lit gold.
    const pc = planChar(char, shown().plan);
    if (page.spaces[0].done) drawStageTrack(els.lines, layout, pc, layout.offset, { stage: TRACE_STAGE, done: allDone(pc), markers: false });
    else drawStageTrack(els.lines, layout, pc, layout.offset, { stage: TRACE_STAGE, done: progress.done });
    // A space Jugnu wrote (after 3 failed copies): his letter stays there, lit gold.
    page.spaces.forEach((s, k) => {
      if (k > 0 && s.done && s.helped) drawStageTrack(els.lines, layout, char, layout.offset + k * layout.step, { stage: TRACE_STAGE, done: allDone(char), markers: false });
    });
  }

  function applyLayout() {
    const w = els.area.clientWidth || window.innerWidth;
    const h = els.area.clientHeight || window.innerHeight;
    layout = practiceLayout(w, h, char.width, undefined, { rtl }); // Urdu: right to left (Slice 10D)
    cfg = withMinLeeway(DEFAULTS, layout.unit);
    redraw();
    ink.resize(layout, layout.offset);
    fx.resize(layout, layout.offset);
    jugnu.resize(layout.unit);
  }

  // ---- space 1: tracing, like round 1 ----

  function beginStroke() {
    redraw();
    if (progress.done.every((d) => !d)) speak('start');
    jugnu.demo(markPath(ref()), CONFIG.demoMs, CONFIG.hopMs);
  }

  function react(reason, demo, tried) {
    showNote(traceNote(demo ? 'wrong-direction' : reason));
    if (reason === 'wrong-start') {
      const starts = new Map();
      for (const v of planCandidates(char, following)) starts.set(v.points[0].join(','), v.points[0]);
      for (const p of starts.values()) fx.pulse(toPx(p), START_DOT_RADIUS * layout.unit, CONFIG.pulseMs);
    }
    if (demo) {
      speak('wrongDirection');
      jugnu.demo(markPath(ref()), CONFIG.demoMs, CONFIG.hopMs);
    } else if (reason === 'wrong-start') {
      speak('wrongStart');
      jugnu.hopTo(startDot(), CONFIG.hopMs);
    } else {
      jugnu.hopTo(tried[0], CONFIG.hopMs);
      fx.glowPath(markPath(tried).map(toPx), bandWidth(), CONFIG.trackGlowMs);
    }
  }

  // Never stuck: Jugnu draws stroke k himself, leaving a glowing trail.
  async function assist(k, letterDone) {
    phase = 'held';
    undoList = EMPTY_UNDO; // a stroke Jugnu drew is never undone, nor anything before it
    speak('assist');
    const pts = markPath(planNow()[k].points);
    const trail = fx.trail(pts.map(toPx), TRAIL_WIDTH * layout.unit);
    await jugnu.demo(pts, CONFIG.assistMs, CONFIG.hopMs, (f) => trail.set(f));
    if (!alive) return;
    trail.fadeOut(CONFIG.trailFadeMs);
    redraw();
    await wait(CONFIG.trailFadeMs);
    if (!alive) return;
    if (letterDone) return endTrace();
    phase = 'trace';
    beginStroke();
  }

  // Space 1 is traced: strokes she traced the other way are shown the usual way once.
  async function endTrace() {
    phase = 'held';
    undoList = EMPTY_UNDO;
    redraw();
    if (reversedStrokes.length > 0) {
      const paths = reversedStrokes;
      reversedStrokes = [];
      await wait(CONFIG.sparkleMs);
      if (!alive) return;
      showNote(traceNote('reversed'));
      for (const pts of paths) {
        const flown = await jugnu.demo(pts, CONFIG.demoMs, CONFIG.hopMs);
        if (!alive || !flown) return;
      }
    }
    const r = finishTrace(page, { assisted: progress.assisted });
    logAttempt(practiceLogEntry({ char: char.id, page: pageNo, space: 1, ok: !progress.assisted, helped: progress.assisted, done: true, trace }));
    page = r.state;
    return spaceDone(0, r.pageDone);
  }

  // ---- spaces 2 and 3: on her own, judged like the copy-it round ----

  // Jugnu writes the letter on space 1 once, then she writes it in her space.
  async function beginCopy() {
    copy = { strokes: [], ids: [], hinted: false };
    undoList = EMPTY_UNDO;
    redraw();
    speak('copy');
    if (!(await showOnModel(modelPaths()))) return;
    phase = 'trace';
  }

  // Jugnu draws `paths` (page letter units), each leaving a glowing trail, then
  // the trails fade and he flies home. Resolves false if stopped.
  async function showOnModel(paths, ms = CONFIG.copyDemoMs) {
    phase = 'held';
    const trails = [];
    for (const path of paths) {
      const trail = fx.trail(path.map(toPx), TRAIL_WIDTH * layout.unit);
      trails.push(trail);
      const flown = await jugnu.demo(path, ms, CONFIG.hopMs, (f) => trail.set(f));
      if (!alive || !flown) return false;
    }
    for (const t of trails) t.fadeOut(CONFIG.trailFadeMs);
    jugnu.hopTo(home(), CONFIG.hopMs);
    await wait(Math.max(CONFIG.trailFadeMs, CONFIG.hopMs));
    return alive;
  }

  function endCopyStroke(a) {
    const id = ink.end();
    copy.strokes.push(a.points);
    copy.ids.push(id);
    undoList = pushUndo(undoList, { kind: 'copy', id });
    const status = spaceStatus(copy.strokes, char, page.space, layout.step, { others });
    const { action, next, plan } = status;
    if (action === 'judge-now') judgeCopy();
    else if (action === 'judge-soon') later(judgeCopy, copyWaitFor(status)); // Urdu: longer while dots are to come (Slice 10C)
    else later(() => hintCopy(markPath(planStrokes(char, plan)[next].points)), CONFIG.copyHintMs);
  }

  // She stopped part way: Jugnu draws the next stroke on space 1. Not judged, not logged.
  async function hintCopy(path) {
    if (phase !== 'trace') return;
    copy.hinted = true;
    if (!(await showOnModel([path]))) return;
    phase = 'trace';
  }

  // Slice 5O part 2: before a reason shows, all her ink goes faint (it stays:
  // only a failed copy fades out afterwards). Resolves false if stopped.
  async function faintFirst() {
    ink.dimTo(INK.faintAlpha, CONFIG.faintMs);
    await wait(CONFIG.faintMs);
    return alive;
  }

  // Why the copy did not count, while her letter is still there (src/copy.js copyShow).
  async function showWhy(result) {
    // Slice 5O part 2: her ink goes faint first, so the reason is always seen on top of it.
    if (!(await faintFirst())) return false;
    const how = copyShow(result);
    const missing = result.missing ? (result.missing.paths ?? [result.missing.points]).map((pts) => markPath(pts)) : [];
    if (how === 'part') return showOnModel(missing);
    if (how === 'slow') return showOnModel(modelPaths(), CONFIG.copySlowMs);
    phase = 'held';
    const space = layout.spaces[page.space];
    const hers = boxOf(copy.strokes);
    if (how === 'lines') {
      for (const y of POSITION_LINES[result.reason] ?? []) {
        const py = layout.top + y * layout.unit;
        fx.partGlow([[space.x0, py], [space.x1, py]], LINE_GLOW_WIDTH * layout.unit, CONFIG.copyReasonMs);
      }
    }
    if (how === 'size' && hers) {
      // A dashed outline the model's size, standing on the lines, lined up with her letter.
      const model = refBox(char);
      const [x0, y0] = toPx([hers.cx - model.w / 2 - 0.08, model.y0 - 0.08]);
      const [x1, y1] = toPx([hers.cx + model.w / 2 + 0.08, model.y1 + 0.08]);
      fx.outline({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, CONFIG.copyReasonMs);
    }
    if (how === 'beside') {
      // Her letter already stands beside the model (space 1): the part she left
      // out glows gold there, or, with no such part, the whole model does.
      const glow = missing.length > 0 ? missing : modelPaths();
      for (const pts of glow) fx.partGlow(pts.map(toPx), PART_GLOW_WIDTH * layout.unit, CONFIG.copyReasonMs);
    }
    await wait(CONFIG.copyReasonMs);
    return alive;
  }

  async function judgeCopy() {
    if (phase !== 'trace' || copy.strokes.length === 0) return;
    phase = 'held';
    undoList = EMPTY_UNDO; // a judged copy is never undone
    const k = page.space;
    const result = scoreSpace(copy.strokes, char, k, layout.step, { others });
    const r = judgeSpace(page, { ok: result.ok });
    logAttempt(practiceLogEntry({
      char: char.id, page: pageNo, space: k + 1, ok: result.ok, helped: r.helpedOut, done: r.spaceDone,
      attempt: r.fails + (result.ok ? 1 : 0), copy: copyLogEntry({ char: char.id, result, attempt: r.fails + (result.ok ? 1 : 0), helped: r.helpedOut }),
    }));
    showNote(copyNote(result));
    if (result.ok) {
      chime();
      for (const pts of copy.strokes) fx.sparkle(pts.map(toPx), CONFIG.sparkleMs);
      herCopies.push(...copy.strokes);
      await wait(CONFIG.sparkleMs);
      if (!alive) return;
      // Habits are coached, never failed: Jugnu shows the usual way once, on space 1.
      if (copyShow(result) !== 'none' && !(await showOnModel(modelPaths()))) return;
      page = r.state;
      return spaceDone(k, r.pageDone);
    }
    speak('copyAgain');
    if (!(await showWhy(result))) return;
    for (const id of copy.ids) ink.fade(id, CONFIG.copyFadeMs);
    ink.dimTo(1, CONFIG.faintMs, ink.ids().filter((id) => !copy.ids.includes(id))); // the rest of her ink comes back
    copy = { strokes: [], ids: [], hinted: false };
    page = r.state;
    if (r.helpedOut) {
      // Never stuck: Jugnu writes it in her space, and it counts as done, with help.
      await wait(CONFIG.copyFadeMs);
      if (!alive) return;
      speak('assist');
      if (!(await jugnuWrites(k))) return;
      return spaceDone(k, r.pageDone);
    }
    redraw();
    phase = 'trace';
  }

  // Jugnu writes the whole letter in space k; then it stays there, lit gold.
  async function jugnuWrites(k) {
    phase = 'held';
    const paths = modelPaths().map((pts) => toSpace(pts, k, layout.step));
    const trails = [];
    for (const path of paths) {
      const trail = fx.trail(path.map(toPx), TRAIL_WIDTH * layout.unit);
      trails.push(trail);
      const flown = await jugnu.demo(path, CONFIG.assistMs, CONFIG.hopMs, (f) => trail.set(f));
      if (!alive || !flown) return false;
    }
    redraw();
    for (const t of trails) t.fadeOut(CONFIG.trailFadeMs);
    jugnu.hopTo(home(), CONFIG.hopMs);
    await wait(Math.max(CONFIG.trailFadeMs, CONFIG.hopMs));
    return alive;
  }

  // ---- spaces and pages ----

  // Space k is finished: its firefly lights. Then the next space, or the page is done.
  async function spaceDone(k, pageDone) {
    phase = 'held';
    drawLights(k);
    letterChime();
    redraw();
    if (pageDone) return finishPage();
    await wait(CONFIG.roundPauseMs);
    if (!alive) return;
    begin();
  }

  function begin() {
    if (page.space === 0) {
      phase = 'trace';
      return beginStroke();
    }
    return beginCopy();
  }

  // The whole page glows; then the big arrow tile offers a fresh page.
  // Slice 5L part 2: the page counts (td.pages), and its sticker moves to the
  // newest place on her shelf of finds. Stars, reviews and helpers are untouched.
  async function finishPage() {
    phase = 'held';
    savePracticePage(char.id);
    redraw();
    speak('letterDone');
    let lines = modelPaths().map((pts) => pts.map(toPx));
    page.spaces.forEach((s, k) => {
      if (k > 0 && s.helped) lines = lines.concat(modelPaths().map((pts) => toSpace(pts, k, layout.step).map(toPx)));
    });
    lines = lines.concat(herCopies.map((pts) => pts.map(toPx)));
    fx.letterGlow(lines, LETTER_GLOW_WIDTH * layout.unit, CONFIG.letterGlowMs);
    jugnu.hopTo(home(), CONFIG.hopMs);
    await wait(CONFIG.letterGlowMs);
    if (!alive) return;
    phase = 'done';
    if (els.next) {
      els.next.hidden = false;
      // Jugnu perches on top of the arrow tile (left column), out of her page.
      const box = els.next.getBoundingClientRect();
      jugnu.hopTo(pxToLetter([box.left + box.width / 2, box.top - 4], layout, layout.offset), CONFIG.hopMs);
    }
  }

  // The arrow tile: a fresh page with the same letter, space 1 guided again.
  function freshPage() {
    if (phase !== 'done' || !alive) return;
    popSound();
    if (els.next) els.next.hidden = true;
    page = nextPage(page);
    pageNo += 1;
    progress = initialState(strokes.length);
    following = startPlans(char);
    reversedStrokes = [];
    trace = { misses: 0, wrongStarts: 0, reversed: 0 };
    copy = null;
    herCopies = [];
    undoList = EMPTY_UNDO;
    ink.clear();
    fx.clear();
    showNote(null);
    applyLayout();
    drawLights();
    begin();
  }

  // ---- her finger ----

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
    const { u, q } = toChar(p);
    if (page.space > 0) {
      jugnu.stop(); // stays out of the way
      attempt = { copy: true, points: [q] };
      ink.begin(u, PLAIN_INK);
      return;
    }
    jugnu.restAt(startDot());
    const candidates = planCandidates(char, following);
    const r = stageCfg().startRadius;
    attempt = {
      candidates,
      trackers: candidates.flatMap((v) => [createLiveTracker(v.points, TRACE_STAGE, cfg), createLiveTracker([...v.points].reverse(), TRACE_STAGE, cfg)]),
      startOk: candidates.some((v) => dist(q, v.points[0]) <= r || dist(q, v.points[v.points.length - 1]) <= r),
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
    const current = progress.current;
    const pick = pickCandidate(a.points, a.candidates, TRACE_STAGE, score, cfg);
    let result = pick.result;
    const counted = result.reason !== 'too-short';
    if (counted && !a.startOk) result = { ...result, ok: false, reason: 'wrong-start', startOk: false };
    if (counted && result.reason === 'wrong-start') trace.wrongStarts += 1;
    if (counted && !result.ok) trace.misses += 1;
    const variant = result.ok ? variantLabel(pick.variant) : 'none';
    // What this stroke may change, as it was before it (an undo puts it back).
    const snap = { progress, following, reversedStrokes: [...reversedStrokes], goodStrokes, reversed: result.reversed === true };
    let lift;
    if (result.ok) {
      following = advancePlans(a.points, char, following, TRACE_STAGE, score);
      if (result.reversed) {
        reversedStrokes.push(pick.variant.points);
        trace.reversed += 1;
      }
      if (following.length === 0) following = [{ plan: pick.variant.plan, done: progress.done }];
      lift = applyPlanPass(progress, shown().done);
    } else {
      lift = applyLift(progress, { ok: false, counted });
      if (lift.assist) following = [{ plan: shown().plan, done: lift.state.done }];
    }
    logAttempt({ ...strokeLogEntry({ char: char.id, stage: TRACE_STAGE, pick, result, variant, counted, assisted: lift.assist }), in: 'practice', page: pageNo });
    progress = lift.state;

    if (result.ok) {
      chime();
      fx.sparkle(markPath(pick.variant.points).map(toPx), CONFIG.sparkleMs);
      if (lift.letterDone) return endTrace();
      undoList = pushUndo(undoList, { kind: 'trace', id, snap });
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

  // ---- undo one stroke (Slice 5O) ----

  const undoAllowed = () => canUndo({
    list: undoList, phase, drawing: attempt !== null || holding !== null, demoing: jugnu.demoing(), paused: turned !== null, alive,
  });

  // Her last stroke goes, with anything it scored.
  function undo() {
    if (!undoAllowed()) return false;
    const { entry, list } = popUndo(undoList);
    undoList = list;
    cancelLater(); // the next stroke's demonstration, a judging wait or a hint wait
    hush();
    fx.clear();
    ink.remove(entry.id);
    showNote(null);
    const extra = { in: 'practice', page: pageNo, space: page.space + 1 };
    if (entry.kind === 'copy') {
      copy.strokes.pop();
      copy.ids.pop();
      logAttempt(undoLogEntry({ char: char.id, mode: 'copy', stroke: copy.strokes.length, extra }));
      // Nothing is judged until her next stroke; if she stopped part way, the hint still comes.
      if (copy.strokes.length > 0) {
        const { action, next, plan } = spaceStatus(copy.strokes, char, page.space, layout.step, { others });
        if (action === 'hint') later(() => hintCopy(markPath(planStrokes(char, plan)[next].points)), CONFIG.copyHintMs);
      }
      return true;
    }
    ({ progress, following, goodStrokes } = entry.snap);
    reversedStrokes = entry.snap.reversedStrokes;
    if (entry.snap.reversed) trace.reversed -= 1; // misses and wrong starts were real tries: they stay
    logAttempt(undoLogEntry({ char: char.id, mode: 'trace', stroke: undoList.length, extra }));
    beginStroke();
    return true;
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
  if (els.next) {
    els.next.innerHTML = NEXT_PAGE;
    els.next.hidden = true;
    els.next.addEventListener('click', freshPage, { signal: listening.signal });
  }

  applyLayout();
  els.jugnu.hidden = false;
  jugnu.restAt(home());
  drawLights();
  begin();

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
    undo,
    canUndo: undoAllowed,
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
      if (els.next) els.next.hidden = true;
      els.lines.replaceChildren();
      els.jugnu.hidden = true;
      if (els.rounds) {
        els.rounds.replaceChildren();
        els.rounds.hidden = true;
      }
    },
  };
}
