// practice.js — pure functions only. No DOM, no storage, no audio.
// Slice 5L: the practice page. Extra practice for a character that already has
// its gold star. One set of four lines holds three practice spaces side by side:
//   space 1  the dotted letter to trace, with start dots, like round 1
//   space 2  blank: she writes the letter on her own, judged like the copy-it round
//   space 3  blank, the same
// Space 1 stays on the page as her model. Each finished space lights a firefly.
// When all three are done, a fresh page can follow (space 1 guided again).
//
// The practice page is extra: it never changes stars, reviews, helper levels or
// the practice-more list. It only adds 'practice' entries to the attempt log.

import { computeLayout, COPY_ROOM, BUTTONS_RIGHT, TAIL_LINE, roundLightsBox } from './render.js';
import { CONFIG } from './progress.js';
import { scoreCopy, copyStatus } from './copy.js';
import { nameLayout, nameCopyLayout, NAME_ID } from './name.js';
import { scoreName, nameCopyLogEntry } from './name-copy.js';

export const PRACTICE = {
  spaces: 3,              // practice spaces on a page
  tries: CONFIG.copyTries, // failed copies in a space before Jugnu writes it (3)
  right: 24,              // px kept free at the screen's right edge
  clear: 12,              // Slice 10D, Urdu: px kept free left of the fireflies (space 1 is on the right)
};

// ---------------------------------------------------------------------------
// Layout
//
// Each space is as wide as the copy-it round allows her copy to be (COPY_ROOM:
// up to 1.25 times the model, plus a little to spare), so a space holds any copy
// that would pass. The three spaces sit side by side in her writing room, from
// the right edge of the button column to PRACTICE.right px from the screen's
// right edge. One unit (sky line to grass line) is a single letter's unit
// (render.js computeLayout), or smaller when three spaces would not fit. The
// tracing tolerances then keep a 45 px floor (geometry.js withMinLeeway).
// The lines run the whole width, as for a single letter.

// A space's width in line units, for a character `charWidth` units wide.
export const spaceWidth = (charWidth) => COPY_ROOM.size * charWidth + COPY_ROOM.spare;

// The page for a character `charWidth` units wide on a w x h screen: the fields
// of computeLayout (unit, areaWidth, areaHeight, originX, top, lineEnd), plus
//   offset  space 1's character box x (units from the start of the lines), as letterOffset gives
//   step    units from one space's character box to the next one's
//   spaces  [{ x0, x1 }] each space's left and right edge, in area px, space 1 first
// `rtl` (Slice 10D, an Urdu letter): the spaces run right to left, as Urdu is
// written. Space 1 (the one she traces) is on the right, and `step` is negative.
// Space 1 would then sit under the fireflies (the round lights, top right), so
// the spaces end PRACTICE.clear px left of them (tests/lights.test.js).
export function practiceLayout(w, h, charWidth, cfg = PRACTICE, { rtl = false } = {}) {
  const base = computeLayout(w, h);
  const right = rtl ? Math.max(cfg.right, w - roundLightsBox(w).x0 + cfg.clear) : cfg.right;
  const room = w - BUTTONS_RIGHT - right;
  const step = spaceWidth(charWidth);
  const unit = Math.min(base.unit, room / (cfg.spaces * step));
  const pad = base.originX / base.unit; // the gap at each end of the lines, in units
  const originX = pad * unit;
  const left = BUTTONS_RIGHT + (room - cfg.spaces * step * unit) / 2; // space 1's left edge, px
  const ltr = Array.from({ length: cfg.spaces }, (_, k) => ({ x0: left + k * step * unit, x1: left + (k + 1) * step * unit }));
  const spaces = rtl ? [...ltr].reverse() : ltr;
  const first = (left - originX) / unit + (step - charWidth) / 2; // the leftmost space's character box
  return {
    unit,
    areaWidth: w,
    areaHeight: h,
    originX,
    top: (h - TAIL_LINE * unit) / 2,
    lineEnd: w - pad * unit,
    offset: rtl ? first + (cfg.spaces - 1) * step : first,
    step: rtl ? -step : step,
    spaces,
  };
}

// Points in page letter units (x = 0 at space 1's box) moved into space k's box, and back.
export const toSpace = (points, k, step) => points.map(([x, y]) => [x + k * step, y]);
export const fromSpace = (points, k, step) => points.map(([x, y]) => [x - k * step, y]);

// Spaces 2 and 3 are judged exactly like the copy-it round (src/copy.js): her
// strokes (page letter units), moved back into space 1's box, then scoreCopy or
// copyStatus with the same options (`others`: the board's look-alikes).
export const inSpace = (strokes, k, step) => strokes.map((pts) => fromSpace(pts, k, step));
export const scoreSpace = (strokes, char, k, step, opts = {}) => scoreCopy(inSpace(strokes, k, step), char, opts);
export const spaceStatus = (strokes, char, k, step, opts = {}) => copyStatus(inSpace(strokes, k, step), char, opts);

// ---------------------------------------------------------------------------
// The page
//
// The state: { space (the one she is on now; 3 when the page is done),
// spaces: [{ done, helped, fails }] }.
//   done    the space is finished (its firefly is lit)
//   helped  Jugnu helped: in space 1 he drew a stroke (after 5 misses on it, as
//           in round 1); in space 2 or 3 he wrote the letter after 3 failed copies
//   fails   failed copies in this space so far

export function startPage(cfg = PRACTICE) {
  return {
    space: 0,
    spaces: Array.from({ length: cfg.spaces }, () => ({ done: false, helped: false, fails: 0 })),
  };
}

export const isPageDone = (page) => page.spaces.every((s) => s.done);

// Mark space `space` finished (helped: Jugnu helped) and move on to the next.
function finish(page, helped) {
  const spaces = page.spaces.map((s, i) => (i === page.space ? { ...s, done: true, helped: s.helped || helped } : s));
  const next = spaces.findIndex((s) => !s.done);
  return { ...page, spaces, space: next === -1 ? spaces.length : next };
}

// Space 1 is traced. assisted: Jugnu drew one of its strokes (it still counts
// as done, with help; the space does not start again).
// Returns { state, pageDone }.
export function finishTrace(page, { assisted = false } = {}) {
  if (page.space !== 0 || page.spaces[0].done) return { state: page, pageDone: isPageDone(page) };
  const state = finish(page, assisted);
  return { state, pageDone: isPageDone(state) };
}

// One judged copy in space 2 or 3.
// Returns { state, again, spaceDone, helpedOut, pageDone, fails }:
//   again      she tries this space once more (her letter fades first)
//   spaceDone  the space is finished (passed, or Jugnu wrote it)
//   helpedOut  the third failed copy: Jugnu writes the letter and it counts as done, with help
export function judgeSpace(page, { ok }, cfg = PRACTICE) {
  const k = page.space;
  const none = { state: page, again: false, spaceDone: false, helpedOut: false, pageDone: isPageDone(page), fails: 0 };
  if (k < 1 || k >= page.spaces.length) return none;
  if (ok) {
    const state = finish(page, false);
    return { state, again: false, spaceDone: true, helpedOut: false, pageDone: isPageDone(state), fails: page.spaces[k].fails };
  }
  const fails = page.spaces[k].fails + 1;
  const counted = { ...page, spaces: page.spaces.map((s, i) => (i === k ? { ...s, fails } : s)) };
  if (fails < cfg.tries) return { state: counted, again: true, spaceDone: false, helpedOut: false, pageDone: false, fails };
  const state = finish(counted, true);
  return { state, again: false, spaceDone: true, helpedOut: true, pageDone: isPageDone(state), fails };
}

// A fresh page with the same character (the big arrow tile). Only once this one is done.
export const nextPage = (page, cfg = PRACTICE) => (isPageDone(page) ? startPage(cfg) : page);

// What each firefly shows: 'done', 'now' or 'next'.
export const fireflies = (page) => page.spaces.map((s, i) => (s.done ? 'done' : i === page.space ? 'now' : 'next'));

// ---------------------------------------------------------------------------
// The attempt log: one 'practice' entry for space 1 when it is traced, and one
// for every judged copy in spaces 2 and 3 (its copy fields, as copyLogEntry
// gives them, under `copy`). Strokes are logged as usual, marked in: 'practice'.
//   page   which page of this sitting (1, 2...)
//   space  1, 2 or 3
//   done   the space is finished with this entry
export function practiceLogEntry({ char, page, space, ok, helped = false, done = false, attempt = null, trace = null, copy = null, now = new Date() }) {
  return {
    type: 'practice',
    time: now.toISOString(),
    char,
    page,
    space,
    kind: space === 1 ? 'trace' : 'copy',
    ok: ok === true,
    helped: helped === true,
    done: done === true,
    attempt,   // spaces 2 and 3: 1, 2 or 3
    reason: copy?.reason ?? null,
    // Space 1: { misses, wrongStarts, reversed }.
    trace: trace ? { misses: trace.misses ?? 0, wrongStarts: trace.wrongStarts ?? 0, reversed: trace.reversed ?? 0 } : null,
    copy: copy ? (({ type, time, char: c, attempt: a, ...rest }) => rest)(copy) : null,
  };
}

// ---------------------------------------------------------------------------
// Her name's practice page (Slice 5L part 3)
//
// Once her name has its gold star. One practice space per screen, at the name
// book's own line size, and 3 screens make one page. The page's state is the
// one above (startPage, judgeSpace, nextPage, fireflies): its spaces are the
// three screens, so the 3 firefly lights span them.
//   screen 1  her name traced letter by letter, like the name's round 1
//             (src/progress.js finishNameLetter: Jugnu demonstrates after 3
//             misses on a stroke and draws it after 5; then only that letter
//             is traced again, once). Done with help when Jugnu drew any stroke.
//   screens 2 and 3  the lines are empty and her name stands on the model card
//             above them, as in the name's copy round (nameCopyLayout); she
//             writes it on her own, judged by src/name-copy.js scoreName, with
//             its letter-by-letter reasons. No helper on the lines. After 3
//             failed copies Jugnu writes the name there: done, with help.
// Every tolerance keeps the 45 px floor (geometry.js withMinLeeway).

// Jugnu writing her name on the card at the start of a screen:
//   screen 2  he writes it, noticeably faster than in the copy round (ms a
//             stroke, hopMs between strokes), and a touch during it finishes the
//             card at once (skippable): her stroke starts there and then, Jugnu
//             does not pause.
//   screen 3  no demonstration: her name is already written on the card (she has
//             just watched it on screen 2), and she can write at once.
// Screen 1 has no card. Returns { ms, hopMs, skippable } or null.
export const NAME_CARD_DEMO = { ms: 400, hopMs: 200 };
export const nameCardDemo = (screen) => (screen === 1 ? { ...NAME_CARD_DEMO, skippable: true } : null);

// The layout of screen `screen` (0, 1 or 2) for a name `width` units wide.
// The line unit is the same on every screen (the name book's own size).
export const nameScreenLayout = (w, h, width, screen) => (screen === 0 ? nameLayout(w, h, width) : nameCopyLayout(w, h, width));

// Screens 2 and 3 are judged exactly like the name's copy round.
export const scoreNameScreen = (strokes, letters, chars, opts = {}) => scoreName(strokes, letters, chars, opts);

// Screen 1 is traced. letters: each letter's result ({ helped }), as the name's round gives them.
// Returns { state, pageDone }, as finishTrace.
export const finishNameTrace = (page, letters) => finishTrace(page, { assisted: letters.some((l) => l.helped === true) });

// The attempt log: one 'practice' entry for screen 1 when it is traced (each
// letter's result under `letters`), and one for every judged copy on screens 2
// and 3 (the name copy round's fields, as nameCopyLogEntry gives them, under `copy`).
//   page    which page of this sitting (1, 2...)
//   space   the screen: 1, 2 or 3
export function namePracticeLogEntry({ page, space, ok, helped = false, done = false, attempt = null, letters = null, result = null, now = new Date() }) {
  const copy = result ? (({ type, time, round, review, attempt: a, helper, helped: h, ...rest }) => rest)(nameCopyLogEntry({ result, attempt })) : null;
  return {
    type: 'practice',
    time: now.toISOString(),
    char: NAME_ID,
    page,
    space,
    kind: space === 1 ? 'trace' : 'copy',
    ok: ok === true,
    helped: helped === true,
    done: done === true,
    attempt,
    reason: result?.reason ?? null,
    letters: letters ? letters.map((l) => ({
      letter: l.letter,
      ok: l.ok === true,
      helped: l.helped === true,
      misses: l.misses ?? 0,
      wrongStarts: l.wrongStarts ?? 0,
      reversed: l.reversed ?? 0,
    })) : null,
    copy,
  };
}
