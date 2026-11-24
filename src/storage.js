// storage.js — settings and progress in localStorage. Every read and write is
// wrapped in try/catch: a full or blocked storage must never stop the game.

import { addFind, cleanFinds, addNameCard, isNameCard, isPageSticker, addPageSticker, cleanPages, addPage } from './finds.js';
import { cleanReviews, cleanPracticeMore, recordPractice } from './review.js';
import { finishedEarlier } from './progress.js';
import {
  CHILDREN_KEY, CURRENT_KEY, MIGRATION_KEY, WELCOMED_KEY, LEGACY_KEYS, childKey, isChildsKey,
  cleanChildren, childById, currentOf, addChild, updateChild, removeChild, firstChild, migratedValue,
} from './children.js';

// ---------------------------------------------------------------------------
// Test mode (?debug=1&today=...): her real progress must never change while a
// parent pretends it is another day. useStore(testStore(localStorage)) makes
// every read and write in this file go through a store that reads her real data
// but writes every change to a separate key (TEST_PREFIX + the real key). Reads
// see the test copy once one exists. Leaving test mode shows her real data,
// untouched. Every function below takes the active store by default.

export const TEST_PREFIX = 'test.';

export function testStore(real, prefix = TEST_PREFIX) {
  return {
    getItem(key) {
      const test = real.getItem(prefix + key);
      return test !== null && test !== undefined ? test : real.getItem(key);
    },
    setItem(key, value) {
      real.setItem(prefix + key, value);
    },
    // Only the test copy goes; her real data is never removed in test mode.
    removeItem(key) {
      real.removeItem?.(prefix + key);
    },
  };
}

let active = null;
// The store every function here uses by default; null: the tablet's own localStorage.
export function useStore(store) {
  active = store;
}

// ---------------------------------------------------------------------------
// Children's profiles (Slice 8A). childStore(real, id) is a store where every
// personal key is child `id`'s own copy (td.stars -> td.child.c1.stars, see
// src/children.js childKey) and device settings (SHARED_KEYS) stay shared.
// useChild(id) makes every function here use that child's copy; useChild(null)
// goes back to the keys as they were before Slice 8A (only while the migration
// has not finished, see openProfiles).

export function childStore(real, id) {
  return {
    child: id,
    getItem: (key) => real.getItem(childKey(id, key)),
    setItem: (key, value) => real.setItem(childKey(id, key), value),
    removeItem: (key) => real.removeItem?.(childKey(id, key)),
  };
}

let child = null;
export function useChild(id) {
  child = id;
}
export const currentChild = () => child;
// The store under the children: localStorage, or test mode's store.
const baseStore = () => active ?? globalThis.localStorage;
const activeStore = () => (child ? childStore(baseStore(), child) : baseStore());

export const ATTEMPTS_KEY = 'td.attempts';
export const MAX_ATTEMPTS = 2000;

// Pure: the log with `entry` added, keeping only the newest `max` entries.
export function appendAttempt(list, entry, max = MAX_ATTEMPTS) {
  const out = [...list, entry];
  return out.length > max ? out.slice(out.length - max) : out;
}

export function readAttempts(store = activeStore()) {
  try {
    const list = JSON.parse(store.getItem(ATTEMPTS_KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function logAttempt(entry, store = activeStore()) {
  try {
    const stamped = store.child ? { ...entry, child: store.child } : entry; // Slice 8A: whose attempt
    store.setItem(ATTEMPTS_KEY, JSON.stringify(appendAttempt(readAttempts(store), stamped)));
  } catch {
    // Storage full or blocked: carry on without logging.
  }
}

// The child's name, set by a parent on the setup page: { name, sayAs }: the
// name, and (optional) how the voice should say it. Since Slice 8A it is the
// playing child's (td.children). Before the migration has finished (no child
// chosen) it is the old td.profile, as before.
export const PROFILE_KEY = 'td.profile';
const MAX_NAME = 40;

// Pure: a clean profile from anything (missing fields become '').
export function cleanProfile(p) {
  const field = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_NAME) : '');
  return { name: field(p?.name), sayAs: field(p?.sayAs) };
}

export function readProfile(store = activeStore()) {
  try {
    if (store.child) return cleanProfile(childById(readChildren(store), store.child));
    return cleanProfile(JSON.parse(store.getItem(PROFILE_KEY) ?? '{}'));
  } catch {
    return cleanProfile(null);
  }
}

// Returns true when saved, false when storage is full or blocked. Only the name
// and how to say it change; renaming never resets anything here (setup.js does).
export function saveProfile(profile, store = activeStore()) {
  try {
    const clean = cleanProfile(profile);
    if (!store.child) {
      store.setItem(PROFILE_KEY, JSON.stringify(clean));
      return true;
    }
    const out = updateChild(readChildren(store), store.child, clean, { checkNames: false });
    return out.ok && saveChildren(out.state, store);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The children list (Slice 8A), shared by the whole device.

export function readChildren(store = activeStore()) {
  try {
    return cleanChildren(JSON.parse(store.getItem(CHILDREN_KEY) ?? 'null'));
  } catch {
    return cleanChildren(null);
  }
}

export function saveChildren(state, store = activeStore()) {
  try {
    store.setItem(CHILDREN_KEY, JSON.stringify(cleanChildren(state)));
    return true;
  } catch {
    return false;
  }
}

// The saved id of the child playing now (it may no longer be on the list).
export function readCurrent(store = activeStore()) {
  try {
    return store.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

export function saveCurrent(id, store = activeStore()) {
  try {
    store.setItem(CURRENT_KEY, id);
    return true;
  } catch {
    return false;
  }
}

// Has a parent seen the children page since Slice 8A part 2? (Shared by the device.)
export function readWelcomed(store = activeStore()) {
  try {
    return store.getItem(WELCOMED_KEY) === 'yes';
  } catch {
    return true; // blocked storage: never trap the app on the children page
  }
}

export function saveWelcomed(store = activeStore()) {
  try {
    store.setItem(WELCOMED_KEY, 'yes');
    return true;
  } catch {
    return false;
  }
}

// A parent adds a child: { ok, child } or { ok: false, reason } (children.js addChild).
export function addChildProfile(fields, store = baseStore()) {
  const out = addChild(readChildren(store), fields);
  if (!out.ok) return out;
  return saveChildren(out.state, store) ? out : { ok: false, reason: 'storage' };
}

// A parent changes a child's name, picture or color. A changed name is a new
// word, so only that child's name book starts again (resetName).
// { ok, child, renamed } or { ok: false, reason }.
export function updateChildProfile(id, changes, { nameId = 'name', store = baseStore() } = {}) {
  const out = updateChild(readChildren(store), id, changes);
  if (!out.ok) return out;
  if (!saveChildren(out.state, store)) return { ok: false, reason: 'storage' };
  if (out.renamed) resetName(nameId, childStore(store, id));
  return out;
}

// Every key in a store, when it can list them (localStorage can); null otherwise.
function keysOf(store) {
  try {
    if (typeof store.key !== 'function' || !Number.isInteger(store.length)) return null;
    const keys = [];
    for (let i = 0; i < store.length; i++) keys.push(store.key(i));
    return keys.filter((k) => typeof k === 'string');
  } catch {
    return null;
  }
}

// A parent removes a child: off the list, and every one of that child's own
// keys (test-mode copies too) is deleted. Nobody else's progress is touched.
// Returns true when done.
export function removeChildProfile(id, store = baseStore()) {
  try {
    const state = readChildren(store);
    if (!childById(state, id)) return false;
    const keys = keysOf(store) ?? LEGACY_KEYS.map((k) => childKey(id, k));
    for (const key of keys) if (isChildsKey(key, id)) store.removeItem(key);
    const left = removeChild(state, id);
    saveChildren(left, store);
    if (readCurrent(store) === id) {
      const next = currentOf(left, null);
      if (next) saveCurrent(next, store); else store.removeItem(CURRENT_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The migration (Slice 8A part 1; src/children.js). Before Slice 8A every
// personal key was saved once, for one child. migrateProfiles copies each to
// the first child (named from td.profile), leaving the old keys untouched as a
// backup. Each copy is read back and compared with what it should hold, and
// only then is td.migration set to 'done'. If anything fails part way (the app
// closed, storage full), nothing is marked done and the next open runs it again
// from the old keys, which were never changed. Children added since are kept.
// Returns { ok, child }: ok true once done (now or before).

export function migrateProfiles(store = baseStore()) {
  try {
    if (store.getItem(MIGRATION_KEY) === 'done') return { ok: true, child: null };
    // An earlier run that stopped part way may have saved the list already.
    let state = readChildren(store);
    if (state.list.length === 0) {
      let old = null;
      try { old = JSON.parse(store.getItem(PROFILE_KEY) ?? 'null'); } catch { old = null; }
      state = firstChild(cleanProfile(old)).state;
    }
    const first = state.list[0].id;
    const copies = LEGACY_KEYS.map((key) => [childKey(first, key), migratedValue(key, store.getItem(key), first)]);
    for (const [key, value] of copies) if (value !== null) store.setItem(key, value);
    if (!saveChildren(state, store)) return { ok: false, child: null };
    if (readCurrent(store) === null) saveCurrent(first, store);
    // Check: every copy holds exactly what it should, and the list is saved.
    const same = copies.every(([key, value]) => value === null || store.getItem(key) === value);
    if (!same || !childById(readChildren(store), first)) return { ok: false, child: null };
    store.setItem(MIGRATION_KEY, 'done');
    return store.getItem(MIGRATION_KEY) === 'done' ? { ok: true, child: first } : { ok: false, child: null };
  } catch {
    return { ok: false, child: null };
  }
}

// At every start: run the migration if it is still due, then play as the saved
// child (or the first). If the migration could not finish, the app plays on
// the old keys as before, and tries again next time. Returns the child's id, or null.
export function openProfiles(store = baseStore()) {
  const { ok } = migrateProfiles(store);
  const id = ok ? currentOf(readChildren(store), readCurrent(store)) : null;
  if (id && readCurrent(store) !== id) saveCurrent(id, store);
  useChild(id);
  return id;
}

// A child chooses their tile: from now on everything is theirs.
export function chooseChild(id, store = baseStore()) {
  if (!childById(readChildren(store), id)) return false;
  saveCurrent(id, store);
  useChild(id);
  return true;
}

// ---------------------------------------------------------------------------
// The app shell (Slice 5A): the day of the last visit, the gold stars, the music.

export const LAST_VISIT_KEY = 'td.lastVisit'; // 'YYYY-MM-DD', set when she opens the door
export const STARS_KEY = 'td.stars';          // ids of the characters she completed
export const MUSIC_KEY = 'td.music';          // 'on' or 'off'
export const ROUNDS_KEY = 'td.rounds';        // { [character id]: { round, helped } }: practice she left mid-way

export function readLastVisit(store = activeStore()) {
  try {
    const day = store.getItem(LAST_VISIT_KEY);
    return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
  } catch {
    return null;
  }
}

export function saveLastVisit(day, store = activeStore()) {
  try {
    store.setItem(LAST_VISIT_KEY, day);
    return true;
  } catch {
    return false;
  }
}

export function readStars(store = activeStore()) {
  try {
    const list = JSON.parse(store.getItem(STARS_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

// Pure: the star list with `id` added once.
export const addStar = (list, id) => (list.includes(id) ? list : [...list, id]);

export function saveStar(id, store = activeStore()) {
  try {
    store.setItem(STARS_KEY, JSON.stringify(addStar(readStars(store), id)));
    return true;
  } catch {
    return false;
  }
}

// Music is off until she (or a parent) turns it on.
export function readMusic(store = activeStore()) {
  try {
    return store.getItem(MUSIC_KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveMusic(on, store = activeStore()) {
  try {
    store.setItem(MUSIC_KEY, on ? 'on' : 'off');
    return true;
  } catch {
    return false;
  }
}

// Practice rounds, per character. A character with no entry starts at round 1.
function readAllRounds(store) {
  try {
    const all = JSON.parse(store.getItem(ROUNDS_KEY) ?? '{}');
    return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
  } catch {
    return {};
  }
}

export function readRounds(id, store = activeStore()) {
  const entry = readAllRounds(store)[id];
  return entry && typeof entry === 'object' ? entry : null;
}

export function saveRounds(id, { round, helped }, store = activeStore()) {
  try {
    const all = readAllRounds(store);
    all[id] = { round, helped: helped === true };
    store.setItem(ROUNDS_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

// The practice is finished: next time she starts again at round 1.
export function clearRounds(id, store = activeStore()) {
  try {
    const all = readAllRounds(store);
    delete all[id];
    store.setItem(ROUNDS_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

// The copy-it round's fading helper (Slice 5J part 2), per character:
// { [character id]: { level, passes, fails } } (src/progress.js startHelper).
export const HELPER_KEY = 'td.helper';

function readAllHelper(store) {
  try {
    const all = JSON.parse(store.getItem(HELPER_KEY) ?? '{}');
    return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
  } catch {
    return {};
  }
}

// What was saved for one character, or null (startHelper cleans it).
export function readHelper(id, store = activeStore()) {
  const entry = readAllHelper(store)[id];
  return entry && typeof entry === 'object' ? entry : null;
}

export function saveHelper(id, { level, passes, fails }, store = activeStore()) {
  try {
    const all = readAllHelper(store);
    all[id] = { level, passes, fails };
    store.setItem(HELPER_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Her collection (Slice 5C): every find, newest last. { o } or { g, n, gold }.

export const FINDS_KEY = 'td.finds';

export function readFinds(store = activeStore()) {
  try {
    return cleanFinds(JSON.parse(store.getItem(FINDS_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function saveFind(entry, store = activeStore()) {
  try {
    store.setItem(FINDS_KEY, JSON.stringify(addFind(readFinds(store), entry)));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The games book (Slice 5D): the games she has finished at least once (a gold
// star on their tile).

export const GAME_STARS_KEY = 'td.games';

export function readGameStars(store = activeStore()) {
  try {
    const list = JSON.parse(store.getItem(GAME_STARS_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveGameStar(id, store = activeStore()) {
  try {
    store.setItem(GAME_STARS_KEY, JSON.stringify(addStar(readGameStars(store), id)));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The Drawing book (Slice 5E): the pictures she has finished ('L1:house',
// 'L3:car-building', ...), each a gold star on its tile.

export const DRAW_STARS_KEY = 'td.drawings';

export function readDrawStars(store = activeStore()) {
  try {
    const list = JSON.parse(store.getItem(DRAW_STARS_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveDrawStar(id, store = activeStore()) {
  try {
    store.setItem(DRAW_STARS_KEY, JSON.stringify(addStar(readDrawStars(store), id)));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The games book (Slice 5H): what the last play of each game showed, so the
// next play of that game never repeats it. { [game id]: [set keys] }, where a
// key names what one set (or board, or row) held (src/games.js setKey and friends).

export const LAST_PLAY_KEY = 'td.lastPlay';

export function readLastPlay(game, store = activeStore()) {
  try {
    const all = JSON.parse(store.getItem(LAST_PLAY_KEY) ?? '{}');
    const keys = all && typeof all === 'object' ? all[game] : null;
    return Array.isArray(keys) ? keys.filter((k) => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function saveLastPlay(game, keys, store = activeStore()) {
  try {
    let all;
    try { all = JSON.parse(store.getItem(LAST_PLAY_KEY) ?? '{}'); } catch { all = null; }
    if (!all || typeof all !== 'object' || Array.isArray(all)) all = {};
    all[game] = keys.filter((k) => typeof k === 'string');
    store.setItem(LAST_PLAY_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Missing piece (Slice 5H): finished rounds per level, { [level]: count }. A
// level opens after 3 finished rounds of the one before (src/games.js missingLevelOpen).

export const MISSING_KEY = 'td.missing';

export function readMissingRounds(store = activeStore()) {
  try {
    const all = JSON.parse(store.getItem(MISSING_KEY) ?? '{}');
    if (!all || typeof all !== 'object' || Array.isArray(all)) return {};
    return Object.fromEntries(Object.entries(all).filter(([, n]) => Number.isInteger(n) && n >= 0));
  } catch {
    return {};
  }
}

export function addMissingRound(level, store = activeStore()) {
  try {
    const all = readMissingRounds(store);
    all[level] = (all[level] ?? 0) + 1;
    store.setItem(MISSING_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Memory (Slice 5N): finished boards per level, { [level]: count }, per child.
// A level opens after 3 finished boards of the one before (src/games.js memoryLevelOpen).

export const MEMORY_KEY = 'td.memory';

export function readMemoryBoards(store = activeStore()) {
  try {
    const all = JSON.parse(store.getItem(MEMORY_KEY) ?? '{}');
    if (!all || typeof all !== 'object' || Array.isArray(all)) return {};
    return Object.fromEntries(Object.entries(all).filter(([, n]) => Number.isInteger(n) && n >= 0));
  } catch {
    return {};
  }
}

export function addMemoryBoard(level, store = activeStore()) {
  try {
    const all = readMemoryBoards(store);
    all[level] = (all[level] ?? 0) + 1;
    store.setItem(MEMORY_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Reviews (Slice 5I): each letter's place in the 1, 3, 7, 21-day schedule and
// today's due letters (src/review.js), and the practice-more list that Slice 8's
// parent zone will show. A damaged or blocked storage reads as empty.

export const REVIEWS_KEY = 'td.reviews';
export const PRACTICE_MORE_KEY = 'td.practiceMore';

export function readReviews(store = activeStore()) {
  try {
    return cleanReviews(JSON.parse(store.getItem(REVIEWS_KEY) ?? 'null'));
  } catch {
    return cleanReviews(null);
  }
}

export function saveReviews(reviews, store = activeStore()) {
  try {
    store.setItem(REVIEWS_KEY, JSON.stringify(cleanReviews(reviews)));
    return true;
  } catch {
    return false;
  }
}

export function readPracticeMore(store = activeStore()) {
  try {
    return cleanPracticeMore(JSON.parse(store.getItem(PRACTICE_MORE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function savePracticeMore(list, store = activeStore()) {
  try {
    store.setItem(PRACTICE_MORE_KEY, JSON.stringify(cleanPracticeMore(list)));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Her name (Slice 9C). Its practice is saved under one id (src/name.js NAME_ID)
// like any character's: rounds, helper, star, review and the practice-more list.
// Her name card on her shelf of finds (Slice 9C part 2): added, or moved to the
// newest place, each time she finishes her name. Returns true when saved.
export function saveNameCard(store = activeStore()) {
  try {
    store.setItem(FINDS_KEY, JSON.stringify(addNameCard(readFinds(store))));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Page stickers (Slice 5L part 2). td.pages: { [character id]: full practice
// pages done }. Practice pages never touch stars, reviews or helper levels.

export const PAGES_KEY = 'td.pages';

export function readPages(store = activeStore()) {
  try {
    return cleanPages(JSON.parse(store.getItem(PAGES_KEY) ?? '{}'));
  } catch {
    return {};
  }
}

// A full practice page for `id`: one more in td.pages, and its sticker moves to
// the newest place on her shelf of finds. Returns the new count (0 if not saved).
export function savePracticePage(id, store = activeStore()) {
  try {
    const pages = addPage(readPages(store), id);
    store.setItem(PAGES_KEY, JSON.stringify(pages));
    store.setItem(FINDS_KEY, JSON.stringify(addPageSticker(readFinds(store), id)));
    return pages[id];
  } catch {
    return 0;
  }
}

// A changed name is a new word: resetName clears all of that, so she starts it
// fresh. Returns true when everything was cleared.
export function resetName(id, store = activeStore()) {
  try {
    const stars = readStars(store);
    if (stars.includes(id)) store.setItem(STARS_KEY, JSON.stringify(stars.filter((s) => s !== id)));
    clearRounds(id, store);
    const helper = readAllHelper(store);
    if (Object.hasOwn(helper, id)) {
      delete helper[id];
      store.setItem(HELPER_KEY, JSON.stringify(helper));
    }
    const reviews = readReviews(store);
    const letters = { ...reviews.letters };
    delete letters[id];
    saveReviews({
      ...reviews,
      letters,
      graduated: reviews.graduated.filter((g) => g !== id),
      today: reviews.today ? { ...reviews.today, ids: reviews.today.ids.filter((x) => x !== id) } : null,
    }, store);
    savePracticeMore(readPracticeMore(store).filter((e) => e.id !== id), store);
    // The name card on her shelf of finds was for the old name, and so were
    // the name's practice pages (Slice 5L part 3): its page count and sticker.
    const finds = readFinds(store);
    const oldName = (e) => isNameCard(e) || (isPageSticker(e) && e.pg === id);
    if (finds.some(oldName)) store.setItem(FINDS_KEY, JSON.stringify(finds.filter((e) => !oldName(e))));
    const pages = readPages(store);
    if (Object.hasOwn(pages, id)) {
      delete pages[id];
      store.setItem(PAGES_KEY, JSON.stringify(pages));
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Slice 5K: round 3 moved to reviews. A practice saved part way through the
// old round 3 had already finished rounds 1 and 2, so it counts as finished:
// its gold star when no help was used, its review schedule (as any finished
// practice: due tomorrow), and for her name (nameId) the name card. Its saved
// round is then cleared, so this happens once; it runs at every start and finds
// nothing the next time. Stars, helper levels, reviews and the practice-more
// list she already has are kept. Returns the ids it finished.
export function finishOldPractices(today, { nameId = 'name', store = activeStore() } = {}) {
  const done = finishedEarlier(readAllRounds(store));
  for (const { id, helped } of done) {
    if (!helped) saveStar(id, store);
    if (id === nameId) saveNameCard(store);
    const out = recordPractice({ reviews: readReviews(store), list: readPracticeMore(store) }, id, { helped }, today);
    saveReviews(out.reviews, store);
    savePracticeMore(out.list, store);
    clearRounds(id, store);
  }
  return done.map((d) => d.id);
}

// ---------------------------------------------------------------------------
// Dot Detective (Slice 10F): finished plays per level, { [level]: count }, per
// child. A level opens after 3 finished plays of the one before (src/detective.js).

export const DETECTIVE_KEY = 'td.detective';

export function readDetectivePlays(store = activeStore()) {
  try {
    const all = JSON.parse(store.getItem(DETECTIVE_KEY) ?? '{}');
    if (!all || typeof all !== 'object' || Array.isArray(all)) return {};
    return Object.fromEntries(Object.entries(all).filter(([, n]) => Number.isInteger(n) && n >= 0));
  } catch {
    return {};
  }
}

export function addDetectivePlay(level, store = activeStore()) {
  try {
    const all = readDetectivePlays(store);
    all[level] = (all[level] ?? 0) + 1;
    store.setItem(DETECTIVE_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}
