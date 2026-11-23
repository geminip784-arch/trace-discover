# Trace & Discover — App Spec v3

Version 3.26 · Nov 23, 2026 · describes the app as built through Slice 5O part 3 (letter slots in name writing: a faint box per letter on the lines in her name's review and her name's practice screens 2 and 3, strokes given to letters by the slots, and the overlap rule); before it, Slice 5O part 2 (corrections always on top: before any reason shows, her ink goes faint and the correction is drawn above it; Jugnu rests in the button column, under undo); before it, Slice 5O part 1 (undo one stroke on every writing screen: a big picture-only button in the left column; in a copy it also cancels the judging wait); before it, Slice 10B (all 39 Urdu letters and their stroke plans on `glyphs.html`, with small marks as a new stroke kind; nothing she plays has changed); before it, Slice 10A (Urdu shapes: six sample letters drawn with smooth curves on `glyphs.html`, and Noto Naskh Arabic served locally for the Urdu tiles); before it, Slice 5L part 3 (her name's practice page: the name book's pencil tile, one practice space per screen, 3 screens a page, and her name's page sticker); before it, Slice 5N part 3 (Count, then pick the number: two levels in Match, which now shows its sets in two rows); before it, Slice 5N part 2 (Memory, a sixth kind of game: three levels, cards at least 120 px); before it, Slice 5M part 4 (Twemoji game pictures, never recolored; Odd one out's kind rows Twemoji and its color rows our paintings; our spider kept); before it, Slice 5M part 3 (Twemoji find pictures, CC BY 4.0, copied into the repo; teddy replaces toys; apple and tomato never share a scene or set; a credits screen); before it, Slice 5M part 2 (Odd one out made clear: a line and a rule picture per row, and a gold band joining the three that match); before it, Slice 5M part 1 (no game makes a move by itself: Jugnu never makes the first move for her); before it, Slice 8A (children's profiles: the first-run setup, the children's tiles at the front door, the switch-child button and the children page behind the gear's lock; part 1 saved every personal key per child and copied the old progress to the first child); before it, Slice 5L part 2 (page stickers on her shelf of finds); before it, Slice 5L part 1 (the practice page for letters and numbers: the boards' pencil tile and practice mode, three practice spaces, fireflies, never stuck and a fresh page); before it, Slice 5K part 1 (testing feedback: practising is rounds 1 and 2, and the copy-it round moved to reviews on later days); before it, Slice 9C (her name's book: three rounds, the reward, her name card and reviews; before it, Slice 9B: the numbers 10 to 20 on the 123 board, in all three rounds and in count scenes with ten-frames; before it, Slice 9A: lowercase letters on four lines; before it, Slice 6A: the voice recorder page and voice pack; and Slice 5J part 2: the fading helper, M and N from the bottom, direction coached, child-style templates, game instructions, show me, the U umpire), and where it goes next.

The order of the slices still to build is in `09-build-sequence.md`. What we dropped from v2, and why, is in **Retired** at the end.

## Vision and design principles

Trace & Discover is a short, daily writing-practice app for one 4-year-old girl. She traces English capitals, numbers and (later) Urdu letters with a firefly called Jugnu (جگنو, Urdu for firefly). It runs offline on her Samsung Galaxy Tab (11 inch, landscape, Chrome). There is no account and no server, and nothing ever leaves the tablet.

**Who it is built for**

| Her profile | What the app does about it |
| --- | --- |
| Strong vocabulary and counting | Talking and counting are the rewards, not the hurdles |
| Writing lags behind | Big strokes on wide paths first. Help fades over two tracing rounds, then she copies from memory on later days |
| Cannot read yet | She never needs to read. Prompts are pictures, sounds and Jugnu (spoken prompts come in Slice 6). Short lines in small type at the top are for a grown-up watching |
| Short attention span | One character takes two short rounds. A review is one copy. Every game ends after a few sets |
| Learning English and Urdu | Urdu has its own book on the shelf, not an add-on |

**Six design principles**

1. Play first, practice inside it. Tracing leads straight into a find or count scene.
2. Correct, never punish. A wrong start or direction gets a friendly demonstration. No red, no buzzer, no lost progress.
3. Speak everything. A 4-year-old finds her way by sound, pictures and her companion, never by reading.
4. Short and finite. Each activity ends by itself (a daily limit and goodnight come in Slice 12).
5. Paper is the finish line. The app is practice for writing with a pencil.
6. Make it hers. Her name, her family's voices (Slice 6), her own shelf of finds.

## The screens, as built

### Front door (Slice 8A: the children's tiles)

The front of a house with a closed door, and one big tile per child in front of it: the child's animal picture on their color, with their name under it (as big as fits, at least 160 px; one row, or two rows of up to 3; `childTileGrid` in `src/children.js`). A child taps their tile: the other tiles fade, the door swings open with a warm light and a door sound, and the bookshelf appears, as that child. A tap on the door itself wiggles the tiles.

- **When it shows.** With 2 or more children, at every fresh open of the app. With 1 child, the first visit of the day (by the tablet's own date); later visits that day go straight to the bookshelf. `?door=1` always shows it, and so does the shelf's switch-child button.
- **The gear** (bottom left, for a grown-up): press and hold for 3 seconds while a gold ring fills round it (`LOCK_MS`); a shorter press only wiggles it. Then the children page opens.

### First run and the children page (Slice 8A part 2)

A page for a grown-up (text is fine here): `src/setup.js`. It opens:
- on the **first run** (no child, or a child with no name yet): "Welcome! Who will play?" with the form open. It can only be left (Start) once there is at least one child and every child has a name;
- **once after the Slice 8A update** (`td.welcomed`), so a parent can add the other children; the first child already holds all the old progress;
- from the **gear** on the front door, after its lock; and at `index.html?setup=1`.

It lists each child (picture, name, how the voice says it) with Change and Remove, and Add a child (up to 6).
- **Add or change:** the name (a to z, as the name book needs; not another child's name; a line under it shows how the name book will write it, or why it cannot, or that it is too long for one line), how the voice should say it (optional, with Test voice), one of 8 animal pictures (cat, dog, rabbit, bear, owl, fox, elephant, fish) and one of 8 colors (the board tile colors; no red). A new child gets a picture and color no one has yet.
- **Changing a name** that the name book writes differently restarts only that child's name book (rounds, helper, star, review, practice-more entry and name card). A new picture or color resets nothing.
- **Remove** asks twice ("Remove Sara?", then "Are you sure? This cannot be undone.") and deletes only that child's keys (test-mode copies too). The last child cannot be removed. Ids are never given again, so a new child never gets old progress.
- **Done** goes back to the front door.

### Bookshelf (home)

Eight books stand on a shelf, left to right: **her name** (Slice 9C), **ABC**, **123**, **Urdu**, **Shapes**, **Games**, **Drawing**, **Stories**. Shapes and Stories are faint with a lock: a tap makes them wiggle and does nothing else (they come in Slices 11 and 12). Tapping an open book opens its cover, then its screen. A toy box on the shelf opens her shelf of finds.

The home button (top of the left column) always returns here. The back button goes one step up. The music button turns the music on or off.

### Her name's book (Slice 9C)

The first book on the shelf is hers: her name is on its cover (with no name set, four little writing lines). It opens to one big tile with her name, written as she will write it: a capital first letter and the rest lowercase, whatever the setup page holds ("sara" and "SARA" are both "Sara"). Since Slice 8A it is the playing child's name and book. Names live only on the tablet (`td.children`); the code, tests and docs only ever use made-up names.

- **When it cannot open.** The tile is faint and shakes, and one grey parent line at the top says why: no name set ("Add her name on the setup page"), a character other than a to z ("Her name can use the letters a to z only"), or too long for one line. The setup page says the same under the name field, naming each character it cannot use (space, hyphen, é...), or shows how the name will be written.
- **On the lines.** The whole name sits on the four lines as one word. Each letter is its own character file, with its own glyph and plans, box after box, so the spacing is normal print spacing. The name is centred in her writing room, right of the button column, so no letter is under a button. The lines shrink to fit it and keep that size in every round, reviews included: one unit is the smallest of a single letter's unit, the size that leaves room above the lines for the copy-it round's model card (2.3 units of height below the round lights), and the size at which her room is 1.2 times the name's width (`NAME_FIT` in `src/name.js`). Sara: 242 px at 1280 x 626 and 317 px at 1280 x 800; an 8-letter name such as Muhammad: 148 px; the widest 8 letters possible: 114 px. **Longer names:** the rule is the width, not the count: a name fits while its unit is at least 112 px on her tablet (most 9 to 11 letter names do); a wider one gets the "too long" line.
- **Never stricter than a single letter.** Smaller lines would narrow the tolerances on screen, so for her name every start radius, path tolerance and dot radius is at least 45 px (`withMinLeeway` in `src/geometry.js`). The thresholds in `DEFAULTS.stages` are unchanged, and single letters do not use the floor.
- **Round 1:** the full track of the whole name. Letter by letter, in order: the letter she traces now has its numbered start dot and arrow, and Jugnu flies each stroke first. Each letter is scored exactly as on its own (any allowed plan; a stroke traced the other way counts and is coached after the round). A finished letter lights up gold, with a chime.
- **Round 2:** the thinner track; only the next start dot of the letter she traces now.
- **Never stuck:** Jugnu demonstrates after 3 misses on a stroke and draws it after 5. Then only that letter is traced again, once; if Jugnu has to help again, it counts with help and she moves on. Any help means no gold star.
- **Copy it, in reviews (part 2; reviews only since Slice 5K):** the lines are empty and her name stands on a model card above them, centred in her room, as big as fits (up to 0.6 of a line unit per card unit); the lines move down under it, at the same size and place across as in rounds 1 and 2 (`nameCopyLayout` in `src/name.js`). Each letter on the card has its own numbered start dots and arrows (1, 2 within each letter). Jugnu writes her name once on the card, a little faster than a single letter (0.7 s a stroke), then she writes it anywhere on the lines.
  - **The fading helper** has its own level for her name (`td.helper`, under `name`; it moves as for a letter): level 1 the dotted ghost of her whole name and the first letter's start dot until she draws; level 2 one start dot per letter she has not begun (no numbers); level 3 nothing.
  - **When it is judged:** 3 seconds after her last lift (a new touch cancels the wait).
  - **Letter slots (Slice 5O part 3, after testing with her).** A faint box on the lines for each letter, so she can see where each one goes (`nameSlots` in `src/name.js`). Each is as wide as the letter's box in the model, with a small gap between boxes. It runs from the line its top reaches to the line its bottom reaches: sky to grass for capitals and tall letters, fence to grass for small letters, fence to the tail line for tails, and sky to grass for i and j (their dots). The slots fade with the helper: level 1 a faint fill and an outline, level 2 the outline, level 3 only small ticks on the grass line where each letter begins and the last one ends. Her name's practice screens 2 and 3 (no helper) show the outline.
    - *Her strokes go to the letters by the slots:* each stroke to the slot holding most of its length (the boxes touch for this; the gap is only drawn). A stroke that no slot holds at least 60% of is unclear, and so is a tap close to the edge of its box (an i's dot drawn a little to the side). If either of its two letters fails, the stroke is tried with the other letter, and it moves there if then both pass (an i's stick drawn between the M and the i goes to the i). If its own letter fails and moving it does not help, she is asked to rewrite the letter whose slot it started in. That slot glows, and the line is "Let's write the M again, inside its box."
    - *Written across the boxes:* when most of her ink is not over the slots, or her letters clearly look more like themselves read by place and shape (she wrote the whole name bigger or spread out, ignoring the boxes), her strokes are given by place and shape as before.
    - *Why it did not count:* the slot of the letter it is about glows gold on the lines, over her faint ink, as well as that letter on the card. Until Slice 5O part 4, her whole name then fades as before.
    - *Log:* each judged copy's `name` entry says whether the slots were used (`slots`) and lists each unclear stroke that was tried (`overlap`: its share, its two slots, where it started, and whether it moved or was unclear).
  - **How it is judged** (`src/name-copy.js`): her strokes are sorted left to right and given to the letters by where they are along the line: the cut whose groups look most like their letters (each group's $P distance to its own letter), with small costs for a group far from where its letter stands (measured from the left of her name, in line units, since she writes on the same lines), for a clear gap inside one letter's group, and for cutting between strokes that stand over each other (a's round and its stick). A letter may get no strokes (left out). Then each letter is judged exactly as it is on its own (shape, every part, size, and for lowercase where it sits on the lines), also compared with its own twin in the other case. The name passes when every letter passes.
  - **Stopped part way:** when the last letters are not written yet, nothing is judged: Jugnu writes the next letter on the card (a hint, never a fail, and not logged). Line: "Here is the next letter."
  - **Why it did not count:** the first letter that did not count, from the left, says why, and it glows gold on the card (or Jugnu draws what is missing on the card, a dashed outline shows the letter's size where hers stands, or the guide lines glow). The line names the letter: "Almost! The r is missing.", "Almost! That looks like n.", "Almost! The dot of the i is missing.", "Almost! The a is a small letter.", "Almost! The S is a capital letter." (a capital in the wrong place, read as its twin, or for twins of the same shape such as s and S, by its size), "Make the r bigger.", "Let the tail of the y go below the grass.", "Let's watch Jugnu write the r." Then her name fades and she writes it again. After 3 failed copies the review ends, with help.
  - **Habits coach, never fail:** stroke order, the letters written out of order, or a letter the other way round: she passes, and Jugnu writes those letters (the whole name, for the order) the usual way on the card once. Line: "Well done! Here is the usual way."
- **The reward (part 2):** her name glows letter by letter (her own writing; the model if Jugnu helped her out), and Jugnu flies loop-the-loops along the top of it with a trail of sparkles. Her **name card** goes on her shelf of finds: her name on the four little lines, two places wide, with a gold star once she has earned the name's star. Only one card is ever kept (a new one moves to the newest place); the card stores no name (`{ nm: 1 }`) and shows the name from the setup page. Then she goes back to the name book, where the star appears on the tile.
- **Star and reviews (part 2; Slice 5K):** practising her name is rounds 1 and 2, then the reward. The gold star needs both rounds with no help, as for a letter. Her name then comes back for review on the usual schedule (1, 3, 7 and 21 days), counted in the 2 a day, and first when reviews tie. When it is due, the name book glows on the shelf and the tile glows with the firefly light; a review is the copy-it round alone, with one round light. It goes on the practice-more list for the same reasons as a letter.
- **Changing the name** on the setup page starts its practice again: rounds, helper, star, review and practice-more entry are cleared, since it is a new word.
- **Log:** each tracing round adds a `name` entry with each letter's result (ok, helped, misses, wrong starts, strokes traced the other way), and each judged copy in a review a `name` entry with round 3 (the copy round's label in the log), the try, the helper level, review or not, pass or fail, the reason and the letter it is about, the letters' order, and each letter's result (ok, reason, strokes, look-alike, missing part, distance, mirrored, usual way). Its strokes are logged as usual, marked `in: 'name'`.

### Character boards: ABC, 123 and Urdu

Each board is a grid of large tiles, one per character, each in its own color. No tile color is red, and each one is dark enough to read on white.

- **ABC**: two pages, A to Z and a to z (Slice 9A). **123** (Slice 9B part 2): 0 to 20 in rows of ten, 0 to 9 on the first row, 10 to 19 on the second and 20 on the third, so each teen sits under its ones digit; the tiles are 95 px at 1280 x 626 and at 1280 x 800. **Urdu**: the 39 letters in qaida order, filling from the top right.
- **The ABC book's page switch (Slice 9A).** The book opens on the capitals page. The last place in the grid is a switch tile: a picture of "A a", the page it turns to big and bright, the page she is on small and faint, on a white tile with a dashed gold edge and a folded page corner (no text, no star). A tap turns the page: a pop, and the tiles slide across. With 26 letters and the switch, the tiles are 120 px at 1280 x 626 (7 columns, 4 rows). Each lowercase letter has its capital's color. When a letter on the other page is due for review today, the switch glows and carries the firefly light too. After a letter and its scene she comes back to that letter's page.
- A tile is bright (tappable) when its character file exists in `data/chars/index.json`. Today every capital, digit and lowercase letter is bright. Urdu tiles stay faint until Slice 10D. Since Slice 10A they are drawn in Noto Naskh Arabic Bold, served from `assets/fonts/`.
- A character she has finished with no help from Jugnu shows a gold star on its tile.
- A character due for review today glows gently and carries a small firefly light (see **Reviews** below).
- Tapping a bright tile pops it and opens the writing screen.
- **The pencil tile (Slice 5L).** The ABC and 123 boards end with one big pencil tile (in ABC just after the "A a" switch, on both pages). A tap turns the board's practice mode on: the pencil tile glows gold, each starred tile wears a small pencil badge and opens its **practice page** (below), and every other tile is faint and wiggles. A second tap turns it off. Turning the ABC page keeps it; leaving the board (home, or a practice page) ends it. With the pencil tile every tile is still as big as before: 120 px on ABC and 95 px on 123 at 1280 x 626 (`boardTileCount` in `src/session.js`; tests check every board stays at least 88 px). Urdu has no pencil tile yet.

### Writing: two practice rounds, and copying on review days

Each character is practised in two rounds (`ROUNDS` in `src/progress.js`; 2 to 4 allowed). Two round lights at the top show done, now and to come. Then the letter glows, she gets her star, and the find or count scene opens. The copy-it round (Stage 3) is a review on a later day (**Reviews**, below), with one round light.

| Round | Stage | What she sees | Help given |
| --- | --- | --- | --- |
| 1 | Dots | The letter's track, numbered start dots, arrows. Jugnu flies each stroke first | Wide path |
| 2 | Ghost | A faded track. Only the next start dot glows | Narrower path |
| Review | Copy it | Empty lines, and the finished letter on a small model card at their right end, with a numbered start dot and an arrow on every stroke. Jugnu draws it once on the card | The fading helper on the lines (below). Her whole letter is judged at the end |

**Why copying moved to review days (Slice 5K, after testing with her).** Copying straight after two tracing rounds mostly tests what she has just seen, and it made each practice longer. Copying from memory a day or more later shows what she has really kept, and each review is the practice that makes it stick (spaced retrieval). So a practice is now short (trace, trace, star, scene) and the copy-it round, with its helper levels, judging and reasons, comes back on the 1, 3, 7 and 21-day schedule.

**Progress from before Slice 5K.** A practice saved part way through the old round 3 had already finished rounds 1 and 2, so it counts as finished the first time the app opens: its star if no help was used, and its first review the next day either way (her name also gets its name card). Stars, helper levels, review dates and the practice-more list are kept as they were (`finishOldPractices` in `src/storage.js`).

- Strokes must be drawn in order, in one of the character's **allowed stroke plans** (Slice 5J, below). Stroke k of her plan is compared with stroke k of that plan. Some letters also accept known joined versions (for example, both strokes of 4 in one go).
- **Never stuck.** After 3 misses in a row on one stroke, Jugnu demonstrates it. After 5, Jugnu draws it himself and the round starts again. The stage never drops inside a round.
- **The star.** A round counts only when she drew every stroke herself. The gold star needs both rounds with no help: no assist, and no demonstration after misses in round 2.
- When round 2 is done, the whole letter glows, then the find or count scene opens.
- If she leaves mid-way, the next visit resumes at the round she left (`td.rounds`).

**Stroke plans (Slice 5J).** Each character has a short list of allowed ways to draw it, all built from the same exact lines and arcs, so every plan has the same shape (`data/glyphs.js`; each plan is a card on `glyphs.html`). The first is the default: the one the model card, the numbered dots and Jugnu show.

| Character | Default | Also allowed |
| --- | --- | --- |
| B | stem, both bumps | stem, top bump, bottom bump |
| E | stem, top, middle, bottom bar | stem and bottom bar (an L), top bar, middle bar |
| G | curve, bar | curve and bar in one |
| H | stem, right stem, bar | stem, bar, right stem |
| K | stem, arm, leg (the leg starts at the stem, where the arm ends) | stem, then the "<" in one |
| L, 1, 7 | 2 strokes | in one go |
| M | stem, then slants and right stem | stem, slant, slant, right stem; one stroke from the bottom left (up, down, up, down) |
| N | stem, then slant and right side | stem, slant, right side; one stroke from the bottom left (up, diagonal down, up) |
| R | stem, bump, leg | stem, then bump and leg in one |
| T | stem, top bar | top bar, stem |
| V | one stroke | two slants |
| W | one stroke | two V's |
| X | first slant, second slant | the other slant first |
| Y | left arm, then right arm and stem | left arm, right arm, stem |
| Z | one stroke | top bar, slant, bottom bar |
| 2 | one stroke | curve, then foot |
| 3 | one stroke | top bump, bottom bump |
| 4 | stem, slant, bar | slant and bar, then stem |
| 9 | circle, stem | circle running into the stem |

No plan runs any part the other way, except M and N from the bottom (their stem runs up). In rounds 1 and 2 the default plan's track and dots show until her strokes leave it; then her plan's track, next start dot and Jugnu's help follow. Start is still checked for every stroke; direction is coached (below).

**Copy it (reviews; Slice 5I, judged by shape since 5J, reviews only since 5K).** She writes the whole letter herself, anywhere on the lines (`src/copy.js`).

- **The fading helper (Slice 5J part 2).** Each character has its own helper level for the copy-it round (`HELPER` in `src/progress.js`, saved in `td.helper`). Level 1, where every character starts: a faint dotted ghost of the letter on the lines, and the first stroke's start dot until she draws. Level 2: a numbered start dot for each stroke still to draw, following the plan her strokes read as so far (an E with its L first leaves the top and middle bars' dots; two strokes that start together slide apart). Level 3: nothing. A character moves up a level after 2 passed copies at its level with no hint during them (across sittings, not necessarily in a row), and drops back one level after 2 failed copies in a row, at once, so her next try has more help. Levels carry from one review to the next. Shape judging never depends on it.

- **When it is judged:** at once when her letter passes (all its strokes, or fewer that already make a good letter, such as L in one go). A whole letter that would fail is judged 2 seconds after her last lift (Slice 5O: so she can undo a slip in her last stroke first): as many strokes as the letter's longest plan has, or fewer that read best as the whole letter joined. The same holds in practice spaces 2 and 3. Her name is never judged at once: always 3 seconds after her last lift. A new touch cancels the wait; turning the tablet upright pauses it.
- **Stopped part way:** fewer strokes that read best as the start of the letter are not judged. After 5 seconds Jugnu draws the next stroke on the model card as a hint. Her strokes stay on the lines, and the hint is neither a failed copy nor logged. (To tell the two apart, her strokes are fitted to each way of reading them, "the first strokes" or "the whole letter, joined", and the closest reading wins.)
- **How it is judged (Slice 5J): shape only.** Her letter, as a cloud of points, is compared with every character on its board, in every plan and every child-style shape (below), by the $P point-cloud recognizer (Vatavu, Anthony and Wobbrock, 2012; BSD license, credited in `src/pdollar.js`). Stroke count, order and direction make no difference. A few look-alikes from the other board are compared too (S and 5, Z and 2, O and 0, I and 1, B and 8, G and 6). A lowercase letter (Slice 9A) is compared with every lowercase letter and the capitals and digits that look like one (C O S U V W X Z P K Y J I, 0 1 2 5 6 9); capitals are never compared with lowercase. She passes when:
  - her letter is nearest the target (O and 0 count as each other, since children write them the same way); in a close call the letter whose lines lie closer to her ink wins, and the target gets a little benefit of the doubt;
  - it is near enough to count as a letter, and most of her ink lies along it (a scribble fails);
  - every part of the target has her ink near it (an A with no crossbar fails);
  - her letter is 75% to 125% of the model's height (a lowercase letter: always its own height, small 0.5, tall or tail 1). It may be up to 1.5 times wider or narrower than the model;
  - a lowercase letter sits where it belongs on the lines (below).
- **Child-style shapes (Slice 5J part 2).** Six extra templates, used only for judging and never shown (`data/child-shapes.js`): M with its middle point at 0.6 or 0.72 (the model's reaches the grass line), a splayed M, N with a short diagonal (to 0.8) and right side, W with its middle peak down to 0.4, and B with a small top bump and a big bottom one. A letter nearest one of them is checked part by part against it; a missing part is shown as the model's part of the same name. No limit was loosened. Against crude test letters (wobbly, uneven, slanted, `tests/crude-letters.js`, `npm run crude-report`), 123 of 124 pass, and 140 of 144 crude wrong letters (C for G, F for E, P for R, and more) still fail.
- **Habits coach, never fail.** Her start points, directions, stroke order and plan are read against each plan (Stage 3 tolerances) and logged. If they differ from the default plan she still passes, and Jugnu replays the usual way once on the model card.
- **Lowercase (Slice 9A).**
  - *Same shapes.* l and I count as each other, like O and 0 (i's lines are that stick too, and j's are J; their dots are checked on their own). So does each lowercase letter that is its capital made smaller (c C, o O, s S, u U, v V, w W, x X, z Z, p P): it passes on shape, and the size check then asks a capital-sized one to be smaller ("Make it a little smaller.").
  - *Turned letters.* b, d, p and q have no "written the other way round" shape: a mirrored or flipped one is another letter, so a d written for b fails with "Almost! That looks like d.", never the mirrored coaching. The same for n and u, and m and w, turned upside down. A turned letter is read as its partner ahead of a look-alike digit nearly as close (a p turned round is a q, not a 9), and a capital look-alike is named by its lowercase twin ("That looks like u").
  - *Two more child-style shapes:* m with pointed tops and w with round bottoms (children write both; they also make an upside-down m read as w and an upside-down w as m).
  - *Parts judged on their own ink.* Where two parts of a lowercase letter run over each other (u's stick comes back down its cup), each is judged only on the stretch that is its own. Capitals are judged as before.
  - *Line position.* Where a lowercase letter sits is part of the letter (p and P have the same shape and height). After shape and size: a tail letter (g j p q y) needs ink at least 0.15 below the grass line; a tall letter (b d f h k l) needs ink at least 0.2 above the fence (t: 0.1); a small letter needs at least 70% of its ink between 0.15 above the fence and 0.15 below the grass (`POSITION` in `src/copy.js`). Capitals and digits are never checked.
  - Against crude lowercase test letters (wobbly, slanted, a round left open, a stick a little away, every plan, `tests/crude-lower.js`), 186 of 186 pass.
- **Numbers 10 to 20 (Slice 9B part 2): each digit judged on its own.** Her strokes are split into a left and a right digit at the widest gap between them (with no gap, a number-wide letter is cut where both halves read best as the two digits; a narrow one is a single digit). Each half is judged exactly as that digit is on its own (shape, every part, size), and the whole number must be 75% to 125% of the model's height. Both digits must be right. A digit is compared with 0 to 9 and its look-alike only, never with 10 to 20, so single digits are judged as before. Habits are read on the whole number: the right digit first passes, and Jugnu shows the usual way. A reversed digit passes and is coached. Why a number did not count:
  - a wrong digit: "Almost! That looks like 13." (the number it makes), or the part of the digit that is missing: "Almost! The slant of the 7 is missing.";
  - the digits swapped (21 for 12; a whole number turned round in a mirror too): "Almost! The 1 comes first." Her number shows beside the model;
  - a digit left out: "Almost! The 7 is missing." Jugnu draws that digit on the model card;
  - too small or too big: as for any letter.
- **Wide numbers on the full screen (Slice 9B part 2).** The lines shrink a little for a character too wide to write at 125% beside the model card (`fitUnit` in `src/render.js`): only 20 on the full screen (1280 x 800), whose unit goes from 440 to 388 px. It keeps that size in every round. Every other character keeps its size.
- **Mirrored.** A letter written the other way round passes (not b, d, p or q, above). Jugnu then shows the right way round once on the card, and the letter goes on the practice-more list (reason "mirrored"). Reversals are a direction cue, never an error.
- **Pass:** a chime, sparkles along her strokes, the round light comes on, and her own letter glows.
- **Fail: why, first.** Before her letter fades, the screen shows why, with no red and no sound:

| Why | What she sees | Parent line |
| --- | --- | --- |
| Looks like another letter | A small copy of her letter on a card beside the model; the part she left out glows gold on the model | "Almost! The leg is missing." or "Almost! That looks like V." |
| Size | A dashed outline at the right size, standing on the lines where her letter is | "Make it bigger." / "Make it a little smaller." |
| Line position (lowercase) | The guide lines it should reach or sit between glow gold: the grass and tail lines, the sky line and the fence, or the fence and the grass | "Let the tail go below the grass." / "Make the stick reach up high." / "Keep it between the fence and the grass." |
| Missing stroke | Jugnu draws the missing part on the model | "Almost! The bar is missing." |
| Not recognizable | Jugnu traces the whole model slowly | "Let's watch Jugnu write it." |

  **Corrections always on top (Slice 5O part 2).** Before any of these shows, all her ink on the screen goes faint (`INK.faintAlpha`, over `CONFIG.faintMs`), so the glowing part, Jugnu's drawing, the size outline or the glowing lines are always seen on top of it: they are drawn on the effects layer, which lies above her ink. This holds in reviews, practice spaces 2 and 3, her name's copy round and her name's practice screens 2 and 3. Her faint ink stays until the reason is over.

  Then her letter fades (the one place the app fades her whole letter: it makes room for a fresh copy), and she tries again. Any other ink of hers (space 1 of a practice page, an earlier space) comes back to full.
- **Never stuck:** after 3 failed copies the review ends, with help (a failed review: back to 1 day).
- Her ink in the copy round never dims: nothing is judged until she has finished.

**Undo one stroke (Slice 5O part 1, after testing with her).** Every writing screen (rounds 1 and 2, the copy round in reviews, the letter and name practice pages, and her name's rounds) has a big picture-only undo button in the left column, below back: a curved arrow, 96 px (`src/undo.js`; the shell's `#undo`, which the games' "show me" never shares). Each tap takes away her last stroke and what it scored:

- **Tracing** (rounds 1 and 2, practice space 1, name practice screen 1): her last stroke that counted goes; that stroke is the one to trace again (its start dot comes back, and in round 1 Jugnu shows it again). In her name, only strokes of the letter she traces now; a letter that lit gold stays. A stroke that did not count fades by itself and changed nothing, so undo skips it (its miss stays counted).
- **Copying** (a review, practice spaces 2 and 3, name practice screens 2 and 3): her last stroke goes, and the judging wait is cancelled: nothing is judged until her next stroke (the 5-second hint still comes if she stopped part way). Only a letter that passes is judged at once; one that would fail waits the 2 seconds, so a slip in her last stroke can be undone before it is judged (her name always waits 3 seconds).
- **Never undone:** a finished round, a finished practice space, a judged copy, or a stroke Jugnu drew (and nothing before it).
- **Disabled** (faint, taps do nothing) when there is nothing to undo, while her finger is down, while Jugnu demonstrates or draws, while a reason or a reward shows, and while the tablet is upright. On a finished practice page the next-page tile takes its place.
- **Logged:** each undo is an `undo` entry in the attempt log (`{ type: 'undo', char, mode: 'trace' | 'copy', stroke, ... }`); the entry of the stroke it took back stays, so a replay shows what she really did.

**Feedback rules** (every round)

| What happens | App response | Never do |
| --- | --- | --- |
| Starts in the wrong place | The start dot pulses and Jugnu hops onto it. Line: "Start at the glowing dot." | Red cross, buzzer |
| Goes the wrong direction (rounds 1 and 2) | Along the track from its far end, it counts (Slice 5J part 2): her ink keeps glowing, and after the letter Jugnu flies that stroke the usual way once. Line: "That counts! Here is the usual way." A parent switch for strict direction is planned (Slice 8) | Erase her whole letter |
| Wanders off the path | The trail dims. She carries on from where she left it. Line: "Stay on the track." | Snap her line onto the path |
| Finishes a stroke well | The trail sparkles, one soft chime | A big celebration after every stroke |
| Finishes the character | Her letter glows | Anything that interrupts with menus |

### Reviews and the practice-more list (Slice 5I)

Letters come back on later days, so what she has learned stays learned (`src/review.js`, saved in `td.reviews`).

| What happened | When it is next due |
| --- | --- |
| She earned the letter's star (rounds 1 and 2 with no help) | 1 day later |
| A passed review | The next interval: 3 days, then 7, then 21. Passing the 21-day review graduates the letter: no more reviews |
| A failed review (3 failed copies) | Back to 1 day |
| A practice finished only with Jugnu's help | Back to 1 day, even for a graduated letter |
| A sitting that puts it on the practice-more list | Back to 1 day |
| A clean replay of a letter already on the schedule | No change, so replaying never undoes her progress |

- **What she sees.** On a board, today's due letters glow gently, with a small firefly light at the corner opposite the star. On the bookshelf, a book holding one of them glows softly. No text.
- **A review** is the copy-it round (one round light; since Slice 5K the only place it is used), then the letter's find scene, pass or fail. A review never adds or takes away a star, and never touches a practice she left part way.
- **Never homework.** At most 2 letters are due each day: most overdue first, ties in board order (ABC capitals, ABC lowercase, 123, Urdu). They are picked the first time she sees the shelf or a board that day, and stay fixed all day; a finished review is not replaced by another.
- **Days** are the tablet's calendar days. An overdue letter waits for her, and its next interval counts from the day she does the review.
- **Stars from before Slice 5I** were added to the schedule once, due from the day after the update.

**The practice-more list** (`td.practiceMore`, for the Slice 8 parent zone). A letter goes on it, with its reasons, when one sitting (a practice or a review) has any of:

- Jugnu's help (an assist, a demonstration after misses in round 2, or 3 failed copies in a review)
- 2 or more failed copies
- 3 or more wrong starts
- a copy that passed written the other way round (mirrored, Slice 5J)

It then comes due after 1 day. One clean passed review (no reason to be on the list) takes it off. A review that passes but earns a reason keeps it on, due the next day.

### The practice page (Slice 5L)

Extra practice for a letter or number that already has its gold star, opened from the board's practice mode (the pencil tile, above). It is extra: it never changes stars, rounds, reviews, helper levels or the practice-more list (`src/practice.js` and `src/practice-game.js` never call them; a test checks).

- **The page.** One set of four lines with three practice spaces side by side, in her writing room right of the buttons, a faint dashed line between them. Each space is as wide as the biggest copy that passes (1.25 times the letter, plus a little to spare). The lines keep a single letter's size when three spaces fit, and shrink when they do not: at 1280 x 626, 35 of the 73 characters are smaller, the smallest being 20 at 186 px (G and O 220 px); every tolerance keeps the 45 px floor (`withMinLeeway`). The space she is on has a soft gold wash behind it. Her ink counts for that space wherever she writes (the whole screen stays writable).
- **Space 1:** the dotted letter to trace, with numbered start dots and arrows; Jugnu flies each stroke first, as in round 1, and a stroke traced the other way counts and is coached. Never stuck as in round 1: Jugnu shows a stroke after 3 misses on it and draws it after 5, and the space then counts as done, with help (it never starts again). Once traced, it stays on the page, lit gold, as her model.
- **Spaces 2 and 3:** blank. Jugnu writes the letter once on space 1, then she writes it on her own in her space. It is judged exactly like the copy-it round (`scoreSpace`: when it is judged, the hint when she stops part way, shape, every part, size and line position), with no helper on the lines. Why a copy did not count is shown the same way, on space 1 in place of the model card: the part she left out glows gold there (or the whole model, for a different letter), Jugnu draws the missing part or traces the whole model there, a dashed outline at the right size stands in her space, or the guide lines glow across her space. The same parent lines (`copyNote`). Then her letter fades and she tries again. Habits (order, direction, a letter the other way round) pass, and Jugnu shows the usual way on space 1.
- **Never stuck:** after 3 failed copies in a space, her letter fades and Jugnu writes the letter in that space; it stays there, lit gold, and the space counts as done, with help.
- **Fireflies.** Three firefly lights at the top right, in place of the round lights: faint, now (a green ring) and lit. Each finished space lights one, with a chime.
- **A fresh page.** When all three are done, her whole page glows, Jugnu says well done, and a big picture-only arrow tile (120 px: a lined page and a green arrow) appears in the left column between back and music, with Jugnu perched on it. A tap gives a fresh page with the same letter: space 1 guided again, spaces 2 and 3 blank. She can leave at any time with back (to that letter's board page, practice mode off) or home.
- **Log:** a `practice` entry for space 1 when it is traced (misses, wrong starts, strokes traced the other way, helped) and for every judged copy in spaces 2 and 3 (the try, pass or fail, the reason, helped, and the copy-it round's details under `copy`), each with the page number of the sitting and the space. Her strokes are logged as usual, marked `in: 'practice'`. `?practice=A` opens A's practice page straight away (for checks).
- **Page stickers (part 2).** Each full page adds one to that character's page count (`td.pages`: `{ [id]: pages }`) and moves its page sticker (`{ pg: id }`) to the newest place on her shelf of finds: one sticker per character, never more (`addPageSticker` in `src/finds.js`, saved by `savePracticePage` in `src/storage.js`). Nothing else is saved: stars, reviews, helper levels, rounds and the practice-more list stay as they were (a test checks every other key).
- Screenshots: `docs/screenshots/slice-5l/`.

**Her name's practice page (Slice 5L part 3).** Extra practice for her name once it has its gold star, for the child playing, with the name from their own profile. The same rule as above: it never changes stars, rounds, reviews, helper levels or the practice-more list (`src/practice.js` and `src/name-practice-game.js` never call them; a test checks).

- **Entry.** The name book has the same pencil tile as the ABC and 123 boards (120 px), beside her name tile. A tap turns practice mode on (the pencil tile glows gold) and a second tap turns it off; leaving the book ends it. In practice mode her name tile wears the pencil badge and opens the name practice page once it has its gold star (`nameTile` in `src/session.js`); without the star, or when the name cannot be written, it is faint and wiggles. Back from the page returns to the name book, practice mode off. `?practice=name` opens it straight away (for checks).
- **The page.** One practice space per screen, at the name book's own line size (the same unit in every screen, `nameScreenLayout`), and 3 screens make one page. The 3 firefly lights at the top right span the three screens. Every tolerance keeps the 45 px floor (`withMinLeeway`).
- **Screen 1** is traced letter by letter, exactly like the name's round 1: the full track, the letter she traces now with its numbered start dot and arrow, Jugnu flying each stroke first; a stroke traced the other way counts and is coached after the screen. Never stuck as in round 1: Jugnu demonstrates after 3 misses on a stroke and draws it after 5; then only that letter is traced again, once. Any stroke Jugnu drew means the screen is done with help.
- **Screens 2 and 3** are written on her own: the lines are empty and her name stands on the model card above them, as in the name's copy round (`nameCopyLayout`). On screen 2 Jugnu writes it once on the card, noticeably faster than in the copy round (0.4 s a stroke and 0.2 s between strokes, against 0.7 s and 0.4 s); if she touches the screen while he writes, the card is finished at once (Jugnu goes straight home and her stroke starts; he never pauses). On screen 3 her name is already written on the card with no demonstration, since she has just watched it on screen 2 (`nameCardDemo` in `src/practice.js`). Then she writes it on the lines. It is judged like the copy round (`scoreName`, 3 seconds after her last lift), with its letter-by-letter reasons shown on the card and the same parent lines ("Almost! The r is missing."); stopped part way, Jugnu writes the next letter on the card (a hint, not a fail). There is no helper on the lines. After a failed copy her name fades and she writes it again; after 3 failed copies Jugnu writes her name on the lines, it stays there lit gold, and the screen counts as done with help. Habits (order, a letter the other way round) pass, and Jugnu writes those letters the usual way on the card.
- **A fresh page.** After screen 3 her name glows letter by letter, and the big arrow tile offers a fresh page, starting again at screen 1.
- **The page count and sticker.** Each full page adds one to the name's page count (`td.pages` under `name`) and moves her name's page sticker (`{ pg: 'name' }`) to the newest place on her shelf: her name on a little lined page, two places wide like her name card, with the stack of sheets and the count in a gold badge. The sticker stores no name: the shelf shows the playing child's name from their profile. Changing the name on the setup page clears the name's page count and sticker (as it does the name card).
- **Log:** a `practice` entry (`char: 'name'`) for screen 1 when it is traced, with each letter's result (ok, helped, misses, wrong starts, strokes traced the other way), and for every judged copy on screens 2 and 3 (the try, pass or fail, the reason, helped, and the name copy's details under `copy`, letter by letter), each with the page number and the screen (`space`). Her strokes are logged as usual, marked `in: 'practice'` and `of: 'name'`.
- Screenshots: `docs/screenshots/slice-5l/name-*.png` and `shelf-name-page-sticker.png`.

### Find scenes (letters) and count scenes (numbers)

After a letter's last round, a place appears with 7 objects standing in it. The places are the living room, kitchen, study, bedroom, farm-garden, zoo and sea. Three of the objects start with her letter (two for Q, U and Z, which have only two pictures), and the rest do not.

- She taps the ones that start with her letter. Each found object glows, plays a small animation and flies into a basket.
- A wrong tap shows that object's own word for 2 seconds, with no sound.
- After 10 seconds with no find, the objects still to find wiggle once.
- **Which place.** The scene uses the place that holds the most of that letter's pictures (a tie is picked at random). It takes as many objects as it can from that place. When it has to borrow from another place, it takes portable things (food, toys, small objects) before animals, so a horse never turns up in the kitchen.
- **Sound-first words.** Every find word starts with the letter's sound, not its name (Slice 5G). The full list and the object-to-place table are on `finds.html`.
- **No scene.** X has no pictures, so it skips the scene and goes straight back to the board and the star. U has two since Slice 5J part 2 (umbrella and umpire): its scene opens in the living room, where both are.
- **Kept pictures.** Ice cream and eraser are kept out of find scenes and the Letter to picture game, but their pictures stay: her saved finds of them still show on her shelf, and ice cream stays in the Shadow game.
- Count scenes keep the four rooms.
- **Twemoji pictures (Slice 5M part 3).** Most find pictures and countable things are Twemoji emoji (CC BY 4.0, from `@discordapp/twemoji` 17.0.3), copied into `data/twemoji.js` by `npm run twemoji` (`tools/twemoji.js`, which accepts only plain shapes), so nothing loads from the network. The rule: a picture is Twemoji only when it makes her say the word. Our drawings stay for alligator (the emoji would be said "crocodile"), queen ("princess"), nut ("peanut"), lamp and milk, and for the words with no fitting emoji (eraser, fan, fork, ink, lunchbox, igloo, jug, kettle, quilt, sock, umpire, vase, yak, yogurt, zip). The kept drawings lost their little faces so they sit well beside the flat emoji; the queen and the umpire keep eyes and a smile, and the alligator and the yak their animal eyes. Among the countable things, sock (the emoji is a pair), block (only a brick exists) and tomato keep our drawings. Each Twemoji picture stands in the same 200 x 240 box with a ground shadow and hops, wobbles, swings or (the heart) beats when found. **Toys became teddy** (same T sound, one teddy bear) everywhere: the find word, Letter to picture, the voice script and the Shadow game; old saved finds of toys show the teddy. Letter to picture, Shadow, Missing piece and the number groups show these pictures; the games' own things switched in part 4 (below). Review sheet: `docs/screenshots/slice-5m/review-sheet-find-pictures.png`.
- **Look-alikes (Slice 5M part 3).** Twemoji's apple and our tomato are both round and red, so they are a look-alike pair (`LOOKALIKES` in `data/finds.js`): they never share a find scene, a count scene, a Letter to picture set or a Shadow set.

After a number from 1 to 9, three placemats appear, each holding a different count of small things (eggs, cups, flowers…). She taps the mat with her number of things. It moves to the middle, and she taps each item once to count it; the numbers appear in the order she taps. Sometimes one item is golden. 0 has no count scene.

**10 to 20 (Slice 9B part 3): ten-frames and counting on.** The things stand in ten-frames: two rows of five per ten, the first frame filled first, then the extras in the second frame row by row, its empty places faint (17: a full frame and 7 more). Every group shows both frames, so the three are drawn at the same size. The three placemats stand one above another, each as wide as fits (560 px at 1280 x 626, at least 88 px tall). The two wrong groups are also 10 to 20, and all three counts are at least 3 apart (`TEEN_APART`). The chosen group moves to the middle (each thing about 108 px), and she counts on: one tap on the full ten-frame counts ten (it glows gold and shows 10; for 20 the second full frame shows 20), then each extra counts on from 11. A tap on an extra before the ten does not count, and the frame pulses. The counting note climbs half a step per extra, so 20 is no higher than 9. Her shelf of finds keeps groups up to 20, drawn in ten-frames.

Every find and every counted group joins her collection.

### Her shelf of finds

The toy box on the bookshelf opens her collection: the newest 24 finds stand on wooden planks, and her name card (Slice 9C) once she has written her name, and a page sticker for each letter or number she has filled a practice page with (Slice 5L part 2), and one for her name (Slice 5L part 3, two places wide). A sticker is the letter, in its tile color, on a little lined page, with a stack of sheets behind it (one per page she has done, up to 5 in all) and the number of pages in a gold badge at the top right; it takes one place on a plank. Another page moves it to the newest place, with the new count. These are the objects she found and the groups she counted. Up to 500 are kept (`td.finds`).

### Games book

A two-step menu, so the tiles stay big as more games come:

1. **Kinds.** Opening the book shows one row of 6 big picture tiles, one per kind of game: Match, Follow the path, Sort it, Odd one out, Missing piece, Memory (Slice 5N). Each picture is a small fan of cards with that kind's first set on the front. Under it, a tiny gold star for each of that kind's sets she has finished (no numbers).
2. **Sets.** Tapping a kind shows its sets (the rows below) as one row of big tiles; Match's seven show in two rows (the five draw-a-line sets, then Count's two levels below), still 200 px (`menuRows` in `src/games.js`). Each game ends after a few sets, and finishing one gives its tile a star. Missing piece levels 2 to 4 and Memory levels 2 and 3 are faint and wiggle until earned.

Back goes up one step: from a game to its kind's sets, from the sets to the kinds, from the kinds to the bookshelf. Finishing a game also returns to its kind's sets, where the new star appears. Home always goes to the bookshelf. Tiles are 200 px at 1280 x 626 (never under 140 px; `src/games.js` `menuTileSize`); with six kinds the first step's tiles are 163 px. Every game keeps its own id, so stars, last plays and log entries from the one-step menu carry over.

| Kind | Sets | How it plays |
| --- | --- | --- |
| Match (draw a line) | Numbers to things, Colors to things, Letter to picture, Thing to its shadow, Shape to thing | Two columns of 4 cards. She draws a line from each card to its partner. 3 sets make a play |
| Match: count, then pick the number (Slice 5N) | Levels 1 and 2 | A group of things she counts by tapping each, then three number tiles; she taps how many. 3 groups make a play |
| Follow the path | Animals to homes, Furniture to rooms | Three crossing roads. She traces each traveller's road to its home |
| Sort it | By color, By kind | Six things along the top. She drags each into the right one of two baskets. 2 boards make a play |
| Odd one out | By kind, By color | A row of four cards. She taps the one that is different. 5 rows make a play |
| Missing piece | Levels 1 to 4 | Three shapes, each with a gap; she drags the piece that fits from a row below. 3 rounds make a play |
| Memory (Slice 5N) | Levels 1 to 3 | Cards face down; she turns two. A pair stays face up. One board makes a play |

**Help in every game (Slice 5J part 2).**

- **Instruction line.** Each game shows one short parent-facing line in small grey type at the top, the whole time she plays (`GAME_NOTES` in `src/notes.js`): Match "Draw a line to its partner", Follow the path "Trace each road home", Sort it "Drag each thing into its basket", Odd one out a line for each row's rule (below), Missing piece "Drag each piece into its gap", Memory "Find two cards that are the same", Count, then pick the number "Count them, then tap the number" (its own line, in place of Match's: `SET_NOTES`).
- **Show me.** A picture-only button in the left column (Jugnu with a play mark, 96 px, under back) replays Jugnu's demonstration on the current set without making the move for her. Match: he draws the line for a pair she has not matched, and it fades. Follow the path: he flies a road whose traveller is not home, and his trail fades. Sort it and Missing piece: he carries a thing (or the right piece) to its basket (or gap), and it slides back. Odd one out: he looks along the row and points at the different card; she still taps it. Memory: every card still face down peeks face up for 1.5 seconds, then turns back. Count, then pick: while she counts, the things still to count breathe (level 2, before the ten: the full frame pulses); once the tiles are out, Jugnu points at the right one, and she taps it. Taps wait while he shows. A replay goes in the log as help (type `game-help`), never as her move: no answer, never a try, never towards a hint.
- **Odd one out's demonstration** (show me) is slow enough to follow, about 5 seconds (`ODD_DEMO` in `src/games.js`). Since Slice 5M Jugnu hops onto the three cards that match only, each lifting a little while he looks; then the gold band (below) joins them to the rule picture; he pauses, flies to the different one and points at it. She taps it herself. The band stays until the row ends.
- **Odd one out, made clear (Slice 5M).** Each row has its own instruction line, by its rule (`ODD_NOTES` in `src/notes.js`; `oddRule` in `src/games.js`): color rows "Find the one that is a different color"; kind rows name what the three share: "Find the one that is not a fruit", "…not a toy", "…not an animal", "…not something to wear". A picture of the rule sits in a round frame above the row, centred under the progress dots (104 units): a paint drop in the three's color, a fruit bowl, the toy box, a paw print or a clothes hanger (`oddRuleArt` in `data/games.js`). The rule is shown to her as a picture; the line is for a grown-up. When she taps the right card it glows with a chime, and the three that match turn pale gold with a gold outline, joined to the rule picture by a gold band: a line across above the row with a drop to each of the three and none to the odd one (where the odd card sits between them the line hops over it in a small arch), and a stem up to the picture (`oddBand`). The row then waits 2 seconds, so she sees why. A wrong tap stays silent: the card wiggles, as before. The row now sits a little lower (y 380) to make room. Screenshots: `docs/screenshots/slice-5m/`.

**No automatic moves (Slice 5M).** Jugnu never makes a move for her, in any game: every set is hers from its first moment, and help comes only from the instruction line, "show me" and the hints below (`tests/no-first-move.test.js`). Odd one out's first row is still the easiest of its kind, as a warm-up. Repeated misses make the right answer wiggle (or, in Follow the path, make Jugnu fly the road). Wrong moves make no sound. In the drag games (Match, Sort it, Follow the path), a plain tap on a card, without dragging, makes it wiggle; it is not a try and is not logged. In Odd one out a tap is her answer.

**Variety (Slice 5H).** Every game draws from pools, so she cannot learn the answers by place:

| Game | Pool |
| --- | --- |
| Numbers to things | 4 different counts from 1 to 9, in rows of five (the count scenes' placemats). All four mats in a set share one scale |
| Colors to things | 4 of 7 colors, one thing each: red (apple, tomato, car, crayon), yellow (moon, banana, star, chick), blue (T-shirt, book, cap, whale), green (frog, alligator, pear, tree), orange (orange, carrot, tiger), purple (grapes, plum, aubergine), pink (pink heart, sock, pig). Each thing's main fill is its color (tested) |
| Letter to picture | Every letter with find pictures (all but X), each with one of its sound-first find words at random. Ice cream and eraser are never used |
| Thing to its shadow | Any find picture with an outline of its own. Plain rounds and boxes are left out, and a set never holds two shadows from one look-alike group (horse and zebra, for example) |
| Shape to thing | 4 things per shape: circle (ball, clock, cookie, button), square (block, window, gift, dice), triangle (roof, pizza slice, tent, party hat), tall rectangle (door, book, phone, fridge) |
| Follow the path | 3 of 8 animals: bee and hive, duck and pond, dog and kennel, bird and nest, fish and bowl, rabbit and hutch, cow and barn, spider and web |

**Game pictures (Slice 5M part 4).** Most game pictures are Twemoji (CC BY 4.0, `GAME_TWEMOJI` in `data/games.js`), each in its own colors and never recolored: a picture is Twemoji only when it is named with its word at a glance and, in the color games, is clearly its color (at least 75% of its colored area; the re-run check swapped in the moon for the lemon, the pear for the parrot, the red car for the strawberry, a pink heart for the blossom, and chose the whole pig and the front-facing chick). One id is the same picture in every game. Ours stay: the tomato, star, alligator, plum and sock in Colors; all of Shape to thing (flat shapes); our friendly purple spider, the hive, pond, kennel, bowl, hutch and barn, the stove and the rooms in Follow the path; the tomato in Sort it. Sort it's baskets: red (sample apple: tomato, balloon, crayon, strawberry), blue (sample T-shirt: book, blue car, cap, whale), fruit (sample apple: lemon, orange, grapes, banana, strawberry), toys (sample teddy: football, kite, car, yo-yo). **Odd one out:** kind rows use Twemoji in their natural colors (fruit: apple, strawberry, banana, lemon, grapes, orange; toys: teddy, football, car, balloon, yo-yo, kite; animals: bee, duck, dog, elephant, chick, frog; clothes: T-shirt, cap, socks, hat, scarf, jeans); color rows keep our drawings, the same object painted in four colors (ball, car, balloon, sock, T-shirt, cap, cup, crayon; the book left, a plain box hard to name). A row never mixes the two. Review sheet: `docs/screenshots/slice-5m/review-sheet-game-pictures.png`.


**Missing piece (Slice 5H).** Three shapes (circle, square, triangle, tall rectangle) each have a gap: a quarter, a half or a corner cut out, shown as a dashed hole. The pieces wait on a shelf below. The right piece snaps into its gap; a whole shape glows with a chime. A wrong piece bounces back silently; letting go away from every gap is not a try. Jugnu places the first piece in the first round. After 3 wrong tries in a row, the right piece for that gap wiggles. Every round is generated fresh (shapes, missing parts, colors and places), and a referee checks it: exactly one piece fits each gap, and, comparing outlines by shape and ignoring size, the only pieces with a gap's outline are its right piece and that piece's twin in another color.

| Level | What she sees | Pieces |
| --- | --- | --- |
| 1 | Three shapes of three colors | 6: the right pieces, and each one's twin in the next shape's color. So every gap has a piece of its outline in the wrong color, and one of its color with the wrong outline |
| 2 | Everything one color: only the outline tells them apart | 6: the right pieces and three of other outlines |
| 3 | Like level 1, but one shape is missing two pieces (two quarters or two corners) | 8, on two rows |
| 4 | Find-library pictures on cards tinted with their color, a quarter, half or corner cut out | 6, as level 1, with the picture in place of the color. Only cuts that hold at least a quarter picture are used (`data/missing-cuts.js`) |

Each level is its own tile with its own star (a finished play). A level opens after 3 finished rounds of the one before (`td.missing`), like the Drawing book; a locked tile is faint and wiggles.

**Memory (Slice 5N).** Cards face down in a grid, each with the same deep blue back and a firefly's warm light in the middle (`MEMORY_BACK` in `data/games.js`). She taps a card and it turns over; she taps a second. Two that match glow gold with a chime and stay face up, pale gold with a gold outline. Two that do not match stay face up for about 1.2 seconds, then turn back with no sound; taps wait meanwhile (`MEMORY.mismatchMs`). When every pair is found, the board glows and the game ends: one board makes a play and earns the level's star. No text and no move counter. The pictures are find-scene pictures (not ice cream or eraser), never two from one look-alike group (apple and tomato, and the Shadow game's groups: `shadowsClash`), and never the same set as her last board of that level. While the tablet is upright, the turn-back and the peek wait. Each two cards she turns go in the log as one `game` entry (the two pictures, and whether they match). Screenshots: `docs/screenshots/slice-5n/`.

| Level | Pairs | Grid | Card at 1280 x 626 |
| --- | --- | --- | --- |
| 1 | 3 | 2 x 3 | 184 px |
| 2 | 6 | 3 x 4 | 167 px |
| 3 | 8 | 4 x 4 | 122 px |

Every card is at least 120 px (`MEMORY.minCardPx`, tested). Level 2 opens after 3 finished boards of level 1, and level 3 after 3 of level 2 (`td.memory`, per child), like Missing piece.

**Count, then pick the number (Slice 5N).** Two tiles in Match, one per level, both open, each with its own star. A group of things stands at the top of the board, drawn as in the count scenes (the same pictures and counting styles; at least 88 px each, tested). She taps each thing to count it: its number shows above it, with the count scenes' rising note, and a thing tapped twice counts once. Level 1: 1 to 10, every thing counted one by one (10 is two rows of five). Level 2: 11 to 20 in ten-frames, counting on as in the count scenes: one tap on the full frame (or a thing in it) counts ten, then each extra counts on from 11; a tap on an extra before the ten does not count, and the frame pulses. Once every thing is counted, three big number tiles rise below; the counting numbers stay on the things. The three numbers are from the level's range and at least 2 apart (`countChoices`). The right tile glows gold with a chime and the group cheers; a wrong tile wiggles, with no sound, and after 3 wrong tiles in a row the right one wiggles. Three groups make a play, each a different number and a different kind of thing, none from her last play. Each number tile she taps goes in the log as a `game` entry (the number tapped and how many there are); counting taps are not logged. A later level 3, where the counting numbers fade before the tiles appear, is in `docs/ideas.md`. Screenshots: `docs/screenshots/slice-5n/`.

A play never repeats a set (or board, or row) from the play before it of the same game. What each game's last play held is kept in `td.lastPlay`.

### Drawing book

- **Free paper.** Crayons and an eraser on a blank board. A press-and-hold ring clears the page. There is no scoring.
- **Dot to dot**, in three levels. Levels 1 and 2 have six pictures each (house, sun, fish, car, cat, tree). Level 3 has four pictures with two things each (car and building, house and tree, fish and sun, cat and house). She joins the numbered dots, and the finished shape fills with color. She can then color over it with crayons and the eraser, and tap the big tick when she is done. Finishing 3 pictures of a level opens the next level.

### Music

Gentle background music is generated in the browser (Web Audio, no files). There are three tunes: one for the bookshelf and her shelf of finds, one for boards, games and drawing, and a slow, soft one at a third of the volume while she writes. There is no music at the door. Music is off until it is turned on, and the choice is remembered.

### Parent tools (built so far)

- `index.html?setup=1`: the children page (Slice 8A; before it, her name and how to say it). It shows how the name book will write each name, or why it cannot.
- `recorder.html`: the stroke recorder, for hand-recorded characters.
- `glyphs.html`: a review page for the generated characters (`npm run glyphs`): capitals, digits and lowercase on the four lines, with each allowed stroke plan as a dashed card.
- `finds.html`: a review sheet of every find picture by letter, with its word and places, and every place's backdrop.
- `voice.html` (Slice 6A): the voice recorder. See **Voice pack** below.
- `?debug=1`: the scoring debug panel. `?char=X` goes straight to writing X. `?scene=X` opens X's scene.
- The attempt log (`td.attempts`, newest 2,000) records every stroke (character, stage, plan, stroke, ok, reason, start, direction, shape error, assisted, and since Slice 5J part 2 `reversed` and `habit: 'direction'` for a stroke traced the other way), every judged copy (type `copy`: character, try 1 to 3, the helper level, pass or fail and the reason, the nearest character, its distance and any child-style shape it matched, the look-alike and missing part, mirrored, fitted scale, size and size check, and the habits: plan used, starts, directions, order, each stroke's start, direction and shape, time), every review (type `review`: character, the day it was due, its interval, pass or fail, the next due day or graduated, and any practice-more reasons), every find-scene tap, every game move, every "show me" in a game (type `game-help`, Slice 5J part 2), and every space of a practice page (type `practice`, Slice 5L).
- `?debug=1&today=2026-11-08` pretends the tablet's date is that day, to check reviews without waiting (debug only). In this test mode the app reads her real progress but saves every change (stars, rounds, reviews, the practice-more list, finds, the log, everything) to separate keys starting `test.`. Opening the app without `today=` shows her real progress, untouched. A later test-mode visit carries on from the test copy.

### Children's profiles (Slice 8A part 1)

The tablet can hold up to 6 children (`td.children`: each has an id `c1`, `c2`, ... never given twice, a name, how to say it, one of 8 animals and a color; `src/children.js`). Everything personal is saved per child: stars, rounds, helper levels, reviews and the practice-more list, finds and stickers, the name book, the last play per game, missing-piece rounds, drawing stars and the attempt log, under `td.child.<id>.` (td.stars for c1 is `td.child.c1.stars`). Each log entry also carries `child`. Shared by the device: music, the last visit (the daily door rule), the voice pack and the recorder. `td.current` remembers who plays.

- **The migration.** The first open after the update copies every old key to the first child, named from the setup page's old `td.profile`. The old keys stay untouched as a backup. Each copy is read back and compared, and only then is `td.migration` set to `done`. If it stops part way (the app closed, storage full) the app plays on the old keys as before and copies again at the next open, so nothing is lost.
- **Switch child.** On the bookshelf, under the toy box, a picture-only button (the child's own animal on their color) goes back to the children's tiles. Test mode (`?debug=1&today=`) works per child in the same way.

### Voice, for now

Spoken prompts are switched off (`SPEECH_ON = false` in `src/audio.js`) until Slice 6B plays the voice pack. Today the app speaks through chimes, pops, Jugnu's movements and pictures.

### Voice pack (Slice 6A)

- **The script** (`data/voice-script.js`) lists every clip the app will need, each with an id, the exact words, a short hint and a category: letter names A to Z, letter sounds (standard pure sounds: stop sounds short with no "uh", long sounds held, short vowels as in apple, egg, insect, octopus, umbrella; c and k both "k", hard g, q "kw", x "ks"), number names 0 to 9, every find word, the counting words (plurals such as "eggs"), the five game instructions, every line `src/notes.js` can show (one full sentence for each missing part and each look-alike), and Jugnu's prompts. Most lists are built from the app's own data, so a new find word or note line appears in the script by itself. `tests/voice-script.test.js` checks the coverage and that ids are unique.
- **Her name:** lines with her name contain `{name}` and are marked private. `voice.html` fills in the name from the setup page. Each has a public twin without the name. Private lines are never exported; her name is never written in the code.
- **`voice.html`** (parent-facing) shows the script grouped by category, each clip marked Recorded, Imported or Missing. Filters: All, Record first (letter sounds, letter names and the private name lines) and Missing. Tap a clip to see its words and hint, record it with the microphone (it stops by itself after 10 seconds), hear it back, then keep it or record it again. Keep moves on to the next clip.
- **Processing** (`src/voice.js`, pure): every clip, recorded or imported, is made mono, resampled to 22.05 kHz, trimmed of silence at the start and end (with a little padding so soft sounds are kept), brought to the same loudness without clipping, and saved as 16-bit WAV (about 44 KB a second).
- **Storage:** IndexedDB on the tablet (`td-voice`, `src/voice-store.js`), every call in try/catch. Clips are never sent anywhere or committed to the repository.
- **Import:** sound files named by clip id (for clips made with an AI voice tool), one or many at once. Capitals don't matter, spaces and underscores count as hyphens, and a copy marker like " (1)" is ignored, so `Name_B.mp3` is for `name-b`. Files with no matching clip are listed. A recorded and an imported clip for the same id: whichever was added last is kept, and the page shows which.
- **Export script** downloads `voice-script.txt`, one `id | words` line per clip, private lines left out, to paste into an AI voice tool.
- **Back up voice pack** downloads every clip as one `.tdvoice` file (a short list of clips, then the raw WAV bytes). **Restore** loads it on any tablet; a clip already on the tablet that is newer than the backup's is kept.

## Tracing engine

Every character is an ordered list of strokes in line units: y = 0 is the sky line, 0.5 the fence, 1 the grass line and 1.5 the tail line (brown; where the tails of g j p q y end; Slice 9A, before it a ground line at 1.3). The four lines are evenly spaced and centred on the screen; the unit did not change, so capitals and digits kept their size (at 1280 x 626 the lines are at 55, 227, 399 and 571 px). The round lights are 44 px, 6 px from the top, above the sky line, and Jugnu perches below and to the left of a start dot on the sky line. The capitals, digits and lowercase letters are generated from exact lines and arcs (`data/glyphs.js`, `npm run glyphs`); lowercase files are `data/chars/lower-<id>.json`. `recorder.html` stays for hand-recorded overrides.

**How the checks work** (`src/geometry.js`)

- Resample her stroke into a fixed number of points.
- Direction: does she move along the reference path in the right order?
- Shape: the average distance from her points to the reference path, compared with the stage's allowed width.
- Start: is her first point near the stroke's start dot?
- This is plain geometry: no AI, offline, and every result can be tested. Thresholds live in `DEFAULTS.stages`.
- The copy-it round adds whole-letter shape matching with the $P recognizer (`src/pdollar.js`), also plain geometry. Its limits live in `COPY_MATCH` (`src/copy.js`).

**Input and hands**

- Finger, or a thick capacitive stylus (the tablet has no S Pen). Palm guard: the app follows only the first touch in the writing area until it lifts.
- Ink is drawn in `requestAnimationFrame` with coalesced events, so it keeps up with her finger.
- She is right-handed: Jugnu and the buttons float on the left.

**Urdu rules** (Slice 10)

- Isolated (stand-alone) forms only, in a plain Naskh print as in a qaida. Joined forms are out of scope.
- Shapes (Slices 10A and 10B): all 39 letters drawn in `data/glyphs.js` (`URDU_GLYPHS`) with smooth curves (`curve`: a smooth curve through given points) as well as lines, following Noto Naskh Arabic at the size where its alif runs from the sky line to the grass line. The grass line is the Urdu baseline: tall letters (ا ط ظ ل) reach the sky line (ک گ a little below it, so گ's second slant fits; آ's alif starts lower, so its madd fits), bodies sit on the grass line, tails (ج ع) end just above the tail line, bowls (ر س ص ق ل م ن و ی) dip to about 1.3 to 1.45, dots below sit about halfway to the tail line. Letters that differ only in dots or a mark share one body exactly. All 39 are on `glyphs.html`, each over the faint font letter. Their stroke words are in `data/stroke-order.js`.
- Strokes run right to left (the head of ج, چ, ح and خ runs left to right, as it is written, then turns back). The body comes first, then dots (`dot` strokes, scored with `scoreDot`) and small marks (`mark` strokes: the little ṭ on ٹ ڈ ڑ and the madd on آ, drawn in their shape but judged only by their place, so a tap or any small stroke there counts). Natural alternatives: ج چ ح خ ع غ head, then tail; س ش teeth, then bowl; ص ض loop, then tooth and bowl; ط ظ stem first; ف loop, then body; ق loop, then bowl; ک گ body, then slant; م head, then tail; ھ right eye, then left eye and tail; ء head, then bar. Several dots may be tapped in any order (Slice 10D).
- The checker also confirms the number of dots and whether they sit above or below.

## Content plan

### English letters

- **Capitals:** all 26 are built. **Lowercase (Slice 9A):** all 26, in plain print to match the capitals (round parts true circles, sticks straight). Small letters sit between the fence and the grass, tall letters reach the sky (t a little short of it), tails reach the tail line. i and j have a `dot` stroke: a tap or tiny stroke at the dot's place (`scoreDot`), in tracing and copying. Each has a default stroke plan and the usual alternatives (the one-go plans run back up over a stick, as children draw them). Each lowercase letter uses its capital's find scene. The style may change once we have the school's handwriting sheet.
- **Find words** start with the letter's **sound**, not its name. For example, I is insect, not ice cream, and E is egg, not eraser. X has no find pictures for now. See `finds.html` for every picture.
- **Her name (Slice 9C)** and a **words level:** short words built from letters she knows (Slice 9D).

### Numbers

- 0 to 9 are built, and 1 to 9 have count scenes. **10 to 20 (Slice 9B part 1)** are generated from the digit glyphs (`NUMBERS` in `data/glyphs.js`): the left digit, then the right digit moved right so that a quarter of a line (`NUMBER_GAP`, 0.25 line units) separates their ink, both at full height. Stroke order is the left digit first. Every plan is one of the left digit's plans followed by one of the right digit's (17: four plans, the 1 and the 7 each in one go or two). Each file also lists its `digits` and how far each is moved, for the copy-it round. Since part 2 they are on the 123 board and play the practice rounds and reviews; since part 3 they have count scenes (ten-frames and counting on, above).
- Mirror-image numbers are common at this age. The app treats them as a direction cue, never as an error.
- Optional later: Urdu numerals (۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹), which need their own font and stroke model.

### Urdu

**One body, many letters.** Most Urdu letters share a body shape and differ only in dots or a small mark. She learns the body once, then adds dots to unlock each sibling.

| Body family | Letters | What tells them apart |
| --- | --- | --- |
| Alif | ا آ | A single top-down stroke; the madd mark on آ |
| Boat | ب پ ت ٹ ث | Dots below or above; a small ط mark on ٹ |
| Hook | ج چ ح خ | Dots inside or above |
| Dal | د ڈ ذ | A small ط mark or a dot above |
| Ray | ر ڑ ز ژ | A small ط mark or dots above |
| Seen | س ش | Three dots on ش |
| Swad | ص ض | A dot on ض |
| Toay | ط ظ | A dot on ظ |
| Ain | ع غ | A dot on غ |
| Fay and Qaaf | ف ق | One dot or two, and a different tail |
| Kaaf | ک گ | An extra stroke on گ |
| Single letters | ل م و ء | Each taught on its own |
| Noon | ن ں | A dot or no dot |
| He forms | ہ ھ | Different shapes |
| Ye forms | ی ے | Different shapes; ے comes only at the end of a word |

**Three Urdu traps**

1. Several letters share one sound (ت and ط; س ص and ث; ز ذ ض and ظ; ح and ہ). Jugnu always says the letter's name first, then a word.
2. Some letters never start a word (ڑ, ں). Their picture word shows the letter at the end.
3. The tracing model must be a simple handwriting style that matches her qaida, not a decorative typeface.

**Draft picture words** (to check against her qaida or teacher before Slice 10)

| Letter | Name | Picture word | Meaning |
| --- | --- | --- | --- |
| ا | Alif | انار (anaar) | Pomegranate |
| ب | Bay | بکری (bakri) | Goat |
| پ | Pay | پتنگ (patang) | Kite |
| ت | Tay | تتلی (titli) | Butterfly |
| ٹ | Ṭay | ٹوپی (ṭopi) | Cap |
| ج | Jeem | جہاز (jahaaz) | Airplane |
| چ | Chay | چڑیا (chiṛiya) | Sparrow |
| خ | Khay | خرگوش (khargosh) | Rabbit |
| د | Daal | دروازہ (darwaaza) | Door |
| ر | Ray | رسی (rassi) | Rope |
| ڑ | Ṛay | پہاڑ (pahaaṛ) | Mountain (letter at the end) |
| ز | Zay | زرافہ (zaraafa) | Giraffe |
| س | Seen | سیب (saib) | Apple |
| ش | Sheen | شیر (sher) | Lion |
| ص | Swaad | صابن (saabun) | Soap |
| ط | Toay | طوطا (tota) | Parrot |
| ع | Ain | عینک (ainak) | Glasses |
| غ | Ghain | غبارہ (ghubaara) | Balloon |
| ق | Qaaf | قلم (qalam) | Pen |
| ک | Kaaf | کیلا (kela) | Banana |
| گ | Gaaf | گائے (gaaye) | Cow |
| ل | Laam | لٹو (laṭṭu) | Spinning top |
| م | Meem | مچھلی (machhli) | Fish |
| ہ | Hay | ہاتھی (haathi) | Elephant |

Version 1 teaches standalone letter shapes only; joined forms come later. Family words such as امی (Ammi) and ابو (Abbu) make a good later pack.

## What comes next (summary)

The full order, with goals and checks, is in `09-build-sequence.md`.

| Slice | What it adds |
| --- | --- |
| 5G | Sound-first find pictures for every letter, garden and sea backdrops, the finds review sheet |
| 5H | More game variety, and the Missing piece game |
| 5I | Practice and review: round 3 as a copy-it round judged on shape, reviews after 1, 3, 7 and 21 days, a practice-more list (built) |
| 5K | Testing feedback: the copy-it round moves to review days (part 1 built); Follow the path changes; randomization in every game and dot to dot; mango and tomato redrawn |
| 5M | Clearer games and better pictures: no automatic first move (part 1 built); Odd one out made clear (part 2 built); Twemoji pictures for finds (part 3 built) and games (part 4 built) |
| 5O | Fixes from testing with her: undo one stroke (part 1 built); corrections drawn above her faint ink, and Jugnu never behind a button (part 2 built); letter slots in name writing (part 3 built); letter slots in name writing; rewriting only the wrong letter of her name |
| 5J | Testing fixes: stroke plans, shape-only judging of copies, habits coached, failure reasons and parent lines (part 1 built); the fading helper, M and N from the bottom, direction coached, child-style templates (part 2A built); game instructions, show me, the U umpire (part 2B built) |
| 6 | Voice and phonics: family voice recorder, greeting by name, spoken prompts, the ear button, each letter's name, sound and picture word |
| 9A | Lowercase on four lines (built) |
| 9B, 9C, 9D | Numbers 10 to 20; write my name; a words level |
| 10 | Urdu: dot strokes, the Urdu font, recorder support, Dot Detective |
| 8 | Parent zone: lock, settings, progress, last attempts, weekly wrong starts, reset |
| 7 | Install as an app: full screen, offline, pinned |
| 11 | The Shapes book |
| 12 | Stories and the daily rhythm: goodnight, a time limit, Jugnu's light, a warm-up |
| Trial | Two weeks of daily use |

### Planned: parent zone (Slice 8)

Behind a gate (press and hold for 3 seconds, then a simple sum): daily limit, settings, a progress grid per book, a replay of her last attempt on any character, her wrong starts per week, the practice-more list (`td.practiceMore`, kept since Slice 5I), and a reset. There is no "struggling" label anywhere.

## UX rules for a 4-year-old

| Area | Rule |
| --- | --- |
| Choices | At most 3 choices per question or prompt. Menus (the bookshelf, the boards, the games and drawing menus) are exempt |
| Text | She never needs to read. Child screens have no instructions for her in text; the words she sees are the characters themselves and an object's word in a find scene. Short parent-facing lines (game instructions, and why a stroke or copy did not count) are allowed in small type at the top, beside the visual reaction (Slice 5J) |
| Touch targets | At least 88 CSS px, well spaced |
| Gestures | Tap and drag only. No pinch, long-press or swipe navigation. Context menu, text selection, scrolling and pull-to-refresh are blocked |
| Layout | Landscape. Jugnu and the buttons float on the left, over the writing area. The whole screen stays writable |
| Color | Bright but calm, and never red as feedback. Color is never the only signal |
| Sound | Gentle chimes, never buzzers. Wrong moves are silent. Music is quiet while she writes |
| Motion | Short animations, never while she is tracing |
| Response speed | The ink follows her finger with no visible lag |

## Guardrails

| Area | Rule | Why |
| --- | --- | --- |
| Screen time | A parent-set daily limit with Jugnu's goodnight (Slice 12). Until then, a parent watches the time | WHO guidance for ages 3 to 4: sedentary screen time no more than 1 hour a day, less is better |
| Privacy | Offline. All data stays on the tablet. No account, no adverts, no analytics, no third-party scripts, no network calls once installed | Nothing about her leaves the device |
| No AI | No AI feature and no API keys anywhere in the project | Keeps it private, offline and testable |
| Wellbeing | No streak penalties, no lost progress, no comparisons, no diagnostic words | Pressure and labels at 4 cause anxiety, not progress |

## Tech

| Layer | Choice |
| --- | --- |
| App | Plain HTML, CSS and vanilla JavaScript modules; no framework, no bundler |
| Drawing | SVG for lines, tracks and pictures; one canvas for her ink |
| Storage | `localStorage` for settings and progress; IndexedDB for the voice pack's clips (Slice 6A) |
| Tests | Node's built-in test runner (`npm test`) |
| Hosting | GitHub Pages, installed from Chrome as a home-screen app (Slice 7) |

## Retired

Ideas from Spec v2 that we dropped, and why.

| Retired | Replaced by | Why |
| --- | --- | --- |
| The map with three islands (Alphabet Forest, Number Town, Urdu Garden) | The front door and the bookshelf | A shelf of books is easier for her to find her way around, and it grows simply by adding a book (Shapes, Stories) |
| Sticker stages (pencil sketch, then color, then gold star) | Gold stars on the board tiles, and her shelf of finds | A star is clear at a glance. The finds shelf gives her a collection that visibly grows, without a second reward system |
| The v2 mini-game list (Firefly Rain, Train Tracks, Magic Reveal, Hungry Frog, Letter Builder, Count and Carry, Silly Jugnu, Sky Writing, Family Duet, Name Quest) | The games we built: Match (5 sets), Follow the path, Sort it and Odd one out, plus the Drawing book. **Dot Detective moves to Urdu** (Slice 10) | The built games share a few engines, play well with a finger on her tablet, and cover the same skills (Memory, Slice 5N, came from the old prototypes later). Dot Detective only makes sense once Urdu letters exist |
| Dropping back one stage after 3 fails | Never-stuck help: Jugnu demonstrates after 3 misses and draws the stroke after 5, and the round starts again | Dropping a stage felt like losing ground. Help that comes to her keeps her moving, and the stage stays where the round put it |
| AI photo scoring of paper worksheets | Nothing for now (a parent looks at her paper) | It conflicts with the no-AI rule: it would need an online model and API keys, and would send pictures of her work off the tablet |
