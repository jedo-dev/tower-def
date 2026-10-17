# Technical & Product Decisions

## Decision 001: Use Phaser for game loop

React will be used for app shell and UI.

Phaser will be used for:

- Rendering game scene.
- Game loop.
- Creeps movement.
- Tower attacks.
- Effects.
- Input on the game field.

Reason:

Tower Defense requires frame-based updates and many moving objects. Phaser is better suited for this than React state updates.

## Decision 002: Mobile-first

The game is designed primarily for mobile screens.

Reason:

The main target platforms are PWA and Telegram Web App.

## Decision 003: Grid-based map

The map uses a grid.

Reason:

Tower placement, pathfinding, blocking checks, and mobile interactions are easier and more predictable on a grid.

## Decision 004: Initial grid size is 10 x 15

Reason:

This size should fit mobile screens while still allowing maze-building.

## Decision 005: Building only between waves

Reason:

This simplifies pathfinding, prevents mid-wave path chaos, and matches the intended gameplay pacing.

## Decision 006: Path is checked before placement

Reason:

The player must never be allowed to fully block the creep path.

## Decision 007: Builder factions are config-driven

Builder factions and their buildable towers are defined via typed config models.

For MVP testing, each faction starts with one archer-type starter tower.

## Decision 008: Lint with oxlint instead of ESLint

Linting runs through oxlint (`npm run lint`), configured in `.oxlintrc.json`.
ESLint, typescript-eslint and the React ESLint plugins were removed.

The config is a port of the former ESLint setup: ESLint recommended,
typescript-eslint recommended (including its overrides that turn off core rules
TypeScript already checks, such as `no-redeclare`), React hooks rules
(`rules-of-hooks`, `exhaustive-deps` and the React Compiler rules) and
`only-export-components` for Vite fast refresh.

Reason:

oxlint is part of the Oxc toolchain, is much faster than ESLint, and ships the
TypeScript and React rules natively, so the project needs a single lint
dependency instead of six.

## Decision 009: Format with oxfmt

Code is formatted with oxfmt (`npm run format`, checked by `npm run format:check`),
configured in `.oxfmtrc.json`: single quotes, semicolons, trailing commas,
print width 100, LF line endings. Markdown, docs, public assets and tool output
are not formatted. `.gitattributes` forces LF in the working tree so the format
check gives the same result on Windows and Unix.

Reason:

oxfmt is the Oxc formatter (Prettier-compatible output, much faster) and pairs
with oxlint. The options were chosen to match the dominant existing style so
the one-time reformat stays small.

## Decision 010: Grid is 20 x 30 cells of 16 px

Supersedes Decision 004. The board keeps its 320 x 480 px size but uses
20 x 30 cells of 16 px (`GridConfig` in `shared/constants/grid.ts`).
Towers always occupy 2 x 2 cells; creeps occupy 1 x 1 (small, medium) or
2 x 2 (large). The entrance and the exit are 2 x 2 zones on the map edges,
anchored at their top-left cell (`GridModel.entrance` / `GridModel.exit`,
sized by `GridModel.endpointZoneFootprint`); creep routes start and end at
those anchor cells.

Reason:

Finer cells let mazes bend more tightly and let creep size matter for
pathing, without changing the physical board on mobile screens.

## Decision 011: Both duel battlefields play the same wave

The game treats the computer's battlefield exactly like the player's, through the
same runtime cores the headless duel simulation uses:

- one baseline wave is rolled per round from a seeded stream
  (`createSharedBaselineWaveSource`) and played on both fields; a generated map
  seeds it with its own seed (the baselines `sim:duel --seed` rolls for that
  seed and `--baseline-race`), the fixed map rolls a fresh seed per match;
- the computer's creeps spawn one per interval on the player field's timing
  instead of all at once;
- support auras buff the computer's towers;
- a wave ends only when both fields are resolved, so the computer's kills and
  leaks are all counted before the round is settled.

Reason:

A duel is only fair if neither side gets a luckier wave, an easier spawn
pattern or weaker towers. The cost is that the player may wait a few seconds
after clearing their own field while the computer's field finishes; the
enemy view shows what is left.

## Decision 012: The Phaser engine is a feature slice, not shared code

The Phaser runtime (scenes, runtime cores, the audio manager, the terrain
asset registry and the scene test harness) lives in
`src/features/game-engine/`. It may depend on
`entities/*` and on sibling features (`wave-phase`), and it is consumed only
through its barrel by the game canvas widget; the headless duel simulation
(`features/duel-simulation`) and the tools under `tools/` reach into the same
Phaser-free runtime cores.

`shared/` keeps only engine-agnostic pieces: pathfinding, the grid model,
board snapshots, the audio clip cache, the typed game bridge, constants, and
the sound clip registry (`shared/lib/sound-registry`), which the menus and the
sfx generator read without pulling Phaser in.

`src/shared/fsdImportRules.node.test.ts` walks every import under `src/` and
fails the suite when a layer imports a layer above it
(`shared < entities < features < widgets < pages < app`). Slice isolation
inside one layer (an entity importing another entity, a feature importing
another feature) is tolerated and not checked.

Reason:

The engine depends on the whole game domain, so it never was shared code;
keeping it under `shared/lib` let `shared` import `entities` and `features`
and made the layer rules unenforceable. A feature slice names the dependency
direction honestly, and the guard test keeps it that way.

## Decision 013: Armor and damage types

Creatures carry two authored armors, `physicalArmor` and `magicalArmor` (whole
points, -25 to 75), and every tower deals one damage type: `physical`,
`magical` or `percent`. The archetype sets the type; a race tower may
override it. A hit is mitigated by the armor matching its type through one
diminishing curve:

- `factor = |armor| * 0.06`, `share = factor / (1 + factor)`;
- positive armor removes `share` of the hit, never more than 90%;
- negative armor adds the same `share`, at most +60% at -25;
- `percent` damage takes `damage / 1000` of maximum health and ignores armor;
- damage over time is magical and goes through magical armor, unless the
  tower's on-hit effect entry types it (tower-def-6nf.2: Thorn Spire poisons in
  percent).

The single `armor` value with its `armorType` bonus and the "damage over time
ignores armor" rule are gone; the shipped creatures were migrated to the armor
they effectively carried, so balance is unchanged until race profiles are
authored.

Reason:

Two armors let a race be tough against arrows but soft against magic (or the
reverse), which is what makes tower choice matter per opponent. A diminishing
curve instead of WispTD's linear "1 armor = 1% reduction": with a linear
scale, high armor approaches immunity and a few points of armor break swing
damage by a fixed amount whether the creature is bare or plated, so balance
would need hard caps everywhere. The curve keeps every point of armor worth
something without ever making a creature unkillable, gives armor break and
negative armor a symmetric, bounded effect, and is the formula combat and the
computer opponent's effective-health estimate already shared. Explicit damage
types replace the special `ignoreArmor` path, so every source of damage goes
through one rule.

## Decision 014: Tower talents are authored branches on one price ladder

Every race tower authors two talent branches (tower content schema 4). At
grade 3 a side picks one branch per race tower for the whole match, which
locks the other and extends the upgrade curve to grade 7 for every tower of
that type. Grades are authored as full stat rows (like levels), plus an open
`abilities` map for the combat mechanics that land separately. Grade prices
and the branch price are not authored: `TowerTalentPricing` (branch 120,
grades 150 / 200 / 260 / 340) fills them on load and content that declares a
grade price fails.

Cost, maximum level, stats, the NEXT preview and the sell value all read one
resolved curve (`resolveTowerUpgradeConfig`: authored or archetype levels 1-3,
then the chosen branch), replacing the archetype-only cost and cap lookups
that disagreed with authored curves (tower-def-pzb).

Reason:

A pick per type (not per tower) is the Warcraft 3 TD convention the design doc
asks for and keeps the decision strategic: it commits a whole maze, not one
square. Full stat rows keep grades readable next to the design tables and
reuse the level parser, so a grade can change splash, effects or aura without
a modifier language. One ladder instead of per-branch prices makes the
"a grade 7 tower costs as much as twenty grade 1 towers" trade-off a single
balance dial; authoring prices per branch would invite 128 numbers drifting
apart. A curve capped at 3 until a branch is chosen means no code path needs
to know about talents to stay correct: the cap simply moves.

## Decision 015: Creature talents run on per-tier experience, snapshotted at send time

Every creature authors two talent branches of grades 1-4 (unit content schema
4), mirroring tower talents (Decision 014) but paid in experience, not gold. A
side earns experience per tier when a creature it sent dies on the other field
(1 x tier) or leaks (3 x tier, +2 when the leak took a life), credited at the
round settle. Experience of a tier buys one branch per creature for the match
and then its grades; prices are one ladder scaled by tier
(`CreatureTalentPricing`: branch 6, grades 2 / 5 / 10 / 18, times the tier,
since tower-def-716.8; first draft 4 / 6 / 10 / 16 / 26)
and content cannot declare them. Grades replace health, speed and both armors
(plus an open `abilities` object for the creature mechanics that land
separately); they never change send price, send caps or reward.

A grade applies to sends queued after the purchase: each queued send records
the grade it was bought at (`sendQueueGrades`) and spawns at it, so creatures
already queued or walking keep theirs. Deaths are tallied as they happen and
leaks read at the settle, so the scene and the headless simulation feed the
same `settleRound` outcomes.

Reason:

Experience from the creatures themselves keeps the send economy and the talent
economy apart: gold stays the tower-versus-send trade-off, and developing a
creature requires actually sending it, which is the design doc's point (a tier
nobody sends never grows). Per-tier ledgers stop cheap tier 1 spam from
funding the tier 6 ladder, and scaling one ladder by the tier keeps every tier
about ten waves from a full branch. Snapshotting the grade when the send is
queued, not when it spawns, makes "after the purchase" unambiguous in a duel
where sends are bought during the build phase and spawn at wave start: what
the player paid for is what walks. Settling experience at the round end
reuses the leak and life-steal accounting that already decides who took which
life, so the life bonus never disagrees with the HP change.

## Decision 016: The game canvas renders at device pixel ratio, capped at 2.5x

Phaser 4 has no `resolution` option, and its `Scale.RESIZE` mode sizes the
canvas backing store to the CSS size, so a DPR 3 phone upscaled a 1x bitmap
and every sprite was soft. The game now runs in `Scale.NONE`: a canvas
resolution runtime (`runtime/camera/canvasResolutionRuntime`) stretches the
canvas over its host in CSS and resizes the game to CSS size x
`min(devicePixelRatio, MAX_CANVAS_PIXEL_RATIO)` on host resize (ResizeObserver),
window resize and DPR change (`matchMedia`). The board camera view, pointer
positions and tap/pan thresholds stay in CSS pixels; only `applyCameraView`
converts the view to backing pixels (`toBackingCameraView`), and pointers are
divided back by Phaser's display scale (tower-def-vy8).

`MAX_CANVAS_PIXEL_RATIO` is 2.5. DPR 2 devices render at full 2x; DPR 3
devices render 2.5x, about 30% fewer pixels than 3x (945x1099 instead of
1134x1319 for the 390x844 board host), and at phone viewing distance 2.5x is
indistinguishable from 3x while fill rate is the first thing a mid-tier GPU
runs out of. A headless Chrome A/B at 390x844 DPR 3 (1x vs 2.5x backing
store, uncapped rAF, desktop GPU) showed no measurable difference, the run
to run noise (800-1900 fps) dominating; on-device profiling should revisit
the cap if a low-end phone drops below 60 FPS.

Reason:

Sizing the backing store ourselves is the only route Phaser 4 leaves, and
keeping one CSS-pixel camera view means the responsive fit, pinch zoom, pan,
two-tap placement and pointer-to-cell mapping are unchanged code at any DPR;
only the last step to the Phaser camera knows about device pixels. A cap
rather than the raw DPR bounds the worst-case fill rate on dense screens.
