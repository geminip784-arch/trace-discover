// Stroke recorder (parent tool, recorder.html). Uses the same layout and toUnits()
// as the app, so a recorded point means the same thing in index.html.

import { computeLayout, drawLines, letterOffset, toUnits } from './render.js';
import { trackSinglePointer } from './input.js';
import {
  CHAR_IDS, CHAR_GROUPS, isTooShort, processStroke, tapToDot, straighten, smooth, joinGap,
  strokeOrderOf, strokeCountWarnings, buildCharacter, exportBundle,
} from './recording.js';
import { JOIN_GAP } from './variants.js';

const STORAGE_KEY = 'trace-discover.recorder.chars';
const BOX_WIDTH = 0.75; // default box: the faint L in index.html (L.example.json width)
const GUIDE_FONT = 'sans-serif';
const SVG_NS = 'http://www.w3.org/2000/svg';

const $ = (id) => document.getElementById(id);
const area = $('area');
const linesSvg = $('lines');
const marksSvg = $('marks');
const live = $('live');
const liveCtx = live.getContext('2d');

// ---- State ----
const saved = loadSaved();  // id -> character object
let current = CHAR_IDS[0];  // character being recorded
let strokes = [];           // { kind, points } in character units
let direction = 'ltr';
let dotNext = false;
let dirty = false;          // strokes changed since the last save or load
let guideOn = false;
let layout;
let offset;                 // x of the character box, in units from the left end of the lines
let boxWidth = BOX_WIDTH;   // the current character's rough width from the stroke-order guide
let inApp = new Set();      // ids listed in data/chars/index.json
let scale = 1;
let drawing = null;         // the stroke in progress: { px: [[x, y]], units: [[x, y]] }
let playing = null;         // requestAnimationFrame id while Play runs

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}

// ---- Coordinates ----
const toChar = (p) => {
  const u = toUnits(p.x, p.y, layout);
  return [u.x - offset, u.y];
};
const toPx = ([x, y]) => [layout.originX + (offset + x) * layout.unit, layout.top + y * layout.unit];

// ---- Drawing the marks: box, guide glyph, recorded strokes ----
function svgEl(name, attrs, parent = marksSvg) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent.appendChild(el);
  return el;
}

// Font size that makes a capital H exactly 1 unit tall, and the glyph's left ink edge.
function measureGlyph(ch, unit) {
  liveCtx.save();
  liveCtx.font = `100px ${GUIDE_FONT}`;
  const capRatio = liveCtx.measureText('H').actualBoundingBoxAscent / 100;
  const fontSize = unit / capRatio;
  liveCtx.font = `${fontSize}px ${GUIDE_FONT}`;
  const left = liveCtx.measureText(ch).actualBoundingBoxLeft;
  liveCtx.restore();
  return { fontSize, left };
}

function drawMarks() {
  const { unit, areaWidth, areaHeight } = layout;
  marksSvg.setAttribute('viewBox', `0 0 ${areaWidth} ${areaHeight}`);
  marksSvg.replaceChildren();

  const [bx, by] = toPx([0, 0]);
  svgEl('rect', {
    x: bx, y: by, width: boxWidth * unit, height: unit,
    fill: 'rgba(255, 255, 255, 0.04)', stroke: 'rgba(255, 255, 255, 0.25)',
    'stroke-width': 1, 'stroke-dasharray': '6 6',
  });

  if (guideOn) {
    const { fontSize, left } = measureGlyph(current, unit);
    const t = svgEl('text', {
      x: bx + left, y: layout.top + unit, 'font-size': fontSize, 'font-family': GUIDE_FONT,
      fill: 'rgba(255, 255, 255, 0.18)',
    });
    t.textContent = current;
  }

  strokes.forEach((s, i) => {
    const pts = s.points.map(toPx);
    const [sx, sy] = pts[0];
    if (s.kind === 'line') {
      svgEl('polyline', {
        points: pts.map((p) => p.join(',')).join(' '), fill: 'none',
        stroke: 'rgba(255, 232, 92, 0.85)', 'stroke-width': 0.03 * unit,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      });
      // Arrowhead at the end, pointing along the last part of the stroke.
      const end = pts[pts.length - 1];
      const from = pts[Math.max(0, pts.length - 4)];
      const ang = Math.atan2(end[1] - from[1], end[0] - from[0]);
      const len = 0.07 * unit;
      const wing = (a) => [end[0] - len * Math.cos(ang + a), end[1] - len * Math.sin(ang + a)];
      svgEl('polygon', {
        points: [end, wing(0.45), wing(-0.45)].map((p) => p.join(',')).join(' '),
        fill: 'rgba(255, 232, 92, 0.95)',
      });
      svgEl('circle', { cx: sx, cy: sy, r: 0.035 * unit, fill: '#4cc25a' });
    } else {
      svgEl('circle', { cx: sx, cy: sy, r: 0.04 * unit, fill: '#ffe85c', stroke: '#4cc25a', 'stroke-width': 3 });
    }
    // Strokes that start at the same spot get their numbers side by side (1 2 3), not on top of each other.
    const sameStart = strokes.slice(i + 1)
      .filter((o) => Math.hypot(o.points[0][0] - s.points[0][0], o.points[0][1] - s.points[0][1]) < 0.06).length;
    const label = svgEl('text', {
      x: sx - (0.08 + 0.08 * sameStart) * unit, y: sy - 0.05 * unit, 'font-size': 0.1 * unit,
      'font-family': 'system-ui, sans-serif', 'font-weight': 700, fill: '#ffffff',
      'text-anchor': 'middle',
    });
    label.textContent = String(i + 1);
  });

  // Join check: a thin line from each stroke's end to the next stroke's start, with the gap.
  // Green when the one-stroke rule (JOIN_GAP) would let her draw both in one go.
  strokes.forEach((s, i) => {
    const j = joinGap(strokes, i);
    if (!j) return;
    const [ex, ey] = toPx(s.points[s.points.length - 1]);
    const [nx, ny] = toPx(strokes[i + 1].points[0]);
    const color = j.joins ? '#1f9d3a' : '#5a6190';
    svgEl('line', { x1: ex, y1: ey, x2: nx, y2: ny, stroke: color, 'stroke-width': 2, 'stroke-dasharray': '4 4' });
    const t = svgEl('text', {
      x: (ex + nx) / 2 + 0.04 * unit, y: (ey + ny) / 2 + 0.1 * unit, 'font-size': 0.065 * unit,
      'font-family': 'system-ui, sans-serif', 'font-weight': 700, fill: color,
    });
    t.textContent = `${i + 1}→${i + 2}: ${j.gap}${j.joins ? ' joins' : ''}`;
  });
}

// ---- Stroke-order guide (top right): numbered strokes, the words, the count and the last join ----
function drawGuide() {
  const ref = $('ref');
  ref.replaceChildren();
  const order = strokeOrderOf(current);
  if (!order) {
    ref.hidden = true;
    return;
  }
  ref.hidden = false;
  const pad = 0.2;
  const svg = svgEl('svg', {
    viewBox: `${-pad} ${-pad} ${order.width + 2 * pad} ${1 + 2 * pad}`, preserveAspectRatio: 'xMidYMid meet',
  }, ref);
  for (const y of [0, 0.5, 1]) {
    svgEl('line', {
      x1: -pad, x2: order.width + pad, y1: y, y2: y, stroke: 'rgba(255, 255, 255, 0.25)',
      'stroke-width': 0.012, 'stroke-dasharray': y === 0.5 ? '0.04 0.04' : 'none',
    }, svg);
  }
  order.strokes.forEach((st, i) => {
    const pts = st.path;
    const next = i === strokes.length;
    svgEl('polyline', {
      points: pts.map((p) => p.join(',')).join(' '), fill: 'none',
      stroke: next ? '#ffe85c' : 'rgba(255, 232, 92, 0.6)', 'stroke-width': next ? 0.05 : 0.035,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }, svg);
    const end = pts[pts.length - 1];
    const from = pts[Math.max(0, pts.length - 3)];
    const ang = Math.atan2(end[1] - from[1], end[0] - from[0]);
    const wing = (a) => [end[0] - 0.09 * Math.cos(ang + a), end[1] - 0.09 * Math.sin(ang + a)];
    svgEl('polygon', { points: [end, wing(0.5), wing(-0.5)].map((p) => p.join(',')).join(' '), fill: '#ffe85c' }, svg);
    const [sx, sy] = pts[0];
    svgEl('circle', { cx: sx, cy: sy, r: 0.045, fill: '#4cc25a' }, svg);
    const sameStart = order.strokes.slice(i + 1)
      .filter((o) => Math.hypot(o.path[0][0] - sx, o.path[0][1] - sy) < 0.06).length;
    const n = svgEl('text', {
      x: sx - 0.1 - 0.1 * sameStart, y: sy - 0.04, 'font-size': 0.14, 'font-weight': 700,
      'font-family': 'system-ui, sans-serif', fill: '#ffffff', 'text-anchor': 'middle',
    }, svg);
    n.textContent = String(i + 1);
  });

  const list = document.createElement('ol');
  order.strokes.forEach((st, i) => {
    const li = document.createElement('li');
    li.textContent = st.say;
    if (i < strokes.length) li.className = 'done';
    else if (i === strokes.length) li.className = 'next';
    list.appendChild(li);
  });
  ref.appendChild(list);

  const count = document.createElement('div');
  const want = order.strokes.length;
  count.className = `count ${strokes.length > want ? 'warn' : strokes.length === want ? 'good' : ''}`;
  count.textContent = `Strokes: ${strokes.length} of ${want}`
    + (strokes.length > want ? ' (more than the guide)' : '') + ` · family: ${order.family}`;
  ref.appendChild(count);

  // The newest join: the end of the stroke before the last to the start of the last.
  const j = joinGap(strokes, strokes.length - 2);
  if (j) {
    const join = document.createElement('div');
    join.className = `join ${j.joins ? 'good' : ''}`;
    join.textContent = `Gap ${strokes.length - 1}→${strokes.length}: ${j.gap} `
      + (j.joins ? `(≤ ${JOIN_GAP}: she may draw them as one stroke)` : `(more than ${JOIN_GAP}: no join)`);
    ref.appendChild(join);
  }
}

// ---- Live ink and Play, on the canvas ----
function clearLive() {
  liveCtx.setTransform(1, 0, 0, 1, 0, 0);
  liveCtx.clearRect(0, 0, live.width, live.height);
  liveCtx.setTransform(scale, 0, 0, scale, 0, 0);
}

function strokePx(pts, width = 0.035 * layout.unit) {
  liveCtx.beginPath();
  liveCtx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 1) liveCtx.lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) liveCtx.lineTo(pts[i][0], pts[i][1]);
  liveCtx.lineCap = 'round';
  liveCtx.lineJoin = 'round';
  liveCtx.strokeStyle = '#ffffff';
  liveCtx.lineWidth = width;
  liveCtx.stroke();
}

let framePending = false;
function requestLiveFrame() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(() => {
    framePending = false;
    clearLive();
    if (drawing) strokePx(drawing.px);
  });
}

function stopPlay() {
  if (playing !== null) cancelAnimationFrame(playing);
  playing = null;
  clearLive();
}

const LINE_MS = 700;
const DOT_MS = 300;
const GAP_MS = 200;

function play() {
  stopPlay();
  if (strokes.length === 0) return;
  const plan = [];
  let t = 0;
  for (const s of strokes) {
    const ms = s.kind === 'line' ? LINE_MS : DOT_MS;
    plan.push({ s, from: t, to: t + ms });
    t += ms + GAP_MS;
  }
  const total = t + 400;
  const start = performance.now();
  const frame = (now) => {
    const el = now - start;
    clearLive();
    for (const { s, from, to } of plan) {
      if (el < from) break;
      const pts = s.points.map(toPx);
      if (s.kind === 'dot') {
        strokePx(pts, 0.1 * layout.unit);
        continue;
      }
      const k = Math.min(1, (el - from) / (to - from));
      const n = Math.max(1, Math.round(k * (pts.length - 1)));
      strokePx(pts.slice(0, n + 1), 0.06 * layout.unit);
    }
    if (el < total) playing = requestAnimationFrame(frame);
    else stopPlay();
  };
  playing = requestAnimationFrame(frame);
}

// ---- Character picker: a grid with one row per group, coloured by status ----
const charButtons = {};
for (const group of CHAR_GROUPS) {
  const row = document.createElement('div');
  row.className = 'group';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = group.name;
  row.appendChild(name);
  for (const id of group.ids) {
    const b = document.createElement('button');
    b.className = 'tile';
    b.textContent = id;
    b.addEventListener('click', () => {
      $('picker').hidden = true;
      pickChar(id);
    });
    row.appendChild(b);
    charButtons[id] = b;
  }
  $('picker-groups').appendChild(row);
}
$('pick').addEventListener('click', () => {
  updateButtons();
  $('picker').hidden = false;
});
$('picker-close').addEventListener('click', () => {
  $('picker').hidden = true;
});

function statusText(id) {
  const parts = [];
  if (inApp.has(id)) parts.push('in the app');
  if (saved[id]) parts.push('saved here');
  return parts.length ? parts.join(', ') : 'not recorded yet';
}

// ---- Buttons ----
function updateButtons() {
  for (const id of CHAR_IDS) {
    const b = charButtons[id];
    b.classList.toggle('app', inApp.has(id));
    b.classList.toggle('saved', Boolean(saved[id]));
    b.classList.toggle('current', id === current);
    b.title = statusText(id);
  }
  $('pick').textContent = `Character: ${current}`;
  $('char-status').textContent = statusText(current);
  const last = strokes[strokes.length - 1];
  $('undo').disabled = strokes.length === 0;
  $('clear').disabled = strokes.length === 0;
  $('straighten').disabled = !last || last.kind !== 'line';
  $('smooth').disabled = !last || last.kind !== 'line';
  $('play').disabled = strokes.length === 0;
  $('save').disabled = strokes.length === 0 || !dirty;
  $('save').classList.toggle('unsaved', strokes.length > 0 && dirty);
  $('dot').classList.toggle('on', dotNext);
  $('direction').textContent = direction === 'ltr' ? 'Direction: left to right' : 'Direction: right to left';
  $('guide').textContent = guideOn ? 'Guide glyph: on' : 'Guide glyph: off';
  $('guide').classList.toggle('on', guideOn);
}

function refresh() {
  drawMarks();
  drawGuide();
  updateButtons();
}

function changed() {
  dirty = true;
  refresh();
}

function loadChar(id) {
  stopPlay();
  current = id;
  boxWidth = strokeOrderOf(id)?.width ?? BOX_WIDTH;
  offset = letterOffset(layout, boxWidth);
  const c = saved[id];
  strokes = c ? c.strokes.map((s) => ({ kind: s.kind, points: s.points.map((p) => [...p]) })) : [];
  direction = c ? c.direction : 'ltr';
  dotNext = false;
  dirty = false;
  refresh();
}

function pickChar(id) {
  if (id === current) return;
  if (dirty && strokes.length > 0) {
    askDiscard(() => loadChar(id));
    return;
  }
  loadChar(id);
}

let onDiscard = null;
function askDiscard(then) {
  onDiscard = then;
  $('discard').hidden = false;
}
$('discard-yes').addEventListener('click', () => {
  $('discard').hidden = true;
  const then = onDiscard;
  onDiscard = null;
  if (then) then();
});
$('discard-no').addEventListener('click', () => {
  $('discard').hidden = true;
  onDiscard = null;
});

$('undo').addEventListener('click', () => {
  stopPlay();
  strokes.pop();
  changed();
});
$('clear').addEventListener('click', () => {
  stopPlay();
  strokes = [];
  changed();
});
$('straighten').addEventListener('click', () => {
  const last = strokes[strokes.length - 1];
  if (!last || last.kind !== 'line') return;
  stopPlay();
  last.points = straighten(last.points);
  changed();
});
$('smooth').addEventListener('click', () => {
  const last = strokes[strokes.length - 1];
  if (!last || last.kind !== 'line') return;
  stopPlay();
  last.points = smooth(last.points);
  changed();
});
$('dot').addEventListener('click', () => {
  dotNext = !dotNext;
  updateButtons();
});
$('play').addEventListener('click', play);
$('direction').addEventListener('click', () => {
  direction = direction === 'ltr' ? 'rtl' : 'ltr';
  changed();
});
$('guide').addEventListener('click', () => {
  guideOn = !guideOn;
  refresh();
});
$('save').addEventListener('click', () => {
  if (strokes.length === 0) return;
  saved[current] = buildCharacter(current, strokes, direction);
  if (persist()) dirty = false;
  refresh();
});

// Export: first a warning if any saved character's stroke count differs from the guide
// (warn, don't block), then the bundle.
$('export').addEventListener('click', () => {
  const warnings = strokeCountWarnings(saved);
  if (warnings.length === 0) {
    showExport();
    return;
  }
  const list = $('warn-list');
  list.replaceChildren();
  for (const w of warnings) {
    const li = document.createElement('li');
    li.textContent = `${w.id}: ${w.recorded} recorded, the guide has ${w.expected}`;
    list.appendChild(li);
  }
  $('warn').hidden = false;
});
$('warn-back').addEventListener('click', () => {
  $('warn').hidden = true;
});
$('warn-export').addEventListener('click', () => {
  $('warn').hidden = true;
  showExport();
});

async function showExport() {
  const text = exportBundle(saved);
  const box = $('export-text');
  box.value = text;
  $('export-status').textContent = 'Copying…';
  $('export-box').hidden = false;
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch { /* clipboard blocked or unavailable */ }
  const count = Object.keys(saved).length;
  $('export-status').textContent = copied
    ? `Copied ${count} character(s) to the clipboard. The same text is below.`
    : `Could not copy automatically. Tap Select all, then copy the text below (${count} character(s)).`;
}
$('export-select').addEventListener('click', () => {
  const box = $('export-text');
  box.focus();
  box.select();
});
$('export-close').addEventListener('click', () => {
  $('export-box').hidden = true;
});

// ---- Writing ----
trackSinglePointer(area, {
  onStart: (p) => {
    stopPlay();
    drawing = { px: [[p.x, p.y]], units: [toChar(p)] };
    requestLiveFrame();
  },
  onMove: (points) => {
    if (!drawing) return;
    for (const p of points) {
      drawing.px.push([p.x, p.y]);
      drawing.units.push(toChar(p));
    }
    requestLiveFrame();
  },
  onEnd: () => {
    if (!drawing) return;
    const raw = drawing.units;
    drawing = null;
    requestLiveFrame();
    if (dotNext) {
      strokes.push({ kind: 'dot', points: tapToDot(raw) });
      dotNext = false;
      changed();
    } else if (!isTooShort(raw)) {
      strokes.push({ kind: 'line', points: processStroke(raw) });
      changed();
    }
  },
});

// ---- Layout ----
function applyLayout() {
  layout = computeLayout(window.innerWidth, window.innerHeight);
  offset = letterOffset(layout, boxWidth);
  scale = window.devicePixelRatio || 1;
  live.width = Math.round(layout.areaWidth * scale);
  live.height = Math.round(layout.areaHeight * scale);
  drawLines(linesSvg, layout);
  clearLive();
  refresh();
}

let resizePending = false;
window.addEventListener('resize', () => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => { resizePending = false; applyLayout(); });
});

// Block long-press menus, text selection and dragging, except inside the export text box.
for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
  document.addEventListener(type, (e) => {
    if (e.target.id !== 'export-text') e.preventDefault();
  });
}

// Which characters the app already has. A local file next to this page, so no network.
fetch('data/chars/index.json')
  .then((r) => (r.ok ? r.json() : []))
  .then((ids) => {
    inApp = new Set(Array.isArray(ids) ? ids : []);
    updateButtons();
  })
  .catch(() => { /* opened without a server: statuses show "saved here" only */ });

applyLayout();
loadChar(current);
