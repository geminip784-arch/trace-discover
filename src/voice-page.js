// voice-page.js — voice.html, the parent's voice recorder (Slice 6A).
// Record or import one clip per script line, hear it back, keep it, and back
// the whole pack up. Clips are saved only on this tablet (src/voice-store.js).
// The app does not play them yet: that is Slice 6B.

import { SCRIPT, SCRIPT_IDS, CATEGORIES, recordFirst } from '../data/voice-script.js';
import {
  processClip, makeClip, mergeClips, idFromFileName, packBackup, unpackBackup,
  exportScript, wordsFor, clipState, progress, BACKUP_EXT,
} from './voice.js';
import { readClips, saveClip, saveClips } from './voice-store.js';
import { readProfile } from './storage.js';

const MAX_RECORD_MS = 10000; // a recording stops by itself after 10 seconds
const STATE_TEXT = { recorded: 'Recorded', imported: 'Imported', missing: 'Missing' };

export async function startVoicePage(doc = document) {
  const $ = (id) => doc.getElementById(id);
  const els = {
    list: $('list'), progress: $('progress'), status: $('status'),
    where: $('d-where'), words: $('d-words'), hint: $('d-hint'), state: $('d-state'),
    rec: $('rec'), play: $('play'), keep: $('keep'), again: $('again'), prev: $('prev'), next: $('next'),
    importFiles: $('import-files'), restoreFile: $('restore-file'),
  };
  const profile = readProfile();
  let saved = await readClips();
  let filter = 'all';
  let current = SCRIPT[0].id;
  let take = null;       // a new recording, not kept yet: { samples, clip }
  let recording = null;  // { recorder, stream, timer, startedAt }
  let audioCtx = null;
  let player = null;

  const say = (text) => { els.status.textContent = text; };
  const ctx = () => {
    const Ctx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!audioCtx && Ctx) audioCtx = new Ctx();
    return audioCtx;
  };

  const shown = () => SCRIPT.filter((c) => (filter === 'first' ? recordFirst(c) : filter === 'missing' ? !saved.has(c.id) : true));

  // ---- the list ----
  function renderList() {
    const clips = shown();
    const p = progress(SCRIPT, saved);
    els.progress.textContent = `${p.done} of ${p.total} clips saved`;
    els.list.textContent = '';
    for (const cat of CATEGORIES) {
      const inCat = clips.filter((c) => c.category === cat.id);
      if (!inCat.length) continue;
      const all = SCRIPT.filter((c) => c.category === cat.id);
      const h = doc.createElement('h2');
      h.innerHTML = `<span></span><span></span>`;
      h.children[0].textContent = cat.title;
      h.children[1].textContent = `${all.filter((c) => saved.has(c.id)).length} / ${all.length}`;
      els.list.appendChild(h);
      for (const c of inCat) {
        const state = clipState(saved.get(c.id));
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = `clip${c.id === current ? ' current' : ''}`;
        b.dataset.id = c.id;
        b.innerHTML = '<span class="words"></span><span class="id"></span><span class="pill"></span>';
        b.querySelector('.words').textContent = wordsFor(c, profile.name);
        b.querySelector('.id').textContent = c.id;
        const pill = b.querySelector('.pill');
        pill.textContent = STATE_TEXT[state];
        pill.classList.add(state);
        if (c.private) {
          const lock = doc.createElement('span');
          lock.className = 'lock';
          lock.textContent = 'private';
          b.insertBefore(lock, pill);
        }
        b.addEventListener('click', () => select(c.id));
        els.list.appendChild(b);
      }
    }
    if (!clips.length) {
      const p2 = doc.createElement('p');
      p2.textContent = 'Every clip here is saved.';
      els.list.appendChild(p2);
    }
  }

  // ---- the chosen clip ----
  function renderDetail() {
    const c = SCRIPT.find((x) => x.id === current);
    const cat = CATEGORIES.find((x) => x.id === c.category);
    const s = saved.get(c.id);
    els.where.textContent = `${cat.title} · ${c.id}${c.private ? ' · private (her name, never exported)' : ''}`;
    els.words.textContent = wordsFor(c, profile.name);
    let hint = c.hint;
    if (c.private && !profile.name) hint += ' Set her name on the setup page (index.html?setup=1) first.';
    else if (c.private && profile.sayAs) hint += ` Say her name as: ${profile.sayAs}.`;
    els.hint.textContent = hint;

    if (recording) {
      els.state.textContent = 'Recording… tap Stop when done.';
    } else if (take) {
      els.state.textContent = `New recording, ${take.clip.duration.toFixed(1)} s. Keep it, or record it again.`;
    } else if (s) {
      const when = new Date(s.addedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      els.state.textContent = `${STATE_TEXT[s.source]} ${when}, ${Number(s.duration).toFixed(1)} s.`;
    } else {
      els.state.textContent = 'Not recorded yet.';
    }
    els.rec.textContent = recording ? '■ Stop' : s && !take ? '● Record again' : '● Record';
    els.rec.classList.toggle('on', Boolean(recording));
    els.rec.hidden = Boolean(take);
    els.keep.hidden = !take;
    els.again.hidden = !take;
    els.play.disabled = Boolean(recording) || (!take && !s);
    const list = shown();
    const i = list.findIndex((x) => x.id === current);
    els.prev.disabled = Boolean(recording) || i <= 0;
    els.next.disabled = Boolean(recording) || i < 0 || i >= list.length - 1;
  }

  function select(id) {
    if (recording) return;
    stopPlaying();
    take = null;
    current = id;
    renderList();
    renderDetail();
    els.list.querySelector('.clip.current')?.scrollIntoView({ block: 'nearest' });
  }

  function step(by) {
    const list = shown();
    const i = list.findIndex((x) => x.id === current);
    const next = list[i + by];
    if (next) select(next.id);
  }

  // ---- hearing a clip ----
  function stopPlaying() {
    if (!player) return;
    try { player.pause(); } catch { /* ignore */ }
    URL.revokeObjectURL(player.src);
    player = null;
  }
  function playBytes(wav) {
    stopPlaying();
    try {
      player = new Audio(URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })));
      player.play().catch(() => say('Could not play this clip.'));
    } catch {
      say('Could not play this clip.');
    }
  }

  // A sound file's bytes made into samples ready to save, or null.
  async function decode(bytes) {
    const ac = ctx();
    if (!ac) return null;
    try {
      const buf = await ac.decodeAudioData(bytes.slice(0));
      const channels = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
      return processClip(channels, buf.sampleRate);
    } catch {
      return null;
    }
  }

  // ---- recording ----
  async function startRecording() {
    say('');
    if (!globalThis.navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      say('This browser cannot record here. Open the page from the GitHub Pages address (https) in Chrome.');
      return;
    }
    ctx();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false } });
    } catch {
      say('The microphone is blocked. Allow it for this page in Chrome (the icon left of the address), then try again.');
      return;
    }
    const chunks = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      clearTimeout(recording?.timer);
      recording = null;
      const id = current;
      const bytes = await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer();
      const samples = await decode(bytes);
      if (id !== current) return;
      if (!samples) {
        say('I did not hear anything. Try again a little closer.');
      } else {
        take = { samples, clip: makeClip({ id, source: 'recorded', samples }) };
        playBytes(take.clip.wav);
      }
      renderDetail();
    };
    recording = { recorder, stream, timer: setTimeout(() => stopRecording(), MAX_RECORD_MS) };
    recorder.start();
    stopPlaying();
    renderDetail();
  }
  function stopRecording() {
    try { recording?.recorder.stop(); } catch { /* ignore */ }
  }

  async function keepTake() {
    if (!take) return;
    const clip = { ...take.clip, addedAt: Date.now() };
    if (!(await saveClip(clip))) {
      say('Could not save: storage is full or blocked.');
      return;
    }
    saved.set(clip.id, clip);
    take = null;
    say(`Saved ${clip.id}.`);
    // Straight on to the next clip in the list, ready to record.
    const list = shown();
    const i = list.findIndex((x) => x.id === current);
    const next = filter === 'missing' ? list.find((x) => x.id !== current) : list[i + 1];
    if (next) select(next.id);
    else { renderList(); renderDetail(); }
  }

  // ---- import ----
  async function importFiles(files) {
    const unmatched = [];
    const unreadable = [];
    const clips = [];
    say(`Importing ${files.length} file${files.length === 1 ? '' : 's'}…`);
    let now = Date.now();
    for (const f of files) {
      const id = idFromFileName(f.name, SCRIPT_IDS);
      if (!id) { unmatched.push(f.name); continue; }
      const samples = await decode(await f.arrayBuffer());
      if (!samples) { unreadable.push(f.name); continue; }
      clips.push(makeClip({ id, source: 'imported', samples, now: now++ }));
    }
    const { clips: merged, added } = mergeClips(saved, clips);
    const ok = await saveClips(clips);
    if (ok) saved = merged;
    const lines = [ok ? `Imported ${added} clip${added === 1 ? '' : 's'}.` : 'Could not save: storage is full or blocked.'];
    if (unmatched.length) lines.push(`No clip with these names: ${unmatched.join(', ')}`);
    if (unreadable.length) lines.push(`Could not read (or only silence): ${unreadable.join(', ')}`);
    say(lines.join('\n'));
    take = null;
    renderList();
    renderDetail();
  }

  // ---- export, back up, restore ----
  function download(bytes, name, type) {
    const a = doc.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type }));
    a.download = name;
    doc.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }
  const today = () => new Date().toISOString().slice(0, 10);

  async function restore(file) {
    const clips = unpackBackup(new Uint8Array(await file.arrayBuffer()));
    if (!clips) { say('That file is not a voice pack backup.'); return; }
    const { clips: merged, added, kept } = mergeClips(saved, clips);
    const winners = clips.filter((c) => merged.get(c.id) === c);
    if (!(await saveClips(winners))) { say('Could not save: storage is full or blocked.'); return; }
    saved = merged;
    say(`Restored ${added} clip${added === 1 ? '' : 's'}.${kept ? ` Kept ${kept} newer clip${kept === 1 ? '' : 's'} already on this tablet.` : ''}`);
    take = null;
    renderList();
    renderDetail();
  }

  // ---- buttons ----
  els.rec.addEventListener('click', () => (recording ? stopRecording() : startRecording()));
  els.again.addEventListener('click', () => { take = null; startRecording(); });
  els.keep.addEventListener('click', keepTake);
  els.play.addEventListener('click', () => {
    const wav = take?.clip.wav ?? saved.get(current)?.wav;
    if (wav) playBytes(wav);
  });
  els.prev.addEventListener('click', () => step(-1));
  els.next.addEventListener('click', () => step(1));
  for (const b of doc.querySelectorAll('[data-filter]')) {
    b.addEventListener('click', () => {
      filter = b.dataset.filter;
      for (const o of doc.querySelectorAll('[data-filter]')) o.setAttribute('aria-pressed', String(o === b));
      const list = shown();
      if (list.length && !list.some((c) => c.id === current)) select(list[0].id);
      else { renderList(); renderDetail(); }
    });
  }
  $('import').addEventListener('click', () => els.importFiles.click());
  els.importFiles.addEventListener('change', async () => {
    const files = [...els.importFiles.files];
    els.importFiles.value = '';
    if (files.length) await importFiles(files);
  });
  $('export').addEventListener('click', () => {
    download(exportScript(SCRIPT, CATEGORIES), 'voice-script.txt', 'text/plain');
    say('Script downloaded (lines with her name are left out).');
  });
  $('backup').addEventListener('click', () => {
    if (!saved.size) { say('There are no clips to back up yet.'); return; }
    download(packBackup(saved.values()), `voice-pack-${today()}${BACKUP_EXT}`, 'application/octet-stream');
    say(`Backed up ${saved.size} clip${saved.size === 1 ? '' : 's'}. Keep the file somewhere safe, off the tablet too.`);
  });
  $('restore').addEventListener('click', () => els.restoreFile.click());
  els.restoreFile.addEventListener('change', async () => {
    const f = els.restoreFile.files[0];
    els.restoreFile.value = '';
    if (f) await restore(f);
  });
  doc.addEventListener('visibilitychange', () => { if (doc.hidden && recording) stopRecording(); });

  renderList();
  renderDetail();
}
