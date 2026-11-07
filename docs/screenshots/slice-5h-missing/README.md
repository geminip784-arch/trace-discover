# Slice 5H, pull request 2: Missing piece

Taken in headless Chromium at 1280 x 626 (the tablet in Chrome), from the real app. Rounds are random, so these are examples.

| File | What it shows |
|---|---|
| `menu.png` | The games menu on four lines. Follow the path and Sort it share the second line. Missing piece has its own row, one tile per level, marked with 1 to 4 dots; only level 1 is open at first, the others are faint. |
| `level-1.png` | Level 1, after Jugnu has placed the first piece. Three shapes of three colors with gaps (dashed holes). Each gap has a piece of its outline in another color, and a piece of its color with another outline; only one fits. |
| `level-1-whole.png` | Every gap filled: the shapes are whole and glow. |
| `level-2.png`, `level-2-whole.png` | Level 2: everything one color, so only the outline tells the pieces apart. |
| `level-3.png`, `level-3-midway.png`, `level-3-whole.png` | Level 3: one shape is missing two pieces (two quarters or two corners); 8 pieces on two rows. |
| `level-4.png`, `level-4-whole.png` | Level 4: picture puzzles. Each card is tinted with its picture's color; the pieces carry part of the picture. |
| `level-4-pictures.png` | Review sheet: every level 4 picture's card, then every piece it may lose (each at least 25% picture, measured by `npm run missing-cuts`). Please check that each piece is recognisable. |
