// data/voice-script.js — the voice pack's recording script (Slice 6A).
// Every clip the app will need: { id, words, hint, category, private }.
// voice.html records or imports one sound file per id. The app plays them in
// Slice 6B (docs/ideas.md).
//
// Most lists are built from the app's own data, so they never drift out of step:
// the find words and counting words from data/finds.js, the game instructions
// and note lines from src/notes.js, the letter parts from data/glyphs.js, and
// Jugnu's lines from src/audio.js LINES.
//
// Private lines contain {name}: her name, filled in from the setup page when
// voice.html shows the line. Her name is never written here. Each private line
// has a public twin without the name (for the AI voice tool), and "Export
// script" leaves private lines out.

import { OBJECTS, THINGS } from './finds.js';
import { GLYPHS, plansOf } from './glyphs.js';
import { TRACE_NOTES, COPY_NOTES, GAME_NOTES, copyNote } from '../src/notes.js';
import { LINES, fillLine } from '../src/audio.js';

// The groups on voice.html, in order.
export const CATEGORIES = [
  { id: 'names', title: 'Letter names' },
  { id: 'sounds', title: 'Letter sounds' },
  { id: 'numbers', title: 'Number names' },
  { id: 'finds', title: 'Find words' },
  { id: 'counts', title: 'Counting words' },
  { id: 'games', title: 'Game instructions' },
  { id: 'notes', title: 'Note lines' },
  { id: 'jugnu', title: 'Jugnu' },
];

// A clip id from any text: lowercase letters, digits and single hyphens.
export const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DIGITS = '0123456789'.split('');
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

// How to say a letter's name, when it is not obvious.
const NAME_HINTS = { H: 'Say "aitch".', W: 'Say "double-u".', Y: 'Say "why".', Z: 'Say "zed" or "zee", the way you say it at home.' };

// Letter sounds: the standard pure sounds (phonics). Stop sounds are short with
// no "uh" after them; long sounds are held for about a second.
const STOP = 'Short, with no "uh" after it.';
const HELD = 'Hold it for about a second.';
export const SOUNDS = {
  a: { words: '/a/', hint: 'Short a, as in "apple".' },
  b: { words: '/b/', hint: `Lips pop. ${STOP}` },
  c: { words: '/k/', hint: `The same sound as k, as in "cat". ${STOP}` },
  d: { words: '/d/', hint: `Tongue taps behind the teeth. ${STOP}` },
  e: { words: '/e/', hint: 'Short e, as in "egg".' },
  f: { words: '/fff/', hint: `Top teeth on the lip. ${HELD}` },
  g: { words: '/g/', hint: `Hard g, as in "goat". ${STOP}` },
  h: { words: '/h/', hint: 'A soft breath out. Short, with no "uh" after it.' },
  i: { words: '/i/', hint: 'Short i, as in "insect".' },
  j: { words: '/j/', hint: `As in "jug". ${STOP}` },
  k: { words: '/k/', hint: `As in "kite", the same sound as c. ${STOP}` },
  l: { words: '/lll/', hint: `Tongue up behind the teeth. ${HELD}` },
  m: { words: '/mmm/', hint: `Lips closed, humming. ${HELD}` },
  n: { words: '/nnn/', hint: `Tongue up, humming through the nose. ${HELD}` },
  o: { words: '/o/', hint: 'Short o, as in "octopus".' },
  p: { words: '/p/', hint: `Lips pop, just a puff of air. ${STOP}` },
  q: { words: '/kw/', hint: `"kw", as in "queen". ${STOP}` },
  r: { words: '/rrr/', hint: `As in "rabbit", with no "uh". ${HELD}` },
  s: { words: '/sss/', hint: `A snake's hiss. ${HELD}` },
  t: { words: '/t/', hint: `Tongue taps, just a puff of air. ${STOP}` },
  u: { words: '/u/', hint: 'Short u, as in "umbrella".' },
  v: { words: '/vvv/', hint: `Top teeth on the lip, with voice. ${HELD}` },
  w: { words: '/w/', hint: 'As in "wet": round lips, then open. Short.' },
  x: { words: '/ks/', hint: '"ks", as at the end of "box". Short.' },
  y: { words: '/y/', hint: 'As in "yo-yo". Short.' },
  z: { words: '/zzz/', hint: `A buzzing bee. ${HELD}` },
};

// Every part name a missing-part note can say ("Almost! The bar is missing."),
// from every allowed stroke plan of every character.
export const PARTS = [...new Set(Object.values(GLYPHS).flatMap((g) => plansOf(g).flat().map((s) => s.part)).filter(Boolean))].sort();

// Every character a copy can be taken for ("Almost! That looks like R.").
export const LOOKALIKE_IDS = [...LETTERS, ...DIGITS];

// Jugnu's lines: the extra prompts first, then every line in src/audio.js LINES
// except `picture` ("B is for ball!"), which Slice 6B puts together from the
// letter name and find word clips.
const JUGNU_EXTRA = {
  greeting: { line: "Hello, {name}! I'm Jugnu.", hint: 'Bright and warm: the first thing she hears.' },
  watchMe: { line: 'Watch me!', hint: 'Before Jugnu shows a stroke.' },
  tryAgain: { line: 'Try again!', hint: 'Gentle and cheerful, never disappointed.' },
};
const JUGNU_HINTS = {
  start: 'At the start of a letter.',
  wrongStart: 'Friendly: the start dot pulses.',
  wrongDirection: 'Friendly: Jugnu shows the way.',
  good: 'Praise after a stroke.',
  letterDone: 'The letter is finished.',
  assist: 'Jugnu helps draw it.',
  copy: 'Before the copy-it round.',
  copyAgain: 'After a copy that did not count.',
  freeDraw: 'Free drawing.',
  end: 'Goodbye at the end.',
};
const JUGNU_SKIP = ['picture'];

// Clip ids for LINES keys, in plain words; other keys are written with hyphens.
const JUGNU_IDS = {
  start: 'lets-start', wrongStart: 'start-here', wrongDirection: 'this-way', good: 'praise',
  letterDone: 'well-done', assist: 'together', end: 'goodbye',
};
const kebab = (key) => JUGNU_IDS[key] ?? key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function jugnuClips() {
  const out = [];
  const add = (key, template, hint, n) => {
    const base = `jugnu-${kebab(key)}${n ? `-${n}` : ''}`;
    out.push({ id: base, words: fillLine(template), hint, category: 'jugnu', private: false });
    if (template.includes('{name}')) {
      out.push({ id: `${base}-name`, words: template, hint: `${hint} With her name.`, category: 'jugnu', private: true });
    }
  };
  for (const [key, { line, hint }] of Object.entries(JUGNU_EXTRA)) add(key, line, hint);
  for (const [key, entry] of Object.entries(LINES)) {
    if (JUGNU_SKIP.includes(key)) continue;
    const hint = JUGNU_HINTS[key] ?? 'Warm and clear.';
    if (Array.isArray(entry)) entry.forEach((t, i) => add(key, t, hint, i + 1));
    else add(key, entry, hint);
  }
  return out;
}

// Every distinct line src/notes.js can show, each with an id. Lines shared by
// two reasons (no-letter and unrecognized) get one clip.
function noteClips() {
  const out = [];
  const seen = new Set();
  const add = (id, words, hint) => {
    if (seen.has(words)) return;
    seen.add(words);
    out.push({ id: `note-${id}`, words, hint, category: 'notes', private: false });
  };
  const kind = 'Kind and calm, for a grown-up watching.';
  for (const [key, words] of Object.entries(TRACE_NOTES)) add(slug(key), words, kind);
  for (const [key, words] of Object.entries(COPY_NOTES)) add(slug(key), words, kind);
  add('line-missing', copyNote({ ok: false, reason: 'missing-stroke' }), kind);
  for (const part of PARTS) add(`missing-${slug(part)}`, copyNote({ ok: false, reason: 'missing-stroke', missing: { part } }), kind);
  for (const id of LOOKALIKE_IDS) {
    const hint = /\d/.test(id) ? `Say the number: "${NUMBER_WORDS[Number(id)]}".` : `Say the letter name: "${id}".`;
    add(`looks-like-${slug(id)}`, copyNote({ ok: false, reason: 'looks-like', lookalike: id }), hint);
  }
  return out;
}

function buildScript() {
  const clips = [];
  const push = (c) => clips.push({ private: false, ...c });
  for (const L of LETTERS) {
    push({ id: `name-${L.toLowerCase()}`, words: L, hint: NAME_HINTS[L] ?? 'The letter\'s name.', category: 'names' });
  }
  for (const L of LETTERS) {
    const s = SOUNDS[L.toLowerCase()];
    push({ id: `sound-${L.toLowerCase()}`, words: s.words, hint: s.hint, category: 'sounds' });
  }
  DIGITS.forEach((d, i) => push({ id: `number-${d}`, words: NUMBER_WORDS[i], hint: `The number ${d}.`, category: 'numbers' }));
  for (const o of OBJECTS) {
    push({ id: `find-${o.id}`, words: o.word, hint: `Starts with the ${o.letter} sound. Just the word.`, category: 'finds' });
  }
  for (const t of Object.values(THINGS)) {
    push({ id: `count-${slug(t.many)}`, words: t.many, hint: `More than one, as in "three ${t.many}". Just the word.`, category: 'counts' });
  }
  for (const [kind, words] of Object.entries(GAME_NOTES)) {
    push({ id: `game-${kind}`, words, hint: 'Calm and clear, so she can follow it.', category: 'games' });
  }
  clips.push(...noteClips(), ...jugnuClips());
  return clips;
}

export const SCRIPT = buildScript();
export const SCRIPT_IDS = new Set(SCRIPT.map((c) => c.id));
export const clipById = (id) => SCRIPT.find((c) => c.id === id) ?? null;

// The clip for a line of text (exact words, public lines only), or null.
// Slice 6B uses this to find the clip for a note line it is showing.
export const clipForText = (text) => SCRIPT.find((c) => !c.private && c.words === text) ?? null;

// "Record first" on voice.html: what a family voice should record before
// anything else (her letter sounds and names, and every line with her name).
export const recordFirst = (clip) => clip.category === 'sounds' || clip.category === 'names' || clip.private;
