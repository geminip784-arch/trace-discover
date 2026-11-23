// Run: node --test tests/lower.test.js
// Slice 9A part 2: judging lowercase letters in the copy-it round (src/copy.js).
// A lowercase letter is compared with every lowercase letter and the capitals
// and digits that look like one; size is measured on the model's own height;
// b d p q, n u and m w turned into each other read as the other letter; l and
// I count as the same shape; and where it sits on the lines is checked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  scoreCopy, compareIds, copyShow, sameShape, LOWER_LOOKALIKES, MIRROR_IS_LETTER, TURNED,
  POSITION, POSITION_LINES, checkPosition, heightKind,
} from '../src/copy.js';
import { copyNote } from '../src/notes.js';
import { planStrokes, planCount } from '../src/variants.js';
import { charFile } from '../src/session.js';
import { crudeLower, LOWER_HANDS } from './crude-lower.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const MANIFEST = JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url), 'utf8'));
const CHARS = Object.fromEntries(MANIFEST.map((id) => [id, load(id)]));
const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');
const judge = (id, strokes) => scoreCopy(strokes, CHARS[id], { others: compareIds(id).filter((o) => o !== id).map((o) => CHARS[o]) });
const lines = (id, plan = 0) => planStrokes(CHARS[id], plan).map((s) => s.points);
const move = (strokes, dx, dy) => strokes.map((pts) => pts.map(([x, y]) => [x + dx, y + dy]));
const scaleAt = (strokes, k, [ox, oy]) => strokes.map((pts) => pts.map(([x, y]) => [ox + (x - ox) * k, oy + (y - oy) * k]));
// Turned round left to right, or upside down, inside the letter's own box (line units).
const mirrorOf = (id, strokes = lines(id)) => strokes.map((pts) => pts.map(([x, y]) => [CHARS[id].width - x, y]));
const box = (strokes) => {
  const xs = strokes.flat().map((p) => p[0]);
  const ys = strokes.flat().map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
const upsideDown = (strokes) => {
  const b = box(strokes);
  return strokes.map((pts) => pts.map(([x, y]) => [b.x0 + b.x1 - x, b.y0 + b.y1 - y])); // turned half a turn
};

// ---- what a lowercase letter is compared with ----

test('a lowercase letter is compared with every lowercase letter and the look-alike capitals and digits', () => {
  const ids = compareIds('a');
  for (const ch of LOWER) assert.ok(ids.includes(ch), ch);
  for (const id of LOWER_LOOKALIKES) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('A') && !ids.includes('B'), 'only the capitals that look like a lowercase letter');
});

test('capitals and digits are compared exactly as before: their own board and look-alikes, never lowercase', () => {
  assert.deepEqual(compareIds('A'), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
  assert.deepEqual(compareIds('S'), [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '5']);
  assert.deepEqual(compareIds('3'), '0123456789'.split(''));
  assert.deepEqual(compareIds('0'), [...'0123456789'.split(''), 'O']);
  // A capital is never checked for its place on the lines.
  assert.equal(heightKind('P'), null);
  assert.equal(checkPosition(move(lines('P'), 0, 0.5), CHARS.P), null);
});

// ---- every letter, every plan ----

test('every lowercase letter, in every plan, is recognized as itself and passes', () => {
  for (const id of LOWER) {
    for (let p = 0; p < planCount(CHARS[id]); p++) {
      const r = judge(id, lines(id, p));
      assert.ok(r.ok, `${id} plan ${p + 1}: ${r.reason} (nearest ${r.match?.id})`);
      assert.ok(sameShape(r.match.id, id), `${id} plan ${p + 1}: read as ${r.match.id}`);
    }
  }
});

test('crude, child-like lowercase letters pass: wobbly, slanted, not quite the size, a round left open, a stick a little away', (t) => {
  const all = crudeLower(Object.fromEntries(LOWER.map((id) => [id, CHARS[id]])), (c) => Array.from({ length: planCount(c) }, (_, p) => planStrokes(c, p).map((s) => s.points)));
  const failed = all.filter((c) => !judge(c.id, c.strokes).ok);
  t.diagnostic(`${all.length - failed.length} of ${all.length} crude lowercase letters pass`);
  for (const f of failed) t.diagnostic(`${f.id} plan ${f.plan + 1} ${f.hand}${f.slip ? ' (slip)' : ''}: ${judge(f.id, f.strokes).reason}`);
  assert.deepEqual(failed.map((f) => `${f.id}${f.plan + 1}`), []);
  assert.equal(LOWER_HANDS.length, 3);
});

test('a scribble is still not a letter', () => {
  const scribble = [Array.from({ length: 80 }, (_, i) => [0.3 + 0.25 * Math.sin(i * 1.7), 0.75 + 0.22 * Math.cos(i * 2.3)])];
  for (const id of ['a', 'e', 'o', 'n']) assert.equal(judge(id, scribble).ok, false, id);
});

// ---- b d p q, n u, m w ----

const lookalikeLine = (id) => `Almost! That looks like ${id}.`;

test('b, d, p and q: each one written for another fails as "That looks like …", never as mirrored', () => {
  for (const target of ['b', 'd', 'p', 'q']) {
    for (const written of ['b', 'd', 'p', 'q']) {
      if (written === target) continue;
      const r = judge(target, lines(written));
      assert.equal(r.ok, false, `${written} for ${target}`);
      assert.equal(r.reason, 'looks-like', `${written} for ${target}: ${r.reason}`);
      assert.equal(r.lookalike, written, `${written} for ${target}`);
      assert.equal(r.mirrored, false);
      assert.equal(r.missing, null, 'no missing part: the letter is turned, not short of a part');
      assert.equal(copyShow(r), 'beside');
      assert.equal(copyNote(r), lookalikeLine(written));
    }
  }
});

test('b, d, p and q turned round (mirrored or upside down) read as the other letter', () => {
  const cases = [['b', 'd', mirrorOf('b')], ['d', 'b', mirrorOf('d')], ['p', 'q', mirrorOf('p')], ['q', 'p', mirrorOf('q')]];
  for (const [target, as, strokes] of cases) {
    const r = judge(target, strokes);
    assert.equal(r.reason, 'looks-like', `${target} mirrored`);
    assert.equal(r.lookalike, as, `${target} mirrored`);
    assert.notEqual(copyNote(r), 'It faces the other way. Watch Jugnu.');
  }
  // A b turned half a turn is a q; a d turned half a turn is a p.
  assert.equal(judge('b', move(upsideDown(lines('b')), 0, 0.5)).lookalike, 'q');
  assert.equal(judge('d', move(upsideDown(lines('d')), 0, 0.5)).lookalike, 'p');
  for (const id of MIRROR_IS_LETTER) assert.ok(TURNED[id].length === 3, id);
});

test('n and u turned upside down read as each other', () => {
  const nu = judge('n', upsideDown(lines('n')));
  assert.equal(nu.reason, 'looks-like');
  assert.equal(nu.lookalike, 'u');
  assert.equal(copyNote(nu), lookalikeLine('u'));
  const un = judge('u', upsideDown(lines('u')));
  assert.equal(un.lookalike, 'n');
  assert.equal(judge('n', lines('u')).lookalike, 'u');
  assert.equal(judge('u', lines('n')).lookalike, 'n');
});

test('m and w turned upside down read as each other', () => {
  const mw = judge('m', upsideDown(lines('m')));
  assert.equal(mw.reason, 'looks-like', `m upside down: ${mw.reason} (${mw.match?.id})`);
  assert.equal(mw.lookalike, 'w');
  assert.equal(copyNote(mw), lookalikeLine('w'));
  const wm = judge('w', upsideDown(lines('w')));
  assert.equal(wm.reason, 'looks-like', `w upside down: ${wm.reason} (${wm.match?.id})`);
  assert.equal(wm.lookalike, 'm');
});

// ---- size: against the model's own height ----

test('a capital-sized small letter gets "Make it a little smaller"', () => {
  for (const id of 'acemnorsuvwxz'.split('')) {
    // Twice the height, standing on the grass line: sky line to grass line, as big as a capital.
    const r = judge(id, scaleAt(lines(id), 2, [0.08, 1]));
    assert.equal(r.reason, 'too-big', `${id}: ${r.reason} (nearest ${r.match?.id})`);
    assert.equal(copyNote(r), 'Make it a little smaller.');
  }
});

test('the copied capital of a small letter (C for c, O for o, ...) is asked to be smaller, not called another letter', () => {
  for (const [low, cap] of [['c', 'C'], ['o', 'O'], ['s', 'S'], ['v', 'V'], ['w', 'W'], ['x', 'X'], ['z', 'Z']]) {
    const r = judge(low, lines(cap));
    assert.equal(r.reason, 'too-big', `${cap} for ${low}: ${r.reason}`);
  }
  // A U has no stick: written for u, the stick is missing.
  const u = judge('u', lines('U'));
  assert.equal(u.reason, 'missing-stroke');
  assert.equal(u.missing.part, 'stick');
});

test('size is the model\'s own height: small 0.5, tall and tail 1; width may still vary', () => {
  // A wide m, as tall as the model, passes; a narrow e too.
  assert.equal(judge('m', lines('m').map((p) => p.map(([x, y]) => [x * 1.4, y]))).ok, true);
  assert.equal(judge('e', lines('e').map((p) => p.map(([x, y]) => [x * 0.7, y]))).ok, true);
  // A small letter half as tall again is too big; a tall one at 70% is too small.
  assert.equal(judge('a', scaleAt(lines('a'), 1.4, [0.08, 1])).reason, 'too-big');
  assert.equal(judge('h', scaleAt(lines('h'), 0.7, [0.08, 1])).reason, 'too-small');
});

// ---- l and I ----

test('l and I count as the same shape (like O and 0)', () => {
  assert.ok(sameShape('l', 'I'));
  assert.equal(judge('l', lines('I')).ok, true);
  assert.equal(judge('l', move(lines('I'), 0.4, 0)).ok, true);
  assert.equal(sameShape('l', '1'), false);
});

// ---- the dots ----

test('the dots on i and j still work with the whole lowercase set compared', () => {
  for (const id of ['i', 'j']) {
    const dot = CHARS[id].strokes.find((s) => s.kind === 'dot').points;
    assert.equal(judge(id, [lines(id)[0], dot]).ok, true, id);
    const r = judge(id, [lines(id)[0]]);
    assert.equal(r.reason, 'missing-stroke', id);
    assert.equal(copyNote(r), 'Almost! The dot is missing.');
  }
});

// ---- line position (lowercase only) ----

test('a capital P written for p fails on position: "Let the tail go below the grass."', () => {
  const r = judge('p', lines('P'));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'position-tail');
  assert.equal(copyNote(r), 'Let the tail go below the grass.');
  assert.equal(copyShow(r), 'lines');
  assert.deepEqual(POSITION_LINES[r.reason], [1, 1.5], 'the grass and tail lines glow');
});

test('every tail letter written up on the grass line fails on position; with the tail a little short, it passes', () => {
  for (const id of 'gjpqy'.split('')) {
    const all = id === 'j' ? [lines(id)[0], CHARS.j.strokes[1].points] : lines(id);
    assert.equal(judge(id, move(all, 0, -0.5)).reason, 'position-tail', `${id} up a line`);
    assert.equal(judge(id, move(all, 0, -0.3)).ok, true, `${id} a little high`);
  }
});

test('a tall letter that does not reach up: "Make the stick reach up high."', () => {
  for (const id of 'bdfhkl'.split('')) {
    const r = judge(id, move(lines(id), 0, 0.5));
    assert.equal(r.reason, 'position-tall', id);
    assert.equal(copyNote(r), 'Make the stick reach up high.');
    assert.deepEqual(POSITION_LINES[r.reason], [0, 0.5], 'the sky line and the fence glow');
    assert.equal(judge(id, move(lines(id), 0, 0.25)).ok, true, `${id} a little low still passes`);
  }
  // t only needs to reach a little above the fence.
  assert.equal(judge('t', move(lines('t'), 0, 0.15)).ok, true);
  assert.equal(judge('t', move(lines('t'), 0, 0.3)).reason, 'position-tall');
});

test('a small letter up between the sky and the fence: "Keep it between the fence and the grass."', () => {
  for (const id of 'acemnorsuvwxz'.split('')) {
    const r = judge(id, move(lines(id), 0, -0.5));
    assert.equal(r.reason, 'position-small', id);
    assert.equal(copyNote(r), 'Keep it between the fence and the grass.');
    assert.deepEqual(POSITION_LINES[r.reason], [0.5, 1]);
    assert.equal(judge(id, move(lines(id), 0, -0.1)).ok, true, `${id} a little high still passes`);
    assert.equal(judge(id, move(lines(id), 0, 0.12)).ok, true, `${id} a little low still passes`);
  }
});

test('the position tolerances (line units), and their order: size first, then position', () => {
  // urduDipBelow and urduDipModel: Urdu tails and bowls (Slice 10C, tests/urdu-copy.test.js).
  assert.deepEqual(POSITION, { tailBelow: 0.15, tallAbove: 0.2, tAbove: 0.1, band: 0.15, smallShare: 0.7, urduDipBelow: 0.15, urduDipModel: 0.2 });
  // A capital-sized c, up on the sky line, is asked to be smaller first.
  assert.equal(judge('c', scaleAt(lines('c'), 2, [0.08, 1])).reason, 'too-big');
  assert.deepEqual(['g', 'j', 'p', 'q', 'y', 'b', 'd', 'f', 'h', 'k', 'l', 't', 'i', 'a'].map(heightKind),
    ['tail', 'tail', 'tail', 'tail', 'tail', 'tall', 'tall', 'tall', 'tall', 'tall', 'tall', 'tall', 'small', 'small']);
});
