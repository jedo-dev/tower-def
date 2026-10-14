import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from '../../../../../entities/creep';
import {
  selectTowerTarget,
  TOWER_COMBAT_STATS_BY_TYPE,
  type TowerEntity,
} from '../../../../../entities/tower';
import { UnitSizeClass } from '../../../../types/content-ids';
import type { GridPosition } from '../../../../types/pathfinding';
import { getCreepVisualMetrics } from '../creep/creepVisualMetrics';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import {
  moveCreepsAlongPath,
  type MovementRuntimeDeps,
  type MovementRuntimeState,
  type MutablePoint,
} from './gameSceneMovementRuntime';

const CELL_SIZE_PX = 16;
/** One cell per 100 ms at speed 1. */
const SPEED_PX_PER_SEC = 160;
const CONFIG = {
  creepMaxSimulationDeltaMs: 10_000,
  creepBaseMoveSpeedPxPerSec: SPEED_PX_PER_SEC,
};

/** Long winding-free single-cell route: 11 cells to the exit. */
const SMALL_ROUTE: GridPosition[] = Array.from({ length: 12 }, (_, x) => ({ x, y: 0 }));
/** Short large-creep route: 4 cells to the exit. */
const LARGE_ROUTE: GridPosition[] = Array.from({ length: 5 }, (_, x) => ({ x, y: 2 }));

function writeCellCenter(position: GridPosition, out: MutablePoint): void {
  out.x = position.x * CELL_SIZE_PX + CELL_SIZE_PX / 2;
  out.y = position.y * CELL_SIZE_PX + CELL_SIZE_PX / 2;
}

function createDeps(): MovementRuntimeDeps {
  return {
    writeCellCenter,
    onEscapedCountUpdated: vi.fn(),
    onHudChanged: vi.fn(),
    playSound: vi.fn(),
    soundRouter: { playTowerSound: vi.fn(), playCreepSound: vi.fn() },
  };
}

function createCreep(start: GridPosition, sizeClass: UnitSizeClass, speed: number) {
  const { footprintCenterOffsetPx } = getCreepVisualMetrics(sizeClass, CELL_SIZE_PX);
  const startPx = { x: 0, y: 0 };
  writeCellCenter(start, startPx);
  const sprite = {
    x: startPx.x + footprintCenterOffsetPx,
    y: startPx.y + footprintCenterOffsetPx,
    rotation: 0,
    setPosition: vi.fn(function setPosition(this: Phaser.GameObjects.Sprite, x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }),
  } as unknown as Phaser.GameObjects.Sprite;

  const creep: CreepRenderState = {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      sizeClass,
      id: `creep:${sizeClass}`,
      type: 'basic',
      hp: 100,
      lifeState: 'alive',
      speed,
      status: 'alive',
      position: { ...start },
      pathIndex: 0,
    },
    sprite,
    hitFlashRemainingMs: 0,
    deathFadeRemainingMs: 0,
    footprintCenterOffsetPx,
  };
  return creep;
}

function createState(creeps: CreepRenderState[]): MovementRuntimeState {
  return {
    activeCreeps: creeps,
    activeCreepRoutes: { small: SMALL_ROUTE, large: LARGE_ROUTE },
  };
}

const TOWER: TowerEntity = {
  id: 'tower:0',
  type: 'single',
  cost: 100,
  position: { x: 2, y: 0 },
  level: 1,
  combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE.single, range: 10 },
};

describe('tower priority across routes of different lengths', () => {
  it('tracks remaining distance along each creep’s own route, mid-segment', () => {
    const small = createCreep(SMALL_ROUTE[0], UnitSizeClass.SMALL, 1);
    const large = createCreep(LARGE_ROUTE[0], UnitSizeClass.LARGE, 0.5);

    moveCreepsAlongPath(createState([small, large]), createDeps(), CONFIG, 350);

    expect(small.entity.pathIndex).toBe(3);
    expect(small.entity.remainingRouteDistance).toBeCloseTo(7.5, 9);
    expect(large.entity.pathIndex).toBe(1);
    expect(large.entity.remainingRouteDistance).toBeCloseTo(2.25, 9);
  });

  it('targets the large creep nearer its exit despite its lower path index', () => {
    const small = createCreep(SMALL_ROUTE[0], UnitSizeClass.SMALL, 1);
    const large = createCreep(LARGE_ROUTE[0], UnitSizeClass.LARGE, 0.5);

    moveCreepsAlongPath(createState([small, large]), createDeps(), CONFIG, 350);

    expect(small.entity.pathIndex).toBeGreaterThan(large.entity.pathIndex);
    expect(selectTowerTarget(TOWER, [small.entity, large.entity])?.id).toBe(large.entity.id);
  });

  it('switches to the small creep once it is closer to its own exit', () => {
    const small = createCreep(SMALL_ROUTE[0], UnitSizeClass.SMALL, 4);
    const large = createCreep(LARGE_ROUTE[0], UnitSizeClass.LARGE, 0.5);

    moveCreepsAlongPath(createState([small, large]), createDeps(), CONFIG, 250);

    // Small: 10 cells walked, 1 left. Large: 1.25 walked, 2.75 left.
    expect(small.entity.remainingRouteDistance).toBeCloseTo(1, 9);
    expect(large.entity.remainingRouteDistance).toBeCloseTo(2.75, 9);
    expect(selectTowerTarget(TOWER, [small.entity, large.entity])?.id).toBe(small.entity.id);
  });
});
