// Slice 10A and 10B: the Urdu letters (data/glyphs.js URDU_GLYPHS), the curve
// piece and the small marks they are drawn with, their character format, and the Urdu font.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { URDU_GLYPHS, URDU_FONT, MARGIN, curvePoints, plansOf, GLYPHS } from '../data/glyphs.js';
import { STROKE_ORDER } from '../data/stroke-order.js';
import { URDU } from '../src/session.js';
import { strokePath, glyphCharacter, cornerIndexes, characterText } from '../src/glyph-points.js';
import { scoreStroke, scoreDot, resample, dist } from '../src/geometry.js';
import { scoreMark } from '../src/variants.js';

const LINE_Y = { sky: 0, fence: 0.5, grass: 1, tail: 1.5 };
const isDot = (s) => s.kind === 'dot';
const isMark = (s) => s.kind === 'mark';
const isLine = (s) => !s.kind; // a body stroke (dots and marks carry their kind)
const IDS = URDU.map((t) => t.id);
const file = (rel) => new URL(`../${rel}`, import.meta.url);
const G = (id) => URDU_GLYPHS[id];
const first = (pts) => pts[0];
const last = (pts) => pts[pts.length - 1];
const plan = (id, p) => plansOf(G(id))[p];
const bodyPoints = (id) => G(id).strokes.filter(isLine).flatMap(strokePath);
const middle = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

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

test('a curve cut in two (before, after) is the same curve as the whole, with no corner at the cut', () => {
  const pts = [[0, 0], [0.3, 0.1], [0.5, 0.4], [0.45, 0.8], [0.2, 1]];
  const whole = curvePoints(pts);
  const a = curvePoints(pts.slice(0, 3), 120, null, pts[3]);
  const b = curvePoints(pts.slice(2), 120, pts[1], null);
  assert.deepEqual([...a, ...b.slice(1)], whole);
  assert.deepEqual(cornerIndexes([...a, ...b.slice(1)]), []);
});

test('inside a curve there is never a corner', () => {
  for (const id of IDS) {
    for (const p of plansOf(G(id))) {
      for (const s of p.filter((st) => !isDot(st))) {
        for (const piece of s.pieces.filter((q) => q.type === 'curve')) {
          assert.deepEqual(cornerIndexes(curvePoints(piece.points, 120, piece.before, piece.after)), [], `${id} ${s.part}`);
        }
      }
    }
  }
});

test('the only corners are the agreed ones: head tips, tooth tips, ع\'s arm, ک\'s slant, م\'s head, ھ\'s eye, ء\'s head, ے\'s foot', () => {
  const corners = Object.fromEntries(IDS.map((id) => [id, G(id).strokes.filter(isLine).map((s) => cornerIndexes(strokePath(s)).length).reduce((a, b) => a + b, 0)]));
  const want = Object.fromEntries(IDS.map((id) => [id, 0]));
  for (const id of ['ur-jeem', 'ur-che', 'ur-bari-he', 'ur-khe', 'ur-ain', 'ur-ghain', 'ur-kaf', 'ur-gaf', 'ur-meem', 'ur-do-chashmi-he', 'ur-hamza', 'ur-bari-ye']) want[id] = 1;
  for (const id of ['ur-suad', 'ur-zuad']) want[id] = 2; // up to the tooth's tip, and down from it
  for (const id of ['ur-seen', 'ur-sheen']) want[id] = 4; // up to each of two teeth's tips, and down from it
  assert.deepEqual(corners, want);
});

// ---- the letters ----

test('all 39 letters of the Urdu board, in qaida order, each with its letter', () => {
  assert.deepEqual(Object.keys(URDU_GLYPHS), IDS);
  assert.equal(IDS.length, 39);
  for (const t of URDU) assert.equal(G(t.id).letter, t.glyph, t.id);
});

test('the Urdu letters are in the app (Slice 10D): in GLYPHS, each with its file, up to date (npm run glyphs)', () => {
  for (const id of IDS) {
    assert.equal(GLYPHS[id], URDU_GLYPHS[id], id);
    assert.ok(existsSync(file(`data/chars/${id}.json`)), id);
    assert.equal(readFileSync(file(`data/chars/${id}.json`), 'utf8'), characterText(glyphCharacter(id, G(id))), id);
  }
});

test('each stroke\'s pieces join end to end, in every plan', () => {
  for (const id of IDS) for (const p of plansOf(G(id))) for (const s of p) assert.doesNotThrow(() => strokePath(s), `${id} ${s.part}`);
});

test('start and end points sit on the guide lines the definition names', () => {
  for (const id of IDS) {
    G(id).strokes.filter(isLine).forEach((s) => {
      const pts = strokePath(s);
      if (s.from) assert.ok(Math.abs(first(pts)[1] - LINE_Y[s.from]) < 1e-6, `${id} starts on ${s.from}`);
      if (s.to) assert.ok(Math.abs(last(pts)[1] - LINE_Y[s.to]) < 1e-6, `${id} ends on ${s.to}`);
    });
  }
});

test('every letter\'s leftmost ink sits at the left margin, like every other character', () => {
  for (const id of IDS) {
    const xs = G(id).strokes.flatMap((s) => strokePath(s).map(([x]) => x));
    assert.ok(Math.abs(Math.min(...xs) - MARGIN) < 1e-9, id);
  }
});

test('every stroke of every plan has a short part name', () => {
  for (const id of IDS) {
    for (const p of plansOf(G(id))) for (const s of p) assert.ok(typeof s.part === 'string' && s.part.length > 0 && s.part.length <= 16, `${id} ${s.part}`);
  }
});

// The approved table (Slice 10B): the body first (in one go, or in the natural
// alternative), then the dots and marks.
const DOT = 'dot';
const PLANS = {
  'ur-alif-madd': [['alif', 'madd']],
  'ur-alif': [['alif']],
  'ur-be': [['body', DOT]],
  'ur-pe': [['body', DOT, DOT, DOT]],
  'ur-te': [['body', DOT, DOT]],
  'ur-tte': [['body', 'small ṭ']],
  'ur-se': [['body', DOT, DOT, DOT]],
  'ur-jeem': [['head and tail', DOT], ['head', 'tail', DOT]],
  'ur-che': [['head and tail', DOT, DOT, DOT], ['head', 'tail', DOT, DOT, DOT]],
  'ur-bari-he': [['head and tail'], ['head', 'tail']],
  'ur-khe': [['head and tail', DOT], ['head', 'tail', DOT]],
  'ur-dal': [['body']],
  'ur-ddal': [['body', 'small ṭ']],
  'ur-zal': [['body', DOT]],
  'ur-re': [['body']],
  'ur-rre': [['body', 'small ṭ']],
  'ur-ze': [['body', DOT]],
  'ur-zhe': [['body', DOT, DOT, DOT]],
  'ur-seen': [['teeth and bowl'], ['teeth', 'bowl']],
  'ur-sheen': [['teeth and bowl', DOT, DOT, DOT], ['teeth', 'bowl', DOT, DOT, DOT]],
  'ur-suad': [['loop and bowl'], ['loop', 'tooth and bowl']],
  'ur-zuad': [['loop and bowl', DOT], ['loop', 'tooth and bowl', DOT]],
  'ur-toe': [['body', 'stem'], ['stem', 'body']],
  'ur-zoe': [['body', 'stem', DOT], ['stem', 'body', DOT]],
  'ur-ain': [['head and tail'], ['head', 'tail']],
  'ur-ghain': [['head and tail', DOT], ['head', 'tail', DOT]],
  'ur-fe': [['loop and body', DOT], ['loop', 'body', DOT]],
  'ur-qaf': [['loop and bowl', DOT, DOT], ['loop', 'bowl', DOT, DOT]],
  'ur-kaf': [['slant and body'], ['body', 'slant']],
  'ur-gaf': [['slant and body', 'top slant'], ['body', 'slant', 'top slant']],
  'ur-lam': [['body']],
  'ur-meem': [['head and tail'], ['head', 'tail']],
  'ur-noon': [['body', DOT]],
  'ur-wao': [['head and tail']],
  'ur-chhoti-he': [['loop']],
  'ur-do-chashmi-he': [['eyes and tail'], ['right eye', 'left eye, tail']],
  'ur-hamza': [['head and bar'], ['head', 'bar']],
  'ur-chhoti-ye': [['body']],
  'ur-bari-ye': [['body']],
};

test('the stroke plans are the approved ones: body first, then dots and marks', () => {
  const parts = Object.fromEntries(IDS.map((id) => [id, plansOf(G(id)).map((p) => p.map((s) => s.part))]));
  assert.deepEqual(parts, PLANS);
});

test('every plan has the same shape as the default, drawn from the same points', () => {
  const key = ([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`;
  for (const id of IDS) {
    const [def, ...others] = plansOf(G(id)).map((p) => new Set(p.flatMap(strokePath).map(key)));
    for (const other of others) assert.deepEqual([...other].sort(), [...def].sort(), id);
  }
});

test('every plan keeps the dots and marks after the body, in the same order', () => {
  for (const id of IDS) {
    const ps = plansOf(G(id));
    const tail = (p) => (p.some((s) => !isLine(s)) ? p.slice(p.findIndex((s) => !isLine(s))) : []);
    for (const p of ps) {
      const k = p.findIndex((s) => !isLine(s));
      if (k >= 0) assert.ok(p.slice(k).every((s) => !isLine(s)), `${id}: nothing of the body after a dot`);
      assert.deepEqual(tail(p).map((s) => s.at ?? s.part), tail(ps[0]).map((s) => s.at ?? s.part), id);
    }
  }
});

// ---- dots and marks: how many, and where (they tell the letters apart) ----

const DOTS = {
  'ur-be': [1, 'below'], 'ur-pe': [3, 'below'], 'ur-te': [2, 'above'], 'ur-se': [3, 'above'],
  'ur-jeem': [1, 'inside'], 'ur-che': [3, 'inside'], 'ur-khe': [1, 'above'],
  'ur-zal': [1, 'above'], 'ur-ze': [1, 'above'], 'ur-zhe': [3, 'above'], 'ur-sheen': [3, 'above'],
  'ur-zuad': [1, 'above'], 'ur-zoe': [1, 'above'], 'ur-ghain': [1, 'above'], 'ur-fe': [1, 'above'],
  'ur-qaf': [2, 'above'], 'ur-noon': [1, 'above'],
};
const MARKS = { 'ur-alif-madd': 'madd', 'ur-tte': 'small ṭ', 'ur-ddal': 'small ṭ', 'ur-rre': 'small ṭ' };

// Above: higher than all of the body near it; below: lower than all of it; inside: neither.
function whereIs([x, y], id) {
  const near = bodyPoints(id).filter((p) => Math.abs(p[0] - x) < 0.15).map((p) => p[1]);
  if (y < Math.min(...near)) return 'above';
  if (y > Math.max(...near)) return 'below';
  return 'inside';
}

test('each letter has the agreed number of dots, all above, below or inside', () => {
  for (const id of IDS) {
    const dots = G(id).strokes.filter(isDot);
    const [n, where] = DOTS[id] ?? [0, null];
    assert.equal(dots.length, n, `${id} dots`);
    for (const d of dots) assert.equal(whereIs(d.at, id), where, `${id} dot at ${d.at}`);
  }
});

test('the small marks: the little ṭ above ٹ ڈ ڑ and the madd above آ, and no others', () => {
  for (const id of IDS) {
    const marks = G(id).strokes.filter(isMark);
    assert.deepEqual(marks.map((m) => m.part), MARKS[id] ? [MARKS[id]] : [], id);
    for (const m of marks) assert.equal(whereIs(middle(strokePath(m)), id), 'above', id);
  }
});

test('a mark is small (a tap or tiny stroke does it), and the ṭ is the same mark on each letter', () => {
  const size = (m) => {
    const pts = strokePath(m);
    return Math.max(Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1])));
  };
  for (const id of Object.keys(MARKS)) assert.ok(size(G(id).strokes.find(isMark)) <= 0.4, id);
  const shape = (id) => {
    const pts = strokePath(G(id).strokes.find(isMark));
    return pts.map(([x, y]) => [x - pts[0][0], y - pts[0][1]].map((v) => v.toFixed(6)).join());
  };
  assert.deepEqual(shape('ur-ddal'), shape('ur-tte'));
  assert.deepEqual(shape('ur-rre'), shape('ur-tte'));
});

test('look-alikes that differ only in dots share one body, exactly', () => {
  const bodyOf = (id) => G(id).strokes.filter(isLine).map((s) => strokePath(s).map(([x, y]) => [x - G(id).fontX, y].map((v) => v.toFixed(6)).join()));
  for (const family of [
    ['ur-be', 'ur-pe', 'ur-te', 'ur-tte', 'ur-se'], ['ur-jeem', 'ur-che', 'ur-bari-he', 'ur-khe'],
    ['ur-dal', 'ur-ddal', 'ur-zal'], ['ur-re', 'ur-rre', 'ur-ze', 'ur-zhe'], ['ur-seen', 'ur-sheen'],
    ['ur-suad', 'ur-zuad'], ['ur-toe', 'ur-zoe'], ['ur-ain', 'ur-ghain'],
  ]) {
    for (const id of family.slice(1)) assert.deepEqual(bodyOf(id), bodyOf(family[0]), `${id} and ${family[0]}`);
  }
  // گ is ک with a second slant.
  assert.deepEqual(bodyOf('ur-gaf')[0], bodyOf('ur-kaf')[0]);
});

// ---- the four lines ----

test('where the letters sit on the lines', () => {
  const ys = (id) => bodyPoints(id).map(([, y]) => y);
  const top = (id) => Math.min(...ys(id));
  const bottom = (id) => Math.max(...ys(id));
  // Tall: from the sky line (ک گ a little below it, so گ's second slant fits; آ's alif lower, for its madd).
  for (const id of ['ur-alif', 'ur-toe', 'ur-zoe', 'ur-lam']) assert.ok(top(id) < 0.01, `${id} reaches the sky line`);
  for (const id of ['ur-kaf', 'ur-gaf']) assert.ok(top(id) >= 0 && top(id) <= 0.16, `${id} top`);
  for (const id of IDS) assert.ok(top(id) >= -1e-9, `${id}: nothing above the sky line`);
  for (const id of IDS) for (const s of G(id).strokes.filter((st) => !isLine(st))) {
    for (const [, y] of strokePath(s)) assert.ok(y >= -1e-9 && y <= 1.5, `${id}: its dots and marks stay between the sky and the tail line`);
  }
  // On the grass line.
  for (const id of ['ur-alif', 'ur-alif-madd', 'ur-be', 'ur-te', 'ur-dal', 'ur-toe', 'ur-fe', 'ur-kaf', 'ur-chhoti-he', 'ur-bari-ye']) {
    assert.ok(bottom(id) <= 1 + 1e-9 && bottom(id) > 0.9, `${id} sits on the grass line (${bottom(id)})`);
  }
  // Below the grass: the tails of ج and ع to just above the tail line, the rest a little higher.
  for (const id of ['ur-jeem', 'ur-ain']) assert.ok(bottom(id) > 1.35 && bottom(id) < 1.5, id);
  for (const id of ['ur-re', 'ur-seen', 'ur-suad', 'ur-qaf', 'ur-lam', 'ur-meem', 'ur-noon', 'ur-wao', 'ur-chhoti-ye']) {
    assert.ok(bottom(id) > 1.2 && bottom(id) < 1.5, `${id} dips below the grass (${bottom(id)})`);
  }
  // Small: ء between the fence and just below the grass.
  assert.ok(top('ur-hamza') > 0.5 && bottom('ur-hamza') < 1.05);
});

test('ب\'s dot sits below, about halfway to the tail line; ج\'s dot inside, on the grass line', () => {
  assert.ok(G('ur-be').strokes.find(isDot).at[1] > 1.15 && G('ur-be').strokes.find(isDot).at[1] < 1.3);
  assert.ok(Math.abs(G('ur-jeem').strokes.find(isDot).at[1] - 1) < 0.02);
});

// ---- where each stroke starts, and which way it runs ----

test('alif runs from the sky line straight down to the grass line', () => {
  const pts = strokePath(G('ur-alif').strokes[0]);
  assert.deepEqual([first(pts)[1], last(pts)[1]], [0, 1]);
  assert.equal(first(pts)[0], last(pts)[0]);
});

test('bodies run right to left: they start right of where they end', () => {
  for (const id of ['ur-be', 'ur-dal', 'ur-re', 'ur-seen', 'ur-noon', 'ur-chhoti-ye', 'ur-lam', 'ur-fe', 'ur-qaf', 'ur-kaf', 'ur-wao', 'ur-hamza', 'ur-do-chashmi-he']) {
    const pts = strokePath(G(id).strokes[0]);
    assert.ok(first(pts)[0] - last(pts)[0] > 0.2, `${id}: ${first(pts)} to ${last(pts)}`);
  }
  // ب ن ی س start at their right tip or tooth, at the right of the letter (ن's bowl bulges a little further).
  for (const id of ['ur-be', 'ur-noon', 'ur-chhoti-ye', 'ur-seen']) {
    const pts = strokePath(G(id).strokes[0]);
    assert.ok(first(pts)[0] >= Math.max(...pts.map(([x]) => x)) - 0.08, id);
  }
});

test('ج\'s head runs left to right, then the tail turns back to the left and ends at the right, below the grass (the whole ج family)', () => {
  for (const id of ['ur-jeem', 'ur-che', 'ur-bari-he', 'ur-khe']) {
    const [head, tail] = plan(id, 1).slice(0, 2).map(strokePath);
    assert.ok(last(head)[0] - first(head)[0] > 0.5, id);
    assert.ok(tail[5][0] < first(tail)[0], id);
    assert.ok(last(tail)[1] > 1.2 && last(tail)[0] > 0.7, id);
  }
});

test('ع starts at its head\'s top right and runs left first', () => {
  const pts = strokePath(G('ur-ain').strokes[0]);
  assert.ok(pts[5][0] < first(pts)[0]);
});

test('ے runs down to the left, then sweeps back to the right', () => {
  const pts = strokePath(G('ur-bari-ye').strokes[0]);
  const leftmost = pts.reduce((a, p) => (p[0] < a[0] ? p : a));
  assert.ok(first(pts)[0] - leftmost[0] > 0.3);
  assert.ok(last(pts)[0] - leftmost[0] > 0.9);
});

test('ط: the body from its left tip to the right first; the stem from the sky line down to meet it', () => {
  const [b, stem] = G('ur-toe').strokes.map(strokePath);
  assert.ok(b[5][0] > first(b)[0]);
  assert.equal(first(stem)[1], 0);
  const meet = Math.min(...b.map((p) => dist(p, last(stem))));
  assert.ok(meet < 0.05, `the stem meets the body (${meet})`);
});

test('ک and گ: the slant from the top right down to the left first', () => {
  for (const id of ['ur-kaf', 'ur-gaf']) {
    const pts = strokePath(G(id).strokes[0]);
    assert.ok(first(pts)[0] > 0.9 && first(pts)[1] < 0.2, id);
    assert.ok(pts[3][0] < first(pts)[0] && pts[3][1] > first(pts)[1], id);
  }
  const top = strokePath(G('ur-gaf').strokes[1]);
  assert.ok(first(top)[0] > last(top)[0] && first(top)[1] < last(top)[1], 'the second slant runs from the right down to the left');
});

// ---- tracing them ----

test('tracing each body stroke with a small wobble passes at stages 1, 2 and 3; a tap on a dot or mark counts', () => {
  for (const id of IDS) {
    const char = glyphCharacter(id, G(id));
    for (const p of [char.strokes, ...(char.plans ?? []).map((q) => q.strokes)]) {
      for (const s of p) {
        for (const stage of [1, 2, 3]) {
          let r;
          if (isDot(s)) r = scoreMark([[s.points[0][0] + 0.02, s.points[0][1]]], s.points, stage);
          else if (isMark(s)) r = scoreDot([middle(s.points)], middle(s.points), stage);
          else r = scoreStroke(wobbly(s.points), s.points, stage);
          assert.ok(r.ok, `${id} ${s.part} stage ${stage}: ${r.reason}`);
        }
      }
    }
  }
});

test('tracing a body stroke backwards fails as wrong-direction', () => {
  for (const id of IDS) {
    for (const s of glyphCharacter(id, G(id)).strokes.filter((st) => st.kind === 'line')) {
      const r = scoreStroke(wobbly([...s.points].reverse()), s.points, 2);
      assert.equal(r.reason, 'wrong-direction', `${id} ${s.part}`);
    }
  }
});

// ---- stroke-order.js and the character format ----

test('stroke-order.js has words for every stroke of every Urdu letter, and its paths follow the shapes', () => {
  for (const id of IDS) {
    const order = STROKE_ORDER[id];
    assert.ok(order, id);
    assert.equal(order.strokes.length, G(id).strokes.length, id);
    G(id).strokes.forEach((s, k) => {
      const pts = strokePath(s);
      assert.ok(dist(order.strokes[k].path[0], first(pts)) < 0.002, `${id} stroke ${k + 1} starts where the shape does`);
      assert.ok(order.strokes[k].say.length > 10, `${id} stroke ${k + 1} words`);
    });
    const char = glyphCharacter(id, G(id));
    assert.equal(char.family, order.family, id);
    assert.ok(Math.abs(char.width - order.width) <= 0.01, `${id} width`);
  }
});

test('an Urdu character file: script urdu, the letter, right to left, no case; marks keep their kind', () => {
  const char = glyphCharacter('ur-be', G('ur-be'));
  assert.deepEqual(Object.keys(char), ['id', 'script', 'letter', 'family', 'direction', 'width', 'strokes']);
  assert.equal(char.script, 'urdu');
  assert.equal(char.letter, 'ب');
  assert.equal(char.direction, 'rtl');
  assert.equal(char.family, 'curved');
  assert.equal(glyphCharacter('ur-alif', G('ur-alif')).family, 'straight');
  assert.deepEqual(char.strokes.map((s) => s.kind), ['line', 'dot']);
  assert.deepEqual(glyphCharacter('ur-tte', G('ur-tte')).strokes.map((s) => s.kind), ['line', 'mark']);
  assert.deepEqual(glyphCharacter('ur-alif-madd', G('ur-alif-madd')).strokes.map((s) => s.kind), ['line', 'mark']);
  assert.deepEqual(Object.keys(glyphCharacter('ur-jeem', G('ur-jeem'))).slice(-2), ['strokes', 'plans']);
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
