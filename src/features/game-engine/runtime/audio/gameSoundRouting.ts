import {
  SOUND_PROFILE_LIBRARY,
  createCreepSoundTable,
  resolveCreepSound,
  resolveTowerSound,
  type SoundProfileLibrary,
  type SoundingCreature,
} from '../../../../entities/sound-profile';
import { tryResolveBuildableTowerById, type TowerEntity } from '../../../../entities/tower';
import { getAllUnitConfigs } from '../../../../entities/unit';
import type { RaceId } from '../../../../shared/types/content-ids';
import type { CreepSoundSlot, SoundId, TowerSoundSlot } from '../../../../shared/types/sound-ids';

/** Anything that knows which creature it draws: its content id, else its race. */
export type SoundingCreep = {
  unitId?: string;
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
 * router asks the sound profiles which clip that is and plays it. Creature
 * clips are resolved once per creature when the router is made (creature ->
 * race -> default), so a hit looks its clip up without allocating.
 */
export function createGameSoundRouter(
  playSound: (soundId: SoundId) => void,
  getFallbackRace: () => RaceId,
  library: SoundProfileLibrary = SOUND_PROFILE_LIBRARY,
  creatures: readonly SoundingCreature[] = getAllUnitConfigs(),
): GameSoundRouter {
  const creepSounds = createCreepSoundTable(library, creatures);

  return {
    playTowerSound: (tower, slot) =>
      playSound(resolveTowerEntitySound(tower, getFallbackRace(), slot, library)),
    playCreepSound: (creep, slot) => {
      const resolved = creep.unitId === undefined ? undefined : creepSounds.get(creep.unitId);
      playSound(resolved?.[slot] ?? resolveCreepSound(library, creep.race, undefined, slot));
    },
  };
}

/** Router for a battlefield nobody listens to. */
export const SILENT_SOUND_ROUTER: GameSoundRouter = {
  playTowerSound: () => undefined,
  playCreepSound: () => undefined,
};
