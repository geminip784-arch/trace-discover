// progress.js — pure functions only. No DOM, no storage, no audio.
// Stroke and fail-streak logic for one character, and its practice rounds. Each function takes a
// state and returns a new one; game.js wires it to the screen.

// Every number the game's pacing uses. Tune them by watching her.
export const CONFIG = {
  firstStage: 1,          // a character starts here
  failsForDemo: 3,        // fails in a row on the same stroke before Jugnu demonstrates it
  failsForAssist: 5,      // fails in a row on the same stroke before Jugnu draws it himself
  letterGlowMs: 2000,     // the whole letter glows this long when it is complete
  fadeMs: 500,            // a failed stroke's ink fades out over this long
  demoMs: 1500,           // Jugnu flies one stroke this slowly
  assistMs: 2000,         // Jugnu draws a stroke himself (the assist) this slowly
  trailFadeMs: 600,       // after an assist, Jugnu's glowing trail fades over this long
  hopMs: 400,             // Jugnu hops to a start dot this fast
  sparkleMs: 600,         // the sparkle along a passed stroke lasts this long
  pulseMs: 900,           // the start dot pulses (twice) over this long
  trackGlowMs: 700,       // the track of a stroke glows once over this long
  goodEvery: 2,           // speak a "good" line at most once per this many good strokes
  roundPauseMs: 1100,     // after a round, its light comes on; the next round starts after this long
};

const noneDone = (n) => new Array(n).fill(false);
const firstUnfinished = (done) => {
  const i = done.indexOf(false);
  return i === -1 ? done.length : i;
};

// A fresh character at the first stage (the practice round sets the real stage).
export function initialState(strokeCount, cfg = CONFIG) {
  return {
    strokeCount,
    stage: cfg.firstStage,
    done: noneDone(strokeCount), // done[i]: stroke i is finished
    current: 0,       // the first unfinished stroke in the recorded order (Jugnu demonstrates this one)
    streak: 0,        // fails in a row on the current stroke (strokes too short to count are ignored)
    assisted: false,  // Jugnu drew a stroke of this letter
  };
}

export const isStrokeDone = (state, i) => state.done[i] === true;
export const isLetterDone = (state) => state.current >= state.strokeCount;

const markDone = (state, from, to) => {
  const done = [...state.done];
  for (let i = from; i <= to && i < done.length; i++) done[i] = true;
  return { ...state, done, current: firstUnfinished(done) };
};

const nothing = (state) => ({ state, letterDone: false, demo: false, assist: false });

// One lift. `ok` is whether the stroke passed. `from`..`to` are the strokes the
// matched reference covers: one stroke, or several when a joined version matched.
// They default to the current stroke. `counted: false` (a stroke too short to be
// a real try) changes nothing: it never adds to the fail streak.
// The stage never changes here: the practice round sets it.
// Returns { state, letterDone, demo, assist }.
export function applyLift(state, { ok, from = state.current, to = from, counted = true }, cfg = CONFIG) {
  if (isLetterDone(state) || !counted) return nothing(state);
  if (ok) {
    const next = { ...markDone(state, from, to), streak: 0 };
    return { state: next, letterDone: isLetterDone(next), demo: false, assist: false };
  }
  const streak = state.streak + 1;
  if (streak >= cfg.failsForAssist) {
    // Never stuck: Jugnu draws the current stroke himself and it counts as done.
    const next = { ...markDone(state, state.current, state.current), streak: 0, assisted: true };
    return { state: next, letterDone: isLetterDone(next), demo: false, assist: true };
  }
  // 3 or 4 fails in a row: Jugnu demonstrates.
  return { state: { ...state, streak }, letterDone: false, demo: streak >= cfg.failsForDemo, assist: false };
}

// ---------------------------------------------------------------------------
// Practice rounds
//
// Each character takes ROUNDS rounds. The round sets the stage: the last round
// is Stage 3, the first half of the others Stage 1, the rest Stage 2
// (3 rounds: 1, 2, 3). The stage never drops inside a round.
// A round counts only when she drew every stroke herself: if Jugnu drew one,
// the round starts again. Jugnu's help is that assist, or a demonstration after
// her misses in a Stage 2 or 3 round (Stage 1 demonstrations are the lesson).
// A gold star needs a whole practice with no help at all.

export const ROUNDS = 3;            // practice rounds per character: 3 to 5
export const MIN_ROUNDS = 3;
export const MAX_ROUNDS = 5;

export const roundCount = (n = ROUNDS) =>
  Math.max(MIN_ROUNDS, Math.min(MAX_ROUNDS, Math.round(Number(n)) || MIN_ROUNDS));

// The stage of round r (0-based) out of `rounds`.
export function stageForRound(r, rounds = ROUNDS) {
  const n = roundCount(rounds);
  if (r >= n - 1) return 3;
  return r < Math.ceil((n - 1) / 2) ? 1 : 2;
}

// Where a character's practice stands: { round (0-based, the one to play), helped }.
// `saved` is what storage gave back (or null); anything odd starts fresh.
export function startRounds(saved, rounds = ROUNDS) {
  const n = roundCount(rounds);
  const ok = Number.isInteger(saved?.round) && saved.round >= 0 && saved.round < n;
  return ok ? { round: saved.round, helped: saved.helped === true } : { round: 0, helped: false };
}

// Jugnu helped: no gold star for this practice.
export const markHelp = (rp) => ({ ...rp, helped: true });

// A help in this lift? `stage` is the round's stage, `lift` what applyLift returned.
export const isHelp = (stage, lift) => lift.assist || (lift.demo && stage > 1);

// Every stroke of the round is done. assisted: Jugnu drew one of them.
// Returns { state, repeat, allDone }.
export function finishRound(rp, { assisted }, rounds = ROUNDS) {
  if (assisted) return { state: { ...rp, helped: true }, repeat: true, allDone: false };
  const round = rp.round + 1;
  return { state: { ...rp, round }, repeat: false, allDone: round >= roundCount(rounds) };
}

export const starEarned = (rp) => !rp.helped;

// What each round light shows: 'done', 'now' or 'next'.
export const roundLights = (rp, rounds = ROUNDS) =>
  Array.from({ length: roundCount(rounds) }, (_, i) => (i < rp.round ? 'done' : i === rp.round ? 'now' : 'next'));
