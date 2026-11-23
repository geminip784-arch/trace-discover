# Ideas parked for later

Claude Code adds ideas here instead of building them mid-slice. Each idea is tagged with the slice it belongs to (see `09-build-sequence.md`), or **[later]** when it is not on the roadmap yet. Done items stay for the record, marked ✅.

- **[10]** Dot strokes (`kind: "dot"`, Urdu nuqtas and the dot on i/j) are not scored yet: Slice 2 only uses `scoreStroke`. Wire in `scoreDot` for them (Slice 9A needs it too, for i and j).
- **[5I]** Stage 2 "path narrows a little after each success" (spec v2, Tracing engine). Slice 4A keeps the fixed `DEFAULTS.stages` widths.
- **[6]** Browser speech needs one touch on the page before Chrome lets it talk, so the very first "Start here!" after a reload may be silent. Recorded clips have the same rule for audio. The front door tap already covers it on the first visit of the day; check later visits.
- **[6]** Slice 5A hides the ear button: with speech switched off (`SPEECH_ON = false` in `src/audio.js`) there is no prompt to replay. Bring it back with the recorded prompts.
- **[6]** The setup page's "Test voice" button is silent while speech is off.
- ✅ **[10A]** Urdu tiles used the tablet's own Urdu font. Since Slice 10A, Noto Naskh Arabic (Regular and Bold) is in `assets/fonts/`, with its licence.
- **[later]** (moved from Slice 10: the Urdu letters are generated from `data/glyphs.js`, so this is needed only for a hand-made override) `recorder.html` cannot record Urdu yet. It needs the ASCII ids from `src/session.js` (`ur-alif-madd`, `ur-be`, ...), the right-to-left direction, and a `"letter"` field in the file it exports. Then add each new id to `data/chars/index.json`.
- ✅ **[5G]** Slice 5B's practice rounds replaced `CONFIG.lastStage`, `lettersPerStage`, `maxAssistedInRow`, `dropStage` and `completeLetter` in `src/progress.js`. Removed in 5G.
- **[7]** The Android back button leaves the app; app pinning comes in Slice 7.
- ✅ **[5G]** CLAUDE.md's module list now names every module, `screens.js`, `art.js` and `music.js` included.
- ✅ **[5I]** Round 3's track (5% opacity) is very faint on the white board. Superseded: round 3 is now the copy-it round, with no track.
- **[8]** mockup4 also lets a parent set the rounds from the address (`?rounds=5`). Slice 5B keeps the number in one setting (`ROUNDS` in `src/progress.js`); a parent-zone control could set it.
- **[later]** An optional "again?" after the star, so she can go round a letter once more (planned for 5I, moved here). Tapping a starred tile already replays the whole practice, so this is only a shortcut.
- **[later]** The copy-it round fits her letter by its height (the model's longer side). If she often writes letters much wider or narrower than the model, a fit that also allows a little stretching could be kinder; check her real `copy` log entries first.
- **[8]** Test mode (`?debug=1&today=`) keeps its changes in `test.` keys, which stay until cleared. The parent zone could offer a button to clear them (her real data is never affected).
- **[later]** The headless ink-offset check (Playwright, both orientations, devicePixelRatio 1.5) could live in the repo as a script, so every slice can re-run it the same way.
- **[8]** A parent switch for strict direction (Slice 5J part 2): today a stroke traced the other way along the track counts in rounds 1 and 2, and is only coached. A parent could turn on the old rule (the glow stops and the stroke does not count).
- **[later]** Round 3 look-alikes still accepted on two tiles (Slice 5J part 2). In the crude test letters, 4 B's written on the 8 tile pass as 8. Before the child-style templates, shallow M's written on the N tile also passed as N (as a mirrored N); with the templates none of the crude ones do. Check both against her real `copy` log entries before tightening anything (a rule that rejects a letter when she drew a part the target lacks was tried and did not help: under the 0.2 cover radius an N's lines reach every part of a shallow M).
- **[later]** A B with no stem passes round 3, the model B too (from before Slice 5J part 2): its bumps start and end on the stem line, so within the 0.2 cover radius they cover most of it. A fix would need a stricter part check for B's stem.
- **[later]** One crude B still fails round 3: round bumps drawn straight off the stem, slanted right, reads as 8. A template for it made a crude R with a small bump read as B, so it was left out (`tests/crude.test.js` KNOWN_FAIL).
- **[later]** The mango picture is hard to recognize (Slice 5J part 2 testing). It needs a clearer drawing: a stronger mango shape and color, perhaps with a leaf.
- **[later]** In round 3 at helper level 2, start dots on the stem (E's bars after an L) sit under her ink. They could be drawn on a layer above the ink, or nudged off the stem.

- **[8A]** Slice 8A part 1 copied the old progress keys (`td.stars`, `td.rounds`, `td.helper`, `td.finds`, `td.games`, `td.drawings`, `td.lastPlay`, `td.missing`, `td.reviews`, `td.practiceMore`, `td.pages`, `td.attempts`, and the name in `td.profile`) to the first child and left the originals as a backup. Remove them in a later slice, once the copy is confirmed on the tablet. Until then they take space twice: if the tablet's storage were ever nearly full the copy could not finish, and the app would keep playing on the old keys (nothing lost) and try again at the next open.
- **[8A]** Test-mode copies saved before Slice 8A (`test.td.stars` and friends) are not moved to the first child: test mode starts again from her real progress. Real progress is unaffected.
- **[6]** With more than one child (Slice 8A), the voice pack's private lines with `{name}` need one recording per child.

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
- ✅ **[9B]** **Numbers 10 to 20.** Built in Slice 9B part 1 (`NUMBERS` in `data/glyphs.js`): the right digit is moved so a gap of 0.25 line units separates the two digits' ink.
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
- **[later]** Missing piece level 4: a few cuts are thin (the star's top quarters, the sock's bottom-left corner). If she cannot tell them apart, raise the 25% bar in `tools/missing-cuts.js` and run `npm run missing-cuts`.

## Slice 5J: follow-ups

- **[later]** Copy-it shape limits (`COPY_MATCH` in `src/copy.js`) were set on drawn test letters, not on her hand. Check her real `copy` log entries (`match.distance`, `reason`) after a week and tune them.
- **[later]** Cross-board look-alikes written very wobbly (2 for Z, 8 for B, 5 for S) can occasionally pass, about 3 in 100 at a wobble of 3% of the letter's height. If she mixes them up, raise `closeKind` to make the target win less often in a close call.
- **[later]** A page of parallel slanted lines can pass as W (W is itself a zigzag). Unlikely from her; noted in case it happens.
- **[later]** In round 3, a letter with fewer strokes than the letter needs gets a hint after 5 seconds, not a failure reason (as built in 5I). So a C written for G is helped by Jugnu showing the bar, rather than "Almost! The bar is missing". Watch whether that is enough.

## Slice 6A: how the app will use the voice pack

- **[6B]** Play clips from the pack (IndexedDB `td-voice`, store `clips`, one 22.05 kHz mono WAV per script id; `src/voice-store.js` `readClips`). Load the pack once when the app starts and decode each clip into a Web Audio buffer the first time it is needed, so prompts start without a delay. Every play goes through the same `hush()` rule: no sound while her finger is down.
- **[6B]** Which clip to play: a line with her name plays its private clip (`jugnu-…-name`) when one is saved and a name is set, otherwise its public twin without the name. A line with no clip falls back to browser speech (`sayText`), which stays the fallback only.
- **[6B]** Note lines: `clipForText(line)` in `data/voice-script.js` finds the clip for the exact line `src/notes.js` shows, so the parent-facing line and its spoken version always match. The note lines are for a grown-up watching; decide in 6B whether they are spoken aloud to her or only the Jugnu prompts are.
- **[6B]** "B, b, ball!": play `name-b`, then `sound-b`, then the scene's find word (`find-ball`), with a short gap between them. Counting scenes say the number (`number-3`) and then the counting word (`count-eggs`). The `picture` line in `src/audio.js` ("B is for ball!") is replaced by this.
- **[6B]** Game instructions: play `game-<kind>` when a game opens, and again from the ear button.
- **[6B]** Bring back the ear button (it replays the last clip), switch `SPEECH_ON` back on for the fallback, and make the setup page's "Test voice" button play `jugnu-greeting-name`.
- **[6B]** Add a link to `voice.html` from the setup page (`index.html?setup=1`).
- **[7]** `voice.html` loads nothing from the internet, but with no offline cache it only opens with Wi-Fi off if Chrome still has it in memory. Add `voice.html`, `src/voice-page.js`, `src/voice.js`, `src/voice-store.js` and `data/voice-script.js` (with what they import) to Slice 7's service worker cache, alongside the app itself. The clips are already on the tablet in IndexedDB, so they play offline once the app's files are cached.
- **[later]** New script lines (a new find word, a new note) show up as Missing on `voice.html` automatically. Clips for ids that leave the script stay in the pack and in backups but are not shown.

## Slice 9A part 1: the lowercase letters

- **[later]** `recorder.html`'s Straighten button snaps upright strokes to the sky and grass lines only. A hand-recorded lowercase override would want the fence and the tail line too (`VERTICAL_LINE_SNAP` in `src/recording.js`).
- **[later]** In round 1, Jugnu waiting at i's stick (on the fence) sits partly over the dot's target just above it. He moves away during each demonstration, so it is minor; if it bothers her, give him a perch to the lower left for strokes whose start has a dot right above it.
- **[later]** The review screenshot in `docs/screenshots/glyphs/review.png` still shows the old ground line at 1.3. Retake it with the next change to the capitals.

## Slice 9A part 2: lowercase in the app

- **[parked]** Slice 6B (playing the voice pack: letter sounds, "B, buh, ball!", spoken prompts) is parked until we have the school's phonics programme, so the sounds and their order match what she learns at school.
- **[kept]** `voice.html` (Slice 6A) stays as it is: the script, recording, import, backup and restore all keep working, and the clips wait on the tablet for 6B.
- **[later]** The lowercase style (plain print: true circles, straight sticks, tails to the tail line) may be restyled once we have the school's handwriting sheet. The shapes are kept together in `data/glyphs.js` (`LOWERCASE`, sizes in `LOW`); change them there and run `npm run glyphs`. The stroke plans and the line-position limits (`POSITION` in `src/copy.js`) may need the same review.
- **[6B]** The new note lines ("Let the tail go below the grass.", "Make the stick reach up high.", "Keep it between the fence and the grass.") and the new part names (round, stick, arch, dot...) appear on `voice.html` as Missing by themselves. A lowercase "That looks like d." can play the clip for "That looks like D.": the letter's name sounds the same.
- **[later]** The line-position limits were set on drawn test letters. Check her real `copy` log entries (`reason: 'position-…'`) after a week; if a letter that looks right to you fails on position, loosen the matching limit in `POSITION`.

## Slice 9B part 1: the numbers 10 to 20

- ✅ **[9B part 2]** On the full screen (installed app, about 1280 x 800), the lines are bigger and 20 written at 125% (the most the size check allows) does not fit the writing room left of the model card (it needs 2.01 line units, there are 1.67). Every number fits at its own size, and on Chrome's 1280 x 626 everything fits. Part 2 makes the lines a little smaller for a wide number; `tests/card.test.js` lets only 20 on the full screen off until then.
- ✅ **[9B part 2]** The 123 board in rows of ten (0 to 9, 10 to 19, 20) gives tiles of about 95 px in the board's 1060 px, not 110: still above 88 px.
- **[6B]** Number names ten to twenty for the voice pack (`number-10` ... `number-20`), alongside the round-3 note lines part 2 adds.

## Slice 9B part 2: numbers on the board and in round 3

- **[later]** A 17 with the 1's flag left out says "Almost! That looks like I." (her 1 is read as I, as a single 1 with no flag is). Fine for now; if it confuses, name the digit's missing flag instead.
- **[later]** The split between digits (`NUMBER_SPLIT` in `src/copy.js`) was set on drawn test numbers. Check her real `copy` log entries for 10 to 20 after a week: a number she wrote well that fails with `missing-digit` means the split needs a smaller `minAspect`.
- **[6B]** The new note lines ("The 1 comes first.", "The 7 is missing.", "The slant of the 7 is missing.", "That looks like 13.") and the number names ten to twenty appear on `voice.html` as Missing by themselves.

## Slice 9B part 3: count scenes for 10 to 20

- **[later]** The three stacked placemats stand in the same place in every room (`ROW_SPOTS` in `src/finds.js`), over the room's furniture (the classroom's chalkboard sits behind the top one). The mats are opaque, so it reads well; if a room looks crowded, give each room its own row spots.
- **[6B]** Counting on says "ten" for the frame and then "eleven", "twelve"... once the voice pack plays (the number clips `number-10` ... `number-20` are in the script).
- **[later]** Missing piece, match and the other games stay at 1 to 9. A "numbers to things" set for 10 to 20 in ten-frames would be a natural next game.

## Slice 9C part 1: her name's book, rounds 1 and 2

- ✅ **[9C part 2]** After round 2 the practice ends for now (no round 3, star or review). Part 2 adds the copy-it round, the reward, the name card on her shelf of finds and reviews; `name-game.js` then stops treating round 3 as the end.
- **[later]** The 45 px floor covers the start radius, path tolerance and dot radius. A dot (i, j) must also be a tap no longer than `DOT_MAX` (0.2 units, about 23 px at the smallest lines); if her dots on a long name are often not counted, give `DOT_MAX` a px floor too.
- **[later]** In rounds 1 and 2 only the letter she traces now is scored, so a neighbour's track (r's stem next to a's stick) can never take her stroke. Neighbouring tracks touch on long names; that is only how they look.
- **[6B]** A spoken "Let's write your name!" (a private `{name}` clip) when the name book opens, and her name said letter by letter at the end.
- **[8]** The parent zone could show the name book's `name` log entries: which letters of her name needed help.

## Slice 9C part 2: round 3, the reward, the name card and reviews

- **[later]** The stroke-to-letter cut (`NAME_COPY` in `src/name-copy.js`) was set on drawn test names (neat, wobbly, slanted, small, big, tight, spread out, out of order). Check her real `name` log entries after a week: a name that looks right to you but fails with `missing-letter` or a letter's `unrecognized` means the cut needs tuning (`gap`, `cutCost`, `place`).
- **[later]** A name with an extra letter ("Sarra" for "Sara") fails on the letter the extra strokes join, often as "That looks like m" or "Let's watch Jugnu write the a". Fine for now; an "extra letter" reason could name it better.
- **[later]** Judging takes about 0.1 to 0.9 s on a laptop for 3 to 8 letters; on the tablet it may take a little longer. If the pause after the 3-second wait feels long, the cut's shape costs could be cached per stroke group across copies.
- **[6B]** The name lines name a letter ("Almost! The r is missing.", "Make the r bigger.", "Here is the next letter."...): for the voice pack they need a clip per letter or a "the r" clip spliced in. Not in `data/voice-script.js` yet.
- **[8]** The parent zone could show the name's `name` log entries: which letters of her name she copies well, and which need help.

## Slice 5N: two books for later, and a third Count level

Notes only: nothing here is built.

### Count, then pick the number: a later level 3

- **[later]** In levels 1 and 2 (Slice 5N part 3) the counting numbers stay on the things while she picks the number tile, so she can match the number she sees. A level 3: once she has counted the last thing, the counting numbers fade before the three number tiles appear, so she has to remember the total. It could open after 3 finished plays of level 2, like Missing piece and Memory. The counts could be 1 to 20, the teens counted on in ten-frames as in level 2.

### My Deen (an Islamic studies book)

- **[parked]** Parked until we have her school's Islamic studies pages. Nothing is written or recorded before then.
- **Level 1:** kalimas 1 and 2, the five pillars, everyday phrases and little duas.
- **Level 2:** kalimas 3 and 4, the five daily prayers, wudu in order, short surahs, Ramadan and the Eids.
- **Level 3:** the six articles of faith, the prophets' names and stories in words only, more surahs and duas, and good manners.
- **Pictures:** never depict Allah, the prophets or the companions.
- **Text:** all Arabic text, its wording and its order come only from her school book.
- **Voice:** recordings by a family member or her teacher, never a computer voice. The voice pack (Slice 6A) can hold them; browser speech is never used here, not even as a fallback.
- **Parent setting:** one switch turns the book on or off (with the Slice 8 parent zone). Off, it is not on the shelf.

### Stories book: a rebuild of the old story game

- **[12]** The Stories book already stands locked on the shelf (Slice 12). The stories are written in advance and reviewed: no live AI and no API keys.
- **Heroes:** taken from the children set up on the tablet (`td.children`), never hard-coded names. The hero can be each child, two children together, or a story character. Every sidekick and place is open to every child; nothing is assigned by gender. Each child's last picks are remembered (per child, like every personal key since Slice 8A).
- **The hero figure:** a simple doll-style child. Hair, skin tone and color are set per child on the children page (Slice 8A part 2's form gets these fields).
- **Choices:** each step tests one value, with one clearly right and one clearly wrong option (never two good ones). The wrong one is never scary. After a wrong choice, a gentle why, and she tries again.
- **Little extras:** at each step a heart button offers 3 picture extras that fit the scene (hug, pat, share a snack, sing, wave, give a flower, say Bismillah). Each adds a line to her story without changing right or wrong. 3 choices keeps the child-screen rule.
- **Saving:** at the end, "Save this story?" stores the exact path (hero, sidekick, place, choices, extras) on that child's story shelf. A "read again" mode pages through it, read aloud.
- **Islamic phrases** woven in naturally (Bismillah before brave acts, Alhamdulillah for thanks), switched on or off by the same parent setting as My Deen.
- **[later, maybe; needs your decision first]** Free custom choices written by AI through a server, approved by a parent, never with a key in the app. This would change two project rules (CLAUDE.md "No AI and no API keys anywhere in this project" and "No network calls at runtime once installed"), so it stays a note until you decide to change them.

## Slice 10A: Urdu shapes

- **[later]** Two dots are often written as one short dash, and three dots as a small "^", in grown-up Urdu handwriting. For now she draws separate dots, as in a qaida, and a dash or a "^" is not counted as dots. If her teacher writes them that way, the copy round could accept a dash for two dots and a "^" for three (the marks are already told apart by length).
- **[10B]** The Urdu shapes follow Noto Naskh Arabic for now. If photos of her qaida's letter pages arrive, draw against those instead (the faint letter on `glyphs.html` could show a photo).
- **[later]** ج's head runs left to right, as it is written, before the tail turns back; you confirmed this for the whole ج family (ج چ ح خ) in Slice 10B. It is easy to flip if her qaida shows it right to left: the head is one shared piece, `U.jeemHead` in `data/glyphs.js` (list its points the other way and start the tail at its other end), then update the direction test in `tests/urdu-glyphs.test.js`.
- **[10D]** The tablet shows Urdu tiles in Noto Naskh Arabic Bold now; the shapes she traces are the thinner Regular's middle line. If the bold tile and the traced shape look too different to her, the tiles could use Regular.

## Slice 10B: all 39 Urdu letters

- **[10D]** Several dots may be tapped in any order (approved in 10B). The character files do not say so yet: Slice 10D should treat a run of dots at the end of any plan as one either-order group (today `anyOrder` belongs to the default plan only, in `src/variants.js` `planChar`).
- **[10D]** A `mark` stroke (the little ṭ, the madd) is judged by its place only: in rounds 1 and 2 a tap or a small stroke whose middle lands near the mark's middle counts. Its allowed length needs its own limit (a dot's `DOT_MAX` of 0.2 is too short for a little ṭ, about 0.3 across).
- **[10C]** In the copy round a mark is told apart from a dot by its length: a ṭ written as a dot, or two dots written as a ṭ, needs a reason line ("Almost! It needs the little ṭ on top.").
- **[later]** و starts at the bottom of its head and goes round to the left first, so the head is a closed loop (the 10B table said "from its lower left"; the shape is the same, the start is a little to the right).
- **[later]** آ's madd and ک گ's slants sit lower than the font's (the font puts them above the sky line, where the round lights are). If her qaida's آ has a tall alif, the round lights could move instead.
- **[later]** The teeth of س ش are drawn up and back down (a narrow point); a child may draw them as small round bumps. The tracing tolerance should cover it; check her real attempts.

## After Slice 10 (Urdu): two big pieces to plan once Urdu is complete

Notes only (Slice 5O part 1). Neither is planned or built yet; both are to be planned once Slice 10 (all of Urdu) is complete.

- **[after 10]** **A major redesign of the front end.** A fresh look for every screen she sees: the front door, the bookshelf, the boards, the writing screens and the games, so that the app looks and feels like one whole. To be planned as its own set of slices, with mockups approved first. The child-screen rules stay as they are: no text for her, at most 3 choices, 88 px targets, never red, the whole writing screen writable.
- **[after 10]** **A General Knowledge section for children.** A new book on the shelf with simple picture-and-voice knowledge for a 4-year-old (for example: animals and where they live, the body, the weather, the seasons, day and night, colors in nature). The topics, the level and how it is played need your decisions first; it would follow the same rules (no reading needed, no network, per child).

## Slice 5O part 1: undo one stroke

- ✅ **[5O part 2]** Jugnu's resting place was partly behind the undo button on her name's copy screens. Done in Slice 5O part 2: he now rests in the button column, just under undo (`restingSpot` in `src/jugnu.js`).

## Slice 5O part 3: letter slots in name writing

- ✅ **[5O part 4]** The slots of i, l, I and 1 were narrow (as narrow as the model letter). Done in Slice 5O part 4: no slot is narrower than 0.33 of a line unit (about half of a), the letter centred and the letters after it moved along (`placeInSlots` in `src/name.js`).
- **[later]** One hard case is still read wrongly, with or without slots: a long name with narrow letters (the made-up "Isabella") written 1.2 times bigger and nudged off-centre, so that neighbouring letters overlap a lot. Check her real `name` log entries (`slots`, `overlap`) before tuning `NAME_SLOT_RULES` in `src/name-copy.js`.
- **[later]** Found while building the slots: a perfectly straight up-and-down line judged as a wide letter (e, a, o, m, W) made the copy judge crash (`fitToParts` in `src/copy.js` scaled it by a width of almost 0). Fixed in this slice: such a stroke is now fitted by its height and fails kindly. A finger rarely draws a perfectly straight line, so it may never have happened on the tablet.

## Slice 5O part 4: rewriting only the wrong letter

- ✅ **[5O follow-up]** A single tap drew no ink (a path from a point to the same point is not painted), so her i and j dots did not show. Done in the Slice 5O follow-up: a tap is drawn as a round dot of her ink (`isDot` and `strokeRun` in `src/render.js`).
- ✅ **[5O follow-up]** The setup page's "too long for one line" check used print spacing, though the copy screens write her name in slot spacing (a little wider with narrow letters). Done in the Slice 5O follow-up: the check uses the slot spacing (`slotNameWidth` in `src/name.js`).


## Slice 10C: judging Urdu copies

- **[later]** The limits (`URDU_DOTS` in `src/urdu-dots.js`: dot size 0.18, mark size 0.5; `POSITION.urduDipBelow` 0.15) were set on drawn test letters. Check her real `copy` log entries (`reason`, and `dots`: how many on top and underneath) after a week of Urdu reviews.
- **[later]** In the copy round a single tap on top counts as the little ṭ on ٹ (no letter of its family has one dot on top), but not on ڈ and ڑ, where it is exactly ذ and ز. In tracing (Slice 10D) the place is known, so a tap at the ṭ counts on all three.
- **[later]** Urdu letters that sit on the grass line are not checked for where they sit (only letters whose tail or bowl dips must dip). If she writes ب floating high, a gentle check like lowercase's "small" band could be added.
- **[later]** In the copy round, a dot or mark has no start to coach for Urdu letters, so a dot a little off its place never brings "Here is the usual way". The dot of i and j still does (as before); it could follow the Urdu rule.
- **[later]** The test file checks the pairs of Urdu letters most likely to be mixed up. While building 10C every letter was also written for every other (model and crude, 2,964 copies): none passed, and no scribble passed. That full sweep takes over a minute, so it is not in `npm test`; a `tools/` script like `tools/crude-report.js` could run it on demand.
- **[later]** No child-style templates (`data/child-shapes.js`) were needed for Urdu: wobbly, slanted, squashed, round-cornered and shallow-tailed copies all pass on the plans alone. Add them only if her real copies need them.

## Slice 10D: Urdu in the app

- **[later]** On an English (or number) practice page, space 3 sits under the fireflies (top right): the top of a letter that reaches the sky line there (E F J S 0 2 4 5 6 7 9 d f) tucks a few px under them, and its glow and track a little more. This was so before Slice 10. Urdu practice pages end left of the fireflies (`PRACTICE.clear`); English ones could do the same (their spaces would be a little smaller), or the fireflies could sit higher. `tests/lights.test.js` checks Urdu practice pages only, for now.
- **[later]** A mark's dashed ring is fairly big (its reach is the stage's dot radius plus 0.08 line units), so a 4-year-old's rough ṭ counts. If it looks too generous on the tablet, `MARK.reach` in `src/variants.js` is the one place to change.
- **[later]** In round 1 Jugnu demonstrates a mark by drawing its real shape; she may tap. If the shape confuses her, he could tap its middle instead (as he does for a dot).
- **[10E]** Until the picture words are approved, every Urdu letter goes back to the board after its star (no find scene), as X does.
