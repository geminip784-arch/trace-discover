// tools/twemoji.js — copies the Twemoji pictures the app uses into
// data/twemoji.js (Slice 5M part 3), so nothing is loaded from the network.
//
// Run: npm run twemoji -- <folder of the package's SVGs>
// The pictures come from the npm package @discordapp/twemoji 17.0.3
// (its dist/svg folder). Get it once, in a folder of its own, with
//   npm pack @discordapp/twemoji@17.0.3   and unpack the .tgz there.
// Nothing in that package is run: this tool only reads its .svg files as text.
//
// Which pictures: every `emoji: '<code>'` written in data/finds.js and
// data/games.js (read as text, not imported, so a missing picture never stops
// this tool). Each SVG must be a plain 36 x 36 Twemoji drawing: only shapes and
// groups, colours and transforms. Anything else (scripts, links, images, styles,
// event handlers, url(...)) stops the tool, and nothing is written.
//
// Twemoji graphics: CC BY 4.0. The credit is in README.md, on the parent page's
// credits screen and in assets/twemoji/CREDITS.md.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = '@discordapp/twemoji 17.0.3';
const TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'g']);
const ATTRS = new Set(['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform',
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'points', 'x1', 'y1', 'x2', 'y2']);

// The inner drawing of one Twemoji SVG, checked. Throws on anything unexpected.
export function cleanTwemoji(text, code) {
  // The outer tag may also say xml:space="preserve" (a few files do); nothing else.
  const m = text.trim().match(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 36 36"(?: xml:space="preserve")?>([\s\S]*)<\/svg>$/);
  if (!m) throw new Error(`${code}: not a plain 36 x 36 Twemoji SVG`);
  const body = m[1];
  for (const tag of body.matchAll(/<\/?([a-zA-Z][\w:-]*)([^>]*)>/g)) {
    const [, name, rest] = tag;
    if (!TAGS.has(name)) throw new Error(`${code}: <${name}> is not allowed`);
    for (const a of rest.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
      if (!ATTRS.has(a[1])) throw new Error(`${code}: attribute ${a[1]} is not allowed`);
      if (/url\(|javascript:|[<>]/i.test(a[2])) throw new Error(`${code}: value of ${a[1]} is not allowed`);
    }
    const left = rest.replace(/([\w:-]+)\s*=\s*"([^"]*)"/g, '').replace(/[\s/]/g, '');
    if (left) throw new Error(`${code}: unexpected text in <${name}>`);
  }
  if (body.replace(/<[^>]*>/g, '').trim()) throw new Error(`${code}: text outside the shapes`);
  return body;
}

// Every emoji code written in the data files, sorted.
export function codesUsed(root = new URL('..', import.meta.url)) {
  const codes = new Set();
  for (const file of ['data/finds.js', 'data/games.js']) {
    const text = readFileSync(new URL(file, root), 'utf8');
    for (const m of text.matchAll(/emoji: '([0-9a-f-]+)'/g)) codes.add(m[1]);
  }
  return [...codes].sort();
}

function main() {
  const dir = process.argv[2];
  if (!dir || !existsSync(dir)) {
    console.error('Usage: npm run twemoji -- <folder of the package\'s SVGs (dist/svg)>');
    process.exit(1);
  }
  const codes = codesUsed();
  const out = {};
  for (const code of codes) {
    const file = join(dir, `${code}.svg`);
    if (!existsSync(file)) throw new Error(`${code}.svg is not in ${dir}`);
    out[code] = cleanTwemoji(readFileSync(file, 'utf8'), code);
  }
  const lines = codes.map((c) => `  '${c}': '${out[c]}',`);
  writeFileSync(new URL('../data/twemoji.js', import.meta.url), `// data/twemoji.js — written by \`npm run twemoji\` (tools/twemoji.js). Do not edit by hand.
// The Twemoji pictures the app uses: each is the inside of a 36 x 36 SVG.
// Emoji pictures from Twemoji, © 2014–2021 Twitter, Inc. and other contributors,
// © 2022–present Jason Sofonia & Justine De Caires. Licensed under CC BY 4.0
// (https://creativecommons.org/licenses/by/4.0/). Copied from ${SOURCE}.
// See assets/twemoji/CREDITS.md.

export const TWEMOJI_SOURCE = '${SOURCE}';
export const TWEMOJI = {
${lines.join('\n')}
};
`);
  console.log(`data/twemoji.js: ${codes.length} pictures`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
