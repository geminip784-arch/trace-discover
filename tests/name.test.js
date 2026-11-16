// Run: node --test tests/name.test.js
// Slice 9C part 1: "Write my name". Her name as she writes it, the layout of the
// whole name on the four lines, the 45 px leeway floor, the letter-by-letter
// rounds, the name book, and resetting the name. Every name here is made up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  NAME_ID, nameOf, charName, NAME_FIT, nameWidth, nameFits, nameLayout, placeLetters, nameLogEntry,
} from '../src/name.js';
import { DEFAULTS, MIN_LEEWAY_PX, withMinLeeway, scoreStroke, scoreDot, createLiveTracker } from '../src/geometry.js';
import { computeLayout, letterToPx, TAIL_LINE } from '../src/render.js';
import { startNameRound, finishNameLetter } from '../src/progress.js';
import { navigate, startScreen, bookOf, tuneFor, BOOKS, NAME_BOOK, charFile } from '../src/session.js';
import { nameNote, NAME_NOTES } from '../src/notes.js';
import { bookCover } from '../src/art.js';
import {
  resetName, readStars, saveStar, readRounds, saveRounds, readHelper, saveHelper, readReviews, saveReviews,
  readPracticeMore, savePracticeMore,
} from '../src/storage.js';

const charOf = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const charsOf = (word) => nameOf(word).letters.map(charOf);
const widthOf = (word) => nameWidth(charsOf(word));

// The two screens she uses: Chrome (bars showing) and the installed app (full screen).
const SCREENS = [[1280, 626], [1280, 800]];

// Made-up names of 3 to 8 letters, and for each length the widest name possible:
// a capital as wide as any (O) and lowercase m's (the widest lowercase letter).
const NAMES = ['Ali', 'Sara', 'Zoya', 'Amina', 'Ayesha', 'Natalia', 'Muhammad', 'Isabella'];
const WIDEST = [3, 4, 5, 6, 7, 8].map((n) => `O${'m'.repeat(n - 1)}`);

// ---------------------------------------------------------------------------
// Her name as she writes it

test('the name is written with a capital first letter and the rest lowercase', () => {
  for (const raw of ['sara', 'SARA', 'Sara', 'sArA', '  sara  ']) {
    const n = nameOf(raw);
    assert.equal(n.ok, true, raw);
    assert.equal(n.word, 'Sara', raw);
    assert.deepEqual(n.letters, ['S', 'a', 'r', 'a']);
    assert.equal(n.reason, null);
  }
  assert.equal(nameOf('z').word, 'Z');
});

test('no name set: reason none', () => {
  for (const raw of ['', '   ', null, undefined, 42]) {
    const n = nameOf(raw);
    assert.equal(n.ok, false);
    assert.equal(n.reason, 'none');
    assert.equal(n.word, '');
    assert.deepEqual(n.letters, []);
  }
});

test('a to z only: other characters are listed once each, in order, for the setup page', () => {
  assert.deepEqual(nameOf('Sara Ali').bad, [' ']);
  assert.deepEqual(nameOf('Zoë').bad, ['ë']);
  assert.deepEqual(nameOf("O'Neill").bad, ["'"]);
  assert.deepEqual(nameOf('Sara-Jane Ali').bad, ['-', ' ']);
  assert.deepEqual(nameOf('Sara2').bad, ['2']);
  assert.deepEqual(nameOf('سارا').bad, ['س', 'ا', 'ر']);
  for (const raw of ['Sara Ali', 'Zoë', 'Sara2']) {
    const n = nameOf(raw);
    assert.equal(n.ok, false);
    assert.equal(n.reason, 'unsupported');
    assert.equal(n.word, '');
    assert.deepEqual(n.letters, []);
  }
  assert.equal(charName(' '), 'space');
  assert.equal(charName('-'), 'hyphen');
  assert.equal(charName('é'), 'é');
});

// ---------------------------------------------------------------------------
// The layout: the whole name on the four lines

// The name's box in screen px, and its lines.
function placedOn([w, h], word) {
  const width = widthOf(word);
  const layout = nameLayout(w, h, width);
  const px = letterToPx(layout, layout.offset);
  return { width, layout, left: px([0, 0])[0], right: px([width, 0])[0] };
}

test('every name of 3 to 8 letters fits in her writing room on both screens, never under a button', () => {
  for (const word of [...NAMES, ...WIDEST]) {
    assert.equal(nameFits(widthOf(word)), true, word);
    for (const screen of SCREENS) {
      const [w, h] = screen;
      const { layout, left, right } = placedOn(screen, word);
      const label = `${word} at ${w} x ${h}`;
      assert.ok(left >= NAME_FIT.left - 1e-6, `${label}: starts right of the buttons (${left.toFixed(1)})`);
      assert.ok(right <= w - NAME_FIT.right + 1e-6, `${label}: ends inside the screen (${right.toFixed(1)})`);
      // Centred in the room.
      assert.ok(Math.abs((left - NAME_FIT.left) - (w - NAME_FIT.right - right)) < 1e-6, label);
      // The four lines stay on the screen, with room above them for round 3's model card.
      assert.ok(layout.top >= 0 && layout.top + TAIL_LINE * layout.unit <= h, label);
      assert.ok(NAME_FIT.stack * layout.unit <= h - NAME_FIT.top + 1e-6, label);
      // Room for her copy to come out a little bigger than the model.
      assert.ok(NAME_FIT.room * (right - left) <= w - NAME_FIT.left - NAME_FIT.right + 1e-6, label);
      // Never under the 112 px floor on her tablet; never bigger than a single letter.
      assert.ok(layout.unit >= NAME_FIT.floor, `${label}: unit ${layout.unit.toFixed(1)}`);
      assert.ok(layout.unit <= computeLayout(w, h).unit + 1e-9, label);
    }
  }
});

test('the scale: short names stay big, long ones shrink, the widest 8-letter name is 114 px', () => {
  const unit = (screen, word) => placedOn(screen, word).layout.unit;
  // Short names: only the room for round 3's model card limits them.
  assert.equal(Math.round(unit([1280, 626], 'Sara')), 242);
  assert.equal(Math.round(unit([1280, 800], 'Sara')), 317);
  // Long names: the width of her room does, the same on both screens.
  assert.equal(Math.round(unit([1280, 626], 'Muhammad')), 148);
  assert.equal(Math.round(unit([1280, 800], 'Muhammad')), 148);
  assert.equal(Math.round(unit([1280, 626], 'Ommmmmmm')), 114);
  // A longer name only ever gets smaller lines.
  for (const screen of SCREENS) {
    for (let n = 4; n <= 8; n++) assert.ok(unit(screen, WIDEST[n - 3]) <= unit(screen, WIDEST[n - 4]));
  }
});

test('longer names: the rule is the width, not the count; a name too wide for 112 px does not fit', () => {
  assert.equal(nameFits(widthOf('Christopher')), true);   // 11 letters, 6.6 units
  assert.equal(nameFits(widthOf('Alexandria')), true);
  assert.equal(nameFits(widthOf('Ommmmmmmm')), false);    // the widest 9 letters
  assert.equal(nameFits(widthOf('Mmmmmmmmmmmm')), false);
  assert.equal(nameFits(0), false);
});

test('letters stand box after box: normal print spacing, their own strokes and plans moved into place', () => {
  const chars = charsOf('Sara');
  const placed = placeLetters(chars);
  assert.deepEqual(placed.map((c) => c.id), ['S', 'a', 'r', 'a']);
  assert.deepEqual(placed.map((c) => c.index), [0, 1, 2, 3]);
  let x = 0;
  placed.forEach((c, i) => {
    assert.ok(Math.abs(c.x - x) < 1e-9);
    assert.equal(c.width, chars[i].width);
    assert.equal(c.strokes.length, chars[i].strokes.length);
    c.strokes.forEach((s, k) => s.points.forEach((p, j) => {
      assert.ok(Math.abs(p[0] - (chars[i].strokes[k].points[j][0] + x)) < 1e-9);
      assert.equal(p[1], chars[i].strokes[k].points[j][1]);
    }));
    assert.equal(c.plans?.length ?? 0, chars[i].plans?.length ?? 0);
    (c.plans ?? []).forEach((plan, p) => assert.ok(Math.abs(plan.strokes[0].points[0][0] - (chars[i].plans[p].strokes[0].points[0][0] + x)) < 1e-9));
    x += c.width;
  });
  assert.ok(Math.abs(nameWidth(chars) - x) < 1e-9);
  // Normal print spacing: each letter's box keeps its margin, so neighbours' ink is 0.16 apart.
  const ink = (c) => c.strokes.flatMap((s) => s.points.map((p) => p[0]));
  for (let i = 1; i < placed.length; i++) {
    const gap = Math.min(...ink(placed[i])) - Math.max(...ink(placed[i - 1]));
    assert.ok(Math.abs(gap - 0.16) < 0.01, `gap ${gap}`);
  }
  // The character files themselves are untouched.
  assert.equal(chars[1].strokes[0].points[0][0], charOf('a').strokes[0].points[0][0]);
});

// ---------------------------------------------------------------------------
// Leeway: never narrower on screen than 45 px

test('withMinLeeway: every tolerance at least 45 px on screen for every name, on both screens', () => {
  assert.equal(MIN_LEEWAY_PX, 45);
  for (const word of [...NAMES, ...WIDEST]) {
    for (const [w, h] of SCREENS) {
      const { unit } = nameLayout(w, h, widthOf(word));
      const cfg = withMinLeeway(DEFAULTS, unit);
      for (const stage of [1, 2, 3]) {
        for (const key of ['startRadius', 'tolerance', 'dotRadius']) {
          assert.ok(cfg.stages[stage][key] * unit >= 45 - 1e-9, `${word} ${w}x${h} stage ${stage} ${key}`);
          assert.ok(cfg.stages[stage][key] >= DEFAULTS.stages[stage][key], 'never narrower than the defaults');
        }
      }
      assert.equal(cfg.samples, DEFAULTS.samples);
      assert.equal(cfg.minLength, DEFAULTS.minLength);
      assert.equal(cfg.backtrack, DEFAULTS.backtrack);
    }
  }
});

test('withMinLeeway never changes DEFAULTS, and leaves wide-enough tolerances as they are', () => {
  const before = JSON.stringify(DEFAULTS);
  const big = withMinLeeway(DEFAULTS, 1000); // 45 px is 0.045 units: every default is wider
  assert.deepEqual(big.stages, DEFAULTS.stages);
  withMinLeeway(DEFAULTS, 100);
  assert.equal(JSON.stringify(DEFAULTS), before);
  assert.deepEqual(DEFAULTS.stages[1], { startRadius: 0.18, tolerance: 0.20, dotRadius: 0.16 });
});

test('a long name is not stricter than a single letter: a stroke 40 px off the track still counts', () => {
  const { unit } = nameLayout(1280, 626, widthOf('Ommmmmmm')); // 114 px, the smallest
  const off = 40 / unit; // 40 px to the side, in line units
  const ref = [[0.5, 0], [0.5, 1]];
  const child = [[0.5 + off, 0], [0.5 + off, 1]];
  const cfg = withMinLeeway(DEFAULTS, unit);
  for (const stage of [1, 2, 3]) {
    assert.equal(scoreStroke(child, ref, stage, DEFAULTS).ok, false, 'the bare defaults would fail it at this size');
    assert.equal(scoreStroke(child, ref, stage, cfg).ok, true, `stage ${stage}`);
    // Her live trail stays bright too, and a start 40 px from the dot is fine.
    assert.equal(createLiveTracker(ref, stage, cfg).update([0.5 + off, 0.5]).onPath, true);
    assert.equal(scoreStroke([[0.5, off], [0.5, 1]], ref, stage, cfg).startOk, true);
    assert.equal(scoreDot([[0.5 + off, 0.2]], [0.5, 0.2], stage, cfg).ok, true);
  }
  // At a single letter's size (344 px at 1280 x 626) the same 40 px counts with the defaults too.
  const letterUnit = computeLayout(1280, 626).unit;
  const o = 40 / letterUnit;
  assert.equal(scoreStroke([[0.5 + o, 0], [0.5 + o, 1]], ref, 1, DEFAULTS).ok, true);
  // Far off still does not count: the floor is leeway, not anything goes.
  const far = 80 / unit;
  assert.equal(scoreStroke([[0.5 + far, 0], [0.5 + far, 1]], ref, 2, cfg).ok, false);
});

test('the name game scores with the floored tolerances, and game.js keeps the defaults', () => {
  const src = readFileSync(new URL('../src/name-game.js', import.meta.url), 'utf8');
  assert.match(src, /withMinLeeway\(DEFAULTS, layout\.unit\)/);
  assert.match(src, /createLiveTracker\(v\.points, progress\.stage, cfg\)/);
  assert.match(src, /scoreMark\(child, ref, st, cfg\)/);
  assert.doesNotMatch(readFileSync(new URL('../src/game.js', import.meta.url), 'utf8'), /withMinLeeway/);
});

// ---------------------------------------------------------------------------
// Rounds 1 and 2: letter by letter

test('a name round goes letter by letter and ends after the last', () => {
  let np = startNameRound(3);
  assert.deepEqual(np, { letter: 0, done: [false, false, false], retraced: [false, false, false] });
  for (let i = 0; i < 3; i++) {
    const f = finishNameLetter(np, { assisted: false });
    assert.equal(f.again, false);
    assert.equal(f.roundDone, i === 2);
    np = f.state;
    assert.equal(np.letter, i + 1);
  }
  assert.deepEqual(np.done, [true, true, true]);
});

test('after Jugnu draws a stroke, only that letter is traced again, once; then it counts', () => {
  let np = finishNameLetter(startNameRound(4), { assisted: false }).state; // the first letter is done
  let f = finishNameLetter(np, { assisted: true });
  assert.equal(f.again, true);
  assert.equal(f.state.letter, 1, 'the same letter again');
  assert.deepEqual(f.state.done, [true, false, false, false], 'the letters before it stay done');
  assert.deepEqual(f.state.retraced, [false, true, false, false]);
  // Helped again: it counts, with help, and the next letter starts. Never stuck.
  f = finishNameLetter(f.state, { assisted: true });
  assert.equal(f.again, false);
  assert.equal(f.state.letter, 2);
  // Another letter gets its own one retrace.
  f = finishNameLetter(f.state, { assisted: true });
  assert.equal(f.again, true);
  assert.equal(f.state.letter, 2);
});

test('the name log entry: type name, with each letter\'s result', () => {
  const e = nameLogEntry({
    round: 1,
    stage: 1,
    letters: [{ letter: 'S', ok: true }, { letter: 'a', ok: false, helped: true, misses: 5, wrongStarts: 1 }],
    now: new Date('2026-11-16T10:00:00Z'),
  });
  assert.deepEqual(e, {
    type: 'name',
    time: '2026-11-16T10:00:00.000Z',
    round: 1,
    stage: 1,
    ok: false,
    letters: [
      { letter: 'S', ok: true, helped: false, misses: 0, wrongStarts: 0, reversed: 0 },
      { letter: 'a', ok: false, helped: true, misses: 5, wrongStarts: 1, reversed: 0 },
    ],
  });
});

// ---------------------------------------------------------------------------
// The name book

test('the name book stands first on the shelf and opens to her name', () => {
  assert.equal(BOOKS[0].id, NAME_BOOK);
  assert.equal(NAME_BOOK, NAME_ID);
  const shelf = { screen: 'shelf' };
  const book = navigate(shelf, { type: 'openBook', book: NAME_BOOK });
  assert.deepEqual(book, { screen: 'name' });
  // No name to write: the tile does nothing.
  assert.equal(navigate(book, { type: 'openName', ready: false }), book);
  assert.equal(navigate(book, { type: 'openName' }), book);
  const write = navigate(book, { type: 'openName', ready: true });
  assert.deepEqual(write, { screen: 'write', char: 'name', book: 'name' });
  // Only from the name book.
  assert.equal(navigate(shelf, { type: 'openName', ready: true }), shelf);
  // Done: back to the name book; back and home: the shelf.
  assert.deepEqual(navigate(write, { type: 'letterDone' }), { screen: 'name' });
  assert.deepEqual(navigate(book, { type: 'back' }), shelf);
  assert.deepEqual(navigate(write, { type: 'home' }), shelf);
  assert.equal(bookOf('name'), 'name');
  assert.deepEqual(startScreen({ today: '2026-11-16', lastVisit: '2026-11-16', char: 'name' }), { screen: 'write', char: 'name', book: 'name' });
  assert.equal(tuneFor('name'), 'board');
});

test('the cover carries her name; with none, the four little lines', () => {
  const book = BOOKS[0];
  assert.match(bookCover(book, { word: 'Sara' }), />Sara</);
  const none = bookCover(book);
  assert.doesNotMatch(none, /<text/);
  assert.match(none, /stroke-dasharray/);
  // Anything odd is escaped, never markup.
  assert.doesNotMatch(bookCover(book, { word: '<b>' }), /<b>/);
});

test('one grey parent line for each reason the tile cannot open', () => {
  assert.match(nameNote('none'), /setup page/);
  assert.match(nameNote('unsupported'), /a to z/);
  assert.match(nameNote('too-long'), /too long/);
  assert.equal(nameNote(null), null);
  for (const line of Object.values(NAME_NOTES)) assert.ok(line.length < 70, line);
});

// ---------------------------------------------------------------------------
// A changed name starts again

function memoryStore() {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
}

test('resetName clears the name\'s star, rounds, helper, review and practice-more entry, and nothing else', () => {
  const store = memoryStore();
  saveStar('A', store);
  saveStar(NAME_ID, store);
  saveRounds(NAME_ID, { round: 1, helped: true }, store);
  saveRounds('B', { round: 1, helped: false }, store);
  saveHelper(NAME_ID, { level: 2, passes: 1, fails: 0 }, store);
  saveHelper('B', { level: 3, passes: 0, fails: 0 }, store);
  saveReviews({
    enrolled: true,
    letters: { [NAME_ID]: { step: 1, due: '2026-11-18' }, A: { step: 0, due: '2026-11-17' } },
    graduated: ['C'],
    today: { day: '2026-11-16', ids: [NAME_ID, 'A'] },
  }, store);
  savePracticeMore([{ id: NAME_ID, reasons: ['help'], day: '2026-11-16' }, { id: 'A', reasons: ['copies'], day: '2026-11-16' }], store);

  assert.equal(resetName(NAME_ID, store), true);
  assert.deepEqual(readStars(store), ['A']);
  assert.equal(readRounds(NAME_ID, store), null);
  assert.deepEqual(readRounds('B', store), { round: 1, helped: false });
  assert.equal(readHelper(NAME_ID, store), null);
  assert.deepEqual(readHelper('B', store), { level: 3, passes: 0, fails: 0 });
  const r = readReviews(store);
  assert.deepEqual(Object.keys(r.letters), ['A']);
  assert.deepEqual(r.graduated, ['C']);
  assert.deepEqual(r.today.ids, ['A']);
  assert.deepEqual(readPracticeMore(store).map((e) => e.id), ['A']);
});

test('resetName on an empty or blocked store never throws', () => {
  assert.equal(resetName(NAME_ID, memoryStore()), true);
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.doesNotThrow(() => resetName(NAME_ID, blocked));
});

// ---------------------------------------------------------------------------
// Privacy: her name is never in the project

test('no real name is written anywhere in the code, tests or docs: only made-up names', () => {
  // The profile name lives only in td.profile on the tablet. A sanity check that
  // the setup page and the name modules read it from there, never from a constant.
  for (const file of ['../src/name.js', '../src/name-game.js', '../src/setup.js']) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /name\s*[:=]\s*'[A-Z][a-z]+'/, file);
  }
  assert.ok(readdirSync(new URL('../src/', import.meta.url)).includes('name.js'));
});
