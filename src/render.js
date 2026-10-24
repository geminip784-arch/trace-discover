// Guide lines (SVG) and her ink (canvas). Everything is sized in line units:
// 1 unit = sky line to grass line, worked out from the viewport height.

// Height the layout grows to. Above this the lines stop growing and stay centered.
export const MAX_HEIGHT = 800;

// Share of the (capped) height that one line unit takes. 1.3 units then fills ~72%.
const UNIT_SHARE = 0.55;
// Empty strip on the left for Jugnu and buttons (later slices), as a share of the height.
const SIDE_SHARE = 0.2;
// Gap between the strip / right edge and the ends of the lines, in units.
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
};

// Pure maths, no DOM: sizes for a viewport of width x height CSS px.
export function computeLayout(width, height) {
  const capped = Math.min(height, MAX_HEIGHT);
  const unit = UNIT_SHARE * capped;
  const side = Math.round(SIDE_SHARE * capped);
  const areaWidth = Math.max(0, width - side);
  return {
    unit,
    side,
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

// Her ink. Finished strokes are baked into an off-screen canvas; each frame the
// visible canvas copies that and redraws only the stroke she is drawing now.
// The glow is a wide semi-transparent line under the bright core (no shadowBlur).
// Each stroke is one path, so the glow never darkens where its own segments meet.
export function createInk(canvas) {
  const ctx = canvas.getContext('2d');
  const baked = document.createElement('canvas');
  const bakedCtx = baked.getContext('2d');
  const strokes = []; // finished strokes, points in line units
  let current = null;
  let layout = null;
  let scale = 1;
  let framePending = false;

  function setUnitTransform(c) {
    c.setTransform(scale * layout.unit, 0, 0, scale * layout.unit,
      scale * layout.originX, scale * layout.top);
  }

  function strokePath(c, points) {
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    if (points.length === 1) c.lineTo(points[0].x, points[0].y); // a tap shows as a dot
    for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = INK.glow.color;
    c.lineWidth = INK.glow.width;
    c.stroke();
    c.strokeStyle = INK.core.color;
    c.lineWidth = INK.core.width;
    c.stroke();
  }

  function frame() {
    framePending = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baked, 0, 0);
    if (current) {
      setUnitTransform(ctx);
      strokePath(ctx, current);
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
      setUnitTransform(bakedCtx);
      for (const s of strokes) strokePath(bakedCtx, s);
      requestFrame();
    },
    begin(point) {
      current = [point];
      requestFrame();
    },
    add(points) {
      if (!current) return;
      for (const p of points) current.push(p);
      requestFrame();
    },
    end() {
      if (!current) return;
      strokes.push(current);
      setUnitTransform(bakedCtx);
      strokePath(bakedCtx, current);
      current = null;
      requestFrame();
    },
  };
}
