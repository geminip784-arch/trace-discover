// tools/crude-report.js — how the copy-it round (src/copy.js) judges letters
// written the way a 4-year-old writes them (tests/crude-letters.js).
// Run: npm run crude-report      (add a letter to see only that one: npm run crude-report M)
// Prints one line per crude letter: pass or fail, the reason, the nearest
// template and its $P distance, the look-alike and missing part, and the size.
import { readFileSync } from 'node:fs';
import { scoreCopy, compareIds, inkExplained, inkRatio } from '../src/copy.js';
import { crudeLetters, SHAPES } from '../tests/crude-letters.js';
import { charFile } from '../src/session.js';

const load = (id) => JSON.parse(readFileSync(new URL(`../data/chars/${charFile(id)}.json`, import.meta.url), 'utf8'));
const only = process.argv.slice(2);
const ids = only.length ? only : Object.keys(SHAPES);
const fmt = (v) => (Number.isFinite(v) ? v.toFixed(2) : '-');
let fails = 0;
let total = 0;
for (const { id, name, hand, strokes } of crudeLetters(ids)) {
  const char = load(id);
  const others = compareIds(id).filter((i) => i !== id).map(load);
  const r = scoreCopy(strokes, char, { others });
  total += 1;
  if (!r.ok) fails += 1;
  const why = r.ok ? 'pass' : `FAIL ${r.reason}`;
  const extra = [
    r.match ? `nearest ${r.match.id}${r.match.mirrored ? ' (mirrored)' : ''} plan ${r.match.plan} ${fmt(r.match.distance)}` : '',
    r.lookalike ? `looks like ${r.lookalike}` : '',
    r.missing ? `missing ${r.missing.part} (${fmt(r.missing.coverage)})` : '',
    `size ${fmt(r.size)}`,
    `ink near ${fmt(inkExplained(strokes, char))} length ${fmt(inkRatio(strokes, char))}`,
  ].filter(Boolean).join(', ');
  console.log(`${id}  ${name.padEnd(44)} ${hand.padEnd(20)} ${why.padEnd(26)} ${extra}`);
}
console.log(`\n${total - fails} of ${total} pass, ${fails} fail`);
