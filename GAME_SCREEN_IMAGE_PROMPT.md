# Промпт для GPT Image: игровой экран (сборка из двух референсов)

Приложите две картинки в этом порядке:

1. **Image 1** — макет Claude Design (три экрана: towers tab, send tab, develop mode).
2. **Image 2** — скриншот текущей игры (с плашкой «NEXT: WAVE 1 · BASELINE WAVE» сверху).

Размер генерации: портрет 1024×1536. Затем вставьте промпт целиком.

---

```
Design ONE portrait mobile game screen (phone, 9:19.5, safe areas respected) for a dark-fantasy tower defense duel inspired by Warcraft III custom maps. You are given two reference images. Combine them as instructed, then restyle the result in your own hand — this is a concept painting of a UI, polished and production-looking, not a copy of either image.

WHAT TO TAKE FROM IMAGE 1 (the mockup, left/first image):
- The BLOCK LAYOUT and proportions, top to bottom: a thin top bar; a tall battlefield taking about 60% of the height; a compact status bar (gold with "+50/wave", lives "20 vs 18" with a heart, and a red "START WAVE 6 · auto in 0:28" button); then an action dock with two tabs "TOWERS" and "SEND 12/12" and a row of four cards (tower cards: icon, name, price; send cards: portrait, cost, "+10" income, "6/6" cap, a small XP bar and a "G2/4" badge).
- The event feed line sitting to the left of pause / 1× / 2× / close controls.
- The idea that the dock is a single solid panel with the cards inside it.

WHAT TO TAKE FROM IMAGE 2 (our current game, right/second image):
- The TOP PLATE exactly in this spirit: an ornate dark iron-and-gold plate across the top reading "NEXT: WAVE 6" in golden Cinzel-style capitals with the subtitle "baseline + 3 enemy sends" and, at its right end, a strip of small creature portraits with "×4 ×2 ×2 ×1" counts. Keep this plate as the top bar instead of the mockup's thin bar.
- The material language of the panels: aged dark steel frames with gold filigree corners, a dark leather/stone inner fill, embossed gold headings, glowing gold coin and red heart icons, the crimson START WAVE button with a metal rim, the mossy-green DEVELOP outline button, dark card slots with painted creature portraits.

WHAT TO IMPROVE IN YOUR OWN WAY:
- The battlefield: a 20×30 grid of dark earth cells, a winding maze of 2×2 towers (bone archers, plague towers, obelisks, a frost wyrm nest — painted icons, not blurry pixels), the path drawn as a warm sandy track from a green "IN" gate at the top to a red "OUT" gate at the bottom, a soft blue dotted route line, a small creep or two walking it, subtle vignette and fog at the edges, a tiny red "Blocks the path" tooltip over one invalid cell. Make the field read as a real place, with depth and lighting, but keep the grid legible.
- Typography: display text in Cinzel-like engraved gold capitals, UI numbers bold and large, small labels in a clean humanist sans. Palette: page #0a0c11, panels #12151d–#1a1f2c, hairlines #262c38, text #eff4ff / #bed0ee, gold #f0d188, parchment #e6dfcd, success green #44aa44, danger red #ff7b6b, warning #ffb15f; the player's race (Undead) tints accents with sickly green #8fd14f, the enemy (Orc) appears in ember orange #ec7048.
- Every tappable thing at least 44 px tall; nothing overlaps the battlefield.

Mood: Warcraft III custom map meets a modern premium mobile UI — heavy, dark, metallic, slightly worn, with warm gold highlights and cold green undead glow. Crisp, high detail, consistent lighting from the top left, no text other than the labels mentioned, no watermarks, no phone frame.
```
