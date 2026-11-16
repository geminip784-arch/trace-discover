// Run: node --test tests/numbers-copy.test.js
// Slice 9B part 2: numbers 10 to 20 on the 123 board and in round 3, where each
// digit is judged on its own (src/copy.js scoreNumber). Uses the real files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  scoreCopy, compareIds, copyShow, copyStatus, copyReady, copyLogEntry, splitDigits, isNumber, NUMBER_SPLIT,
} from '../src/copy.js';
import { copyNote } from '../src/notes.js';
import { planCount, planStrokes } from '../src/variants.js';
import { numberShift, NUMBER_IDS } from '../data/glyphs.js';
import {
  BOARDS, boardTiles, boardGrid, boardSpace, bookOf, navigate, pageOf, BOARD_BOX,
} from '../src/session.js';
import { HELPER, startHelper, applyHelperCopy } from '../src/progress.js';
import { readHelper, saveHelper } from '../src/storage.js';
import { emptyReviews, recordPractice, recordReview, pickToday, dueToday } from '../src/review.js';
import { afterWriting } from '../src/finds.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${id}.json`, import.meta.url), 'utf8'));
const MANIFEST = JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url), 'utf8'));
const othersOf = (id) => compareIds(id).filter((c) => c !== id).map(load);
const judge = (id, strokes) => scoreCopy(strokes, load(id), { others: othersOf(id) });
const pts = (strokes) => strokes.map((s) => s.points.map(([x, y]) => [x, y]));
const move = (strokes, dx = 0, dy = 0, k = 1) => strokes.map((p) => p.map(([x, y]) => [x * k + dx, y * k + dy]));
const wobble = (strokes, a = 0.015) => strokes.map((p) => p.map(([x, y], i) => [x + a * Math.sin(i / 2), y + a * Math.cos(i / 3)]));
// Two digits written side by side, as the generator places them.
const written = (l, r) => [...pts(load(l).strokes), ...move(pts(load(r).strokes), numberShift(`${l}${r}`))];
const mirrorDigit = (d) => pts(load(d).strokes).map((p) => p.map(([x, y]) => [load(d).width - x, y]));

// ---- the board ----

test('the 123 board is 0 to 20 in rows of ten: each teen under its ones digit, 20 under 0', () => {
  const ids = BOARDS.num.tiles.map((t) => t.id);
  assert.deepEqual(ids, Array.from({ length: 21 }, (_, k) => String(k)));
  assert.equal(BOARDS.num.cols, 10);
  for (let n = 10; n <= 20; n++) assert.equal(ids.indexOf(String(n)) % 10, n % 10, `${n} under ${n % 10}`);
  for (const id of NUMBER_IDS) {
    assert.equal(bookOf(id), 'num');
    assert.equal(pageOf(id), 'all');
    assert.ok(MANIFEST.includes(id));
  }
});

test('the 123 tiles stay at least 88 px on both screens; the other boards keep their best fit', () => {
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    const s = boardSpace(w, h);
    const g = boardGrid('num', 21, s.w, s.h, BOARD_BOX.gap);
    assert.deepEqual([g.cols, g.rows], [10, 3]);
    assert.ok(g.size >= 88, `${w}x${h}: ${g.size} px`);
    assert.ok(g.cols * g.size + (g.cols - 1) * BOARD_BOX.gap <= s.w);
    assert.equal(boardGrid('abc', 27, s.w, s.h).cols, 7); // ABC: as before
  }
});

test('stars, due reviews and opening a tile work for 10 to 20 as for 0 to 9', () => {
  const tiles = boardTiles('num', MANIFEST, ['17', '3'], ['12']);
  const t = (id) => tiles.find((x) => x.id === id);
  assert.equal(tiles.length, 21);
  assert.ok(t('17').bright && t('17').star && !t('17').due);
  assert.ok(t('12').due && !t('12').star);
  assert.ok(t('3').star);
  const board = { screen: 'board', book: 'num' };
  assert.deepEqual(navigate(board, { type: 'openChar', id: '17', manifest: MANIFEST }), { screen: 'write', char: '17', book: 'num' });
  assert.deepEqual(navigate(board, { type: 'openChar', id: '12', manifest: MANIFEST, review: true }), { screen: 'write', char: '12', book: 'num', review: true });
  assert.deepEqual(navigate({ screen: 'write', char: '17', book: 'num' }, { type: 'letterDone' }), board);
  // No count scene for 10 to 20 until part 3: back to the board and its star.
  assert.equal(afterWriting('17'), 'letterDone');
});

test('reviews: a starred 17 is scheduled, comes due and is picked in board order (after 9)', () => {
  let s = { reviews: emptyReviews(), list: [] };
  s = recordPractice(s, '17', { star: true, helped: false, failedCopies: 0, wrongStarts: 0, mirrored: 0 }, '2026-11-16');
  assert.ok(s.reviews.letters['17'], 'scheduled');
  const due = s.reviews.letters['17'].due;
  const picked = pickToday({ ...s.reviews, letters: { ...s.reviews.letters, 9: { step: 0, due } } }, due, BOARDS.num.tiles.map((x) => x.id));
  assert.deepEqual(dueToday(picked, due), ['9', '17']);
  const after = recordReview(s, '17', { ok: true, helped: false, failedCopies: 0, wrongStarts: 0, mirrored: 0 }, due);
  assert.ok(after.reviews.letters['17'].step > s.reviews.letters['17'].step);
});

test('the fading helper is kept per number, as per digit', () => {
  const map = new Map();
  const store = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) };
  let h = startHelper(readHelper('17', store));
  assert.equal(h.level, HELPER.start);
  for (let i = 0; i < HELPER.passesUp; i++) h = applyHelperCopy(h, { ok: true });
  saveHelper('17', h, store);
  assert.equal(readHelper('17', store).level, HELPER.start + 1);
  assert.equal(readHelper('7', store), null);
});

// ---- round 3: what is compared ----

test('a single digit is compared with 0 to 9 and its look-alike only, never with 10 to 20', () => {
  for (const d of '0123456789') {
    const ids = compareIds(d);
    assert.ok(ids.every((id) => id.length === 1), `${d}: ${ids}`);
    assert.deepEqual(ids.filter((id) => /\d/.test(id)), [...'0123456789'], d);
  }
  assert.deepEqual(compareIds('5'), [...'0123456789', 'S']);
  assert.deepEqual(compareIds('17'), [...'0123456789', 'I']);
  assert.deepEqual(compareIds('20'), [...'0123456789', 'Z', 'O']);
  assert.ok(isNumber(load('17')) && !isNumber(load('7')));
});

// ---- round 3: passes ----

test('every number passes in every plan, anywhere on the lines, a little bigger or smaller', () => {
  for (const id of NUMBER_IDS) {
    const char = load(id);
    for (let p = 0; p < planCount(char); p++) {
      for (const [dx, dy, k] of [[0, 0, 1], [0.6, 0, 0.85], [-0.2, -0.1, 1.15]]) {
        const r = judge(id, wobble(move(pts(planStrokes(char, p)), dx, dy, k)));
        assert.ok(r.ok, `${id} plan ${p + 1} at ${dx},${dy} x${k}: ${r.reason}`);
        assert.equal(r.habits.order, 'usual', `${id} plan ${p + 1}`);
      }
    }
  }
});

test('digits a little closer or further apart than the model still pass', () => {
  for (const id of NUMBER_IDS) {
    const [l, r] = id.split('');
    for (const shift of [-0.12, 0.2]) {
      const strokes = [...pts(load(l).strokes), ...move(pts(load(r).strokes), numberShift(id) + shift)];
      assert.ok(judge(id, strokes).ok, `${id} gap ${0.25 + shift}`);
    }
  }
});

test('the right digit first is a habit: it passes, and Jugnu shows the usual way', () => {
  for (const id of NUMBER_IDS) {
    const char = load(id);
    const nl = load(id[0]).strokes.length;
    const all = pts(char.strokes);
    const r = judge(id, [...all.slice(nl), ...all.slice(0, nl)]);
    assert.ok(r.ok, `${id}: ${r.reason}`);
    assert.equal(r.habits.order, 'different', id);
    assert.equal(copyShow(r), 'usual-way', id);
    assert.equal(copyNote(r), 'Well done! Here is the usual way.');
  }
});

test('a reversed digit passes and is coached, as a single digit is', () => {
  // Right digits that look different in a mirror (0, 1 and 8 look much the same).
  for (const id of ['12', '13', '14', '15', '16', '17', '19']) {
    const [l, r] = id.split('');
    const right = judge(id, [...pts(load(l).strokes), ...move(mirrorDigit(r), numberShift(id))]);
    assert.ok(right.ok && right.mirrored, `${id}, its ${r} reversed: ${right.reason}`);
    assert.equal(copyShow(right), 'right-way', id);
    assert.equal(copyNote(right), 'It faces the other way. Watch Jugnu.');
  }
  const left = judge('20', [...mirrorDigit('2'), ...move(pts(load('0').strokes), numberShift('20'))]);
  assert.ok(left.ok && left.mirrored, `20, its 2 reversed: ${left.reason}`);
});

// ---- round 3: fails, each with a sensible reason ----

test('a wrong digit fails: it looks like another number, or a part of the digit is missing', () => {
  let count = 0;
  for (const id of NUMBER_IDS) {
    for (const side of [0, 1]) {
      for (const d of '0123456789') {
        const ds = id.split('');
        if (ds[side] === d) continue;
        ds[side] = d;
        const r = judge(id, written(ds[0], ds[1]));
        count += 1;
        assert.equal(r.ok, false, `${id} written as ${ds.join('')}`);
        assert.equal(r.reason, 'looks-like', `${id} written as ${ds.join('')}`);
        const note = copyNote(r);
        // Either the number it makes ("That looks like 13.") or the part of her digit that is missing.
        if (r.missing) assert.match(note, new RegExp(`^Almost! The .+ of the ${id[side]} (is|are) missing\\.$`), note);
        else assert.equal(note, `Almost! That looks like ${ds.join('')}.`);
        assert.equal(copyShow(r), 'beside');
      }
    }
  }
  assert.equal(count, 198);
  assert.equal(copyNote(judge('17', written('1', '3'))), 'Almost! That looks like 13.');
  assert.equal(copyNote(judge('12', written('1', '5'))), 'Almost! That looks like 15.');
});

test('a letter for a digit is named as the letter (S for the 5 of 15)', () => {
  const r = judge('15', [...pts(load('1').strokes), ...move(pts(load('S').strokes), numberShift('15'))]);
  assert.equal(r.reason, 'looks-like');
  assert.equal(r.lookalike, 'S');
});

test('swapped digits fail: 12 written as 21 says the 1 comes first', () => {
  for (const id of NUMBER_IDS.filter((n) => n[0] !== n[1])) {
    const [l, r] = id.split('');
    const res = judge(id, written(r, l));
    assert.equal(res.ok, false, id);
    assert.equal(res.reason, 'swapped-digits', `${id} as ${r}${l}: ${res.reason}`);
    assert.equal(res.lookalike, `${r}${l}`);
    assert.equal(copyNote(res), `Almost! The ${l} comes first.`);
    assert.equal(copyShow(res), 'beside');
  }
  // The whole number turned round in a mirror is its digits swapped (and turned) too.
  const ten = load('10');
  const r = judge('10', pts(ten.strokes).map((p) => p.map(([x, y]) => [ten.width - x, y])));
  assert.equal(r.reason, 'swapped-digits');
});

test('a missing digit fails: Jugnu draws the digit she left out', () => {
  for (const id of NUMBER_IDS) {
    const [l, r] = id.split('');
    for (const [only, gone] of [[r, 0], [l, 1]]) {
      const res = judge(id, pts(load(only).strokes));
      assert.equal(res.ok, false, id);
      assert.equal(res.reason, 'missing-digit', `${id} as ${only}: ${res.reason}`);
      // 11 as 1: either 1 is the one left out.
      if (l !== r) assert.equal(res.missing.digit, gone, `${id} as ${only}`);
      assert.equal(res.missing.part, id[res.missing.digit]);
      assert.equal(copyNote(res), `Almost! The ${id[res.missing.digit]} is missing.`);
      assert.equal(copyShow(res), 'part');
      // The digit's strokes, where it stands in the number.
      const digit = load(id[res.missing.digit]);
      assert.equal(res.missing.paths.length, digit.strokes.length);
      const dx = load(id).digits[res.missing.digit].x;
      assert.ok(Math.abs(res.missing.paths[0][0][0] - (digit.strokes[0].points[0][0] + dx)) < 1e-9);
    }
  }
});

test('a part of a digit left out is named with its digit', () => {
  const r17 = judge('17', pts(load('17').strokes).slice(0, 3)); // no slant
  assert.equal(r17.reason, 'missing-stroke');
  assert.equal(copyNote(r17), 'Almost! The slant of the 7 is missing.');
  assert.equal(copyShow(r17), 'part');
  const r14 = judge('14', pts(load('14').strokes).slice(0, 4)); // no bar
  assert.equal(copyNote(r14), 'Almost! The bar of the 4 is missing.');
  // A plural part keeps its verb: "the bumps of the 3 are missing".
  assert.equal(copyNote({ ok: false, reason: 'missing-stroke', missing: { part: 'bumps of the 3' } }), 'Almost! The bumps of the 3 are missing.');
});

test('size: the whole number, and each digit, must be the right size', () => {
  const all = pts(load('17').strokes);
  assert.equal(judge('17', move(all, 0.2, 0.3, 0.6)).reason, 'too-small');
  assert.equal(judge('17', move(all, -0.1, -0.2, 1.4)).reason, 'too-big');
  assert.equal(copyNote(judge('17', move(all, 0.2, 0.3, 0.6))), 'Make it bigger.');
  // The 7 small beside a full-size 1.
  const tiny7 = [...pts(load('1').strokes), ...move(pts(load('7').strokes), numberShift('17'), 0.45, 0.55)];
  const r = judge('17', tiny7);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'too-small');
  assert.equal(copyShow(r), 'size');
});

test('a scribble, or nothing to measure, fails as it does for a digit', () => {
  const scribble = [...pts(load('1').strokes), [[0.6, 0.1], [1.1, 0.9], [0.6, 0.9], [1.1, 0.1], [0.6, 0.5], [1.1, 0.5]]];
  assert.equal(judge('13', scribble).reason, 'unrecognized');
  assert.equal(judge('13', []).reason, 'no-letter');
  assert.equal(copyShow(judge('13', scribble)), 'slow');
});

// ---- splitting her ink ----

test('her ink splits at the gap between the digits; a single digit is one part', () => {
  const digits = (id) => id.split('').map(load);
  for (const id of NUMBER_IDS) {
    const s = splitDigits(written(id[0], id[1]), load(id), digits(id));
    assert.equal(s.left.length, load(id[0]).strokes.length, id);
    assert.equal(s.right.length, load(id[1]).strokes.length, id);
    assert.ok(splitDigits(pts(load(id[1]).strokes), load(id), digits(id)).one, `${id}: one digit`);
  }
  // Touching digits (no gap): cut where both halves read best.
  const touching = [...pts(load('1').strokes), ...move(pts(load('7').strokes), numberShift('17') - 0.27)];
  const s = splitDigits(touching, load('17'), digits('17'));
  assert.deepEqual([s.left.length, s.right.length], [2, 2]);
  assert.ok(judge('17', touching).ok);
  assert.ok(NUMBER_SPLIT.minGap > 0 && NUMBER_SPLIT.minAspect > 0);
});

// ---- the round itself ----

test('copyReady and copyStatus: judged once both digits are there, a hint after the first', () => {
  const char = load('17');
  const opts = { others: othersOf('17') };
  const all = pts(char.strokes);
  assert.equal(copyReady(all, char, opts), true);
  assert.equal(copyStatus(all, char, opts).action, 'judge-now');
  const half = copyStatus(all.slice(0, 2), char, opts);
  assert.equal(half.action, 'hint');
  assert.equal(half.next, 2, 'next: the 7');
  assert.deepEqual(half.done, [true, true, false, false]);
});

test('a judged number goes in the attempt log like any copy', () => {
  for (const strokes of [pts(load('17').strokes), written('3', '1'), pts(load('7').strokes)]) {
    const result = judge('17', strokes);
    const e = copyLogEntry({ char: '17', result, attempt: 1, helper: 2, now: new Date('2026-11-16T10:00:00Z') });
    assert.equal(e.type, 'copy');
    assert.equal(e.char, '17');
    assert.equal(e.ok, result.ok);
    assert.equal(e.reason, result.reason);
    assert.ok(e.match && typeof e.match.char === 'string');
    assert.doesNotThrow(() => JSON.stringify(e));
  }
});
