// Run: node --test tests/pictures.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PICTURES, pictureFor } from '../src/pictures.js';

test('L lamp, T teddy, F fan; other characters have no picture', () => {
  assert.equal(pictureFor('L').word, 'lamp');
  assert.equal(pictureFor('T').word, 'teddy');
  assert.equal(pictureFor('F').word, 'fan');
  for (const id of ['E', 'H', 'I', '1', '4', '7']) assert.equal(pictureFor(id), null, id);
});

test('every picture is inline SVG that loads nothing from outside', () => {
  for (const [id, p] of Object.entries(PICTURES)) {
    assert.match(p.svg.trim(), /^<svg [^>]*viewBox="0 0 200 200"/, id);
    assert.ok(p.svg.trim().endsWith('</svg>'), id);
    const withoutXmlns = p.svg.replace('xmlns="http://www.w3.org/2000/svg"', '');
    assert.doesNotMatch(withoutXmlns, /https?:|href=|url\(|@import/, id);
  }
});
