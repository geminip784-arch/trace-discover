// setup.js — the parent setup page, shown only for index.html?setup=1.
// Plain and grown-up: text is fine here, she never sees this page.
// Her name is never written in the code: it lives only in localStorage (td.profile).

import { readProfile, saveProfile } from './storage.js';
import { speak, setProfile, unlock } from './audio.js';

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

  main.querySelector('#save').addEventListener('click', () => {
    status.textContent = saveProfile(typed()) ? 'Saved.' : 'Could not save: storage is full or blocked.';
  });
  // Says a line with what is typed now (saved or not).
  main.querySelector('#test').addEventListener('click', () => {
    unlock();
    setProfile(typed());
    speak('letterDone');
  });
}
