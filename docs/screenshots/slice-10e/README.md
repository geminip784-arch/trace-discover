# Slice 10E — Urdu picture words and find scenes

Taken in headless Chromium (2x).

| File | What it shows |
|---|---|
| `review-sheet.png` | The review sheet (`finds.html`, Urdu section): every Urdu letter in qaida order with its one picture, its Urdu word, its English meaning and its places (the scene's place in bold); the 12 letters with no word yet; then the look-alike groups and the letters that share a sound. |
| `lookalike-sheet.png` | The look-alike check: each of the 27 pictures in color and as a dark silhouette, with its letter, word and meaning. |
| `scene-found.png` | The scene of ب: she found the goat; its word بکری shows with ب in her letter's color, still joined. |
| `scene-wrong-tap.png` | The scene of ت (find the butterfly): a wrong tap on the apple shows its Urdu word سیب. No parrot (ط shares ت's sound). |

## The look-alike checks (as for English)

**Color:** each picture's main color family (the biggest shape's, `tests/art-colors.js`). **Outline:** each silhouette fitted to one box and compared, as the share of their area in common (1 = the same outline), then everything looked at side by side on `lookalike-sheet.png`.

| Kept apart | Why | Measured |
|---|---|---|
| apple, pomegranate, mango | round red fruit | same color; outlines overlap 0.71 to 0.83 |
| apple, balloon | round and red (approved with the plan) | same color |
| mango, lemon | an oval fruit with a leaf | outlines overlap 0.70 |
| moon, banana | a yellow crescent | same color (they curve opposite ways, so the outline score is low) |
| lion, bear | a round furry face | outlines overlap 0.87 |
| goat, cow | a white animal on four legs | outlines overlap 0.71 |

Looked at and not grouped: mango and apple with the lion's face (round outlines score high, but a face with a mane never reads as a fruit), and the blue pictures (kite, butterfly, cap, airplane, glasses, fish), whose shapes all differ.
