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
| `health` | yes | Hit points at spawn, before difficulty scaling. |
| `speed` | yes | Path speed multiplier. `1.0` is the baseline step rate. |
| `armor` | yes | Armor points. Each point removes a share of a direct hit (see `shared/constants/damage.ts`); damage over time ignores armor. |
| `damage` | yes | Damage the creature deals; reserved for duel pressure. |
| `rewardGold` | yes | Gold the defender earns for the kill. |
| `spriteKey` | yes | Art key, `unit.<race>.<name>`. Missing art falls back to a placeholder. |
| `description` | no | Flavour text. Cosmetic only. |
| `moveType` | no | `ground` (default) or `air`. |
| `sizeClass` | no | `small`, `medium` (default) or `large`. |
| `armorType` | no | `unarmored`, `light` (default) or `heavy`. Shifts effective armor points. |

Unknown fields are rejected: add the field to the schema first
(`src/entities/unit/model/content/unitContent.types.ts`), then to content.

## Balance-sensitive vs cosmetic

**Balance-sensitive:** `tier`, `health`, `speed`, `armor`, `rewardGold`,
`armorType`. Changing these changes how a wave plays.

**Cosmetic:** `name`, `description`, `spriteKey`, `sizeClass`.

`tier` is the one field that does double duty: it decides how much of the wave
budget a creature consumes and what it costs to send in duel mode. A cheap
tier with heavy stats makes waves that cannot be answered.

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
| Undead | Wide spread, the only race with tiers 5 and 6. |
| Orc | Bulkiest and slow, with the wolf rider as the fast outlier. |
| Human | The armored race, slowest on average. |
| Elf | Fastest and frailest, with the chimera as its heavy straggler. |

Every race also keeps an internal fast-and-frail outlier: the fastest creature
in a roster must have less health than the slowest one.

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

## Where the code lives

| Concern | File |
| --- | --- |
| Schema and bounds | `src/entities/unit/model/content/unitContent.types.ts` |
| Validation primitives | `src/shared/lib/content/contentValidation.ts` |
| Creature loader | `src/entities/unit/model/content/loadUnitContent.ts` |
| Registered content files | `src/entities/unit/model/content/unitContentSources.ts` |
| Roster lookups | `src/entities/unit/model/registry.ts` |

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

Sheets are horizontal strips of equal frames.

**Creeps** - `32x32` per frame, at least 4 frames:

| Frames | Meaning |
| --- | --- |
| 0-3 | walk cycle (loops) |

**Towers** - `60x60` per frame, 14 frames:

| Frames | Meaning |
| --- | --- |
| 0-2 | build |
| 3-4 | idle (loops) |
| 5-7 | attack |
| 9 | hit reaction |
| 10-11 | sell |
| 12 | projectile |
| 13 | attack impact effect |

Frame counts live in `PLACEHOLDER_UNIT_FRAME_COUNT` and
`PLACEHOLDER_TOWER_FRAME_COUNT`; the placeholder is generated with exactly
these frames so animation code needs no special case.

## Switching a placeholder off

1. Drop the file in the location above.
2. Register it in `src/shared/constants/sprites.ts`: add the key to
   `UNIT_SPRITE_KEYS` / `TOWER_SPRITE_KEYS` and the file to
   `UNIT_SPRITE_ASSETS` / `TOWER_SPRITE_ASSETS`.
3. Make sure the content `spriteKey` matches the registered key exactly.

That is all: the sprite resolver
(`shared/lib/phaser/runtime/assets/spriteKeyResolver.ts`) prefers real art
whenever the texture is registered, so the placeholder disappears with no other
code change.

## Finding what is still missing

In development, every fallback is logged once as
`[assets] tower art missing, drawing placeholder: <key>` and collected in the
missing-art report (`getMissingArtReport()`), which also names the content ids
that referenced the key. Production installs no listener and collects nothing.

## Pending audio

Sound follows the same idea: ids listed in `PENDING_SOUND_ASSETS`
(`shared/lib/phaser/sound/audio.constants.ts`) are skipped by the preloader and
stay silent until their wav lands. See `docs/SOUND_ASSET_LIST.md`.
