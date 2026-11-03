// storage.js — settings and progress in localStorage. Every read and write is
// wrapped in try/catch: a full or blocked storage must never stop the game.

import { addFind, cleanFinds } from './finds.js';

export const ATTEMPTS_KEY = 'td.attempts';
export const MAX_ATTEMPTS = 2000;

// Pure: the log with `entry` added, keeping only the newest `max` entries.
export function appendAttempt(list, entry, max = MAX_ATTEMPTS) {
  const out = [...list, entry];
  return out.length > max ? out.slice(out.length - max) : out;
}

export function readAttempts(store = globalThis.localStorage) {
  try {
    const list = JSON.parse(store.getItem(ATTEMPTS_KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function logAttempt(entry, store = globalThis.localStorage) {
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

export function readProfile(store = globalThis.localStorage) {
  try {
    return cleanProfile(JSON.parse(store.getItem(PROFILE_KEY) ?? '{}'));
  } catch {
    return cleanProfile(null);
  }
}

// Returns true when saved, false when storage is full or blocked.
export function saveProfile(profile, store = globalThis.localStorage) {
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

export function readLastVisit(store = globalThis.localStorage) {
  try {
    const day = store.getItem(LAST_VISIT_KEY);
    return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
  } catch {
    return null;
  }
}

export function saveLastVisit(day, store = globalThis.localStorage) {
  try {
    store.setItem(LAST_VISIT_KEY, day);
    return true;
  } catch {
    return false;
  }
}

export function readStars(store = globalThis.localStorage) {
  try {
    const list = JSON.parse(store.getItem(STARS_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

// Pure: the star list with `id` added once.
export const addStar = (list, id) => (list.includes(id) ? list : [...list, id]);

export function saveStar(id, store = globalThis.localStorage) {
  try {
    store.setItem(STARS_KEY, JSON.stringify(addStar(readStars(store), id)));
    return true;
  } catch {
    return false;
  }
}

// Music is off until she (or a parent) turns it on.
export function readMusic(store = globalThis.localStorage) {
  try {
    return store.getItem(MUSIC_KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveMusic(on, store = globalThis.localStorage) {
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

export function readRounds(id, store = globalThis.localStorage) {
  const entry = readAllRounds(store)[id];
  return entry && typeof entry === 'object' ? entry : null;
}

export function saveRounds(id, { round, helped }, store = globalThis.localStorage) {
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
export function clearRounds(id, store = globalThis.localStorage) {
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

export function readFinds(store = globalThis.localStorage) {
  try {
    return cleanFinds(JSON.parse(store.getItem(FINDS_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function saveFind(entry, store = globalThis.localStorage) {
  try {
    store.setItem(FINDS_KEY, JSON.stringify(addFind(readFinds(store), entry)));
    return true;
  } catch {
    return false;
  }
}
