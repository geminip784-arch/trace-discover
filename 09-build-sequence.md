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

---

## To build, in order

### 5G — Housekeeping and find pictures
Docs brought up to date and dead code removed (done in its own pull request first). Then every letter gets find pictures whose words start with the letter's **sound**:

A apple, ant, alligator · B ball, banana, bus · C cat, cup, cake · D dog, duck, drum · E egg, elephant, envelope · F fish, fan, fork, flag, frock · G goat, gift, grapes · H hat, horse, honey, heart · I insect, igloo, ink · J jug, jellyfish, juice · K kite, key, kettle · L lamp, lemon, lion, lunchbox · M moon, mango, milk · N nest, nose, net · O octopus, orange, olive · P pencil, pear, parrot · Q queen, quilt · R rabbit, ring, rainbow · S sun, sock, star · T tiger, tomato, toys · U umbrella · V van, vase, violin · W watch, whale, window · Y yo-yo, yak, yogurt · Z zebra, zip. X has none for now.

Ice cream and eraser leave the find scenes and the Letter to picture game. Their pictures stay, for the Shadow game and her saved finds. New garden and sea backdrops. `finds.html` is the review sheet.

**Done when:**
- [ ] Every letter except U and X opens a find scene with 3 targets (2 for Q and Z), from the place that holds most of its objects
- [ ] No distractor starts with the scene's letter
- [ ] Her old finds of ice cream or eraser still show on her shelf
- [ ] You have approved the art on `finds.html`

### 5H — Game variety and the Missing piece game
More sets for the existing games, so a play does not repeat, and a new **Missing piece** game.

**Done when:**
- [ ] Two plays of the same game in a row look different
- [ ] She can finish a Missing piece play on her own

### 5I — Practice and review
- Round 3 becomes a copy-it round: she writes the letter beside a model, judged on shape at 75 to 125% of its size.
- Reviews after 1, 3 and 7 days.
- A practice-more list.
- An optional "again?" after the star.

**Done when:**
- [ ] A letter written a little bigger or smaller than the model still passes round 3
- [ ] A letter starred today comes back for review tomorrow, then 3 and 7 days later
- [ ] Letters she often gets wrong appear on the practice-more list

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
