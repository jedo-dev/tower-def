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
| `armor` | yes | Flat damage reduction (see the damage model). |
| `damage` | yes | Damage the creature deals; reserved for duel pressure. |
| `rewardGold` | yes | Gold the defender earns for the kill. |
| `spriteKey` | yes | Art key, `unit.<race>.<name>`. Missing art falls back to a placeholder. |
| `description` | no | Flavour text. Cosmetic only. |
| `moveType` | no | `ground` (default) or `air`. |
| `sizeClass` | no | `small`, `medium` (default) or `large`. |
| `armorType` | no | `unarmored`, `light` (default) or `heavy`. |

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
