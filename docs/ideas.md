# Ideas parked for later

Claude Code adds ideas here instead of building them mid-slice.

- Dot strokes (`kind: "dot"`, Urdu nuqtas and the dot on i/j) are not scored yet: Slice 2 only uses `scoreStroke`; wire in `scoreDot` for them in a later slice.
- Stage 2 "path narrows a little after each success" (spec, Tracing engine). Slice 4A keeps the fixed `DEFAULTS.stages` widths.
- Browser speech needs one touch on the page before Chrome lets it talk, so the very first "Start here!" after a reload may be silent. Recorded clips (Slice 6) have the same rule for audio; a tap-to-begin moment in the session flow (Slice 5) would cover both.
- Slice 5A hides the ear button: with speech switched off (`SPEECH_ON = false` in `src/audio.js`) there is no prompt to replay. Bring it back with the recorded prompts.
- The setup page's "Test voice" button is silent while speech is off.
- Urdu tiles use the tablet's own Urdu font. Noto Naskh Arabic (named in CLAUDE.md) is not in `assets/fonts/` yet.
- `recorder.html` only knows E F H I L T 1 4 7. To record Urdu it needs the ASCII ids from `src/session.js` (`ur-alif-madd`, `ur-be`, ...), the right-to-left direction, and a `"letter"` field in the file it exports. Then add each new id to `data/chars/index.json`.
- Slice 5A plays Stage 1 only and ignores `CONFIG.lastStage`, `lettersPerStage` and `maxAssistedInRow` in `src/progress.js`; the practice rounds in Slice 5B can use them again.
- The Android back button leaves the app; app pinning comes in Slice 7.
- CLAUDE.md's module list could add the three new shell modules: `screens.js`, `art.js` and `music.js`.
