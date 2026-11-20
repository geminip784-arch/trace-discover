// Run: node --test tests/name-practice.test.js
// Slice 5L part 3: her name's practice page. One practice space per screen, at
// the name book's own line size; 3 screens make a page (screen 1 traced, screens
// 2 and 3 on her own); the fireflies span the screens; never stuck; a fresh page;
// one sticker for her name; per child. Every name here is made up.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  nameScreenLayout, scoreNameScreen, finishNameTrace, namePracticeLogEntry, nameCardDemo, NAME_CARD_DEMO,
  startPage, judgeSpace, nextPage, fireflies, isPageDone, PRACTICE,
} from '../src/practice.js';
import { nameOf, placeLetters, nameWidth, nameLayout, NAME_FIT, NAME_ID, TABLET_WIDTH, NAME_DEMO_MS } from '../src/name.js';
import { CONFIG } from '../src/progress.js';
import { nameCompareIds } from '../src/name-copy.js';
import { startNameRound, finishNameLetter } from '../src/progress.js';
import { nameCopyNote } from '../src/notes.js';
import { DEFAULTS, withMinLeeway, MIN_LEEWAY_PX } from '../src/geometry.js';
import { TAIL_LINE } from '../src/render.js';
import { navigate, startScreen, nameTile, charFile, NAME_BOOK } from '../src/session.js';
import { PAGE_ID, isPageSticker, isNamePageSticker, pageSticker, addPageSticker, addNameCard } from '../src/finds.js';
import {
  childStore, savePracticePage, readPages, readFinds, resetName, PAGES_KEY, FINDS_KEY, STARS_KEY,
} from '../src/storage.js';
import { namePageStickerArt, STICKER } from '../src/art.js';
import { family } from './art-colors.js';

const cache = new Map();
const load = (id) => {
  if (!cache.has(id)) cache.set(id, JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8')));
  return cache.get(id);
};
const othersOf = (id) => nameCompareIds(id).map(load);

// Made-up names of 3 to 8 letters, and the widest 8 letters a name can have.
const NAMES = ['Ali', 'Zoya', 'Sara', 'Hamza', 'Zainab', 'Ibrahim', 'Muhammad', 'Ommmmmmm'];
const SCREENS = [[1280, 626], [1280, 800]];

function nameSetup(raw) {
  const ids = nameOf(raw).letters;
  const chars = ids.map(load);
  return { ids, chars, letters: placeLetters(chars), width: nameWidth(chars) };
}

// `written` laid out on the lines from dx, at size k, as she would write it.
function writeName(written, { dx = 0.3, k = 1 } = {}) {
  let x = dx;
  return [...written].map(load).flatMap((c) => {
    const strokes = c.strokes.map((s) => s.points.map(([px, py]) => [x + px * k, 1 - (1 - py) * k]));
    x += c.width * k;
    return strokes;
  });
}

function memoryStore(init = {}) {
  const data = new Map(Object.entries(init));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}

// ---------------------------------------------------------------------------
// Entry: the pencil only on a starred name

test('the name book: its pencil tile turns practice mode on and off', () => {
  const book = { screen: NAME_BOOK };
  const on = navigate(book, { type: 'togglePractice' });
  assert.deepEqual(on, { screen: NAME_BOOK, practice: true });
  assert.deepEqual(navigate(on, { type: 'togglePractice' }), book);
  // Leaving the book ends practice mode: back and home go to the shelf.
  assert.deepEqual(navigate(on, { type: 'back' }), { screen: 'shelf' });
  assert.deepEqual(navigate(on, { type: 'home' }), { screen: 'shelf' });
});

test('the pencil badge only on a starred name; without a star the tile is faint (it wiggles)', () => {
  assert.deepEqual(nameTile({ ready: true, star: true, practice: true }), { pencil: true, open: true });
  assert.deepEqual(nameTile({ ready: true, star: false, practice: true }), { pencil: false, open: false });
  assert.deepEqual(nameTile({ ready: false, star: true, practice: true }), { pencil: false, open: false }, 'a name that cannot be written never opens');
  // Outside practice mode: no pencil, and the name opens when it can be written.
  assert.deepEqual(nameTile({ ready: true, star: true }), { pencil: false, open: true });
  assert.deepEqual(nameTile({ ready: true, star: false }), { pencil: false, open: true });
});

test('in practice mode a starred name opens its practice page, and nothing else does', () => {
  const on = { screen: NAME_BOOK, practice: true };
  const page = { screen: 'practice', char: NAME_ID, book: NAME_BOOK };
  assert.deepEqual(navigate(on, { type: 'openPractice', id: NAME_ID, stars: [NAME_ID], ready: true }), page);
  assert.deepEqual(navigate(on, { type: 'openPractice', id: NAME_ID, stars: ['A'], ready: true }), on, 'no star: no page');
  assert.deepEqual(navigate(on, { type: 'openPractice', id: NAME_ID, stars: [NAME_ID], ready: false }), on);
  assert.deepEqual(navigate({ screen: NAME_BOOK }, { type: 'openPractice', id: NAME_ID, stars: [NAME_ID], ready: true }), { screen: NAME_BOOK }, 'practice mode off');
  // In practice mode her tile never opens the rounds or a review.
  assert.deepEqual(navigate(on, { type: 'openName', ready: true }), on);
  // Back leaves the page for the name book, practice mode off; home goes to the shelf.
  assert.deepEqual(navigate(page, { type: 'back' }), { screen: NAME_BOOK });
  assert.deepEqual(navigate(page, { type: 'home' }), { screen: 'shelf' });
  // ?practice=name opens it straight away (for checks).
  assert.deepEqual(startScreen({ practice: 'name', today: '2026-11-20' }), page);
});

// ---------------------------------------------------------------------------
// The screens: one space per screen, at the name book's own line size

test('each screen fits names of 3 to 8 letters on both screen sizes', () => {
  for (const [w, h] of SCREENS) {
    for (const raw of NAMES) {
      const { width } = nameSetup(raw);
      const book = nameLayout(w, h, width);
      for (let screen = 0; screen < PRACTICE.spaces; screen++) {
        const L = nameScreenLayout(w, h, width, screen);
        const tag = `${raw} screen ${screen + 1} at ${w}x${h}`;
        assert.equal(L.unit, book.unit, `${tag}: the name book's own line size`);
        // Across: the whole name in her writing room, right of the buttons.
        const x0 = L.originX + L.offset * L.unit;
        const x1 = x0 + width * L.unit;
        assert.ok(x0 >= NAME_FIT.left - 1e-6 && x1 <= w - NAME_FIT.right + 1e-6, `${tag}: across ${x0.toFixed(0)}..${x1.toFixed(0)}`);
        // Down: the four lines on the screen, below the firefly lights.
        assert.ok(L.top >= 0 && L.top + TAIL_LINE * L.unit <= h + 1e-6, `${tag}: the lines fit`);
        if (screen === 0) assert.equal(L.card, undefined, `${tag}: no card while she traces`);
        else {
          // Screens 2 and 3: the model card above the lines, inside her room, the lines under it.
          const c = L.card;
          assert.ok(c.x >= NAME_FIT.left - 1e-6 && c.x + c.w <= w - NAME_FIT.right + 1e-6, `${tag}: the card across`);
          assert.ok(c.y >= NAME_FIT.top - 1e-6 && c.y + c.h <= L.top + 1e-6, `${tag}: the card above the lines`);
        }
        // Every tolerance keeps the 45 px floor.
        const s = withMinLeeway(DEFAULTS, L.unit).stages[1];
        for (const v of [s.startRadius, s.tolerance, s.dotRadius]) assert.ok(v * L.unit >= MIN_LEEWAY_PX - 1e-9, `${tag}: under 45 px`);
      }
    }
  }
  assert.equal(TABLET_WIDTH, SCREENS[0][0]);
});

// ---------------------------------------------------------------------------
// Screens 2 and 3: judged like the name's copy round, with its reasons

test('screens 2 and 3: her name written well passes', () => {
  for (const raw of ['Ali', 'Sara', 'Muhammad']) {
    const { letters, chars, ids } = nameSetup(raw);
    const result = scoreNameScreen(writeName(nameOf(raw).word), letters, chars, { othersOf });
    assert.equal(result.ok, true, raw);
    assert.equal(nameCopyNote(result, ids), null, `${raw}: no line when all is well`);
  }
});

test('screens 2 and 3: a name that does not count says why, letter by letter', () => {
  const sara = nameSetup('Sara');
  const missing = scoreNameScreen(writeName('Saa'), sara.letters, sara.chars, { othersOf });
  assert.equal(missing.reason, 'missing-letter');
  assert.equal(missing.letter, 2);
  assert.equal(nameCopyNote(missing, sara.ids), 'Almost! The r is missing.');
  const ali = nameSetup('Ali');
  const noDot = scoreNameScreen(writeName('Ali').filter((pts) => pts.length > 1), ali.letters, ali.chars, { othersOf });
  assert.equal(noDot.reason, 'missing-stroke');
  assert.equal(nameCopyNote(noDot, ali.ids), 'Almost! The dot of the i is missing.');
  const small = scoreNameScreen(writeName('Ali', { k: 0.4 }), ali.letters, ali.chars, { othersOf });
  assert.equal(small.ok, false);
  assert.match(nameCopyNote(small, ali.ids), /bigger|small letter|capital/);
});

test('screens 2 and 3: a name stopped part way is a hint, never a failed copy', () => {
  const { letters, chars } = nameSetup('Sara');
  const result = scoreNameScreen(writeName('Sa'), letters, chars, { othersOf });
  assert.equal(result.reason, 'unfinished');
  assert.equal(result.letter, 2, 'Jugnu writes the r next on the card');
});

// ---------------------------------------------------------------------------
// The card's demonstration: fast on screen 2 (a touch finishes it), none on screen 3

test('screen 2: Jugnu writes her name on the card noticeably faster than in the copy round, and a touch finishes it', () => {
  const demo = nameCardDemo(1);
  assert.ok(demo, 'screen 2 has a demonstration');
  assert.equal(demo.skippable, true, 'her touch finishes the card at once, never pausing Jugnu');
  // Noticeably faster: each stroke, and the hop between strokes, well under the copy round's.
  assert.ok(demo.ms <= NAME_DEMO_MS * 0.6, `${demo.ms} ms a stroke against ${NAME_DEMO_MS}`);
  assert.ok(demo.hopMs <= CONFIG.hopMs * 0.6, `${demo.hopMs} ms a hop against ${CONFIG.hopMs}`);
  // Sara (7 strokes): the whole card at least a third quicker.
  const strokes = nameSetup('Sara').letters.reduce((n, c) => n + c.strokes.length, 0);
  const total = (ms, hop) => strokes * (ms + hop);
  assert.ok(total(demo.ms, demo.hopMs) <= total(NAME_DEMO_MS, CONFIG.hopMs) * 0.67);
  assert.deepEqual(NAME_CARD_DEMO, { ms: demo.ms, hopMs: demo.hopMs });
});

test('screen 3: no demonstration: her name is already on the card; screen 1 has no card', () => {
  assert.equal(nameCardDemo(2), null);
  assert.equal(nameCardDemo(0), null);
  // The card itself is on screen 3, with her name on it (the layout has it).
  const { width } = nameSetup('Sara');
  assert.ok(nameScreenLayout(1280, 626, width, 2).card);
});

test('the page plays the card rule: screen 2 skippable on touch, screen 3 straight to her writing', () => {
  const src = readFileSync(new URL('../src/name-practice-game.js', import.meta.url), 'utf8');
  assert.match(src, /const demo = nameCardDemo\(page\.space\);\s*if \(demo && /, 'the demonstration only when nameCardDemo gives one');
  assert.match(src, /if \(phase === 'held' && cardShow\) skipCard\(\);\s*\/\/[^\n]*\n\s*if \(phase === 'held'\) return hold\(\);/, 'a touch during it finishes the card before any pause');
});

// ---------------------------------------------------------------------------
// The page: three screens, three fireflies, never stuck, a fresh page

const traced = (helped = false) => [{ letter: 'S', helped: false }, { letter: 'a', helped }];

test('a page: screen 1 traced, then screens 2 and 3, the fireflies across all three', () => {
  let page = startPage();
  assert.deepEqual(fireflies(page), ['now', 'next', 'next']);
  page = finishNameTrace(page, traced()).state;
  assert.deepEqual(fireflies(page), ['done', 'now', 'next']);
  assert.equal(page.spaces[0].helped, false);
  page = judgeSpace(page, { ok: true }).state;
  assert.deepEqual(fireflies(page), ['done', 'done', 'now']);
  const last = judgeSpace(page, { ok: true });
  assert.equal(last.pageDone, true);
  assert.deepEqual(fireflies(last.state), ['done', 'done', 'done']);
});

test('never stuck on screen 1: as in the name\'s round 1, then done with help', () => {
  // Jugnu drew a stroke of the second letter: that letter is traced again, once.
  let np = startNameRound(2);
  np = finishNameLetter(np, { assisted: false }).state;
  const again = finishNameLetter(np, { assisted: true });
  assert.equal(again.again, true, 'that letter is traced again');
  const helpedAgain = finishNameLetter(again.state, { assisted: true });
  assert.equal(helpedAgain.again, false, 'only once: then she moves on');
  assert.equal(helpedAgain.roundDone, true);
  // The screen counts as done, with help, and never starts again.
  const r = finishNameTrace(startPage(), traced(true));
  assert.equal(r.state.spaces[0].done, true);
  assert.equal(r.state.spaces[0].helped, true);
  assert.equal(r.state.space, 1);
});

test('never stuck on screens 2 and 3: after 3 failed copies Jugnu writes it, done with help', () => {
  let page = finishNameTrace(startPage(), traced()).state;
  for (const screen of [1, 2]) {
    let r = judgeSpace(page, { ok: false });
    assert.equal(r.again, true);
    r = judgeSpace(r.state, { ok: false });
    assert.equal(r.again, true);
    r = judgeSpace(r.state, { ok: false });
    assert.equal(r.helpedOut, true, `screen ${screen + 1}: Jugnu writes her name`);
    assert.equal(r.spaceDone, true);
    assert.equal(r.state.spaces[screen].helped, true);
    page = r.state;
  }
  assert.equal(isPageDone(page), true);
});

test('next page: only once all three screens are done, and then screen 1 again', () => {
  const part = finishNameTrace(startPage(), traced()).state;
  assert.equal(nextPage(part), part, 'not before the page is full');
  let page = part;
  page = judgeSpace(page, { ok: true }).state;
  page = judgeSpace(page, { ok: true }).state;
  const fresh = nextPage(page);
  assert.deepEqual(fresh, startPage());
  assert.deepEqual(fireflies(fresh), ['now', 'next', 'next']);
});

test('each screen is logged as a "practice" entry', () => {
  const now = new Date('2026-11-20T10:00:00Z');
  const t = namePracticeLogEntry({ page: 1, space: 1, ok: true, done: true, letters: [{ letter: 'A', ok: true, misses: 1 }, { letter: 'l', helped: true }], now });
  assert.equal(t.type, 'practice');
  assert.equal(t.char, NAME_ID);
  assert.equal(t.kind, 'trace');
  assert.deepEqual(t.letters[0], { letter: 'A', ok: true, helped: false, misses: 1, wrongStarts: 0, reversed: 0 });
  assert.equal(t.letters[1].helped, true);
  assert.equal(t.copy, null);
  const ali = nameSetup('Ali');
  const result = scoreNameScreen(writeName('Al'), ali.letters, ali.chars, { othersOf });
  const c = namePracticeLogEntry({ page: 2, space: 3, ok: false, attempt: 2, result, now });
  assert.equal(c.kind, 'copy');
  assert.equal(c.page, 2);
  assert.equal(c.space, 3);
  assert.equal(c.attempt, 2);
  assert.equal(c.reason, result.reason);
  assert.equal(c.copy.letters.length, 3, 'each letter\'s result');
  assert.equal(c.copy.review, undefined, 'never a review');
  assert.equal(JSON.stringify(c).includes('"Ali"'), false, 'the log stores letters, never the name as a word');
});

// ---------------------------------------------------------------------------
// The sticker, the page count and the children

test('her name\'s sticker is { pg: "name" } and stores no name', () => {
  assert.equal(PAGE_ID.test(NAME_ID), true);
  assert.deepEqual(pageSticker(NAME_ID), { pg: 'name' });
  assert.equal(isNamePageSticker({ pg: 'name' }), true);
  assert.equal(isNamePageSticker({ pg: 'A' }), false);
  assert.equal(isPageSticker({ pg: 'Sara' }), false, 'never a name');
});

test('each full page adds to the name\'s count; one sticker, at the newest place', () => {
  const store = memoryStore();
  store.setItem(FINDS_KEY, JSON.stringify([{ pg: 'A' }, { o: 'apple' }]));
  assert.equal(savePracticePage(NAME_ID, store), 1);
  assert.equal(savePracticePage('A', store), 1, "A's own count, apart from the name's");
  assert.equal(savePracticePage(NAME_ID, store), 2);
  assert.equal(savePracticePage(NAME_ID, store), 3);
  assert.deepEqual(readPages(store), { name: 3, A: 1 });
  const finds = readFinds(store);
  assert.equal(finds.filter(isNamePageSticker).length, 1, 'one sticker for her name');
  assert.deepEqual(finds.at(-1), { pg: 'name' }, 'at the newest place');
  assert.equal(store.data.get(FINDS_KEY).includes('Sara'), false);
});

test('the name sticker: her name on a lined page, two places wide, the count in a gold badge, never red', () => {
  const one = namePageStickerArt('Sara', 1);
  assert.match(one, /viewBox="0 0 220 120"/, 'two places wide, like her name card');
  assert.match(one, />Sara</);
  assert.match(one, />1</);
  const many = namePageStickerArt('Muhammad', 12);
  assert.match(many, />12</);
  const sheets = (svg) => (svg.match(/<rect /g) ?? []).length;
  assert.equal(sheets(namePageStickerArt('Sara', 3)), 3);
  assert.equal(sheets(namePageStickerArt('Sara', 40)), STICKER.maxSheets);
  assert.equal(namePageStickerArt('<b>', 1).includes('<b>'), false, 'escaped');
  for (const hex of many.match(/#[0-9A-Fa-f]{6}/g)) assert.notEqual(family(hex), 'red', hex);
});

test('two children\'s name pages are kept apart', () => {
  const real = memoryStore();
  const c1 = childStore(real, 'c1');
  const c2 = childStore(real, 'c2');
  savePracticePage(NAME_ID, c1);
  savePracticePage(NAME_ID, c1);
  savePracticePage(NAME_ID, c2);
  assert.deepEqual(readPages(c1), { name: 2 });
  assert.deepEqual(readPages(c2), { name: 1 });
  assert.equal(readFinds(c1).filter(isNamePageSticker).length, 1);
  assert.equal(readFinds(c2).filter(isNamePageSticker).length, 1);
  // Renaming one child clears only that child's name pages and sticker.
  resetName(NAME_ID, c1);
  assert.deepEqual(readPages(c1), {});
  assert.equal(readFinds(c1).some(isNamePageSticker), false);
  assert.deepEqual(readPages(c2), { name: 1 });
});

test('renaming clears the name\'s page count and sticker, never a letter\'s', () => {
  const store = memoryStore();
  store.setItem(PAGES_KEY, JSON.stringify({ name: 4, A: 2 }));
  store.setItem(FINDS_KEY, JSON.stringify(addPageSticker(addNameCard(addPageSticker([{ o: 'apple' }], 'A')), NAME_ID)));
  store.setItem(STARS_KEY, JSON.stringify([NAME_ID, 'A']));
  assert.equal(resetName(NAME_ID, store), true);
  assert.deepEqual(readPages(store), { A: 2 });
  assert.deepEqual(readFinds(store), [{ o: 'apple' }, { pg: 'A' }]);
});

test('the name practice page never touches stars, reviews, helper levels or the practice-more list', () => {
  const src = ['practice.js', 'name-practice-game.js'].map((f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')).join('\n');
  for (const name of ['saveStar', 'saveReviews', 'savePracticeMore', 'saveHelper', 'readHelper', 'saveRounds', 'readRounds', 'clearRounds', 'recordPractice', 'recordReview', 'applyHelperCopy', 'saveNameCard']) {
    assert.equal(src.includes(name), false, `${name} is used`);
  }
});
