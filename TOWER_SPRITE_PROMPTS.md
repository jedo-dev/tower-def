# Промпты для спрайтов башен (GPT Image)

8 промптов: по 2 на каждую расу. Один промпт даёт **две башни одной расы на одной картинке**:
каждая башня — свой блок 5 × 3 (15 слотов), блоки стоят друг над другом.

- 16 башен всего, арт есть у двух: `tower.undead.bone_archer` и `tower.elf.moon_archer`.
  Они попали в пару к недостающим башням как **необязательная перерисовка**: если
  нужна только новая башня, берите одиночный вариант промпта (см. «Если пара не вышла»).
- Дизайн башен (что изображено, палитры рас) взят из `docs/09-sprite-prompts.md`,
  чтобы два документа друг другу не противоречили. Отличие этого файла — формат выдачи:
  он подогнан под нарезчик `tools/build-sprite-sheet.py` (магента-фон, без подписей,
  две башни на картинку).

---

## Можно ли генерировать две башни за раз

**Да, это реалистично**, с оговорками.

| Вариант раскладки | Ячейка исходника | Вердикт |
|---|---|---|
| 1024 × 1536 (портрет), сетка 5 × 6, блоки сверху и снизу | ~205 × 256 | **Берём.** Ячейка почти квадратная, башня в ней ~170–200 px. |
| 1536 × 1024 (альбом), сетка 5 × 6 | ~307 × 170 | Плохо: ячейка в 1.8 раза шире высоты, башни мелкие, много пустоты. |
| 1536 × 1024, два блока 5 × 3 рядом (10 × 3) | ~154 × 341 | Плохо: узкие высокие ячейки, широкие башни (ямы, гнёзда) не влезут. |

Почему разрешения хватает: финальный кадр — 60 × 60, в игре башня рисуется примерно
42 × 42. Даже 170 px исходника — это ×3–4 запаса. Эталонный лист нежити генерировался в
1536 × 1024 сеткой 5 × 3 (ячейка 307 × 341), то есть деталей там было даже больше,
чем потом пережило уменьшение.

Риски и как с ними жить:

1. **Счёт ячеек.** 30 ячеек модель путает чаще, чем 15: пропускает слот, рисует 4 кадра
   в ряд вместо 5, заполняет пустые слоты. Поэтому в промпте явная таблица слотов и
   финальная проверка «26 кадров, 4 пустых». Перед нарезкой посмотрите глазами,
   что каждый ряд — ровно 5 ячеек.
2. **Перетекание мотивов.** Детали башни A лезут в башню B (котёл обрастает рогами).
   Поэтому в пару ставятся **непохожие** башни: высокая + низкая, разные цвета свечения.
   Две ямы орков или две «растительные» эльфийские башни в одной паре — плохая идея.
3. **Плюс пары:** обе башни получаются одним «художником» — одинаковые контур, свет,
   ракурс и масштаб. Внутри расы это даже лучше, чем 4 отдельные генерации.
4. Если пара упорно не выходит — генерируйте по одной (раздел в конце), это не ломает
   ничего дальше по пайплайну.

---

## Стиль эталона (что видно на `public/assets/towers/undead_bone_archer.png`)

Это сырой лист 1536 × 1024, из которого вручную в Figma собран
`undead_bone_archer.svg` (300 × 180), который и грузит игра.

- **Ракурс:** три четверти сверху, камера спереди и выше, башня почти симметрична,
  смотрит прямо на зрителя. Основание — кольцо серого щебня внизу ячейки.
- **Рисунок:** HD pixel art (16-бит JRPG / Warcraft III), плотная, но крупная детализация,
  тёмный контур 1–2 px, мягкий дизеринг, свет сверху-слева.
- **Палитра:** потемневшая бронза/золото, тёмно-фиолетовые полотнища, слоновая кость
  черепов, и **один** яркий акцент — красный кристалл и красные руны. Всё остальное
  приглушено.
- **Пропорции:** широкое основание ~4/5 ширины ячейки, башня ~3/4 высоты, треугольный
  силуэт.
- **Кадры:** BUILD 1 — только фундамент-кольцо с фиолетовой ямой; BUILD 2 — половина
  постройки без кристалла; BUILD 3 = IDLE 1, IDLE 2 отличается только яркостью свечения;
  ATTACK — кристалл заряжается, вспыхивает, болт уходит вправо; HIT — вся башня залита
  красным; SELL 1 — разваливается, SELL 2 — куча обломков; PROJECTILE — красный шар со
  шлейфом вправо; IMPACT — круглая красная вспышка.
- **Чего на эталоне быть не должно в новых листах:** подписи кадров в фиолетовых плашках
  прямо в ячейках и белый фон (вокруг арта остался белый ореол). Нарезчик такие подписи
  примет за часть спрайта, поэтому новые промпты требуют **никакого текста** и
  **сплошную магенту**.

Эльфийский `elf_moon_archer.png` уже прошёл через нарезчик (300 × 180) и подтверждает,
что формат «сетка на однотонном фоне → скрипт» работает.

---

## Карта слотов (контракт `TOWER_SHEET_CONTRACT_FRAMES`, `src/shared/constants/sprites.ts`)

Кадр 60 × 60, лист 300 × 180, нумерация слева направо, сверху вниз:

| Ряд | Слоты |
|---|---|
| 1 | 0 BUILD 1 · 1 BUILD 2 · 2 BUILD 3 · 3 IDLE 1 · 4 IDLE 2 |
| 2 | 5 ATTACK 1 · 6 ATTACK 2 · 7 ATTACK 3 · 8 пусто · 9 HIT |
| 3 | 10 SELL 1 · 11 SELL 2 · 12 PROJECTILE · 13 IMPACT · 14 пусто |

- Анимации: build `0–2`, idle `3–4` (цикл), attack `5–7`, hit `9`, sell `10–11`.
- `12` и `13` — снаряд и эффект попадания, без башни в кадре.
- `8` и `14` игра не читает. Если модель туда что-то нарисовала — не страшно, но лучше
  перегенерировать или стереть.
- Эталон нежити — легаси: у него hit в слоте 8 (это прописано в
  `TOWER_SHEET_FRAME_LAYOUTS`). Новые листы рисуем строго по контракту, hit в слоте 9.
- Основание башни — у нижнего края кадра: спрайт ставится с якорем около `(0.5, 0.82)`.
  Нарезчик сам сажает каждый кадр на нижнюю линию.

---

## Все башни и пары

| Раса | Башня | Ключ спрайта | Файл листа | Арт | Промпт |
|---|---|---|---|---|---|
| Нежить | Bone Archer Tower | `tower.undead.bone_archer` | `undead_bone_archer.png` | **есть** (перерисована) | Нежить 2, блок B |
| Нежить | Plague Tower | `tower.undead.plague` | `undead_plague.png` | **есть** | Нежить 1, блок A |
| Нежить | Frost Wyrm Nest | `tower.undead.frost_wyrm_nest` | `undead_frost_wyrm_nest.png` | **есть** | Нежить 1, блок B |
| Нежить | Bone Obelisk | `tower.undead.bone_obelisk` | `undead_bone_obelisk.png` | **есть** | Нежить 2, блок A |
| Орки | Spear Watchtower | `tower.orc.spear_watchtower` | `orc_spear_watchtower.png` | **есть** | Орки 1, блок A |
| Орки | Tar Pit | `tower.orc.tar_pit` | `orc_tar_pit.png` | **есть** | Орки 1, блок B |
| Орки | Lightning Totem | `tower.orc.lightning_totem` | `orc_lightning_totem.png` | **есть** | Орки 2, блок A |
| Орки | Burning Pit | `tower.orc.burning_pit` | `orc_burning_pit.png` | **есть** | Орки 2, блок B |
| Люди | Guard Archer Tower | `tower.human.guard_archer` | `human_guard_archer.png` | **есть** | Люди 1, блок A |
| Люди | Cannon Bastion | `tower.human.cannon_bastion` | `human_cannon_bastion.png` | **есть** | Люди 1, блок B |
| Люди | Alchemist Tower | `tower.human.alchemist_tower` | `human_alchemist_tower.png` | **есть** | Люди 2, блок A |
| Люди | Guard Post | `tower.human.guard_post` | `human_guard_post.png` | **есть** | Люди 2, блок B |
| Эльфы | Thorn Spire | `tower.elf.thorn_spire` | `elf_thorn_spire.png` | нет | Эльфы 1, блок A |
| Эльфы | Moonwell | `tower.elf.moonwell` | `elf_moonwell.png` | нет | Эльфы 1, блок B |
| Эльфы | Wisp Bloom | `tower.elf.wisp_bloom` | `elf_wisp_bloom.png` | нет | Эльфы 2, блок A |
| Эльфы | Moon Archer Tower | `tower.elf.moon_archer` | `elf_moon_archer.png` | **есть** | Эльфы 2, блок B (по желанию) |

Принцип пар: в каждой паре одна высокая/узкая и одна низкая/широкая башня, с разными
цветами свечения, чтобы модель их не смешала.

---

## Как пользоваться

1. Размер картинки **1024 × 1536 (портрет)**. Промпт копируется целиком, от
   `Pixel-art sprite sheet` до конца блока.
2. По желанию приложите к запросу эталон `public/assets/towers/undead_bone_archer.png`
   как референс стиля. Строка про референс уже есть в каждом промпте; если картинку не
   прикладываете, она ничего не портит.
3. Проверьте глазами: 6 рядов по 5 ячеек, текста нет, фон — ровная магента, пустые ячейки
   пустые (ряд 2 ячейка 4, ряд 3 ячейка 5, ряд 5 ячейка 4, ряд 6 ячейка 5).
4. Сохраните картинку в `assets-src/tower-sheets/<башня A>__<башня B без расы>.png` и
   нарежьте её одной командой (имена — файлы листов из таблицы выше, без `.png`):

```bash
python tools/split-tower-pair.py assets-src/tower-sheets/orc_spear_watchtower__tar_pit.png orc_spear_watchtower orc_tar_pit --fill-b 0.68
```

   Скрипт сам находит 6 рядов по полосам магенты (модель не держит ровную высоту рядов),
   относит каждое пятно к своей колонке (снаряд, вылетевший за границу кадра атаки, остаётся
   у своей башни), раскладывает каждую башню в ровную сетку 5 × 3 и передаёт её в
   `tools/build-sprite-sheet.py`. Готовые листы `300 × 180` ложатся в `public/assets/towers/`.

Подсказки по нарезке:

- Если скрипт печатает `ужаты, чтобы влезть в ячейку: ...` — башня слишком широкая для
  своего масштаба. Понизьте `--fill-a` / `--fill-b` (по умолчанию 0.75; для низких широких
  башен обычно 0.68–0.7), пока строка не исчезнет.
- Любые другие флаги (`--strip-ground`, `--keep-key-hue`, `--tolerance 70`) передаются в
  нарезчик для обеих башен.
- Если модель вписала подписи — перегенерируйте, вырезать их скрипт не умеет.

5. Подключение: ключ башни — одна строка в `TOWER_SPRITE_KEYS`
   (`src/shared/constants/sprites.ts`). Путь к листу и ключи анимаций выводятся из ключа,
   движок рисует башню её собственным листом (снаряд — кадр 12, попадание — кадр 13, без
   тинта). Пока листа нет, башня берёт чужой арт своего типа атаки, как раньше.

---

## Нежить

Палитра: слоновая кость, потемневшая бронза, некротический пурпур, у каждой башни одно
своё свечение (зелёное варево, ледяной голубой, пурпурные руны, красный кристалл).

### Нежить 1 — Plague Tower (A) + Frost Wyrm Nest (B)

```
Pixel-art sprite sheet for a mobile tower defense game in a Warcraft III custom-map mood. TWO different towers of the same undead faction on ONE image, drawn by the same artist in the same style. If a reference image is attached, match its rendering style, outline, lighting and camera exactly, but not its subject, and ignore any captions in it.

STYLE: HD pixel art in the 16-bit JRPG / Warcraft III dark fantasy tradition - crisp pixel clusters, a clean 1-2px dark outline around every silhouette, a limited palette, soft dithered shading, soft light from the upper left with a subtle cool rim light. Rich but chunky detail that still reads when downscaled to 42x42 px. Muted saturation, strong value contrast, and exactly ONE bright glowing accent colour per tower. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi.
CAMERA: three-quarter top-down view, camera above and in front, each building seen from the front and roughly symmetric. Identical camera angle, light direction and scale in every cell of a tower. Each building is centred horizontally and its foundation touches the bottom of its cell. Towers shoot toward the RIGHT.
BACKGROUND: one flat solid pure magenta #FF00FF everywhere - in every cell and every gap. No gradient, no texture, no vignette, no shadow or glow painted onto the magenta, no ground plane. Never use magenta or pink inside the artwork.
CANVAS AND GRID: portrait 1024x1536. An invisible grid of 5 equal columns x 6 equal rows, each cell about 204x256 px. Do not draw grid lines, borders, frames or panels. Rows 1-3 belong to TOWER A, rows 4-6 belong to TOWER B. Keep an empty magenta margin of at least 10% inside every cell; nothing may touch or cross into a neighbouring cell.
NO TEXT: no captions, labels, numbers, letters, slot names, titles or watermarks anywhere on the image.

SLOT ORDER, the same for each tower (its 3 rows, cells left to right):
Row 1: BUILD 1 | BUILD 2 | BUILD 3 | IDLE 1 | IDLE 2
Row 2: ATTACK 1 | ATTACK 2 | ATTACK 3 | EMPTY | HIT
Row 3: SELL 1 | SELL 2 | PROJECTILE | IMPACT | EMPTY
Meaning: BUILD 1 is the foundation only, BUILD 2 is half-built, BUILD 3 is the finished tower. IDLE 1 and IDLE 2 are the finished tower, identical except for the glow strength and a 1px sway of hanging parts (a two-frame breathing loop). ATTACK 1 is the wind-up, ATTACK 2 the release with the shot leaving toward the right, ATTACK 3 the recovery; the building itself never moves or changes scale. EMPTY is plain magenta with nothing drawn. HIT is the finished tower from BUILD 3 with the whole silhouette flashed glowing crimson with white-hot highlights, shape unchanged. SELL 1 is the tower collapsing, SELL 2 a low pile of rubble on the same footprint. PROJECTILE has no building: one small shot flying RIGHT in the middle of the cell, about 1/4 of the cell wide. IMPACT has no building: one small radial burst in the middle of the cell, about 1/3 of the cell wide.

FACTION PALETTE (undead): bone ivory, tarnished bronze, dark necrotic purple cloth and runes, grey rubble stone. Each tower stands on a round ring of grey rubble stones.

TOWER A - PLAGUE TOWER (rows 1-3): a squat cauldron shrine - a fat tarnished bronze cauldron hung on chains inside a tripod of three curved rib-bone arms, brimming with bubbling toxic green brew, green vapour rising, a small skull embossed on the cauldron, a torn purple banner on one arm. As wide as it is tall, heavy, never vase-shaped. The ONLY green on this tower is the brew, its vapour and its drops.
- BUILD 1: the rubble ring with a cold ash pit. BUILD 2: the three rib arms lashed with bronze, empty chains, no cauldron.
- ATTACK: the brew swells and glows, then the cauldron tips hard to the right and a glob of green ooze flies off toward the right, then the cauldron rocks back level with ooze running down its side.
- SELL 2: the dented cauldron on its side among broken ribs in a green puddle.
- PROJECTILE: a teardrop glob of toxic green ooze, heavy end to the right, two trailing droplets.
- IMPACT: a flat ring of flung green droplets around a pale green vapour puff.
- Must read at 42 px as a dark round pot inside a tripod of curved bones with one bright green spot.

TOWER B - FROST WYRM NEST (rows 4-6): a low, wide nest of frozen ribs and bone shards crusted with pale ice and rime, pinned with tarnished bronze, and a small skeletal dragon head on a short bony neck rising from the middle, horned skull, jaws slightly open, cold pale-blue eye lights, frosty breath between the teeth, a tattered purple banner on one rib. The nest is at least twice as wide as it is tall. The ONLY glow on this tower is cold pale blue.
- BUILD 1: the rubble ring with a frosted bowl of bones. BUILD 2: the ribbed nest woven halfway, no head yet.
- ATTACK: the skull rears back and its eyes flare, then it breathes a short cone of icy mist toward the right with an ice shard leaving it, then the head settles with frost smoke curling from the jaws.
- SELL 2: a flat heap of shattered ribs, melting ice and a cracked dragon skull.
- PROJECTILE: a jagged pale blue ice shard, point to the right, thin cold vapour trail.
- IMPACT: a ring of cold light with short ice spikes stabbing outward and a white frozen core.
- Must read at 42 px as a low wide nest with one small horned skull rising from it and blue-glowing eyes.

FINAL CHECK: exactly 30 cells in 6 rows of 5; 26 cells drawn and 4 cells plain magenta (row 2 cell 4, row 3 cell 5, row 5 cell 4, row 6 cell 5). One subject per cell, nothing cropped, no text anywhere.
```

### Нежить 2 — Bone Obelisk (A) + Bone Archer Tower (B, перерисовка по желанию)

```
Pixel-art sprite sheet for a mobile tower defense game in a Warcraft III custom-map mood. TWO different towers of the same undead faction on ONE image, drawn by the same artist in the same style. If a reference image is attached, match its rendering style, outline, lighting and camera exactly, but not its subject, and ignore any captions in it.

STYLE: HD pixel art in the 16-bit JRPG / Warcraft III dark fantasy tradition - crisp pixel clusters, a clean 1-2px dark outline around every silhouette, a limited palette, soft dithered shading, soft light from the upper left with a subtle cool rim light. Rich but chunky detail that still reads when downscaled to 42x42 px. Muted saturation, strong value contrast, and exactly ONE bright glowing accent colour per tower. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi.
CAMERA: three-quarter top-down view, camera above and in front, each building seen from the front and roughly symmetric. Identical camera angle, light direction and scale in every cell of a tower. Each building is centred horizontally and its foundation touches the bottom of its cell. Towers shoot toward the RIGHT.
BACKGROUND: one flat solid pure magenta #FF00FF everywhere - in every cell and every gap. No gradient, no texture, no vignette, no shadow or glow painted onto the magenta, no ground plane. Never use magenta or pink inside the artwork.
CANVAS AND GRID: portrait 1024x1536. An invisible grid of 5 equal columns x 6 equal rows, each cell about 204x256 px. Do not draw grid lines, borders, frames or panels. Rows 1-3 belong to TOWER A, rows 4-6 belong to TOWER B. Keep an empty magenta margin of at least 10% inside every cell; nothing may touch or cross into a neighbouring cell.
NO TEXT: no captions, labels, numbers, letters, slot names, titles or watermarks anywhere on the image.

SLOT ORDER, the same for each tower (its 3 rows, cells left to right):
Row 1: BUILD 1 | BUILD 2 | BUILD 3 | IDLE 1 | IDLE 2
Row 2: ATTACK 1 | ATTACK 2 | ATTACK 3 | EMPTY | HIT
Row 3: SELL 1 | SELL 2 | PROJECTILE | IMPACT | EMPTY
Meaning: BUILD 1 is the foundation only, BUILD 2 is half-built, BUILD 3 is the finished tower. IDLE 1 and IDLE 2 are the finished tower, identical except for the glow strength and a 1px sway of hanging parts (a two-frame breathing loop). ATTACK 1 is the wind-up, ATTACK 2 the release with the shot leaving toward the right, ATTACK 3 the recovery; the building itself never moves or changes scale. EMPTY is plain magenta with nothing drawn. HIT is the finished tower from BUILD 3 with the whole silhouette flashed glowing crimson with white-hot highlights, shape unchanged. SELL 1 is the tower collapsing, SELL 2 a low pile of rubble on the same footprint. PROJECTILE has no building: one small shot flying RIGHT in the middle of the cell, about 1/4 of the cell wide. IMPACT has no building: one small radial burst in the middle of the cell, about 1/3 of the cell wide.

FACTION PALETTE (undead): bone ivory, tarnished bronze, dark necrotic purple cloth and runes, grey rubble stone. Each tower stands on a round ring of grey rubble stones.

TOWER A - BONE OBELISK (rows 1-3): a support pillar that empowers nearby towers - a tall narrow obelisk of fused skulls and bone slabs banded with tarnished bronze, a tiny blood-red crystal at the very tip, a floating ring of glowing violet-purple glyphs orbiting its upper third, a thin purple ribbon near the top, a purple rune circle carved into the flagstones. About 3 times taller than wide. No horns, no cauldron, no nest. Its glow colour is violet-purple; the tip crystal is the only red.
- BUILD 1: the rubble ring with the carved rune circle, dark. BUILD 2: the lower half of the bone shaft, no ring, no crystal.
- ATTACK (an aura pulse, not a shot): the glyph ring spins faster and brightens, then a wide soft violet pulse ring spreads from the base, then the ring dims back.
- SELL 2: a toppled stack of skulls and bronze bands on the cracked rune circle.
- PROJECTILE: one small glowing violet rune mote with a soft halo, no trail.
- IMPACT: a thin soft violet ring with a faint inner glow and two tiny glyph marks, gentle, no spikes.
- Must read at 42 px as a narrow vertical spike of stacked skulls wrapped in a purple halo ring.

TOWER B - BONE ARCHER TOWER (rows 4-6): a necromantic archer shrine of bone and tarnished bronze with a flared skirt-like body, two large curved bronze-and-bone horns rising from the shoulders, a horned skull in the middle of the arch with two smaller skulls beside it, dark purple banners with glowing red rune slits down the front, a blood-red crystal spike glowing between the horns. The flared base is about 4/5 of the cell wide, the whole tower about 3/4 of the cell tall. Red is the only glow colour on this tower.
- BUILD 1: the rubble ring with bronze-edged flagstones around a dark purple pit. BUILD 2: the lower flared body with the horns half raised, no crystal.
- ATTACK: red light gathers between the horns, then the crystal flares and a red bolt leaves toward the right, then the crystal dims with curls of dark red smoke.
- SELL 2: a low heap of broken bronze plates, bone shards and torn purple cloth with dying red sparks.
- PROJECTILE: a glowing red orb with a bright core and a short streaked trail behind it.
- IMPACT: a round red burst with jagged spokes and a dark red core.
- Must read at 42 px as a wide flared skirt narrowing into two curved horns with one bright red spike between them.

FINAL CHECK: exactly 30 cells in 6 rows of 5; 26 cells drawn and 4 cells plain magenta (row 2 cell 4, row 3 cell 5, row 5 cell 4, row 6 cell 5). One subject per cell, nothing cropped, no text anywhere.
```

---

## Орки

Палитра: тёмное дерево, верёвка и кожа, чернёное железо, ржаво-оранжевая боевая
раскраска, костяные трофеи. Всё кривое и сколоченное, никакой ровной кладки.

### Орки 1 — Spear Watchtower (A) + Tar Pit (B)

```
Pixel-art sprite sheet for a mobile tower defense game in a Warcraft III custom-map mood. TWO different towers of the same orc faction on ONE image, drawn by the same artist in the same style. If a reference image is attached, match its rendering style, outline, lighting and camera exactly, but not its subject or colours, and ignore any captions in it.

STYLE: HD pixel art in the 16-bit JRPG / Warcraft III dark fantasy tradition - crisp pixel clusters, a clean 1-2px dark outline around every silhouette, a limited palette, soft dithered shading, soft light from the upper left with a subtle cool rim light. Rich but chunky detail that still reads when downscaled to 42x42 px. Muted saturation, strong value contrast, and exactly ONE bright glowing accent colour per tower. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi.
CAMERA: three-quarter top-down view, camera above and in front, each building seen from the front and roughly symmetric. Identical camera angle, light direction and scale in every cell of a tower. Each building is centred horizontally and its foundation touches the bottom of its cell. Towers shoot toward the RIGHT.
BACKGROUND: one flat solid pure magenta #FF00FF everywhere - in every cell and every gap. No gradient, no texture, no vignette, no shadow or glow painted onto the magenta, no ground plane. Never use magenta or pink inside the artwork.
CANVAS AND GRID: portrait 1024x1536. An invisible grid of 5 equal columns x 6 equal rows, each cell about 204x256 px. Do not draw grid lines, borders, frames or panels. Rows 1-3 belong to TOWER A, rows 4-6 belong to TOWER B. Keep an empty magenta margin of at least 10% inside every cell; nothing may touch or cross into a neighbouring cell.
NO TEXT: no captions, labels, numbers, letters, slot names, titles or watermarks anywhere on the image.

SLOT ORDER, the same for each tower (its 3 rows, cells left to right):
Row 1: BUILD 1 | BUILD 2 | BUILD 3 | IDLE 1 | IDLE 2
Row 2: ATTACK 1 | ATTACK 2 | ATTACK 3 | EMPTY | HIT
Row 3: SELL 1 | SELL 2 | PROJECTILE | IMPACT | EMPTY
Meaning: BUILD 1 is the foundation only, BUILD 2 is half-built, BUILD 3 is the finished tower. IDLE 1 and IDLE 2 are the finished tower, identical except for the glow strength and a 1px sway of hanging parts (a two-frame breathing loop). ATTACK 1 is the wind-up, ATTACK 2 the release with the shot leaving toward the right, ATTACK 3 the recovery; the building itself never moves or changes scale. EMPTY is plain magenta with nothing drawn. HIT is the finished tower from BUILD 3 with the whole silhouette flashed glowing crimson with white-hot highlights, shape unchanged. SELL 1 is the tower collapsing, SELL 2 a low pile of rubble on the same footprint. PROJECTILE has no building: one small shot flying RIGHT in the middle of the cell, about 1/4 of the cell wide. IMPACT has no building: one small radial burst in the middle of the cell, about 1/3 of the cell wide.

FACTION PALETTE (orc): weathered dark wood, rope and dark leather, blackened iron spikes, rust-orange war paint runes, bleached bone trophies, packed dirt and dark stones. Crude, lashed-together, slightly crooked but heavy and sturdy; no neat masonry.

TOWER A - SPEAR WATCHTOWER (rows 1-3): a squat watchtower of four thick logs lashed with rope, a plank platform on top under a slanted stretched-hide roof, a rack of heavy spears leaning at the platform edge, iron spikes hammered into the legs, two bone skull trophies on the cross-beams, rust-orange runes on the wood. Its only accent glow is a warm ember-orange glint.
- BUILD 1: four log stumps in a square of packed dirt and stones. BUILD 2: the lashed log legs and the bare platform, no roof, no spears.
- ATTACK: a spear is drawn back on the platform, then a heavy spear is hurled toward the right, then the rack rocks back.
- SELL 2: a pile of snapped logs, torn hide and scattered spears.
- PROJECTILE: a heavy iron-tipped spear flying point-first to the right with a short speed streak.
- IMPACT: a short radial burst of brown-orange dust and wooden splinters.
- Must read at 42 px as a squat lashed-log tower with spears sticking up above a slanted hide roof.

TOWER B - TAR PIT (rows 4-6): a sunken round pit of thick glossy black bubbling tar with a dull brown-violet sheen, its rim ringed with rusted iron spikes in packed dirt, a crude leather-and-wood bellows on a lashed stand at the back feeding glowing coals under the pit, heat shimmer above the surface. The flattest, lowest orc tower, about twice as wide as tall. NO ice, NO frost, NO cold blue - it slows enemies with sticky tar. Its only glow is the dull red-orange of the coals.
- BUILD 1: an empty dug pit ringed with stones. BUILD 2: the spiked rim and the bellows stand, the pit half full of cold dark tar.
- ATTACK: the bellows pump and a big tar bubble swells, then a blob of tar is flung up and to the right, then the surface settles in slow ripples.
- SELL 2: a cracked, dried-out pit with toppled spikes and a broken bellows.
- PROJECTILE: a rounded glossy blob of black tar with a small highlight and two trailing strands.
- IMPACT: a flat spreading black tar splatter with sticky irregular edges and droplets.
- Must read at 42 px as a low black pit ringed with iron spikes.

FINAL CHECK: exactly 30 cells in 6 rows of 5; 26 cells drawn and 4 cells plain magenta (row 2 cell 4, row 3 cell 5, row 5 cell 4, row 6 cell 5). One subject per cell, nothing cropped, no text anywhere.
```

### Орки 2 — Lightning Totem (A) + Burning Pit (B)

```
Pixel-art sprite sheet for a mobile tower defense game in a Warcraft III custom-map mood. TWO different towers of the same orc faction on ONE image, drawn by the same artist in the same style. If a reference image is attached, match its rendering style, outline, lighting and camera exactly, but not its subject or colours, and ignore any captions in it.

STYLE: HD pixel art in the 16-bit JRPG / Warcraft III dark fantasy tradition - crisp pixel clusters, a clean 1-2px dark outline around every silhouette, a limited palette, soft dithered shading, soft light from the upper left with a subtle cool rim light. Rich but chunky detail that still reads when downscaled to 42x42 px. Muted saturation, strong value contrast, and exactly ONE bright glowing accent colour per tower. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi.
CAMERA: three-quarter top-down view, camera above and in front, each building seen from the front and roughly symmetric. Identical camera angle, light direction and scale in every cell of a tower. Each building is centred horizontally and its foundation touches the bottom of its cell. Towers shoot toward the RIGHT.
BACKGROUND: one flat solid pure magenta #FF00FF everywhere - in every cell and every gap. No gradient, no texture, no vignette, no shadow or glow painted onto the magenta, no ground plane. Never use magenta or pink inside the artwork.
CANVAS AND GRID: portrait 1024x1536. An invisible grid of 5 equal columns x 6 equal rows, each cell about 204x256 px. Do not draw grid lines, borders, frames or panels. Rows 1-3 belong to TOWER A, rows 4-6 belong to TOWER B. Keep an empty magenta margin of at least 10% inside every cell; nothing may touch or cross into a neighbouring cell.
NO TEXT: no captions, labels, numbers, letters, slot names, titles or watermarks anywhere on the image.

SLOT ORDER, the same for each tower (its 3 rows, cells left to right):
Row 1: BUILD 1 | BUILD 2 | BUILD 3 | IDLE 1 | IDLE 2
Row 2: ATTACK 1 | ATTACK 2 | ATTACK 3 | EMPTY | HIT
Row 3: SELL 1 | SELL 2 | PROJECTILE | IMPACT | EMPTY
Meaning: BUILD 1 is the foundation only, BUILD 2 is half-built, BUILD 3 is the finished tower. IDLE 1 and IDLE 2 are the finished tower, identical except for the glow strength and a 1px sway of hanging parts (a two-frame breathing loop). ATTACK 1 is the wind-up, ATTACK 2 the release with the shot leaving toward the right, ATTACK 3 the recovery; the building itself never moves or changes scale. EMPTY is plain magenta with nothing drawn. HIT is the finished tower from BUILD 3 with the whole silhouette flashed glowing crimson with white-hot highlights, shape unchanged. SELL 1 is the tower collapsing, SELL 2 a low pile of rubble on the same footprint. PROJECTILE has no building: one small shot flying RIGHT in the middle of the cell, about 1/4 of the cell wide. IMPACT has no building: one small radial burst in the middle of the cell, about 1/3 of the cell wide.

FACTION PALETTE (orc): weathered dark wood, rope and dark leather, blackened iron spikes, rust-orange war paint runes, bleached bone trophies, packed dirt and dark stones. Crude, lashed-together, slightly crooked but heavy and sturdy; no neat masonry.

TOWER A - LIGHTNING TOTEM (rows 1-3): a tall carved wooden totem pole with a stacked snarling spirit face, two curved horns at the top, a storm rune burned into its chest, hanging feathers, small bones and leather cords, rust-orange runes, standing in a small ring of stones lashed with rope. About 3 times taller than wide. Its ONLY glow is white-blue lightning: the chest rune and the arcs between the horns.
- BUILD 1: the ring of roped stones with a dug post hole. BUILD 2: the lower half of the carved pole, no horns, rune dark.
- ATTACK: arcs crackle between the horns and the rune blazes, then a jagged lightning bolt leaps from the horns toward the right, then a few dying sparks crawl over the wood.
- SELL 2: the split totem lying in pieces across the stones, scorched.
- PROJECTILE: a short zigzag lightning bolt with a white core and blue edge glow, moving right.
- IMPACT: a white-blue electric starburst with jagged spokes and crawling sparks.
- Must read at 42 px as a tall narrow horned totem pole with a glowing point on its chest.

TOWER B - BURNING PIT (rows 4-6): a low fire pit of blackened stones around a bed of glowing coals, a crude wooden throwing arm lashed with rope to a heavy log pivot, an iron bucket of burning pitch at the end of the arm, a thick column of black smoke, rust-orange runes on the stones. Wider than tall. Its ONLY glow is hot orange fire.
- BUILD 1: the ring of blackened stones with cold ash. BUILD 2: the log pivot and a bare throwing arm, coals faintly lit, no bucket.
- ATTACK: the arm is cranked back with the bucket flaring, then the arm snaps forward and a flaming tar ball flies toward the right, then the arm swings back trailing smoke.
- SELL 2: scattered blackened stones, a snapped arm and a smouldering heap.
- PROJECTILE: a black tar ball wrapped in an orange fire crown with a short ember trail behind it.
- IMPACT: an orange fire splash with flying tar droplets and black smoke at its edges.
- Must read at 42 px as a low stone fire pit with a diagonal throwing arm and a black smoke plume.

FINAL CHECK: exactly 30 cells in 6 rows of 5; 26 cells drawn and 4 cells plain magenta (row 2 cell 4, row 3 cell 5, row 5 cell 4, row 6 cell 5). One subject per cell, nothing cropped, no text anywhere.
```

---

## Люди

Палитра: серая тёсаная кладка, стально-синяя черепица, приглушённое золото, тёмно-красные
знамёна, тёмное дерево и железо. Прямые углы, квадратное каменное основание.

### Люди 1 — Guard Archer Tower (A) + Cannon Bastion (B)

```
Pixel-art sprite sheet for a mobile tower defense game in a Warcraft III custom-map mood. TWO different towers of the same human faction on ONE image, drawn by the same artist in the same style. If a reference image is attached, match its rendering style, outline, lighting and camera exactly, but not its subject or colours, and ignore any captions in it.

STYLE: HD pixel art in the 16-bit JRPG / Warcraft III dark fantasy tradition - crisp pixel clusters, a clean 1-2px dark outline around every silhouette, a limited palette, soft dithered shading, soft light from the upper left with a subtle cool rim light. Rich but chunky detail that still reads when downscaled to 42x42 px. Muted saturation, strong value contrast, and exactly ONE bright glowing accent colour per tower. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi.
CAMERA: three-quarter top-down view, camera above and in front, each building seen from the front and roughly symmetric. Identical camera angle, light direction and scale in every cell of a tower. Each building is centred horizontally and its foundation touches the bottom of its cell. Towers shoot toward the RIGHT.
BACKGROUND: one flat solid pure magenta #FF00FF everywhere - in every cell and every gap. No gradient, no texture, no vignette, no shadow or glow painted onto the magenta, no ground plane. Never use magenta or pink inside the artwork.
CANVAS AND GRID: portrait 1024x1536. An invisible grid of 5 equal columns x 6 equal rows, each cell about 204x256 px. Do not draw grid lines, borders, frames or panels. Rows 1-3 belong to TOWER A, rows 4-6 belong to TOWER B. Keep an empty magenta margin of at least 10% inside every cell; nothing may touch or cross into a neighbouring cell.
NO TEXT: no captions, labels, numbers, letters, slot names, titles or watermarks anywhere on the image.

SLOT ORDER, the same for each tower (its 3 rows, cells left to right):
Row 1: BUILD 1 | BUILD 2 | BUILD 3 | IDLE 1 | IDLE 2
Row 2: ATTACK 1 | ATTACK 2 | ATTACK 3 | EMPTY | HIT
Row 3: SELL 1 | SELL 2 | PROJECTILE | IMPACT | EMPTY
Meaning: BUILD 1 is the foundation only, BUILD 2 is half-built, BUILD 3 is the finished tower. IDLE 1 and IDLE 2 are the finished tower, identical except for the glow strength and a 1px sway of hanging parts (a two-frame breathing loop). ATTACK 1 is the wind-up, ATTACK 2 the release with the shot leaving toward the right, ATTACK 3 the recovery; the building itself never moves or changes scale. EMPTY is plain magenta with nothing drawn. HIT is the finished tower from BUILD 3 with the whole silhouette flashed glowing crimson with white-hot highlights, shape unchanged. SELL 1 is the tower collapsing, SELL 2 a low pile of rubble on the same footprint. PROJECTILE has no building: one small shot flying RIGHT in the middle of the cell, about 1/4 of the cell wide. IMPACT has no building: one small radial burst in the middle of the cell, about 1/3 of the cell wide.

FACTION PALETTE (human): grey cut stone in squared blocks with dark grey shadows, steel-blue roof tiles, muted gold trim, deep red banners, dark timber, dull iron fittings. Clean engineered masonry: right angles, symmetry, every tower on a square stone base.

TOWER A - GUARD ARCHER TOWER (rows 1-3): a narrow square turret of grey cut stone with crenellated merlons, a steel-blue tiled pitched roof over the battlement, one narrow arrow slit, a deep red banner with gold trim on an iron bracket, a small dark timber door with iron fittings. Taller than wide. Its ONLY accent is a cold pale ice-blue glint on the arrowheads and the shot - never yellow, no green, no violet.
- BUILD 1: the square stone foundation with a few cut blocks laid. BUILD 2: the lower half of the turret walls with wooden scaffolding, no roof.
- ATTACK: an archer silhouette draws a bow at the battlement with an ice-blue glint, then an arrow leaves toward the right with a small spark, then the banner flutters back.
- SELL 2: a low heap of cut stone blocks, broken roof tiles and a torn red banner.
- PROJECTILE: a single fletched arrow seen from the side flying right, steel head with an ice-blue glint, red-and-white fletching.
- IMPACT: a small ice-blue spark with a brown-grey dust puff and short debris ticks.
- Must read at 42 px as a narrow stone turret with a pointed blue roof and a red banner.

TOWER B - CANNON BASTION (rows 4-6): a low, squat bastion of grey cut stone with an angled sloping face and a wide embrasure, a heavy black iron cannon barrel with brass rings pointing RIGHT out of the embrasure, two powder barrels with iron hoops beside it, a small deep red pennant with gold trim on a short pole. Clearly wider than tall. Its ONLY accent is warm gunpowder orange muzzle light.
- BUILD 1: the square stone foundation with a gun platform outline. BUILD 2: the low sloped walls without the cannon, a barrel waiting beside them.
- ATTACK: the fuse sparks at the breech, then the cannon fires right with a bright orange muzzle flash and grey smoke and the barrel recoils, then the smoke drifts away.
- SELL 2: tumbled stone blocks with the cannon barrel lying on its side.
- PROJECTILE: a black iron cannonball with a hard highlight and short grey smoke ticks behind it.
- IMPACT: a grey-white explosion with a hot pale core, a rolling smoke ring and small black debris.
- Must read at 42 px as a low wide stone block with a black barrel sticking out to the right.

FINAL CHECK: exactly 30 cells in 6 rows of 5; 26 cells drawn and 4 cells plain magenta (row 2 cell 4, row 3 cell 5, row 5 cell 4, row 6 cell 5). One subject per cell, nothing cropped, no text anywhere.
```

### Люди 2 — Alchemist Tower (A) + Guard Post (B)

```
Pixel-art sprite sheet for a mobile tower defense game in a Warcraft III custom-map mood. TWO different towers of the same human faction on ONE image, drawn by the same artist in the same style. If a reference image is attached, match its rendering style, outline, lighting and camera exactly, but not its subject or colours, and ignore any captions in it.

STYLE: HD pixel art in the 16-bit JRPG / Warcraft III dark fantasy tradition - crisp pixel clusters, a clean 1-2px dark outline around every silhouette, a limited palette, soft dithered shading, soft light from the upper left with a subtle cool rim light. Rich but chunky detail that still reads when downscaled to 42x42 px. Muted saturation, strong value contrast, and exactly ONE bright glowing accent colour per tower. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi.
CAMERA: three-quarter top-down view, camera above and in front, each building seen from the front and roughly symmetric. Identical camera angle, light direction and scale in every cell of a tower. Each building is centred horizontally and its foundation touches the bottom of its cell. Towers shoot toward the RIGHT.
BACKGROUND: one flat solid pure magenta #FF00FF everywhere - in every cell and every gap. No gradient, no texture, no vignette, no shadow or glow painted onto the magenta, no ground plane. Never use magenta or pink inside the artwork.
CANVAS AND GRID: portrait 1024x1536. An invisible grid of 5 equal columns x 6 equal rows, each cell about 204x256 px. Do not draw grid lines, borders, frames or panels. Rows 1-3 belong to TOWER A, rows 4-6 belong to TOWER B. Keep an empty magenta margin of at least 10% inside every cell; nothing may touch or cross into a neighbouring cell.
NO TEXT: no captions, labels, numbers, letters, slot names, titles or watermarks anywhere on the image.

SLOT ORDER, the same for each tower (its 3 rows, cells left to right):
Row 1: BUILD 1 | BUILD 2 | BUILD 3 | IDLE 1 | IDLE 2
Row 2: ATTACK 1 | ATTACK 2 | ATTACK 3 | EMPTY | HIT
Row 3: SELL 1 | SELL 2 | PROJECTILE | IMPACT | EMPTY
Meaning: BUILD 1 is the foundation only, BUILD 2 is half-built, BUILD 3 is the finished tower. IDLE 1 and IDLE 2 are the finished tower, identical except for the glow strength and a 1px sway of hanging parts (a two-frame breathing loop). ATTACK 1 is the wind-up, ATTACK 2 the release with the shot leaving toward the right, ATTACK 3 the recovery; the building itself never moves or changes scale. EMPTY is plain magenta with nothing drawn. HIT is the finished tower from BUILD 3 with the whole silhouette flashed glowing crimson with white-hot highlights, shape unchanged. SELL 1 is the tower collapsing, SELL 2 a low pile of rubble on the same footprint. PROJECTILE has no building: one small shot flying RIGHT in the middle of the cell, about 1/4 of the cell wide. IMPACT has no building: one small radial burst in the middle of the cell, about 1/3 of the cell wide.

FACTION PALETTE (human): grey cut stone in squared blocks with dark grey shadows, steel-blue roof tiles, muted gold trim, deep red banners, dark timber, dull iron fittings. Clean engineered masonry: right angles, symmetry, every tower on a square stone base.

TOWER A - ALCHEMIST TOWER (rows 1-3): a narrow, tall laboratory tower - a grey cut-stone lower storey, a dark timber upper storey with a steel-blue tiled roof, a rack of glowing acid-green glass flasks in an open window, copper piping up the outside wall, a small copper still with a stubby chimney, a side vent leaking green vapour, a small red pennant. Taller than wide. Its ONLY glow is acid green.
- BUILD 1: the square stone foundation with a crate of empty flasks. BUILD 2: the stone storey and the timber frame of the upper storey, no roof, no flasks.
- ATTACK: the still bubbles and the flasks glow brighter, then a corked green flask is lobbed out of the window toward the right, then a puff of green vapour drifts from the vent.
- SELL 2: a heap of stone and timber with broken green glass and a dented copper still.
- PROJECTILE: a corked green glass flask tumbling right, glowing liquid inside, two droplets behind.
- IMPACT: a green corrosive splash with bubbling droplets and a few glass shards.
- Must read at 42 px as a tall narrow lab tower with one bright green window near the top.

TOWER B - GUARD POST (rows 4-6): a small low command post of grey cut stone with a squared parapet, a tall dark timber pole carrying a large deep red banner with gold trim and a gold finial, a brass-bound war horn on an iron hook, a rack of steel-blue shields with gold rims, a small iron brazier. It carries NO weapon at all: no bow, no arrow slit, no cannon, no flasks. Its ONLY glow is warm gold.
- BUILD 1: the square stone foundation with the pole socket. BUILD 2: the low parapet walls and the bare pole, no banner.
- ATTACK (a command pulse, not a shot): the brazier flares and the banner lifts, then a soft gold ring pulses outward from the post with the horn raised, then the banner falls back.
- SELL 2: a low ring of tumbled blocks with the fallen banner pole across them.
- PROJECTILE: a small soft gold four-point glint with a warm halo and two tiny sparkles.
- IMPACT: a thin bright gold ring with a warm inner glow and a few rising motes, a buff, not damage.
- Must read at 42 px as a low stone block with a tall pole and a big red banner.

FINAL CHECK: exactly 30 cells in 6 rows of 5; 26 cells drawn and 4 cells plain magenta (row 2 cell 4, row 3 cell 5, row 5 cell 4, row 6 cell 5). One subject per cell, nothing cropped, no text anywhere.
```

---

## Эльфы

Палитра: тёмный мох, живое светлое дерево и береста, серебро, серо-зелёный камень,
бирюзово-зелёное свечение. Эталон — `elf_moon_archer.png` (мшистое дерево с площадкой).

### Эльфы 1 — Thorn Spire (A) + Moonwell (B)

```
Pixel-art sprite sheet for a mobile tower defense game in a Warcraft III custom-map mood. TWO different towers of the same night-elf faction on ONE image, drawn by the same artist in the same style. If a reference image is attached, match its rendering style, outline, lighting and camera exactly, but not its subject or colours, and ignore any captions in it.

STYLE: HD pixel art in the 16-bit JRPG / Warcraft III dark fantasy tradition - crisp pixel clusters, a clean 1-2px dark outline around every silhouette, a limited palette, soft dithered shading, soft light from the upper left with a subtle cool rim light. Rich but chunky detail that still reads when downscaled to 42x42 px. Muted saturation, strong value contrast, and exactly ONE bright glowing accent colour per tower. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi.
CAMERA: three-quarter top-down view, camera above and in front, each building seen from the front and roughly symmetric. Identical camera angle, light direction and scale in every cell of a tower. Each building is centred horizontally and its foundation touches the bottom of its cell. Towers shoot toward the RIGHT.
BACKGROUND: one flat solid pure magenta #FF00FF everywhere - in every cell and every gap. No gradient, no texture, no vignette, no shadow or glow painted onto the magenta, no ground plane. Never use magenta or pink inside the artwork.
CANVAS AND GRID: portrait 1024x1536. An invisible grid of 5 equal columns x 6 equal rows, each cell about 204x256 px. Do not draw grid lines, borders, frames or panels. Rows 1-3 belong to TOWER A, rows 4-6 belong to TOWER B. Keep an empty magenta margin of at least 10% inside every cell; nothing may touch or cross into a neighbouring cell.
NO TEXT: no captions, labels, numbers, letters, slot names, titles or watermarks anywhere on the image.

SLOT ORDER, the same for each tower (its 3 rows, cells left to right):
Row 1: BUILD 1 | BUILD 2 | BUILD 3 | IDLE 1 | IDLE 2
Row 2: ATTACK 1 | ATTACK 2 | ATTACK 3 | EMPTY | HIT
Row 3: SELL 1 | SELL 2 | PROJECTILE | IMPACT | EMPTY
Meaning: BUILD 1 is the foundation only, BUILD 2 is half-built, BUILD 3 is the finished tower. IDLE 1 and IDLE 2 are the finished tower, identical except for the glow strength and a 1px sway of hanging parts (a two-frame breathing loop). ATTACK 1 is the wind-up, ATTACK 2 the release with the shot leaving toward the right, ATTACK 3 the recovery; the building itself never moves or changes scale. EMPTY is plain magenta with nothing drawn. HIT is the finished tower from BUILD 3 with the whole silhouette flashed glowing crimson with white-hot highlights, shape unchanged. SELL 1 is the tower collapsing, SELL 2 a low pile of rubble on the same footprint. PROJECTILE has no building: one small shot flying RIGHT in the middle of the cell, about 1/4 of the cell wide. IMPACT has no building: one small radial burst in the middle of the cell, about 1/3 of the cell wide.

FACTION PALETTE (night elf): deep moss green, living pale wood and birch bark, moonlit silver filigree, grey-green weathered stone, dark wet bark. Grown rather than built; every tower rises from a mossy stone and root foundation.

TOWER A - THORN SPIRE (rows 1-3): a twisted spire of living bramble coiling around a narrow mossy stone core, long dark barbed thorns bristling outward all the way up, small deep blue-violet blossoms between them, thick vines gripping the foundation stones, a faint sickly yellow-green venom glow at the thorn tips. Narrow, spiky, vertical, about 2.5 times taller than wide. Keep the blossoms deep blue-violet, never pink or magenta.
- BUILD 1: a mossy stone base with vine shoots coming out of the ground. BUILD 2: the lower half of the bramble coil around a bare stone core, no blossoms.
- ATTACK: the thorns bristle and the tips glow, then a barbed thorn dart shoots toward the right with a venom drip, then the brambles settle.
- SELL 2: a withered heap of dead brambles and cracked mossy stones.
- PROJECTILE: a dark barbed thorn dart flying point-first to the right with a green venom drip trailing.
- IMPACT: a small burst of yellow-green venom droplets with a couple of thorn splinters.
- Must read at 42 px as a narrow jagged spiky mass on a small dark base, never as a round flower.

TOWER B - MOONWELL (rows 4-6): a circular basin of carved grey-green stone, mossy at the base, filled with glowing pale moon-blue water, faint silver runes cut into the rim, cold mist spilling over the edge, and behind the basin a slim broken stone arch holding a silver crescent so the shape rises upward. Wider than tall. Its ONLY glow is cold pale moon-blue; the water is the brightest area.
- BUILD 1: a ring of carved stones laid on moss, dry and empty. BUILD 2: the full basin rim and half of the arch, the basin dry.
- ATTACK: the water swells and glows, then a beam of pale moonlight and a frost bolt leave toward the right, then the surface ripples back calm with mist.
- SELL 2: a cracked, drained basin, the arch broken on the ground, the crescent lying in the moss.
- PROJECTILE: a small pale-blue orb of moon water with a frosty sparkle trail.
- IMPACT: a ring of cold pale-blue light with frost sparkles and a white core.
- Must read at 42 px as a cold glowing pool with a standing arch and a silver crescent above it.

FINAL CHECK: exactly 30 cells in 6 rows of 5; 26 cells drawn and 4 cells plain magenta (row 2 cell 4, row 3 cell 5, row 5 cell 4, row 6 cell 5). One subject per cell, nothing cropped, no text anywhere.
```

### Эльфы 2 — Wisp Bloom (A) + Moon Archer Tower (B, перерисовка по желанию)

```
Pixel-art sprite sheet for a mobile tower defense game in a Warcraft III custom-map mood. TWO different towers of the same night-elf faction on ONE image, drawn by the same artist in the same style. If a reference image is attached, match its rendering style, outline, lighting and camera exactly, but not its subject or colours, and ignore any captions in it.

STYLE: HD pixel art in the 16-bit JRPG / Warcraft III dark fantasy tradition - crisp pixel clusters, a clean 1-2px dark outline around every silhouette, a limited palette, soft dithered shading, soft light from the upper left with a subtle cool rim light. Rich but chunky detail that still reads when downscaled to 42x42 px. Muted saturation, strong value contrast, and exactly ONE bright glowing accent colour per tower. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi.
CAMERA: three-quarter top-down view, camera above and in front, each building seen from the front and roughly symmetric. Identical camera angle, light direction and scale in every cell of a tower. Each building is centred horizontally and its foundation touches the bottom of its cell. Towers shoot toward the RIGHT.
BACKGROUND: one flat solid pure magenta #FF00FF everywhere - in every cell and every gap. No gradient, no texture, no vignette, no shadow or glow painted onto the magenta, no ground plane. Never use magenta or pink inside the artwork.
CANVAS AND GRID: portrait 1024x1536. An invisible grid of 5 equal columns x 6 equal rows, each cell about 204x256 px. Do not draw grid lines, borders, frames or panels. Rows 1-3 belong to TOWER A, rows 4-6 belong to TOWER B. Keep an empty magenta margin of at least 10% inside every cell; nothing may touch or cross into a neighbouring cell.
NO TEXT: no captions, labels, numbers, letters, slot names, titles or watermarks anywhere on the image.

SLOT ORDER, the same for each tower (its 3 rows, cells left to right):
Row 1: BUILD 1 | BUILD 2 | BUILD 3 | IDLE 1 | IDLE 2
Row 2: ATTACK 1 | ATTACK 2 | ATTACK 3 | EMPTY | HIT
Row 3: SELL 1 | SELL 2 | PROJECTILE | IMPACT | EMPTY
Meaning: BUILD 1 is the foundation only, BUILD 2 is half-built, BUILD 3 is the finished tower. IDLE 1 and IDLE 2 are the finished tower, identical except for the glow strength and a 1px sway of hanging parts (a two-frame breathing loop). ATTACK 1 is the wind-up, ATTACK 2 the release with the shot leaving toward the right, ATTACK 3 the recovery; the building itself never moves or changes scale. EMPTY is plain magenta with nothing drawn. HIT is the finished tower from BUILD 3 with the whole silhouette flashed glowing crimson with white-hot highlights, shape unchanged. SELL 1 is the tower collapsing, SELL 2 a low pile of rubble on the same footprint. PROJECTILE has no building: one small shot flying RIGHT in the middle of the cell, about 1/4 of the cell wide. IMPACT has no building: one small radial burst in the middle of the cell, about 1/3 of the cell wide.

FACTION PALETTE (night elf): deep moss green, living pale wood and birch bark, moonlit silver filigree, grey-green weathered stone, dark wet bark. Grown rather than built; every tower rises from a mossy stone and root foundation.

TOWER A - WISP BLOOM (rows 1-3): one huge luminous flower growing out of a broad mossy tree stump - dark wet bark, thick moss, small pale mushrooms and roots; a short green stalk carries an oversized bell-shaped blossom with pale silver-green petals and a glowing teal core, two or three small teal wisps orbit it, glowing pollen drifts upward. The blossom is the widest lit shape. Its ONLY glow is teal.
- BUILD 1: the bare mossy stump. BUILD 2: a short stalk with a closed bud, no wisps.
- ATTACK: the petals open wide and the core blazes, then a teal wisp-orb bursts out toward the right, then the petals half close and pollen drifts down.
- SELL 2: a rotten split stump with wilted petals lying on the moss.
- PROJECTILE: a small glowing teal wisp orb with a soft sparkling trail.
- IMPACT: a round teal flash with a ring of floating pollen motes.
- Must read at 42 px as a wide dark stump, a thin stalk and one big round bright blossom on top.

TOWER B - MOON ARCHER TOWER (rows 4-6): an elven moon-archer post - a small living tree growing out of a mossy stone foundation, its thick boughs forming a raised firing platform with a wooden railing, silver filigree on the trunk, a silver crescent-moon emblem at the front of the platform, glowing green motes among the leaves, and a slender elven archer in a hooded moss-green cloak with a silver longbow standing on the platform. Its ONLY glow is moonlit green.
- BUILD 1: a mossy stone foundation with a sapling. BUILD 2: a young trunk with bare boughs and half a platform, no archer.
- ATTACK: the archer draws the bow with a green glint at the arrowhead, then a glowing green arrow leaves toward the right, then the archer lowers the bow.
- SELL 2: a fallen trunk and broken platform planks on the mossy stones.
- PROJECTILE: a glowing green elven arrow with a leaf-shaped head and a light streak behind it.
- IMPACT: a small green starburst of light with a few leaf flecks.
- Must read at 42 px as a wide mossy base, a narrow trunk and one horizontal platform with a small archer above it.

FINAL CHECK: exactly 30 cells in 6 rows of 5; 26 cells drawn and 4 cells plain magenta (row 2 cell 4, row 3 cell 5, row 5 cell 4, row 6 cell 5). One subject per cell, nothing cropped, no text anywhere.
```

---

## Если пара не вышла: одна башня на картинку

Возьмите промпт пары и поправьте три места:

1. Первая строка: `TWO different towers ... on ONE image` → `ONE tower of the <race> faction`.
2. `CANVAS AND GRID`: заменить на
   `CANVAS AND GRID: landscape 1536x1024. An invisible grid of 5 equal columns x 3 equal rows, each cell about 307x341 px. Do not draw grid lines, borders, frames or panels. Keep an empty magenta margin of at least 10% inside every cell; nothing may touch or cross into a neighbouring cell.`
3. Удалить блок ненужной башни, а `FINAL CHECK` заменить на
   `FINAL CHECK: exactly 15 cells in 3 rows of 5; 13 cells drawn and 2 cells plain magenta (row 2 cell 4, row 3 cell 5). One subject per cell, nothing cropped, no text anywhere.`

Резать пополам не нужно — сразу нарезчик с `--grid 5x3 --cell 60`.

## Приёмка листа

- Башня стоит основанием на нижней линии во всех кадрах, не «плавает» по высоте.
- IDLE 1 и IDLE 2 отличаются только свечением и мелочами; ATTACK не меняет масштаб.
- У каждой башни одно яркое свечение своего цвета; у соседей по паре цвета разные.
- На 42 × 42 силуэт узнаётся по строке `Must read at 42 px` из промпта.
- Нарезчик не печатает `ужаты, чтобы влезть в ячейку` (иначе уменьшить `--fill`).
