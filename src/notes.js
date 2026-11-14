// notes.js — pure functions only. No DOM, no storage, no audio.
// Slice 5J: the short parent-facing lines, shown in small type at the top of
// the writing screen beside the visual reaction. She does not need to read
// them: everything she needs is still shown by Jugnu and the pictures. They
// tell a grown-up watching what the app saw. Never a diagnostic word.

// The tracing rounds (1 and 2): one line per scoreStroke reason.
// A stroke too short to count gets no line.
export const TRACE_NOTES = {
  'wrong-start': 'Start at the glowing dot.',
  'wrong-direction': 'Go the other way. Watch Jugnu.',
  'off-path': 'Stay on the track.',
  // Slice 5J part 2: a stroke traced the other way counts; after the letter Jugnu shows the usual way.
  reversed: 'That counts! Here is the usual way.',
  // Slice 9A: a tap that missed the dot of i or j.
  'off-target': 'Tap right on the dot.',
};

export const traceNote = (reason) => TRACE_NOTES[reason] ?? null;

// The copy-it round: one line per judged result (src/copy.js scoreCopy).
export const COPY_NOTES = {
  'no-letter': "Let's watch Jugnu write it.",
  unrecognized: "Let's watch Jugnu write it.",
  'too-small': 'Make it bigger.',
  'too-big': 'Make it a little smaller.',
  mirrored: 'It faces the other way. Watch Jugnu.',
  'usual-way': 'Well done! Here is the usual way.',
};

// "Almost! The bar is missing." / "Almost! That looks like R."
const plural = (part) => / and /.test(part) || /s$/.test(part);
const missingLine = (part) => `Almost! The ${part} ${plural(part) ? 'are' : 'is'} missing.`;
const looksLine = (id) => `Almost! That looks like ${id}.`;

// The line for a judged copy, or null for a usual pass (nothing to say).
// A failed copy always has a line.
export function copyNote(result) {
  if (result.ok) {
    if (result.mirrored) return COPY_NOTES.mirrored;
    return result.habits?.usual === false ? COPY_NOTES['usual-way'] : null;
  }
  const part = result.missing?.part;
  if (result.reason === 'looks-like') return part ? missingLine(part) : looksLine(result.lookalike);
  if (result.reason === 'missing-stroke') return part ? missingLine(part) : 'Almost! A line is missing.';
  return COPY_NOTES[result.reason] ?? "Let's watch Jugnu write it.";
}

// The games book (Slice 5J part 2): one short instruction line per kind of
// game, in small grey type at the top while she plays. For a grown-up watching.
export const GAME_NOTES = {
  match: 'Draw a line to its partner',
  path: 'Trace each road home',
  sort: 'Drag each thing into its basket',
  odd: 'Tap the one that is different',
  missing: 'Drag each piece into its gap',
};

export const gameNote = (kind) => GAME_NOTES[kind] ?? null;
