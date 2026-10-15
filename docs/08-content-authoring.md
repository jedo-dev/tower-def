# Content Authoring

Creature stats are **data, not code**. They live in JSON under `src/content/`
and are validated when the module loads, so a typo fails the build instead of
producing an unbeatable wave.

```txt
src/content/
  units/
    undead.json
    orc.json
    human.json
    elf.json
```

## Creature file format

```json
{
  "schemaVersion": 1,
  "race": "UNDEAD",
  "units": [
    {
      "id": "undead_ghoul",
      "name": "Ghoul",
      "tier": 1,
      "health": 80,
      "speed": 1.95,
      "armor": 0,
      "damage": 14,
      "rewardGold": 7,
      "sizeClass": "small",
      "armorType": "unarmored",
      "spriteKey": "unit.undead.ghoul",
      "description": "Feral clawed scavenger that outruns slow defenses."
    }
  ]
}
```

### File fields

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Must match `UNIT_CONTENT_SCHEMA_VERSION`. Bumped when the format changes. |
| `race` | One of `UNDEAD`, `ORC`, `HUMAN`, `ELF`. Every unit id must start with the lowercase race prefix. |
| `units` | Non-empty list of creatures. |

### Creature fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Must be listed in `UNIT_IDS` (`src/entities/unit/model/types.ts`). |
| `name` | yes | Shown in the HUD and wave preview. |
| `tier` | yes | 1 to 6. Drives wave budget and duel send cost, **not** the stats. |
| `health` | yes | Hit points at spawn in wave 1. Every creep, baseline or sent, grows by `WAVE_HEALTH_GROWTH` per wave after that (`entities/wave/model/waveBalance.ts`). |
| `speed` | yes | Path speed multiplier. `1.0` is the baseline step rate. |
| `armor` | yes | Armor points. Each point removes a share of a direct hit (see `shared/constants/damage.ts`); damage over time ignores armor. |
| `damage` | yes | Damage the creature deals; reserved for duel pressure. |
| `rewardGold` | yes | Gold the defender earns for the kill. |
| `spriteKey` | yes | Art key, `unit.<race>.<name>`. Missing art falls back to a placeholder. |
| `description` | no | One-line flavour text for the HUD and wave preview. Cosmetic only. |
| `lore` | no | Bestiary text, one or two sentences in the race's voice, at most `CONTENT_LORE_MAX_LENGTH` (160) characters. Cosmetic only; the loader rejects longer text. |
| `moveType` | no | `ground` (default) or `air`. Air creatures ignore the maze: they fly the straight line from the entrance to the exit at their own speed, towers never block them, and only towers whose `allowedTargets` is `air` or `both` can shoot them. A flier costs `WAVE_AIR_UNIT_BUDGET_MULTIPLIER` times its tier value of the wave budget (`entities/wave/model/waveBalance.ts`). |
| `sizeClass` | no | `small`, `medium` (default) or `large`. |
| `armorType` | no | `unarmored`, `light` (default) or `heavy`. Shifts effective armor points. |

Unknown fields are rejected: add the field to the schema first
(`src/entities/unit/model/content/unitContent.types.ts`), then to content.

## Balance-sensitive vs cosmetic

**Balance-sensitive:** `tier`, `health`, `speed`, `armor`, `rewardGold`,
`armorType`, `moveType`. Changing these changes how a wave plays.

**Cosmetic:** `name`, `description`, `lore`, `spriteKey`, `sizeClass`.

## Lore voice

Every creature and tower carries a `lore` line; the bestiary shows it under the
portrait. Write it in the race's voice, in English, and keep it under the limit:

| Race | Voice |
| --- | --- |
| Undead | Cold, necromantic, patient; the dead as a resource. |
| Orc | Brutal, tribal, blunt; the horde speaks in short sentences. |
| Human | Disciplined, martial, institutional; rosters, drills, bells. |
| Elf | Lyrical, forest-bound; moonlight, groves, the long memory of trees. |

## Tier display values

A roster screen shows what a tier costs to send, what income it grants, how
many of one type fit in a wave and from which baseline wave the tier appears.
Read all four through `getSendTierDisplay(tier)` / `listSendTierDisplays()`
(`entities/duel-match/model/sendEconomyDisplay.ts`); they resolve the balance
tables in `entities/duel-match/model/balance.ts` and
`entities/wave/model/waveBalance.ts`, so no screen keeps a copy of a number.

```ts
getSendTierDisplay(UnitTier.TIER_1);
// { tier: 1, sendCostGold: 50, incomeBonusGold: 10, sendCapPerType: 6, baselineUnlockWave: 1 }
```

`tier` is the one field that does double duty: it decides how much of the wave
budget a creature consumes, from which wave the baseline may field it
(`WAVE_TIER_UNLOCK_WAVE`) and what it costs to send in duel mode. A cheap tier
with heavy stats makes waves that cannot be answered.

## Stat guard rails

Two layers of bounds apply:

- **Schema bounds** (`UNIT_STAT_BOUNDS`) reject impossible values at load time.
- **Design bounds** (`src/shared/test/contentGuards.test.ts`) reject values
  that are technically valid but unplayable.

Both fail loudly and name the file and creature id.

## Race identity

Each race is meant to read differently, and the tests enforce it
(`src/entities/unit/model/config/raceIdentity.test.ts`):

| Race | Identity |
| --- | --- |
| Undead | Wide spread: the frail ghoul, the armored crypt fiend, the flying gargoyle, the hulking abomination. |
| Orc | Bulkiest and slow, with the wolf rider as the fast outlier. |
| Human | The armored race, slowest on average. |
| Elf | Fastest and frailest, with the chimera as its heavy straggler. |

Identity is measured over tiers 1 to 4. Every race fields the same roster
shape (tower-def-xwc.2): two tier-1 creatures, one each of tiers 2 to 4, two
tier-5 creatures and one tier-6, with at least one flyer and one large creature
per race. Tiers 5 and 6 follow the undead numbers (about 140-190 health at
tier 5, 300-340 at tier 6) so the late baseline waves weigh the same whichever
race the player builds.

Every race also keeps an internal fast-and-frail outlier: the fastest creature
in a roster must have less health than the slowest one.

The second tier-1 creature of orc, human and elf (peon, peasant, wisp) is
baseline-only: it is not in `sendableCreepIds`, so each race sends four creeps.
A second tier-1 send only gives the computer twelve cheap income buys a wave
(see "Roster completion" in `docs/07-duel-mode-expansion-plan.md`).

## Adding a creature

1. Add the id to `UNIT_IDS` in `src/entities/unit/model/types.ts`.
2. Add the entry to the race file in `src/content/units/`.
3. Give it a `spriteKey`. If the art does not exist yet, the placeholder
   pipeline renders it as a question mark until you register the asset.
4. If the race should be able to send it in duel mode, add the id to
   `sendableCreepIds` in `src/entities/race-registry/model/registries.ts`.
5. Run the checks below.

## Checking a change

```bash
npx vitest run
```

For a balance-affecting edit, compare simulated waves against the previous
curve:

```bash
node .artifacts/wave-balance-check.mjs
```

It prints total wave health and average speed per race for waves 1, 5, 10 and
20. Treat a swing beyond roughly 10% as a balance decision that needs a note in
the Beads task, not an accident.

For duel pacing, run `npm run sim:duel-batch` before and after the edit and
compare match length, towers at round 5 and the draw rate against the targets
in `docs/07-duel-mode-expansion-plan.md` (Duel Balance).

## Where the code lives

| Concern | File |
| --- | --- |
| Schema and bounds | `src/entities/unit/model/content/unitContent.types.ts` |
| Validation primitives | `src/shared/lib/content/contentValidation.ts` |
| Creature loader | `src/entities/unit/model/content/loadUnitContent.ts` |
| Registered content files | `src/entities/unit/model/content/unitContentSources.ts` |
| Roster lookups | `src/entities/unit/model/registry.ts` |

---

# Tower Content

Tower stats live in `src/content/towers/<race>.json` (the buildable roster of
each race) and `src/content/towers/archetypes.json` (base stats and upgrade
curves). Both files carry `schemaVersion` 2 (`TOWER_CONTENT_SCHEMA_VERSION` in
`src/entities/tower/model/content/towerContent.types.ts`).

## Tower fields

Besides the stats below, a tower entry has the same cosmetic `description` and
optional `lore` fields as a creature, with the same length limit on `lore`.

## Units

Every distance is measured in **cells of the fine grid** (20x30 at 16px per
cell). A world-space distance is `value * GRID_DIMENSIONS.cellSize`. Distances
are measured from the centre of the tower's 2x2 footprint.

| Field | Unit |
| --- | --- |
| `range` (tower, archetype and each `levels[]` entry) | cells |
| `splashRadius` | cells |
| `chain.bounceRangeCells` | cells |
| `aura.radiusCells` | cells |
| `aura.rangeBonus` | cells, added to the buffed tower's `range` |
| `attackCooldownMs`, `onHitEffects[].durationMs` | milliseconds |
| `aura.attackSpeedBonus`, `chain.damageFalloff`, chill `magnitude` | share, `0.2` = 20% |

Creature `speed` is not a cell value: it multiplies the base move speed in
pixels per second, so the grid change did not touch creature files.

## Target scope

`allowedTargets` says which creatures a tower may shoot: `ground`, `air` or
`both`. It is optional on both the archetype and the race tower entry and
defaults to `both`; a value outside the three fails on load naming the file
and the id. Today every race tower mirrors its archetype (a test enforces it):

| Archetype | `allowedTargets` | Why |
| --- | --- | --- |
| `single` | `both` | Single-target shots reach a flier. |
| `frost` | `both` | Single-target; the chill keeps fliers in range longer. |
| `poison` | `both` | Single-target flask; ticks ignore armour. |
| `splash` | `ground` | Area blast on the ground; a flier over it is untouched. |
| `chain` | `both` | Lightning arcs between creeps on either lane; the orc answer to a flock of fliers (tower-def-xwc.5). |
| `support` | `both` (omitted) | Has no attack; the scope is meaningless and left out. |

The rule of thumb: the blast stays on the ground, everything that picks a
target reaches the air. Loaders expose the resolved value on
`BuildableTowerConfig` and `TowerArchetypeDefinition` (`allowedTargets`), so a
roster view can show "targets: ground / air / both". Targeting, splash and
chain all consult it (`entities/tower/model/targeting.ts`,
`canTowerTargetCreep`). The computer opponent builds its towers from the race
entry too (`computer-opponent/model/computerTowerEntity.ts`), so a race scope
that differs from the archetype would reach both the field and the planner.

## Per-race stats

A race tower may author its own numbers for its archetype: `damage`, `range`,
`attackCooldownMs` (and `splashRadius`, `onHitEffects`) on the entry, plus a
`levels` curve. The placed tower fights with the entry's numbers
(`resolveTowerPlacementStats`) and upgrades along its own `levels` when they
are authored, the archetype curve otherwise, so **a tower whose base stats
differ from the archetype must author all its `levels`**, or the first
upgrade snaps it back to the archetype numbers. Prices stay equal per
archetype across races (a test enforces it); the per-race dial is the stats.

Today only the `single` archers differ, as the anti-air dial of
tower-def-xwc.5 (docs/07, "Air waves across races"): undead 19 / 29 / 38,
orc 21 / 31 / 42, human 25 / 37 / 50, elf on the archetype 20 / 30 / 40.

## Schema versions

| Version | Meaning |
| --- | --- |
| 1 | Retired. Distances in coarse 32px cells (10x15 grid). |
| 2 | Current. Distances in fine 16px cells: every version 1 distance doubled. |

A version 1 file fails on load with the file and its first entity id, e.g.
`content/towers/human.json [human_guard_archer_tower]: schemaVersion 1 measures
distances in coarse 32px cells; ...`. To migrate one, double every field in
the cell column above and set `schemaVersion` to 2. Schema bounds
(`TOWER_STAT_BOUNDS`, `TOWER_AURA_BOUNDS`, `TOWER_CHAIN_BOUNDS`) are expressed
in fine-grid cells too.

---

# Art Drop-In

Content can name artwork that does not exist yet. Until the file lands, the
game draws an obvious question-mark placeholder - in the scene (a dashed plate
tinted with the race colour) and in the HUD (a `?` chip). Nothing crashes and
nothing renders invisible.

## Where files go

| Kind | Location | Referenced as |
| --- | --- | --- |
| Creep sheet | `src/shared/sprite/<name>.svg` or `.png` | imported in `shared/constants/sprites.ts` |
| Tower sheet | `public/assets/towers/<name>.png` | path string in `TOWER_SPRITE_ASSETS` |

## Naming

- Sprite key: `unit.<race>.<name>` / `tower.<race>.<name>` - the same string the
  content file uses (`spriteKey`).
- Filename: `<race>_<name>.png`, lowercase with underscores.

## Frame layout

Sheets are grids of equal frames, numbered left-to-right, top-to-bottom.

**Creeps** - `32x32` per frame, 16 frames in a 4x4 grid (`128x128`):

| Frames | Meaning |
| --- | --- |
| 0-3 | walk toward the viewer |
| 4-7 | walk sideways, facing right (left is mirrored in code) |
| 8-11 | walk away from the viewer |
| 12-15 | death |

Sheets with only 4 frames are the old contract: they still animate, but the creep rotates on
vertical path segments instead of turning, and death falls back to an alpha fade.

**Towers** - `60x60` per frame, 15 slots in a 5x3 grid (`300x180`), numbered
left-to-right, top-to-bottom (the prompts in `docs/09` use the same slot numbers):

| Slot | Meaning |
| --- | --- |
| 0-2 | build |
| 3-4 | idle (loops) |
| 5-7 | attack |
| 8 | empty |
| 9 | hit reaction (optional) |
| 10-11 | sell |
| 12 | projectile |
| 13 | attack impact effect |
| 14 | empty |

The contract lives in `TOWER_SHEET_CONTRACT_FRAMES`. A shipped sheet that
deviates from it declares its real slots in `TOWER_SHEET_FRAME_LAYOUTS`
(`shared/constants/sprites.ts`) - check the art, never assume. Today:

- `tower.undead.bone_archer` (legacy) draws its hit reaction in slot 8; slots 9
  and 14 are empty.
- `tower.elf.moon_archer` has no hit-reaction pose (slots 8, 9 and 14 empty), so
  its layout sets `hitReaction: null`.

A sheet without a hit-reaction pose plays its first idle frame instead, so the
reaction never shows a blank slot. The placeholder follows the contract.

Frame counts live in `PLACEHOLDER_UNIT_FRAME_COUNT` and
`PLACEHOLDER_TOWER_FRAME_COUNT`; the placeholder is generated with exactly
these frames so animation code needs no special case.

## Generating the missing art

Ready-to-paste image-generation prompts for every creep and tower live in
`docs/09-sprite-prompts.md` - one self-contained prompt per sprite, with the frame
layout, palette and style rules already baked in.

## Switching a placeholder off

1. Drop the file in the location above.
2. Register it in `src/shared/constants/sprites.ts`: add the key to
   `UNIT_SPRITE_KEYS` / `TOWER_SPRITE_KEYS` and the file to
   `UNIT_SPRITE_ASSETS` / `TOWER_SPRITE_ASSETS`.
3. Make sure the content `spriteKey` matches the registered key exactly.

That is all: the sprite resolver
(`features/game-engine/runtime/assets/spriteKeyResolver.ts`) prefers real art
whenever the texture is registered, so the placeholder disappears with no other
code change.

## Finding what is still missing

In development, every fallback is logged once as
`[assets] tower art missing, drawing placeholder: <key>` and collected in the
missing-art report (`getMissingArtReport()`), which also names the content ids
that referenced the key. Production installs no listener and collects nothing.

## Pending audio

Sound follows the same idea: ids listed in `PENDING_SOUND_ASSETS`
(`shared/lib/sound-registry/audio.constants.ts`) are skipped by the preloader and
stay silent until their wav lands. See `docs/SOUND_ASSET_LIST.md`.

---

# Sound Profiles

Which clip a tower or creature plays is authored data, like its stats. Clips
are registered once in code; profiles in `src/content/audio/` pick them.

```txt
src/content/audio/
  default.json        complete fallback, every slot set
  races/
    undead.json       race-wide and per-archetype sounds
    orc.json
    human.json
    elf.json
```

## Clips and ids

A sound id (`SOUND_IDS` in `src/shared/types/sound-ids.ts`) names exactly one
clip, and every clip has its own file (`SOUND_CLIPS` in
`src/shared/lib/sound-registry/registry/`). Two ids never point at the same file;
a test enforces it. When two races should sound alike, their profiles name the
same id, so the sharing is visible in content instead of hidden in a path map.

## Slots

| Slot | Played when | Resolved by |
| --- | --- | --- |
| `attack` | a tower fires | tower |
| `impact` | a tower shot lands on its primary target | tower |
| `build` | a tower is placed | tower |
| `sell` | a tower is sold | tower |
| `upgrade` | a tower levels up | tower |
| `creepHit` | a creature takes a tower hit (throttled) | creature race |
| `creepDeath` | a creature dies | creature race |
| `creepEscape` | a creature reaches the exit | creature race |

UI, economy, wave and status-effect cues are not slots: they sound the same for
every race and are played by id.

## Fallback order

For a tower slot the first match wins:

1. the tower's own `sounds` entry in `src/content/towers/<race>.json`,
2. the race profile's `archetypes.<archetype>` entry,
3. the race profile's race-wide `sounds`,
4. the default profile's `archetypes.<archetype>` entry,
5. the default profile's `sounds` (always set).

A tower's race is the race of its content file. Creature slots use the
creature's race profile, then the default.

## File format

```json
{
  "schemaVersion": 1,
  "race": "ORC",
  "sounds": {
    "build": "combat.build.orc",
    "creepDeath": "combat.creep_death.orc"
  },
  "archetypes": {
    "chain": { "attack": "combat.attack.chain.orc" }
  }
}
```

`default.json` has the same shape without `race`, and its `sounds` must set
every slot. Archetype entries accept tower slots only.

A tower override sits on the tower entry:

```json
{
  "id": "orc_lightning_totem",
  "archetype": "chain",
  "sounds": { "attack": "combat.attack.chain.orc" }
}
```

## Validation

Profiles load and validate with the module, like stats. Each of these fails
fast, naming the file and the race, archetype (`ORC/chain`) or tower id:

- an unknown sound id, e.g. `content/audio/races/orc.json [ORC/chain]:
  "attack" names an unknown sound id "combat.zap"`,
- an unknown slot, archetype or field,
- a creature slot on an archetype entry or tower,
- a default profile missing a slot,
- a race with no profile file, or two files for one race.

## Giving a race or tower its own sound

1. Create the clip: add a recipe for it (see `docs/SOUND_ASSET_LIST.md`) or
   drop an authored wav under `public/assets/audio/sfx/<category>/`.
2. Register the id in `SOUND_IDS` and its clip (file, volume, cooldown) in the
   matching file under `src/shared/lib/sound-registry/registry/`.
3. Point the profile at it: race-wide in `sounds`, for one archetype under
   `archetypes`, or for a single tower in that tower's `sounds`.
4. Run `npm run check`.

## Where the code lives

| Concern | File |
| --- | --- |
| Ids and slots | `src/shared/types/sound-ids.ts` |
| Clip registry | `src/shared/lib/sound-registry/registry/` |
| Profile schema and loader | `src/entities/sound-profile/model/` |
| Resolver | `src/entities/sound-profile/model/resolveSound.ts` |
| Game wiring | `src/features/game-engine/runtime/audio/gameSoundRouting.ts` |
