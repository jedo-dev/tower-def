# Промпты GPT Image: ворота входа (IN) и выхода (OUT) под каждую расу

Ворота стоят на краю поля и могут смотреть в любую из четырёх сторон: вход
сверху / снизу / слева / справа, выход так же. Поэтому на расу нужен ОДИН лист
4×2: четыре ориентации × (IN, OUT). Ячейка квадратная, ворота занимают 2×2 клетки
поля (в игре 32×32 px при клетке 16 px; рисуем крупно, ужмём).

Генерация 1024×512 (или 1024×1024 с пустым низом), ровный фон маджента
`#FF00FF`, подписи только СНАРУЖИ ячеек. Режем скриптом:

```bash
python tools/build-sprite-sheet.py raw.png public/assets/terrain/<race>/gates.png --grid 4x2 --cell 64
```

Порядок ячеек: ряд 1 = IN (вверх, вправо, вниз, влево), ряд 2 = OUT (вверх,
вправо, вниз, влево). «Вверх» означает, что ворота стоят на ВЕРХНЕМ краю поля и
существа идут из них ВНИЗ (для IN) или входят в них снизу (для OUT).

---

## ОБЩИЙ БЛОК (вставлять первым)

```
A sprite CONTACT SHEET of battlefield gates for a 2D tower defense game, top-down 3/4 RPG view (about 30° from above), laid out as a strict grid of 4 columns × 2 rows of equal square cells on a flat solid magenta (#FF00FF) background. Each cell holds exactly ONE gate structure, centred, with a small empty margin, nothing cropped.

ROW 1 — ENTRANCE gates ("IN"): an open portal that creatures walk OUT of. Column 1: the gate stands on the TOP edge of the battlefield, its opening faces DOWN toward the viewer. Column 2: the gate stands on the RIGHT edge, opening faces LEFT. Column 3: the gate stands on the BOTTOM edge, opening faces UP (we see its back side and roof). Column 4: the gate stands on the LEFT edge, opening faces RIGHT.
ROW 2 — EXIT gates ("OUT"): the same four orientations (top/facing down, right/facing left, bottom/facing up, left/facing right), but the exit is a darker, more ominous structure that swallows creatures; it is lit from inside in a warning red-orange, while the entrance is lit in the faction's own colour.

The eight gates are the SAME two designs rotated correctly for the 3/4 top-down view: side-facing versions show the gate's flank and depth, the bottom-edge version shows its rear. All eight have identical scale, lighting (cool rim light from the upper left) and footprint: each gate fits a square footprint of two by two ground tiles and must read clearly at 32×32 px.

STYLE: HD pixel-art-friendly painted game sprite, crisp 1px dark outline, limited palette, dithered shading, dark fantasy Warcraft III mood, muted saturation, strong value contrast. No ground plane or cast shadow outside the footprint, no glow spilling onto the magenta, no text, numbers, arrows or labels INSIDE the cells (labels only in the magenta margins outside the grid), no watermark.
```

## Нежить
```
FACTION: UNDEAD. ENTRANCE: a crypt archway of cracked grey stone and bone, two skull-topped pillars, an iron portcullis raised, the opening filled with sickly green #8fd14f necro-light and drifting mist, bone ornaments and a tattered dark-teal banner. EXIT: a sunken mausoleum maw of black stone with a jagged tooth-like arch, chains, the opening glowing dull red-orange with ash sparks, a cracked bell above. Palette: ash grey, bone white, dark teal, necro green, rust iron, ember red for the exit.
```

## Орки
```
FACTION: ORC. ENTRANCE: a crude war-gate of lashed dark timber and sharpened stakes, tusked skull trophies on the posts, rust-orange #ec7048 war banner, a raised spiked log barrier, the opening lit by orange torch fire. EXIT: a burnt black-iron gate ringed with spikes and animal skulls, braziers of red-orange flame, smoke, the opening a dark pit mouth glowing red. Palette: rust orange, dark leather brown, blackened iron, bone white, ember red.
```

## Люди
```
FACTION: HUMAN. ENTRANCE: a fortified stone gatehouse with two square towers, a raised oak-and-iron portcullis, royal blue #6b9df5 banners with pale gold #f0d188 lion crests, the opening lit by a cool blue-white lantern glow. EXIT: a dark dungeon gate of blackened stone with a lowered iron grate half-open, red-orange torch light inside, cracked walls, a warning bell. Palette: steel grey stone, royal blue, pale gold, oak brown, ember red for the exit.
```

## Эльфы
```
FACTION: ELF. ENTRANCE: a living archway grown from two silver-barked trees whose branches intertwine, violet #a98cf5 leaves, hanging moon-lanterns with pale cyan #4fd9a6 glow, moss steps, the opening filled with soft moonlight. EXIT: a dark hollow in a gnarled ancient tree trunk wrapped in thorny roots, the hollow glowing red-orange with embers, fallen violet leaves, runes carved into the bark. Palette: moss green, violet, silver bark, pale cyan, ember red for the exit.
```
