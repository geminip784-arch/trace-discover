// review.js — pure functions only. No DOM, no storage, no audio.
// Slice 5I part 2: reviews on later days, and the practice-more list.
//
// A letter that earns its star is due for review 1 day later. Each passed review
// moves it to the next interval (3, 7, then 21 days); passing the 21-day review
// graduates it. A failed review, a practice finished only with Jugnu's help, or
// a sitting that puts it on the practice-more list sends it back to 1 day.
// Days are the tablet's calendar days ('YYYY-MM-DD', session.js localDay).
// At most DAILY_CAP letters show as due each day. Gold stars are never touched.
//
// The saved state (td.reviews):
//   { enrolled, letters: { [id]: { step, due } }, graduated: [id], today: { day, ids } | null }
//   step: 0..3, the interval she is waiting through (INTERVALS[step] days)
//   enrolled: stars earned before reviews existed have been added once
//   today: the letters picked as due for `day` (a finished review leaves the list)
// The practice-more list (td.practiceMore): [{ id, reasons, day }].

export const INTERVALS = [1, 3, 7, 21];
export const DAILY_CAP = 2;
// What puts a letter on the practice-more list, per sitting (one practice or review).
export const PRACTICE_MORE = { failedCopies: 2, wrongStarts: 3 };

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
export const isDay = (s) => typeof s === 'string' && DAY.test(s) && addDays(s, 0) === s;

// Calendar arithmetic on 'YYYY-MM-DD' only (UTC inside), so a clock change or
// the time of day can never shift a date.
function utc(day) {
  const [, y, m, d] = DAY.exec(day);
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}
export function addDays(day, n) {
  const t = new Date(utc(day) + n * 86400000);
  const pad = (v) => String(v).padStart(2, '0');
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);

export const emptyReviews = () => ({ enrolled: false, letters: {}, graduated: [], today: null });

// Pure: a clean state from anything storage gave back.
export function cleanReviews(raw) {
  const out = emptyReviews();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  out.enrolled = raw.enrolled === true;
  if (raw.letters && typeof raw.letters === 'object' && !Array.isArray(raw.letters)) {
    for (const [id, v] of Object.entries(raw.letters)) {
      if (v && Number.isInteger(v.step) && v.step >= 0 && v.step < INTERVALS.length && isDay(v.due)) {
        out.letters[id] = { step: v.step, due: v.due };
      }
    }
  }
  if (Array.isArray(raw.graduated)) out.graduated = [...new Set(raw.graduated.filter((id) => typeof id === 'string' && !out.letters[id]))];
  const t = raw.today;
  if (t && isDay(t.day) && Array.isArray(t.ids)) out.today = { day: t.day, ids: t.ids.filter((id) => typeof id === 'string') };
  return out;
}

// Pure: a clean practice-more list from anything storage gave back.
const REASONS = ['help', 'copies', 'starts'];
export function cleanPracticeMore(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const e of raw) {
    if (!e || typeof e.id !== 'string' || seen.has(e.id) || !isDay(e.day) || !Array.isArray(e.reasons)) continue;
    const reasons = REASONS.filter((r) => e.reasons.includes(r));
    if (reasons.length === 0) continue;
    seen.add(e.id);
    out.push({ id: e.id, reasons, day: e.day });
  }
  return out;
}

// Back to the first interval: due tomorrow.
const restart = (state, id, today) => ({
  ...state,
  letters: { ...state.letters, [id]: { step: 0, due: addDays(today, INTERVALS[0]) } },
  graduated: state.graduated.filter((g) => g !== id),
});

// Stars earned before reviews existed: added once, due from tomorrow (the daily
// cap spreads them out). Letters already scheduled or graduated are left alone.
export function enrolStars(state, stars, today) {
  if (state.enrolled) return state;
  let next = { ...state, enrolled: true };
  for (const id of stars) {
    if (!next.letters[id] && !next.graduated.includes(id)) next = restart(next, id, today);
  }
  return next;
}

// Why a sitting puts a letter on the practice-more list (none: []).
// outcome: { helped, failedCopies, wrongStarts } for one practice or review.
export function practiceReasons({ helped = false, failedCopies = 0, wrongStarts = 0 } = {}, rules = PRACTICE_MORE) {
  const reasons = [];
  if (helped) reasons.push('help');
  if (failedCopies >= rules.failedCopies) reasons.push('copies');
  if (wrongStarts >= rules.wrongStarts) reasons.push('starts');
  return reasons;
}

// The list with `id` added (or its reasons merged and its day updated).
export function addPracticeMore(list, id, reasons, today) {
  if (reasons.length === 0) return list;
  const old = list.find((e) => e.id === id);
  if (!old) return [...list, { id, reasons: REASONS.filter((r) => reasons.includes(r)), day: today }];
  const merged = REASONS.filter((r) => reasons.includes(r) || old.reasons.includes(r));
  return list.map((e) => (e.id === id ? { id, reasons: merged, day: today } : e));
}

export const removePracticeMore = (list, id) => list.filter((e) => e.id !== id);

// A whole practice (all its rounds) finished. outcome: { helped, failedCopies, wrongStarts }.
// Help, or any practice-more reason: due tomorrow (a graduated letter comes back).
// A clean practice schedules a letter that is not scheduled yet (it just earned
// its star) and leaves any other schedule alone, so replaying never undoes progress.
// Returns { reviews, list, reasons }.
export function recordPractice({ reviews, list }, id, outcome, today) {
  const reasons = practiceReasons(outcome);
  let next = reviews;
  if (reasons.length > 0) next = restart(reviews, id, today);
  else if (!reviews.letters[id] && !reviews.graduated.includes(id)) next = restart(reviews, id, today);
  return { reviews: next, list: addPracticeMore(list, id, reasons, today), reasons };
}

// One review finished (its copy-it round). ok: the copy passed without Jugnu
// finishing it for her. A clean pass moves the letter to the next interval (or
// graduates it after the last) and takes it off the practice-more list. A fail,
// or a pass in a sitting that earns a practice-more reason, sends it back to
// 1 day and keeps it on the list. Either way it leaves today's due list.
// Returns { reviews, list, reasons, entry } (entry: the 'review' log fields).
export function recordReview({ reviews, list }, id, { ok, ...outcome }, today) {
  const reasons = practiceReasons(outcome);
  const before = reviews.letters[id] ?? null;
  const step = before?.step ?? 0;
  let next;
  let nextDue;
  if (ok && reasons.length === 0) {
    if (step + 1 >= INTERVALS.length) {
      const letters = { ...reviews.letters };
      delete letters[id];
      next = { ...reviews, letters, graduated: [...reviews.graduated.filter((g) => g !== id), id] };
      nextDue = null;
    } else {
      nextDue = addDays(today, INTERVALS[step + 1]);
      next = { ...reviews, letters: { ...reviews.letters, [id]: { step: step + 1, due: nextDue } } };
    }
  } else {
    next = restart(reviews, id, today);
    nextDue = next.letters[id].due;
  }
  if (next.today) next = { ...next, today: { ...next.today, ids: next.today.ids.filter((x) => x !== id) } };
  const clean = ok && reasons.length === 0;
  return {
    reviews: next,
    list: clean ? removePracticeMore(list, id) : addPracticeMore(list, id, reasons, today),
    reasons,
    entry: {
      char: id,
      due: before?.due ?? null,
      interval: INTERVALS[step],
      result: ok ? 'pass' : 'fail',
      next: nextDue,
      graduated: nextDue === null,
      practiceMore: reasons,
    },
  };
}

// Every scheduled letter due on or before `today`.
export const dueLetters = (reviews, today) =>
  Object.entries(reviews.letters).filter(([, v]) => v.due <= today).map(([id]) => id);

// Today's due letters: picked once per day (the first time a shelf or board is
// drawn that day), at most `cap`, most overdue first, ties in `order` (every
// board's tiles, ABC then 123 then Urdu). The picks stay fixed for the day; a
// finished review leaves the list and is not replaced. A new day picks afresh.
// Returns the state with today's picks.
export function pickToday(reviews, today, order = [], cap = DAILY_CAP) {
  if (reviews.today?.day === today) return reviews;
  const rank = (id) => {
    const i = order.indexOf(id);
    return i === -1 ? order.length : i;
  };
  const ids = dueLetters(reviews, today)
    .sort((a, b) => reviews.letters[a].due.localeCompare(reviews.letters[b].due) || rank(a) - rank(b) || a.localeCompare(b))
    .slice(0, cap);
  return { ...reviews, today: { day: today, ids } };
}

// Today's due letters, from a state already picked for today (else none).
export const dueToday = (reviews, today) => (reviews.today?.day === today ? reviews.today.ids : []);

// One attempt-log entry for a finished review (type 'review').
export function reviewLogEntry(entry, now = new Date()) {
  return { type: 'review', time: now.toISOString(), ...entry };
}
