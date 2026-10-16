# Спрайты tower-def: промты для генерации

Рабочий набор промтов для картиночной нейросети. Один спрайт — один готовый блок,
который копируется целиком и вставляется в генератор без правок.

В игре **36 спрайтов**: 20 крипов и 16 башен. Из них **6 нарисованы**, **30 нужно
сгенерировать**. Промты есть для всех 36 — у готовых они пригодятся, если захочется
перерисовать их в едином стиле.

Стиль, палитры, ракурсы и раскладка кадров в промтах взяты из спрайтов, которые уже
лежат в проекте (`skeleton.svg`, `ghoul.svg`, `undead_crypt_fiend.svg`,
`undead_gargoyle.svg`, `undead_bone_archer.svg`, `elf_moon_archer.png`), поэтому новый
арт должен встать рядом со старым без переделок.

---

## Как этим пользоваться

1. Найти нужный спрайт в оглавлении и скопировать блок промта целиком — всё, что
   лежит между строками с тройными обратными кавычками.
2. Вставить в генератор как есть. Ничего дописывать не нужно: каждый промт
   самодостаточен — в нём и стиль, и палитра, и раскладка кадров, и запреты.
3. Генератор вернёт контактный лист с подписями кадров **снаружи** ячеек. Нарезать
   кадры и собрать финальный лист в нужной геометрии (см. «Технический контракт»).
4. Положить файл и зарегистрировать ключ (см. «Как подключить готовый арт»).
   До этого момента игра рисует процедурную заглушку «?» — ничего не ломается.

Если генератор не умеет держать сетку, просить кадры по одному: в промте они
пронумерованы, каждый описан отдельной строкой — можно резать промт по кадрам.

---

## Что уже есть, что нужно нарисовать

### Крипы (лист 128×32, 4 кадра по 32×32)

| Раса | Существо | Ключ спрайта | Статус |
| --- | --- | --- | --- |
| Нежить | Skeleton | `unit.undead.skeleton` | есть |
| Нежить | Ghoul | `unit.undead.ghoul` | есть |
| Нежить | Crypt Fiend | `unit.undead.crypt_fiend` | есть |
| Нежить | Gargoyle | `unit.undead.gargoyle` | есть |
| Нежить | Abomination | `unit.undead.abomination` | **нужен** |
| Нежить | Necromancer | `unit.undead.necromancer` | **нужен** |
| Нежить | Banshee | `unit.undead.banshee` | **нужен** |
| Нежить | Frost Wyrm | `unit.undead.frost_wyrm` | **нужен** |
| Орки | Grunt | `unit.orc.grunt` | **нужен** |
| Орки | Wolf Rider | `unit.orc.wolf_rider` | **нужен** |
| Орки | Troll | `unit.orc.troll` | **нужен** |
| Орки | Headhunter | `unit.orc.headhunter` | **нужен** |
| Люди | Militia | `unit.human.militia` | **нужен** |
| Люди | Footman | `unit.human.footman` | **нужен** |
| Люди | Rifleman | `unit.human.rifleman` | **нужен** |
| Люди | Siege Engine | `unit.human.siege_engine` | **нужен** |
| Эльфы | Archer | `unit.elf.archer` | **нужен** |
| Эльфы | Huntress | `unit.elf.huntress` | **нужен** |
| Эльфы | Dryad | `unit.elf.dryad` | **нужен** |
| Эльфы | Chimera | `unit.elf.chimera` | **нужен** |

### Башни (лист 300×180, 15 слотов по 60×60)

| Раса | Башня | Архетип | Ключ спрайта | Статус |
| --- | --- | --- | --- | --- |
| Нежить | Bone Archer Tower | single | `tower.undead.bone_archer` | есть (эталон стиля) |
| Нежить | Plague Tower | splash | `tower.undead.plague` | есть |
| Нежить | Frost Wyrm Nest | frost | `tower.undead.frost_wyrm_nest` | есть |
| Нежить | Bone Obelisk | support | `tower.undead.bone_obelisk` | есть |
| Орки | Spear Watchtower | single | `tower.orc.spear_watchtower` | есть |
| Орки | Burning Pit | splash | `tower.orc.burning_pit` | есть |
| Орки | Lightning Totem | chain | `tower.orc.lightning_totem` | есть |
| Орки | Tar Pit | frost | `tower.orc.tar_pit` | есть |
| Люди | Guard Archer Tower | single | `tower.human.guard_archer` | есть |
| Люди | Cannon Bastion | splash | `tower.human.cannon_bastion` | есть |
| Люди | Alchemist Tower | poison | `tower.human.alchemist_tower` | есть |
| Люди | Guard Post | support | `tower.human.guard_post` | есть |
| Эльфы | Moon Archer Tower | single | `tower.elf.moon_archer` | есть |
| Эльфы | Wisp Bloom | splash | `tower.elf.wisp_bloom` | **нужен** |
| Эльфы | Moonwell | frost | `tower.elf.moonwell` | **нужен** |
| Эльфы | Thorn Spire | poison | `tower.elf.thorn_spire` | **нужен** |

Тайлсеты земли, дорожек и пропсов нарисованы для всех четырёх рас — промты для них
не нужны.

---

## Технический контракт листов

Phaser режет лист построчно: слева направо, потом следующий ряд. Геометрия
обязательна, иначе анимации разъедутся.

### Лист крипа — 128×128

Четыре ряда по четыре кадра 32×32:

```txt
┌────────┬────────┬────────┬────────┐
│  0  1  2  3   ходьба ВНИЗ (на зрителя)   │
├────────┼────────┼────────┼────────┤
│  4  5  6  7   ходьба ВБОК (вправо)       │
├────────┼────────┼────────┼────────┤
│  8  9 10 11   ходьба ВВЕРХ (от зрителя)  │
├────────┼────────┼────────┼────────┤
│ 12 13 14 15   СМЕРТЬ                     │
└────────┴────────┴────────┴────────┘
```

- Движение влево игра получает отражением бокового ряда, отдельный ряд не нужен.
- Персонаж занимает 75–85% высоты кадра, ноги на общей базовой линии внутри ряда
  (у летающих — одинаковая высота зависания).
- Фон прозрачный, тени на фон не запекаются: в игре крип рисуется размером 28×28 px.
- Готовые промты под этот контракт лежат в [art-prompts](art-prompts/), по файлу на крипа.
- Старые листы 128×32 (четыре спрайта нежити) продолжают работать в прежнем режиме —
  без направлений и без анимации смерти.

### Лист башни — 300×180

Сетка 5 столбцов × 3 ряда, 15 слотов по 60×60:

```txt
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ 0 BUILD1│ 1 BUILD2│ 2 BUILD3│ 3 IDLE A│ 4 IDLE B│
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 5 ATK 1 │ 6 ATK 2 │ 7 ATK 3 │ 8 ПУСТО │ 9 HIT   │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│10 SELL1 │11 SELL2 │12 SHOT  │13 IMPACT│14 ПУСТО │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

- `0–2` стройка: фундамент → половина → готовая башня.
- `3–4` покой: двухкадровый цикл (пульс свечения, качание флага).
- `5–7` атака: замах → выстрел → возврат.
- `8` пустой служебный слот, полностью прозрачный.
- `9` реакция на удар: готовая башня, залитая красным.
- `10–11` продажа: обрушение → куча обломков.
- `12` снаряд: летит вправо, ~20×20 px содержимого по центру.
- `13` эффект попадания: радиальная вспышка по центру, без башни в кадре.
- `14` не используется, полностью прозрачный.

**Основание башни — у нижнего края кадра.** В игре спрайт ставится с якорем
`(0.5, 0.82)` и размером ~42×42 px: если фундамент нарисован по центру, башня
«взлетит» над клеткой.

---

## Общие правила стиля (уже вшиты в каждый промт)

- HD pixel art уровня 16-бит JRPG / Warcraft III: чёткие пиксельные кластеры, один
  тёмный контур в 1 px, ограниченная палитра, мягкий дизеринг, холодная подсветка
  сверху-слева. Не вектор, не гладкая цифровая живопись, не 3D-рендер, не чиби.
- Тёмное фэнтези, приглушённая насыщенность, сильный контраст по светлоте: земля под
  спрайтами тёмная и десатурированная, читаемость держится на силуэте.
- Крипы — вид сбоку, башни — три четверти сверху.
- Фон только прозрачный: ни подложки, ни градиента, ни тени на фоне.
- Текст, подписи и водяные знаки — только снаружи ячеек, никогда поверх арта.

### Универсальный хвост промта

Если понадобится сгенерировать что-то, чего нет в списке, дописать это в конец:

```text
STYLE: HD pixel art, 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading and a subtle cool rim light from the upper left. Dark fantasy, muted saturation, strong value contrast. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart.
BACKGROUND: fully transparent. No background colour, no gradient, no ground plane, no drop shadow, no glow spilling onto the background.
DO NOT: no text, numbers, labels or watermarks inside the artwork cells; only one subject per cell; identical camera angle, lighting direction and scale in every cell; nothing cropped - leave a small empty margin inside every cell.
```

---

## Сборка листа из выдачи модели

Нарезать, выбить мадженту, выровнять кадры по базовой линии и привести их к одному масштабу
умеет скрипт:

```bash
# крип: 4x4 сетка -> лист 128x128, ряды нормализуются по ходьбе, смерть берёт масштаб ряда «вверх»
python tools/build-sprite-sheet.py raw.png src/shared/sprite/orc_grunt.png --grid 4x4 --cell 32 --normalize-rows 0,1,2

# башня: 5x3 сетка -> лист 300x180
python tools/build-sprite-sheet.py raw.png public/assets/towers/orc_tar_pit.png --grid 5x3 --cell 60
```

Что он делает: режет сетку, срезает нарисованные моделью рамки (`--inset`), выбивает фоновый
цвет в альфу (`--key`, по умолчанию `ff00ff`), обрезает каждый кадр по содержимому, масштабирует
все кадры одним коэффициентом и ставит их низом на общую базовую линию. Кадр, который не влезает
в ячейку, ужимается, а не обрезается, и печатается в отчёте.

## Как подключить готовый арт

### Крип

1. Положить лист `128×32` в `src/shared/sprite/<race>_<name>.png`.
2. В `src/shared/constants/sprites.ts`: импорт файла, ключ в `UNIT_SPRITE_KEYS`,
   пара в `UNIT_SPRITE_ASSETS`, ключ анимации в `UNIT_ANIMATION_KEYS`.
3. В `src/features/game-engine/runtime/animation/gameSceneAnimationRuntime.ts`:
   добавить пару в `UNIT_WALK_ANIMATIONS` и `case` в `getWalkAnimationKeyBySpriteKey`.
4. В `src/features/game-engine/runtime/battlefield/battlefieldSpriteFactory.ts`:
   дописать id существа в `getSpriteKeyByUnit`. Без этого крип продолжит брать
   тир-фоллбек нежити с тинтом расы, даже если файл лежит на месте.
5. Ключ в контенте (`src/content/units/<race>.json`) менять не нужно — он уже
   совпадает с тем, что в таблице выше.

### Башня

1. Нарезать генерацию из `TOWER_SPRITE_PROMPTS.md` командой `python tools/split-tower-pair.py`
   (две башни на картинку) — листы `300×180` лягут в `public/assets/towers/<race>_<name>.png`.
2. В `src/shared/constants/sprites.ts` добавить ключ в `TOWER_SPRITE_KEYS`. Путь к листу и
   ключи анимаций выводятся из ключа; `TOWER_SHEET_FRAME_LAYOUTS` нужен, только если лист
   отступает от контракта слотов.
3. Контент (`src/content/towers/<race>.json`) уже ссылается на этот ключ — править
   нечего. Движок рисует башню по её `buildableTowerId`, а не по типу атаки.

### Проверка

```bash
npx vitest run && npm run build
```

В dev-режиме консоль печатает `[assets] tower art missing, drawing placeholder: <ключ>`
для каждого недостающего листа — строка исчезает, когда арт подключён.
Полный список недостающего доступен через `getMissingArtReport()`.

---

## Оглавление промтов

- **Нежить (Undead) — крипы**
  - Skeleton — `unit.undead.skeleton`
  - Ghoul — `unit.undead.ghoul`
  - Crypt Fiend — `unit.undead.crypt_fiend`
  - Gargoyle — `unit.undead.gargoyle`
  - Abomination — `unit.undead.abomination`
  - Necromancer — `unit.undead.necromancer`
  - Banshee — `unit.undead.banshee`
  - Frost Wyrm — `unit.undead.frost_wyrm`
- **Орки (Orc) — крипы**
  - Grunt — `unit.orc.grunt`
  - Wolf Rider — `unit.orc.wolf_rider`
  - Troll — `unit.orc.troll`
  - Headhunter — `unit.orc.headhunter`
- **Люди (Human) — крипы**
  - Militia — `unit.human.militia`
  - Footman — `unit.human.footman`
  - Rifleman — `unit.human.rifleman`
  - Siege Engine — `unit.human.siege_engine`
- **Эльфы (Elf) — крипы**
  - Archer — `unit.elf.archer`
  - Huntress — `unit.elf.huntress`
  - Dryad — `unit.elf.dryad`
  - Chimera — `unit.elf.chimera`
- **Башни нежити (Undead)**
  - Bone Archer Tower — `tower.undead.bone_archer`
  - Plague Tower — `tower.undead.plague`
  - Frost Wyrm Nest — `tower.undead.frost_wyrm_nest`
  - Bone Obelisk — `tower.undead.bone_obelisk`
- **Башни орков (Orc)**
  - Spear Watchtower — `tower.orc.spear_watchtower`
  - Burning Pit — `tower.orc.burning_pit`
  - Lightning Totem — `tower.orc.lightning_totem`
  - Tar Pit — `tower.orc.tar_pit`
- **Башни людей (Human)**
  - Guard Archer Tower — `tower.human.guard_archer`
  - Cannon Bastion — `tower.human.cannon_bastion`
  - Alchemist Tower — `tower.human.alchemist_tower`
  - Guard Post — `tower.human.guard_post`
- **Башни эльфов (Elf)**
  - Moon Archer Tower — `tower.elf.moon_archer`
  - Wisp Bloom — `tower.elf.wisp_bloom`
  - Moonwell — `tower.elf.moonwell`
  - Thorn Spire — `tower.elf.thorn_spire`

---

## Нежить (Undead) — крипы
Крипы нежити узнаются по паре «кость + холодный огонёк»: костяная слоновая кость силуэта и синe-фиолетовое свечение #5c8cff в глазницах, поверх которых лежат некротический фиолет в тенях, кровавые пятна и потемневшая бронза на пряжках, крюках и цепях. Тропа у нежити серо-костяная, поэтому фракция держится на контрасте светлых костей и почти чёрного контура, а не на насыщенности цвета: любой крип должен читаться как светлое пятно на тёмном фоне. Внутри фракции различие идёт только по форме силуэта — прямой скелет, пригнувшийся вурдалак, низкий шестиногий панцирь, X-образные крылатые летуны, широкая туша абоминации и узкий колокол некроманта, — потому что при 28x28 px игрок видит контур, а не детали.

*Готовый арт-референс фракции лежит в `src/shared/sprite/` (`skeleton.svg`, `ghoul.svg`, `undead_crypt_fiend.svg`, `undead_gargoyle.svg`) — новые листы сверять по нему на толщину контура и уровень насыщенности. Сами эти SVG — только референс: поставляемый файл для каждого крипа всегда растровый `undead_<name>.png` 128x32, потому что лист собирается вручную из выдачи image-модели. Когда PNG-версия существующих четырёх крипов будет готова, импорты в `src/shared/constants/sprites.ts` переключаются с `.svg` на новый `.png`.*

*Палитра фракции закрыта, но там, где сюжет требует материала вне списка (камень, лёд, кожа, дерево, ржавое железо), в промпт дописано точечное расширение вида «plus, for this creature only, ...» — как у орочьего wolf_rider и эльфийского moonwell. Ничего сверх этих названных исключений добавлять нельзя.*

*Фраза про свет во всех промптах одна и та же — «soft dithered shading and a subtle cool rim light from the upper left». Она обязана быть дословно идентичной и в секциях башен, потому что крипы одной расы и башни другой видны на экране одновременно.*

### Skeleton — `unit.undead.skeleton`

| | |
| --- | --- |
| Файл | `undead_skeleton.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | есть арт (`src/shared/sprite/skeleton.svg`), можно перерисовать (референс стиля фракции) |
| Роль в игре | Тир 1, базовый чаф. HP 105, скорость 1.30, броня 0, small, без брони. С первого взгляда: дешёвый ходячий скелет с мечом и щитом, умирает от чего угодно. |

```text
Pixel-art sprite sheet: a 4-frame side-view WALK CYCLE for "Skeleton", a tier-1 creep in a dark-fantasy tower defense game.

STYLE (identical for the whole roster): HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy, muted saturation, strong value contrast so the sprite stays readable on a dark grey bone-coloured ground.

PALETTE (Undead faction, use these and nothing else): bone ivory, cold blue-violet #5c8cff, necrotic purple, blood red accents, tarnished bronze - plus, for this creature only, dark worn leather brown used ONLY for the chest strap, the loincloth rags and the wooden boards of the shield. No other colour anywhere.

CAMERA: flat side view (profile), eye level, subject facing RIGHT. Camera angle, distance and eye level are identical in all four frames.

SUBJECT: a small restless skeleton warrior risen from a forgotten crypt. Bare bone-ivory skeleton, no flesh, a visible ribcage with real transparent gaps between the ribs, a bare skull with two tiny cold blue-violet #5c8cff pinpoints in the eye sockets and a slightly open jaw. A dark blood-red tattered loincloth at the hips, a worn leather strap running diagonally across the ribs with tarnished bronze buckles. He carries a short pitted sword in his leading (right) hand, held low, and a small round wooden shield with a tarnished bronze boss strapped to his rear arm across the chest. Thin brittle limbs, narrow frame - he must look cheap and expendable, not heroic.

MOVEMENT: this is a GROUND WALKER, an ordinary two-legged walk cycle. WALK 1 - contact pose: near leg forward with the heel down, far leg back on the toe, sword arm trailing behind. WALK 2 - passing pose: legs gathered under the body, body at its highest point, shield rocking slightly, skull bobbing up. WALK 3 - contact pose mirrored: far leg forward, near leg back, sword arm swung forward. WALK 4 - passing pose again with the opposite arm swing, skull bobbing, jaw slightly open. The cycle must loop seamlessly from frame 4 back to frame 1.

SILHOUETTE at 28x28 px: a narrow upright biped - bare skull on a thin neck, a gappy ribcage, and the round disc of the shield breaking the chest line. It must never read as a fleshed humanoid.

LAYOUT: one single horizontal row of four equal square cells, left to right, on a fully transparent background. Each cell is one finished 32x32 pixel-art frame (the final in-game strip is 128x32 px), so keep the detail budget low enough that everything still reads at 32x32. Label the cells "WALK 1", "WALK 2", "WALK 3", "WALK 4" in small plain text placed OUTSIDE the artwork, below the row - never inside a cell, never over the character.

SCALE: the skeleton fills about 75-85% of the cell height and is centred horizontally in every cell.

STRICT RULES: exactly one character per cell; identical scale, identical camera angle and identical eye level in all four cells; the feet rest on the same baseline in every cell; the character always faces RIGHT; nothing cropped - leave 1-2 px of empty margin around the silhouette; transparent background only - no background colour, no gradient, no ground plane, no drop shadow, no glow spilling onto the background; no text, watermark, signature, borders or grid lines inside the artwork cells.
```

**На что смотреть при приёмке:** череп и круглый щит должны читаться как два отдельных светлых пятна при 28x28, между рёбрами обязана быть прозрачность, а не заливка. Если на кадрах 1 и 3 нет чёткого контакта стопы с общей базовой линией, крип будет «скользить» по тропе.

### Ghoul — `unit.undead.ghoul`

| | |
| --- | --- |
| Файл | `undead_ghoul.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | есть арт (`src/shared/sprite/ghoul.svg`), можно перерисовать (референс стиля фракции) |
| Роль в игре | Тир 1, чаф-бегун. HP 80, скорость 1.95 — самый быстрый чаф нежити, броня 0, small, без брони. С первого взгляда: лёгкий, тощий, пролетает мимо медленных башен. |

```text
Pixel-art sprite sheet: a 4-frame side-view WALK CYCLE for "Ghoul", a fast tier-1 creep in a dark-fantasy tower defense game.

STYLE (identical for the whole roster): HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy, muted saturation, strong value contrast so the sprite stays readable on a dark grey bone-coloured ground.

PALETTE (Undead faction, use these and nothing else): bone ivory, cold blue-violet #5c8cff, necrotic purple, blood red accents, tarnished bronze - plus, for this creature only, dark worn leather brown used ONLY for the tattered hip rag and the leather of the wrist shackle. No other colour anywhere.

CAMERA: flat side view (profile), eye level, subject facing RIGHT. Camera angle, distance and eye level are identical in all four frames.

SUBJECT: a feral clawed ghoul, a grave scavenger that runs down slow defenders. Hunched almost horizontal, the head thrust forward and held LOWER than the shoulders, spine arched, disproportionately long arms ending in long dirty claws that nearly touch the ground, short bent legs built for loping. Pale rotten flesh in washed bone-ivory tones over visible bone, necrotic purple bruising along the ribs and spine, blood red around the wide lipless mouth and the torn raw patches of skin, a cold blue-violet #5c8cff glint in the sunken eyes. A tattered strip of dark cloth around the hips and one tarnished bronze shackle on a wrist with a broken chain link. Wiry, starved, light - nothing about him may look armoured or heavy.

MOVEMENT: this is a GROUND WALKER with a four-point loping run, not an upright walk. WALK 1 - contact: both long arms planted forward, weight on the claws, rear leg extended far back. WALK 2 - passing: body pulled forward and low, legs gathering under the chest, arms swinging back. WALK 3 - contact: legs planted forward under the body, arms swung back, head lifted slightly. WALK 4 - passing: mid-lunge, body stretched out long, one arm reaching forward. The cycle must loop seamlessly from frame 4 back to frame 1.

SILHOUETTE at 28x28 px: a low forward-leaning wedge - head below shoulder height, long arms reaching down to the baseline, back arched high. It must never read as an upright biped like the Skeleton.

LAYOUT: one single horizontal row of four equal square cells, left to right, on a fully transparent background. Each cell is one finished 32x32 pixel-art frame (the final in-game strip is 128x32 px), so keep the detail budget low enough that everything still reads at 32x32. Label the cells "WALK 1", "WALK 2", "WALK 3", "WALK 4" in small plain text placed OUTSIDE the artwork, below the row - never inside a cell, never over the character.

SCALE: the ghoul fills about 70-80% of the cell height (he is hunched, so he reads wide rather than tall) and is centred horizontally in every cell.

STRICT RULES: exactly one character per cell; identical scale, identical camera angle and identical eye level in all four cells; the lowest contact points rest on the same baseline in every cell; the character always faces RIGHT; nothing cropped - leave 1-2 px of empty margin around the silhouette; transparent background only - no background colour, no gradient, no ground plane, no drop shadow, no glow spilling onto the background; no text, watermark, signature, borders or grid lines inside the artwork cells.
```

**На что смотреть при приёмке:** силуэт должен быть ниже и длиннее скелета — если вурдалак стоит прямо, скорость 1.95 не читается. Проверить, что руки реально доходят до базовой линии и что поза меняется между всеми четырьмя кадрами, а не только ноги.

### Crypt Fiend — `unit.undead.crypt_fiend`

| | |
| --- | --- |
| Файл | `undead_crypt_fiend.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | есть арт (`src/shared/sprite/undead_crypt_fiend.svg`), можно перерисовать (референс стиля фракции) |
| Роль в игре | Тир 2, бронированный. HP 210, скорость 1.05, броня 3, medium, тяжёлая броня. С первого взгляда: низкий панцирный шестиног, который не спешит и держит удар. |

```text
Pixel-art sprite sheet: a 4-frame side-view WALK CYCLE for "Crypt Fiend", an armoured tier-2 creep in a dark-fantasy tower defense game.

STYLE (identical for the whole roster): HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy, muted saturation, strong value contrast so the sprite stays readable on a dark grey bone-coloured ground.

PALETTE (Undead faction, use these and nothing else): bone ivory, cold blue-violet #5c8cff, necrotic purple, blood red accents, tarnished bronze. This creature needs no palette extension - the chitin, the web strands and the grave dust are all painted in bone-ivory values. No other colour anywhere.

CAMERA: flat side view (profile), eye level, subject facing RIGHT. Camera angle, distance and eye level are identical in all four frames.

SUBJECT: a spider-like crypt horror wrapped in deathly chitin. Six legs - three on the near side drawn in full value, three on the far side one shade darker and behind the body - a low armoured carapace slung close to the ground, a segmented abdomen trailing behind and a raised armoured head-thorax in front carrying a cluster of small cold blue-violet #5c8cff eyes and a pair of curved mandibles. Overlapping plates of bone-ivory chitin edged with tarnished bronze, necrotic purple in the plate seams, dried blood red staining the mandible tips, a few strands of old web and grave dust caught on the carapace. Heavy, plated and deliberate - he must look armoured and slow, never nimble or insect-quick.

MOVEMENT: this is a GROUND WALKER with an alternating six-leg gait. WALK 1 - contact: near front and near rear legs forward, middle leg back, body at its lowest. WALK 2 - passing: the leg sets swap, body lifts by one pixel, abdomen rocks backwards. WALK 3 - contact mirrored: the opposite leg set is forward, mandibles twitching. WALK 4 - passing: leg sets swap back, body settles to its lowest, abdomen rocks forward. The cycle must loop seamlessly from frame 4 back to frame 1.

SILHOUETTE at 28x28 px: a long, low, many-legged mass, wider than it is tall, with sharp angular leg joints rising above the body line and a heavy abdomen behind. It must read as an armoured six-legged spider, never as a biped.

LAYOUT: one single horizontal row of four equal square cells, left to right, on a fully transparent background. Each cell is one finished 32x32 pixel-art frame (the final in-game strip is 128x32 px), so keep the detail budget low enough that everything still reads at 32x32. Label the cells "WALK 1", "WALK 2", "WALK 3", "WALK 4" in small plain text placed OUTSIDE the artwork, below the row - never inside a cell, never over the character.

SCALE: this creature is low and wide - it fills about 85-95% of the cell WIDTH and about 55-65% of the cell height, centred horizontally, with its legs resting on the common baseline.

STRICT RULES: exactly one creature per cell; identical scale, identical camera angle and identical eye level in all four cells; the feet rest on the same baseline in every cell; the creature always faces RIGHT; nothing cropped - leave 1-2 px of empty margin around the silhouette; transparent background only - no background colour, no gradient, no ground plane, no drop shadow, no glow spilling onto the background; no text, watermark, signature, borders or grid lines inside the artwork cells.
```

**На что смотреть при приёмке:** броня 3 должна читаться силуэтом — сплошные пластины панциря и толстые сегменты ног, без тонких паучьих ниточек. Дальние ноги обязаны быть темнее ближних, иначе при 28x28 всё сольётся в кашу.

### Gargoyle — `unit.undead.gargoyle`

| | |
| --- | --- |
| Файл | `undead_gargoyle.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | есть арт (`src/shared/sprite/undead_gargoyle.svg`), можно перерисовать (референс стиля фракции) |
| Роль в игре | Тир 3, летун. HP 230, скорость 1.70, броня 1, medium, тяжёлая броня, ЛЕТАЕТ. С первого взгляда: быстрый крылатый каменный силуэт над землёй — первая проверка ПВО у игрока. |

```text
Pixel-art sprite sheet: a 4-frame side-view FLIGHT CYCLE for "Gargoyle", a flying tier-3 creep in a dark-fantasy tower defense game.

STYLE (identical for the whole roster): HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy, muted saturation, strong value contrast so the sprite stays readable on a dark grey bone-coloured ground.

PALETTE (Undead faction, use these and nothing else): bone ivory, cold blue-violet #5c8cff, necrotic purple, blood red accents, tarnished bronze - plus, for this creature only, cracked grey granite used ONLY for the stone body and the stone wing membranes. The granite must stay clearly greyer and darker than the bone-ivory horns and claws so the two materials never merge. No other colour anywhere.

CAMERA: flat side view (profile), eye level, subject facing RIGHT. Camera angle, distance and eye level are identical in all four frames.

SUBJECT: a winged stone predator cut from graveyard granite and animated by necromancy. A compact muscular body of cracked grey stone, the cracks lit from inside with cold blue-violet #5c8cff necrotic light, bone-ivory horns, fangs and claws, a tarnished bronze ring in the collar, dried blood red in the claw grooves. A snarling gargoyle head with a flat brutal muzzle and glowing #5c8cff eyes, large bat-like stone wings with visibly chipped membranes, legs tucked up under the belly in flight, a short spaded tail trailing behind. Stone material, but an agile diving posture - a hunter, not a statue.

MOVEMENT: this creature is a FLYER, not a ground walker - there are no footfalls and no ground contact anywhere on the sheet. Give a 4-frame wing-beat loop at a CONSTANT hover height: WALK 1 - top of the upstroke, wings fully raised above the body. WALK 2 - mid-downstroke, wings swept out horizontally, membranes taut. WALK 3 - bottom of the downstroke, wings fully lowered beneath the body. WALK 4 - mid-upstroke, wings horizontal again and rising, tail flicking. All the motion is in the wings and the tail: the body and the tucked feet stay at exactly the same height in all four cells, resting on a common invisible hover line, and the empty gap below the creature is identical in every cell. The cycle must loop seamlessly from frame 4 back to frame 1.

SILHOUETTE at 28x28 px: a broad winged X hanging in the air - a compact dense body at the centre, big wing shapes above or below it depending on the frame, horns breaking the head outline, and clearly nothing that touches a ground line.

LAYOUT: one single horizontal row of four equal square cells, left to right, on a fully transparent background. Each cell is one finished 32x32 pixel-art frame (the final in-game strip is 128x32 px), so keep the detail budget low enough that everything still reads at 32x32. Label the cells "WALK 1", "WALK 2", "WALK 3", "WALK 4" in small plain text placed OUTSIDE the artwork, below the row - never inside a cell, never over the character (the engine calls this animation "walk" even for flyers).

SCALE: with the wings at their widest the gargoyle fills about 85-95% of the cell width and about 70-80% of its height, centred in the cell.

STRICT RULES: exactly one creature per cell; identical scale, identical camera angle and identical eye level in all four cells; identical hover height in all four cells; the creature always faces RIGHT; nothing cropped - the wing tips must stay inside the cell with 1-2 px of margin at their widest; transparent background only - no background colour, no gradient, no ground plane, no drop shadow, no glow spilling onto the background; no text, watermark, signature, borders or grid lines inside the artwork cells.
```

**На что смотреть при приёмке:** на кадрах 1 и 3 крылья должны быть в противоположных крайних положениях — иначе взмах не читается на скорости 1.70. Ноги обязаны быть поджаты: свисающие лапы читаются как наземный юнит и ломают понимание, что цель воздушная. Камень обязан быть заметно темнее костяных рогов и когтей — это и есть визуальная подпись тяжёлой брони.

### Abomination — `unit.undead.abomination`

| | |
| --- | --- |
| Файл | `undead_abomination.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 4, танк. HP 520 — самый живучий у нежити до Т6, скорость 0.70 — самый медленный юнит в игре, броня 4, large, тяжёлая броня. С первого взгляда: медленная гора мяса, которую нельзя убить одной башней. |

```text
Pixel-art sprite sheet: a 4-frame side-view WALK CYCLE for "Abomination", a huge slow tier-4 tank creep in a dark-fantasy tower defense game.

STYLE (identical for the whole roster): HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy, muted saturation, strong value contrast so the sprite stays readable on a dark grey bone-coloured ground.

PALETTE (Undead faction, use these and nothing else): bone ivory, cold blue-violet #5c8cff, necrotic purple, blood red accents, tarnished bronze - plus, for this creature only, dull rusted iron used ONLY for the cleaver blade and the crude staples in the belly seam. No other colour anywhere.

CAMERA: flat side view (profile), eye level, subject facing RIGHT. Camera angle, distance and eye level are identical in all four frames.

SUBJECT: a patchworked brute stitched together from many corpses. Enormous sloping shoulders with a tiny sunken head set low between them and no neck at all, a vast bloated belly split open with exposed guts held in by crude stitches and rusted staples, mismatched arms - one massively swollen, the other thinner and rotten. Meat hooks on tarnished bronze chains sunk into his shoulders and back, the chains hanging and swinging as he moves; a huge pitted meat cleaver dragged in the leading hand, blade pointing down. Bloated pale flesh in washed bone-ivory tones, necrotic purple bruising over the belly and thighs, bone-ivory exposed bone at the ribs and knuckles, blood red at the seams and on the cleaver, a dull cold blue-violet #5c8cff gleam in the single visible eye. Everything about him must read as mass: top-heavy, wide, slow.

MOVEMENT: this is a GROUND WALKER with a heavy lumbering stomp. WALK 1 - contact: near leg planted forward and straight, far leg trailing, body at its lowest, belly hanging, chains slack. WALK 2 - passing: weight rolls over the planted leg, body lifts, chains and the cleaver swing forward. WALK 3 - contact mirrored: far leg planted forward, near leg trailing, body low again. WALK 4 - passing: chains and cleaver swing back, shoulders rocking. Long ground-contact poses, minimal vertical bounce, the head barely moves - the animation should feel like it is dragging. The cycle must loop seamlessly from frame 4 back to frame 1.

SILHOUETTE at 28x28 px: a wide top-heavy hulk - shoulder mass roughly twice the width of the legs, no neck, a bulging belly line, and the cleaver breaking the outline low on the leading side. He must be the widest and bulkiest ground silhouette in the roster.

LAYOUT: one single horizontal row of four equal square cells, left to right, on a fully transparent background. Each cell is one finished 32x32 pixel-art frame (the final in-game strip is 128x32 px), so keep the detail budget low enough that everything still reads at 32x32. Label the cells "WALK 1", "WALK 2", "WALK 3", "WALK 4" in small plain text placed OUTSIDE the artwork, below the row - never inside a cell, never over the character.

SCALE: the abomination fills about 80-90% of the cell height and about 75-85% of its width, centred horizontally in every cell.

STRICT RULES: exactly one character per cell; identical scale, identical camera angle and identical eye level in all four cells; the feet rest on the same baseline in every cell; the character always faces RIGHT; nothing cropped - the shoulders and the cleaver must stay inside the cell with 1-2 px of margin; transparent background only - no background colour, no gradient, no ground plane, no drop shadow, no glow spilling onto the background; no text, watermark, signature, borders or grid lines inside the artwork cells.
```

**На что смотреть при приёмке:** ширина плеч должна выделять его среди всей нежити при 28x28 — если силуэт похож на крупного скелета, танк не читается. Цепи и тесак обязаны менять положение во всех четырёх кадрах: без этого медленная походка выглядит как зависшая картинка.

### Necromancer — `unit.undead.necromancer`

| | |
| --- | --- |
| Файл | `undead_necromancer.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 5, дорогая цель (28 золота за убийство). HP 330, скорость 1.15, броня 2, medium, без брони. С первого взгляда: мягкий маг в балахоне — выгодно снять первым. |

```text
Pixel-art sprite sheet: a 4-frame side-view WALK CYCLE for "Necromancer", a robed tier-5 caster creep in a dark-fantasy tower defense game.

STYLE (identical for the whole roster): HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy, muted saturation, strong value contrast so the sprite stays readable on a dark grey bone-coloured ground.

PALETTE (Undead faction, use these and nothing else): bone ivory, cold blue-violet #5c8cff, necrotic purple, blood red accents, tarnished bronze - plus, for this creature only, dark stained wood brown used ONLY for the shaft of the staff. No other colour anywhere.

CAMERA: flat side view (profile), eye level, subject facing RIGHT. Camera angle, distance and eye level are identical in all four frames.

SUBJECT: a dark acolyte channelling grave magic. Heavy floor-length hooded robes in necrotic purple with bone-ivory trim and tarnished bronze clasps at the shoulder, a deep hood with NO visible face at all - only blackness inside and two tiny cold blue-violet #5c8cff pinpoints. Slightly stooped posture, the rear hand raised and open in a channelling gesture, the leading hand gripping a tall staff topped with a horned skull whose eye sockets glow #5c8cff, a blood red rune stitched on the chest. Two or three small floating blue-violet wisps orbiting the raised hand and the skull of the staff. The robe hem sweeps the ground and completely hides the feet - the walk must be read from the swaying hem, not from visible legs. Soft cloth, no plate, no mail: he must look like a valuable unarmoured target, not a warrior.

MOVEMENT: this is a GROUND WALKER whose gait is carried by the robe. WALK 1 - contact: hem swept back into a trailing wedge, staff planted forward, body at its lowest. WALK 2 - passing: hem gathers under the body, body lifts by a pixel, wisps drift upward, sleeve swings. WALK 3 - contact mirrored: hem swept the opposite way, staff lifted and about to plant, hood dipping forward. WALK 4 - passing: hem gathers again, wisps drift downward, sleeve swings back. The wisps must sit in a different position in every frame so the loop reads as alive. The cycle must loop seamlessly from frame 4 back to frame 1.

SILHOUETTE at 28x28 px: a tall narrow bell or cone - wide at the sweeping hem, narrowing to a pointed hood - with the straight vertical line of the staff and its skull knob breaking the outline on the leading side. No legs, no feet, no armour edges.

LAYOUT: one single horizontal row of four equal square cells, left to right, on a fully transparent background. Each cell is one finished 32x32 pixel-art frame (the final in-game strip is 128x32 px), so keep the detail budget low enough that everything still reads at 32x32. Label the cells "WALK 1", "WALK 2", "WALK 3", "WALK 4" in small plain text placed OUTSIDE the artwork, below the row - never inside a cell, never over the character.

SCALE: the necromancer fills about 80-90% of the cell height (including the staff, which may be the tallest element) and is centred horizontally in every cell.

STRICT RULES: exactly one character per cell; identical scale, identical camera angle and identical eye level in all four cells; the robe hem rests on the same baseline in every cell; the character always faces RIGHT; nothing cropped - the staff tip must stay inside the cell with 1-2 px of margin; transparent background only - no background colour, no gradient, no ground plane, no drop shadow, no glow spilling onto the background; no text, watermark, signature, borders or grid lines inside the artwork cells.
```

**На что смотреть при приёмке:** внутри капюшона не должно быть лица — только тьма и две точки, иначе фигура читается как человек, а не как нежить. Посох с черепом обязан торчать из силуэта: это единственная зацепка, по которой игрок при 28x28 отличит некроманта от банши и решит бить его первым.

### Banshee — `unit.undead.banshee`

| | |
| --- | --- |
| Файл | `undead_banshee.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 5, летун. HP 300, скорость 1.40, броня 1, small, без брони, ЛЕТАЕТ. С первого взгляда: полупрозрачный призрак без ног, плывущий над тропой. |

```text
Pixel-art sprite sheet: a 4-frame side-view HOVERING DRIFT CYCLE for "Banshee", a flying tier-5 spirit creep in a dark-fantasy tower defense game.

STYLE (identical for the whole roster): HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy, muted saturation, strong value contrast so the sprite stays readable on a dark grey bone-coloured ground.

PALETTE (Undead faction, use these and nothing else): bone ivory, cold blue-violet #5c8cff, necrotic purple, blood red accents, tarnished bronze. This creature needs no palette extension - shroud, hair and vapour are all built from bone-ivory and #5c8cff values. No other colour anywhere.

CAMERA: flat side view (profile), eye level, subject facing RIGHT. Camera angle, distance and eye level are identical in all four frames.

SUBJECT: a wailing spirit caught between life and oblivion. A translucent female form in a tattered shroud: the upper body is semi-transparent bone ivory shot through with cold blue-violet #5c8cff, the face gaunt with empty eye sockets glowing #5c8cff and a hollow mouth open mid-scream, long spectral hair streaming backwards. She has NO legs at all - below the waist the shroud shreds into thin ragged vapour that thins out and fades to nothing before it reaches the bottom of the cell. Thin arms with long spectral fingers reaching forward, necrotic purple in the deepest folds of the shroud, and a single blood red stone on a tarnished bronze torc at the throat as the only solid opaque object on her. Convey transparency with dithered checkerboard pixel patterns and thin bone-ivory edge lines - never with a soft airbrushed blur or semi-opaque smooth gradients.

MOVEMENT: this creature is a FLYER, not a ground walker - there are no legs, no footfalls and no ground contact anywhere on the sheet. Give a 4-frame drifting hover loop at a CONSTANT hover height: WALK 1 - shroud and hair swept back, arms held low, vapour tail straight. WALK 2 - shroud billowing outward, hair lifting, vapour tail curling forward. WALK 3 - shroud drawn in tight, both arms reaching further forward, hair falling. WALK 4 - shroud billowing the opposite way, vapour tail curling back. The head and shoulders stay at exactly the same height in all four cells and the ragged vapour tail ends at the same height in every cell - all the motion is in the cloth, the hair and the vapour. The cycle must loop seamlessly from frame 4 back to frame 1.

SILHOUETTE at 28x28 px: a teardrop or candle-flame shape - a defined head and shoulders on top narrowing into a ragged trailing tail with absolutely nothing that could read as feet or a hem resting on the ground.

LAYOUT: one single horizontal row of four equal square cells, left to right, on a fully transparent background. Each cell is one finished 32x32 pixel-art frame (the final in-game strip is 128x32 px), so keep the detail budget low enough that everything still reads at 32x32. Label the cells "WALK 1", "WALK 2", "WALK 3", "WALK 4" in small plain text placed OUTSIDE the artwork, below the row - never inside a cell, never over the character (the engine calls this animation "walk" even for flyers).

SCALE: the banshee fills about 75-85% of the cell height including the dissolving tail, and is centred horizontally in every cell.

STRICT RULES: exactly one spirit per cell; identical scale, identical camera angle and identical eye level in all four cells; identical hover height in all four cells; the spirit always faces RIGHT; nothing cropped - leave 1-2 px of empty margin around the silhouette; transparent background only - no background colour, no gradient, no ground plane, no drop shadow, no glow spilling onto the background; no text, watermark, signature, borders or grid lines inside the artwork cells.
```

**На что смотреть при приёмке:** низ тела обязан именно растворяться дизером в прозрачность — ровный обрез или подол платья превращают банши в наземного юнита. Голова и плечи должны стоять на одной высоте во всех кадрах, иначе призрак будет прыгать по вертикали при движении по тропе.

### Frost Wyrm — `unit.undead.frost_wyrm`

| | |
| --- | --- |
| Файл | `undead_frost_wyrm.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 6, босс волны. HP 620, скорость 1.25, броня 5, large, тяжёлая броня, ЛЕТАЕТ. С первого взгляда: самый крупный силуэт на поле — если он в воздухе, волна закончится плохо. |

```text
Pixel-art sprite sheet: a 4-frame side-view FLIGHT CYCLE for "Frost Wyrm", the tier-6 flying boss creep of a dark-fantasy tower defense game.

STYLE (identical for the whole roster): HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy, muted saturation, strong value contrast so the sprite stays readable on a dark grey bone-coloured ground.

PALETTE (Undead faction, use these and nothing else): bone ivory, cold blue-violet #5c8cff, necrotic purple, blood red accents, tarnished bronze - plus, for this creature only, pale ice blue used ONLY for the ice shards along the spine and shoulders and for the frozen breath plume. Keep the ice clearly cooler and lighter than the bone ivory so the two never blend. No other colour anywhere.

CAMERA: flat side view (profile), eye level, subject facing RIGHT. Camera angle, distance and eye level are identical in all four frames.

SUBJECT: an ancient skeletal dragon bound to ice and undeath. A long bone-ivory skeleton in flight: a bare ribcage with real transparent gaps between the ribs, an elongated fanged skull with cold blue-violet #5c8cff soul-fire burning in the eye sockets, a long bony neck held forward and a long whipping tail of vertebrae behind. Jagged pale ice shards grow out along the spine and the shoulder blades, a thin plume of frozen breath drifts from the jaws, and huge bone wings - bare finger bones with tattered frozen membrane stretched between them - carry the body. Tarnished bronze harness rings and broken chains hang around the neck and jaw, faint blood red staining marks the fangs, and a necrotic purple glow sits under the ribcage. Massive, ancient and armoured: this is the boss, and it must outclass every other creep on sight.

MOVEMENT: this creature is a FLYER, not a ground walker - there are no footfalls and no ground contact anywhere on the sheet. Give a 4-frame wing-beat loop at a CONSTANT hover height: WALK 1 - top of the upstroke, wings fully raised, neck stretched forward, tail low. WALK 2 - mid-downstroke, wings swept out horizontally, tail beginning to curl up. WALK 3 - bottom of the downstroke, wings fully lowered beneath the body, neck curling slightly back, breath plume at its longest. WALK 4 - mid-upstroke, wings horizontal again and rising, tail whipping down. The body, neck root and the lowest point of the tail stay at exactly the same height in all four cells - the motion lives in the wings, the tail and the breath plume. The cycle must loop seamlessly from frame 4 back to frame 1.

SILHOUETTE at 28x28 px: the widest winged shape in the game - long skull and neck out front, huge wing span, long tail behind, and transparent gaps inside the ribcage that no other creep has. It must never be mistaken for the smaller compact gargoyle.

LAYOUT: one single horizontal row of four equal square cells, left to right, on a fully transparent background. Each cell is one finished 32x32 pixel-art frame (the final in-game strip is 128x32 px), so keep the detail budget low enough that everything still reads at 32x32. Label the cells "WALK 1", "WALK 2", "WALK 3", "WALK 4" in small plain text placed OUTSIDE the artwork, below the row - never inside a cell, never over the character (the engine calls this animation "walk" even for flyers).

SCALE: as the boss it is the largest creature of the roster - it fills about 90-100% of the cell width and about 75-85% of its height, centred in the cell.

STRICT RULES: exactly one creature per cell; identical scale, identical camera angle and identical eye level in all four cells; identical hover height in all four cells; the creature always faces RIGHT; nothing cropped - the skull, wing tips and tail tip must all stay inside the cell with 1-2 px of margin; transparent background only - no background colour, no gradient, no ground plane, no drop shadow, no glow spilling onto the background; no text, watermark, signature, borders or grid lines inside the artwork cells.
```

**На что смотреть при приёмке:** при 28x28 должны читаться три вещи — длинная шея с черепом, разрыв рёбер и размах крыльев; если ужимается что-то одно, режьте детализацию льда, а не эти три. Босс должен быть заметно шире горгульи в кадре, иначе тир-6 не ощущается.

---

## Орки (Orc) — крипы
Орочья волна должна читаться как «мясо и железо»: приземистые, тяжёлые силуэты с широкими плечами, грубое чёрное железо, тёмная кожа ремней и рыжие (#d97b39) тканевые обмотки поверх оливково-зелёной шкуры. Никакого блеска и позолоты — только затёртый металл, красная боевая раскраска и белая кость в качестве украшений и брони. Даже быстрые юниты расы (волчий всадник, охотник за головами) остаются жилистыми и грязными, а не изящными: игрок должен с одного взгляда понимать, что орков надо убивать уроном, а не замедлением, и что каждый следующий тир расы — просто ещё более массивный кусок этого же силуэта.

Все четыре промпта используют один и тот же канонический блок STYLE, один блок CAMERA и одну фиксированную палитру фракции — расходятся только SUBJECT, добавки к палитре и позы. Метки кадров везде WALK 1..WALK 4, даже когда анимация по сути беговая или четвероногая: движок называет этот клип «walk» для любого крипа, и нарезка листа 128x32 идёт по этим меткам. Массу задаём не словами «самый крупный в ростере», а лестницей заполнения кадра внутри расы: волчий всадник 70-74% высоты (зато ~90% ширины), грант 72-78%, охотник 78-83% (узкий), тролль 82-85% и самый широкий. Претензия на «самый массивный» ограничена орочьими крипами — глобальное сравнение с нежитью и людьми задаётся процентами, а не текстом.

### Grunt — `unit.orc.grunt`

| | |
| --- | --- |
| Файл | `orc_grunt.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 1, базовое «мясо» орков: 145 hp, скорость 1.10, броня 1, средний размер, лёгкая броня — читается как приземистый пехотинец-танк начального уровня. |

```text
A 4-frame side-view WALK CYCLE sprite sheet of an orc grunt.

STYLE: HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette (around the whole structure for buildings), a strictly limited palette of about 12-16 colours, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy mood, muted saturation, strong value contrast so the shape stays readable against dark brown dirt terrain.

CAMERA: strict side view at ground level, the subject faces RIGHT in every frame, identical scale, identical camera angle and identical eye level in all four frames, planted feet on one shared baseline.

SUBJECT: a brutish orc warrior, a GROUND WALKER (no wings, no flight). Broad shoulders far wider than his hips, thick neck, hunched forward posture, short bowed legs, olive-green skin, a tusked lower jaw jutting out, small angry eyes under a heavy brow. He wears a crude blackened-iron pauldron on one shoulder, dark leather straps and a rust-orange cloth kilt and arm wraps, and carries a heavy two-handed iron axe held low across his body. Red warpaint stripes across the face, a few bone-white beads or a small bone charm on the belt. He must LOOK heavy and slow-footed: weight carried forward, plodding stomping stride, minimal vertical bounce.

PALETTE (orc faction, use these and nothing else, plus the per-subject additions listed below): rust orange #d97b39, dark leather brown, blackened iron grey, worn steel grey, red warpaint, bone white, olive-green orc skin, near-black outline. Per-subject additions: none.

SIZE: the grunt fills 72-78% of the cell height and about 55% of the cell width - a mid-height, wide-shouldered block, clearly shorter than the troll and the headhunter of the same set.

FRAMES, in this exact order, left to right in ONE horizontal row:
WALK 1 - contact pose, right leg forward and planted, left leg trailing back, axe swinging slightly back.
WALK 2 - passing pose, weight fully over the supporting leg, body at its lowest, opposite leg passing under the hips.
WALK 3 - contact pose mirrored, left leg forward and planted, right leg trailing back, axe swinging slightly forward.
WALK 4 - passing pose mirrored, body at its highest point of the plod, opposite leg passing under the hips.
The four frames must loop seamlessly: frame 4 flows straight back into frame 1.

LAYOUT: ONE horizontal row of 4 equally sized square cells on a fully transparent background, laid out left to right, labelled WALK 1, WALK 2, WALK 3, WALK 4 with the labels placed OUTSIDE the artwork cells (above or below the row). Use this one set of labels and no other. Each cell is rendered for a final size of 32x32 pixels, so keep the detail budget low enough to survive downscaling to that size.

STRICT RULES: side view only; the character faces RIGHT in every single frame; identical scale, identical camera angle and identical eye level in all four frames; feet on the same baseline in every frame; exactly one character per cell, centred; fully transparent background; no ground plane, no drop shadow, no cast shadow; no gradient or coloured background; no text, watermark, signature, logo or frame numbering inside the artwork cells; do not crop any part of the subject, including the axe head; no extra props, scenery or effects.

SILHOUETTE at 28x28 px: a squat top-heavy wedge — a wide block of shoulders over short legs, with the axe head breaking the outline low and behind him. Even as a black shape at tiny size it must read as "short, wide, armed and heavy".
```

**На что смотреть при приёмке:** Плечи должны быть заметно шире таза, а силуэт — низким и приземистым: если гранта можно спутать по контуру с человеческим пехотинцем, он не прошёл. Топор обязан выходить за габарит тела хотя бы в двух кадрах, иначе на 28x28 он превратится в безоружное пятно.

### Wolf Rider — `unit.orc.wolf_rider`

| | |
| --- | --- |
| Файл | `orc_wolf_rider.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 2, скоростной прорыв: 175 hp, скорость 1.85 (самый быстрый у орков), броня 1, средний размер, лёгкая броня — читается как хрупкий, но стремительный конный налётчик. |

```text
A 4-frame side-view WALK CYCLE sprite sheet of an orc wolf rider. The animation is a four-legged RUN, but the engine calls this clip "walk" for every creep, so the four frames are named WALK 1 to WALK 4 - use that one set of names everywhere, and never add RUN, GALLOP or FLY labels.

STYLE: HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette (around the whole structure for buildings), a strictly limited palette of about 12-16 colours, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy mood, muted saturation, strong value contrast so the shape stays readable against dark brown dirt terrain.

CAMERA: strict side view at ground level, the subject faces RIGHT in every frame, identical scale, identical camera angle and identical eye level in all four frames, planted paws on one shared baseline.

SUBJECT: a swift orc raider mounted on a lean grey war wolf. A GROUND WALKER on four legs (no wings, no flight) — the wolf runs, the rider never leaves the saddle. The wolf is long, wiry and hungry-looking: narrow chest, visible ribs, long muzzle with bared teeth, pointed ears laid back, grey and ash-brown fur, a leather harness with blackened-iron buckles and a rust-orange saddle blanket. The rider is small and crouched low over the wolf's neck, olive-green skin, dark leather armour with rust-orange wraps, red warpaint on the face, holding a short spear angled forward. The whole unit must LOOK light and fast: lean limbs, low body, forward-leaning momentum, no bulky armour plates.

PALETTE (orc faction, use these and nothing else, plus the per-subject additions listed below): rust orange #d97b39, dark leather brown, blackened iron grey, worn steel grey, red warpaint, bone white, olive-green orc skin, near-black outline. Per-subject additions: ash-grey and cool brown wolf fur.

SIZE: wolf and rider together fill 70-74% of the cell height and about 90% of the cell width - the lowest and by far the widest shape of the set, the only horizontal silhouette among the orc creeps.

FRAMES, in this exact order, left to right in ONE horizontal row:
WALK 1 - gather: all four legs bunched under the body, back arched up, wolf at its lowest.
WALK 2 - extension: front legs reaching forward, hind legs stretched back, body long and flat, mid-stride.
WALK 3 - front contact: front paws planted on the baseline, hind legs swinging forward under the belly.
WALK 4 - push-off: hind legs driving back off the baseline, front legs lifting, body stretched, wolf at its highest.
The four frames must loop seamlessly: frame 4 flows straight back into frame 1. The rider's head stays at a nearly constant height across all four frames — only the wolf's body cycles.

LAYOUT: ONE horizontal row of 4 equally sized square cells on a fully transparent background, laid out left to right, labelled WALK 1, WALK 2, WALK 3, WALK 4 with the labels placed OUTSIDE the artwork cells (above or below the row). Use this one set of labels and no other. Each cell is rendered for a final size of 32x32 pixels, so keep the detail budget low enough to survive downscaling to that size.

STRICT RULES: side view only; the wolf and rider face RIGHT in every single frame; identical scale, identical camera angle and identical eye level in all four frames; paws on the same baseline whenever they are planted; exactly one wolf with one rider per cell, centred; fully transparent background; no ground plane, no drop shadow, no cast shadow, no dust or speed lines; no gradient or coloured background; no text, watermark, signature, logo or frame numbering inside the artwork cells; do not crop any part of the subject or the spear; no extra props or scenery.

SILHOUETTE at 28x28 px: a long, low, HORIZONTAL four-legged shape with a small hump of rider on its back and a spear tip poking forward — the only wide-and-low silhouette in the orc set. At tiny size it must instantly read as "beast with a rider", never as a lone standing orc.
```

**На что смотреть при приёмке:** Ключевой признак — горизонтальный четырёхногий силуэт: волк должен быть длиннее, чем высок, а всадник — компактным горбом, а не второй фигурой в полный рост. Если голова всадника скачет по вертикали между кадрами, крип будет «дёргаться» на дорожке — высота посадки обязана быть постоянной. Проверьте подписи: их должно быть ровно четыре и только WALK 1..WALK 4; любой лишний набор меток (RUN, GALLOP) означает, что модель могла нарисовать лишние ячейки.

### Troll — `unit.orc.troll`

| | |
| --- | --- |
| Файл | `orc_troll.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 3, «губка для урона»: 360 hp, скорость 0.95, броня 3, крупный размер, тяжёлая броня — читается как медленная гора мяса, которую не берёт один залп. |

```text
A 4-frame side-view WALK CYCLE sprite sheet of a hulking troll berserker.

STYLE: HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette (around the whole structure for buildings), a strictly limited palette of about 12-16 colours, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy mood, muted saturation, strong value contrast so the shape stays readable against dark brown dirt terrain.

CAMERA: strict side view at ground level, the subject faces RIGHT in every frame, identical scale, identical camera angle and identical eye level in all four frames, planted feet on one shared baseline.

SUBJECT: a lumbering troll berserker fighting for the orc horde, a GROUND WALKER (no wings, no flight). Massive and top-heavy: a hunched rounded back that rises above the head, thick sloping shoulders, very long arms that hang down almost to the ground with heavy clawed fists, a low-slung jutting jaw with tusks, small deep-set eyes, a scraggly dark mane. Blue-grey troll hide with darker dithered mottling, thick bone-white armour plates strapped over the shoulders, chest and forearms with dark leather bindings, rust-orange cloth wraps around the waist and one arm, red warpaint handprints across the chest plate. He must LOOK slow and armoured: enormous mass, wide heavy stance, ponderous stomping steps with a big side-to-side body sway and a deep vertical dip.

PALETTE (orc faction, use these and nothing else, plus the per-subject additions listed below): rust orange #d97b39, dark leather brown, blackened iron grey, worn steel grey, red warpaint, bone white, olive-green orc skin, near-black outline. Per-subject additions: blue-grey troll hide with a darker mottling tone.

SIZE: the troll fills 82-85% of the cell height and about 65-70% of the cell width - the tallest and the bulkiest silhouette among the orc creeps, visibly heavier than the grunt and visibly wider than the headhunter.

FRAMES, in this exact order, left to right in ONE horizontal row:
WALK 1 - contact pose, right leg forward and slammed down, long arms swinging back, body at its lowest under the impact.
WALK 2 - passing pose, weight over the supporting leg, opposite leg dragging through low, shoulders rolling toward the viewer's side, body rising.
WALK 3 - contact pose mirrored, left leg forward and slammed down, arms swinging forward, body dipping again.
WALK 4 - passing pose mirrored, body at its highest point of the plod, opposite arm swinging across, hunched back at its most pronounced.
The four frames must loop seamlessly: frame 4 flows straight back into frame 1.

LAYOUT: ONE horizontal row of 4 equally sized square cells on a fully transparent background, laid out left to right, labelled WALK 1, WALK 2, WALK 3, WALK 4 with the labels placed OUTSIDE the artwork cells (above or below the row). Use this one set of labels and no other. Each cell is rendered for a final size of 32x32 pixels, so keep the detail budget low enough to survive downscaling to that size.

STRICT RULES: side view only; the character faces RIGHT in every single frame; identical scale, identical camera angle and identical eye level in all four frames; feet on the same baseline in every frame; exactly one character per cell, centred; fully transparent background; no ground plane, no drop shadow, no cast shadow; no gradient or coloured background; no text, watermark, signature, logo or frame numbering inside the artwork cells; do not crop any part of the subject, including the hunched back and the hanging fists; no extra props or scenery.

SILHOUETTE at 28x28 px: a tall HUNCHED mass whose highest point is the curved back, not the head, with long arms dropping almost to the feet and bone-white plates breaking up the dark shape. At tiny size it must read as "big, bent forward, knuckle-low arms" and never be confused with the upright grunt.
```

**На что смотреть при приёмке:** Горб должен быть выше головы, а кулаки — доходить почти до земли: это единственные два признака, по которым тролль отличается от гранта на 28x28. Костяные пластины обязаны давать светлые пятна на тёмной шкуре, иначе крупный юнит превратится в бесформенную кляксу на тёмной земле. Заполнение кадра сверяйте по цифрам (82-85% высоты): «самый массивный» здесь означает «самый массивный среди орков», а не во всей игре.

### Headhunter — `unit.orc.headhunter`

| | |
| --- | --- |
| Файл | `orc_headhunter.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 4, элитный застрельщик: 330 hp, скорость 1.35, броня 2, средний размер, лёгкая броня, самый высокий урон у расы — читается как жилистый быстрый охотник с трофеями, опаснее, чем кажется по массе. |

```text
A 4-frame side-view WALK CYCLE sprite sheet of an elite troll headhunter.

STYLE: HD pixel art in the 16-bit era JRPG / Warcraft III style - crisp pixel clusters, one clean 1px dark outline around the whole silhouette (around the whole structure for buildings), a strictly limited palette of about 12-16 colours, soft dithered shading and a subtle cool rim light from the upper left. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute, NOT anime lineart. Dark fantasy mood, muted saturation, strong value contrast so the shape stays readable against dark brown dirt terrain.

CAMERA: strict side view at ground level, the subject faces RIGHT in every frame, identical scale, identical camera angle and identical eye level in all four frames, planted feet on one shared baseline.

SUBJECT: an elite troll headhunter of the orc horde, a GROUND WALKER (no wings, no flight). Tall, lean and wiry — long thin limbs, narrow chest, upright confident posture, blue-grey troll skin, long jaw with small tusks, sharp alert eyes. He wears a tall feathered headdress of dark and rust-orange feathers, dark leather straps and a rust-orange loincloth, bone-white bracers, and a belt hung with three small trophy skulls that swing as he moves. Red warpaint stripes across his face and chest. He carries TWO throwing spears: one held forward in his lead hand ready to hurl, one strapped diagonally across his back with the shaft crossing behind his shoulders. He must LOOK light and quick: springy, long-striding gait, high knee lift, little body mass but a lot of reach.

PALETTE (orc faction, use these and nothing else, plus the per-subject additions listed below): rust orange #d97b39, dark leather brown, blackened iron grey, worn steel grey, red warpaint, bone white, olive-green orc skin, near-black outline. Per-subject additions: blue-grey troll skin, dark feather brown.

SIZE: the headhunter fills 78-83% of the cell height including the headdress, but only about 35-40% of the cell width - nearly as tall as the troll and roughly half as wide, the narrowest silhouette of the orc creeps.

FRAMES, in this exact order, left to right in ONE horizontal row:
WALK 1 - contact pose, right leg reaching forward heel-first, left leg trailing far back, lead spear held level, trophy skulls swinging back.
WALK 2 - passing pose, weight over the supporting leg, opposite knee lifted high, body at its lowest, headdress feathers trailing.
WALK 3 - contact pose mirrored, left leg reaching forward, right leg trailing far back, lead spear tipped slightly up, trophy skulls swinging forward.
WALK 4 - passing pose mirrored, body at its highest point of the springy stride, opposite knee lifted high, feathers lifting.
The four frames must loop seamlessly: frame 4 flows straight back into frame 1.

LAYOUT: ONE horizontal row of 4 equally sized square cells on a fully transparent background, laid out left to right, labelled WALK 1, WALK 2, WALK 3, WALK 4 with the labels placed OUTSIDE the artwork cells (above or below the row). Use this one set of labels and no other. Each cell is rendered for a final size of 32x32 pixels, so keep the detail budget low enough to survive downscaling to that size.

STRICT RULES: side view only; the character faces RIGHT in every single frame; identical scale, identical camera angle and identical eye level in all four frames; feet on the same baseline in every frame; exactly one character per cell, centred; fully transparent background; no ground plane, no drop shadow, no cast shadow; no gradient or coloured background; no text, watermark, signature, logo or frame numbering inside the artwork cells; do not crop any part of the subject, including the headdress and both spear tips; no extra props or scenery.

SILHOUETTE at 28x28 px: a TALL THIN vertical figure crowned with a spiky feathered headdress, with two straight spear lines crossing the body — one horizontal in front, one diagonal behind the back. At tiny size it must read as "narrow, tall, spiky and bristling with spears", the exact opposite of the wide grunt and the hunched troll.
```

**На что смотреть при приёмке:** Силуэт обязан быть узким и высоким, с торчащим убором и двумя чёткими линиями копий — если убрать цвет, охотник не должен путаться ни с грантом, ни с троллем. Трофейные черепа и копья не должны выходить за пределы кадра ни в одной позе, иначе при нарезке 32x32 их срежет.

---

## Люди (Human) — крипы
Крипы людей читаются как регулярная армия: прямая осанка, строевой шаг, единая форма из стального синего сукна (#5e94d6) с золотым кантом и тёмно-красной тканью, начищенная сталь и серый камень в снаряжении. Чем выше тир, тем больше на юните пластин и заклёпок — от простого крестьянина в холщовой рубахе до бронированной осадной повозки, — поэтому игрок должен различать их по количеству металла в силуэте, а не по цвету. Общий тон приглушённый и грязноватый: это уставшее войско в походе, а не парадный расчёт, но кант и герб всегда остаются самой светлой точкой кадра. Все четыре юнита ходят по светлому серому камню человеческого террейна — том же грунте, что и под башнями людей, — поэтому контраст строится на тёмном контуре и глубоких тенях, а не на светлых пятнах.

### Militia — `unit.human.militia`

| | |
| --- | --- |
| Файл | `human_militia.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 1, hp 110, скорость 1.25, броня 1, размер small, без брони — самое дешёвое пушечное мясо людей, бежит бодро и умирает быстро; игрок должен с одного взгляда понять, что это ополченец, а не солдат |

```text
HD pixel art sprite sheet of a single fantasy creature: a HUMAN MILITIAMAN, a peasant pressed into service.

STYLE: 16-bit era JRPG / Warcraft III style pixel art. Crisp pixel clusters, one 1px dark outline around the whole
silhouette, a limited palette of about 12-16 colours, soft dithered shading and a subtle cool rim light from the upper
left. Dark fantasy mood, muted saturation, strong value contrast so the unit stays readable against pale grey stone
terrain. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (human faction): steel blue #5e94d6, polished steel, gold trim, grey stone, deep red cloth. On this poor unit
the metal is almost absent: mostly undyed homespun linen and dirty brown leather, one small deep red cloth band or
armband and a thin steel blue kerchief as the only faction colour, bare steel only on the tines of the farm tool.

SUBJECT: common folk pressed into service with pitchforks and hope. Peasant tunic belted with rope, straw hat or a
pulled-up cloth hood, worn boots or wrapped feet, a farm tool used as a weapon — a pitchfork or a scythe — gripped in
both hands and held at a nervous diagonal across the body. Posture is nervous and slightly hunched, shoulders drawn in,
head a little low, clearly a frightened civilian and not a trained soldier.

TYPE OF MOTION: this is a GROUND WALKER. Animate a walk cycle with real footfalls; both feet stay on the same ground
line, no floating, no flying.

SILHOUETTE READ AT 28x28 PX: a small, narrow, hunched figure with a round straw-hat blob on top and one long thin
diagonal line of the pitchfork shaft crossing the body — the smallest and spikiest silhouette of the human roster.

VIEW: strict SIDE view, character FACING RIGHT in every frame. The character fills about 70-80% of the frame height,
feet on a common baseline.

LAYOUT: one horizontal row of 4 equal square cells on a transparent background, each cell rendered as a 32x32 pixel-art
frame. Label the cells WALK 1, WALK 2, WALK 3, WALK 4 in the margin OUTSIDE the artwork cells, never inside a cell. One
single character per cell, centred, drawn at IDENTICAL scale, IDENTICAL camera angle and IDENTICAL eye level in all four
frames, with the feet planted on the same baseline in every frame.

FRAME CONTENT (left to right, a seamlessly looping 4-step walk):
WALK 1 — contact pose, right leg forward and heel down, left leg back, tool shaft tipped forward.
WALK 2 — passing pose, rear leg swinging under the body, torso at its highest point, tool shaft nearly upright.
WALK 3 — opposite contact pose, left leg forward and heel down, right leg back, mirrored leg positions only.
WALK 4 — opposite passing pose, mirroring WALK 2, so that WALK 4 leads straight back into WALK 1.
Keep the head, hat and weapon at the same height across frames apart from a 1px vertical bob; only the legs, the tool
angle and the cloth hem should change.

DO NOT: no text, numbers, watermarks or signatures inside the artwork cells; no drop shadow and no ground plane under
the character; no gradient or coloured background; no more than one character per cell; no change of camera angle, zoom
or eye level between frames; no cropping of any part of the subject.
```

**На что смотреть при приёмке:** ополченец должен читаться как гражданский — соломенная шляпа, холщовая рубаха, вилы, ноль пластин брони; если в кадре появился шлем или кираса, это уже не тир 1. Проверить, что WALK 4 склеивается с WALK 1 без рывка, что шляпа не «прыгает» по высоте между кадрами и что тёмный контур не теряется на светлом каменном грунте.

### Footman — `unit.human.footman`

| | |
| --- | --- |
| Файл | `human_footman.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 2, hp 200, скорость 1.15, броня 3 (лучшая броня среди Т2), размер medium, тяжёлая броня — щитоносец, который в одиночку гасит лёгкие башни; игрок должен сразу видеть металл и щит и понимать, что дешёвым уроном его не пробить |

```text
HD pixel art sprite sheet of a single fantasy creature: a HUMAN FOOTMAN, an armoured shield soldier.

STYLE: 16-bit era JRPG / Warcraft III style pixel art. Crisp pixel clusters, one 1px dark outline around the whole
silhouette, a limited palette of about 12-16 colours, soft dithered shading and a subtle cool rim light from the upper
left. Dark fantasy mood, muted saturation, strong value contrast so the unit stays readable against pale grey stone
terrain. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (human faction): steel blue #5e94d6, polished steel, gold trim, grey stone, deep red cloth. This unit is the
most metallic of the infantry: large areas of polished steel and grey mail, a steel blue tabard and shield face, gold
trim on the crest and helmet rim, a deep red cloth skirt or sash under the plate.

SUBJECT: a shielded soldier that blunts light towers on his own. Tall kite shield carried on the leading arm, its face
bearing a gold crest, covering him from shoulder to knee. Mail hauberk with plate pauldrons, breastplate, greaves and a
closed or open-faced steel helmet. A longsword held ready in the trailing hand, blade angled up and back. Posture is
upright and disciplined, a heavy measured march, chest square behind the shield.

TYPE OF MOTION: this is a GROUND WALKER. Animate a walk cycle with real footfalls; both feet stay on the same ground
line, no floating, no flying.

SILHOUETTE READ AT 28x28 PX: a broad, boxy, top-heavy block — the wide rectangle of the shield dominates the front of
the figure and the helmet crest squares off the head, making it the widest and most solid infantry silhouette of the
roster.

VIEW: strict SIDE view, character FACING RIGHT in every frame. The character fills about 75-85% of the frame height,
feet on a common baseline.

LAYOUT: one horizontal row of 4 equal square cells on a transparent background, each cell rendered as a 32x32 pixel-art
frame. Label the cells WALK 1, WALK 2, WALK 3, WALK 4 in the margin OUTSIDE the artwork cells, never inside a cell. One
single character per cell, centred, drawn at IDENTICAL scale, IDENTICAL camera angle and IDENTICAL eye level in all four
frames, with the feet planted on the same baseline in every frame.

FRAME CONTENT (left to right, a seamlessly looping 4-step march):
WALK 1 — contact pose, leading leg forward and planted, rear leg extended back, shield held flat to the front.
WALK 2 — passing pose, rear leg swinging under the body, torso at its highest point, shield edge tipped 1-2px forward.
WALK 3 — opposite contact pose, legs mirrored, shield settling back down.
WALK 4 — opposite passing pose, mirroring WALK 2, so that WALK 4 leads straight back into WALK 1.
The shield and helmet must stay at the same height and the same angle across frames apart from a 1px vertical bob; only
the legs, the sword hand and the cloth skirt should change. Heavy weight, no bouncing.

DO NOT: no text, numbers, watermarks or signatures inside the artwork cells; no drop shadow and no ground plane under
the character; no gradient or coloured background; no more than one character per cell; no change of camera angle, zoom
or eye level between frames; no cropping of any part of the subject or of the shield.
```

**На что смотреть при приёмке:** щит должен закрывать корпус и оставаться на одной высоте во всех четырёх кадрах — если он «плавает» или обрезается краем кадра, лист непригоден. Силуэт обязан быть заметно шире и плотнее, чем у ополченца, иначе тир 2 не читается. Начищенная сталь не должна сливаться со светлым каменным грунтом: тени и контур держат форму.

### Rifleman — `unit.human.rifleman`

| | |
| --- | --- |
| Файл | `human_rifleman.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 3, hp 215, скорость 1.30, броня 1, размер medium, без брони — самый быстрый крип людей и стеклянная пушка: много hp по меркам тира, но брони почти нет; игрок должен читать «лёгкий и шустрый стрелок», а не танк |

```text
HD pixel art sprite sheet of a single fantasy creature: a HUMAN RIFLEMAN, a long rifle sharpshooter.

STYLE: 16-bit era JRPG / Warcraft III style pixel art. Crisp pixel clusters, one 1px dark outline around the whole
silhouette, a limited palette of about 12-16 colours, soft dithered shading and a subtle cool rim light from the upper
left. Dark fantasy mood, muted saturation, strong value contrast so the unit stays readable against pale grey stone
terrain. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (human faction): steel blue #5e94d6, polished steel, gold trim, grey stone, deep red cloth. Here the steel blue
dominates as a long military coat, with gold trim on the cuffs and buttons, a deep red neckerchief, dark oiled leather
for the belts and boots, and polished steel only on the rifle barrel and lock.

SUBJECT: a sharpshooter with a dwarven long rifle and little protection. Wide brimmed hat pulled low over the eyes, long
blue coat flaring at the hem, leather bandolier and a curved powder horn on the hip, no plate and no shield anywhere. A
heavy long rifle with a wooden stock and a long steel barrel carried across the chest in both hands, muzzle angled
forward and slightly up. Posture is loose and alert, a quick light stride, weight forward.

TYPE OF MOTION: this is a GROUND WALKER. Animate a walk cycle with real footfalls; both feet stay on the same ground
line, no floating, no flying.

SILHOUETTE READ AT 28x28 PX: a slim upright figure crowned by a wide flat hat-brim disc, with one long horizontal bar of
the rifle crossing the chest — a T-shaped read that no other human unit has.

VIEW: strict SIDE view, character FACING RIGHT in every frame. The character fills about 75-85% of the frame height,
feet on a common baseline.

LAYOUT: one horizontal row of 4 equal square cells on a transparent background, each cell rendered as a 32x32 pixel-art
frame. Label the cells WALK 1, WALK 2, WALK 3, WALK 4 in the margin OUTSIDE the artwork cells, never inside a cell. One
single character per cell, centred, drawn at IDENTICAL scale, IDENTICAL camera angle and IDENTICAL eye level in all four
frames, with the feet planted on the same baseline in every frame.

FRAME CONTENT (left to right, a seamlessly looping 4-step walk):
WALK 1 — contact pose, leading leg forward and heel down, rear leg extended back, coat hem swept backwards.
WALK 2 — passing pose, rear leg swinging under the body, torso at its highest point, coat hem hanging straight.
WALK 3 — opposite contact pose, legs mirrored, coat hem swept backwards again.
WALK 4 — opposite passing pose, mirroring WALK 2, so that WALK 4 leads straight back into WALK 1.
The hat brim and the rifle must stay at the same height and angle across frames apart from a 1px vertical bob; only the
legs, the coat hem and the powder horn should move.

DO NOT: no text, numbers, watermarks or signatures inside the artwork cells; no drop shadow and no ground plane under
the character; no gradient or coloured background; no more than one character per cell; no change of camera angle, zoom
or eye level between frames; no cropping of any part of the subject or of the rifle barrel.
```

**На что смотреть при приёмке:** ствол ружья не должен выходить за пределы кадра — если он упирается в границу 32x32, попросить укоротить оружие, а не обрезать. Ни одной пластины брони и никакого щита: стрелок обязан выглядеть лёгким, иначе игрок спутает его с футманом. Синее сукно должно быть достаточно тёмным, чтобы силуэт не растворился на светлом камне.

### Siege Engine — `unit.human.siege_engine`

| | |
| --- | --- |
| Файл | `human_siege_engine.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Тир 4, hp 430, скорость 0.75 (почти самый медленный в игре), броня 5 (максимум в игре), размер large, тяжёлая броня — ползущий бронированный таран, который почти невозможно продавить уроном; игрок должен мгновенно понять: это тяжёлая техника, а не пехота |

```text
HD pixel art sprite sheet of a single fantasy war machine: a HUMAN SIEGE ENGINE, an armoured war wagon.

STYLE: 16-bit era JRPG / Warcraft III style pixel art. Crisp pixel clusters, one 1px dark outline around the whole
silhouette, a limited palette of about 12-16 colours, soft dithered shading and a subtle cool rim light from the upper
left. Dark fantasy mood, muted saturation, strong value contrast so the machine stays readable against pale grey stone
terrain. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (human faction): steel blue #5e94d6, polished steel, gold trim, grey stone, deep red cloth. Mostly grey riveted
steel plating and dark oiled iron, with a steel blue painted panel on the flank, a thin gold trim line along the top
edge and a small deep red pennant or cloth strip on the hull.

SUBJECT: a plated war machine that crawls forward and refuses to die. A low armoured wagon body of riveted iron plates
over a heavy timber frame, two large iron-shod spoked wheels, a reinforced sloped ram plate at the front, a small
bolted crew hatch with a narrow viewing slit on the upper hull. NO visible legs, NO visible draught animal, NO rider on
top — it moves by itself on its wheels.

TYPE OF MOTION: this is a GROUND VEHICLE, not a walker and not a flyer. There are no footfalls: the animation is the
ROTATION OF THE WHEELS. Give both wheels the same, evenly spaced spokes and rotate them by exactly ONE QUARTER of the
angle between two adjacent spokes in each successive frame, so that the four frames together cover exactly one
spoke-to-spoke step and frame 4 rolls seamlessly back into frame 1. Example: with 8 spokes the gap between neighbours is
45 degrees, so each frame advances the wheel by 11.25 degrees. On top of that add a 1px vertical rattle of the hull. The
hull must not tilt, turn, stretch or change shape between frames, and the bottom of both wheels stays on the same
baseline in every frame.

SILHOUETTE READ AT 28x28 PX: a low, wide, heavy rectangle sitting on two big circles — a squat brick on wheels, clearly
the bulkiest and least human-shaped silhouette in the roster, with no head and no arms.

VIEW: strict SIDE view, machine FACING RIGHT in every frame, ram plate leading. The machine fills about 85% of the frame
width and about 70-75% of the frame height, with the bottom of the wheels resting on a common baseline.

LAYOUT: one horizontal row of 4 equal square cells on a transparent background, each cell rendered as a 32x32 pixel-art
frame. Label the cells WALK 1, WALK 2, WALK 3, WALK 4 in the margin OUTSIDE the artwork cells, never inside a cell. One
single machine per cell, centred, drawn at IDENTICAL scale, IDENTICAL camera angle and IDENTICAL eye level in all four
frames, with the wheels touching the same baseline in every frame.

FRAME CONTENT (left to right, a seamlessly looping 4-step roll):
WALK 1 — base pose, wheel spokes at their starting angle, hull at rest height.
WALK 2 — wheel spokes advanced by one step (a quarter of the spoke-to-spoke angle), the hull shifted up 1px by the
rattle.
WALK 3 — wheel spokes advanced by two steps, hull back at rest height.
WALK 4 — wheel spokes advanced by three steps, hull shifted up 1px again, so that WALK 4 rolls straight back into
WALK 1.
The hull artwork is pixel-identical in all four frames and may only be shifted as a whole by 1px vertically in WALK 2
and WALK 4; no internal detail of the plating, rivets, hatch or ram plate may change, and nothing may be redrawn,
reshaded or re-outlined between frames. Apart from that whole-hull 1px shift, the rotating spokes and the small pennant,
nothing moves.

DO NOT: no text, numbers, watermarks or signatures inside the artwork cells; no drop shadow and no ground plane under
the machine; no gradient or coloured background; no more than one machine per cell; no horses, oxen or crew figures; no
change of camera angle, zoom or eye level between frames; no cropping of any part of the machine or its wheels.
```

**На что смотреть при приёмке:** рисунок корпуса обязан быть пиксель-в-пиксель одинаковым во всех кадрах; единственное допустимое движение корпуса — сдвиг всего блока на 1 px вверх в кадрах WALK 2 и WALK 4 (дребезг), колёса при этом остаются на одной линии. Если между кадрами поменялись заклёпки, тени или кромка брони — лист брак. Вся остальная анимация только в спицах: наложить кадры друг на друга и убедиться, что шаг поворота одинаковый и что четыре кадра дают ровно один межспицевый интервал, иначе цикл будет дёргаться. Силуэт должен быть заметно шире и ниже остальных людей и не иметь ни головы, ни рук, иначе large-юнит не прочитается.

---

## Эльфы (Elf) — крипы
Эльфийские крипы должны читаться как самая «лёгкая» и быстрая раса в игре: тонкие вытянутые силуэты, минимум брони, много органики — дерево, листья, шерсть, перья — и почти никакого железа, кроме тонких серебряных кромок. Общая палитра одна на всех: лунно-зелёный #6bbf89 в тканях и коже, серебро на оружии и доспешных кромках, светлая берёзовая древесина, бирюзовое свечение (глаза, мотыльки-искры, руны) и глубокая лесная тень как самый тёмный тон.

Игрок должен за долю секунды отличать эльфов от орков и нежити по трём признакам: холодное бирюзовое свечение в тёмной части силуэта, зелёно-серебряная гамма и «узкая» пропорция — ни одного массивного квадратного корпуса. Единственное исключение — химера: она сознательно ломает ряд, будучи широкой, крылатой и тяжёлой, и именно поэтому её видно в толпе.

**Общая лестница масштаба (одна на все четыре расы).** Все крипы рисуются в кадре 32x32 и выводятся на поле в 28x28, поэтому единственное, что кодирует класс размера, — это процент заполнения кадра. Наземные юниты: small — 70-78% высоты кадра, medium — 78-85%, large — 85-92%. Летуны считаются по корпусу без крыльев, а масса у них читается шириной: размах крыльев small/medium — 80-90% ширины кадра, large — 90-100%. Проценты продублированы внутри каждого промпта, чтобы каждый блок оставался самодостаточным; менять их «на глаз» нельзя, иначе large-химера окажется на поле мельче medium-горгульи.

### Archer — `unit.elf.archer`

| | |
| --- | --- |
| Файл | `elf_archer.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Т1, лёгкий застрельщик: hp 85 (один из двух самых хрупких крипов в игре, после гуля с 80 hp), скорость 1.70, броня 0, размер small, без брони — с одного взгляда должен читаться как «умрёт от первого попадания, но добежит быстро». |

```text
Pixel-art sprite sheet: a 4-frame side-view WALK CYCLE for a game character, laid out as ONE horizontal row of 4 equal square cells on a fully transparent background.

SUBJECT - Elven Archer. GROUND WALKER, faces RIGHT.
A swift elven sentinel that strikes from the shadows of the forest. Slim, wiry, feather-light build: a slender figure in a deep-green hooded cloak thrown over thin leather armour, a long pale birch-wood longbow carried in the leading hand, a small quiver of arrows on the back, soft wrapped boots, quick short nervous strides, the hem of the cloak trailing back. Pointed elven ear visible under the hood, faint teal glint in the eye. Reads as fragile and fast: no shield, no plate, no bulky pouches, nothing heavy anywhere in the silhouette.

STYLE (follow exactly):
HD pixel art, 16-bit-era JRPG / Warcraft III custom-map look. Crisp pixel clusters, a clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading, subtle cool rim light. Dark fantasy, muted saturation, strong value contrast so the character stays readable on a dark desaturated forest floor. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (elf faction, use only these): moonlit green #6bbf89, silver, pale birch wood, teal glow accents, deep forest shadow as the darkest value.

FRAMES (left to right, seamless loop):
WALK 1 - contact pose, left leg forward, weight landing on the heel.
WALK 2 - passing pose, rear leg swinging under the body, body at its highest point.
WALK 3 - contact pose, right leg forward, the mirrored stride of WALK 1.
WALK 4 - passing pose, mirrored version of WALK 2, must lead cleanly back into WALK 1.
The quiver and the hood keep the same position and shape in all four frames; the bow stays gripped in the leading hand and may travel with that hand, but never changes its angle by more than a few degrees and never detaches from the grip; only legs, arms and the cloak hem animate.

LAYOUT AND TECHNICAL:
- Exactly 4 cells, equal size, in one row. Each cell is one frame that will later be downscaled to 32x32 pixels, so keep the detail budget that low and the shapes that chunky.
- Strict side view, character facing RIGHT in every frame. Identical camera angle, identical scale and identical eye level in all four frames, feet on one shared baseline.
- SIZE CLASS: this unit is SMALL. A shared scale ladder is used across the whole roster - small fills 70-78% of the cell height, medium 78-85%, large 85-92% - so draw this character filling about 70-78% of the cell height, measured from the shared baseline to the top of the hood. Do not exceed 78%.
- Subject centred in its cell, with a 1-2 px margin on every side; nothing cropped.
- Background fully transparent inside every cell.
- Put the labels WALK 1, WALK 2, WALK 3, WALK 4 in the margin OUTSIDE the artwork cells only; labels must never touch or overlap the art.

SILHOUETTE TEST: at 28x28 px this must read as a narrow upright figure with a pointed hood and a curved bow arc behind the back - a thin vertical shape, visibly slimmer and lighter than the mounted, four-legged and winged units around it.

DO NOT INCLUDE: text, numbers, watermarks or signatures inside the artwork cells; drop shadows or ground shadows; a coloured or gradient background; grass, ground plane or terrain under the feet; more than one character per cell; any change of camera angle, scale or eye level between frames; motion blur; any cropped body part.
```

**На что смотреть при приёмке:** силуэт остаётся узким и вертикальным, дуга лука читается даже в 28x28, и по кадрам не «плавает» ни рост, ни уровень глаз. Лук должен оставаться в руке — если он «висит» в воздухе отдельно от кисти или заметно проворачивается по кадрам, это брак. Если фигура выглядит коренастой или бронированной — тоже брак, это один из двух самых хрупких юнитов в игре.

### Huntress — `unit.elf.huntress`

| | |
| --- | --- |
| Файл | `elf_huntress.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Т2, скоростной наездник: hp 140, скорость 1.85 (быстрейший наземный юнит эльфов, наравне с волчьим всадником; быстрее только гуль с 1.95), броня 1, размер medium, лёгкая броня — четвероногий стелющийся силуэт, который сразу читается как «догонит и проскочит». |

```text
Pixel-art sprite sheet: a 4-frame side-view RUN CYCLE for a game character, laid out as ONE horizontal row of 4 equal square cells on a fully transparent background.

SUBJECT - Elven Huntress, a glaive rider mounted on a great white panther. GROUND WALKER (four-legged mount), faces RIGHT.
A low, stretched, predatory silhouette: a big white forest panther in a long prowling run, muscles and shoulder blades readable, long tail streaming behind, faint teal glow in its eyes; on its back sits a slim elven huntress in light silver-trimmed armour over moonlit green cloth, leaning forward with the reins, holding a crescent moon glaive - a silver double-crescent blade on a pale birch shaft - raised beside her shoulder. She is small relative to the mount; the mount carries the silhouette. Reads as the fastest thing on the field: light, low, stretched forward, nothing heavy or armoured on the panther itself.

STYLE (follow exactly):
HD pixel art, 16-bit-era JRPG / Warcraft III custom-map look. Crisp pixel clusters, a clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading, subtle cool rim light. Dark fantasy, muted saturation, strong value contrast so the subject stays readable on a dark desaturated forest floor. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (elf faction, use only these): moonlit green #6bbf89, silver, pale birch wood, teal glow accents, deep forest shadow as the darkest value. The panther's fur is cold off-white shaded with deep forest shadow, never pure white.

FRAMES (left to right, seamless loop, four-legged gait):
WALK 1 - contact pose, front-left and hind-right paws planted, body extended forward.
WALK 2 - passing pose, legs gathered under the body, back slightly arched, body at its highest point.
WALK 3 - contact pose, the mirrored diagonal pair planted, body extended forward again.
WALK 4 - passing pose, mirrored version of WALK 2, must lead cleanly back into WALK 1.
The rider keeps the same pose and the same place on the panther's back in all four frames; only the panther's legs, the tail and the rider's cloak may animate, and the rider may bob at most 1 px.

LAYOUT AND TECHNICAL:
- Exactly 4 cells, equal size, in one row. Each cell is one frame that will later be downscaled to 32x32 pixels, so keep the detail budget that low and the shapes that chunky.
- Strict side view, subject facing RIGHT in every frame. Identical camera angle, identical scale and identical eye level in all four frames, all four paws on one shared baseline.
- SIZE CLASS: this unit is MEDIUM. A shared scale ladder is used across the whole roster - small fills 70-78% of the cell height, medium 78-85%, large 85-92% - so the whole subject must fill about 78-85% of the cell height, measured from the shared baseline to the top of the rider's head; the raised glaive may rise a little above that, but must still stay inside the cell.
- Subject centred in its cell; because this creature is wide, its nose-to-tail length spans nearly the full cell width. Fit the whole panther plus tail and glaive inside the cell with a 1-2 px margin on every side - shrink it rather than crop it. Nothing cropped, tail and glaive tip included.
- Background fully transparent inside every cell.
- Put the labels WALK 1, WALK 2, WALK 3, WALK 4 in the margin OUTSIDE the artwork cells only; labels must never touch or overlap the art.

SILHOUETTE TEST: at 28x28 px this must read as a long low four-legged animal with a rider hump on its back and a small silver crescent above that hump - a horizontal shape, unmistakably different from every upright two-legged unit.

DO NOT INCLUDE: text, numbers, watermarks or signatures inside the artwork cells; drop shadows or ground shadows; a coloured or gradient background; grass, ground plane or terrain under the paws; more than one creature per cell; any change of camera angle, scale or eye level between frames; motion blur; any cropped body part, tail or blade.
```

**На что смотреть при приёмке:** читается именно горизонтальный четвероногий силуэт с «горбом» всадника, а не человек верхом на непонятном пятне; хвост и клинок глефы полностью влезли в кадр и не обрезаны. Наездница не должна дёргаться между кадрами. По высоте охотница обязана быть заметно выше лучницы и дриады, но ниже тролля и других large — иначе классы размера перестанут читаться.

### Dryad — `unit.elf.dryad`

| | |
| --- | --- |
| Файл | `elf_dryad.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Т3, полудух-проныра: hp 195, скорость 1.60, броня 0, размер small, без брони — олений низ и светящиеся искры должны читаться как «мягкая, но неудобная цель», а не как танк. |

```text
Pixel-art sprite sheet: a 4-frame side-view WALK CYCLE for a game character, laid out as ONE horizontal row of 4 equal square cells on a fully transparent background.

SUBJECT - Elven Dryad, a half-spirit forest creature. GROUND WALKER (four-legged lower body), faces RIGHT.
Centaur-like build but light and delicate: the upper body of a slender forest maiden - bare shoulders wrapped in moonlit green leaves and vine, long hair bound back, calm glowing teal eyes, a slim pale birch staff or a bundle of branches held low - joined to the lower body of a slim deer with thin legs and small hooves. Small leaves and glowing teal motes drift off her back and hindquarters and trail behind her. Semi-transparent spirit quality only at the very tips of the trailing motes; the body itself is solid and clearly outlined. Reads as unarmoured and quick: no plate, no shield, no bulk anywhere.

STYLE (follow exactly):
HD pixel art, 16-bit-era JRPG / Warcraft III custom-map look. Crisp pixel clusters, a clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading, subtle cool rim light. Dark fantasy, muted saturation, strong value contrast so the subject stays readable on a dark desaturated forest floor. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (elf faction, use only these): moonlit green #6bbf89, silver, pale birch wood, teal glow accents, deep forest shadow as the darkest value.

FRAMES (left to right, seamless loop, four-legged gait):
WALK 1 - contact pose, front-left and hind-right hooves planted, torso upright.
WALK 2 - passing pose, legs gathered under the deer body, body at its highest point.
WALK 3 - contact pose, the mirrored diagonal pair of hooves planted.
WALK 4 - passing pose, mirrored version of WALK 2, must lead cleanly back into WALK 1.
The upper body, hair and staff keep the same pose and place in all four frames; only the deer legs, the hair tips and the trailing motes animate. Vary the motes slightly from frame to frame so the trail shimmers, but keep their overall amount constant.

LAYOUT AND TECHNICAL:
- Exactly 4 cells, equal size, in one row. Each cell is one frame that will later be downscaled to 32x32 pixels, so keep the detail budget that low and the shapes that chunky.
- Strict side view, subject facing RIGHT in every frame. Identical camera angle, identical scale and identical eye level in all four frames, all four hooves on one shared baseline.
- SIZE CLASS: this unit is SMALL. A shared scale ladder is used across the whole roster - small fills 70-78% of the cell height, medium 78-85%, large 85-92% - so draw the whole creature filling about 70-78% of the cell height, measured from the shared baseline to the top of the head. Being centaur-shaped does not make it bigger: keep it inside the small band, and get the delicacy from thin limbs and a narrow torso instead of extra height.
- Subject centred in its cell, with a 1-2 px margin on every side; nothing cropped, trailing motes included.
- Background fully transparent inside every cell.
- Put the labels WALK 1, WALK 2, WALK 3, WALK 4 in the margin OUTSIDE the artwork cells only; labels must never touch or overlap the art.

SILHOUETTE TEST: at 28x28 px this must read as a small centaur shape - an upright slim torso rising out of a four-legged deer body - with a short glowing teal trail behind it; slightly shorter than the panther rider's silhouette and far narrower than it.

DO NOT INCLUDE: text, numbers, watermarks or signatures inside the artwork cells; drop shadows or ground shadows; a coloured or gradient background; grass, ground plane or terrain under the hooves; more than one creature per cell; any change of camera angle, scale or eye level between frames; motion blur; any cropped body part.
```

**На что смотреть при приёмке:** сразу видно стык «женский торс + оленье тело», а не размытое зелёное пятно; свечение и искры не съедают контур и не превращают силуэт в кляксу при уменьшении. По высоте дриада должна остаться в одной группе с лучницей (small) и быть ниже охотницы — если художник «дотянул» её до роста наездницы, лист возвращается на переделку.

### Chimera — `unit.elf.chimera`

| | |
| --- | --- |
| Файл | `elf_chimera.png` |
| Лист | 128x32 (4 кадра 32x32) |
| Статус | нужен арт |
| Роль в игре | Т4, тяжёлый летун: hp 330, скорость 1.30 (тяжёлый отстающий, плетётся в хвосте волны), броня 1, размер large, тяжёлая броня, ЛЕТАЕТ — широкий крылатый силуэт должен читаться как «жирная медленная цель для ПВО». |

```text
Pixel-art sprite sheet: a 4-frame side-view FLIGHT CYCLE (wing-beat loop) for a game creature, laid out as ONE horizontal row of 4 equal square cells on a fully transparent background.

SUBJECT - Elven Chimera. FLYER, not a ground walker, faces RIGHT.
A heavy twin-headed winged beast, too bulky to keep pace with its own kin. Thick scaled reptilian body in moonlit green shading to deep forest shadow, two long necks ending in two reptilian heads - one snarling forward, the other lower with a thin string of teal-green acid dripping from its open maw - broad leathery bat-like wings with pale birch-toned bone struts and silver-edged membranes, tucked heavy hind legs with clawed feet, thick tail hanging behind. Plates of hardened scale read as heavy armour along the back and chest. Reads slow and massive: powerful, laboured, deliberate flight, the opposite of the slim quick elves around it.

STYLE (follow exactly):
HD pixel art, 16-bit-era JRPG / Warcraft III custom-map look. Crisp pixel clusters, a clean 1px dark outline around the whole silhouette, a strictly limited palette, soft dithered shading, subtle cool rim light. Dark fantasy, muted saturation, strong value contrast so the subject stays readable on a dark desaturated forest floor. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (elf faction, use only these): moonlit green #6bbf89, silver, pale birch wood, teal glow accents (eyes and dripping acid), deep forest shadow as the darkest value.

FRAMES (left to right, seamless loop, wing beat instead of footfalls):
FLY 1 - wings at the full up-stroke, raised high above the back, membranes stretched.
FLY 2 - wings mid-stroke, sweeping downward, membranes catching air.
FLY 3 - wings at the full down-stroke, spread low beneath the body, tips near the bottom of the cell.
FLY 4 - wings mid-stroke, rising back up; must lead cleanly back into FLY 1.
This creature never touches the ground: keep the body at a CONSTANT hover height in all four frames, the body centre pinned to the same line, with at most 1 px of vertical bob. Heads, tail and the acid drip may sway slightly; the two heads always stay in the same relative arrangement.

LAYOUT AND TECHNICAL:
- Exactly 4 cells, equal size, in one row. Each cell is one frame that will later be downscaled to 32x32 pixels, so keep the detail budget that low and the shapes that chunky.
- Strict side view, creature facing RIGHT in every frame. Identical camera angle, identical scale and identical eye level in all four frames; same hover height in all four frames.
- SIZE CLASS: this unit is LARGE and it is a FLYER. A shared scale ladder is used across the whole roster; for flyers the height is measured on the BODY WITHOUT WINGS and the mass is carried by WIDTH instead. So the body (necks, torso, tail, no wings) fills about 60-70% of the cell height, while the WINGSPAN at full spread fills 95-100% of the cell width - a large flyer must read as the widest thing on screen. Smaller flyers use only 80-90% of the cell width, so do not fall into that band.
- Subject centred in its cell. The wingtips at full spread may come within 1 px of the left and right cell edges but must never touch or cross them; the tail must fit fully inside the cell as well. Shrink the creature rather than crop it. The remaining vertical room is there so the wings have somewhere to travel between the up-stroke and the down-stroke.
- Background fully transparent inside every cell.
- Put the labels FLY 1, FLY 2, FLY 3, FLY 4 in the margin OUTSIDE the artwork cells only; labels must never touch or overlap the art.

SILHOUETTE TEST: at 28x28 px this must read as a wide winged beast with TWO distinct heads on two necks - the widest, heaviest shape in the elven roster, instantly separable from the thin walkers.

DO NOT INCLUDE: text, numbers, watermarks or signatures inside the artwork cells; drop shadows or ground shadows; a coloured or gradient background; clouds, ground plane or terrain of any kind; more than one creature per cell; any change of camera angle, scale, eye level or hover height between frames; motion blur; any cropped wing, head or tail.
```

**На что смотреть при приёмке:** обе головы различимы при уменьшении, крылья на полном размахе занимают почти всю ширину кадра, но не срезаны краем, и корпус висит на одной высоте во всех четырёх кадрах (иначе в игре тварь будет прыгать). Силуэт обязан быть заметно тяжелее и ШИРЕ всех остальных эльфов: если размах уложился в 80-90% ширины, химера на поле будет выглядеть мельче medium-летунов вроде горгульи — это брак.

---

## Башни нежити (Undead)
Башни нежити — это не «постройки», а святилища из костей и потемневшей бронзы, поставленные на кольцо щебня: основание расширяется книзу и сидит в самом низу кадра, конструкция собрана из костяной слоновой кости и tarnished bronze, ткани и руны дают некротический пурпур #7a4fd6, а свечение всегда идёт из одной-единственной яркой точки — красного кристалла, зелёного варева или ледяного #5c8cff. Грунт под башнями — тёмная серо-костяная текстура, поэтому спрайт должен быть светлым читаемым пятном на тёмном, как и крипы нежити. Эталон — уже отрисованный Bone Archer Tower: рогатая арка, череп в центре, пурпурные полотнища, красный шип наверху, кольцо камней под подошвой; все остальные башни должны выглядеть как работы того же скульптора-некроманта. Различать их игрок обязан по силуэту на 42x42 px: рогатая арка (Bone Archer), котёл в треноге из рёбер (Plague), низкое гнездо с драконьим черепом (Frost Wyrm), тонкий вертикальный столб с пурпурным кольцом (Obelisk).

Про файлы: листы кладём в `public/assets/towers/`, и тем же коммитом добавляем ключи в `TOWER_SPRITE_KEYS` / `TOWER_SPRITE_ASSETS` (`src/shared/constants/sprites.ts`) — сейчас там зарегистрированы только `tower.undead.bone_archer` и `tower.elf.moon_archer`, всё остальное игра просто не загрузит. Старый референс `src/shared/sprite/undead.bone_archer.png` (имя через точку) загрузчик не видит — новый арт туда класть нельзя.

### Bone Archer Tower — `tower.undead.bone_archer`

| | |
| --- | --- |
| Файл | `undead_bone_archer.svg` — именно этот путь грузит игра (`TOWER_SPRITE_ASSETS` → `/assets/towers/undead_bone_archer.svg`); если перерисовка приходит в PNG, тем же коммитом меняем путь в `src/shared/constants/sprites.ts` на `/assets/towers/undead_bone_archer.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | есть арт (эталон стиля), можно перерисовать |
| Роль в игре | archetype single, 50 золота, одиночная цель — базовая дешёвая стрелковая башня, бьёт в одну цель; с ходу читается как «костяное святилище-лучник» |

```text
Pixel-art sprite sheet for a mobile tower defense game. One single labelled reference sheet, nothing else.

STYLE (identical in every cell): HD pixel art in the 16-bit era JRPG / Warcraft-style dark fantasy tradition — crisp pixel clusters, a 1px dark outline around every solid form, a limited palette per subject, soft dithered shading, subtle rim light. Muted saturation, strong value contrast so the shape stays readable on a dark grey bone-coloured ground. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (undead faction, stay inside this family): bone ivory, necrotic purple #7a4fd6, cold blue-violet #5c8cff, blood-red crystal, tarnished bronze. #7a4fd6 is the only purple anywhere on the sheet and #5c8cff is the only blue — never split either into extra shades. Red is the only glow colour on this tower.

CAMERA (identical in every cell): three-quarter top-down view, camera slightly above and in front of the building. The structure is centred in its cell, drawn at exactly the same scale and exactly the same camera angle in every populated cell, and the foundation sits at the BOTTOM edge of its cell. The tower fires toward the RIGHT.

SUBJECT: a necromantic archer nest built from cursed remains — a shrine of bone and tarnished bronze with a flared skirt-like body, two large curved bronze-and-bone horns rising from the shoulders, a horned skull set in the middle of the arch, necrotic purple #7a4fd6 banners with glowing red rune slits hanging down the front, a blood-red crystal spike glowing between the horns, all standing on a round ring of grey rubble stones. PROPORTIONS: the flared base is about 4/5 of the cell wide, the whole structure is about 3/4 of the cell tall, and the horns take the upper third — a wide-bottomed, top-heavy triangle.

LAYOUT: one labelled grid, 5 columns x 3 rows = 15 equal square cells, one 60x60 pixel-art frame per cell, fully transparent background. Print every slot label OUTSIDE its cell as a small caption above the cell — never inside the artwork. Fill the cells left-to-right, top-to-bottom in exactly this order:

ROW 1
SLOT 0 — BUILD 1: foundation only. A round ring of grey rubble stones with bronze-edged flagstones and a dark necrotic purple #7a4fd6 pit in the middle. No structure above it.
SLOT 1 — BUILD 2: half-built. The lower flared bone-and-bronze body raised on the same foundation, the two curved horns only partially erected, banners unfurled but dull, no crystal yet.
SLOT 2 — BUILD 3: finished structure. The complete shrine: flared bone-ivory and tarnished bronze body, necrotic purple #7a4fd6 banners with red rune slits, horned skull in the centre of the arch, both curved horns up, blood-red crystal spike lit between them.
SLOT 3 — IDLE 1: the finished tower at rest, red crystal glow at its dimmest, banners hanging straight.
SLOT 4 — IDLE 2: same finished tower, breathing loop — red crystal glow brighter with a faint red halo, banners swayed 1 px to the side, two or three small red motes drifting up. Everything else pixel-identical to SLOT 3.

ROW 2
SLOT 5 — ATTACK 1 (wind-up): red light gathers between the horns, the crystal charges bright, thin red energy threads crawl up the bone frame.
SLOT 6 — ATTACK 2 (release): the crystal flares white-hot red, a red necrotic bolt is leaving the tower toward the RIGHT edge of the cell, banners blown back, sharp red flash between the horns.
SLOT 7 — ATTACK 3 (recoil / return): the crystal dimming back down, thin curls of dark red smoke coming off the horns, banners settling.
SLOT 8 — EMPTY. Leave this cell fully transparent, draw nothing in it.
SLOT 9 — HIT REACTION: the same finished tower from SLOT 2, flashed and tinted red-hot as if struck — the whole silhouette pushed to glowing crimson with white-hot highlights, shape and pose unchanged.

ROW 3
SLOT 10 — SELL 1: the structure collapsing — one horn snapped off, the body cracking and leaning, the red crystal falling free and dimming, dust and bone chips flying.
SLOT 11 — SELL 2: only a low pile of rubble left — broken bronze plates, bone shards, torn necrotic purple #7a4fd6 cloth, a few dying red sparks. Same footprint, at the bottom of the cell.
SLOT 12 — PROJECTILE: no tower in this cell. A single small object centred in the cell, roughly 20x20 px of content: a blood-red necrotic bolt travelling to the RIGHT, a bright red core with a smoke trail behind it in a darker shade of the same purple (#3a1f5c).
SLOT 13 — ATTACK IMPACT EFFECT: no tower in this cell. A centred radial burst, roughly 20x20 px of content: a red rune circle bursting outward with jagged red spokes and a white-hot centre — the effect that appears on the target when the bolt lands.
SLOT 14 — EMPTY. Leave this cell fully transparent, draw nothing in it.

FORBIDDEN: no text, numbers, letters or watermarks inside the artwork cells; no drop shadows on the background; no ground plane, grass or terrain under the foundation beyond the tower's own ring of rubble; no background gradient, background must be transparent; one single structure per cell; never change the camera angle, the scale or the position of the base between cells; never crop any part of the subject.

SILHOUETTE CHECK: the sheet is downscaled and drawn in-game at about 42x42 px. Keep the detail budget low enough to survive that — at 42x42 the tower must read instantly as a wide flared skirt narrowing into two curved horns with one bright red spike between them, wider at the base than at the top.
```

**На что смотреть при приёмке:** силуэт с двумя рогами и красным шипом узнаётся на 42x42, основание-кольцо камней стоит ровно у нижнего края каждой ячейки; кадры 3-4 и 5-7 отличаются только светом, полотнищами и мотами — сама постройка не «плавает» и не меняет масштаб. Перед мержем сверить расширение файла с `TOWER_SPRITE_ASSETS`: сейчас грузится `.svg`, PNG-лист без правки константы игра не подхватит.

### Plague Tower — `tower.undead.plague`

| | |
| --- | --- |
| Файл | `undead_plague.png` (кладём в `public/assets/towers/`, ключ добавляем в `TOWER_SPRITE_ASSETS`) |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | archetype splash, 75 золота, урон по площади 1.5 клетки — дорогая тяжёлая башня против толпы; должна выглядеть «жидкой» и медленной, а не стрелковой |

```text
Pixel-art sprite sheet for a mobile tower defense game. One single labelled reference sheet, nothing else.

STYLE (identical in every cell): HD pixel art in the 16-bit era JRPG / Warcraft-style dark fantasy tradition — crisp pixel clusters, a 1px dark outline around every solid form, a limited palette per subject, soft dithered shading, subtle rim light. Muted saturation, strong value contrast so the shape stays readable on a dark grey bone-coloured ground. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (undead faction, stay inside this family): bone ivory, necrotic purple #7a4fd6, cold blue-violet #5c8cff, blood-red crystal, tarnished bronze. #7a4fd6 is the only purple anywhere on the sheet and #5c8cff is the only blue — never split either into extra shades. The ONLY green anywhere on the sheet is the plague brew itself — toxic sickly green; the structure around it stays bone, purple and bronze.

CAMERA (identical in every cell): three-quarter top-down view, camera slightly above and in front of the building. The structure is centred in its cell, drawn at exactly the same scale and exactly the same camera angle in every populated cell, and the foundation sits at the BOTTOM edge of its cell. The tower throws toward the RIGHT.

SUBJECT: a cauldron shrine of boiling green plague — a fat tarnished bronze cauldron slung on bronze chains inside a tripod of three curved rib-bone arms, filled to the brim with bubbling toxic green brew, greasy green vapour rising from it, thick sludge dripping off the bone arms, a small skull motif embossed on the cauldron belly and a torn necrotic purple #7a4fd6 banner pinned to one rib arm, the whole thing standing on a round ring of grey rubble stones. PROPORTIONS: the whole structure is roughly as wide as it is tall, about 4/5 of the cell in both directions; the cauldron alone is wider than it is tall and fills the middle third of the cell. It must look heavy and squat, never slender, never vase-shaped.

LAYOUT: one labelled grid, 5 columns x 3 rows = 15 equal square cells, one 60x60 pixel-art frame per cell, fully transparent background. Print every slot label OUTSIDE its cell as a small caption above the cell — never inside the artwork. Fill the cells left-to-right, top-to-bottom in exactly this order:

ROW 1
SLOT 0 — BUILD 1: foundation only. A round ring of grey rubble stones with bronze-edged flagstones and a cold empty fire pit of grey ash in the middle. No structure above it.
SLOT 1 — BUILD 2: half-built. The three curved rib-bone arms erected around the pit and lashed with bronze bands, empty chains hanging from their tips, no cauldron yet, no brew, no vapour.
SLOT 2 — BUILD 3: finished structure. The bronze cauldron hung on its chains inside the bone tripod, full of bubbling toxic green brew, skull motif on the belly, necrotic purple #7a4fd6 banner on one arm, a first wisp of green vapour.
SLOT 3 — IDLE 1: the finished tower at rest, brew calm with two small bubbles, thin vapour, banner hanging straight.
SLOT 4 — IDLE 2: same finished tower, breathing loop — bigger bubbles bursting on the surface, the green glow inside the cauldron brighter, one drip falling from a rib arm, banner swayed 1 px. Everything else pixel-identical to SLOT 3.

ROW 2
SLOT 5 — ATTACK 1 (wind-up): the brew swells and glows much brighter green, the cauldron tips slightly back on its chains, a column of green vapour shoots up.
SLOT 6 — ATTACK 2 (release): the cauldron tipped hard to the RIGHT, a fat glob of green ooze already detached from the rim and flying toward the RIGHT edge of the cell, splash droplets flying, bright green flash on the rim.
SLOT 7 — ATTACK 3 (recoil / return): the cauldron rocking back level on its swinging chains, ooze running down its outer side, vapour thinning, brew level lower.
SLOT 8 — EMPTY. Leave this cell fully transparent, draw nothing in it.
SLOT 9 — HIT REACTION: the same finished tower from SLOT 2, flashed and tinted red-hot as if struck — the whole silhouette pushed to glowing crimson with white-hot highlights, shape and pose unchanged.

ROW 3
SLOT 10 — SELL 1: the structure collapsing — one rib arm snapping, the chains tearing loose, the cauldron tipping over and spilling green brew, bone chips and droplets flying.
SLOT 11 — SELL 2: only a low pile of rubble left — the dented cauldron half-buried on its side, broken rib bones, a steaming green puddle soaking into the stones. Same footprint, at the bottom of the cell.
SLOT 12 — PROJECTILE: no tower in this cell. A single small object centred in the cell, roughly 20x20 px of content: a lobbed glob of toxic green ooze, teardrop-shaped, heavy end pointing to the RIGHT, with two or three trailing droplets behind it.
SLOT 13 — ATTACK IMPACT EFFECT: no tower in this cell. A centred radial burst, roughly 20x20 px of content: a wide green splash cloud — a flat ring of flung ooze droplets with a pale green vapour puff in the middle, the effect that appears on the target when the glob lands.
SLOT 14 — EMPTY. Leave this cell fully transparent, draw nothing in it.

FORBIDDEN: no text, numbers, letters or watermarks inside the artwork cells; no drop shadows on the background; no ground plane, grass or terrain under the foundation beyond the tower's own ring of rubble; no background gradient, background must be transparent; one single structure per cell; never change the camera angle, the scale or the position of the base between cells; never crop any part of the subject.

SILHOUETTE CHECK: the sheet is downscaled and drawn in-game at about 42x42 px. Keep the detail budget low enough to survive that — at 42x42 the tower must read instantly as a dark round pot, wider than it is tall, hanging inside a tripod of curved bones, with one bright green spot in the middle.
```

**На что смотреть при приёмке:** зелёный есть только в вареве, пару и каплях — если позеленела бронза или кости, лист брак; котёл читается как «толстый и тяжёлый», а не как ваза, и в кадре 6 глоб уже отделился от края котла и летит вправо.

### Frost Wyrm Nest — `tower.undead.frost_wyrm_nest`

| | |
| --- | --- |
| Файл | `undead_frost_wyrm_nest.png` (кладём в `public/assets/towers/`, ключ добавляем в `TOWER_SPRITE_ASSETS`) |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | archetype frost, 70 золота, замедляет цель на 35% — контрольная башня с малым уроном; должна читаться как «холод», а не как урон |

```text
Pixel-art sprite sheet for a mobile tower defense game. One single labelled reference sheet, nothing else.

STYLE (identical in every cell): HD pixel art in the 16-bit era JRPG / Warcraft-style dark fantasy tradition — crisp pixel clusters, a 1px dark outline around every solid form, a limited palette per subject, soft dithered shading, subtle rim light. Muted saturation, strong value contrast so the shape stays readable on a dark grey bone-coloured ground. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (undead faction, stay inside this family): bone ivory, necrotic purple #7a4fd6, cold blue-violet #5c8cff, blood-red crystal, tarnished bronze. #7a4fd6 is the only purple anywhere on the sheet and #5c8cff is the only blue — never split either into extra shades. Cold blue-violet #5c8cff is the glow colour of this tower — the ice, the breath and the eye lights; the bone stays ivory and the metal stays tarnished bronze.

CAMERA (identical in every cell): three-quarter top-down view, camera slightly above and in front of the building. The structure is centred in its cell, drawn at exactly the same scale and exactly the same camera angle in every populated cell, and the foundation sits at the BOTTOM edge of its cell. The wyrm head breathes toward the RIGHT.

SUBJECT: a wyrm hatchling that breathes killing cold over the path — a low, wide nest woven from frozen ribs and bone shards, crusted with pale ice and rime, bound with tarnished bronze pins, and a small skeletal dragon head on a short bony neck rising out of the middle of the nest, horned skull, jaws slightly open, cold blue-violet #5c8cff eye lights, pale blue breath escaping between the teeth, a tattered necrotic purple #7a4fd6 banner pinned to one rib, standing on a round ring of grey rubble stones. PROPORTIONS: the nest is about 4/5 of the cell wide and no more than 1/4 of the cell tall — at least twice as wide as it is tall; the skull and neck add about another 1/4 of the cell height, so the finished silhouette is clearly wider than it is tall and never exceeds half the cell height. The skull itself is small, roughly 1/5 of the cell wide.

LAYOUT: one labelled grid, 5 columns x 3 rows = 15 equal square cells, one 60x60 pixel-art frame per cell, fully transparent background. Print every slot label OUTSIDE its cell as a small caption above the cell — never inside the artwork. Fill the cells left-to-right, top-to-bottom in exactly this order:

ROW 1
SLOT 0 — BUILD 1: foundation only. A round ring of grey rubble stones with a shallow empty nest bowl of frost-crusted bone shards in the middle. No head, no egg.
SLOT 1 — BUILD 2: half-built. The nest built up with frozen ribs and bronze pins, a large cracked egg of dull ice sitting in the middle, heavy frost crust, faint blue light in the crack. No head yet.
SLOT 2 — BUILD 3: finished structure. The egg shattered away and the small skeletal dragon head risen on its short bony neck out of the nest, blue eye lights on, ice crust on the bones, necrotic purple #7a4fd6 banner pinned to a rib.
SLOT 3 — IDLE 1: the finished nest at rest, head level, jaws just cracked open, faint pale blue breath, eye lights at their dimmest.
SLOT 4 — IDLE 2: same finished nest, breathing loop — head lowered 1 px, a small puff of pale blue breath escaping the jaws, eye lights brighter, two or three frost motes drifting up. Everything else pixel-identical to SLOT 3.

ROW 2
SLOT 5 — ATTACK 1 (wind-up): the head rears back and up, jaws opening wide, cold blue-violet #5c8cff light building deep in the throat, frost crystals forming on the muzzle.
SLOT 6 — ATTACK 2 (release): the head thrust forward to the RIGHT, jaws wide, a short cone of pale blue freezing breath and a jagged ice shard leaving the mouth toward the RIGHT edge of the cell, bright blue flash, frost motes flung out.
SLOT 7 — ATTACK 3 (recoil / return): the head pulling back level, jaws closing, a lingering wisp of blue breath, ice crystals dropping off the muzzle into the nest.
SLOT 8 — EMPTY. Leave this cell fully transparent, draw nothing in it.
SLOT 9 — HIT REACTION: the same finished nest from SLOT 2, flashed and tinted red-hot as if struck — the whole silhouette pushed to glowing crimson with white-hot highlights, the blue glow overpowered by red, shape and pose unchanged.

ROW 3
SLOT 10 — SELL 1: the structure collapsing — the skull cracking apart, the neck buckling down into the nest, ice crust shattering, bone chips and ice splinters flying, blue eye lights going out.
SLOT 11 — SELL 2: only a low pile of rubble left — broken frozen bones, a cracked jaw, chips of ice and a fading blue shimmer. Same footprint, at the bottom of the cell.
SLOT 12 — PROJECTILE: no tower in this cell. A single small object centred in the cell, roughly 20x20 px of content: a jagged pale blue ice shard flying to the RIGHT, sharp point leading, with a thin cold #5c8cff vapour trail behind it.
SLOT 13 — ATTACK IMPACT EFFECT: no tower in this cell. A centred radial burst, roughly 20x20 px of content: a pale blue frost burst — a ring of cold light with short ice spikes stabbing outward and a white frozen core, the effect that appears on the target when the shard lands.
SLOT 14 — EMPTY. Leave this cell fully transparent, draw nothing in it.

FORBIDDEN: no text, numbers, letters or watermarks inside the artwork cells; no drop shadows on the background; no ground shadow, grass or terrain under the foundation beyond the tower's own ring of rubble; no background gradient, background must be transparent; one single structure per cell; only ONE dragon head, never a full dragon body, never wings; never change the camera angle, the scale or the position of the base between cells; never crop any part of the subject.

SILHOUETTE CHECK: the sheet is downscaled and drawn in-game at about 42x42 px. Keep the detail budget low enough to survive that — at 42x42 the tower must read instantly as a low wide nest, at least twice as wide as tall, with one small horned skull head rising from it and a cold blue glow at the eyes.
```

**На что смотреть при приёмке:** голова маленькая и одна, гнездо низкое и широкое — общий силуэт заметно шире, чем выше, и не выходит за половину высоты ячейки; синий #5c8cff горит только в глазах, дыхании и льду, а кость остаётся ивори.

### Bone Obelisk — `tower.undead.bone_obelisk`

| | |
| --- | --- |
| Файл | `undead_bone_obelisk.png` (кладём в `public/assets/towers/`, ключ добавляем в `TOWER_SPRITE_ASSETS`) |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | archetype support, 60 золота, аура: +20% скорости атаки и +0.4 дальности соседям, НЕ СТРЕЛЯЕТ — поддержка; должна выглядеть безоружным столбом-усилителем, чтобы игрок не ждал выстрелов |

```text
Pixel-art sprite sheet for a mobile tower defense game. One single labelled reference sheet, nothing else.

STYLE (identical in every cell): HD pixel art in the 16-bit era JRPG / Warcraft-style dark fantasy tradition — crisp pixel clusters, a 1px dark outline around every solid form, a limited palette per subject, soft dithered shading, subtle rim light. Muted saturation, strong value contrast so the shape stays readable on a dark grey bone-coloured ground. NOT vector art, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

PALETTE (undead faction, stay inside this family): bone ivory, necrotic purple #7a4fd6, cold blue-violet #5c8cff, blood-red crystal, tarnished bronze. #7a4fd6 is the only purple anywhere on the sheet and #5c8cff is the only blue — never split either into extra shades. Necrotic purple #7a4fd6 is the glow colour of this tower — the rune ring, the glyphs and the aura all use that one colour; a single small blood-red crystal at the very tip is the only red.

CAMERA (identical in every cell): three-quarter top-down view, camera slightly above and in front of the building. The structure is centred in its cell, drawn at exactly the same scale and exactly the same camera angle in every populated cell, and the foundation sits at the BOTTOM edge of its cell.

SUBJECT: a grave-magic pillar that quickens every tower around it — a tall narrow obelisk built from fused skulls and bone slabs, banded with tarnished bronze, a small blood-red crystal set at the very tip, and a floating necrotic purple #7a4fd6 rune ring of carved glyphs orbiting around its upper third, a thin necrotic purple #7a4fd6 ribbon banner near the top, standing on a round ring of grey rubble stones with a necrotic purple #7a4fd6 rune circle carved into the flagstones. PROPORTIONS: a narrow vertical spike, roughly 3 times taller than it is wide — the shaft is about 1/4 of the cell wide and rises to about 4/5 of the cell height. It has no horns, no pot, no cauldron, no nest, no head and no opening of any kind; the only thing wider than the shaft is the rubble ring at its foot and the floating rune ring.

IMPORTANT — THIS TOWER NEVER FIRES. It has no weapon, no barrel, no mouth, no muzzle and no aiming direction. Nothing ever leaves the cell toward the right. The three attack slots are an AURA PULSE that expands outward from the pillar instead of a shot.

LAYOUT: one labelled grid, 5 columns x 3 rows = 15 equal square cells, one 60x60 pixel-art frame per cell, fully transparent background. Print every slot label OUTSIDE its cell as a small caption above the cell — never inside the artwork. Fill the cells left-to-right, top-to-bottom in exactly this order:

ROW 1
SLOT 0 — BUILD 1: foundation only. A round ring of grey rubble stones with bronze-edged flagstones and an unlit dead-grey rune circle carved into them. No pillar above it.
SLOT 1 — BUILD 2: half-built. The lower third of the pillar raised — a short stack of fused skulls and bone slabs with one bronze band, the carved rune circle on the ground faintly lit necrotic purple #7a4fd6. No floating ring, no crystal.
SLOT 2 — BUILD 3: finished structure. The full tall obelisk of fused skulls and bone slabs, bronze bands, blood-red crystal at the tip, necrotic purple #7a4fd6 rune ring floating around its upper third, purple ribbon banner, ground rune circle lit.
SLOT 3 — IDLE 1: the finished obelisk at rest, rune ring at one rotation angle, purple glow at its dimmest.
SLOT 4 — IDLE 2: same finished obelisk, breathing loop — the floating rune ring rotated a few degrees, purple glow brighter, two or three necrotic purple #7a4fd6 motes rising along the pillar, ribbon swayed 1 px. Everything else pixel-identical to SLOT 3.

ROW 2
SLOT 5 — AURA PULSE 1 (replaces wind-up; no projectile, nothing leaves the cell): the floating rune ring contracted tight against the pillar and blazing bright necrotic purple #7a4fd6, every carved glyph on the shaft lit up, motes pulled inward.
SLOT 6 — AURA PULSE 2 (replaces release; still no projectile): a flat necrotic purple #7a4fd6 ring of light expanding outward around the base of the obelisk, clearly wider than the pillar, small glyph symbols riding the ring, the pillar itself glowing at its brightest.
SLOT 7 — AURA PULSE 3 (replaces recoil): the expanded ring faded to a wide faint purple halo near the edges of the cell, motes settling, the floating rune ring back to its normal radius and dimming.
SLOT 8 — EMPTY. Leave this cell fully transparent, draw nothing in it.
SLOT 9 — HIT REACTION: the same finished obelisk from SLOT 2, flashed and tinted red-hot as if struck — the whole silhouette pushed to glowing crimson with white-hot highlights, shape and pose unchanged.

ROW 3
SLOT 10 — SELL 1: the structure collapsing — the obelisk cracking and toppling, skulls tumbling off the stack, the floating rune ring breaking into drifting glyph fragments, the red tip crystal falling, dust flying.
SLOT 11 — SELL 2: only a low pile of rubble left — loose skulls, broken bone slabs, bent bronze bands and a dead grey rune circle underneath. Same footprint, at the bottom of the cell.
SLOT 12 — PROJECTILE SLOT: this tower does not shoot, so this cell holds a marker, not a shot. No tower in this cell. A single small object centred in the cell, roughly 20x20 px of content: one glowing necrotic purple #7a4fd6 rune mote — a small carved glyph spark with a soft purple halo, no motion trail, no direction.
SLOT 13 — IMPACT EFFECT SLOT: no tower in this cell. A centred radial shape, roughly 20x20 px of content: a soft necrotic purple #7a4fd6 ring — a thin glowing circle with a faint inner glow and a couple of tiny glyph marks on it, low contrast, no debris and no burst spikes; this is the gentle marker that appears on an allied tower the aura touches.
SLOT 14 — EMPTY. Leave this cell fully transparent, draw nothing in it.

FORBIDDEN: no text, numbers, letters or watermarks inside the artwork cells; no drop shadows on the background; no ground plane, grass or terrain under the foundation beyond the tower's own ring of rubble; no background gradient, background must be transparent; one single structure per cell; no weapon, no barrel, no mouth, no arrow, no beam and nothing flying toward the right in any cell; never change the camera angle, the scale or the position of the base between cells; never crop any part of the subject.

SILHOUETTE CHECK: the sheet is downscaled and drawn in-game at about 42x42 px. Keep the detail budget low enough to survive that — at 42x42 the tower must read instantly as a narrow vertical spike of stacked skulls, roughly 3 times taller than it is wide, wrapped in a purple halo ring, with no horns, no pot, no nest and no opening anywhere on it.
```

**На что смотреть при приёмке:** в слотах 5-7 ничего не вылетает вправо — только кольцо, расходящееся наружу; силуэт узкий и вертикальный (высота примерно втрое больше ширины), без рогов, котла и гнезда; пурпур везде один и тот же #7a4fd6, слот 13 остаётся мягким кольцом без искр и осколков, иначе аура читается как выстрел.

---

## Башни орков (Orc)
Орочьи постройки должны читаться как наспех, но крепко сколоченные военные машины: связанные верёвкой брёвна, шкуры вместо крыш, чёрное кованое железо, ржаво-оранжевая боевая раскраска и руны, костяные трофеи и дым. Никакой каменной кладки и симметрии - всё чуть кривое, с торчащими шипами и подпорками, но тяжёлое и устойчивое. Игрок должен с первого взгляда отличать башни орков по тёплому ржаво-оранжевому пятну на фоне тёмной земли и по «дикому» силуэту с торчащими вверх копьями, рогами тотема или столбом дыма.

Все четыре башни орков стреляют (башен поддержки без атаки в этой фракции нет), поэтому слоты 5-7 у каждой - настоящая анимация выстрела, а не пульс ауры.

Формат у всех четырёх листов одинаковый и жёсткий: 300x180 px = 15 слотов по 60x60, порядок слотов сплошной (0 → 14, без пропусков и перестановок), внутри каждой клетки оставлен запас 3-4 px со всех сторон - это прописано прямо в промптах, потому что лист режется вручную и любой сдвиг ряда ломает анимации.

### Spear Watchtower — `tower.orc.spear_watchtower`

| | |
| --- | --- |
| Файл | `orc_spear_watchtower.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Архетип single, 50 золота, бьёт по одиночной цели: базовая дешёвая башня орков, должна читаться как простая деревянная вышка-копьемёт без магии. |

```text
HD pixel art sprite sheet for a fantasy tower defense game. Subject: an ORC SPEAR WATCHTOWER - a rugged wooden platform that hurls heavy spears. Crude but sturdy orc construction: four thick logs lashed together with rope into a squat tower, a plank platform on top, a slanted stretched-hide roof, a rack of heavy spears leaning at the platform edge, iron spikes hammered into the legs, two bleached skull trophies hanging from the cross-beams, rust-orange warpaint runes daubed on the wood.

STYLE (must match exactly): 16-bit era JRPG / Warcraft-style fantasy strategy pixel art. Crisp pixel clusters, a 1px dark outline around the whole structure, a strictly limited palette, soft dithered shading, subtle warm rim light from the upper left. Dark fantasy, muted saturation, strong value contrast so the tower reads against dark brown dirt ground. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.
PALETTE: rust orange #d97b39, blackened iron, dark leather and rope, ember red accents, bone ivory for the skulls, weathered dark wood.
CAMERA: three-quarter top-down view (camera slightly above and in front of the tower). The camera angle, lighting direction and scale must be IDENTICAL in every populated cell. The foundation of the structure sits at the BOTTOM of its cell, resting just above the bottom margin, and the tower grows upward.

LAYOUT: one image containing a grid of 5 columns x 3 rows of equal square cells, each cell exactly one 60x60 pixel-art frame; the assembled in-game sheet is 300x180 px = 15 slots of 60x60, cut by hand from this grid. Transparent background, subject centred in every populated cell. Print the slot labels OUTSIDE the cells, in the outer margin of the image only - never inside the artwork.

CONTENT PER SLOT (row 1 = slots 0-4 left to right, row 2 = slots 5-9, row 3 = slots 10-14):
Slot 0 - BUILD 1: foundation only. A ring of packed dirt and stones with four short log stumps driven in and coils of rope, nothing above knee height.
Slot 1 - BUILD 2: half-built. The four log legs raised and lashed with cross-beams, bare frame, no platform floor, no roof, one rope hanging loose.
Slot 2 - BUILD 3: finished tower. Full watchtower with plank platform, hide roof, spear rack, iron spikes, skull trophies, warpaint runes.
Slot 3 - IDLE A: the finished tower at rest.
Slot 4 - IDLE B: same tower, two-frame breathing loop - the hide roof flap and a small rust-orange banner strip sway one pixel, the hanging skulls swing slightly, the spear shafts shift. Nothing else moves.
Slot 5 - ATTACK 1 wind-up: a heavy spear is drawn back on the platform, the torsion ropes go taut, the whole frame leans a little back to the left.
Slot 6 - ATTACK 2 release: the spear is thrown to the RIGHT, leaving the platform, ropes snapping forward, a short white motion streak at the platform edge.
Slot 7 - ATTACK 3 recoil: the frame rocks back to rest, one slot in the spear rack now empty, a small dust puff at the base, ropes slack.
Slot 8 - SPARE: completely empty, fully transparent.
Slot 9 - HIT REACTION: the finished tower flashed red-hot as if struck - the whole silhouette tinted ember red / white-hot at the edges, a few wood chips flying off.
Slot 10 - SELL 1: collapsing. Log legs snapping, the hide roof sliding off, spears scattering, dust rising.
Slot 11 - SELL 2: a pile of rubble - broken logs, torn hide, coiled rope, one skull lying on top, a low dust cloud.
Slot 12 - PROJECTILE: a heavy iron-tipped spear flying point-first to the RIGHT, dark wooden shaft with rust-orange leather binding, small speed streak behind it, centred, about 20x20 px of content, nothing else in the cell.
Slot 13 - IMPACT EFFECT: a short radial brown-orange burst of dust and wooden splinters, centred, no tower in the cell.
Slot 14 - UNUSED: completely empty, fully transparent.

SILHOUETTE: at 42x42 px on screen the shape must instantly read as a squat lashed-log watchtower with spears sticking up above a slanted hide roof.

DO NOT: no text, numbers or watermarks inside the artwork cells; no drop shadow or ground plane on the background; no background gradient or coloured backdrop; only one structure per cell; do not change the camera angle, lighting or scale between cells; do not crop any part of the structure; leave 3-4 px of empty margin inside every cell on all four sides - shrink the structure rather than crop it or let it touch the cell edge; no characters or orcs standing on the tower.
```

**На что смотреть при приёмке:** фундамент должен стоять ровно у нижнего края клетки (на линии нижнего отступа), иначе башня «взлетит» над клеткой из-за origin (0.5, 0.82). Кадры 3 и 4 обязаны отличаться на 1-2 пикселя, а не быть другой позой; копьё в слоте 12 летит остриём строго вправо.

### Burning Pit — `tower.orc.burning_pit`

| | |
| --- | --- |
| Файл | `orc_burning_pit.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Архетип splash, 75 золота, урон по площади: медленная башня по толпе, силуэт должен кричать «огонь и дым», а не «одиночный выстрел». |

```text
HD pixel art sprite sheet for a fantasy tower defense game. Subject: an ORC BURNING PIT - a fire pit that flings burning pitch over a whole pack of enemies. Crude but sturdy orc construction: a ring of blackened stones around a bed of glowing coals, a crude wooden throwing arm lashed with rope to a heavy log pivot, an iron bucket of burning tar at the end of the arm, a thick column of black smoke, iron pegs and hide scraps, rust-orange warpaint runes daubed on the stones.

STYLE (must match exactly): 16-bit era JRPG / Warcraft-style fantasy strategy pixel art. Crisp pixel clusters, a 1px dark outline around the whole structure, a strictly limited palette, soft dithered shading, subtle warm rim light from the upper left. Dark fantasy, muted saturation, strong value contrast so the tower reads against dark brown dirt ground. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.
PALETTE: rust orange #d97b39, blackened iron, dark leather and rope, ember red and hot orange flame, sooty black smoke, weathered dark wood.
CAMERA: three-quarter top-down view (camera slightly above and in front of the pit). The camera angle, lighting direction and scale must be IDENTICAL in every populated cell. The stone ring sits at the BOTTOM of its cell, resting just above the bottom margin, and the throwing arm and smoke rise upward.

LAYOUT: one image containing a grid of 5 columns x 3 rows of equal square cells, each cell exactly one 60x60 pixel-art frame; the assembled in-game sheet is 300x180 px = 15 slots of 60x60, cut by hand from this grid. Transparent background, subject centred in every populated cell. Print the slot labels OUTSIDE the cells, in the outer margin of the image only - never inside the artwork.

CONTENT PER SLOT (row 1 = slots 0-4 left to right, row 2 = slots 5-9, row 3 = slots 10-14):
Slot 0 - BUILD 1: foundation only. A dug circle of bare dirt ringed with blackened stones, cold grey ash inside, no fire, no wood.
Slot 1 - BUILD 2: half-built. The stone ring plus a raw unfinished wooden pivot frame lashed with rope, the throwing arm bare, no bucket, no fire yet.
Slot 2 - BUILD 3: finished structure. Coals burning inside the ring, the throwing arm at rest with the iron tar bucket alight, black smoke rising.
Slot 3 - IDLE A: the finished pit at rest, flames low, one thin smoke curl.
Slot 4 - IDLE B: same pit, two-frame breathing loop - flames flicker to a slightly different shape, the smoke curl shifts, two ember sparks rise. The arm does not move.
Slot 5 - ATTACK 1 wind-up: the throwing arm hauled down and back to the left, the bucket dipped into the burning tar, the fire flaring brighter, ropes taut.
Slot 6 - ATTACK 2 release: the arm swung up and to the RIGHT, a flaming tar ball leaving the bucket, a spray of sparks and embers behind it.
Slot 7 - ATTACK 3 recoil: the arm bouncing back down toward rest, the empty bucket swinging, a thick puff of black smoke over the pit.
Slot 8 - SPARE: completely empty, fully transparent.
Slot 9 - HIT REACTION: the finished pit flashed red-hot as if struck - the whole silhouette tinted ember red / white-hot at the edges, stones cracking, sparks jumping.
Slot 10 - SELL 1: collapsing. The stone ring bursting apart, the throwing arm snapped, burning tar spilling out, smoke and dust.
Slot 11 - SELL 2: a pile of rubble - scattered blackened stones, a charred snapped beam, a dented bucket, a last smouldering ember and a thin wisp of smoke.
Slot 12 - PROJECTILE: a flaming tar ball flying to the RIGHT - a black sphere wrapped in an orange fire crown with a short ember trail streaming behind it to the left, centred, about 20x20 px of content, nothing else in the cell.
Slot 13 - IMPACT EFFECT: a radial orange fire splash with flying tar droplets and black smoke curling at its edges, centred, no tower in the cell.
Slot 14 - UNUSED: completely empty, fully transparent.

SILHOUETTE: at 42x42 px on screen the shape must instantly read as a low stone fire pit with a diagonal throwing arm and a black smoke plume.

DO NOT: no text, numbers or watermarks inside the artwork cells; no drop shadow or ground plane on the background; no background gradient or coloured backdrop; only one structure per cell; do not change the camera angle, lighting or scale between cells; do not crop any part of the structure; leave 3-4 px of empty margin inside every cell on all four sides - shrink the structure, the flames and the smoke plume rather than crop them or let them touch the cell edge; no characters or orcs operating the pit.
```

**На что смотреть при приёмке:** дым и пламя не должны выходить за пределы клетки и «сливать» силуэт - огонь яркий, но компактный, и вместе с дымом укладывается в отступ 3-4 px. Рычаг в слотах 5-7 должен двигаться по одной дуге, положение каменного кольца при этом не меняется ни на пиксель.

### Lightning Totem — `tower.orc.lightning_totem`

| | |
| --- | --- |
| Файл | `orc_lightning_totem.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Архетип chain, 85 золота (самая дорогая башня орков), молния прыгает на 2 соседних крипов с падением урона 35%: единственная «магическая» постройка орков, должна выглядеть дороже и опаснее остальных. |

```text
HD pixel art sprite sheet for a fantasy tower defense game. Subject: an ORC LIGHTNING TOTEM - a shaman totem whose bolt leaps from enemy to enemy. Crude but sturdy orc construction: a tall carved wooden totem pole with a stacked snarling spirit face, two curved horns at the top, a glowing storm rune burned into its chest, hanging feathers, small bones and leather cords, rust-orange warpaint runes on the wood, and cracking blue-white electric arcs flickering between the horns. It stands in a small ring of stones lashed with rope.

STYLE (must match exactly): 16-bit era JRPG / Warcraft-style fantasy strategy pixel art. Crisp pixel clusters, a 1px dark outline around the whole structure, a strictly limited palette, soft dithered shading, subtle warm rim light from the upper left plus a cold blue glow from the rune. Dark fantasy, muted saturation, strong value contrast so the totem reads against dark brown dirt ground. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.
PALETTE: rust orange #d97b39, blackened iron, dark leather and rope, ember red accents, bone ivory, weathered dark wood, and white-blue lightning used ONLY for the rune and the arcs.
CAMERA: three-quarter top-down view (camera slightly above and in front of the totem). The camera angle, lighting direction and scale must be IDENTICAL in every populated cell. The stone base sits at the BOTTOM of its cell, resting just above the bottom margin, and the pole rises upward.

LAYOUT: one image containing a grid of 5 columns x 3 rows of equal square cells, each cell exactly one 60x60 pixel-art frame; the assembled in-game sheet is 300x180 px = 15 slots of 60x60, cut by hand from this grid. Transparent background, subject centred in every populated cell. Print the slot labels OUTSIDE the cells, in the outer margin of the image only - never inside the artwork.

CONTENT PER SLOT (row 1 = slots 0-4 left to right, row 2 = slots 5-9, row 3 = slots 10-14):
Slot 0 - BUILD 1: foundation only. A shallow ring of stones around a dug socket with a short uncarved wooden stub and coils of rope, nothing tall.
Slot 1 - BUILD 2: half-built. The lower half of the pole raised and wedged into the stones, rough uncarved wood, ropes and lashings, no horns, no feathers, no rune glow.
Slot 2 - BUILD 3: finished totem. Full carved pole with horns, glowing storm rune, feathers, bones and warpaint runes, a faint arc between the horns.
Slot 3 - IDLE A: the finished totem, the rune glowing dim.
Slot 4 - IDLE B: same totem, two-frame breathing loop - the rune glow pulses bright, one thin arc flickers between the horns, the feathers sway one pixel. The pole itself does not move.
Slot 5 - ATTACK 1 wind-up: the arcs gather into a bright ball of energy between the horns, the rune blazing white-blue, feathers lifted by static, the wood lit cold from above.
Slot 6 - ATTACK 2 release: a jagged white-blue bolt shooting out to the RIGHT from between the horns, the whole totem hard-lit by the flash, sparks around the rune.
Slot 7 - ATTACK 3 recoil: afterglow fading, small residual sparks crawling over the horns, feathers falling back, the rune dimming toward its idle level.
Slot 8 - SPARE: completely empty, fully transparent.
Slot 9 - HIT REACTION: the finished totem flashed red-hot as if struck - the whole silhouette tinted ember red / white-hot at the edges, splinters flying, the rune drowned out by the red.
Slot 10 - SELL 1: collapsing. The pole cracking through the middle and toppling, horns breaking, feathers and bones flying loose, the rune light dying out.
Slot 11 - SELL 2: a pile of rubble - broken pole segments, scattered bones and feathers, a cracked grey dead rune fragment, dust.
Slot 12 - PROJECTILE: a small jagged lightning arc travelling to the RIGHT - a short zigzag bolt with a white core and blue edge glow, centred, about 20x20 px of content, nothing else in the cell.
Slot 13 - IMPACT EFFECT: a radial white-blue electric starburst with jagged spokes and a few crawling sparks, centred, no tower in the cell.
Slot 14 - UNUSED: completely empty, fully transparent.

SILHOUETTE: at 42x42 px on screen the shape must instantly read as a tall narrow horned totem pole with a glowing point on its chest.

DO NOT: no text, numbers or watermarks inside the artwork cells; no drop shadow or ground plane on the background; no background gradient or coloured backdrop; only one structure per cell; do not change the camera angle, lighting or scale between cells; do not crop the horns or any part of the totem; leave 3-4 px of empty margin inside every cell on all four sides - the horn tips and the released bolt must stay inside that margin, so shrink the totem rather than crop it or let it touch the cell edge; no characters or shamans next to the totem.
```

**На что смотреть при приёмке:** тотем узкий и высокий - в клетке 60x60 он не должен упираться рогами в верхний край, обязателен запас 3-4 px. Синее свечение допустимо только на руне и дугах, дерево остаётся тёплым ржаво-коричневым, иначе башня перестанет читаться как орочья.

### Tar Pit — `tower.orc.tar_pit`

| | |
| --- | --- |
| Файл | `orc_tar_pit.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Архетип frost, 70 золота, замедляет цель на 35% - но это не лёд, а кипящая смола: должна читаться как липкая чёрная яма, ни одного холодного/ледяного пикселя. |

```text
HD pixel art sprite sheet for a fantasy tower defense game. Subject: an ORC TAR PIT - a pit of boiling tar that leaves enemies crawling. Crude but sturdy orc construction: a sunken circular pit filled with thick black bubbling tar, its rim ringed with rusted iron spikes driven into the packed dirt, a crude leather-and-wood bellows on a lashed wooden stand at the back feeding a bed of coals under the pit, heat shimmer over the surface, slow fat bubbles, rust-orange warpaint runes daubed on the rim stones.

STYLE (must match exactly): 16-bit era JRPG / Warcraft-style fantasy strategy pixel art. Crisp pixel clusters, a 1px dark outline around the whole structure, a strictly limited palette, soft dithered shading, subtle warm rim light from the upper left. Dark fantasy, muted saturation, strong value contrast so the pit reads against dark brown dirt ground. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.
PALETTE: rust orange #d97b39, blackened iron, dark leather and rope, ember red coals glowing under the pit, glossy black tar with a dull brown-violet sheen, weathered dark wood. NO ice, NO frost, NO cold blue - the slow effect is sticky tar, not cold.
CAMERA: three-quarter top-down view (camera slightly above and in front of the pit). The camera angle, lighting direction and scale must be IDENTICAL in every populated cell. The pit rim sits at the BOTTOM of its cell, resting just above the bottom margin, and the spikes and bellows stand up behind it.

LAYOUT: one image containing a grid of 5 columns x 3 rows of equal square cells, each cell exactly one 60x60 pixel-art frame; the assembled in-game sheet is 300x180 px = 15 slots of 60x60, cut by hand from this grid. Transparent background, subject centred in every populated cell. Print the slot labels OUTSIDE the cells, in the outer margin of the image only - never inside the artwork.

CONTENT PER SLOT (row 1 = slots 0-4 left to right, row 2 = slots 5-9, row 3 = slots 10-14):
Slot 0 - BUILD 1: foundation only. A freshly dug empty circular pit in bare dirt with a loose ring of stones around it, a shovel-scraped edge, no tar, no spikes.
Slot 1 - BUILD 2: half-built. The pit lined with stones, a few iron spikes already driven into the rim, dull half-filled tar, no bellows, no bubbles, no glow.
Slot 2 - BUILD 3: finished structure. Full pit of glossy black bubbling tar, the complete ring of iron spikes, the bellows on its wooden stand, ember glow underneath, heat shimmer.
Slot 3 - IDLE A: the finished pit, two fat bubbles rising, the bellows expanded.
Slot 4 - IDLE B: same pit, two-frame breathing loop - the bubbles have burst into small craters, new ones start elsewhere, the bellows is compressed, the ember glow pulses. The rim and spikes do not move.
Slot 5 - ATTACK 1 wind-up: the bellows fully compressed, the coals blazing, the tar swelling into a tall dome in the centre of the pit.
Slot 6 - ATTACK 2 release: a heavy blob of black tar launched to the RIGHT out of the pit, stringy tar strands stretching behind it, a splash crown left on the surface.
Slot 7 - ATTACK 3 recoil: the tar surface sloshing back with concentric ripples, black drips running down two of the spikes, the bellows re-expanding.
Slot 8 - SPARE: completely empty, fully transparent.
Slot 9 - HIT REACTION: the finished pit flashed red-hot as if struck - the whole silhouette tinted ember red / white-hot at the edges, tar spattering, spikes glowing.
Slot 10 - SELL 1: collapsing. The rim caving inward, iron spikes toppling, tar draining away into the broken ground, steam and dust.
Slot 11 - SELL 2: a pile of rubble - broken rim stones, bent rusted spikes, a snapped bellows plank and a flat black tar stain on the dirt.
Slot 12 - PROJECTILE: a heavy blob of black tar flying to the RIGHT - a rounded glossy blob with a small highlight, two trailing strands and a couple of droplets behind it, centred, about 20x20 px of content, nothing else in the cell.
Slot 13 - IMPACT EFFECT: a radial spreading black tar splatter with irregular sticky edges, flying droplets and a dull brown-violet sheen, centred, no tower in the cell.
Slot 14 - UNUSED: completely empty, fully transparent.

SILHOUETTE: at 42x42 px on screen the shape must instantly read as a low black pit ringed with iron spikes - the flattest, lowest silhouette of the orc towers.

DO NOT: no text, numbers or watermarks inside the artwork cells; no drop shadow or ground plane on the background; no background gradient or coloured backdrop; only one structure per cell; do not change the camera angle, lighting or scale between cells; do not crop any part of the structure; leave 3-4 px of empty margin inside every cell on all four sides - shrink the structure rather than crop it or let it touch the cell edge; no ice or frost effects; no characters or orcs working the bellows.
```

**На что смотреть при приёмке:** яма низкая, поэтому легко теряется на тёмной земле - чёрная смола обязана отбиваться от грунта светлым бликом и рыжими шипами по краю. Проверь, что нигде не проскочил голубой «ледяной» оттенок, что кадры 3 и 4 отличаются только пузырями и мехами, и что порядок слотов в листе идёт сплошняком: 0 - котлован, 1 - недострой, 2 - готовая яма.

---

## Башни людей (Human)
Башни людей - это инженерное, «строительное» крыло ростера: аккуратная серая тёсаная кладка ровными квадратными блоками, черепичные крыши стального синего оттенка #5e94d6, золотая окантовка, тёмно-красные знамёна и железные оковки на тёмном дереве. Игрок должен мгновенно понимать, что это построено людьми-каменщиками, а не выращено, не собрано из костей и не сколочено из добычи: прямые углы, отвес, симметрия, ни одной «кривой» линии.

Все четыре башни стоят на квадратном каменном основании, которое упирается в НИЖНИЙ край кадра, и различаются в первую очередь силуэтом на дистанции ~42x42 px: узкая башня с бойницей и знаменем (стрелки), низкий широкий бастион с чёрным стволом вбок (пушка), высокая узкая лаборатория со светящейся зелёной колбой наверху (алхимик), низкий блок с длинным древком знамени и без единого оружия (пост). Цвет-акцент читает роль ещё до анимации: бело-голубая искра выстрела #bcdcff, тёплая пороховая вспышка #fff4cf с серо-белым дымом, кислотно-зелёное свечение яда #7fd63a, тёплое золото ауры #f0b93c.

Нумерация слотов во всех промптах этого документа - 0-based, ровно как их читает Phaser: верхний ряд SLOT 0..4, средний SLOT 5..9, нижний SLOT 10..14. Значит снаряд всегда SLOT 12, эффект попадания SLOT 13, а пустые слоты - SLOT 8 и SLOT 14. Русские заметки по приёмке ниже используют те же 0-based номера, никаких «кадр 1» и «CELL 13».

### Guard Archer Tower — `tower.human.guard_archer`

| | |
| --- | --- |
| Файл | `human_guard_archer.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Базовая одиночная башня, 50 золота, бьёт по одной цели - должна читаться как аккуратная стрелковая башня с бойницей и знаменем. |

```text
HD pixel art sprite sheet for a 16-bit-era dark fantasy tower defense game (Warcraft III / JRPG feel).

SUBJECT: "Guard Archer Tower" - a human watchtower where disciplined marksmen watch over fortified walls. A square turret of grey cut stone with crenellated merlons on top, a steel-blue tiled pitched roof over the battlement, one narrow vertical arrow slit facing right, a deep red banner with gold trim hanging from an iron bracket, iron fittings on a small dark timber door.

STYLE (identical in every cell): HD pixel art, crisp pixel clusters, one-pixel dark outline around the whole structure, limited palette, soft dithered shading, subtle rim light from the upper left. Muted, desaturated dark-fantasy colours with strong value contrast so the building reads against pale stone terrain. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

RACE PALETTE (Human): grey cut stone #8a8f99 with #4a4f57 shadows, steel-blue roof tiles #5e94d6, muted gold trim #d9a441, deep red banners #8e2b2b, dark timber #4a3527, dull iron fittings. Human structures are clean, engineered masonry: squared blocks, tiled roofs, banners, iron fittings.

ACCENT COLOUR: pale ice blue #bcdcff - used for the arrowhead glint, the release spark, the projectile glint and the impact flash. This is the only saturated colour anywhere on the sheet: the masonry, timber, gold trim and deep red banner all stay muted and desaturated. The shot must stay cold blue-white, never yellow or orange (the cannon tower owns warm muzzle light), and there is no green or violet anywhere on this sheet.

CAMERA: three-quarter top-down view, slightly above and in front of the building. The camera angle, the lighting direction and the subject scale are IDENTICAL in every populated cell. The stone foundation sits at the BOTTOM edge of its cell; the building is centred horizontally.

SHEET LAYOUT: a single image, a grid of 5 columns x 3 rows = 15 equal square cells, one 60x60 pixel-art frame per cell, transparent background everywhere. The cells are numbered from ZERO, left to right and top to bottom: top row SLOT 0, 1, 2, 3, 4; middle row SLOT 5, 6, 7, 8, 9; bottom row SLOT 10, 11, 12, 13, 14. If you print any frame labels, use these 0-based numbers and put them OUTSIDE the cells, in the margins only.

CELL CONTENTS:
SLOT 0 - BUILD 1: foundation only. A squared grey cut-stone footing, two courses of blocks, a mason's cord and a couple of dark timber pegs. No walls, no roof.
SLOT 1 - BUILD 2: half-built. Waist-high squared masonry walls, dark timber scaffolding lashed to one side, a small stack of spare blocks. No roof, no banner.
SLOT 2 - BUILD 3: the finished turret exactly as described in SUBJECT.
SLOT 3 - IDLE A: the finished turret at rest, banner hanging almost straight, a faint warm lantern glow inside the arrow slit.
SLOT 4 - IDLE B: the same turret one beat later - banner swayed to the side, lantern glow slightly brighter, roof tiles catching a touch more rim light. SLOT 3 and SLOT 4 must loop seamlessly.
SLOT 5 - ATTACK 1, wind-up: same finished turret; inside the arrow slit a dark archer silhouette draws a bow, a pale ice-blue #bcdcff glint on the arrowhead, the banner pulled taut.
SLOT 6 - ATTACK 2, release: the arrow leaves the slit travelling to the RIGHT, a small ice-blue #bcdcff release spark and a short motion streak at the slit, bowstring blurred.
SLOT 7 - ATTACK 3, recoil: the bow lowered back into shadow, a thin puff of dust drifting off the crenellations, banner swinging back.
SLOT 8 - EMPTY. Fully transparent, nothing drawn at all.
SLOT 9 - HIT REACTION: the same finished turret in the same pose and scale as SLOT 2, flashed red-hot as if struck - stone tinted glowing red-orange, white-hot edge highlights, two or three chips of stone flying off.
SLOT 10 - SELL 1: the turret collapsing - the roof tilts and slides, upper blocks tumble outward, the banner tears loose, dust rising.
SLOT 11 - SELL 2: the aftermath - a low pile of broken grey blocks and snapped dark timber with a torn scrap of red banner on top and thin dust, still centred and sitting at the bottom of the cell.
SLOT 12 - PROJECTILE, no tower in this cell: a single fletched arrow seen from the side, flying to the RIGHT, centred, roughly 20x20 px of content - pale wooden shaft, steel head, red-and-white fletching, a tiny ice-blue #bcdcff glint.
SLOT 13 - IMPACT EFFECT, no tower in this cell: a small radial ice-blue #bcdcff impact spark centred in the cell with a brown-grey dust puff and two or three short debris ticks, roughly 20x20 px of content.
SLOT 14 - EMPTY. Fully transparent, nothing drawn at all.

READABILITY: in game this sprite is drawn at about 42x42 px, so keep the detail budget low - at that size the silhouette must instantly read as a square crenellated block with a pitched roof and one banner sticking out to the side.

FORBIDDEN: no text, letters, numbers or watermarks inside the artwork cells; no drop shadow on the background; no gradient or coloured background; no ground plane, grass or terrain under the foundation beyond the building's own base; only one structure per cell; no change of camera angle, lighting direction or scale between cells; never crop any part of the building.
```

**На что смотреть при приёмке:** основание во всех непустых слотах стоит на одной линии у нижнего края, крыша и знамя не съезжают по масштабу между build (слоты 0-2), idle (3-4) и attack (5-7); стрела в слоте 12 летит вправо и читается силуэтом на 20 px; искра попадания в слоте 13 бело-голубая #bcdcff, а не жёлтая (иначе спутается с пушкой); слоты 8 и 14 должны быть полностью прозрачными.

### Cannon Bastion — `tower.human.cannon_bastion`

| | |
| --- | --- |
| Файл | `human_cannon_bastion.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Сплэш-башня, 75 золота, урон по площади - низкая, тяжёлая, с чёрным стволом: видно, что бьёт по толпе. |

```text
HD pixel art sprite sheet for a 16-bit-era dark fantasy tower defense game (Warcraft III / JRPG feel).

SUBJECT: "Cannon Bastion" - dwarven powder and iron shot, loud and wide. A low, squat bastion of grey cut stone with an angled sloping face and a wide embrasure on the right, a heavy black iron cannon barrel with brass reinforcing rings pointing RIGHT out of the embrasure, two dark timber powder barrels with iron hoops stacked beside it, a small deep red pennant with gold trim on a short iron pole, iron fittings everywhere.

STYLE (identical in every cell): HD pixel art, crisp pixel clusters, one-pixel dark outline around the whole structure, limited palette, soft dithered shading, subtle rim light from the upper left. Muted, desaturated dark-fantasy colours with strong value contrast so the building reads against pale stone terrain. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

RACE PALETTE (Human): grey cut stone #8a8f99 with #4a4f57 shadows, steel-blue trim #5e94d6, muted gold trim #d9a441, deep red banners #8e2b2b, dark timber #4a3527, black iron and dull brass. Human structures are clean, engineered masonry: squared blocks, tiled roofs, banners, iron fittings.

ACCENT COLOUR: hot yellow-white powder flash #fff4cf, with a tiny orange linstock ember #e07a2a and neutral grey-white smoke #b9bcc0 (smoke and debris stay unsaturated). This warm flash is the only saturated colour anywhere on the sheet: the masonry, iron, timber, gold trim and deep red pennant all stay muted and desaturated. Do not use a cold blue spark (the archer tower owns the cold blue shot), and no green or violet anywhere on this sheet.

CAMERA: three-quarter top-down view, slightly above and in front of the building. The camera angle, the lighting direction and the subject scale are IDENTICAL in every populated cell. The stone foundation sits at the BOTTOM edge of its cell; the building is centred horizontally.

SHEET LAYOUT: a single image, a grid of 5 columns x 3 rows = 15 equal square cells, one 60x60 pixel-art frame per cell, transparent background everywhere. The cells are numbered from ZERO, left to right and top to bottom: top row SLOT 0, 1, 2, 3, 4; middle row SLOT 5, 6, 7, 8, 9; bottom row SLOT 10, 11, 12, 13, 14. If you print any frame labels, use these 0-based numbers and put them OUTSIDE the cells, in the margins only.

CELL CONTENTS:
SLOT 0 - BUILD 1: foundation only. A wide, low square footing of grey cut stone, two courses of heavy blocks laid on dark timber sleepers. No barrel, no walls.
SLOT 1 - BUILD 2: half-built. Low bastion walls up to knee height with the embrasure gap left open, dark timber scaffolding on one side, powder barrels stacked beside the works. No cannon barrel yet, no pennant.
SLOT 2 - BUILD 3: the finished bastion exactly as described in SUBJECT.
SLOT 3 - IDLE A: the finished bastion at rest, a thin wisp of grey smoke at the muzzle, a smouldering orange #e07a2a ember on a linstock by the touch hole, pennant hanging.
SLOT 4 - IDLE B: the same bastion one beat later - pennant swayed, the ember glow pulsed brighter, the smoke wisp curled differently. SLOT 3 and SLOT 4 must loop seamlessly.
SLOT 5 - ATTACK 1, wind-up: same finished bastion; the barrel elevated a little, the linstock ember flaring bright orange #e07a2a at the touch hole, pennant pulled taut, a first spark at the vent.
SLOT 6 - ATTACK 2, release: a bright yellow-white #fff4cf muzzle flash at the mouth of the barrel with a thick grey-white #b9bcc0 smoke cloud pushing to the RIGHT, the black cannonball just leaving the muzzle, stones lit warm by the flash.
SLOT 7 - ATTACK 3, recoil: the barrel shoved back into the embrasure, dense grey smoke rolling around the opening, the powder barrels rocking, dust shaken off the stone.
SLOT 8 - EMPTY. Fully transparent, nothing drawn at all.
SLOT 9 - HIT REACTION: the same finished bastion in the same pose and scale as SLOT 2, flashed red-hot as if struck - stone and iron tinted glowing red-orange, white-hot edge highlights, a few chips of stone flying off.
SLOT 10 - SELL 1: the bastion breaking apart - the front face cracks and slumps, the black barrel cants down and slides forward, a powder barrel bursts open, dust rising.
SLOT 11 - SELL 2: the aftermath - a low pile of broken grey blocks and splintered dark timber with the cracked black barrel half-buried in it, a torn scrap of red pennant, thin dust. Still centred and sitting at the bottom of the cell.
SLOT 12 - PROJECTILE, no tower in this cell: a single black iron cannonball flying to the RIGHT, centred, roughly 20x20 px of content - dark iron sphere with a hard specular highlight at the upper left, a couple of short grey smoke ticks trailing behind it to the left.
SLOT 13 - IMPACT EFFECT, no tower in this cell: a radial grey-white explosion burst centred in the cell - a hot pale #fff4cf core, a rolling grey #b9bcc0 smoke ring and several small black debris chunks flying outward, roughly 20x20 px of content.
SLOT 14 - EMPTY. Fully transparent, nothing drawn at all.

READABILITY: in game this sprite is drawn at about 42x42 px, so keep the detail budget low - at that size the silhouette must instantly read as a low wide wedge of stone with a black barrel jutting out to the right, clearly heavier and squatter than the other human towers.

FORBIDDEN: no text, letters, numbers or watermarks inside the artwork cells; no drop shadow on the background; no gradient or coloured background; no ground plane, grass or terrain under the foundation beyond the building's own base; only one structure per cell; no change of camera angle, lighting direction or scale between cells; never crop any part of the building.
```

**На что смотреть при приёмке:** башня должна быть заметно ниже и шире лучников уже в силуэте; ствол в слотах 5-7 не меняет угол камеры, а только сдвигается вдоль своей оси; дым при выстреле не вылезает за пределы клетки и не тянется в соседнюю; ядро в слоте 12 - тёмный силуэт с одним бликом, читаемый на светлой земле; взрыв в слоте 13 серо-белый с тёплым ядром #fff4cf, а не голубой; слоты 8 и 14 полностью прозрачны.

### Alchemist Tower — `tower.human.alchemist_tower`

| | |
| --- | --- |
| Файл | `human_alchemist_tower.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Ядовитая башня, 65 золота, накладывает стакающийся яд (яд игнорирует броню) - хрупкая узкая лаборатория, светится кислотно-зелёным. |

```text
HD pixel art sprite sheet for a 16-bit-era dark fantasy tower defense game (Warcraft III / JRPG feel).

SUBJECT: "Alchemist Tower" - flasks of slow-working blight that ignore armor. A narrow, tall laboratory tower: a grey cut-stone lower storey, a dark timber upper storey with a steel-blue tiled roof, a rack of glowing acid-green glass flasks in an open window, copper piping running up the outside wall, a small copper still with a stubby chimney, and a vent on the side leaking green vapour. A small deep red pennant with gold trim on an iron bracket.

STYLE (identical in every cell): HD pixel art, crisp pixel clusters, one-pixel dark outline around the whole structure, limited palette, soft dithered shading, subtle rim light from the upper left. Muted, desaturated dark-fantasy colours with strong value contrast so the building reads against pale stone terrain. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

RACE PALETTE (Human): grey cut stone #8a8f99 with #4a4f57 shadows, steel-blue roof tiles #5e94d6, muted gold trim #d9a441, deep red banners #8e2b2b, dark timber #4a3527 - plus dull copper fittings #b4713a.

ACCENT COLOUR: acid green #7fd63a, a deliberately YELLOW-leaning green, used for the flask liquid, the glow it spills, the vapour, the projectile and the impact splash. This is the only saturated colour anywhere on the sheet: the masonry, timber, copper, gold trim and deep red pennant all stay muted and desaturated. Keep the green clearly yellow-leaning - it must NOT drift toward an olive plague green (#6f8f2a) or toward a blue-leaning teal (#3fd6c0), because other factions own those hues. No violet anywhere on this sheet.

CAMERA: three-quarter top-down view, slightly above and in front of the building. The camera angle, the lighting direction and the subject scale are IDENTICAL in every populated cell. The stone foundation sits at the BOTTOM edge of its cell; the building is centred horizontally.

SHEET LAYOUT: a single image, a grid of 5 columns x 3 rows = 15 equal square cells, one 60x60 pixel-art frame per cell, transparent background everywhere. The cells are numbered from ZERO, left to right and top to bottom: top row SLOT 0, 1, 2, 3, 4; middle row SLOT 5, 6, 7, 8, 9; bottom row SLOT 10, 11, 12, 13, 14. If you print any frame labels, use these 0-based numbers and put them OUTSIDE the cells, in the margins only.

CELL CONTENTS:
SLOT 0 - BUILD 1: foundation only. A narrow square footing of grey cut stone with a dark timber sill frame and one stub of copper pipe sticking up. No walls, no glass.
SLOT 1 - BUILD 2: half-built. One storey of stone with a bare dark timber frame above it, unglazed window openings, a crate of empty clear glass flasks beside the works, timber scaffolding. No roof, no green glow.
SLOT 2 - BUILD 3: the finished laboratory tower exactly as described in SUBJECT.
SLOT 3 - IDLE A: the finished tower at rest, flasks glowing steadily acid green #7fd63a, a thin ribbon of green vapour rising from the vent.
SLOT 4 - IDLE B: the same tower one beat later - bubbles risen inside the flasks, the green glow pulsed brighter and spilling a little onto the stone, the vapour ribbon curled differently, pennant swayed. SLOT 3 and SLOT 4 must loop seamlessly.
SLOT 5 - ATTACK 1, wind-up: same finished tower; a gloved hand at the window lifts a corked green flask, the flask flares bright acid green #7fd63a, green light spills across the timber and stone.
SLOT 6 - ATTACK 2, release: the flask is hurled out to the RIGHT, a short green light streak and two droplets at the window, the vent puffing harder, green rim light on the wall.
SLOT 7 - ATTACK 3, recoil: the hand withdrawn into the window, a green stain and drips down the sill, a fat cloud of green vapour rolling out of the vent, the remaining flasks dimmer.
SLOT 8 - EMPTY. Fully transparent, nothing drawn at all.
SLOT 9 - HIT REACTION: the same finished tower in the same pose and scale as SLOT 2, flashed red-hot as if struck - stone, timber and copper tinted glowing red-orange, white-hot edge highlights, the green glow overpowered by the red flash, one flask cracking.
SLOT 10 - SELL 1: the tower collapsing - the timber upper storey buckles and leans, flasks shatter with green splashes, copper pipes bend and pop loose, dust and green vapour mixing.
SLOT 11 - SELL 2: the aftermath - a low pile of broken grey blocks and snapped dark timber with shards of green glass, a dented copper pipe and a small faintly glowing green puddle. Still centred and sitting at the bottom of the cell.
SLOT 12 - PROJECTILE, no tower in this cell: a single corked green glass flask tumbling to the RIGHT, centred, roughly 20x20 px of content - acid-green #7fd63a liquid inside, a highlight on the glass, a dark cork and a readable glass silhouette, a faint green glow and two droplets trailing behind it to the left.
SLOT 13 - IMPACT EFFECT, no tower in this cell: a radial green corrosive splash centred in the cell - a pale acid-green #7fd63a core, a darker green rim, bubbling droplets and a few flying glass shards, roughly 20x20 px of content.
SLOT 14 - EMPTY. Fully transparent, nothing drawn at all.

READABILITY: in game this sprite is drawn at about 42x42 px, so keep the detail budget low - at that size the silhouette must instantly read as a narrow tall tower with a glowing green window near the top and a vapour vent, visibly lighter and more fragile than the stone gun towers.

FORBIDDEN: no text, letters, numbers or watermarks inside the artwork cells; no drop shadow on the background; no gradient or coloured background; no ground plane, grass or terrain under the foundation beyond the building's own base; only one structure per cell; no change of camera angle, lighting direction or scale between cells; never crop any part of the building.
```

**На что смотреть при приёмке:** зелёный #7fd63a - единственный насыщенный цвет на башне, всё остальное остаётся людским серо-синим; оттенок должен уходить в жёлтый, чтобы не совпасть с оливковой чумой нежити #6f8f2a и с бирюзой эльфов #3fd6c0; в слоте 9 красная вспышка должна перебивать зелёное свечение, иначе реакция на урон не читается; колба в слоте 12 не должна сливаться в зелёное пятно - нужен силуэт стекла и пробки; слоты 8 и 14 полностью прозрачны.

### Guard Post — `tower.human.guard_post`

| | |
| --- | --- |
| Файл | `human_guard_post.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Саппорт, 60 золота, аура на соседние башни, НЕ СТРЕЛЯЕТ - знамя, горн и стойка щитов вместо оружия. |

```text
HD pixel art sprite sheet for a 16-bit-era dark fantasy tower defense game (Warcraft III / JRPG feel).

SUBJECT: "Guard Post" - a captain barking orders sharpens the whole wall. A small, low command post of grey cut stone with a squared parapet, a tall dark timber pole carrying a large deep red banner with gold trim and a gold finial, a brass-bound war horn hanging on an iron hook, a rack of steel-blue shields with gold rims, and a small iron brazier. This building carries NO weapon at all: no bow, no arrow slit, no cannon barrel, no flasks.

STYLE (identical in every cell): HD pixel art, crisp pixel clusters, one-pixel dark outline around the whole structure, limited palette, soft dithered shading, subtle rim light from the upper left. Muted, desaturated dark-fantasy colours with strong value contrast so the building reads against pale stone terrain. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi-cute.

RACE PALETTE (Human): grey cut stone #8a8f99 with #4a4f57 shadows, steel-blue shields #5e94d6, muted gold trim #d9a441, deep red banners #8e2b2b, dark timber #4a3527, dull iron and brass. Human structures are clean, engineered masonry: squared blocks, tiled roofs, banners, iron fittings.

ACCENT COLOUR: bright command gold #f0b93c with pale gold motes #ffe6a8 - used for the aura ring, the rising motes, the drifting mote and the buff effect. This is the only saturated colour anywhere on the sheet: the masonry, timber, shields and deep red banner all stay muted and desaturated. The glowing aura gold must read clearly brighter and yellower than the static metal gold trim #d9a441, and must never drift toward the deep red #8e2b2b of the banner. No green, no violet, no weapon light of any kind.

CAMERA: three-quarter top-down view, slightly above and in front of the building. The camera angle, the lighting direction and the subject scale are IDENTICAL in every populated cell. The stone foundation sits at the BOTTOM edge of its cell; the building is centred horizontally.

SHEET LAYOUT: a single image, a grid of 5 columns x 3 rows = 15 equal square cells, one 60x60 pixel-art frame per cell, transparent background everywhere. The cells are numbered from ZERO, left to right and top to bottom: top row SLOT 0, 1, 2, 3, 4; middle row SLOT 5, 6, 7, 8, 9; bottom row SLOT 10, 11, 12, 13, 14. If you print any frame labels, use these 0-based numbers and put them OUTSIDE the cells, in the margins only.

IMPORTANT: this is a support building and it NEVER FIRES. The three attack slots (SLOT 5, SLOT 6, SLOT 7) are not a shot - they are a gold command aura pulse spreading out from the post. Do not draw any weapon, muzzle flash or launched missile anywhere on this sheet.

CELL CONTENTS:
SLOT 0 - BUILD 1: foundation only. A low square footing of grey cut stone, two courses of blocks, with an empty iron socket for the banner pole. No walls, no banner.
SLOT 1 - BUILD 2: half-built. Low parapet walls to knee height, the bare dark timber pole raised and braced, an empty shield rack, timber scaffolding. No banner cloth, no horn.
SLOT 2 - BUILD 3: the finished command post exactly as described in SUBJECT.
SLOT 3 - IDLE A: the finished post at rest, banner hanging, a faint warm gold sheen along the trim, a low flame in the brazier.
SLOT 4 - IDLE B: the same post one beat later - banner swayed out, the gold trim glow pulsed brighter, the brazier flame flickered higher. SLOT 3 and SLOT 4 must loop seamlessly.
SLOT 5 - AURA 1, wind-up (replaces attack): same finished post; the war horn is lifted and the banner snaps taut, a thin gold #f0b93c ring of light is just being born around the base of the post, a few gold motes lifting off the parapet.
SLOT 6 - AURA 2, release (replaces attack): a bright gold #f0b93c command ring expands outward around the base of the post - drawn flat and elliptical, lying on the ground, seen from the same three-quarter angle - with pale gold motes streaming upward and the banner fully snapped out.
SLOT 7 - AURA 3, return (replaces attack): the ring has widened to a thin dim gold outline near the edges of the cell and is fading, the motes disperse, the banner settles back.
SLOT 8 - EMPTY. Fully transparent, nothing drawn at all.
SLOT 9 - HIT REACTION: the same finished post in the same pose and scale as SLOT 2, flashed red-hot as if struck - stone, timber and banner tinted glowing red-orange, white-hot edge highlights, a few chips of stone flying off.
SLOT 10 - SELL 1: the post crumbling - the parapet slumps, the banner pole tips over sideways, shields clatter off the rack, the brazier spills embers, dust rising.
SLOT 11 - SELL 2: the aftermath - a low pile of broken grey blocks with the snapped pole and the folded deep red banner draped over them, a dented war horn and one cracked shield, thin dust. Still centred and sitting at the bottom of the cell.
SLOT 12 - PROJECTILE SLOT, no tower in this cell: this tower fires no weapon, so draw only a single small gold command mote drifting to the RIGHT, centred, roughly 20x20 px of content - a soft four-point gold #f0b93c glint with a faint warm halo and two tiny pale gold sparkles.
SLOT 13 - IMPACT / BUFF EFFECT, no tower in this cell: a soft gold ring centred in the cell - a thin bright gold #f0b93c circle with a warm inner glow and a few rising motes, reading as a buff landing rather than damage, roughly 20x20 px of content.
SLOT 14 - EMPTY. Fully transparent, nothing drawn at all.

READABILITY: in game this sprite is drawn at about 42x42 px, so keep the detail budget low - at that size the silhouette must instantly read as a low wide stone block with one tall banner pole and no weapon, so the player never mistakes it for a firing tower.

FORBIDDEN: no text, letters, numbers or watermarks inside the artwork cells; no drop shadow on the background; no gradient or coloured background; no ground plane, grass or terrain under the foundation beyond the building's own base; only one structure per cell; no change of camera angle, lighting direction or scale between cells; never crop any part of the building.
```

**На что смотреть при приёмке:** ни в одном слоте не должно появиться оружия или снаряда - иначе башня врёт о своей роли; кольцо ауры в слотах 5-7 растёт плоско по земле в той же перспективе, что и постройка, а не встаёт вертикальным диском; золото ауры #f0b93c отличается по оттенку и от красного знамени #8e2b2b, и от статичной золотой окантовки #d9a441, чтобы пульс читался на 42 px; в слоте 12 - мота, а не снаряд, в слоте 13 - мягкое кольцо баффа без осколков и дыма; слоты 8 и 14 полностью прозрачны.

---

## Башни эльфов (Elf)
Эльфийские башни - это не постройки, а живые святилища: камень здесь всегда оплетён мхом, корнями и лозой, а рядом с ним растёт настоящее дерево или цветок. Общий читаемый признак - тёплый серо-зелёный мшистый объём внизу и холодное бирюзово-зелёное свечение сверху (мотыльки света, руны, лунный блик на серебре), поэтому силуэт всегда «тяжёлое основание + светящаяся макушка». Никакого металла ради металла: только серебряная филигрань тонкими линиями, бледная берёза и живая древесина, а насыщенный цвет допустим лишь в свечении.

**Два общих правила листа, одинаковых для всего ростера башен** (формулировки ниже вставлены дословно во все четыре эльфийских промпта; те же самые строки должны стоять в секциях нежити, орков и людей):

1. *Фундамент.* `the foundation sits at the BOTTOM edge of its cell` - низ основания касается нижнего края клетки 60x60, пустого поля под базой нет, и линия базы одинакова во всех заполненных кадрах. Origin `(0.5, 0.82)` - это движковая точка привязки, а не инструкция художнику: художник не должен её «компенсировать», поднимая башню внутри кадра, иначе эльфийские башни повиснут над тайлом выше всех остальных.
2. *Живые фигуры.* `a single small defender figure is allowed only if it is part of the structure and never leaves it; it counts as part of the one structure in the cell` - у эльфов такая фигура есть ровно одна (лучница на Moon Archer Tower), у остальных трёх башен фигур нет вовсе. Поэтому в запретах стоит `no more than one structure per cell`, а не `no more than one subject per cell`: пристроенный защитник не считается вторым субъектом.

### Moon Archer Tower — `tower.elf.moon_archer`

| | |
| --- | --- |
| Файл | `elf_moon_archer.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | есть арт, можно перерисовать |
| Роль в игре | Базовая одиночная башня (archetype single), 50 золота, бьёт по одной цели, быстрая и лёгкая - должна читаться как стрелковая вышка на дереве, а не как крепость |

```text
A 5-column x 3-row sprite sheet for a 2D tower defense game: 15 cells, each cell one 60x60 pixel-art frame, transparent background.

STYLE (identical in every cell): HD pixel art, 16-bit era JRPG / Warcraft III custom-map feel. Crisp pixel clusters, clean 1px dark outline around the whole structure, limited palette, soft dithered shading, subtle rim light from the upper left. Dark fantasy, muted saturation, strong value contrast so the shape reads against dark mossy-green ground. Not vector art, not smooth digital painting, not a 3D render, not chibi-cute.

PALETTE (elf faction only): moonlit green #6bbf89, silver, pale birch and living pale wood, teal glow, deep moss green, grey-green weathered stone. Teal-green light is the only strongly saturated colour; everything else stays muted.

CAMERA (identical in every cell): three-quarter top-down view, slightly above and in front of the structure. The structure is centred in its cell, drawn at exactly the same scale and the same angle in every populated cell, and the foundation sits at the BOTTOM edge of its cell - the lowest pixels of the base touch the bottom edge of the cell, no empty margin is left underneath, and that base line is at exactly the same height in every populated cell. Never change the camera, never change the scale, never crop any part of the structure.

SUBJECT: an elven moon-archer post - a small living tree growing out of a mossy stone foundation, its thick boughs forming a raised firing platform with a wooden railing. Silver filigree traces the trunk, a silver crescent-moon emblem hangs at the front of the platform, glowing teal motes drift around the leaves. A slender elven archer in a hooded moss-green cloak stands on the platform with a silver longbow. The tower attacks; it is not a passive aura tower.

FIGURES: a single small defender figure is allowed only if it is part of the structure and never leaves it; it counts as part of the one structure in the cell. This tower has exactly one such figure - the archer. She stands on the platform in every populated cell, in the same spot and at the same scale, never on the ground, never beside the tower, never a second character.

CELL CONTENTS, left to right, top to bottom:
Row 1, cell 1 - BUILD 1: only the mossy stone foundation ring with a few sprouting roots, no tree yet.
Row 1, cell 2 - BUILD 2: half built - a young trunk risen from the foundation, bare boughs, unfinished wooden platform, no railing, no archer, no glow.
Row 1, cell 3 - BUILD 3: the finished tower - full foliage, platform with railing, silver crescent emblem, archer standing ready with the bow lowered.
Row 1, cell 4 - IDLE 1: the finished tower at rest, teal motes low around the leaves, cloak hanging still.
Row 1, cell 5 - IDLE 2: the same finished tower, second frame of a two-frame breathing loop - leaves shifted a couple of pixels, motes risen higher and brighter, crescent emblem glowing a touch stronger, cloak swayed slightly. Structure otherwise identical to cell 4 so the two frames loop smoothly.
Row 2, cell 1 - ATTACK 1 (wind-up): the archer draws the silver bow, an arrow of teal moonlight forming on the string, the crescent emblem flaring bright.
Row 2, cell 2 - ATTACK 2 (release): the bowstring snaps forward, a bright teal muzzle flash of moonlight at the bow, the arrow just leaving the frame to the right.
Row 2, cell 3 - ATTACK 3 (recoil / return): the archer's arms settling back, bow tilted down, a fading teal afterglow, leaves shaken.
Row 2, cell 4 - EMPTY: fully transparent, nothing drawn at all.
Row 2, cell 5 - HIT REACTION: the finished tower exactly as in cell 3 but flashed red-hot, as if struck - the whole structure tinted hot red-orange, outline glowing, a few bark splinters and leaves knocked loose. Same pose and same silhouette as cell 3.
Row 3, cell 1 - SELL 1: the tower collapsing - trunk cracked and leaning, platform breaking apart, boughs falling, motes going out.
Row 3, cell 2 - SELL 2: the aftermath - a low pile of broken stone, snapped branches and moss on the ground, no standing structure, a couple of dying teal sparks.
Row 3, cell 3 - PROJECTILE: no tower in this cell. A single silver arrow flying to the RIGHT, centred in the cell, about 20x20 px of content, with a short teal light trail behind it.
Row 3, cell 4 - IMPACT EFFECT: no tower in this cell. A soft teal starburst - a radial four-point moonlight star with thin spokes and a few sparks, centred in the cell, about 20x20 px of content, the burst that appears on the target when the arrow lands.
Row 3, cell 5 - EMPTY: fully transparent, nothing drawn at all.

SILHOUETTE: the frame will be displayed in game at roughly 42x42 px, so the read must be instant - wide dark mossy base sitting flat on the bottom edge, narrow trunk, one clear horizontal platform line with the small archer figure above it. Keep detail coarse enough to survive that downscale.

LABELS: cell labels ("build 1", "idle 2", "projectile", ...) may be printed only OUTSIDE the cells, in the sheet margins. Never place text inside a cell or over the artwork.

DO NOT: no text or watermarks inside the artwork cells, no drop shadows on the background, no background gradients, no ground plane or terrain under the foundation, no empty margin under the foundation and no structure floating above the bottom edge of the cell, no more than one structure per cell (the attached archer counts as part of that structure, not as a second subject), no change of camera angle or scale between cells, no cropping of the subject, no cell borders drawn over the art.
```

**На что смотреть при приёмке:** основание и ствол дерева должны стоять на одной линии во всех 11 «структурных» кадрах, и низ фундамента обязан касаться нижнего края клетки - если под базой остаётся пустая полоска или башня «прыгает» между idle и attack, лист брак. Кадры 5-7 (attack) обязаны отличаться только луком, руками и вспышкой, а не наклоном всего дерева; лучница нигде не сходит с площадки.

### Wisp Bloom — `tower.elf.wisp_bloom`

| | |
| --- | --- |
| Файл | `elf_wisp_bloom.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Башня по площади (archetype splash), 75 золота, урон по площади вокруг цели, медленный тяжёлый выстрел - должна читаться как большой раскрывающийся цветок, а не как вышка |

```text
A 5-column x 3-row sprite sheet for a 2D tower defense game: 15 cells, each cell one 60x60 pixel-art frame, transparent background.

STYLE (identical in every cell): HD pixel art, 16-bit era JRPG / Warcraft III custom-map feel. Crisp pixel clusters, clean 1px dark outline around the whole structure, limited palette, soft dithered shading, subtle rim light from the upper left. Dark fantasy, muted saturation, strong value contrast so the shape reads against dark mossy-green ground. Not vector art, not smooth digital painting, not a 3D render, not chibi-cute.

PALETTE (elf faction only): moonlit green #6bbf89, silver, pale birch and living pale wood, teal glow, deep moss green, grey-green weathered stone. Teal-green light is the only strongly saturated colour; everything else stays muted.

CAMERA (identical in every cell): three-quarter top-down view, slightly above and in front of the structure. The structure is centred in its cell, drawn at exactly the same scale and the same angle in every populated cell, and the foundation sits at the BOTTOM edge of its cell - the lowest pixels of the base touch the bottom edge of the cell, no empty margin is left underneath, and that base line is at exactly the same height in every populated cell. Never change the camera, never change the scale, never crop any part of the structure.

SUBJECT: a wisp bloom - one huge luminous flower growing out of a broad mossy tree stump. The stump is the foundation: dark wet bark, thick moss, small pale mushrooms and roots. From it rises a short green stalk carrying an oversized bell-shaped blossom with pale silver-green petals and a glowing teal core. Two or three small green-teal wisps orbit the blossom, glowing pollen drifts upward. The tower attacks; it is not a passive aura tower.

FIGURES: a single small defender figure is allowed only if it is part of the structure and never leaves it; it counts as part of the one structure in the cell. This tower carries no such figure - no elf stands on it or beside it, and the orbiting wisps are formless motes of light, not characters.

CELL CONTENTS, left to right, top to bottom:
Row 1, cell 1 - BUILD 1: only the mossy stump foundation with a tiny closed bud in its centre, no stalk.
Row 1, cell 2 - BUILD 2: half built - the stalk grown to full height, the blossom still a closed grey-green bud, no wisps, no glow.
Row 1, cell 3 - BUILD 3: the finished tower - the blossom fully open, teal core lit, petals spread, one wisp orbiting.
Row 1, cell 4 - IDLE 1: the finished tower at rest, petals slightly closed inward, core dim, wisps low near the stalk.
Row 1, cell 5 - IDLE 2: the same finished tower, second frame of a two-frame breathing loop - petals opened a couple of pixels wider, core pulsing brighter, wisps risen to the other side of the blossom, a few extra pollen motes. Structure otherwise identical to cell 4 so the two frames loop smoothly.
Row 2, cell 1 - ATTACK 1 (wind-up): the petals fold inward and the core compresses into a small blindingly bright teal point, pollen sucked in toward it, wisps pulled close.
Row 2, cell 2 - ATTACK 2 (release): the petals snap wide open, the core spits a glowing wisp orb out to the right with a bright teal flash and a spray of pollen.
Row 2, cell 3 - ATTACK 3 (recoil / return): the stalk bent slightly back from the release, petals drooping outward, core fading, loose pollen still drifting.
Row 2, cell 4 - EMPTY: fully transparent, nothing drawn at all.
Row 2, cell 5 - HIT REACTION: the finished tower exactly as in cell 3 but flashed red-hot, as if struck - the whole structure tinted hot red-orange, outline glowing, two petals torn and pollen knocked loose. Same pose and same silhouette as cell 3.
Row 3, cell 1 - SELL 1: the tower collapsing - the stalk snapped, blossom tipping over and losing petals, wisps scattering and going dark.
Row 3, cell 2 - SELL 2: the aftermath - a low pile of split stump wood, scattered wilted petals and moss on the ground, no standing structure, a couple of dying teal sparks.
Row 3, cell 3 - PROJECTILE: no tower in this cell. A single floating wisp orb travelling to the RIGHT, centred in the cell, about 20x20 px of content - a bright teal-green core, a soft luminous halo and a short wispy tail streaming behind it.
Row 3, cell 4 - IMPACT EFFECT: no tower in this cell. A wide radial pollen-and-light burst - an expanding ring of teal-green light with glowing pollen specks flung outward, centred in the cell, about 20x20 px of content, the burst that appears on the target when the orb lands. It must read as an AREA explosion, clearly wider and softer than a single-target hit.
Row 3, cell 5 - EMPTY: fully transparent, nothing drawn at all.

SILHOUETTE: the frame will be displayed in game at roughly 42x42 px, so the read must be instant - wide dark stump sitting flat on the bottom edge, thin stalk, one big round bright blossom on top. The blossom must be the widest lit shape in the frame so the tower is instantly told apart from the archer post. Keep detail coarse enough to survive that downscale.

LABELS: cell labels ("build 1", "idle 2", "projectile", ...) may be printed only OUTSIDE the cells, in the sheet margins. Never place text inside a cell or over the artwork.

DO NOT: no text or watermarks inside the artwork cells, no drop shadows on the background, no background gradients, no ground plane or terrain under the foundation, no empty margin under the foundation and no structure floating above the bottom edge of the cell, no more than one structure per cell (attached parts and orbiting wisps count as part of that structure, not as a second subject), no change of camera angle or scale between cells, no cropping of the subject, no cell borders drawn over the art.
```

**На что смотреть при приёмке:** цветок должен быть заметно шире и ярче кроны лунного лучника - именно по «жирной светящейся шапке» игрок узнаёт сплэш. Пень обязан касаться нижнего края клетки во всех 11 «структурных» кадрах, иначе башня повиснет над тайлом. Кадр 13 обязан выглядеть как площадное облако, а не как точечная искра.

### Moonwell — `tower.elf.moonwell`

| | |
| --- | --- |
| Файл | `elf_moonwell.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Замедляющая башня (archetype frost), 70 золота, слабый урон и замедление цели на 35% - должна читаться как холодный светящийся бассейн, «ледяная» башня фракции |

```text
A 5-column x 3-row sprite sheet for a 2D tower defense game: 15 cells, each cell one 60x60 pixel-art frame, transparent background.

STYLE (identical in every cell): HD pixel art, 16-bit era JRPG / Warcraft III custom-map feel. Crisp pixel clusters, clean 1px dark outline around the whole structure, limited palette, soft dithered shading, subtle rim light from the upper left. Dark fantasy, muted saturation, strong value contrast so the shape reads against dark mossy-green ground. Not vector art, not smooth digital painting, not a 3D render, not chibi-cute.

PALETTE (elf faction only): moonlit green #6bbf89, silver, pale birch and living pale wood, teal glow, deep moss green, grey-green weathered stone - plus, for this tower only, a cold pale moon-blue for the water and its light.

CAMERA (identical in every cell): three-quarter top-down view, slightly above and in front of the structure, so the water surface inside the basin is visible as an ellipse. The structure is centred in its cell, drawn at exactly the same scale and the same angle in every populated cell, and the foundation sits at the BOTTOM edge of its cell - the lowest pixels of the base touch the bottom edge of the cell, no empty margin is left underneath, and that base line is at exactly the same height in every populated cell. Never change the camera, never change the scale, never crop any part of the structure.

SUBJECT: an elven moonwell - a circular basin of carved grey-green stone, mossy at the base, filled with glowing pale blue water. Silver runes are cut into the rim and glow faintly; cold mist spills over the edge and pools around the foundation. Behind the basin stands a slim broken stone arch holding a silver crescent that catches the light, so the tower is not just a flat disc. The tower attacks; it is not a passive aura tower.

FIGURES: a single small defender figure is allowed only if it is part of the structure and never leaves it; it counts as part of the one structure in the cell. This tower carries no such figure - no elf, priestess or spirit stands in the water or beside the basin; the basin, the mist and the arch are the whole subject.

CELL CONTENTS, left to right, top to bottom:
Row 1, cell 1 - BUILD 1: only the mossy stone foundation ring, empty and dry, no water, no arch.
Row 1, cell 2 - BUILD 2: half built - the basin walls raised and the rim carved but unpolished, runes not yet lit, a shallow puddle of dark water, the arch half erected without the crescent.
Row 1, cell 3 - BUILD 3: the finished tower - basin full of glowing pale blue water, silver runes lit, mist spilling over the rim, crescent mounted in the arch.
Row 1, cell 4 - IDLE 1: the finished tower at rest, water surface calm, runes dim, a thin veil of mist.
Row 1, cell 5 - IDLE 2: the same finished tower, second frame of a two-frame breathing loop - the water surface rippled a couple of pixels, runes glowing brighter, mist risen higher, crescent gleaming stronger. Structure otherwise identical to cell 4 so the two frames loop smoothly.
Row 2, cell 1 - ATTACK 1 (wind-up): the water pulls into a rising dome in the centre of the basin, runes flaring bright blue, mist sucked inward.
Row 2, cell 2 - ATTACK 2 (release): a droplet of moonwater launches out to the right in a bright pale blue flash, the water surface torn open, spray flying.
Row 2, cell 3 - ATTACK 3 (recoil / return): the surface splashing back and settling, concentric ripples inside the basin, runes fading, extra mist rolling over the rim.
Row 2, cell 4 - EMPTY: fully transparent, nothing drawn at all.
Row 2, cell 5 - HIT REACTION: the finished tower exactly as in cell 3 but flashed red-hot, as if struck - the whole structure including the water tinted hot red-orange, outline glowing, a chunk of the rim chipped and water slopping over. Same pose and same silhouette as cell 3.
Row 3, cell 1 - SELL 1: the tower collapsing - the basin cracked open, water draining out through the break, arch toppling, runes going dark.
Row 3, cell 2 - SELL 2: the aftermath - a low pile of broken carved stone and moss on wet ground, no standing structure, no water left, a couple of dying pale blue sparks.
Row 3, cell 3 - PROJECTILE: no tower in this cell. A single droplet of glowing moonwater travelling to the RIGHT, centred in the cell, about 20x20 px of content - a teardrop of luminous pale blue liquid with a short misty trail and one or two small trailing droplets.
Row 3, cell 4 - IMPACT EFFECT: no tower in this cell. A pale blue ripple ring - a flat expanding circle of cold light with a second thinner ring inside it and a few sharp frost motes flicking outward, centred in the cell, about 20x20 px of content, the burst that appears on the target when the droplet lands. It must read as COLD and flat, not as fire or explosion.
Row 3, cell 5 - EMPTY: fully transparent, nothing drawn at all.

SILHOUETTE: the frame will be displayed in game at roughly 42x42 px, so the read must be instant - the basin alone is too flat to recognise, so the standing stone arch with the silver crescent must break the outline upward while the mossy foot of the basin sits flat on the bottom edge, and the glowing water must be the brightest area in the frame. The tower must be readable as "cold glowing pool" at that size. Keep detail coarse enough to survive the downscale.

LABELS: cell labels ("build 1", "idle 2", "projectile", ...) may be printed only OUTSIDE the cells, in the sheet margins. Never place text inside a cell or over the artwork.

DO NOT: no text or watermarks inside the artwork cells, no drop shadows on the background, no background gradients, no ground plane or terrain under the foundation, no empty margin under the foundation and no structure floating above the bottom edge of the cell, no more than one structure per cell (basin, mist and arch are one structure, not several subjects), no change of camera angle or scale between cells, no cropping of the subject, no cell borders drawn over the art.
```

**На что смотреть при приёмке:** холодный голубой должен быть только в воде, свечении рун и снаряде - если он растекается по мху и камню, башня теряет эльфийскую идентичность. Проверить, что арка с полумесяцем даёт вертикаль: без неё в 42x42 колодец превращается в пятно. Мшистое подножие бассейна во всех 11 «структурных» кадрах стоит ровно на нижнем крае клетки, без просвета под ним.

### Thorn Spire — `tower.elf.thorn_spire`

| | |
| --- | --- |
| Файл | `elf_thorn_spire.png` |
| Лист | 300x180 (15 слотов 60x60) |
| Статус | нужен арт |
| Роль в игре | Ядовитая башня (archetype poison), 65 золота, слабый удар, но стакающийся яд, игнорирующий броню - должна читаться как злая колючая игла, самая тёмная башня эльфов |

```text
A 5-column x 3-row sprite sheet for a 2D tower defense game: 15 cells, each cell one 60x60 pixel-art frame, transparent background.

STYLE (identical in every cell): HD pixel art, 16-bit era JRPG / Warcraft III custom-map feel. Crisp pixel clusters, clean 1px dark outline around the whole structure, limited palette, soft dithered shading, subtle rim light from the upper left. Dark fantasy, muted saturation, strong value contrast so the shape reads against dark mossy-green ground. Not vector art, not smooth digital painting, not a 3D render, not chibi-cute.

PALETTE (elf faction only): moonlit green #6bbf89, silver, pale birch and living pale wood, teal glow, deep moss green, grey-green weathered stone - plus, for this tower only, a sickly violet used sparingly in the blossoms and the venom glow.

CAMERA (identical in every cell): three-quarter top-down view, slightly above and in front of the structure. The structure is centred in its cell, drawn at exactly the same scale and the same angle in every populated cell, and the foundation sits at the BOTTOM edge of its cell - the lowest pixels of the base touch the bottom edge of the cell, no empty margin is left underneath, and that base line is at exactly the same height in every populated cell. Never change the camera, never change the scale, never crop any part of the structure.

SUBJECT: a thorn spire - a twisted spire of living bramble coiling around a narrow mossy stone core. Long dark barbed thorns bristle outward all the way up, small violet-green blossoms open between them, thick vines wrap the base and grip the foundation stones. A faint violet-green venom glow seeps from the thorn tips. The tower attacks; it is not a passive aura tower.

FIGURES: a single small defender figure is allowed only if it is part of the structure and never leaves it; it counts as part of the one structure in the cell. This tower carries no such figure - no elf, no creature and no face in the bramble; the spire alone is the subject.

CELL CONTENTS, left to right, top to bottom:
Row 1, cell 1 - BUILD 1: only the mossy stone foundation with the stub of the stone core and a few creeping vines starting to climb it.
Row 1, cell 2 - BUILD 2: half built - the stone core risen to full height, vines coiled halfway up, short soft thorns, no blossoms, no glow.
Row 1, cell 3 - BUILD 3: the finished tower - vines covering the whole core, long hard barbed thorns bristling, violet-green blossoms open, faint venom glow at the tips.
Row 1, cell 4 - IDLE 1: the finished tower at rest, thorns lowered slightly, blossoms half closed, glow dim.
Row 1, cell 5 - IDLE 2: the same finished tower, second frame of a two-frame breathing loop - vines flexed a couple of pixels, thorns bristling a little higher, blossoms opened wider, venom glow pulsing brighter with one or two drips forming. Structure otherwise identical to cell 4 so the two frames loop smoothly.
Row 2, cell 1 - ATTACK 1 (wind-up): the spire coils and leans back, a long thorn at the top swelling and dripping violet venom, all blossoms flaring.
Row 2, cell 2 - ATTACK 2 (release): the spire whips forward and hurls the thorn out to the right, a short violet-green flash and a spray of venom droplets at the launch point.
Row 2, cell 3 - ATTACK 3 (recoil / return): the vines uncoiling back to rest, the top of the spire still quivering, one broken thorn stub, venom dripping down the stalk.
Row 2, cell 4 - EMPTY: fully transparent, nothing drawn at all.
Row 2, cell 5 - HIT REACTION: the finished tower exactly as in cell 3 but flashed red-hot, as if struck - the whole structure tinted hot red-orange, outline glowing, several thorns snapped off and petals knocked loose. Same pose and same silhouette as cell 3.
Row 3, cell 1 - SELL 1: the tower collapsing - the stone core cracking, vines tearing away and whipping loose, thorns scattering, blossoms wilting.
Row 3, cell 2 - SELL 2: the aftermath - a low pile of broken stone, dead tangled bramble and shed thorns on the ground, no standing structure, a couple of dying violet sparks.
Row 3, cell 3 - PROJECTILE: no tower in this cell. A single dark barbed thorn flying to the RIGHT, point forward, centred in the cell, about 20x20 px of content, with a thin violet-green venom trail behind it.
Row 3, cell 4 - IMPACT EFFECT: no tower in this cell. A violet-green venom splash - an irregular splatter of glowing venom with three or four small thorn fragments flung outward, centred in the cell, about 20x20 px of content, the burst that appears on the target when the thorn lands. It must read as WET and toxic, not as fire and not as a clean radial star.
Row 3, cell 5 - EMPTY: fully transparent, nothing drawn at all.

SILHOUETTE: the frame will be displayed in game at roughly 42x42 px, so the read must be instant - a narrow spiky vertical mass on a small dark base that sits flat on the bottom edge, with the barbs breaking the outline so the shape looks jagged and hostile even when the details blur. It must never be mistaken for the round blossom of the wisp tower. Keep detail coarse enough to survive the downscale.

LABELS: cell labels ("build 1", "idle 2", "projectile", ...) may be printed only OUTSIDE the cells, in the sheet margins. Never place text inside a cell or over the artwork.

DO NOT: no text or watermarks inside the artwork cells, no drop shadows on the background, no background gradients, no ground plane or terrain under the foundation, no empty margin under the foundation and no structure floating above the bottom edge of the cell, no more than one structure per cell (vines, thorns and blossoms are part of that structure, not extra subjects), no change of camera angle or scale between cells, no cropping of the subject, no cell borders drawn over the art.
```

**На что смотреть при приёмке:** колючки должны рвать контур - если силуэт получился гладким, башня читается как обычное дерево и её путают с лунным лучником. Фиолетовый допустим только в цветках, яде и следе снаряда, всё остальное - мох и тёмный камень. Основание с лозами обязано касаться нижнего края клетки во всех 11 «структурных» кадрах, чтобы шпиль не подпрыгивал относительно соседних башен.

---

## Приложение

### Палитры рас

| Раса | Ключевой цвет | Материалы и акценты |
| --- | --- | --- |
| Нежить | `#5c8cff` холодный сине-фиолетовый | костяная слоновая кость, некротический фиолет, кровавый красный, потемневшая бронза |
| Орки | `#d97b39` ржаво-оранжевый | вороненое железо, тёмная кожа и верёвка, угольно-красные всполохи, костяные тотемы |
| Люди | `#5e94d6` стальной синий | серый тёсаный камень, полированная сталь, золотая окантовка, тёмно-красные полотнища |
| Эльфы | `#6bbf89` лунно-зелёный | серебро, светлое живое дерево, бирюзовое свечение, мох |

Эти же цвета игра использует для тинта заглушек и акцентов в интерфейсе, поэтому арт,
собранный в этих палитрах, совпадёт с UI без подгонки.

### Чек-лист приёмки листа

- [ ] Геометрия ровно та: `128×32` для крипа, `300×180` для башни.
- [ ] Фон полностью прозрачный, подписей и рамок внутри кадров нет.
- [ ] Масштаб, ракурс и направление света одинаковые во всех кадрах.
- [ ] Крип смотрит вправо; ноги (или высота зависания) на одной линии во всех кадрах.
- [ ] У башни основание прижато к низу кадра, слоты 8 и 14 пустые.
- [ ] Слот 12 — только снаряд, слот 13 — только вспышка, башни в этих кадрах нет.
- [ ] Силуэт читается в уменьшении: крип 28×28, башня ~42×42.
- [ ] Цикл ходьбы замыкается: 4-й кадр стыкуется с 1-м без рывка.

### Нюансы, о которых стоит знать

- **Слот 9 против слота 8.** Код берёт кадр реакции на удар из слота 9, а два уже
  нарисованных листа держат позу удара в слоте 8 и оставляют 9 пустым. Новый арт
  делаем по контракту из этого файла (поза в 9, слот 8 пустой); расхождение в старых
  листах заведено багом `tower-def-sal`.
- **Анимация удара пока никем не запускается** — она зарегистрирована, но геймплей её
  не вызывает. Кадр всё равно нужен: включать анимацию будем по этому же багу.
- **Крипы других рас сейчас берут спрайты нежити с тинтом.** Это осознанный фоллбек,
  а не заглушка «?»: пока настоящего листа нет, орк выглядит как зелёный скелет.
  После подключения арта фоллбек отключается правкой `getSpriteKeyByUnit`.
- **Звуковые стингеры эффектов** (`combat.effect_applied.*`) ждут wav-файлов и висят в
  `PENDING_SOUND_ASSETS` — к спрайтам отношения не имеют, но это второй незакрытый
  ассет-долг.
