// setup.js — the children page (Slice 8A part 2), for a parent. Text is fine
// here: a child never needs this page. It shows:
//   - on the first run, before any child has a name (src/children.js needsSetup);
//   - from the front door's gear, after its 3-second press-and-hold lock;
//   - once after the Slice 8A update, so a parent can add more children;
//   - at index.html?setup=1.
// A parent can add a child (up to 6), change a child's name, how to say it,
// picture and color, or remove a child (asked twice; only that child's
// progress is deleted). A changed name restarts only that child's name book.
// Names are never written in the code: they live only in localStorage (td.children).

import {
  openProfiles, readChildren, addChildProfile, updateChildProfile, removeChildProfile, saveWelcomed,
} from './storage.js';
import { speak, setProfile, unlock } from './audio.js';
import { nameOf, nameWidth, nameFits, NAME_ID } from './name.js';
import { charFile } from './session.js';
import { CREDITS } from '../data/credits.js';
import {
  ANIMALS, CHILD_COLORS, MAX_CHILDREN, checkName, childById, freshLook, needsSetup, childNameNote,
} from './children.js';
import { ANIMAL_ART } from './art.js';

const CSS = `
  .kids { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y;
    font: 20px/1.4 system-ui, sans-serif; font-weight: 400; color: #e8ecff; background: #1b1f3a; }
  .kids main { max-width: 720px; margin: 0 auto; padding: 32px 24px 64px; }
  .kids h1 { font-size: 30px; margin: 0 0 8px; }
  .kids h2 { font-size: 24px; margin: 0 0 16px; }
  .kids p { color: #b8bdd6; margin: 0 0 16px; }
  .kids label, .kids .label { display: block; margin: 0 0 6px; }
  .kids input { width: 100%; box-sizing: border-box; font: inherit; padding: 12px; margin: 0 0 16px; border-radius: 8px;
    border: 1px solid #9aa0b8; touch-action: auto; user-select: text; -webkit-user-select: text; }
  .kids button { font: inherit; padding: 10px 20px; border-radius: 8px; min-height: 48px; border: 0; background: #e8ecff; color: #1b1f3a; cursor: pointer; }
  .kids button.main { background: #FFD43B; font-weight: 700; }
  .kids button.danger { background: #fff; color: #6A1B9A; outline: 2px solid #CE93D8; }
  .kids button:disabled { opacity: 0.45; cursor: default; }
  .kids .row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .kids ul { list-style: none; padding: 0; margin: 24px 0; display: grid; gap: 12px; }
  .kids li { background: #2a2f52; border-radius: 12px; padding: 12px; }
  .kids li .row { flex-wrap: nowrap; }
  .kids .who { flex: 1; min-width: 0; }
  .kids .who b { display: block; font-size: 24px; overflow: hidden; text-overflow: ellipsis; }
  .kids .who span { color: #b8bdd6; font-size: 17px; }
  .kids .pic { width: 72px; height: 72px; flex: none; border-radius: 16px; padding: 6px; box-sizing: border-box; }
  .kids .pic svg { width: 100%; height: 100%; display: block; }
  .kids .confirm { margin-top: 12px; padding: 12px; border-radius: 8px; background: #3a2f5c; }
  .kids .confirm p { color: #fff; }
  .kids form { background: #2a2f52; border-radius: 12px; padding: 20px; margin: 24px 0; }
  .kids .choices { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 18px; }
  .kids .choices button { width: 72px; height: 72px; padding: 6px; border-radius: 16px; background: #fff; outline: 4px solid transparent; }
  .kids .choices button[aria-pressed=true] { outline-color: #FFD43B; }
  .kids .choices button svg { width: 100%; height: 100%; display: block; pointer-events: none; }
  .kids .choices.colors button { width: 56px; height: 56px; border-radius: 50%; }
  .kids .credits-link { margin-top: 32px; }
  .kids .credits-link button { background: transparent; color: #b8bdd6; outline: 1px solid #5a6088; font-size: 17px; }
  .kids .credits { background: #2a2f52; border-radius: 12px; padding: 20px; margin: 24px 0; }
  .kids .credits dt { font-weight: 700; color: #fff; margin-top: 12px; }
  .kids .credits dd { margin: 4px 0 0; color: #b8bdd6; font-size: 17px; overflow-wrap: anywhere; }
  .kids .note { margin: -8px 0 16px; font-size: 17px; }
  .kids .status { min-height: 1.4em; color: #fff; }
  .kids .done { margin-top: 32px; }
`;

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const named = (c) => c.name || 'A child with no name yet';

// The page into `root`. first: the first run (the page can only be left once
// every child has a name). onDone(): the parent is done (Start or Done).
// Returns { remove() }.
export function drawChildrenPage(root, { first = false, onDone = () => {}, doneLabel } = {}, doc = document) {
  if (!doc.getElementById('kids-css')) {
    const style = doc.createElement('style');
    style.id = 'kids-css';
    style.textContent = CSS;
    doc.head.appendChild(style);
  }
  const page = doc.createElement('div');
  page.className = 'kids';
  page.innerHTML = `<main>
    <h1>${first ? 'Welcome! Who will play?' : 'Children'}</h1>
    <p>${first
      ? 'Add each child who will play on this tablet (up to 6). Each one gets their own stars, finds and name book. Names stay on this tablet only.'
      : 'Each child has their own stars, finds and name book. Names stay on this tablet only.'}</p>
    <ul></ul>
    <div class="row"><button type="button" class="add">Add a child</button><span class="full"></span></div>
    <form hidden autocomplete="off"></form>
    <p class="status" role="status"></p>
    <div class="row done"><button type="button" class="main finish">${doneLabel ?? (first ? 'Start' : 'Done')}</button><span class="why"></span></div>
    <div class="row credits-link"><button type="button" class="show-credits" aria-expanded="false">Credits</button></div>
    <section class="credits" hidden><h2>Credits</h2><dl>${CREDITS.map((c) => `<dt>${esc(c.name)}</dt><dd>${esc(c.text)}</dd>`).join('')}</dl>
      <div class="row"><button type="button" class="hide-credits">Close</button></div></section>
  </main>`;
  root.appendChild(page);
  const $ = (sel) => page.querySelector(sel);
  const list = $('ul');
  const form = $('form');
  const status = $('.status');
  let editing = null; // null: the form is closed; 'new'; or a child's id

  function draw() {
    const state = readChildren();
    // A child with no name yet, open in the form, is only shown there (as "Add a child").
    const shown = state.list.filter((c) => !(c.id === editing && c.name === ''));
    list.replaceChildren(...shown.map((c) => childRow(c, state.list.length)));
    list.hidden = shown.length === 0;
    $('.add').disabled = state.list.length >= MAX_CHILDREN || editing !== null;
    $('.full').textContent = state.list.length >= MAX_CHILDREN ? `Up to ${MAX_CHILDREN} children.` : '';
    const ready = !needsSetup(state);
    $('.finish').disabled = !ready || editing !== null;
    $('.why').textContent = ready ? '' : state.list.length === 0 ? 'Add a child to start.' : 'Every child needs a name first.';
  }

  function childRow(c, count) {
    const li = doc.createElement('li');
    li.dataset.id = c.id;
    li.innerHTML = `<div class="row">
      <div class="pic" style="background:${c.color}">${ANIMAL_ART[c.animal]}</div>
      <div class="who"><b>${esc(named(c))}</b>${c.sayAs ? `<span>Said: ${esc(c.sayAs)}</span>` : ''}</div>
      <button type="button" class="edit">Change</button>
      <button type="button" class="danger remove"${count <= 1 ? ' disabled title="At least one child is needed"' : ''}>Remove</button>
    </div><div class="confirm" hidden></div>`;
    li.querySelector('.edit').addEventListener('click', () => openForm(c.id));
    li.querySelector('.remove').addEventListener('click', () => askRemove(li, c, 1));
    if (editing !== null) for (const b of li.querySelectorAll('button')) b.disabled = true;
    return li;
  }

  // Removing asks twice. Only that child's own progress is deleted.
  function askRemove(li, c, step) {
    const box = li.querySelector('.confirm');
    const who = esc(named(c));
    box.hidden = false;
    box.innerHTML = step === 1
      ? `<p>Remove ${who}? ${who}'s stars, finds, name book and all their progress on this tablet will be deleted. The other children's progress stays.</p>
         <div class="row"><button type="button" class="danger yes">Yes, remove</button><button type="button" class="no">Keep ${who}</button></div>`
      : `<p>Are you sure? This cannot be undone.</p>
         <div class="row"><button type="button" class="danger yes">Remove ${who} for good</button><button type="button" class="no">Keep ${who}</button></div>`;
    box.querySelector('.no').addEventListener('click', () => { box.hidden = true; box.replaceChildren(); });
    box.querySelector('.yes').addEventListener('click', () => {
      if (step === 1) return askRemove(li, c, 2);
      status.textContent = removeChildProfile(c.id) ? `${named(c)} was removed.` : 'Could not remove: storage is full or blocked.';
      openProfiles(); // the playing child may have changed
      draw();
    });
  }

  function openForm(id) {
    editing = id;
    const state = readChildren();
    const old = id === 'new' ? null : childById(state, id);
    const look = old ?? { name: '', sayAs: '', ...freshLook(state) };
    let animal = look.animal;
    let color = look.color;
    form.hidden = false;
    form.innerHTML = `<h2>${old?.name ? `Change ${esc(old.name)}` : 'Add a child'}</h2>
      <label for="kid-name">Name</label>
      <input id="kid-name" type="text" maxlength="40" value="${esc(look.name)}">
      <p class="note" role="status"></p>
      <label for="kid-say">How the voice should say it (optional)</label>
      <input id="kid-say" type="text" maxlength="40" value="${esc(look.sayAs)}">
      <span class="label">Picture</span>
      <div class="choices animals">${ANIMALS.map((a) => `<button type="button" data-v="${a}" aria-label="${a}" aria-pressed="${a === animal}">${ANIMAL_ART[a]}</button>`).join('')}</div>
      <span class="label">Color</span>
      <div class="choices colors">${CHILD_COLORS.map((k) => `<button type="button" data-v="${k}" aria-label="color ${k}" aria-pressed="${k === color}" style="background:${k}"></button>`).join('')}</div>
      <div class="row">
        <button type="submit" class="main">Save</button>
        <button type="button" class="cancel">Cancel</button>
        <button type="button" class="test">Test voice</button>
      </div>`;
    const name = form.querySelector('#kid-name');
    const sayAs = form.querySelector('#kid-say');
    const note = form.querySelector('.note');
    const pick = (group, set) => {
      for (const b of form.querySelectorAll(`.${group} button`)) {
        b.addEventListener('click', () => {
          set(b.dataset.v);
          for (const o of form.querySelectorAll(`.${group} button`)) o.setAttribute('aria-pressed', String(o === b));
        });
      }
    };
    pick('animals', (v) => { animal = v; });
    pick('colors', (v) => { color = v; });

    // How the name book will write the name, or why it cannot.
    let checking = 0;
    async function checkTyped() {
      const mine = ++checking;
      const check = checkName(readChildren(), name.value, old?.id ?? null);
      const n = nameOf(name.value);
      note.textContent = childNameNote(check, n.word);
      if (!check.ok) return;
      const width = await nameWidthOf(n.letters);
      if (mine === checking && width !== null && !nameFits(width)) {
        note.textContent = `${n.word} is too long for the name book to write on one line. A shorter form of the name will work.`;
      }
    }
    name.addEventListener('input', checkTyped);
    if (look.name) checkTyped();

    // Cancel closes the form, except on the first run while there is no child yet.
    form.querySelector('.cancel').hidden = first && !readChildren().list.some((c) => c.name !== '');
    form.querySelector('.cancel').addEventListener('click', closeForm);
    form.querySelector('.test').addEventListener('click', () => {
      unlock();
      setProfile({ name: name.value, sayAs: sayAs.value });
      speak('letterDone');
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      const fields = { name: name.value, sayAs: sayAs.value, animal, color };
      const out = old ? updateChildProfile(old.id, fields, { nameId: NAME_ID }) : addChildProfile(fields);
      if (!out.ok) {
        note.textContent = out.reason === 'none' ? 'Please type a name.'
          : out.reason === 'full' ? `Up to ${MAX_CHILDREN} children.`
          : out.reason === 'storage' ? 'Could not save: storage is full or blocked.'
          : childNameNote({ ok: false, reason: out.reason, bad: out.bad ?? [] });
        name.focus();
        return;
      }
      status.textContent = out.renamed
        ? `Saved. ${out.child.name}'s name practice starts again with the new name.`
        : `Saved ${out.child.name}.`;
      closeForm();
    };
    draw();
    name.focus();
  }

  function closeForm() {
    editing = null;
    form.hidden = true;
    form.replaceChildren();
    draw();
  }

  $('.add').addEventListener('click', () => { status.textContent = ''; openForm('new'); });
  // Credits (Slice 5M part 3): Twemoji's CC BY 4.0 credit and the others (data/credits.js).
  const showCredits = (on) => {
    $('.credits').hidden = !on;
    $('.show-credits').setAttribute('aria-expanded', String(on));
    if (on) $('.credits').scrollIntoView?.({ block: 'start' });
  };
  $('.show-credits').addEventListener('click', () => showCredits($('.credits').hidden));
  $('.hide-credits').addEventListener('click', () => showCredits(false));
  $('.finish').addEventListener('click', () => {
    if (needsSetup(readChildren())) return draw();
    saveWelcomed();
    openProfiles();
    onDone();
  });

  // The first run opens the form straight away: for the child with no name yet, or a new one.
  draw();
  if (first) {
    const unnamed = readChildren().list.find((c) => c.name === '');
    openForm(unnamed ? unnamed.id : 'new');
  }
  return { remove: () => page.remove() };
}

// index.html?setup=1: the children page on its own. Done opens the app.
export function showSetup(doc = document) {
  doc.body.classList.add('setup');
  for (const id of ['area', 'ear']) doc.getElementById(id)?.remove();
  openProfiles();
  drawChildrenPage(doc.body, {
    first: needsSetup(readChildren()),
    doneLabel: 'Open the app',
    onDone: () => { location.href = 'index.html'; },
  }, doc);
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
