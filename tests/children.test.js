// Run: node --test tests/children.test.js
// Slice 8A part 1: the children list (src/children.js, pure). Made-up names only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CHILDREN, ANIMALS, CHILD_COLORS, SHARED_KEYS, LEGACY_KEYS,
  childKey, isChildId, isChildsKey, cleanChild, cleanChildren, emptyChildren, childById,
  checkName, freshLook, addChild, updateChild, removeChild, currentOf, migratedValue, firstChild,
} from '../src/children.js';
import { TILE_COLORS } from '../src/session.js';

const withNames = (...names) => names.reduce((s, name) => addChild(s, { name }).state, emptyChildren());

test('8 animals and 8 colors, no red among the colors', () => {
  assert.equal(ANIMALS.length, 8);
  assert.equal(new Set(ANIMALS).size, 8);
  assert.equal(CHILD_COLORS.length, 8);
  for (const c of CHILD_COLORS) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    assert.ok(!(r > 150 && g < 80 && b < 80), `${c} is not red`);
  }
  assert.deepEqual(CHILD_COLORS, TILE_COLORS, 'the same readable colors as the board tiles');
});

test('a personal key gets the child\'s own copy; device settings stay shared', () => {
  assert.equal(childKey('c1', 'td.stars'), 'td.child.c1.stars');
  assert.equal(childKey('c2', 'td.attempts'), 'td.child.c2.attempts');
  for (const key of SHARED_KEYS) assert.equal(childKey('c1', key), key, `${key} is shared`);
  assert.equal(childKey('c1', 'td.music'), 'td.music');
  assert.equal(childKey('c1', 'td.lastVisit'), 'td.lastVisit');
  for (const key of LEGACY_KEYS) assert.notEqual(childKey('c1', key), key, `${key} is per child`);
  assert.ok(isChildsKey('td.child.c1.stars', 'c1'));
  assert.ok(isChildsKey('test.td.child.c1.stars', 'c1'));
  assert.ok(!isChildsKey('td.child.c11.stars', 'c1'), 'c11 is not c1');
  assert.ok(!isChildsKey('td.stars', 'c1'));
});

test('child ids are c1, c2, ... and never given twice', () => {
  assert.ok(isChildId('c1') && isChildId('c12'));
  assert.ok(!isChildId('c0') && !isChildId('1') && !isChildId('c1x') && !isChildId(null));
  let s = withNames('Sara', 'Omar');
  assert.deepEqual(s.list.map((c) => c.id), ['c1', 'c2']);
  s = removeChild(s, 'c2');
  s = addChild(s, { name: 'Zoya' }).state;
  assert.deepEqual(s.list.map((c) => c.id), ['c1', 'c3'], 'c2 is not used again');
});

test('a name must be a to z, and not another child\'s name in any case', () => {
  const s = withNames('Sara');
  assert.equal(checkName(s, '').reason, 'none');
  assert.equal(checkName(s, 'Sara Jane').reason, 'unsupported');
  assert.deepEqual(checkName(s, 'Zoë').bad, ['ë']);
  assert.equal(checkName(s, 'SARA').reason, 'taken');
  assert.equal(checkName(s, 'sara', 'c1').ok, true, 'renaming a child to their own name is fine');
  assert.equal(checkName(s, 'Omar').ok, true);
  assert.equal(addChild(s, { name: 'sara' }).reason, 'taken');
});

test('up to 6 children', () => {
  assert.equal(MAX_CHILDREN, 6);
  const s = withNames('Ali', 'Bina', 'Cyra', 'Dani', 'Esa', 'Fara');
  assert.equal(s.list.length, 6);
  assert.deepEqual(addChild(s, { name: 'Gul' }), { ok: false, reason: 'full' });
  assert.equal(cleanChildren({ next: 9, list: [...s.list, { id: 'c8', name: 'Gul' }] }).list.length, 6);
});

test('a new child gets an animal and a color no one has yet', () => {
  const s = withNames('Sara', 'Omar');
  assert.notEqual(s.list[0].animal, s.list[1].animal);
  assert.notEqual(s.list[0].color, s.list[1].color);
  assert.deepEqual(freshLook(emptyChildren()), { animal: ANIMALS[0], color: CHILD_COLORS[0] });
  const chosen = addChild(s, { name: 'Zoya', animal: 'owl', color: CHILD_COLORS[5] }).child;
  assert.equal(chosen.animal, 'owl');
  assert.equal(chosen.color, CHILD_COLORS[5]);
});

test('rename, new picture and color; only a changed name book word counts as renamed', () => {
  const s = withNames('Sara', 'Omar');
  const a = updateChild(s, 'c1', { name: 'SARA', animal: 'fox' });
  assert.ok(a.ok);
  assert.equal(a.renamed, false, 'SARA is still written "Sara"');
  assert.equal(a.child.animal, 'fox');
  const b = updateChild(s, 'c1', { name: 'Zoya' });
  assert.equal(b.renamed, true);
  assert.equal(childById(b.state, 'c1').name, 'Zoya');
  assert.equal(childById(b.state, 'c2').name, 'Omar', 'the other child is unchanged');
  assert.equal(updateChild(s, 'c1', { name: 'Omar' }).reason, 'taken');
  assert.equal(updateChild(s, 'c9', { name: 'Zoya' }).reason, 'missing');
  const c = updateChild(s, 'c2', { color: CHILD_COLORS[3] });
  assert.equal(c.renamed, false);
});

test('removing a child leaves the others; the playing child falls back to the first', () => {
  const s = removeChild(withNames('Sara', 'Omar', 'Zoya'), 'c2');
  assert.deepEqual(s.list.map((c) => c.name), ['Sara', 'Zoya']);
  assert.equal(currentOf(s, 'c3'), 'c3');
  assert.equal(currentOf(s, 'c2'), 'c1');
  assert.equal(currentOf(emptyChildren(), 'c1'), null);
});

test('a damaged list is cleaned', () => {
  assert.deepEqual(cleanChildren(null), { next: 1, list: [] });
  assert.deepEqual(cleanChildren('junk'), { next: 1, list: [] });
  const s = cleanChildren({ next: 1, list: [{ id: 'c4', name: '  Sara ', animal: 'dragon', color: '#FF0000' }, { id: 'c4' }, { id: 'x' }, null] });
  assert.equal(s.list.length, 1);
  assert.equal(s.next, 5, 'next is above every id');
  assert.deepEqual(s.list[0], { id: 'c4', name: 'Sara', sayAs: '', animal: ANIMALS[0], color: CHILD_COLORS[0] });
  assert.equal(cleanChild({ id: 'c1' }).name, '');
});

test('the migration copies values as they are; only log entries get the child id', () => {
  assert.equal(migratedValue('td.stars', '["A","B"]', 'c1'), '["A","B"]');
  assert.equal(migratedValue('td.stars', null, 'c1'), null);
  assert.equal(migratedValue('td.reviews', '{not json', 'c1'), '{not json', 'even damaged text is copied as it is');
  const log = JSON.parse(migratedValue('td.attempts', JSON.stringify([{ char: 'A' }, { char: 'B', child: 'c1' }]), 'c1'));
  assert.deepEqual(log, [{ char: 'A', child: 'c1' }, { char: 'B', child: 'c1' }]);
  const first = firstChild({ name: 'Sara', sayAs: 'Saa-ra' });
  assert.equal(first.child.id, 'c1');
  assert.equal(first.child.name, 'Sara');
  assert.equal(first.child.sayAs, 'Saa-ra');
  assert.equal(firstChild(null).child.name, '', 'no name saved yet: an unnamed first child');
  assert.equal(firstChild({ name: 'Sara Jane' }).child.name, 'Sara Jane', 'an old name is kept even if the name book cannot write it');
});
