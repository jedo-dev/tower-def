#!/usr/bin/env bash
set -euo pipefail

# Creates the four epics for the tower-modifier / data-driven-content initiative.
# Idempotency note: run once. Re-running creates duplicates.

echo "== Epic 1 =="
E1=$(bd create "Epic: Data-driven creature stats" --silent --type epic -p 1 \
  --labels content,data,units,balance \
  --description "Replace tier-formula unit generation with authored JSON content per race, so every creature has hand-tuned numbers instead of a value derived from its tier. This makes race identity expressible in data: a bat can move twice as fast with half the health, an abomination can crawl with heavy armor. Content lives in src/content/units/<race>.json, is validated on load, and stays the single source of truth for wave generation, duel sends and the unit registry." \
  --acceptance "All creature stats come from validated JSON content; no tier-formula generators remain in src/entities/unit/model/config; registry, wave generation and creep sending read the same content; invalid content fails fast with a descriptive error; schema and roster parity are covered by tests." \
  --design "JSON files are bundled via resolveJsonModule and validated at module init, so no async loading enters the Phaser scene and determinism is preserved. Validation helpers are written to be reused by tower content later.")
echo "$E1"

echo "== Epic 2 =="
E2=$(bd create "Epic: Creep status effect engine" --silent --type epic -p 1 \
  --labels combat,effects,gameplay \
  --description "Runtime foundation for timed effects on creeps: chill/slow, poison damage over time, stun, armor break. Today towers can only subtract health, which is why splash and single-target feel identical apart from numbers. This epic delivers the pure effect model plus its game-loop integration, with no tower content attached - content lands in the tower archetype epic." \
  --acceptance "Effects apply, stack, tick and expire deterministically outside React; movement respects slow and stun; damage respects armor and armor break; damage over time grants kill rewards exactly once; the model is unit-tested without Phaser; frame budget holds with many affected creeps." \
  --design "Effect state lives on the creep entity as a small fixed-shape list. Pure helpers (apply/tick/expire) live in entities/creep; the Phaser combat runtime only drives them with delta time. No per-frame allocations in the tick path.")
echo "$E2"

echo "== Epic 3 =="
E3=$(bd create "Epic: Tower archetypes and race-specific towers" --silent --type epic -p 1 \
  --labels content,towers,gameplay,ui \
  --description "Turn the two hardcoded tower types (archer, splash) into data-driven archetypes that can carry on-hit effects, and give every race its own tower roster. Adds frost, poison, chain-lightning and support archetypes on top of the existing single-target and splash ones, so build decisions become tactical instead of cosmetic." \
  --acceptance "Tower stats, costs, upgrades and on-hit effects come from validated content; the archer/splash union no longer exists in gameplay code; each race has a distinct buildable roster; the HUD build bar is generated from the selected race; the computer opponent handles the new archetypes; a scene test covers build, attack and effect application." \
  --design "Depends on the effect engine for on-hit behaviour and on the content loader from the creature-stats epic. Bridge types stay typed: tower ids are derived from content, never raw strings.")
echo "$E3"

echo "== Epic 4 =="
E4=$(bd create "Epic: Placeholder art pipeline" --silent --type epic -p 1 \
  --labels art,assets,tooling \
  --description "Any tower or creep without real art renders an obvious question-mark placeholder instead of crashing or rendering nothing. This unblocks shipping new tower archetypes and creatures before their sprites exist, and makes dropping in the final artwork a registry edit rather than a code change." \
  --acceptance "A missing sprite key never throws and never renders an invisible entity; the placeholder is visually unmistakable and race-tinted; replacing it with real art requires only an asset registry entry; a dev-only report lists every sprite key still falling back; the flow is documented." \
  --design "The placeholder texture is generated procedurally with Phaser Graphics at scene start, so it needs no asset file and matches the existing spritesheet frame contract.")
echo "$E4"

printf '%s\n' "$E1" > .artifacts/epic1.id
printf '%s\n' "$E2" > .artifacts/epic2.id
printf '%s\n' "$E3" > .artifacts/epic3.id
printf '%s\n' "$E4" > .artifacts/epic4.id
