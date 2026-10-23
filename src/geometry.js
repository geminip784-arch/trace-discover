// geometry.js — pure functions only. No DOM, no storage, no audio.
// Units are "line units": y = 0 sky line, 0.5 fence, 1 grass line, 1.3 ground.
// One unit = the distance from sky line to grass line on screen.
// A point is [x, y]. A stroke is an array of points in drawing order.

// Starting values. Tune them with her real attempts, never by guesswork.
export const DEFAULTS = {
  samples: 32,          // points each stroke is resampled to before comparing
  minLength: 0.05,      // shorter than this = a tap, not a stroke
  backtrack: 0.15,      // live: progress may slip back this much before "wrong way"
  stages: {
    1: { startRadius: 0.18, tolerance: 0.16, dotRadius: 0.16 },
    2: { startRadius: 0.14, tolerance: 0.12, dotRadius: 0.13 },
    3: { startRadius: 0.12, tolerance: 0.10, dotRadius: 0.11 },
  },
};

export function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function pathLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  return total;
}

// Resample a stroke to n points spaced evenly along its length.
export function resample(pts, n) {
  if (pts.length === 0) return [];
  const first = [pts[0][0], pts[0][1]];
  const total = pathLength(pts);
  if (pts.length === 1 || total === 0) return Array.from({ length: n }, () => [...first]);
  const step = total / (n - 1);
  const out = [first];
  let acc = 0;
  let prev = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const cur = pts[i];
    let d = dist(prev, cur);
    while (acc + d >= step && out.length < n) {
      const t = (step - acc) / d;
      const q = [prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])];
      out.push(q);
      prev = q;
      d = dist(prev, cur);
      acc = 0;
    }
    acc += d;
    prev = cur;
  }
  const last = pts[pts.length - 1];
  while (out.length < n) out.push([last[0], last[1]]);
  return out;
}

export function meanPairDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += dist(a[i], b[i]);
  return sum / a.length;
}

// Score one finished stroke against its reference stroke.
// Checks, in this order: direction, shape, start.
// reason is null when ok, else 'too-short' | 'wrong-direction' | 'off-path' | 'wrong-start'.
export function scoreStroke(child, ref, stage = 1, cfg = DEFAULTS) {
  const s = cfg.stages[stage];
  if (child.length < 2 || pathLength(child) < cfg.minLength) {
    return { ok: false, reason: 'too-short', startOk: false, directionOk: false, shapeOk: false, error: Infinity };
  }
  const n = cfg.samples;
  const c = resample(child, n);
  const r = resample(ref, n);
  const forward = meanPairDistance(c, r);
  const backward = meanPairDistance(c, [...r].reverse());
  const directionOk = forward <= backward;
  const shapeOk = forward <= s.tolerance;
  const startOk = dist(c[0], r[0]) <= s.startRadius;
  let reason = null;
  if (!directionOk) reason = 'wrong-direction';
  else if (!shapeOk) reason = 'off-path';
  else if (!startOk) reason = 'wrong-start';
  return { ok: reason === null, reason, startOk, directionOk, shapeOk, error: forward };
}

// Score a dot (Urdu nuqta, or the dot on i/j): the centroid of her tap or tiny stroke
// must land within dotRadius of the reference dot.
export function scoreDot(child, refPoint, stage = 1, cfg = DEFAULTS) {
  if (child.length === 0) return { ok: false, reason: 'missing', error: Infinity };
  const cx = child.reduce((s, p) => s + p[0], 0) / child.length;
  const cy = child.reduce((s, p) => s + p[1], 0) / child.length;
  const error = dist([cx, cy], refPoint);
  const ok = error <= cfg.stages[stage].dotRadius;
  return { ok, reason: ok ? null : 'off-target', error };
}

// Live tracking while her finger moves: distance from the path, and how far along it she is (0..1).
export function nearestOnPath(p, pts) {
  if (pts.length === 1) return { distance: dist(p, pts[0]), progress: 1 };
  const total = pathLength(pts);
  let best = { distance: Infinity, progress: 0 };
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = dist(a, b);
    let t = 0;
    if (seg > 0) {
      t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (seg * seg);
      t = Math.max(0, Math.min(1, t));
    }
    const q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    const d = dist(p, q);
    if (d < best.distance) best = { distance: d, progress: total > 0 ? (acc + t * seg) / total : 0 };
    acc += seg;
  }
  return best;
}

// Live state for one stroke in progress. Feed each new point; read onPath / wrongWay / progress.
export function createLiveTracker(ref, stage = 1, cfg = DEFAULTS) {
  const s = cfg.stages[stage];
  let maxProgress = 0;
  return {
    update(p) {
      const { distance, progress } = nearestOnPath(p, ref);
      const onPath = distance <= s.tolerance;
      if (onPath) maxProgress = Math.max(maxProgress, progress);
      const wrongWay = onPath && progress < maxProgress - cfg.backtrack;
      return { onPath, wrongWay, progress: maxProgress, distance };
    },
  };
}
