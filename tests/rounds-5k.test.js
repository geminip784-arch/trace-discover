// Run: node --test tests/rounds-5k.test.js
// Slice 5K: round 3 moved to reviews. Practising is rounds 1 and 2, then the
// star; practices saved in the old round 3 count as finished, and nothing she
// has earned is lost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ROUNDS_KEY, HELPER_KEY, STARS_KEY, REVIEWS_KEY, PRACTICE_MORE_KEY,
  finishOldPractices, readStars, readRounds, readReviews, readPracticeMore, readFinds, readHelper, saveHelper,
  saveStar, saveReviews, savePracticeMore,
} from '../src/storage.js';
import { ROUNDS, startRounds, finishRound, starEarned, stageForRound } from '../src/progress.js';
import { isNameCard } from '../src/finds.js';

function memoryStore(init = {}) {
  const data = new Map(Object.entries(init).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
}

const TODAY = '2026-11-17';
const TOMORROW = '2026-11-18';

test('a practice is two tracing rounds, then the star: stage 1, then stage 2', () => {
  assert.equal(ROUNDS, 2);
  let r = { state: startRounds(null) };
  const stages = [];
  while (!r.allDone) {
    stages.push(stageForRound(r.state.round));
    r = finishRound(r.state, { assisted: false });
  }
  assert.deepEqual(stages, [1, 2]);
  assert.equal(starEarned(r.state), true);
});

test('old round-3 practices finish at start: the star when no help, a review due tomorrow either way', () => {
  const store = memoryStore({
    [ROUNDS_KEY]: {
      A: { round: 2, helped: false },
      B: { round: 2, helped: true },
      C: { round: 1, helped: false },
    },
  });
  const done = finishOldPractices(TODAY, { store });
  assert.deepEqual(done, ['A', 'B']);
  assert.deepEqual(readStars(store), ['A']);       // B had Jugnu's help: finished, no star
  assert.equal(readRounds('A', store), null);      // cleared: practising A again starts at round 1
  assert.equal(readRounds('B', store), null);
  assert.deepEqual(readRounds('C', store), { round: 1, helped: false }); // part way: she carries on at round 2
  const reviews = readReviews(store);
  assert.deepEqual(reviews.letters.A, { step: 0, due: TOMORROW });
  assert.deepEqual(reviews.letters.B, { step: 0, due: TOMORROW });
  assert.equal(reviews.letters.C, undefined);
  // A help-only practice goes on the practice-more list, as any helped practice does.
  assert.deepEqual(readPracticeMore(store), [{ id: 'B', reasons: ['help'], day: TODAY }]);
});

test('it happens once: a second start changes nothing', () => {
  const store = memoryStore({ [ROUNDS_KEY]: { A: { round: 2, helped: false } } });
  finishOldPractices(TODAY, { store });
  const before = new Map(store.data);
  assert.deepEqual(finishOldPractices('2026-11-20', { store }), []);
  assert.deepEqual(new Map(store.data), before);
});

test('nothing she has earned is lost: stars, helper levels, review steps and the list stay', () => {
  const store = memoryStore({ [ROUNDS_KEY]: { A: { round: 2, helped: false }, M: { round: 2, helped: true } } });
  saveStar('Z', store);
  saveStar('M', store); // starred long ago, practised again with help
  saveHelper('A', { level: 2, passes: 1, fails: 0 }, store);
  saveReviews({ enrolled: true, letters: { M: { step: 2, due: '2026-11-21' } }, graduated: ['Q'], today: null }, store);
  savePracticeMore([{ id: 'Z', reasons: ['starts'], day: '2026-11-10' }], store);
  finishOldPractices(TODAY, { store });
  assert.deepEqual(readStars(store), ['Z', 'M', 'A']);  // M keeps its old star
  assert.deepEqual(readHelper('A', store), { level: 2, passes: 1, fails: 0 });
  const reviews = readReviews(store);
  assert.deepEqual(reviews.graduated, ['Q']);
  assert.deepEqual(reviews.letters.A, { step: 0, due: TOMORROW });
  // A helped practice sends M back to 1 day, exactly as a helped practice always has.
  assert.deepEqual(reviews.letters.M, { step: 0, due: TOMORROW });
  assert.deepEqual(readPracticeMore(store).map((e) => e.id), ['Z', 'M']);
});

test('her name: an old round-3 practice gives her the star and her name card', () => {
  const store = memoryStore({ [ROUNDS_KEY]: { name: { round: 2, helped: false } } });
  finishOldPractices(TODAY, { store });
  assert.deepEqual(readStars(store), ['name']);
  assert.equal(readFinds(store).filter(isNameCard).length, 1);
  assert.deepEqual(readReviews(store).letters.name, { step: 0, due: TOMORROW });
});

test('broken or blocked storage never throws', () => {
  assert.deepEqual(finishOldPractices(TODAY, { store: memoryStore({ [ROUNDS_KEY]: 'junk' }) }), []);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.doesNotThrow(() => finishOldPractices(TODAY, { store: blocked }));
});

test('the shell finishes old practices at start, and a practice never opens the copy round', () => {
  const shell = readFileSync(new URL('../src/screens.js', import.meta.url), 'utf8');
  assert.match(shell, /finishOldPractices\(todayNow\(\), \{ nameId: NAME_ID \}\)/);
  for (const f of ['../src/game.js', '../src/name-game.js']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.match(src, /const isCopy = \(\) => review;/);
  }
});

test('the keys it touches are the usual ones', () => {
  assert.deepEqual([STARS_KEY, REVIEWS_KEY, PRACTICE_MORE_KEY, HELPER_KEY], ['td.stars', 'td.reviews', 'td.practiceMore', 'td.helper']);
});
