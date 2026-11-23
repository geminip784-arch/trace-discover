// undo.js — pure functions only. No DOM, no storage, no audio.
// Slice 5O part 1: undo one stroke, on every writing screen (tracing rounds 1
// and 2, the copy round in reviews, the letter and name practice pages, and her
// name's rounds). A big picture-only button in the left column; each tap takes
// away her last stroke and anything it scored.
//
// What a screen keeps for undo is a list (last in, first out) of her strokes
// still on the lines that may be taken back:
//   { kind: 'trace', id, snap }  a tracing stroke that counted; `snap` is what
//                                 the screen looked like before it (progress,
//                                 stroke plans...), put back as it was
//   { kind: 'copy', id }          a stroke of a copy (her letter or name on her own)
// `id` is the stroke's ink id (render.js createInk).
//
// What never goes on the list, so an undo never reaches it:
//   - a tracing stroke that did not count: it fades by itself and changed nothing;
//   - anything finished: a round, a letter of her name that lit gold, a practice
//     space, a judged copy; and any stroke Jugnu drew for her (the list is
//     emptied whenever one of those happens).
// Undo is disabled while there is nothing to take back, while her finger is
// down, while Jugnu demonstrates, a reason shows or a reward plays, and while
// the tablet is upright. In a copy, an undo also cancels the judging wait:
// nothing is judged again until her next stroke.
// Every undo adds an `undo` entry to the attempt log. The entry of the stroke it
// took back stays in the log, so a replay shows what she really did.

export const EMPTY_UNDO = Object.freeze([]);

// The list with `entry` added on top.
export const pushUndo = (list, entry) => [...list, entry];

// The top entry and the list without it ({ entry: null, list } when empty).
export function popUndo(list) {
  if (list.length === 0) return { entry: null, list };
  return { entry: list[list.length - 1], list: list.slice(0, -1) };
}

// May she undo now? phase: the screen's phase ('trace' | 'held' | 'done');
// drawing: her finger is down; demoing: Jugnu is flying a stroke;
// paused: the tablet is upright; alive: the screen has not been left.
export function canUndo({ list, phase, drawing = false, demoing = false, paused = false, alive = true }) {
  return alive && !paused && phase === 'trace' && !drawing && !demoing && list.length > 0;
}

// One attempt-log entry for an undo.
//   char   the character the stroke belonged to (for her name: that letter's id)
//   mode   'trace' (rounds 1 and 2, practice space 1, name practice screen 1)
//          or 'copy' (her letter or name on her own)
//   stroke its place among her strokes still on the undo list (0: the first);
//          that is also how many of them this undo leaves
//   extra  where it was: { in: 'practice' | 'name', of, review, round, stage, letter, page, space }
export function undoLogEntry({ char, mode, stroke, extra = {}, now = new Date() }) {
  return { type: 'undo', time: now.toISOString(), char, mode, stroke, ...extra };
}
