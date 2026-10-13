import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../constants/footprint';
import type { GridModel } from '../../types/grid';
import { createGridModel } from '../grid/createGridModel';
import { createDefaultEdgeEndpoints } from '../grid/generateEdgeEndpoints';
import {
  canPlaceFootprint,
  projectFootprintPlacementRoutes,
  validateFootprintPlacementPath,
} from './validateFootprintPlacement';

const ENDPOINTS = createDefaultEdgeEndpoints();

function blockWhere(grid: GridModel, isBlocked: (x: number, y: number) => boolean): GridModel {
  return {
    ...grid,
    cells: grid.cells.map((cell) =>
      isBlocked(cell.x, cell.y) ? { ...cell, isOccupied: true, isWalkable: false } : cell,
    ),
  };
}

/** Walls off columns 8..9 except the `gapRows` rows starting at `gapRow`. */
function createWalledGrid(gapRow: number, gapRows = 2): GridModel {
  return blockWhere(
    createGridModel(ENDPOINTS),
    (x, y) => (x === 8 || x === 9) && (y < gapRow || y >= gapRow + gapRows),
  );
}

describe('shared/pathfinding/validateFootprintPlacement', () => {
  it('accepts a block that leaves the route open', () => {
    const grid = createGridModel(ENDPOINTS);

    expect(validateFootprintPlacementPath(grid, { x: 6, y: 3 }, TOWER_FOOTPRINT)).toBe(true);
    expect(canPlaceFootprint(grid, { x: 6, y: 3 }, TOWER_FOOTPRINT)).toBe(true);
  });

  it('rejects a block that seals the last gap, judging all four cells', () => {
    const grid = createWalledGrid(10);

    expect(validateFootprintPlacementPath(grid, { x: 8, y: 10 }, TOWER_FOOTPRINT)).toBe(false);
  });

  it('rejects a block that leaves only a one-cell gap, since large creeps need two', () => {
    const grid = createWalledGrid(10, 3);

    expect(validateFootprintPlacementPath(grid, { x: 8, y: 10 }, TOWER_FOOTPRINT)).toBe(false);
    expect(validateFootprintPlacementPath(grid, { x: 7, y: 11 }, TOWER_FOOTPRINT)).toBe(false);
    expect(canPlaceFootprint(grid, { x: 8, y: 11 }, TOWER_FOOTPRINT)).toBe(false);
  });

  it('accepts a block that keeps a two-cell gap open', () => {
    const grid = createWalledGrid(10, 4);

    expect(validateFootprintPlacementPath(grid, { x: 8, y: 10 }, TOWER_FOOTPRINT)).toBe(true);
    expect(canPlaceFootprint(grid, { x: 8, y: 12 }, TOWER_FOOTPRINT)).toBe(true);
  });

  it('rejects a block that seals the route by touching another wall at a corner', () => {
    const grid = blockWhere(
      createGridModel(ENDPOINTS),
      (x, y) => ((x === 8 || x === 9) && y <= 11) || ((x === 10 || x === 11) && y >= 14),
    );

    expect(validateFootprintPlacementPath(grid, { x: 3, y: 3 }, TOWER_FOOTPRINT)).toBe(true);
    expect(canPlaceFootprint(grid, { x: 8, y: 12 }, TOWER_FOOTPRINT)).toBe(false);
  });

  it('rejects blocks off the grid or over the route anchors', () => {
    const grid = createGridModel(ENDPOINTS);

    expect(validateFootprintPlacementPath(grid, { x: -1, y: 3 }, TOWER_FOOTPRINT)).toBe(false);
    expect(validateFootprintPlacementPath(grid, ENDPOINTS.entrance, TOWER_FOOTPRINT)).toBe(false);
    expect(
      canPlaceFootprint(grid, { x: ENDPOINTS.exit.x - 1, y: ENDPOINTS.exit.y }, TOWER_FOOTPRINT),
    ).toBe(false);
  });

  it('projects both routes with the block placed, so they can diverge', () => {
    // Wall at columns 8..9 with a three-row gap by the lane and a two-row gap far up.
    const grid = blockWhere(
      createGridModel(ENDPOINTS),
      (x, y) => (x === 8 || x === 9) && !(y >= 13 && y <= 15) && !(y >= 2 && y <= 3),
    );

    // The block leaves a one-cell gap at row 15: small creeps squeeze through,
    // large ones detour to the far gap.
    const routes = projectFootprintPlacementRoutes(grid, { x: 8, y: 13 }, TOWER_FOOTPRINT);

    expect(routes).not.toBeNull();
    expect(routes?.small).toContainEqual({ x: 8, y: 15 });
    expect(routes?.large).toContainEqual({ x: 8, y: 2 });
    expect(routes?.large.length).toBeGreaterThan(routes?.small.length ?? 0);
  });

  it('projects nothing for a block that fails the path rule', () => {
    expect(
      projectFootprintPlacementRoutes(createWalledGrid(10), { x: 8, y: 10 }, TOWER_FOOTPRINT),
    ).toBeNull();
  });
});
