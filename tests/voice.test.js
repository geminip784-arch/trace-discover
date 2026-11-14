// Slice 6A: the voice pack's pure parts (src/voice.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RATE, toMono, resample, speechBounds, trimSilence, evenVolume, processClip, LEVEL,
  encodeWav, decodeWav, idFromFileName, newer, mergeClips, makeClip, packBackup, unpackBackup,
  clipState, progress,
} from '../src/voice.js';
import { SCRIPT_IDS, SCRIPT } from '../data/voice-script.js';

// Sample data: silence (with a little room noise), a tone, silence.
function sample({ rate = 48000, before = 0.5, tone = 0.4, after = 0.7, amp = 0.3, noise = 0.001 } = {}) {
  const n = Math.round(rate * (before + tone + after));
  const s = new Float32Array(n);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    s[i] = noise * rand() + (t >= before && t < before + tone ? amp * Math.sin(2 * Math.PI * 220 * t) : 0);
  }
  return s;
}
const rms = (s) => Math.sqrt(s.reduce((a, x) => a + x * x, 0) / s.length);
const peak = (s) => s.reduce((a, x) => Math.max(a, Math.abs(x)), 0);

test('silence at the start and end is trimmed, keeping a little padding', () => {
  const rate = 22050;
  const s = sample({ rate });
  const b = speechBounds(s, rate);
  assert.ok(b);
  const startS = b.start / rate;
  const endS = b.end / rate;
  assert.ok(startS > 0.4 && startS < 0.5, `starts at ${startS}`);   // 0.5 s minus about 60 ms
  assert.ok(endS > 0.9 && endS < 1.1, `ends at ${endS}`);           // 0.9 s plus about 150 ms
  const t = trimSilence(s, rate);
  assert.equal(t.length, b.end - b.start);
});

test('a quiet held sound is kept, not trimmed away', () => {
  const rate = 22050;
  const s = sample({ rate, amp: 0.02, tone: 1 });
  const t = trimSilence(s, rate);
  assert.ok(t.length / rate > 1, `${t.length / rate} s`);
});

test('nothing but silence gives null', () => {
  assert.equal(trimSilence(new Float32Array(22050), 22050), null);
  assert.equal(trimSilence(sample({ rate: 22050, amp: 0 }), 22050), null);
  assert.equal(processClip([new Float32Array(4800)], 48000), null);
});

test('the volume is evened out: loud and soft clips end up alike, never clipping', () => {
  const loud = evenVolume(sample({ rate: RATE, before: 0, after: 0, amp: 0.9 }), RATE);
  const soft = evenVolume(sample({ rate: RATE, before: 0, after: 0, amp: 0.05 }), RATE);
  assert.ok(Math.abs(rms(loud) - rms(soft)) < 0.01, `${rms(loud)} vs ${rms(soft)}`);
  assert.ok(peak(loud) <= LEVEL.peak + 1e-6);
  assert.ok(peak(soft) <= LEVEL.peak + 1e-6);
  assert.equal(Math.abs(loud[0]), 0); // faded in, no click
});

test('a whisper is not blown up past the gain limit', () => {
  const s = sample({ rate: RATE, before: 0, after: 0, amp: 0.001, noise: 0 });
  const out = evenVolume(s, RATE);
  assert.ok(peak(out) <= 0.001 * LEVEL.maxGain + 1e-6);
});

test('two channels become one, and the rate becomes 22.05 kHz', () => {
  const m = toMono([new Float32Array([1, 0.5]), new Float32Array([0, 0.5])]);
  assert.deepEqual([...m], [0.5, 0.5]);
  const s = sample({ rate: 48000, before: 0, after: 0, tone: 1 });
  const r = resample(s, 48000, RATE);
  assert.equal(r.length, Math.floor(48000 / (48000 / RATE)));
  assert.ok(Math.abs(rms(r) - rms(s)) < 0.01);
  const up = resample(new Float32Array([0, 1]), 11025, 22050);
  assert.deepEqual([...up], [0, 0.5, 1, 1]);
});

test('processClip: mono, 22.05 kHz, trimmed and evened out', () => {
  const left = sample({ rate: 44100 });
  const out = processClip([left, left], 44100);
  const secs = out.length / RATE;
  assert.ok(secs > 0.5 && secs < 0.7, `${secs} s`);
  assert.ok(Math.abs(rms(out) - LEVEL.rms) < 0.02);
});

test('WAV: 22.05 kHz, mono, 16-bit, and back again', () => {
  const s = Float32Array.from([0, 0.5, -0.5, 1, -1, 0.25]);
  const wav = encodeWav(s);
  assert.equal(wav.byteLength, 44 + s.length * 2);
  const v = new DataView(wav.buffer);
  assert.equal(String.fromCharCode(...wav.subarray(0, 4)), 'RIFF');
  assert.equal(v.getUint16(22, true), 1);
  assert.equal(v.getUint32(24, true), 22050);
  assert.equal(v.getUint16(34, true), 16);
  const back = decodeWav(wav);
  assert.equal(back.rate, RATE);
  back.samples.forEach((x, i) => assert.ok(Math.abs(x - s[i]) < 1e-4));
  assert.equal(decodeWav(new Uint8Array(10)), null);
});

test('import naming rule: the file name is the clip id', () => {
  const ids = SCRIPT_IDS;
  assert.equal(idFromFileName('name-b.mp3', ids), 'name-b');
  assert.equal(idFromFileName('Name_B.MP3', ids), 'name-b');
  assert.equal(idFromFileName('sound b.wav', ids), 'sound-b');
  assert.equal(idFromFileName('find-ice-cream (1).m4a', ids), 'find-ice-cream');
  assert.equal(idFromFileName('jugnu-greeting copy.ogg', ids), 'jugnu-greeting');
  assert.equal(idFromFileName('Downloads/voices/number-7.wav', ids), 'number-7');
  assert.equal(idFromFileName('NOTE-OFF-PATH.webm', ids), 'note-off-path');
  assert.equal(idFromFileName('name-b', ids), 'name-b');
  assert.equal(idFromFileName('banana.mp3', ids), null);      // no clip called "banana"
  assert.equal(idFromFileName('find-banana-2.mp3', ids), null);
  assert.equal(idFromFileName('', ids), null);
  assert.equal(idFromFileName('.mp3', ids), null);
});

test('recorded and imported clips for the same id: the one added last is kept', () => {
  const rec = { id: 'name-b', source: 'recorded', addedAt: 100 };
  const imp = { id: 'name-b', source: 'imported', addedAt: 200 };
  assert.equal(newer(rec, imp), imp);
  assert.equal(newer(imp, rec), imp);
  assert.equal(newer(null, rec), rec);
  const { clips, added, kept } = mergeClips(new Map([['name-b', imp]]), [rec, { id: 'name-c', source: 'recorded', addedAt: 50 }]);
  assert.equal(clips.get('name-b'), imp);
  assert.equal(clips.get('name-c').source, 'recorded');
  assert.equal(added, 1);
  assert.equal(kept, 1);
  assert.equal(clipState(imp), 'imported');
  assert.equal(clipState(rec), 'recorded');
  assert.equal(clipState(undefined), 'missing');
});

test('backup and restore: every clip comes back exactly', () => {
  const clips = [
    makeClip({ id: 'name-b', source: 'recorded', samples: sample({ rate: RATE, before: 0, after: 0, tone: 0.2 }), now: 111 }),
    makeClip({ id: 'jugnu-greeting-name', source: 'recorded', samples: Float32Array.from([0, 0.1, -0.1]), now: 222 }),
    makeClip({ id: 'find-apple', source: 'imported', samples: Float32Array.from([0.3, -0.3]), now: 333 }),
  ];
  const file = packBackup(clips, new Date('2026-11-13T10:00:00Z'));
  assert.equal(new TextDecoder().decode(file.subarray(0, 8)), 'TDVOICE1');
  const back = unpackBackup(file);
  assert.equal(back.length, 3);
  back.forEach((c, i) => {
    assert.equal(c.id, clips[i].id);
    assert.equal(c.source, clips[i].source);
    assert.equal(c.addedAt, clips[i].addedAt);
    assert.equal(c.duration, clips[i].duration);
    assert.deepEqual([...c.wav], [...clips[i].wav]);
  });
  // Small: only the sound bytes plus a short list.
  const sound = clips.reduce((n, c) => n + c.wav.byteLength, 0);
  assert.ok(file.byteLength < sound + 1000);
  // The backup never holds her name: only clip ids and sounds.
  assert.ok(!new TextDecoder().decode(file).includes('{name}'));
});

test('restore accepts IndexedDB ArrayBuffers and rejects anything else', () => {
  const c = makeClip({ id: 'name-a', source: 'recorded', samples: Float32Array.from([0.2, 0.1]), now: 5 });
  const file = packBackup([{ ...c, wav: c.wav.slice().buffer }]);
  assert.equal(unpackBackup(file.buffer)[0].id, 'name-a');
  assert.equal(unpackBackup(new TextEncoder().encode('hello there, not a pack')), null);
  assert.equal(unpackBackup(new Uint8Array(0)), null);
  assert.equal(unpackBackup(file.subarray(0, file.length - 3)), null); // cut short
});

test('restore leaves out clips with a bad id, source or sound', () => {
  const good = makeClip({ id: 'name-a', source: 'recorded', samples: Float32Array.from([0.2]), now: 1 });
  const file = packBackup([
    good,
    { ...good, id: '../evil' },
    { ...good, id: 'name-c', source: 'downloaded' },
    { ...good, id: 'name-d', wav: new Uint8Array([1, 2, 3, 4]) },
  ]);
  assert.deepEqual(unpackBackup(file).map((c) => c.id), ['name-a']);
});

test('restoring merges with the tablet: newer clips already there are kept', () => {
  const old = makeClip({ id: 'name-a', source: 'imported', samples: Float32Array.from([0.2]), now: 10 });
  const fresh = makeClip({ id: 'name-a', source: 'recorded', samples: Float32Array.from([0.4]), now: 20 });
  const restored = unpackBackup(packBackup([old]));
  const { clips, kept } = mergeClips(new Map([['name-a', fresh]]), restored);
  assert.equal(clips.get('name-a'), fresh);
  assert.equal(kept, 1);
});

test('progress counts saved clips out of the script', () => {
  const saved = new Map([['name-a', {}], ['name-b', {}], ['not-in-script', {}]]);
  assert.deepEqual(progress(SCRIPT, saved), { done: 2, total: SCRIPT.length });
});
