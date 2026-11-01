// storage.js — settings and progress in localStorage. Every read and write is
// wrapped in try/catch: a full or blocked storage must never stop the game.

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
