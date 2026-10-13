import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../constants/footprint';
import type { GridModel } from '../../types/grid';
import { createGridModel } from '../grid/createGridModel';
import { createDefaultEdgeEndpoints } from '../grid/generateEdgeEndpoints';
import { canPlaceFootprint, validateFootprintPlacementPath } from './validateFootprintPlacement';

const ENDPOINTS = createDefaultEdgeEndpoints();

/** Walls off columns 8..9 except the two rows starting at `gapRow`. */
function createWalledGrid(gapRow: number): GridModel {
  const grid = createGridModel(ENDPOINTS);
  return {
    ...grid,
    cells: grid.cells.map((cell) =>
      (cell.x === 8 || cell.x === 9) && cell.y !== gapRow && cell.y !== gapRow + 1
        ? { ...cell, isOccupied: true, isWalkable: false }
        : cell,
    ),
  };
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
    // Covering only half of the gap leaves a one-cell lane.
    expect(validateFootprintPlacementPath(grid, { x: 7, y: 9 }, TOWER_FOOTPRINT)).toBe(true);
  });

  it('rejects blocks off the grid or over the route anchors', () => {
    const grid = createGridModel(ENDPOINTS);

    expect(validateFootprintPlacementPath(grid, { x: -1, y: 3 }, TOWER_FOOTPRINT)).toBe(false);
    expect(validateFootprintPlacementPath(grid, ENDPOINTS.entrance, TOWER_FOOTPRINT)).toBe(false);
    expect(
      canPlaceFootprint(grid, { x: ENDPOINTS.exit.x - 1, y: ENDPOINTS.exit.y }, TOWER_FOOTPRINT),
    ).toBe(false);
  });
});
