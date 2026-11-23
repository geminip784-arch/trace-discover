// name-copy.js — pure functions only. No DOM, no storage, no audio.
// Slice 9C part 2: the copy-it round for her name. She writes her whole name
// on the lines; it is judged once she has stopped.
//
// 1. Her strokes are given to the letters by where they are along the line
//    (assignStrokes): sorted left to right, then cut into one group per letter.
//    The cut is the one whose groups look most like their letters ($P distance
//    to that letter alone), with a small cost for a group far from where its
//    letter stands in the name. A letter may get no group at all (she left it
//    out), at a fixed cost.
// 2. Each letter is judged exactly as it is on its own (src/copy.js scoreCopy:
//    shape against its board and look-alikes, every part, size, and for
//    lowercase where it sits on the lines). Each letter is also compared with
//    its own capital or lowercase twin, so a capital in the wrong place gets a
//    clear reason ('wrong-case').
// 3. The name passes when every letter passes. Otherwise the first letter that
//    did not, from the left, says why, and that letter glows on the model card.
//    Letters left out only at the end mean she stopped part way ('unfinished'):
//    Jugnu shows the next letter on the card, as a hint, never a fail.
// Habits (stroke order within a letter, the letters' order, a letter written
// the other way round) are logged and coached, never failed.
//
// Slice 5O part 3: letter slots. With `slots` (src/name.js nameSlots: a box on
// the lines per letter), her strokes are given to the letters by the slots:
// each stroke to the slot that holds most of its length (assignBySlots). A
// stroke that no slot holds at least NAME_SLOT_RULES.clear of (60%), or a tap
// near the edge of its box, is unclear: if either letter fails, it is tried with
// the other letter; if that makes both pass it moves. If its own letter fails
// and moving it does not help, she is asked to rewrite the letter whose slot it
// started in ('overlap'), and that slot glows. When most of her ink is not on
// the slots at all (she wrote somewhere else on the lines), the strokes are
// given by place and shape as before (assignStrokes). The slots' reading is
// used unless the reading by place and shape makes letters that clearly look
// more like hers (she wrote across the boxes, bigger or spread out): letters
// written roughly in their boxes always go by the boxes.

import {
  scoreCopy, recognize, usableStrokes, splitMarks, boxOf, compareIds, sameShape, isLower, COPY_MATCH,
} from './copy.js';

export const NAME_COPY = {
  skip: 1.2,     // the cost of a letter with no strokes (as far as COPY_MATCH.maxDistance: no letter there)
  worst: 1.0,    // a group's shape costs at most this, so a wrong letter is read as written, not as left out
  place: 0.8,    // per name-width of distance between a group and where its letter stands
  gap: 0.1,      // line units: strokes further apart than this, side by side, are a gap between letters
  gapCost: 0.6,  // for each such gap inside one letter's group
  cutCost: 0.6,  // for cutting between two strokes that stand over each other (a's round and its stick)
  maxGroup: 5,   // at most this many strokes in one letter
};

// A letter's twin in the other case ('a' <-> 'A'), or null.
export const twinOf = (id) => (/^[a-z]$/.test(id) ? id.toUpperCase() : /^[A-Z]$/.test(id) ? id.toLowerCase() : null);

// The characters one letter of her name is compared with: what it is compared
// with on its own (src/copy.js compareIds), and its twin in the other case.
export function nameCompareIds(id) {
  const twin = twinOf(id);
  return [...new Set([...compareIds(id), ...(twin ? [twin] : [])])].filter((x) => x !== id);
}

const inkX = (strokes) => {
  const b = boxOf(strokes);
  return b ? [b.x0, b.x1] : null;
};

// Her strokes given to the letters. `strokes`: her strokes (arrays of [x, y]),
// in the order she drew them, in the name's units. `letters`: the letters'
// character files, placed in the name (src/name.js placeLetters).
// Returns { groups, order, cost }: groups[k] is the strokes for letter k, in the
// order she drew them, or null when none were; order[k] is the place (0, 1...)
// of letter k's first stroke among all she drew, or null.
export function assignStrokes(strokes, letters, rules = NAME_COPY, match = COPY_MATCH) {
  const n = letters.length;
  const items = strokes.map((pts, i) => ({ pts, i, box: boxOf([pts]) })).filter((s) => s.box)
    .sort((a, b) => a.box.cx - b.box.cx || a.i - b.i);
  const S = items.length;
  if (S === 0) return { groups: letters.map(() => null), order: letters.map(() => null), cost: n * rules.skip };
  // Where each letter's middle stands, in line units from the left of the name's
  // ink; her groups' middles likewise from the left of her ink. She writes on the
  // same lines as the model, so a letter she left out at the end moves nothing.
  const model = inkX(letters.flatMap((c) => c.strokes.map((s) => s.points)));
  const width = Math.max(model[1] - model[0], 1e-9);
  const herLeft = inkX(items.map((s) => s.pts))[0];
  const expected = letters.map((c) => {
    const [a, b] = inkX(c.strokes.map((s) => s.points));
    return (a + b) / 2 - model[0];
  });
  // Two strokes stand over each other: the middle of one lies within the other's width.
  const within = (x, b) => x > b.x0 && x < b.x1;
  const together = (p, q) => within(p.box.cx, q.box) || within(q.box.cx, p.box);
  const memo = new Map();
  const cost = (s, e, k) => {
    const key = `${s},${e},${k}`;
    if (memo.has(key)) return memo.get(key);
    const char = letters[k];
    const group = items.slice(s, e + 1).map((it) => it.pts);
    const { lines } = splitMarks(usableStrokes(group, char), char, match);
    let c = Infinity;
    if (lines.length > 0) {
      const [a, b] = inkX(group);
      const d = Math.min(rules.worst, recognize(lines, char, [], match).best.distance);
      c = d + (rules.place * Math.abs((a + b) / 2 - herLeft - expected[k])) / width;
      // Gaps inside the group: strokes this far apart side by side are two letters.
      let right = items[s].box.x1;
      for (let j = s + 1; j <= e; j++) {
        if (items[j].box.x0 - right > rules.gap) c += rules.gapCost;
        right = Math.max(right, items[j].box.x1);
      }
      // A cut before or after the group between strokes that stand over each other.
      if (s > 0 && together(items[s - 1], items[s])) c += rules.cutCost / 2;
      if (e < S - 1 && together(items[e], items[e + 1])) c += rules.cutCost / 2;
    }
    memo.set(key, c);
    return c;
  };
  // best[s][k]: the least cost of giving her first s strokes (left to right) to the first k letters.
  const best = Array.from({ length: S + 1 }, () => new Array(n + 1).fill(Infinity));
  const from = Array.from({ length: S + 1 }, () => new Array(n + 1).fill(null));
  best[0][0] = 0;
  for (let k = 0; k < n; k++) {
    for (let s = 0; s <= S; s++) {
      if (best[s][k] === Infinity) continue;
      // Letter k left out.
      if (best[s][k] + rules.skip < best[s][k + 1]) {
        best[s][k + 1] = best[s][k] + rules.skip;
        from[s][k + 1] = { s, skip: true };
      }
      // Letter k takes her strokes s..e.
      for (let e = s; e < S && e - s < rules.maxGroup; e++) {
        const c = best[s][k] + cost(s, e, k);
        if (c < best[e + 1][k + 1]) {
          best[e + 1][k + 1] = c;
          from[e + 1][k + 1] = { s, skip: false };
        }
      }
    }
  }
  const groups = letters.map(() => null);
  if (best[S][n] === Infinity) {
    // Cannot happen with maxGroup large enough; keep every stroke, on the nearest letters by place.
    for (const it of items) {
      const x = it.box.cx - herLeft;
      const k = expected.reduce((bk, v, j) => (Math.abs(v - x) < Math.abs(expected[bk] - x) ? j : bk), 0);
      (groups[k] ??= []).push(it);
    }
  } else {
    let s = S;
    for (let k = n; k > 0; k--) {
      const step = from[s][k];
      if (!step.skip) groups[k - 1] = items.slice(step.s, s);
      s = step.s;
    }
  }
  return {
    groups: groups.map((g) => (g ? [...g].sort((a, b) => a.i - b.i).map((it) => it.pts) : null)),
    order: groups.map((g) => (g ? Math.min(...g.map((it) => it.i)) : null)),
    cost: best[S][n],
  };
}

// ---------------------------------------------------------------------------
// Letter slots (Slice 5O part 3)

export const NAME_SLOT_RULES = {
  clear: 0.6,   // a stroke is clearly a slot's when that slot holds at least this share of its length (approved)
  onSlots: 0.6, // her strokes are judged by the slots when at least this share of her ink lies over them
  prefer: 0.25, // the slots' reading stays unless the other's letters fit this much better ($P distance, summed)
  tapNear: 0.08, // line units: a tap (a dot) this close to the edge of its box is unclear too (a slanted i's dot)
};

// How well groups of her strokes look like their letters: each letter's $P
// distance (at most NAME_COPY.worst), NAME_COPY.skip for a letter with none.
export function groupsFit(groups, chars, rules = NAME_COPY, match = COPY_MATCH) {
  return groups.reduce((sum, g, k) => {
    if (!g) return sum + rules.skip;
    const { lines } = splitMarks(usableStrokes(g, chars[k]), chars[k], match);
    if (lines.length === 0) return sum + rules.worst;
    return sum + Math.min(rules.worst, recognize(lines, chars[k], [], match).best.distance);
  }, 0);
}

// Where a stroke's length lies: its share over each letter's whole box (the
// boxes touch: the gap drawn between two slots is only for her eyes). A tap is
// all in the box it lands in. Ink outside every box (before the first or after
// the last) counts for the nearest end box. Returns { shares, off }: shares[k]
// the share over letter k (sums to 1), off the share outside every box.
export function slotShares(pts, letters) {
  const n = letters.length;
  const shares = new Array(n).fill(0);
  const left = letters[0].x;
  const right = letters[n - 1].x + letters[n - 1].width;
  const boxOfX = (x) => {
    for (let k = 0; k < n; k++) if (x < letters[k].x + letters[k].width) return k;
    return n - 1;
  };
  let total = 0;
  let off = 0;
  const add = (x, len) => {
    shares[boxOfX(x)] += len;
    if (x < left || x > right) off += len;
    total += len;
  };
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (len > 0) add((pts[i][0] + pts[i - 1][0]) / 2, len);
  }
  if (total === 0) add(pts[0][0], 1); // a tap
  return { shares: shares.map((v) => v / total), off: off / total };
}

// The letter whose box a point lies in (the nearest end box when outside them all).
export function slotOf([x], letters) {
  for (let k = 0; k < letters.length; k++) if (x < letters[k].x + letters[k].width) return k;
  return letters.length - 1;
}

// Is her writing on the slots? At least `onSlots` of her ink lies over them.
export function onSlots(strokes, letters, rules = NAME_SLOT_RULES) {
  let total = 0;
  let over = 0;
  for (const pts of strokes) {
    const len = Math.max(pathLen(pts), 1e-6);
    total += len;
    over += len * (1 - slotShares(pts, letters).off);
  }
  return total > 0 && over / total >= rules.onSlots;
}
const pathLen = (pts) => pts.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])), 0);

// Her strokes given to the letters by the slots. Returns { groups, order,
// strokes: [{ i, letter, share, start, second, unclear }] } (groups and order as
// assignStrokes gives): each stroke's letter (the slot holding most of it), that
// share, the letter whose slot it started in, the next most, and whether it is
// unclear (share below `clear`).
export function assignBySlots(strokes, letters, rules = NAME_SLOT_RULES) {
  const groups = letters.map(() => []);
  const info = strokes.map((pts, i) => {
    const { shares } = slotShares(pts, letters);
    const ranked = shares.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    const [share, letter] = ranked[0];
    let second = ranked.length > 1 && ranked[1][0] > 0 ? ranked[1][1] : null;
    let unclear = share < rules.clear && second !== null;
    // A tap close to its box's edge (a dot drawn a little to one side): it may be the neighbour's.
    if (pathLen(pts) === 0 || pts.length === 1) {
      const box = letters[letter];
      const x = pts[0][0];
      if (letter > 0 && x - box.x < rules.tapNear) { second = letter - 1; unclear = true; }
      else if (letter < letters.length - 1 && box.x + box.width - x < rules.tapNear) { second = letter + 1; unclear = true; }
    }
    groups[letter].push(i);
    return { i, letter, share: Number(share.toFixed(4)), start: slotOf(pts[0], letters), second, unclear };
  });
  return {
    groups: groups.map((g) => (g.length ? g.map((i) => strokes[i]) : null)),
    order: groups.map((g) => (g.length ? Math.min(...g) : null)),
    strokes: info,
  };
}

// Shifted into the name: a part of a letter (letter units) as a part of the name.
const shift = (pts, dx) => pts.map(([x, y]) => [x + dx, y]);

// What to show on the model card for letter k: its missing part, or the whole letter.
function partToShow(r, letter, chars) {
  const dx = letter.x;
  if (r?.missing) {
    const paths = r.missing.paths ?? [r.missing.points];
    return { part: r.missing.part, paths: paths.map((p) => shift(p, dx)), whole: false };
  }
  return { part: null, paths: chars[letter.index].strokes.map((s) => shift(s.points, dx)), whole: true };
}

// Her letter `r` (scoreCopy's result) said in the name's own words: a capital
// in the wrong place is 'wrong-case', whether it was read as its twin or, for
// twins of the same shape (s and S), only its size gave it away.
function nameReason(r, id) {
  if (r.ok) return null;
  const twin = twinOf(id);
  if (r.reason === 'looks-like' && twin && r.lookalike && r.lookalike.toLowerCase() === id.toLowerCase()) return 'wrong-case';
  if (twin && sameShape(id, twin)) {
    if (r.reason === 'too-big' && isLower(id)) return 'wrong-case';
    if (r.reason === 'too-small' && !isLower(id)) return 'wrong-case';
  }
  return r.reason;
}

// Judge her whole name. `strokes`: hers, in the order she drew them, in the
// name's units. `letters`: placed letters (src/name.js placeLetters); `chars`:
// the same letters' own character files (letter units); `othersOf(id)`: the
// loaded characters a letter is compared with (nameCompareIds).
// Returns {
//   ok, reason, letter (the index of the letter that says why, or null),
//   lookalike, show: { part, paths, whole } (what glows or Jugnu draws on the card),
//   letters: [{ id, index, strokes, ok, reason, lookalike, part, distance, mirrored, usual, result }],
//   mirrored, habits: { order: 'usual' | 'other', usual, coach: [letter indices Jugnu shows the usual way] }
// }
// reason (null when ok): 'no-letter' (nothing written), 'unfinished' (the last
// letters left out: a hint, not a fail), 'missing-letter', 'wrong-case', or any
// reason src/copy.js gives for that letter.
export function scoreName(strokes, letters, chars, { othersOf = () => [], rules = NAME_COPY, match = COPY_MATCH, slots = null, slotRules = NAME_SLOT_RULES } = {}) {
  // Slice 5O part 3: by the slots when her writing is on them; otherwise by place and shape.
  const judgeLetter = (k, g) => {
    const letter = letters[k];
    if (!g) return { id: letter.id, index: k, strokes: 0, ok: false, reason: 'missing-letter', lookalike: null, part: null, distance: null, mirrored: false, usual: true, result: null };
    // Only taps or dots where a letter needs lines: not a letter yet.
    if (splitMarks(usableStrokes(g, chars[k]), chars[k], match).lines.length === 0) {
      return { id: letter.id, index: k, strokes: g.length, ok: false, reason: 'unrecognized', lookalike: null, part: null, distance: null, mirrored: false, usual: true, result: null };
    }
    const r = scoreCopy(g, chars[k], { others: othersOf(letter.id), match });
    return {
      id: letter.id,
      index: k,
      strokes: g.length,
      ok: r.ok,
      reason: nameReason(r, letter.id),
      lookalike: r.lookalike ?? null,
      part: r.missing?.part ?? null,
      distance: Number.isFinite(r.match?.distance) ? Number(r.match.distance.toFixed(4)) : null,
      mirrored: r.ok && r.mirrored === true,
      usual: r.habits?.usual !== false,
      result: r,
    };
  };
  const groupsOf = (owner) => letters.map((_, k) => {
    const g = strokes.filter((_, j) => owner[j] === k);
    return g.length ? g : null;
  });
  const orderOf = (owner) => letters.map((_, k) => {
    const js = owner.map((o, j) => (o === k ? j : -1)).filter((j) => j >= 0);
    return js.length ? Math.min(...js) : null;
  });
  // The slots' reading, with the overlap rule: an unclear stroke whose letter (or
  // the other one) fails is tried with the other letter; it moves if then both
  // pass. Otherwise the letter whose slot it started in is the one to rewrite.
  function readBySlots() {
    const slotted = assignBySlots(strokes, letters, slotRules);
    const owner = slotted.strokes.map((x) => x.letter);
    let results = letters.map((_, k) => judgeLetter(k, slotted.groups[k]));
    const overlap = [];
    let rewrite = null;
    for (const x of slotted.strokes.filter((t) => t.unclear)) {
      const a = owner[x.i];
      const b = a === x.second ? x.letter : x.second;
      if (results[a].ok && results[b].ok) continue; // both letters good: it stays where it is
      const entry = { stroke: x.i, share: x.share, slots: [a, b], start: x.start, moved: false, unclear: false };
      overlap.push(entry);
      const without = strokes.filter((_, j) => owner[j] === a && j !== x.i);
      const ra = judgeLetter(a, without.length ? without : null);
      const rb = judgeLetter(b, strokes.filter((_, j) => owner[j] === b || j === x.i));
      if (ra.ok && rb.ok) {
        owner[x.i] = b;
        results = results.map((r, k) => (k === a ? ra : k === b ? rb : r));
        entry.moved = true;
      } else if (!results[a].ok && rewrite === null) {
        // Its own letter fails with it, and the other cannot take it: rewrite the letter whose slot it started in.
        entry.unclear = true;
        rewrite = x.start;
      }
    }
    return { groups: groupsOf(owner), order: orderOf(owner), results, overlap, rewrite, slots: true };
  }
  const byPlace = assignStrokes(strokes, letters, rules, match);
  let reading = slots !== null && strokes.length > 0 && onSlots(strokes, letters, slotRules) ? readBySlots() : null;
  // Letters that clearly look more like hers by place and shape: she wrote across the boxes.
  if (reading && groupsFit(byPlace.groups, chars, rules, match) + slotRules.prefer < groupsFit(reading.groups, chars, rules, match)) reading = null;
  reading ??= { groups: byPlace.groups, order: byPlace.order, results: letters.map((_, k) => judgeLetter(k, byPlace.groups[k])), overlap: [], rewrite: null, slots: false };
  const { groups, order, results, overlap, rewrite } = reading;
  const bySlots = reading.slots;
  const written = results.filter((x) => x.strokes > 0);
  const firstOrder = order.filter((o) => o !== null);
  const orderUsual = firstOrder.every((o, i) => i === 0 || o > firstOrder[i - 1]);
  const coach = results.filter((x) => x.ok && (x.mirrored || !x.usual)).map((x) => x.index);
  const habits = { order: orderUsual ? 'usual' : 'other', usual: orderUsual && coach.length === 0, coach: orderUsual ? coach : letters.map((_, k) => k) };
  const out = { ok: false, reason: null, letter: null, lookalike: null, show: null, letters: results, mirrored: results.some((x) => x.mirrored), habits, groups, slots: bySlots, overlap };
  if (written.length === 0) return { ...out, reason: 'no-letter' };
  // The last letters not written yet: she stopped part way. A hint, never a fail,
  // whatever the letters before look like: she has not finished.
  const lastWritten = Math.max(...written.map((x) => x.index));
  if (lastWritten < letters.length - 1) {
    const next = lastWritten + 1;
    return { ...out, reason: 'unfinished', letter: next, show: partToShow(null, letters[next], chars) };
  }
  // An unclear stroke that could not be settled: rewrite the letter whose slot it started in.
  if (rewrite !== null && results.some((x) => !x.ok)) {
    return { ...out, reason: 'overlap', letter: rewrite, show: partToShow(null, letters[rewrite], chars) };
  }
  const bad = results.find((x) => !x.ok);
  if (!bad) return { ...out, ok: true };
  const lookalike = bad.reason === 'wrong-case' ? null : bad.lookalike;
  return { ...out, reason: bad.reason, letter: bad.index, lookalike, show: partToShow(bad.result, letters[bad.index], chars) };
}

// Her strokes for letter k (for the size outline and the line glow), or [].
export const strokesOfLetter = (strokes, letters, k, rules = NAME_COPY) => assignStrokes(strokes, letters, rules).groups[k] ?? [];

// One attempt-log entry for a judged copy of her name (type 'name', round 3).
export function nameCopyLogEntry({ result, attempt, helper = null, helped = false, review = false, now = new Date() }) {
  const r4 = (v) => (Number.isFinite(v) ? Number(v.toFixed(4)) : null);
  return {
    type: 'name',
    time: now.toISOString(),
    round: 3,
    review,
    attempt,
    helper,
    helped,
    ok: result.ok,
    reason: result.reason,
    letter: result.letter,
    order: result.habits.order,
    slots: result.slots === true, // Slice 5O part 3: strokes given by the letter slots
    overlap: (result.overlap ?? []).map((o) => ({ ...o })),
    letters: result.letters.map((x) => ({
      letter: x.id,
      ok: x.ok,
      reason: x.reason,
      strokes: x.strokes,
      lookalike: x.lookalike,
      part: x.part,
      distance: r4(x.distance),
      mirrored: x.mirrored,
      usual: x.usual,
    })),
  };
}
