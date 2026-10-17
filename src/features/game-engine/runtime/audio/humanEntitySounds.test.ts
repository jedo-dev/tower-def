import { describe, expect, it } from 'vitest';
import { BUILDABLE_TOWER_IDS, tryResolveBuildableTowerById } from '../../../../entities/tower';
import type { BuildableTowerConfig } from '../../../../entities/tower';
import { getAllUnitConfigs } from '../../../../entities/unit';
import { SOUND_ASSET_PATHS } from '../../../../shared/lib/sound-registry';
import { RaceId } from '../../../../shared/types/content-ids';
import {
  CREEP_SOUND_SLOTS,
  TowerSoundSlot,
  type SoundId,
} from '../../../../shared/types/sound-ids';
import { createGameSoundRouter, resolveTowerEntitySound } from './gameSoundRouting';

const HUMAN_UNIT_IDS = getAllUnitConfigs()
  .filter((unit) => unit.faction === RaceId.HUMAN)
  .map((unit) => unit.id);

const HUMAN_TOWERS = BUILDABLE_TOWER_IDS.map((id) => tryResolveBuildableTowerById(id)).filter(
  (tower): tower is BuildableTowerConfig => tower?.faction === RaceId.HUMAN,
);

/** Tower slots every authored human tower owns a clip for. */
const OWN_TOWER_SLOTS = [TowerSoundSlot.ATTACK, TowerSoundSlot.IMPACT] as const;

describe('human per-entity sounds', () => {
  it('covers all eight creatures and four towers', () => {
    expect(HUMAN_UNIT_IDS).toHaveLength(8);
    expect(HUMAN_TOWERS).toHaveLength(4);
  });

  it.each(CREEP_SOUND_SLOTS)('gives every human creature its own %s clip', (slot) => {
    const played: SoundId[] = [];
    const router = createGameSoundRouter(
      (soundId) => played.push(soundId),
      () => RaceId.HUMAN,
    );

    for (const unitId of HUMAN_UNIT_IDS) {
      router.playCreepSound({ unitId, race: RaceId.HUMAN }, slot);
    }

    expect(new Set(played).size).toBe(HUMAN_UNIT_IDS.length);
    played.forEach((soundId, index) => {
      expect(soundId).toMatch(new RegExp(`^combat\\.creep\\.${HUMAN_UNIT_IDS[index]}\\.`));
      expect(SOUND_ASSET_PATHS[soundId], soundId).toContain('combat/human/creeps/');
    });
  });

  it.each(OWN_TOWER_SLOTS)('gives every human tower its own %s clip', (slot) => {
    const resolved = HUMAN_TOWERS.map((tower) =>
      resolveTowerEntitySound(
        {
          id: `placed-${tower.id}`,
          buildableTowerId: tower.id,
          position: { x: 0, y: 0 },
          cost: tower.costGold,
          type: tower.towerType,
          level: 1,
          combatStats: {
            damage: tower.damage,
            range: tower.range,
            attackCooldownMs: tower.attackCooldownMs,
          },
        },
        RaceId.ORC,
        slot,
      ),
    );

    expect(new Set(resolved).size).toBe(HUMAN_TOWERS.length);
    resolved.forEach((soundId, index) => {
      expect(soundId).toBe(`combat.tower.${HUMAN_TOWERS[index]?.id}.${slot}`);
      expect(SOUND_ASSET_PATHS[soundId], soundId).toContain('combat/human/towers/');
    });
  });
});
