// Run: node --test tests/storage.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendAttempt, logAttempt, readAttempts, ATTEMPTS_KEY, MAX_ATTEMPTS,
  PROFILE_KEY, readProfile, saveProfile, cleanProfile,
} from '../src/storage.js';

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
