// storage.js — settings and progress in localStorage. Every read and write is
// wrapped in try/catch: a full or blocked storage must never stop the game.

import { addFind, cleanFinds } from './finds.js';
import { cleanReviews, cleanPracticeMore } from './review.js';

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
  };
}

let active = null;
// The store every function here uses by default; null: the tablet's own localStorage.
export function useStore(store) {
  active = store;
}
const activeStore = () => active ?? globalThis.localStorage;

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
    store.setItem(ATTEMPTS_KEY, JSON.stringify(appendAttempt(readAttempts(store), entry)));
  } catch {
    // Storage full or blocked: carry on without logging.
  }
}

// The child's profile, set by a parent on index.html?setup=1.
// { name, sayAs }: her name, and (optional) how the voice should say it.
export const PROFILE_KEY = 'td.profile';
const MAX_NAME = 40;

// Pure: a clean profile from anything (missing fields become '').
export function cleanProfile(p) {
  const field = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_NAME) : '');
  return { name: field(p?.name), sayAs: field(p?.sayAs) };
}

export function readProfile(store = activeStore()) {
  try {
    return cleanProfile(JSON.parse(store.getItem(PROFILE_KEY) ?? '{}'));
  } catch {
    return cleanProfile(null);
  }
}

// Returns true when saved, false when storage is full or blocked.
export function saveProfile(profile, store = activeStore()) {
  try {
    store.setItem(PROFILE_KEY, JSON.stringify(cleanProfile(profile)));
    return true;
  } catch {
    return false;
  }
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
