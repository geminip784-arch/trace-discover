// Run: node --test tests/privacy.test.js
// Her real name must never be in the project: not in the code, the tests, the
// docs, the screenshots' file names or the mockups. It lives only on the tablet
// (td.profile, set on the setup page). Everything in the project uses made-up
// names such as "Sara".
//
// This file does not contain her name either: only the SHA-256 of it, in
// lowercase. Every run of letters in every tracked file is cut into windows as
// long as the name, and each window's hash is compared with the stored one, so
// the name is caught in any case, inside a longer word ("Name's"), or in a file
// name. (A hash of a short word is not a secret: anyone patient can work it
// back out. It only keeps the name out of plain sight.)
// Git history is not checked; it is left as it is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// SHA-256 of her first name, lowercase, and its length.
const PRIVATE = [{ length: 5, sha256: '92cd83fdcfc0e88e27cecdbb53991254e427e5f3a8db4ce362a9e58e6974755d' }];

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// The places in `text` where a word with one of `hashes` appears: [{ at, length }].
export function findHashed(text, hashes) {
  const found = [];
  const lower = text.toLowerCase();
  const memo = new Map();
  for (const m of lower.matchAll(/[a-z]+/g)) {
    for (const { length, sha256: want } of hashes) {
      for (let i = 0; i + length <= m[0].length; i++) {
        const w = m[0].slice(i, i + length);
        let h = memo.get(w);
        if (h === undefined) memo.set(w, (h = sha256(w)));
        if (h === want) found.push({ at: m.index + i, length });
      }
    }
  }
  return found;
}

// Every tracked file (git ls-files); without git, every file but .git and node_modules.
function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  } catch {
    const out = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        if (name === '.git' || name === 'node_modules') continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else out.push(relative(ROOT, p));
      }
    };
    walk(ROOT);
    return out;
  }
}

// A file is text unless it has a zero byte near its start (pictures, fonts).
const isText = (buf) => !buf.subarray(0, 8000).includes(0);

test('the detector finds a hashed name in any case, inside longer words, and nowhere else', () => {
  const made = [{ length: 4, sha256: sha256('sara') }]; // a made-up name, to test the test
  assert.equal(findHashed('Sara traces her name.', made).length, 1);
  assert.equal(findHashed("SARA's book; sara-jane", made).length, 2);
  assert.equal(findHashed('Sarah', made).length, 1, 'inside a longer word');
  assert.equal(findHashed('Sa ra, Saxa, arас', made).length, 0);
});

test('her real name is in no tracked file and no file name', () => {
  const files = trackedFiles();
  assert.ok(files.length > 50, 'the tracked files were listed');
  const hits = [];
  for (const file of files) {
    if (findHashed(file, PRIVATE).length) hits.push(`${file} (file name)`);
    let buf;
    try { buf = readFileSync(join(ROOT, file)); } catch { continue; } // deleted but not yet committed
    if (!isText(buf)) continue;
    const text = buf.toString('utf8');
    for (const { at } of findHashed(text, PRIVATE)) {
      hits.push(`${file}:${text.slice(0, at).split('\n').length}`);
    }
  }
  assert.deepEqual(hits, [], `her real name appears in: ${hits.join(', ')}. Use a made-up name or "her".`);
});
