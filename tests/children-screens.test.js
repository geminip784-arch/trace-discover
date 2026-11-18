// Run: node --test tests/children-screens.test.js
// Slice 8A part 2: the first run, the children's tiles at the door, the switch-child
// button, the gear's lock and the children page's rules. Made-up names only.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startScreen, navigate, tuneFor } from '../src/session.js';
import {
  needsSetup, childTileGrid, tileFontSize, TILES, LOCK_MS, MAX_CHILDREN, emptyChildren, addChild,
  checkName, childNameNote, SHARED_KEYS, WELCOMED_KEY,
} from '../src/children.js';
import { createHold } from '../src/hold.js';
import {
  useStore, useChild, openProfiles, readChildren, readWelcomed, saveWelcomed, addChildProfile, updateChildProfile,
  chooseChild, readStars, saveStar,
} from '../src/storage.js';
import { ANIMAL_ART, GEAR } from '../src/art.js';
import { ANIMALS } from '../src/children.js';

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
const NAMES = ['Sara', 'Omar', 'Zoya', 'Ali', 'Bina', 'Cyra'];
const withNames = (n) => NAMES.slice(0, n).reduce((s, name) => addChild(s, { name }).state, emptyChildren());
const TODAY = '2026-11-18';

beforeEach(() => {
  useStore(null);
  useChild(null);
});

// ---- first run ----

test('first run: a brand-new device opens the children page, and only it', () => {
  const store = memoryStore();
  useStore(store);
  openProfiles();
  const kids = readChildren();
  assert.ok(needsSetup(kids), 'one unnamed child: setup is needed');
  assert.deepEqual(startScreen({ today: TODAY, setup: needsSetup(kids), welcomed: readWelcomed(), children: 1 }), { screen: 'children', first: true });
  // It cannot be left while a child has no name.
  const first = { screen: 'children', first: true };
  assert.equal(navigate(first, { type: 'closeParents', ready: false }), first);
  assert.equal(navigate(first, { type: 'home' }), first, 'no way home from the first run');
  assert.equal(navigate(first, { type: 'back' }), first);
  // Naming the child ends the first run.
  assert.ok(updateChildProfile('c1', { name: 'Sara' }).ok);
  assert.ok(!needsSetup(readChildren()));
  assert.deepEqual(navigate(first, { type: 'closeParents', ready: true }), { screen: 'door' });
  saveWelcomed();
  assert.deepEqual(startScreen({ today: TODAY, lastVisit: TODAY, setup: false, welcomed: readWelcomed(), children: 1 }), { screen: 'shelf' });
});

test('first run needs at least one child, and every child needs a name', () => {
  assert.ok(needsSetup(emptyChildren()));
  assert.ok(needsSetup(addChild(emptyChildren(), { name: '' }, { checkNames: false }).state));
  assert.ok(!needsSetup(withNames(1)));
  const mixed = addChild(withNames(2), { name: '' }, { checkNames: false }).state;
  assert.ok(needsSetup(mixed));
});

test('after the update the children page shows once, then the usual door rules', () => {
  const store = memoryStore({ 'td.profile': JSON.stringify({ name: 'Sara' }), 'td.stars': '["A"]' });
  useStore(store);
  openProfiles();
  assert.equal(readWelcomed(), false);
  assert.deepEqual(startScreen({ today: TODAY, setup: needsSetup(readChildren()), welcomed: readWelcomed() }), { screen: 'children' });
  saveWelcomed();
  assert.equal(readWelcomed(), true);
  assert.deepEqual(startScreen({ today: TODAY, lastVisit: TODAY, welcomed: readWelcomed(), children: 1 }), { screen: 'shelf' });
  assert.deepEqual(readStars(), ['A'], 'nothing lost');
  assert.ok(SHARED_KEYS.includes(WELCOMED_KEY), 'the welcome is for the device, not a child');
});

test('old progress saved before any name was set: the first run names that child and keeps the progress', () => {
  const store = memoryStore({ 'td.stars': '["A","B"]' });
  useStore(store);
  openProfiles();
  assert.ok(needsSetup(readChildren()));
  updateChildProfile('c1', { name: 'Sara' });
  assert.deepEqual(readStars(), ['A', 'B']);
});

// ---- the front door ----

test('with 2 or more children the tiles show at every fresh open; with 1 the daily door rule stays', () => {
  const later = { today: TODAY, lastVisit: TODAY, welcomed: true };
  assert.deepEqual(startScreen({ ...later, children: 1 }), { screen: 'shelf' });
  assert.deepEqual(startScreen({ ...later, children: 1, lastVisit: '2026-11-17' }), { screen: 'door' });
  for (let n = 2; n <= MAX_CHILDREN; n++) assert.deepEqual(startScreen({ ...later, children: n }), { screen: 'door' });
  assert.deepEqual(startScreen({ ...later, children: 3, char: 'A' }), { screen: 'write', char: 'A', book: 'abc' }, '?char= still goes straight to writing');
});

test('door -> a tile -> shelf; the switch-child button goes back to the tiles', () => {
  const shelf = navigate({ screen: 'door' }, { type: 'openDoor' });
  assert.deepEqual(shelf, { screen: 'shelf' });
  assert.deepEqual(navigate(shelf, { type: 'switchChild' }), { screen: 'door' });
  assert.deepEqual(navigate({ screen: 'board', book: 'abc' }, { type: 'switchChild' }), { screen: 'board', book: 'abc' }, 'only from the shelf');
  assert.deepEqual(navigate({ screen: 'door' }, { type: 'openParents' }), { screen: 'children' });
  assert.deepEqual(navigate(shelf, { type: 'openParents' }), shelf, 'the gear is only on the door');
  assert.deepEqual(navigate({ screen: 'children' }, { type: 'closeParents', ready: true }), { screen: 'door' });
  assert.equal(tuneFor('children'), null, 'no music on the parent page');
});

test('six tiles fit at 1280 x 626 and 1280 x 800, each at least 160 px', () => {
  for (const [w, h] of [[1280, 626], [1280, 800], [800, 1106]]) {
    for (let n = 1; n <= MAX_CHILDREN; n++) {
      const g = childTileGrid(n, w, h);
      assert.ok(g.size >= TILES.min, `${n} tiles at ${w} x ${h}: ${g.size} px`);
      assert.ok(g.size <= TILES.max);
      assert.ok(g.cols * g.rows >= n);
      const width = g.cols * g.size + (g.cols - 1) * g.gap;
      const height = g.rows * g.size + (g.rows - 1) * g.gap;
      assert.ok(width <= w - TILES.left - TILES.right, `${n} tiles fit across at ${w} x ${h}`);
      assert.ok(height <= h - TILES.top - TILES.bottom, `${n} tiles fit down at ${w} x ${h}`);
    }
  }
  assert.deepEqual(childTileGrid(6, 1280, 626), { size: 220, cols: 3, rows: 2, gap: 24 });
  assert.equal(childTileGrid(2, 1280, 626).rows, 1);
});

test('a long name still fits on its tile', () => {
  const size = childTileGrid(6, 1280, 626).size;
  const font = tileFontSize('Muhammadali', size);
  assert.ok(font * 0.58 * 11 <= size * 0.86);
  assert.ok(font >= 14, 'still readable for a grown-up');
  assert.equal(tileFontSize('Sara', size), Math.floor(size * 0.17));
});

test('every animal has a picture, and the gear is drawn', () => {
  for (const a of ANIMALS) assert.match(ANIMAL_ART[a], /^<svg [^>]*viewBox="0 0 100 100"/);
  assert.match(GEAR, /<svg/);
  for (const art of [...Object.values(ANIMAL_ART), GEAR]) assert.ok(!/<text/.test(art), 'no text in the pictures');
});

// ---- the gear's lock ----

test('the gear opens the children page only after a 3-second hold', () => {
  assert.equal(LOCK_MS, 3000);
  let opened = 0;
  let wiggles = 0;
  const rings = [];
  const hold = createHold({ ms: LOCK_MS, onProgress: (f) => rings.push(f), onDone: () => opened++, onShort: () => wiggles++ });
  // A tap, and a hold of 2.9 seconds: nothing opens, the gear wiggles.
  hold.press(0); hold.release(100);
  hold.press(1000); hold.tick(2500); hold.tick(3900); hold.release(3900);
  assert.equal(opened, 0);
  assert.equal(wiggles, 2);
  // The ring fills on the way.
  assert.ok(rings.some((f) => f > 0.45 && f < 0.55));
  // A full 3 seconds opens it, once.
  hold.press(10000); hold.tick(11500); hold.tick(13000); hold.tick(13100); hold.release(13200);
  assert.equal(opened, 1);
  assert.equal(wiggles, 2);
  // Interrupted (the page left): nothing.
  hold.press(20000); hold.tick(22000); hold.cancel(); hold.tick(24000);
  assert.equal(opened, 1);
});

// ---- the children page ----

test('the children page: add, rename and the name line, with made-up names', () => {
  const store = memoryStore();
  useStore(store);
  openProfiles();
  updateChildProfile('c1', { name: 'Sara' });
  assert.ok(addChildProfile({ name: 'Omar', animal: 'owl' }).ok);
  const kids = readChildren();
  assert.equal(childNameNote(checkName(kids, 'zoya'), 'Zoya'), 'The name book will write: Zoya');
  assert.equal(childNameNote(checkName(kids, 'OMAR'), 'Omar'), 'Another child already has this name.');
  assert.equal(childNameNote(checkName(kids, 'Zo-ya')), 'The name book can only write the letters a to z. It cannot use: hyphen.');
  assert.equal(childNameNote(checkName(kids, '')), '');
  // Switching between them keeps their stars apart.
  chooseChild('c2');
  saveStar('O');
  chooseChild('c1');
  assert.deepEqual(readStars(), []);
  chooseChild('c2');
  assert.deepEqual(readStars(), ['O']);
});
