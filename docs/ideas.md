# Ideas parked for later

Claude Code adds ideas here instead of building them mid-slice.

- Dot strokes (`kind: "dot"`, Urdu nuqtas and the dot on i/j) are not scored yet: Slice 2 only uses `scoreStroke`; wire in `scoreDot` for them in a later slice.
- Stage 2 "path narrows a little after each success" (spec, Tracing engine). Slice 4A keeps the fixed `DEFAULTS.stages` widths.
- Browser speech needs one touch on the page before Chrome lets it talk, so the very first "Start here!" after a reload may be silent. Recorded clips (Slice 6) have the same rule for audio; a tap-to-begin moment in the session flow (Slice 5) would cover both.
