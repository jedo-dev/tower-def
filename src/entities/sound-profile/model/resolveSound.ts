import type { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import {
  CREEP_SOUND_SLOTS,
  type CreepSoundSet,
  type CreepSoundSlot,
  type SoundId,
  type TowerSoundSet,
  type TowerSoundSlot,
} from '../../../shared/types/sound-ids';
import type { SoundProfileLibrary } from './soundProfile.types';

/**
 * Picks the clip a tower plays for `slot`. The first match wins:
 *
 * 1. the tower's own `sounds` override (tower content),
 * 2. the race profile's entry for the tower's archetype,
 * 3. the race profile's race-wide sound,
 * 4. the default profile's entry for the archetype,
 * 5. the default profile's sound, which always exists.
 *
 * Positional arguments keep the per-shot call allocation free.
 */
export function resolveTowerSound(
  library: SoundProfileLibrary,
  race: RaceId,
  archetype: TowerTypeId,
  towerOverrides: TowerSoundSet | undefined,
  slot: TowerSoundSlot,
): SoundId {
  const raceProfile = library.races[race];
  const { defaultProfile } = library;

  return (
    towerOverrides?.[slot] ??
    raceProfile?.archetypes[archetype]?.[slot] ??
    raceProfile?.sounds[slot] ??
    defaultProfile.archetypes[archetype]?.[slot] ??
    defaultProfile.sounds[slot]
  );
}

/**
 * Picks the clip a creature plays for `slot`. The first match wins:
 *
 * 1. the creature's own `sounds` override (unit content),
 * 2. the creature's race profile,
 * 3. the default profile, which always has the slot.
 *
 * A creature with no known race skips step 2.
 */
export function resolveCreepSound(
  library: SoundProfileLibrary,
  race: RaceId | undefined,
  creatureOverrides: CreepSoundSet | undefined,
  slot: CreepSoundSlot,
): SoundId {
  const raceSound = race === undefined ? undefined : library.races[race]?.sounds[slot];

  return creatureOverrides?.[slot] ?? raceSound ?? library.defaultProfile.sounds[slot];
}

/** Every creature slot resolved for one creature. */
export type ResolvedCreepSounds = Readonly<Record<CreepSoundSlot, SoundId>>;

/** What the creature sound table needs to know about an authored creature. */
export type SoundingCreature = {
  id: string;
  faction: RaceId;
  sounds?: CreepSoundSet;
};

/**
 * Resolves every slot of every creature once, keyed by creature id. The game
 * looks a creep's clip up in this table on each hit, death, escape and spawn,
 * so routing a creature sound never walks the fallback chain or allocates.
 */
export function createCreepSoundTable(
  library: SoundProfileLibrary,
  creatures: readonly SoundingCreature[],
): ReadonlyMap<string, ResolvedCreepSounds> {
  const table = new Map<string, ResolvedCreepSounds>();

  for (const creature of creatures) {
    const resolved = {} as Record<CreepSoundSlot, SoundId>;
    for (const slot of CREEP_SOUND_SLOTS) {
      resolved[slot] = resolveCreepSound(library, creature.faction, creature.sounds, slot);
    }
    table.set(creature.id, Object.freeze(resolved));
  }

  return table;
}
