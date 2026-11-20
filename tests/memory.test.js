// Run: node --test tests/memory.test.js
// Slice 5N: Memory. Cards face down; she turns two; a pair stays up, two that
// do not match turn back. Three levels, each opened by 3 finished boards of the one before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MEMORY, MEMORY_GAMES, MEMORY_PICTURES, memoryLevel, memoryBoard, memoryKey, memoryPlay, memoryLevelOpen,
  memoryCardSize, memoryCards, hitMemory, startMemory, flipCard, hideMismatch, showMeMemory,
  gamesOf, kindOf, gameTile, boardFit, BOARD, shadowsClash, gameLogEntry, showMeLogEntry,
} from '../src/games.js';
import { looksAlike } from '../src/finds.js';
import { OBJECTS, LOOKALIKES } from '../data/finds.js';
import { MENU, KIND_MENU, MEMORY_BACK, memoryFaceArt, SHADOW_LOOKALIKES } from '../data/games.js';
import { navigate } from '../src/session.js';
import { gameNote } from '../src/notes.js';
import { MEMORY_KEY, readMemoryBoards, addMemoryBoard, childStore } from '../src/storage.js';
import { isShared } from '../src/children.js';

// A repeatable random source (mulberry32).
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function memoryStore(data = {}) {
  const m = new Map(Object.entries(data));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}
const isInlineSvg = (s) => typeof s === 'string' && /^<svg [^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/.test(s) && s.endsWith('</svg>');
const SCREENS = [[1280, 626], [1280, 800]];

// ---- the menu ----

test('Memory is the sixth kind, with one tile per level', () => {
  assert.deepEqual(gamesOf('memory'), ['memory-1', 'memory-2', 'memory-3']);
  assert.deepEqual(MEMORY_GAMES, gamesOf('memory'));
  for (const id of MEMORY_GAMES) {
    assert.equal(kindOf(id), 'memory');
    assert.ok(isInlineSvg(MENU[id]), id);
  }
  assert.deepEqual(MEMORY_GAMES.map(memoryLevel), [1, 2, 3]);
  assert.ok(isInlineSvg(KIND_MENU.memory));
  const sets = navigate({ screen: 'games' }, { type: 'openKind', kind: 'memory' });
  assert.deepEqual(sets, { screen: 'games', kind: 'memory' });
  for (const game of MEMORY_GAMES) {
    const play = navigate(sets, { type: 'openGame', game });
    assert.deepEqual(play, { screen: 'play', game });
    assert.deepEqual(navigate(play, { type: 'gameDone' }), sets);
  }
});

test('the instruction line, and no other text on the cards', () => {
  assert.equal(gameNote('memory'), 'Find two cards that are the same');
  for (const art of [MEMORY_BACK, memoryFaceArt('egg'), memoryFaceArt('alligator'), ...MEMORY_GAMES.map((id) => MENU[id])]) {
    assert.doesNotMatch(art, /<text/, 'no text in a card or a tile');
  }
  // The code only, without its comments.
  const code = readFileSync(new URL('../src/memory.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /textContent|innerText|<text/, 'memory.js writes no text');
  assert.doesNotMatch(code, /moves|tries|turns\s*\+=|counter/i, 'no move counter');
});

// ---- levels and layout ----

test('the three levels: 3 pairs in 2 x 3, 6 pairs in 3 x 4, 8 pairs in 4 x 4', () => {
  assert.deepEqual(MEMORY.layouts, {
    1: { pairs: 3, rows: 2, cols: 3 },
    2: { pairs: 6, rows: 3, cols: 4 },
    3: { pairs: 8, rows: 4, cols: 4 },
  });
  for (const level of MEMORY.levels) {
    const { pairs, rows, cols } = MEMORY.layouts[level];
    assert.equal(rows * cols, 2 * pairs, `level ${level}: every place holds a card`);
    assert.equal(memoryCards(level).length, 2 * pairs);
  }
  assert.equal(MEMORY.mismatchMs, 1200);
  assert.equal(MEMORY.peekMs, 1500);
});

test('every card is at least 120 px on her tablet, square, on the board and below the instruction line', () => {
  for (const [w, h] of SCREENS) {
    const { s } = boardFit(w, h);
    for (const level of MEMORY.levels) {
      const side = memoryCardSize(level) * s;
      assert.ok(side >= MEMORY.minCardPx && side >= 120, `level ${level} at ${w}x${h}: ${side.toFixed(1)} px`);
    }
  }
  for (const level of MEMORY.levels) {
    const cards = memoryCards(level);
    for (const c of cards) {
      assert.ok(Math.abs((c.x1 - c.x0) - (c.y1 - c.y0)) < 1e-9, 'square');
      assert.ok(c.x0 >= 12 && c.x1 <= BOARD.w - 12, `level ${level}: inside the board's edge across`);
      assert.ok(c.y0 >= MEMORY.area.y0 - 1e-9 && c.y1 <= MEMORY.area.y1 + 1e-9, `level ${level}: in the card area`);
    }
    // No two cards overlap, and a gap stays between them.
    for (const [i, a] of cards.entries()) {
      for (const b of cards.slice(i + 1)) {
        const apart = Math.max(b.x0 - a.x1, a.x0 - b.x1, b.y0 - a.y1, a.y0 - b.y1);
        assert.ok(apart >= MEMORY.gap - 1e-9, `level ${level}: cards ${a.slot} and ${b.slot}`);
      }
    }
    // Centred across.
    const left = Math.min(...cards.map((c) => c.x0));
    const right = Math.max(...cards.map((c) => c.x1));
    assert.ok(Math.abs(left - (BOARD.w - right)) < 1e-9, `level ${level}: centred`);
  }
  // Fewer pairs, bigger cards.
  assert.ok(memoryCardSize(1) > memoryCardSize(2) && memoryCardSize(2) > memoryCardSize(3));
});

test('a tap lands on the card under it, and a tap between cards on none', () => {
  for (const level of MEMORY.levels) {
    for (const c of memoryCards(level)) assert.equal(hitMemory([(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2], level), c.slot);
    const [a, b] = memoryCards(level);
    assert.equal(hitMemory([(a.x1 + b.x0) / 2, (a.y0 + a.y1) / 2], level), null, 'in the gap');
    assert.equal(hitMemory([5, 5], level), null, 'far away');
  }
});

// ---- the pictures ----

test('the pictures come from the find scenes: never ice cream or eraser', () => {
  assert.deepEqual(MEMORY_PICTURES, OBJECTS.filter((o) => o.finds !== false).map((o) => o.id));
  assert.ok(!MEMORY_PICTURES.includes('ice-cream') && !MEMORY_PICTURES.includes('eraser'));
  for (const id of MEMORY_PICTURES) assert.ok(isInlineSvg(memoryFaceArt(id)), id);
});

test('a board: two of each picture, all different, never two from one look-alike group', () => {
  for (const level of MEMORY.levels) {
    const { pairs } = MEMORY.layouts[level];
    for (let seed = 1; seed <= 300; seed++) {
      const b = memoryBoard(level, seeded(seed * 7 + level));
      assert.equal(b.pics.length, pairs);
      assert.equal(new Set(b.pics).size, pairs, 'no picture twice in the set');
      assert.deepEqual(b.cards.map((c) => c.slot), [...Array(2 * pairs).keys()]);
      for (const p of b.pics) assert.equal(b.cards.filter((c) => c.pic === p).length, 2, `${p} twice`);
      for (const [i, p] of b.pics.entries()) {
        for (const q of b.pics.slice(i + 1)) {
          assert.ok(!shadowsClash(p, q), `${p} and ${q}`);
          assert.ok(!looksAlike(p, q, LOOKALIKES), `${p} and ${q}: look-alikes`);
          assert.ok(!SHADOW_LOOKALIKES.some((g) => g.includes(p) && g.includes(q)), `${p} and ${q}: one group`);
        }
      }
    }
  }
});

test('the cards are shuffled: pairs do not always sit side by side', () => {
  const firsts = new Set();
  for (let seed = 1; seed <= 50; seed++) {
    const b = memoryBoard(3, seeded(seed));
    firsts.add(b.cards.findIndex((c, i) => i > 0 && c.pic === b.cards[0].pic));
  }
  assert.ok(firsts.size >= 8, 'the partner of the first card turns up in many places');
});

test('a play never repeats the last board\'s set of pictures', () => {
  for (const level of MEMORY.levels) {
    const rand = seeded(level * 31);
    let last = [];
    for (let i = 0; i < 40; i++) {
      const b = memoryPlay(level, last, rand);
      assert.ok(!last.includes(memoryKey(b)), `level ${level}, play ${i}`);
      last = [memoryKey(b)];
    }
    // Even a pool with only one other set gives a new one.
    const pool = MEMORY_PICTURES.slice(0, MEMORY.layouts[level].pairs);
    const key = memoryKey(memoryBoard(level, seeded(1), pool));
    assert.equal(key, [...pool].sort().join('|'));
  }
  assert.equal(memoryKey({ pics: ['egg', 'ant', 'cat'] }), memoryKey({ pics: ['cat', 'egg', 'ant'] }), 'places do not matter');
});

// ---- playing a board ----

// The slots of a board's two cards of one picture, and two that do not match.
const pairOf = (b, pic) => b.cards.filter((c) => c.pic === pic).map((c) => c.slot);
const mismatch = (b) => [pairOf(b, b.pics[0])[0], pairOf(b, b.pics[1])[0]];

test('turning two that match: they stay face up, with a pair to log', () => {
  const b = memoryBoard(1, seeded(3));
  const [a, c] = pairOf(b, b.pics[0]);
  let r = flipCard(startMemory(), b, a);
  assert.equal(r.turned, true);
  assert.equal(r.pair, null, 'one card alone is not a pair');
  assert.deepEqual(r.state, { up: [a], matched: [] });
  r = flipCard(r.state, b, c);
  assert.deepEqual(r.pair, { a, b: c, ok: true });
  assert.deepEqual(r.state, { up: [], matched: [a, c] });
  assert.equal(r.done, false);
  // A found card does nothing.
  assert.equal(flipCard(r.state, b, a).turned, false);
  assert.equal(flipCard(r.state, b, a).state, r.state);
});

test('turning two that do not match: they stay up until they turn back, and taps wait', () => {
  const b = memoryBoard(2, seeded(5));
  const [x, y] = mismatch(b);
  let r = flipCard(startMemory(), b, x);
  // The same card again is nothing.
  assert.equal(flipCard(r.state, b, x).turned, false);
  r = flipCard(r.state, b, y);
  assert.deepEqual(r.pair, { a: x, b: y, ok: false });
  assert.deepEqual(r.state.up, [x, y]);
  assert.deepEqual(r.state.matched, []);
  // A third card waits while the two show.
  const third = b.cards.find((c) => c.slot !== x && c.slot !== y).slot;
  const waiting = flipCard(r.state, b, third);
  assert.equal(waiting.turned, false);
  assert.equal(waiting.state, r.state);
  // Then they turn back, and she can go on.
  const back = hideMismatch(r.state);
  assert.deepEqual(back, { up: [], matched: [] });
  assert.equal(flipCard(back, b, third).turned, true);
  assert.equal(hideMismatch(back), back, 'nothing to turn back');
});

test('a whole board: done once every pair is found, at every level', () => {
  for (const level of MEMORY.levels) {
    const b = memoryBoard(level, seeded(level));
    let state = startMemory();
    // A miss first, then every pair.
    const [x, y] = mismatch(b);
    state = flipCard(flipCard(state, b, x).state, b, y).state;
    state = hideMismatch(state);
    let last = null;
    for (const pic of b.pics) {
      const [a, c] = pairOf(b, pic);
      state = flipCard(state, b, a).state;
      last = flipCard(state, b, c);
      state = last.state;
    }
    assert.equal(last.done, true, `level ${level}`);
    assert.equal(state.matched.length, b.cards.length);
    assert.equal(flipCard(state, b, 0).turned, false, 'nothing left to turn');
  }
  assert.equal(flipCard(startMemory(), memoryBoard(1, seeded(1)), 99).turned, false, 'no such card');
});

// ---- show me ----

test('show me: every face-down card peeks; never during a mismatch, never once done; it changes nothing', () => {
  const b = memoryBoard(1, seeded(9));
  const s0 = startMemory();
  assert.deepEqual(showMeMemory(b, s0), [0, 1, 2, 3, 4, 5]);
  const [a, c] = pairOf(b, b.pics[0]);
  const one = flipCard(s0, b, a).state;
  assert.ok(!showMeMemory(b, one).includes(a), 'the card she just turned stays up');
  assert.equal(showMeMemory(b, one).length, 5);
  const found = flipCard(one, b, c).state;
  assert.deepEqual(showMeMemory(b, found).sort(), b.cards.map((k) => k.slot).filter((s) => s !== a && s !== c).sort());
  assert.deepEqual(found, { up: [], matched: [a, c] }, 'show me never changes the state');
  const [x, y] = mismatch(b);
  assert.equal(showMeMemory(b, flipCard(flipCard(s0, b, x).state, b, y).state), null);
  assert.equal(showMeMemory(b, { up: [], matched: b.cards.map((k) => k.slot) }), null);
});

test('show me is logged as help, never as her move', () => {
  const e = showMeLogEntry({ game: 'memory-2', set: 1, ms: 900, now: new Date('2026-11-20T10:00:00Z') });
  assert.deepEqual(e, { type: 'game-help', help: 'show-me', time: '2026-11-20T10:00:00.000Z', game: 'memory-2', set: 1, ms: 900 });
  const src = readFileSync(new URL('../src/memory.js', import.meta.url), 'utf8');
  const showMe = src.slice(src.indexOf('async function showMe'), src.indexOf('const stopTracking'));
  assert.doesNotMatch(showMe, /flipCard\(|gameLogEntry\(|matched/, 'show me finds nothing for her');
});

// ---- the log ----

test('one game entry per two cards turned: the two pictures, and whether they match', () => {
  const e = gameLogEntry({ game: 'memory-3', set: 1, from: 'egg', to: 'cat', ok: false, ms: 1234.4, now: new Date('2026-11-20T10:00:00Z') });
  assert.deepEqual(e, { type: 'game', time: '2026-11-20T10:00:00.000Z', game: 'memory-3', set: 1, from: 'egg', to: 'cat', ok: false, ms: 1234 });
  const src = readFileSync(new URL('../src/memory.js', import.meta.url), 'utf8');
  assert.equal(src.split('gameLogEntry(').length - 1, 1, 'called once');
  assert.ok(src.indexOf('gameLogEntry({') > src.indexOf('if (!r.pair) return;'), 'logged only once two are turned');
});

// ---- levels opening, per child ----

test('a level opens after 3 finished boards of the one before, in order', () => {
  assert.equal(MEMORY.unlockAfter, 3);
  const lockedWith = (boards) => MEMORY_GAMES.filter((id) => gameTile(id, [], {}, boards).locked);
  assert.deepEqual(lockedWith({}), ['memory-2', 'memory-3']);
  assert.deepEqual(lockedWith({ 1: 2 }), ['memory-2', 'memory-3']);
  assert.deepEqual(lockedWith({ 1: 3 }), ['memory-3']);
  assert.deepEqual(lockedWith({ 1: 3, 2: 3 }), []);
  assert.deepEqual(lockedWith({ 2: 9 }), ['memory-2', 'memory-3'], 'level 3 needs level 2 open too');
  assert.equal(memoryLevelOpen(1, {}), true);
  // Missing piece's rounds never open a Memory level, nor the other way round.
  assert.equal(gameTile('memory-2', [], { 1: 9 }, {}).locked, true);
  assert.equal(gameTile('missing-2', [], {}, { 1: 9 }).locked, true);
  // A star per level.
  assert.equal(gameTile('memory-1', ['memory-1'], {}, {}).star, true);
  assert.equal(gameTile('memory-2', ['memory-1'], {}, { 1: 3 }).star, false);
});

test('finished boards are saved per child, never shared', () => {
  assert.equal(MEMORY_KEY, 'td.memory');
  assert.equal(isShared(MEMORY_KEY), false, 'a personal key');
  const real = memoryStore();
  const sara = childStore(real, 'c1');
  const omar = childStore(real, 'c2');
  assert.deepEqual(readMemoryBoards(sara), {});
  addMemoryBoard(1, sara);
  addMemoryBoard(1, sara);
  addMemoryBoard(1, sara);
  addMemoryBoard(2, sara);
  assert.deepEqual(readMemoryBoards(sara), { 1: 3, 2: 1 });
  assert.deepEqual(readMemoryBoards(omar), {}, 'the other child starts from nothing');
  assert.equal(real.m.has('td.memory'), false, 'nothing under the shared key');
  // Damaged storage reads as nothing, and writing to a blocked one fails quietly.
  assert.deepEqual(readMemoryBoards(memoryStore({ [MEMORY_KEY]: '{bad' })), {});
  assert.deepEqual(readMemoryBoards(memoryStore({ [MEMORY_KEY]: '[1,2]' })), {});
  assert.deepEqual(readMemoryBoards(memoryStore({ [MEMORY_KEY]: '{"1":-1,"2":2.5,"3":4}' })), { 3: 4 });
  assert.equal(addMemoryBoard(1, { getItem: () => null, setItem: () => { throw new Error('full'); } }), false);
});

// ---- on screen (read from the source: the screens need a browser) ----

test('the turn-back and the peek wait while the tablet is upright; the board is untouchable then', () => {
  const src = readFileSync(new URL('../src/memory.js', import.meta.url), 'utf8');
  assert.match(src, /await wait\(MEMORY\.mismatchMs\)/);
  assert.match(src, /await wait\(MEMORY\.peekMs\)/);
  assert.match(src, /if \(last !== null && !paused\) t \+= now - last;/, 'the wait stops counting while paused');
  assert.match(src, /if \(paused \|\| busy\) return;/, 'taps wait while paused');
  assert.match(src, /trackSinglePointer\(board\.el/, 'one finger at a time');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /\.mm-card \{[^}]*touch-action: none;/);
  assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|https?:\/\//, 'offline');
});
