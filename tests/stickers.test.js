// Run: node --test tests/stickers.test.js
// Slice 5L part 2: page stickers. Each full practice page adds one to that
// character's count (td.pages) and moves its one sticker to the newest place on
// her shelf of finds. Stars, reviews, helper levels and the rest are untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAGE_ID, isPageSticker, pageSticker, addPageSticker, cleanPages, addPage, cleanFinds, addFind, addNameCard,
  MAX_FINDS, SHELF_SHOWS,
} from '../src/finds.js';
import { PAGES_KEY, readPages, savePracticePage, FINDS_KEY, readFinds, saveFind } from '../src/storage.js';
import { pageStickerArt, STICKER } from '../src/art.js';
import { BOARDS } from '../src/session.js';
import { family } from './art-colors.js';

function memoryStore(init = {}) {
  const data = new Map(Object.entries(init));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
}

// ---------------------------------------------------------------------------
// The sticker entry and the count (pure)

test('a page sticker is { pg: id } for every letter and number, and nothing else', () => {
  for (const t of [...BOARDS.abc.tiles, ...BOARDS.num.tiles]) {
    assert.equal(isPageSticker(pageSticker(t.id)), true, t.id);
    assert.equal(PAGE_ID.test(t.id), true, t.id);
  }
  for (const bad of [{ pg: '21' }, { pg: '' }, { pg: 'AB' }, { pg: 3 }, { o: 'apple' }, null, { nm: 1 }]) {
    assert.equal(isPageSticker(bad), false, JSON.stringify(bad));
  }
});

test('one sticker per character: another page moves it to the newest place', () => {
  let list = [{ o: 'apple' }, { g: 'eggs', n: 3 }];
  list = addPageSticker(list, 'A');
  list = addFind(list, { o: 'ball' });
  list = addPageSticker(list, 'g');
  assert.deepEqual(list.map((e) => e.pg ?? e.o ?? e.g), ['apple', 'eggs', 'A', 'ball', 'g']);
  // A's second page: its sticker leaves its old place and becomes the newest. g stays.
  list = addPageSticker(list, 'A');
  assert.deepEqual(list.map((e) => e.pg ?? e.o ?? e.g), ['apple', 'eggs', 'ball', 'g', 'A']);
  assert.equal(list.filter((e) => e.pg === 'A').length, 1);
  // A and a are different characters, each with its own sticker; the name card is untouched.
  list = addNameCard(addPageSticker(list, 'a'));
  assert.deepEqual(list.filter(isPageSticker).map((e) => e.pg), ['g', 'A', 'a']);
  assert.equal(list.at(-1).nm, 1);
  // The collection never grows past its limit.
  const full = Array.from({ length: MAX_FINDS }, () => ({ o: 'apple' }));
  const out = addPageSticker(full, '7');
  assert.equal(out.length, MAX_FINDS);
  assert.deepEqual(out.at(-1), { pg: '7' });
});

test('stickers survive a load; broken ones do not', () => {
  const kept = cleanFinds([{ pg: 'A' }, { pg: 'q' }, { pg: '20' }, { pg: '21' }, { pg: 'Sara' }, { pg: 5 }]);
  assert.deepEqual(kept, [{ pg: 'A' }, { pg: 'q' }, { pg: '20' }]);
});

test('the page count: one more per full page, per character', () => {
  let pages = {};
  pages = addPage(pages, 'A');
  pages = addPage(pages, 'A');
  pages = addPage(pages, '7');
  assert.deepEqual(pages, { A: 2, 7: 1 });
  assert.deepEqual(addPage(pages, 'a'), { A: 2, 7: 1, a: 1 });
  // Damaged counts are dropped, never carried on.
  assert.deepEqual(cleanPages({ A: 3, B: 0, C: -1, D: 1.5, E: '2', 21: 4, Sara: 2 }), { A: 3 });
  assert.deepEqual(cleanPages(null), {});
  assert.deepEqual(cleanPages([1, 2]), {});
  assert.deepEqual(addPage({ A: 'x' }, 'A'), { A: 1 });
});

// ---------------------------------------------------------------------------
// Saving a full page

test('savePracticePage counts the page in td.pages and moves the sticker to the newest place', () => {
  const store = memoryStore();
  saveFind({ o: 'apple' }, store);
  assert.equal(savePracticePage('A', store), 1);
  saveFind({ o: 'ball' }, store);
  assert.equal(savePracticePage('A', store), 2);
  assert.equal(savePracticePage('g', store), 1);
  assert.equal(savePracticePage('A', store), 3);
  assert.deepEqual(readPages(store), { A: 3, g: 1 });
  assert.deepEqual(JSON.parse(store.getItem(PAGES_KEY)), { A: 3, g: 1 });
  assert.deepEqual(readFinds(store).map((e) => e.pg ?? e.o), ['apple', 'ball', 'g', 'A']);
  assert.ok(JSON.parse(store.getItem(FINDS_KEY)).length === 4);
});

test('a full page never touches stars, reviews, helper levels, rounds or the practice-more list', () => {
  const before = {
    'td.stars': JSON.stringify(['A', 'g']),
    'td.reviews': JSON.stringify({ enrolled: true, letters: { A: { step: 1, due: '2026-11-20' } }, graduated: [], today: null }),
    'td.helper': JSON.stringify({ A: { level: 2, passes: 1, fails: 0 } }),
    'td.rounds': JSON.stringify({ g: { round: 1, helped: false } }),
    'td.practiceMore': JSON.stringify([{ id: 'g', reasons: ['helped'], since: '2026-11-17' }]),
    'td.attempts': JSON.stringify([{ char: 'A' }]),
  };
  const store = memoryStore(before);
  savePracticePage('A', store);
  savePracticePage('A', store);
  for (const [k, v] of Object.entries(before)) assert.equal(store.getItem(k), v, k);
  assert.deepEqual([...store.data.keys()].sort(), [...Object.keys(before), 'td.finds', 'td.pages'].sort());
});

test('a full or blocked storage never stops the page', () => {
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
  assert.equal(savePracticePage('A', blocked), 0);
  assert.deepEqual(readPages(blocked), {});
  const damaged = memoryStore({ 'td.pages': '{not json' });
  assert.deepEqual(readPages(damaged), {});
  assert.equal(savePracticePage('B', damaged), 1);
});

// ---------------------------------------------------------------------------
// The picture

const sheetsIn = (svg) => (svg.match(/<rect /g) ?? []).length; // the front page and the sheets behind it

test('the sticker: her letter on a lined page, a sheet per page up to 5, the count in a gold badge', () => {
  for (const [n, sheets] of [[1, 1], [2, 2], [4, 4], [5, 5], [6, 5], [37, 5]]) {
    const svg = pageStickerArt('A', n);
    assert.equal(sheetsIn(svg), sheets, `${n} pages`);
    assert.match(svg, new RegExp(`>${n}</text>`), 'the count');
    assert.match(svg, />A<\/text>/, 'the letter');
    assert.match(svg, /fill="#FFC21A"/, 'the gold badge');
  }
  assert.equal(STICKER.maxSheets, 5);
  // Numbers 10 to 20 and 3-figure counts still fit.
  assert.match(pageStickerArt('20', 120), />20<\/text>/);
  assert.match(pageStickerArt('20', 120), />120<\/text>/);
  // A bad count draws one page and the badge 1.
  assert.match(pageStickerArt('B', 0), />1<\/text>/);
  // Escaped all the same.
  assert.match(pageStickerArt('<', 1), />&#60;<\/text>/);
});

test('the sticker is never red', () => {
  for (const t of [...BOARDS.abc.pages.upper, ...BOARDS.num.tiles]) {
    const svg = pageStickerArt(t.id, 3, t.color);
    for (const hex of svg.match(/#[0-9A-Fa-f]{6}\b/g)) assert.notEqual(family(hex), 'red', `${t.id}: ${hex}`);
  }
  assert.ok(SHELF_SHOWS >= 24);
});
