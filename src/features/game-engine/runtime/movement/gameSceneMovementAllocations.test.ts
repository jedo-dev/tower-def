import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CREEP_COMBAT_TRAITS,
  applyEffectToCreep,
  type CreepEntity,
} from '../../../../entities/creep';
import { createSeededRandom } from '../../../../shared/lib/random/createSeededRandom';
import { hasWaveRoute, type WaveRoute } from '../../../../shared/lib/pathfinding/waveRoutes';
import { EffectId, UNIT_SIZE_CLASSES, UnitMoveType } from '../../../../shared/types/content-ids';
import { CreepSoundSlot } from '../../../../shared/types/sound-ids';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import { applyCreepFacing } from '../animation/creepFacing';
import { syncCreepEffectPipPosition } from '../combat/creepEffectVisuals';
import {
  moveCreepsAlongPath,
  type MovementRuntimeConfig,
  type MovementRuntimeDeps,
  type MovementRuntimeState,
  type MutablePoint,
} from './gameSceneMovementRuntime';
import { walkCreepsAlongRoutes } from './routeWalk';

// tower-def-z6m: moveCreepsAlongPath reuses one motion object and one exit
// callback instead of building a pair per frame. The pre-rewrite version is
// kept below verbatim and both walk the same seeded random fields.

function referenceMarkCreepEscaped(
  state: MovementRuntimeState,
  deps: MovementRuntimeDeps,
  creep: CreepRenderState,
): void {
  if (creep.entity.status === 'escaped') {
    return;
  }

  creep.entity.status = 'escaped';
  deps.soundRouter.playCreepSound(creep, CreepSoundSlot.ESCAPE);
  deps.playSound('economy.life_lost');
  deps.onHudChanged();

  const escapedCount = state.activeCreeps.filter(
    (candidate) => candidate.entity.status === 'escaped',
  ).length;
  deps.onEscapedCountUpdated(escapedCount);
}

function referenceFaceCurrentSegment(creep: CreepRenderState, route: WaveRoute): void {
  const index = creep.entity.pathIndex;
  const fromIndex = index + 1 < route.length ? index : index - 1;
  if (fromIndex < 0) {
    return;
  }

  const from = route[fromIndex];
  const to = route[fromIndex + 1];
  applyCreepFacing(creep, to.x - from.x, to.y - from.y);
}

function referenceMoveCreepsAlongPath(
  state: MovementRuntimeState,
  deps: MovementRuntimeDeps,
  config: MovementRuntimeConfig,
  deltaMs: number,
): void {
  if (!hasWaveRoute(state.activeCreepRoutes) || state.activeCreeps.length === 0) {
    return;
  }

  const normalizedDeltaMs = Math.min(deltaMs, config.creepMaxSimulationDeltaMs);

  walkCreepsAlongRoutes(
    state.activeCreeps,
    state.activeCreepRoutes,
    {
      writeCellCenter: deps.writeCellCenter,
      baseMoveSpeedPxPerSec: config.creepBaseMoveSpeedPxPerSec,
      readPositionPx: (creep: CreepRenderState, out: MutablePoint) => {
        out.x = creep.sprite.x;
        out.y = creep.sprite.y;
      },
      commitMove: (creep: CreepRenderState, position: MutablePoint, route: WaveRoute) => {
        creep.sprite.setPosition(position.x, position.y);
        syncCreepEffectPipPosition(creep);
        referenceFaceCurrentSegment(creep, route);
      },
    },
    normalizedDeltaMs,
    (creep) => referenceMarkCreepEscaped(state, deps, creep),
  );
}

type Log = string[];

function createSpriteStub(): Phaser.GameObjects.Sprite {
  const sprite = {
    x: 0,
    y: 0,
    rotation: 0,
    setPosition(x: number, y: number) {
      sprite.x = x;
      sprite.y = y;
      return sprite;
    },
  };
  return sprite as unknown as Phaser.GameObjects.Sprite;
}

function createDeps(log: Log, name: string, cellPx: number): MovementRuntimeDeps {
  return {
    writeCellCenter: (position, out) => {
      out.x = position.x * cellPx;
      out.y = position.y * cellPx;
    },
    onEscapedCountUpdated: (count) => log.push(`${name} escaped ${count}`),
    onHudChanged: () => log.push(`${name} hud`),
    playSound: (soundId) => log.push(`${name} sound ${soundId}`),
    soundRouter: {
      playTowerSound: () => undefined,
      playCreepSound: (_creep, slot) => log.push(`${name} creep sound ${slot}`),
    },
  };
}

function createRandomRoute(random: () => number, length: number): WaveRoute {
  const route = [{ x: 0, y: 0 }];
  for (let index = 1; index < length; index += 1) {
    const last = route[index - 1];
    route.push({
      x: last.x + Math.floor(random() * 3) - 1 || 1,
      y: last.y + Math.floor(random() * 3) - 1,
    });
  }
  return route;
}

/** Deterministic in `seed`: two calls give two identical, independent fields. */
function createRandomState(seed: number): MovementRuntimeState {
  const random = createSeededRandom(seed);
  const small = createRandomRoute(random, 2 + Math.floor(random() * 10));
  const large = random() < 0.3 ? [] : createRandomRoute(random, 2 + Math.floor(random() * 10));
  const air = createRandomRoute(random, 2 + Math.floor(random() * 4));
  const activeCreeps: CreepRenderState[] = [];
  const creepCount = Math.floor(random() * 25);
  for (let index = 0; index < creepCount; index += 1) {
    let entity: CreepEntity = {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id: `creep:${index}`,
      type: 'basic',
      hp: 100,
      lifeState: 'alive' as const,
      speed: 0.5 + random() * 2,
      status: random() < 0.1 ? ('dead' as const) : ('alive' as const),
      position: { x: 0, y: 0 },
      pathIndex: 0,
      moveType: random() < 0.3 ? UnitMoveType.AIR : UnitMoveType.GROUND,
      sizeClass: UNIT_SIZE_CLASSES[Math.floor(random() * UNIT_SIZE_CLASSES.length)],
    };
    if (random() < 0.2) {
      entity = applyEffectToCreep(entity, {
        effectId: random() < 0.5 ? EffectId.CHILL : EffectId.STUN,
      });
    }
    activeCreeps.push({
      entity,
      sprite: createSpriteStub(),
      hitFlashRemainingMs: 0,
      deathFadeRemainingMs: 0,
      footprintCenterOffsetPx: random() < 0.3 ? 8 : 0,
      isDirectional: false,
    });
  }
  return { activeCreeps, activeCreepRoutes: { small, large, air } };
}

function snapshot(state: MovementRuntimeState): unknown {
  return state.activeCreeps.map((creep) => ({
    entity: creep.entity,
    x: creep.sprite.x,
    y: creep.sprite.y,
    rotation: creep.sprite.rotation,
  }));
}

const CONFIG: MovementRuntimeConfig = {
  creepMaxSimulationDeltaMs: 100,
  creepBaseMoveSpeedPxPerSec: 60,
};

describe('moveCreepsAlongPath with a reused motion object', () => {
  it('matches the pre-rewrite walk on 250 seeded random fields, two fields interleaved', () => {
    let fieldsWithEscapes = 0;
    for (let seed = 1; seed <= 250; seed += 1) {
      const expectedLog: Log = [];
      const actualLog: Log = [];
      const expected = [createRandomState(seed), createRandomState(seed + 10_000)];
      const actual = [createRandomState(seed), createRandomState(seed + 10_000)];
      const expectedDeps = [createDeps(expectedLog, 'a', 16), createDeps(expectedLog, 'b', 24)];
      const actualDeps = [createDeps(actualLog, 'a', 16), createDeps(actualLog, 'b', 24)];
      const random = createSeededRandom(seed);

      for (let frame = 0; frame < 40; frame += 1) {
        const deltaMs = Math.floor(random() * 150);
        for (let field = 0; field < 2; field += 1) {
          referenceMoveCreepsAlongPath(expected[field], expectedDeps[field], CONFIG, deltaMs);
          moveCreepsAlongPath(actual[field], actualDeps[field], CONFIG, deltaMs);
        }
      }

      expect(actualLog, `seed ${seed}`).toEqual(expectedLog);
      expect(actual.map(snapshot), `seed ${seed}`).toEqual(expected.map(snapshot));
      fieldsWithEscapes += expectedLog.some((line) => line.includes('escaped')) ? 1 : 0;
    }
    expect(fieldsWithEscapes).toBeGreaterThan(100);
  });
});
