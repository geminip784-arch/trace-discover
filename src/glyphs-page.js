// glyphs-page.js — the parent's review page (glyphs.html) for the generated
// characters. Reads data/chars/index.json and every file it lists, and draws
// each character on the guide lines with numbered start dots and direction arrows.
// Slice 5J: each character's other allowed stroke plans follow it, one card each.

import { pathLength, dist } from './geometry.js';
import { joinGaps } from './glyph-points.js';
import { CHAR_GROUPS } from './recording.js';
import { planCount, planChar } from './variants.js';

const UNIT = 120;              // px per line unit
const TOP = -0.28;             // card spans y from TOP to BOTTOM (line units)
const BOTTOM = 1.42;
const PAD = 0.2;               // space left and right of the character box
const COLORS = ['#2b6cb0', '#d98a00', '#2f855a', '#805ad5'];
const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

// The point and direction at `t` (0..1) of the way along a stroke.
function along(pts, t) {
  const target = pathLength(pts) * t;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (acc + d >= target && d > 0) {
      const f = (target - acc) / d;
      const a = pts[i - 1];
      const b = pts[i];
      return { p: [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])], dir: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    acc += d;
  }
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  return { p: b, dir: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

function card(char) {
  const w = char.width + 2 * PAD;
  const svg = el('svg', {
    width: Math.round(w * UNIT),
    height: Math.round((BOTTOM - TOP) * UNIT),
    viewBox: `${-PAD} ${TOP} ${w} ${BOTTOM - TOP}`,
    role: 'img',
    'aria-label': char.id,
  });
  const guides = el('g', { fill: 'none', 'stroke-width': 0.012 }, svg);
  el('line', { x1: -PAD, x2: w - PAD, y1: 0, y2: 0, stroke: '#6b8fd6' }, guides);
  el('line', { x1: -PAD, x2: w - PAD, y1: 0.5, y2: 0.5, stroke: '#9aa9c9', 'stroke-dasharray': '0.05 0.04' }, guides);
  el('line', { x1: -PAD, x2: w - PAD, y1: 1, y2: 1, stroke: '#5aa35a' }, guides);
  el('line', { x1: -PAD, x2: w - PAD, y1: 1.3, y2: 1.3, stroke: '#c9b48a', 'stroke-width': 0.008 }, guides);

  const lines = char.strokes.filter((s) => s.kind === 'line');
  // The track, then each stroke's centre line in its colour.
  for (const s of lines) {
    el('polyline', {
      points: s.points.map((p) => p.join(',')).join(' '),
      fill: 'none', stroke: '#e3e1da', 'stroke-width': 0.16, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }, svg);
  }
  char.strokes.forEach((s, k) => {
    const color = COLORS[k % COLORS.length];
    if (s.kind === 'dot') {
      el('circle', { cx: s.points[0][0], cy: s.points[0][1], r: 0.05, fill: color }, svg);
      return;
    }
    el('polyline', {
      points: s.points.map((p) => p.join(',')).join(' '),
      fill: 'none', stroke: color, 'stroke-width': 0.025, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }, svg);
    // Arrows along the stroke: more on longer strokes.
    const len = pathLength(s.points);
    const n = len < 0.7 ? 1 : len < 1.8 ? 2 : 3;
    for (let i = 1; i <= n; i++) {
      const { p, dir } = along(s.points, (i - 0.25) / n);
      const deg = (dir * 180) / Math.PI;
      el('path', {
        d: 'M -0.045 -0.05 L 0.05 0 L -0.045 0.05 Z',
        fill: color,
        transform: `translate(${p[0]} ${p[1]}) rotate(${deg})`,
      }, svg);
    }
  });

  // Start dots, numbered. A start that sits on an earlier one moves a little
  // along its own stroke, so both numbers can be read.
  const placed = [];
  char.strokes.forEach((s, k) => {
    let [x, y] = s.points[0];
    if (placed.some((q) => dist(q, [x, y]) < 0.1) && s.points.length > 1) {
      ({ p: [x, y] } = along(s.points, Math.min(0.5, 0.17 / Math.max(pathLength(s.points), 0.01))));
    }
    placed.push([x, y]);
    el('circle', { cx: x, cy: y, r: 0.075, fill: COLORS[k % COLORS.length], stroke: '#fff', 'stroke-width': 0.015 }, svg);
    const label = el('text', {
      x, y: y + 0.004,
      'font-size': 0.1, 'font-weight': 700, 'font-family': 'system-ui, sans-serif',
      fill: '#fff', 'text-anchor': 'middle', 'dominant-baseline': 'central',
    }, svg);
    label.textContent = String(k + 1);
  });
  return svg;
}

// plan: 0 for the default (what the model card and Jugnu show), else the other plan's number.
function caption(char, plan = 0) {
  const n = char.strokes.length;
  const joins = joinGaps(char)
    .map((g, k) => (g.joins ? `${k + 1}+${k + 2} in one go` : null))
    .filter(Boolean);
  const cap = document.createElement('figcaption');
  const b = document.createElement('b');
  b.textContent = plan === 0 ? char.id : `${char.id} plan ${plan + 1}`;
  const parts = char.strokes.map((s) => s.part).filter(Boolean);
  cap.append(b, ` · ${n} stroke${n > 1 ? 's' : ''}${joins.length ? ` · ${joins.join(', ')}` : ''}`);
  if (parts.length) cap.append(document.createElement('br'), parts.join(' + '));
  return cap;
}

async function main() {
  const sets = document.getElementById('sets');
  const manifest = await (await fetch('data/chars/index.json')).json();
  const chars = new Map();
  await Promise.all(manifest.map(async (id) => {
    const res = await fetch(`data/chars/${encodeURIComponent(id)}.json`);
    chars.set(id, await res.json());
  }));
  sets.textContent = '';
  for (const group of CHAR_GROUPS) {
    const ids = group.ids.filter((id) => chars.has(id));
    if (ids.length === 0) continue;
    const h = document.createElement('h2');
    h.textContent = group.name;
    const row = document.createElement('section');
    row.className = 'set';
    for (const id of ids) {
      const char = chars.get(id);
      for (let p = 0; p < planCount(char); p++) {
        const shown = planChar(char, p);
        const fig = document.createElement('figure');
        if (p > 0) fig.className = 'plan';
        const svg = card(shown);
        fig.style.width = `${svg.getAttribute('width')}px`;
        fig.append(svg, caption(shown, p));
        row.append(fig);
      }
    }
    sets.append(h, row);
  }
  document.body.dataset.ready = '1';
}

main().catch((err) => {
  document.getElementById('status').textContent = `Could not load the characters: ${err.message}`;
});
