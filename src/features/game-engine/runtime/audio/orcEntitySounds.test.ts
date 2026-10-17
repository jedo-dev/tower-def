import { describe, expect, it } from 'vitest';
import { createCreepSoundTable, SOUND_PROFILE_LIBRARY } from '../../../../entities/sound-profile';
import { BUILDABLE_TOWER_IDS, tryResolveBuildableTowerById } from '../../../../entities/tower';
import { getAllUnitConfigs } from '../../../../entities/unit';
import { RaceId } from '../../../../shared/types/content-ids';
import {
  CREEP_SOUND_SLOTS,
  TowerSoundSlot,
  type CreepSoundSlot,
} from '../../../../shared/types/sound-ids';
import { resolveTowerEntitySound } from './gameSoundRouting';

const CREEP_SLOT_SUFFIX: Record<CreepSoundSlot, string> = {
  creepHit: 'hit',
  creepDeath: 'death',
  creepEscape: 'escape',
  creepSpawn: 'spawn',
};

const OWN_TOWER_SLOTS = [TowerSoundSlot.ATTACK, TowerSoundSlot.IMPACT] as const;

/** Every orc creature and tower is told apart by ear: one own clip per slot. */
describe('orc entity sounds', () => {
  const orcUnits = getAllUnitConfigs().filter((unit) => unit.faction === RaceId.ORC);
  const orcTowers = BUILDABLE_TOWER_IDS.flatMap((id) => {
    const tower = tryResolveBuildableTowerById(id);
    return tower?.faction === RaceId.ORC ? [tower] : [];
  });

  it('covers all eight creatures and four towers', () => {
    expect(orcUnits).toHaveLength(8);
    expect(orcTowers).toHaveLength(4);
  });

  it.each(CREEP_SOUND_SLOTS)('gives every orc creature its own %s clip', (slot) => {
    const table = createCreepSoundTable(SOUND_PROFILE_LIBRARY, orcUnits);
    const resolved = orcUnits.map((unit) => table.get(unit.id)?.[slot]);

    expect(resolved).toEqual(
      orcUnits.map((unit) => `combat.creep.${unit.id}.${CREEP_SLOT_SUFFIX[slot]}`),
    );
    expect(new Set(resolved).size).toBe(orcUnits.length);
  });

  it.each(OWN_TOWER_SLOTS)('gives every orc tower its own %s clip', (slot) => {
    const resolved = orcTowers.map((tower) =>
      resolveTowerEntitySound(
        {
          id: 'tower-1',
          position: { x: 0, y: 0 },
          cost: 0,
          type: tower.towerType,
          level: 1,
          combatStats: { damage: 1, range: 1, attackCooldownMs: 1000 },
          buildableTowerId: tower.id,
        },
        RaceId.ORC,
        slot,
      ),
    );

    expect(resolved).toEqual(orcTowers.map((tower) => `combat.tower.${tower.id}.${slot}`));
    expect(new Set(resolved).size).toBe(orcTowers.length);
  });
});
