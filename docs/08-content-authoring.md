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
  "schemaVersion": 4,
  "race": "UNDEAD",
  "units": [
    {
      "id": "undead_ghoul",
      "name": "Ghoul",
      "tier": 1,
      "health": 80,
      "speed": 1.95,
      "physicalArmor": 0,
      "magicalArmor": 0,
      "damage": 14,
      "rewardGold": 7,
      "sizeClass": "small",
      "spriteKey": "unit.undead.ghoul",
      "description": "Feral clawed scavenger that outruns slow defenses.",
      "talentBranches": [
        { "id": "undead_ghoul_i", "...": "see Creature talents" },
        { "id": "undead_ghoul_ii", "...": "..." }
      ]
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
| `physicalArmor` | yes | Whole armor points, `-25` to `75`, against physical hits. See "Armor and damage types" below. |
| `magicalArmor` | yes | Whole armor points, `-25` to `75`, against magical hits and damage over time. |
| `damage` | yes | Damage the creature deals; reserved for duel pressure. |
| `rewardGold` | yes | Gold the defender earns for the kill. |
| `spriteKey` | yes | Art key, `unit.<race>.<name>`. Missing art falls back to a placeholder. |
| `description` | no | One-line flavour text for the HUD and wave preview. Cosmetic only. |
| `lore` | no | Bestiary text, one or two sentences in the race's voice, at most `CONTENT_LORE_MAX_LENGTH` (160) characters. Cosmetic only; the loader rejects longer text. |
| `moveType` | no | `ground` (default) or `air`. Air creatures ignore the maze: they fly the straight line from the entrance to the exit at their own speed, towers never block them, and only towers whose `allowedTargets` is `air` or `both` can shoot them. A flier costs `WAVE_AIR_UNIT_BUDGET_MULTIPLIER` times its tier value of the wave budget (`entities/wave/model/waveBalance.ts`). |
| `sizeClass` | no | `small`, `medium` (default) or `large`. Decides the footprint and the route a creature walks. |
| `talentBranches` | yes | Exactly two branches of grades 1-4 a side develops with experience. See "Creature talents" below. |

Unknown fields are rejected: add the field to the schema first
(`src/entities/unit/model/content/unitContent.types.ts`), then to content.

## Balance-sensitive vs cosmetic

**Balance-sensitive:** `tier`, `health`, `speed`, `physicalArmor`,
`magicalArmor`, `rewardGold`, `moveType`. Changing these changes how a wave
plays.

**Cosmetic:** `name`, `description`, `lore`, `spriteKey`, `sizeClass`.

## Armor and damage types

Every creature carries two armors and every tower deals one damage type:

| Tower `damageType` | Against |
| --- | --- |
| `physical` | the creature's `physicalArmor` |
| `magical` | the creature's `magicalArmor` |
| `percent` | no armor: `damage / 1000` of the creature's maximum health per hit |

Physical and magical hits go through one diminishing curve
(`DAMAGE_MITIGATION` in `shared/constants/damage.ts`, applied in
`entities/creep/model/damage.ts`):

```txt
factor     = |armor| * 0.06
share      = factor / (1 + factor)
armor >= 0 : damage = raw * (1 - share)      never below 10% of raw
armor <  0 : damage = raw * (1 + share)      at -25 armor, +60%
```

| Armor | Physical/magical hit lands for |
| --- | --- |
| -25 | 160% |
| -10 | 137.5% |
| 0 | 100% |
| 3 | 85% |
| 10 | 62.5% |
| 25 | 40% |
| 75 | 18% |

A `percent` tower with `damage` 30 removes 3% of maximum health with every
hit (maximum health is the wave-scaled health the creature spawned with),
whatever its armor. Damage over time (poison, burn) is magical
(`DAMAGE_OVER_TIME_DAMAGE_TYPE`), so a warded creature shrugs part of it off
and a creature with negative magical armor takes more. An on-hit effect may
type its ticks differently (see "Damage over time type" below).

Armor break lowers both armors by default; an effect definition narrows it
with `armorKind: 'physical' | 'magical' | 'both'`
(`shared/constants/effects.ts`), and a tower's on-hit entry may narrow it per
tower with the same field (see "Tower abilities"). Breaks of different kinds
run side by side; breaks of the same kind stack. Broken armor goes negative
but never below `-25`.

A vulnerability (on-hit `vulnerability`) multiplies the damage a creature
takes after armor by `1 + magnitude` per running instance whose `damageKind`
covers the hit's type, damage over time included.

## Race armor profiles

Each race leans on one armor axis, so the defender's tower mix matters per
opponent. Averages are over the whole roster (eight creatures per race) and
are recorded in `entities/unit/model/config/raceIdentity.test.ts`; change both
together.

| Race | Profile | Avg `physicalArmor` | Avg `magicalArmor` |
| --- | --- | --- | --- |
| Undead | Bones and spirits: low physical, highest magical | 1.875 | 8.625 |
| Orc | Hide and iron: highest physical, lowest magical | 5.5 | 1.625 |
| Human | Balanced; footmen, knights and siege lean physical | 5.125 | 4.0 |
| Elf | Unarmored and fey: lowest physical, mid magical | 1.125 | 5.125 |

Authoring rules the test enforces: tier 1 carries 0 to 3 on either axis, and
nothing exceeds 25 (tier 6 sits at 8 to 20 on its race's strong axis). The weak
axis may be 0 or slightly negative for unarmored or ethereal creatures (the
banshee carries -5 physical, the dryad -2). Keep the full `-25..75` range for
effects; authored values stay modest.

## Creature schema versions

| Version | Meaning |
| --- | --- |
| 1 | Retired. A single `armor` plus an `armorType` bonus (unarmored -1, light 0, heavy 2). |
| 3 | Retired. `physicalArmor` and `magicalArmor`, shared version number with towers. |
| 4 | Current. Every creature declares two `talentBranches` (grades 1-4); see "Creature talents". |

A version 1 file fails on load naming the file and its first creature. To
migrate one, set both armors to `max(0, armor + armorType bonus)` (what the
creature effectively carried before), drop `armorType`, add `talentBranches`
and set `schemaVersion` to 4. A version 3 file fails the same way
(`content/units/undead.json [undead_skeleton]: schemaVersion 3 has no talent
branches; ...`): add `talentBranches` to every creature and set
`schemaVersion` to 4. The shipped rosters were migrated exactly this way, then re-authored to
the race armor profiles above (tower-def-6nf.2).

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

## Creature talents

Design source: `docs/12-unit-talents-ru.md` ("Общие правила"). Every creature
authors two branches. A side earns **experience per tier** from its sends,
picks one branch per creature for the whole match (the other is locked) and
then buys grades 1 -> 2 -> 3 -> 4 along it. A grade applies to the creatures of
that type **sent after the purchase**; queued and walking ones keep theirs.
Experience, picks and grades are per side and per match: round settles keep
them, a restart, a faction change or a new setup starts with none.

```json
"talentBranches": [
  {
    "id": "undead_crypt_fiend_i",
    "name": "Crypt Fiend I",
    "description": "Placeholder branch: a little tougher and faster with every grade.",
    "grades": [
      { "level": 1, "health": 113, "speed": 1.1, "physicalArmor": 4, "magicalArmor": 7 },
      { "level": 2, "health": 122, "speed": 1.15, "physicalArmor": 4, "magicalArmor": 8 },
      { "level": 3, "health": 130, "speed": 1.2, "physicalArmor": 4, "magicalArmor": 9 },
      { "level": 4, "health": 139, "speed": 1.25, "physicalArmor": 4, "magicalArmor": 10,
        "abilities": {} }
    ]
  },
  { "id": "undead_crypt_fiend_ii", "...": "..." }
]
```

| Field | Rule |
| --- | --- |
| `id` | Starts with the creature id and `_`; the two ids differ. Errors name `file [unitId/branchId]`. |
| `name`, `description` | Non-empty; shown by the send panel's develop chooser. |
| `grades` | Exactly levels 1, 2, 3, 4 in that order. |
| grade `health`, `speed`, `physicalArmor`, `magicalArmor` | Required, same bounds as the creature's own. Health is the wave 1 value; wave growth still applies on spawn. |
| grade `abilities` | Optional typed creature abilities object (`entities/unit/model/abilities.ts`); unknown keys fail on load. Empty until the creature abilities land. |

A grade replaces the four stats (and the abilities) of the sent creature;
tier, reward, size, move type and send price stay. Grade 0 is the authored
creature. docs/12 caps grade 4 health at +40% of the base; a content test
enforces it.

**Experience** (`CreatureXpRewards` in `src/shared/constants/creatureTalents.ts`),
credited to the sender at the round settle:

| Sent creature on the other field | Experience to its tier |
| --- | --- |
| died | 1 x tier |
| leaked | 3 x tier |
| leaked and took a life | +2 |

A leak "took a life" while the defender still had one: the first
`livesTaken` leaks of the round in field order (`countLivesTakenBySends`)
get the bonus. Deaths are tallied as they happen (the scene drops a corpse
long before the settle) and leaks read from the field at the settle
(`settleRound(..., sentOutcomes)`, `entities/duel-match/model/creatureXp.ts`);
the headless duel simulation passes the same outcomes. Baseline creeps earn
nothing. A sent creep carries `sender` and `sentTier` from its spawn.

**Price ladder** (`CreatureTalentPricing`), experience of the creature's tier,
multiplied by the tier; content never prices a grade:

| Step | Branch | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- | --- |
| Experience | 4 x tier | 6 x tier | 10 x tier | 16 x tier | 26 x tier |

**Grade at send time.** Sends are queued in the build phase but spawn at wave
start, so a send snapshots the creature grade when it is queued
(`DuelistState.sendQueueGrades`, index for index with `sendQueue`) and spawns
at it (`resolveQueuedSendUnits`, used by the scene for both fields and by the
headless simulation). The chosen branch is fixed for the match, so the grade
alone pins the stats.

**Rules** (`src/entities/unit/model/talents.ts`): `canChooseCreatureBranch`
refuses with `unknown_branch`, `already_chosen` or `not_enough_xp`;
`canUpgradeCreature` with `no_branch`, `max_grade` or `not_enough_xp`.
`chooseCreatureBranch` / `upgradeCreature` check, spend and record on a
`CreatureTalentLedger` (`creatureXpByTier`, `creatureBranchChoices`,
`creatureGrades`); `resolveCreatureStatsForGrade` / `applyCreatureGrade` read
the stats. The duel state wraps them per side (`recordCreatureBranchChoice`,
`recordCreatureUpgrade`).

**Bridge.** Commands `choose-creature-branch { unitId, branchId }` and
`upgrade-creature { unitId }` (any phase of a running match, the player's
sendable creatures only; a refusal plays the error sound). The HUD snapshot
carries `creatureXpByTier`, `creatureBranchChoices` and `creatureGrades`;
each unit of `send-limits-updated` carries `availableBranches`,
`branchCostXp`, `grade` and `nextUpgradeCostXp` (`null` at grade 4). The
computer earns experience but spends none yet.

**Shipped branches** are placeholders ("<Name> I" and "<Name> II": +8% health,
+0.05 speed and +1 armor on the race's strong axis per grade; magical for
undead and elves, physical for orcs and humans) until the docs/12 branches
are authored.

## Adding a creature

1. Add the id to `UNIT_IDS` in `src/entities/unit/model/types.ts`.
2. Add the entry to the race file in `src/content/units/`, with its two
   `talentBranches`.
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
| Talent branch parser | `src/entities/unit/model/content/creatureTalentContent.ts` |
| Talent rules | `src/entities/unit/model/talents.ts` |
| Experience accrual | `src/entities/duel-match/model/creatureXp.ts` |
| Registered content files | `src/entities/unit/model/content/unitContentSources.ts` |
| Roster lookups | `src/entities/unit/model/registry.ts` |

---

# Tower Content

Tower stats live in `src/content/towers/<race>.json` (the buildable roster of
each race) and `src/content/towers/archetypes.json` (base stats and upgrade
curves). Both files carry `schemaVersion` 4 (`TOWER_CONTENT_SCHEMA_VERSION` in
`src/entities/tower/model/content/towerContent.types.ts`).

## Tower fields

Besides the stats below, a tower entry has the same cosmetic `description` and
optional `lore` fields as a creature, with the same length limit on `lore`.

## Damage type

Every archetype declares `damageType`: `physical`, `magical` or `percent`
(see "Armor and damage types" above). A race tower inherits it and may
override it with its own `damageType`; a value outside the three fails on load
naming the file and the id. Combat resolves the type once per attack
(`resolveTowerDamageType`, `entities/tower/model/damageType.ts`), a roster
view reads it through `resolveBuildableTowerDamageType`.

| Archetype | `damageType` |
| --- | --- |
| `single`, `splash`, `chain` | `physical` |
| `frost`, `poison`, `support` | `magical` |

Shipped race towers (`entities/tower/model/damageType.test.ts` pins this
table; overrides are in bold):

| Race | Single | Splash | Frost | Poison | Chain | Support |
| --- | --- | --- | --- | --- | --- | --- |
| Undead | Bone Archer `physical` | Plague Tower **`magical`** | Frost Wyrm Nest `magical` | | | Bone Obelisk `magical` |
| Orc | Spear Watchtower `physical` | Burning Pit `physical` | Tar Pit `magical` | | Lightning Totem **`magical`** | |
| Human | Guard Archer `physical` | Cannon Bastion `physical` | | Alchemist Tower `magical` | | Guard Post `magical` |
| Elf | Moon Archer `physical` | Wisp Bloom **`magical`** | Moonwell `magical` | Thorn Spire **`percent`** | | |

Every race fields at least one physical and one magical damage tower.

### Damage over time type

Poison and burn ticks are magical unless the on-hit effect says otherwise: an
`onHitEffects` entry of a damage-over-time effect may declare `damageType`
(`physical`, `magical` or `percent`). A type on a slow, stun or armor break
fails on load. With `percent`, `magnitude` is per mille of maximum health per
tick per stack, like a percent hit.

The type belongs to the effect entry, not to the tower, so a race tower whose
poison differs from its archetype authors its own `levels` with the typed
effect at every level (the archetype curve would bring back magical poison on
upgrade). Thorn Spire does this: hits and poison ticks of 6, 7 and 8 per mille
(0.6% to 0.8% of maximum health) at levels 1 to 3, stacking 3, 4 and 4 times
(tower-def-6nf.4 capped level 3 at 4). When two towers poison the
same creep, the latest application sets the tick type, as it sets the
remaining duration.

## Tower abilities

Optional mechanics for talent grades (tower-def-bge.2). Any `levels[]` entry
of an archetype or race tower (levels 1 to 7) may carry an `abilities` object;
talent grade objects reuse the same field names. Every field is optional and
absent means the ability is off: a tower without the object fights exactly as
before. Values are validated on load (`TOWER_ABILITY_BOUNDS`,
`entities/tower/model/content/towerAbilities.types.ts`) and fail naming the
file and tower. Level 1 abilities come with the placed tower; an upgrade
brings the next level's object (or none).

| `abilities` field | Value | Effect |
| --- | --- | --- |
| `critEveryNthShot` | whole, 2-20 | Every Nth shot of the tower is critical. A per-tower counter, not a roll, so the headless duel stays deterministic. Needs `critMultiplier`. |
| `critMultiplier` | 1-10 | Damage multiplier of a critical shot (every hit of that shot: splash, arcs, extra targets, pierce). |
| `extraTargets` | whole, 1-6 | A single-target shot also hits this many other valid creeps in range, nearest the tower first (ties by id). |
| `extraTargetDamageShare` | 0-1 | Share of the shot each extra target takes; 1 when omitted. Needs `extraTargets`. |
| `pierceLine` | 0-1 | Share of the shot dealt to every other valid creep whose centre is within 0.5 cells of the line from the tower to the target. |
| `airDamageMultiplier` | 0-5 | Damage multiplier against fliers. |
| `groundDamageMultiplier` | 0-5 | Damage multiplier against ground creeps. |
| `fullHealthBonusMultiplier` | 0-5 | Damage multiplier against a creep still at full health. |
| `largeTargetMultiplier` | 0-5 | Damage multiplier against `sizeClass: large` creeps. |
| `minRangeCells` | 0-12, below `range` | Targeting ignores creeps closer than this (mortar dead zone). |
| `volleyEveryMs` | 500-60000 | Every this many ms the tower hits every valid creep in range once, besides its normal attack (support towers too). A ready volley waits for a target; a new tower starts ready. |
| `volleyDamageShare` | 0-5 | Share of the tower's damage a volley deals; 1 when omitted. Needs `volleyEveryMs`. |

Target multipliers multiply together and apply to every hit of the tower
(primary, splash, arcs, extra, pierce, volley), before armor and
vulnerability. A single-target shot is any attack that is neither splash nor
chain; `extraTargets` and `pierceLine` only widen those.

On-hit effect fields (in `onHitEffects[]` entries, at any level):

| Field | Effect | Notes |
| --- | --- | --- |
| `armorKind` | `armor_break` only: `physical`, `magical` or `both` (default). | Lowers just that armor. |
| `damageKind` | `vulnerability` only: `physical`, `magical`, `percent` or `all` (default). | `magnitude` is the added share (default 0.15), refreshed, not stacked. |
| `freezeAtStacks` | `chill` only, whole 2-20. | Every Nth chilling hit on a creep (counted while its chill runs, weaker chills included) freezes it: a `stun`. |
| `freezeMs` | `chill` only, with `freezeAtStacks`, 100-10000 ms. | Freeze length; the stun balance duration when omitted. |
| `damageType` | `poison` and `burn`. | See "Damage over time type". |

`stun` and `burn` are ordinary on-hit effects (`{ "effectId": "stun",
"durationMs": 400 }`). Burn deals magical ticks by default and stacks like
poison (up to 3, `maxStacks` raises it).

Aura extensions (optional fields on any `aura` shape):

| Field | Value | Effect |
| --- | --- | --- |
| `damagePercentBonus` | 0-2 | Towers in radius deal `damage * (1 + bonus)`. Combines per the aura's `stacking`. |
| `damageBonusType` | `physical`, `magical`, `percent`, `all` | Which towers (by their damage type) get the bonus; `all` when omitted. Needs `damagePercentBonus`. |
| `goldPerKill` | 0-50 | Extra gold the owner gets for each kill landed by a tower in radius (damage-over-time kills carry no tower and pay none). Paid with the kill bounty in the game and summed into the round in the headless duel. |
| `incomePerRound` | 0-200 | Added to the owner's income payout at every round settle while the tower stands (`settleRound` tower income). |
| `sellRefundBonus` | 0-1 | Added to the sell refund ratio of towers in radius, capped at 100%. |

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
| `poison` | `both` | Single-target flask; its ticks are magical damage. |
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

The `single` archers are the per-race dial (tower-def-xwc.5, retuned for
armor types in tower-def-6nf.4; docs/07 "Armor types rebalance"):

| Race | Damage L1 / L2 / L3 | Range L1 / L2 / L3 |
| --- | --- | --- |
| Undead | 20 / 30 / 40 | 5.7 / 6.2 / 6.6 |
| Orc | 21 / 31 / 42 | archetype (6 / 6.4 / 6.8) |
| Human | 23 / 35 / 46 | archetype |
| Elf | archetype (20 / 30 / 40) | 6.2 / 6.6 / 7 |

Besides the archers, the elf moonwell chills less than the frost archetype
(0.28 / 0.38 / 0.48), the undead frost wyrm nest hits 20 at level 1 (19 on the
archetype) and Thorn Spire is percent (above). Keep cooldowns in steps of
50 ms: the duel simulator steps 50 ms, so an off-step cooldown fights like the
next step up there but not in the game.

## Schema versions

| Version | Meaning |
| --- | --- |
| 1 | Retired. Distances in coarse 32px cells (10x15 grid). |
| 2 | Retired. Distances in fine 16px cells: every version 1 distance doubled. |
| 3 | Retired. Every archetype declares a `damageType`; a race tower may override it. |
| 4 | Current. Every race tower declares two `talentBranches` (grades 4-7); see "Tower talents". |

A version 1 file fails on load with the file and its first entity id, e.g.
`content/towers/human.json [human_guard_archer_tower]: schemaVersion 1 measures
distances in coarse 32px cells; ...`. To migrate one, double every field in
the cell column above, add a `damageType` to every archetype, add
`talentBranches` to every race tower and set `schemaVersion` to 4. A version 2
file fails the same way (`schemaVersion 2 has no damage types; ...`): add the
archetype `damageType`, the race tower `talentBranches` and set
`schemaVersion` to 4. A version 3 file fails with `schemaVersion 3 has no
talent branches; ...`: add `talentBranches` to every race tower (the archetype
file only changes its version) and set `schemaVersion` to 4. Schema bounds
(`TOWER_STAT_BOUNDS`, `TOWER_AURA_BOUNDS`, `TOWER_CHAIN_BOUNDS`) are expressed
in fine-grid cells too.

## Tower talents

Design source: `docs/11-tower-talents-ru.md` ("Общие правила"). A tower is
built and upgraded through grades 1-3 as before. At grade 3 its **type** (the
race tower: each race builds one tower per archetype) opens two branches.
Choosing one costs gold, locks the other branch for that type for the rest of
the match and unlocks grades 4-7 for every tower of the type, including towers
built later. The pick is per side and per match: round settles keep it, a
restart or a new setup starts with none.

Every race tower entry declares exactly two branches:

```json
"talentBranches": [
  {
    "id": "undead_bone_archer_tower_volley",
    "name": "Bone Volley",
    "description": "Fires in bursts: modest arrows, many of them, and more of them strike a second creep.",
    "grades": [
      { "level": 4, "damage": 42, "range": 6.8, "attackCooldownMs": 550,
        "abilities": { "extraTargets": 1, "extraTargetDamageShare": 0.33 } },
      { "level": 5, "damage": 44, "range": 7, "attackCooldownMs": 400,
        "abilities": { "extraTargets": 1, "extraTargetDamageShare": 0.5 } },
      { "level": 6, "damage": 46, "range": 7.2, "attackCooldownMs": 350,
        "abilities": { "extraTargets": 1, "extraTargetDamageShare": 0.75 } },
      { "level": 7, "damage": 48, "range": 7.4, "attackCooldownMs": 300,
        "abilities": { "extraTargets": 1, "extraTargetDamageShare": 1 } }
    ]
  },
  { "id": "undead_bone_archer_tower_cursed", "...": "..." }
]
```

| Field | Rule |
| --- | --- |
| `id` | Starts with the tower id and `_`; the two ids differ. Errors name `file [towerId/branchId]`. |
| `name`, `description` | Non-empty; shown by the develop chooser and the bestiary. |
| `grades` | Exactly levels 4, 5, 6, 7 in that order. |
| grade `damage`, `range`, `attackCooldownMs` | Required, same bounds as a level. |
| grade `splashRadius`, `onHitEffects`, `aura`, `chain` | Optional, same shapes as on a level or archetype. |
| grade `abilities` | Optional typed abilities object, same fields as a level's `abilities` (see "Tower abilities" above); unknown keys fail on load. |

A grade replaces the tower's stats like a level does: anything the grade does
not declare (splash, effects, aura) is absent at that grade, so carry the
grade 3 values forward explicitly. The one exception is `chain`: a level or
grade that authors one fights with it (bounces, bounce range, falloff), one
that does not falls back to the archetype shape (`resolveTowerChain`); the
tower panel's NEXT preview and the computer's damage model read the same
resolution.

**Price ladder.** Grades never declare `upgradeCostGold` (the key is rejected):
the loader fills it from `TowerTalentPricing` in
`src/shared/constants/towerTalents.ts`, one ladder for every tower so a
balance pass tunes one table:

| Step | Branch | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- |
| Gold | 120 | 150 | 200 | 260 | 340 |

The branch price is paid once per type and is not part of a tower's sell
value; bought grades are.

**Base curves end at grade 3.** A `levels` curve (race tower or archetype)
must list exactly levels 1-3; branches add the rest.

**Rules** (`src/entities/tower/model/talents.ts`): `canChooseBranch` refuses
with `unknown_branch`, `already_chosen` (the type already has a branch, either
one), `not_grade_3` or `not_enough_gold`; `chooseBranch` records the pick in a
`TowerBranchChoices` record (race tower id to branch id). The upgrade helpers
(`resolveTowerUpgradeConfig`, `getUpgradeCost`, `isMaxLevel`,
`canAffordUpgrade`, `getTowerStatsForTowerLevel`, `getSellValue`) take the
choices and read one resolved curve: levels 1-3 from the tower's authored
curve (or its archetype's), 4-7 from the chosen branch. The curve tops out at
3 without a branch and at 7 with one.

**Shipped branches** (tower-def-bge.3) follow docs/11 with English names, read
against the shipped grade 3 stats. Where docs/11 asks for a mechanic that does
not exist yet (ground zones, cones, knockback, corpse explosions, fliers
falling, a target scope that changes at a grade) the grade uses the closest
existing ability or a number buff; every such substitution is listed in
docs/07 "Tower talents authoring (tower-def-bge.3)". A content test asserts
the two branches of each tower differ in at least one ability, effect or aura
mechanic, not only in numbers; the bestiary card shows each branch with its
grade 4-7 table.

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
