// Run: node --test tests/finds.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBJECTS, ROOMS, PLACES, OUTDOORS, THINGS } from '../data/finds.js';
import { LETTER_WORDS, SHADOW_THINGS } from '../data/games.js';
import {
  FINDS, SPOTS, letterScene, hasLetterScene, afterWriting, roomFor, roomCounts, objectsFor, targetsFor,
  inScenes, preferPlace, findArt,
  numberScene, hasNumberScene, groupWord, makeGroup, CELL, startCount, tapCount,
  sceneFit, groupScale, countScale, addFind, cleanFinds, lastGroupKind, findLogEntry,
} from '../src/finds.js';
import { navigate } from '../src/session.js';

// A repeatable random source (mulberry32).
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
const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const NO_SCENE = ['X'];                          // fewer than 2 find pictures (U has 2 since Slice 5J part 2)
const LETTERS = ALPHABET.filter((L) => !NO_SCENE.includes(L));
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
// Her tablet: Chrome with its bar, the installed app (full screen), half a split screen.
const SCREENS = [[1280, 626], [1280, 800], [640, 626]];

// ---- the library ----

// The sound-first word list (Slice 5G): every find word starts with its letter's sound.
const WORDS = {
  A: ['apple', 'ant', 'alligator'], B: ['ball', 'banana', 'bus'], C: ['cat', 'cup', 'cake'],
  D: ['dog', 'duck', 'drum'], E: ['egg', 'elephant', 'envelope'], F: ['fish', 'fan', 'fork', 'flag', 'frock'],
  G: ['goat', 'gift', 'grapes'], H: ['hat', 'horse', 'honey', 'heart'], I: ['insect', 'igloo', 'ink'],
  J: ['jug', 'jellyfish', 'juice'], K: ['kite', 'key', 'kettle'], L: ['lamp', 'lemon', 'lion', 'lunchbox'],
  M: ['moon', 'mango', 'milk'], N: ['nest', 'nut', 'net'], O: ['octopus', 'orange', 'olive'],
  P: ['pencil', 'pear', 'parrot'], Q: ['queen', 'quilt'], R: ['rabbit', 'ring', 'rainbow'],
  S: ['sun', 'sock', 'star'], T: ['tiger', 'tomato', 'toys'], U: ['umbrella', 'umpire'], V: ['van', 'vase', 'violin'],
  W: ['watch', 'whale', 'worm'], X: [], Y: ['yo-yo', 'yak', 'yogurt'], Z: ['zebra', 'zip'],
};

// The approved object-to-place table.
const TABLE = {
  apple: 'kitchen garden', ant: 'garden', alligator: 'zoo', ball: 'living bedroom', banana: 'kitchen', bus: 'bedroom living',
  cat: 'garden', cup: 'kitchen', cake: 'kitchen', dog: 'garden', duck: 'garden', drum: 'living bedroom',
  egg: 'kitchen', elephant: 'bedroom living', envelope: 'study living',
  fish: 'sea', fan: 'kitchen living', fork: 'kitchen', flag: 'study', frock: 'bedroom',
  goat: 'garden', gift: 'living bedroom', grapes: 'kitchen garden',
  hat: 'living bedroom', horse: 'garden', honey: 'kitchen', heart: 'study living',
  insect: 'living bedroom', igloo: 'bedroom', ink: 'study', jug: 'kitchen', jellyfish: 'sea', juice: 'kitchen',
  kite: 'garden', key: 'living kitchen', kettle: 'kitchen',
  lamp: 'study bedroom', lemon: 'kitchen', lion: 'zoo', lunchbox: 'kitchen study',
  moon: 'bedroom', mango: 'kitchen', milk: 'kitchen', nest: 'garden', nut: 'kitchen garden', net: 'sea',
  octopus: 'sea', orange: 'kitchen', olive: 'kitchen', pencil: 'study', pear: 'kitchen garden', parrot: 'zoo',
  queen: 'bedroom', quilt: 'bedroom', rabbit: 'garden', ring: 'bedroom', rainbow: 'garden',
  sun: 'sea', sock: 'bedroom', star: 'bedroom study', tiger: 'study bedroom', tomato: 'kitchen', toys: 'living bedroom',
  umbrella: 'sea living', umpire: 'living garden', van: 'living bedroom', vase: 'living', violin: 'living study',
  watch: 'bedroom', whale: 'sea', worm: 'garden', yoyo: 'bedroom living', yak: 'zoo', yogurt: 'kitchen',
  zebra: 'zoo', zip: 'bedroom',
};
const ANIMALS = ['ant', 'alligator', 'cat', 'dog', 'duck', 'fish', 'goat', 'horse', 'insect', 'jellyfish', 'lion',
  'octopus', 'parrot', 'rabbit', 'whale', 'worm', 'yak', 'zebra'];
const RETIRED = ['ice-cream', 'eraser'];
const inFinds = OBJECTS.filter(inScenes);

test('the find words are exactly the sound-first list; X has none', () => {
  for (const L of ALPHABET) {
    assert.deepEqual(objectsFor(L).map((o) => o.word).sort(), [...WORDS[L]].sort(), L);
  }
});

test('every word starts with its letter, one plain word each, and no word or id appears twice', () => {
  const ids = OBJECTS.map((o) => o.id);
  const words = OBJECTS.map((o) => o.word);
  assert.equal(new Set(ids).size, ids.length, 'ids');
  assert.equal(new Set(words).size, words.length, 'words');
  for (const o of OBJECTS) {
    assert.match(o.word, /^[a-z]+([ -][a-z]+)?$/, o.word);
    assert.equal(o.letter, o.word[0].toUpperCase(), o.word);
    assert.ok(o.art.startsWith('<svg') && o.art.endsWith('</svg>'), o.id);
  }
});

test('ice cream and eraser never appear in a find scene, as a target or a distractor', () => {
  for (const id of RETIRED) {
    const o = OBJECTS.find((x) => x.id === id);
    assert.ok(o, `${id} picture kept`);
    assert.equal(inScenes(o), false, id);
  }
  assert.ok(!objectsFor('I').some((o) => o.id === 'ice-cream'));
  assert.ok(!objectsFor('E').some((o) => o.id === 'eraser'));
  for (const L of LETTERS) {
    for (const seed of SEEDS.slice(0, 60)) {
      const ids = letterScene(L, seeded(seed)).items.map((o) => o.id);
      for (const id of RETIRED) assert.ok(!ids.includes(id), `${L} seed ${seed}: ${id}`);
    }
  }
});

test('Letter to picture shows insect for I, never ice cream or eraser; the Shadow game keeps ice cream', () => {
  assert.ok(LETTER_WORDS.I.includes('insect'));
  assert.ok(!Object.values(LETTER_WORDS).flat().some((id) => RETIRED.includes(id)));
  assert.ok(SHADOW_THINGS.includes('ice-cream'));
});

test('saved finds of retired pictures still show on her shelf', () => {
  const saved = [{ o: 'ice-cream' }, { o: 'eraser' }, { o: 'egg' }, { g: 'cup', n: 3, gold: false }];
  const kept = cleanFinds(saved);
  assert.deepEqual(kept, saved);
  for (const entry of kept) {
    const art = findArt(entry);
    assert.ok(typeof art === 'string' && art.startsWith('<svg'), JSON.stringify(entry));
  }
  assert.equal(findArt({ o: 'nope' }), null);
});

test('every picture is in one or two places, as the approved table says', () => {
  for (const o of OBJECTS) {
    assert.ok(o.places.length >= 1 && o.places.length <= 2, o.id);
    assert.ok(o.places.every((r) => PLACES[r]), o.id);
    if (TABLE[o.id]) assert.deepEqual(o.places, TABLE[o.id].split(' '), o.id);
  }
  assert.deepEqual(inFinds.map((o) => o.id).sort(), Object.keys(TABLE).sort());
  assert.deepEqual(OBJECTS.filter((o) => o.animal).map((o) => o.id).sort(), [...ANIMALS].sort());
});

test('seven places: the four rooms, the farm-garden, the zoo and the sea; count scenes keep the rooms', () => {
  assert.deepEqual(Object.keys(ROOMS).sort(), ['bedroom', 'kitchen', 'living', 'study']);
  assert.deepEqual(Object.keys(OUTDOORS).sort(), ['garden', 'sea', 'zoo']);
  assert.deepEqual(Object.keys(PLACES).sort(), ['bedroom', 'garden', 'kitchen', 'living', 'sea', 'study', 'zoo']);
  for (const [id, place] of Object.entries(PLACES)) {
    assert.equal(place.spots.length, SPOTS, id);
    assert.ok(place.backdrop.startsWith('<svg') && place.backdrop.endsWith('</svg>'), id);
  }
  for (const n of NUMBERS) for (const seed of SEEDS.slice(0, 30)) assert.ok(ROOMS[numberScene(n, { rand: seeded(seed) }).room]);
});

test('no backdrop paints a find-object shape: no sun, no star, no find picture', () => {
  for (const [id, place] of Object.entries(PLACES)) {
    const b = place.backdrop;
    // A sun: a big yellow disc (window suns became clouds in Slice 5G).
    for (const m of b.matchAll(/<circle [^>]*r="([\d.]+)"[^>]*fill="(#FFD43B|#FFE066|#FFF3B0|#FFB703)"/g)) {
      assert.ok(Number(m[1]) < 15, `${id}: a yellow disc of radius ${m[1]}`);
    }
    // A star: the five-pointed paths the rooms used to have (framed star, wallpaper stars).
    assert.ok(!/l12 26 28 3|l2 5 5 1 -4 3/.test(b), `${id}: a star`);
    // A ring or sun drawn as a yellow outline circle (the old chalk circle).
    assert.ok(!/<circle [^>]*fill="none"[^>]*stroke="#FFE066"/.test(b), `${id}: a yellow ring`);
    // No find object's picture pasted into a backdrop.
    assert.ok(!b.includes('class="art"'), `${id}: an object picture`);
  }
});

test('every room has 7 object spots, 3 placemat spots and a pool of at least 4 things', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    assert.equal(room.spots.length, 7, id);
    assert.equal(room.groups.length, 3, id);
    assert.ok(room.pool.length >= 4 && room.pool.every((k) => THINGS[k]), id);
    assert.ok(room.backdrop.startsWith('<svg'), id);
  }
});

test('nothing reaches out to the network: no http in any art', () => {
  const all = JSON.stringify({ OBJECTS, PLACES, THINGS });
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(all));
});

// ---- where things stand on her screen ----

test('every spot is on screen, clear of the button column, and every object at least 88 px wide', () => {
  for (const [w, h] of SCREENS.slice(0, 2)) {
    const { s, left, top } = sceneFit(w, h);
    for (const [id, room] of Object.entries(PLACES)) {
      for (const sp of room.spots) {
        const x0 = left + (sp.x - sp.w / 2) * s;
        const x1 = left + (sp.x + sp.w / 2) * s;
        const y0 = top + (sp.bottom - 1.2 * sp.w) * s;
        const y1 = top + sp.bottom * s;
        assert.ok(x0 >= 136 && x1 <= w && y0 >= 0 && y1 <= h, `${id} ${sp.x} at ${w}x${h}`);
        assert.ok(sp.w * s >= 88, `${id} ${sp.x}: ${sp.w * s} px`);
      }
      for (const g of room.groups ?? []) {
        assert.ok(left + (g.x - g.maxW / 2) * s >= 136 && left + (g.x + g.maxW / 2) * s <= w, `${id} group ${g.x}`);
      }
    }
  }
});

test('the spots of a place never overlap much (at most 60 square units)', () => {
  for (const [id, room] of Object.entries(PLACES)) {
    const box = (sp) => [sp.x - sp.w / 2, sp.bottom - 1.2 * sp.w, sp.x + sp.w / 2, sp.bottom];
    for (let i = 0; i < 7; i++) {
      for (let j = i + 1; j < 7; j++) {
        const [a, b] = [box(room.spots[i]), box(room.spots[j])];
        const ow = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
        const oh = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
        assert.ok(ow * oh <= 60 * 60, `${id} spots ${i} and ${j}`);
      }
    }
  }
});

// ---- letters: find 3 (or 2) ----

test('every letter except X has a scene; X goes straight to the star', () => {
  for (const L of LETTERS) {
    assert.ok(hasLetterScene(L), L);
    assert.equal(afterWriting(L), 'openScene', L);
  }
  for (const L of NO_SCENE) {
    assert.equal(hasLetterScene(L), false, L);
    assert.equal(letterScene(L), null, L);
    assert.equal(afterWriting(L), 'letterDone', L);
  }
  // Digits 1 to 9 count; 0 has no scene.
  assert.equal(afterWriting('4'), 'openScene');
  assert.equal(afterWriting('0'), 'letterDone');
  // letterDone from the writing screen goes back to her board, where the new star shows.
  const write = { screen: 'write', char: 'X', book: 'abc' };
  assert.deepEqual(navigate(write, { type: afterWriting('X') }), { screen: 'board', book: 'abc' });
});

test('a letter needs 2 pictures for a scene: 3 targets where 3 or more exist, 2 where only 2', () => {
  const pic = (id, letter, places = ['kitchen']) => ({ id, word: id, letter, places, reward: 'hop', art: '' });
  const fill = ['apple', 'banana', 'cup', 'cake', 'drum', 'egg'].map((id) => pic(id, id[0].toUpperCase()));
  const one = [pic('quilt', 'Q'), ...fill];
  const two = [...one, pic('queen', 'Q')];
  const three = [...two, pic('quail', 'Q')];
  assert.equal(afterWriting('Q', one), 'letterDone');
  assert.equal(afterWriting('Q', two), 'openScene');
  assert.equal(targetsFor('Q', two), 2);
  assert.equal(targetsFor('Q', three), 3);
  assert.equal(letterScene('Q', seeded(1), two).items.length, 7);
  // A picture kept out of scenes does not count.
  assert.equal(afterWriting('Q', [...one, { ...pic('queen', 'Q'), finds: false }]), 'letterDone');
  for (const L of LETTERS) assert.equal(targetsFor(L), ['Q', 'U', 'Z'].includes(L) ? 2 : 3, L);
});

test('the scene place is one that holds the most of her letter', () => {
  for (const L of LETTERS) {
    const counts = roomCounts(L);
    const most = Math.max(...Object.values(counts));
    for (const seed of SEEDS.slice(0, 40)) assert.equal(counts[roomFor(L, seeded(seed))], most, L);
  }
  // From the approved table.
  const only = { A: 'garden', C: 'kitchen', D: 'garden', E: 'living', F: 'kitchen', G: 'garden', H: 'living', I: 'bedroom',
    J: 'kitchen', K: 'kitchen', M: 'kitchen', N: 'garden', O: 'kitchen', Q: 'bedroom', R: 'garden', S: 'bedroom', T: 'bedroom', V: 'living' };
  for (const [L, place] of Object.entries(only)) {
    for (const seed of SEEDS.slice(0, 20)) assert.equal(roomFor(L, seeded(seed)), place, L);
  }
});

test('every scene: 3 targets (2 for Q, U and Z) plus 4 or 5 others, never sharing her letter, 7 spots, no duplicates', () => {
  for (const L of LETTERS) {
    for (const seed of SEEDS) {
      const scene = letterScene(L, seeded(seed));
      const n = targetsFor(L);
      assert.equal(scene.targets, n);
      assert.equal(scene.items.length, SPOTS);
      const right = scene.items.filter((o) => o.right);
      const others = scene.items.filter((o) => !o.right);
      assert.equal(right.length, n, `${L} seed ${seed}`);
      assert.ok(right.every((o) => o.letter === L && o.word[0].toUpperCase() === L));
      assert.equal(others.length, SPOTS - n);
      assert.ok(others.every((o) => o.letter !== L && o.word[0].toUpperCase() !== L), `${L} seed ${seed}`);
      assert.ok(scene.items.every(inScenes));
      assert.equal(new Set(scene.items.map((o) => o.id)).size, 7, 'no object twice');
      assert.equal(new Set(scene.items.map((o) => o.spot)).size, 7, 'no spot twice');
      assert.ok(scene.items.every((o) => PLACES[scene.room].spots.includes(o.spot)));
    }
  }
});

test('letter scenes take everything they can from their own place', () => {
  for (const L of LETTERS) {
    for (const seed of SEEDS.slice(0, 60)) {
      const scene = letterScene(L, seeded(seed));
      const own = (list) => list.filter((o) => o.places.includes(scene.room)).length;
      const right = scene.items.filter((o) => o.right);
      assert.equal(own(right), Math.min(scene.targets, own(objectsFor(L))), `${L} seed ${seed}`);
      const others = scene.items.filter((o) => !o.right);
      assert.equal(own(others), Math.min(SPOTS - scene.targets, own(inFinds.filter((o) => o.letter !== L))), `${L} seed ${seed}`);
    }
  }
});

test('a borrowed target is never an animal when a portable alternative exists', () => {
  let borrowedAnimals = 0;
  for (const L of LETTERS) {
    for (const seed of SEEDS) {
      const scene = letterScene(L, seeded(seed));
      const right = scene.items.filter((o) => o.right);
      const borrowed = right.filter((o) => !o.places.includes(scene.room));
      if (!borrowed.some((o) => o.animal)) continue;
      borrowedAnimals += 1;
      // Every portable picture of her letter from another place is already in the scene.
      const portableLeft = objectsFor(L).filter((o) => !o.places.includes(scene.room) && !o.animal && !right.some((r) => r.id === o.id));
      assert.deepEqual(portableLeft.map((o) => o.id), [], `${L} seed ${seed} in ${scene.room}`);
    }
  }
  // The rule also holds for others borrowed from other places.
  for (const seed of SEEDS.slice(0, 50)) {
    const list = inFinds.filter((o) => o.letter !== 'H');
    const picked = preferPlace(list, 'kitchen', 7, seeded(seed));
    const borrowed = picked.filter((o) => !o.places.includes('kitchen'));
    assert.ok(borrowed.every((o) => !o.animal), `seed ${seed}`);
  }
  assert.ok(borrowedAnimals > 0, 'some letters can only borrow an animal (W: worm), and that is allowed');
});

test('the kitchen never borrows a horse while a portable H picture could come', () => {
  for (const seed of SEEDS) {
    const picked = preferPlace(objectsFor('H'), 'kitchen', 3, seeded(seed));
    assert.ok(!picked.some((o) => o.id === 'horse'), `seed ${seed}`);
  }
});

// ---- numbers: pick the group, then count ----

test('numbers 1 to 9 have a scene; 0 and letters do not', () => {
  for (const n of NUMBERS) assert.ok(hasNumberScene(String(n)));
  assert.equal(hasNumberScene('0'), false);
  assert.equal(hasNumberScene('E'), false);
  assert.equal(numberScene(0), null);
});

test('every number scene: exactly one group of n, three different counts from 1 to 9, three different kinds', () => {
  for (const n of NUMBERS) {
    for (const seed of SEEDS) {
      const scene = numberScene(n, { rand: seeded(seed) });
      const counts = scene.groups.map((g) => g.count);
      assert.equal(scene.groups.length, 3);
      assert.equal(counts.filter((c) => c === n).length, 1);
      assert.equal(new Set(counts).size, 3);
      assert.ok(counts.every((c) => Number.isInteger(c) && c >= 1 && c <= 9));
      assert.equal(scene.groups[scene.right].count, n);
      assert.equal(new Set(scene.groups.map((g) => g.kind)).size, 3);
      assert.ok(scene.groups.every((g) => ROOMS[scene.room].pool.includes(g.kind)));
      assert.equal(new Set(scene.groups.map((g) => g.spot)).size, 3);
    }
  }
});

test('never the same kind of thing twice in a row', () => {
  for (const n of NUMBERS) {
    let lastKind = null;
    const rand = seeded(n * 7);
    for (let i = 0; i < 200; i++) {
      const scene = numberScene(n, { lastKind, rand });
      const kind = scene.groups[scene.right].kind;
      assert.notEqual(kind, lastKind);
      lastKind = kind;
    }
  }
});

test('one golden item in about one scene in four, only in the group she counts', () => {
  let golden = 0;
  for (const seed of SEEDS.concat(SEEDS.map((s) => s + 1000))) {
    const scene = numberScene(4, { rand: seeded(seed) });
    scene.groups.forEach((g, i) => {
      if (i !== scene.right) assert.equal(g.gold, -1);
      else if (g.gold !== -1) {
        golden += 1;
        assert.ok(g.gold >= 0 && g.gold < 4);
      }
    });
  }
  assert.ok(golden > 600 * 0.17 && golden < 600 * 0.33, `${golden} of 600`);
});

test('makeGroup: n cells, five a row, the golden one marked', () => {
  const g = makeGroup('cup', 7, 2);
  assert.equal((g.svg.match(/class="cnt/g) || []).length, 7);
  assert.equal((g.svg.match(/class="cnt gold"/g) || []).length, 1);
  assert.match(g.svg, /class="cnt gold" data-i="2"/);
  assert.equal(g.W, 5 * CELL + 20);
  assert.equal(makeGroup('cup', 3).W, 3 * CELL + 20);
});

test('the word after counting: "4 cups", "1 cup", "2 tomatoes"', () => {
  assert.equal(groupWord('cup', 4), '4 cups');
  assert.equal(groupWord('cup', 1), '1 cup');
  assert.equal(groupWord('tomato', 2), '2 tomatoes');
});

test('counting: numbers appear in the order she taps, each item once', () => {
  let state = startCount(4);
  const shown = [];
  for (const item of [2, 0, 2, 3, 9, 1]) {
    const r = tapCount(state, item);
    state = r.state;
    shown.push(r.number);
  }
  assert.deepEqual(shown, [1, 2, null, 3, null, 4]);
  assert.deepEqual(state.order, [2, 0, 3, 1]);
  assert.equal(state.done, true);
  assert.equal(tapCount(state, 0).number, null, 'no more numbers once done');
  assert.equal(startCount(4).done, false);
});

test('while she counts, every item is at least 72 px wide (and the cell at least 88 px to tap)', () => {
  for (const n of NUMBERS) {
    const { W, H } = makeGroup('cup', n);
    for (const [w, h] of SCREENS) {
      const k = countScale(W, H, w, h);
      assert.ok(60 * k >= 72, `${n} things at ${w}x${h}: ${60 * k} px`);
      assert.ok(CELL * k >= 88, `${n} things at ${w}x${h}: cell ${CELL * k} px`);
      assert.ok(W * k <= w - 136 - 24 + 1e-9 && H * k <= h - 250 + 1e-9);
    }
  }
});

test('a placemat on its spot is at least 88 px wide and fits its spot', () => {
  for (const n of NUMBERS) {
    const { W } = makeGroup('cup', n);
    for (const room of Object.values(ROOMS)) {
      for (const sp of room.groups) {
        const k = groupScale(W, sp.maxW);
        assert.ok(W * k <= sp.maxW + 1e-9);
        assert.ok(W * k * sceneFit(1280, 626).s >= 88, `${n}: ${W * k}`);
      }
    }
  }
});

// ---- her collection and the log ----

test('the collection keeps the newest 500 finds and only well-formed ones', () => {
  let list = [];
  for (let i = 0; i < 505; i++) list = addFind(list, { o: 'egg', i });
  assert.equal(list.length, 500);
  assert.equal(list[0].i, 5);
  assert.deepEqual(cleanFinds([{ o: 'egg' }, { o: 'nope' }, { g: 'cup', n: 4, gold: true }, { g: 'cup', n: 12 }, null, 'x']),
    [{ o: 'egg' }, { g: 'cup', n: 4, gold: true }]);
  assert.deepEqual(cleanFinds('nope'), []);
  assert.equal(lastGroupKind([{ g: 'cup', n: 2 }, { o: 'egg' }, { g: 'star', n: 3 }, { o: 'ink' }]), 'star');
  assert.equal(lastGroupKind([{ o: 'egg' }]), null);
});

test('a find log entry: type find, the word or count, right or wrong, ms since the scene opened', () => {
  const now = new Date('2026-11-03T10:00:00Z');
  assert.deepEqual(findLogEntry({ char: 'E', scene: 'letter', step: 'find', word: 'egg', ok: true, ms: 1234.4, now }),
    { type: 'find', time: '2026-11-03T10:00:00.000Z', char: 'E', scene: 'letter', step: 'find', word: 'egg', ok: true, ms: 1234 });
  assert.deepEqual(findLogEntry({ char: '4', scene: 'number', step: 'group', count: 7, ok: false, ms: 50, now }),
    { type: 'find', time: '2026-11-03T10:00:00.000Z', char: '4', scene: 'number', step: 'group', count: 7, ok: false, ms: 50 });
});
