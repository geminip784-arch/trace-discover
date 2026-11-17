// Run: node --test tests/progress.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, initialState, applyLift, isStrokeDone, isLetterDone } from '../src/progress.js';

const pass = (s, to) => applyLift(s, { ok: true, to }).state;
const fail = (s) => applyLift(s, { ok: false }).state;
const tap = (s) => applyLift(s, { ok: false, counted: false });

test('the config holds the pacing numbers', () => {
  assert.equal(CONFIG.firstStage, 1);
  assert.equal(CONFIG.failsForDemo, 3);
  assert.equal(CONFIG.failsForAssist, 5);
  assert.equal(CONFIG.goodEvery, 2);
  assert.equal(CONFIG.letterGlowMs, 2000);
  assert.equal(CONFIG.fadeMs, 500);
  assert.equal(CONFIG.demoMs, 1500);
});

test('the retired settings are gone (practice rounds replaced them)', () => {
  for (const key of ['lastStage', 'lettersPerStage', 'maxAssistedInRow', 'dropStage']) {
    assert.equal(key in CONFIG, false, key);
  }
});

test('a character starts at Stage 1, stroke 1', () => {
  const s = initialState(2);
  assert.equal(s.stage, 1);
  assert.equal(s.current, 0);
  assert.equal(s.streak, 0);
  assert.equal(s.assisted, false);
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
  const s = pass(initialState(3));
  const r = applyLift(s, { ok: true, to: 2 });
  assert.equal(r.letterDone, true);
});

test('a pass resets the fail streak', () => {
  let s = fail(fail(initialState(2)));
  assert.equal(s.streak, 2);
  s = pass(s);
  assert.equal(s.streak, 0);
});

test('3 fails in a row: demo, the stage stays, the streak carries on', () => {
  const s = fail(fail(initialState(2)));
  const r = applyLift(s, { ok: false });
  assert.equal(r.demo, true);
  assert.equal(r.assist, false);
  assert.equal(r.state.stage, 1);
  assert.equal(r.state.streak, 3);
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

test('a lift after the letter is done changes nothing', () => {
  const s = pass(pass(initialState(2)));
  assert.equal(isLetterDone(s), true);
  assert.equal(applyLift(s, { ok: true }).state, s);
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

// ---------------------------------------------------------------------------
// Practice rounds

import {
  ROUNDS, COPY_STAGE, roundCount, stageForRound, startRounds, markHelp, isHelp,
  finishRound, starEarned, roundLights, finishedEarlier,
} from '../src/progress.js';

test('2 practice rounds by default, and the setting stays between 2 and 4 (Slice 5K)', () => {
  assert.equal(ROUNDS, 2);
  assert.equal(roundCount(), 2);
  assert.equal(roundCount(1), 2);
  assert.equal(roundCount(3), 3);
  assert.equal(roundCount(9), 4);
  assert.equal(roundCount('junk'), 2);
});

test('practice rounds map to stages 1 then 2; the copy-it round (Stage 3) is for reviews only', () => {
  const stages = (n) => Array.from({ length: n }, (_, r) => stageForRound(r, n));
  assert.deepEqual(stages(2), [1, 2]);
  assert.deepEqual(stages(3), [1, 1, 2]);
  assert.deepEqual(stages(4), [1, 1, 2, 2]);
  assert.equal(COPY_STAGE, 3);
});

test('inside a round the stage never drops, however many misses', () => {
  let s = { ...initialState(3), stage: 3 };
  for (let i = 0; i < 6; i++) s = applyLift(s, { ok: false }).state;
  assert.equal(s.stage, 3);
  s = { ...initialState(3), stage: 2 };
  for (let i = 0; i < 6; i++) s = applyLift(s, { ok: false }).state;
  assert.equal(s.stage, 2);
});

test('a round counts only when she drew every stroke; then the next round comes', () => {
  let rp = startRounds(null);
  assert.deepEqual(rp, { round: 0, helped: false });
  let r = finishRound(rp, { assisted: false });
  assert.deepEqual(r, { state: { round: 1, helped: false }, repeat: false, allDone: false });
  r = finishRound(r.state, { assisted: false });
  assert.equal(r.state.round, 2);
  assert.equal(r.allDone, true); // two rounds: then the star and the find scene
});

test('when Jugnu drew a stroke the round starts again, and the help is kept', () => {
  const r = finishRound({ round: 1, helped: false }, { assisted: true });
  assert.deepEqual(r, { state: { round: 1, helped: true }, repeat: true, allDone: false });
});

test('she resumes at the round she left; broken saves start fresh', () => {
  assert.deepEqual(startRounds({ round: 1, helped: false }), { round: 1, helped: false });
  assert.deepEqual(startRounds({ round: 0, helped: true }), { round: 0, helped: true });
  assert.deepEqual(startRounds({ round: 2, helped: true }), { round: 0, helped: false }); // past the end
  assert.deepEqual(startRounds({ round: -1 }), { round: 0, helped: false });
  assert.deepEqual(startRounds({ round: '1' }), { round: 0, helped: false });
  assert.deepEqual(startRounds({ round: 3 }, 4), { round: 3, helped: false });
});

test('help is an assist, or a demonstration after misses in a Stage 2 or 3 round', () => {
  const lift = (o) => ({ assist: false, demo: false, ...o });
  assert.equal(isHelp(1, lift({ assist: true })), true);
  assert.equal(isHelp(1, lift({ demo: true })), false); // Stage 1 demonstrations are the lesson
  assert.equal(isHelp(2, lift({ demo: true })), true);
  assert.equal(isHelp(3, lift({ demo: true })), true);
  assert.equal(isHelp(3, lift({})), false);
});

test('a gold star only when no round needed Jugnu', () => {
  let rp = startRounds(null);
  for (let i = 0; i < 2; i++) rp = finishRound(rp, { assisted: false }).state;
  assert.equal(starEarned(rp), true);
  rp = markHelp(startRounds(null));
  for (let i = 0; i < 2; i++) rp = finishRound(rp, { assisted: false }).state;
  assert.equal(starEarned(rp), false);
  // A repeated round (Jugnu drew a stroke) loses the star too.
  rp = finishRound(startRounds(null), { assisted: true }).state;
  for (let i = 0; i < 2; i++) rp = finishRound(rp, { assisted: false }).state;
  assert.equal(starEarned(rp), false);
});

test('the round lights: done, now, to come', () => {
  assert.deepEqual(roundLights({ round: 0 }), ['now', 'next']);
  assert.deepEqual(roundLights({ round: 1 }), ['done', 'now']);
  assert.deepEqual(roundLights({ round: 2 }), ['done', 'done']);
  assert.deepEqual(roundLights({ round: 1 }, 4), ['done', 'now', 'next', 'next']);
  // A review: one light.
  assert.deepEqual(roundLights({ round: 0 }, 1), ['now']);
  assert.deepEqual(roundLights({ round: 1 }, 1), ['done']);
});

test('Slice 5K: a practice saved in the old round 3 counts as finished, with its help remembered', () => {
  const saved = {
    A: { round: 2, helped: false }, // was waiting in the old round 3: rounds 1 and 2 done, no help
    B: { round: 2, helped: true },  // the same, with Jugnu's help: finished, no star
    C: { round: 1, helped: false }, // part way: she carries on at round 2
    D: { round: 0, helped: true },
    name: { round: 2, helped: false },
    E: { round: '2' }, F: null,     // broken saves: left alone (startRounds starts them fresh)
  };
  assert.deepEqual(finishedEarlier(saved), [{ id: 'A', helped: false }, { id: 'B', helped: true }, { id: 'name', helped: false }]);
  assert.deepEqual(startRounds(saved.C), { round: 1, helped: false });
  assert.deepEqual(finishedEarlier(null), []);
  assert.deepEqual(finishedEarlier([]), []);
  assert.deepEqual(finishedEarlier({}), []);
});
