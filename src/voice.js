// voice.js — pure functions only. No DOM, no storage, no audio playback.
// Slice 6A: the voice pack's sound processing and file rules, for voice.html.
//   - every clip becomes 22.05 kHz mono 16-bit WAV (small, plays offline anywhere);
//   - silence trimmed at the start and end, the volume evened out;
//   - the import naming rule, "the newest clip wins", the backup file format,
//     and the export-script text (private lines left out).

export const RATE = 22050; // every saved clip's sample rate (mono)

// ---- sound processing (samples are Float32Array, -1..1) ----

// One channel from several: the average.
export function toMono(channels) {
  if (channels.length === 1) return Float32Array.from(channels[0]);
  const n = Math.min(...channels.map((c) => c.length));
  const out = new Float32Array(n);
  for (const c of channels) for (let i = 0; i < n; i++) out[i] += c[i] / channels.length;
  return out;
}

// A new sample rate. Going down, each output sample averages the input samples
// it covers (a simple low-pass, so no whistle from aliasing); going up, it
// interpolates between neighbours.
export function resample(samples, from, to = RATE) {
  if (from === to) return Float32Array.from(samples);
  const ratio = from / to;
  const n = Math.max(0, Math.floor(samples.length / ratio));
  const out = new Float32Array(n);
  if (ratio > 1) {
    for (let i = 0; i < n; i++) {
      const a = i * ratio;
      const b = Math.min(samples.length, a + ratio);
      let sum = 0;
      let w = 0;
      for (let j = Math.floor(a); j < Math.ceil(b); j++) {
        const cover = Math.min(j + 1, b) - Math.max(j, a);
        sum += samples[j] * cover;
        w += cover;
      }
      out[i] = w ? sum / w : 0;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const x = i * ratio;
      const j = Math.floor(x);
      const t = x - j;
      out[i] = samples[j] * (1 - t) + (samples[Math.min(j + 1, samples.length - 1)] ?? 0) * t;
    }
  }
  return out;
}

export const TRIM = {
  frameMs: 10,     // loudness is measured in frames this long
  floor: 0.004,    // a frame quieter than this (RMS) is always silence
  noiseTimes: 3,   // ...and so is one under 3 x the room's noise (its quietest 10% of frames)
  peakShare: 0.04, // ...or under 4% of the loudest frame
  padStartMs: 60,  // kept before the first sound, so a soft "h" or "f" is not clipped
  padEndMs: 150,   // kept after the last sound, so held sounds fade naturally
};

// Each frame's loudness (root mean square).
export function frameLoudness(samples, rate, frameMs = TRIM.frameMs) {
  const size = Math.max(1, Math.round((rate * frameMs) / 1000));
  const out = [];
  for (let i = 0; i < samples.length; i += size) {
    let sum = 0;
    const end = Math.min(samples.length, i + size);
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    out.push(Math.sqrt(sum / (end - i)));
  }
  return { size, frames: out };
}

// Where the speech is: { start, end } sample indexes (end exclusive), padded,
// or null when there is nothing but silence.
export function speechBounds(samples, rate, t = TRIM) {
  const { size, frames } = frameLoudness(samples, rate, t.frameMs);
  if (!frames.length) return null;
  const sorted = [...frames].sort((a, b) => a - b);
  const noise = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[sorted.length - 1];
  const threshold = Math.max(t.floor, noise * t.noiseTimes, peak * t.peakShare);
  const first = frames.findIndex((f) => f >= threshold);
  if (first < 0) return null;
  let last = frames.length - 1;
  while (frames[last] < threshold) last--;
  const start = Math.max(0, first * size - Math.round((rate * t.padStartMs) / 1000));
  const end = Math.min(samples.length, (last + 1) * size + Math.round((rate * t.padEndMs) / 1000));
  return { start, end };
}

// The clip without its silence at the start and end (null: nothing heard).
export function trimSilence(samples, rate, t = TRIM) {
  const b = speechBounds(samples, rate, t);
  return b ? samples.slice(b.start, b.end) : null;
}

export const LEVEL = {
  rms: 0.1,      // every clip is brought to about this loudness...
  peak: 0.89,    // ...with its loudest moment never above this (about -1 dB)
  maxGain: 20,   // a whisper is not blown up into hiss
  fadeMs: 8,     // a tiny fade in and out, so a clip never starts or ends with a click
};

// The clip at an even loudness: the same for every clip, so none is much
// louder than another.
export function evenVolume(samples, rate, l = LEVEL) {
  let peak = 0;
  let sum = 0;
  for (const s of samples) {
    peak = Math.max(peak, Math.abs(s));
    sum += s * s;
  }
  const out = Float32Array.from(samples);
  if (!peak) return out;
  const rms = Math.sqrt(sum / samples.length);
  const gain = Math.min(l.rms / rms, l.peak / peak, l.maxGain);
  const fade = Math.min(Math.floor(out.length / 2), Math.round((rate * l.fadeMs) / 1000));
  for (let i = 0; i < out.length; i++) {
    let g = gain;
    if (i < fade) g *= i / fade;
    else if (i >= out.length - fade) g *= (out.length - 1 - i) / fade;
    out[i] *= g;
  }
  return out;
}

// A decoded sound (its channels and rate) made ready to save: mono, 22.05 kHz,
// trimmed, evened out. null when it holds nothing but silence.
export function processClip(channels, rate) {
  const mono = resample(toMono(channels), rate, RATE);
  const trimmed = trimSilence(mono, RATE);
  return trimmed ? evenVolume(trimmed, RATE) : null;
}

export const durationOf = (samples, rate = RATE) => samples.length / rate;

// ---- WAV (16-bit PCM, mono) ----

export function encodeWav(samples, rate = RATE) {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const v = new DataView(bytes.buffer);
  const text = (at, s) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);  // fmt chunk size
  v.setUint16(20, 1, true);   // PCM
  v.setUint16(22, 1, true);   // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); // bytes per second
  v.setUint16(32, 2, true);   // bytes per sample
  v.setUint16(34, 16, true);  // bits per sample
  text(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), true);
  }
  return bytes;
}

// { rate, samples } from a 16-bit mono WAV made by encodeWav, or null.
export function decodeWav(bytes) {
  try {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const text = (at) => String.fromCharCode(...bytes.subarray(at, at + 4));
    if (text(0) !== 'RIFF' || text(8) !== 'WAVE' || v.getUint16(22, true) !== 1 || v.getUint16(34, true) !== 16) return null;
    const rate = v.getUint32(24, true);
    const n = Math.min(v.getUint32(40, true), bytes.byteLength - 44) >> 1;
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = v.getInt16(44 + i * 2, true);
      samples[i] = s < 0 ? s / 0x8000 : s / 0x7fff;
    }
    return { rate, samples };
  } catch {
    return null;
  }
}

// ---- import naming rule ----

// The clip id a sound file is for, from its name, or null when no clip has
// that id. The name without its ending (.mp3, .wav...) is the id: capitals do
// not matter, spaces and underscores count as hyphens, and a copy marker the
// computer adds (" (1)", " copy") is ignored. "Name_B.mp3" is for name-b.
export function idFromFileName(fileName, knownIds) {
  let base = String(fileName ?? '').split(/[\\/]/).pop();
  base = base.replace(/\.[a-z0-9]{1,5}$/i, '');
  base = base.replace(/\s*\(\d+\)\s*$/, '').replace(/[\s_-]+copy$/i, '');
  const id = base.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  const known = knownIds instanceof Set ? knownIds : new Set(knownIds);
  return id && known.has(id) ? id : null;
}

// ---- which clip is kept ----

export const SOURCES = ['recorded', 'imported'];

// A saved clip: { id, source, addedAt, duration, wav }.
export const makeClip = ({ id, source, samples, now = Date.now() }) => ({
  id, source, addedAt: now, duration: Math.round(durationOf(samples) * 100) / 100, wav: encodeWav(samples),
});

// A recorded and an imported clip for the same id: the one added last is kept.
export function newer(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return b.addedAt >= a.addedAt ? b : a;
}

// The clips in `incoming` merged into `current` (a Map by id), newest winning.
// Returns { clips, added, kept }: how many came in and won, and how many lost.
export function mergeClips(current, incoming) {
  const clips = new Map(current);
  let added = 0;
  let kept = 0;
  for (const c of incoming) {
    const win = newer(clips.get(c.id), c);
    if (win === c) { clips.set(c.id, c); added++; } else kept++;
  }
  return { clips, added, kept };
}

// ---- backup file ----
// One binary file: the 8 bytes "TDVOICE1", a 4-byte length, a JSON list of the
// clips (id, source, addedAt, duration, byte length), then every clip's WAV
// bytes one after another. Raw bytes keep it small (no text encoding).

const MAGIC = 'TDVOICE1';
export const BACKUP_EXT = '.tdvoice';
const ID_OK = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function packBackup(clips, now = new Date()) {
  const list = [...clips].filter((c) => c?.wav?.byteLength);
  const header = new TextEncoder().encode(JSON.stringify({
    app: 'trace-discover', kind: 'voice-pack', version: 1, rate: RATE, made: now.toISOString(),
    clips: list.map((c) => ({ id: c.id, source: c.source, addedAt: c.addedAt, duration: c.duration, bytes: c.wav.byteLength })),
  }));
  const total = 12 + header.length + list.reduce((n, c) => n + c.wav.byteLength, 0);
  const out = new Uint8Array(total);
  out.set(new TextEncoder().encode(MAGIC), 0);
  new DataView(out.buffer).setUint32(8, header.length, true);
  out.set(header, 12);
  let at = 12 + header.length;
  for (const c of list) {
    out.set(new Uint8Array(c.wav.buffer ?? c.wav, c.wav.byteOffset ?? 0, c.wav.byteLength), at);
    at += c.wav.byteLength;
  }
  return out;
}

// The clips in a backup file, or null when it is not a voice-pack backup.
// Clips with a bad id, source or sound are left out.
export function unpackBackup(bytes) {
  try {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (new TextDecoder().decode(b.subarray(0, 8)) !== MAGIC) return null;
    const len = new DataView(b.buffer, b.byteOffset).getUint32(8, true);
    const header = JSON.parse(new TextDecoder().decode(b.subarray(12, 12 + len)));
    if (header?.kind !== 'voice-pack' || !Array.isArray(header.clips)) return null;
    const clips = [];
    let at = 12 + len;
    for (const c of header.clips) {
      const n = Number(c?.bytes);
      if (!Number.isInteger(n) || n < 0 || at + n > b.length) return null;
      const wav = b.slice(at, at + n);
      at += n;
      if (!ID_OK.test(String(c.id)) || !SOURCES.includes(c.source) || !decodeWav(wav)) continue;
      clips.push({ id: c.id, source: c.source, addedAt: Number(c.addedAt) || 0, duration: Number(c.duration) || 0, wav });
    }
    return clips;
  } catch {
    return null;
  }
}

// ---- export script ----

// The script as plain text for an AI voice tool: one "id | words" line per
// clip, grouped by category. Private lines (her name) are left out.
export function exportScript(script, categories) {
  const lines = [
    '# Trace & Discover voice script. One clip per line: id | words.',
    '# Save each clip as a sound file named by its id, for example name-b.mp3, then import it on voice.html.',
  ];
  for (const cat of categories) {
    const clips = script.filter((c) => c.category === cat.id && !c.private);
    if (!clips.length) continue;
    lines.push('', `# ${cat.title}`);
    for (const c of clips) lines.push(`${c.id} | ${c.words}`);
  }
  return `${lines.join('\n')}\n`;
}

// The words to show for a clip: a private line with her name filled in
// (or "her name" when none is set on the setup page).
export const wordsFor = (clip, name) => (clip.private ? clip.words.replaceAll('{name}', name || '[her name]') : clip.words);

// A clip's state on voice.html: 'recorded', 'imported' or 'missing'.
export const clipState = (saved) => (saved && SOURCES.includes(saved.source) ? saved.source : 'missing');

// Counts for the page: { done, total } over the clips shown.
export const progress = (script, saved) => ({ done: script.filter((c) => saved.has(c.id)).length, total: script.length });
