// Slice 10D: the Urdu letters in the app. The tracing rounds (every stroke of
// every plan through the same plan-following the game uses, dots in any
// order, marks judged by their place), Jugnu's perch to the right of an Urdu
// start dot, the practice page's spaces right to left, and the card's markers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  planCandidates, advancePlans, startPlans, pickCandidate, scoreMark, planCount, planStrokes, shownPlan,
  MARK, markRef, isMarkRef, markCentre, markReach, spotOf,
} from '../src/variants.js';
import { perchFor, restingSpot, PERCH } from '../src/jugnu.js';
import { practiceLayout, toSpace } from '../src/practice.js';
import { cardMarkers, writingLayout, computeLayout, letterOffset, modelCard } from '../src/render.js';
import { traceNote } from '../src/notes.js';
import { charFile, URDU, boardTileCount } from '../src/session.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const MANIFEST = JSON.parse(read('data/chars/index.json'));
const load = (id) => JSON.parse(read(`data/chars/${charFile(id)}.json`));
const URDU_IDS = URDU.map((t) => t.id);
const C = Object.fromEntries(URDU_IDS.map((id) => [id, load(id)]));

// Her stroke for a plan stroke, as she traces it: a line along its points, a
// dot as a tap, a mark as a tap at its middle (or `drawn`: its own shape).
const herStroke = (s, drawn = false) => (s.kind === 'dot' ? [s.points[0]] : s.kind === 'mark' && !drawn ? [markCentre(s.points)] : s.points);

// Trace a list of her strokes through the plans, as game.js does: each must
// pass against a candidate of a plan she still follows. Returns the plans left.
function trace(char, strokes, stage = 1) {
  let alive = startPlans(char);
  for (const pts of strokes) {
    const pick = pickCandidate(pts, planCandidates(char, alive), stage, scoreMark);
    if (!pick.result.ok) return { ok: false, reason: pick.result.reason };
    alive = advancePlans(pts, char, alive, stage, scoreMark);
  }
  return { ok: alive.some((p) => p.done.every(Boolean)), alive };
}

test('every Urdu letter is on the board and in the manifest, in qaida order', () => {
  assert.deepEqual(MANIFEST.filter((id) => id.startsWith('ur-')), URDU_IDS);
  assert.equal(boardTileCount('urdu'), 40); // and the pencil tile
});

test('rounds 1 and 2: every letter traced in every plan, dots tapped and marks tapped, completes the letter', () => {
  for (const char of Object.values(C)) {
    for (let p = 0; p < planCount(char); p++) {
      for (const stage of [1, 2]) {
        const r = trace(char, planStrokes(char, p).map((s) => herStroke(s)), stage);
        assert.ok(r.ok, `${char.id} plan ${p + 1} stage ${stage}: ${r.reason}`);
      }
    }
  }
});

test('a mark drawn in its own shape counts too, and so does a mark a little off its place', () => {
  for (const id of ['ur-tte', 'ur-ddal', 'ur-rre', 'ur-alif-madd']) {
    const char = C[id];
    assert.ok(trace(char, char.strokes.map((s) => herStroke(s, true))).ok, `${id} drawn`);
    const nudged = char.strokes.map((s) => (s.kind === 'mark' ? [[markCentre(s.points)[0] + 0.1, markCentre(s.points)[1] - 0.05]] : herStroke(s)));
    assert.ok(trace(char, nudged).ok, `${id} a little off`);
  }
});

test('dots side by side may be tapped in any order', () => {
  for (const id of ['ur-pe', 'ur-te', 'ur-se', 'ur-che', 'ur-zhe', 'ur-sheen', 'ur-qaf']) {
    const char = C[id];
    const body = char.strokes.filter((s) => s.kind === 'line').map((s) => s.points);
    const dots = char.strokes.filter((s) => s.kind === 'dot').map((s) => [s.points[0]]);
    assert.ok(trace(char, [...body, ...dots.reverse()]).ok, id);
  }
});

test('a mark is judged by its place: a tap far off, or a long stroke there, does not count ("Tap right on the mark.")', () => {
  const char = C['ur-tte'];
  const ref = markRef(char.strokes[1].points);
  assert.ok(isMarkRef(ref));
  assert.deepEqual(spotOf(ref), markCentre(char.strokes[1].points));
  const at = markCentre(char.strokes[1].points);
  assert.equal(scoreMark([at], ref, 1).ok, true);
  const far = scoreMark([[at[0] + markReach(1) + 0.05, at[1]]], ref, 1);
  assert.deepEqual([far.ok, far.reason], [false, 'off-mark']);
  assert.equal(traceNote('off-mark'), 'Tap right on the mark.');
  const long = [[at[0] - 0.4, at[1]], [at[0] + 0.4, at[1]]];
  assert.equal(scoreMark(long, ref, 1).ok, false, 'longer than MARK.size');
  assert.ok(MARK.size >= 0.5);
  // Through the rounds: after the body, a tap far from the mark does not complete ٹ.
  const r = trace(char, [char.strokes[0].points, [[at[0], at[1] - 0.45]]]);
  assert.deepEqual([r.ok, r.reason], [false, 'off-mark']);
});

test('the dot of i and j is scored exactly as before (a mark tag never reaches it)', () => {
  const i = load('i');
  assert.ok(trace(i, i.strokes.map((s) => herStroke(s))).ok);
  const far = scoreMark([[0, 0]], [i.strokes[1].points[0]], 1);
  assert.equal(far.reason, 'off-target');
});

test('the default plan is shown first, as for every letter', () => {
  for (const char of Object.values(C)) assert.equal(shownPlan(startPlans(char)).plan, 0, char.id);
});

// ---- Jugnu ----

test('Jugnu perches below and to the right of an Urdu start dot: the same offsets, mirrored', () => {
  const dot = [0.8, 0.5];
  const ltr = perchFor(dot);
  const rtl = perchFor(dot, true);
  assert.deepEqual(ltr, [dot[0] + PERCH[0], dot[1] + PERCH[1]]);
  assert.deepEqual(rtl, [dot[0] - PERCH[0], dot[1] + PERCH[1]]);
  assert.ok(rtl[0] > dot[0] && rtl[1] < dot[1] + 0.2);
  // Near the top he perches below: still to the right for Urdu.
  assert.ok(perchFor([0.5, 0.05], true)[0] > 0.5);
  assert.ok(perchFor([0.5, 0.05])[0] < 0.5);
});

test('his resting place in the button column is the same spot for an Urdu letter', () => {
  const layout = computeLayout(1280, 626);
  const offset = letterOffset(layout, 1);
  const ltrTail = perchFor(restingSpot(layout, offset));
  const rtlTail = perchFor(restingSpot(layout, offset, undefined, true), true);
  assert.ok(Math.abs(ltrTail[0] - rtlTail[0]) < 1e-9 && Math.abs(ltrTail[1] - rtlTail[1]) < 1e-9);
});

test('game.js and practice-game.js tell Jugnu the letter\'s direction', () => {
  for (const file of ['src/game.js', 'src/practice-game.js']) {
    const s = read(file);
    assert.match(s, /const rtl = char\.direction === 'rtl';/, file);
    assert.match(s, /createJugnu\(els\.jugnu, \(p\) => \(layout \? toPx\(p\) : \[0, 0\]\), \{ rtl \}\)/, file);
  }
  assert.match(read('src/practice-game.js'), /practiceLayout\(w, h, char\.width, undefined, \{ rtl \}\)/);
});

// ---- the practice page ----

test('an Urdu practice page runs right to left: space 1 on the right, then 2 and 3 to its left', () => {
  for (const [w, h] of [[1280, 626], [1280, 800]]) {
    for (const id of ['ur-be', 'ur-suad', 'ur-alif']) {
      const char = C[id];
      const rtl = practiceLayout(w, h, char.width, undefined, { rtl: true });
      assert.ok(rtl.step < 0, id);
      assert.ok(rtl.spaces[0].x0 > rtl.spaces[1].x0 && rtl.spaces[1].x0 > rtl.spaces[2].x0, id);
      // Each space's letter sits inside its space.
      for (let k = 0; k < 3; k++) {
        const px = toSpace([[0, 0], [char.width, 0]], k, rtl.step).map(([x]) => rtl.originX + (rtl.offset + x) * rtl.unit);
        assert.ok(px[0] >= rtl.spaces[k].x0 - 1e-6 && px[1] <= rtl.spaces[k].x1 + 1e-6, `${id} space ${k + 1}`);
      }
      // The tolerance floor still applies: a line unit is never smaller than this.
      assert.ok(rtl.unit >= 140, `${id} ${w}x${h}: ${rtl.unit}`);
    }
    // English pages are as before: left to right.
    const e = practiceLayout(w, h, load('E').width);
    assert.ok(e.step > 0 && e.spaces[0].x0 < e.spaces[1].x0);
  }
});

// ---- the model card ----

test('on the card, dots side by side share one numbered marker; a mark is drawn in its shape', () => {
  const { dots } = cardMarkers(C['ur-che']);
  assert.deepEqual(dots.map((d) => d.label), [1, 2]);
  assert.deepEqual(cardMarkers(C['ur-be']).dots.map((d) => d.label), [1, 2]);
  assert.deepEqual(cardMarkers(load('i')).dots.map((d) => d.label), [1, 2]);
  assert.match(read('src/render.js'), /if \(stroke\.kind !== 'mark'\) continue;/);
});

test('writingLayout is the game\'s own placement: the copy round\'s card sits where modelCard puts it', () => {
  const char = C['ur-gaf'];
  const { layout, offset, card } = writingLayout(1280, 626, char, true);
  const full = computeLayout(1280, 626, char.width);
  assert.equal(layout.lineEnd, modelCard(full, 0, char).lineEnd);
  const { toMain, ...where } = card;
  const { toMain: theirs, ...expected } = modelCard(full, offset, char);
  assert.deepEqual(where, expected);
  assert.deepEqual(toMain([0.5, 0.5]), theirs([0.5, 0.5]));
  assert.match(read('src/game.js'), /\(\{ layout, offset, card \} = writingLayout\(w, h, char, isCopy\(\)\)\);/);
});
