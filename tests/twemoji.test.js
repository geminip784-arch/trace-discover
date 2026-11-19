// Slice 5M part 3: the find pictures become Twemoji (CC BY 4.0), copied into
// the repo. Every picture used is there, nothing is loaded from the network,
// the credit is everywhere it must be, the kept drawings lost their faces,
// teddy replaced toys, and apple and tomato never share a scene or set.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { TWEMOJI, TWEMOJI_SOURCE } from '../data/twemoji.js';
import { OBJECTS, THINGS, TWEMOJI_FINDS, LOOKALIKES, RENAMED_FINDS } from '../data/finds.js';
import { CREDITS, TWEMOJI_CREDIT } from '../data/credits.js';
import { MISSING_PICTURES, missingPictureArt, objectPicture, shadowArt, SHADOW_THINGS, LETTER_WORDS } from '../data/games.js';
import { cleanTwemoji, codesUsed } from '../tools/twemoji.js';
import { letterScene, numberScene, cleanFinds, findArt, looksAlike, withoutLookalikes } from '../src/finds.js';
import { lettersSet, shadowsSet, shadowsClash } from '../src/games.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const flat = (p) => read(p).replace(/\s+/g, ' '); // lines joined, so a wrapped phrase still matches
const object = (id) => OBJECTS.find((o) => o.id === id);
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

// ---- the pictures and where they come from ----

test('every emoji the data names is copied into data/twemoji.js, and nothing more', () => {
  const used = codesUsed();
  assert.deepEqual(Object.keys(TWEMOJI).sort(), used);
  for (const o of OBJECTS) if (o.emoji) assert.ok(TWEMOJI[o.emoji], o.id);
  for (const [id, t] of Object.entries(THINGS)) if (t.emoji) assert.ok(TWEMOJI[t.emoji], id);
  assert.equal(TWEMOJI_SOURCE, '@discordapp/twemoji 17.0.3');
});

test('each copied picture is plain shapes only: no scripts, links, images, styles or url()', () => {
  for (const [code, body] of Object.entries(TWEMOJI)) {
    assert.doesNotMatch(body, /<(script|image|use|style|foreignObject|a)\b|href|on\w+=|url\(|https?:/i, code);
    // Running the copy tool's own check again on the stored drawing passes.
    assert.equal(cleanTwemoji(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">${body}</svg>`, code), body);
  }
});

test('the copy tool turns away anything that is not a plain drawing', () => {
  const wrap = (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">${b}</svg>`;
  assert.throws(() => cleanTwemoji(wrap('<script>alert(1)</script>'), 'x'));
  assert.throws(() => cleanTwemoji(wrap('<image href="http://e.com/a.png"/>'), 'x'));
  assert.throws(() => cleanTwemoji(wrap('<path d="M0 0" onclick="x()"/>'), 'x'));
  assert.throws(() => cleanTwemoji(wrap('<path fill="url(#g)" d="M0 0"/>'), 'x'));
  assert.throws(() => cleanTwemoji('<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>', 'x'));
  assert.equal(cleanTwemoji(wrap('<path fill="#FFCC4D" d="M0 0h36v36z"/>'), 'x'), '<path fill="#FFCC4D" d="M0 0h36v36z"/>');
});

test('the find pictures: Twemoji only where it makes her say the word; the rest keep our drawings', () => {
  // Kept on purpose (Slice 5M part 3 word table): the picture would be said as another word, or no emoji fits.
  const KEPT = ['eraser', 'fan', 'fork', 'ink', 'lamp', 'lunchbox', 'igloo', 'jug', 'kettle', 'alligator', 'milk', 'nut',
    'quilt', 'queen', 'sock', 'umpire', 'vase', 'yak', 'yogurt', 'zip', 'tomato'];
  for (const id of KEPT) {
    assert.ok(object(id), id);
    assert.equal(object(id).emoji, undefined, `${id} keeps our drawing`);
  }
  assert.deepEqual(OBJECTS.filter((o) => !o.emoji).map((o) => o.id).sort(), [...KEPT].sort());
  for (const o of OBJECTS.filter((x) => x.emoji)) {
    assert.equal(o.emoji, TWEMOJI_FINDS[o.id].emoji);
    assert.ok(o.art.includes(TWEMOJI[o.emoji]), o.id);
    assert.match(o.art, /^<svg [^>]*viewBox="0 0 200 240"/, `${o.id}: in the 200 x 240 box`);
    assert.match(o.art, /<g class="anim"/, `${o.id}: moves when found`);
    assert.ok(['hop', 'wobble', 'swing', 'beat'].includes(o.reward), `${o.id}: ${o.reward}`);
  }
  // The countable things: sock (a pair), block (a brick) and tomato (like the apple) keep ours.
  assert.deepEqual(Object.entries(THINGS).filter(([, t]) => !t.emoji).map(([id]) => id).sort(), ['block', 'sock', 'tomato']);
});

test('every Twemoji find picture has its move in the CSS; the old moves of replaced drawings are gone', () => {
  const html = read('index.html');
  for (const move of ['hop', 'wobble', 'swing', 'beat']) assert.match(html, new RegExp(`\\.sc-obj\\.rw-${move} \\.anim \\{ animation:`), move);
  for (const gone of ['rw-egg', 'rw-flag', 'rw-hat', 'rw-heart', 'rw-honey', 'rw-ice', 'rw-insect', 'rw-lemon', 'rw-tiger', 'rw-toys']) {
    assert.ok(!html.includes(`.sc-obj.${gone} `), gone);
  }
  // Every reward a find picture plays has a CSS rule.
  for (const o of OBJECTS) assert.ok(html.includes(`.sc-obj.rw-${o.reward} `), `${o.id}: rw-${o.reward}`);
});

test('the kept drawings have no little faces: no eyes, smile or pink cheeks on things and food', () => {
  // People (queen, umpire) and animals (alligator, yak) keep their eyes, as Twemoji's do.
  const THINGS_KEPT = ['eraser', 'fan', 'fork', 'ink', 'lamp', 'lunchbox', 'igloo', 'jug', 'kettle', 'milk', 'nut',
    'quilt', 'sock', 'vase', 'yogurt', 'zip', 'tomato'];
  for (const id of THINGS_KEPT) {
    const art = object(id).art;
    assert.doesNotMatch(art, /<circle [^>]*r="[2-8](\.\d+)?" fill="#(3B2416|2A2370)"/, `${id}: no eyes`);
    assert.doesNotMatch(art, /fill="none" stroke="#(3B2416|2A2370)"[^>]*stroke-linecap="round"/, `${id}: no smile`);
    assert.doesNotMatch(art, /fill="#(FF8FAB|FF6B8A|FF9EB5)" opacity="\.(5|55|6)"/, `${id}: no pink cheeks`);
  }
  for (const id of ['queen', 'umpire']) assert.doesNotMatch(object(id).art, /fill="#FF8FAB" opacity="\.55"/, `${id}: no pink cheeks`);
});

test('nothing in any find or count picture reaches out to the network', () => {
  for (const o of OBJECTS) assert.doesNotMatch(o.art, /https?:\/\/(?!www\.w3\.org)/, o.id);
  for (const [id, t] of Object.entries(THINGS)) assert.doesNotMatch(t.art, /https?:\/\/(?!www\.w3\.org)/, id);
});

// ---- the credit ----

test('the CC BY 4.0 credit is in the README, the credits file, the data file and on the credits screen', () => {
  for (const must of ['Twemoji', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/', 'Twitter, Inc. and other contributors',
    'Jason Sofonia & Justine De Caires', '@discordapp/twemoji 17.0.3']) {
    assert.ok(TWEMOJI_CREDIT.includes(must), `credit: ${must}`);
    assert.ok(read('README.md').includes(must.replace('CC BY 4.0', '**CC BY 4.0**').replace('Twemoji', '**Twemoji**')) || read('README.md').includes(must), `README: ${must}`);
    assert.ok(flat('assets/twemoji/CREDITS.md').includes(must), `CREDITS.md: ${must}`);
  }
  assert.ok(read('data/twemoji.js').includes('CC BY 4.0'));
  assert.ok(CREDITS.some((c) => c.text === TWEMOJI_CREDIT));
  const setup = read('src/setup.js');
  assert.match(setup, /import \{ CREDITS \} from '\.\.\/data\/credits\.js';/);
  assert.match(setup, /class="show-credits"/, 'a Credits button on the children page');
  assert.match(setup, /CREDITS\.map\(/, 'the credits screen lists every credit');
  assert.ok(existsSync(new URL('../tools/twemoji.js', import.meta.url)));
  assert.match(read('package.json'), /"twemoji": "node tools\/twemoji\.js"/);
});

// ---- teddy ----

test('toys became teddy everywhere: the find word, Letter to picture, the voice script; old saved finds show the teddy', () => {
  assert.equal(object('toys'), undefined);
  assert.equal(object('teddy').word, 'teddy');
  assert.equal(object('teddy').letter, 'T');
  assert.ok(LETTER_WORDS.T.includes('teddy') && !LETTER_WORDS.T.includes('toys'));
  assert.equal(RENAMED_FINDS.toys, 'teddy');
  const saved = cleanFinds([{ o: 'toys' }, { o: 'apple' }]);
  assert.deepEqual(saved, [{ o: 'teddy' }, { o: 'apple' }]);
  assert.equal(findArt(saved[0]), object('teddy').art);
  assert.ok(SHADOW_THINGS.includes('teddy'), 'its outline is clear: it joins the Shadow game');
  assert.ok(read('data/voice-script.js').includes('OBJECTS'), 'find clips are built from OBJECTS, so find-teddy replaces find-toys');
});

// ---- apple and tomato ----

test('apple and tomato are a look-alike pair', () => {
  assert.deepEqual(LOOKALIKES, [['apple', 'tomato']]);
  assert.ok(looksAlike('apple', 'tomato') && looksAlike('tomato', 'apple'));
  assert.ok(!looksAlike('apple', 'apple') && !looksAlike('apple', 'banana'));
  assert.deepEqual(withoutLookalikes(['tomato', 'cup', 'apple', 'egg']), ['tomato', 'cup', 'egg']);
  assert.deepEqual(withoutLookalikes(['cup', 'apple'], ['tomato']), ['cup']);
});

test('apple and tomato never share a find scene, a count scene or a game set', () => {
  for (const seed of SEEDS) {
    for (const L of ['A', 'T', 'E', 'K', 'C', 'G']) {
      const s = letterScene(L, seeded(seed));
      const ids = s.items.map((i) => i.id);
      assert.ok(!(ids.includes('apple') && ids.includes('tomato')), `${L} scene ${seed}`);
      assert.equal(s.items.filter((i) => i.right).length, s.targets, 'still the full number of pictures to find');
      assert.equal(s.items.length, 7);
    }
    for (const n of [1, 3, 5, 9, 12]) {
      const kinds = numberScene(n, { rand: seeded(seed) }).groups.map((g) => g.kind);
      assert.equal(new Set(kinds).size, 3);
      assert.ok(!(kinds.includes('apple') && kinds.includes('tomato')), `count ${n} seed ${seed}`);
    }
    const objs = lettersSet(seeded(seed)).pairs.map((p) => p.right.object);
    assert.ok(!(objs.includes('apple') && objs.includes('tomato')), `letters ${seed}`);
    const shadows = shadowsSet(seeded(seed)).pairs.map((p) => p.left.object);
    assert.ok(!(shadows.includes('apple') && shadows.includes('tomato')), `shadows ${seed}`);
  }
  assert.ok(shadowsClash('apple', 'tomato'));
});

// ---- the games ----

test('the games that show the find library show its pictures: Letter to picture, Shadow, Missing piece', () => {
  assert.equal(objectPicture('apple'), object('apple').art, 'Letter to picture and Shadow');
  assert.ok(shadowArt('apple').includes(TWEMOJI['1f34e']), 'the Shadow game\'s silhouette is of the Twemoji');
  for (const id of Object.keys(MISSING_PICTURES)) assert.equal(missingPictureArt(id), object(id).art, `Missing piece: ${id}`);
});
