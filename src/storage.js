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
