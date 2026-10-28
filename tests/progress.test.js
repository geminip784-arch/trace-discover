// Run: node --test tests/progress.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, initialState, applyLift, completeLetter, isStrokeDone, isLetterDone } from '../src/progress.js';

const pass = (s, to) => applyLift(s, { ok: true, to }).state;
const fail = (s) => applyLift(s, { ok: false }).state;
// Draw every stroke of the letter correctly, then take the reward.
const playLetter = (s) => {
  while (!isLetterDone(s)) s = pass(s);
  return completeLetter(s);
};

test('the config holds the numbers this slice asks for', () => {
  assert.equal(CONFIG.firstStage, 1);
  assert.equal(CONFIG.lastStage, 2);
  assert.equal(CONFIG.lettersPerStage, 2);
  assert.equal(CONFIG.failsForDemo, 3);
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

test('3 fails in a row at Stage 1: demo, stay at Stage 1, streak restarts', () => {
  let s = fail(fail(initialState(2)));
  const r = applyLift(s, { ok: false });
  assert.equal(r.demo, true);
  assert.equal(r.droppedStage, false);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.streak, 0);
});

test('3 fails in a row at Stage 2: demo, back to Stage 1, finished strokes kept, count restarts', () => {
  let s = initialState(2);
  s = playLetter(s).state;
  s = playLetter(s).state;
  assert.equal(s.stage, 2);
  s = pass(s);
  s = fail(fail(s));
  const r = applyLift(s, { ok: false });
  assert.equal(r.demo, true);
  assert.equal(r.droppedStage, true);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.current, 1);
  assert.equal(r.state.completed, 0);
});

test('after dropping back, that letter counts at Stage 1 and 2 Stage 1 letters go back up', () => {
  let s = initialState(1);
  s = playLetter(playLetter(s).state).state;
  s = fail(fail(fail(s)));
  assert.equal(s.stage, 1);
  let r = playLetter(s);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.completed, 1);
  r = playLetter(r.state);
  assert.equal(r.stageUp, true);
  assert.equal(r.state.stage, 2);
});

test('2 letters at Stage 1 move to Stage 2; the letter restarts at stroke 1', () => {
  let r = playLetter(initialState(2));
  assert.equal(r.stageUp, false);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.completed, 1);
  assert.equal(r.state.current, 0);
  r = playLetter(r.state);
  assert.equal(r.stageUp, true);
  assert.equal(r.state.stage, 2);
  assert.equal(r.state.completed, 0);
});

test('2 letters at Stage 2: finished for now, and nothing changes after that', () => {
  let s = initialState(2);
  for (let i = 0; i < 3; i++) s = playLetter(s).state;
  const r = playLetter(s);
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
