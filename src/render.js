import { resample } from './geometry.js';

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

const SVG_NS = 'http://www.w3.org/2000/svg';

export function drawLines(svg, layout) {
  const { unit, areaWidth, areaHeight, originX, top, lineEnd } = layout;
  svg.setAttribute('viewBox', `0 0 ${areaWidth} ${areaHeight}`);
  svg.replaceChildren();
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
  const { unit, originX, top } = layout;
  const px = ([x, y]) => [originX + (offset + x) * unit, top + y * unit];
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
// `done[i]`: stroke i is finished and stays lit. `active`: the strokes she may draw
// next (more than one when the character has an anyOrder group).
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

export const START_DOT_RADIUS = 0.075; // line units
const GAME_TRACK = {
  dot: { radius: START_DOT_RADIUS, color: 'rgba(53, 208, 127, 0.45)', current: '#35D07F', ring: '#fff' },
  number: { color: '#fff', size: 0.1 },
  arrow: { color: '#2F4BD6', size: 0.07, at: 0.5 },
};

export function drawStageTrack(svg, layout, char, offset, { stage, done, active }) {
  const { unit, originX, top } = layout;
  const look = trackLook(stage);
  const numbers = stage === 1;
  const px = ([x, y]) => [originX + (offset + x) * unit, top + y * unit];
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

  if (numbers) {
    const { size, at, color } = GAME_TRACK.arrow;
    char.strokes.forEach((stroke, i) => {
      if (stroke.kind !== 'line' || done[i]) return;
      const r = resample(stroke.points, 41);
      const m = Math.round(at * 40);
      const [x, y] = px(r[m]);
      const angle = Math.atan2(r[m + 1][1] - r[m - 1][1], r[m + 1][0] - r[m - 1][0]) * 180 / Math.PI;
      const s = size * unit;
      make('polygon', {
        points: `${s},0 ${-s * 0.7},${-s * 0.8} ${-s * 0.7},${s * 0.8}`,
        fill: color,
        transform: `translate(${x} ${y}) rotate(${angle})`,
      });
    });
  }

  // Start dots on top, the active ones last so they are never covered.
  const { dot, number } = GAME_TRACK;
  const order = char.strokes.map((_, i) => i).filter((i) => !active.includes(i) && !done[i]);
  order.push(...active);
  for (const i of order) {
    const isCurrent = active.includes(i);
    if (!numbers && !isCurrent) continue;
    const [cx, cy] = px(char.strokes[i].points[0]);
    make('circle', {
      cx, cy, r: dot.radius * unit, fill: isCurrent ? dot.current : dot.color,
      stroke: dot.ring, 'stroke-width': 0.012 * unit,
    });
    if (numbers) {
      const label = make('text', {
        x: cx,
        y: cy,
        fill: number.color,
        'font-size': number.size * unit,
        'font-family': 'Fredoka, sans-serif',
        'font-weight': '600',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      });
      label.textContent = String(i + 1);
    }
  }
}

// Her ink. Finished strokes are baked into an off-screen canvas; each frame the
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
  let scale = 1;
  let framePending = false;
  let fading = false;

  function setUnitTransform(c) {
    c.setTransform(scale * layout.unit, 0, 0, scale * layout.unit,
      scale * layout.originX, scale * layout.top);
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
    resize(newLayout) {
      layout = newLayout;
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

export function createFx(svg) {
  let layout = null;
  const live = new Set();

  function add(tag, attrs, keyframes, options) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.style.transformBox = 'fill-box';
    el.style.transformOrigin = 'center';
    svg.appendChild(el);
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
    resize(newLayout) {
      layout = newLayout;
      svg.setAttribute('viewBox', `0 0 ${layout.areaWidth} ${layout.areaHeight}`);
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
        svg.appendChild(el);
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
    },
  };
}
