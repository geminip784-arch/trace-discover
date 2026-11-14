// tools/make-glyphs.js — run with: npm run glyphs
// Writes data/chars/<id>.json (lowercase: lower-<id>.json) for every character in data/glyphs.js (except
// the ids in OVERRIDES, which keep their hand recording) and data/chars/index.json.
// Prints each character's join gaps and its stroke plans.
import { writeFileSync, existsSync } from 'node:fs';
import { GLYPHS, OVERRIDES } from '../data/glyphs.js';
import { glyphCharacter, characterText, joinGaps } from '../src/glyph-points.js';
import { CHAR_IDS } from '../src/recording.js';
import { charFile } from '../src/session.js';

const dir = new URL('../data/chars/', import.meta.url);

for (const id of CHAR_IDS) {
  if (!GLYPHS[id]) throw new Error(`data/glyphs.js has no ${id}`);
  if (OVERRIDES.includes(id)) {
    if (!existsSync(new URL(`${charFile(id)}.json`, dir))) throw new Error(`${id} is an override but data/chars/${charFile(id)}.json is missing`);
    console.log(`${id}  kept (hand recording)`);
    continue;
  }
  const char = glyphCharacter(id, GLYPHS[id]);
  writeFileSync(new URL(`${charFile(id)}.json`, dir), characterText(char));
  const gaps = joinGaps(char).map((g, k) => `${k + 1}-${k + 2}: ${g.gap}${g.joins ? ' joins' : ''}`);
  const points = char.strokes.map((s) => s.points.length).join(' ');
  console.log(`${id}  width ${char.width}  points ${points}${gaps.length ? `  gaps ${gaps.join(', ')}` : ''}`);
  const plans = [char.strokes, ...(char.plans ?? []).map((p) => p.strokes)];
  if (plans.length > 1) console.log(`   plans: ${plans.map((p) => p.map((s) => s.part).join(' + ')).join('  |  ')}`);
}

writeFileSync(new URL('index.json', dir), `[${CHAR_IDS.map((id) => JSON.stringify(id)).join(', ')}]\n`);
console.log(`data/chars/index.json: ${CHAR_IDS.length} characters`);
