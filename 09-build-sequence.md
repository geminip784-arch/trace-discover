# Build sequence — Phase 1

Build in this order. One slice per Claude Code session. Do not start a slice until the previous one passes its checks on the tablet and is committed.

Effort per slice is my estimate for a beginner working with Claude Code: roughly one to three evenings each.

While you build Slices 0 to 2, let her use LetterSchool's free version for a week (Phase 0). Note anything she loves or hates; it may change Slice 4.

---

## Slice 0 — Skeleton on the tablet
**Prompt:**
> Read CLAUDE.md. Build Slice 0 only: an index.html that fills the screen in landscape and shows, in large text, the viewport width, height and devicePixelRatio. Then walk me through publishing this folder to GitHub Pages step by step, assuming I have never used git.

**Done when:**
- [ ] The page opens on her tablet from a GitHub Pages https link
- [ ] You have added the measured viewport size to the Device facts section of CLAUDE.md
- [ ] First commit pushed

## Slice 1 — Ink that follows her finger
**Prompt:**
> Build Slice 1 only: a writing area with the four colored lines (sky blue, dashed fence, grass green, ground brown) and a glowing yellow ink trail on a canvas. Follow every rule in CLAUDE.md's Child-screen rules, especially single-pointer tracking and no lag. No scoring yet.

**Done when:**
- [ ] The trail keeps up with fast finger movement, with no visible gap
- [ ] Resting her palm or a second finger while drawing leaves no marks
- [ ] The page never scrolls, zooms or pull-to-refreshes, and long-press shows no menu

## Slice 2 — Scoring wired in (debug view)
**Prompt:**
> Run npm test. Then build Slice 2 only: draw the track for data/chars/L.example.json on the lines, score each stroke with src/geometry.js, and show the score result in a debug panel that appears only when the URL ends with ?debug=1.

**Done when:**
- [ ] `npm test` passes
- [ ] A neat L shows ok for both strokes in the debug panel
- [ ] Drawing the stem bottom-up shows wrong-direction; starting halfway down shows wrong-start
- [ ] Without ?debug=1 nothing extra is visible

## Slice 3 — Stroke recorder (your tool)
Settle the letter style and Urdu model first (see 02-scope.md).

**Prompt:**
> Build Slice 3 only: recorder.html, a parent tool. It shows a character faintly in the bundled font on the four lines. I trace each stroke slowly in the correct order; it smooths the stroke, converts it to line units, and lets me undo the last stroke, mark a stroke as a dot, and set the writing direction. A Copy JSON button copies the finished character file so I can paste it back to you to save in data/chars/.

**Done when:**
- [ ] All 14 Phase 1 characters are recorded and saved in data/chars/
- [ ] Each one replays correctly in the Slice 2 debug view when you trace it yourself

## Slice 4 — The tracing game for one character
**Prompt:**
> Build Slice 4 only: the three stages (dots, ghost, alone) for any character in data/chars/, with Jugnu from assets/jugnu.svg, start dots, arrows, and the feedback rules in CLAUDE.md. Use browser speech as a placeholder voice. Path width narrows by stage as set in DEFAULTS.stages.

**Done when:**
- [ ] L, ب and 7 each play from Stage 1 to Stage 3
- [ ] Wrong direction: glow stops and Jugnu shows the way; no red, no buzzer
- [ ] She plays one character for 5 minutes and wants another go (watch her; don't help)

## Slice 5 — Session, map, reward, sticker book
**Prompt:**
> Build Slice 5 only: the daily session flow from docs/spec.md (simplified per 02-scope.md), the map with three islands, the letter-comes-alive reward, the sticker book with sketch, color and gold-star stages, and progress saved in localStorage. The daily limit ends the session with Jugnu's goodnight.

**Done when:**
- [ ] A full session runs start to goodnight without you touching anything
- [ ] Closing and reopening the app keeps her stickers and progress
- [ ] When the daily limit is reached, the session ends kindly and the map stays dim

## Slice 6 — Family voices
**Prompt:**
> Build Slice 6 only: a voice recorder in the parent zone for her name, three praise lines, and each Phase 1 character's name and sound. Store clips in IndexedDB. Play them in the game, falling back to browser speech when a clip is missing.

**Done when:**
- [ ] Jugnu greets her by name in your voice
- [ ] Clips still play with Wi-Fi off

## Slice 7 — Install, offline, kid-lock
**Prompt:**
> Build Slice 7 only: a web app manifest (full screen, landscape, icons), a service worker that caches every file for offline use, and a safe update flow. Then give me plain steps to install it on the tablet from Chrome and to pin the app on Android so she cannot leave it.

**Done when:**
- [ ] It opens full screen from a home-screen icon
- [ ] It works in airplane mode
- [ ] With the app pinned, she cannot get out without you

## Slice 8 — Parent zone v1
**Prompt:**
> Build Slice 8 only: the parent gate (press and hold 3 seconds, then a simple sum), daily limit setting, last-attempt replay for each character, the practice-more list, and a reset. Log every attempt (character, stage, start ok, direction ok, shape error, date) so we can compare weeks.

**Done when:**
- [ ] You can replay exactly how she wrote her last mistake on any character
- [ ] The log shows her wrong-start count per week

---

## Then: the 2-week trial (Gate 2)
Let her use it daily within the limit. Phase 2 is worth building only if all three hold:
1. She asks to play on most days without being prompted.
2. Her wrong starts on the Phase 1 characters drop from week 1 to week 2 (from the attempt log).
3. The ink never lags or misses her finger.
