// pdollar.js — pure functions only. No DOM, no storage, no audio.
// The $P point-cloud recognizer (Slice 5J), used by the copy-it round
// (src/copy.js) to judge her whole letter by its shape alone. A drawing is
// turned into a cloud of N points (its strokes resampled together, scaled to
// a unit box without stretching, centred on its centroid), and two clouds are
// compared by matching each point to its nearest unmatched partner. Stroke
// count, stroke order and direction make no difference to a cloud.
// Plain geometry: no AI, no network, every result can be tested.
//
// Adapted from the $P Point-Cloud Recognizer (JavaScript version) by
// Radu-Daniel Vatavu, Lisa Anthony and Jacob O. Wobbrock:
//
//   Vatavu, R.-D., Anthony, L. and Wobbrock, J.O. (2012). Gestures as point
//   clouds: A $P recognizer for user interface prototypes. Proceedings of the
//   ACM Int'l Conference on Multimodal Interfaces (ICMI '12). Santa Monica,
//   California (October 22-26, 2012). New York: ACM Press, pp. 273-280.
//
// The original is distributed under the "New BSD License" agreement:
//
//   Copyright (C) 2012, Radu-Daniel Vatavu, Lisa Anthony, and Jacob O.
//   Wobbrock. All rights reserved.
//
//   Redistribution and use in source and binary forms, with or without
//   modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the names of the University Stefan cel Mare of Suceava,
//       University of Washington, nor UMBC, nor the names of its contributors
//       may be used to endorse or promote products derived from this software
//       without specific prior written permission.
//
//   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
//   IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
//   THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
//   PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Radu-Daniel Vatavu OR Lisa
//   Anthony OR Jacob O. Wobbrock BE LIABLE FOR ANY DIRECT, INDIRECT,
//   INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
//   NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
//   DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
//   THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
//   (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
//   THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Changes from the original: written as ES module functions over [x, y]
// arrays (a stroke is an array of points, a drawing an array of strokes),
// and the score is reported as the matching distance itself (smaller is
// closer), so src/copy.js can set its own limit.

// Points per cloud. The paper finds 32 enough for gestures this size.
export const CLOUD_POINTS = 32;
// Greedy matching tries about n^(1 - EPSILON) starting points.
const EPSILON = 0.5;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Every stroke's length, added up (the gaps between strokes do not count).
function totalLength(strokes) {
  let total = 0;
  for (const pts of strokes) for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  return total;
}

// n points spaced evenly along all the strokes together, stroke by stroke.
export function resampleCloud(strokes, n = CLOUD_POINTS) {
  const lines = strokes.filter((pts) => pts.length > 0);
  if (lines.length === 0) return [];
  const total = totalLength(lines);
  if (total === 0) return Array.from({ length: n }, () => [...lines[0][0]]);
  const step = total / (n - 1);
  const out = [[...lines[0][0]]];
  let acc = 0;
  for (const pts of lines) {
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
  }
  const last = lines.at(-1).at(-1);
  while (out.length < n) out.push([last[0], last[1]]); // rounding can leave the last one short
  return out;
}

// Scaled to fit a unit box (one scale for x and y, so nothing is stretched).
function scaleCloud(points) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const [x, y] of points) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const size = Math.max(x1 - x0, y1 - y0) || 1;
  return points.map(([x, y]) => [(x - x0) / size, (y - y0) / size]);
}

// Moved so its centroid sits at the origin.
function centreCloud(points) {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  return points.map(([x, y]) => [x - cx, y - cy]);
}

// A drawing (array of strokes) as a normalized cloud of n points.
export function cloudOf(strokes, n = CLOUD_POINTS) {
  const pts = resampleCloud(strokes, n);
  return pts.length === 0 ? [] : centreCloud(scaleCloud(pts));
}

// The drawing turned left to right (its mirror image).
export const mirrorStrokes = (strokes) => strokes.map((pts) => pts.map(([x, y]) => [-x, y]));

// Match every point of a to its nearest unmatched point of b, starting at
// a[start]; earlier matches weigh more (they had more choice).
function cloudDistance(a, b, start) {
  const n = a.length;
  const matched = new Array(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let index = -1;
    let min = Infinity;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = dist(a[i], b[j]);
      if (d < min) { min = d; index = j; }
    }
    matched[index] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * min;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

// How far apart two clouds of the same size are (0: the same shape).
export function matchDistance(a, b) {
  const n = a.length;
  if (n === 0 || b.length !== n) return Infinity;
  const step = Math.max(1, Math.floor(n ** (1 - EPSILON)));
  let min = Infinity;
  for (let i = 0; i < n; i += step) {
    min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  }
  return min;
}

// Her drawing against every template ({ name, cloud }), nearest first.
// Returns [{ name, distance }] sorted by distance.
export function rankTemplates(strokes, templates, n = CLOUD_POINTS) {
  const cloud = cloudOf(strokes, n);
  return templates
    .map((t) => ({ name: t.name, distance: matchDistance(cloud, t.cloud) }))
    .sort((p, q) => p.distance - q.distance);
}
