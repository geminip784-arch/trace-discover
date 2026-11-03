// progress.js — pure functions only. No DOM, no storage, no audio.
// Stage, stroke and fail-streak logic for one character. Each function takes a
// state and returns a new one; game.js wires it to the screen.

// Every number the game's pacing uses. Tune them by watching her.
export const CONFIG = {
  firstStage: 1,          // a character starts here
  lastStage: 2,           // the highest stage this slice plays (Stage 3 comes later)
  lettersPerStage: 1,     // completed letters (with no assist) at a stage before moving to the next
  failsForDemo: 3,        // fails in a row on the same stroke before Jugnu demonstrates it
  failsForAssist: 5,      // fails in a row on the same stroke before Jugnu draws it himself
  maxAssistedInRow: 2,    // assisted letters in a row before "finished for now"
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
  dropStage: true,        // 3 fails in a row drop the letter one stage (the practice rounds turn this off)
};

const noneDone = (n) => new Array(n).fill(false);
const firstUnfinished = (done) => {
  const i = done.indexOf(false);
  return i === -1 ? done.length : i;
};

// A fresh character at the first stage.
export function initialState(strokeCount, cfg = CONFIG) {
  return {
    strokeCount,
    stage: cfg.firstStage,
    done: noneDone(strokeCount), // done[i]: stroke i is finished
    current: 0,       // the first unfinished stroke in the recorded order (Jugnu demonstrates this one)
    streak: 0,        // fails in a row on the current stroke (strokes too short to count are ignored)
    completed: 0,     // letters completed with no assist at this stage
    assisted: false,  // Jugnu drew a stroke of this letter
    assistedInRow: 0, // letters in a row that needed an assist
    finished: false,  // "finished for now": touches do nothing until reload
  };
}

export const isStrokeDone = (state, i) => state.done[i] === true;
export const isLetterDone = (state) => state.current >= state.strokeCount;

const markDone = (state, from, to) => {
  const done = [...state.done];
  for (let i = from; i <= to && i < done.length; i++) done[i] = true;
  return { ...state, done, current: firstUnfinished(done) };
};

const nothing = (state) => ({ state, letterDone: false, demo: false, assist: false, droppedStage: false });

// One lift. `ok` is whether the stroke passed. `from`..`to` are the strokes the
// matched reference covers: one stroke, or several when a joined version matched.
// They default to the current stroke. `counted: false` (a stroke too short to be
// a real try) changes nothing: it never adds to the fail streak.
// Returns { state, letterDone, demo, assist, droppedStage }.
export function applyLift(state, { ok, from = state.current, to = from, counted = true }, cfg = CONFIG) {
  if (state.finished || isLetterDone(state) || !counted) return nothing(state);
  if (ok) {
    const next = { ...markDone(state, from, to), streak: 0 };
    return { state: next, letterDone: isLetterDone(next), demo: false, assist: false, droppedStage: false };
  }
  const streak = state.streak + 1;
  if (streak >= cfg.failsForAssist) {
    // Never stuck: Jugnu draws the current stroke himself and it counts as done.
    const next = { ...markDone(state, state.current, state.current), streak: 0, assisted: true };
    return { state: next, letterDone: isLetterDone(next), demo: false, assist: true, droppedStage: false };
  }
  if (streak < cfg.failsForDemo) {
    return { state: { ...state, streak }, letterDone: false, demo: false, assist: false, droppedStage: false };
  }
  // 3 or 4 fails in a row: Jugnu demonstrates. On the 3rd, from above Stage 1, the
  // letter carries on one stage lower (finished strokes kept, that stage's count restarts).
  const droppedStage = cfg.dropStage !== false && streak === cfg.failsForDemo && state.stage > cfg.firstStage;
  const next = droppedStage
    ? { ...state, streak, stage: state.stage - 1, completed: 0 }
    : { ...state, streak };
  return { state: next, letterDone: false, demo: true, assist: false, droppedStage };
}

// After the letter's reward: count it, then restart the letter, maybe at the next stage.
// An assisted letter does not count: it restarts at the same stage, and after
// maxAssistedInRow of them in a row it is "finished for now".
// Returns { state, stageUp, finished, counted }.
export function completeLetter(state, cfg = CONFIG) {
  if (state.finished || !isLetterDone(state)) {
    return { state, stageUp: false, finished: state.finished, counted: false };
  }
  const base = { ...state, done: noneDone(state.strokeCount), current: 0, streak: 0, assisted: false };
  if (state.assisted) {
    const assistedInRow = state.assistedInRow + 1;
    const finished = assistedInRow >= cfg.maxAssistedInRow;
    return { state: { ...base, assistedInRow, finished }, stageUp: false, finished, counted: false };
  }
  const completed = state.completed + 1;
  const counted = { ...base, assistedInRow: 0 };
  if (completed < cfg.lettersPerStage) {
    return { state: { ...counted, completed }, stageUp: false, finished: false, counted: true };
  }
  if (state.stage < cfg.lastStage) {
    return { state: { ...counted, stage: state.stage + 1, completed: 0 }, stageUp: true, finished: false, counted: true };
  }
  return { state: { ...counted, completed, finished: true }, stageUp: false, finished: true, counted: true };
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

// The settings applied inside a round: the stage stays where the round put it.
export const ROUND_CONFIG = { ...CONFIG, dropStage: false };

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
