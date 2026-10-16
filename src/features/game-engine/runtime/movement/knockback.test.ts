import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CREEP_COMBAT_TRAITS,
  queueCreepKnockback,
  takePendingKnockbackCells,
  type CreepEntity,
} from '../../../../entities/creep';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { UnitSizeClass } from '../../../../shared/types/content-ids';
import type { WaveRoutes } from '../../../../shared/lib/pathfinding/waveRoutes';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import { walkCreepsAlongRoutes, type MutablePoint, type RouteWalkMotion } from './routeWalk';

// Knockback (tower-def-bge.9): a queued push walks the creep back along its
// own route on the next movement step, clamped to the route start.

const CELL = GRID_DIMENSIONS.cellSize;
const ROUTE: GridPosition[] = Array.from({ length: 11 }, (_, x) => ({ x, y: 0 }));
const ROUTES: WaveRoutes = { small: ROUTE, large: ROUTE, air: ROUTE };

type Walker = { entity: CreepEntity; positionPx: MutablePoint };

function writeCellCenter(position: GridPosition, out: MutablePoint): void {
  out.x = position.x * CELL + CELL / 2;
  out.y = position.y * CELL + CELL / 2;
}

const STANDING_MOTION: RouteWalkMotion<Walker> = {
  writeCellCenter,
  baseMoveSpeedPxPerSec: 0,
  readPositionPx: (walker, out) => {
    out.x = walker.positionPx.x;
    out.y = walker.positionPx.y;
  },
  commitMove: (walker, position) => {
    walker.positionPx.x = position.x;
    walker.positionPx.y = position.y;
  },
};

/** A creep `cellsAlong` cells down the straight route (its anchor cell centre). */
function walker(cellsAlong: number, sizeClass: UnitSizeClass = UnitSizeClass.MEDIUM): Walker {
  const pathIndex = Math.floor(cellsAlong);
  return {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      sizeClass,
      id: 'creep',
      type: 'basic',
      hp: 100,
      lifeState: 'alive',
      speed: 1,
      status: 'alive',
      position: { x: pathIndex, y: 0 },
      pathIndex,
      remainingRouteDistance: 10 - cellsAlong,
    },
    positionPx: { x: cellsAlong * CELL + CELL / 2, y: CELL / 2 },
  };
}

function step(creep: Walker): void {
  walkCreepsAlongRoutes([creep], ROUTES, STANDING_MOTION, 50, () => undefined);
}

describe('queueCreepKnockback', () => {
  it('keeps the strongest queued push and clears it when taken', () => {
    const { entity } = walker(5);
    queueCreepKnockback(entity, 0.5);
    queueCreepKnockback(entity, 1);
    queueCreepKnockback(entity, 0.75);
    expect(takePendingKnockbackCells(entity)).toBe(1);
    expect(takePendingKnockbackCells(entity)).toBe(0);
  });

  it('leaves large and dead creeps where they are', () => {
    const large = walker(5, UnitSizeClass.LARGE).entity;
    queueCreepKnockback(large, 1);
    expect(large.pendingKnockbackCells).toBeUndefined();
    const dead = { ...walker(5).entity, status: 'dead' as const };
    queueCreepKnockback(dead, 1);
    expect(dead.pendingKnockbackCells).toBeUndefined();
  });
});

describe('knockback in the movement step', () => {
  it('walks the creep back along its route and raises its remaining distance', () => {
    const creep = walker(5.5);
    queueCreepKnockback(creep.entity, 2);
    step(creep);

    expect(creep.positionPx.x).toBeCloseTo(3.5 * CELL + CELL / 2);
    expect(creep.entity.pathIndex).toBe(3);
    expect(creep.entity.position).toEqual({ x: 3, y: 0 });
    expect(creep.entity.remainingRouteDistance).toBeCloseTo(6.5);
    expect(creep.entity.pendingKnockbackCells).toBe(0);
  });

  it('clamps the push to the route start', () => {
    const creep = walker(1.5);
    queueCreepKnockback(creep.entity, 3);
    step(creep);

    expect(creep.positionPx.x).toBeCloseTo(CELL / 2);
    expect(creep.entity.pathIndex).toBe(0);
    expect(creep.entity.remainingRouteDistance).toBeCloseTo(10);
  });
});
