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
  // Slice 9A: a lowercase letter not where it belongs on the lines.
  'position-tail': 'Let the tail go below the grass.',
  'position-tall': 'Make the stick reach up high.',
  'position-small': 'Keep it between the fence and the grass.',
};

// "Almost! The bar is missing." / "Almost! That looks like R."
// A number's part (Slice 9B) is named with its digit: "the bumps of the 3 are missing".
const plural = (part) => { const own = part.split(' of the ')[0]; return / and /.test(own) || /s$/.test(own); };
const missingLine = (part) => `Almost! The ${part} ${plural(part) ? 'are' : 'is'} missing.`;
const looksLine = (id) => `Almost! That looks like ${id}.`;
const firstLine = (id) => `Almost! The ${id} comes first.`;

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
  // Numbers 10 to 20 (Slice 9B): "Almost! The 7 is missing." / "Almost! The 1 comes first."
  if (result.reason === 'missing-digit') return part ? missingLine(part) : 'Almost! A number is missing.';
  if (result.reason === 'swapped-digits') return firstLine(result.first);
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

// Her name's book (Slice 9C): one grey line on the name page when there is no
// name to write yet (src/name.js nameOf reasons, and 'too-long'). For a grown-up.
export const NAME_NOTES = {
  none: 'Add her name on the setup page (index.html?setup=1).',
  unsupported: 'Her name can use the letters a to z only. See the setup page.',
  'too-long': 'Her name is too long for one line. See the setup page.',
};
export const nameNote = (reason) => NAME_NOTES[reason] ?? null;

// Her name's copy-it round (Slice 9C part 2): the line names the letter, and
// that letter glows on the model card. `result` is src/name-copy.js scoreName's;
// `ids` her name's letters. null for a usual pass.
export function nameCopyNote(result, ids) {
  if (result.ok) {
    if (result.mirrored) return COPY_NOTES.mirrored;
    return result.habits?.usual === false ? COPY_NOTES['usual-way'] : null;
  }
  const id = ids[result.letter];
  const part = result.letters?.[result.letter]?.part;
  switch (result.reason) {
    case 'unfinished': return 'Here is the next letter.';
    case 'missing-letter': return missingLine(id);
    case 'looks-like': return part ? missingLine(`${part} of the ${id}`) : looksLine(result.lookalike);
    case 'missing-stroke': return part ? missingLine(`${part} of the ${id}`) : `Almost! A line of the ${id} is missing.`;
    case 'wrong-case': return /^[a-z]$/.test(id) ? `Almost! The ${id} is a small letter.` : `Almost! The ${id} is a capital letter.`;
    case 'too-small': return `Make the ${id} bigger.`;
    case 'too-big': return `Make the ${id} a little smaller.`;
    case 'position-tail': return `Let the tail of the ${id} go below the grass.`;
    case 'position-tall': return `Make the ${id} reach up high.`;
    case 'position-small': return `Keep the ${id} between the fence and the grass.`;
    case 'unrecognized': return `Let's watch Jugnu write the ${id}.`;
    default: return "Let's watch Jugnu write it.";
  }
}
