// Run: node --test tests/progress.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, initialState, applyLift, completeLetter, isStrokeDone, isLetterDone } from '../src/progress.js';

// The counting tests below were written for 2 letters per stage. They keep that
// number explicitly, so the counting is still tested now that the game uses 1.
const TWO = { ...CONFIG, lettersPerStage: 2 };
const pass = (s, to) => applyLift(s, { ok: true, to }).state;
const fail = (s) => applyLift(s, { ok: false }).state;
const tap = (s) => applyLift(s, { ok: false, counted: false });
// Draw every stroke of the letter correctly, then take the reward.
const playLetter = (s, cfg = CONFIG) => {
  while (!isLetterDone(s)) s = pass(s);
  return completeLetter(s, cfg);
};
// Fail the current stroke until Jugnu draws it, then pass the rest.
const playAssisted = (s) => {
  while (!applyLift(s, { ok: false }).assist) s = fail(s);
  s = applyLift(s, { ok: false }).state;
  while (!isLetterDone(s)) s = pass(s);
  return completeLetter(s);
};

test('the config holds the numbers this slice asks for', () => {
  assert.equal(CONFIG.firstStage, 1);
  assert.equal(CONFIG.lastStage, 2);
  assert.equal(CONFIG.lettersPerStage, 1);
  assert.equal(CONFIG.failsForDemo, 3);
  assert.equal(CONFIG.failsForAssist, 5);
  assert.equal(CONFIG.maxAssistedInRow, 2);
  assert.equal(CONFIG.pictureMs, 3000);
  assert.equal(CONFIG.freeDrawMs, 12000);
  assert.equal(CONFIG.freeFadeMs, 1000);
  assert.equal(CONFIG.goodEvery, 2);
  assert.equal(CONFIG.letterGlowMs, 2000);
  assert.equal(CONFIG.fadeMs, 500);
  assert.equal(CONFIG.demoMs, 1500);
});

test('a character starts at Stage 1, stroke 1', () => {
  const s = initialState(2);
  assert.equal(s.stage, 1);
  assert.equal(s.current, 0);
  assert.equal(s.finished, false);
});

test('a pass moves to the next stroke; passed strokes stay done', () => {
  let s = initialState(3);
  s = pass(s);
  assert.equal(s.current, 1);
  assert.ok(isStrokeDone(s, 0));
  assert.ok(!isStrokeDone(s, 1));
});

test('a fail stays on the same stroke and keeps earlier strokes done', () => {
  let s = pass(initialState(3));
  s = fail(s);
  assert.equal(s.current, 1);
  assert.equal(s.streak, 1);
  assert.ok(isStrokeDone(s, 0));
});

test('a joined variant marks all the strokes it covers as done', () => {
  const r = applyLift(initialState(2), { ok: true, to: 1 });
  assert.equal(r.state.current, 2);
  assert.equal(r.letterDone, true);
});

test('a joined variant in the middle (4: strokes 2-3) completes the letter', () => {
  let s = pass(initialState(3));
  const r = applyLift(s, { ok: true, to: 2 });
  assert.equal(r.letterDone, true);
});

test('a pass resets the fail streak', () => {
  let s = fail(fail(initialState(2)));
  assert.equal(s.streak, 2);
  s = pass(s);
  assert.equal(s.streak, 0);
});

test('3 fails in a row at Stage 1: demo, stay at Stage 1, the streak carries on', () => {
  let s = fail(fail(initialState(2)));
  const r = applyLift(s, { ok: false });
  assert.equal(r.demo, true);
  assert.equal(r.assist, false);
  assert.equal(r.droppedStage, false);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.streak, 3);
});

test('3 fails in a row at Stage 2: demo, back to Stage 1, finished strokes kept, count restarts', () => {
  let s = initialState(2);
  s = playLetter(s, TWO).state;
  s = playLetter(s, TWO).state;
  assert.equal(s.stage, 2);
  s = pass(s);
  s = fail(fail(s));
  const r = applyLift(s, { ok: false });
  assert.equal(r.demo, true);
  assert.equal(r.droppedStage, true);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.current, 1);
  assert.equal(r.state.completed, 0);
  assert.equal(r.state.streak, 3);
});

test('after dropping back, that letter counts at Stage 1 and 2 Stage 1 letters go back up', () => {
  let s = initialState(1);
  s = playLetter(playLetter(s, TWO).state, TWO).state;
  s = fail(fail(fail(s)));
  assert.equal(s.stage, 1);
  let r = playLetter(s, TWO);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.completed, 1);
  r = playLetter(r.state, TWO);
  assert.equal(r.stageUp, true);
  assert.equal(r.state.stage, 2);
});

test('2 letters at Stage 1 move to Stage 2; the letter restarts at stroke 1', () => {
  let r = playLetter(initialState(2), TWO);
  assert.equal(r.stageUp, false);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.completed, 1);
  assert.equal(r.state.current, 0);
  r = playLetter(r.state, TWO);
  assert.equal(r.stageUp, true);
  assert.equal(r.state.stage, 2);
  assert.equal(r.state.completed, 0);
});

test('2 letters at Stage 2: finished for now, and nothing changes after that', () => {
  let s = initialState(2);
  for (let i = 0; i < 3; i++) s = playLetter(s, TWO).state;
  const r = playLetter(s, TWO);
  assert.equal(r.finished, true);
  assert.equal(r.state.finished, true);
  const after = applyLift(r.state, { ok: true });
  assert.equal(after.state, r.state);
  assert.equal(completeLetter(r.state).state, r.state);
});

test('completeLetter does nothing while strokes are left', () => {
  const s = initialState(2);
  assert.equal(completeLetter(s).state, s);
});

// ---- Slice 4B ----

test('1 letter per stage: one letter at Stage 1 moves to Stage 2, one at Stage 2 is finished for now', () => {
  let r = playLetter(initialState(2));
  assert.equal(r.stageUp, true);
  assert.equal(r.state.stage, 2);
  r = playLetter(r.state);
  assert.equal(r.finished, true);
});

test('fails 3 and 4 demonstrate; fail 5 is the assist: the stroke is done, assisted, streak reset', () => {
  let s = initialState(2);
  const flags = [];
  for (let i = 1; i <= 5; i++) {
    const r = applyLift(s, { ok: false });
    flags.push([r.demo, r.assist]);
    s = r.state;
  }
  assert.deepEqual(flags, [[false, false], [false, false], [true, false], [true, false], [false, true]]);
  assert.equal(s.current, 1);
  assert.ok(isStrokeDone(s, 0));
  assert.equal(s.streak, 0);
  assert.equal(s.assisted, true);
});

test('at Stage 2 the drop back happens on fail 3 only, then the assist comes at fail 5', () => {
  let s = playLetter(initialState(2)).state;
  assert.equal(s.stage, 2);
  const dropped = [];
  let assist = false;
  for (let i = 1; i <= 5; i++) {
    const r = applyLift(s, { ok: false });
    dropped.push(r.droppedStage);
    assist = r.assist;
    s = r.state;
  }
  assert.deepEqual(dropped, [false, false, true, false, false]);
  assert.equal(assist, true);
  assert.equal(s.stage, 1);
});

test('an assist on the last stroke completes the letter', () => {
  let s = pass(initialState(2));
  let r;
  for (let i = 0; i < 5; i++) { r = applyLift(s, { ok: false }); s = r.state; }
  assert.equal(r.assist, true);
  assert.equal(r.letterDone, true);
});

test('a pass after fails resets the streak, so the assist needs 5 new fails', () => {
  let s = initialState(3);
  for (let i = 0; i < 4; i++) s = fail(s);
  s = pass(s);
  assert.equal(s.streak, 0);
  for (let i = 0; i < 4; i++) s = fail(s);
  assert.equal(applyLift(s, { ok: false }).assist, true);
});

test('a stroke too short to count never adds to the streak or triggers the assist', () => {
  let s = initialState(2);
  for (let i = 0; i < 4; i++) s = fail(s);
  for (let i = 0; i < 10; i++) {
    const r = tap(s);
    assert.equal(r.assist, false);
    assert.equal(r.demo, false);
    assert.equal(r.state, s);
  }
  assert.equal(s.streak, 4);
  assert.equal(applyLift(s, { ok: false }).assist, true);
});

test('an assisted letter gets no count: it restarts at the same stage', () => {
  const r = playAssisted(initialState(2));
  assert.equal(r.counted, false);
  assert.equal(r.stageUp, false);
  assert.equal(r.finished, false);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.completed, 0);
  assert.equal(r.state.current, 0);
  assert.equal(r.state.assisted, false);
  assert.equal(r.state.assistedInRow, 1);
});

test('2 assisted letters in a row: finished for now', () => {
  const r = playAssisted(playAssisted(initialState(2)).state);
  assert.equal(r.finished, true);
  assert.equal(r.state.finished, true);
});

test('a letter with no assist resets the assisted-in-a-row count', () => {
  let r = playAssisted(initialState(2));
  r = playLetter(r.state, TWO);
  assert.equal(r.counted, true);
  assert.equal(r.state.assistedInRow, 0);
  r = playAssisted(r.state);
  assert.equal(r.finished, false);
  assert.equal(r.state.assistedInRow, 1);
});

test('strokes may be finished out of order (T: bar first, then stem)', () => {
  let s = initialState(2);
  s = applyLift(s, { ok: true, from: 1 }).state;
  assert.ok(isStrokeDone(s, 1));
  assert.ok(!isStrokeDone(s, 0));
  assert.equal(s.current, 0);
  const r = applyLift(s, { ok: true, from: 0 });
  assert.equal(r.letterDone, true);
});
