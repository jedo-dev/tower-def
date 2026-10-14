import { describe, expect, it } from 'vitest';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { withFootprintOccupancy } from '../../../shared/lib/grid/footprint';
import { UnitMoveType, UnitSizeClass } from '../../../shared/types/content-ids';
import type { GridModel } from '../../../shared/types/grid';
import { calculateWaveRoutes, hasWaveRoute, selectWaveRoute } from './calculateWavePath';

const ENTRANCE = { x: 0, y: 7 };
const EXIT = { x: 9, y: 7 };
const WALL_X = 4;
const GAP_Y = 14;

function ground(sizeClass: UnitSizeClass) {
  return { sizeClass, moveType: UnitMoveType.GROUND };
}

/** A full-height wall at WALL_X with a single open cell at GAP_Y. */
function createGridWithOneCellGap(): GridModel {
  const grid = createGridModel({ entrance: ENTRANCE, exit: EXIT });
  const above = withFootprintOccupancy(
    grid,
    { x: WALL_X, y: 0 },
    { width: 1, height: GAP_Y },
    true,
  );
  return withFootprintOccupancy(
    above,
    { x: WALL_X, y: GAP_Y + 1 },
    { width: 1, height: grid.rows - GAP_Y - 1 },
    true,
  );
}

describe('calculateWaveRoutes', () => {
  it('returns entrance-to-exit routes for both footprints on an open grid', () => {
    const routes = calculateWaveRoutes(createGridModel({ entrance: ENTRANCE, exit: EXIT }));

    expect(hasWaveRoute(routes)).toBe(true);
    for (const route of [routes.small, routes.large]) {
      expect(route[0]).toEqual(ENTRANCE);
      expect(route[route.length - 1]).toEqual(EXIT);
    }
  });

  it('returns empty routes when the grid is blocked', () => {
    const openGrid = createGridModel({ entrance: ENTRANCE, exit: EXIT });
    const blockedGrid = withFootprintOccupancy(
      openGrid,
      { x: WALL_X, y: 0 },
      { width: 1, height: openGrid.rows },
      true,
    );

    const routes = calculateWaveRoutes(blockedGrid);

    expect(hasWaveRoute(routes)).toBe(false);
    expect(routes.large).toHaveLength(0);
  });

  it('routes medium creeps on the small route and large creeps on the large one', () => {
    const routes = calculateWaveRoutes(createGridModel({ entrance: ENTRANCE, exit: EXIT }));

    expect(selectWaveRoute(routes, ground(UnitSizeClass.SMALL))).toBe(routes.small);
    expect(selectWaveRoute(routes, ground(UnitSizeClass.MEDIUM))).toBe(routes.small);
    expect(selectWaveRoute(routes, ground(UnitSizeClass.LARGE))).toBe(routes.large);
  });

  it('falls back to the small route when only a 1-cell gap exists', () => {
    const routes = calculateWaveRoutes(createGridWithOneCellGap());

    expect(routes.small).toContainEqual({ x: WALL_X, y: GAP_Y });
    expect(routes.large).toHaveLength(0);
    expect(selectWaveRoute(routes, ground(UnitSizeClass.LARGE))).toBe(routes.small);
  });
});

describe('air route', () => {
  it('flies the straight octile line from entrance to exit, ignoring every wall', () => {
    const routes = calculateWaveRoutes(createGridWithOneCellGap());

    expect(routes.air[0]).toEqual(ENTRANCE);
    expect(routes.air[routes.air.length - 1]).toEqual(EXIT);
    expect(routes.air).toHaveLength(EXIT.x - ENTRANCE.x + 1);
    expect(routes.air).toContainEqual({ x: WALL_X, y: ENTRANCE.y });
  });

  it('exists even when the ground route is sealed', () => {
    const sealed = withFootprintOccupancy(
      createGridModel({ entrance: ENTRANCE, exit: EXIT }),
      { x: WALL_X, y: 0 },
      { width: 1, height: 30 },
      true,
    );
    const routes = calculateWaveRoutes(sealed);

    expect(hasWaveRoute(routes)).toBe(false);
    expect(routes.air.length).toBeGreaterThan(0);
  });

  it('routes every air creep on the air line whatever its size', () => {
    const routes = calculateWaveRoutes(createGridModel({ entrance: ENTRANCE, exit: EXIT }));

    for (const sizeClass of [UnitSizeClass.SMALL, UnitSizeClass.MEDIUM, UnitSizeClass.LARGE]) {
      expect(selectWaveRoute(routes, { sizeClass, moveType: UnitMoveType.AIR })).toBe(routes.air);
    }
  });
});
