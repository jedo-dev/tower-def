import { describe, expect, it } from 'vitest';
import {
  SOUND_PROFILE_LIBRARY,
  resolveCreepSound,
  resolveTowerSound,
} from '../../../../entities/sound-profile';
import { BUILDABLE_TOWER_IDS, tryResolveBuildableTowerById } from '../../../../entities/tower';
import { getAllUnitConfigs } from '../../../../entities/unit';
import { SOUND_REGISTRY } from '../../../../shared/lib/sound-registry';
import { RaceId } from '../../../../shared/types/content-ids';
import {
  CREEP_SOUND_SLOTS,
  TowerSoundSlot,
  type SoundId,
} from '../../../../shared/types/sound-ids';

const UNDEAD_TOWER_SLOTS = [TowerSoundSlot.ATTACK, TowerSoundSlot.IMPACT] as const;

const UNDEAD_UNITS = getAllUnitConfigs().filter((unit) => unit.faction === RaceId.UNDEAD);

const UNDEAD_TOWERS = BUILDABLE_TOWER_IDS.flatMap((towerId) => {
  const tower = tryResolveBuildableTowerById(towerId);
  return tower?.faction === RaceId.UNDEAD ? [tower] : [];
});

function expectUniqueRegistered(resolved: readonly SoundId[]): void {
  expect(new Set(resolved).size).toBe(resolved.length);
  for (const soundId of resolved) {
    expect(SOUND_REGISTRY[soundId], soundId).toBeDefined();
  }
}

/**
 * tower-def-34j.2: every undead creature and tower sounds like itself, so no
 * two of them share a clip in the same slot.
 */
describe('undead entity sounds', () => {
  it('covers all eight creatures and four towers', () => {
    expect(UNDEAD_UNITS).toHaveLength(8);
    expect(UNDEAD_TOWERS).toHaveLength(4);
  });

  it.each(CREEP_SOUND_SLOTS)('gives every undead creature its own %s clip', (slot) => {
    const resolved = UNDEAD_UNITS.map((unit) =>
      resolveCreepSound(SOUND_PROFILE_LIBRARY, unit.faction, unit.sounds, slot),
    );

    expect(resolved).toEqual(
      UNDEAD_UNITS.map((unit) => expect.stringMatching(`^combat\\.creep\\.${unit.id}\\.`)),
    );
    expectUniqueRegistered(resolved);
  });

  it.each(UNDEAD_TOWER_SLOTS)('gives every undead tower its own %s clip', (slot) => {
    const resolved = UNDEAD_TOWERS.map((tower) =>
      resolveTowerSound(SOUND_PROFILE_LIBRARY, tower.faction, tower.towerType, tower.sounds, slot),
    );

    expect(resolved).toEqual(
      UNDEAD_TOWERS.map((tower) => expect.stringMatching(`^combat\\.tower\\.${tower.id}\\.`)),
    );
    expectUniqueRegistered(resolved);
  });
});
