// Slice 10F: Dot Detective (src/detective.js, on screen src/detective-game.js),
// from the Urdu board's magnifying-glass tile. A letter's body without its dots;
// she gives it the right ones. Levels: 1 Look (pick 1 of 3 dot tiles, the whole
// letter shown), 2 Remember (the same, its find picture shown), 3 Do it herself
// (she taps the dots on, judged as the copy round).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DETECTIVE, DETECTIVE_GAMES, DETECTIVE_LETTERS, DETECTIVE_LAYOUT, detectiveLevel, lettersFor, pictureOf, detectiveLevelOpen,
  patternOf, detectiveChoices, detectivePlay, startPicking, pickTile, judgeDots, dotsStatus, sortTaps, inTapRoom, letterPlace,
  hitTile, detectiveLogEntry, detectiveChar, bodyBox,
} from '../src/detective.js';
import { URDU_FAMILIES, expectedMarks, sideOf } from '../src/urdu-dots.js';
import { boardFit } from '../src/games.js';
import { navigate, boardTileCount, hasDetective, DETECTIVE_LEVELS, boardSpace, boardGrid, BOARD_BOX } from '../src/session.js';
import { setNote, copyNote } from '../src/notes.js';
import { clipById } from '../data/voice-script.js';
import { readDetectivePlays, addDetectivePlay, DETECTIVE_KEY } from '../src/storage.js';
import { seeded } from './crude-letters.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const BOAT = ['ur-be', 'ur-pe', 'ur-te', 'ur-tte', 'ur-se'];
const middle = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
// Her taps for a letter's own dots (and a tap for its mark, or the mark drawn).
const ownTaps = (id, drawnMark = false) => detectiveChar(id).strokes.flatMap((s) => {
  if (s.kind === 'dot') return [[s.points[0]]];
  if (s.kind === 'mark') return [drawnMark ? s.points : [middle(s.points)]];
  return [];
});

// ---- the letters ----

test('the 26 letters of the families that differ only in dots or a mark; levels 2 and 3 only those with a picture word', () => {
  assert.equal(DETECTIVE_LETTERS.length, 26);
  assert.deepEqual([...DETECTIVE_LETTERS].sort(), URDU_FAMILIES.flat().sort());
  assert.deepEqual(lettersFor(1), DETECTIVE_LETTERS);
  for (const level of [2, 3]) {
    assert.equal(lettersFor(level).length, 19);
    for (const id of lettersFor(level)) assert.ok(pictureOf(id), id);
  }
  // The boat family: all five in level 1; the four with a picture word in levels 2 and 3 (ث has none yet).
  for (const id of BOAT) assert.ok(lettersFor(1).includes(id), id);
  assert.deepEqual(lettersFor(2).filter((id) => BOAT.includes(id)), ['ur-be', 'ur-pe', 'ur-te', 'ur-tte']);
});

test('each letter\'s pattern is its real dots: how many, on top or not, or its mark', () => {
  const want = {
    'ur-be': 'dots:1:under', 'ur-pe': 'dots:3:under', 'ur-te': 'dots:2:top', 'ur-tte': 'mark:small ṭ', 'ur-se': 'dots:3:top',
    'ur-jeem': 'dots:1:under', 'ur-che': 'dots:3:under', 'ur-bari-he': 'none', 'ur-khe': 'dots:1:top',
    'ur-dal': 'none', 'ur-ddal': 'mark:small ṭ', 'ur-zal': 'dots:1:top', 'ur-re': 'none', 'ur-rre': 'mark:small ṭ',
    'ur-ze': 'dots:1:top', 'ur-zhe': 'dots:3:top', 'ur-alif': 'none', 'ur-alif-madd': 'mark:madd',
  };
  for (const [id, key] of Object.entries(want)) assert.equal(patternOf(id).key, key, id);
  // Within a family, every letter's pattern is its own.
  for (const fam of URDU_FAMILIES) assert.equal(new Set(fam.map((id) => patternOf(id).key)).size, fam.length, fam.join(' '));
});

// ---- the three tiles ----

test('three dot tiles, all different, one of them the letter\'s own; family patterns first', () => {
  const rand = seeded(7);
  for (const id of DETECTIVE_LETTERS) {
    for (let k = 0; k < 20; k++) {
      const { tiles, right } = detectiveChoices(id, rand);
      assert.equal(tiles.length, 3, id);
      assert.equal(new Set(tiles.map((t) => t.key)).size, 3, id);
      assert.equal(tiles[right].key, patternOf(id).key, id);
      // A family of three or more never needs a borrowed pattern.
      const siblings = URDU_FAMILIES.find((f) => f.includes(id)).filter((s) => s !== id).map((s) => patternOf(s).key);
      const others = tiles.filter((_, i) => i !== right).map((t) => t.key);
      if (siblings.length >= 2) assert.ok(others.every((o) => siblings.includes(o)), `${id}: ${others}`);
    }
  }
});

test('every tile\'s dots sit on the side its pattern names, on this letter\'s body', () => {
  const rand = seeded(3);
  for (const id of DETECTIVE_LETTERS) {
    const body = detectiveChar(id).strokes.filter((s) => s.kind === 'line').map((s) => s.points);
    for (let k = 0; k < 10; k++) {
      for (const t of detectiveChoices(id, rand).tiles) {
        if (!t.key.startsWith('dots:')) continue;
        const side = t.key.split(':')[2];
        for (const d of t.dots) assert.equal(sideOf(d.at, body), side, `${id} ${t.key}`);
      }
    }
  }
});

test('levels 1 and 2: a wrong tile does not count; after two, the right one glows', () => {
  const round = { tiles: [{}, {}, {}], right: 2 };
  let s = startPicking();
  let r = pickTile(s, round, 0);
  assert.deepEqual([r.ok, r.hint], [false, null]);
  s = r.state;
  r = pickTile(s, round, 0);
  assert.equal(r.hint, null, 'the same wrong tile twice is one');
  r = pickTile(r.state, round, 1);
  assert.deepEqual([r.ok, r.hint], [false, 2]);
  assert.equal(pickTile(r.state, round, 2).ok, true);
  assert.equal(DETECTIVE.hintAfter, 2);
});

// ---- a play and the levels ----

test('a play is 4 different letters of the level, never starting with the last play\'s last letter', () => {
  const rand = seeded(11);
  for (const level of [1, 2, 3]) {
    let last = [];
    for (let k = 0; k < 30; k++) {
      const play = detectivePlay(level, last, rand);
      assert.equal(play.length, DETECTIVE.lettersPerPlay);
      assert.equal(new Set(play).size, play.length);
      for (const id of play) assert.ok(lettersFor(level).includes(id));
      if (last.length) assert.notEqual(play[0], last[last.length - 1]);
      last = play;
    }
  }
});

test('the levels open in order: the next after 3 finished plays of the one before', () => {
  assert.deepEqual(DETECTIVE_GAMES, ['detective-1', 'detective-2', 'detective-3']);
  assert.deepEqual(DETECTIVE_GAMES.map(detectiveLevel), [1, 2, 3]);
  assert.equal(detectiveLevelOpen(1, {}), true);
  assert.equal(detectiveLevelOpen(2, { 1: 2 }), false);
  assert.equal(detectiveLevelOpen(2, { 1: 3 }), true);
  assert.equal(detectiveLevelOpen(3, { 1: 9, 2: 2 }), false);
  assert.equal(detectiveLevelOpen(3, { 2: 3 }), true);
});

test('finished plays are saved per level (td.detective, a personal key, so per child)', () => {
  const data = new Map();
  const store = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  assert.deepEqual(readDetectivePlays(store), {});
  addDetectivePlay(1, store);
  addDetectivePlay(1, store);
  addDetectivePlay(2, store);
  assert.deepEqual(readDetectivePlays(store), { 1: 2, 2: 1 });
  assert.equal(DETECTIVE_KEY, 'td.detective');
  data.set(DETECTIVE_KEY, '{"1":-3,"2":"x","3":1}');
  assert.deepEqual(readDetectivePlays(store), { 3: 1 });
});

// ---- level 3: her own dots, judged as the copy round ----

test('level 3: the letter\'s own dots pass, as taps (a tapped ṭ on ٹ and آ\'s madd too); ڈ and ڑ need their ṭ drawn', () => {
  for (const id of DETECTIVE_LETTERS) {
    const tapForMark = !['ur-ddal', 'ur-rre'].includes(id);
    const taps = ownTaps(id, !tapForMark);
    const r = judgeDots(taps, id);
    assert.ok(r.ok, `${id}: ${r.reason}`);
    if (taps.length) assert.equal(dotsStatus(taps, id), 'judge-now', id);
  }
  // On ڈ a single tap on top is the dot of ذ.
  assert.equal(judgeDots(ownTaps('ur-ddal'), 'ur-ddal').reason, 'missing-mark');
});

test('level 3: the wrong number of dots, or the wrong side, fails with the copy round\'s kind line', () => {
  const te = ownTaps('ur-te');
  let r = judgeDots(te.slice(1), 'ur-te');
  assert.deepEqual([r.reason, r.need], ['dot-count', 2]);
  assert.equal(copyNote({ ok: false, ...r }), 'Almost! It needs two dots.');
  const b = bodyBox('ur-be');
  r = judgeDots([[[(b.x0 + b.x1) / 2, b.y0 - 0.2]]], 'ur-be');
  assert.equal(r.reason, 'dot-side');
  assert.equal(copyNote({ ok: false, ...r }), 'Almost! The dot goes underneath.');
  r = judgeDots([[[0.5, 0.2]]], 'ur-bari-he');
  assert.equal(copyNote({ ok: false, ...r }), 'Almost! It has no dots.');
  // Dots where ٹ's ṭ belongs: "It needs the little ṭ on top." (the 10C table).
  const tte = judgeDots(ownTaps('ur-tte').concat(ownTaps('ur-te')), 'ur-tte');
  assert.equal(copyNote({ ok: false, reason: tte.reason, missing: { part: tte.part } }), 'Almost! It needs the little ṭ on top.');
});

test('level 3: a body traced with her finger is left out; nothing placed yet waits; anything placed waits 4 seconds', () => {
  const body = detectiveChar('ur-be').strokes[0].points;
  const s = sortTaps([body, [[0.5, 1.2]]]);
  assert.deepEqual([s.dots.length, s.marks.length, s.other.length], [1, 0, 1]);
  assert.equal(judgeDots([body, ...ownTaps('ur-be')], 'ur-be').ok, true);
  assert.equal(dotsStatus([], 'ur-be'), 'wait');
  assert.equal(dotsStatus([[[0.5, 0.2]]], 'ur-be'), 'judge-soon');
  assert.equal(DETECTIVE.waitMs, 4000);
  // Her taps count only near the letter.
  const b = bodyBox('ur-be');
  assert.ok(inTapRoom([(b.x0 + b.x1) / 2, b.y1 + 0.25], 'ur-be'));
  assert.ok(!inTapRoom([b.x1 + 2, 0.5], 'ur-be'));
});

// ---- the boat family plays all three levels (the build sequence's "done when") ----

test('the boat family plays all three levels: the right tile in levels 1 and 2, her own dots in level 3', () => {
  const rand = seeded(5);
  for (const level of [1, 2, 3]) {
    for (const id of BOAT.filter((x) => lettersFor(level).includes(x))) {
      if (level < 3) {
        const round = detectiveChoices(id, rand);
        assert.equal(pickTile(startPicking(), round, round.right).ok, true, `${id} level ${level}`);
      } else {
        assert.ok(judgeDots(ownTaps(id), id).ok, `${id} level 3`);
      }
    }
  }
});

// ---- the screen ----

test('the board: every tile at least 88 px on both screens; the letter and its dots inside the letter box', () => {
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    const { s } = boardFit(w, h);
    for (const t of DETECTIVE_LAYOUT.tiles) {
      assert.ok(t.w * s >= 88 && t.h * s >= 88, `${w}x${h}: ${t.w * s} x ${t.h * s}`);
    }
  }
  const box = DETECTIVE_LAYOUT.letter;
  for (const id of DETECTIVE_LETTERS) {
    const place = letterPlace(id);
    const pts = [...detectiveChar(id).strokes.flatMap((st) => st.points), [0, 0], [0, 1.5]].map(place.toBoard);
    for (const [x, y] of pts) assert.ok(x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h, `${id}: ${x}, ${y}`);
  }
  assert.equal(hitTile([1000, 100]), 0);
  assert.equal(hitTile([1000, 300]), 1);
  assert.equal(hitTile([600, 300]), null);
});

test('the Urdu board has the magnifying-glass tile (41 tiles, each at least 88 px on both screens)', () => {
  assert.ok(hasDetective('urdu'));
  assert.ok(!hasDetective('abc') && !hasDetective('num'));
  assert.equal(boardTileCount('urdu'), 41);
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    const space = boardSpace(w, h);
    assert.ok(boardGrid('urdu', 41, space.w, space.h, BOARD_BOX.gap).size >= 88, `${w}x${h}`);
  }
});

test('from the Urdu board to the levels and a level, and back: the Games menu is unchanged', () => {
  const board = { screen: 'board', book: 'urdu' };
  const menu = navigate(board, { type: 'openDetective' });
  assert.deepEqual(menu, { screen: 'detective' });
  assert.deepEqual(navigate({ screen: 'board', book: 'abc' }, { type: 'openDetective' }), { screen: 'board', book: 'abc' });
  assert.deepEqual(navigate(menu, { type: 'openDetectiveLevel', game: 'detective-2', open: false }), menu, 'a locked level stays shut');
  const play = navigate(menu, { type: 'openDetectiveLevel', game: 'detective-2', open: true });
  assert.deepEqual(play, { screen: 'play', game: 'detective-2' });
  assert.deepEqual(navigate(play, { type: 'gameDone' }), menu);
  assert.deepEqual(navigate(play, { type: 'back' }), menu);
  assert.deepEqual(navigate(menu, { type: 'back' }), board);
  assert.deepEqual(DETECTIVE_LEVELS, DETECTIVE_GAMES);
  // The Games menu does not hold it.
  assert.doesNotMatch(read('src/games.js').split('export const GAME_KINDS')[0], /detective/);
});

test('its lines: "Pick the dots that finish the letter" and, in level 3, "Tap the dots onto the letter", each with a voice clip', () => {
  assert.equal(setNote('detective-1', null), 'Pick the dots that finish the letter');
  assert.equal(setNote('detective-2', null), 'Pick the dots that finish the letter');
  assert.equal(setNote('detective-3', null), 'Tap the dots onto the letter');
  assert.equal(setNote('count-1', 'match'), 'Count them, then tap the number');
  assert.equal(clipById('game-detective')?.words, 'Pick the dots that finish the letter');
  assert.equal(clipById('game-detective-3')?.words, 'Tap the dots onto the letter');
});

test('level 3 has undo (under show me); the other levels do not', () => {
  const screens = read('src/screens.js');
  assert.match(screens, /\(state\.screen === 'play' && state\.game === 'detective-3'\)/);
  assert.match(read('index.html'), /body\[data-game="detective-3"\] #undo \{ top: 352px; \}/);
  const game = read('src/detective-game.js');
  assert.match(game, /canUndo: \(\) => level === 3 &&/);
});

test('the log: a tile or a judging is a "game" entry naming the letter, what she gave and what was right', () => {
  const e = detectiveLogEntry({ game: 'detective-1', set: 2, letter: 'ur-te', gave: 'dots:1:under', right: 'dots:2:top', ok: false, ms: 1234.4, now: new Date('2026-11-24T10:00:00Z') });
  assert.deepEqual(e, { type: 'game', time: '2026-11-24T10:00:00.000Z', game: 'detective-1', set: 2, from: 'dots:1:under', to: 'dots:2:top', ok: false, ms: 1234, letter: 'ur-te' });
  void expectedMarks;
});
