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
