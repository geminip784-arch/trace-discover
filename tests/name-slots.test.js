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
import { nameOf, placeLetters, nameSlots, NAME_SLOTS, slotLook } from '../src/name.js';
import {
  scoreName, nameCompareIds, assignBySlots, slotShares, slotOf, onSlots, NAME_SLOT_RULES, nameCopyLogEntry,
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
  assert.match(game, /drawNameSlots\(els\.lines, layout, layout\.offset, slots, slotLook\(helper\.level\)\)/);
  assert.match(game, /scoreName\(copy\.strokes, placed, loaded, \{ othersOf, slots \}\)/);
  const practice = src('src/name-practice-game.js');
  assert.match(practice, /drawNameSlots\(els\.lines, layout, layout\.offset, slots, 'outline'\)/);
  assert.match(practice, /scoreNameScreen\(copy\.strokes, placed, loaded, \{ othersOf, slots \}\)/);
});

test('when her name does not count, the slot of the letter it is about glows, over her faint ink', () => {
  for (const file of ['src/name-game.js', 'src/name-practice-game.js']) {
    const s = src(file);
    const why = s.slice(s.indexOf('async function showWhy('), s.indexOf('async function judgeName('));
    const faint = why.indexOf('if (!(await faintFirst())) return false;');
    const glow = why.indexOf('fx.slotGlow(');
    assert.ok(faint > 0 && glow > faint, `${file}: her ink goes faint first, then the slot glows`);
    assert.match(why, /const sl = slots\[result\.letter\];/, `${file}: only that letter's slot`);
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
