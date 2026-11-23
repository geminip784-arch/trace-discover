// name-practice-game.js — her name's practice page on screen (Slice 5L part 3).
// Extra practice once her name has its gold star, opened from the name book's
// practice mode (its pencil tile). The rules (src/practice.js): one practice
// space per screen, at the name book's own line size, and 3 screens make a page.
//   Screen 1: her name traced letter by letter, like the name's round 1 (the
//             full track; the letter she traces now has its numbered start dot
//             and arrow, and Jugnu flies each of its strokes first). Never stuck
//             as in round 1: Jugnu demonstrates after 3 misses on a stroke and
//             draws it after 5; then only that letter is traced again, once.
//   Screens 2 and 3: the lines are empty and her name stands on the model card
//             above them, as in the name's copy round. On screen 2 Jugnu writes
//             it once on the card, faster than in the copy round; a touch
//             during that finishes the card at once and her stroke starts. On
//             screen 3 the name is already on the card, with no demonstration
//             (src/practice.js nameCardDemo). She writes it on her own. It is judged like the
//             copy round (src/name-copy.js scoreName), with its letter-by-letter
//             reasons shown on the card; then her name fades and she writes it
//             again. No helper on the lines. After 3 failed copies Jugnu writes
//             her name on the lines and the screen counts as done, with help.
// The 3 firefly lights (top right) span the three screens. After screen 3 her
// name glows and the big arrow tile offers a fresh page. Each full page adds
// to the name's page count and moves its sticker (Slice 5L part 2's rule).
// She can leave at any time with back or home (the shell calls stop()).
//
// Extra practice only: nothing here reads or saves stars, rounds, reviews,
// helper levels or the practice-more list. It only adds 'practice' entries
// (and her strokes, marked in: 'practice') to the attempt log of the child
// playing, and each full page counts for that child (savePracticePage).
//
// The rules of game.js hold here too: no text for her, never red, never a buzzer,
// never snap her ink, and her whole name fades only after a failed copy, once
// its reason has been shown. Nothing moves or plays while her finger is down.
// Every tolerance keeps the 45 px floor (src/geometry.js withMinLeeway).
//
// Slice 5O: undo one stroke (src/undo.js; the shell's undo button calls undo()).
// Screen 1: her last stroke that counted on the letter she traces now goes, with
// what it scored; a letter that lit gold stays. Screens 2 and 3: her last stroke
// goes and the judging wait is cancelled: nothing is judged until her next stroke.

import {
  drawLines, drawStageTrack, createInk, createFx, letterToPx, pxToLetter, START_DOT_RADIUS, trackLook, markPath,
  drawModelCard, CARD,
} from './render.js';
import { trackSinglePointer } from './input.js';
import { DEFAULTS, dist, createLiveTracker, withMinLeeway } from './geometry.js';
import {
  variantLabel, pickCandidate, planCandidates, advancePlans, startPlans, planStrokes, planChar, scoreMark,
} from './variants.js';
import { CONFIG, initialState, applyLift, applyPlanPass, strokeLogEntry, startNameRound, finishNameLetter } from './progress.js';
import { traceNote, nameCopyNote } from './notes.js';
import {
  startPage, judgeSpace, nextPage, fireflies, nameScreenLayout, scoreNameScreen, finishNameTrace, namePracticeLogEntry, nameCardDemo,
} from './practice.js';
import { logAttempt, readProfile, savePracticePage } from './storage.js';
import { speak, unlock, hush, chime, letterChime, popSound, setProfile } from './audio.js';
import { createJugnu } from './jugnu.js';
import { loadChar, pauseAnimations } from './game.js';
import { NAME_ID, nameWidth, placeLetters, NAME_DEMO_MS } from './name.js';
import { nameCompareIds, assignStrokes } from './name-copy.js';
import { refBox, POSITION_LINES } from './copy.js';
import { DUE_MARK, NEXT_PAGE } from './art.js';
import { EMPTY_UNDO, pushUndo, popUndo, canUndo, undoLogEntry } from './undo.js';

const HOME = { x: 0.35, y: 0.65 };   // Jugnu's home, as in game.js
const TRAIL_WIDTH = 0.16;            // Jugnu's trail when he draws on the lines, line units
const LETTER_GLOW_WIDTH = 0.12;      // a letter's glow when it is done, line units
const LETTER_GLOW_MS = 900;          // one letter lights up this long
const NAME_GLOW_STEP_MS = 220;       // at the end, each letter starts glowing this long after the one before
const NAME_WAIT_MS = 3000;           // screens 2 and 3: her name is judged this long after her last lift (as the copy round)
const CARD_TRAIL_WIDTH = 0.2;        // Jugnu's trail on the card, card units
const LINE_GLOW_WIDTH = 0.03;        // a guide line's gold glow (line position reasons), line units
const PLAIN_INK = { dim: false, glow: true };
const TRACE_STAGE = 1;               // screen 1 is traced like round 1

// Plays practice pages for her name. els: { area, lines, ink, fx, jugnu, rounds, note, next }.
// letters: the character ids of her name, in order (src/name.js nameOf).
// Returns { stop(), pause(), resume() }.
export async function startNamePractice(els, { letters, manifest = [] }) {
  const loaded = await Promise.all(letters.map((id) => loadChar(id, manifest)));
  if (letters.length === 0 || loaded.some((c) => !c)) return { stop() {}, pause() {}, resume() {} };
  // Screens 2 and 3 compare each letter with its board, its look-alikes and its twin, as the copy round.
  const compared = [...new Set(letters.flatMap(nameCompareIds))];
  const byId = new Map((await Promise.all(compared.map(async (id) => [id, await loadChar(id, manifest)]))).filter(([, c]) => c));
  const othersOf = (id) => nameCompareIds(id).map((x) => byId.get(x)).filter(Boolean);
  const placed = placeLetters(loaded); // each letter in the name's units
  const width = nameWidth(loaded);
  const nameChar = { id: NAME_ID, width, strokes: placed.flatMap((c) => c.strokes) };

  const ink = createInk(els.ink);
  const fx = createFx(els.fx);
  let layout = null;
  let card = null;                    // screens 2 and 3: the model card, else null
  let cfg = DEFAULTS;                 // the stage tolerances with the 45 px floor, for this screen
  const toPx = (p) => letterToPx(layout, layout.offset)(p);
  const jugnu = createJugnu(els.jugnu, (p) => (layout ? toPx(p) : [0, 0]));
  setProfile(readProfile());

  let page = startPage();
  let pageNo = 1;                     // pages this sitting (the log's `page`)
  const screen = () => Math.min(page.space, page.spaces.length - 1); // the screen on show (the last one once the page is done)

  // Screen 1: letter by letter, as the name's round 1.
  let np = startNameRound(placed.length);
  const cur = () => placed[np.letter];
  const freshLetter = () => ({ ...initialState(cur().strokes.length), stage: TRACE_STAGE });
  let progress = freshLetter();
  let following = startPlans(cur());
  const shown = () => following[0];
  const planNow = () => planStrokes(cur(), shown().plan);
  const freshStats = () => placed.map((c) => ({ letter: c.id, ok: true, helped: false, misses: 0, wrongStarts: 0, reversed: 0 }));
  let stats = freshStats();
  let letterInk = placed.map(() => []);
  let reversedStrokes = [];
  let goodStrokes = 0;
  let undoList = EMPTY_UNDO;          // Slice 5O: her strokes she may take back, last on top

  // Screens 2 and 3.
  let copy = null;                    // { strokes, ids, hinted }
  let lastCopy = null;                // her passed name on the screen she is on, for the glow at the end

  let phase = 'trace';                // 'trace' | 'held' | 'done'
  let alive = true;
  let attempt = null;
  let attemptPoints = null;
  let holding = null;
  let turned = null;

  const score = (child, ref, st) => scoreMark(child, ref, st, cfg);
  const stageCfg = () => cfg.stages[TRACE_STAGE];
  const ref = () => planNow()[progress.current].points;
  const startDot = () => ref()[0];
  const home = () => [HOME.x - layout.offset, HOME.y];
  const bandWidth = () => trackLook(TRACE_STAGE).band * layout.unit;
  const namePaths = () => placed.flatMap((c) => c.strokes.map((s) => markPath(s.points)));
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

  // ---- the fireflies, top right: one per screen ----
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
    if (!text) return void els.note.classList.remove('on');
    els.note.textContent = text;
    els.note.hidden = false;
    els.note.classList.add('on');
    noteTimer = setTimeout(() => els.note.classList.remove('on'), CONFIG.noteMs);
  }

  function redraw() {
    drawLines(els.lines, layout);
    if (card) {
      drawModelCard(els.lines, layout, card, nameChar, placed);
      // A screen Jugnu wrote (after 3 failed copies): his name stays on the lines, lit gold.
      const s = page.spaces[screen()];
      if (s.done && s.helped) placed.forEach((c) => drawStageTrack(els.lines, layout, c, layout.offset, { stage: TRACE_STAGE, done: allDone(c), markers: false }));
      return;
    }
    placed.forEach((c, i) => {
      const opts = { stage: TRACE_STAGE };
      if (np.done[i] || page.spaces[0].done) drawStageTrack(els.lines, layout, c, layout.offset, { ...opts, done: allDone(c), markers: false });
      else if (i === np.letter) drawStageTrack(els.lines, layout, planChar(c, shown().plan), layout.offset, { ...opts, done: progress.done });
      else drawStageTrack(els.lines, layout, c, layout.offset, { ...opts, done: c.strokes.map(() => false), markers: false });
    });
  }

  function applyLayout() {
    const w = els.area.clientWidth || window.innerWidth;
    const h = els.area.clientHeight || window.innerHeight;
    layout = nameScreenLayout(w, h, width, screen());
    if (layout.card) {
      const { unit, originX, top, offset } = layout;
      const c = layout.card;
      // Card units (the name's own) -> the name's units on the lines, for Jugnu and the effects.
      card = { ...c, toMain: ([x, y]) => [(c.origin[0] + x * c.k - originX) / unit - offset, (c.origin[1] + y * c.k - top) / unit] };
    } else card = null;
    cfg = withMinLeeway(DEFAULTS, layout.unit);
    redraw();
    ink.resize(layout, layout.offset);
    fx.resize(layout, layout.offset);
    jugnu.resize(layout.unit);
  }

  // ---- screen 1: traced letter by letter, like the name's round 1 ----

  function beginStroke() {
    redraw();
    if (np.letter === 0 && progress.done.every((d) => !d)) speak('start');
    jugnu.demo(markPath(ref()), CONFIG.demoMs, CONFIG.hopMs);
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
    if (letterDone) return endLetter();
    phase = 'trace';
    beginStroke();
  }

  // A letter's last stroke is done. If Jugnu drew one of its strokes, that letter
  // is traced again (once); otherwise it lights up and the next letter starts.
  async function endLetter() {
    phase = 'held';
    undoList = EMPTY_UNDO; // a finished letter stays finished
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
    redraw();
    letterChime();
    fx.letterGlow(placed[i].strokes.map((s) => markPath(s.points).map(toPx)), LETTER_GLOW_WIDTH * layout.unit, LETTER_GLOW_MS);
    await wait(CONFIG.sparkleMs);
    if (!alive) return;
    if (f.roundDone) return endTrace();
    progress = freshLetter();
    following = startPlans(cur());
    phase = 'trace';
    beginStroke();
  }

  // Screen 1 is traced: strokes she traced the other way are flown the usual way once.
  async function endTrace() {
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
    const r = finishNameTrace(page, stats);
    const helped = r.state.spaces[0].helped;
    logAttempt(namePracticeLogEntry({ page: pageNo, space: 1, ok: !helped, helped, done: true, letters: stats }));
    page = r.state;
    return screenDone(0, r.pageDone);
  }

  // ---- screens 2 and 3: on her own, judged like the name's copy round ----

  // Screen 2: Jugnu writes her name on the card (fast, and a touch finishes it).
  // Screen 3: it is already there; she writes at once.
  async function beginCopy() {
    copy = { strokes: [], ids: [], hinted: false };
    undoList = EMPTY_UNDO;
    redraw();
    speak('copy');
    const demo = nameCardDemo(page.space);
    if (demo && !(await showOnCard(namePaths(), demo.ms, demo))) return;
    if (!demo) jugnu.hopTo(home(), CONFIG.hopMs); // off the card (not a demonstration: her touch stops it)
    phase = 'trace';
  }

  // A skippable demonstration running now (screen 2's), or null: skip() ends it at once.
  let cardShow = null;

  // Jugnu draws `paths` (the name's own units) on the model card, each leaving a
  // glowing trail; then the trails fade and he flies home. Resolves false if stopped.
  // skippable: her touch ends it at once (skipCard), and it resolves true.
  async function showOnCard(paths, ms = CONFIG.copyDemoMs, { hopMs = CONFIG.hopMs, skippable = false } = {}) {
    phase = 'held';
    const trails = [];
    let skipped = false;
    if (skippable) cardShow = { skip: () => { skipped = true; jugnu.stop(); } };
    for (const path of paths) {
      const pts = path.map(card.toMain);
      const trail = fx.trail(pts.map(toPx), CARD_TRAIL_WIDTH * card.k);
      trails.push(trail);
      const flown = await jugnu.demo(pts, ms, hopMs, (f) => trail.set(f));
      if (!alive) return false;
      if (skipped) return true; // the card is finished: she is already writing
      if (!flown) { cardShow = null; return false; }
    }
    cardShow = null;
    for (const t of trails) t.fadeOut(CONFIG.trailFadeMs);
    jugnu.hopTo(home(), hopMs);
    await wait(Math.max(CONFIG.trailFadeMs, hopMs));
    return alive;
  }

  // Her touch during screen 2's demonstration: the card is finished at once
  // (the model is already drawn on it; Jugnu's trails go) and her stroke starts.
  function skipCard() {
    const show = cardShow;
    cardShow = null;
    show.skip();
    jugnu.placeAt(home()); // at once, off the card
    fx.clear();
    phase = 'trace';
  }

  function endCopyStroke() {
    const id = ink.end();
    copy.strokes.push(attemptPoints);
    copy.ids.push(id);
    undoList = pushUndo(undoList, { kind: 'copy', id });
    later(judgeName, NAME_WAIT_MS);
  }

  // She stopped before the last letters: Jugnu writes the next one on the card.
  // Nothing is judged or logged, and it is not a failed copy.
  async function hintName(result) {
    copy.hinted = true;
    if (!(await showOnCard(result.show.paths.map((p) => markPath(p))))) return;
    phase = 'trace';
  }

  // Why her name did not count, while it is still there (as the copy round). Resolves false if stopped.
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
    if (phase !== 'trace' || !copy || copy.strokes.length === 0) return;
    phase = 'held';
    const k = page.space;
    const result = scoreNameScreen(copy.strokes, placed, loaded, { othersOf });
    showNote(nameCopyNote(result, letters));
    if (result.reason === 'unfinished') return hintName(result);
    undoList = EMPTY_UNDO; // a judged copy is never undone
    const r = judgeSpace(page, { ok: result.ok });
    const tryNo = r.fails + (result.ok ? 1 : 0);
    logAttempt(namePracticeLogEntry({ page: pageNo, space: k + 1, ok: result.ok, helped: r.helpedOut, done: r.spaceDone, attempt: tryNo, result }));
    if (result.ok) {
      chime();
      for (const pts of copy.strokes) fx.sparkle(pts.map(toPx), CONFIG.sparkleMs);
      lastCopy = copy.strokes;
      await wait(CONFIG.sparkleMs);
      if (!alive) return;
      // Habits coach, never fail: Jugnu writes those letters the usual way on the card.
      if (!result.habits.usual) {
        const paths = result.habits.coach.flatMap((i) => placed[i].strokes.map((s) => markPath(s.points)));
        if (paths.length && !(await showOnCard(paths, NAME_DEMO_MS))) return;
      }
      page = r.state;
      return screenDone(k, r.pageDone);
    }
    speak('copyAgain');
    if (!(await showWhy(result))) return;
    // Her name fades (the one place her writing fades: room for a fresh copy).
    for (const id of copy.ids) ink.fade(id, CONFIG.copyFadeMs);
    copy = { strokes: [], ids: [], hinted: false };
    page = r.state;
    if (r.helpedOut) {
      // Never stuck: Jugnu writes her name on the lines, and it counts as done, with help.
      await wait(CONFIG.copyFadeMs);
      if (!alive) return;
      speak('assist');
      lastCopy = null;
      if (!(await jugnuWrites())) return;
      return screenDone(k, r.pageDone);
    }
    redraw();
    phase = 'trace';
  }

  // Jugnu writes her whole name on the lines; then it stays there, lit gold.
  async function jugnuWrites() {
    phase = 'held';
    const trails = [];
    for (const path of namePaths()) {
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

  // ---- screens and pages ----

  // Screen k is finished: its firefly lights. Then the next screen, or the page is done.
  async function screenDone(k, pageDone) {
    phase = 'held';
    drawLights(k);
    letterChime();
    redraw();
    if (pageDone) return finishPage();
    await wait(CONFIG.roundPauseMs);
    if (!alive) return;
    ink.clear();
    fx.clear();
    showNote(null);
    applyLayout();
    begin();
  }

  function begin() {
    if (page.space === 0) {
      phase = 'trace';
      return beginStroke();
    }
    return beginCopy();
  }

  // The page is full: her name glows letter by letter (her last copy, or Jugnu's
  // name when he wrote it), then the big arrow tile offers a fresh page.
  // The page counts for the child playing (td.pages under 'name') and its
  // sticker moves to the newest place on her shelf. Nothing else is saved.
  async function finishPage() {
    phase = 'held';
    savePracticePage(NAME_ID);
    redraw();
    speak('letterDone');
    const groups = lastCopy ? assignStrokes(lastCopy, placed).groups : null;
    placed.forEach((c, i) => {
      const lines = groups?.[i] ?? c.strokes.map((s) => markPath(s.points));
      later(() => fx.letterGlow(lines.map((pts) => pts.map(toPx)), LETTER_GLOW_WIDTH * layout.unit, CONFIG.letterGlowMs), i * NAME_GLOW_STEP_MS);
    });
    jugnu.hopTo(home(), CONFIG.hopMs);
    await wait(placed.length * NAME_GLOW_STEP_MS + CONFIG.letterGlowMs);
    if (!alive) return;
    phase = 'done';
    if (els.next) {
      els.next.hidden = false;
      // Jugnu perches on top of the arrow tile (left column), out of her name.
      const box = els.next.getBoundingClientRect();
      jugnu.hopTo(pxToLetter([box.left + box.width / 2, box.top - 4], layout, layout.offset), CONFIG.hopMs);
    }
  }

  // The arrow tile: a fresh page, screen 1 traced again.
  function freshPage() {
    if (phase !== 'done' || !alive) return;
    popSound();
    if (els.next) els.next.hidden = true;
    page = nextPage(page);
    pageNo += 1;
    np = startNameRound(placed.length);
    progress = freshLetter();
    following = startPlans(cur());
    stats = freshStats();
    letterInk = placed.map(() => []);
    reversedStrokes = [];
    copy = null;
    lastCopy = null;
    cardShow = null;
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
    if (card) {
      // On her own: no track to follow, so her ink is always full. Jugnu stays where he is.
      jugnu.stop();
      attempt = { copy: true, points: [q] };
      attemptPoints = attempt.points;
      ink.begin(u, PLAIN_INK);
      return;
    }
    jugnu.restAt(startDot());
    const candidates = planCandidates(cur(), following);
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
    if (a.copy) return endCopyStroke();
    const id = ink.end();
    const current = progress.current;
    const letter = cur();
    const pick = pickCandidate(a.points, a.candidates, TRACE_STAGE, score, cfg);
    let result = pick.result;
    const counted = result.reason !== 'too-short';
    if (counted && !a.startOk) result = { ...result, ok: false, reason: 'wrong-start', startOk: false };
    if (counted && result.reason === 'wrong-start') stats[np.letter].wrongStarts += 1;
    if (counted && !result.ok) stats[np.letter].misses += 1;
    const variant = result.ok ? variantLabel(pick.variant) : 'none';
    // What this stroke may change, as it was before it (an undo puts it back).
    const snap = { progress, following, reversedStrokes: [...reversedStrokes], goodStrokes, reversed: result.reversed === true };
    let lift;
    if (result.ok) {
      following = advancePlans(a.points, letter, following, TRACE_STAGE, score);
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
    logAttempt({ ...strokeLogEntry({ char: letter.id, stage: TRACE_STAGE, pick, result, variant, counted, assisted: lift.assist }), in: 'practice', of: NAME_ID, letter: np.letter, page: pageNo });
    progress = lift.state;

    if (result.ok) {
      chime();
      fx.sparkle(markPath(pick.variant.points).map(toPx), CONFIG.sparkleMs);
      if (lift.letterDone) return endLetter();
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
    cancelLater(); // the next stroke's demonstration, or the judging wait
    hush();
    fx.clear();
    ink.remove(entry.id);
    showNote(null);
    const extra = { in: 'practice', of: NAME_ID, page: pageNo, space: page.space + 1 };
    if (entry.kind === 'copy') {
      copy.strokes.pop();
      copy.ids.pop();
      logAttempt(undoLogEntry({ char: NAME_ID, mode: 'copy', stroke: copy.strokes.length, extra }));
      return true; // nothing is judged until her next stroke
    }
    const k = np.letter;
    ({ progress, following, goodStrokes } = entry.snap);
    reversedStrokes = entry.snap.reversedStrokes;
    if (entry.snap.reversed) stats[k].reversed -= 1; // misses and wrong starts were real tries: they stay
    letterInk[k] = letterInk[k].filter((id) => id !== entry.id);
    logAttempt(undoLogEntry({ char: placed[k].id, mode: 'trace', stroke: undoList.length, extra: { ...extra, letter: k } }));
    beginStroke();
    return true;
  }

  const stopTracking = trackSinglePointer(els.area, {
    onStart: (p) => {
      unlock();
      if (!layout || turned) return;
      if (phase === 'held' && cardShow) skipCard(); // screen 2: finish the card, never pause Jugnu
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
  jugnu.placeAt(home());
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

const boxOfStrokes = (strokes) => {
  const pts = strokes.flat();
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs); const x1 = Math.max(...xs); const y0 = Math.min(...ys); const y1 = Math.max(...ys);
  return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};
