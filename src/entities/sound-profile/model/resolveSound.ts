import type { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type {
  CreepSoundSlot,
  SoundId,
  TowerSoundSet,
  TowerSoundSlot,
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
 * Picks the clip a creature plays for `slot`: its race profile first, then the
 * default profile. A creature with no known race uses the default directly.
 */
export function resolveCreepSound(
  library: SoundProfileLibrary,
  race: RaceId | undefined,
  slot: CreepSoundSlot,
): SoundId {
  const raceSound = race === undefined ? undefined : library.races[race]?.sounds[slot];

  return raceSound ?? library.defaultProfile.sounds[slot];
}
