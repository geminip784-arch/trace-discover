# Phase 1 scope — home prototype

Goal: a version she can play daily for 2 weeks, so we learn whether she enjoys it and whether her wrong starts drop.

## In scope

| Area | Phase 1 content |
| --- | --- |
| English letters | Straight-line capitals: E F H I L T |
| Numbers | 1, 4, 7 |
| Urdu letters | Boat family: ب پ ت ٹ ث (one body, then dots) |
| Tracing | Stage 1 dots, Stage 2 ghost, Stage 3 alone, with the feedback rules in CLAUDE.md |
| Companion | Jugnu (`assets/jugnu.svg`), demonstrates strokes and reacts |
| Session | Hello, one warm-up (rain lines), one new character, up to 2 reviews, reward, goodnight |
| World | Map with 3 islands; only Phase 1 characters unlock |
| Rewards | Letter comes alive, sticker book (sketch, color, gold star stages) |
| Voices | Parent-recorded clips, with browser speech as fallback |
| Parent zone | Parent gate, daily limit, stroke recorder, last-attempt replay, practice-more list, reset |
| Install | Home-screen web app, full screen, landscape, works offline |

## Out of scope for Phase 1 (do not build)
- Lowercase letters, numbers beyond 1/4/7, other Urdu families, joined Urdu forms, Urdu numerals
- Spaced-review scheduling (use a simple practice-more list)
- Mini-games other than the rain-lines warm-up
- Go Find It camera, printable worksheets, paper check
- Multiple child profiles
- Any AI feature, any account, any server, Play Store packaging

## Decisions to settle before Slice 3 (recording)
- Letter style her school uses, so recorded stroke order matches it
- Urdu handwriting model from her qaida
