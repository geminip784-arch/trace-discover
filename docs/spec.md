# Trace & Discover — App Spec v3

Version 3 · Nov 7, 2026 · describes the app as built through Slice 5G and the first part of 5H (game variety), and where it goes next.

The order of the slices still to build is in `09-build-sequence.md`. What we dropped from v2, and why, is in **Retired** at the end.

## Vision and design principles

Trace & Discover is a short, daily writing-practice app for one 4-year-old girl. She traces English capitals, numbers and (later) Urdu letters with a firefly called Jugnu (جگنو, Urdu for firefly). It runs offline on her Samsung Galaxy Tab (11 inch, landscape, Chrome). There is no account and no server, and nothing ever leaves the tablet.

**Who it is built for**

| Her profile | What the app does about it |
| --- | --- |
| Strong vocabulary and counting | Talking and counting are the rewards, not the hurdles |
| Writing lags behind | Big strokes on wide paths first. Help fades over three rounds |
| Cannot read yet | Child screens have no instructions in text. Prompts are pictures, sounds and Jugnu (spoken prompts come in Slice 6) |
| Short attention span | One character takes three short rounds. Every game ends after a few sets |
| Learning English and Urdu | Urdu has its own book on the shelf, not an add-on |

**Six design principles**

1. Play first, practice inside it. Tracing leads straight into a find or count scene.
2. Correct, never punish. A wrong start or direction gets a friendly demonstration. No red, no buzzer, no lost progress.
3. Speak everything. A 4-year-old finds her way by sound, pictures and her companion, never by reading.
4. Short and finite. Each activity ends by itself (a daily limit and goodnight come in Slice 12).
5. Paper is the finish line. The app is practice for writing with a pencil.
6. Make it hers. Her name, her family's voices (Slice 6), her own shelf of finds.

## The screens, as built

### Front door

The first time she opens the app each day (by the tablet's own date), she sees the front of a house with a closed door. She taps the door, it swings open with a warm light and a door sound, and the bookshelf appears. Later visits that day go straight to the bookshelf. `?door=1` always shows the door.

### Bookshelf (home)

Seven books stand on a shelf, left to right: **ABC**, **123**, **Urdu**, **Shapes**, **Games**, **Drawing**, **Stories**. Shapes and Stories are faint with a lock: a tap makes them wiggle and does nothing else (they come in Slices 11 and 12). Tapping an open book opens its cover, then its screen. A toy box on the shelf opens her shelf of finds.

The home button (top of the left column) always returns here. The back button goes one step up. The music button turns the music on or off.

### Character boards: ABC, 123 and Urdu

Each board is a grid of large tiles, one per character, each in its own color. No tile color is red, and each one is dark enough to read on white.

- **ABC**: A to Z. **123**: 0 to 9. **Urdu**: the 39 letters in qaida order, filling from the top right.
- A tile is bright (tappable) when its character file exists in `data/chars/index.json`. Today every capital and digit is bright. Urdu tiles stay faint until Slice 10.
- A character she has finished with no help from Jugnu shows a gold star on its tile.
- Tapping a bright tile pops it and opens the writing screen.

### Writing: three practice rounds

Each character is practised in three rounds (`ROUNDS` in `src/progress.js`; 3 to 5 allowed). Three round lights at the top show done, now and to come.

| Round | Stage | What she sees | Help given |
| --- | --- | --- | --- |
| 1 | Dots | The letter's track, numbered start dots, arrows. Jugnu flies each stroke first | Wide path |
| 2 | Ghost | A faded track. Only the next start dot glows | Narrower path |
| 3 | Alone | A very faint track on the four colored lines | Narrowest path. Judged when she lifts |

- Strokes must be drawn in order. Stroke k is always compared with reference stroke k. Some letters also accept known joined versions (for example, both strokes of 4 in one go).
- **Never stuck.** After 3 misses in a row on one stroke, Jugnu demonstrates it. After 5, Jugnu draws it himself and the round starts again. The stage never drops inside a round.
- **The star.** A round counts only when she drew every stroke herself. The gold star needs a whole practice with no help: no assist, and no demonstration after misses in rounds 2 or 3.
- When the last round is done, the whole letter glows, then the find or count scene opens.
- If she leaves mid-way, the next visit resumes at the round she left (`td.rounds`).

**Feedback rules** (every round)

| What happens | App response | Never do |
| --- | --- | --- |
| Starts in the wrong place | The start dot pulses and Jugnu hops onto it | Red cross, buzzer |
| Goes the wrong direction | The glow stops. Jugnu flies the right way once, then she tries again | Erase her whole letter |
| Wanders off the path | The trail dims. She carries on from where she left it | Snap her line onto the path |
| Finishes a stroke well | The trail sparkles, one soft chime | A big celebration after every stroke |
| Finishes the character | Her letter glows | Anything that interrupts with menus |

### Find scenes (letters) and count scenes (numbers)

After a letter's last round, a place appears with 7 objects standing in it. The places are the living room, kitchen, study, bedroom, farm-garden, zoo and sea. Three of the objects start with her letter (two for Q and Z, which have only two pictures), and the rest do not.

- She taps the ones that start with her letter. Each found object glows, plays a small animation and flies into a basket.
- A wrong tap shows that object's own word for 2 seconds, with no sound.
- After 10 seconds with no find, the objects still to find wiggle once.
- **Which place.** The scene uses the place that holds the most of that letter's pictures (a tie is picked at random). It takes as many objects as it can from that place. When it has to borrow from another place, it takes portable things (food, toys, small objects) before animals, so a horse never turns up in the kitchen.
- **Sound-first words.** Every find word starts with the letter's sound, not its name (Slice 5G). The full list and the object-to-place table are on `finds.html`.
- **No scene.** U and X have fewer than 2 pictures, so they skip the scene and go straight back to the board and the star.
- **Kept pictures.** Ice cream and eraser are kept out of find scenes and the Letter to picture game, but their pictures stay: her saved finds of them still show on her shelf, and ice cream stays in the Shadow game.
- Count scenes keep the four rooms.

After a number from 1 to 9, three placemats appear, each holding a different count of small things (eggs, cups, flowers…). She taps the mat with her number of things. It moves to the middle, and she taps each item once to count it; the numbers appear in the order she taps. Sometimes one item is golden. 0 has no count scene.

Every find and every counted group joins her collection.

### Her shelf of finds

The toy box on the bookshelf opens her collection: the newest 24 finds stand on wooden planks. These are the objects she found and the groups she counted. Up to 500 are kept (`td.finds`).

### Games book

A menu of tiles in four rows, one row per kind of game. Each game ends after a few sets, and finishing one gives its tile a star.

| Row | Games | How it plays |
| --- | --- | --- |
| Match (draw a line) | Numbers to things, Colors to things, Letter to picture, Thing to its shadow, Shape to thing | Two columns of 4 cards. She draws a line from each card to its partner. 3 sets make a play |
| Follow the path | Animals to homes, Furniture to rooms | Three crossing roads. She traces each traveller's road to its home |
| Sort it | By color, By kind | Six things along the top. She drags each into the right one of two baskets. 2 boards make a play |
| Odd one out | By kind, By color | A row of four cards. She taps the one that is different. 5 rows make a play |

In every game, Jugnu shows the first move himself. Repeated misses make the right answer wiggle (or, in Follow the path, make Jugnu fly the road). Wrong moves make no sound. In the drag games (Match, Sort it, Follow the path), a plain tap on a card, without dragging, makes it wiggle; it is not a try and is not logged. In Odd one out a tap is her answer.

**Variety (Slice 5H).** Every game draws from pools, so she cannot learn the answers by place:

| Game | Pool |
| --- | --- |
| Numbers to things | 4 different counts from 1 to 9, in rows of five (the count scenes' placemats). All four mats in a set share one scale |
| Colors to things | 4 of 7 colors, one thing each: red (apple, tomato, strawberry, crayon), yellow (lemon, banana, star, duck), blue (cup, book, ball, whale), green (leaf, alligator, parrot, olive), orange (orange, fish, juice), purple (grapes, plum, aubergine), pink (flower, sock, frock). Each thing's main fill is its color (tested) |
| Letter to picture | Every letter with find pictures (all but X), each with one of its sound-first find words at random. Ice cream and eraser are never used |
| Thing to its shadow | Any find picture with an outline of its own. Plain rounds and boxes are left out, and a set never holds two shadows from one look-alike group (horse and zebra, for example) |
| Shape to thing | 4 things per shape: circle (ball, clock, cookie, button), square (block, window, gift, dice), triangle (roof, pizza slice, tent, party hat), tall rectangle (door, book, phone, fridge) |
| Follow the path | 3 of 8 animals: bee and hive, duck and pond, dog and kennel, bird and nest, fish and bowl, rabbit and hutch, cow and barn, spider and web |

A play never repeats a set (or board, or row) from the play before it of the same game. What each game's last play held is kept in `td.lastPlay`.

### Drawing book

- **Free paper.** Crayons and an eraser on a blank board. A press-and-hold ring clears the page. There is no scoring.
- **Dot to dot**, in three levels. Levels 1 and 2 have six pictures each (house, sun, fish, car, cat, tree). Level 3 has four pictures with two things each (car and building, house and tree, fish and sun, cat and house). She joins the numbered dots, and the finished shape fills with color. She can then color over it with crayons and the eraser, and tap the big tick when she is done. Finishing 3 pictures of a level opens the next level.

### Music

Gentle background music is generated in the browser (Web Audio, no files). There are three tunes: one for the bookshelf and her shelf of finds, one for boards, games and drawing, and a slow, soft one at a third of the volume while she writes. There is no music at the door. Music is off until it is turned on, and the choice is remembered.

### Parent tools (built so far)

- `index.html?setup=1`: her name and how to say it.
- `recorder.html`: the stroke recorder, for hand-recorded characters.
- `glyphs.html`: a review page for the generated characters (`npm run glyphs`).
- `finds.html`: a review sheet of every find picture by letter, with its word and places, and every place's backdrop.
- `?debug=1`: the scoring debug panel. `?char=X` goes straight to writing X. `?scene=X` opens X's scene.
- The attempt log (`td.attempts`, newest 2,000) records every stroke (character, stage, stroke, ok, reason, start, direction, shape error, assisted), every find-scene tap and every game move.

### Voice, for now

Spoken prompts are switched off (`SPEECH_ON = false` in `src/audio.js`) until Slice 6 brings recorded family voices. Today the app speaks through chimes, pops, Jugnu's movements and pictures.

## Tracing engine

Every character is an ordered list of strokes in line units: y = 0 is the sky line, 0.5 the fence, 1 the grass line and 1.3 the ground line. The capitals and digits are generated from exact lines and arcs (`data/glyphs.js`, `npm run glyphs`). `recorder.html` stays for hand-recorded overrides.

**How the checks work** (`src/geometry.js`)

- Resample her stroke into a fixed number of points.
- Direction: does she move along the reference path in the right order?
- Shape: the average distance from her points to the reference path, compared with the stage's allowed width.
- Start: is her first point near the stroke's start dot?
- This is plain geometry: no AI, offline, and every result can be tested. Thresholds live in `DEFAULTS.stages`.

**Input and hands**

- Finger, or a thick capacitive stylus (the tablet has no S Pen). Palm guard: the app follows only the first touch in the writing area until it lifts.
- Ink is drawn in `requestAnimationFrame` with coalesced events, so it keeps up with her finger.
- She is right-handed: Jugnu and the buttons float on the left.

**Urdu rules** (Slice 10)

- Strokes run right to left. The body comes first, then dots and small marks as separate `dot` strokes, scored with `scoreDot`.
- The checker also confirms the number of dots and whether they sit above or below.

## Content plan

### English letters

- **Capitals:** all 26 are built. **Lowercase:** Slice 9A, using the fence line as the x-height, with i and j getting `dot` strokes.
- **Find words** start with the letter's **sound**, not its name. For example, I is insect, not ice cream, and E is egg, not eraser. X has no find pictures for now. See `finds.html` for every picture.
- **Words level:** short words built from letters she knows (Slice 9C).

### Numbers

- 0 to 9 are built, and 1 to 9 have count scenes. 10 to 20 come in Slice 9B (two digits side by side, left digit first).
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
| 5I | Practice and review: round 3 as a copy-it round judged on shape, reviews after 1, 3 and 7 days, a practice-more list, an optional "again?" |
| 6 | Voice and phonics: family voice recorder, greeting by name, spoken prompts, the ear button, each letter's name, sound and picture word |
| 9A, 9B, 9C | Lowercase; numbers 10 to 20; a words level |
| 10 | Urdu: dot strokes, the Urdu font, recorder support, Dot Detective |
| 8 | Parent zone: lock, settings, progress, last attempts, weekly wrong starts, reset |
| 7 | Install as an app: full screen, offline, pinned |
| 11 | The Shapes book |
| 12 | Stories and the daily rhythm: goodnight, a time limit, Jugnu's light, a warm-up |
| Trial | Two weeks of daily use |

### Planned: parent zone (Slice 8)

Behind a gate (press and hold for 3 seconds, then a simple sum): daily limit, settings, a progress grid per book, a replay of her last attempt on any character, her wrong starts per week, the practice-more list, and a reset. There is no "struggling" label anywhere.

### Planned: practice and review (Slice 5I)

Round 3 becomes a copy-it round. She writes the letter beside a model, and it is judged on shape at 75 to 125% of the model's size. A character she has secured comes back for a review after 1, 3 and 7 days. Characters she often gets wrong go on a practice-more list. After the star, an optional "again?" lets her go round once more.

## UX rules for a 4-year-old

| Area | Rule |
| --- | --- |
| Choices | At most 3 choices per question or prompt. Menus (the bookshelf, the boards, the games and drawing menus) are exempt |
| Text | No instructions in text on child screens. The only words are the characters themselves and an object's word in a find scene |
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
| Storage | `localStorage` for settings and progress; IndexedDB for audio clips (Slice 6) |
| Tests | Node's built-in test runner (`npm test`) |
| Hosting | GitHub Pages, installed from Chrome as a home-screen app (Slice 7) |

## Retired

Ideas from Spec v2 that we dropped, and why.

| Retired | Replaced by | Why |
| --- | --- | --- |
| The map with three islands (Alphabet Forest, Number Town, Urdu Garden) | The front door and the bookshelf | A shelf of books is easier for her to find her way around, and it grows simply by adding a book (Shapes, Stories) |
| Sticker stages (pencil sketch, then color, then gold star) | Gold stars on the board tiles, and her shelf of finds | A star is clear at a glance. The finds shelf gives her a collection that visibly grows, without a second reward system |
| The v2 mini-game list (Firefly Rain, Train Tracks, Magic Reveal, Hungry Frog, Letter Builder, Count and Carry, Silly Jugnu, Sky Writing, Family Duet, Name Quest) | The games we built: Match (5 sets), Follow the path, Sort it and Odd one out, plus the Drawing book. **Dot Detective moves to Urdu** (Slice 10) | The built games share a few engines, play well with a finger on her tablet, and cover the same skills. Dot Detective only makes sense once Urdu letters exist |
| Dropping back one stage after 3 fails | Never-stuck help: Jugnu demonstrates after 3 misses and draws the stroke after 5, and the round starts again | Dropping a stage felt like losing ground. Help that comes to her keeps her moving, and the stage stays where the round put it |
| AI photo scoring of paper worksheets | Nothing for now (a parent looks at her paper) | It conflicts with the no-AI rule: it would need an online model and API keys, and would send pictures of her work off the tablet |
