// Run: node --test tests/name-copy.test.js
// Slice 9C part 2: her name's copy-it round, the reward's name card, and the
// name's star and reviews. Every name here is made up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nameOf, placeLetters, nameWidth, nameCopyLayout, nameLayout, NAME_FIT, NAME_CARD, NAME_ID } from '../src/name.js';
import { scoreName, assignStrokes, nameCompareIds, twinOf, nameCopyLogEntry, NAME_COPY } from '../src/name-copy.js';
import { compareIds } from '../src/copy.js';
import { nameCopyNote } from '../src/notes.js';
import { nameHelperMarks } from '../src/render.js';
import { charFile, navigate, REVIEW_ORDER, BOARD_ORDER, booksWithDue } from '../src/session.js';
import { finishCopy, startHelper, applyHelperCopy, starEarned } from '../src/progress.js';
import { recordPractice, recordReview, pickToday, dueToday, emptyReviews, cleanPracticeMore } from '../src/review.js';
import { cleanFinds, addNameCard, isNameCard, NAME_CARD as CARD_ENTRY } from '../src/finds.js';
import { nameCardArt } from '../src/art.js';
import { saveNameCard, readFinds, saveFind, resetName } from '../src/storage.js';
import { seeded, wobble, slant } from './crude-letters.js';

const cache = new Map();
const load = (id) => {
  if (!cache.has(id)) cache.set(id, JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8')));
  return cache.get(id);
};
const othersOf = (id) => nameCompareIds(id).map(load);

// Her name set up for judging: the letters placed, and their own files.
function nameSetup(raw) {
  const ids = nameOf(raw).letters;
  const chars = ids.map(load);
  return { ids, chars, letters: placeLetters(chars) };
}

// `written` (the letters she writes) laid out on the lines from `dx`, at size
// `k` (standing on the grass line), with `gap` extra space between letters.
// Returns her strokes in the order she drew them, and which letter each came from.
function writeName(written, { dx = 0.3, k = 1, gap = 0, order = null, hand = null } = {}) {
  const chars = [...written].map(load);
  let x = dx;
  const perLetter = chars.map((c) => {
    const strokes = c.strokes.map((s) => s.points.map(([px, py]) => [x + px * k, 1 - (1 - py) * k]));
    x += (c.width + gap) * k;
    return strokes;
  });
  const rnd = seeded(7);
  const shaped = hand ? perLetter.map((s) => slant(wobble(s, hand.amp, rnd), hand.slant)) : perLetter;
  const letterOrder = order ?? shaped.map((_, i) => i);
  return letterOrder.flatMap((i) => shaped[i]);
}

const judge = (raw, written, opts) => {
  const { letters, chars, ids } = nameSetup(raw);
  const result = scoreName(writeName(written, opts), letters, chars, { othersOf });
  return { result, note: nameCopyNote(result, ids), ids };
};

// ---------------------------------------------------------------------------
// What each letter is compared with

test('each letter is compared as on its own, plus its twin in the other case', () => {
  assert.equal(twinOf('a'), 'A');
  assert.equal(twinOf('S'), 's');
  assert.equal(twinOf('7'), null);
  const a = nameCompareIds('a');
  assert.ok(a.includes('A'), 'its capital');
  assert.ok(!a.includes('a'), 'never itself');
  for (const id of compareIds('a').filter((x) => x !== 'a')) assert.ok(a.includes(id));
  assert.ok(nameCompareIds('S').includes('s'));
});

// ---------------------------------------------------------------------------
// Her strokes given to the letters

test('her strokes go to the right letters, by where they are along the line', () => {
  for (const raw of ['Sara', 'Isabella', 'Muhammad', 'Ali', 'Zoya', 'Jaxon']) {
    const { letters, chars } = nameSetup(raw);
    const strokes = writeName(nameOf(raw).word);
    const { groups } = assignStrokes(strokes, letters);
    let i = 0;
    groups.forEach((g, k) => {
      assert.equal(g?.length, chars[k].strokes.length, `${raw}: letter ${k + 1} (${chars[k].id})`);
      for (const pts of g) assert.equal(pts, strokes[i++], `${raw}: letter ${k + 1} has its own strokes`);
    });
  }
});

test('the assignment holds when she writes tight, spread out, small, big or in another order', () => {
  const { letters } = nameSetup('Sara');
  const cases = [{ gap: -0.12 }, { gap: 0.35 }, { k: 0.8 }, { k: 1.2 }, { dx: -0.6 }, { order: [3, 2, 1, 0] }, { order: [0, 2, 1, 3] }];
  for (const opts of cases) {
    const { groups } = assignStrokes(writeName('Sara', opts), letters);
    assert.deepEqual(groups.map((g) => g?.length ?? 0), [1, 2, 2, 2], JSON.stringify(opts));
  }
});

test('a letter left out gets no strokes, and the others keep theirs', () => {
  const { letters } = nameSetup('Sara');
  assert.deepEqual(assignStrokes(writeName('Saa'), letters).groups.map((g) => g?.length ?? 0), [1, 2, 0, 2]);
  assert.deepEqual(assignStrokes([], letters).groups, [null, null, null, null]);
  assert.ok(NAME_COPY.skip > NAME_COPY.worst, 'a wrong letter is read as written, not as left out');
});

// ---------------------------------------------------------------------------
// Passing

test('a correct name passes: neat, wobbly, slanted, small, big, tight or spread out', () => {
  const hands = [null, { amp: 0.02, slant: 0.08 }, { amp: 0.025, slant: -0.06 }];
  for (const raw of ['Sara', 'Ali', 'Zoya', 'Amina', 'Isabella', 'Muhammad', 'Jaxon']) {
    for (const hand of hands) {
      const { result } = judge(raw, nameOf(raw).word, { hand });
      assert.equal(result.ok, true, `${raw} ${JSON.stringify(hand)}: ${result.reason} at ${result.letter}`);
    }
  }
  for (const opts of [{ k: 0.85 }, { k: 1.15 }, { gap: -0.1 }, { gap: 0.3 }]) {
    assert.equal(judge('Sara', 'Sara', opts).result.ok, true, JSON.stringify(opts));
  }
  const { result, note } = judge('Sara', 'Sara');
  assert.equal(result.reason, null);
  assert.equal(result.letter, null);
  assert.equal(note, null);
  assert.ok(result.letters.every((x) => x.ok && x.strokes > 0));
});

test('order habits are coached, never failed: the letters written right to left still pass', () => {
  const { result, note } = judge('Sara', 'Sara', { order: [3, 2, 1, 0] });
  assert.equal(result.ok, true);
  assert.equal(result.habits.order, 'other');
  assert.equal(result.habits.usual, false);
  assert.deepEqual(result.habits.coach, [0, 1, 2, 3], 'Jugnu shows the whole name the usual way');
  assert.equal(note, 'Well done! Here is the usual way.');
  const usual = judge('Sara', 'Sara').result;
  assert.equal(usual.habits.order, 'usual');
  assert.equal(usual.habits.usual, true);
});

// ---------------------------------------------------------------------------
// Failing, with the letter named

test('a missing letter fails, naming the letter: "Almost! The r is missing."', () => {
  const { result, note } = judge('Sara', 'Saa');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing-letter');
  assert.equal(result.letter, 2);
  assert.equal(note, 'Almost! The r is missing.');
  assert.equal(result.show.whole, true, 'Jugnu draws the whole r on the card');
  assert.equal(result.show.paths.length, load('r').strokes.length);
  const m = judge('Muhammad', 'Muhamad').result;
  assert.equal(m.reason, 'missing-letter');
  assert.ok(['m'].includes(nameSetup('Muhammad').ids[m.letter]));
});

test('a wrong letter fails as what it looks like, and that letter glows: "Almost! That looks like n."', () => {
  const { result, note } = judge('Sara', 'Sana');
  assert.equal(result.reason, 'looks-like');
  assert.equal(result.letter, 2);
  assert.equal(result.lookalike, 'n');
  assert.equal(note, 'Almost! That looks like n.');
  assert.equal(result.show.whole, true, 'the whole r glows on the card');
  // Another letter in place of a: never read as the a left out.
  const x = judge('Sara', 'Sxra').result;
  assert.equal(x.reason, 'looks-like');
  assert.equal(x.letter, 1);
  assert.equal(x.lookalike, 'x');
  const o = judge('Zoya', 'Zoyo');
  assert.equal(o.result.letter, 3);
  assert.equal(o.note, 'Almost! That looks like o.');
});

test('a capital in the wrong place fails with a clear reason, either way round', () => {
  let r = judge('Sara', 'SAra');
  assert.equal(r.result.reason, 'wrong-case');
  assert.equal(r.result.letter, 1);
  assert.equal(r.note, 'Almost! The a is a small letter.');
  r = judge('Sara', 'sara');
  assert.equal(r.result.reason, 'wrong-case');
  assert.equal(r.result.letter, 0);
  assert.equal(r.note, 'Almost! The S is a capital letter.');
  // Twins of the same shape (s and S) are told apart by their size on the lines.
  r = judge('Oscar', 'OScar');
  assert.equal(r.result.reason, 'wrong-case');
  assert.equal(r.result.letter, 1);
  assert.equal(r.note, 'Almost! The s is a small letter.');
});

test('a missing part names its letter: "Almost! The dot of the i is missing."', () => {
  const { letters, chars, ids } = nameSetup('Ali');
  const strokes = writeName('Ali').filter((pts) => pts.length > 1); // the dot of i left out
  const result = scoreName(strokes, letters, chars, { othersOf });
  assert.equal(result.reason, 'missing-stroke');
  assert.equal(result.letter, 2);
  assert.equal(nameCopyNote(result, ids), 'Almost! The dot of the i is missing.');
  assert.equal(result.show.whole, false, 'Jugnu draws only the dot');
});

test('the first letter that did not count, from the left, says why', () => {
  const { result } = judge('Sara', 'Snna'); // the a and the r both wrong
  assert.equal(result.letter, 1);
  assert.equal(result.letters[2].ok, false);
});

// ---------------------------------------------------------------------------
// Stopped part way: a hint, not a fail

test('letters not written yet at the end: unfinished, Jugnu shows the next letter', () => {
  let r = judge('Sara', 'Sar');
  assert.equal(r.result.ok, false);
  assert.equal(r.result.reason, 'unfinished');
  assert.equal(r.result.letter, 3);
  assert.equal(r.note, 'Here is the next letter.');
  assert.equal(r.result.show.whole, true);
  // Even when a letter before it is off: she has not finished, so nothing is judged yet.
  r = judge('Sara', 'Sn');
  assert.equal(r.result.reason, 'unfinished');
  assert.equal(r.result.letter, 2);
  r = judge('Ali', 'Al');
  assert.equal(r.result.reason, 'unfinished');
  assert.equal(r.result.letter, 2);
  // Nothing at all: no letter.
  const { letters, chars } = nameSetup('Sara');
  assert.equal(scoreName([], letters, chars, { othersOf }).reason, 'no-letter');
});

// ---------------------------------------------------------------------------
// The parent lines

test('every reason has a kind line that names the letter', () => {
  const ids = ['S', 'a', 'r', 'a'];
  const line = (reason, extra = {}) => nameCopyNote({ ok: false, reason, letter: 2, letters: [{}, {}, { part: null }, {}], ...extra }, ids);
  assert.equal(line('too-small'), 'Make the r bigger.');
  assert.equal(line('too-big'), 'Make the r a little smaller.');
  assert.equal(line('position-tall'), 'Make the r reach up high.');
  assert.equal(line('position-small'), 'Keep the r between the fence and the grass.');
  assert.equal(line('position-tail'), 'Let the tail of the r go below the grass.');
  assert.equal(line('unrecognized'), "Let's watch Jugnu write the r.");
  assert.equal(line('looks-like', { letters: [{}, {}, { part: 'arch' }, {}] }), 'Almost! The arch of the r is missing.');
  assert.equal(line('missing-stroke'), 'Almost! A line of the r is missing.');
  for (const reason of ['too-small', 'unrecognized', 'missing-letter', 'wrong-case']) assert.doesNotMatch(line(reason), /wrong|bad|error|fail/i);
});

// ---------------------------------------------------------------------------
// The screen: the model card above the lines, and the helper

test('round 3: the model card sits above the lines in her room, and the lines stay on the board', () => {
  for (const raw of ['Ali', 'Sara', 'Isabella', 'Muhammad', 'Ommmmmmm']) {
    const width = nameWidth(nameOf(raw).letters.map(load));
    for (const [w, h] of [[1280, 626], [1280, 800]]) {
      const L = nameCopyLayout(w, h, width);
      const base = nameLayout(w, h, width);
      const label = `${raw} at ${w} x ${h}`;
      assert.equal(L.unit, base.unit, `${label}: the same size as rounds 1 and 2`);
      assert.equal(L.offset, base.offset, `${label}: the same place across`);
      assert.ok(L.card.x >= NAME_FIT.left - 1e-6 && L.card.x + L.card.w <= w - NAME_FIT.right + 1e-6, label);
      assert.ok(L.card.y >= NAME_FIT.top, `${label}: below the round lights`);
      assert.ok(L.top >= L.card.y + L.card.h, `${label}: the lines under the card`);
      assert.ok(L.top + 1.5 * L.unit <= h - NAME_CARD.bottom + 1e-6, `${label}: the lines on the board`);
      assert.ok(L.card.k >= 0.3 * L.unit && L.card.k <= NAME_CARD.max * L.unit + 1e-9, `${label}: card size ${L.card.k / L.unit}`);
    }
  }
});

test('the fading helper for her name: a ghost and one dot, then a dot per letter, then nothing', () => {
  const { letters } = nameSetup('Sara');
  const one = nameHelperMarks(letters, 1, []);
  assert.equal(one.ghost.length, letters.reduce((n, c) => n + c.strokes.length, 0));
  assert.deepEqual(one.dots, [{ at: letters[0].strokes[0].points[0], label: null }]);
  assert.deepEqual(nameHelperMarks(letters, 1, [true]).dots, [], 'the first dot goes once she begins');
  const two = nameHelperMarks(letters, 2, [true, false, true, false]);
  assert.deepEqual(two.ghost, []);
  assert.deepEqual(two.dots.map((d) => d.at), [letters[1].strokes[0].points[0], letters[3].strokes[0].points[0]]);
  assert.ok(two.dots.every((d) => d.label === null), 'no numbers');
  assert.deepEqual(nameHelperMarks(letters, 3, []), { ghost: [], dots: [] });
});

test('the helper level moves with her name\'s copies as with a letter\'s', () => {
  let h = startHelper(null);
  h = applyHelperCopy(h, { ok: true });
  h = applyHelperCopy(h, { ok: true });
  assert.equal(h.level, 2);
  h = applyHelperCopy(h, { ok: true, hinted: true }); // a hint (she stopped part way) does not count
  assert.equal(h.passes, 0);
});

// ---------------------------------------------------------------------------
// Round 3's tries, the star and reviews

test('the star: a whole practice with no help; 3 failed copies end the round with help', () => {
  let rp = { round: 2, helped: false };
  let r = finishCopy(rp, { ok: true, fails: 0 });
  assert.equal(r.allDone, true);
  assert.equal(starEarned(r.state), true);
  r = finishCopy(rp, { ok: false, fails: 0 });
  assert.equal(r.again, true);
  r = finishCopy(rp, { ok: false, fails: 2 });
  assert.equal(r.helpedOut, true);
  assert.equal(starEarned(r.state), false);
  rp = { round: 2, helped: true }; // Jugnu helped in round 1 or 2
  assert.equal(starEarned(finishCopy(rp, { ok: true, fails: 0 }).state), false);
});

test('her name comes back for review on the usual schedule, first in the order', () => {
  const s = { reviews: emptyReviews(), list: [] };
  const p = recordPractice(s, NAME_ID, { helped: false, failedCopies: 0, wrongStarts: 0 }, '2026-11-17');
  assert.deepEqual(p.reviews.letters[NAME_ID], { step: 0, due: '2026-11-18' });
  let reviews = { ...p.reviews, letters: { ...p.reviews.letters, A: { step: 0, due: '2026-11-18' }, B: { step: 0, due: '2026-11-18' } } };
  reviews = pickToday(reviews, '2026-11-18', REVIEW_ORDER);
  assert.deepEqual(dueToday(reviews, '2026-11-18'), [NAME_ID, 'A'], 'at most 2, her name first on a tie');
  assert.deepEqual(REVIEW_ORDER, ['name', ...BOARD_ORDER]);
  assert.deepEqual(booksWithDue([NAME_ID]), ['name'], 'the name book glows');
  // A clean review moves it on to 3 days; a failed one sends it back to 1 day.
  const ok = recordReview({ reviews, list: [] }, NAME_ID, { ok: true }, '2026-11-18');
  assert.deepEqual(ok.reviews.letters[NAME_ID], { step: 1, due: '2026-11-21' });
  assert.equal(ok.entry.result, 'pass');
  const bad = recordReview({ reviews, list: [] }, NAME_ID, { ok: false, failedCopies: 3 }, '2026-11-18');
  assert.deepEqual(bad.reviews.letters[NAME_ID], { step: 0, due: '2026-11-19' });
  assert.deepEqual(cleanPracticeMore(bad.list).map((e) => e.id), [NAME_ID]);
});

test('a due name opens as a review: round 3 alone', () => {
  const book = { screen: 'name' };
  assert.deepEqual(navigate(book, { type: 'openName', ready: true, review: true }), { screen: 'write', char: 'name', book: 'name', review: true });
  assert.deepEqual(navigate(book, { type: 'openName', ready: true }), { screen: 'write', char: 'name', book: 'name' });
  const src = readFileSync(new URL('../src/name-game.js', import.meta.url), 'utf8');
  assert.match(src, /review \? \{ round: rounds - 1, helped: false \}/);
  assert.match(src, /keepRounds\(\(\) => saveRounds/);
});

// ---------------------------------------------------------------------------
// The name card on her shelf of finds

function memoryStore() {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
}

test('her name card: kept once, at the newest place, and her name is never stored in it', () => {
  assert.deepEqual(CARD_ENTRY, { nm: 1 });
  assert.deepEqual(cleanFinds([{ nm: 1 }, { nm: 2 }, { nm: 'Sara' }]), [{ nm: 1 }]);
  const list = addNameCard([{ nm: 1 }, { o: 'ball' }]);
  assert.deepEqual(list, [{ o: 'ball' }, { nm: 1 }]);
  const store = memoryStore();
  saveFind({ o: 'ball' }, store);
  saveNameCard(store);
  saveFind({ o: 'apple' }, store);
  saveNameCard(store);
  assert.deepEqual(readFinds(store), [{ o: 'ball' }, { o: 'apple' }, { nm: 1 }]);
  assert.ok(readFinds(store).filter(isNameCard).length === 1);
  // A changed name takes its card off the shelf.
  resetName(NAME_ID, store);
  assert.deepEqual(readFinds(store), [{ o: 'ball' }, { o: 'apple' }]);
});

test('the name card shows her name, and the gold star only when she earned it', () => {
  const plain = nameCardArt('Sara');
  assert.match(plain, />Sara</);
  assert.doesNotMatch(plain, /#FFC21A/);
  assert.match(nameCardArt('Sara', true), /#FFC21A/);
  assert.doesNotMatch(nameCardArt('<b>'), /<b>/);
});

// ---------------------------------------------------------------------------
// The log

test('the name log entry for a judged copy: each letter\'s result', () => {
  const { result } = judge('Sara', 'Sana');
  const e = nameCopyLogEntry({ result, attempt: 1, helper: 1, now: new Date('2026-11-17T09:00:00Z') });
  assert.equal(e.type, 'name');
  assert.equal(e.round, 3);
  assert.equal(e.review, false);
  assert.equal(e.ok, false);
  assert.equal(e.reason, 'looks-like');
  assert.equal(e.letter, 2);
  assert.equal(e.order, 'usual');
  assert.deepEqual(e.letters.map((x) => x.letter), ['S', 'a', 'r', 'a']);
  assert.deepEqual(e.letters.map((x) => x.ok), [true, true, false, true]);
  assert.equal(e.letters[2].lookalike, 'n');
  assert.ok(e.letters.every((x) => Number.isInteger(x.strokes) && 'distance' in x && 'usual' in x));
  assert.doesNotThrow(() => JSON.stringify(e));
});
