// variants.js — pure functions only. No DOM, no storage, no audio.
// "One-stroke versions": where stroke k ends right where stroke k+1 starts
// (the corner of an L, the top of a 7), she may draw both in one go.
// A joined reference is those strokes' points one after the other.

import { DEFAULTS, dist, scoreStroke, resample, meanPairDistance } from './geometry.js';

// Line units. The end of stroke k must be this close to the start of stroke k+1.
export const JOIN_GAP = 0.12;

// True when stroke k and stroke k+1 can be drawn as one.
export function joinsNext(strokes, k, gap = JOIN_GAP) {
  const a = strokes[k];
  const b = strokes[k + 1];
  if (!a || !b || a.kind !== 'line' || b.kind !== 'line') return false;
  return dist(a.points[a.points.length - 1], b.points[0]) <= gap;
}

// Every reference that starts at stroke k: k alone first, then k..k+1, k..k+2 ...
// for as long as each next pair joins. Each is { from, to, points }.
export function variantsFrom(strokes, k, gap = JOIN_GAP) {
  const out = [{ from: k, to: k, points: strokes[k].points }];
  let points = strokes[k].points;
  for (let j = k; joinsNext(strokes, j, gap); j++) {
    points = [...points, ...strokes[j + 1].points];
    out.push({ from: k, to: j + 1, points });
  }
  return out;
}

// 'alone' for a single stroke, 'joined 1-2' for strokes 1 and 2 (numbered from 1).
export function variantLabel(v) {
  return v.from === v.to ? 'alone' : `joined ${v.from + 1}-${v.to + 1}`;
}

// ---- Direction coaches, never blocks (Slice 5J part 2) ----
// In the tracing rounds (1 and 2) a stroke traced along the track the other
// way, from its far end, counts as done. It is a habit: logged (reversed: true,
// directionOk: false) and coached once after the letter, never a fail.
// Off the track, or started in the middle, it still does not count.
// scoreStroke is unchanged: this only scores the reversed path as well.
export function scoreEitherWay(child, ref, stage = 1, cfg = DEFAULTS) {
  const r = scoreStroke(child, ref, stage, cfg);
  if (r.reason !== 'wrong-direction') return { ...r, reversed: false };
  const back = scoreStroke(child, [...ref].reverse(), stage, cfg);
  // Not a good reversed trace either: the reason is what went wrong along the
  // way she went (off the track, or started in the middle).
  return { ...back, directionOk: false, reversed: back.ok };
}

// Of two passing results, the better: a forward one beats a reversed one
// (so M from the bottom reads as its own plan, not the default traced back),
// then the lower error.
export const betterPass = (a, b) => ((a.reversed === true) !== (b.reversed === true) ? b.reversed === true : a.error < b.error);

// Score her stroke against every variant. Of those that pass, take the best
// (betterPass: forward first, then the lowest error).
// If none passes, report the result against the stroke alone.
// Returns { variant, result, all } where all is [{ variant, result }] in variant order.
export function pickVariant(child, variants, stage = 1, score = scoreStroke) {
  const all = variants.map((variant) => ({ variant, result: score(child, variant.points, stage) }));
  let best = null;
  for (const r of all) {
    if (r.result.ok && (!best || betterPass(r.result, best.result))) best = r;
  }
  return { ...(best ?? all[0]), all };
}

// ---- Either order (character files may have "anyOrder": [[0, 1], ...]) ----

// The anyOrder group that holds stroke k, or [k] when it is in none.
export function groupOf(char, k) {
  const group = (char.anyOrder ?? []).find((g) => g.includes(k));
  return group ? [...group].sort((a, b) => a - b) : [k];
}

// The strokes she may draw next: the first unfinished stroke in the recorded
// order (`current`) and every other unfinished stroke in its anyOrder group.
export function nextStrokes(char, done) {
  const current = done.indexOf(false);
  if (current === -1) return [];
  return groupOf(char, current).filter((i) => !done[i]);
}

// Every reference she may be drawing now: each next stroke alone, plus its
// joined versions, but never a joined version that covers a finished stroke.
// The current stroke's references come first.
export function candidatesFor(char, done, gap = JOIN_GAP) {
  const out = [];
  for (const k of nextStrokes(char, done)) {
    for (const v of variantsFrom(char.strokes, k, gap)) {
      let free = true;
      for (let i = v.from; i <= v.to; i++) if (done[i]) free = false;
      if (free) out.push(v);
    }
  }
  return out;
}

// Like pickVariant, over every candidate: of those that pass, the lowest error
// wins. If none passes, the result is against the next stroke (alone) whose shape
// she drew most closely in either direction (the one she was trying), the
// current stroke on a tie.
export function pickCandidate(child, candidates, stage = 1, score = scoreStroke, cfg = DEFAULTS) {
  const pick = pickVariant(child, candidates, stage, score);
  if (pick.result.ok || child.length < 2) return pick;
  const c = resample(child, cfg.samples);
  let best = null;
  for (const r of pick.all) {
    if (r.variant.from !== r.variant.to) continue;
    const ref = resample(r.variant.points, cfg.samples);
    const d = Math.min(meanPairDistance(c, ref), meanPairDistance(c, [...ref].reverse()));
    if (!best || d < best.d) best = { d, r };
  }
  return { ...(best ? best.r : pick), all: pick.all };
}

// ---- Stroke plans (Slice 5J) ----
// A character file may list other allowed ways to draw it ("plans": [{ strokes }]),
// beside its default `strokes` (plan 0). Every plan has the same shape. In the
// tracing rounds she may follow any plan: each of her strokes is still checked
// for start, direction and shape against the next stroke of a plan she is
// still following. The default plan is shown until her strokes leave it.

export const planCount = (char) => 1 + (char.plans?.length ?? 0);

// The strokes of plan p (0: the default).
export const planStrokes = (char, p = 0) => (p === 0 ? char.strokes : char.plans[p - 1].strokes);

// Plan p as a character of its own (anyOrder belongs to the default plan only).
export function planChar(char, p = 0) {
  const { plans, anyOrder, ...rest } = char;
  return p === 0 ? { ...rest, ...(anyOrder ? { anyOrder } : {}), strokes: char.strokes } : { ...rest, strokes: planStrokes(char, p) };
}

// Every plan, nothing drawn yet: [{ plan, done }] in plan order.
export const startPlans = (char) => Array.from({ length: planCount(char) }, (_, plan) => ({
  plan, done: new Array(planStrokes(char, plan).length).fill(false),
}));

// The plan to show: the first plan she is still following.
export const shownPlan = (alive) => alive[0];

// Every reference she may be drawing now, over the plans she is still following:
// candidatesFor each plan, tagged with its plan. The shown plan's come first.
export function planCandidates(char, alive, gap = JOIN_GAP) {
  return alive.flatMap(({ plan, done }) => candidatesFor(planChar(char, plan), done, gap).map((v) => ({ ...v, plan })));
}

// After a stroke that passed: the plans her strokes still follow, each moved on
// by its best passing reference (betterPass). A plan none of whose next
// references her stroke passes is dropped. When some plan takes the stroke
// forwards, plans that take it only reversed are dropped too.
export function advancePlans(child, char, alive, stage = 1, score = scoreStroke, gap = JOIN_GAP) {
  const out = [];
  for (const { plan, done } of alive) {
    let best = null;
    for (const v of candidatesFor(planChar(char, plan), done, gap)) {
      const r = score(child, v.points, stage);
      if (r.ok && (!best || betterPass(r, best.r))) best = { v, r };
    }
    if (!best) continue;
    const next = [...done];
    for (let i = best.v.from; i <= best.v.to; i++) next[i] = true;
    out.push({ plan, done: next, reversed: best.r.reversed === true });
  }
  const forward = out.filter((p) => !p.reversed);
  return (forward.length > 0 ? forward : out).map(({ plan, done }) => ({ plan, done }));
}
