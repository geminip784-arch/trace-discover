// voice-store.js — the voice pack on the tablet, in IndexedDB (Slice 6A).
// One record per clip: { id, source, addedAt, duration, wav } (src/voice.js).
// Clips never leave the tablet except in a backup file a parent downloads.
// Every call is wrapped in try/catch: blocked or full storage returns null or
// false instead of throwing.

const DB_NAME = 'td-voice';
const STORE = 'clips';

let opening = null;

function open() {
  if (opening) return opening;
  opening = new Promise((resolve) => {
    try {
      const req = globalThis.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  opening.then((db) => { if (!db) opening = null; });
  return opening;
}

// Runs fn(store) in one transaction; resolves with fn's request result, or
// `fail` when anything goes wrong.
async function run(mode, fn, fail) {
  const db = await open();
  if (!db) return fail;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      let result = fail;
      if (req) req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(req ? result : true);
      tx.onerror = () => resolve(fail);
      tx.onabort = () => resolve(fail);
    } catch {
      resolve(fail);
    }
  });
}

// The sound bytes as a Uint8Array, whatever IndexedDB handed back.
const asBytes = (wav) => (wav instanceof Uint8Array ? wav : new Uint8Array(wav));

// Every saved clip, as a Map by id (empty when storage cannot be read).
export async function readClips() {
  const list = await run('readonly', (s) => s.getAll(), null);
  return new Map((list ?? []).filter((c) => c?.id && c.wav).map((c) => [c.id, { ...c, wav: asBytes(c.wav) }]));
}

// Saves (or replaces) clips. true when they were saved.
export async function saveClips(clips) {
  const list = [...clips];
  if (!list.length) return true;
  return run('readwrite', (s) => {
    for (const c of list) s.put({ ...c, wav: asBytes(c.wav).slice().buffer });
    return null;
  }, false);
}

export const saveClip = (clip) => saveClips([clip]);

