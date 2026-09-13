# UI-редизайн в стиле Warcraft: промты по экранам

Промты для картиночной нейросети (Midjourney / DALL-E / Flux / Ideogram — любой, который
держит текст и композицию). Один экран — один блок, копируется целиком.

Цель: получить **референсные макеты** каждого экрана в едином стиле, а потом свёрстать их
на CSS. Верстаться будет не картинка целиком, а:

- фоновые арты (главное меню, фоны рас) — как есть, `<img>` / `<video>` под контентом;
- рамки панелей, кнопки, чипы, слайдер — как **9-slice** ассеты из UI-кита (блок 9);
- всё текстовое и числовое — живой HTML поверх.

Поэтому важно: экраны генерим для понимания композиции и настроения, а UI-кит — для
реальных ассетов. Без блока 9 верстать не с чего.

---

## Как пользоваться

1. Каждый промт начинается с общего блока `STYLE` — он одинаковый, чтобы экраны
   выглядели как одно приложение. Не убирать.
2. Портретная ориентация, соотношение **9:16** (приложение ограничено 480px по ширине).
   В Midjourney добавить `--ar 9:16`, в других — задать 1080×1920.
3. Для UI-кита (блок 9) — соотношение **3:4** или **1:1**, фон однотонный тёмный,
   чтобы легко вырезать.
4. Текст в макетах — на английском, как в приложении. Реальные названия рас и башен
   указаны, чтобы макет совпадал с тем, что будем верстать.
5. Если генератор портит текст — добавить в конец `no text` и подписи потом
   накладываются вручную. Композиция важнее надписей.

---

## Общий блок стиля (вставляется в начало каждого промта)

```
STYLE: Dark fantasy mobile game UI in the style of Warcraft III and Hearthstone menus.
Portrait phone screen 9:16. Heavy ornate frames made of dark forged iron with riveted
edges and gold filigree corners, small red gem accents at the top center of frames.
Beveled stone-and-metal panels with a subtle inner glow. Rich gold serif typography
with dark outline (Belwe / Warcraft-style lettering). Palette: near-black navy
background #0b0f16, dark steel greys, warm gold #d8a441 highlights, deep crimson red
#8a1a1a for primary actions, mossy green for confirm, ice blue for secondary hover.
Moody painted backgrounds with fog, torchlight and lightning. Crisp, clean UI edges,
no blur on interface elements. High detail, 2D game UI mockup, no watermark, no
photorealism, no 3D render look.
```

---

## 1. Главное меню (StartPage)

Что верстается: фон (видео/арт), герб + логотип, 3 кнопки, 3 иконки внизу, версия.

```
STYLE: [общий блок]

SCREEN: Main menu of a tower defense game. Full-bleed painted background: a ruined
stone watchtower on a cliff at night, purple storm sky with lightning, glowing lava
cracks at the bottom, a torn red war banner on the right side. Vertical composition
for a phone.

Top third: a large ornate crest — a black iron shield with gold trim and a red gem
on top — and the game title "TOWER DEFENSE" in big gold Warcraft-style serif letters
with a dark bevel. Under it a small grey caption "PROTECT YOUR KINGDOM".

Middle: three stacked wide buttons with iron frames and gold corner ornaments:
1) "NEW GAME" — crimson red fill, brightest, primary.
2) "SETTINGS" — dark steel grey fill.
3) "EXIT" — dark steel grey fill.
Buttons are the same width, about 70% of screen width, with even spacing.

Bottom: a row of three small square iron-framed icon buttons: a gold trophy, a
gold star, a gold gear. Bottom right corner a tiny grey caption "v0.1.0-alpha".

Leave the background visible between elements. No extra UI, no health bars, no
characters in the foreground.
```

---

## 2. Выбор расы (GameSetupPage, шаг Choose Your Race)

Что верстается: топбар (назад, заголовок, 4 точки), большая карточка-карусель с
видео/артом расы внутри, стрелки, имя расы, описание, стартовая башня и её спрайт,
счётчик «1 / 4», кнопка Choose.

Нужно 4 варианта карточки (по одному на расу). Генерить один экран с одной расой,
затем менять секцию `RACE CARD` и цвет акцента.

```
STYLE: [общий блок]

SCREEN: "Choose your race" step of a match setup wizard in a tower defense game.
Dark stone background with faint runes. Portrait phone.

Top bar: a small square iron button with a gold "<" chevron on the left, centered
gold serif title "CHOOSE YOUR RACE" flanked by thin gold ornamental lines, and under
it four small round progress dots — the first one lit gold, the other three dim grey.

Center: one large tall card taking most of the screen, thick ornate iron frame with
gold corners and a red gem at the top. Inside the card, edge to edge, a painted
faction artwork (see RACE CARD). On the lower half of the card, over a dark gradient:
the faction name in large glowing letters, a two-line grey description, a small caption
"STARTER TOWER" and under it the tower name in the faction color, then a small pixel-art
sprite of that tower unit, then a tiny counter "1 / 4".

Left and right of the card, vertically centered: two square iron buttons with gold
"<" and ">" chevrons for switching factions.

Bottom: one wide button "CHOOSE" with a mossy green fill inside an iron-and-gold frame.

RACE CARD (Undead): necropolis with green fel fire, skulls, chains, bone spires,
a hooded lich in the background. Accent color sickly green. Name "UNDEAD", description
"Dark necromantic builders focused on relentless pressure.", starter tower
"BONE ARCHER", sprite: a skeleton archer with a bow.
```

Замены для остальных рас:

```
RACE CARD (Orc): a burning war camp with spiked wooden palisades, totems, red skies,
a hulking orc warlord silhouette. Accent color blood red-orange. Name "ORC",
starter tower "GRUNT TOWER", sprite: a green orc grunt with an axe.
Progress dots: second dot lit.

RACE CARD (Human): a white stone castle keep with blue banners, sunrise breaking
through storm clouds, a knight in plate armor. Accent color royal blue and silver.
Name "HUMAN", starter tower "ARCHER TOWER", sprite: a human archer in blue tabard.
Progress dots: third dot lit.

RACE CARD (Elf): an ancient moonlit forest with giant glowing trees, violet mist,
a slender elven ranger. Accent color teal-violet. Name "ELF", starter tower
"MOON ARCHER", sprite: an elf archer with a silver bow.
Progress dots: fourth dot lit.
```

(Реальные имена стартовых башен для орков/людей/эльфов взять из
`src/content/towers/*.json` перед генерацией — в промте выше они условные.)

---

## 3. Выбор вражеской фракции (шаг Select Enemy Faction)

Что верстается: шапка как в шаге 2, сетка 2×2 карточек, выделенная карточка, кнопка
Continue внизу.

```
STYLE: [общий блок]

SCREEN: "Select enemy faction" step of a match setup wizard. Same top bar as before:
small iron back button, centered gold title "SELECT ENEMY FACTION", four progress dots
with the second one lit gold and the first one filled dim gold (completed).

Center: a 2x2 grid of four equal square-ish cards with iron frames. Each card has a
round faction emblem at the top, the faction name in gold serif, a two-line grey
description and a small caption "Creeps: ...". Cards:
- "UNDEAD" — green skull emblem, "Creeps: Skeletons".
- "ORC" — red axe emblem, "Creeps: Grunts".
- "HUMAN" — blue lion emblem, "Creeps: Footmen".
- "ELF" — violet leaf emblem, "Creeps: Archers".
The "ORC" card is selected: its frame glows red-orange with a brighter gold border,
the other three are dimmer.

Bottom: one wide button "CONTINUE" with a mossy green fill inside an iron-and-gold
frame.
```

---

## 4. Выбор сложности (шаг Choose Difficulty)

Что верстается: 4 горизонтальные строки-кнопки, у каждой имя, описание и 4 чипа с
модификаторами; выделенная строка.

```
STYLE: [общий блок]

SCREEN: "Choose difficulty" step of a match setup wizard. Same top bar: iron back
button, gold title "CHOOSE DIFFICULTY", four progress dots with the third one lit.

Center: four stacked wide horizontal rows, each an iron-framed panel with a dark
stone fill. Each row has: the difficulty name in gold serif on the left top, a short
grey description line under it, and a row of four small rounded chips with a thin
gold border and tiny text: "Gold 120%", "Creep HP 80%", "Speed 90%", "Rewards 100%".
Rows from top to bottom: "EASY", "NORMAL", "HARD", "NIGHTMARE".
The "NORMAL" row is selected: glowing gold border, slightly lighter fill.
"NIGHTMARE" has a faint red tint and a small skull icon.

Bottom: one wide button "CONTINUE" with a mossy green fill inside an iron-and-gold
frame.
```

---

## 5. Сводка матча (шаг Match Summary)

Что верстается: список пар «подпись — значение» в панели, тумблер, кнопка Start Game.

```
STYLE: [общий блок]

SCREEN: "Match summary" step of a match setup wizard. Same top bar: iron back
button, gold title "MATCH SUMMARY", four progress dots with the last one lit.

Center: one tall ornate iron-framed panel with a dark stone fill and a red gem at
the top. Inside, five rows separated by thin gold hairlines. Each row has a small
grey uppercase label on the left and a large value on the right:
- "BUILDER RACE" — "Undead" in green.
- "ENEMY FACTION" — "Orc" in red-orange.
- "DIFFICULTY" — "Normal" in gold.
- "STARTER TOWER" — "Bone Archer" in white.
- "DYNAMIC ENTRANCES" — an iron toggle switch with a gold knob, set to off, and the
  text "Classic lane" next to it.

Bottom: one wide button "START GAME" with a crimson red fill inside an iron-and-gold
frame, the most prominent element on the screen.
```

---

## 6. Настройки (SettingsPage)

Что верстается: шапка, две секции со слайдерами и процентами.

```
STYLE: [общий блок]

SCREEN: Settings screen of a tower defense game. Dark stone background with faint
torchlight vignette. Top bar: iron back button with a gold "<" chevron on the left,
centered gold serif title "SETTINGS".

Center: one ornate iron-framed panel containing two settings rows with generous
spacing. Each row: a gold uppercase label on the left ("SOUND EFFECTS", "AMBIENT
MUSIC"), under it a long horizontal slider — a recessed iron groove track, the
filled part glowing warm gold, a round riveted iron knob with a gold rim — and at
the right end of the row the value in white: "80%" and "60%".

Plenty of empty space below; nothing else on screen.
```

---

## 7. Игровой экран (GamePage) — основной

Это самый важный экран. Структура сверху вниз (реальная раскладка приложения):

1. **Поле боя** (canvas, занимает верхние ~60%): тайловая карта, дорога, башни, крипы.
   - Поверх, у верхнего края — **очередь волн** (WaveQueue): строка с подписью, счётчик и
     ряд иконок крипов.
   - Поверх, у нижнего левого края — **лента событий** (DuelEventFeed): 3–4 строки
     полупрозрачного лога.
   - Поверх, при выборе башни — **панель башни** (TowerActionPanel), см. блок 7b.
2. **Панель отправки крипов** (CreepSendPanel): заголовок «Send Orc», золото/доход,
   ряд из 4–5 чипов с портретом крипа, тиром, ценой, доходом.
3. **HUD** (HudPanel): строка золото / центр (переключатель поля, таймер автостарта,
   кнопка Start Wave) / HP; индикатор давления; строка дуэли «you vs enemy»; кнопка
   сворачивания; в развёрнутом виде — 4 кнопки башен с ценой и строки статуса.

Промт 7a — свёрнутый HUD (обычное состояние), 7b — панель башни, 7c — развёрнутый HUD.

### 7a. Игровой экран, HUD свёрнут

```
STYLE: [общий блок]

SCREEN: The main gameplay screen of a mobile tower defense game, portrait phone.

Top 60% of the screen: the battlefield — a top-down painted tile map of a dark
swamp with a winding dirt road from the top edge to the bottom edge, a few small
pixel-art undead towers on stone plinths beside the road, and a line of small orc
creeps walking along it. Muted colors so the UI reads clearly.
Overlaid on the top edge of the battlefield: a slim translucent dark strip with an
iron border containing a small gold label "NEXT WAVE", a counter "12 creeps" and a
row of tiny creep portrait icons in square iron frames, the last one showing "+4".
Overlaid on the bottom-left corner of the battlefield: three lines of small
translucent log text, e.g. "Enemy sent 3 Grunts", "Wave 10 started", "+15 income",
the newest line brightest.

Bottom 40% of the screen: two stacked UI panels, both ornate iron frames with gold
corner ornaments and a dark stone fill.

Panel A "send creeps": a header row with the gold title "SEND ORC" on the left,
a small grey note "Queue: 2" in the middle and "$ 1250  INC 42" on the right. Under
it a horizontal row of five square chips, each with an iron frame: a pixel-art
creep portrait (grunt, troll, wolf rider, headhunter, catapult), the creep name
under it, and a tiny stat line "T1  $30  +4". The last chip is dimmed with a small
red note "Not enough gold".

Panel B "HUD": a top row with three parts — left: a gold coin icon and "1250";
center: a small pill toggle "ENEMY FIELD", a timer "Auto: 0:14" and a compact
crimson button "START WAVE"; right: a red heart icon and "20". Under it a thin
horizontal pressure bar labeled "PRESSURE: MEDIUM" glowing amber. Under it a
"duel" row: "You: 20 HP · 42 inc" on the left in white and "Enemy: 17 HP · 38 inc"
on the right in red. In the top-center of the panel a small iron tab with a gold
"^" chevron for expanding.

Everything crisp and readable; keep the layout exactly in this vertical order.
```

### 7b. Панель выбранной башни (TowerActionPanel)

Показывается поверх поля боя над панелями. Верстается как отдельный оверлей.

```
STYLE: [общий блок]

SCREEN: The same gameplay screen as before (battlefield on top, send-creeps panel
and HUD at the bottom), but now a tower is selected on the map and highlighted with
a glowing gold range circle. A compact tower info panel floats over the lower part
of the battlefield, right above the bottom panels: ornate iron frame with gold
corners, dark stone fill.

Panel contents: header row — a square pixel-art portrait of a skeleton archer
tower in an iron frame, the name "BONE ARCHER" in gold serif, a small gold badge
"Lv 2", and a small iron "X" close button on the right.
Stats row in a 2x2 grid of small label/value pairs: "DMG 14", "RNG 3.5",
"SPD 900ms", "AOE 1.0".
A short list of effect lines with tiny icons: "Slow 20% for 1.5s", "Poison 3/s".
A dimmed line "NEXT: Slow 25%".
Two buttons side by side at the bottom of the panel: "UPGRADE $120" with a mossy
green fill and "SELL $45" with a crimson red fill, both in iron-and-gold frames.
```

### 7c. HUD развёрнут (кнопки постройки башен)

```
STYLE: [общий блок]

SCREEN: The same gameplay screen, but the bottom HUD panel is expanded and taller,
pushing the battlefield up. The expand tab now shows a gold "v" chevron.

Under the resource row (gold "1250" left, timer + "START WAVE" center, heart "20"
right) there is a section "BUILD" with four square tower buttons in a row, each an
iron frame with a dark fill: a pixel-art tower portrait, the name under it and the
cost in gold with a coin icon:
"BONE ARCHER $100", "PLAGUE TOWER $150", "FROST WYRM NEST $200", "BONE OBELISK $250".
The first button is selected with a glowing gold border. A fifth empty slot has a
dim skull emblem.
Under the buttons: two compact rows of small grey label / white value pairs:
"Race: Undead  Enemy: Orc  Diff: Normal" and "Wave: 10  Phase: Build".
Then one more row in a slightly red tint: "Enemy gold 980  income 38  HP 17  sends 2".
At the very bottom a line "Selected: Bone Archer (3,7)".
```

---

## 8. Оверлей результата матча (MatchOutcomeOverlay)

Два состояния — победа и поражение.

```
STYLE: [общий блок]

SCREEN: A modal overlay on top of the darkened, blurred gameplay screen of a tower
defense game. Center: an ornate iron-framed panel with gold corners and a red gem
on top, dark stone fill, with a faint golden light burst behind it.

Panel contents: a huge title "VICTORY" in glowing gold serif letters with a warm
light glow, under it a grey line "The enemy keep has fallen on wave 14".
A row of three stat blocks separated by thin gold hairlines, each with a small grey
uppercase label and a big white value: "YOUR HP  12", "ENEMY HP  0", "INCOME  64".
Under it one wide button "BACK TO MENU" with a dark steel fill in an iron-and-gold
frame.
```

```
VARIANT (defeat): the title is "DEFEAT" in dull crimson red letters with a cold
blue-grey glow, the background light burst is replaced by ash and embers, the stat
values read "YOUR HP  0", "ENEMY HP  9", "INCOME  41". Everything else identical.
```

---

## 9. UI-кит (ассеты для вёрстки)

Это лист, из которого будут вырезаться реальные ассеты (9-slice рамки, кнопки, чипы,
слайдер, иконки). Генерить в 1:1 или 3:4, элементы **раздельно, на однотонном фоне,
с большими отступами**, без наложений и теней за пределы элемента.

```
STYLE: [общий блок]

SHEET: A UI component sheet for a dark fantasy mobile game, laid out on a flat
solid #0b0f16 background with wide even gaps between items, each item isolated,
no overlapping, no drop shadows outside the element, no decorative background.
Small grey captions above each group.

GROUP "PANEL FRAMES": three empty rectangular frames of different proportions
(tall card, wide panel, small square) — dark forged iron border with rivets, gold
filigree corner ornaments, a small red gem at the top center, dark stone fill inside.
Corners must be identical on all four sides so the frame can be sliced.

GROUP "BUTTON STATES": four rows of wide rectangular buttons, each row showing three
states left to right: normal, hover (brighter with an outer glow), pressed
(darker, inset). Rows:
1) primary — crimson red fill, gold frame, text "PLAY";
2) confirm — mossy green fill, gold frame, text "CHOOSE";
3) secondary — dark steel fill, iron frame, ice blue glow on hover, text "OPTION";
4) danger — dark crimson fill, red glow on hover, text "QUIT".

GROUP "SMALL BUTTONS": a row of five small square iron-framed buttons with gold
glyphs: "<", ">", gear, "X", a green check. Then the same five in a pressed state.

GROUP "TABS": a row of three connected tab buttons "TOWERS" (active, gold fill),
"UPGRADES", "STATS" (inactive, dark).

GROUP "CHIPS AND BADGES": a small rounded chip with a thin gold border and text
"Gold 120%", a level badge "Lv 2", a cost badge with a coin icon "$120", a square
portrait slot (empty iron frame with a dim skull), a round progress dot lit gold and
one dim grey.

GROUP "SLIDER AND TOGGLE": a horizontal slider track (recessed iron groove, gold
filled part, riveted round knob) and a toggle switch in off and on states (gold knob).

GROUP "ICONS": gold coin, red heart, hourglass, trophy, star, gear, skull, sword,
shield, up-chevron, down-chevron, all in the same 1:1 size on a transparent-looking
dark square.

GROUP "BARS": a thin pressure bar in three fills — green, amber, red — inside an
iron groove.

Flat, front-facing, evenly lit, pixel-crisp edges, suitable for slicing into game
UI assets.
```

---

## Порядок работы после генерации

1. Сначала генерить **блок 9 (UI-кит)** и **блок 1 (меню)** — по ним фиксируется стиль.
   Если генератор увёл палитру или форму рамок, править общий блок `STYLE` и
   перегенерировать, пока кит и меню не совпадут.
2. Затем экраны 2–8. Экраны 7a/7b/7c генерить подряд одним и тем же seed, если
   генератор это умеет — иначе поле боя будет разным на трёх макетах.
3. Вырезать из кита: рамку панели (9-slice), 4×3 состояния кнопок (9-slice), малые
   кнопки, чипы, ползунок, иконки. Сложить в `public/assets/ui/`.
4. Фоны: меню — заменить `background.mp4` или положить статичный арт; расы — карточки
   `undead/orc/human/elf` как фон `.setup-race-media`.
5. Вёрстка: сначала общие токены (`src/app/styles`), затем `FantasyButton` на новых
   ассетах, затем панели экран за экраном в порядке 1 → 6 → 2–5 → 7 → 8.
