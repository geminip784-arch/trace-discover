// Run: node --test tests/game-help.test.js
// Slice 5J part 2: game help and the U scene.
// - Every game shows one short parent-facing instruction line (src/notes.js).
// - "Show me" replays Jugnu's demonstration without making the move for her:
//   what he shows is picked by pure functions (src/games.js showMe*) that never
//   change the game's state, and a replay is logged as help, never as her move.
// - Odd one out's demonstration is slower: about 5 s, a look at every card.
// - U has a find scene (umbrella and umpire), opening in the living room; the
//   queen and the umpire never share a shadow set.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAME_NOTES, gameNote } from '../src/notes.js';
import {
  GAME_KINDS, GAMES, kindOf, makeSet, startMatch, dropCard, cardsOf, partnerCard, pathBoard, sortBoard, startSort, dropThing,
  oddPlay, startOdd, tapOdd, missingRound, startMissing, dropPiece, shadowsSet, shadowsClash, gameLogEntry,
  showMeMatch, showMePath, showMeSort, showMeMissing, showMeOdd, showMeLogEntry, ODD_DEMO, oddDemoMs, oddDemoSteps, ODD, MATCH_GAMES,
} from '../src/games.js';
import { COLORS, MISSING_PICTURES, SHADOW_LOOKALIKES } from '../data/games.js';
import { MISSING_CUTS } from '../data/missing-cuts.js';
import { OBJECTS } from '../data/finds.js';
import { letterScene, hasLetterScene, afterWriting, targetsFor } from '../src/finds.js';

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
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7 + 1);
// A deep-frozen copy: any change to it throws in strict mode (ES modules are strict).
const freeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) freeze(v);
  }
  return o;
};
const copy = (o) => JSON.parse(JSON.stringify(o));
const MISSING_OPTS = { colors: Object.keys(COLORS), pictures: MISSING_PICTURES, cuts: MISSING_CUTS };

// ---- 1. instruction lines ----

test('every kind of game has its one short instruction line', () => {
  assert.deepEqual(GAME_NOTES, {
    match: 'Draw a line to its partner',
    path: 'Trace each road home',
    sort: 'Drag each thing into its basket',
    odd: 'Tap the one that is different',
    missing: 'Drag each piece into its gap',
  });
  for (const k of GAME_KINDS) assert.equal(typeof gameNote(k), 'string', k);
  for (const id of GAMES) assert.ok(gameNote(kindOf(id)), id); // every set's tile has its kind's line
  assert.equal(gameNote('nope'), null);
});

test('the lines are short and kind: no diagnostic words', () => {
  for (const line of Object.values(GAME_NOTES)) {
    assert.ok(line.length <= 40, line);
    assert.equal(/wrong|bad|fail|mistake|no\b/i.test(line), false, line);
  }
});

// ---- 2. show me: never changes the game, never her move ----

test('match: show me picks a pair she has not matched, and changes nothing', () => {
  for (const game of MATCH_GAMES) {
    for (const seed of SEEDS.slice(0, 10)) {
      const set = makeSet(game, seeded(seed));
      const cards = cardsOf(set);
      let state = startMatch();
      // Match pairs one by one; before each, show me names an unmatched pair.
      for (let k = 0; k < 4; k++) {
        const frozen = freeze(copy(state));
        const pair = showMeMatch(freeze(copy(set)), frozen);
        assert.deepEqual(frozen, state, 'state unchanged');
        assert.ok(pair !== null && !state.matched.includes(pair), `${game}: ${pair}`);
        const from = cards.find((c) => c.side === 'left' && c.pair === pair);
        state = dropCard(state, from, partnerCard(cards, from)).state;
      }
      assert.equal(showMeMatch(set, state), null, 'nothing left to show');
    }
  }
});

test('follow the path: show me picks a road whose traveller is not home', () => {
  for (const seed of SEEDS.slice(0, 10)) {
    const { roads } = pathBoard(seeded(seed));
    const home = [];
    for (let k = 0; k < roads.length; k++) {
      const frozen = freeze([...home]);
      const r = showMePath(roads, frozen);
      assert.ok(r && !home.includes(r.animal));
      home.push(r.animal);
    }
    assert.equal(showMePath(roads, home), null);
  }
});

test('sort it: show me picks a thing still on the shelf, and changes nothing', () => {
  for (const game of ['sort-colors', 'sort-kinds']) {
    for (const seed of SEEDS.slice(0, 10)) {
      const board = sortBoard(game, seeded(seed));
      let state = startSort();
      for (let k = 0; k < board.things.length; k++) {
        const frozen = freeze(copy(state));
        const t = showMeSort(board, frozen);
        assert.deepEqual(frozen, state);
        assert.ok(t && !state.placed.includes(t.spot));
        state = dropThing(state, t, t.basket).state;
      }
      assert.equal(showMeSort(board, state), null);
    }
  }
});

test('odd one out: show me points at the different card until she has found it; her tap still decides', () => {
  for (const game of ['odd-kinds', 'odd-colors']) {
    for (const row of oddPlay(game, seeded(5))) {
      const state = freeze(startOdd());
      assert.equal(showMeOdd(row, state), row.odd);
      assert.deepEqual(state, startOdd(), 'state unchanged: she still has to tap it');
      const found = tapOdd(state, row, row.odd).state;
      assert.equal(showMeOdd(row, found), null);
    }
  }
});

test('missing piece: show me picks the right piece for an empty gap, and changes nothing', () => {
  for (const level of [1, 2, 3, 4]) {
    for (const seed of SEEDS.slice(0, 10)) {
      const round = missingRound(level, { ...MISSING_OPTS, rand: seeded(seed + level) });
      let state = startMissing();
      for (let k = 0; k < round.gaps.length; k++) {
        const frozen = freeze(copy(state));
        const p = showMeMissing(round, frozen);
        assert.deepEqual(frozen, state);
        assert.ok(p && !state.filled.includes(p.right) && !state.placed.includes(p.slot), `level ${level}`);
        const r = dropPiece(state, round, p, p.right);
        assert.equal(r.ok, true, 'the piece he shows is the one that fits');
        state = r.state;
      }
      assert.equal(showMeMissing(round, state), null);
    }
  }
});

test('a show me is logged as help, never as her move: no answer, never a try', () => {
  const now = new Date('2026-11-12T10:00:00Z');
  const e = showMeLogEntry({ game: 'odd-kinds', set: 2, ms: 1234.4, now });
  assert.deepEqual(e, { type: 'game-help', help: 'show-me', time: '2026-11-12T10:00:00.000Z', game: 'odd-kinds', set: 2, ms: 1234 });
  assert.equal('ok' in e, false);
  assert.equal('from' in e || 'to' in e || 'road' in e, false);
  // Her moves are type 'game'; a help entry is never one.
  assert.equal(gameLogEntry({ game: 'odd-kinds', set: 2, from: 'cup', ok: true, ms: 1, now }).type, 'game');
  assert.notEqual(e.type, 'game');
  assert.equal(showMeLogEntry({ game: 'path', ms: 5, now }).set, undefined);
});

test("every game screen's showMe only reads the state: it never assigns it", () => {
  for (const file of ['match', 'path', 'sort', 'odd', 'missing']) {
    const src = readFileSync(new URL(`../src/${file}.js`, import.meta.url), 'utf8');
    const at = src.indexOf('async function showMe()');
    assert.ok(at > 0, `${file} has showMe`);
    const body = src.slice(at, src.indexOf('\n  }\n', at));
    assert.equal(/\bstate\s*=[^=]/.test(body), false, `${file}: showMe assigns state`);
    assert.ok(/showMeLogEntry\(/.test(body), `${file}: showMe logs help`);
    assert.equal(/gameLogEntry\(/.test(body), false, `${file}: showMe never logs a move`);
    assert.ok(/showMe,\n/.test(src), `${file} returns showMe`);
  }
});

test('the show me button: picture only, in the left column, at least 88 px, on game screens only', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(/<button id="showme" class="btn" type="button" aria-label="Show me" hidden><\/button>/.test(html));
  assert.ok(/\.btn \{[^}]*width: 96px;[^}]*height: 96px;/s.test(html));
  const screens = readFileSync(new URL('../src/screens.js', import.meta.url), 'utf8');
  assert.ok(screens.includes("els.showme.hidden = screen !== 'play'"));
});

// ---- 3. a slower Odd one out demonstration ----

test('odd one out: Jugnu looks at each of the four cards, pauses, then goes to the different one, in about 5 s', () => {
  assert.equal(ODD.xs.length, 4);
  const total = oddDemoMs();
  assert.ok(total >= 4500 && total <= 5500, `${total} ms`);
  assert.equal(total, 4 * ODD_DEMO.hopMs + ODD_DEMO.pauseMs + ODD_DEMO.flyMs);
  const row = { odd: 2 };
  assert.deepEqual(oddDemoSteps(row), [
    { kind: 'look', place: 0 }, { kind: 'look', place: 1 }, { kind: 'look', place: 2 }, { kind: 'look', place: 3 },
    { kind: 'pause' }, { kind: 'go', place: 2 },
  ]);
});

// ---- 4. the U scene ----

const umpire = OBJECTS.find((o) => o.id === 'umpire');

test('U has a find scene: the umbrella and the umpire, 2 to find', () => {
  assert.ok(umpire);
  assert.equal(umpire.letter, 'U');
  assert.equal(umpire.word, 'umpire');
  assert.ok(hasLetterScene('U'));
  assert.equal(afterWriting('U'), 'openScene');
  assert.equal(targetsFor('U'), 2);
  for (const seed of SEEDS) {
    const scene = letterScene('U', seeded(seed));
    assert.deepEqual(scene.items.filter((o) => o.right).map((o) => o.id).sort(), ['umbrella', 'umpire']);
  }
});

test("U's scene opens in the living room, where the umbrella and the umpire both are", () => {
  assert.deepEqual(umpire.places, ['living', 'garden']);
  assert.ok(OBJECTS.find((o) => o.id === 'umbrella').places.includes('living'));
  for (const seed of SEEDS) assert.equal(letterScene('U', seeded(seed)).room, 'living', `seed ${seed}`);
});

test('X still skips its scene', () => {
  assert.equal(hasLetterScene('X'), false);
  assert.equal(afterWriting('X'), 'letterDone');
});

test('the queen and the umpire are dolls drawn alike: one look-alike group, never in the same shadow set', () => {
  const group = SHADOW_LOOKALIKES.find((g) => g.includes('queen'));
  assert.ok(group.includes('umpire'));
  assert.ok(shadowsClash('queen', 'umpire'));
  let both = 0;
  let either = 0;
  for (let seed = 1; seed <= 3000; seed++) {
    const ids = shadowsSet(seeded(seed)).pairs.map((p) => p.key);
    const q = ids.includes('queen');
    const u = ids.includes('umpire');
    if (q && u) both += 1;
    if (q || u) either += 1;
  }
  assert.equal(both, 0);
  assert.ok(either > 0, 'they do appear in shadow sets');
});
