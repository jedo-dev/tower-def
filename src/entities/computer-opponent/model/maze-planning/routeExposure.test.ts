import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { createGridModel } from '../../../../shared/lib/grid/createGridModel';
import { withFootprintOccupancy } from '../../../../shared/lib/grid/footprint';
import type { GridPoint } from '../../../../shared/types/grid';
import { collectStandingBlocks, countRouteExposure } from './routeExposure';

/** A straight route along row 10, from column 0 to column 19. */
const ROW_ROUTE: GridPoint[] = Array.from({ length: 20 }, (_, x) => ({ x, y: 10 }));

describe('computer-opponent/maze-planning/routeExposure', () => {
  it('counts the route samples in reach of each block', () => {
    // Block centre (11, 13), samples 2.5 cells up: the four with |dx| <= 1.5 are in reach of 3.
    const exposure = countRouteExposure(ROW_ROUTE, [{ x: 10, y: 12 }], 3);

    expect(exposure).toBe(4);
  });

  it('adds the blocks up, so two blocks over the same samples count them twice', () => {
    const one = countRouteExposure(ROW_ROUTE, [{ x: 4, y: 11 }], 4);
    const two = countRouteExposure(
      ROW_ROUTE,
      [
        { x: 4, y: 11 },
        { x: 4, y: 8 },
      ],
      4,
    );

    expect(one).toBeGreaterThan(0);
    expect(two).toBe(one * 2);
  });

  it('counts a route that passes a block twice twice', () => {
    const backAndForth = [...ROW_ROUTE, ...ROW_ROUTE.map((cell) => ({ x: cell.x, y: 13 }))];
    const block = [{ x: 9, y: 11 }];

    expect(countRouteExposure(backAndForth, block, 4)).toBe(
      2 * countRouteExposure(ROW_ROUTE, block, 4),
    );
  });

  it('is zero without blocks, without a route, or out of reach', () => {
    expect(countRouteExposure(ROW_ROUTE, [], 4)).toBe(0);
    expect(countRouteExposure([], [{ x: 4, y: 11 }], 4)).toBe(0);
    expect(countRouteExposure(ROW_ROUTE, [{ x: 4, y: 20 }], 4)).toBe(0);
  });

  it('finds the anchor of every standing tower block', () => {
    const anchors: GridPoint[] = [
      { x: 4, y: 4 },
      { x: 6, y: 4 },
      { x: 5, y: 6 },
      { x: 12, y: 20 },
    ];
    const grid = anchors.reduce(
      (current, anchor) => withFootprintOccupancy(current, anchor, TOWER_FOOTPRINT, true),
      createGridModel({ entrance: { x: 0, y: 0 }, exit: { x: 18, y: 28 } }),
    );

    expect(collectStandingBlocks(grid)).toEqual(anchors);
  });
});
