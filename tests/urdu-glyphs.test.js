// Slice 10A: the Urdu sample letters (data/glyphs.js URDU_GLYPHS), the curve
// piece they are drawn with, their character format, and the Urdu font.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { URDU_GLYPHS, URDU_FONT, MARGIN, curvePoints, plansOf, GLYPHS } from '../data/glyphs.js';
import { URDU } from '../src/session.js';
import { strokePath, glyphCharacter, cornerIndexes } from '../src/glyph-points.js';
import { scoreStroke, resample, dist } from '../src/geometry.js';
import { scoreMark } from '../src/variants.js';

const LINE_Y = { sky: 0, fence: 0.5, grass: 1, tail: 1.5 };
const isDot = (s) => s.kind === 'dot';
const SAMPLES = ['ur-alif', 'ur-be', 'ur-jeem', 'ur-dal', 'ur-ain', 'ur-bari-ye'];
const file = (rel) => new URL(`../${rel}`, import.meta.url);
const path = (id, k = 0) => strokePath(URDU_GLYPHS[id].strokes[k]);
const first = (pts) => pts[0];
const last = (pts) => pts[pts.length - 1];

// A small sideways wobble, as a child's tracing has (tests/glyphs.test.js).
function wobbly(points, amount = 0.03) {
  const pts = resample(points, Math.max(40, points.length));
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const w = amount * Math.sin(i * 0.9);
    return [p[0] - ((b[1] - a[1]) / len) * w, p[1] + ((b[0] - a[0]) / len) * w];
  });
}

// ---- the curve piece ----

test('a curve passes through every one of its points, in order', () => {
  const pts = [[0, 0], [0.3, 0.2], [0.5, 0.6], [0.2, 1]];
  const c = curvePoints(pts);
  let from = 0;
  for (const p of pts) {
    const i = c.findIndex((q, j) => j >= from && dist(p, q) < 1e-9);
    assert.ok(i >= 0, `passes ${p}`);
    from = i;
  }
  assert.deepEqual(c[0], pts[0]);
  assert.deepEqual(last(c), last(pts));
});

test('a curve through points on a straight line is that straight line', () => {
  for (const [x, y] of curvePoints([[0, 0], [0.2, 0.4], [0.5, 1]])) assert.ok(Math.abs(y - 2 * x) < 1e-9);
});

test('inside a curve there is never a corner; a corner is only where two pieces meet', () => {
  for (const id of SAMPLES) {
    for (const plan of plansOf(URDU_GLYPHS[id])) {
      for (const s of plan.filter((st) => !isDot(st))) {
        for (const p of s.pieces.filter((q) => q.type === 'curve')) {
          assert.deepEqual(cornerIndexes(curvePoints(p.points)), [], `${id} ${s.part}`);
        }
      }
    }
  }
});

test('the corners are the ones agreed: the tip of ج\'s head, ع\'s arm and the foot of ے', () => {
  const corners = Object.fromEntries(SAMPLES.map((id) => [id, cornerIndexes(path(id)).length]));
  assert.deepEqual(corners, { 'ur-alif': 0, 'ur-be': 0, 'ur-jeem': 1, 'ur-dal': 0, 'ur-ain': 1, 'ur-bari-ye': 1 });
});

// ---- the six samples ----

test('the six sample letters, and only those, with their letters from the Urdu board', () => {
  assert.deepEqual(Object.keys(URDU_GLYPHS), SAMPLES);
  const board = Object.fromEntries(URDU.map((t) => [t.id, t.glyph]));
  for (const id of SAMPLES) assert.equal(URDU_GLYPHS[id].letter, board[id], id);
});

test('the Urdu samples are not in the app yet: no GLYPHS entry, no character file', () => {
  for (const id of SAMPLES) {
    assert.equal(GLYPHS[id], undefined, id);
    assert.equal(existsSync(file(`data/chars/${id}.json`)), false, id);
  }
});

test('each stroke\'s pieces join end to end, in every plan', () => {
  for (const id of SAMPLES) {
    for (const plan of plansOf(URDU_GLYPHS[id])) {
      for (const s of plan) assert.doesNotThrow(() => strokePath(s), `${id} ${s.part}`);
    }
  }
});

test('start and end points sit on the guide lines the definition names', () => {
  for (const id of SAMPLES) {
    URDU_GLYPHS[id].strokes.filter((s) => !isDot(s)).forEach((s) => {
      const pts = strokePath(s);
      if (s.from) assert.ok(Math.abs(first(pts)[1] - LINE_Y[s.from]) < 1e-6, `${id} starts on ${s.from}`);
      if (s.to) assert.ok(Math.abs(last(pts)[1] - LINE_Y[s.to]) < 1e-6, `${id} ends on ${s.to}`);
    });
  }
});

test('every letter\'s leftmost ink sits at the left margin, like every other character', () => {
  for (const id of SAMPLES) {
    const xs = URDU_GLYPHS[id].strokes.flatMap((s) => strokePath(s).map(([x]) => x));
    assert.ok(Math.abs(Math.min(...xs) - MARGIN) < 1e-9, id);
  }
});

test('every stroke of every plan has a short part name', () => {
  for (const id of SAMPLES) {
    for (const plan of plansOf(URDU_GLYPHS[id])) {
      for (const s of plan) assert.ok(typeof s.part === 'string' && s.part.length > 0 && s.part.length <= 16, `${id} ${s.part}`);
    }
  }
});

test('the stroke plans are the agreed ones: body first, then dots; ج and ع also head, then tail', () => {
  const parts = Object.fromEntries(SAMPLES.map((id) => [id, plansOf(URDU_GLYPHS[id]).map((p) => p.map((s) => s.part).join(' + '))]));
  assert.deepEqual(parts, {
    'ur-alif': ['alif'],
    'ur-be': ['body + dot'],
    'ur-jeem': ['head and tail + dot', 'head + tail + dot'],
    'ur-dal': ['body'],
    'ur-ain': ['head and tail', 'head + tail'],
    'ur-bari-ye': ['body'],
  });
});

test('every plan has the same shape as the default', () => {
  for (const id of SAMPLES) {
    const [def, ...others] = plansOf(URDU_GLYPHS[id]).map((p) => p.map(strokePath).flat());
    for (const other of others) {
      assert.equal(other.length, def.length + 1, id); // the head's tip appears twice: it ends one stroke and starts the next
      for (const p of other) assert.ok(def.some((q) => dist(p, q) < 1e-9), id);
    }
  }
});

// Where each stroke starts and which way it runs (Urdu: right to left, except the head of ج).
test('alif runs from the sky line straight down to the grass line', () => {
  const pts = path('ur-alif');
  assert.deepEqual([first(pts)[1], last(pts)[1]], [0, 1]);
  assert.equal(first(pts)[0], last(pts)[0]);
});

test('ب, د and ع start at their right and end at their left', () => {
  for (const id of ['ur-be', 'ur-dal', 'ur-ain']) {
    const pts = path(id);
    assert.ok(first(pts)[0] > last(pts)[0] || id === 'ur-ain', id);
    if (id !== 'ur-ain') assert.ok(first(pts)[0] - last(pts)[0] > 0.2, id);
  }
  // ب starts at its right tip, the rightmost point of the letter.
  const be = path('ur-be');
  assert.ok(first(be)[0] >= Math.max(...be.map(([x]) => x)) - 0.04);
  // ع starts at its head's top right and runs left first.
  const ain = path('ur-ain');
  assert.ok(ain[5][0] < first(ain)[0]);
});

test('ج\'s head runs left to right, then the tail turns back to the left and ends at the right, below the grass', () => {
  const head = strokePath(plansOf(URDU_GLYPHS['ur-jeem'])[1][0]);
  const tail = strokePath(plansOf(URDU_GLYPHS['ur-jeem'])[1][1]);
  assert.ok(last(head)[0] - first(head)[0] > 0.5);
  assert.ok(tail[5][0] < first(tail)[0]);
  assert.ok(last(tail)[1] > 1.2 && last(tail)[0] > 0.7);
});

test('ے runs down to the left, then sweeps back to the right', () => {
  const pts = path('ur-bari-ye');
  const leftmost = pts.reduce((a, p) => (p[0] < a[0] ? p : a));
  assert.ok(first(pts)[0] - leftmost[0] > 0.3);
  assert.ok(last(pts)[0] - leftmost[0] > 0.9);
});

// ---- the four lines ----

test('where the letters sit on the lines: alif tall, ج and ع below the grass, the others on it', () => {
  const ys = (id) => URDU_GLYPHS[id].strokes.filter((s) => !isDot(s)).flatMap((s) => strokePath(s).map(([, y]) => y));
  for (const id of ['ur-jeem', 'ur-ain']) {
    assert.ok(Math.max(...ys(id)) > 1.3 && Math.max(...ys(id)) < 1.5, `${id}: its tail ends just above the tail line`);
    assert.ok(Math.min(...ys(id)) > 0.25 && Math.min(...ys(id)) < 0.55, `${id}: its head is near the fence`);
  }
  for (const id of ['ur-be', 'ur-dal', 'ur-bari-ye']) {
    assert.ok(Math.max(...ys(id)) <= 1 && Math.max(...ys(id)) > 0.9, `${id}: sits on the grass line`);
    assert.ok(Math.min(...ys(id)) > 0.35, `${id}: no higher than just above the fence`);
  }
});

test('ب\'s dot sits below the grass line, under the body; ج\'s dot sits inside its tail, on the grass line', () => {
  const at = (id) => URDU_GLYPHS[id].strokes.find(isDot).at;
  const be = path('ur-be');
  const [bx, by] = at('ur-be');
  assert.ok(by > 1.1 && by < 1.35);
  assert.ok(bx > Math.min(...be.map(([x]) => x)) && bx < Math.max(...be.map(([x]) => x)));
  const tail = strokePath(plansOf(URDU_GLYPHS['ur-jeem'])[1][1]);
  const [jx, jy] = at('ur-jeem');
  assert.equal(jy, 1);
  assert.ok(jx > Math.min(...tail.map(([x]) => x)) + 0.2 && jx < Math.max(...tail.map(([x]) => x)));
});

// ---- tracing them ----

test('tracing each sample stroke with a small wobble passes at stages 1, 2 and 3; a tap on a dot counts', () => {
  for (const id of SAMPLES) {
    const char = glyphCharacter(id, URDU_GLYPHS[id]);
    for (const plan of [char.strokes, ...(char.plans ?? []).map((p) => p.strokes)]) {
      for (const s of plan) {
        for (const stage of [1, 2, 3]) {
          const r = isDot(s) ? scoreMark([[s.points[0][0] + 0.02, s.points[0][1]]], s.points, stage) : scoreStroke(wobbly(s.points), s.points, stage);
          assert.ok(r.ok, `${id} ${s.part} stage ${stage}: ${r.reason}`);
        }
      }
    }
  }
});

test('tracing a sample stroke backwards fails as wrong-direction', () => {
  for (const id of SAMPLES) {
    for (const s of glyphCharacter(id, URDU_GLYPHS[id]).strokes.filter((st) => !isDot(st))) {
      const r = scoreStroke(wobbly([...s.points].reverse()), s.points, 2);
      assert.equal(r.reason, 'wrong-direction', `${id} ${s.part}`);
    }
  }
});

// ---- the character format ----

test('an Urdu character file: script urdu, the letter, right to left, no case', () => {
  const char = glyphCharacter('ur-be', URDU_GLYPHS['ur-be']);
  assert.deepEqual(Object.keys(char), ['id', 'script', 'letter', 'family', 'direction', 'width', 'strokes']);
  assert.equal(char.script, 'urdu');
  assert.equal(char.letter, 'ب');
  assert.equal(char.direction, 'rtl');
  assert.equal(char.family, 'curved');
  assert.equal(glyphCharacter('ur-alif', URDU_GLYPHS['ur-alif']).family, 'straight');
  assert.deepEqual(char.strokes.map((s) => s.kind), ['line', 'dot']);
  assert.deepEqual(Object.keys(glyphCharacter('ur-jeem', URDU_GLYPHS['ur-jeem'])).slice(-2), ['strokes', 'plans']);
});

// ---- the font ----

test('the font size makes the font\'s alif run from the sky line to the grass line', () => {
  assert.equal(URDU_FONT.size, 1000 / 671);
  assert.equal(URDU_FONT.baseline, 1);
});

test('Noto Naskh Arabic is served from assets/fonts/ only, with its licence', () => {
  for (const f of ['noto-naskh-arabic-arabic-400-normal.woff2', 'noto-naskh-arabic-arabic-700-normal.woff2', 'OFL-noto-naskh-arabic.txt']) {
    assert.ok(existsSync(file(`assets/fonts/${f}`)), f);
  }
  assert.match(readFileSync(file('assets/fonts/OFL-noto-naskh-arabic.txt'), 'utf8'), /SIL Open Font License, Version 1\.1/);
  assert.match(readFileSync(file('assets/fonts/README.md'), 'utf8'), /noto-naskh-arabic/);
  for (const page of ['index.html', 'glyphs.html']) {
    const html = readFileSync(file(page), 'utf8');
    const faces = html.match(/@font-face\s*{[^}]*Noto Naskh Arabic[^}]*}/g) ?? [];
    assert.equal(faces.length, 1, page);
    assert.match(faces[0], /url\('assets\/fonts\/noto-naskh-arabic-arabic-[47]00-normal\.woff2'\)/, page);
    assert.doesNotMatch(html, /fonts\.googleapis|https?:\/\/[^'"\s]*\.woff/, page);
  }
});
