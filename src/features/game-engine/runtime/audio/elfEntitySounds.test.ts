import { describe, expect, it } from 'vitest';
import { RaceId, TowerTypeId } from '../../../../shared/types/content-ids';
import { CreepSoundSlot, TowerSoundSlot, type SoundId } from '../../../../shared/types/sound-ids';
import { BUILDABLE_TOWER_IDS, tryResolveBuildableTowerById } from '../../../../entities/tower';
import type { BuildableTowerId, TowerEntity } from '../../../../entities/tower';
import { getAllUnitConfigs } from '../../../../entities/unit';
import { createGameSoundRouter } from './gameSoundRouting';

const CREEP_SLOTS = [
  CreepSoundSlot.HIT,
  CreepSoundSlot.DEATH,
  CreepSoundSlot.ESCAPE,
  CreepSoundSlot.SPAWN,
] as const;
const TOWER_SLOTS = [TowerSoundSlot.ATTACK, TowerSoundSlot.IMPACT] as const;

const ELF_UNIT_IDS = getAllUnitConfigs()
  .filter((unit) => unit.faction === RaceId.ELF)
  .map((unit) => unit.id);
const ELF_TOWER_IDS = BUILDABLE_TOWER_IDS.filter(
  (towerId) => tryResolveBuildableTowerById(towerId)?.faction === RaceId.ELF,
);

function createTower(buildableTowerId: BuildableTowerId): TowerEntity {
  return {
    id: 'tower-1',
    position: { x: 0, y: 0 },
    cost: 50,
    type: TowerTypeId.SINGLE,
    level: 1,
    combatStats: { damage: 10, range: 4, attackCooldownMs: 800 },
    buildableTowerId,
  };
}

/** Plays one slot for every entity and returns what each one resolved to. */
function resolveAll(play: (router: ReturnType<typeof createGameSoundRouter>) => void): SoundId[] {
  const played: SoundId[] = [];
  play(
    createGameSoundRouter(
      (soundId) => played.push(soundId),
      () => RaceId.ELF,
    ),
  );
  return played;
}

/**
 * Every elf creature and tower has a voice of its own: for each slot each one
 * resolves to its own `combat.creep.<unitId>.*` / `combat.tower.<towerId>.*`
 * clip, so no two of them sound alike in the same moment.
 */
describe('elf per-entity sounds', () => {
  it('covers the whole roster', () => {
    expect(ELF_UNIT_IDS).toHaveLength(8);
    expect(ELF_TOWER_IDS).toHaveLength(4);
  });

  it.each(CREEP_SLOTS)('gives every elf creature its own %s clip', (slot) => {
    const played = resolveAll((router) => {
      for (const unitId of ELF_UNIT_IDS) {
        router.playCreepSound({ unitId, race: RaceId.ELF }, slot);
      }
    });

    expect(new Set(played).size).toBe(ELF_UNIT_IDS.length);
    played.forEach((soundId, index) => {
      expect(soundId).toMatch(new RegExp(`^combat\\.creep\\.${ELF_UNIT_IDS[index]}\\.`));
    });
  });

  it.each(TOWER_SLOTS)('gives every elf tower its own %s clip', (slot) => {
    const played = resolveAll((router) => {
      for (const towerId of ELF_TOWER_IDS) {
        router.playTowerSound(createTower(towerId), slot);
      }
    });

    expect(new Set(played).size).toBe(ELF_TOWER_IDS.length);
    played.forEach((soundId, index) => {
      expect(soundId).toBe(`combat.tower.${ELF_TOWER_IDS[index]}.${slot}`);
    });
  });
});
