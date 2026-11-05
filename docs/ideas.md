# Ideas parked for later

Claude Code adds ideas here instead of building them mid-slice.

- Dot strokes (`kind: "dot"`, Urdu nuqtas and the dot on i/j) are not scored yet: Slice 2 only uses `scoreStroke`; wire in `scoreDot` for them in a later slice.
- Stage 2 "path narrows a little after each success" (spec, Tracing engine). Slice 4A keeps the fixed `DEFAULTS.stages` widths.
- Browser speech needs one touch on the page before Chrome lets it talk, so the very first "Start here!" after a reload may be silent. Recorded clips (Slice 6) have the same rule for audio; a tap-to-begin moment in the session flow (Slice 5) would cover both.
- Slice 5A hides the ear button: with speech switched off (`SPEECH_ON = false` in `src/audio.js`) there is no prompt to replay. Bring it back with the recorded prompts.
- The setup page's "Test voice" button is silent while speech is off.
- Urdu tiles use the tablet's own Urdu font. Noto Naskh Arabic (named in CLAUDE.md) is not in `assets/fonts/` yet.
- `recorder.html` only knows E F H I L T 1 4 7. To record Urdu it needs the ASCII ids from `src/session.js` (`ur-alif-madd`, `ur-be`, ...), the right-to-left direction, and a `"letter"` field in the file it exports. Then add each new id to `data/chars/index.json`.
- Slice 5B's practice rounds replace `CONFIG.lastStage`, `lettersPerStage`, `maxAssistedInRow` and `completeLetter` in `src/progress.js` (still tested, no longer used by the game). Remove them once the rounds have settled.
- The Android back button leaves the app; app pinning comes in Slice 7.
- CLAUDE.md's module list could add the three new shell modules: `screens.js`, `art.js` and `music.js`.
- Round 3's track (5% opacity) is very faint on the white board. Check on the tablet whether she can still see it, before changing anything.
- mockup4 also lets a parent set the rounds from the address (`?rounds=5`). Slice 5B keeps the number in one setting (`ROUNDS` in `src/progress.js`); a parent-zone control could set it later.
- The headless ink-offset check (Playwright, both orientations, devicePixelRatio 1.5) could live in the repo as a script, so every slice can re-run it the same way.

## Slice 5C: objects each room still needs

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

- The number scene has no 10-second hint. If she waits a long time, the group of n could wiggle once, as the letter objects do.
- Letter scenes for letters with fewer than 3 objects in the library (every letter except E F H I L T) are skipped: she goes straight back to the board. They need objects first.
- The shelf of finds shows up to the newest 24. Older finds are kept (up to 500) but not shown; a second shelf could show them.
- `index.html?scene=E` opens a scene straight away. It was added for the headless checks; it could also serve a parent zone later.

## Parked: how find scenes choose objects (after Slice 5C)

Not yet as polished as the rest of the app. Come back to how a letter scene
picks its room, its 3 right objects and its 4 others, and where they stand.

## Slice 5D: follow-ups

- Follow the path, set 2: furniture to rooms (a bed to the bedroom, a pot to the kitchen, a desk to the study room, a sofa to the living room). Same engine as the animals; needs the furniture drawn and four homes, or three of the four rooms as homes.
- Numbers to things uses counts from 1 to 5 for now. Raise it to 1 to 9 once she counts groups that big easily (makeGroup puts 5 in a row, so 6 to 9 need taller cards).
- In headless Chrome, a fast drag that ends while the finger is still moving starts a "fling"; a tap on the home or back button during that fling (about the next second) only stops the fling and does not press the button. It may not happen on the tablet (the writing area and games board are `touch-action: none`). If it does, the buttons could act on `pointerup` instead of `click`.
- A tap on a card without dragging counts as a drop that missed: the card wiggles. If that confuses her, a tap could do nothing instead.

## Slice 5E: follow-ups

- Let her keep a free drawing or a colored picture on her shelf of finds (the toy box). The strokes are already in board units, so a drawing could be saved as its list of strokes and shown small on a plank.
- Car and building is drawn building first, so the car is drawn beside the finished building.

## Eraser (after Slice 5E): follow-ups

- The coloring step after a dot picture has the eraser but no clear-all: the crayon row has room for only one button, and there it is the tick. If she wants to start her coloring over, a clear-all could go at the top right of the board, with the same press-and-hold ring.
- Her strokes now include eraser strokes, so a saved drawing (the shelf idea above) would replay correctly as long as it keeps the whole list in order.

## Generated characters: what else can be generated the same way

`data/glyphs.js` and `npm run glyphs` (exact lines and arcs on the guide grid) can grow to:

- **Lowercase letters.** Use the fence line (0.5) as the x-height: a, c, e, m, n, o, r, s, u, v, w, x, z sit between the fence and the grass line; b, d, f, h, k, l and t reach up to the sky line. Add a descender line below the grass line (the ground line at 1.3 is close; the descender may need its own line) for g, j, p, q and y. i and j get a `dot` stroke. Each needs a stroke list in `data/stroke-order.js` first, and its own board.
- **Numbers 10 to 20.** Two digits side by side: the first digit's strokes, then the second digit's strokes moved right by the first digit's width. Stroke order stays left digit first. The board and the file ids (`10` ... `20`) are new.
- `recorder.html` stays for hand-recorded overrides: put an id in `OVERRIDES` in `data/glyphs.js` and the generator keeps that file.
