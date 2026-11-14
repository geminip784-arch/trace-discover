// Run: node --test tests/dots.test.js
// Slice 9A: the dot of i and j is a tap (or a tiny stroke) at the dot's place,
// in the tracing rounds (src/variants.js scoreMark, as game.js uses it) and in
// the copy-it round (src/copy.js: checked on its own, after the shape).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, resample } from '../src/geometry.js';
import {
  scoreMark, scoreEitherWay, DOT_MAX, startPlans, planCandidates, advancePlans, shownPlan, pickCandidate, planStrokes,
} from '../src/variants.js';
import { initialState, applyLift, applyPlanPass, isLetterDone } from '../src/progress.js';
import { scoreCopy, copyStatus, copyShow, splitMarks, dotsOf, refBox, COPY_MATCH } from '../src/copy.js';
import { copyNote, traceNote } from '../src/notes.js';
import { markPath, DOT_MARK_RADIUS, copyHelperMarks, startMarkers } from '../src/render.js';
import { charFile } from '../src/session.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const I = load('i');
const J = load('j');
const dotOf = (char) => char.strokes.find((s) => s.kind === 'dot').points[0];
const lineOf = (char) => char.strokes.find((s) => s.kind === 'line').points;
const tap = ([x, y]) => [[x, y]];
const tiny = ([x, y]) => [[x - 0.02, y - 0.01], [x, y], [x + 0.02, y + 0.01]]; // a little flick, 0.045 long
const move = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
const scale = (strokes, k, [ox, oy]) => strokes.map((pts) => pts.map(([x, y]) => [ox + (x - ox) * k, oy + (y - oy) * k]));

// ---- scoreMark ----

test('a tap right on the dot counts, at every stage', () => {
  for (const char of [I, J]) {
    for (const stage of [1, 2, 3]) {
      const r = scoreMark(tap(dotOf(char)), [dotOf(char)], stage);
      assert.equal(r.ok, true, `${char.id} stage ${stage}`);
      assert.equal(r.reason, null);
      assert.equal(r.reversed, false);
    }
  }
});

test('a tiny stroke on the dot counts too; a tap a little off counts within the stage\'s dot radius', () => {
  const d = dotOf(I);
  assert.equal(scoreMark(tiny(d), [d], 1).ok, true);
  for (const stage of [1, 2, 3]) {
    const r = DEFAULTS.stages[stage].dotRadius;
    assert.equal(scoreMark(tap([d[0] + r * 0.9, d[1]]), [d], stage).ok, true, `stage ${stage}: just inside`);
    assert.equal(scoreMark(tap([d[0] + r * 1.1, d[1]]), [d], stage).ok, false, `stage ${stage}: just outside`);
  }
});

test('a tap away from the dot, or a long line through it, does not count: "off-target"', () => {
  const d = dotOf(I);
  const far = scoreMark(tap([d[0] + 0.3, d[1]]), [d], 1);
  assert.equal(far.ok, false);
  assert.equal(far.reason, 'off-target');
  const through = [[d[0], d[1] - 0.2], [d[0], d[1] + 0.2]]; // 0.4 long, centred on the dot
  assert.equal(scoreMark(through, [d], 1).ok, false);
  assert.ok(DOT_MAX < 0.4);
  assert.equal(traceNote('off-target'), 'Tap right on the dot.');
});

test('for a line, scoreMark is exactly scoreEitherWay', () => {
  const stick = lineOf(I);
  for (const child of [stick, [...stick].reverse(), move(stick, 0.3, 0)]) {
    assert.deepEqual(scoreMark(child, stick, 1), scoreEitherWay(child, stick, 1));
  }
});

// ---- tracing (rounds 1 and 2, and every stage) ----

// As game.js does: touch-down start check, pickCandidate and advancePlans with scoreMark.
function trace(char, strokes, stage = 1) {
  let alive = startPlans(char);
  let progress = initialState(char.strokes.length);
  const out = [];
  for (const s of strokes) {
    const candidates = planCandidates(char, alive);
    const r0 = DEFAULTS.stages[stage].startRadius;
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= r0;
    const startOk = candidates.some((v) => near(s[0], v.points[0]) || near(s[0], v.points.at(-1)));
    const pick = pickCandidate(s, candidates, stage, scoreMark);
    let result = pick.result;
    if (result.reason !== 'too-short' && !startOk) result = { ...result, ok: false, reason: 'wrong-start' };
    if (result.ok) {
      alive = advancePlans(s, char, alive, stage, scoreMark);
      progress = applyPlanPass(progress, shownPlan(alive).done).state;
    } else {
      progress = applyLift(progress, { ok: false }).state;
    }
    out.push(result);
  }
  return { out, done: isLetterDone(progress), plan: shownPlan(alive).plan };
}

test('i and j traced: the line, then a tap on the dot, finishes the letter at every stage', () => {
  for (const char of [I, J]) {
    for (const stage of [1, 2, 3]) {
      const t = trace(char, [lineOf(char), tap(dotOf(char))], stage);
      assert.equal(t.done, true, `${char.id} stage ${stage}: ${t.out.map((o) => o.reason)}`);
      assert.equal(t.plan, 0);
    }
  }
});

test('the dot first, then the line, is the other allowed plan', () => {
  for (const char of [I, J]) {
    const t = trace(char, [tiny(dotOf(char)), lineOf(char)], 2);
    assert.equal(t.done, true, char.id);
    assert.equal(t.plan, 1, char.id);
  }
});

test('a tap that misses the dot does not finish the letter, and never counts as the dot', () => {
  const d = dotOf(I);
  const t = trace(I, [lineOf(I), tap([d[0] + 0.35, d[1] + 0.1])]);
  assert.equal(t.done, false);
  assert.equal(t.out[1].ok, false);
  // A tap on the stick's start, before anything is drawn, is too short to be the stick.
  const early = trace(I, [tap(lineOf(I)[0])]);
  assert.equal(early.out[0].ok, false);
});

test('round 1 markers: once the stick is done, the big numbered start dot sits on the dot', () => {
  const m = startMarkers(I, [true, false], 1);
  assert.equal(m[0].kind, 'big');
  assert.deepEqual(m[0].at, dotOf(I));
  assert.equal(m[0].label, 2);
  assert.equal(m.filter((x) => x.kind === 'arrow').length, 0, 'no arrow on a dot');
});

test('Jugnu and the sparkles show a dot as a tiny circle round it; a line is left as it is', () => {
  const d = dotOf(I);
  const ring = markPath([d]);
  assert.ok(ring.length > 8);
  for (const p of ring) assert.ok(Math.abs(Math.hypot(p[0] - d[0], p[1] - d[1]) - DOT_MARK_RADIUS) < 1e-9);
  assert.equal(markPath(lineOf(I)), lineOf(I));
});

// ---- copying (round 3) ----

const copyI = (strokes) => scoreCopy(strokes, I);

test('i and j copied exactly, the stick and a tap on the dot, pass; so does the dot first', () => {
  for (const char of [I, J]) {
    assert.equal(scoreCopy([lineOf(char), tap(dotOf(char))], char).ok, true, char.id);
    assert.equal(scoreCopy([tap(dotOf(char)), lineOf(char)], char).ok, true, `${char.id} dot first`);
    assert.equal(scoreCopy([lineOf(char), tiny(dotOf(char))], char).ok, true, `${char.id} tiny stroke`);
  }
});

test('the dot first is logged as the other plan (a habit, never a fail)', () => {
  const r = copyI([tap(dotOf(I)), lineOf(I)]);
  assert.equal(r.ok, true);
  assert.equal(r.habits.plan, 1);
});

test('written anywhere on the lines, and a little bigger, it still passes', () => {
  const strokes = [lineOf(I), tap(dotOf(I))].map((p) => move(p, 1.3, 0.05));
  assert.equal(copyI(strokes).ok, true);
  assert.equal(copyI(scale(strokes, 1.15, [1.4, 0.8])).ok, true);
  assert.equal(scoreCopy(scale([lineOf(J), tap(dotOf(J))], 1.2, [0.5, 1]), J).ok, true);
});

test('no dot: "Almost! The dot is missing.", and Jugnu draws the dot on the model card', () => {
  for (const char of [I, J]) {
    const r = scoreCopy([lineOf(char)], char);
    assert.equal(r.ok, false, char.id);
    assert.equal(r.reason, 'missing-stroke', char.id);
    assert.equal(r.missing.part, 'dot');
    assert.deepEqual(r.missing.points, [dotOf(char)]);
    assert.equal(copyShow(r), 'part');
    assert.equal(copyNote(r), 'Almost! The dot is missing.');
  }
});

test('a dot in the wrong place (below the stick, or far to the side) is a missing dot', () => {
  const d = dotOf(I);
  assert.equal(copyI([lineOf(I), tap([d[0], 1.25])]).reason, 'missing-stroke');
  assert.equal(copyI([lineOf(I), tap([d[0] + 0.45, d[1]])]).reason, 'missing-stroke');
  // A little off, as a child puts it, still counts.
  assert.equal(copyI([lineOf(I), tap([d[0] + 0.1, d[1] + 0.08])]).ok, true);
  assert.ok(COPY_MATCH.dotRadius >= 0.2);
});

test('the dot never changes her letter\'s size or shape: they are judged on her lines alone', () => {
  const { lines, marks } = splitMarks([lineOf(I), tap(dotOf(I))], I);
  assert.equal(lines.length, 1);
  assert.equal(marks.length, 1);
  // The model's box is its stick only.
  const box = refBox(I);
  assert.deepEqual([box.y0, box.y1], [0.5, 1]);
  // A capital-sized i (twice as tall) is too big, dot or no dot.
  const big = scale([lineOf(I), tap(dotOf(I))], 2, [lineOf(I)[0][0], 1]);
  assert.equal(copyI(big).reason, 'too-big');
});

test('a tiny i keeps its stick as a line: a mark is a dot only if it is much shorter than her longest stroke', () => {
  const small = [[[0.5, 0.8], [0.5, 0.95]]]; // a 0.15 stick, shorter than DOT_MAX
  assert.equal(splitMarks(small, I).lines.length, 1);
  // Letters with no dot keep every stroke as a line.
  assert.equal(splitMarks([tap([0, 0])], load('l')).marks.length, 0);
  assert.equal(dotsOf(load('l')).length, 0);
});

test('only the stick so far: not judged yet; after a wait Jugnu shows the dot as the hint', () => {
  const s = copyStatus([lineOf(I)], I);
  assert.equal(s.action, 'hint');
  assert.equal(planStrokes(I, s.plan)[s.next].kind, 'dot');
  const both = copyStatus([lineOf(I), tap(dotOf(I))], I);
  assert.equal(both.action, 'judge-now');
});

test('the fading helper\'s ghost (level 1) shows the dot too, as a tiny dotted circle', () => {
  const m = copyHelperMarks(I, 1);
  assert.equal(m.ghost.length, 2);
  assert.deepEqual(m.ghost[1], markPath([dotOf(I)]));
  assert.deepEqual(m.dots[0].at, lineOf(I)[0]);
  // Level 2: a numbered start dot on the dot, once the stick is drawn.
  assert.deepEqual(copyHelperMarks(I, 2, [true, false]).dots, [{ at: dotOf(I), label: 2 }]);
});

test('the copy-round wobble test: a shaky stick and an off-centre tap still pass', () => {
  const shaky = resample(lineOf(I), 30).map(([x, y], k) => [x + 0.015 * Math.sin(k), y]);
  const d = dotOf(I);
  assert.equal(copyI([shaky, tap([d[0] - 0.05, d[1] + 0.05])]).ok, true);
});
