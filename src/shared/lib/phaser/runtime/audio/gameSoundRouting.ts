import {
  SOUND_PROFILE_LIBRARY,
  resolveCreepSound,
  resolveTowerSound,
  type SoundProfileLibrary,
} from '../../../../../entities/sound-profile';
import { tryResolveBuildableTowerById, type TowerEntity } from '../../../../../entities/tower';
import type { RaceId } from '../../../../types/content-ids';
import type { CreepSoundSlot, SoundId, TowerSoundSlot } from '../../../../types/sound-ids';

/** Anything that knows the race of the creature it draws. */
export type SoundingCreep = {
  race?: RaceId;
};

export type GameSoundRouter = {
  playTowerSound: (tower: TowerEntity, slot: TowerSoundSlot) => void;
  playCreepSound: (creep: SoundingCreep, slot: CreepSoundSlot) => void;
};

/**
 * The clip a placed tower plays for `slot`. The race comes from the authored
 * tower; a tower placed without content falls back to `fallbackRace`.
 */
export function resolveTowerEntitySound(
  tower: TowerEntity,
  fallbackRace: RaceId,
  slot: TowerSoundSlot,
  library: SoundProfileLibrary = SOUND_PROFILE_LIBRARY,
): SoundId {
  const authoredTower = tower.buildableTowerId
    ? tryResolveBuildableTowerById(tower.buildableTowerId)
    : undefined;

  return resolveTowerSound(
    library,
    authoredTower?.faction ?? fallbackRace,
    tower.type,
    authoredTower?.sounds,
    slot,
  );
}

/**
 * Bridges game events to clips: runtimes say "this tower attacked", the
 * router asks the sound profiles which clip that is and plays it.
 */
export function createGameSoundRouter(
  playSound: (soundId: SoundId) => void,
  getFallbackRace: () => RaceId,
  library: SoundProfileLibrary = SOUND_PROFILE_LIBRARY,
): GameSoundRouter {
  return {
    playTowerSound: (tower, slot) =>
      playSound(resolveTowerEntitySound(tower, getFallbackRace(), slot, library)),
    playCreepSound: (creep, slot) => playSound(resolveCreepSound(library, creep.race, slot)),
  };
}

/** Router for a battlefield nobody listens to. */
export const SILENT_SOUND_ROUTER: GameSoundRouter = {
  playTowerSound: () => undefined,
  playCreepSound: () => undefined,
};
