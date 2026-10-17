import {
  SOUND_PROFILE_LIBRARY,
  resolveCreepSound,
  resolveTowerSound,
  type SoundProfileLibrary,
} from '../../../entities/sound-profile';
import type { BuildableTowerConfig } from '../../../entities/tower';
import type { UnitConfig } from '../../../entities/unit';
import {
  CreepSoundSlot,
  TowerSoundSlot,
  type CreepSoundSlot as CreepSlot,
  type TowerSoundSlot as TowerSlot,
} from '../../../shared/types/sound-ids';
import type { SoundCueViewModel } from './types';

type CueSpec<TSlot> = { slot: TSlot; label: string };

const CREEP_CUES: readonly CueSpec<CreepSlot>[] = [
  { slot: CreepSoundSlot.HIT, label: 'Hit' },
  { slot: CreepSoundSlot.DEATH, label: 'Death' },
  { slot: CreepSoundSlot.ESCAPE, label: 'Escape' },
  { slot: CreepSoundSlot.SPAWN, label: 'Spawn' },
];

const TOWER_CUES: readonly CueSpec<TowerSlot>[] = [
  { slot: TowerSoundSlot.ATTACK, label: 'Attack' },
  { slot: TowerSoundSlot.IMPACT, label: 'Impact' },
];

/** Hit, death, escape and spawn clips of one creature, resolved like the game does. */
export function creepSoundCues(
  unit: Pick<UnitConfig, 'faction' | 'sounds'>,
  library: SoundProfileLibrary = SOUND_PROFILE_LIBRARY,
): SoundCueViewModel[] {
  return CREEP_CUES.map(({ slot, label }) => ({
    slot,
    label,
    soundId: resolveCreepSound(library, unit.faction, unit.sounds, slot),
  }));
}

/**
 * Attack and impact clips of one tower, plus its upgrade clip when the tower,
 * its archetype or its race gives it one of its own.
 */
export function towerSoundCues(
  tower: Pick<BuildableTowerConfig, 'faction' | 'towerType' | 'sounds'>,
  library: SoundProfileLibrary = SOUND_PROFILE_LIBRARY,
): SoundCueViewModel[] {
  const resolve = (slot: TowerSlot) =>
    resolveTowerSound(library, tower.faction, tower.towerType, tower.sounds, slot);
  const cues: SoundCueViewModel[] = TOWER_CUES.map(({ slot, label }) => ({
    slot,
    label,
    soundId: resolve(slot),
  }));

  const upgrade = resolve(TowerSoundSlot.UPGRADE);
  if (upgrade !== library.defaultProfile.sounds[TowerSoundSlot.UPGRADE]) {
    cues.push({ slot: TowerSoundSlot.UPGRADE, label: 'Upgrade', soundId: upgrade });
  }
  return cues;
}
