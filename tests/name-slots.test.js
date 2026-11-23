// Run: node --test tests/name-slots.test.js
// Slice 5O part 3: letter slots in name writing. Faint boxes on the lines, one
// per letter, sized from the model, in her name's copy round and her name's
// practice screens 2 and 3. Her strokes are given to the letters by the slots;
// a stroke no slot holds 60% of is unclear: tried with the other letter, and if
// neither works she rewrites the letter whose slot it started in. Every name
// here is made up.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nameOf, placeLetters, placeInSlots, nameSlots, nameWidth, NAME_SLOTS, slotLook } from '../src/name.js';
import {
  scoreName, nameCompareIds, assignBySlots, slotShares, slotOf, onSlots, NAME_SLOT_RULES, nameCopyLogEntry, afterTry,
} from '../src/name-copy.js';
import { scoreNameScreen } from '../src/practice.js';
import { nameCopyNote } from '../src/notes.js';
import { charFile } from '../src/session.js';
import { seeded, wobble, slant } from './crude-letters.js';

const cache = new Map();
const load = (id) => {
  if (!cache.has(id)) cache.set(id, JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8')));
  return cache.get(id);
};
const othersOf = (id) => nameCompareIds(id).map(load);
const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function setup(raw) {
  const ids = nameOf(raw).letters;
  const chars = ids.map(load);
  const letters = placeLetters(chars);
  return { ids, chars, letters, slots: nameSlots(letters) };
}
const judge = (raw, strokes, opts = {}) => {
  const { chars, letters, slots, ids } = setup(raw);
  const result = scoreName(strokes, letters, chars, { othersOf, slots, ...opts });
  return { result, note: nameCopyNote(result, ids) };
};
const line = (a, b, n = 20) => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);

// Her name written in the slots: each letter `written[k]` in slot k, scaled by
// `k` about its own box's middle (standing on the grass line) and nudged by
// nudge[k] along the line; optionally wobbly and slanted.
function inSlots(raw, written = nameOf(raw).word, { k = 1, nudge = [], hand = null } = {}) {
  const { letters } = setup(raw);
  const rnd = seeded(11);
  return [...written].flatMap((id, i) => {
    const c = load(id);
    const box = letters[i];
    const cx = box.x + box.width / 2;
    const d = nudge[i % Math.max(nudge.length, 1)] ?? 0;
    let strokes = c.strokes.map((s) => s.points.map(([x, y]) => [cx + (x - c.width / 2) * k + d, 1 - (1 - y) * k]));
    if (hand) strokes = slant(wobble(strokes, hand.amp, rnd), hand.slant);
    return strokes;
  });
}
// Her name written in one go from `dx`, ignoring the boxes (bigger, spread out...).
function inOneGo(raw, { dx = 0, k = 1, gap = 0 } = {}) {
  let x = dx;
  return [...nameOf(raw).word].map(load).flatMap((c) => {
    const s = c.strokes.map((st) => st.points.map(([px, py]) => [x + px * k, 1 - (1 - py) * k]));
    x += (c.width + gap) * k;
    return s;
  });
}

// ---- the slots ----

test('a slot per letter, sized from the model: its box, from the line its top reaches to the line its bottom reaches', () => {
  const { slots } = setup('Mia');
  assert.deepEqual(slots.map((s) => [s.id, s.y0, s.y1]), [['M', 0, 1], ['i', 0, 1], ['a', 0.5, 1]], 'i\'s dot reaches up to the sky line');
  const gopi = setup('Gopi').slots;
  assert.deepEqual(gopi.map((s) => [s.id, s.y0, s.y1]), [['G', 0, 1], ['o', 0.5, 1], ['p', 0.5, 1.5], ['i', 0, 1]], 'a tail reaches the tail line');
  const { letters } = setup('Mia');
  slots.forEach((s, k) => {
    assert.ok(Math.abs(s.x0 - (letters[k].x + NAME_SLOTS.inset)) < 1e-9);
    assert.ok(Math.abs(s.x1 - (letters[k].x + letters[k].width - NAME_SLOTS.inset)) < 1e-9);
  });
  assert.ok(slots[1].x0 - slots[0].x1 > 0, 'a small gap between two slots, so each box is seen');
});

test('the slots fade with the helper: fill, then outline, then ticks', () => {
  assert.equal(slotLook(1), 'fill');
  assert.equal(slotLook(2), 'outline');
  assert.equal(slotLook(3), 'ticks');
});

// ---- giving her strokes to the letters ----

test('a stroke belongs to the slot that holds most of its length; a tap to the box it lands in', () => {
  const { letters } = setup('Mia');
  assert.equal(NAME_SLOT_RULES.clear, 0.6, 'the approved 60%');
  const { shares } = slotShares(line([0.9, 0], [1.1, 1]), letters);
  assert.ok(Math.abs(shares[0] - 0.5) < 1e-9 && Math.abs(shares[1] - 0.5) < 1e-9);
  assert.deepEqual(slotShares([[1.08, 0.25]], letters).shares, [0, 1, 0], 'the dot of the i');
  assert.equal(slotOf([0.5, 0.5], letters), 0);
  assert.equal(slotOf([-0.4, 0.5], letters), 0, 'before the first box: the first');
  assert.equal(slotOf([9, 0.5], letters), 2, 'after the last box: the last');
  const a = assignBySlots([line([0.2, 0], [0.2, 1]), line([0.95, 0.5], [1.05, 1]), line([0.86, 0.3], [1.0, 0.7])], letters);
  assert.deepEqual(a.strokes.map((s) => [s.letter, s.unclear]), [[0, false], [0, true], [0, false]]);
});

test('her name written in its slots passes: neat, a little smaller or bigger, nudged, wobbly or slanted', () => {
  const hands = [null, { amp: 0.02, slant: 0.08 }, { amp: 0.025, slant: -0.06 }];
  for (const raw of ['Sara', 'Mia', 'Ali', 'Zoya', 'Amina', 'Isabella', 'Muhammad', 'Jaxon', 'Gopi', 'Lily']) {
    for (const opts of [{}, { k: 0.85 }, { k: 1.15 }, { nudge: [0.08, -0.06, 0.04] }, { k: 0.9, nudge: [-0.07, 0.07] }, ...hands.map((hand) => ({ hand }))]) {
      const { result } = judge(raw, inSlots(raw, undefined, opts));
      assert.equal(result.ok, true, `${raw} ${JSON.stringify(opts)}: ${result.reason} at ${result.letter}`);
      // Read by the slots, unless a nudge pushed a narrow letter (l, i) half into its neighbour's box:
      // then the reading by place and shape takes over, and her name still passes.
      if (!opts.nudge) assert.equal(result.slots, true, `${raw} ${JSON.stringify(opts)}: by the slots`);
    }
  }
});

test('written across the boxes in one go (bigger, spread out, moved), her name is read by place and shape as before', () => {
  for (const raw of ['Sara', 'Mia', 'Ali', 'Zoya', 'Amina', 'Muhammad', 'Jaxon']) {
    for (const opts of [{ k: 1.15 }, { k: 1.2 }, { gap: 0.15 }, { gap: 0.3 }, { dx: 0.15 }, { dx: -0.15 }]) {
      const { result } = judge(raw, inOneGo(raw, opts));
      assert.equal(result.ok, true, `${raw} ${JSON.stringify(opts)}: ${result.reason} at ${result.letter}`);
    }
  }
  // Far away from the slots: never read by them.
  const { letters } = setup('Sara');
  const away = inOneGo('Sara', { dx: 6 });
  assert.equal(onSlots(away, letters), false);
  assert.equal(judge('Sara', away).result.slots, false);
});

test('without slots (or with none drawn), nothing changes', () => {
  const { chars, letters } = setup('Sara');
  const r = scoreName(inOneGo('Sara', { dx: 0.3 }), letters, chars, { othersOf });
  assert.equal(r.ok, true);
  assert.equal(r.slots, false);
  assert.deepEqual(r.overlap, []);
});

// ---- the overlap rule: M and i ----

test('an M whose right stem runs into the i\'s slot stays the M\'s: most of it is in the M\'s slot', () => {
  const { letters } = setup('Mia');
  const [M0, M1] = letters[0].strokes.map((s) => s.points);
  const [I0, I1] = letters[1].strokes.map((s) => s.points);
  const A = letters[2].strokes.map((s) => s.points);
  const pushed = M1.map(([x, y]) => [x + 0.12, y]); // its right stem stands at 1.04, in the i's box
  assert.ok(slotShares(pushed, letters).shares[0] >= 0.6);
  const { result } = judge('Mia', [M0, pushed, I0, I1, ...A]);
  assert.equal(result.ok, true, `${result.reason} at ${result.letter}`);
  assert.deepEqual(result.groups.map((g) => g.length), [2, 2, 2]);
});

test('an i whose stick starts in the M\'s slot is the i\'s: most of it is in the i\'s slot', () => {
  const { letters } = setup('Mia');
  const M = letters[0].strokes.map((s) => s.points);
  const dot = letters[1].strokes[1].points;
  const A = letters[2].strokes.map((s) => s.points);
  const stick = line([0.96, 0.5], [1.1, 1]);
  const s = assignBySlots([stick], letters).strokes[0];
  assert.equal(s.start, 0, 'it started in the M\'s slot');
  assert.equal(s.letter, 1, 'but belongs to the i');
  const { result } = judge('Mia', [...M, stick, dot, ...A]);
  assert.equal(result.ok, true, `${result.reason} at ${result.letter}`);
  assert.deepEqual(result.groups.map((g) => g.length), [2, 2, 2]);
});

test('an i stick exactly between the M and the i (unclear): judged with the M it spoils it, so it is tried with the i and moves', () => {
  const { letters } = setup('Mia');
  const M = letters[0].strokes.map((s) => s.points);
  const dot = letters[1].strokes[1].points;
  const A = letters[2].strokes.map((s) => s.points);
  const stick = line([0.95, 0.5], [1.05, 1]); // half in each slot
  const { result } = judge('Mia', [...M, stick, dot, ...A]);
  assert.equal(result.ok, true, `${result.reason} at ${result.letter}`);
  assert.equal(result.overlap.length, 1);
  assert.deepEqual({ ...result.overlap[0], share: undefined }, { stroke: 2, share: undefined, slots: [0, 1], start: 0, moved: true, unclear: false });
});

test('an unclear stroke that fits neither letter: she rewrites the letter whose slot it started in, and that slot glows', () => {
  const { letters } = setup('Mia');
  const M = letters[0].strokes.map((s) => s.points);
  const I = letters[1].strokes.map((s) => s.points);
  const A = letters[2].strokes.map((s) => s.points);
  const extra = line([0.86, 0.3], [1.14, 0.7]); // across both boxes, half in each, part of neither letter
  const { result, note } = judge('Mia', [...M, ...I, extra, ...A]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'overlap');
  assert.equal(result.letter, 0, 'the M: the stroke started in its slot');
  assert.equal(note, "Let's write the M again, inside its box.");
  assert.equal(result.overlap[0].unclear, true);
  // The same stroke started from the i's side: the i is the one to rewrite.
  const back = judge('Mia', [...M, ...I, [...extra].reverse(), ...A]).result;
  assert.equal(back.reason, 'overlap');
  assert.equal(back.letter, 1);
});

// ---- a wrong letter: only its own slot ----

test('a wrong letter in her name is the one that says why (its slot is the one that glows)', () => {
  const { result, note } = judge('Mia', inSlots('Mia', 'Mio'));
  assert.equal(result.ok, false);
  assert.equal(result.letter, 2, 'the a, and only the a');
  assert.equal(result.slots, true);
  assert.ok(result.letters[0].ok && result.letters[1].ok, 'the M and the i stay good');
  assert.match(note, /o|a/);
});

test('her name\'s practice screens 2 and 3 judge with the slots too', () => {
  const { chars, letters, slots } = setup('Mia');
  const r = scoreNameScreen(inSlots('Mia', 'Mio'), letters, chars, { othersOf, slots });
  assert.equal(r.slots, true);
  assert.equal(r.letter, 2);
});

test('a letter given only a tap is not a letter yet: it fails kindly, never breaks', () => {
  const { letters } = setup('Mia');
  const M = letters[0].strokes.map((s) => s.points);
  const I = letters[1].strokes.map((s) => s.points);
  const { result } = judge('Mia', [...M, ...I, [[1.5, 0.75]]]);
  assert.equal(result.ok, false);
  assert.equal(result.letter, 2);
  assert.equal(result.letters[2].reason, 'unrecognized');
});

test('the log entry says whether the slots were used, and every unclear stroke', () => {
  const { letters } = setup('Mia');
  const M = letters[0].strokes.map((s) => s.points);
  const dot = letters[1].strokes[1].points;
  const A = letters[2].strokes.map((s) => s.points);
  const { result } = judge('Mia', [...M, line([0.95, 0.5], [1.05, 1]), dot, ...A]);
  const e = nameCopyLogEntry({ result, attempt: 1, now: new Date('2026-11-23T10:00:00Z') });
  assert.equal(e.slots, true);
  assert.equal(e.overlap.length, 1);
  assert.equal(e.overlap[0].moved, true);
  assert.doesNotThrow(() => JSON.stringify(e));
});

// ---- on screen ----

test('her name\'s copy round draws the slots in the helper\'s look; her practice screens 2 and 3 in the outline', () => {
  const game = src('src/name-game.js');
  assert.match(game, /drawNameSlots\(els\.lines, layout, layout\.offset, slots, slotLook\(helper\.level\), \{ focus: copy\?\.rewrite \?\? null \}\)/);
  assert.match(game, /scoreName\(copy\.strokes, placed, loaded, \{ othersOf, slots, locked: copy\.locked \}\)/);
  const practice = src('src/name-practice-game.js');
  assert.match(practice, /drawNameSlots\(els\.lines, layout, layout\.offset, slots, 'outline', \{ focus: copy\?\.rewrite \?\? null \}\)/);
  assert.match(practice, /scoreNameScreen\(copy\.strokes, placed, loaded, \{ othersOf, slots, locked: copy\.locked \}\)/);
});

test('when her name does not count, the slot of the letter it is about glows, over her faint ink', () => {
  for (const file of ['src/name-game.js', 'src/name-practice-game.js']) {
    const s = src(file);
    const why = s.slice(s.indexOf('async function showWhy('), s.indexOf('async function judgeName('));
    const faint = why.indexOf('if (!(await faintFirst())) return false;');
    const glow = why.indexOf('glowSlot(result.letter, CONFIG.copyReasonMs);');
    assert.ok(faint > 0 && glow > faint, `${file}: her ink goes faint first, then the slot glows`);
    const one = s.slice(s.indexOf('function glowSlot('), s.indexOf('function glowSlot(') + 400);
    assert.match(one, /const sl = k !== null && k !== undefined \? slots\[k\] : null;/, `${file}: only that letter's slot`);
    assert.match(one, /fx\.slotGlow\(/);
    assert.match(why, /boxOfStrokes\(result\.groups\?\.\[k\] \?\? \[\]\)/, `${file}: her letter as it was judged`);
  }
});

test('an i\'s dot drawn a little into the next letter\'s box is tried with the i, and goes there', () => {
  const { letters } = setup('Lily');
  const strokes = letters.flatMap((c) => c.strokes.map((s) => s.points));
  const dotAt = letters[1].strokes.findIndex((s) => s.kind === 'dot');
  const flat = letters.slice(0, 1).reduce((n, c) => n + c.strokes.length, 0) + dotAt;
  const iBox = letters[1];
  strokes[flat] = [[iBox.x + iBox.width + 0.03, strokes[flat][0][1]]]; // in the l's box, near its edge
  const { result } = judge('Lily', strokes);
  assert.equal(result.ok, true, `${result.reason} at ${result.letter}`);
  assert.equal(result.groups[1].length, 2, 'the i has its stick and its dot');
  assert.equal(result.overlap.find((o) => o.stroke === flat)?.moved, true);
});

// ===========================================================================
// Slice 5O part 4: a minimum slot width, and rewriting only the wrong letter

const ALL = [...'abcdefghijklmnopqrstuvwxyz', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '1'];

test('the minimum slot width is about half a small letter such as a', () => {
  assert.ok(Math.abs(NAME_SLOTS.minWidth - load('a').width / 2) < 0.01);
});

test('every slot meets the minimum width: every letter (and 1), alone and in names', () => {
  for (const id of ALL) {
    const [slot] = nameSlots(placeInSlots([load(id)]));
    assert.ok(slot.x1 - slot.x0 >= NAME_SLOTS.minWidth - 1e-9, `${id}: ${(slot.x1 - slot.x0).toFixed(3)}`);
  }
  for (const raw of ['Lily', 'Mia', 'Isabella', 'Jill', 'Tilt', 'Ali', 'Sara', 'Muhammad']) {
    for (const slot of nameSlots(placeInSlots(nameOf(raw).letters.map(load)))) {
      assert.ok(slot.x1 - slot.x0 >= NAME_SLOTS.minWidth - 1e-9, `${raw} ${slot.id}: ${(slot.x1 - slot.x0).toFixed(3)}`);
    }
  }
});

test('the narrow letters (i, l, I, 1, j, t) get at least the minimum, the letter centred in its slot', () => {
  for (const id of ['i', 'l', 'I', '1', 'j', 't']) {
    const [c] = placeInSlots([load(id)]);
    const [slot] = nameSlots([c]);
    assert.ok(slot.x1 - slot.x0 >= NAME_SLOTS.minWidth - 1e-9, id);
    const xs = c.strokes.flatMap((st) => st.points.map((p) => p[0]));
    const ink = (Math.min(...xs) + Math.max(...xs)) / 2;
    const own = load(id);
    const ownXs = own.strokes.flatMap((st) => st.points.map((p) => p[0]));
    const ownMid = (Math.min(...ownXs) + Math.max(...ownXs)) / 2;
    // The letter keeps its place within its own box, moved to the middle of the wider one.
    assert.ok(Math.abs((ink - (slot.x0 + slot.x1) / 2) - (ownMid - own.width / 2)) < 1e-9, `${id} centred`);
  }
});

test('the slots after a narrow letter move along to make room; wide letters keep their own width', () => {
  const chars = nameOf('Lily').letters.map(load);
  const plain = nameSlots(placeLetters(chars));
  const wide = nameSlots(placeInSlots(chars));
  assert.ok(wide[1].x1 - wide[1].x0 > plain[1].x1 - plain[1].x0, 'the i is wider');
  assert.ok(wide[2].x0 > plain[2].x0 && wide[3].x0 > plain[3].x0, 'the l and the y move right');
  assert.ok(Math.abs((wide[0].x1 - wide[0].x0) - (plain[0].x1 - plain[0].x0)) < 1e-9, 'the L keeps its width');
  for (let k = 1; k < wide.length; k++) assert.ok(wide[k].x0 > wide[k - 1].x1, 'never overlapping');
  assert.ok(nameWidth(placeInSlots(chars)) > nameWidth(chars));
  // A name with no narrow letter is placed exactly as before.
  const sara = nameOf('Sara').letters.map(load);
  assert.deepEqual(placeInSlots(sara).map((c) => c.x), placeLetters(sara).map((c) => c.x));
});

// Her name in the wider slots: each letter `written[k]` in slot k, centred, scaled by k.
function inWideSlots(raw, written = nameOf(raw).word, { k = 1, only = null } = {}) {
  const letters = placeInSlots(nameOf(raw).letters.map(load));
  return [...written].flatMap((id, i) => {
    if (only && !only.includes(i)) return [];
    const c = load(id);
    const box = letters[i];
    const cx = box.x + box.width / 2;
    return c.strokes.map((st) => st.points.map(([x, y]) => [cx + (x - c.width / 2) * k, 1 - (1 - y) * k]));
  });
}
const wideSetup = (raw) => {
  const chars = nameOf(raw).letters.map(load);
  const letters = placeInSlots(chars);
  return { chars, letters, slots: nameSlots(letters) };
};

test('her name written in the wider slots passes', () => {
  for (const raw of ['Lily', 'Mia', 'Isabella', 'Jill', 'Tilt', 'Ali']) {
    const { chars, letters, slots } = wideSetup(raw);
    for (const k of [1, 0.85, 1.15]) {
      const r = scoreName(inWideSlots(raw, undefined, { k }), letters, chars, { othersOf, slots });
      assert.equal(r.ok, true, `${raw} at ${k}: ${r.reason} at ${r.letter}`);
    }
  }
});

test('a wrong letter: only it is rewritten; the letters that counted are locked and stay', () => {
  const { chars, letters, slots } = wideSetup('Lily');
  const first = inWideSlots('Lily', 'Liiy'); // the l written as an i
  const r = scoreName(first, letters, chars, { othersOf, slots });
  assert.equal(r.ok, false);
  assert.equal(r.letter, 2, 'the l');
  const t = afterTry(r, first);
  assert.equal(t.rewrite, 2);
  assert.deepEqual(t.locked.map((g) => (g ? g.length : null)), [2, 2, null, 2], 'L, i and y stay, with their strokes');
  assert.deepEqual(t.fade, r.groups[2], 'only the l\'s ink fades');
  // She writes only the l, in its slot: judged alone, and her name passes.
  const again = scoreName(inWideSlots('Lily', 'Lily', { only: [2] }), letters, chars, { othersOf, slots, locked: t.locked });
  assert.equal(again.ok, true, `${again.reason} at ${again.letter}`);
  assert.deepEqual(again.open, [2], 'only the l was judged');
  assert.ok(again.letters[0].locked && again.letters[1].locked && again.letters[3].locked);
  assert.deepEqual(again.groups.map((g) => g.length), [2, 2, 1, 2], 'her whole name, the l new');
});

test('a rewrite that is wrong again: only that letter fails again, the others stay locked', () => {
  const { chars, letters, slots } = wideSetup('Lily');
  const first = inWideSlots('Lily', 'Liiy');
  const t = afterTry(scoreName(first, letters, chars, { othersOf, slots }), first);
  const bad = inWideSlots('Lily', 'LiLy', { only: [2] }); // a capital L in the l's slot
  const r = scoreName(bad, letters, chars, { othersOf, slots, locked: t.locked });
  assert.equal(r.ok, false);
  assert.equal(r.letter, 2);
  assert.deepEqual(afterTry(r, bad, t.locked).locked.map(Boolean), [true, true, false, true]);
});

test('two wrong letters are shown one at a time, from the left; the other keeps its ink until its turn', () => {
  const { chars, letters, slots } = wideSetup('Lily');
  const swap = inWideSlots('Lily', 'Lllv'); // the i written as an l (no dot) and the y as a v: two wrong
  const r = scoreName(swap, letters, chars, { othersOf, slots });
  assert.equal(r.letter, 1, 'the first from the left');
  const t = afterTry(r, swap);
  assert.deepEqual(t.locked.map(Boolean), [true, false, true, false]);
  const kept = swap.filter((st) => !t.fade.includes(st) && !t.locked.some((g) => g?.includes(st)));
  assert.equal(kept.length, r.groups[3].length, 'the y\'s strokes stay on the lines, waiting');
  // She fixes the i; the y (still wrong) is shown next.
  const next = scoreName([...kept, ...inWideSlots('Lily', 'Lily', { only: [1] })], letters, chars, { othersOf, slots, locked: t.locked });
  assert.equal(next.ok, false);
  assert.equal(next.letter, 3);
  assert.ok(next.letters[1].ok, 'the i is right now');
});

test('a rewrite drawn a little over a locked neighbour\'s box still belongs to the letter being rewritten', () => {
  const { chars, letters, slots } = wideSetup('Mia');
  const first = inWideSlots('Mia', 'Mio');
  const t = afterTry(scoreName(first, letters, chars, { othersOf, slots }), first);
  assert.equal(t.rewrite, 2);
  const shifted = inWideSlots('Mia', 'Mia', { only: [2] }).map((st) => st.map(([x, y]) => [x - 0.2, y])); // into the i's box
  const r = scoreName(shifted, letters, chars, { othersOf, slots, locked: t.locked });
  assert.equal(r.ok, true, `${r.reason} at ${r.letter}`);
  assert.equal(r.groups[2].length, 2);
});

test('an unclear stroke that asked for a rewrite fades with that letter', () => {
  const { chars, letters, slots } = wideSetup('Mia');
  const M = letters[0].strokes.map((st) => st.points);
  const I = letters[1].strokes.map((st) => st.points);
  const A = letters[2].strokes.map((st) => st.points);
  const edge = letters[0].x + letters[0].width;
  const extra = line([edge - 0.14, 0.3], [edge + 0.14, 0.7]); // half in the M's box, half in the i's
  const strokes = [...M, ...I, extra, ...A];
  const r = scoreName(strokes, letters, chars, { othersOf, slots });
  assert.equal(r.reason, 'overlap');
  assert.equal(r.letter, 0);
  const t = afterTry(r, strokes);
  assert.ok(t.fade.includes(extra), 'the stray stroke goes with the M');
  assert.deepEqual(t.locked.map(Boolean), [false, true, true]);
});

test('the log entry says which letters were judged this time', () => {
  const { chars, letters, slots } = wideSetup('Lily');
  const first = inWideSlots('Lily', 'Liiy');
  const r1 = scoreName(first, letters, chars, { othersOf, slots });
  assert.deepEqual(nameCopyLogEntry({ result: r1, attempt: 1 }).open, [0, 1, 2, 3]);
  const t = afterTry(r1, first);
  const r2 = scoreName(inWideSlots('Lily', 'Lily', { only: [2] }), letters, chars, { othersOf, slots, locked: t.locked });
  assert.deepEqual(nameCopyLogEntry({ result: r2, attempt: 2 }).open, [2]);
});

test('on screen: only that letter fades, the rest stay locked, and its slot stays softly gold until she rewrites it', () => {
  for (const file of ['src/name-game.js', 'src/name-practice-game.js']) {
    const s = src(file);
    const j = s.slice(s.indexOf('async function judgeName('), s.indexOf('async function judgeName(') + 4000);
    assert.match(j, /const t = afterTry\(result, copy\.strokes, copy\.locked\);/, file);
    assert.match(j, /for \(const id of fading\) ink\.fade\(id, CONFIG\.copyFadeMs\);/, `${file}: only that letter fades`);
    assert.match(j, /copy\.locked = t\.locked;\s*copy\.rewrite = t\.rewrite;/, `${file}: the rest are locked`);
    assert.match(s, /\{ focus: copy\?\.rewrite \?\? null \}/, `${file}: the slot to rewrite is drawn as the focus`);
    assert.match(s, /glowSlot\(result\.letter, CONFIG\.copyReasonMs\); \/\/ Slice 5O part 4: where the next letter goes/, `${file}: the hint shows where the next letter goes`);
    assert.match(s, /placeInSlots\(loaded\)/, `${file}: the copy screens place letters in slots of the minimum width`);
  }
  // Never stuck on the practice page: Jugnu writes only the letters still open.
  const practice = src('src/name-practice-game.js');
  assert.match(practice, /if \(!\(await jugnuWrites\(open\)\)\) return;/);
  assert.match(practice, /const paths = placed\.flatMap\(\(c, i\) => \(only && !only\.includes\(i\) \? \[\] :/);
});

