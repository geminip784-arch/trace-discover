// setup.js — the parent setup page, shown only for index.html?setup=1.
// Plain and grown-up: text is fine here, she never sees this page.
// Her name is never written in the code: it lives only in localStorage (td.profile).

import { readProfile, saveProfile, resetName } from './storage.js';
import { speak, setProfile, unlock } from './audio.js';
import { nameOf, charName, nameWidth, nameFits, NAME_ID } from './name.js';
import { charFile } from './session.js';

const CSS = `
  body.setup { overflow: auto; touch-action: auto; user-select: text; -webkit-user-select: text;
    font: 20px/1.4 sans-serif; color: #e8ecff; }
  .setup main { max-width: 560px; margin: 40px auto; padding: 0 16px; }
  .setup h1 { font-size: 28px; margin: 0 0 24px; }
  .setup label { display: block; margin: 0 0 6px; }
  .setup input { width: 100%; box-sizing: border-box; font: inherit; padding: 12px; margin: 0 0 20px;
    border-radius: 8px; border: 1px solid #9aa0b8; touch-action: auto; user-select: text; -webkit-user-select: text; }
  .setup .row { display: flex; gap: 12px; }
  .setup button { font: inherit; padding: 12px 20px; border-radius: 8px; min-height: 48px; }
  .setup p { color: #b8bdd6; }
  .setup #nameNote { margin: -12px 0 20px; font-size: 17px; }
`;

export function showSetup(doc = document) {
  const style = doc.createElement('style');
  style.textContent = CSS;
  doc.head.appendChild(style);
  doc.body.classList.add('setup');
  for (const id of ['area', 'ear']) doc.getElementById(id)?.remove();

  const saved = readProfile();
  const main = doc.createElement('main');
  main.innerHTML = `
    <h1>Setup</h1>
    <label for="name">Child's name</label>
    <input id="name" type="text" autocomplete="off" maxlength="40">
    <p id="nameNote" role="status"></p>
    <label for="sayAs">How the voice should say it (optional)</label>
    <input id="sayAs" type="text" autocomplete="off" maxlength="40">
    <div class="row">
      <button id="save" type="button">Save</button>
      <button id="test" type="button">Test voice</button>
    </div>
    <p id="status" role="status"></p>
    <p>To play, open the app without ?setup=1.</p>`;
  doc.body.appendChild(main);

  const name = main.querySelector('#name');
  const sayAs = main.querySelector('#sayAs');
  const status = main.querySelector('#status');
  name.value = saved.name;
  sayAs.value = saved.sayAs;
  const typed = () => ({ name: name.value, sayAs: sayAs.value });
  const nameNote = main.querySelector('#nameNote');

  // Slice 9C: how her name book will write the name, or why it cannot.
  let checking = 0;
  async function checkName() {
    const mine = ++checking;
    const n = nameOf(name.value);
    if (n.reason === 'none') return void (nameNote.textContent = '');
    if (!n.ok) {
      nameNote.textContent = `Her name book can only write the letters a to z. It cannot use: ${n.bad.map(charName).join(', ')}.`;
      return;
    }
    const width = await nameWidthOf(n.letters);
    if (mine !== checking) return;
    if (width !== null && !nameFits(width)) nameNote.textContent = `${n.word} is too long to write on one line. Try a shorter form of her name.`;
    else nameNote.textContent = `Her name book will write: ${n.word}`;
  }
  name.addEventListener('input', checkName);
  checkName();

  main.querySelector('#save').addEventListener('click', () => {
    const before = nameOf(readProfile().name).word;
    if (!saveProfile(typed())) {
      status.textContent = 'Could not save: storage is full or blocked.';
      return;
    }
    // A different name is a new word: its practice, star and reviews start again.
    const after = nameOf(readProfile().name).word;
    if (before !== after && before !== '') {
      resetName(NAME_ID);
      status.textContent = 'Saved. Her name practice starts again with the new name.';
    } else status.textContent = 'Saved.';
  });
  // Says a line with what is typed now (saved or not).
  main.querySelector('#test').addEventListener('click', () => {
    unlock();
    setProfile(typed());
    speak('letterDone');
  });
}

// The name's width in line units, from the letters' own character files; null if one cannot be loaded.
async function nameWidthOf(letters) {
  try {
    const chars = await Promise.all([...new Set(letters)].map(async (id) => {
      const res = await fetch(`data/chars/${encodeURIComponent(charFile(id))}.json`);
      return [id, res.ok ? await res.json() : null];
    }));
    const byId = new Map(chars);
    if ([...byId.values()].some((c) => !Number.isFinite(c?.width))) return null;
    return nameWidth(letters.map((id) => byId.get(id)));
  } catch {
    return null;
  }
}
