// Run: node --test tests/storage.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendAttempt, logAttempt, readAttempts, ATTEMPTS_KEY, MAX_ATTEMPTS } from '../src/storage.js';

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
