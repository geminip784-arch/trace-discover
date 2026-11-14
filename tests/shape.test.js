// Run: node --test tests/shape.test.js
// Slice 5J: the copy-it round judges her letter by its shape (src/copy.js, with
// the $P recognizer in src/pdollar.js), and every failed copy has a reason and a
// parent-facing line (src/notes.js). Uses the real character files in data/chars/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  scoreCopy, compareIds, copyShow, sameShape, COPY_MATCH, LOOKALIKES, mirrorChar,
} from '../src/copy.js';
import { cloudOf, matchDistance, resampleCloud, CLOUD_POINTS } from '../src/pdollar.js';
import { planCount, planStrokes } from '../src/variants.js';
import { copyNote, traceNote, TRACE_NOTES } from '../src/notes.js';
import { practiceReasons, PRACTICE_MORE } from '../src/review.js';
import { charFile, bookOf } from '../src/session.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const ALL = JSON.parse(readFileSync(new URL('../data/chars/index.json', import.meta.url), 'utf8'));
const CHARS = Object.fromEntries(ALL.map((id) => [id, load(id)]));
// The characters on the boards. Lowercase (Slice 9A) joins the ABC board, and
// these judging tests, in the second part of the slice, where its judging is set up.
const IDS = ALL.filter((id) => bookOf(id));
const othersOf = (id) => compareIds(id).map((i) => CHARS[i]);
// As the game does: her strokes against the character, with its board and look-alikes.
const judge = (id, strokes) => scoreCopy(strokes, CHARS[id], { others: othersOf(id) });
const lines = (id, plan = 0) => planStrokes(CHARS[id], plan).map((s) => s.points);
const line = (a, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);

// A deterministic random number source, so every run draws the same wobbles and scribbles.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
// A wobbly hand: each stroke drifts slowly off its line (up to `amp` line units)
// and shakes a little, as a 4-year-old's line does.
function wobbly(strokes, amp, rnd) {
  return strokes.map((pts) => {
    const phase = rnd() * 6;
    let along = 0;
    return pts.map(([x, y], i) => {
      if (i > 0) along += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
      return [x + amp * Math.sin(along * 9 + phase) + 0.008 * (rnd() - 0.5), y + amp * Math.cos(along * 7 + phase) + 0.008 * (rnd() - 0.5)];
    });
  });
}
const mirror = (id, strokes = lines(id)) => strokes.map((pts) => pts.map(([x, y]) => [CHARS[id].width - x, y]));

// ---- the recognizer ($P) ----

test('$P: stroke count, order and direction barely change a cloud (much less than another letter does)', () => {
  const h = lines('H');
  const base = cloudOf(h);
  assert.equal(base.length, CLOUD_POINTS);
  const shuffled = cloudOf([h[2], [...h[0]].reverse(), h[1]]);
  assert.ok(matchDistance(base, shuffled) < 0.5); // only where the even spacing lands moves
  assert.ok(matchDistance(base, cloudOf(lines('U'))) > 0.9);
  const l = lines('L');
  assert.ok(matchDistance(cloudOf(l), cloudOf([[...l[0], ...l[1]]])) < 0.05);
  assert.equal(resampleCloud([], 32).length, 0);
});

test('$P keeps its BSD license and credit', () => {
  const text = readFileSync(new URL('../src/pdollar.js', import.meta.url), 'utf8');
  for (const words of ['Vatavu', 'Anthony', 'Wobbrock', 'New BSD License', 'Redistributions of source code must retain', 'ICMI']) {
    assert.ok(text.includes(words), words);
  }
});

test('the shape limits', () => {
  assert.equal(COPY_MATCH.maxDistance, 1.2);
  assert.equal(COPY_MATCH.maxStretch, 1.5);
  assert.ok(COPY_MATCH.coverMin > 0 && COPY_MATCH.coverMin < 1);
});

test('her letter is compared with its own board and a few look-alikes from the other board', () => {
  assert.equal(compareIds('A').length, 26);
  assert.deepEqual(compareIds('S').slice(-1), ['5']);
  assert.deepEqual(compareIds('5'), [...'0123456789', 'S']);
  assert.ok(compareIds('O').includes('0'));
  for (const [a, list] of Object.entries(LOOKALIKES)) for (const b of list) assert.ok(LOOKALIKES[b].includes(a), `${a} and ${b} both ways`);
});

// ---- every character, in every plan ----

test('every generated character, in every allowed plan, is recognized as itself and passes', () => {
  for (const id of IDS) {
    for (let p = 0; p < planCount(CHARS[id]); p++) {
      const r = judge(id, lines(id, p));
      assert.ok(r.ok, `${id} plan ${p + 1}: ${r.reason} (nearest ${r.match?.id})`);
      assert.ok(sameShape(r.match.id, id), `${id} plan ${p + 1} reads as ${r.match.id}`);
      assert.equal(r.mirrored, false, id);
    }
  }
});

test('O and 0 count as each other', () => {
  assert.ok(sameShape('O', '0') && sameShape('0', 'O'));
  assert.ok(judge('O', lines('0')).ok);
  assert.ok(judge('0', lines('O')).ok);
});

// ---- deliberately imperfect letters still pass ----

test('wobbly lines still pass: every character, several hands', () => {
  const rnd = seeded(3);
  for (const id of IDS) {
    for (let t = 0; t < 3; t++) {
      const r = judge(id, wobbly(lines(id), 0.03, rnd));
      assert.ok(r.ok, `${id} wobble ${t + 1}: ${r.reason} (nearest ${r.match?.id} ${r.match?.distance.toFixed(2)})`);
    }
  }
});

test('a letter written thinner or wider than the model still passes', () => {
  for (const id of IDS) {
    for (const k of [0.7, 1.4]) {
      const r = judge(id, lines(id).map((pts) => pts.map(([x, y]) => [x * k, y])));
      assert.ok(r.ok, `${id} at ${k} times the width: ${r.reason}`);
    }
  }
});

test("A's crossbar lower still passes", () => {
  const [left, right] = lines('A');
  for (const y of [0.6, 0.65, 0.7]) {
    const half = 0.32 * y; // the slants are this far either side of the middle at height y
    const r = judge('A', [left, right, line([0.4 - half + 0.03, y], [0.4 + half - 0.03, y])]);
    assert.ok(r.ok, `bar at ${y}: ${r.reason}`);
  }
});

test("K's legs meeting off-center still pass, in 3 strokes or 2", () => {
  const stem = lines('K')[0];
  for (const y of [0.35, 0.42, 0.6, 0.65]) {
    assert.ok(judge('K', [stem, line([0.72, 0], [0.08, y]), line([0.08, y], [0.72, 1])]).ok, `3 strokes meeting at ${y}`);
    assert.ok(judge('K', [stem, [...line([0.72, 0], [0.08, y]), ...line([0.08, y], [0.72, 1]).slice(1)]]).ok, `the "<" meeting at ${y}`);
  }
  // Meeting a little way out from the stem.
  assert.ok(judge('K', [stem, line([0.72, 0], [0.2, 0.45]), line([0.2, 0.45], [0.72, 1])]).ok);
});

test('G in one stroke or two, and B in three strokes, pass', () => {
  assert.ok(judge('G', lines('G')).ok);
  assert.ok(judge('G', [[...lines('G')[0], ...lines('G')[1]]]).ok);
  const r = judge('B', lines('B', 1));
  assert.ok(r.ok);
  assert.equal(r.habits.plan, 1);
  assert.ok(judge('B', wobbly(lines('B', 1), 0.03, seeded(9))).ok);
});

// ---- common confusions fail, with a sensible reason ----

// [target, what she wrote, the part to show on the model (or null: "That looks like ...")]
const CONFUSIONS = [
  ['G', 'C', 'bar'], ['C', 'G', null],
  ['E', 'F', 'bottom bar'], ['F', 'E', null],
  ['R', 'P', 'leg'], ['P', 'R', null],
  ['Q', 'O', 'tail'], ['O', 'Q', null],
  ['U', 'V', null], ['V', 'U', null],
  ['1', '7', null], ['7', '1', null],
  ['5', 'S', null], ['S', '5', null],
  ['2', 'Z', null], ['Z', '2', null],
];

test('common confusions fail as "looks like" the other one, and name the part she left out', () => {
  for (const [target, wrote, part] of CONFUSIONS) {
    const r = judge(target, lines(wrote));
    const where = `${target} written as ${wrote}`;
    assert.equal(r.ok, false, where);
    assert.equal(r.reason, 'looks-like', where);
    assert.equal(r.lookalike, wrote, where);
    assert.equal(r.missing?.part ?? null, part, where);
    assert.equal(copyShow(r), 'beside', where); // her letter beside the model
    assert.equal(copyNote(r), part ? `Almost! The ${part} is missing.` : `Almost! That looks like ${wrote}.`, where);
  }
});

test('confusions still fail when written a little wobbly', () => {
  const rnd = seeded(5);
  for (const [target, wrote] of CONFUSIONS) {
    const r = judge(target, wobbly(lines(wrote), 0.02, rnd));
    assert.equal(r.ok, false, `${target} written as a wobbly ${wrote}`);
  }
});

// ---- mirrored letters and scribbles ----

test('a mirrored letter passes, flagged: Jugnu shows the right way round and it goes on the practice-more list', () => {
  for (const id of IDS) {
    const r = judge(id, mirror(id));
    assert.ok(r.ok, `${id} mirrored: ${r.reason}`);
    // Letters that look the same in a mirror (A, H, O, 8 ...) are simply right.
    const symmetric = judge(id, lines(id)).match.id === r.match.id && !r.match.mirrored;
    if (symmetric) continue;
    assert.equal(r.mirrored, true, `${id} is flagged as mirrored`);
    assert.equal(copyShow(r), 'right-way', id);
    assert.equal(copyNote(r), 'It faces the other way. Watch Jugnu.');
  }
  for (const id of ['B', 'C', 'J', 'K', 'N', 'S', 'Z', '2', '3', '7', '9']) assert.equal(judge(id, mirror(id)).mirrored, true, id);
  assert.equal(PRACTICE_MORE.mirrored, 1);
  assert.deepEqual(practiceReasons({ mirrored: 1 }), ['mirrored']);
  assert.deepEqual(practiceReasons({ mirrored: 0 }), []);
});

test('a mirrored model is the model turned round inside its own box', () => {
  const j = CHARS.J;
  const m = mirrorChar(j);
  assert.ok(Math.abs(m.strokes[0].points[0][0] - (j.width - j.strokes[0].points[0][0])) < 1e-9);
});

// Scribbles: random zigzags, a tangle of loops, and back-and-forth hatching.
function scribbles() {
  const rnd = seeded(1);
  const out = [];
  for (let k = 0; k < 12; k++) {
    let p = [rnd(), rnd()];
    const pts = [p];
    for (let i = 0, n = 3 + Math.floor(rnd() * 8); i < n; i++) {
      const q = [rnd() * 0.8, rnd()];
      pts.push(...line(p, q, 8).slice(1));
      p = q;
    }
    out.push([pts]);
  }
  const coil = [];
  for (let i = 0; i < 300; i++) {
    const a = i * 0.3;
    const r = 0.2 + 0.25 * Math.sin(i * 0.05);
    coil.push([0.4 + r * Math.cos(a) + 0.1 * Math.sin(i * 0.21), 0.5 + r * Math.sin(a)]);
  }
  out.push([coil]);
  const back = [];
  for (let i = 0; i < 9; i++) back.push([0.08 + (i % 2) * 0.6, i / 8]);
  out.push([back.flatMap((q, i) => (i === 0 ? [q] : line(back[i - 1], q, 8).slice(1)))]);
  return out;
}

test('scribbles fail, nearly always as not recognizable, whatever letter she was copying', () => {
  let tries = 0;
  let unrecognized = 0;
  for (const [i, s] of scribbles().entries()) {
    for (const id of ['A', 'E', 'K', 'O', 'S', 'W', '3', '8']) {
      const r = judge(id, s);
      tries += 1;
      assert.equal(r.ok, false, `scribble ${i + 1} for ${id}`);
      // A few random lines can happen to look like a letter (three lines like an L).
      assert.ok(['unrecognized', 'looks-like'].includes(r.reason), `scribble ${i + 1} for ${id}: ${r.reason}`);
      if (r.reason === 'unrecognized') {
        unrecognized += 1;
        assert.equal(copyShow(r), 'slow'); // Jugnu traces the whole model slowly
      }
    }
  }
  assert.ok(unrecognized / tries >= 0.9, `${unrecognized} of ${tries}`);
});

// ---- every failure has a reason, a visual and a line ----

test('every failure produces a reason, something to show, and a parent line', () => {
  const fails = [];
  const take = (id, strokes) => { const r = judge(id, strokes); if (!r.ok) fails.push([id, r]); };
  for (const [t, w] of CONFUSIONS) take(t, lines(w));
  for (const s of scribbles()) take('A', s);
  take('H', lines('H').map((pts) => pts.map(([x, y]) => [x * 0.5, y * 0.5])));   // too small
  take('H', lines('H').map((pts) => pts.map(([x, y]) => [x * 1.6, y * 1.6])));   // too big
  take('A', lines('A').slice(0, 2));                                             // no crossbar
  take('E', [lines('E')[0], lines('E')[1], lines('E')[3]]);                      // no middle bar
  take('L', []);                                                                 // nothing
  take('L', [[[0, 0.5], [0.5, 0.5]]]);                                           // a flat line: no height
  const reasons = new Set();
  for (const [id, r] of fails) {
    assert.ok(typeof r.reason === 'string' && r.reason.length > 0, id);
    reasons.add(r.reason);
    assert.ok(['beside', 'size', 'part', 'slow'].includes(copyShow(r)), `${id} ${r.reason}`);
    const note = copyNote(r);
    assert.ok(typeof note === 'string' && note.length > 0 && note.length <= 40, `${id} ${r.reason}: "${note}"`);
    assert.ok(!/wrong|bad|fail|no!/i.test(note), `${id}: "${note}" stays kind`);
    if (r.reason === 'missing-stroke') assert.ok(r.missing?.points?.length > 1, `${id}: Jugnu needs the part's path`);
  }
  assert.deepEqual([...reasons].sort(), ['looks-like', 'missing-stroke', 'no-letter', 'too-big', 'too-small', 'unrecognized']);
});

test('the size lines, and a usual pass says nothing', () => {
  assert.equal(copyNote(judge('H', lines('H').map((pts) => pts.map(([x, y]) => [x * 0.5, y * 0.5])))), 'Make it bigger.');
  assert.equal(copyNote(judge('H', lines('H').map((pts) => pts.map(([x, y]) => [x * 1.6, y * 1.6])))), 'Make it a little smaller.');
  assert.equal(copyNote(judge('H', lines('H'))), null);
  assert.equal(copyNote(judge('H', [lines('H')[0], lines('H')[2], lines('H')[1]])), 'Well done! Here is the usual way.');
});

test('the tracing rounds: a short line for a wrong start, a wrong direction, off the track and a stroke traced the other way', () => {
  assert.deepEqual(Object.keys(TRACE_NOTES).sort(), ['off-path', 'off-target', 'reversed', 'wrong-direction', 'wrong-start']);
  assert.equal(traceNote('off-target'), 'Tap right on the dot.'); // Slice 9A: a tap that missed the dot of i or j
  assert.equal(traceNote('reversed'), 'That counts! Here is the usual way.');
  assert.equal(traceNote('wrong-start'), 'Start at the glowing dot.');
  assert.equal(traceNote('wrong-direction'), 'Go the other way. Watch Jugnu.');
  assert.equal(traceNote('off-path'), 'Stay on the track.');
  assert.equal(traceNote('too-short'), null);
  assert.equal(traceNote(null), null);
});

test('parts with plural names read right', () => {
  const r = { ok: false, reason: 'missing-stroke', missing: { part: 'bumps' } };
  assert.equal(copyNote(r), 'Almost! The bumps are missing.');
});
