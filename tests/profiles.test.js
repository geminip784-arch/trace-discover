// Run: node --test tests/profiles.test.js
// Slice 8A part 1: per-child storage, the migration of old progress, and adding,
// renaming and removing children (src/storage.js). Made-up names only.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  useStore, useChild, testStore, childStore, openProfiles, migrateProfiles, chooseChild,
  readChildren, readCurrent, readProfile, saveProfile, addChildProfile, updateChildProfile, removeChildProfile,
  readStars, saveStar, readRounds, saveRounds, readHelper, saveHelper, readFinds, saveFind, saveNameCard,
  readReviews, saveReviews, readPracticeMore, savePracticeMore, readGameStars, saveGameStar, readLastPlay,
  readMusic, saveMusic, readLastVisit, saveLastVisit, logAttempt, readAttempts, readPages, savePracticePage,
} from '../src/storage.js';
import { LEGACY_KEYS, MIGRATION_KEY, CHILDREN_KEY } from '../src/children.js';

// A localStorage stand-in that can list its keys, as the real one can.
function memoryStore(init = {}) {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
    key: (i) => [...data.keys()][i] ?? null,
    get length() { return data.size; },
  };
}

// The tablet before Slice 8A: one child's progress under the old keys.
const OLD = {
  'td.profile': JSON.stringify({ name: 'Sara', sayAs: 'Saa-ra' }),
  'td.stars': JSON.stringify(['A', 'B', 'name']),
  'td.rounds': JSON.stringify({ C: { round: 2, helped: false } }),
  'td.helper': JSON.stringify({ A: { level: 2, passes: 1, fails: 0 } }),
  'td.finds': JSON.stringify([{ o: 'apple' }, { nm: 1 }, { pg: 'A' }]),
  'td.games': JSON.stringify(['colors']),
  'td.drawings': JSON.stringify(['L1:house']),
  'td.lastPlay': JSON.stringify({ colors: ['k1'] }),
  'td.missing': JSON.stringify({ 1: 3 }),
  'td.reviews': JSON.stringify({ enrolled: true, letters: { A: { step: 1, due: '2026-11-20' } }, graduated: [], today: null }),
  'td.practiceMore': JSON.stringify([{ id: 'B', reasons: ['help'], day: '2026-11-17' }]),
  'td.pages': JSON.stringify({ A: 2 }),
  'td.attempts': JSON.stringify([{ char: 'A', ok: true }, { char: 'B', ok: false }]),
  'td.music': 'on',
  'td.lastVisit': '2026-11-17',
};

beforeEach(() => {
  useStore(null);
  useChild(null);
});

test('first open after the update: all old progress becomes the first child, named from the setup page', () => {
  const store = memoryStore(OLD);
  useStore(store);
  assert.equal(openProfiles(), 'c1');
  assert.equal(store.getItem(MIGRATION_KEY), 'done');
  assert.deepEqual(readChildren().list.map((c) => [c.id, c.name, c.sayAs]), [['c1', 'Sara', 'Saa-ra']]);
  assert.deepEqual(readProfile(), { name: 'Sara', sayAs: 'Saa-ra' });
  assert.deepEqual(readStars(), ['A', 'B', 'name']);
  assert.deepEqual(readRounds('C'), { round: 2, helped: false });
  assert.deepEqual(readHelper('A'), { level: 2, passes: 1, fails: 0 });
  assert.equal(readFinds().length, 3);
  assert.deepEqual(readGameStars(), ['colors']);
  assert.deepEqual(readLastPlay('colors'), ['k1']);
  assert.equal(readReviews().letters.A.due, '2026-11-20');
  assert.deepEqual(readPracticeMore().map((e) => e.id), ['B']);
  assert.deepEqual(readPages(), { A: 2 });
  assert.deepEqual(readAttempts().map((a) => a.child), ['c1', 'c1'], 'each old log entry gets the child id');
  assert.equal(readMusic(), true, 'music is a device setting: shared, unchanged');
  assert.equal(readLastVisit(), '2026-11-17');
});

test('the migration leaves every old key untouched, as a backup', () => {
  const store = memoryStore(OLD);
  migrateProfiles(store);
  for (const [key, value] of Object.entries(OLD)) assert.equal(store.getItem(key), value, `${key} unchanged`);
  for (const key of LEGACY_KEYS) assert.ok(store.getItem(key.replace('td.', 'td.child.c1.')) !== null, `${key} copied`);
});

test('the migration runs once; progress made after it is never overwritten by the old keys', () => {
  const store = memoryStore(OLD);
  useStore(store);
  openProfiles();
  saveStar('C');
  useChild(null);
  assert.equal(openProfiles(), 'c1');
  assert.deepEqual(readStars(), ['A', 'B', 'name', 'C']);
});

test('an interrupted migration is safely run again on the next open, wherever it stopped', () => {
  // Count the writes a whole migration makes, then stop it after each one in turn.
  const counting = memoryStore(OLD);
  let total = 0;
  const set = counting.setItem;
  counting.setItem = (k, v) => { total++; set(k, v); };
  migrateProfiles(counting);
  assert.ok(total > LEGACY_KEYS.length);
  for (let stopAt = 0; stopAt < total; stopAt++) {
    const store = memoryStore(OLD);
    let writes = 0;
    const closing = { ...store, getItem: store.getItem, setItem: (k, v) => {
      if (writes++ >= stopAt) throw new Error('the app was closed');
      store.setItem(k, v);
    } };
    assert.equal(migrateProfiles(closing).ok, false, `stopped after ${stopAt} writes`);
    assert.notEqual(store.getItem(MIGRATION_KEY), 'done', 'not marked done');
    for (const [key, value] of Object.entries(OLD)) assert.equal(store.getItem(key), value, 'the old keys are untouched');
    // While it has not finished, the app plays on the old keys exactly as before.
    useStore(closing);
    useChild(null);
    assert.equal(openProfiles(), null);
    assert.deepEqual(readStars(), ['A', 'B', 'name']);
    assert.deepEqual(readProfile(), { name: 'Sara', sayAs: 'Saa-ra' });
    // The next open finishes it, with everything there.
    useStore(store);
    assert.equal(openProfiles(), 'c1', `finished after stopping at ${stopAt}`);
    assert.equal(readChildren().list.length, 1, 'still one child');
    assert.deepEqual(readStars(), ['A', 'B', 'name']);
    assert.deepEqual(readAttempts().map((a) => a.child), ['c1', 'c1']);
    assert.deepEqual(readProfile(), { name: 'Sara', sayAs: 'Saa-ra' });
  }
});

test('progress made on the old keys while the migration could not finish is copied when it does', () => {
  const store = memoryStore(OLD);
  const full = { ...store, getItem: store.getItem, setItem: (k, v) => {
    if (k.startsWith('td.child.')) throw new Error('storage full');
    store.setItem(k, v);
  } };
  useStore(full);
  assert.equal(openProfiles(), null);
  saveStar('D'); // on the old keys
  useStore(store);
  assert.equal(openProfiles(), 'c1');
  assert.deepEqual(readStars(), ['A', 'B', 'name', 'D']);
});

test('the migration is only marked done when every copy reads back the same', () => {
  const store = memoryStore(OLD);
  const garbling = { ...store, getItem: (k) => (k === 'td.child.c1.stars' ? '[]' : store.getItem(k)), setItem: store.setItem };
  assert.equal(migrateProfiles(garbling).ok, false);
  assert.notEqual(store.getItem(MIGRATION_KEY), 'done');
});

test('a brand-new device: one unnamed child, nothing else', () => {
  const store = memoryStore();
  useStore(store);
  assert.equal(openProfiles(), 'c1');
  assert.deepEqual(readChildren().list.map((c) => c.name), ['']);
  assert.deepEqual(readStars(), []);
  assert.equal([...store.data.keys()].filter((k) => k.startsWith('td.child.')).length, 0);
});

test('switching children keeps progress separate: a star for one never shows for the other', () => {
  const store = memoryStore(OLD);
  useStore(store);
  openProfiles();
  assert.equal(addChildProfile({ name: 'Omar' }).child.id, 'c2');
  assert.ok(chooseChild('c2'));
  assert.deepEqual(readStars(), [], 'a new child starts with nothing');
  saveStar('Z');
  saveRounds('M', { round: 2, helped: true });
  saveHelper('Q', { level: 3, passes: 2, fails: 0 });
  saveFind({ o: 'zebra' });
  saveNameCard();
  saveGameStar('path');
  savePracticePage('Z');
  saveReviews({ enrolled: true, letters: { Z: { step: 0, due: '2026-11-19' } }, graduated: [], today: null });
  savePracticeMore([{ id: 'Z', reasons: ['starts'], day: '2026-11-18' }]);
  logAttempt({ char: 'Z', ok: true });
  assert.deepEqual(readProfile(), { name: 'Omar', sayAs: '' });
  assert.deepEqual(readAttempts().map((a) => a.child), ['c2']);

  chooseChild('c1');
  assert.equal(readCurrent(), 'c1');
  assert.deepEqual(readStars(), ['A', 'B', 'name']);
  assert.equal(readRounds('M'), null);
  assert.equal(readHelper('Q'), null);
  assert.ok(!readFinds().some((f) => f.o === 'zebra'));
  assert.deepEqual(readGameStars(), ['colors']);
  assert.deepEqual(readPages(), { A: 2 });
  assert.equal(readReviews().letters.Z, undefined);
  assert.deepEqual(readPracticeMore().map((e) => e.id), ['B']);
  assert.ok(readAttempts().every((a) => a.child === 'c1'));
  assert.deepEqual(readProfile(), { name: 'Sara', sayAs: 'Saa-ra' });

  chooseChild('c2');
  assert.deepEqual(readStars(), ['Z']);
  assert.equal(chooseChild('c9'), false, 'no such child');
  assert.equal(readCurrent(), 'c2');
});

test('the device settings stay shared between children', () => {
  const store = memoryStore(OLD);
  useStore(store);
  openProfiles();
  addChildProfile({ name: 'Omar' });
  chooseChild('c2');
  saveMusic(false);
  saveLastVisit('2026-11-18');
  chooseChild('c1');
  assert.equal(readMusic(), false);
  assert.equal(readLastVisit(), '2026-11-18');
});

test('the playing child is remembered on the next open', () => {
  const store = memoryStore(OLD);
  useStore(store);
  openProfiles();
  addChildProfile({ name: 'Omar' });
  chooseChild('c2');
  useChild(null);
  assert.equal(openProfiles(), 'c2');
});

test('add: names are checked, and at most 6 children', () => {
  const store = memoryStore(OLD);
  useStore(store);
  openProfiles();
  assert.equal(addChildProfile({ name: 'sara' }).reason, 'taken');
  assert.equal(addChildProfile({ name: 'Omar Ali' }).reason, 'unsupported');
  assert.equal(addChildProfile({ name: '' }).reason, 'none');
  for (const name of ['Omar', 'Zoya', 'Ali', 'Bina', 'Cyra']) assert.ok(addChildProfile({ name }).ok);
  assert.equal(addChildProfile({ name: 'Dani' }).reason, 'full');
  assert.equal(readChildren().list.length, 6);
});

test('rename restarts only that child\'s name book; a new picture or color resets nothing', () => {
  const store = memoryStore(OLD);
  useStore(store);
  openProfiles();
  addChildProfile({ name: 'Omar' });
  chooseChild('c2');
  saveStar('name');
  saveStar('A');
  saveNameCard();
  chooseChild('c1');

  assert.equal(updateChildProfile('c2', { animal: 'owl' }).renamed, false);
  chooseChild('c2');
  assert.deepEqual(readStars(), ['name', 'A']);

  const out = updateChildProfile('c2', { name: 'Zaid' });
  assert.ok(out.ok && out.renamed);
  assert.deepEqual(readStars(), ['A'], 'the name star goes, the letter star stays');
  assert.ok(!readFinds().some((f) => f.nm === 1), 'the old name card goes');
  assert.deepEqual(readProfile().name, 'Zaid');

  chooseChild('c1');
  assert.deepEqual(readStars(), ['A', 'B', 'name'], "the other child's name book is untouched");
  assert.ok(readFinds().some((f) => f.nm === 1));
  assert.equal(updateChildProfile('c1', { name: 'Zaid' }).reason, 'taken');
});

test('remove deletes only that child\'s progress', () => {
  const store = memoryStore(OLD);
  useStore(store);
  openProfiles();
  addChildProfile({ name: 'Omar' });
  addChildProfile({ name: 'Zoya' });
  chooseChild('c2');
  saveStar('Z');
  logAttempt({ char: 'Z' });
  store.setItem('test.td.child.c2.stars', '["Q"]'); // a test-mode copy
  const before = new Map([...store.data].filter(([k]) => !k.includes('.c2.')));

  assert.ok(removeChildProfile('c2'));
  assert.deepEqual(readChildren().list.map((c) => c.id), ['c1', 'c3']);
  assert.deepEqual([...store.data.keys()].filter((k) => k.includes('child.c2.')), [], "all of c2's keys are gone");
  for (const [k, v] of before) if (k !== CHILDREN_KEY && k !== 'td.current') assert.equal(store.getItem(k), v, `${k} untouched`);
  assert.equal(readCurrent(), 'c1', 'the playing child falls back to the first');
  assert.equal(removeChildProfile('c2'), false, 'already gone');

  chooseChild('c1');
  assert.deepEqual(readStars(), ['A', 'B', 'name']);
  // A child added later never gets c2's old progress.
  assert.equal(addChildProfile({ name: 'Dani' }).child.id, 'c4');
});

test('setup page: saveProfile changes only the playing child\'s name', () => {
  const store = memoryStore(OLD);
  useStore(store);
  openProfiles();
  addChildProfile({ name: 'Omar' });
  assert.ok(saveProfile({ name: 'Sarah', sayAs: '' }));
  assert.deepEqual(readChildren().list.map((c) => c.name), ['Sarah', 'Omar']);
  assert.equal(store.getItem('td.profile'), OLD['td.profile'], 'the old backup stays as it was');
});

test('test mode (?debug=1&today=) still never touches the real progress', () => {
  const real = memoryStore(OLD);
  useStore(real);
  openProfiles();
  const realKeys = new Map(real.data);
  useStore(testStore(real));
  useChild(null);
  assert.equal(openProfiles(), 'c1');
  assert.deepEqual(readStars(), ['A', 'B', 'name'], 'reads her real progress');
  saveStar('Q');
  logAttempt({ char: 'Q' });
  assert.deepEqual(readStars(), ['A', 'B', 'name', 'Q']);
  for (const [k, v] of realKeys) assert.equal(real.getItem(k), v, `${k} untouched`);
  assert.equal(real.getItem('test.td.child.c1.stars'), JSON.stringify(['A', 'B', 'name', 'Q']));
});

test('a child store reads and writes only that child\'s copy', () => {
  const store = memoryStore();
  const c1 = childStore(store, 'c1');
  c1.setItem('td.stars', '["A"]');
  c1.setItem('td.music', 'on');
  assert.equal(store.getItem('td.child.c1.stars'), '["A"]');
  assert.equal(store.getItem('td.music'), 'on');
  assert.equal(childStore(store, 'c2').getItem('td.stars'), null);
});

test('blocked storage never throws', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
  assert.deepEqual(migrateProfiles(broken), { ok: false, child: null });
  useStore(broken);
  assert.equal(openProfiles(), null);
  assert.equal(removeChildProfile('c1', broken), false);
  assert.equal(addChildProfile({ name: 'Omar' }, broken).reason, 'storage');
});
