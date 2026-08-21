import { describe, expect, it } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from '../../../../entities/creep';
import type { CreepEntity } from '../../../../entities/creep';
import { resolveUnitConfigById } from '../../../../entities/unit';
import { CreepTypeId } from '../../../types/content-ids';
import type { CreepRenderState, PendingWaveSpawn } from './gameScene.types';
import { buildHudWaveQueue, buildHudWaveQueueWithPending } from './gameScene.helpers';

function createCreepRenderState(
  id: string,
  status: CreepEntity['status'],
): CreepRenderState {
  return {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id,
      type: CreepTypeId.BASIC,
      hp: status === 'alive' ? 10 : 0,
      lifeState: status === 'escaped' ? 'alive' : status,
      speed: 1,
      status,
      position: { x: 0, y: 0 },
      pathIndex: 0,
    },
    sprite: {} as CreepRenderState['sprite'],
    hitFlashRemainingMs: 0,
    deathFadeRemainingMs: 0,
  };
}

function createPendingSpawn(unitId: string, sequenceIndex: number): PendingWaveSpawn {
  return {
    unit: resolveUnitConfigById(unitId as Parameters<typeof resolveUnitConfigById>[0]),
    spawnAtMs: sequenceIndex * 100,
    sequenceIndex,
  };
}

describe('buildHudWaveQueue', () => {
  it('assigns gap-free sequential indexes when dead creeps are filtered out', () => {
    const queue = buildHudWaveQueue([
      createCreepRenderState('c0', 'alive'),
      createCreepRenderState('c1', 'dead'),
      createCreepRenderState('c2', 'alive'),
      createCreepRenderState('c3', 'escaped'),
      createCreepRenderState('c4', 'alive'),
    ]);

    expect(queue.map((item) => item.index)).toEqual([0, 1, 2]);
  });

  it('produces unique indexes for an all-alive queue', () => {
    const queue = buildHudWaveQueue(
      Array.from({ length: 6 }, (_, index) => createCreepRenderState(`c${index}`, 'alive')),
    );

    expect(new Set(queue.map((item) => item.index)).size).toBe(queue.length);
  });
});

describe('buildHudWaveQueueWithPending', () => {
  it('never repeats an index across live creeps and pending spawns', () => {
    const queue = buildHudWaveQueueWithPending(
      [
        createCreepRenderState('c0', 'alive'),
        createCreepRenderState('c1', 'dead'),
        createCreepRenderState('c2', 'alive'),
      ],
      [createPendingSpawn('undead_ghoul', 0), createPendingSpawn('undead_skeleton', 1)],
    );

    const keys = queue.map((item) => `${item.type}-${item.index}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(queue.map((item) => item.index)).toEqual([0, 1, 2, 3]);
  });

  it('keeps indexes unique when most of the wave has already died', () => {
    const queue = buildHudWaveQueueWithPending(
      [
        createCreepRenderState('c0', 'dead'),
        createCreepRenderState('c1', 'dead'),
        createCreepRenderState('c2', 'dead'),
        createCreepRenderState('c3', 'alive'),
      ],
      [createPendingSpawn('undead_ghoul', 0)],
    );

    expect(new Set(queue.map((item) => item.index)).size).toBe(queue.length);
  });
});
