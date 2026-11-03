// Run: node --test tests/finds.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBJECTS, ROOMS, THINGS } from '../data/finds.js';
import {
  FINDS, OTHERS, letterScene, hasLetterScene, roomFor, roomCounts, objectsFor,
  numberScene, hasNumberScene, groupWord, makeGroup, CELL, startCount, tapCount,
  sceneFit, groupScale, countScale, addFind, cleanFinds, lastGroupKind, findLogEntry,
} from '../src/finds.js';

// A repeatable random source (mulberry32).
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const LETTERS = ['E', 'F', 'H', 'I', 'L', 'T'];  // the recorded letters
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
// Her tablet: Chrome with its bar, the installed app (full screen), half a split screen.
const SCREENS = [[1280, 626], [1280, 800], [640, 626]];

// ---- the library ----

test('19 objects, one plain word each, starting with its letter, in at least one room', () => {
  assert.equal(OBJECTS.length, 19);
  const ids = new Set(OBJECTS.map((o) => o.id));
  const words = new Set(OBJECTS.map((o) => o.word));
  assert.equal(ids.size, 19);
  assert.equal(words.size, 19);
  for (const o of OBJECTS) {
    assert.match(o.word, /^[a-z]+( [a-z]+)?$/, o.word);
    assert.equal(o.letter, o.word[0].toUpperCase());
    assert.ok(o.rooms.length >= 1 && o.rooms.every((r) => ROOMS[r]), o.id);
    assert.ok(o.art.startsWith('<svg') && o.art.endsWith('</svg>'), o.id);
  }
});

test('the fuller room list: kitchen, study room, living room and bedroom', () => {
  const inRoom = (r) => OBJECTS.filter((o) => o.rooms.includes(r)).map((o) => o.word).sort();
  assert.deepEqual(inRoom('kitchen'), ['egg', 'fan', 'fork', 'honey', 'ice cream', 'lemon', 'lunchbox', 'tomato']);
  assert.deepEqual(inRoom('study'), ['eraser', 'flag', 'heart', 'ink', 'lamp', 'lunchbox', 'tiger']);
  assert.deepEqual(inRoom('living'), ['fan', 'hat', 'heart', 'insect', 'lamp', 'toys']);
  assert.deepEqual(inRoom('bedroom'), ['elephant', 'frock', 'hat', 'insect', 'lamp', 'tiger', 'toys']);
});

test('every room has 7 object spots, 3 placemat spots and a pool of at least 4 things', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    assert.equal(room.spots.length, 7, id);
    assert.equal(room.groups.length, 3, id);
    assert.ok(room.pool.length >= 4 && room.pool.every((k) => THINGS[k]), id);
    assert.ok(room.backdrop.startsWith('<svg'), id);
  }
});

test('nothing reaches out to the network: no http in any art', () => {
  const all = JSON.stringify({ OBJECTS, ROOMS, THINGS });
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(all));
});

// ---- where things stand on her screen ----

test('every spot is on screen, clear of the button column, and every object at least 88 px wide', () => {
  for (const [w, h] of SCREENS.slice(0, 2)) {
    const { s, left, top } = sceneFit(w, h);
    for (const [id, room] of Object.entries(ROOMS)) {
      for (const sp of room.spots) {
        const x0 = left + (sp.x - sp.w / 2) * s;
        const x1 = left + (sp.x + sp.w / 2) * s;
        const y0 = top + (sp.bottom - 1.2 * sp.w) * s;
        const y1 = top + sp.bottom * s;
        assert.ok(x0 >= 136 && x1 <= w && y0 >= 0 && y1 <= h, `${id} ${sp.x} at ${w}x${h}`);
        assert.ok(sp.w * s >= 88, `${id} ${sp.x}: ${sp.w * s} px`);
      }
      for (const g of room.groups) {
        assert.ok(left + (g.x - g.maxW / 2) * s >= 136 && left + (g.x + g.maxW / 2) * s <= w, `${id} group ${g.x}`);
      }
    }
  }
});

test('the spots of a room never overlap much (at most 60 square units)', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    const box = (sp) => [sp.x - sp.w / 2, sp.bottom - 1.2 * sp.w, sp.x + sp.w / 2, sp.bottom];
    for (let i = 0; i < 7; i++) {
      for (let j = i + 1; j < 7; j++) {
        const [a, b] = [box(room.spots[i]), box(room.spots[j])];
        const ow = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
        const oh = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
        assert.ok(ow * oh <= 60 * 60, `${id} spots ${i} and ${j}`);
      }
    }
  }
});

// ---- letters: find 3 ----

test('every recorded letter has a scene; letters without 3 objects have none', () => {
  for (const L of LETTERS) assert.ok(hasLetterScene(L), L);
  assert.equal(hasLetterScene('A'), false);
  assert.equal(letterScene('A'), null);
});

test('the room is one that holds the most of her letter', () => {
  for (const L of LETTERS) {
    const counts = roomCounts(L);
    const most = Math.max(...Object.values(counts));
    for (const seed of SEEDS.slice(0, 40)) assert.equal(counts[roomFor(L, seeded(seed))], most, L);
  }
  // From the fuller list: F in the kitchen, H in the living room, T in the bedroom.
  assert.equal(roomFor('F', seeded(1)), 'kitchen');
  assert.equal(roomFor('H', seeded(1)), 'living');
  assert.equal(roomFor('T', seeded(1)), 'bedroom');
});

test('every letter scene: exactly 3 right objects, 4 others that never start with her letter, no duplicates', () => {
  for (const L of LETTERS) {
    for (const seed of SEEDS) {
      const scene = letterScene(L, seeded(seed));
      assert.equal(scene.items.length, FINDS + OTHERS);
      const right = scene.items.filter((o) => o.right);
      const others = scene.items.filter((o) => !o.right);
      assert.equal(right.length, 3);
      assert.ok(right.every((o) => o.letter === L && o.word[0].toUpperCase() === L));
      assert.equal(others.length, 4);
      assert.ok(others.every((o) => o.letter !== L && o.word[0].toUpperCase() !== L), `${L} seed ${seed}`);
      assert.equal(new Set(scene.items.map((o) => o.id)).size, 7, 'no object twice');
      assert.equal(new Set(scene.items.map((o) => o.spot)).size, 7, 'no spot twice');
      assert.ok(scene.items.every((o) => ROOMS[scene.room].spots.includes(o.spot)));
    }
  }
});

test('letter scenes prefer the room\'s own objects', () => {
  for (const L of LETTERS) {
    for (const seed of SEEDS.slice(0, 60)) {
      const scene = letterScene(L, seeded(seed));
      const ownRight = objectsFor(L).filter((o) => o.rooms.includes(scene.room)).length;
      const right = scene.items.filter((o) => o.right);
      assert.equal(right.filter((o) => o.rooms.includes(scene.room)).length, Math.min(3, ownRight));
      const ownOthers = OBJECTS.filter((o) => o.letter !== L && o.rooms.includes(scene.room)).length;
      const others = scene.items.filter((o) => !o.right);
      assert.equal(others.filter((o) => o.rooms.includes(scene.room)).length, Math.min(4, ownOthers));
    }
  }
});

// ---- numbers: pick the group, then count ----

test('numbers 1 to 9 have a scene; 0 and letters do not', () => {
  for (const n of NUMBERS) assert.ok(hasNumberScene(String(n)));
  assert.equal(hasNumberScene('0'), false);
  assert.equal(hasNumberScene('E'), false);
  assert.equal(numberScene(0), null);
});

test('every number scene: exactly one group of n, three different counts from 1 to 9, three different kinds', () => {
  for (const n of NUMBERS) {
    for (const seed of SEEDS) {
      const scene = numberScene(n, { rand: seeded(seed) });
      const counts = scene.groups.map((g) => g.count);
      assert.equal(scene.groups.length, 3);
      assert.equal(counts.filter((c) => c === n).length, 1);
      assert.equal(new Set(counts).size, 3);
      assert.ok(counts.every((c) => Number.isInteger(c) && c >= 1 && c <= 9));
      assert.equal(scene.groups[scene.right].count, n);
      assert.equal(new Set(scene.groups.map((g) => g.kind)).size, 3);
      assert.ok(scene.groups.every((g) => ROOMS[scene.room].pool.includes(g.kind)));
      assert.equal(new Set(scene.groups.map((g) => g.spot)).size, 3);
    }
  }
});

test('never the same kind of thing twice in a row', () => {
  for (const n of NUMBERS) {
    let lastKind = null;
    const rand = seeded(n * 7);
    for (let i = 0; i < 200; i++) {
      const scene = numberScene(n, { lastKind, rand });
      const kind = scene.groups[scene.right].kind;
      assert.notEqual(kind, lastKind);
      lastKind = kind;
    }
  }
});

test('one golden item in about one scene in four, only in the group she counts', () => {
  let golden = 0;
  for (const seed of SEEDS.concat(SEEDS.map((s) => s + 1000))) {
    const scene = numberScene(4, { rand: seeded(seed) });
    scene.groups.forEach((g, i) => {
      if (i !== scene.right) assert.equal(g.gold, -1);
      else if (g.gold !== -1) {
        golden += 1;
        assert.ok(g.gold >= 0 && g.gold < 4);
      }
    });
  }
  assert.ok(golden > 600 * 0.17 && golden < 600 * 0.33, `${golden} of 600`);
});

test('makeGroup: n cells, five a row, the golden one marked', () => {
  const g = makeGroup('cup', 7, 2);
  assert.equal((g.svg.match(/class="cnt/g) || []).length, 7);
  assert.equal((g.svg.match(/class="cnt gold"/g) || []).length, 1);
  assert.match(g.svg, /class="cnt gold" data-i="2"/);
  assert.equal(g.W, 5 * CELL + 20);
  assert.equal(makeGroup('cup', 3).W, 3 * CELL + 20);
});

test('the word after counting: "4 cups", "1 cup", "2 tomatoes"', () => {
  assert.equal(groupWord('cup', 4), '4 cups');
  assert.equal(groupWord('cup', 1), '1 cup');
  assert.equal(groupWord('tomato', 2), '2 tomatoes');
});

test('counting: numbers appear in the order she taps, each item once', () => {
  let state = startCount(4);
  const shown = [];
  for (const item of [2, 0, 2, 3, 9, 1]) {
    const r = tapCount(state, item);
    state = r.state;
    shown.push(r.number);
  }
  assert.deepEqual(shown, [1, 2, null, 3, null, 4]);
  assert.deepEqual(state.order, [2, 0, 3, 1]);
  assert.equal(state.done, true);
  assert.equal(tapCount(state, 0).number, null, 'no more numbers once done');
  assert.equal(startCount(4).done, false);
});

test('while she counts, every item is at least 72 px wide (and the cell at least 88 px to tap)', () => {
  for (const n of NUMBERS) {
    const { W, H } = makeGroup('cup', n);
    for (const [w, h] of SCREENS) {
      const k = countScale(W, H, w, h);
      assert.ok(60 * k >= 72, `${n} things at ${w}x${h}: ${60 * k} px`);
      assert.ok(CELL * k >= 88, `${n} things at ${w}x${h}: cell ${CELL * k} px`);
      assert.ok(W * k <= w - 136 - 24 + 1e-9 && H * k <= h - 250 + 1e-9);
    }
  }
});

test('a placemat on its spot is at least 88 px wide and fits its spot', () => {
  for (const n of NUMBERS) {
    const { W } = makeGroup('cup', n);
    for (const room of Object.values(ROOMS)) {
      for (const sp of room.groups) {
        const k = groupScale(W, sp.maxW);
        assert.ok(W * k <= sp.maxW + 1e-9);
        assert.ok(W * k * sceneFit(1280, 626).s >= 88, `${n}: ${W * k}`);
      }
    }
  }
});

// ---- her collection and the log ----

test('the collection keeps the newest 500 finds and only well-formed ones', () => {
  let list = [];
  for (let i = 0; i < 505; i++) list = addFind(list, { o: 'egg', i });
  assert.equal(list.length, 500);
  assert.equal(list[0].i, 5);
  assert.deepEqual(cleanFinds([{ o: 'egg' }, { o: 'nope' }, { g: 'cup', n: 4, gold: true }, { g: 'cup', n: 12 }, null, 'x']),
    [{ o: 'egg' }, { g: 'cup', n: 4, gold: true }]);
  assert.deepEqual(cleanFinds('nope'), []);
  assert.equal(lastGroupKind([{ g: 'cup', n: 2 }, { o: 'egg' }, { g: 'star', n: 3 }, { o: 'ink' }]), 'star');
  assert.equal(lastGroupKind([{ o: 'egg' }]), null);
});

test('a find log entry: type find, the word or count, right or wrong, ms since the scene opened', () => {
  const now = new Date('2026-11-03T10:00:00Z');
  assert.deepEqual(findLogEntry({ char: 'E', scene: 'letter', step: 'find', word: 'egg', ok: true, ms: 1234.4, now }),
    { type: 'find', time: '2026-11-03T10:00:00.000Z', char: 'E', scene: 'letter', step: 'find', word: 'egg', ok: true, ms: 1234 });
  assert.deepEqual(findLogEntry({ char: '4', scene: 'number', step: 'group', count: 7, ok: false, ms: 50, now }),
    { type: 'find', time: '2026-11-03T10:00:00.000Z', char: '4', scene: 'number', step: 'group', count: 7, ok: false, ms: 50 });
});
