// audio.js — spoken prompts and a soft chime. Placeholder voice: the browser's
// own speech in English (recorded family voices come in Slice 6).
// Works offline when the tablet has an on-device voice; silent if unsupported.

export const PROMPTS = {
  start: 'Start here!',
  way: 'This way!',
  good: 'Great!',
  done: 'Well done!',
};

const synth = globalThis.speechSynthesis;
let lastKey = null;
let audioCtx = null;
let chimeGain = null;

// Prefer an English voice that runs on the device, so it works with Wi-Fi off.
function pickVoice() {
  const voices = synth.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('en'));
  return voices.find((v) => v.localService) ?? null;
}

export function speak(key) {
  const text = PROMPTS[key];
  if (!text) return;
  lastKey = key;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate = 0.9;
    u.pitch = 1.2;
    synth.speak(u);
  } catch { /* no speech: stay silent */ }
}

// The ear button: say the last prompt again.
export function replay() {
  if (!lastKey) return;
  try { synth?.cancel(); } catch { /* ignore */ }
  speak(lastKey);
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
