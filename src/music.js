// music.js — gentle background music, generated with Web Audio (no files, works
// offline). Adapted from docs/mockups/mockup4.html: one tune for the bookshelf
// and one for the boards. The shell picks the tune (session.tuneFor) and turns
// it off while she writes.

import { audioContext } from './audio.js';

// Notes are semitones above C5 (melody) and C3 (bass); null is a rest.
// Each step is half a beat.
export const TUNES = {
  shelf: { bpm: 96, wave: 'triangle', mel: [7, null, 4, 7, 9, 7, 4, null, 2, 4, 7, 4, 2, 0, null, null], bass: [0, null, null, null, 5, null, 7, null] },
  board: { bpm: 92, wave: 'triangle', mel: [0, 2, 4, null, 4, 2, 0, null, 7, 4, 2, 4, 0, null, null, null], bass: [0, null, 5, null, 7, null, 5, null] },
};

const VOLUME = 0.5;      // overall music level (the chimes play on top)
const MELODY_GAIN = 0.05;
const BASS_GAIN = 0.05;
const LOOKAHEAD = 0.15;  // seconds of notes scheduled ahead
const TICK_MS = 30;

// Pure: frequency of a note `semitones` above `base` Hz.
export const noteHz = (base, semitones) => base * 2 ** (semitones / 12);

let enabled = false;
let wanted = null;   // the tune the current screen asks for (null: silence)
let playing = null;  // the tune actually playing
let bus = null;      // gain node all notes go through; replaced on every stop
let timer = 0;
let step = 0;
let next = 0;

function note(ctx, hz, t, dur, vol, type) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function tick() {
  const ctx = audioContext();
  if (!ctx || !playing) return;
  const tune = TUNES[playing];
  const dur = 60 / tune.bpm / 2;
  try {
    while (next < ctx.currentTime + LOOKAHEAD) {
      const m = tune.mel[step % tune.mel.length];
      const b = tune.bass[step % tune.bass.length];
      if (m !== null) note(ctx, noteHz(523.25, m), next, dur * 0.9, MELODY_GAIN, tune.wave);
      if (b !== null) note(ctx, noteHz(130.81, b), next, dur * 1.8, BASS_GAIN, 'sine');
      next += dur;
      step += 1;
    }
  } catch { /* stay silent */ }
}

function stop() {
  clearInterval(timer);
  timer = 0;
  playing = null;
  if (bus) {
    // Cut the notes already scheduled, at once.
    try { bus.disconnect(); } catch { /* ignore */ }
    bus = null;
  }
}

// Start, switch or stop so that what plays matches `enabled` and `wanted`.
function sync() {
  const ctx = audioContext();
  const target = enabled && !document.hidden ? wanted : null;
  if (target === playing) return;
  stop();
  if (!target || !ctx) return;
  try {
    bus = ctx.createGain();
    bus.gain.value = VOLUME;
    bus.connect(ctx.destination);
  } catch {
    bus = null;
    return;
  }
  playing = target;
  step = 0;
  next = ctx.currentTime + 0.12;
  timer = setInterval(tick, TICK_MS);
}

// The music button (and the saved setting at start).
export function setMusicOn(on) {
  enabled = on;
  sync();
}

// The tune for the screen she is on: 'shelf', 'board' or null (silence).
export function setTune(name) {
  wanted = TUNES[name] ? name : null;
  sync();
}

// Call after a touch: the audio context only exists after her first one.
export const resumeMusic = () => sync();

// A hidden app (another app on top, the screen off) plays nothing.
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', sync);
