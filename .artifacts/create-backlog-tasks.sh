#!/usr/bin/env bash
set -euo pipefail

E1=tower-def-c2a   # Data-driven creature stats
E2=tower-def-3lp   # Creep status effect engine
E3=tower-def-r0s   # Tower archetypes and race-specific towers
E4=tower-def-pjc   # Placeholder art pipeline

new() { bd create "$1" --silent "${@:2}"; }

# ---------------------------------------------------------------- Epic 1 ----
T11=$(new "Define the creature content schema and TypeScript contract" --parent "$E1" -p 1 --labels content,data,units \
  --description "Introduce the authored content format for creatures: src/content/units/<race>.json with schemaVersion, race and a units array carrying id, name, tier, health, speed, armor, damage, rewardGold, spriteKey and description. Add the matching UnitContentFile and UnitContentEntry types in entities/unit, and enable resolveJsonModule in tsconfig.app.json if it is not already on." \
  --acceptance "Types compile under strict TS with no any; a sample race file type-checks against the contract; the numeric fields keep the same names the runtime already uses so nothing downstream has to be renamed; unit test asserts the shape of a fixture file.")
echo "1.1 $T11"

T12=$(new "Add a fail-fast loader and validator for creature content" --parent "$E1" -p 1 --labels content,data,units,tests \
  --description "Implement loadUnitContent() that validates every authored file: known race id, race matches the file, unique unit ids across all races, required fields present, numbers finite and within declared bounds, no unknown keys. Errors must name the file and the offending unit id. Keep the primitive validators generic so tower content can reuse them later." \
  --acceptance "Each failure mode has a test with a fixture; valid content returns typed UnitConfig values; validation runs once at module init and never inside the game loop; error messages identify file and unit id.")
echo "1.2 $T12"

T13=$(new "Migrate the undead roster to authored stats" --parent "$E1" -p 1 --labels content,units,balance \
  --description "Move the eight undead units from config/undead.ts into src/content/units/undead.json and replace formula output with hand-tuned numbers that express each creature: skeletons cheap and fragile, ghouls fast with low health, crypt fiends armored, gargoyles fast fliers, abomination slow with high health, frost wyrm as the wave-six threat. Delete the undead tier helpers." \
  --acceptance "undead.ts no longer computes stats; getUnitsByTier keeps working against content; existing undead tests pass or are updated; wave composition still produces playable waves at wave 1, 5 and 10.")
echo "1.3 $T13"

T14=$(new "Migrate orc, human and elf rosters with distinct race identity" --parent "$E1" -p 1 --labels content,units,balance \
  --description "Move the remaining three rosters to JSON and give each race a recognisable stat profile instead of the shared curve: orcs tanky and slow with high damage, humans balanced with better armor, elves fast and fragile with low reward gold. Remove the per-race tier helper functions." \
  --acceptance "No config file computes stats from tier; each race reads visibly different in a stat table; tests cover that every race has at least one unit per tier it declares; balance simulation tests still pass.")
echo "1.4 $T14"

T15=$(new "Add creature traits: movement type, size class and armor type" --parent "$E1" -p 2 --labels content,units,gameplay \
  --description "Extend the creature contract with optional gameplay traits that content can express: moveType (ground or air), sizeClass (small, medium, large) and armorType (unarmored, light, heavy). Default them when absent so existing content stays valid. Wire moveType into targeting so future anti-air towers have something to read, and expose armorType for the damage model." \
  --acceptance "Traits are validated like other fields; defaults are explicit constants, not literals scattered in code; targeting and damage read traits through typed accessors; tests cover default fallback and explicit values.")
echo "1.5 $T15"

T16=$(new "Read the unit registry from content and drop the formula generators" --parent "$E1" -p 1 --labels content,units,refactor \
  --description "Point entities/unit/model/registry.ts at loadUnitContent() and delete the createXUnit factories and TIER_* constants from all four config files. The config modules either disappear or shrink to a thin re-export of the loaded content." \
  --acceptance "No TIER_HEALTH_BASE style constants remain in src; resolveUnitConfigById, getUnitsByFaction and getAllUnitConfigs behave identically; wave generation, creep sending and the computer opponent are untouched by the change; full test suite green.")
echo "1.6 $T16"

T17=$(new "Add content guard tests for roster coverage and balance bounds" --parent "$E1" -p 2 --labels units,tests,balance \
  --description "Add guard tests that catch bad authoring before it reaches the scene: every UnitId in the type union has content, every race registry sendableCreepIds entry resolves, health/speed/damage stay inside sane bounds, and generateWaveUnits still yields between the declared minimum and maximum units for waves 1 through 20." \
  --acceptance "Tests fail with a clear message when a unit is missing or a stat is out of range; they run in the node environment and take under a second.")
echo "1.7 $T17"

T18=$(new "Document the creature content authoring flow" --parent "$E1" -p 3 --labels docs,content \
  --description "Write docs/08-content-authoring.md covering where creature JSON lives, what each field means, the allowed ranges, how tiers feed the wave budget, and how to add a new creature end to end including its sprite key. Link it from AGENTS.md so agents read it before touching content." \
  --acceptance "A new creature can be added by following the doc alone; the doc states which fields are balance-sensitive and which are cosmetic.")
echo "1.8 $T18"

# ---------------------------------------------------------------- Epic 2 ----
T21=$(new "Define effect ids, magnitudes and stacking rules" --parent "$E2" -p 1 --labels effects,combat,data \
  --description "Add the effect vocabulary to shared/types/content-ids: chill (movement slow), poison (damage over time), burn (stronger short damage over time), stun (movement stop) and armor_break (defense reduction). Define EffectDefinition (magnitude, durationMs, tickIntervalMs, maxStacks, stacking rule: refresh, stack or strongest-wins) and centralise the balance numbers in shared/constants." \
  --acceptance "Effect ids are a typed union like the existing content ids; every effect declares its stacking rule explicitly; no magic numbers outside the constants module; the type guard helper matches the existing isTowerTypeId style.")
echo "2.1 $T21"

T22=$(new "Add active effects to the creep entity with pure apply and tick helpers" --parent "$E2" -p 1 --labels effects,combat,tests \
  --description "Extend CreepEntity with an activeEffects list and implement pure helpers in entities/creep: applyEffectToCreep (honouring the stacking rule), tickCreepEffects (returns damage to apply and the effects that expired) and getEffectiveSpeedMultiplier. No Phaser imports, no mutation of inputs beyond the documented in-place contract used by the runtime." \
  --acceptance "Helpers are covered by unit tests for refresh, stack-to-cap and strongest-wins; expiry is exact at the boundary; ticking is deterministic for a fixed delta sequence; damage is reported, never applied inside the helper.")
echo "2.2 $T22"

T23=$(new "Tick effects in the game loop and route damage over time through kill rewards" --parent "$E2" -p 1 --labels effects,combat,gameplay \
  --description "Drive tickCreepEffects from the Phaser combat runtime each frame, apply the reported damage through applyDamageToCreep, and make sure a creep killed by poison grants gold exactly once through the same handleCreepKill path as a direct hit. Damage numbers for ticks must be visually distinguishable from hits." \
  --acceptance "A creep killed by damage over time awards gold once and plays the death sound once; effects stop ticking on dead and escaped creeps; pausing and speed changes do not double-tick; covered by a runtime test.")
echo "2.3 $T23"

T24=$(new "Apply slow and stun to creep movement" --parent "$E2" -p 1 --labels effects,movement,gameplay \
  --description "Make the movement runtime multiply step distance by the creep effective speed multiplier, with stun clamping it to zero and a floor on slow so a creep can never be frozen forever by chill alone. Keep the per-frame path free of allocations." \
  --acceptance "A chilled creep visibly lags an unaffected one and still reaches the exit; stun stops movement and releases on expiry; the minimum slow floor is a named constant; movement runtime tests cover both.")
echo "2.4 $T24"

T25=$(new "Apply unit armor and armor break to incoming damage" --parent "$E2" -p 1 --labels effects,combat,balance \
  --description "Creature armor is authored but currently ignored: applyDamageToCreep subtracts raw damage. Introduce a damage calculation that reduces incoming damage by armor (with a documented formula and a minimum damage floor) and lets the armor_break effect temporarily lower it. Keep the reward and kill semantics unchanged." \
  --acceptance "The formula is documented in the damage module and unit-tested at zero, low and high armor; armor break restores on expiry; existing damage tests are updated rather than deleted; balance simulation tests still pass.")
echo "2.5 $T25"

T26=$(new "Render effect feedback on affected creeps" --parent "$E2" -p 2 --labels effects,feedback,ui \
  --description "Show which effects are on a creep: a dominant-effect tint (blue chill, green poison, orange burn, white stun) layered under the existing hit flash, plus small status pips above the sprite when several effects are active. The hit flash must restore the effect tint, not the base faction tint, while an effect is running." \
  --acceptance "Tint priority is deterministic and defined in one place; hit flash restores the correct colour; pips do not tank frame rate with many creeps; a test covers the tint restore ordering.")
echo "2.6 $T26"

T27=$(new "Add effect sound hooks to the audio manager" --parent "$E2" -p 3 --labels effects,audio \
  --description "Add sound ids for effect application (chill, poison, stun) to the audio type map and trigger them with throttling so a wave of applications does not stack into noise. Register the missing wav files in docs/SOUND_ASSET_LIST.md as pending assets and fall back silently until they exist." \
  --acceptance "Missing audio files never throw; the throttle window is a named constant; the category volume rules from the existing audio manager still apply; covered by an audio manager test.")
echo "2.7 $T27"

T28=$(new "Add determinism and hot-path performance tests for effects" --parent "$E2" -p 2 --labels effects,tests,perf \
  --description "Add tests that lock in the two properties the effect engine must keep: identical results for the same delta sequence regardless of frame pacing, and no unbounded growth of the effect list. Include a coarse budget assertion for ticking a large creep set within a frame." \
  --acceptance "A fixed seed and delta sequence yield byte-identical effect state across runs; the effect list is capped by maxStacks; the budget test states its threshold and runs in the node environment.")
echo "2.8 $T28"

# ---------------------------------------------------------------- Epic 3 ----
T31=$(new "Move tower stats and rosters into validated content" --parent "$E3" -p 1 --labels content,towers,data \
  --description "Author towers as content the same way creatures are: src/content/towers/<race>.json with id, name, race, archetype, costGold, damage, range, attackCooldownMs, splashRadius, onHitEffects and spriteKey. Reuse the validators from the creature content loader. Replace the buildableTowers array and TOWER_COMBAT_STATS_BY_TYPE record." \
  --acceptance "No tower stat literals remain in src/entities/tower/model/config; content validation reports the offending file and tower id; existing towers keep their current numbers so the change is behaviour-neutral; tests cover loading and validation.")
echo "3.1 $T31"

T32=$(new "Replace the archer and splash union with data-driven archetype ids" --parent "$E3" -p 1 --labels towers,refactor,bridge \
  --description "TowerTypeId, HudTowerType and the build-mode state are hardcoded to archer and splash, and gameSceneBuildRuntime types its parameters as the literal union. Introduce an archetype id derived from content (single, splash, frost, poison, chain, support) plus buildable tower ids, and thread them through the bridge command map without widening anything to plain string." \
  --acceptance "Selecting a tower type across React and Phaser stays typed end to end; no literal archer or splash comparisons remain in runtime code; bridge tests cover the widened command payload; existing gameplay is unchanged.")
echo "3.2 $T32"

T33=$(new "Add the frost archetype that chills its targets" --parent "$E3" -p 1 --labels towers,effects,gameplay \
  --description "First archetype built on the effect engine: a single-target tower with reduced damage that applies chill on hit. Includes its content entry, the on-hit wiring in the combat runtime, a cold projectile tint and its upgrade curve (stronger slow, not just more damage)." \
  --acceptance "Creeps hit by the frost tower slow down visibly and recover after the duration; the slow does not stack into a permanent freeze; damage, cost and slow magnitude live in content; a scene test covers build, fire and slow applied.")
echo "3.3 $T33"

T34=$(new "Add the poison archetype with stacking damage over time" --parent "$E3" -p 1 --labels towers,effects,gameplay \
  --description "A low-direct-damage tower that applies stacking poison, rewarding early placement against long waves. Includes content, on-hit wiring, a green projectile treatment and an upgrade curve that raises stack cap and tick damage." \
  --acceptance "Poison stacks up to its cap and refreshes duration per the declared stacking rule; a creep killed by poison awards gold once; stats live in content; covered by a scene test.")
echo "3.4 $T34"

T35=$(new "Add the chain-lightning archetype that bounces between creeps" --parent "$E3" -p 2 --labels towers,combat,gameplay \
  --description "An archetype that hits a primary target then jumps to nearby creeps with falloff damage, giving a third answer to grouped waves alongside splash and poison. Bounce count, jump range and falloff come from content; the visual is a chained segment effect rather than a travelling projectile." \
  --acceptance "Bounces never revisit the same creep within one shot; bounce resolution is deterministic given the same battlefield state; the effect is capped so a dense wave cannot spike the frame budget; unit tests cover target chain selection.")
echo "3.5 $T35"

T36=$(new "Add the support archetype with a nearby-tower aura" --parent "$E3" -p 2 --labels towers,combat,gameplay \
  --description "A tower that deals no damage itself and instead buffs towers in radius (attack speed or range, declared in content). Introduces aura recalculation on build, sell and upgrade rather than per frame, and a visible radius indicator when the tower is selected." \
  --acceptance "Auras recompute only on battlefield changes, never each frame; buffs stack per the declared rule and are removed when the support tower is sold; selling and rebuilding leaves no stale buff; covered by unit tests.")
echo "3.6 $T36"

T37=$(new "Author race-specific tower rosters for all four races" --parent "$E3" -p 1 --labels content,towers,balance \
  --description "Every race currently has one or two near-identical towers. Give each a roster of four that expresses the race: undead plague and frost wyrm nest, orc lightning totem and burning pit, human cannon bastion and guard post, elf moonwell chill and thorn poison. Update raceRegistries buildableTowerIds and starterTowerId accordingly." \
  --acceptance "Each race has at least one damage, one crowd-control and one area tower; costs are internally consistent across races; every roster entry resolves to loaded content; race registry tests cover the new ids.")
echo "3.7 $T37"

T38=$(new "Generate the HUD build bar from the selected race roster" --parent "$E3" -p 1 --labels ui,hud,towers \
  --description "HudPanel hardcodes two buttons labelled Archer and Plague. Build the bar from the selected race roster with cost, archetype icon and a short effect hint, keeping 44x44 minimum targets, horizontal scroll on 360x800, and no per-frame React updates." \
  --acceptance "Switching race swaps the buildable set; buttons show cost and disable when unaffordable; verified on 360x800 and 390x844 portrait; HudPanel tests cover the generated list and assert no console errors.")
echo "3.8 $T38"

T39=$(new "Show tower effects in the selected-tower panel" --parent "$E3" -p 2 --labels ui,towers \
  --description "The selected tower snapshot carries only damage, range, cooldown and splash radius. Extend it with archetype and on-hit effect summaries (slow percentage, poison per second, bounce count) and render them in TowerActionPanel so the player can compare towers before upgrading." \
  --acceptance "The bridge snapshot stays typed; the panel renders effect lines only when present; upgrade preview shows the effect delta for the next level; covered by panel tests.")
echo "3.9 $T39"

T310=$(new "Drive tower upgrades from content per archetype" --parent "$E3" -p 1 --labels towers,content,balance \
  --description "TOWER_UPGRADE_CONFIG is a hand-written record keyed by archer and splash, with duplicated arithmetic per level. Move upgrade curves into tower content so each tower declares its own level costs and stat deltas, including effect magnitudes for the new archetypes." \
  --acceptance "Upgrading any tower reads content only; max level and costs are per tower, not global; the existing upgrade tests are updated and pass; refunds and sell value stay consistent with the new costs.")
echo "3.10 $T310"

T311=$(new "Teach the computer opponent to value the new archetypes" --parent "$E3" -p 2 --labels computer-ai,towers,balance \
  --description "scoreTowerPlacement and planBuildDecision assume damage-only towers. Give the opponent archetype-aware weights so it mixes crowd control with damage, respects the roster of its own race, and does not spend everything on support towers." \
  --acceptance "Difficulty presets still produce distinguishable opponents; the opponent builds at least one crowd-control tower in a simulated ten-wave run at normal difficulty; decision snapshots are updated; simulation tests pass deterministically.")
echo "3.11 $T311"

# ---------------------------------------------------------------- Epic 4 ----
T41=$(new "Generate a procedural question-mark placeholder texture" --parent "$E4" -p 1 --labels art,assets \
  --description "Create the placeholder art at runtime with Phaser Graphics: a flat plate with a bold question mark and a dashed border, generated once per scene into a texture that matches the existing spritesheet frame contract so animation code can address frames without special cases. Support a race tint so a placeholder undead tower reads differently from an elf one." \
  --acceptance "No asset file is required; the texture is generated once and reused; it is legible at tower and creep display sizes on a 360px wide viewport; a test asserts the texture is registered after scene create.")
echo "4.1 $T41"

T42=$(new "Add a sprite resolver with placeholder fallback for units and towers" --parent "$E4" -p 1 --labels art,assets,architecture \
  --description "Today spriteKey values like tower.undead.plague and unit.human.footman point at nothing and the sprite factory silently relies on whatever Phaser does with a missing key. Add one resolver used by both the unit and tower sprite factories that returns the real texture when registered and the placeholder otherwise, applying the race tint." \
  --acceptance "Every sprite creation path goes through the resolver; a missing key never throws and never yields an invisible sprite; the resolver is unit-testable without a live scene; smoke test covers a creep and a tower with unmapped keys.")
echo "4.2 $T42"

T43=$(new "Add a placeholder icon for HUD build buttons and panels" --parent "$E4" -p 2 --labels art,ui,hud \
  --description "The React side needs the same fallback: build buttons and the tower panel should show a question-mark chip built from theme tokens when a tower or creep has no icon yet, instead of an empty box or a broken image." \
  --acceptance "The chip uses design tokens with no magic colours, meets WCAG AA contrast, keeps 44x44 targets, and is covered by a component test asserting no console errors.")
echo "4.3 $T43"

T44=$(new "Report sprite keys that fall back to placeholder art" --parent "$E4" -p 2 --labels tooling,assets \
  --description "Collect every sprite key resolved to the placeholder and expose the list through the shared logging entrypoint in development only, so it is obvious which art is still missing after adding content. Production builds must not pay for the collection." \
  --acceptance "The report lists each missing key once with the content id that referenced it; nothing is logged in production; a test covers report contents for a known-missing key.")
echo "4.4 $T44"

T45=$(new "Document the art drop-in flow for new towers and creeps" --parent "$E4" -p 3 --labels docs,art \
  --description "Document where sprite files go, the naming convention, the expected frame layout and sizes for towers and creeps, how to register a key in the sprite constants, and how the placeholder disappears once a real asset is registered. Extend docs/08-content-authoring.md rather than creating a second page." \
  --acceptance "Following the doc alone turns a placeholder tower into a rendered sprite with no code changes beyond the registry entry; frame layout expectations are stated explicitly.")
echo "4.5 $T45"

# --------------------------------------------------------- dependencies ----
bd dep "$T12" --blocks "$T31"    # content loader before tower content
bd dep "$T22" --blocks "$T33"    # effect helpers before frost tower
bd dep "$T22" --blocks "$T34"    # effect helpers before poison tower
bd dep "$T15" --blocks "$T25"    # armor type trait before armor damage model
bd dep "$T42" --blocks "$T37"    # placeholder fallback before new tower rosters
bd dep "$T31" --blocks "$T310"   # tower content before content-driven upgrades
bd dep "$T32" --blocks "$T38"    # archetype ids before the generated build bar

bd sync 2>/dev/null || true
echo "done"
