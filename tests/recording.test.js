// Run: node --test tests/recording.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STROKE_POINTS, round3, isTooShort, processStroke, tapToDot, straighten, charWidth,
  buildCharacter, exportBundle, chaikin, smooth, joinGap, strokeCountWarnings, CHAR_IDS, CHAR_GROUPS,
} from '../src/recording.js';
import { JOIN_GAP } from '../src/variants.js';

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

test('straighten snaps at 15 degrees but not at 16', () => {
  const at = (deg) => [Math.tan((deg * Math.PI) / 180), 1];
  assert.equal(straighten([[0, 0], at(14.99)]).at(-1)[0], 0);
  assert.notEqual(straighten([[0, 0], at(16)]).at(-1)[0], 0);
});

test('straighten: 12 degrees off vertical (beyond the old 10-degree limit) now snaps', () => {
  const out = straighten([[0.1, 0], [0.1 + Math.tan((12 * Math.PI) / 180), 1]]);
  for (const p of out) assert.equal(p[0], 0.1);
});

test('straighten: vertical stroke ends snap to the sky and grass lines when within 0.15', () => {
  const out = straighten([[0.1, 0.14], [0.12, 0.86]]);
  assert.deepEqual(out[0], [0.1, 0]);
  assert.deepEqual(out.at(-1), [0.1, 1]);
  const up = straighten([[0.3, 1.1], [0.3, -0.12]]); // drawn bottom-up, overshooting both lines
  assert.deepEqual(up[0], [0.3, 1]);
  assert.deepEqual(up.at(-1), [0.3, 0]);
});

test('straighten: a vertical stroke end further than 0.15 from a line stays put', () => {
  const out = straighten([[0.1, 0.2], [0.1, 0.95]]); // start 0.2 below sky, end 0.05 above grass
  assert.deepEqual(out[0], [0.1, 0.2]);
  assert.deepEqual(out.at(-1), [0.1, 1]);
  const mid = straighten([[0.2, 0.5], [0.2, 1.3]]); // fence to ground: neither end is near sky or grass
  assert.deepEqual(mid[0], [0.2, 0.5]);
  assert.deepEqual(mid.at(-1), [0.2, 1.3]);
});

test('straighten: a short vertical stroke is not squashed onto one line', () => {
  const out = straighten([[0.1, -0.1], [0.1, 0.12]]); // both ends are near the sky line
  assert.deepEqual(out[0], [0.1, -0.1]);
  assert.deepEqual(out.at(-1), [0.1, 0.12]);
});

test('straighten: a horizontal stroke snaps to the sky, fence or grass line when within 0.12', () => {
  for (const [y0, y1, line] of [[0.1, 0.08, 0], [0.42, 0.45, 0.5], [0.6, 0.58, 0.5], [1.11, 1.1, 1]]) {
    const out = straighten([[0.1, y0], [0.6, y1]]);
    assert.deepEqual(out[0], [0.1, line], `from y ${y0}`);
    assert.deepEqual(out.at(-1), [0.6, line], `from y ${y0}`);
  }
});

test('straighten: a slanted bar snaps by the average y of its ends, not its start', () => {
  // Start 0.36 is 0.14 from the fence; the average (0.36 + 0.56) / 2 = 0.46 is within 0.12. About 14 degrees.
  const out = straighten([[0.1, 0.36], [0.9, 0.56]]);
  assert.deepEqual(out[0], [0.1, 0.5]);
  assert.deepEqual(out.at(-1), [0.9, 0.5]);
  for (const p of out) assert.equal(p[1], 0.5);
});

test('straighten: a horizontal stroke further than 0.12 from every line keeps its start y', () => {
  const out = straighten([[0.1, 0.25], [0.6, 0.27]]); // average 0.26: 0.24 from fence, 0.26 from sky
  assert.deepEqual(out[0], [0.1, 0.25]);
  assert.deepEqual(out.at(-1), [0.6, 0.25]);
});

test('straighten: a diagonal stroke is not moved onto the lines', () => {
  const out = straighten([[0.1, 0.1], [0.6, 0.9]]); // about 32 degrees from vertical
  assert.deepEqual(out[0], [0.1, 0.1]);
  assert.deepEqual(out.at(-1), [0.6, 0.9]);
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


// ---- Picker ----

test('the picker offers A to Z, 0 to 9 and a to z (Slice 9A), each once', () => {
  assert.deepEqual(CHAR_GROUPS.map((g) => g.name), ['Capitals', 'Digits', 'Lowercase']);
  assert.equal(CHAR_IDS.length, 62);
  assert.equal(new Set(CHAR_IDS).size, 62);
  assert.equal(CHAR_IDS.join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz');
});

test('a lowercase letter is saved with case "lower"', () => {
  assert.equal(buildCharacter('a', [{ kind: 'line', points: [[0.1, 0.5], [0.1, 1]] }]).case, 'lower');
  assert.equal(buildCharacter('A', [{ kind: 'line', points: [[0.1, 0], [0.1, 1]] }]).case, 'upper');
});

// ---- Smooth ----

// Shortest distance from p to the polyline pts.
function distToPolyline(p, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / len2));
    best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  return best;
}

// A recorded-looking arc (half a circle, like the bowl of a U) with a small hand wobble.
function wobblyArc(wobble = 0.01) {
  const raw = [];
  for (let i = 0; i <= 60; i++) {
    const a = Math.PI - (Math.PI * i) / 60;
    const r = 0.35 + (i % 2 === 0 ? wobble : -wobble);
    raw.push([0.4 + r * Math.cos(a), 0.6 + r * Math.sin(a)]);
  }
  return processStroke(raw);
}

const maxPairDistance = (a, b) => Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1])));

test('chaikin keeps the first and last points and cuts each corner', () => {
  assert.deepEqual(chaikin([[0, 0], [1, 0], [1, 1]]), [[0, 0], [0.25, 0], [0.75, 0], [1, 0.25], [1, 0.75], [1, 1]]);
  assert.deepEqual(chaikin([[0, 0], [1, 0]]), [[0, 0], [1, 0]]);
});

test('smooth: the endpoints do not move', () => {
  const arc = wobblyArc();
  const out = smooth(arc);
  assert.equal(out.length, STROKE_POINTS);
  assert.deepEqual(out[0], arc[0]);
  assert.deepEqual(out[out.length - 1], arc[arc.length - 1]);
});

test('smooth: a straight line stays straight', () => {
  const line = processStroke([[0.1, 0.1], [0.6, 0.9]]);
  const out = smooth(line);
  for (const p of out) assert.ok(distToPolyline(p, [[0.1, 0.1], [0.6, 0.9]]) < 0.001, `${p}`);
  assert.deepEqual(out[0], [0.1, 0.1]);
  assert.deepEqual(out[out.length - 1], [0.6, 0.9]);
});

test('smooth: same point count and even spacing as other strokes', () => {
  const out = smooth(wobblyArc());
  assert.equal(out.length, STROKE_POINTS);
  const gaps = out.slice(1).map((p, i) => Math.hypot(p[0] - out[i][0], p[1] - out[i][1]));
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  for (const g of gaps) assert.ok(Math.abs(g - mean) < 0.01, `gap ${g} vs ${mean}`);
  for (const p of out) for (const v of p) assert.ok(decimals(v) <= 3);
});

test('smooth: a wobbly arc stays within 0.03 line units of the original', () => {
  const arc = wobblyArc();
  const out = smooth(arc);
  for (const p of out) assert.ok(distToPolyline(p, arc) <= 0.03, `${p} is ${distToPolyline(p, arc)} away`);
});

test('smooth: smoothing twice changes it by less than 0.01', () => {
  const once = smooth(wobblyArc());
  const twice = smooth(once);
  assert.ok(maxPairDistance(once, twice) < 0.01, `moved ${maxPairDistance(once, twice)}`);
});

// ---- Join check ----

test('joinGap: gap from the end of stroke k to the start of stroke k + 1', () => {
  const line = (a, b) => ({ kind: 'line', points: processStroke([a, b]) });
  const strokes = [line([0, 0], [0, 1]), line([0.05, 1], [0.6, 1]), line([0.1, 0], [0.6, 0]), { kind: 'dot', points: [[0.3, 0.3]] }];
  assert.deepEqual(joinGap(strokes, 0), { gap: 0.05, joins: true });       // the corner of an L
  assert.deepEqual(joinGap(strokes, 1), { gap: 1.118, joins: false });
  assert.equal(joinGap(strokes, 2), null);                                   // next is a dot
  assert.equal(joinGap(strokes, 3), null);                                   // no next stroke
  const edge = [line([0, 0], [0, 1]), line([JOIN_GAP, 1], [0.6, 1])];
  assert.equal(joinGap(edge, 0).joins, true);                                // exactly the limit joins
});

// ---- Stroke-count warning ----

test('strokeCountWarnings lists characters whose stroke count differs from the guide', () => {
  const ch = (id, n) => ({ id, strokes: Array.from({ length: n }, () => ({ kind: 'line', points: [] })) });
  const saved = { E: ch('E', 4), A: ch('A', 2), '8': ch('8', 1), B: ch('B', 3) };
  assert.deepEqual(strokeCountWarnings(saved), [
    { id: 'A', recorded: 2, expected: 3 },
    { id: 'B', recorded: 3, expected: 2 },
  ]);
  assert.deepEqual(strokeCountWarnings({}), []);
});

test('buildCharacter takes its family from the stroke-order list', () => {
  const strokes = [{ kind: 'line', points: [[0, 0], [0, 1]] }];
  assert.equal(buildCharacter('O', strokes).family, 'curved');
  assert.equal(buildCharacter('B', strokes).family, 'mixed');
  assert.equal(buildCharacter('8', strokes).family, 'curved');
  assert.equal(buildCharacter('A', strokes).family, 'straight');
});

test('exportBundle puts any number of characters in picker order', () => {
  const saved = {};
  for (const id of ['7', 'Z', '0', 'A', 'M']) saved[id] = buildCharacter(id, [{ kind: 'line', points: [[0, 0], [0, 1]] }]);
  // Read the order from the text: JSON.parse would put number keys first.
  const order = [...exportBundle(saved).matchAll(/^  "(.)": \{/gm)].map((m) => m[1]);
  assert.deepEqual(order, ['A', 'M', 'Z', '0', '7']);
});
