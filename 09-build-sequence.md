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
| 8A ✅ | Children's profiles: up to 6 children, each with their own progress; first-run setup, the children's tiles at the door, switch child, and the children page behind a 3-second lock |

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

### 5K — Feedback from testing with her
Four pull requests, one at a time.

1. **Round 3 moves to review days (built):** practising a letter, number or her name is rounds 1 and 2, then the glow, the star and the find scene (two round lights). The star needs both rounds with no help. The copy-it round, with its helper levels, judging and reasons, is used only in reviews (1, 3, 7 and 21 days). Why: copying from memory on a later day shows what she has kept; straight after tracing it only shows what she has just seen. Saved progress: a practice left in the old round 3 counts as finished (its star if no help was used, its first review the next day); nothing she has earned is lost. Screenshots: `docs/screenshots/slice-5k/`.
2. **Follow the path:** Jugnu flies the first road only the first time she ever plays it; a new generated road layout every play (1 or 2 crossings at a clear angle, a minimum gap, random start and home heights, some plays from the right), never the last play's layout.
3. **Randomization:** match sides and Jugnu's first card; Sort it basket sides, samples and bigger pools; Odd one out's easy row; Missing piece's first gap; dot to dot start dots (the house's level 1 order kept), direction, mirroring, place, level 3 sides and pairs, 8 new pictures, and 6 tiles per visit favouring unfinished ones, never the same six twice in a row. Free-paper crayons stay put.
4. **Mango and tomato** redrawn in our style.

**Done when:**
- [ ] A new letter takes two rounds, then its star and scene
- [ ] The next day it comes back as a copy-it review
- [ ] A letter she left in the old round 3 has its star (if she had no help) and is due for review

### 5L — The practice page
Extra practice for a letter, number or her name once it has its gold star. Three pull requests, one at a time; all three are built.

1. **Letters and numbers (built):** one big pencil tile on the ABC and 123 boards (in ABC just after the "A a" tile). A tap turns practice mode on: starred tiles wear a pencil badge and open their practice page, every other tile is faint and wiggles; a second tap turns it off, and leaving the board ends it. Every tile stays at least 88 px (ABC 120 px, 123 95 px). The page: one set of four lines with 3 spaces side by side, sized to fit (20 is the smallest at 186 px), with the 45 px tolerance floor. Space 1 is traced like round 1 and stays as her model; spaces 2 and 3 are blank and judged like the copy-it round, with its reasons. Each finished space lights a firefly. Never stuck: Jugnu draws a stroke of space 1 after 5 misses on it (round 1's rule), and writes space 2 or 3 after 3 failed copies; the space counts as done, with help. When all 3 are done, a big arrow tile in the left column offers a fresh page. Back and home always leave. It never changes stars, reviews, helper levels or the practice-more list; each space is logged as a `practice` entry. Screenshots: `docs/screenshots/slice-5l/`.
2. **Page stickers (built):** each full page adds one to that letter's count (`td.pages`) and moves its one sticker to the newest place on her shelf of finds: the letter on a little lined page, a stack of sheets behind it (up to 5) and the number of pages in a gold badge. Stars, reviews and helper levels stay untouched. Screenshot: `docs/screenshots/slice-5l/shelf-page-stickers.png`.
3. **Her name (built):** the name book gets the same pencil tile; in practice mode a starred name shows the pencil badge and opens its practice page, without a star it is faint and wiggles. One practice space per screen at the name book's line size, 3 screens make a page: screen 1 traced letter by letter like the name's round 1, screens 2 and 3 written on her own under the model card (on screen 2 Jugnu writes it on the card, fast, and her touch finishes the card at once; on screen 3 it is already there, no demonstration) and judged like the name's copy round, with its letter-by-letter reasons; the 3 fireflies across all three screens; the 45 px floor throughout. Never stuck: screen 1 as in round 1; on screens 2 and 3 Jugnu writes the name after 3 failed copies (done, with help). After screen 3 the arrow tile offers a fresh page; each full page adds to the name's page count and moves its one sticker (two places wide, storing no name) to the newest place. Per child, using the playing child's own name; renaming clears the name's pages and sticker. Each screen is logged as a `practice` entry. Screenshots: `docs/screenshots/slice-5l/name-*.png`.

**Done when:**
- [ ] The pencil tile turns practice mode on and off; only starred tiles open a practice page
- [ ] A full page lights 3 fireflies and offers a fresh page
- [ ] Practising never changes a star, a review date or a helper level
- [ ] Each full page moves that letter's sticker to the newest place on her shelf, with the new count
- [ ] Her name: the pencil only on a starred name, 3 screens make a page, and its sticker counts per child

### 5M — Clearer games and better pictures
Four pull requests, one at a time.

1. **No automatic first move (built):** Jugnu never makes a move for her in any game. The first-move code is gone from Match, Follow the path, Sort it, Odd one out and Missing piece; every set takes her touch at once. The instruction line and "show me" stay. `tests/no-first-move.test.js` checks that a move is made only from her own touch.
2. **Odd one out, made clear (built):** a specific instruction line per row, by rule ("Find the one that is a different color", "Find the one that is not a fruit", ...); a picture of the rule above the row; show me visits the three that match, a ring groups them with the rule picture, then Jugnu points at the odd one; a right answer shows the same ring. Built as a gold outline on each of the three and a gold band above the row, hopping over the odd card when it sits between them; the three cards turn pale gold. Screenshots: `docs/screenshots/slice-5m/`.
3. **Twemoji find pictures (built):** the find pictures switch to Twemoji (CC BY 4.0), copied into the repo; the credit in the README and on a credits screen on the parent page; a word list approved first; shadow and look-alike checks re-run; a review sheet. Built: 57 Twemoji find pictures and 11 countable things; 21 drawings kept, faces removed; toys became teddy; apple and tomato a look-alike pair; Missing piece level 4 re-paired by color; Shadow groups cake/cup/drum and cat/dog added. Screenshots: `docs/screenshots/slice-5m/`.
4. **Twemoji game pictures (built):** the game pictures switch the same way (Twemoji is never recolored); color checks re-run; a review sheet. Built: Match colors, Follow the path, Sort it and Odd one out's kind rows in Twemoji; Odd one out's color rows keep our paintings (no book); our spider, Shape to thing and the homes and stove with no emoji stay ours; the re-run color check swapped in moon, pear, red car and pink heart.

**Done when:**
- [ ] No game makes a move by itself: every first set waits for her
- [ ] Every Odd one out row has its own instruction and rule picture
- [ ] The review sheets of the new pictures are checked on the tablet

### 5N — Two games from the old prototypes
Three pull requests, one at a time.

1. **Docs:** the My Deen book and the Stories book written up in `docs/ideas.md` (notes only, nothing built), and a later level 3 for Count, then pick the number.
2. **Memory (a 6th kind on the Games menu; built):** cards face down; she flips two. A pair glows with a chime and stays face up; a mismatch flips back after about 1.2 seconds, silently, and taps wait meanwhile. Levels: 3 pairs (2×3), 6 pairs (3×4), 8 pairs (4×4); one board makes a play and earns the level's star; a level opens after 3 finished boards of the one before (`td.memory`). Pictures at random from the find library, never two from one look-alike group (`LOOKALIKES` and `SHADOW_LOOKALIKES`), never the last board's set. Cards at least 120 px. No text, no move counter. Line: "Find two cards that are the same". Show me: every card peeks face up for 1.5 seconds, then flips back. Screenshots: `docs/screenshots/slice-5n/`.
3. **Count, then pick the number (two sets in Match; built):** a group of things she counts by tapping each (the count shows as she goes), then three big number tiles, at least 2 apart; she taps the right one. Level 1: 1 to 10, counted one by one. Level 2: 11 to 20 in ten-frames, counting on, as in the count scenes. 3 groups make a play; a star per level. The counting numbers stay on screen while she picks. Line: "Count them, then tap the number". Match's set screen shows two rows: the five draw-a-line sets, then the two count levels. Screenshots: `docs/screenshots/slice-5n/count-*.png`.

Every game: per child, logged as `game` entries, laid out in board units, paused while the tablet is upright, `touch-action: none`, offline.

**Done when:**
- [ ] Each Memory level plays, earns its star and opens the next after 3 boards
- [ ] Both Count levels play and earn their stars
- [ ] One child's stars and unlocks never show for another

### 8A — Children's profiles ✅
One tablet, more than one child. Each child has a name (a to z, as the name book needs), one of 8 animal pictures and a color; up to 6 children. Two pull requests:

1. **Per-child storage and migration (built; nothing changes on screen):** everything personal is saved per child: stars, rounds, helper levels, reviews and the practice-more list, finds and stickers, the name book, the last play per game, first-time flags and the attempt log (each entry also carries the child's id). Music and other device settings stay shared. On the first open after the update, all saved progress is copied to the first child, named from the setup page. The old keys are left untouched as a backup, and the migration is only marked done once the copy has been checked against the original; an interrupted migration simply runs again on the next open. The privacy test checks both children's real names (hashes only).
2. **The screens (built):** a first-run setup screen (at least one child to continue); the front door shows one big tile per child (at least 160 px, name and picture), and tapping it opens the bookshelf as that child; with 2 or more children the tiles show every time the app opens fresh, with 1 child the daily door rule stays. A small picture-only "switch child" button on the shelf returns to the tiles. A gear on the front door, behind a 3-second press-and-hold lock with a filling ring, opens the children page: add, rename (and change picture and color), or remove a child (asked twice; only that child's progress is deleted). Renaming restarts only that child's name book. After the migration the parent is shown the children page once. Screenshots: `docs/screenshots/slice-8a/`.

**Done when:**
- [ ] Nothing saved before the update is lost: it is all on the first child
- [ ] A star earned by one child never shows for another
- [ ] Six children's tiles fit at 1280 x 626 and 1280 x 800
- [ ] Removing a child deletes only that child's progress

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

### 9A — Lowercase (built)
Built in two pull requests.
1. **The letters:** a to z generated from exact lines and arcs in `data/glyphs.js` (plain print, true circles, straight sticks), with a default stroke plan and allowed alternatives for each. A fourth line: the brown tail line at 1.5 (it replaces the ground line at 1.3); capitals and digits keep their size. The dots on i and j are taps (`scoreDot`) in tracing and copying. `glyphs.html` shows them all.
2. **In the app:** the ABC book has a capitals page and a lowercase page, switched by a picture-only "A a" tile at the end of the grid (120 px tiles). Rounds, helper levels, reviews and stars work as for capitals, and each lowercase letter uses its capital's find scene. Round 3 compares lowercase with the lowercase set plus look-alike capitals and digits; size is the model's own height; b d p q, n u and m w turned into each other read as the other letter; l and I count as one shape; and a gentle line-position check (tails below the grass, tall letters above the fence, small letters between the fence and the grass). Screenshots: `docs/screenshots/slice-9a/`.

**Done when:**
- [x] Every lowercase letter plays all three rounds
- [ ] On the tablet: the page switch, a tail letter, b written as d, and P written for p behave as in the screenshots

Note: **Slice 6B is parked** until we have the school's phonics programme. `voice.html` (6A) stays as it is.

### 9B — Numbers 10 to 20
Two digits side by side, left digit first.

**Done when:**
- [x] 10 to 20 play all three rounds, and count scenes reach 20

### 9C — Write my name
Her name (from the setup page, written "Sara": a capital, then lowercase) on the four lines as one word, in its own book, first on the shelf. Built in two pull requests.
1. **The name book and rounds 1 and 2 (built):** the name book with her name on its cover and one big name tile (a grey parent line when no name is set, when it has characters other than a to z, or when it is too long for one line). The lines shrink to fit the name and keep that size in every round; every tolerance is at least 45 px on screen. Round 1 traces letter by letter with the full track and start dots, each letter lighting up gold; round 2 the whole name with the thinner track. When Jugnu draws a stroke, only that letter is traced again, once. A `name` log entry per round. The setup page shows how the name will be written, or why it cannot be. Changing the name starts its practice again. Screenshots: `docs/screenshots/slice-9c/`.
2. **Round 3 and the reward (built):** the copy-it round for the whole name (her strokes assigned to letters by position, each letter judged as on its own), the name glowing letter by letter, a name card with a gold star on her shelf of finds, and reviews. Screenshots: `docs/screenshots/slice-9c/`.

**Done when:**
- [ ] She traces her name letter by letter, then the whole name, then copies it
- [ ] Her name card is on her shelf of finds

### 9D — Words level
Short words made of letters she has starred (moved from 9C). They can join her name in the name book.

**Done when:**
- [ ] She can trace a three-letter word letter by letter, then see its picture

### 10 — Urdu
The 39 letters of the Urdu board, isolated (stand-alone) form only, in a plain Naskh print as in a qaida. Joined forms are out of scope. Six pull requests, each approved before the next starts:

- **10A** (built) — Shape method and six samples. Letters drawn with smooth curves (`curve` pieces in `data/glyphs.js`) on the four lines, the grass line as the Urdu baseline, following Noto Naskh Arabic. Samples ا ب ج د ع ے on `glyphs.html`, each over the faint font letter. The Noto Naskh Arabic font served locally (Urdu tiles and `glyphs.html`).
- **10B** (built) — All 39 letters, their default stroke plans and natural alternatives (body first, right to left, then dots and small marks), on `glyphs.html`. Letters that differ only in dots share one body. The small marks (the little ṭ, the madd) are a new stroke kind, `mark`, judged by their place. Qaida photos, if they come, replace the font as the model.
- **10C** — Copy-round judging for Urdu: the body by shape, then the dot count and whether the dots sit above, below or inside ("Almost! It needs two dots."). Look-alikes that differ only in dots are compared with each other. Child-style templates.
- **10D** — Urdu in the app: the board bright, rounds 1 and 2 (dots and marks as taps, `scoreDot`), practice pages (the pencil tile), reviews, per child.
- **10E** — Picture words and find scenes, once the word table is confirmed. Letters without a good word skip their scene.
- **10F** — **Dot Detective**: add the right dots to a body.

`recorder.html` support for Urdu moved to `docs/ideas.md`: the letters are generated, so the recorder is needed only for a hand-made override.

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
