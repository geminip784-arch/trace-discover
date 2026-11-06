// finds-page.js — the parent's review sheet (finds.html) for the find library:
// every picture grouped by letter with its word and places, the pictures kept
// out of find scenes, and every place's backdrop. Parent tool: text is fine here.

import { OBJECTS, PLACES } from '../data/finds.js';
import { objectsFor, roomCounts, inScenes, hasLetterScene } from './finds.js';

const NAMES = { kitchen: 'kitchen', study: 'study', living: 'living room', bedroom: 'bedroom', garden: 'farm-garden', zoo: 'zoo', sea: 'sea' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function card(o, best = []) {
  const places = o.places.map((p) => (best.includes(p) ? `<b style="display:inline;font-size:12px">${NAMES[p]}</b>` : NAMES[p])).join(', ');
  return `<figure>${o.art}<figcaption><b>${esc(o.word)}</b>${places}${o.animal ? ' · animal' : ''}</figcaption></figure>`;
}

// The places where her letter's scene can happen (the most of her pictures).
function bestPlaces(letter) {
  const counts = roomCounts(letter);
  const most = Math.max(...Object.values(counts));
  return most > 0 ? Object.keys(counts).filter((p) => counts[p] === most) : [];
}

let html = '';
for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  const objs = objectsFor(letter);
  const best = hasLetterScene(letter) ? bestPlaces(letter) : [];
  const note = hasLetterScene(letter)
    ? `${Math.min(3, objs.length)} to find in the ${best.map((p) => NAMES[p]).join(' or ')}`
    : 'no scene: straight to the star';
  html += `<section class="letter"><div class="cap"><b>${letter}</b><small>${esc(note)}</small></div><div class="set">`
    + (objs.length ? objs.map((o) => card(o, best)).join('') : '<p class="none">No find pictures yet.</p>')
    + '</div></section>';
}

const kept = OBJECTS.filter((o) => !inScenes(o));
html += '<h2>Kept out of find scenes (still on her shelf of finds; ice cream stays in the Shadow game)</h2>'
  + `<section class="letter"><div class="cap"><b>–</b></div><div class="set">${kept.map((o) => card(o)).join('')}</div></section>`;

html += '<h2>Places</h2><div class="places">'
  + Object.entries(PLACES).map(([id, p]) => `<figure>${p.backdrop.replace('width="1280" height="640"', '')}<figcaption><b>${NAMES[id]}</b></figcaption></figure>`).join('')
  + '</div>';

document.getElementById('sheet').innerHTML = html;
