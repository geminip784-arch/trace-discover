// Run: node --test tests/storage.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendAttempt, logAttempt, readAttempts, ATTEMPTS_KEY, MAX_ATTEMPTS,
  PROFILE_KEY, readProfile, saveProfile, cleanProfile,
  readLastVisit, saveLastVisit, readStars, saveStar, addStar, readMusic, saveMusic,
  ROUNDS_KEY, readRounds, saveRounds, clearRounds,
} from '../src/storage.js';
import { FINDS_KEY, readFinds, saveFind } from '../src/storage.js';
import { GAME_STARS_KEY, readGameStars, saveGameStar } from '../src/storage.js';

function memoryStore() {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
}

test('the log keeps only the newest 2000 attempts', () => {
  assert.equal(MAX_ATTEMPTS, 2000);
  let list = [];
  for (let i = 0; i < 2005; i++) list = appendAttempt(list, { i });
  assert.equal(list.length, 2000);
  assert.equal(list[0].i, 5);
  assert.equal(list[1999].i, 2004);
});

test('logAttempt saves to td.attempts and readAttempts reads it back', () => {
  const store = memoryStore();
  logAttempt({ char: 'L', ok: true }, store);
  logAttempt({ char: 'L', ok: false }, store);
  assert.equal(JSON.parse(store.getItem(ATTEMPTS_KEY)).length, 2);
  assert.deepEqual(readAttempts(store).map((a) => a.ok), [true, false]);
});

test('broken or blocked storage never throws', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
  assert.deepEqual(readAttempts(broken), []);
  assert.doesNotThrow(() => logAttempt({ ok: true }, broken));
  const junk = { getItem: () => '{not json', setItem: () => {} };
  assert.deepEqual(readAttempts(junk), []);
});

test('the profile saves to td.profile and reads back trimmed', () => {
  const store = memoryStore();
  assert.equal(PROFILE_KEY, 'td.profile');
  assert.equal(saveProfile({ name: '  Sam ', sayAs: ' Samm ' }, store), true);
  assert.deepEqual(JSON.parse(store.getItem('td.profile')), { name: 'Sam', sayAs: 'Samm' });
  assert.deepEqual(readProfile(store), { name: 'Sam', sayAs: 'Samm' });
});

test('no profile yet, junk or blocked storage: an empty profile, never a throw', () => {
  assert.deepEqual(readProfile(memoryStore()), { name: '', sayAs: '' });
  const junk = { getItem: () => '{not json', setItem: () => {} };
  assert.deepEqual(readProfile(junk), { name: '', sayAs: '' });
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
  assert.deepEqual(readProfile(broken), { name: '', sayAs: '' });
  assert.equal(saveProfile({ name: 'Sam' }, broken), false);
});

test('cleanProfile drops anything that is not text and caps the length', () => {
  assert.deepEqual(cleanProfile({ name: 7, sayAs: null, extra: 'x' }), { name: '', sayAs: '' });
  assert.equal(cleanProfile({ name: 'a'.repeat(100) }).name.length, 40);
});

test('the last visit day saves to td.lastVisit; junk reads as no visit', () => {
  const store = memoryStore();
  assert.equal(readLastVisit(store), null);
  assert.equal(saveLastVisit('2026-11-02', store), true);
  assert.equal(store.getItem('td.lastVisit'), '2026-11-02');
  assert.equal(readLastVisit(store), '2026-11-02');
  store.setItem('td.lastVisit', 'yesterday');
  assert.equal(readLastVisit(store), null);
});

test('stars save to td.stars, each id once', () => {
  const store = memoryStore();
  assert.deepEqual(readStars(store), []);
  saveStar('L', store);
  saveStar('ur-be', store);
  saveStar('L', store);
  assert.deepEqual(readStars(store), ['L', 'ur-be']);
  assert.deepEqual(addStar(['L'], 'L'), ['L']);
  store.setItem('td.stars', '[1, "E", null]');
  assert.deepEqual(readStars(store), ['E']);
});

test('the music setting saves to td.music and is off by default', () => {
  const store = memoryStore();
  assert.equal(readMusic(store), false);
  saveMusic(true, store);
  assert.equal(store.getItem('td.music'), 'on');
  assert.equal(readMusic(store), true);
  saveMusic(false, store);
  assert.equal(readMusic(store), false);
});

test('shell settings never throw with broken storage', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
  assert.equal(readLastVisit(broken), null);
  assert.equal(saveLastVisit('2026-11-02', broken), false);
  assert.deepEqual(readStars(broken), []);
  assert.equal(saveStar('L', broken), false);
  assert.equal(readMusic(broken), false);
  assert.equal(saveMusic(true, broken), false);
  const junk = { getItem: () => '{not json', setItem: () => {} };
  assert.deepEqual(readStars(junk), []);
});

test('practice rounds save per character in td.rounds and clear when finished', () => {
  const store = memoryStore();
  assert.equal(readRounds('F', store), null);
  saveRounds('F', { round: 1, helped: false }, store);
  saveRounds('4', { round: 2, helped: true }, store);
  assert.deepEqual(readRounds('F', store), { round: 1, helped: false });
  assert.deepEqual(readRounds('4', store), { round: 2, helped: true });
  assert.deepEqual(Object.keys(JSON.parse(store.getItem(ROUNDS_KEY))).sort(), ['4', 'F']);
  clearRounds('F', store);
  assert.equal(readRounds('F', store), null);
  assert.deepEqual(readRounds('4', store), { round: 2, helped: true });
});

test('broken round saves never throw', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
  assert.equal(readRounds('F', broken), null);
  assert.equal(saveRounds('F', { round: 1 }, broken), false);
  assert.equal(clearRounds('F', broken), false);
  const junk = { getItem: () => '[1,2]', setItem: () => {} };
  assert.equal(readRounds('F', junk), null);
});

test('Slice 5C: every find is saved in td.finds and read back, newest last', () => {
  const store = memoryStore();
  assert.deepEqual(readFinds(store), []);
  assert.equal(saveFind({ o: 'egg' }, store), true);
  assert.equal(saveFind({ g: 'cup', n: 4, gold: true }, store), true);
  assert.deepEqual(readFinds(store), [{ o: 'egg' }, { g: 'cup', n: 4, gold: true }]);
  assert.equal(JSON.parse(store.getItem(FINDS_KEY)).length, 2);
});

test('Slice 5C: a broken or blocked store never stops the collection', () => {
  const bad = memoryStore();
  bad.setItem(FINDS_KEY, '{not json');
  assert.deepEqual(readFinds(bad), []);
  bad.setItem(FINDS_KEY, JSON.stringify([{ o: 'egg' }, { o: 'unknown' }, 7]));
  assert.deepEqual(readFinds(bad), [{ o: 'egg' }]);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.deepEqual(readFinds(blocked), []);
  assert.equal(saveFind({ o: 'egg' }, blocked), false);
});

test('Slice 5C: find entries go into the same attempt log; stroke entries are unchanged', () => {
  const store = memoryStore();
  const stroke = { time: 't', char: 'E', stage: 1, stroke: 0, variant: 'a', ok: true, reason: null };
  logAttempt(stroke, store);
  logAttempt({ type: 'find', char: 'E', scene: 'letter', step: 'find', word: 'egg', ok: true, ms: 900 }, store);
  const log = readAttempts(store);
  assert.deepEqual(log[0], stroke);
  assert.equal('type' in log[0], false);
  assert.equal(log[1].type, 'find');
});

test('Slice 5D: a game earns its star once, saved in td.games', () => {
  const store = memoryStore();
  assert.deepEqual(readGameStars(store), []);
  assert.equal(saveGameStar('colors', store), true);
  assert.equal(saveGameStar('colors', store), true);
  assert.equal(saveGameStar('path', store), true);
  assert.deepEqual(readGameStars(store), ['colors', 'path']);
  assert.deepEqual(JSON.parse(store.getItem(GAME_STARS_KEY)), ['colors', 'path']);
});

test('Slice 5D: broken or blocked storage never stops the games', () => {
  const bad = memoryStore();
  bad.setItem(GAME_STARS_KEY, '{oops');
  assert.deepEqual(readGameStars(bad), []);
  bad.setItem(GAME_STARS_KEY, JSON.stringify(['path', 3, null]));
  assert.deepEqual(readGameStars(bad), ['path']);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.deepEqual(readGameStars(blocked), []);
  assert.equal(saveGameStar('path', blocked), false);
});
