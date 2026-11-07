// tools/missing-cuts.js — run with: npm run missing-cuts
// Measures, once, how Missing piece level 4 shows each picture, and writes
// data/missing-cuts.js:
//   view   a square crop of the picture's 200 x 240 art round what is drawn,
//          so the picture fills its card
//   cuts   the parts of the card (quarters, halves, corners) whose piece is
//          at least MIN_PICTURE picture, not plain card, so every piece holds
//          a recognisable bit of it
// It draws the art in a headless browser, so it needs Playwright (installed
// in the cloud session; not needed to run the app or the tests).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { PARTS, partPoly } from '../src/games.js';
import { MISSING_PICTURES, missingPictureArt } from '../data/games.js';

const MIN_PICTURE = 0.25;
const PAD = 0.04;  // room round the picture inside its crop
const S = 200;     // the card, in pixels (its box is 0..1 in src/games.js)
const { chromium } = createRequire(import.meta.url)('playwright');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');

// Draws an SVG into a canvas and returns its pixels.
async function pixels(svg, w, h) {
  return page.evaluate(async ({ svg, w, h }) => {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h);
    return Array.from(g.getImageData(0, 0, w, h).data);
  }, { svg, w, h });
}
const inner = (art) => art.replace(/^<svg[^>]*>|<\/svg>$/g, '');

// Is the point inside the convex polygon?
function insidePoly([x, y], poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(c) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

const out = {};
for (const id of Object.keys(MISSING_PICTURES)) {
  const art = missingPictureArt(id);
  // 1. Where the art draws (alpha), in art units: a square crop round it.
  const a = await pixels(art.replace('<svg ', '<svg width="400" height="480" '), 400, 480);
  let [x0, y0, x1, y1] = [400, 480, 0, 0];
  for (let y = 0; y < 480; y++) {
    for (let x = 0; x < 400; x++) {
      if (a[(y * 400 + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
  }
  [x0, y0, x1, y1] = [x0 / 2, y0 / 2, (x1 + 1) / 2, (y1 + 1) / 2];
  const side = Math.max(x1 - x0, y1 - y0) * (1 + 2 * PAD);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const view = [cx - side / 2, cy - side / 2, side, side].map((v) => Math.round(v * 10) / 10);

  // 2. The card as level 4 draws it (src/missing.js), on a pure green ground,
  //    and how much of each part is picture.
  const card = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#00FF00"/>`
    + `<svg x="${S * 0.06}" y="${S * 0.06}" width="${S * 0.88}" height="${S * 0.88}" viewBox="${view.join(' ')}">${inner(art)}</svg></svg>`;
  const d = await pixels(card, S, S);
  const cuts = [];
  const share = {};
  for (const part of PARTS.card) {
    const poly = partPoly('card', part).map(([x, y]) => [x * S, y * S]);
    let all = 0;
    let pic = 0;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (!insidePoly([x + 0.5, y + 0.5], poly)) continue;
        all += 1;
        const k = (y * S + x) * 4;
        if (!(d[k] < 60 && d[k + 1] > 200 && d[k + 2] < 60)) pic += 1;
      }
    }
    share[part] = Math.round((pic / all) * 100) / 100;
    if (pic / all >= MIN_PICTURE) cuts.push(part);
  }
  out[id] = { view: view.join(' '), cuts };
  console.log(id.padEnd(8), view.join(' ').padEnd(24), Object.entries(share).map(([p, v]) => `${p} ${v}`).join('  '));
}
await browser.close();

const lines = Object.entries(out).map(([id, v]) => `  ${id}: { view: '${v.view}', cuts: ${JSON.stringify(v.cuts).replace(/,/g, ', ').replace(/"/g, "'")} },`);
writeFileSync(new URL('../data/missing-cuts.js', import.meta.url), `// data/missing-cuts.js — written by tools/missing-cuts.js (npm run missing-cuts). Do not hand-edit.
// Missing piece level 4: each picture's square crop (in its 200 x 240 art) and
// the parts of its card whose piece is at least ${MIN_PICTURE * 100}% picture.
export const MISSING_CUTS = {
${lines.join('\n')}
};
`);
console.log('wrote data/missing-cuts.js');
