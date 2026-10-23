# Trace & Discover — instructions for Claude Code

## What this is
A handwriting-practice app for one 4-year-old girl, right-handed, on a Samsung Galaxy Tab A9+ or A11+ (11 inch, landscape, Android, Chrome).
She traces English capital letters, numbers and Urdu letters with a firefly companion called Jugnu.
Full product spec: `docs/spec.md`. Phase 1 scope: `02-scope.md`. Build order: `09-build-sequence.md`.

## Stack (fixed — do not change without asking)
- Plain HTML, CSS and vanilla JavaScript ES modules. No frameworks, no bundler, no runtime npm packages.
- Guide lines and letter tracks: SVG. Her ink: one `<canvas>` layered on top.
- Settings and progress: `localStorage`. Audio clips only: IndexedDB.
- Tests: Node's built-in runner: `npm test`. No test libraries.
- Hosting: GitHub Pages (HTTPS). Installed on the tablet from Chrome as a home-screen web app (PWA).

## Device facts (verified — design around them)
- Neither tablet supports the S Pen. Input is a finger, or a thick-tipped capacitive stylus that the browser reports as an ordinary touch. Never branch on `pointerType === 'pen'`.
- No palm rejection. The app must follow only the first pointer that goes down inside the writing area and ignore every other pointer until that one lifts.
- Landscape only. Use the CSS viewport the tablet reports (Slice 0 measures it). Never hard-code 1920x1200: those are physical pixels.

## Coordinates and character files
- Characters are stored in line units: y = 0 sky line, 0.5 fence (dashed), 1 grass line, 1.3 ground line. x = 0 at the left edge of the character box.
- At render time, 1 unit = pixel distance from sky line to grass line.
- One file per character: `data/chars/<id>.json`. Format: see `data/chars/L.example.json`.
- `strokes` are in the order she must draw them. `kind` is `line` (a path) or `dot` (a single target point, for Urdu nuqtas and the dot on i or j).
- Urdu strokes run right to left. The body comes first, then dots.
- Character files come from `recorder.html` (Slice 3). Do not hand-edit their points.

## Scoring (src/geometry.js — written and tested; extend it, never rewrite it)
- `scoreStroke(child, ref, stage)` checks direction, then shape, then start. Returns `ok` and `reason`: `too-short`, `wrong-direction`, `off-path` or `wrong-start`.
- `scoreDot(child, refPoint, stage)` checks a dot tap.
- `createLiveTracker(ref, stage)` gives live `onPath`, `wrongWay` and `progress` while her finger moves.
- Strokes must be drawn in order. Stroke k is always compared with reference stroke k.
- Thresholds live in `DEFAULTS.stages`. Do not change them unless I ask.
- Run `npm test` after any change to `src/geometry.js`.

## Child-screen rules (every screen she sees)
- No text. All prompts are audio. An ear button replays the last prompt.
- At most 3 choices on a screen. Child touch targets at least 88 CSS px.
- Never red, never a buzzer, never erase her whole letter, never snap her ink onto the path.
- Wrong direction: the glow stops and Jugnu flies the correct way once. Off path: the trail dims and she carries on. Wrong start: the start dot pulses.
- Ink must follow her finger with no visible lag. Draw inside `requestAnimationFrame` and use `getCoalescedEvents()` when the browser offers it.
- Kid-proofing: `touch-action: none` on the writing area; `overscroll-behavior: none` on `html` and `body` (stops pull-to-refresh); block the context menu and text selection.
- Jugnu and buttons sit on the left side of the screen, away from her right hand.

## Privacy and safety
- No network calls at runtime once installed. No analytics, no ads, no third-party scripts.
- Fonts (Baloo 2, Noto Naskh Arabic) are downloaded once into `assets/fonts/` and served locally.
- No AI and no API keys anywhere in this project.

## How to work with me (slice discipline)
- Build one slice at a time from `09-build-sequence.md`. Never start the next slice on your own.
- Before writing code: restate the slice goal, list the files you will create or change, and wait for my OK.
- Keep one module per concern: `input.js`, `render.js`, `game.js`, `session.js`, `storage.js`, `audio.js` in `src/`.
- When the slice is done: run `npm test`, then give me a numbered list of what to check on the tablet.
- At the end of each slice, open a pull request. I merge it on GitHub.
- If you think something outside the slice is needed, write it in `docs/ideas.md` instead of building it.
- I am new to coding. Explain git, GitHub and terminal steps in plain words, one step at a time.
