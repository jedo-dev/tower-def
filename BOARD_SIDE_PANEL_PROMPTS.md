# Промпты GPT Image: боковые панели поля (лес/окружение) под каждую расу

Что это: поле 20×30 уже сетки холста, слева и справа остаются пустые полосы
(сейчас тёмно-синие). Их закрываем фоновым окружением расы, как на утверждённом
концепте: лес, скалы, факелы. Полоса рисуется ЗА сеткой, её ширина меняется с
зумом, поэтому арт должен быть:

- **вертикально бесшовным** (повтор по вертикали без шва);
- с **плотной деталью у внутреннего края** (который прилегает к сетке) и
  уходящим в темноту внешним краем, чтобы любая ширина обрезки выглядела цельно;
- **без текста и без ярких объектов**, которые спорят с башнями.

Генерируем на расу ОДИН лист 1024×1024: левая полоса и правая полоса рядом
(2 колонки по 512 px, каждая бесшовная по вертикали). Нарезаем пополам.
Файлы: `public/assets/terrain/<race>/side_left.webp`, `side_right.webp`.

---

## ОБЩИЙ БЛОК (вставлять первым)

```
A top-down 3/4 view environment texture for a 2D dark-fantasy tower defense game (Warcraft III mood). The image is split into exactly TWO vertical columns of equal width: the LEFT column is the scenery that lies to the LEFT of a rectangular battlefield, the RIGHT column is the scenery that lies to the RIGHT of it. Each column must TILE SEAMLESSLY VERTICALLY (its top edge continues perfectly into its bottom edge). No visible seam between repeats.

Composition rule for each column: the edge that touches the battlefield (the RIGHT edge of the left column, the LEFT edge of the right column) holds the densest, most readable detail — tree trunks, roots, rocks, a low border of the terrain — and the detail fades smoothly into near-black darkness toward the outer edge, so the strip can be cropped to any width. Keep the battlefield edge straight and clean: nothing may overhang into the battlefield area (no branches crossing the column edge).

STYLE: painted game environment, crisp readable shapes, muted saturation, strong value contrast, cool rim light from the upper left, warm accent light sources are small and few (torches, braziers, glowing runes). No characters, no towers, no creatures, no UI, no text, no watermark, no frame. Lighting and camera identical in both columns; the two columns must not be mirror copies — same place, different details.
```

## Нежить
```
RACE: UNDEAD. A blighted graveyard forest: dead black trees with twisted bare branches, grey mist drifting between gnarled roots, cracked tombstones and bone piles half-buried in grey-violet earth, patches of sickly green #8fd14f corpse-light from cracks in the ground and a single hanging green lantern per column, rusted iron fence pieces, cold blue-grey fog at the outer edge. Palette: ash grey, bone white, dark teal, necro green, near-black.
```

## Орки
```
RACE: ORC. A scorched red-rock badlands edge: dark basalt boulders and jagged orange-brown rock shelves, burnt black tree stumps, tusk-and-skull totems on crude wooden poles with rust-orange #ec7048 war banners, ember-lit fire pits and glowing cracks of lava-orange light, dry yellow grass tufts, ash haze toward the outer edge. Palette: rust orange, ember red, dark leather brown, blackened iron, ash grey.
```

## Люди
```
RACE: HUMAN. The edge of a kingdom fortress camp: cut grey stone wall sections with crenellations and gold-trimmed royal blue #6b9df5 banners, oak palisade stakes, hay bales and supply crates, iron braziers with warm orange fire, well-kept green grass and cobblestone verges, a watchtower base in each column, soft blue twilight haze outward. Palette: steel grey, royal blue, pale gold #f0d188, oak brown, grass green.
```

## Эльфы
```
RACE: ELF. An ancient moonlit forest: huge silver-barked ancient trees with violet #a98cf5 and teal leaves, moss-covered roots and stones, hanging moon-lanterns with soft cyan #4fd9a6 glow, glowing mushrooms and fireflies, a trickle of a stream with luminous water near one column's edge, deep blue-violet darkness outward. Palette: moss green, violet, silver, pale cyan, deep indigo.
```
