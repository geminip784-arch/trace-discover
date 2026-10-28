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

const INK = {
  glow: { color: 'rgba(255, 215, 60, 0.45)', width: 0.14 },
  core: { color: '#ffe85c', width: 0.045 },
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
// The path is as wide as the stage's tolerance allows on each side.
// Stage 1: every stroke, numbered start dots and an arrow on each stroke.
// Stage 2: thinner and fainter, no numbers or arrows, only the current start dot glows.
// Strokes before `current` are done and stay lit.
const STAGE_TRACK = {
  1: { color: 'rgba(255, 255, 255, 0.18)', numbers: true, arrows: true },
  2: { color: 'rgba(255, 255, 255, 0.10)', numbers: false, arrows: false },
};
const GAME_TRACK = {
  done: 'rgba(255, 226, 120, 0.42)',
  dot: { radius: 0.075, color: 'rgba(255, 255, 255, 0.4)', current: '#ffe066', halo: 'rgba(255, 224, 102, 0.3)' },
  number: { color: '#1b1f3a', size: 0.1 },
  arrow: { color: 'rgba(255, 255, 255, 0.55)', size: 0.07, at: 0.5 },
};

export function drawStageTrack(svg, layout, char, offset, { stage, current, tolerance }) {
  const { unit, originX, top } = layout;
  const look = STAGE_TRACK[stage] ?? STAGE_TRACK[2];
  const px = ([x, y]) => [originX + (offset + x) * unit, top + y * unit];
  const make = (tag, attrs) => {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.appendChild(el);
    return el;
  };

  char.strokes.forEach((stroke, i) => {
    if (stroke.kind !== 'line') return;
    make('polyline', {
      points: stroke.points.map(px).map((p) => p.join(',')).join(' '),
      fill: 'none',
      stroke: i < current ? GAME_TRACK.done : look.color,
      'stroke-width': 2 * tolerance * unit,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
  });

  if (look.arrows) {
    const { size, at, color } = GAME_TRACK.arrow;
    for (const stroke of char.strokes) {
      if (stroke.kind !== 'line') continue;
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
    }
  }

  // Start dots on top, the current one last so it is never covered.
  const { dot, number } = GAME_TRACK;
  const order = char.strokes.map((_, i) => i).filter((i) => i !== current);
  if (current < char.strokes.length) order.push(current);
  for (const i of order) {
    const isCurrent = i === current;
    if (!look.numbers && !isCurrent) continue;
    const [cx, cy] = px(char.strokes[i].points[0]);
    if (isCurrent) make('circle', { cx, cy, r: dot.radius * 1.9 * unit, fill: dot.halo });
    make('circle', { cx, cy, r: dot.radius * unit, fill: isCurrent ? dot.current : dot.color });
    if (look.numbers) {
      const label = make('text', {
        x: cx,
        y: cy,
        fill: number.color,
        'font-size': number.size * unit,
        'font-family': 'sans-serif',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      });
      label.textContent = String(i + 1);
    }
  }
}

// Her ink. Finished strokes are baked into an off-screen canvas; each frame the
// visible canvas copies that and redraws only the stroke she is drawing now.
// The glow is a wide semi-transparent line under the bright core (no shadowBlur).
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
    c.globalAlpha = alpha * (style.dim ? INK.dimAlpha : 1);
    if (style.glow) {
      c.strokeStyle = INK.glow.color;
      c.lineWidth = INK.glow.width;
      c.stroke();
    }
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
  sparkle: { color: '#fff6c8', count: 9, radius: 0.035 },
  pulse: { color: '#ffe066', width: 0.025 },
  glow: { color: 'rgba(255, 230, 120, 0.85)' },
  letter: { color: '#ffe066', glow: 'rgba(255, 215, 60, 0.5)' },
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
    clear() {
      for (const el of live) {
        for (const a of el.getAnimations()) a.cancel();
        el.remove();
      }
      live.clear();
    },
  };
}
