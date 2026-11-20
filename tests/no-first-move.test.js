// Slice 5M: no game makes a move by itself. Jugnu never matches, sorts, takes
// home, fills or taps for her: every set starts ready for her finger, and the
// only code that makes a move is the code that handles her own touch.
// These read the game files' source, since the screens need a browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as games from '../src/games.js';

const src = (name) => readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8');

// The body of `function <name>` (or `async function <name>`) in a source, braces matched.
function body(source, name) {
  const at = source.search(new RegExp(`function ${name}\\s*\\(`));
  assert.ok(at >= 0, `function ${name} is there`);
  let i = source.indexOf('{', source.indexOf(')', at));
  const start = i;
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unbalanced ${name}`);
}
const count = (s, needle) => s.split(needle).length - 1;

// Each game: the call that makes a move, the function of hers that holds it,
// and the function that puts out a new set.
const GAMES = [
  { file: 'match', move: 'dropCard(', hers: 'release', fresh: 'newSet' },
  { file: 'sort', move: 'dropThing(', hers: 'release', fresh: 'newBoard' },
  { file: 'missing', move: 'dropPiece(', hers: 'release', fresh: 'newRound' },
  { file: 'odd', move: 'tapOdd(', hers: 'tap', fresh: 'nextRow' },
  { file: 'memory', move: 'flipCard(', hers: 'tap', fresh: 'newBoard' }, // Slice 5N
  { file: 'count', move: 'pickNumber(', hers: 'tap', fresh: 'nextRound' }, // Slice 5N
];

test('the first-move helpers are gone from games.js', () => {
  for (const name of ['showsFirstMove', 'FIRST_MOVE_DELAY_MS', 'firstMovePair', 'firstMoveRoad', 'firstMoveThing', 'firstMovePiece']) {
    assert.equal(name in games, false, `${name} is not exported`);
  }
});

test('no game file mentions a first move', () => {
  for (const file of ['games', 'match', 'path', 'sort', 'odd', 'missing', 'memory', 'count']) {
    assert.doesNotMatch(src(file), /firstMove|showsFirstMove|FIRST_MOVE/, file);
  }
});

test('in every game, a move is made only from her own touch', () => {
  for (const g of GAMES) {
    const s = src(g.file);
    assert.equal(count(s, g.move), 1, `${g.file}: one place makes a move`);
    assert.ok(body(s, g.hers).includes(g.move), `${g.file}: it is in ${g.hers}(), her touch`);
  }
  // Follow the path: a traveller goes home only when her trace reaches it.
  const p = src('path');
  const calls = [...p.matchAll(/arrive\(/g)].length;
  assert.equal(calls, 2, 'path: arrive is defined once and called once');
  assert.match(p, /if \(step\.done\) return arrive\(r\);/, 'path: called when her trace is done');
});

test('every set starts ready for her: taps open at once, nothing is scheduled', () => {
  for (const g of GAMES) {
    const b = body(src(g.file), g.fresh);
    assert.match(b, /busy = false;\s*\}$/, `${g.file}: ${g.fresh}() ends with taps open`);
    assert.doesNotMatch(b, /later\(|setTimeout\(/, `${g.file}: ${g.fresh}() schedules nothing`);
  }
  const p = src('path');
  assert.match(p, /let demoing = false;/, 'path: touches are open from the start');
  // Nothing runs on its own at the top level of playPath: every later() is inside a function.
  const top = body(p, 'playPath').replace(/\n {2}(async )?function \w+\([^)]*\) \{[\s\S]*?\n {2}\}/g, '');
  assert.doesNotMatch(top, /\n {2}later\(/, 'path: no move is scheduled at the start');
});

test('Odd one out: show me points, never taps', () => {
  const b = body(src('odd'), 'demo');
  assert.doesNotMatch(b, /tapOdd\(|found\(\)/, 'the demonstration never answers the row');
  assert.match(b, /gm-point/, 'he points at the different card');
});
