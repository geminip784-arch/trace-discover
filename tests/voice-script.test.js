// Slice 6A: the voice pack's recording script covers everything the app says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPT, SCRIPT_IDS, CATEGORIES, PARTS, LOOKALIKE_IDS, clipById, clipForText, recordFirst, SOUNDS } from '../data/voice-script.js';
import { OBJECTS, THINGS } from '../data/finds.js';
import { TRACE_NOTES, COPY_NOTES, GAME_NOTES, copyNote } from '../src/notes.js';
import { LINES } from '../src/audio.js';
import { exportScript, wordsFor } from '../src/voice.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

test('every clip id is unique and safe as a file name', () => {
  assert.equal(SCRIPT_IDS.size, SCRIPT.length);
  for (const c of SCRIPT) assert.match(c.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, c.id);
});

test('every clip has words, a hint and a known category', () => {
  const cats = new Set(CATEGORIES.map((c) => c.id));
  for (const c of SCRIPT) {
    assert.ok(c.words.trim(), c.id);
    assert.ok(c.hint.trim(), c.id);
    assert.ok(cats.has(c.category), c.id);
    assert.equal(typeof c.private, 'boolean', c.id);
  }
});

test('every letter has a name clip and a sound clip', () => {
  for (const L of LETTERS) {
    assert.equal(clipById(`name-${L.toLowerCase()}`)?.words, L);
    assert.ok(clipById(`sound-${L.toLowerCase()}`), L);
  }
  assert.equal(SCRIPT.filter((c) => c.category === 'names').length, 26);
  assert.equal(SCRIPT.filter((c) => c.category === 'sounds').length, 26);
});

test('letter sounds follow the standard pure sounds', () => {
  assert.equal(SOUNDS.c.words, SOUNDS.k.words); // c and k are both "k"
  assert.equal(SOUNDS.q.words, '/kw/');
  assert.equal(SOUNDS.x.words, '/ks/');
  assert.match(SOUNDS.g.hint, /hard g/i);
  for (const s of 'bdgkpt') assert.match(SOUNDS[s].hint, /no "uh"/, s);
  for (const s of 'mfslnrvz') assert.match(SOUNDS[s].hint, /hold it/i, s);
  const vowels = { a: 'apple', e: 'egg', i: 'insect', o: 'octopus', u: 'umbrella' };
  for (const [v, word] of Object.entries(vowels)) assert.match(SOUNDS[v].hint, new RegExp(word), v);
  assert.match(SOUNDS.w.hint, /wet/);
  assert.match(SOUNDS.y.hint, /yo-yo/);
});

test('every number 0 to 9 has a clip', () => {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  words.forEach((w, d) => assert.equal(clipById(`number-${d}`)?.words, w));
});

test('every find word in the library has a clip', () => {
  for (const o of OBJECTS) {
    const c = clipById(`find-${o.id}`);
    assert.ok(c, o.id);
    assert.equal(c.words, o.word);
  }
});

test('every counting word (plural) has a clip', () => {
  for (const t of Object.values(THINGS)) {
    assert.ok(SCRIPT.some((c) => c.category === 'counts' && c.words === t.many), t.many);
  }
});

test('the five game instructions each have a clip', () => {
  assert.equal(Object.keys(GAME_NOTES).length, 5);
  for (const [kind, words] of Object.entries(GAME_NOTES)) assert.equal(clipById(`game-${kind}`)?.words, words);
});

test('every line src/notes.js can show has a clip with exactly those words', () => {
  const lines = new Set([
    ...Object.values(TRACE_NOTES), ...Object.values(COPY_NOTES), ...Object.values(GAME_NOTES),
    copyNote({ ok: false, reason: 'missing-stroke' }),
    copyNote({ ok: false, reason: 'some-new-reason' }),
    ...PARTS.map((part) => copyNote({ ok: false, reason: 'looks-like', lookalike: 'R', missing: { part } })),
    ...PARTS.map((part) => copyNote({ ok: false, reason: 'missing-stroke', missing: { part } })),
    ...LOOKALIKE_IDS.map((id) => copyNote({ ok: false, reason: 'looks-like', lookalike: id })),
    copyNote({ ok: true, mirrored: true }),
    copyNote({ ok: true, habits: { usual: false } }),
  ]);
  for (const line of lines) assert.ok(clipForText(line), `no clip for "${line}"`);
});

test('the parts list covers every part name, and look-alikes cover every letter and digit', () => {
  for (const p of ['bar', 'stem', 'tail', 'bumps', 'circle and stem']) assert.ok(PARTS.includes(p), p);
  assert.equal(LOOKALIKE_IDS.length, 36);
});

test("Jugnu's prompts are all there", () => {
  for (const id of ['jugnu-greeting', 'jugnu-praise-1', 'jugnu-start-here', 'jugnu-watch-me', 'jugnu-try-again']) assert.ok(clipById(id), id);
  // Every line in src/audio.js LINES but the picture line has a clip.
  for (const [key, entry] of Object.entries(LINES)) {
    if (key === 'picture') continue;
    for (const t of [entry].flat()) {
      const nameless = t.replace(/,?\s*\{name\}/g, '').replace(/\s+([!?.,])/g, '$1');
      assert.ok(SCRIPT.some((c) => c.words === nameless && !c.private), t);
      if (t.includes('{name}')) assert.ok(SCRIPT.some((c) => c.words === t && c.private), t);
    }
  }
});

test('lines with her name are private, have a public twin, and never hold a real name', () => {
  const priv = SCRIPT.filter((c) => c.private);
  assert.ok(priv.length >= 5);
  for (const c of SCRIPT) assert.equal(c.private, c.words.includes('{name}'), c.id);
  for (const c of priv) {
    assert.ok(c.id.endsWith('-name'), c.id);
    assert.ok(clipById(c.id.replace(/-name$/, '')), `${c.id} has no public twin`);
  }
});

test('private lines show the name from the setup page, and are never exported', () => {
  const c = clipById('jugnu-greeting-name');
  assert.equal(wordsFor(c, 'Zara'), "Hello, Zara! I'm Jugnu.");
  assert.equal(wordsFor(c, ''), "Hello, [her name]! I'm Jugnu.");
  assert.equal(wordsFor(clipById('name-b'), 'Zara'), 'B');
  const text = exportScript(SCRIPT, CATEGORIES);
  assert.ok(!text.includes('{name}'));
  for (const p of SCRIPT.filter((x) => x.private)) assert.ok(!text.includes(`${p.id} |`), p.id);
});

test('the exported script has one "id | words" line per public clip', () => {
  const text = exportScript(SCRIPT, CATEGORIES);
  const rows = text.split('\n').filter((l) => l && !l.startsWith('#'));
  const pub = SCRIPT.filter((c) => !c.private);
  assert.equal(rows.length, pub.length);
  for (const c of pub) assert.ok(rows.includes(`${c.id} | ${c.words}`), c.id);
});

test('"Record first" shows letter sounds, letter names and the private name lines only', () => {
  const first = SCRIPT.filter(recordFirst);
  assert.equal(first.length, 52 + SCRIPT.filter((c) => c.private).length);
  for (const c of first) assert.ok(c.category === 'sounds' || c.category === 'names' || c.private, c.id);
});
