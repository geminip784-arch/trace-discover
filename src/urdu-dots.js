// urdu-dots.js — pure functions only. No DOM, no storage, no audio.
// Slice 10C: the dots and small marks of a copied Urdu letter. Many Urdu
// letters share one body and differ only in their dots (ب پ ت ٹ ث), so in the
// copy-it round her body is judged by its shape (src/copy.js) and her dots and
// marks here: how many, and on which side of the body.
//
// Her strokes are sorted by size, before her letter is fitted to the model:
//   a dot    no wider or taller than URDU_DOTS.dotSize (a tap, a tiny stroke, a blob)
//   middling up to URDU_DOTS.markSize, and small next to her biggest stroke:
//            a small mark (the little ṭ, the madd) or a small part of the body
//            (the head of ء); src/copy.js tries both and keeps the better reading
//   a line   anything bigger: part of the body
//
// Side: only on top, or not on top, is judged ("inside" ج and "underneath" ب
// are the same side). A dot is on top when it is higher than all of her body
// near it (within URDU_DOTS.near, left and right). Where the dots are along the
// body, how far apart, and how three dots are arranged are never judged.

// Line units. Tune with her real `copy` log entries, never by guesswork.
export const URDU_DOTS = {
  dotSize: 0.18,  // a stroke no wider or taller than this is a dot
  markSize: 0.5,  // up to this wide or tall: a middling stroke (a mark, or a small part of the body)
  markShare: 0.6, // ... and no bigger than this share of her biggest stroke
  near: 0.15,     // her body this close (left and right) to a dot decides its side
};

export const isUrdu = (char) => char?.script === 'urdu';

// Letters that share one body exactly and differ only in their dots or a mark
// (tests/urdu-glyphs.test.js checks the bodies are the same).
export const URDU_FAMILIES = [
  ['ur-be', 'ur-pe', 'ur-te', 'ur-tte', 'ur-se'],
  ['ur-jeem', 'ur-che', 'ur-bari-he', 'ur-khe'],
  ['ur-dal', 'ur-ddal', 'ur-zal'],
  ['ur-re', 'ur-rre', 'ur-ze', 'ur-zhe'],
  ['ur-seen', 'ur-sheen'],
  ['ur-suad', 'ur-zuad'],
  ['ur-toe', 'ur-zoe'],
  ['ur-ain', 'ur-ghain'],
  ['ur-alif', 'ur-alif-madd'],
];
export const familyOf = (id) => URDU_FAMILIES.find((f) => f.includes(id)) ?? [id];
export const sameBody = (a, b) => a === b || familyOf(a).includes(b);

// The larger side of a stroke's box (0 for a tap).
export function extent(pts) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

export const middleOf = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

// Her strokes sorted by size: { lines, dots, middling }, each in drawing order.
export function sortSmall(strokes, cfg = URDU_DOTS) {
  const biggest = Math.max(0, ...strokes.map(extent));
  const out = { lines: [], dots: [], middling: [] };
  for (const pts of strokes) {
    const e = extent(pts);
    if (e <= cfg.dotSize) out.dots.push(pts);
    else if (e <= cfg.markSize && e <= cfg.markShare * biggest) out.middling.push(pts);
    else out.lines.push(pts);
  }
  return out;
}

// 'top' when the point is higher than all of the body near it, else 'under'.
// With no body near (a dot far to one side), the body's middle height decides.
export function sideOf([x, y], body, cfg = URDU_DOTS) {
  const pts = body.flat();
  if (pts.length === 0) return 'top';
  const near = pts.filter((p) => Math.abs(p[0] - x) <= cfg.near);
  if (near.length === 0) {
    const ys = pts.map((p) => p[1]);
    return y < (Math.min(...ys) + Math.max(...ys)) / 2 ? 'top' : 'under';
  }
  return y < Math.min(...near.map((p) => p[1])) ? 'top' : 'under';
}

// Her dots and marks, read against her own body: { dots: [{ at, side }], marks: [{ at, side }] }.
export function readMarks(dots, marks, body, cfg = URDU_DOTS) {
  const read = (pts) => {
    const at = middleOf(pts);
    return { at, side: sideOf(at, body, cfg) };
  };
  return { dots: dots.map(read), marks: marks.map(read) };
}

// What a letter has, read the same way from its own default plan:
// { dots: [{ stroke, at, side }], marks: [{ stroke, part, points, at, side }] }.
export function expectedMarks(char, cfg = URDU_DOTS) {
  const body = char.strokes.filter((s) => s.kind === 'line').map((s) => s.points);
  const dots = [];
  const marks = [];
  char.strokes.forEach((s, stroke) => {
    if (s.kind === 'dot') dots.push({ stroke, at: s.points[0], side: sideOf(s.points[0], body, cfg) });
    if (s.kind === 'mark') {
      const at = middleOf(s.points);
      marks.push({ stroke, part: s.part, points: s.points, at, side: sideOf(at, body, cfg) });
    }
  });
  return { dots, marks };
}

// Her dots and marks against the letter's. null when they match, else the
// first thing to put right. `tapForMark`: a single dot on top may stand for the
// letter's mark (a tapped ṭ or madd), where no letter of its family has one dot
// on top (ٹ and آ; on ڈ and ڑ it is the dot of ذ and ز).
//   { reason: 'missing-mark', part }    the ṭ or the madd is not on top
//   { reason: 'extra-mark' }            a mark on a letter with no mark and no dots
//   { reason: 'dot-count', need }       the wrong number of dots (a mark where dots belong counts as none)
//   { reason: 'dot-side', side, need }  the right number, but not all on the letter's side
export function compareMarks(hers, want, { tapForMark = false } = {}) {
  if (tapForMark && want.marks.length > 0 && want.dots.length === 0 && hers.marks.length === 0
    && hers.dots.length === 1 && hers.dots[0].side === 'top') {
    hers = { dots: [], marks: hers.dots };
  }
  const myMarksTop = hers.marks.filter((m) => m.side === 'top');
  if (want.marks.length > 0 && myMarksTop.length === 0) return { reason: 'missing-mark', part: want.marks[0].part };
  if (want.marks.length === 0 && hers.marks.length > 0 && want.dots.length === 0) return { reason: 'extra-mark' };
  const need = want.dots.length;
  if (hers.dots.length !== need) return { reason: 'dot-count', need };
  const side = want.dots[0]?.side;
  if (need > 0 && hers.dots.some((d) => d.side !== side)) return { reason: 'dot-side', side, need };
  return null;
}

// What glows on the model card for a dot or mark reason: the letter's dots, or its mark.
// { plan: 0, stroke, part, points, paths, coverage: 0 }.
export function marksToShow(problem, want) {
  if (problem.reason === 'missing-mark') {
    const m = want.marks[0];
    return { plan: 0, stroke: m.stroke, part: m.part, points: m.points, paths: [m.points], coverage: 0 };
  }
  const dots = want.dots;
  if (dots.length === 0) return null; // "It has no dots": nothing to glow
  return { plan: 0, stroke: dots[0].stroke, part: dots.length > 1 ? 'dots' : 'dot', points: [dots[0].at], paths: dots.map((d) => [d.at]), coverage: 0 };
}

// The family member whose dots and marks match hers exactly (her body read as
// that family), or null: names the letter she wrote ("That looks like ز").
export function memberMatching(hers, members) {
  return members.find((c) => compareMarks(hers, expectedMarks(c)) === null && (expectedMarks(c).marks.length > 0) === (hers.marks.length > 0)) ?? null;
}

// Whether a single tapped dot on top may stand for this letter's mark: no
// other letter of its family is its body with one dot on top.
export function tapCanBeMark(char, members) {
  const want = expectedMarks(char);
  if (want.marks.length === 0 || want.dots.length > 0) return false;
  return !members.some((c) => c.id !== char.id && (() => {
    const w = expectedMarks(c);
    return w.marks.length === 0 && w.dots.length === 1 && w.dots[0].side === 'top';
  })());
}

// For the log: how many dots and marks, and on which side.
export function marksSummary(hers) {
  const count = (list, side) => list.filter((d) => d.side === side).length;
  return { dotsTop: count(hers.dots, 'top'), dotsUnder: count(hers.dots, 'under'), marksTop: count(hers.marks, 'top'), marksUnder: count(hers.marks, 'under') };
}

