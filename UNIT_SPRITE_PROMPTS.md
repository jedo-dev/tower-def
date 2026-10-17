# Промпты GPT Image: недостающие спрайты существ (24 шт.)

В игре 32 существа, листы есть у 8 (нежить T1–T3 и орки T1–T4). Ниже один общий
блок стиля и 24 блока по существам. Для каждого существа промпт = **ОБЩИЙ БЛОК +
блок существа**, склеенные подряд. Размер генерации 1024×1024.

Генератор возвращает контактный лист 4×4 на ровной мадженте; в лист игры его
режет скрипт (кадры 32×32, ряды: вниз, вбок, вверх, смерть):

```bash
python tools/build-sprite-sheet.py raw.png src/shared/sprite/<unit_id>.png --grid 4x4 --cell 32 --normalize-rows 0,1,2
```

Подключение ключа описано в `docs/09-sprite-prompts.md` → «Как подключить готовый арт».
Летающие существа рисуются так же, их ряд смерти — падение.

---

## ОБЩИЙ БЛОК (вставлять первым, без изменений)

```
A 16-frame character sprite CONTACT SHEET for a 2D tower defense game, laid out as a strict 4x4 grid of equal square cells on a flat solid magenta (#FF00FF) background.

STYLE: HD pixel art in the 16-bit era JRPG / Warcraft III style — crisp pixel clusters, one clean 1px near-black outline around the whole silhouette, a strictly limited palette of 12–16 colours, soft dithered shading, a subtle cool rim light from the upper left. Dark fantasy mood, muted saturation, strong value contrast so the shape reads against dark brown dirt. NOT vector, NOT smooth digital painting, NOT a 3D render, NOT chibi, NOT anime lineart.

CAMERA: 3/4 top-down RPG view (about 30° from above), identical scale, angle and eye level in all 16 cells, feet on one shared baseline per row, the subject centred in its cell with a small empty margin; nothing cropped, including weapons and wings.

ROWS, top to bottom, each row a seamless 4-frame loop (frames 1–4 left to right, frame 4 flows back into frame 1):
ROW 1 — WALK TOWARD THE VIEWER (facing down): contact, passing, mirrored contact, mirrored passing.
ROW 2 — WALK TO THE RIGHT (side view, facing right): contact, passing, mirrored contact, mirrored passing.
ROW 3 — WALK AWAY FROM THE VIEWER (facing up, back visible): contact, passing, mirrored contact, mirrored passing.
ROW 4 — DEATH, not a loop: hit and recoil, collapsing, on the ground, remains fading to a few dark pixels (for fliers: stall, tumble, fall, impact remains).

RULES: exactly one subject per cell; identical palette and proportions in every cell; the same light direction everywhere; no ground plane, no cast shadow, no glow spilling onto the background; no text, numbers, labels, frames, grid lines or watermarks inside the cells — if you label rows, put labels in the magenta margin OUTSIDE the cells. Each cell will be downscaled to 32x32 px, so keep detail bold and avoid thin lines; the silhouette must stay readable as a black shape at 28x28 px.

FACTION PALETTES (use only the faction's palette plus the subject's listed additions): UNDEAD — bone white, sickly green #8fd14f glow, dark teal-grey rags, rusted iron, near-black. ORC — rust orange #d97b39, olive-green skin, dark leather, blackened iron, red warpaint, bone beads. HUMAN — steel blue-grey plate, royal blue #6b9df5 cloth, pale gold #f0d188 trim, brown leather, warm skin. ELF — moss green, violet #a98cf5 silk, silver, pale glowing cyan #4fd9a6 accents, light wood.
```

---

## Нежить

### Abomination — `undead_abomination` (T4, большой наземный)
```
SUBJECT: UNDEAD faction. An abomination: a huge stitched-together flesh giant, lumpy bloated torso of mismatched grey-green skin held by thick black stitches and rusted hooks, a tiny head sunk between massive shoulders, one arm ending in a rusted cleaver, the other in a hooked chain, guts spilling from a belly seam. Additions: bruised purple flesh, dull brass hook. SIZE: fills 85–90% of the cell, the widest body in the undead set. GAIT: slow lurching plod, heavy sway, chain dragging. DEATH: bursts at the seams and slumps into a dark heap. SILHOUETTE: a bulging oval with a cleaver spike on one side.
```

### Necromancer — `undead_necromancer` (T5, наземный, заклинатель)
```
SUBJECT: UNDEAD faction. A gaunt necromancer in a tattered hooded dark-teal robe, skeletal hands, a tall bone staff topped with a skull that glows sickly green, a spellbook chained to the belt, face shadowed under the hood with two faint green eye points. Additions: faint green spell glow on the staff only. SIZE: fills 70–75% of the cell, thin. GAIT: gliding shuffle, robe trailing, staff tapping the ground every other step. DEATH: staff falls first, robe collapses empty to the ground. SILHOUETTE: a narrow tall cone with a staff rising above the head.
```

### Banshee — `undead_banshee` (T5, летающий)
```
SUBJECT: UNDEAD faction. A banshee: a floating spectral woman, upper body of pale translucent blue-white mist, long streaming hair and torn veil flowing behind, no legs — the lower body dissolves into wisps, mouth open in a wail, hollow glowing eyes. Additions: pale ghost blue #86ccff, translucency suggested by dithering. SIZE: fills 70–80% of the cell, hovering with the wisps above the baseline. MOTION: slow drifting bob, hair and veil trailing against the direction of travel. DEATH: the wail breaks, the figure stretches upward and scatters into fading motes. SILHOUETTE: a teardrop with trailing streamers.
```

### Frost Wyrm — `undead_frost_wyrm` (T6, большой летающий)
```
SUBJECT: UNDEAD faction. A frost wyrm: a skeletal dragon, exposed ribcage and spine, tattered membrane wings of pale blue-white ice, a horned skull with icy blue glowing eye sockets, frost crystals on the bones, a long bony tail. Additions: ice blue #86ccff, frost white. SIZE: fills 90% of the cell with wings spread, the largest undead creature. MOTION: slow powerful wingbeats, wings up / mid / down / mid across the four frames, body level. DEATH: wings fold, it tumbles and shatters into bone shards and ice. SILHOUETTE: a wide winged X with a long tail.
```

## Орки

### Peon — `orc_peon` (T1, наземный)
```
SUBJECT: ORC faction. A lazy orc peon: shorter and scrawnier than a grunt, hunched, olive skin, a ragged brown loincloth, a heavy wooden-handled pickaxe over one shoulder, a bundle of lumber strapped to his back, big ears, sleepy small eyes. Additions: raw timber brown. SIZE: fills 65–70% of the cell, clearly shorter than the grunt. GAIT: shuffling trudge, head bobbing, pickaxe swaying. DEATH: drops the lumber, sits down and keels over. SILHOUETTE: a small hunched bean with a pickaxe spike above the shoulder.
```

### Shaman — `orc_shaman` (T5, наземный, заклинатель)
```
SUBJECT: ORC faction. An orc shaman: lean, draped in a wolf-pelt mantle with the wolf head as a hood, bone-and-feather necklaces, a gnarled totem staff with a crackling blue lightning orb on top, rust-orange sash, warpaint spirals. Additions: lightning blue #5c8cff on the orb only. SIZE: fills 72–78% of the cell. GAIT: light steady stride, staff planted every step, feathers swaying. DEATH: lightning orb flickers out, he drops to his knees and falls forward. SILHOUETTE: a tall thin figure with a wide pelt collar and a staff orb above.
```

### Wind Rider — `orc_wind_rider` (T5, летающий)
```
SUBJECT: ORC faction. A wind rider: a lean orc on a wyvern — a dark olive-brown wyvern with bat-like leathery wings, a long barbed tail curled behind, a saddle of rust-orange cloth and leather, the orc rider leaning forward with a short spear. Additions: dark bronze wyvern scales. SIZE: fills 85–90% of the cell with wings spread, above the baseline. MOTION: wingbeats up / mid / down / mid, the tail trailing. DEATH: the wyvern folds a wing, spirals and crashes, rider thrown. SILHOUETTE: a winged diamond with a small rider hump and a trailing tail.
```

### Tauren — `orc_tauren` (T6, большой наземный)
```
SUBJECT: ORC faction. A tauren: a massive bull-headed minotaur, brown fur, huge curved horns, a broad bare chest with tribal rust-orange paint, a leather kilt with bone trim, an enormous totem log held in both hands, hooves. Additions: dark umber fur, cream horn. SIZE: fills 88–92% of the cell, the tallest and widest orc. GAIT: slow heavy stomp, shoulders rolling, totem swaying. DEATH: staggers, drops the totem and falls face-down with a thud. SILHOUETTE: a broad block with two horn spikes and a thick log.
```

## Люди

### Militia — `human_militia` (T1, наземный)
```
SUBJECT: HUMAN faction. A militiaman: a stocky villager in a padded gambeson with a blue tabard over it, a round wooden shield with a faded gold emblem, a short sword, a simple iron kettle helmet, brown boots. SIZE: fills 70–75% of the cell. GAIT: brisk determined march, shield held forward. DEATH: shield drops, he falls backward. SILHOUETTE: a compact figure with a round shield disc on one side.
```

### Peasant — `human_peasant` (T1, наземный)
```
SUBJECT: HUMAN faction. A peasant: thin, in a brown tunic and hood, a pitchfork over the shoulder, a sack of grain on the back, bare forearms, rope belt. Additions: straw yellow. SIZE: fills 65–70% of the cell, the smallest human. GAIT: hurried scurry, slightly stooped under the sack. DEATH: pitchfork flies, he crumples. SILHOUETTE: a small stooped figure with a long thin fork line above.
```

### Footman — `human_footman` (T2, наземный)
```
SUBJECT: HUMAN faction. A footman: full steel plate armour with blue-and-gold trim, a tall kite shield with a gold lion emblem, a longsword, a closed helmet with a blue plume, confident upright stance. SIZE: fills 75–80% of the cell. GAIT: steady armoured march, shield raised, sword resting on the shoulder. DEATH: he drops to one knee, the shield tips, he falls sideways. SILHOUETTE: an armoured rectangle with a tall shield slab and a plume.
```

### Rifleman — `human_rifleman` (T3, наземный)
```
SUBJECT: HUMAN faction. A dwarven rifleman: short and broad, a big braided red-brown beard, a leather tricorn-like cap with goggles, a long brass-fitted blunderbuss rifle held across the chest, a powder horn and ammo bandolier, blue coat. Additions: brass, powder-horn cream. SIZE: fills 65–70% of the cell, short and wide. GAIT: rolling stomp, rifle bobbing. DEATH: rifle falls, he topples backward with a puff of smoke. SILHOUETTE: a wide low block with a long rifle line across it.
```

### Siege Engine — `human_siege_engine` (T4, большой наземный, машина)
```
SUBJECT: HUMAN faction. A steam siege engine: a riveted steel-and-wood armoured tank on four iron-shod wheels, a short cannon barrel in front, a smokestack puffing grey steam, blue banner on a small pole, gold rivets. Additions: iron black, oak brown. SIZE: fills 85–90% of the cell, wide and low. MOTION: wheels turning (spoke positions rotate across the four frames), slight rattle, steam puffs changing. DEATH: boiler bursts, it tips onto one side in smoke and splinters. SILHOUETTE: a low wide box with a stack on top and a barrel in front.
```

### Knight — `human_knight` (T5, наземный, всадник)
```
SUBJECT: HUMAN faction. A knight on an armoured warhorse: white-grey horse in blue barding with gold trim, the knight in full plate with a lance couched and a kite shield, a helmet with a blue plume. Additions: white horse, blue barding. SIZE: fills 85–90% of the cell, long. GAIT: canter — the four frames are a horse gallop cycle (gather, extend, suspension, landing), the lance level. DEATH: the horse rears and goes down, the knight thrown. SILHOUETTE: a long horse body with a rider hump and a lance line forward.
```

### Sorceress — `human_sorceress` (T5, наземный, заклинатель)
```
SUBJECT: HUMAN faction. A sorceress: a slender woman in a flowing violet-blue robe with gold trim, a tall pointed hood, a crystal staff with a floating glowing blue orb, pale skin, white gloves. Additions: arcane blue #5c8cff glow on the orb only. SIZE: fills 72–78% of the cell, thin. GAIT: graceful gliding steps, robe swaying, orb bobbing. DEATH: orb shatters, she sinks down into the pooling robe. SILHOUETTE: a narrow cone with an orb above the head.
```

### Gryphon Rider — `human_gryphon_rider` (T6, летающий)
```
SUBJECT: HUMAN faction. A gryphon rider: a tawny-brown gryphon with an eagle head and wide feathered wings, a dwarf rider in blue with a storm hammer raised, a blue saddle blanket with gold trim. Additions: tawny brown, eagle white head, hammer steel. SIZE: fills 88–92% of the cell with wings spread. MOTION: wingbeats up / mid / down / mid, the lion tail trailing. DEATH: wings fold, it spins and crashes, feathers scattering. SILHOUETTE: a wide feathered W with a small rider on top.
```

## Эльфы

### Archer — `elf_archer` (T1, наземный)
```
SUBJECT: ELF faction. A night-elf archer: tall and slim, violet-grey skin, long pale teal hair in a ponytail, light moss-green leather armour, a recurve bow of pale wood, a quiver, soft boots. SIZE: fills 72–78% of the cell, slim. GAIT: light quick stride, bow carried in one hand. DEATH: she staggers and falls, the bow dropping. SILHOUETTE: a thin figure with a tall bow arc at one side.
```

### Wisp — `elf_wisp` (T1, парящий)
```
SUBJECT: ELF faction. A wisp: a small floating ball of pale glowing cyan-white light with a soft core and three short trailing light ribbons, no face, no body. Additions: cyan #4fd9a6 core, white halo. SIZE: fills 45–55% of the cell, hovering above the baseline. MOTION: gentle bob and ribbon drift across the four frames. DEATH: it flares, splits into sparks and fades. SILHOUETTE: a small circle with short tails.
```

### Huntress — `elf_huntress` (T3, наземный, всадница)
```
SUBJECT: ELF faction. A huntress riding a black panther: the panther sleek and low with glowing green eyes, the night-elf rider in violet and silver light armour holding a crescent moon glaive, hair streaming. Additions: panther black, silver glaive. SIZE: fills 85–88% of the cell, long and low. GAIT: panther run cycle (gather, extend, suspension, landing), glaive raised. DEATH: the panther stumbles and both go down. SILHOUETTE: a low long cat body with a rider and a crescent above.
```

### Dryad — `elf_dryad` (T3, наземный)
```
SUBJECT: ELF faction. A dryad: a centaur-like forest spirit, the lower body a slender deer with moss-green hide and small hooves, the upper body a violet-skinned elf woman with antlers of pale wood, a short thorn spear, leaves and vines wrapping the torso. Additions: antler wood, leaf green. SIZE: fills 80–85% of the cell. GAIT: light trotting deer cycle. DEATH: legs fold, she sinks and leaves scatter. SILHOUETTE: a deer body with a tall upper torso and antler spikes.
```

### Chimera — `elf_chimera` (T4, большой летающий)
```
SUBJECT: ELF faction. A chimera: a two-headed dragon-like beast, dark green-grey scales with violet membrane wings, two long serpentine necks with fanged heads, one mouth dripping green acid, a thick tail. Additions: acid green #8fd14f drips, violet wing membrane. SIZE: fills 90% of the cell with wings spread. MOTION: wingbeats up / mid / down / mid, the heads weaving. DEATH: wings collapse, it tumbles and crashes in a splash of acid. SILHOUETTE: a winged mass with two neck spikes forward.
```

### Druid of the Claw — `elf_druid_of_the_claw` (T5, большой наземный)
```
SUBJECT: ELF faction. A druid in bear form: a massive dark-brown bear with glowing green runes on the shoulders, a moss-and-leaf harness, silver claw tips, standing on all fours, heavy head low. Additions: dark bear brown, rune green #8fd14f. SIZE: fills 85–90% of the cell, wide. GAIT: heavy bear lope, shoulders rolling. DEATH: it rears, collapses onto its side and goes still. SILHOUETTE: a wide humped mass with a low head.
```

### Hippogryph — `elf_hippogryph` (T5, летающий)
```
SUBJECT: ELF faction. A hippogryph: a slender winged creature with a stag-like body, an eagle-like head with violet-white feathers, wide feathered wings, antler-like crest, hooves tucked under in flight, a thin elf-silver harness. Additions: white and violet feathers. SIZE: fills 85–90% of the cell with wings spread. MOTION: wingbeats up / mid / down / mid, elegant and quick. DEATH: a wing crumples, it dives and crashes with feathers scattering. SILHOUETTE: a slim winged V with a long neck forward.
```

### Mountain Giant — `elf_mountain_giant` (T6, большой наземный)
```
SUBJECT: ELF faction. A mountain giant: a towering humanoid made of grey-brown rock and moss, a small head, huge boulder shoulders, moss and small trees growing on the back, one fist dragging an uprooted tree trunk as a club. Additions: granite grey, moss green. SIZE: fills 92% of the cell, the biggest elf unit. GAIT: ponderous earth-shaking steps, trunk dragging. DEATH: cracks spread across the body and it crumbles into a pile of boulders. SILHOUETTE: a tall heavy block with a thick club line to one side.
```
