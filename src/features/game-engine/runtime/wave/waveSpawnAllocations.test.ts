import { describe, expect, it, vi } from 'vitest';
import { undeadUnits } from '../../../../entities/unit';
import { createSeededRandom } from '../../../../shared/lib/random/createSeededRandom';
import type { CreepRenderState, PendingWaveSpawn } from '../../scenes/gameScene.types';
import {
  processPendingWaveSpawns,
  type FieldSpawnDeps,
  type FieldSpawnState,
} from './fieldWaveSpawns';
import { hasReadyWaveSpawn, takeReadyWaveSpawns } from './waveSpawnCore';

// tower-def-z6m: frames between spawns no longer copy the schedule. The
// pre-rewrite step (split the schedule every frame, spawn what is ready) is
// replayed next to the live one on seeded random schedules.

const ROUTES = {
  small: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  large: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  air: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
};

function createSpriteStub(): Phaser.GameObjects.Sprite {
  return {
    destroy: vi.fn(),
    play: vi.fn(),
    setDepth: vi.fn(),
    setDisplaySize: vi.fn(),
    setTint: vi.fn(),
  } as unknown as Phaser.GameObjects.Sprite;
}

const SPAWN_DEPS: FieldSpawnDeps = {
  getSpriteKeyByUnit: () => 'unit:sprite',
  getAnimationKeyByUnit: () => 'unit:walk',
  getCreepTypeFromUnit: () => 'basic',
  toCellCenter: (position) => position,
  createCreepSprite: () => createSpriteStub(),
};

/** A schedule in random order (not only the sorted one `scheduleWaveSpawns` builds). */
function createRandomSchedule(random: () => number): PendingWaveSpawn[] {
  return Array.from({ length: Math.floor(random() * 30) }, (_, index) => ({
    unit: undeadUnits[Math.floor(random() * undeadUnits.length)],
    sequenceIndex: index,
    spawnAtMs: Math.floor(random() * 5_000),
    ...(random() < 0.3 ? { sender: 'player' as const } : {}),
  }));
}

function createState(schedule: PendingWaveSpawn[]): FieldSpawnState {
  return {
    activeCreeps: [],
    activeCreepRoutes: ROUTES,
    pendingWaveSpawns: schedule,
    currentWaveNumber: 3,
  };
}

const spawnedIds = (creeps: readonly CreepRenderState[]): string[] =>
  creeps.map((creep) => creep.entity.id);

describe('wave spawning without a per-frame schedule copy', () => {
  it('hasReadyWaveSpawn agrees with the split on 500 seeded schedules', () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const random = createSeededRandom(seed);
      const schedule = createRandomSchedule(random);
      const nowMs = Math.floor(random() * 5_000);
      expect(hasReadyWaveSpawn(schedule, nowMs), `seed ${seed}`).toBe(
        takeReadyWaveSpawns(schedule, nowMs).ready.length > 0,
      );
    }
  });

  it('spawns and keeps exactly what the per-frame split did, on 250 seeded schedules', () => {
    for (let seed = 1; seed <= 250; seed += 1) {
      const random = createSeededRandom(seed);
      const schedule = createRandomSchedule(random);
      const state = createState([...schedule]);
      let expectedPending: readonly PendingWaveSpawn[] = schedule;
      const expectedSpawned: string[] = [];

      for (let nowMs = 0; nowMs <= 5_200; nowMs += 1 + Math.floor(random() * 120)) {
        const { ready, pending } = takeReadyWaveSpawns(expectedPending, nowMs);
        expectedPending = pending;
        for (const spawn of ready) {
          expectedSpawned.push(`wave:creep:3:${spawn.sequenceIndex}`);
        }

        processPendingWaveSpawns(state, SPAWN_DEPS, nowMs);

        expect(state.pendingWaveSpawns, `seed ${seed} at ${nowMs}`).toEqual(expectedPending);
        expect(spawnedIds(state.activeCreeps), `seed ${seed} at ${nowMs}`).toEqual(expectedSpawned);
      }
    }
  });

  it('keeps the same schedule array on frames where nothing is due', () => {
    const schedule = createRandomSchedule(createSeededRandom(4)).map((spawn, index) => ({
      ...spawn,
      spawnAtMs: 1_000 + index,
    }));
    const state = createState(schedule);

    for (let nowMs = 0; nowMs < 1_000; nowMs += 16) {
      processPendingWaveSpawns(state, SPAWN_DEPS, nowMs);
    }

    expect(state.pendingWaveSpawns).toBe(schedule);
    expect(state.activeCreeps).toHaveLength(0);
  });
});
