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

// Slice 5O follow-up: her name's width as the copy screens write it, in slots
// (placeInSlots: no slot narrower than NAME_SLOTS.minWidth). The widest of her
// screens' spacings, so a name that fits this way fits on every screen.
export const slotNameWidth = (chars) => nameWidth(placeInSlots(chars));

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

// ---------------------------------------------------------------------------
// Letter slots (Slice 5O part 3): in her name's copy round and her name's
// practice screens 2 and 3, a faint box on the lines for each letter, so she
// can see where each one goes. Sized from the model: as wide as the letter's
// box (a small gap between boxes), from the line its top reaches to the line
// its bottom reaches (capitals and tall letters: sky to grass; small letters:
// fence to grass; tails: fence to tail line; i and j: their dot reaches the sky).
// Her strokes are given to the letters by these slots (src/name-copy.js).
export const NAME_SLOTS = {
  inset: 0.03,  // line units left free at each side of a slot (the gap between two slots is twice this)
  tops: [0, 0.5],      // the lines a slot may start at
  bottoms: [1, 1.5],   // the lines a slot may end at
  slack: 0.03,  // a letter this close past a line still counts as reaching only that line
  // Slice 5O part 4: no slot narrower than this (line units): about half the
  // width of a small letter such as a (0.66), so a narrow letter's box
  // (i, l, I, 1) is easy for her to hit. The letter stands in its middle.
  minWidth: 0.33,
};

// Slice 5O part 4: her name's letters placed for writing in slots (the copy
// round and her name's practice screens 2 and 3): as placeLetters, but each
// letter's box is wide enough for a slot of at least `minWidth`, the letter
// centred in it, so the letters after it move along to make room.
export function placeInSlots(chars, rules = NAME_SLOTS) {
  const least = rules.minWidth + 2 * rules.inset;
  return placeLetters(chars.map((c) => {
    if (c.width >= least) return c;
    const dx = (least - c.width) / 2;
    const move = (strokes) => strokes.map((s) => ({ ...s, points: s.points.map(([x, y]) => [x + dx, y]) }));
    return { ...c, width: least, strokes: move(c.strokes), ...(c.plans ? { plans: c.plans.map((p) => ({ ...p, strokes: move(p.strokes) })) } : {}) };
  }));
}

// The slots of placed letters (placeLetters), in the name's units:
// [{ index, id, x0, x1, y0, y1 }].
export function nameSlots(letters, rules = NAME_SLOTS) {
  return letters.map((c) => {
    const ys = c.strokes.flatMap((s) => s.points.map((p) => p[1]));
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const y0 = [...rules.tops].reverse().find((t) => t <= top + rules.slack) ?? rules.tops[0];
    const y1 = rules.bottoms.find((b) => b >= bottom - rules.slack) ?? rules.bottoms[rules.bottoms.length - 1];
    return { index: c.index, id: c.id, x0: c.x + rules.inset, x1: c.x + c.width - rules.inset, y0, y1 };
  });
}

// How the slots look at each fading-helper level (Slice 5O part 3, approved):
// level 1 a faint fill and an outline, level 2 the outline, level 3 only small
// ticks on the grass line where each letter begins and the last one ends. Her
// name's practice screens 2 and 3 (no helper there) use the outline.
export const slotLook = (level) => (level <= 1 ? 'fill' : level === 2 ? 'outline' : 'ticks');
