// name.js — pure functions only. No DOM, no storage, no audio.
// Slice 9C: "Write my name". Her name, from the setup page (td.profile), written
// as one word on the four lines: a capital first letter and the rest lowercase
// ("Sara"). Each letter is its own character file, with its own glyph and plans,
// placed box after box: every character file already has a margin of 0.08 on
// each side, so boxes side by side give normal print spacing (0.16 between inks).
//
// Her name is never written in the code, the tests or the docs: tests use a
// made-up name.

import { computeLayout, TAIL_LINE } from './render.js';

// The name's id: its rounds, helper, star and review are saved under it.
export const NAME_ID = 'name';

// Her name as she writes it, from what the setup page saved.
// Returns { ok, word, letters, reason, bad }:
//   ok      true when every character is a to z (either case)
//   word    'Sara' (first letter capital, the rest lowercase), or '' when not ok
//   letters ['S', 'a', 'r', 'a'] (the character ids), or []
//   reason  null, 'none' (no name set) or 'unsupported'
//   bad     the characters that cannot be written, each once, in order ([' ', 'é'])
export function nameOf(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text === '') return { ok: false, word: '', letters: [], reason: 'none', bad: [] };
  const bad = [...new Set([...text].filter((ch) => !/^[A-Za-z]$/.test(ch)))];
  if (bad.length > 0) return { ok: false, word: '', letters: [], reason: 'unsupported', bad };
  const word = text[0].toUpperCase() + text.slice(1).toLowerCase();
  return { ok: true, word, letters: [...word], reason: null, bad: [] };
}

// How the setup page names a character it cannot use: 'space', 'hyphen', or the character itself.
const CHAR_NAMES = { ' ': 'space', '-': 'hyphen', "'": 'apostrophe', '.': 'full stop' };
export const charName = (ch) => CHAR_NAMES[ch] ?? ch;

// ---------------------------------------------------------------------------
// Layout
//
// The lines shrink to fit her name, and the name keeps that size in all three
// rounds. The name sits in her writing room: from the right edge of the button
// column to `right` px from the screen's right edge, so no letter is under a
// button. One unit (sky line to grass line) is the smallest of:
//   - a single letter's unit (render.js computeLayout);
//   - what leaves room above the lines for round 3's model card: the lines and
//     the card take `stack` units of height below the round lights (`top` px);
//   - what makes the room `room` times the name's width, so her own copy can
//     come out a little bigger than the model.
// A name fits when that last one is at least `floor` px on her tablet
// (1280 CSS px wide): every name of up to 8 letters does (the widest, O and
// seven m's, gets 114 px); a wider one is too long, and the setup page says so.
export const NAME_FIT = { left: 136, right: 24, room: 1.2, floor: 112, top: 70, stack: 2.3 };
export const TABLET_WIDTH = 1280;

// The name's width in line units: its letters' boxes side by side.
export const nameWidth = (chars) => chars.reduce((sum, c) => sum + c.width, 0);

// The unit her name's room allows on a screen `w` px wide.
const unitByWidth = (w, width, fit) => (w - fit.left - fit.right) / (fit.room * width);

// A name `width` units wide fits on her tablet.
export const nameFits = (width, fit = NAME_FIT) => width > 0 && unitByWidth(TABLET_WIDTH, width, fit) >= fit.floor;

// The screen for a name `width` units wide on a w x h screen: the fields of
// render.js computeLayout (unit, areaWidth, areaHeight, originX, top, lineEnd)
// plus `offset`, the name box's x (units from the start of the lines), so the
// name is centred in her writing room. The lines still run the whole width.
export function nameLayout(w, h, width, fit = NAME_FIT) {
  const base = computeLayout(w, h);
  const unit = Math.min(base.unit, (h - fit.top) / fit.stack, unitByWidth(w, width, fit));
  const pad = base.originX / base.unit; // the gap at each end of the lines, in units
  const originX = pad * unit;
  const centre = (fit.left + (w - fit.right)) / 2;
  return {
    unit,
    areaWidth: w,
    areaHeight: h,
    originX,
    top: (h - TAIL_LINE * unit) / 2,
    lineEnd: w - pad * unit,
    offset: (centre - originX) / unit - width / 2,
  };
}

// The copy-it round (Slice 9C part 2): the same unit and the same place across
// the screen, but the model card stands above the lines, centred in her room,
// as big as fits (at most 0.6 of a unit per card unit, as wide as her room, and
// tall enough to leave the lines on the board), and the lines move down under it.
// Returns nameLayout's fields with `top` moved, plus `card`: { x, y, w, h, k,
// origin } in px (k: px per card unit; origin: the card name's x = 0, y = 0).
export const NAME_CARD = { pad: 0.16, gap: 0.06, max: 0.6, bottom: 20 };
// Jugnu writes each stroke of her name on the card this fast in the copy round (ms).
export const NAME_DEMO_MS = 700;
export function nameCopyLayout(w, h, width, fit = NAME_FIT, card = NAME_CARD) {
  const layout = nameLayout(w, h, width, fit);
  const { unit } = layout;
  const gap = card.gap * unit;
  const tall = TAIL_LINE + 2 * card.pad; // card units
  const k = Math.min(
    card.max * unit,
    (w - fit.left - fit.right) / (width + 2 * card.pad),
    (h - card.bottom - fit.top - TAIL_LINE * unit - 2 * gap) / tall,
  );
  const cw = (width + 2 * card.pad) * k;
  const ch = tall * k;
  const x = (fit.left + (w - fit.right)) / 2 - cw / 2;
  const y = fit.top;
  // The lines: under the card, centred in the room left below it.
  const below = y + ch + gap;
  const top = Math.max(below, below + (h - card.bottom - below - TAIL_LINE * unit) / 2);
  return { ...layout, top, card: { x, y, w: cw, h: ch, k, origin: [x + card.pad * k, y + card.pad * k] } };
}

// ---------------------------------------------------------------------------
// The letters, placed

const shiftStrokes = (strokes, dx) => strokes.map((s) => ({ ...s, points: s.points.map(([x, y]) => [x + dx, y]) }));

// Each letter's character file moved to its place in the name: its strokes and
// plans in the name's units (x = 0 at the left of the first letter's box).
// Every other field (id, width, case...) is kept, plus `x`, where its box starts,
// and `index`, its place in the name.
export function placeLetters(chars) {
  let x = 0;
  return chars.map((c, index) => {
    const placed = {
      ...c,
      x,
      index,
      strokes: shiftStrokes(c.strokes, x),
      ...(c.plans ? { plans: c.plans.map((p) => ({ ...p, strokes: shiftStrokes(p.strokes, x) })) } : {}),
    };
    x += c.width;
    return placed;
  });
}

// ---------------------------------------------------------------------------
// The attempt log: one 'name' entry per finished tracing round (Slice 9C), with
// each letter's result. letters: [{ letter, ok, helped, misses, wrongStarts, reversed }]
//   ok: she drew every stroke herself; helped: Jugnu drew a stroke of it;
//   misses: strokes that did not count; wrongStarts; reversed: strokes traced the other way.
export function nameLogEntry({ round, stage, letters, now = new Date() }) {
  return {
    type: 'name',
    time: now.toISOString(),
    round,
    stage,
    ok: letters.every((l) => l.ok),
    letters: letters.map((l) => ({
      letter: l.letter,
      ok: l.ok === true,
      helped: l.helped === true,
      misses: l.misses ?? 0,
      wrongStarts: l.wrongStarts ?? 0,
      reversed: l.reversed ?? 0,
    })),
  };
}
