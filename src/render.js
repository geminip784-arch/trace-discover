import { resample, pathLength } from './geometry.js';

// Guide lines (SVG) and her ink (canvas). Everything is sized in line units:
// 1 unit = sky line to grass line, worked out from the viewport height.

// Height the layout grows to. Above this the lines stop growing and stay centered.
export const MAX_HEIGHT = 800;

// Share of the (capped) height that one line unit takes. 1.3 units then fills ~72%.
const UNIT_SHARE = 0.55;
// Gap between each screen edge and the ends of the lines, in units.
const PAD_UNITS = 0.1;

export const LINES = [
  { y: 0,   color: '#5bb8ff', width: 0.012 },                       // sky
  { y: 0.5, color: '#9aa0b8', width: 0.008, dash: [0.05, 0.035] }, // fence
  { y: 1,   color: '#4cc25a', width: 0.012 },                       // grass
  { y: 1.3, color: '#b9834d', width: 0.018 },                       // ground
];

// Her ink: a strong blue, as in docs/mockups/mockup4.html (42, 26 and 12 px at 340 px).
// The glow is two soft layers under the core. Never red.
export const INK = {
  glow: [
    { color: '#4D6BFF', alpha: 0.28, width: 0.124 },
    { color: '#4D6BFF', alpha: 0.5, width: 0.076 },
  ],
  core: { color: '#1D2B8F', width: 0.035 },
  dimAlpha: 0.35, // off the path, or a stroke that started in the wrong place
};

// Pure maths, no DOM: sizes for a viewport of width x height CSS px.
export function computeLayout(width, height) {
  const capped = Math.min(height, MAX_HEIGHT);
  const unit = UNIT_SHARE * capped;
  const areaWidth = width;
  return {
    unit,
    areaWidth,
    areaHeight: height,
    originX: PAD_UNITS * unit,             // x = 0 of the character box, in area px
    top: (height - 1.3 * unit) / 2,        // sky line, in area px
    lineEnd: areaWidth - PAD_UNITS * unit, // right end of the lines, in area px
  };
}

// Area px -> line units.
export function toUnits(px, py, layout) {
  return { x: (px - layout.originX) / layout.unit, y: (py - layout.top) / layout.unit };
}

// Letter units (x = 0 at the left of the character box, `offset` units from the
// start of the lines) <-> area px. The guide, the track, her ink, the effects and
// Jugnu all use these two, so they always agree, whatever size the screen is.
export function letterToPx(layout, offset) {
  return ([x, y]) => [layout.originX + (offset + x) * layout.unit, layout.top + y * layout.unit];
}
export function pxToLetter(p, layout, offset) {
  const u = toUnits(p.x, p.y, layout);
  return [u.x - offset, u.y];
}

// Canvas transform [a, b, c, d, e, f] that draws letter units at device px
// (`scale` device px per CSS px).
export function inkTransform(layout, offset, scale) {
  const [ex, ey] = letterToPx(layout, offset)([0, 0]);
  const k = scale * layout.unit;
  return [k, 0, 0, k, scale * ex, scale * ey];
}

// The screen changed size: area px drawn for (`from`, `fromOffset`) -> area px for
// (`to`, `toOffset`), as a uniform scale k plus a shift. Effects already on
// screen are moved with this, so they stay on the letter.
export function remapPx(from, fromOffset, to, toOffset) {
  const k = to.unit / from.unit;
  const [fx, fy] = letterToPx(from, fromOffset)([0, 0]);
  const [tx, ty] = letterToPx(to, toOffset)([0, 0]);
  return { k, dx: tx - k * fx, dy: ty - k * fy };
}

// Landscape only: a screen taller than it is wide pauses the app.
export const isUpright = (width, height) => height > width;

const SVG_NS = 'http://www.w3.org/2000/svg';

// The writing board (mockup4): a white board with a soft frame, inset from the
// screen edges so the light page background shows round it. CSS px.
export const BOARD = { inset: 12, radius: 32, frame: 8, fill: '#FFFFFF', frameColor: '#D6E6F5' };

export function drawLines(svg, layout) {
  const { unit, areaWidth, areaHeight, originX, top, lineEnd } = layout;
  svg.setAttribute('viewBox', `0 0 ${areaWidth} ${areaHeight}`);
  svg.replaceChildren();
  const board = document.createElementNS(SVG_NS, 'rect');
  const edge = BOARD.inset + BOARD.frame / 2;
  for (const [k, v] of Object.entries({
    x: edge, y: edge, width: areaWidth - 2 * edge, height: areaHeight - 2 * edge,
    rx: BOARD.radius, fill: BOARD.fill, stroke: BOARD.frameColor, 'stroke-width': BOARD.frame,
  })) board.setAttribute(k, v);
  svg.appendChild(board);
  for (const line of LINES) {
    const el = document.createElementNS(SVG_NS, 'line');
    const y = top + line.y * unit;
    el.setAttribute('x1', originX);
    el.setAttribute('x2', lineEnd);
    el.setAttribute('y1', y);
    el.setAttribute('y2', y);
    el.setAttribute('stroke', line.color);
    el.setAttribute('stroke-width', line.width * unit);
    el.setAttribute('stroke-linecap', 'round');
    if (line.dash) el.setAttribute('stroke-dasharray', line.dash.map((d) => d * unit).join(' '));
    svg.appendChild(el);
  }
}

// Where the character box starts, in units from the left end of the lines,
// so a character `charWidth` units wide sits in the middle of the screen.
export function letterOffset(layout, charWidth) {
  const available = (layout.lineEnd - layout.originX) / layout.unit;
  return (available - charWidth) / 2;
}

const TRACK = {
  path: { color: 'rgba(255, 255, 255, 0.16)', width: 0.14 },
  start: { color: 'rgba(255, 255, 255, 0.4)', radius: 0.06 },
};

// The faint track of a character, added on top of the guide lines (call after drawLines).
// `offset` is the character box's x in units, from letterOffset.
export function drawTrack(svg, layout, char, offset) {
  const { unit } = layout;
  const px = letterToPx(layout, offset);
  for (const stroke of char.strokes) {
    const pts = stroke.points.map(px);
    if (stroke.kind === 'line') {
      const el = document.createElementNS(SVG_NS, 'polyline');
      el.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', TRACK.path.color);
      el.setAttribute('stroke-width', TRACK.path.width * unit);
      el.setAttribute('stroke-linecap', 'round');
      el.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(el);
    }
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', pts[0][0]);
    dot.setAttribute('cy', pts[0][1]);
    dot.setAttribute('r', TRACK.start.radius * unit);
    dot.setAttribute('fill', TRACK.start.color);
    svg.appendChild(dot);
  }
}

// The game's track for one stage, added on top of the guide lines (call after drawLines).
// Every width here is a fixed look from docs/mockups/mockup4.html (its pixel sizes
// divided by its 340 px letter height). None of them comes from the scoring
// tolerance: that stays invisible (tests/track.test.js checks this).
// Stage 1: a soft band with a dotted centre line. Stage 2: a thinner band.
// Stage 3: a faint band. A finished stroke: a gold core with a soft halo.
// `done[i]`: stroke i is finished and stays lit.
export const TRACK_COLOR = '#4D6BFF';
export const TRACK_LOOKS = {
  1: { band: 0.18, opacity: 0.16, dots: { color: '#2F4BD6', opacity: 0.85, width: 0.018, gap: 0.047 } },
  2: { band: 0.09, opacity: 0.12 },
  3: { band: 0.065, opacity: 0.05 },
};
export const DONE_LOOK = { core: 0.08, halo: 0.19, shine: 0.03, color: '#FFD43B', haloOpacity: 0.4, shineColor: '#FFFBE0' };
export const trackLook = (stage) => TRACK_LOOKS[stage] ?? TRACK_LOOKS[3];

// Every width the track draws for a stage, in line units (the tests read this).
export function trackWidths(stage) {
  const look = trackLook(stage);
  const widths = [look.band, DONE_LOOK.core, DONE_LOOK.halo, DONE_LOOK.shine];
  if (look.dots) widths.push(look.dots.width);
  return widths;
}

export const START_DOT_RADIUS = 0.075; // line units, the big numbered dot (26 px in mockup4)

// The start markers, in line units, worked out without the DOM (the tests use this).
// Only the next stroke (`current`, the first unfinished in the recorded order)
// gets a big dot. Stage 1: the big dot is numbered with an arrow beside it, and
// every other unfinished stroke gets a small number about 18% along its own path
// (never at its start, where it would hide under another dot). A small number
// that would touch another marker slides further along until it is clear.
// Stage 2: only the next stroke's start dot, no number. Stage 3: one small start
// dot before the first stroke only.
export const MARKERS = {
  ring: 0.012,                    // white ring round every dot
  big: START_DOT_RADIUS,
  small: { radius: 0.042, at: 0.18, step: 0.02, upTo: 0.9 },
  arrow: { radius: 0.042, along: 0.135 },
  stage2: 0.059,                  // 20 px in mockup4
  stage3: 0.038,                  // 13 px in mockup4
  gap: 0.01,                      // markers keep at least this apart
};

// Point and direction (radians) at distance d along a stroke.
function pointAlong(points, d) {
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (seg > 0 && (d <= seg || i === points.length - 1)) {
      const t = Math.min(1, d / seg);
      return { at: [ax + t * (bx - ax), ay + t * (by - ay)], angle: Math.atan2(by - ay, bx - ax) };
    }
    d -= seg;
  }
  return { at: points[0], angle: 0 };
}

export const outerRadius = (m) => m.r + (m.kind === 'arrow' ? 0 : MARKERS.ring);

export function startMarkers(char, done, stage) {
  const current = done.indexOf(false);
  if (current === -1) return [];
  const first = char.strokes[current].points;
  if (stage === 2) return [{ kind: 'dot', stroke: current, at: first[0], r: MARKERS.stage2 }];
  if (stage !== 1) {
    return done.every((d) => !d) ? [{ kind: 'dot', stroke: current, at: first[0], r: MARKERS.stage3 }] : [];
  }
  const out = [{ kind: 'big', stroke: current, at: first[0], r: MARKERS.big, label: current + 1 }];
  if (char.strokes[current].kind === 'line' && pathLength(first) > MARKERS.arrow.along) {
    const { at, angle } = pointAlong(first, MARKERS.arrow.along);
    out.push({ kind: 'arrow', stroke: current, at, angle, r: MARKERS.arrow.radius });
  }
  const clearance = (m) => Math.min(...out.map((o) => Math.hypot(m.at[0] - o.at[0], m.at[1] - o.at[1]) - outerRadius(o) - outerRadius(m)));
  char.strokes.forEach((stroke, i) => {
    if (done[i] || i === current) return;
    const { radius, at, step, upTo } = MARKERS.small;
    const len = pathLength(stroke.points);
    let best = null;
    for (let f = at; f <= upTo + 1e-9; f += step) {
      const m = { kind: 'small', stroke: i, at: pointAlong(stroke.points, f * len).at, r: radius, label: i + 1, f };
      const c = clearance(m);
      if (!best || c > best.c) best = { m, c };
      if (c >= MARKERS.gap) break;
    }
    out.push(best.m);
  });
  return out;
}

const GAME_TRACK = {
  dot: { color: '#35D07F', ring: '#fff' },
  number: { color: '#fff', size: 0.1 },
  small: { fill: '#fff', ring: '#35D07F', color: '#2F4BD6', size: 0.058 },
  arrow: { color: '#2F4BD6', size: 0.042 },
};

export function drawStageTrack(svg, layout, char, offset, { stage, done }) {
  const { unit } = layout;
  const look = trackLook(stage);
  const px = letterToPx(layout, offset);
  const make = (tag, attrs) => {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.appendChild(el);
    return el;
  };
  const path = (points, color, width, extra = {}) => make('polyline', {
    points: points.map(px).map((p) => p.join(',')).join(' '),
    fill: 'none',
    stroke: color,
    'stroke-width': width * unit,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    ...extra,
  });
  const label = (cx, cy, text, color, size) => {
    const el = make('text', {
      x: cx,
      y: cy,
      fill: color,
      'font-size': size * unit,
      'font-family': 'Fredoka, sans-serif',
      'font-weight': '600',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    });
    el.textContent = String(text);
  };

  char.strokes.forEach((stroke, i) => {
    if (stroke.kind !== 'line') return;
    if (done[i]) {
      path(stroke.points, DONE_LOOK.color, DONE_LOOK.halo, { 'stroke-opacity': DONE_LOOK.haloOpacity });
      path(stroke.points, DONE_LOOK.color, DONE_LOOK.core);
      path(stroke.points, DONE_LOOK.shineColor, DONE_LOOK.shine);
      return;
    }
    path(stroke.points, TRACK_COLOR, look.band, { 'stroke-opacity': look.opacity });
    if (look.dots) {
      const { color, opacity, width, gap } = look.dots;
      path(stroke.points, color, width, { 'stroke-opacity': opacity, 'stroke-dasharray': `0.1 ${gap * unit}` });
    }
  });

  // Small numbers first, the next stroke's dot last, so nothing covers it.
  const markers = startMarkers(char, done, stage);
  markers.sort((a, b) => (a.kind === 'small' ? 0 : 1) - (b.kind === 'small' ? 0 : 1));
  const ring = MARKERS.ring * unit;
  for (const m of markers) {
    const [cx, cy] = px(m.at);
    if (m.kind === 'arrow') {
      const s = GAME_TRACK.arrow.size * unit;
      make('polygon', {
        points: `${s},0 ${-s * 0.7},${-s * 0.8} ${-s * 0.7},${s * 0.8}`,
        fill: GAME_TRACK.arrow.color,
        transform: `translate(${cx} ${cy}) rotate(${m.angle * 180 / Math.PI})`,
      });
    } else if (m.kind === 'small') {
      const { fill, ring: ringColor, color, size } = GAME_TRACK.small;
      make('circle', { cx, cy, r: m.r * unit, fill, stroke: ringColor, 'stroke-width': ring });
      label(cx, cy, m.label, color, size);
    } else {
      make('circle', { cx, cy, r: m.r * unit, fill: GAME_TRACK.dot.color, stroke: GAME_TRACK.dot.ring, 'stroke-width': ring });
      if (m.label) label(cx, cy, m.label, GAME_TRACK.number.color, GAME_TRACK.number.size);
    }
  }
}

// Her ink. Every point is stored in letter units ({ x, y }, as the character
// file), never in px, so after any change of screen size (rotation, the browser
// bar, split screen) resize() redraws all of it exactly on the letter again.
// Finished strokes are baked into an off-screen canvas; each frame the
// visible canvas copies that and redraws only the stroke she is drawing now.
// The glow is wide semi-transparent lines under the strong core (no shadowBlur).
// Each point carries a style { dim, glow }: the segment that ends at it is drawn
// dimmed (off the path) and/or without its glow (she went the wrong way).
// Runs of segments with the same style are one path, so the glow never darkens
// where its own segments meet.
const FULL = { dim: false, glow: true };

export function createInk(canvas) {
  const ctx = canvas.getContext('2d');
  const baked = document.createElement('canvas');
  const bakedCtx = baked.getContext('2d');
  let strokes = []; // finished strokes: { id, points (line units), styles, alpha, fade }
  let current = null;
  let nextId = 1;
  let layout = null;
  let offset = 0;
  let scale = 1;
  let framePending = false;
  let fading = false;

  function setUnitTransform(c) {
    c.setTransform(...inkTransform(layout, offset, scale));
  }

  function strokeRun(c, points, from, to, style, alpha) {
    c.beginPath();
    c.moveTo(points[from].x, points[from].y);
    if (from === to) c.lineTo(points[from].x, points[from].y); // a tap shows as a dot
    for (let i = from + 1; i <= to; i++) c.lineTo(points[i].x, points[i].y);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const base = alpha * (style.dim ? INK.dimAlpha : 1);
    if (style.glow) {
      for (const layer of INK.glow) {
        c.globalAlpha = base * layer.alpha;
        c.strokeStyle = layer.color;
        c.lineWidth = layer.width;
        c.stroke();
      }
    }
    c.globalAlpha = base;
    c.strokeStyle = INK.core.color;
    c.lineWidth = INK.core.width;
    c.stroke();
  }

  function drawStroke(c, s) {
    const { points, styles } = s;
    const same = (a, b) => a.dim === b.dim && a.glow === b.glow;
    if (points.length === 1) {
      strokeRun(c, points, 0, 0, styles[0], s.alpha);
    } else {
      let from = 0;
      for (let i = 2; i <= points.length; i++) {
        if (i === points.length || !same(styles[i], styles[from + 1])) {
          strokeRun(c, points, from, i - 1, styles[from + 1], s.alpha);
          from = i - 1;
        }
      }
    }
    c.globalAlpha = 1;
  }

  function rebake() {
    bakedCtx.setTransform(1, 0, 0, 1, 0, 0);
    bakedCtx.clearRect(0, 0, baked.width, baked.height);
    setUnitTransform(bakedCtx);
    for (const s of strokes) drawStroke(bakedCtx, s);
  }

  function frame(now) {
    framePending = false;
    if (fading) {
      for (const s of strokes) {
        if (!s.fade) continue;
        s.fade.start ??= now;
        s.alpha = Math.max(0, 1 - (now - s.fade.start) / s.fade.ms);
      }
      strokes = strokes.filter((s) => !s.fade || s.alpha > 0);
      fading = strokes.some((s) => s.fade);
      rebake();
      if (fading) requestFrame();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baked, 0, 0);
    if (current) {
      setUnitTransform(ctx);
      drawStroke(ctx, current);
    }
  }

  function requestFrame() {
    if (!framePending) {
      framePending = true;
      requestAnimationFrame(frame);
    }
  }

  return {
    // A new screen size: `newOffset` is the character box's x, from letterOffset.
    resize(newLayout, newOffset = 0) {
      layout = newLayout;
      offset = newOffset;
      scale = window.devicePixelRatio || 1;
      const w = Math.round(layout.areaWidth * scale);
      const h = Math.round(layout.areaHeight * scale);
      canvas.width = baked.width = w;
      canvas.height = baked.height = h;
      rebake();
      requestFrame();
    },
    begin(point, style = FULL) {
      current = { points: [point], styles: [style], alpha: 1 };
      requestFrame();
    },
    // styles: one per point, or one style for all of them.
    add(points, styles = FULL) {
      if (!current) return;
      points.forEach((p, i) => {
        current.points.push(p);
        current.styles.push(Array.isArray(styles) ? styles[i] : styles);
      });
      requestFrame();
    },
    // Returns the finished stroke's id (for fade), or null.
    end() {
      if (!current) return null;
      const s = { ...current, id: nextId++ };
      strokes.push(s);
      setUnitTransform(bakedCtx);
      drawStroke(bakedCtx, s);
      current = null;
      requestFrame();
      return s.id;
    },
    // Forget the stroke her finger is drawing now, without finishing it.
    drop() {
      current = null;
      requestFrame();
    },
    // Fade one finished stroke out over `ms`, then forget it. Other strokes stay.
    fade(id, ms) {
      const s = strokes.find((t) => t.id === id);
      if (!s) return;
      s.fade = { ms, start: null };
      fading = true;
      requestFrame();
    },
    // Finish every fade at once (her finger is down: nothing may animate).
    settle() {
      if (!fading) return;
      strokes = strokes.filter((s) => !s.fade);
      fading = false;
      rebake();
      requestFrame();
    },
    clear() {
      strokes = [];
      current = null;
      fading = false;
      rebake();
      requestFrame();
    },
  };
}

// Short effects on an SVG layer above her ink: sparkle, pulse, glow.
// They use the Web Animations API; clear() stops them all at once.
const FX = {
  sparkle: { color: '#FFC21A', count: 9, radius: 0.035 },
  pulse: { color: '#35D07F', width: 0.025 },
  glow: { color: 'rgba(77, 107, 255, 0.5)' },
  letter: { color: '#FFD43B', glow: 'rgba(255, 212, 59, 0.45)' },
};

// Effects are drawn in area px. Each screen size gets its own group; when the
// size changes, the older groups are moved (remapPx) so they stay on the letter.
export function createFx(svg) {
  let layout = null;
  let offset = 0;
  let group = null; // { el, layout, offset }: where new effects go
  let groups = [];
  const live = new Set();

  function target() {
    if (!group) {
      group = { el: document.createElementNS(SVG_NS, 'g'), layout, offset };
      svg.appendChild(group.el);
      groups.push(group);
    }
    return group.el;
  }

  function add(tag, attrs, keyframes, options) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.style.transformBox = 'fill-box';
    el.style.transformOrigin = 'center';
    target().appendChild(el);
    live.add(el);
    const anim = el.animate(keyframes, { fill: 'both', ...options });
    anim.onfinish = () => { el.remove(); live.delete(el); };
    return el;
  }

  const polyAttrs = (pts, width, color) => ({
    points: pts.map((p) => p.join(',')).join(' '),
    fill: 'none',
    stroke: color,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });

  return {
    resize(newLayout, newOffset = 0) {
      layout = newLayout;
      offset = newOffset;
      svg.setAttribute('viewBox', `0 0 ${layout.areaWidth} ${layout.areaHeight}`);
      groups = groups.filter((g) => g.el.isConnected && g.el.childNodes.length > 0);
      for (const g of groups) {
        const { k, dx, dy } = remapPx(g.layout, g.offset, layout, offset);
        g.el.setAttribute('transform', `translate(${dx} ${dy}) scale(${k})`);
      }
      group = null; // effects from now on are drawn for the new size
    },
    // Little stars twinkle along the stroke, start to end. pts in area px.
    sparkle(pts, ms) {
      const { count, radius, color } = FX.sparkle;
      resample(pts, count).forEach(([cx, cy], i) => {
        add('circle', { cx, cy, r: radius * layout.unit, fill: color },
          [{ opacity: 0, transform: 'scale(0.3)' }, { opacity: 1, transform: 'scale(1.2)' }, { opacity: 0, transform: 'scale(0.6)' }],
          { duration: ms / 2, delay: (i * ms) / (2 * count), easing: 'ease-out' });
      });
    },
    // A ring grows out of the start dot twice.
    pulse([cx, cy], radius, ms) {
      add('circle', { cx, cy, r: radius, fill: 'none', stroke: FX.pulse.color, 'stroke-width': FX.pulse.width * layout.unit },
        [{ opacity: 0.9, transform: 'scale(0.8)' }, { opacity: 0, transform: 'scale(2.2)' }],
        { duration: ms / 2, iterations: 2, easing: 'ease-out' });
    },
    // The track of one stroke glows once.
    glowPath(pts, width, ms) {
      add('polyline', polyAttrs(pts, width, FX.glow.color),
        [{ opacity: 0 }, { opacity: 0.7 }, { opacity: 0 }], { duration: ms, easing: 'ease-in-out' });
    },
    // The whole letter glows (placeholder reward). strokes: arrays of area px.
    letterGlow(strokes, width, ms) {
      for (const pts of strokes) {
        add('polyline', polyAttrs(pts, width * 1.6, FX.letter.glow),
          [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0.8, offset: 0.8 }, { opacity: 0 }], { duration: ms });
        add('polyline', polyAttrs(pts, width * 0.5, FX.letter.color),
          [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0.9, offset: 0.8 }, { opacity: 0 }], { duration: ms });
      }
    },
    // Jugnu's glowing trail along a stroke (pts in area px). set(f) shows the first
    // f (0..1) of it; fadeOut(ms) fades it away. clear() removes it too.
    trail(pts, width) {
      const els = [
        polyAttrs(pts, width * 1.6, FX.letter.glow),
        polyAttrs(pts, width * 0.5, FX.letter.color),
      ].map((attrs) => {
        const el = document.createElementNS(SVG_NS, 'polyline');
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        el.setAttribute('pathLength', '1');
        el.setAttribute('stroke-dasharray', '0 2');
        target().appendChild(el);
        live.add(el);
        return el;
      });
      return {
        set(f) {
          for (const el of els) el.setAttribute('stroke-dasharray', `${Math.max(0, Math.min(1, f))} 2`);
        },
        fadeOut(ms) {
          for (const el of els) {
            const anim = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, fill: 'both' });
            anim.onfinish = () => { el.remove(); live.delete(el); };
          }
        },
      };
    },
    clear() {
      for (const el of live) {
        for (const a of el.getAnimations()) a.cancel();
        el.remove();
      }
      live.clear();
      for (const g of groups) g.el.remove();
      groups = [];
      group = null;
    },
  };
}
