// Slice 10E: Urdu picture words and find scenes. One picture per letter for
// the 27 letters with an approved word; she finds it among 7 Urdu pictures,
// never with a letter that shares its sound or two look-alikes. The other 12
// letters go straight back to the board.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OBJECTS, URDU_FINDS, URDU_OBJECTS, URDU_LOOKALIKES, SAME_SOUND, LOOKALIKES, PLACES } from '../data/finds.js';
import { TWEMOJI } from '../data/twemoji.js';
import {
  letterScene, hasLetterScene, afterWriting, objectsFor, targetsFor, soundsLike, cleanFinds, findArt, ALL_PICTURES, isUrduLetter,
} from '../src/finds.js';
import { URDU } from '../src/session.js';
import { clipById } from '../data/voice-script.js';
import { biggestColor, family } from './art-colors.js';
import { seeded } from './crude-letters.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const GLYPH = Object.fromEntries(URDU.map((t) => [t.id, t.glyph]));
const NO_WORD = ['ur-se', 'ur-bari-he', 'ur-zal', 'ur-rre', 'ur-zhe', 'ur-zuad', 'ur-zoe', 'ur-wao', 'ur-do-chashmi-he', 'ur-hamza', 'ur-chhoti-ye', 'ur-bari-ye'];
const WITH_WORD = URDU.map((t) => t.id).filter((id) => !NO_WORD.includes(id));
const byId = (id) => URDU_OBJECTS.find((o) => o.id === id);

// The approved table (10A plan; انار our own drawing).
const WORDS = {
  'ur-alif-madd': ['آم', 'mango'], 'ur-alif': ['انار', 'pomegranate'], 'ur-be': ['بکری', 'goat'], 'ur-pe': ['پتنگ', 'kite'],
  'ur-te': ['تتلی', 'butterfly'], 'ur-tte': ['ٹوپی', 'cap'], 'ur-jeem': ['جہاز', 'airplane'], 'ur-che': ['چاند', 'moon'],
  'ur-khe': ['خرگوش', 'rabbit'], 'ur-dal': ['دروازہ', 'door'], 'ur-ddal': ['ڈھول', 'drum (a dhol)'], 'ur-re': ['ریچھ', 'bear'],
  'ur-ze': ['زرافہ', 'giraffe'], 'ur-seen': ['سیب', 'apple'], 'ur-sheen': ['شیر', 'lion'], 'ur-suad': ['صابن', 'soap'],
  'ur-toe': ['طوطا', 'parrot'], 'ur-ain': ['عینک', 'glasses'], 'ur-ghain': ['غبارہ', 'balloon'], 'ur-fe': ['فٹ بال', 'football'],
  'ur-qaf': ['قینچی', 'scissors'], 'ur-kaf': ['کیلا', 'banana'], 'ur-gaf': ['گائے', 'cow'], 'ur-lam': ['لیموں', 'lemon'],
  'ur-meem': ['مچھلی', 'fish'], 'ur-noon': ['ناشپاتی', 'pear'], 'ur-chhoti-he': ['ہاتھی', 'elephant'],
};

// ---- the words ----

test('the 27 approved words, one per letter, in qaida order; the other 12 letters have none', () => {
  assert.deepEqual(URDU_OBJECTS.map((o) => o.letter), WITH_WORD);
  for (const o of URDU_OBJECTS) assert.deepEqual([o.word, o.meaning], WORDS[o.letter], o.letter);
  assert.equal(WITH_WORD.length, 27);
  assert.equal(NO_WORD.length, 12);
  for (const id of NO_WORD) assert.deepEqual(objectsFor(id), [], id);
});

test('each word starts with its letter, written with the Urdu letter forms (not the Arabic ک ی ہ look-alikes)', () => {
  for (const o of URDU_OBJECTS) {
    assert.ok(o.word.startsWith(GLYPH[o.letter]), `${o.word} starts with ${GLYPH[o.letter]}`);
    assert.doesNotMatch(o.word, /[كيهى]/, o.word);
  }
});

test('every picture has its art: the library\'s own, a Twemoji, or our pomegranate', () => {
  const reused = ['mango', 'goat', 'kite', 'moon', 'rabbit', 'apple', 'lion', 'parrot', 'ball', 'banana', 'lemon', 'fish', 'pear', 'elephant'];
  for (const f of URDU_FINDS.filter((x) => x.from)) assert.equal(byId(f.from).art, OBJECTS.find((o) => o.id === f.from).art, f.from);
  assert.deepEqual(URDU_FINDS.filter((x) => x.from).map((x) => x.from).sort(), [...reused].sort());
  const twemoji = { butterfly: '1f98b', cap: '1f9e2', airplane: '2708', door: '1f6aa', dhol: '1fa98', bear: '1f43b', giraffe: '1f992', soap: '1f9fc', glasses: '1f453', balloon: '1f388', scissors: '2702', cow: '1f404' };
  for (const [id, code] of Object.entries(twemoji)) {
    assert.equal(byId(id).emoji, code, id);
    assert.ok(TWEMOJI[code] && byId(id).art.includes(TWEMOJI[code]), `${id}: Twemoji ${code} copied into data/twemoji.js`);
  }
  assert.ok(byId('pomegranate').art.includes('class="anim"'), 'our drawing moves like the others');
  for (const o of URDU_OBJECTS) {
    assert.ok(o.places.length >= 1 && o.places.every((p) => PLACES[p]), o.id);
    assert.ok(['hop', 'wobble', 'swing'].includes(o.reward), `${o.id} has a found move`);
  }
  // ڈھول is a dhol (the long drum), not the library's snare drum.
  assert.notEqual(byId('dhol').art, OBJECTS.find((o) => o.id === 'drum').art);
});

test('the new pictures never join English scenes or games: the library is unchanged', () => {
  const ids = new Set(OBJECTS.map((o) => o.id));
  for (const id of ['butterfly', 'cap', 'airplane', 'door', 'dhol', 'bear', 'giraffe', 'soap', 'glasses', 'balloon', 'scissors', 'cow', 'pomegranate']) {
    assert.equal(ids.has(id), false, id);
  }
  assert.deepEqual(LOOKALIKES, [['apple', 'tomato']], 'the English look-alikes are unchanged');
  for (const seed of [1, 2, 3]) {
    const ids7 = letterScene('B', seeded(seed)).items.map((i) => i.id);
    assert.ok(ids7.every((id) => ids.has(id)), 'an English scene shows only library pictures');
  }
});

// ---- the scenes ----

test('a letter with a word opens its scene after the star; a letter without one goes back to the board', () => {
  for (const id of WITH_WORD) {
    assert.ok(hasLetterScene(id), id);
    assert.equal(afterWriting(id), 'openScene', id);
    assert.equal(targetsFor(id), 1, id);
  }
  for (const id of NO_WORD) {
    assert.equal(hasLetterScene(id), false, id);
    assert.equal(afterWriting(id), 'letterDone', id);
  }
  // English is as before.
  assert.equal(afterWriting('B'), 'openScene');
  assert.equal(afterWriting('X'), 'letterDone');
  assert.ok(isUrduLetter('ur-be') && !isUrduLetter('B'));
});

test('every Urdu scene: one picture to find among 7, the others Urdu pictures of other sounds, no look-alikes together', () => {
  const rand = seeded(10);
  for (const id of WITH_WORD) {
    for (let k = 0; k < 60; k++) {
      const s = letterScene(id, rand);
      const ids = s.items.map((i) => i.id);
      assert.equal(s.items.length, 7, id);
      assert.equal(new Set(ids).size, 7, id);
      const right = s.items.filter((i) => i.right);
      assert.equal(right.length, 1, id);
      assert.equal(right[0].letter, id, id);
      for (const o of s.items) {
        assert.ok(URDU_OBJECTS.some((u) => u.id === o.id && u.letter === o.letter), `${id}: ${o.id} is an Urdu picture`);
        if (!o.right) assert.ok(!soundsLike(id).includes(o.letter), `${id}: ${o.id} shares its sound`);
      }
      for (const g of URDU_LOOKALIKES) assert.ok(ids.filter((i) => g.includes(i)).length <= 1, `${id}: ${g.join(' and ')} together`);
      // Each picture stands on its own spot of the place.
      assert.equal(new Set(s.items.map((i) => `${i.spot.x},${i.spot.bottom}`)).size, 7, id);
      assert.ok(PLACES[s.room], id);
      assert.ok(right[0].places.includes(s.room), `${id}: the scene is in its picture's place`);
    }
  }
});

test('letters that share a sound are never in one scene: ت ط, س ص, ا آ', () => {
  assert.deepEqual(SAME_SOUND, [['ur-te', 'ur-toe'], ['ur-seen', 'ur-suad', 'ur-se'], ['ur-alif', 'ur-alif-madd'], ['ur-ze', 'ur-zal', 'ur-zuad', 'ur-zoe'], ['ur-bari-he', 'ur-chhoti-he']]);
  const rand = seeded(4);
  for (const [a, b] of [['ur-te', 'butterfly', 'parrot'], ['ur-toe', 'parrot', 'butterfly'], ['ur-seen', 'apple', 'soap'], ['ur-suad', 'soap', 'apple'], ['ur-alif', 'pomegranate', 'mango'], ['ur-alif-madd', 'mango', 'pomegranate']].map(([l, , other]) => [l, other])) {
    for (let k = 0; k < 40; k++) assert.ok(!letterScene(a, rand).items.some((i) => i.id === b), `${a} with ${b}`);
  }
});

// ---- the look-alike checks (color and outline) ----

// The main color family of each picture (tests/art-colors.js biggestColor, as
// for English). A pair of the same family was looked at on the outline sheet
// (docs/screenshots/slice-10e/); a changed picture changes this list and asks
// for that check again.
const FAMILIES = {
  mango: 'red', pomegranate: 'red', goat: 'orange', kite: 'blue', butterfly: 'blue', cap: 'blue', airplane: 'blue', moon: 'yellow',
  rabbit: 'pink', door: 'brown', dhol: 'red', bear: 'brown', giraffe: 'yellow', apple: 'red', lion: 'red', soap: 'pink',
  parrot: 'green', glasses: 'blue', balloon: 'red', ball: null, scissors: 'red', banana: 'yellow', cow: null, lemon: 'yellow',
  fish: 'blue', pear: 'green', elephant: null,
};

test('the color check: each Urdu picture\'s main color family is the one reviewed on the sheet', () => {
  const now = Object.fromEntries(URDU_OBJECTS.map((o) => [o.id, family(biggestColor(o.art) ?? '#808080')]));
  assert.deepEqual(now, FAMILIES);
});

test('the look-alike groups from the color and outline checks: pairs that could be confused never share a scene', () => {
  assert.deepEqual(URDU_LOOKALIKES, [
    ['apple', 'pomegranate', 'mango'],
    ['apple', 'balloon'],
    ['mango', 'lemon'],
    ['moon', 'banana'],
    ['lion', 'bear'],
    ['goat', 'cow'],
  ]);
  for (const g of URDU_LOOKALIKES) for (const id of g) assert.ok(byId(id), id);
  // Most groups share a main color; the rest share an outline (mango and lemon, lion and bear, goat and cow).
  const sameColor = (g) => new Set(g.map((id) => FAMILIES[id])).size === 1;
  assert.deepEqual(URDU_LOOKALIKES.filter(sameColor).map((g) => g.join(' ')), ['apple pomegranate mango', 'apple balloon', 'moon banana']);
});

// ---- her shelf of finds, the word on screen, the voice pack ----

test('an Urdu find stays on her shelf of finds, with its picture', () => {
  const saved = cleanFinds([{ o: 'butterfly' }, { o: 'pomegranate' }, { o: 'goat' }, { o: 'unknown' }]);
  assert.deepEqual(saved, [{ o: 'butterfly' }, { o: 'pomegranate' }, { o: 'goat' }]);
  assert.equal(findArt({ o: 'butterfly' }), byId('butterfly').art);
  assert.equal(findArt({ o: 'pomegranate' }), byId('pomegranate').art);
  assert.equal(ALL_PICTURES.length, OBJECTS.length + 13);
});

test('the word under a picture is right to left, in Noto Naskh Arabic, for an Urdu picture', () => {
  const scene = read('src/scene.js');
  assert.match(scene, /\$\{o\.letter\?\.startsWith\('ur-'\) \? ' ur' : ''\}/);
  assert.match(scene, /if \(o\.letter\?\.startsWith\('ur-'\)\) label\.dir = 'rtl';/);
  assert.match(read('index.html'), /\.sc-word\.ur \{ font-family: 'Noto Naskh Arabic', serif; font-weight: 700; direction: rtl;/);
});

test('every Urdu find word has its clip in the voice pack, in Urdu', () => {
  for (const o of URDU_OBJECTS) {
    const c = clipById(`find-${o.letter}`);
    assert.ok(c, o.letter);
    assert.equal(c.words, o.word);
    assert.equal(c.category, 'finds');
  }
});

test('finds.html shows every Urdu letter with its picture, word and meaning (the review sheet)', () => {
  const page = read('src/finds-page.js');
  assert.match(page, /for \(const \{ id \} of URDU\)/);
  assert.match(page, /<span class="uw" dir="rtl">\$\{esc\(o\.word\)\}<\/span><span class="mean">\$\{esc\(o\.meaning\)\}<\/span>/);
  assert.match(read('finds.html'), /url\('assets\/fonts\/noto-naskh-arabic-arabic-700-normal\.woff2'\)/);
});
