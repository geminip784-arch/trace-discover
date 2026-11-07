// Run: node --test tests/review.test.js
// Reviews on later days and the practice-more list (Slice 5I part 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERVALS, DAILY_CAP, PRACTICE_MORE, isDay, addDays, daysBetween, emptyReviews, cleanReviews,
  cleanPracticeMore, enrolStars, practiceReasons, addPracticeMore, removePracticeMore,
  recordPractice, recordReview, dueLetters, pickToday, dueToday, reviewLogEntry,
} from '../src/review.js';
import { localDay, BOARD_ORDER } from '../src/session.js';

const CLEAN = { helped: false, failedCopies: 0, wrongStarts: 0 };
const start = () => ({ reviews: emptyReviews(), list: [] });
// She finishes a practice of `id` on `day`.
const practise = (s, id, day, outcome = CLEAN) => recordPractice(s, id, outcome, day);
// She does a review of `id` on `day`.
const review = (s, id, day, ok = true, outcome = CLEAN) => recordReview(s, id, { ok, ...outcome }, day);

test('the schedule is 1, 3, 7 and 21 days, at most 2 reviews a day', () => {
  assert.deepEqual(INTERVALS, [1, 3, 7, 21]);
  assert.equal(DAILY_CAP, 2);
  assert.deepEqual(PRACTICE_MORE, { failedCopies: 2, wrongStarts: 3 });
});

test('calendar days: months, years, leap days and clock changes', () => {
  assert.equal(addDays('2026-11-07', 1), '2026-11-08');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-07', 1), '2026-03-08'); // US clocks go forward on the 8th
  assert.equal(addDays('2026-03-28', 1), '2026-03-29'); // Europe on the 29th
  assert.equal(addDays('2026-11-01', 21), '2026-11-22');
  assert.equal(daysBetween('2026-12-25', '2027-01-15'), 21);
  assert.ok(isDay('2026-11-07'));
  for (const bad of ['2026-02-30', '2026-13-01', '7/11/2026', '', null, 20261107]) assert.equal(isDay(bad), false, String(bad));
});

test('the day is the tablet\'s own calendar date, so a minute past midnight is the next day', () => {
  assert.equal(localDay(new Date(2026, 10, 7, 23, 59)), '2026-11-07');
  assert.equal(localDay(new Date(2026, 10, 8, 0, 1)), '2026-11-08');
});

test('a star earned today makes the letter due tomorrow', () => {
  const s = practise(start(), 'L', '2026-11-07');
  assert.deepEqual(s.reviews.letters.L, { step: 0, due: '2026-11-08' });
  assert.deepEqual(s.list, []);
  assert.deepEqual(dueLetters(s.reviews, '2026-11-07'), []);
  assert.deepEqual(dueLetters(s.reviews, '2026-11-08'), ['L']);
});

test('each passed review moves it on: 1, then 3, then 7, then 21 days, then it graduates', () => {
  let s = practise(start(), 'L', '2026-11-07');
  const steps = [];
  let day = '2026-11-08';
  for (let i = 0; i < 4; i++) {
    const r = review(s, 'L', day);
    steps.push([day, r.entry.interval, r.entry.next]);
    s = r;
    if (r.entry.next) day = r.entry.next;
  }
  assert.deepEqual(steps, [
    ['2026-11-08', 1, '2026-11-11'],
    ['2026-11-11', 3, '2026-11-18'],
    ['2026-11-18', 7, '2026-12-09'],
    ['2026-12-09', 21, null],
  ]);
  assert.equal(s.reviews.letters.L, undefined);
  assert.deepEqual(s.reviews.graduated, ['L']);
  assert.deepEqual(dueLetters(s.reviews, '2027-06-01'), []);
});

test('a failed review goes back to 1 day, from any step', () => {
  let s = practise(start(), 'H', '2026-11-07');
  s = review(s, 'H', '2026-11-08');
  s = review(s, 'H', '2026-11-11');
  assert.equal(s.reviews.letters.H.step, 2);
  const r = review(s, 'H', '2026-11-18', false, { helped: true, failedCopies: 3 });
  assert.deepEqual(r.reviews.letters.H, { step: 0, due: '2026-11-19' });
  assert.equal(r.entry.result, 'fail');
  assert.equal(r.entry.next, '2026-11-19');
});

test('a practice finished only with Jugnu\'s help goes back to 1 day, even after graduating', () => {
  let s = practise(start(), 'E', '2026-11-01');
  s = review(s, 'E', '2026-11-04', true);
  const helped = practise(s, 'E', '2026-11-05', { helped: true, failedCopies: 0, wrongStarts: 0 });
  assert.deepEqual(helped.reviews.letters.E, { step: 0, due: '2026-11-06' });
  // Graduated, then a help-only practice brings it back.
  const grad = { reviews: { ...emptyReviews(), graduated: ['E'] }, list: [] };
  const back = practise(grad, 'E', '2026-12-01', { helped: true, failedCopies: 0, wrongStarts: 0 });
  assert.deepEqual(back.reviews.letters.E, { step: 0, due: '2026-12-02' });
  assert.deepEqual(back.reviews.graduated, []);
});

test('a clean replay of a scheduled or graduated letter never undoes its progress', () => {
  let s = practise(start(), 'A', '2026-11-01');
  s = review(s, 'A', '2026-11-02');
  const before = s.reviews.letters.A;
  const again = practise(s, 'A', '2026-11-03');
  assert.deepEqual(again.reviews.letters.A, before);
  const grad = { reviews: { ...emptyReviews(), graduated: ['A'] }, list: [] };
  assert.deepEqual(practise(grad, 'A', '2026-12-01').reviews, grad.reviews);
});

test('an overdue letter waits for her, and its next interval counts from the day she reviews it', () => {
  let s = practise(start(), 'T', '2026-11-01'); // due 11-02
  assert.deepEqual(dueLetters(s.reviews, '2026-11-20'), ['T']); // she skipped a few weeks
  s = review(s, 'T', '2026-11-20');
  assert.deepEqual(s.reviews.letters.T, { step: 1, due: '2026-11-23' });
});

// ---- today's due letters ----

const scheduled = (entries) => ({ ...emptyReviews(), letters: Object.fromEntries(entries.map(([id, due, step = 0]) => [id, { step, due }])) });

test('at most 2 are due a day: most overdue first, ties in board order', () => {
  const r = scheduled([['Z', '2026-11-05'], ['B', '2026-11-07'], ['A', '2026-11-07'], ['7', '2026-11-06'], ['Q', '2026-11-09']]);
  const picked = pickToday(r, '2026-11-07', BOARD_ORDER);
  assert.deepEqual(dueToday(picked, '2026-11-07'), ['Z', '7']);
  const ties = scheduled([['3', '2026-11-07'], ['C', '2026-11-07'], ['A', '2026-11-07']]);
  assert.deepEqual(dueToday(pickToday(ties, '2026-11-07', BOARD_ORDER), '2026-11-07'), ['A', 'C']);
});

test('the picks stay fixed all day; a finished review leaves and is not replaced', () => {
  let s = { reviews: scheduled([['A', '2026-11-07'], ['B', '2026-11-07'], ['C', '2026-11-07']]), list: [] };
  s.reviews = pickToday(s.reviews, '2026-11-07', BOARD_ORDER);
  assert.deepEqual(dueToday(s.reviews, '2026-11-07'), ['A', 'B']);
  assert.equal(pickToday(s.reviews, '2026-11-07', BOARD_ORDER), s.reviews); // same day: unchanged
  s = review(s, 'A', '2026-11-07');
  assert.deepEqual(dueToday(s.reviews, '2026-11-07'), ['B']);
  assert.deepEqual(dueToday(pickToday(s.reviews, '2026-11-07', BOARD_ORDER), '2026-11-07'), ['B']); // C does not step in
  s = review(s, 'B', '2026-11-07', false, { helped: true, failedCopies: 3 });
  assert.deepEqual(dueToday(s.reviews, '2026-11-07'), []);
});

test('across midnight: the new day picks afresh, and yesterday\'s picks are not due any more', () => {
  let r = scheduled([['A', '2026-11-07'], ['B', '2026-11-07'], ['C', '2026-11-07'], ['D', '2026-11-08']]);
  r = pickToday(r, '2026-11-07', BOARD_ORDER);
  assert.deepEqual(dueToday(r, '2026-11-07'), ['A', 'B']);
  assert.deepEqual(dueToday(r, '2026-11-08'), []); // not picked for the 8th yet
  r = pickToday(r, '2026-11-08', BOARD_ORDER);
  // Not reviewed yesterday, so A and B are still the most overdue.
  assert.deepEqual(dueToday(r, '2026-11-08'), ['A', 'B']);
  // A letter due today is not due the day before.
  assert.deepEqual(dueToday(pickToday(scheduled([['D', '2026-11-08']]), '2026-11-07', BOARD_ORDER), '2026-11-07'), []);
});

test('nothing due: no picks', () => {
  assert.deepEqual(dueToday(pickToday(emptyReviews(), '2026-11-07', BOARD_ORDER), '2026-11-07'), []);
});

// ---- the practice-more list ----

test('practice-more reasons: help, 2 or more failed copies, 3 or more wrong starts in one sitting', () => {
  assert.deepEqual(practiceReasons(CLEAN), []);
  assert.deepEqual(practiceReasons({ helped: true }), ['help']);
  assert.deepEqual(practiceReasons({ failedCopies: 1 }), []);
  assert.deepEqual(practiceReasons({ failedCopies: 2 }), ['copies']);
  assert.deepEqual(practiceReasons({ wrongStarts: 2 }), []);
  assert.deepEqual(practiceReasons({ wrongStarts: 3 }), ['starts']);
  assert.deepEqual(practiceReasons({ helped: true, failedCopies: 3, wrongStarts: 4 }), ['help', 'copies', 'starts']);
});

test('a starred practice with one failed copy and 2 wrong starts stays off the list', () => {
  const s = practise(start(), 'K', '2026-11-07', { helped: false, failedCopies: 1, wrongStarts: 2 });
  assert.deepEqual(s.list, []);
  assert.deepEqual(s.reviews.letters.K, { step: 0, due: '2026-11-08' });
});

test('a letter on the list comes due after 1 day, even when it was already further along', () => {
  let s = practise(start(), 'S', '2026-11-01');
  s = review(s, 'S', '2026-11-02');
  s = review(s, 'S', '2026-11-05');
  assert.equal(s.reviews.letters.S.step, 2);
  const r = practise(s, 'S', '2026-11-06', { helped: false, failedCopies: 2, wrongStarts: 0 });
  assert.deepEqual(r.list, [{ id: 'S', reasons: ['copies'], day: '2026-11-06' }]);
  assert.deepEqual(r.reviews.letters.S, { step: 0, due: '2026-11-07' });
});

test('wrong starts and help put a letter on the list; reasons merge, never duplicate', () => {
  let s = practise(start(), 'M', '2026-11-07', { helped: false, failedCopies: 0, wrongStarts: 3 });
  assert.deepEqual(s.list, [{ id: 'M', reasons: ['starts'], day: '2026-11-07' }]);
  s = practise(s, 'M', '2026-11-08', { helped: true, failedCopies: 0, wrongStarts: 0 });
  assert.deepEqual(s.list, [{ id: 'M', reasons: ['help', 'starts'], day: '2026-11-08' }]);
});

test('one clean passed review takes a letter off the list; a pass with 2 failed copies keeps it on, due tomorrow', () => {
  let s = practise(start(), 'R', '2026-11-07', { helped: true, failedCopies: 0, wrongStarts: 0 });
  const shaky = review(s, 'R', '2026-11-08', true, { helped: false, failedCopies: 2, wrongStarts: 0 });
  assert.equal(shaky.entry.result, 'pass');
  assert.deepEqual(shaky.entry.practiceMore, ['copies']);
  assert.deepEqual(shaky.reviews.letters.R, { step: 0, due: '2026-11-09' });
  assert.deepEqual(shaky.list.map((e) => e.id), ['R']);
  s = review(shaky, 'R', '2026-11-09');
  assert.deepEqual(s.list, []);
  assert.deepEqual(s.reviews.letters.R, { step: 1, due: '2026-11-12' });
});

test('a failed review puts the letter on the list', () => {
  let s = practise(start(), 'N', '2026-11-07');
  s = review(s, 'N', '2026-11-08', false, { helped: true, failedCopies: 3, wrongStarts: 0 });
  assert.deepEqual(s.list, [{ id: 'N', reasons: ['help', 'copies'], day: '2026-11-08' }]);
});

test('list helpers', () => {
  const l = addPracticeMore([], 'A', ['starts'], '2026-11-07');
  assert.equal(addPracticeMore(l, 'B', [], '2026-11-07'), l);
  assert.deepEqual(removePracticeMore(l, 'A'), []);
});

// ---- existing stars, saving and logging ----

test('stars earned before reviews are enrolled once, due tomorrow; stars themselves are untouched', () => {
  const stars = ['A', 'B', '3'];
  const frozen = Object.freeze([...stars]);
  const r = enrolStars(emptyReviews(), frozen, '2026-11-07');
  assert.equal(r.enrolled, true);
  assert.deepEqual(Object.keys(r.letters).sort(), ['3', 'A', 'B']);
  for (const id of stars) assert.deepEqual(r.letters[id], { step: 0, due: '2026-11-08' });
  assert.deepEqual(frozen, stars);
  // Once only: a later call adds nothing, even for a new star.
  assert.equal(enrolStars(r, [...stars, 'C'], '2026-11-09'), r);
  // A graduated or already scheduled letter is left alone.
  const mixed = { ...emptyReviews(), letters: { A: { step: 2, due: '2026-11-20' } }, graduated: ['B'] };
  const m = enrolStars(mixed, ['A', 'B', 'C'], '2026-11-07');
  assert.deepEqual(m.letters.A, { step: 2, due: '2026-11-20' });
  assert.deepEqual(m.graduated, ['B']);
  assert.deepEqual(m.letters.C, { step: 0, due: '2026-11-08' });
});

test('recording practices and reviews never reads or returns stars', () => {
  const s = review(practise(start(), 'L', '2026-11-07'), 'L', '2026-11-08');
  assert.deepEqual(Object.keys(s).sort(), ['entry', 'list', 'reasons', 'reviews']);
  assert.deepEqual(Object.keys(s.reviews).sort(), ['enrolled', 'graduated', 'letters', 'today']);
});

test('clean state from damaged storage', () => {
  assert.deepEqual(cleanReviews(null), emptyReviews());
  assert.deepEqual(cleanReviews([1, 2]), emptyReviews());
  const r = cleanReviews({
    enrolled: true,
    letters: { A: { step: 1, due: '2026-11-08' }, B: { step: 9, due: '2026-11-08' }, C: { step: 0, due: 'soon' }, D: null },
    graduated: ['E', 'E', 'A', 4],
    today: { day: '2026-11-07', ids: ['A', 3] },
  });
  assert.deepEqual(r, { enrolled: true, letters: { A: { step: 1, due: '2026-11-08' } }, graduated: ['E'], today: { day: '2026-11-07', ids: ['A'] } });
  assert.deepEqual(cleanPracticeMore([{ id: 'A', reasons: ['starts', 'x'], day: '2026-11-07' }, { id: 'A', reasons: ['help'], day: '2026-11-07' }, { id: 'B', reasons: [], day: '2026-11-07' }, 'junk']),
    [{ id: 'A', reasons: ['starts'], day: '2026-11-07' }]);
  assert.deepEqual(cleanPracticeMore('junk'), []);
});

test('the review log entry: character, due date, result and next due date', () => {
  const s = practise(start(), 'L', '2026-11-07');
  const r = review(s, 'L', '2026-11-09');
  const e = reviewLogEntry(r.entry, new Date('2026-11-09T09:30:00Z'));
  assert.deepEqual(e, {
    type: 'review', time: '2026-11-09T09:30:00.000Z', char: 'L', due: '2026-11-08', interval: 1,
    result: 'pass', next: '2026-11-12', graduated: false, practiceMore: [],
  });
  assert.doesNotThrow(() => JSON.stringify(e));
});
