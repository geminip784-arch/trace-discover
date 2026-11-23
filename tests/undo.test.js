// Run: node --test tests/undo.test.js
// Slice 5O part 1: undo one stroke, on every writing screen. The undo list and
// its log entry are pure (src/undo.js) and tested directly. The screens need a
// browser, so, as in tests/no-first-move.test.js, their wiring is checked by
// reading the source: every writing screen offers undo() and canUndo(), an undo
// takes away the stroke's ink and what it scored, cancels the judging wait, and
// is logged; finished work is never on the list.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMPTY_UNDO, pushUndo, popUndo, canUndo, undoLogEntry } from '../src/undo.js';
import { initialState, applyPlanPass } from '../src/progress.js';

const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// The body of `function <name>` (or `async function <name>`) in a source, braces matched.
function body(source, name) {
  const at = source.search(new RegExp(`function ${name}\\s*\\(`));
  assert.ok(at >= 0, `function ${name} is there`);
  let i = source.indexOf('{', source.indexOf(')', at));
  const start = i;
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unbalanced ${name}`);
}

// ---- the undo list ----

test('undo takes back the last stroke first, and never changes the list it was given', () => {
  const a = pushUndo(EMPTY_UNDO, { kind: 'trace', id: 1 });
  const b = pushUndo(a, { kind: 'trace', id: 2 });
  assert.equal(a.length, 1);
  const { entry, list } = popUndo(b);
  assert.equal(entry.id, 2);
  assert.deepEqual(list.map((e) => e.id), [1]);
  assert.equal(b.length, 2, 'the old list is unchanged');
  assert.equal(popUndo(list).entry.id, 1);
  assert.deepEqual(popUndo(EMPTY_UNDO), { entry: null, list: EMPTY_UNDO });
});

test('undo is allowed only when there is a stroke to take back and nothing else is going on', () => {
  const list = [{ kind: 'copy', id: 1 }];
  assert.equal(canUndo({ list, phase: 'trace' }), true);
  assert.equal(canUndo({ list: EMPTY_UNDO, phase: 'trace' }), false, 'nothing to undo');
  assert.equal(canUndo({ list, phase: 'held' }), false, 'Jugnu draws, a reason shows or a reward plays');
  assert.equal(canUndo({ list, phase: 'done' }), false, 'the letter or page is finished');
  assert.equal(canUndo({ list, phase: 'trace', drawing: true }), false, 'her finger is down');
  assert.equal(canUndo({ list, phase: 'trace', demoing: true }), false, 'Jugnu demonstrates');
  assert.equal(canUndo({ list, phase: 'trace', paused: true }), false, 'the tablet is upright');
  assert.equal(canUndo({ list, phase: 'trace', alive: false }), false, 'she left');
});

test('an undo log entry says what was taken back and where', () => {
  const now = new Date('2026-11-23T10:00:00Z');
  assert.deepEqual(undoLogEntry({ char: 'L', mode: 'copy', stroke: 1, extra: { review: true, round: 3 }, now }), {
    type: 'undo', time: '2026-11-23T10:00:00.000Z', char: 'L', mode: 'copy', stroke: 1, review: true, round: 3,
  });
  const e = undoLogEntry({ char: 'M', mode: 'trace', stroke: 0, extra: { in: 'name', letter: 0, round: 1, stage: 1 }, now });
  assert.equal(e.type, 'undo');
  assert.equal(e.letter, 0);
});

test('a tracing undo puts back exactly what the stroke scored', () => {
  // The screens keep the state from before each counted stroke (it is never
  // changed in place) and put it back on an undo.
  const before = initialState(2);
  const after = applyPlanPass(before, [true, false]).state;
  assert.equal(after.current, 1);
  assert.equal(before.current, 0, 'the snapshot is untouched by the pass');
  assert.deepEqual(before.done, [false, false]);
});

// ---- the pieces the screens use ----

test('her ink can lose one finished stroke at once, and Jugnu says when he demonstrates', () => {
  const render = src('src/render.js');
  assert.match(body(render, 'createInk'), /remove\(id\)\s*\{/);
  const jugnu = src('src/jugnu.js');
  assert.match(jugnu, /demoing: \(\) => demoRun === run/);
  assert.match(jugnu, /async demo\(points, ms, hopMs, onProgress\) \{\s*const myRun = \+\+run;\s*demoRun = myRun;/);
});

// ---- every writing screen ----

const SCREENS = [
  { file: 'src/game.js', what: 'tracing rounds 1 and 2 and the copy round (reviews)', judge: 'judgeCopy', ends: ['assist', 'endRound', 'beginCopy', 'judgeCopy'] },
  { file: 'src/name-game.js', what: "her name's rounds and copy round", judge: 'judgeName', ends: ['assist', 'endLetter', 'beginCopy', 'judgeName'] },
  { file: 'src/practice-game.js', what: 'the letter practice page', judge: 'judgeCopy', ends: ['assist', 'endTrace', 'beginCopy', 'judgeCopy', 'freshPage'] },
  { file: 'src/name-practice-game.js', what: "her name's practice page", judge: 'judgeName', ends: ['assist', 'endLetter', 'beginCopy', 'judgeName', 'freshPage'] },
];

for (const { file, what, judge, ends } of SCREENS) {
  const s = src(file);

  test(`${what}: offers undo() and canUndo() to the shell`, () => {
    assert.match(s, /return \{\s*pause,\s*resume,\s*undo,\s*canUndo: undoAllowed,/);
    const allowed = s.slice(s.indexOf('const undoAllowed'), s.indexOf('function undo()'));
    assert.match(allowed, /canUndo\(\{/);
    for (const part of ['phase', 'drawing: attempt !== null', 'demoing: jugnu.demoing()', 'paused: turned !== null', 'alive']) {
      assert.ok(allowed.includes(part), `canUndo looks at ${part}`);
    }
  });

  test(`${what}: an undo takes the stroke away, cancels every wait, and is logged`, () => {
    const u = body(s, 'undo');
    assert.match(u, /if \(!undoAllowed\(\)\) return false;/, 'it checks again: a tap that comes too late does nothing');
    assert.ok(u.indexOf('cancelLater()') >= 0 && u.indexOf('cancelLater()') < u.indexOf("entry.kind === 'copy'"), 'the judging and hint waits are cancelled first');
    assert.match(u, /ink\.remove\(entry\.id\)/, 'her stroke goes at once (never a fade of the whole letter)');
    assert.equal((u.match(/logAttempt\(undoLogEntry\(/g) ?? []).length, 2, 'both kinds of undo are logged');
    assert.match(u, /copy\.strokes\.pop\(\);\s*copy\.ids\.pop\(\);/, 'a copy stroke leaves her copy');
    assert.match(u, /\(\{ progress, following, goodStrokes \} = entry\.snap\)/, 'a tracing stroke puts back what it scored');
    assert.ok(!u.includes(`${judge}(`), 'an undo never judges: nothing is judged until her next stroke');
  });

  test(`${what}: only her strokes that may be taken back go on the list`, () => {
    const end = body(s, 'endStroke');
    const push = end.indexOf("pushUndo(undoList, { kind: 'trace'");
    assert.ok(push > 0, 'a counted tracing stroke goes on the list');
    assert.ok(end.lastIndexOf('if (result.ok)', push) > 0, 'only a stroke that counted');
    assert.ok(end.indexOf('lift.letterDone) return') < push, 'never the stroke that finished the letter');
    assert.match(body(s, 'endCopyStroke'), /pushUndo\(undoList, \{ kind: 'copy', id \}\)/, 'every copy stroke goes on the list');
    for (const fn of ends) assert.match(body(s, fn), /undoList = EMPTY_UNDO/, `${fn}: finished work is never undone`);
  });
}

test('every judged copy empties the list before it is judged', () => {
  for (const { file, judge } of SCREENS) {
    const j = body(src(file), judge);
    const scored = j.search(/score(Copy|Space|Name|NameScreen)\(/);
    const cleared = j.indexOf('undoList = EMPTY_UNDO');
    // judgeName empties it after the 'unfinished' check (a hint is not a judged copy).
    assert.ok(cleared > 0, `${file} ${judge} empties the list`);
    if (judge === 'judgeCopy') assert.ok(cleared < scored, `${file}: before judging`);
  }
});

// ---- the button ----

test('the undo button: picture only, in the left column, at least 88 px, on the writing screens only', () => {
  const html = src('index.html');
  assert.match(html, /<button id="undo" class="btn" type="button" aria-label="Undo" hidden disabled><\/button>/);
  assert.match(html, /#undo \{ top: 240px;/);
  const size = html.match(/\.btn \{[^}]*width: (\d+)px;[^}]*height: (\d+)px;/s);
  assert.ok(size && Number(size[1]) >= 88 && Number(size[2]) >= 88, 'buttons are at least 88 px');
  assert.match(html, /#undo:disabled \{ opacity: 0\.35;/, 'faint when there is nothing to undo');
  const shell = src('src/screens.js');
  assert.match(shell, /els\.undo\.innerHTML = ICONS\.undo/);
  assert.match(shell, /els\.undo\?\.addEventListener\('click', \(\) => \{\s*if \(isWriting\(\) && game\?\.undo\?\.\(\)\) popSound\(\);/);
  const watch = body(shell, 'watchUndo');
  assert.match(watch, /if \(!isWriting\(\)\) \{\s*els\.undo\.hidden = true;/, 'hidden off the writing screens');
  assert.match(watch, /game\?\.canUndo\?\.\(\)/, 'the game decides when it may');
  assert.match(watch, /els\.next \? !els\.next\.hidden/, 'the next-page tile takes its place on a finished page');
  const art = src('src/art.js');
  assert.match(art, /undo: icon\(/);
  assert.ok(!/undo: icon\([^)]*<text/.test(art), 'a picture, no text');
});

// ---- a slip before judging (Slice 5O, before merging part 1) ----

test('a letter copy is judged at once only when it passes; otherwise it waits, with undo there', () => {
  for (const file of ['src/game.js', 'src/practice-game.js']) {
    const end = body(src(file), 'endCopyStroke');
    assert.match(end, /if \(action === 'judge-now'\) judgeCopy\(\);\s*else if \(action === 'judge-soon'\) later\(judgeCopy, CONFIG\.copyWaitMs\);/, file);
  }
  // copyStatus says 'judge-now' only for a pass (tests/copy.test.js checks the cases).
  const status = body(src('src/copy.js'), 'copyStatus');
  assert.match(status, /scoreCopy\(strokes, char, opts\)\.ok\) return \{ action: 'judge-now'/);
  assert.match(status, /used\.length >= mostStrokes\(char\)\) return \{ action: 'judge-soon'/);
});

test('her name is never judged at once: every stroke starts the 3-second wait, with undo there', () => {
  for (const file of ['src/name-game.js', 'src/name-practice-game.js']) {
    const end = body(src(file), 'endCopyStroke');
    assert.match(end, /later\(judgeName, NAME_WAIT_MS\);/, file);
    assert.ok(!/judgeName\(\)/.test(end), `${file}: never judged straight from her lift`);
  }
});
