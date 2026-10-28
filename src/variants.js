// variants.js — pure functions only. No DOM, no storage, no audio.
// "One-stroke versions": where stroke k ends right where stroke k+1 starts
// (the corner of an L, the top of a 7), she may draw both in one go.
// A joined reference is those strokes' points one after the other.

import { dist, scoreStroke } from './geometry.js';

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
