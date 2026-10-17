# Промпт для Claude Design: игровой экран

## Что приложить к промпту

Это главное: без этих файлов Claude Design придумывает свой стиль. Перетащите в чат:

1. **UI-кит** — `public/assets/ui/kit/*.png`: кнопки (primary, confirm, danger, secondary в трёх состояниях), бейджи, полосы, фишка золота, камень, точки.
2. **Иконки башен** — 4 файла одной расы из `public/assets/ui/tower-icons/`, например `orc_*.webp`.
3. **Портреты существ** — 4 файла той же расы из `public/assets/ui/portraits/`.
4. **Эмблемы рас** — `public/assets/ui/factions/*.webp`.
5. **Иконки талантов** — 2–4 файла из `public/assets/ui/talents/`.
6. **Референс атмосферы** — картинка из GPT Image с экраном «WAVE 6».
7. **Скриншот текущей игры** — как сейчас выглядит экран, чтобы было от чего отталкиваться.

Затем вставьте промпт ниже целиком.

---

## Промпт

```
You are redesigning the in-match screen of an existing mobile game. This is a UX redesign within an established visual identity — not a new art direction. Use ONLY the attached assets and the tokens below. Do not invent new illustration styles, generic gradients, glassmorphism, neon, flat material cards or stock icons. If you need an element that has no attached asset, build it from the attached UI kit pieces (frames, buttons, badges, bars) and the tokens.

THE GAME
A Warcraft-III-inspired tower defense DUEL on a phone, portrait first. Each player builds a maze of 2x2 towers on their own 20x30 grid board while sending creatures to the opponent's board. A match is ~25 rounds; each round = a build phase (~30 s, auto-start countdown) then a wave phase (~20–40 s). Four races: Undead, Orc, Human, Elf.

DESIGN TOKENS (use exactly these)
- Fonts: display/headings 'Cinzel'; accent 'Marcellus'; UI/body 'Exo 2'; numbers/stats 'Cinzel'. Sizes 10/11/12/14/16/20 px.
- Text: primary #eff4ff, secondary #bed0ee, muted #9fb2d4, gold #f0e3c0, parchment #e6dfcd, accent gold #f0d188.
- States: success #44aa44, danger #ff7b6b, warning #ffb15f, info #5c8cff. Enemy pressure: low #f0d188 → medium #ffb15f → high #ff7b6b.
- Surfaces: page #0a0c11, panel #12151d, raised #1a1f2c, sunken #0c0f15, pressed #07090d, bar #0f1219, hairline #262c38, body text on panels #ece6d6.
- Race accents (main / secondary / deep): Undead #8fd14f / #86ccff / #2f6b2a; Orc #ec7048 / #ffa033 / #7a1d14; Human #6b9df5 / #f0d188 / #1f3a7a; Elf #a98cf5 / #4fd9a6 / #47297a. The player's race tints accents, glows and emblem placement; the opponent's race is used for enemy information.
- Buttons: crimson primary (Start Wave), mossy green confirm, steel secondary, danger — use the attached kit images and their normal/hover/pressed states.

HARD CONSTRAINTS
- Viewports: 390x844 and 360x800 portrait (primary), plus 844x390 landscape.
- Every tappable control ≥ 44x44 px. Respect top/bottom safe areas. Text meets WCAG AA on its surface.
- NOTHING may overlay the battlefield except transient, dismissible in-world feedback.
- The battlefield is the product. In portrait it must get at least 60% of the screen height in the build phase and at least 65% during a wave.

UX PRINCIPLES (the core of the brief — design by frequency of use)
Design the screen around how often each piece of information or action is used, and in which phase:

1. Always visible, glanceable, zero taps (seconds-level): gold, lives (yours vs enemy), wave number, phase + auto-start countdown, Start Wave. Group them in ONE compact status bar, numbers large, labels minimal.
2. Every build phase, one tap away (tens of seconds): the 4 tower build buttons (icon + cost), the 4 creature send cards (portrait + cost + per-wave cap). These are the main action surfaces — put them in the thumb zone at the bottom; they may swap places by phase (build: towers primary; wave: sends locked/dimmed and collapsed).
3. Occasionally (once per few rounds), behind one deliberate tap, as a bottom sheet that does NOT shrink the board: tower action panel (upgrade / sell / Develop talents), creature Develop (XP, branches, grades), enemy board view toggle, duel event log, income/XP details.
4. Rarely (once per match or less), in a menu: pause, speed (1x/2x), quit, settings.

Progressive disclosure rules:
- Bottom sheets open over the controls area, never over the board; swipe down / tap outside / Esc to close; remember the last open tab per match.
- During a wave, auto-collapse everything that can't be used (building is locked, sending is locked) and give the space back to the board.
- One primary action per moment: in the build phase it is Start Wave; in the wave phase there is none (just watching), so the bottom area shrinks to the status bar.
- Information density in moderation: show counts and deltas, not tables; details on tap.
- Feedback in the world, not in panels: build rejected, gold +/-, lives lost appear as short floating text/flashes near the cause, with the duel log as history.

SCREENS TO DELIVER (portrait 390x844 unless noted)
1. Build phase, default (sends collapsed or tabbed, towers primary).
2. Build phase, send tab open (4 creature cards with portrait, cost, income bonus, x/cap, thin XP bar, branch glyph + "G2/4" when developed).
3. Wave phase (maximal board, minimal bar, live enemy-field status "Enemy field: 5 left").
4. Tower selected → bottom sheet: icon, name, "Lv 4/7", damage/range/cooldown with a NEXT preview, Upgrade $150, Sell, and at Lv 3 "Develop $120".
5. Talent branch chooser (towers and creatures share it): two cards with the attached talent icons, name, one-line description, grade table, price; Choose → Confirm; warning "Locks the other branch for all <Tower> this match".
6. Enemy board view (read-only, clearly marked "ENEMY", one tap back).
7. Match outcome modal (race emblem of the winner, title, reason "Both fell on wave 12 — you leaked fewer", 3 key stats, Rematch / Back to menu).
8. The same build-phase screen at 360x800 and in landscape 844x390 (board left at full height, controls in a right column).

ALSO DELIVER
- A short rationale per screen: what is always visible, what is one tap away and why (frequency of use), how the board's share of the screen changes by phase.
- A component sheet built from the attached kit: status bar, build button, send card, bottom sheet, branch card, badges, bars, toggles — with states (default, pressed, disabled with reason, locked during wave, selected).
```
