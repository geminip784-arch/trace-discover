# Scope

Goal: a version she plays daily for two weeks, so we learn whether she enjoys it and whether her wrong starts drop.

## Built (Slices 0 to 5G)

| Area | What she has |
| --- | --- |
| Shell | Front door (first visit of the day), bookshelf, home and back buttons, music |
| English letters | A to Z capitals, all generated from exact shapes |
| Numbers | 0 to 9 |
| Urdu | The board, with the 39 letters in qaida order (faint until Slice 10) |
| Tracing | Three practice rounds (dots, ghost, alone), the feedback rules in CLAUDE.md, never-stuck help, gold stars |
| Find and count | A find scene after every letter but U and X (sound-first pictures in 7 places), a count scene after 1 to 9, her shelf of finds |
| Games book | Match (5 sets), Follow the path (2 sets), Sort it (2), Odd one out (2) |
| Drawing book | Free paper with an eraser; dot to dot in three levels, with coloring |
| Parent tools | Name setup, stroke recorder, glyph review page, find pictures review sheet, attempt log |

## Roadmap (in this order)

1. **5G** Housekeeping and find pictures ✅
2. **5H** Game variety and the Missing piece game
3. **5I** Practice and review: round 3 as a copy-it round judged on shape at 75 to 125% size, reviews after 1, 3 and 7 days, a practice-more list, an optional "again?"
4. **6** Voice and phonics: family voice recorder, greeting by name, spoken prompts, the ear button, each letter's name, sound and picture word
5. **9A** Lowercase
6. **9B** Numbers 10 to 20
7. **9C** Words level
8. **10** Urdu: dot strokes, the Urdu font, recorder support, Dot Detective
9. **8** Parent zone: lock, settings, progress, last attempts, weekly wrong starts, reset
10. **7** Install as an app
11. **11** Shapes book
12. **12** Stories and the daily rhythm: goodnight, a time limit, Jugnu's light, a warm-up
13. **The two-week trial**

Details and "done when" checks for each are in `09-build-sequence.md`.

## Out of scope (do not build)

- Any AI feature, any API key, any account, any server, any analytics
- Multiple child profiles
- Play Store packaging
- Printable worksheets and the Go Find It camera (not on the roadmap; park ideas in `docs/ideas.md`)
- Joined Urdu forms and Urdu numerals (later, after Slice 10)

## Settled decisions

- Capitals first.
- She is right-handed: Jugnu and the buttons float on the left.

## Still to settle

- Her school's letter chart. The stroke order in `data/stroke-order.js` is a drafted default that the chart may replace.
- The Urdu handwriting model from her qaida (before Slice 10).
- Check the draft Urdu picture words with a native speaker or her teacher (before Slice 10).
- The daily-limit default: 5, 10 or 15 minutes (before Slice 12).
