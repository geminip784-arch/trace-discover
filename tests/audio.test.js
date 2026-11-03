// Run: node --test tests/audio.test.js
// The pure parts of audio.js: filling in lines, the spoken name, the voice choice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LINES, fillLine, spokenName, pickLine, chooseVoice, SPEECH_ON } from '../src/audio.js';

test('every line in the table, with a name', () => {
  const n = { name: 'Sam' };
  assert.equal(fillLine(LINES.start, n), "Let's start here, Sam!");
  assert.equal(fillLine(LINES.wrongStart, n), 'Start here, Sam!');
  assert.equal(fillLine(LINES.wrongDirection, n), 'This way, Sam!');
  assert.deepEqual(LINES.good.map((t) => fillLine(t, n)), ['Nice!', "That's it!", 'Good job, Sam!']);
  assert.equal(fillLine(LINES.letterDone, n), 'Well done, Sam!');
  assert.equal(fillLine(LINES.assist, n), "Let's do it together!");
  assert.equal(fillLine(LINES.freeDraw, n), 'Now draw anything you like!');
  assert.equal(fillLine(LINES.end, n), 'All done. See you soon, Sam!');
});

test('with no name, the name part is dropped', () => {
  assert.equal(fillLine(LINES.start), "Let's start here!");
  assert.equal(fillLine(LINES.wrongStart, { name: '' }), 'Start here!');
  assert.equal(fillLine(LINES.wrongDirection), 'This way!');
  assert.equal(fillLine(LINES.good[2]), 'Good job!');
  assert.equal(fillLine(LINES.letterDone), 'Well done!');
  assert.equal(fillLine(LINES.end), 'All done. See you soon!');
});

test('the picture line', () => {
  assert.equal(fillLine(LINES.picture, { letter: 'L', word: 'lamp' }), 'L is for lamp!');
});

test('the voice says the phonetic spelling if one is set, otherwise the name', () => {
  assert.equal(spokenName({ name: 'Zoë', sayAs: 'Zoh-ee' }), 'Zoh-ee');
  assert.equal(spokenName({ name: 'Zoë', sayAs: '  ' }), 'Zoë');
  assert.equal(spokenName({ name: '', sayAs: '' }), '');
  assert.equal(spokenName(null), '');
});

test('pickLine: one line, or one of the list at random', () => {
  assert.equal(pickLine('start'), LINES.start);
  assert.equal(pickLine('good', () => 0), 'Nice!');
  assert.equal(pickLine('good', () => 0.5), "That's it!");
  assert.equal(pickLine('good', () => 0.999), 'Good job, {name}!');
  assert.equal(pickLine('nothing'), null);
});

test('chooseVoice: Australian English first, on-device first, then any English, never another language', () => {
  const v = (lang, localService = true, name = lang) => ({ lang, localService, name });
  assert.equal(chooseVoice([v('en-GB'), v('en-AU'), v('fr-FR')]).lang, 'en-AU');
  assert.equal(chooseVoice([v('en-AU', false, 'net'), v('en-AU', true, 'device')]).name, 'device');
  assert.equal(chooseVoice([v('en_AU')]).lang, 'en_AU');
  assert.equal(chooseVoice([v('fr-FR'), v('en-US', false, 'net'), v('en-GB', true, 'gb')]).name, 'gb');
  assert.equal(chooseVoice([v('ur-PK'), v('fr-FR')]), null);
  assert.equal(chooseVoice([]), null);
});

test('speech is switched off in Slice 5A (the code stays in place)', () => {
  assert.equal(SPEECH_ON, false);
});
