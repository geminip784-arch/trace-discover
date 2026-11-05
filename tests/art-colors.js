// tests/art-colors.js — reads the colors drawn in an inline SVG picture, for
// the tests of Sort it (tests/sort.test.js) and Odd one out (tests/odd.test.js).
// Not a test file itself (no .test.js), so `npm test` does not run it alone.

export function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}
// A real color (not white, grey, near-black ink or a pale tint).
export const chromatic = (hex) => { const c = hsl(hex); return c.s >= 0.4 && c.l >= 0.2 && c.l <= 0.85; };
export const HUES = { red: (h) => h <= 15 || h >= 345, blue: (h) => h >= 195 && h <= 250 };

// The bounding box of a path, walking its commands (absolute and relative).
function pathBox(d) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  const ARGS = { m: 2, l: 2, h: 1, v: 1, q: 4, c: 6, s: 4, t: 2, a: 7, z: 0 };
  let x = 0; let y = 0; let sx = 0; let sy = 0;
  const xs = []; const ys = [];
  let cmd = null;
  let i = 0;
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) { cmd = toks[i++]; if (cmd.toLowerCase() === 'z') { x = sx; y = sy; continue; } }
    const lc = cmd.toLowerCase();
    const rel = cmd === lc;
    const n = toks.slice(i, i + ARGS[lc]).map(Number);
    i += ARGS[lc];
    const pts = [];
    if (lc === 'h') pts.push([rel ? x + n[0] : n[0], y]);
    else if (lc === 'v') pts.push([x, rel ? y + n[0] : n[0]]);
    else if (lc === 'a') pts.push([rel ? x + n[5] : n[5], rel ? y + n[6] : n[6]]);
    else for (let k = 0; k < n.length; k += 2) pts.push([rel ? x + n[k] : n[k], rel ? y + n[k + 1] : n[k + 1]]);
    for (const p of pts) { xs.push(p[0]); ys.push(p[1]); }
    [x, y] = pts[pts.length - 1];
    if (lc === 'm') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
  }
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

// Every element's colors, with a rough area for each filled shape.
export function colorsOf(art) {
  const out = [];
  const groups = []; // the fill of each <g> we are inside (null when it sets none)
  for (const [tag, name] of art.matchAll(/<\/?(g|rect|circle|ellipse|polygon|path|line)\b[^>]*>/g)) {
    const attr = (a) => tag.match(new RegExp(`\\s${a}="([^"]+)"`))?.[1];
    const num = (a) => Number(attr(a));
    if (name === 'g') {
      if (tag.startsWith('</')) groups.pop();
      else if (!tag.endsWith('/>')) groups.push(attr('fill') ?? null);
      continue;
    }
    let area = 0;
    if (name === 'rect') area = num('width') * num('height');
    if (name === 'circle') area = Math.PI * num('r') ** 2;
    if (name === 'ellipse') area = Math.PI * num('rx') * num('ry');
    if (name === 'polygon') {
      const p = attr('points').trim().split(/[\s,]+/).map(Number);
      for (let k = 0; k < p.length; k += 2) area += (p[k] * p[(k + 3) % p.length] - p[(k + 2) % p.length] * p[k + 1]) / 2;
      area = Math.abs(area);
    }
    if (name === 'path') area = pathBox(attr('d'));
    // A shape with no fill of its own takes the fill of the group round it.
    const fill = attr('fill') ?? [...groups].reverse().find((f) => f) ?? null;
    if (fill && /^#[0-9a-fA-F]{6}$/.test(fill)) out.push({ color: fill, area });
    const stroke = attr('stroke');
    if (stroke && /^#[0-9a-fA-F]{6}$/.test(stroke)) out.push({ color: stroke, area: 0 });
  }
  return out;
}

// A color's family by hue, or null for white, grey, near-black or a pale tint.
// Brown and orange share hues; brown is the duller one.
export function family(hex) {
  if (!chromatic(hex)) return null;
  const { h, s } = hsl(hex);
  if (h <= 15 || h >= 345) return 'red';
  if (h < 45) return s < 0.75 ? 'brown' : 'orange';
  if (h <= 70) return 'yellow';
  if (h >= 75 && h <= 170) return 'green';
  if (h >= 190 && h <= 250) return 'blue';
  if (h >= 255 && h <= 300) return 'purple';
  if (h > 300 && h < 345) return 'pink';
  return null;
}

// The color of the biggest shape in a picture: among real colors, or (grey)
// among every shape but white and the near-black shadows and ink.
export function biggestColor(art, { neutral = false } = {}) {
  const cs = colorsOf(art).filter((c) => (neutral ? hsl(c.color).l > 0.15 && hsl(c.color).l < 0.95 : chromatic(c.color)));
  return cs.reduce((a, c) => (c.area > a.area ? c : a), { area: -1 }).color;
}
