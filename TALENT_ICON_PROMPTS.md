# Промпты для иконок талантов (GPT Image)

12 промптов: по 3 на каждую расу. Один промпт даёт один лист из 8 иконок в сетке 4 × 2.

- **Лист A**: ветки башен расы (4 башни × 2 ветки).
- **Лист B**: ветки существ тиров 1–3 (4 существа × 2 ветки).
- **Лист C**: ветки существ тиров 4–6 (4 существа × 2 ветки).

## Как пользоваться

1. Каждый промпт самодостаточный, копируется целиком (блок от `STYLE` до конца).
2. Размер картинки **1536 × 1024** (landscape). Сетка: 4 колонки × 2 ряда, ячейка 384 × 512.
   Каждая иконка — квадрат примерно 340 × 340, по центру своей ячейки, вокруг тёмный однотонный фон.
3. Порядок иконок в сетке: ряд 1 слева направо — позиции 1–4, ряд 2 слева направо — позиции 5–8.
   Внутри каждой пары: сначала ветка A, потом ветка B того же объекта.
4. Если генератор вписывает текст — добавить в конец `Absolutely no text, letters or numbers.` и перегенерировать.
5. После нарезки сохранить как `public/assets/ui/talents/<id>.png` (квадрат 256 × 256).
   `id` для каждой позиции указан в таблице под промптом, он совпадает с id ветки в контенте.

## Общий стиль (уже встроен в каждый промпт)

Иконки в духе талантов World of Warcraft: квадрат, тяжёлая скошенная тёмная рамка,
нарисованный от руки символ по центру, сильный контраст, читается в 48–64 пикселях.
У каждой расы свой материал рамки и палитра — это зашито в промпт расы.

---

## Нежить

Материал рамки: потемневшая кость и зелёный рунический металл.
Палитра: ядовито-зелёный, ледяной голубой, трупно-фиолетовый на почти чёрном.

### Нежить A — ветки башен

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of blackened bone and green runic metal, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: toxic green, frost blue and corpse violet on near-black. Undead necromantic mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Bone Volley — a fan of five bone arrows bursting outward from a skeletal bow.
2. Cursed Arrow — a single black arrow trailing green withering smoke, cracking a glowing magic rune on impact.
3. Plague Cloud — a swirling green poison cloud rising from a cracked cauldron, skulls in the vapour.
4. Corpse Blast — a bursting heap of bones exploding outward in a green shockwave.
5. Permafrost — a creature's silhouette locked inside a jagged block of blue ice with frost crystals.
6. Wyrm Breath — a frost wyrm's skeletal jaws exhaling a wide cone of icy breath.
7. Necromancer's Whisper — a hooded skull whispering spectral green runes that orbit a bone obelisk.
8. Soul Harvest — a scythe reaping glowing souls that turn into gold coins.
```

| Позиция | id |
|---|---|
| 1 | undead_bone_archer_tower_volley |
| 2 | undead_bone_archer_tower_cursed |
| 3 | undead_plague_tower_cloud |
| 4 | undead_plague_tower_corpse |
| 5 | undead_frost_wyrm_nest_permafrost |
| 6 | undead_frost_wyrm_nest_breath |
| 7 | undead_bone_obelisk_whisper |
| 8 | undead_bone_obelisk_harvest |

### Нежить B — ветки существ, тиры 1–3

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of blackened bone and green runic metal, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: toxic green, frost blue and corpse violet on near-black. Undead necromantic mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Bone Legion — a marching wall of identical skeleton soldiers receding into fog.
2. Reassembly — scattered bones flying back together into a standing skeleton, green energy lines connecting them.
3. Frenzy — a snarling ghoul mid-sprint with speed lines and torn chains on its ankles.
4. Devourer — a ghoul's clawed hand clutching a glowing red heart, blood-red regeneration aura.
5. Carapace — a thick segmented chitin shell of a giant spider, plates gleaming.
6. Web — a sticky spider web strung across a stone tower's arrow slit.
7. Stoneskin — a gargoyle curled into a cracked grey stone shell.
8. Dive — a gargoyle plunging downward with wings folded, wind streaks behind it.
```

| Позиция | id |
|---|---|
| 1 | undead_skeleton_bone_legion |
| 2 | undead_skeleton_reassembly |
| 3 | undead_ghoul_frenzy |
| 4 | undead_ghoul_devourer |
| 5 | undead_crypt_fiend_carapace |
| 6 | undead_crypt_fiend_web |
| 7 | undead_gargoyle_stoneskin |
| 8 | undead_gargoyle_dive |

### Нежить C — ветки существ, тиры 4–6

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of blackened bone and green runic metal, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: toxic green, frost blue and corpse violet on near-black. Undead necromantic mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Meat Mountain — a hulking stitched abomination's massive belly, crude metal plates sewn into flesh.
2. Plague Sack — a bloated green plague sac about to burst, toxic drips.
3. Raise Dead — a skeletal hand clawing up out of a grave under a green moon.
4. Soul Shield — a translucent dome of screaming spectral faces around a necromancer's staff.
5. Wail — a banshee's open screaming mouth with visible sound rings distorting the air.
6. Incorporeal — a ghostly banshee figure with an arrow passing harmlessly through her body.
7. Frost Breath — a frost wyrm skull breathing ice onto a frozen stone tower.
8. Ancient Terror — a colossal frost wyrm silhouette looming over a tiny castle gate, blue eyes glowing.
```

| Позиция | id |
|---|---|
| 1 | undead_abomination_meat_mountain |
| 2 | undead_abomination_plague_sack |
| 3 | undead_necromancer_raise_dead |
| 4 | undead_necromancer_soul_shield |
| 5 | undead_banshee_wail |
| 6 | undead_banshee_incorporeal |
| 7 | undead_frost_wyrm_frost_breath |
| 8 | undead_frost_wyrm_ancient_terror |

---

## Орки

Материал рамки: грубое чёрное железо, кожа, шипы, клыки.
Палитра: кроваво-красный, огненно-оранжевый, грозовой синий на почти чёрном.

### Орки A — ветки башен

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of crude black iron with leather straps, spikes and tusks, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: blood red, fire orange and storm blue on near-black. Brutal tribal orcish mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Spear Throwers — a bundle of crude spears launched in a rapid fan from a wooden watchtower.
2. Heavy Spear — one massive iron-tipped spear smashing through a cracked shield.
3. Napalm — burning pitch splattering across the ground, flames licking upward.
4. Mortar — a crude stone mortar barrel firing a flaming boulder in a high arc.
5. Thunderstorm — a lightning bolt jumping in a long chain between several points.
6. Thunder Strike — a single heavy lightning strike hammering down from a storm totem, ground cracking.
7. Quagmire — a black bubbling tar pool with a clawed foot sinking into it.
8. Sticky Tar — dripping black tar coating a target, with a red crosshair glow.
```

| Позиция | id |
|---|---|
| 1 | orc_spear_watchtower_throwers |
| 2 | orc_spear_watchtower_heavy |
| 3 | orc_burning_pit_napalm |
| 4 | orc_burning_pit_mortar |
| 5 | orc_lightning_totem_storm |
| 6 | orc_lightning_totem_thunder |
| 7 | orc_tar_pit_quagmire |
| 8 | orc_tar_pit_sticky |

### Орки B — ветки существ, тиры 1–3

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of crude black iron with leather straps, spikes and tusks, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: blood red, fire orange and storm blue on near-black. Brutal tribal orcish mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Rage — a roaring green orc face with blazing red eyes and a red aura.
2. Shieldbearer — a battered spiked orcish round shield deflecting arrows.
3. Workforce — a pickaxe and a sack spilling gold coins.
4. Sabotage — a pickaxe jammed into wooden tower gears, splinters flying.
5. Pack Hunters — three wolf heads howling together under a red moon.
6. Nets — a weighted rope net thrown over a tower's battlements.
7. Regeneration — a troll's arm with a wound visibly closing, green healing glow.
8. Berserker — a troll swinging twin axes in a red frenzy, sparks flying back at the viewer.
```

| Позиция | id |
|---|---|
| 1 | orc_grunt_rage |
| 2 | orc_grunt_shieldbearer |
| 3 | orc_peon_workforce |
| 4 | orc_peon_sabotage |
| 5 | orc_wolf_rider_pack_hunters |
| 6 | orc_wolf_rider_nets |
| 7 | orc_troll_regeneration |
| 8 | orc_troll_berserker |

### Орки C — ветки существ, тиры 4–6

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of crude black iron with leather straps, spikes and tusks, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: blood red, fire orange and storm blue on near-black. Brutal tribal orcish mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Tower Hunter — a red painted target mark on a stone tower, a throwing axe embedded in it.
2. Wind Walk — a faded translucent troll silhouette dashing through swirling wind.
3. Bloodlust — a shaman's fist wrapped in a crackling red aura, veins glowing.
4. Earth Lightning — lightning tearing up from cracked earth, snapping a glowing chain link.
5. Bomber — a crude bomb with a lit fuse falling from a wyvern rider.
6. Tailwind — a wyvern with wings spread riding a strong gust, wind ribbons behind.
7. Battering Ram — a tauren's horned head lowered, charging through a splintering gate.
8. Warchief — a tattered horde war banner on a spear, held high with a glowing aura.
```

| Позиция | id |
|---|---|
| 1 | orc_headhunter_tower_hunter |
| 2 | orc_headhunter_wind_walk |
| 3 | orc_shaman_bloodlust |
| 4 | orc_shaman_earth_lightning |
| 5 | orc_wind_rider_bomber |
| 6 | orc_wind_rider_tailwind |
| 7 | orc_tauren_battering_ram |
| 8 | orc_tauren_warchief |

---

## Люди

Материал рамки: полированная сталь, золотая отделка, синяя эмаль.
Палитра: королевский синий, золото, сталь, пороховой оранжевый на почти чёрном.

### Люди A — ветки башен

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of polished steel with gold trim and royal blue enamel, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: royal blue, gold, steel grey and gunpowder orange on near-black. Disciplined martial human kingdom mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Rifle Company — a row of musket barrels firing in unison, smoke clouds.
2. Crossbowmen — a heavy steel crossbow aimed upward at a flying silhouette.
3. Siege Cannon — a huge bronze cannon firing a single massive iron ball.
4. Grapeshot — a cannon mouth spraying a wide cone of small shot.
5. Plague Flasks — three bubbling green glass flasks with skull labels, vapour spilling.
6. Acid — a flask of acid melting through an iron breastplate, hissing.
7. Headquarters — a command tent with a royal blue banner and a golden aura radiating outward.
8. Treasury — an open iron-bound chest overflowing with gold coins.
```

| Позиция | id |
|---|---|
| 1 | human_guard_archer_tower_company |
| 2 | human_guard_archer_tower_crossbow |
| 3 | human_cannon_bastion_siege |
| 4 | human_cannon_bastion_grapeshot |
| 5 | human_alchemist_tower_flasks |
| 6 | human_alchemist_tower_acid |
| 7 | human_guard_post_headquarters |
| 8 | human_guard_post_treasury |

### Люди B — ветки существ, тиры 1–3

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of polished steel with gold trim and royal blue enamel, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: royal blue, gold, steel grey and gunpowder orange on near-black. Disciplined martial human kingdom mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Levy — a tight row of militia shields locked together, spears raised.
2. Torches — a burning torch held high, thick smoke billowing.
3. Tithe — a peasant's hand dropping coins into a church offering bowl.
4. Repair — a hammer and a cloth bandage over a glowing mended crack.
5. Defensive Stance — a kite shield planted in the ground with a sword behind it, blue glint.
6. Captain's Shield — an ornate gold-trimmed captain's shield turning a blow aside, sparks.
7. Long Shot — a rifle's iron sight lined up on a distant tower window.
8. Flak Vest — a riveted steel plate vest with a dented bullet mark.
```

| Позиция | id |
|---|---|
| 1 | human_militia_levy |
| 2 | human_militia_torches |
| 3 | human_peasant_tithe |
| 4 | human_peasant_repair |
| 5 | human_footman_defensive_stance |
| 6 | human_footman_captains_shield |
| 7 | human_rifleman_long_shot |
| 8 | human_rifleman_flak_vest |

### Люди C — ветки существ, тиры 4–6

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of polished steel with gold trim and royal blue enamel, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: royal blue, gold, steel grey and gunpowder orange on near-black. Disciplined martial human kingdom mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Armored Wagon — a heavily plated war wagon wheel with iron rivets.
2. Ram — an iron-capped battering ram smashing into a stone wall.
3. Paladin — a knight's gauntlet raised with radiant golden holy light.
4. Cavalry — a charging warhorse head with lowered lance, motion lines.
5. Invisibility — a sorceress's silhouette fading into shimmering blue sparkles.
6. Polymorph — a stone tower turning into a fluffy white sheep in a burst of arcane light.
7. Sky Hammer — a gryphon rider's storm hammer crackling with lightning, swung downward.
8. Assault — a gryphon diving steeply with wings swept back over a castle wall.
```

| Позиция | id |
|---|---|
| 1 | human_siege_engine_armored_wagon |
| 2 | human_siege_engine_ram |
| 3 | human_knight_paladin |
| 4 | human_knight_cavalry |
| 5 | human_sorceress_invisibility |
| 6 | human_sorceress_polymorph |
| 7 | human_gryphon_rider_sky_hammer |
| 8 | human_gryphon_rider_assault |

---

## Эльфы

Материал рамки: резное серебро и живое дерево с листьями.
Палитра: лунное серебро, изумрудный, глубокий фиолетовый, бирюзовый на почти чёрном.

### Эльфы A — ветки башен

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of carved moonlit silver intertwined with living wood and leaves, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: moon silver, emerald, deep violet and teal on near-black. Lyrical night-elf forest mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Moonfall — a rain of silver arrows falling from a crescent moon.
2. Sniper — a long elegant elven bow drawn to full with a single glowing arrow, focused eye behind it.
3. Spores — a bursting glowing violet flower releasing a cloud of spores.
4. Wild Growth — thick roots erupting from the ground and wrapping around a creature's legs.
5. Moonlight — a beam of pale moonlight pouring down from a moonwell, frost sparkles.
6. Living Water — a glowing teal water orb rising from a moonwell, ripples spreading outward.
7. Thornbite — a thorny vine with dripping green venom on its barbs.
8. Grasping Vine — a living vine shaped like a hand seizing a target.
```

| Позиция | id |
|---|---|
| 1 | elf_moon_archer_tower_moonfall |
| 2 | elf_moon_archer_tower_sniper |
| 3 | elf_wisp_bloom_spores |
| 4 | elf_wisp_bloom_growth |
| 5 | elf_moonwell_moonlight |
| 6 | elf_moonwell_living_water |
| 7 | elf_thorn_spire_thorns |
| 8 | elf_thorn_spire_vine |

### Эльфы B — ветки существ, тиры 1–3

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of carved moonlit silver intertwined with living wood and leaves, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: moon silver, emerald, deep violet and teal on near-black. Lyrical night-elf forest mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Evasion — an elven archer twisting aside as arrows miss, silver motion blur.
2. Forest Shadow — a pair of glowing eyes in a dark forest, a silhouette half hidden by leaves.
3. Firefly — a tiny glowing wisp carrying a single gold coin.
4. Detonation — a wisp bursting in a blinding teal flash.
5. Moon Blade — a crescent-shaped glaive gleaming with moonlight.
6. Owl Scout — a white owl in flight with a glowing path beneath it.
7. Spell Immunity — a dryad framed by a shimmering barrier that splinters incoming magic bolts.
8. Purify — cleansing water washing over a leaf, dark motes dissolving.
```

| Позиция | id |
|---|---|
| 1 | elf_archer_evasion |
| 2 | elf_archer_forest_shadow |
| 3 | elf_wisp_firefly |
| 4 | elf_wisp_detonation |
| 5 | elf_huntress_moon_blade |
| 6 | elf_huntress_owl_scout |
| 7 | elf_dryad_spell_immunity |
| 8 | elf_dryad_purify |

### Эльфы C — ветки существ, тиры 4–6

```
STYLE: A sheet of 8 square fantasy talent icons in the style of World of Warcraft spell and talent icons. Each icon is a hand-painted square emblem with a heavy beveled frame of carved moonlit silver intertwined with living wood and leaves, a single bold central motif, strong rim lighting, high contrast, readable at 48 pixels. Palette: moon silver, emerald, deep violet and teal on near-black. Lyrical night-elf forest mood. Layout: 1536x1024 canvas, 4 columns by 2 rows, each icon a ~340px square centered in its cell, uniform dark matte background between icons, equal gutters, nothing touching the edges. No text, no letters, no numbers, no watermark.

ICONS, row 1 left to right, then row 2 left to right:
1. Acid Breath — a chimera head breathing green acid that corrodes a tower's stone.
2. Two-Headed — a two-headed chimera, one head slumped and one still roaring.
3. Bear Form — a druid mid-transformation into a great bear, fur and claws emerging.
4. Forest Whisper — glowing green leaves swirling around a druid's open palm.
5. Whirlwind — a hippogryph spinning inside a silver whirlwind.
6. Rider — an elven rider on a hippogryph raising a leaf-shaped shield against arrows.
7. Stone Flesh — a mountain giant's fist of cracked stone with moss growing in the cracks.
8. Uprooted Tree — a giant swinging a whole uprooted tree, roots and earth flying.
```

| Позиция | id |
|---|---|
| 1 | elf_chimera_acid_breath |
| 2 | elf_chimera_two_headed |
| 3 | elf_druid_of_the_claw_bear_form |
| 4 | elf_druid_of_the_claw_forest_whisper |
| 5 | elf_hippogryph_whirlwind |
| 6 | elf_hippogryph_rider |
| 7 | elf_mountain_giant_stone_flesh |
| 8 | elf_mountain_giant_uprooted_tree |

---

## Что дальше

Когда иконки будут лежать в `public/assets/ui/talents/`, их нужно будет подключить:
окно выбора ветки, бейджи веток на башнях и существах, бестиарий. На это в Beads
ещё нет задачи — заведу, когда картинки будут готовы.
