# Ideas parked for later

Claude Code adds ideas here instead of building them mid-slice. Each idea is tagged with the slice it belongs to (see `09-build-sequence.md`), or **[later]** when it is not on the roadmap yet. Done items stay for the record, marked ✅.

- **[10]** Dot strokes (`kind: "dot"`, Urdu nuqtas and the dot on i/j) are not scored yet: Slice 2 only uses `scoreStroke`. Wire in `scoreDot` for them (Slice 9A needs it too, for i and j).
- **[5I]** Stage 2 "path narrows a little after each success" (spec v2, Tracing engine). Slice 4A keeps the fixed `DEFAULTS.stages` widths.
- **[6]** Browser speech needs one touch on the page before Chrome lets it talk, so the very first "Start here!" after a reload may be silent. Recorded clips have the same rule for audio. The front door tap already covers it on the first visit of the day; check later visits.
- **[6]** Slice 5A hides the ear button: with speech switched off (`SPEECH_ON = false` in `src/audio.js`) there is no prompt to replay. Bring it back with the recorded prompts.
- **[6]** The setup page's "Test voice" button is silent while speech is off.
- **[10]** Urdu tiles use the tablet's own Urdu font. Noto Naskh Arabic (named in CLAUDE.md) is not in `assets/fonts/` yet.
- **[10]** `recorder.html` cannot record Urdu yet. It needs the ASCII ids from `src/session.js` (`ur-alif-madd`, `ur-be`, ...), the right-to-left direction, and a `"letter"` field in the file it exports. Then add each new id to `data/chars/index.json`.
- ✅ **[5G]** Slice 5B's practice rounds replaced `CONFIG.lastStage`, `lettersPerStage`, `maxAssistedInRow`, `dropStage` and `completeLetter` in `src/progress.js`. Removed in 5G.
- **[7]** The Android back button leaves the app; app pinning comes in Slice 7.
- ✅ **[5G]** CLAUDE.md's module list now names every module, `screens.js`, `art.js` and `music.js` included.
- **[5I]** Round 3's track (5% opacity) is very faint on the white board. Check on the tablet whether she can still see it, before changing anything (Slice 5I redesigns round 3 as a copy-it round).
- **[8]** mockup4 also lets a parent set the rounds from the address (`?rounds=5`). Slice 5B keeps the number in one setting (`ROUNDS` in `src/progress.js`); a parent-zone control could set it.
- **[later]** The headless ink-offset check (Playwright, both orientations, devicePixelRatio 1.5) could live in the repo as a script, so every slice can re-run it the same way.

## Slice 5C: objects each room still needs

✅ **[5G]** Superseded by Slice 5G's sound-first word list and its object-to-place table (`finds.html`). Kept for reference: the table below was the 5C wish list, and several of its words (hot dog, ice cube, eclair) do not start with the letter's sound.

So every room has 3 of its own objects for each recorded letter (E F H I L T),
these are the words still missing. Each is one plain word (or two), always
said the same way, and starts with its letter. A word in more than one room
needs only one picture: give it each room. "teddy" is already drawn in
docs/mockups/mockup4.html (`ART.teddy`); "elephant" is already in
data/finds.js and only needs the living room added.

| Room | E | F | H | I | L | T |
|---|---|---|---|---|---|---|
| Kitchen (has egg; fan, fork; honey; ice cream; lemon, lunchbox; tomato) | eggplant, eclair | fish | hot dog, hamburger | ice cube, ice lolly | lollipop | teapot, toaster |
| Study room (has eraser; flag; heart; ink; lamp, lunchbox; tiger) | envelope, easel | folder, feather | headphones, hourglass | ink pad, igloo | laptop | tape, telescope |
| Living room (has fan; hat, heart; insect; lamp; toys) | elephant, envelope, easel | football, frame | headphones | igloo, iron | lion, lollipop | teddy, train |
| Bedroom (has elephant; frock; hat; insect; lamp; toys, tiger) | earmuffs, envelope | feather, flip flops | hairbrush, hanger | igloo, ice skates | lion, locket | teddy |

Words to keep away from, because they would clash with an object already in
the library: ladybird or ladybug (the insect is drawn as one), flowers (a
counting thing), fairy (Jugnu is the only character).

## Slice 5C: other follow-ups

- **[5H]** The number scene has no 10-second hint. If she waits a long time, the group of n could wiggle once, as the letter objects do.
- ✅ **[5G]** Letter scenes for letters with fewer than 3 objects in the library were skipped. Slice 5G gives every letter but U and X a scene.
- **[later]** The shelf of finds shows up to the newest 24. Older finds are kept (up to 500) but not shown; a second shelf could show them.
- **[8]** `index.html?scene=E` opens a scene straight away. It was added for the headless checks; it could also serve a parent zone.

## Parked: how find scenes choose objects (after Slice 5C)

✅ **[5G]** Slice 5G set the scene rule: the place with the most of the letter's pictures, everything it can from that place, then portable things before animals.

## Slice 5D: follow-ups

- ✅ **[5F]** Follow the path, set 2: furniture to rooms. Built in Slice 5F (`path-rooms`).
- ✅ **[5H]** Numbers to things now uses counts from 1 to 9, in rows of five.
- **[7]** In headless Chrome, a fast drag that ends while the finger is still moving starts a "fling"; a tap on the home or back button during that fling (about the next second) only stops the fling and does not press the button. It may not happen on the tablet (the writing area and games board are `touch-action: none`). If it does, the buttons could act on `pointerup` instead of `click`.
- ✅ **[5H]** A plain tap on a card (no drag) now only makes it wiggle: it is not a try and is not logged.

## Slice 5E: follow-ups

- **[later]** Let her keep a free drawing or a colored picture on her shelf of finds (the toy box). The strokes are already in board units, so a drawing could be saved as its list of strokes and shown small on a plank.
- ✅ **[5F]** Car and building is drawn building first, so the car is drawn beside the finished building.

## Eraser (after Slice 5E): follow-ups

- **[later]** The coloring step after a dot picture has the eraser but no clear-all: the crayon row has room for only one button, and there it is the tick. If she wants to start her coloring over, a clear-all could go at the top right of the board, with the same press-and-hold ring.
- **[later]** Her strokes now include eraser strokes, so a saved drawing (the shelf idea above) would replay correctly as long as it keeps the whole list in order.

## Generated characters: what else can be generated the same way

`data/glyphs.js` and `npm run glyphs` (exact lines and arcs on the guide grid) can grow to:

- **[9A]** **Lowercase letters.** Use the fence line (0.5) as the x-height: a, c, e, m, n, o, r, s, u, v, w, x, z sit between the fence and the grass line; b, d, f, h, k, l and t reach up to the sky line. Add a descender line below the grass line (the ground line at 1.3 is close; the descender may need its own line) for g, j, p, q and y. i and j get a `dot` stroke. Each needs a stroke list in `data/stroke-order.js` first, and its own board.
- **[9B]** **Numbers 10 to 20.** Two digits side by side: the first digit's strokes, then the second digit's strokes moved right by the first digit's width. Stroke order stays left digit first. The board and the file ids (`10` ... `20`) are new.
- **[10]** `recorder.html` stays for hand-recorded overrides: put an id in `OVERRIDES` in `data/glyphs.js` and the generator keeps that file. Urdu letters will use it.

## Slice 5G: follow-ups

- ✅ **[5G]** The room backdrops no longer paint any find-object shape: window suns became clouds, the living room's framed star a small landscape, the bedroom's wallpaper stars dots, the study's chalk circle a triangle. A test guards it.
- ✅ **[5H]** The lunchbox's printed star is now two stripes.
- **[later]** X has no find pictures: no common word for a 4-year-old starts with its sound. A scene with the letter at the end (box, fox) would need its own rule.
- **[later]** U has only umbrella. A second sound-first U picture (up, under) is hard to draw as one object.
- **[later]** The zoo is only chosen on a tie (no letter has two of its pictures there). A second zoo animal for a letter would give the zoo its own scenes.
- **[5H]** The zip picture is a close-up of a zip (blue fabric, metal teeth, a pull tab). If she does not recognise it on the tablet, give it `finds: false` and Z skips its scene like U and X.

## Slice 5H: follow-ups

- **[later]** Odd one out: a tap is her answer there, so a plain tap is not a wiggle. If she taps cards just to see them move, a short press could be needed before a tap counts.
- **[later]** The find-library pictures (alligator, letter pictures, shadows) have room round them in their 200 x 240 box, so they look a little smaller on a card than the games' own pictures. A per-picture crop would fill the cards better.
- **[5H]** Missing piece: rotated pieces, which she turns to fit (a quarter that only fits once turned). Today pieces are never turned, so a quarter at another place is another outline.
- **[5H]** A two-step games menu: pick a kind of game (match, path, sort, odd one out, missing piece), then a set or level. The tiles would stay large as more games come (today Follow the path and Sort it share a line so every tile stays at least 88 px).
- **[later]** Missing piece level 4: a few cuts are thin (the star's top quarters, the sock's bottom-left corner). If she cannot tell them apart, raise the 25% bar in `tools/missing-cuts.js` and run `npm run missing-cuts`.
