// Run: node --test tests/recording.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STROKE_POINTS, round3, isTooShort, processStroke, tapToDot, straighten, charWidth,
  buildCharacter, exportBundle,
} from '../src/recording.js';

// A wobbly hand-drawn stroke from a to b.
function wobbly(a, b, steps = 50, wobble = 0.01) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = i % 2 === 0 ? wobble : -wobble;
    pts.push([a[0] + t * (b[0] - a[0]) + w, a[1] + t * (b[1] - a[1])]);
  }
  pts[0] = [...a];
  pts[steps] = [...b];
  return pts;
}

const decimals = (v) => (String(v).split('.')[1] || '').length;

test('round3 rounds to 3 decimals and never gives -0', () => {
  assert.equal(round3(0.12345), 0.123);
  assert.equal(round3(0.9996), 1);
  assert.ok(Object.is(round3(-0.0001), 0));
});

test('processStroke resamples to 24 points, keeps the ends, rounds to 3 decimals', () => {
  const out = processStroke(wobbly([0.1234567, 0.0001], [0.1, 0.987654]));
  assert.equal(out.length, STROKE_POINTS);
  assert.deepEqual(out[0], [0.123, 0]);
  assert.deepEqual(out[out.length - 1], [0.1, 0.988]);
  for (const [x, y] of out) {
    assert.ok(decimals(x) <= 3 && decimals(y) <= 3, `${x}, ${y}`);
  }
});

test('processStroke works for a stroke with only two points', () => {
  const out = processStroke([[0, 0], [0, 1]]);
  assert.equal(out.length, STROKE_POINTS);
  assert.deepEqual(out[12], [0, round3(12 / 23)]);
});

test('isTooShort: taps and tiny strokes are too short, real strokes are not', () => {
  assert.equal(isTooShort([[0.1, 0.1]]), true);
  assert.equal(isTooShort([[0.1, 0.1], [0.11, 0.11]]), true);
  assert.equal(isTooShort([[0.1, 0], [0.1, 1]]), false);
});

test('tapToDot gives one rounded point at the middle of the tap', () => {
  assert.deepEqual(tapToDot([[0.5, 0.6]]), [[0.5, 0.6]]);
  assert.deepEqual(tapToDot([[0.49, 0.6], [0.51, 0.6], [0.5, 0.6111]]), [[0.5, 0.604]]);
});

test('straighten snaps a nearly vertical stroke to exactly vertical, keeping the start', () => {
  const out = straighten(wobbly([0.1, 0], [0.2, 1], 30, 0.03)); // about 5.7 degrees off vertical
  assert.equal(out.length, STROKE_POINTS);
  assert.deepEqual(out[0], [0.1, 0]);
  assert.deepEqual(out[out.length - 1], [0.1, 1]);
  for (const p of out) assert.equal(p[0], 0.1);
});

test('straighten snaps a nearly horizontal stroke to exactly horizontal', () => {
  const out = straighten([[0.1, 1], [0.3, 1.05], [0.65, 1.08]]); // about 8.3 degrees off horizontal
  assert.deepEqual(out[0], [0.1, 1]);
  assert.deepEqual(out[out.length - 1], [0.65, 1]);
  for (const p of out) assert.equal(p[1], 1);
});

test('straighten leaves a diagonal stroke diagonal, as a straight line', () => {
  const out = straighten([[0, 0], [0.2, 0.9], [0.5, 1]]); // about 27 degrees off vertical
  assert.deepEqual(out[0], [0, 0]);
  assert.deepEqual(out[out.length - 1], [0.5, 1]);
  for (const [x, y] of out) assert.ok(Math.abs(y - 2 * x) <= 0.002, `${x}, ${y}`);
});

test('straighten snaps at exactly 10 degrees but not at 11', () => {
  const at = (deg) => [Math.tan((deg * Math.PI) / 180), 1];
  assert.equal(straighten([[0, 0], at(9.99)]).at(-1)[0], 0);
  assert.notEqual(straighten([[0, 0], at(11)]).at(-1)[0], 0);
});

test('charWidth is rightmost x plus leftmost x', () => {
  const strokes = [
    { kind: 'line', points: [[0.1, 0], [0.1, 1]] },
    { kind: 'line', points: [[0.1, 1], [0.65, 1]] },
  ];
  assert.equal(charWidth(strokes), 0.75);
  assert.equal(charWidth([]), 0);
});

test('buildCharacter for a letter matches the L.example.json fields', () => {
  const strokes = [
    { kind: 'line', points: [[0.1, 0], [0.1, 1]] },
    { kind: 'line', points: [[0.1, 1], [0.65, 1]] },
  ];
  const c = buildCharacter('L', strokes);
  assert.deepEqual(Object.keys(c), ['id', 'script', 'case', 'family', 'direction', 'width', 'strokes']);
  assert.deepEqual(c, {
    id: 'L', script: 'latin', case: 'upper', family: 'straight', direction: 'ltr', width: 0.75, strokes,
  });
});

test('buildCharacter for a number has script digit and no case', () => {
  const c = buildCharacter('7', [{ kind: 'line', points: [[0.1, 0], [0.6, 0], [0.3, 1]] }], 'ltr');
  assert.equal(c.script, 'digit');
  assert.equal('case' in c, false);
  assert.equal(c.family, 'straight');
});

test('buildCharacter keeps dot strokes and the chosen direction, and rounds points', () => {
  const c = buildCharacter('I', [{ kind: 'dot', points: [[0.12345, 0.5]] }], 'rtl');
  assert.equal(c.direction, 'rtl');
  assert.deepEqual(c.strokes, [{ kind: 'dot', points: [[0.123, 0.5]] }]);
});

test('exportBundle lists saved characters by id in teaching order', () => {
  const saved = { 7: { id: '7' }, E: { id: 'E' }, L: { id: 'L' } };
  const bundle = JSON.parse(exportBundle(saved));
  assert.deepEqual(Object.keys(bundle).sort(), ['7', 'E', 'L']);
  assert.deepEqual(bundle.E, { id: 'E' });
  assert.equal(exportBundle({}), '{}');
});

test('exportBundle keeps each point on one line', () => {
  const text = exportBundle({ L: { id: 'L', strokes: [{ kind: 'line', points: [[0.1, 0], [-0.05, 1.25]] }] } });
  assert.match(text, /\[0\.1, 0\]/);
  assert.match(text, /\[-0\.05, 1\.25\]/);
  assert.deepEqual(JSON.parse(text).L.strokes[0].points, [[0.1, 0], [-0.05, 1.25]]);
});
