# Build sequence

Build in this order, one slice at a time. Each slice ends with `npm test`, a numbered list of checks on the tablet, and a pull request. Do not start a slice until the previous one is merged.

What the app does today is in `docs/spec.md`.

---

## Done

| Slice | What it built |
| --- | --- |
| 0 ✅ | Skeleton on the tablet. The viewport was measured and GitHub Pages set up |
| 1 ✅ | Ink that follows her finger: the four colored lines, single-pointer tracking, no lag |
| 2 ✅ | Scoring wired in, with the `?debug=1` panel |
| 3 ✅ | The stroke recorder (`recorder.html`) |
| 4 ✅ | The tracing game for one character: three stages, Jugnu, start dots, the feedback rules, never-stuck help (4A, 4B) |
| 5A ✅ | The app shell: front door, bookshelf, ABC, 123 and Urdu boards, music |
| 5B ✅ | Three practice rounds and gold stars |
| 5C ✅ | Find and count scenes, and her shelf of finds |
| 5D ✅ | The Games book: match (numbers, colors) and follow the path |
| 5E ✅ | The Drawing book: free paper, dot to dot in three levels, the eraser |
| 5F ✅ | More games: match sets (letters, shadows, shapes), furniture to rooms, Sort it, Odd one out. Every capital and digit generated |
| 5G ✅ | Docs and housekeeping; sound-first find pictures for every letter but U and X, the farm-garden, zoo and sea, and `finds.html` |

---

## To build, in order

### 5G — Housekeeping and find pictures ✅
Docs brought up to date and dead code removed (done in its own pull request first). Then every letter gets find pictures whose words start with the letter's **sound**:

A apple, ant, alligator · B ball, banana, bus · C cat, cup, cake · D dog, duck, drum · E egg, elephant, envelope · F fish, fan, fork, flag, frock · G goat, gift, grapes · H hat, horse, honey, heart · I insect, igloo, ink · J jug, jellyfish, juice · K kite, key, kettle · L lamp, lemon, lion, lunchbox · M moon, mango, milk · N nest, nose, net · O octopus, orange, olive · P pencil, pear, parrot · Q queen, quilt · R rabbit, ring, rainbow · S sun, sock, star · T tiger, tomato, toys · U umbrella · V van, vase, violin · W watch, whale, window · Y yo-yo, yak, yogurt · Z zebra, zip. X has none for now.

Ice cream and eraser leave the find scenes and the Letter to picture game. Their pictures stay, for the Shadow game and her saved finds. New places: the farm-garden, the zoo and the sea. A scene borrowing from another place takes portable things before animals. `finds.html` is the review sheet.

**Done when:**
- [ ] Every letter except U and X opens a find scene with 3 targets (2 for Q and Z), from the place that holds most of its objects
- [ ] No distractor starts with the scene's letter
- [ ] Her old finds of ice cream or eraser still show on her shelf
- [ ] You have approved the art on `finds.html`

### 5H — Game variety and the Missing piece game
More sets for the existing games, so a play does not repeat, and a new **Missing piece** game. Two pull requests:

1. **Game variety** (built): pools for every game (7 colors with 3 or 4 things each, every letter's sound-first words, any distinctive shadow, 4 things per shape, 8 animal homes, counts to 9), no repeat of the last play per game (`td.lastPlay`), a plain tap wiggles a card, and the lunchbox's star became stripes. Screenshots: `docs/screenshots/slice-5h/`.
2. **Missing piece** (built): its own menu row with a tile per level; four levels (shape and color, shape only, two gaps in one shape, picture puzzles); every round generated and checked so exactly one piece fits each gap and no other piece shares a gap's outline. Screenshots: `docs/screenshots/slice-5h-missing/`.

**Done when:**
- [ ] Two plays of the same game in a row look different
- [ ] She can finish a Missing piece play on her own

### 5I — Practice and review
1. **Copy it** (built): round 3 shows empty lines and a model card; Jugnu draws the letter once on the card, she writes it anywhere on the lines, and the whole letter is judged on shape, order, start and direction at 75 to 125% of the model's size. If she stops part way, after 5 seconds Jugnu shows the next stroke on the card (a hint, not a fail). A fail fades her letter and Jugnu replays the stroke that went wrong; 3 failed copies end the round with help. Each copy is logged (type `copy`). Screenshots: `docs/screenshots/slice-5i/`.
2. **Reviews** (built): after 1, 3, 7 and 21 days, then the letter graduates; a fail or a help-only practice goes back to 1 day. Due letters glow on their board with a firefly light, and their book glows on the shelf; at most 2 a day. A review is one copy-it round, then the find scene. The practice-more list (help, 2+ failed copies or 3+ wrong starts in one sitting) brings a letter back after 1 day. Each review is logged (type `review`). `?debug=1&today=` checks later days without touching her real progress (changes go to `test.` keys). Screenshots: `docs/screenshots/slice-5i-review/`.

The optional "again?" after the star moved to `docs/ideas.md`.

**Done when:**
- [ ] A letter written a little bigger or smaller than the model still passes round 3
- [ ] A letter starred today comes back for review tomorrow, then 3, 7 and 21 days later
- [ ] Letters she often gets wrong appear on the practice-more list

### 5J — Testing fixes
**PR 1** (built): stroke plans, shape-based judging, habits coached, clear failure reasons.
1. **Allowed stroke plans:** each character has a short list of ways to draw it, built from the same exact geometry (`data/glyphs.js`, shown on `glyphs.html`). B 2 or 3, R 3 or 2, K 3 or 2 (K's leg now starts at the stem), M 2 or 4, N 2 or 3, E with an L first, H stem-bar-stem, 4 slant and bar first, T and X either order, V, W, Y, Z, 2, 3 and 9 split or joined. Rounds 1 and 2 accept any plan, still checking start and direction per stroke.
2. **Shape judging in round 3:** the $P recognizer compares her letter with the board (and look-alikes S/5, Z/2, O/0, I/1, B/8, G/6). O and 0 count as each other. Every part must have ink, size 75–125%. Scribbles fail.
3. **Habits coach, never fail:** a different plan, start, direction or order passes, and Jugnu replays the usual way. A mirrored letter passes, Jugnu shows it the right way round, and it goes on the practice-more list ("mirrored").
4. **Failure reasons:** her letter beside the model with the missed part glowing; a dashed outline at the right size; Jugnu drawing the missing part; or Jugnu tracing the whole model slowly. A short parent line for each, and for wrong start, wrong direction and off the track in rounds 1 and 2. Screenshots: `docs/screenshots/slice-5j/`.

**PR 2A** (built): frustration fixes in writing.
1. **Fading helper in round 3:** per character, level 1 a dotted ghost and the first start dot, level 2 start dots only (following her plan), level 3 nothing. Up after 2 passes without a hint, down after 2 failed copies in a row. Reviews use the current level; each copy entry logs it.
2. **M and N from the bottom:** a one-stroke plan from the bottom left for each.
3. **Direction coaches, never blocks:** in rounds 1 and 2 a stroke traced the other way along the track counts; Jugnu replays the usual way after the letter. Off the track still does not count.
4. **Crude letters:** six child-style templates for the recognizer (M shallow, M less shallow, M splayed, N short diagonal, W shallow, B uneven bumps). No limit loosened. 123 of 124 crude test letters pass; 140 of 144 crude wrong letters still fail. Screenshots: `docs/screenshots/slice-5j-2/`.

**PR 2B** (built): game help and the U scene.
1. **Instruction lines:** one short grey parent-facing line at the top of every game.
2. **Show me:** a picture-only button (Jugnu with a play mark) in the left column of every game replays Jugnu's demonstration on the current set without making the move. Logged as help, never as her move.
3. **Slower Odd one out demonstration:** Jugnu looks at each card in turn (each lifts a little), pauses, then taps the different one: about 5 seconds.
4. **U scene:** a cricket umpire doll (raised finger, drawn like the queen) in the living room and farm-garden, so U's scene opens in the living room with the umbrella. The queen and the umpire share a shadow look-alike group. X still skips its scene. Screenshots: `docs/screenshots/slice-5j-3/`.

**Done when:**
- [ ] B in 3 strokes and R in 2 strokes pass rounds 1 and 2
- [ ] A copy drawn in another order or direction passes, and Jugnu shows the usual way
- [ ] Every failed copy shows why before it fades

### 6 — Voice and phonics
- A family voice recorder (clips stored in IndexedDB).
- Jugnu greets her by name.
- Spoken prompts, and the ear button to replay the last prompt.
- Each letter's name, sound and picture word ("B, buh, ball!").

Browser speech is only a fallback.

**Done when:**
- [ ] Jugnu greets her by name in your voice
- [ ] Every prompt is spoken, and the ear button replays it
- [ ] Clips still play with Wi-Fi off

### 9A — Lowercase
Lowercase letters, generated like the capitals, with the fence line as the x-height. i and j get `dot` strokes. A lowercase board.

**Done when:**
- [ ] Every lowercase letter plays all three rounds

### 9B — Numbers 10 to 20
Two digits side by side, left digit first.

**Done when:**
- [ ] 10 to 20 play all three rounds, and count scenes reach 20

### 9C — Words level
Short words made of letters she has starred.

**Done when:**
- [ ] She can trace a three-letter word letter by letter, then see its picture

### 10 — Urdu
- Dot strokes scored with `scoreDot`.
- The Noto Naskh Arabic font served locally.
- `recorder.html` support for Urdu (right to left, ASCII ids).
- The Urdu letters recorded.
- **Dot Detective**: add the right dots to a body.

**Done when:**
- [ ] The boat family (ب پ ت ٹ ث) plays all three rounds, dots included
- [ ] Dot Detective plays on the boat family

### 8 — Parent zone
- A lock: press and hold for 3 seconds, then a simple sum.
- Settings.
- A progress grid.
- A replay of her last attempt on any character.
- Her wrong starts per week, from the attempt log.
- A reset.

**Done when:**
- [ ] You can replay exactly how she wrote her last mistake on any character
- [ ] You can see her wrong-start count per week

### 7 — Install as an app
A web app manifest (full screen, landscape, icons), a service worker for offline use, and a safe update flow. Plain steps to install from Chrome and pin the app.

**Done when:**
- [ ] It opens full screen from a home-screen icon
- [ ] It works in airplane mode
- [ ] With the app pinned, she cannot get out without you

### 11 — Shapes book
The Shapes book on the shelf opens: tracing circles, squares, triangles and more.

**Done when:**
- [ ] The Shapes book opens and each shape plays all three rounds

### 12 — Stories and the daily rhythm
- The Stories book.
- A short warm-up before writing.
- Jugnu's light that grows with her progress.
- A daily time limit that ends with Jugnu's goodnight.

**Done when:**
- [ ] When the limit is reached, the session ends kindly and stays closed until tomorrow or a parent unlock
- [ ] A full day runs from the door to goodnight without you touching anything

---

## Then: the two-week trial
Let her use it daily within the limit. It is worth building further only if all three hold:
1. She asks to play on most days without being prompted.
2. Her wrong starts drop from week 1 to week 2 (from the attempt log).
3. The ink never lags or misses her finger.
