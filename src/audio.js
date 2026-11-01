// audio.js — spoken prompts and a soft chime. Placeholder voice: the browser's
// own speech in English (recorded family voices come later).
// Works offline when the tablet has an on-device voice; silent if unsupported.

// Everything the voice says. Change the wording here.
// {name}: her name (or how to say it, from the setup page). With no name set,
// the name part is dropped: "Start here, {name}!" becomes "Start here!".
// {letter} and {word}: the character and its picture word.
// A list means: pick one at random.
export const LINES = {
  start: "Let's start here, {name}!",
  wrongStart: 'Start here, {name}!',
  wrongDirection: 'This way, {name}!',
  good: ['Nice!', "That's it!", 'Good job, {name}!'],
  letterDone: 'Well done, {name}!',
  assist: "Let's do it together!",
  picture: '{letter} is for {word}!',
  freeDraw: 'Now draw anything you like!',
  end: 'All done. See you soon, {name}!',
};

// Pure: the line with {name}, {letter} and {word} filled in.
export function fillLine(template, { name = '', letter = '', word = '' } = {}) {
  let text = template;
  if (name) text = text.replaceAll('{name}', name);
  else text = text.replace(/,?\s*\{name\}/g, '');
  text = text.replaceAll('{letter}', letter).replaceAll('{word}', word);
  return text.replace(/\s+([!?.,])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

// Pure: the name the voice says, from a profile { name, sayAs }.
export function spokenName(profile) {
  const sayAs = profile?.sayAs?.trim();
  return sayAs || profile?.name?.trim() || '';
}

// Pure: one template for a line key (a random one for a list). rand() is 0..1.
export function pickLine(key, rand = Math.random) {
  const entry = LINES[key];
  if (Array.isArray(entry)) return entry[Math.min(entry.length - 1, Math.floor(rand() * entry.length))];
  return entry ?? null;
}

// Pure: the voice to use. English only: an Australian English voice if there is
// one, otherwise any English voice. On-device voices first in each group, so it
// works with Wi-Fi off. null when there is no English voice.
export function chooseVoice(voices) {
  const lang = (v) => String(v?.lang ?? '').toLowerCase().replace('_', '-');
  const english = (voices ?? []).filter((v) => lang(v).startsWith('en'));
  const au = english.filter((v) => lang(v) === 'en-au');
  return au.find((v) => v.localService) ?? au[0] ?? english.find((v) => v.localService) ?? english[0] ?? null;
}

const synth = globalThis.speechSynthesis;
let profile = { name: '', sayAs: '' };
let lastText = null;
let audioCtx = null;
let chimeGain = null;

// The child's profile (from storage.readProfile), for {name}.
export function setProfile(p) {
  profile = p ?? { name: '', sayAs: '' };
}

// Say a line now. `vars` fills {letter} and {word}; {name} comes from the profile.
// `name` in vars overrides it (the setup page's Test voice button).
export function speak(key, vars = {}) {
  const template = pickLine(key);
  if (!template) return;
  sayText(fillLine(template, { name: spokenName(profile), ...vars }));
}

export function sayText(text) {
  lastText = text;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const voice = chooseVoice(synth.getVoices());
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-AU';
    u.rate = 0.9;
    u.pitch = 1.2;
    synth.speak(u);
  } catch { /* no speech: stay silent */ }
}

// The ear button: say the last line again (the same words).
export function replay() {
  if (!lastText) return;
  try { synth?.cancel(); } catch { /* ignore */ }
  sayText(lastText);
}

// Call on every touch: browsers only allow sound after one.
export function unlock() {
  try {
    const Ctx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!audioCtx && Ctx) audioCtx = new Ctx();
    if (audioCtx?.state === 'suspended') audioCtx.resume();
  } catch { /* no Web Audio: chimes stay silent */ }
}

// Her finger is down: no sound may play.
export function hush() {
  try { synth?.cancel(); } catch { /* ignore */ }
  if (chimeGain && audioCtx) {
    try {
      chimeGain.gain.cancelScheduledValues(audioCtx.currentTime);
      chimeGain.gain.setValueAtTime(0, audioCtx.currentTime);
    } catch { /* ignore */ }
  }
}

// A soft two-note chime: sine waves with a gentle fade, never harsh.
export function chime() {
  if (!audioCtx) return;
  try {
    const t = audioCtx.currentTime;
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    for (const [freq, delay] of [[784, 0], [1175, 0.09]]) {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(t + delay);
      osc.stop(t + 1);
    }
    chimeGain = gain;
  } catch { /* stay silent */ }
}
