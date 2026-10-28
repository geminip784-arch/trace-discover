// progress.js — pure functions only. No DOM, no storage, no audio.
// Stage, stroke and fail-streak logic for one character. Each function takes a
// state and returns a new one; game.js wires it to the screen.

// Every number the game's pacing uses. Tune them by watching her.
export const CONFIG = {
  firstStage: 1,          // a character starts here
  lastStage: 2,           // the highest stage this slice plays (Stage 3 comes later)
  lettersPerStage: 2,     // completed letters at a stage before moving to the next
  failsForDemo: 3,        // fails in a row on the same stroke before Jugnu demonstrates it
  letterGlowMs: 2000,     // the whole letter glows this long when it is complete
  fadeMs: 500,            // a failed stroke's ink fades out over this long
  demoMs: 1500,           // Jugnu flies one stroke this slowly
  hopMs: 400,             // Jugnu hops to a start dot this fast
  sparkleMs: 600,         // the sparkle along a passed stroke lasts this long
};

// A fresh character at the first stage.
export function initialState(strokeCount, cfg = CONFIG) {
  return {
    strokeCount,
    stage: cfg.firstStage,
    current: 0,       // the next unfinished stroke; strokes before it are done
    streak: 0,        // fails in a row on the current stroke
    completed: 0,     // letters completed at this stage
    finished: false,  // "finished for now": touches do nothing until reload
  };
}

export const isStrokeDone = (state, i) => i < state.current;
export const isLetterDone = (state) => state.current >= state.strokeCount;

// One lift. `ok` is whether the stroke passed; `to` is the last stroke the
// matched variant covers (the same as state.current unless a joined one matched).
// Returns { state, letterDone, demo, droppedStage }.
export function applyLift(state, { ok, to = state.current }, cfg = CONFIG) {
  if (state.finished || isLetterDone(state)) return { state, letterDone: false, demo: false, droppedStage: false };
  if (ok) {
    const next = { ...state, current: Math.min(Math.max(to, state.current) + 1, state.strokeCount), streak: 0 };
    return { state: next, letterDone: isLetterDone(next), demo: false, droppedStage: false };
  }
  const streak = state.streak + 1;
  if (streak < cfg.failsForDemo) {
    return { state: { ...state, streak }, letterDone: false, demo: false, droppedStage: false };
  }
  // Too many fails in a row: Jugnu demonstrates, and from above Stage 1 the letter
  // carries on one stage lower (finished strokes kept, that stage's count restarts).
  const droppedStage = state.stage > cfg.firstStage;
  const next = droppedStage
    ? { ...state, streak: 0, stage: state.stage - 1, completed: 0 }
    : { ...state, streak: 0 };
  return { state: next, letterDone: false, demo: true, droppedStage };
}

// After the letter's reward: count it, then restart the letter, maybe at the next stage.
// Returns { state, stageUp, finished }.
export function completeLetter(state, cfg = CONFIG) {
  if (state.finished || !isLetterDone(state)) return { state, stageUp: false, finished: state.finished };
  const completed = state.completed + 1;
  const base = { ...state, current: 0, streak: 0 };
  if (completed < cfg.lettersPerStage) return { state: { ...base, completed }, stageUp: false, finished: false };
  if (state.stage < cfg.lastStage) {
    return { state: { ...base, stage: state.stage + 1, completed: 0 }, stageUp: true, finished: false };
  }
  return { state: { ...base, completed, finished: true }, stageUp: false, finished: true };
}
