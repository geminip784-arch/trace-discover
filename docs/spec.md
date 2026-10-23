# Trace & Discover — App Concept & Kid UX Spec v2

Version 2 · Oct 23, 2026

## Vision and design principles

Trace & Discover turns writing practice into a 10-minute daily adventure. A firefly called Jugnu has lost its light, and every letter or number she traces correctly lights up a world again. Three worlds cover English letters, numbers, and Urdu letters.

**Who it is built for**

| Her profile | What the app does about it |
| --- | --- |
| Strong vocabulary and counting | Uses talking and counting as the rewards, not the hurdles |
| Writing lags behind | Starts with big arm-sized strokes, shrinks them over weeks, warms up fingers first |
| Cannot read yet | Every instruction is spoken; the child screens have no text |
| Short attention span | One new character per day; the app ends the session itself |
| Learning English and Urdu | Narration in English, Urdu or both; Urdu is its own world, not an add-on |
| Frequent moves | Works fully offline; letter style can be switched to match a new school |

**Six design principles**

1. Play first, practice inside it. Tracing is the action that makes things happen in the world, not a test before the fun.
2. Correct, never punish. A wrong start or direction gets a friendly demonstration. No red crosses, no lost progress.
3. Speak everything. A 4-year-old navigates by sound, pictures and her companion, never by reading.
4. Short and finite. Jugnu gets sleepy when the daily limit is reached and the session closes with a goodnight.
5. Paper is the finish line. A letter only counts as mastered when she can write it with a pencil.
6. Make it hers. Her name, her photos, her family's voices, her own toys as letter pictures.

**What changed from v1**

| v1 | v2 |
| --- | --- |
| One tracing flow per letter | A story world with three places to restore |
| English letters only | English letters, numbers 0 to 10, Urdu letters |
| Points and confetti | Collections that visibly grow each world |
| Child picks 3, 5 or 10 reps | Parent sets a daily time limit; the app picks reps |
| Heatmap and tremor engine | Three simple checks per stroke: start, direction, shape |
| Parent dashboard only | Dashboard plus family voice recordings and printable worksheets |

## Story world

The story gives every tracing a reason: a storm blew the letters out of the night sky, and Jugnu needs her help to put them back.

**The companion: Jugnu the firefly** (جگنو, Urdu for firefly)

- Her finger becomes Jugnu's trail of light. Tracing literally paints with glow, so the reward is built into the action.
- Jugnu demonstrates every stroke by flying it first, then waits at the start dot.
- Personality: curious, a little clumsy, never disappointed. When she goes the wrong way, Jugnu bumps into a leaf, giggles and shows the right way.
- Grows brighter as she progresses; she can pick its color and a small hat.
- Speaks English or Urdu, or switches mid-sentence the way many bilingual families talk.

**The three worlds**

| World | Content | Look and mood | What grows back when she succeeds |
| --- | --- | --- | --- |
| Alphabet Forest | 26 English letters, one case first | Sunny forest, soft greens | Each letter brings back its animal or object: trace B and a ball bounces into the clearing |
| Number Town | 0 to 10 first, 11 to 20 later | Toy town with a little train | Each number fills a train carriage with that many things, which she counts aloud |
| Urdu Garden (باغ) | Urdu letters, taught in shape families | Evening garden with lanterns | Each letter lights a lantern and brings back a creature: ت brings a titli (butterfly) |

**Home screen: the map**

- The three worlds sit on one map as islands. Jugnu flies to today's adventure, which glows; the others are visible but quiet.
- One obvious path per day avoids choice overload. After the daily adventure, she may revisit any lit-up letter for free play.
- Restored places stay restored. Over weeks the map fills with color, creatures and lanterns: her progress is the landscape, not a score.

## A daily session, step by step

One session teaches one new character, reviews up to two old ones, and ends on a win in about 10 minutes. Timings below are design targets to tune by watching her, not research figures.

1. **Hello (15 s).** Jugnu flies in and greets her by name, in a parent's recorded voice.
2. **Warm-up (60 s).** One pre-writing game: rain lines, train tracks, ocean waves or bouncing loops. Each warm-up pattern matches a stroke in today's letter.
3. **Meet the character (30 s).** The letter appears big, says its name and sound, and its picture word animates. Example: "B, buh, Ball!" and a ball bounces in.
4. **Watch Jugnu (10 s).** Jugnu flies the strokes slowly, leaving glowing numbered dots.
5. **Trace with dots (Stage 1).** Two or three goes, with Jugnu leading.
6. **Ghost trace (Stage 2).** Two or three goes on a faded letter. The path narrows a little after each success.
7. **Write it alone (Stage 3).** One or two goes on the colored writing lines, no help.
8. **Bring it to life (5 s).** Her own letter turns into its picture and joins the world; a sticker lands in her book.
9. **Review (1 to 2 min).** One or two older characters marked practice more, straight to Stage 2.
10. **Bonus game (2 min).** One mini-game from the fun layer, rotated daily.
11. **Mission (off-screen).** Either Go Find It or a paper mission (see off-screen bridges).
12. **Goodnight.** Jugnu yawns and floats to its lantern. The app returns to a calm map that stays dim until tomorrow's session or a parent unlock.

If she fails three times in a row, the app quietly drops back one stage, switches to a mini-game, and ends on something she can do.

## Tracing engine

Every character is stored as an ordered list of strokes, and each stroke is checked on three things only: where it starts, which way it goes, and whether it follows the shape.

**The three stages**

| Stage | What she sees | Help given | Passes when |
| --- | --- | --- | --- |
| 1. Dots | Big letter, numbered start dots, arrows, Jugnu at the start | Wide path; Jugnu flies ahead | Starts at the dot, right direction, stays roughly on the path |
| 2. Ghost | Faded letter, only the first start dot glows | Path narrows after each success | Same checks, tighter path |
| 3. Alone | Only the colored writing lines | None while writing | Correct start, direction and shape, checked after she lifts her finger |

**Feedback rules**

| What happens | App response | Never do |
| --- | --- | --- |
| Starts in the wrong place | Start dot pulses; Jugnu hops onto it: "Start here!" | Red cross, buzzer |
| Goes the wrong direction | Glow stops; Jugnu flies the right way once, then she tries again | Erase her whole letter |
| Wanders off the path | Trail dims; she carries on from where she left it | Snap her line onto the path (hides the real error) |
| Finishes a stroke well | Trail sparkles, one soft chime | A big celebration after every stroke |
| Finishes the character | Her letter comes alive for 2 to 3 seconds | Anything that interrupts with menus or adverts |

**How the checks work (for the build)**

- Resample her stroke into a fixed number of points.
- Start check: is her first point within a radius of the stroke's start dot?
- Direction check: does she move along the reference path in the right order?
- Shape check: average distance from her points to the reference path, compared with the allowed path width.
- This is plain geometry. No AI is needed, it runs offline, and every result can be tested.

**Input and hands**

- Finger mode: thick, textured trails (paint, sand, glitter) and wide paths. Default at the start.
- Chunky stylus: her tablet (Galaxy Tab A9+ or A11+) has no S Pen support, so a thick-tipped capacitive stylus behaves exactly like a finger. Palm guard: the app follows only the first touch inside the writing area and ignores every other touch until it lifts.
- Left-handed setting: Jugnu and buttons move to the side her hand does not cover.

**Urdu-specific rules**

- Strokes run right to left.
- The letter body is written first, then dots and small marks as separate strokes.
- The checker also confirms the number of dots and whether they sit above or below.

## Content plan

Each world teaches characters in families that share strokes, not in alphabet order, so one learned movement unlocks several characters.

### Alphabet Forest

**Teaching order.** If capitals come first: straight lines (E F H I L T), then straight plus curve (B D J P R U), then curves (C G O Q S), then diagonals (A K M N V W X Y Z). If lowercase comes first, start with the letters that begin with a c-stroke (c, o, a, d, g, q). This grouping is a proposed sequence, not a published standard.

**Picture words.** One main picture per letter plus one alternate. All start with a single clear sound, avoid blends like bl or cr, and are things a 4-year-old knows.

| Letter | Sound | Main picture | Alternate |
| --- | --- | --- | --- |
| A | /æ/ | Apple | Ant |
| B | /b/ | Ball | Book |
| C | /k/ | Cup | Cat |
| D | /d/ | Duck | Door |
| E | /ɛ/ | Egg | Elephant |
| F | /f/ | Fish | Fan |
| G | /g/ | Goat | Gift |
| H | /h/ | Hat | House |
| I | /ɪ/ | Insect | Igloo |
| J | /dʒ/ | Jam | Jug |
| K | /k/ | Kite | Key |
| L | /l/ | Lion | Lamp |
| M | /m/ | Moon | Mango |
| N | /n/ | Nest | Nose |
| O | /ɑ/ | Octopus | Ostrich |
| P | /p/ | Pen | Pot |
| Q | /kw/ | Queen | Quilt |
| R | /r/ | Rabbit | Rain |
| S | /s/ | Sun | Sock |
| T | /t/ | Teddy | Tap |
| U | /ʌ/ | Umbrella | Up |
| V | /v/ | Van | Vase |
| W | /w/ | Window | Watch |
| X | /ks/ | Box (letter at the end) | Fox |
| Y | /j/ | Yo-yo | Yogurt |
| Z | /z/ | Zebra | Zip |

### Number Town

- Range: 0 to 10 first, 11 to 20 once those are secure.
- Proposed order: 1, 7, 4, 0, 6, 9, 2, 3, 5, 8, 10. It moves from single straight strokes to curves and turns; adjust it using her own data.
- Every number ends with counting: trace 4, then load 4 mangoes onto the train and count them aloud with Jugnu. This uses her counting strength as the reward.
- Mirror-image numbers are common at this age. The app treats them as a direction cue ("Jugnu's 3 faces this way"), never as an error message.
- Optional pack: Urdu numerals (۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹). Some digits differ from the Arabic forms, so the pack needs an Urdu-specific font and stroke model.

### Urdu Garden

**The big idea: one body, many letters.** Most Urdu letters share a body shape and differ only in dots or a small mark. She learns the body once, then adds dots to unlock each sibling. That makes Urdu feel faster, not harder.

| Body family | Letters | What tells them apart |
| --- | --- | --- |
| Alif | ا آ | Single top-down stroke; madd mark on آ |
| Boat | ب پ ت ٹ ث | Dots below or above; small ط mark on ٹ |
| Hook | ج چ ح خ | Dots inside or above |
| Dal | د ڈ ذ | Small ط mark or dot above |
| Ray | ر ڑ ز ژ | Small ط mark or dots above |
| Seen | س ش | Three dots on ش |
| Swad | ص ض | Dot on ض |
| Toay | ط ظ | Dot on ظ |
| Ain | ع غ | Dot on غ |
| Fay and Qaaf | ف ق | One dot or two, and a different tail |
| Kaaf | ک گ | Extra stroke on گ |
| Single letters | ل م و ء | Each taught on its own |
| Noon | ن ں | Dot or no dot |
| He forms | ہ ھ | Different shapes; ھ appears inside sounds like بھ and پھ |
| Ye forms | ی ے | Different shapes; ے comes only at the end of a word |

**Three Urdu traps the design must handle**

1. Several letters share one sound in Urdu: ت and ط, س ص and ث, ز ذ ض and ظ, ح and ہ. Sound-only phonics will confuse her, so Jugnu always says the letter's name first ("Swaad"), then a word.
2. Some letters never start a word, such as ڑ and ں. Their picture word shows the letter highlighted at the end, for example ڑ in پہاڑ (mountain).
3. Printed Urdu often uses decorative typefaces. The tracing model must be a simple handwriting style that matches her qaida or school.

**Draft picture words** (from my own knowledge; check them against her qaida or teacher before building)

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

Version 1 teaches standalone letter shapes only. Joined forms (for example ب joining ا to make با) come in a later phase.

**Family words as a special pack.** امی (Ammi) and ابو (Abbu) use only ا, م, ی, ب and و. Writing her parents' names early is a big motivator.

## Fun layer

Fun comes from three things: things she makes come alive, collections that grow, and her family inside the app. Points and leaderboards are left out on purpose.

**Mini-games** (one per session, rotated)

| Game | How it plays | What it builds |
| --- | --- | --- |
| Firefly Rain | Draw downward lines to make rain fall on seeds; flowers pop up | Pre-writing: vertical strokes |
| Train Tracks | Draw left-to-right tracks so the train reaches the station | Pre-writing: horizontal strokes |
| Magic Reveal | Tracing a letter scratches away fog to reveal a hidden picture | Accuracy, motivation |
| Hungry Frog | The frog asks for a letter by name; she taps the right one of three to feed it | Letter recognition |
| Letter Builder | Build a letter from stick and curve pieces, then trace it | Understanding letter shapes |
| Count and Carry | Trace a number, then load that many mangoes onto the train | Number writing plus counting |
| Dot Detective | Jugnu names an Urdu letter; she adds the right dots to the body | Telling Urdu siblings apart |
| Silly Jugnu | Jugnu writes a letter backwards; she spots it and fixes it | Reversal awareness |
| Sky Writing | Stand up and draw the letter huge in the air with Jugnu | Big-arm movement, a screen break |
| Family Duet | Parent and child each trace on half the screen, then compare | Shared play with a parent |
| Name Quest | Boss level: trace her own name, unlocked once its letters are secure; Urdu version too | Her biggest motivator |

**Rewards and collections**

- Sticker book: each sticker grows with her. It arrives as a pencil sketch after her first try, fills with color once the character is secure, and earns a gold star when mastered on paper. Her Go Find It photo sits beside it.
- World restoration: the forest, town and garden visibly fill with life. No coins, no shop.
- Jugnu's glow: grows brighter with progress; unlock colors and small hats.
- Paper badge: a gold star only after a letter is confirmed on paper.
- No streak penalty. If she skips days, Jugnu is simply happy to see her.

**Make it hers**

- Her name and a drawn avatar on the map.
- Family voice pack: parents (and later grandparents) record praise such as "Shabash!" and "Well done", plus letter names. The app plays them at random among the standard lines.
- Narration language: English, Urdu, or mixed.
- Custom picture words: a parent can swap in her own toy, for example her teddy's name for T.

## Off-screen bridges

The app's real job is better writing on paper, so every session ends by sending her away from the screen.

| Bridge | How it works | Version |
| --- | --- | --- |
| Go Find It | Jugnu asks her to find something real that starts with today's letter. She takes a photo, which goes into her sticker book and never leaves the tablet. | v1 |
| Paper missions | One tap prints a worksheet of her practice-more letters. It uses the same colored lines, start dots and arrows as the app. | v1 |
| Paper check | A parent looks at the finished sheet and taps happy, okay or practice more for each letter. Two happy ratings earn the paper badge. | v1 |
| Photo scoring | A parent photographs the sheet and an AI vision model rates each letter's formation. This is the only feature where AI may earn its place; it is an untested idea and must be trialed on real sheets first. | Later |
| Hands-on ideas | A short weekly suggestion for parents: letters in sand, play-dough snakes, shaving foam on a tray. | v1 |
| Sky Writing | Big arm-sized letters in the air (also a mini-game). | v1 |

The colored writing lines must be identical in the app and on paper:

| Line | Color | Used for |
| --- | --- | --- |
| Sky | Blue | Top of tall letters and capitals |
| Fence (dashed) | Gray | Middle: top of short lowercase letters |
| Grass | Green | Base: where every letter sits |
| Ground | Brown | Bottom: tails of g, j, p, q, y |

Urdu letters use the Grass line as their base, with space above and below for dots and tails. Check the exact line spacing against her qaida.

## Adaptive learning

Every character moves through five states, and each session is built from them automatically: one new character, up to two reviews, one warm-up. All thresholds below are starting values to tune with her real data.

| State | Enters when | What the app does |
| --- | --- | --- |
| New | Not yet introduced | Waits its turn in the family order |
| Learning | Introduced today | Runs Stages 1 to 3 |
| Practice more | 2 or more of her last 5 Stage 3 tries had a wrong start or direction | Reviews it every session from Stage 2; adds it to paper missions |
| Secure in app | Correct at Stage 3 in 3 separate sessions | Reviews it 1, 3 and 7 days later, then occasionally |
| Mastered on paper | Parent gives two happy ratings on paper | Rare surprise reviews only |

**Treasure Checkup (weekly).** Jugnu hides five secure characters in a treasure map; she writes each one on the lines with no help. Any slip moves that character back to practice more, quietly, with no message to her.

**What the app records per attempt:** character, stage, start correct (yes or no), direction correct (yes or no), shape score, time taken, finger or stylus, date. That is enough for every rule above and for the parent's stroke replay.

## UX and UI rules for a 4-year-old

The child side of the app has no text, no menus and never more than three choices on a screen; everything else lives behind the parent gate.

| Area | Rule |
| --- | --- |
| Navigation | One obvious path per day. At most three choices on any child screen. No nested menus. |
| Text | None on child screens. Every prompt is spoken. A replay-sound button (an ear) sits in the same corner on every screen. |
| Touch targets | Large and well spaced, so a small finger never hits the wrong one. Where possible, tap anywhere to continue. |
| Gestures | Tap and drag only. No pinch, long-press or swipe navigation, which 4-year-olds trigger by accident. |
| Writing area | At Stage 1 the letter fills most of the screen height, then shrinks across weeks toward paper size. |
| Layout | Landscape. The letter sits in the center; Jugnu and buttons sit on the side her writing hand does not cover. |
| Color | Bright but calm backgrounds, a high-contrast letter path, and color never the only signal (also shape and sound). |
| Sound | Gentle chimes, never buzzers. Music fades out while she is writing. Separate volume for voice and music in the parent zone. |
| Motion | Short animations of about 3 seconds, never while she is tracing. No flashing. |
| Response speed | The glowing trail must follow her finger with no visible lag; lag breaks the feeling of drawing. |
| Exits | Home and back buttons sit behind the parent gate. Android's app pinning keeps her inside the app. |
| Celebration | Small and varied for each stroke; one bigger moment when the whole character comes alive. |

**Key screens** (clickable mockups: https://claude.ai/artifact/QPXJQqQ3vZEYm2q73RZdo8)

1. Map home: three islands, today's adventure glowing, Jugnu ready.
2. Tracing screen: big letter, start dots, Jugnu, colored lines, ear button.
3. Letter comes alive: her letter turns into its picture and joins the world.
4. Sticker book: her collection, with her Go Find It photos.
5. Urdu Garden: Dot Detective on the boat family.
6. Parent zone: progress grid and settings.

## Parent zone

The parent zone sits behind a gate (press and hold for 3 seconds, then answer a simple sum) and holds every setting, all progress, and the family tools.

| Area | What it holds |
| --- | --- |
| Daily limit | 5, 10 or 15 minutes; default 10 |
| Learning setup | Capitals or lowercase first; English letter style to match her school; Urdu letter list and style; Urdu numerals on or off |
| Child setup | Name and avatar; left or right hand; finger or stylus; narration in English, Urdu or mixed |
| Progress | A grid per world: Mastered on paper, Secure, Learning, Practice more. No "struggling" label. |
| Stroke replay | Watch exactly how she wrote any character, slowed down, with her start point marked |
| Weekly note | What she learned this week, which characters need practice, one off-screen activity idea |
| Printables | Print a worksheet of her practice-more characters, or any family |
| Voice recorder | Record praise, letter names and her name in your own voice |
| Custom words | Swap a picture word for one of her own things, with a photo |
| Profiles | More than one child, each with their own progress |

## Guardrails

The app stays short, private and pressure-free by design, because a 4-year-old's total screen budget is small.

| Area | Rule | Why |
| --- | --- | --- |
| Screen time | Default 10 minutes a day, set by the parent; Jugnu's bedtime closes the session | WHO guidance for ages 3 to 4: sedentary screen time no more than 1 hour a day, less is better ([source](https://www.technologynetworks.com/neuroscience/news/limit-screen-time-for-children-under-five-says-who-318671)) |
| Off-screen time | Every session ends with an off-screen mission | The same WHO guidance stresses non-screen activities with a caregiver, such as reading and puzzles |
| Privacy | Offline first; all data and photos stay on the tablet; no child account; no adverts; no third-party tracking | Nothing about her leaves the device |
| Wellbeing | No streak penalties, no losing progress, no comparisons with other children, no diagnostic words like "struggling" or "tremor" | Pressure and labels at 4 cause anxiety, not progress |
| Inclusion | Left-handed mode; color is never the only signal | Works for lefties and color-blind children |
| Before selling | Review children's privacy rules for each store and market (for example Google Play's family app requirements, and US COPPA if sold there) | Not needed for home use, essential before release |

## Build plan

Build for her first in four gated phases, and only turn it into a product once paper results show it works. Durations are estimates for a part-time builder using Claude Code.

| Phase | Time (estimate) | What happens | Gate to the next phase |
| --- | --- | --- | --- |
| 0. Baseline | 1 to 2 weeks | She plays LetterSchool's free version; note what's missing. Confirm her school's letter style and her Urdu qaida. | 3 or more gaps worth building; open decisions settled |
| 1. Home prototype | 2 to 4 weeks | Browser app on her tablet: tracing, Jugnu, stickers. 6 English letters, 3 numbers, the Urdu boat family. | She asks to play; fewer wrong starts; no trail lag |
| 2. Full family app | 6 to 10 weeks | All three worlds, adaptive reviews, parent zone, printables, family voice recordings, Go Find It | Clear paper improvement on 10 or more letters over 6 weeks |
| 3. Product | Later, only if Phase 2 works | Native Flutter app, professional art and voices, privacy review, pilot with 5 to 10 families, pricing test | n/a |

Phase 1 is the next build: small enough for a few weekends, but complete enough to tell whether she loves it.

**Tech choices**

| Layer | Phase 1: home prototype | Phase 3: product |
| --- | --- | --- |
| App | One HTML page in the tablet's browser, built with Claude Code | Flutter app for Android, iOS later |
| Pen input | Browser pointer events, following one touch at a time (no S Pen on her tablet) | Flutter's pointer device types |
| Character data | One JSON file per character: strokes as point lists, start dots, picture word | Same files |
| Scoring | Plain geometry, no AI | Same |
| Storage | Browser storage on the tablet | drift (SQLite) |
| Art | Simple SVG drawings | Commissioned illustrator |
| Voice | Your own recordings | Professional English and Urdu voice artist |

**The hidden effort is stroke data.** About 100 characters need correct stroke paths across English, numbers and Urdu. Shortcut: build a small stroke-recorder page first. You trace each character slowly in the right order on the tablet, and it saves the stroke file for the app and the printables.

## Open decisions

These choices change what gets built, and only you can make them; most are settled by checking her school and qaida.

- [ ] Capitals or lowercase first in English? Match what her school teaches.
- [ ] Which English letter style does her school use? Stroke order differs between styles for letters like k, f and y.
- [ ] Which Urdu alphabet list and order? Counts differ depending on whether ء, ھ and ں are included.
- [ ] Which Urdu handwriting model? Use the one in her qaida or school book.
- [ ] Western digits only, or Urdu numerals too?
- [ ] Voices: your own recordings, a hired voice, or text-to-speech? Urdu text-to-speech quality on Android needs testing first.
- [ ] Companion: show her three characters (firefly, baby dragon, kitten) and let her pick. Her choice beats mine.
- [ ] Daily limit default: 5, 10 or 15 minutes?
- [ ] Check the draft Urdu picture words with a native speaker or her teacher.
