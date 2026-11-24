// Slice 10C: the copy-it round for Urdu letters (src/copy.js scoreUrdu and
// src/urdu-dots.js). The body is judged by shape, then the dots and marks: how
// many, and on top or not. Also the copy flow around it: the 4-second dot wait
// (no dot hints), undo, taps as dots, and what each reason shows.
// The Urdu letters have no character files until Slice 10D, so they are built
// here from data/glyphs.js, exactly as `npm run glyphs` will build them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { URDU_GLYPHS } from '../data/glyphs.js';
import { glyphCharacter } from '../src/glyph-points.js';
import { scoreCopy, copyStatus, copyShow, copyLogEntry, usableStrokes, POSITION, compareIds } from '../src/copy.js';
import { URDU_DOTS, URDU_FAMILIES, sortSmall, sideOf, expectedMarks, tapCanBeMark, familyOf } from '../src/urdu-dots.js';
import { copyNote } from '../src/notes.js';
import { copyWaitFor, CONFIG } from '../src/progress.js';
import { groupOf, dotRun, planCount, planStrokes } from '../src/variants.js';
import { clipForText, URDU_PARTS, URDU_LETTERS, URDU_DOT_RESULTS } from '../data/voice-script.js';
import { crudeCopy, URDU_HANDS, seeded } from './crude-urdu.js';
import { URDU } from '../src/session.js';

const CHARS = Object.entries(URDU_GLYPHS).map(([id, g]) => glyphCharacter(id, g));
const C = Object.fromEntries(CHARS.map((c) => [c.id, c]));
const opts = { others: CHARS };
const judge = (id, strokes) => scoreCopy(strokes, C[id], opts);
const status = (id, strokes) => copyStatus(strokes, C[id], opts);
const body = (id) => C[id].strokes.filter((s) => s.kind === 'line').map((s) => s.points);
const taps = (id) => C[id].strokes.filter((s) => s.kind === 'dot').map((s) => [s.points[0]]);
const marks = (id) => C[id].strokes.filter((s) => s.kind === 'mark').map((s) => s.points);
const middle = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
const box = (list) => {
  const pts = list.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), cx: (Math.min(...xs) + Math.max(...xs)) / 2 };
};
const move = (strokes, dx, dy) => strokes.map((pts) => pts.map(([x, y]) => [x + dx, y + dy]));
const lineOf = (r) => copyNote(r);
const WITH_DOTS = Object.keys(C).filter((id) => taps(id).length > 0);
const WITH_MARK = Object.keys(C).filter((id) => marks(id).length > 0);
const PLAIN = Object.keys(C).filter((id) => taps(id).length === 0 && marks(id).length === 0);

// ---- the limits and families ----

test('the Urdu limits live in one place each: dot and mark sizes, and the below-the-grass check', () => {
  assert.deepEqual(URDU_DOTS, { dotSize: 0.18, markSize: 0.55, markShare: 0.75, near: 0.15 });
  assert.equal(POSITION.urduDipBelow, 0.15);
  assert.equal(POSITION.urduDipModel, 0.2);
  assert.equal(CONFIG.copyDotWaitMs, 4000);
});

test('the families are exactly the letters that share one body', () => {
  const key = (id) => JSON.stringify(body(id).map((pts) => pts.map(([x, y]) => [(x - box(body(id)).x0).toFixed(3), y])));
  for (const family of URDU_FAMILIES) {
    // ا and آ: the same straight line down, آ's a little shorter to leave room for its madd (shape is judged at any size).
    if (family.includes('ur-alif')) {
      for (const id of family) assert.ok(body(id).length === 1 && box(body(id)).x1 - box(body(id)).x0 < 1e-9, id);
      continue;
    }
    for (const id of family.slice(1)) assert.equal(key(id), key(family[0]), id);
  }
  // No two letters outside one family share a body.
  const seen = new Map();
  for (const id of Object.keys(C)) {
    const k = key(id);
    if (seen.has(k)) assert.ok(familyOf(id).includes(seen.get(k)), `${id} and ${seen.get(k)}`);
    else seen.set(k, id);
  }
});

test('an Urdu letter is compared with the whole Urdu board, and nothing else', () => {
  assert.deepEqual(compareIds('ur-be'), URDU.map((t) => t.id));
});

// ---- every letter as itself ----

test('every letter in every plan, copied as the model with taps for dots, passes', () => {
  for (const c of CHARS) {
    for (let p = 0; p < planCount(c); p++) {
      const strokes = planStrokes(c, p).map((s) => (s.kind === 'dot' ? [s.points[0]] : s.points));
      const r = judge(c.id, strokes);
      assert.ok(r.ok, `${c.id} plan ${p + 1}: ${r.reason} ${lineOf(r)}`);
      assert.equal(r.habits.usual, p === 0, `${c.id} plan ${p + 1}: the usual way only in the default plan`);
    }
  }
});

test('the dots may be tapped in any order, still the usual way; and a little off their place', () => {
  for (const id of WITH_DOTS) {
    const rev = [...body(id), ...marks(id), ...taps(id).reverse()];
    const r = judge(id, rev);
    assert.ok(r.ok, `${id} reversed`);
    assert.equal(r.habits.usual, true, `${id}: any order is the usual way`);
    const off = [...body(id), ...marks(id), ...taps(id).map(([[x, y]]) => [[x + 0.05, y - 0.03]])];
    const r2 = judge(id, off);
    assert.ok(r2.ok, `${id} a little off`);
    assert.equal(r2.habits.usual, true, `${id}: a dot's exact place is not a habit`);
  }
});

test('a letter a little smaller, bigger, or further along the lines still passes', () => {
  for (const id of ['ur-be', 'ur-pe', 'ur-jeem', 'ur-che', 'ur-seen', 'ur-sheen', 'ur-tte', 'ur-qaf', 'ur-noon', 'ur-gaf']) {
    const all = C[id].strokes.map((s) => (s.kind === 'dot' ? [s.points[0]] : s.points));
    for (const k of [0.9, 1.1]) {
      const b = box(body(id));
      const scaled = all.map((pts) => pts.map(([x, y]) => [b.cx + (x - b.cx) * k, 1 + (y - 1) * k]));
      assert.ok(judge(id, scaled).ok, `${id} at ${k}`);
    }
    assert.ok(judge(id, move(all, 0.6, 0)).ok, `${id} moved along`);
  }
});

test('crude, child-like letters pass: every letter, every plan, five hands', () => {
  const fails = [];
  for (const c of CHARS) {
    for (let p = 0; p < planCount(c); p++) {
      URDU_HANDS.forEach((h, k) => {
        const r = judge(c.id, crudeCopy(planStrokes(c, p), h, 7 + k * 13 + p));
        if (!r.ok) fails.push(`${c.id} plan ${p + 1} ${h.name}: ${r.reason}`);
      });
    }
  }
  assert.deepEqual(fails, []);
});

test('the crude hands cover wobble, slant, squash, round corners (س\'s teeth as bumps), shallow tails, and dots as taps, blobs and dabs', () => {
  assert.deepEqual(URDU_HANDS.map((h) => h.name), ['wobbly', 'slanted', 'squashed and wide', 'narrow and tall', 'round corners, shallow tail']);
  assert.deepEqual([...new Set(URDU_HANDS.map((h) => h.dot))].sort(), ['blob', 'dab', 'tap']);
});

// ---- dots: how many, and on top or not ----

const above = (id, dx = 0) => [[box(body(id)).cx + dx, box(body(id)).y0 - 0.15]];
const below = (id, dx = 0) => [[box(body(id)).cx + dx, box(body(id)).y1 + 0.15]];
const WORDS = ['no', 'one', 'two', 'three'];

test('the wrong number of dots fails, naming how many it needs', () => {
  for (const id of WITH_DOTS) {
    const n = taps(id).length;
    const line = `Almost! It needs ${WORDS[n]} dot${n > 1 ? 's' : ''}.`;
    for (const [what, dots] of [['none', []], ['one fewer', taps(id).slice(1)], ['one more', [...taps(id), [[taps(id)[0][0][0] + 0.12, taps(id)[0][0][1]]]]]]) {
      const r = judge(id, [...body(id), ...marks(id), ...dots]);
      assert.equal(r.reason, 'dot-count', `${id} ${what}`);
      assert.equal(r.need, n, `${id} ${what}`);
      assert.equal(lineOf(r), line, `${id} ${what}`);
    }
  }
});

test('the right number of dots on the wrong side fails: on top, or underneath', () => {
  for (const id of WITH_DOTS) {
    const want = expectedMarks(C[id]);
    const top = want.dots[0].side === 'top';
    const n = taps(id).length;
    const flipped = taps(id).map((_, i) => (top ? below(id, (i - 1) * 0.12) : above(id, (i - 1) * 0.12)));
    const r = judge(id, [...body(id), ...flipped]);
    assert.equal(r.reason, 'dot-side', id);
    assert.equal(lineOf(r), `Almost! The ${n > 1 ? 'dots go' : 'dot goes'} ${top ? 'on top' : 'underneath'}.`, id);
  }
});

test('look-alikes that differ only in dots are told apart: each family member written for each other fails with a dot or mark line', () => {
  for (const family of URDU_FAMILIES) {
    for (const target of family) {
      for (const wrote of family) {
        if (wrote === target) continue;
        const r = judge(target, C[wrote].strokes.map((s) => (s.kind === 'dot' ? [s.points[0]] : s.points)));
        assert.equal(r.ok, false, `${wrote} written for ${target}`);
        assert.ok(['dot-count', 'dot-side', 'missing-mark', 'looks-like'].includes(r.reason), `${wrote} for ${target}: ${r.reason}`);
        // A body with dots never gets a vague line: it names the dots, the mark, or the letter.
        assert.match(lineOf(r), /dot|ṭ|madd|looks like/, `${wrote} for ${target}`);
      }
    }
  }
});

test('the boat family: ب پ ت ٹ ث written for each other', () => {
  const said = (target, wrote) => lineOf(judge(target, C[wrote].strokes.map((s) => (s.kind === 'dot' ? [s.points[0]] : s.points))));
  assert.equal(said('ur-be', 'ur-te'), 'Almost! It needs one dot.');
  assert.equal(said('ur-te', 'ur-be'), 'Almost! It needs two dots.');
  assert.equal(said('ur-pe', 'ur-se'), 'Almost! The dots go underneath.');
  assert.equal(said('ur-se', 'ur-pe'), 'Almost! The dots go on top.');
  assert.equal(said('ur-tte', 'ur-te'), 'Almost! It needs the little ṭ on top.');
  assert.equal(said('ur-te', 'ur-tte'), 'Almost! It needs two dots.');
});

test('a dot on a letter with none: "It has no dots."', () => {
  for (const id of [...PLAIN, ...WITH_MARK]) {
    for (const dot of [above(id), below(id)]) {
      const r = judge(id, [...body(id), ...marks(id), dot]);
      assert.equal(lineOf(r), 'Almost! It has no dots.', id);
      assert.equal(copyShow(r), 'slow', `${id}: Jugnu writes the letter, as there are no dots to glow`);
    }
  }
});

// ---- small marks: the little ṭ and the madd ----

test('a missing mark, or dots in its place, fails: "It needs the little ṭ on top." / "It needs the madd on top."', () => {
  for (const id of WITH_MARK) {
    const line = id === 'ur-alif-madd' ? 'Almost! It needs the madd on top.' : 'Almost! It needs the little ṭ on top.';
    assert.equal(lineOf(judge(id, body(id))), line, `${id} with no mark`);
    assert.equal(lineOf(judge(id, [...body(id), above(id, -0.06), above(id, 0.06)])), line, `${id} with two dots`);
    // The mark under the letter is not on top.
    const b = box(body(id));
    const under = marks(id).map((pts) => pts.map(([x, y]) => [x, y + (b.y1 - b.y0) + 0.5]));
    assert.equal(lineOf(judge(id, [...body(id), ...under])), line, `${id} with the mark underneath`);
  }
});

test('a tapped ṭ or madd counts on ٹ and آ; on ڈ and ڑ a single dot on top is the dot of ذ and ز', () => {
  const tapped = (id) => [...body(id), [middle(marks(id)[0])]];
  for (const id of ['ur-tte', 'ur-alif-madd']) {
    assert.ok(tapCanBeMark(C[id], familyOf(id).map((f) => C[f])), id);
    const r = judge(id, tapped(id));
    assert.ok(r.ok, id);
    assert.equal(r.habits.usual, true, id);
  }
  for (const id of ['ur-ddal', 'ur-rre']) {
    assert.equal(tapCanBeMark(C[id], familyOf(id).map((f) => C[f])), false, id);
    assert.equal(lineOf(judge(id, tapped(id))), 'Almost! It needs the little ṭ on top.', id);
  }
});

test('a mark where dots belong counts as no dots; a mark on a letter with neither names the letter it makes', () => {
  const tMark = (id) => {
    const m = marks('ur-tte')[0];
    const mb = box([m]);
    const b = box(body(id));
    return m.map(([x, y]) => [x - (mb.x0 + mb.x1) / 2 + b.cx, y - mb.y1 + b.y0 - 0.08]);
  };
  assert.equal(lineOf(judge('ur-te', [...body('ur-te'), tMark('ur-te')])), 'Almost! It needs two dots.');
  assert.equal(lineOf(judge('ur-re', [...body('ur-re'), tMark('ur-re')])), 'Almost! That looks like ڑ.');
  assert.equal(lineOf(judge('ur-dal', [...body('ur-dal'), tMark('ur-dal')])), 'Almost! That looks like ڈ.');
  const r = judge('ur-alif', [...body('ur-alif'), marks('ur-alif-madd')[0]]);
  assert.equal(r.lookalikeId, 'ur-alif-madd');
  assert.equal(lineOf(r), 'Almost! That looks like آ.');
});

test('sorting her strokes by size: taps and blobs are dots, a ṭ is middling, a body stroke is a line', () => {
  const s = sortSmall([[[0.5, 0.5]], [[0.5, 0.5], [0.55, 0.52], [0.52, 0.55]], marks('ur-tte')[0], body('ur-be')[0]]);
  assert.deepEqual([s.dots.length, s.middling.length, s.lines.length], [2, 1, 1]);
  // Side: on top only when higher than all of the body near it.
  assert.equal(sideOf([0.5, 0.3], body('ur-be')), 'top');
  assert.equal(sideOf([0.5, 1.2], body('ur-be')), 'under');
  assert.equal(sideOf(taps('ur-jeem')[0][0], body('ur-jeem')), 'under', 'inside ج counts as underneath');
});

// ---- shapes alike, and the lines ----

// Pairs most likely to be mixed up, both ways round (the full board, every
// letter for every other, model and crude, was checked while building: none pass).
const ALIKE = [
  ['ur-dal', 'ur-re'], ['ur-be', 'ur-noon'], ['ur-chhoti-ye', 'ur-bari-ye'], ['ur-jeem', 'ur-ain'],
  ['ur-fe', 'ur-qaf'], ['ur-kaf', 'ur-gaf'], ['ur-alif', 'ur-lam'], ['ur-seen', 'ur-suad'],
  ['ur-toe', 'ur-suad'], ['ur-wao', 'ur-meem'], ['ur-chhoti-he', 'ur-do-chashmi-he'], ['ur-hamza', 'ur-ain'],
  ['ur-re', 'ur-wao'], ['ur-noon', 'ur-chhoti-ye'], ['ur-be', 'ur-fe'], ['ur-wao', 'ur-qaf'],
];

test('letters with a similar body still fail when written for each other, as the model and crude', () => {
  for (const [a, b] of ALIKE) {
    for (const [target, wrote] of [[a, b], [b, a]]) {
      for (const strokes of [C[wrote].strokes.map((s) => (s.kind === 'dot' ? [s.points[0]] : s.points)), crudeCopy(C[wrote].strokes, URDU_HANDS[1], 99)]) {
        const r = judge(target, strokes);
        assert.equal(r.ok, false, `${wrote} written for ${target}: ${r.reason}`);
      }
    }
  }
});

test('د and ر are the same shape in different places: the lines decide', () => {
  // ر written for د dips below the grass: "That looks like ر."
  assert.equal(lineOf(judge('ur-dal', body('ur-re'))), 'Almost! That looks like ر.');
  // A slanted or round-cornered د, which reads nearest ر, passes because it sits on the grass.
  for (const k of [1, 4]) assert.ok(judge('ur-dal', crudeCopy(C['ur-dal'].strokes, URDU_HANDS[k], 7 + k * 13)).ok, URDU_HANDS[k].name);
});

test('a letter whose tail or bowl dips below the grass must dip (gently); a letter on the grass is never checked', () => {
  for (const id of ['ur-re', 'ur-noon', 'ur-meem', 'ur-wao', 'ur-chhoti-ye', 'ur-qaf', 'ur-lam', 'ur-ain']) {
    const all = C[id].strokes.map((s) => (s.kind === 'dot' ? [s.points[0]] : s.points));
    const dip = box(body(id)).y1 - 1;
    const r = judge(id, move(all, 0, -dip)); // its lowest ink on the grass line
    assert.equal(r.reason, 'position-tail', id);
    assert.equal(lineOf(r), 'Let the tail go below the grass.', id);
    assert.ok(judge(id, move(all, 0, -(dip - 0.17))).ok, `${id}: dipping a little is enough`);
  }
  for (const id of ['ur-be', 'ur-dal', 'ur-toe', 'ur-kaf', 'ur-bari-ye']) {
    const all = C[id].strokes.map((s) => (s.kind === 'dot' ? [s.points[0]] : s.points));
    assert.ok(judge(id, move(all, 0, -0.2)).ok, `${id} a little high`);
    assert.ok(judge(id, move(all, 0, 0.2)).ok, `${id} a little low`);
  }
});

test('scribbles fail on every letter', () => {
  const rnd = seeded(5);
  for (const c of CHARS) {
    const s = Array.from({ length: 40 }, () => [0.1 + rnd() * 1.0, 0.3 + rnd() * 0.8]);
    assert.equal(judge(c.id, [s]).ok, false, c.id);
  }
});

// ---- the copy flow: the dot wait, undo, taps ----

test('body whole, dots still to come: judged after the 4-second dot wait, never a hint', () => {
  for (const id of WITH_DOTS) {
    const s = status(id, body(id));
    assert.deepEqual([s.action, s.wait], ['judge-soon', 'dots'], id);
    assert.equal(copyWaitFor(s), 4000);
  }
  // Each new dot keeps the dot wait until there are enough; then a pass is judged at once.
  const t = taps('ur-che');
  assert.equal(status('ur-che', [...body('ur-che'), t[0]]).wait, 'dots');
  assert.equal(status('ur-che', [...body('ur-che'), t[0], t[1]]).wait, 'dots');
  assert.equal(status('ur-che', [...body('ur-che'), ...t]).action, 'judge-now');
});

test('a body not yet whole still gets the hint (ج\'s head alone); a letter with no dots is judged as English letters are', () => {
  assert.equal(status('ur-jeem', [C['ur-jeem'].plans[0].strokes[0].points]).action, 'hint');
  assert.equal(status('ur-bari-he', body('ur-bari-he')).action, 'judge-now');
  // Enough dots, but wrong: the usual 2-second wait, with undo there.
  const s = status('ur-be', [...body('ur-be'), above('ur-be')]);
  assert.deepEqual([s.action, s.wait], ['judge-soon', undefined]);
  assert.equal(copyWaitFor(s), 2000);
  // Too many dots: the usual 2-second wait.
  assert.equal(status('ur-te', [...body('ur-te'), ...taps('ur-te'), below('ur-te')]).wait, undefined);
});

test('undo: taking back a dot reads her letter afresh', () => {
  const full = [...body('ur-te'), ...taps('ur-te')];
  assert.equal(status('ur-te', full).action, 'judge-now');
  // Undo her last dot: the body is whole and a dot is to come, so the dot wait again (nothing is judged until her next stroke).
  assert.equal(status('ur-te', full.slice(0, -1)).wait, 'dots');
  // A wrong third dot, then undo it: the letter passes again.
  const extra = [...full, below('ur-te')];
  assert.equal(status('ur-te', extra).action, 'judge-soon');
  assert.equal(status('ur-te', extra.slice(0, -1)).action, 'judge-now');
});

test('taps are strokes on every Urdu letter, so a dot on a letter with none can be named', () => {
  assert.equal(usableStrokes([...body('ur-re'), [[0.3, 0.3]]], C['ur-re']).length, 2);
  assert.equal(usableStrokes([[[0.3, 0.3]]], C['ur-re']).length, 1);
  // Only taps: no letter yet.
  assert.equal(judge('ur-be', [[[0.5, 1.2]]]).reason, 'no-letter');
});

// ---- what each reason shows (faint first, then the correction on the card) ----

test('a dot reason glows every dot of the letter on the card; a mark reason glows the mark', () => {
  const r = judge('ur-pe', body('ur-pe'));
  assert.equal(copyShow(r), 'part');
  assert.deepEqual(r.missing.paths, C['ur-pe'].strokes.filter((s) => s.kind === 'dot').map((s) => s.points));
  const side = judge('ur-te', [...body('ur-te'), below('ur-te', -0.06), below('ur-te', 0.06)]);
  assert.equal(copyShow(side), 'part');
  assert.equal(side.missing.paths.length, 2);
  const m = judge('ur-tte', body('ur-tte'));
  assert.equal(copyShow(m), 'part');
  assert.deepEqual(m.missing.paths, [marks('ur-tte')[0]]);
  assert.equal(m.missing.part, 'small ṭ');
});

test('every Urdu line is kind, and has a voice clip with exactly its words', () => {
  const lines = new Set([
    ...URDU_DOT_RESULTS.map((r) => copyNote({ ok: false, ...r })),
    ...URDU_PARTS.map((part) => copyNote({ ok: false, reason: 'missing-stroke', missing: { part } })),
    ...URDU_LETTERS.map(({ letter }) => copyNote({ ok: false, reason: 'looks-like', lookalike: letter })),
  ]);
  for (const line of lines) {
    assert.ok(clipForText(line), `no clip for "${line}"`);
    assert.match(line, /^Almost! /, line);
    assert.doesNotMatch(line, /wrong|error|bad|no!/i, line);
  }
  assert.ok(lines.has('Almost! It needs two dots.'));
  assert.ok(lines.has('Almost! The teeth are missing.'));
});

test('the copy log notes her dots and marks, on top or not', () => {
  const r = judge('ur-te', [...body('ur-te'), below('ur-te', -0.06), below('ur-te', 0.06)]);
  const entry = copyLogEntry({ char: 'ur-te', result: r, attempt: 1, now: new Date('2026-11-23T10:00:00Z') });
  assert.deepEqual(entry.dots, { dotsTop: 0, dotsUnder: 2, marksTop: 0, marksUnder: 0 });
  assert.equal(entry.reason, 'dot-side');
});

// ---- dots in any order (src/variants.js), for tracing too ----

test('dots side by side are one any-order group; a lone dot (i, j) is its own', () => {
  assert.deepEqual(dotRun(C['ur-che'].strokes, 2), [1, 2, 3]);
  assert.deepEqual(groupOf(C['ur-che'], 1), [1, 2, 3]);
  assert.deepEqual(groupOf(C['ur-che'], 0), [0]);
  assert.deepEqual(groupOf(C['ur-be'], 1), [1]);
  assert.deepEqual(groupOf({ strokes: [{ kind: 'line' }, { kind: 'dot' }] }, 1), [1]);
});
