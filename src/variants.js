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

// Score her stroke against every variant. Of those that pass, take the lowest error.
// If none passes, report the result against the stroke alone.
// Returns { variant, result, all } where all is [{ variant, result }] in variant order.
export function pickVariant(child, variants, stage = 1, score = scoreStroke) {
  const all = variants.map((variant) => ({ variant, result: score(child, variant.points, stage) }));
  let best = null;
  for (const r of all) {
    if (r.result.ok && (!best || r.result.error < best.result.error)) best = r;
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
