import { describe, expect, it } from 'vitest';
import { createCreepAbilityRuntime } from '../../../../entities/creep';
import { getRemainingRouteDistance } from '../../../../shared/lib/pathfinding/routeProgress';
import { EMPTY_WAVE_ROUTES, type WaveRoutes } from '../../../../shared/lib/pathfinding/waveRoutes';
import type { CreatureAbilities } from '../../../../shared/types/creatureAbilities';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import { createFixtureCreep } from '../../test/combatCoreFixtures';
import { walkCreepsAlongRoutes, type MutablePoint, type RouteWalkMotion } from './routeWalk';

// Movement-core integration of the creature speed abilities, walked through
// `walkCreepsAlongRoutes` like the game scene and the headless duel.

const CELL_SIZE_PX = 10;
/** One cell per 100 ms at speed 1. */
const SPEED_PX_PER_SEC = 100;
/** A straight 20-cell route. */
const ROUTE: GridPosition[] = Array.from({ length: 21 }, (_, x) => ({ x, y: 0 }));
const ROUTES: WaveRoutes = { ...EMPTY_WAVE_ROUTES, small: ROUTE, large: ROUTE };

type Walker = ReturnType<typeof createFixtureCreep> & { positionPx: MutablePoint };

function writeCellCenter(position: GridPosition, out: MutablePoint): void {
  out.x = position.x * CELL_SIZE_PX;
  out.y = position.y * CELL_SIZE_PX;
}

const MOTION: RouteWalkMotion<Walker> = {
  writeCellCenter,
  baseMoveSpeedPxPerSec: SPEED_PX_PER_SEC,
  readPositionPx: (creep, out) => {
    out.x = creep.positionPx.x;
    out.y = creep.positionPx.y;
  },
  commitMove: (creep, position) => {
    creep.positionPx.x = position.x;
    creep.positionPx.y = position.y;
  },
};

function createWalker(abilities?: CreatureAbilities, hp = 10_000): Walker {
  const routeDistance = getRemainingRouteDistance(ROUTE, 0, 1);
  const creep = createFixtureCreep(
    'walker',
    { x: 0, y: 0 },
    {
      hp,
      remainingRouteDistance: routeDistance,
      ...(abilities === undefined
        ? {}
        : { abilities, ...createCreepAbilityRuntime(abilities, routeDistance) }),
    },
  );
  return { ...creep, positionPx: { x: 0, y: 0 } };
}

/** Cells walked after `deltaMs` in 100 ms steps. */
function walk(walker: Walker, deltaMs: number): number {
  for (let elapsed = 0; elapsed < deltaMs; elapsed += 100) {
    walkCreepsAlongRoutes([walker], ROUTES, MOTION, 100, () => undefined);
  }
  return walker.positionPx.x / CELL_SIZE_PX;
}

describe('creature speed abilities', () => {
  it('walk at the plain speed without abilities', () => {
    expect(walk(createWalker(), 1_000)).toBeCloseTo(10);
  });

  it('speedBoostBelowHpShare speeds up a wounded creep only', () => {
    const boost = { speedBoostBelowHpShare: { hpShare: 0.5, speedMultiplier: 2 } };
    expect(walk(createWalker(boost), 500)).toBeCloseTo(5);
    expect(walk(createWalker(boost, 4_000), 500)).toBeCloseTo(10);
  });

  it('speedBoostLastRouteShare speeds up the last share of the route', () => {
    const walker = createWalker({
      speedBoostLastRouteShare: { routeShare: 0.5, speedMultiplier: 2 },
    });

    expect(walk(walker, 1_000)).toBeCloseTo(10);
    expect(walk(walker, 300)).toBeCloseTo(16);
  });

  it('secondLife speedMultiplier applies once the creep is on its second life', () => {
    const walker = createWalker({ secondLife: { hpShare: 0.5, speedMultiplier: 0.5 } });
    walker.entity.isOnSecondLife = true;
    expect(walk(walker, 1_000)).toBeCloseTo(5);
  });
});
