import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../constants/footprint';
import { GRID_DIMENSIONS } from '../../constants/grid';
import type { GridPoint } from '../../types/grid';
import { createGridModel } from './createGridModel';
import {
  findFootprintAnchorCovering,
  getFootprintCenter,
  getNearestFootprintAnchor,
  isCellInFootprint,
  withFootprintOccupancy,
} from './footprint';
import { createDefaultEdgeEndpoints } from './generateEdgeEndpoints';
import { getCellAt } from './getCellAt';

describe('footprint geometry', () => {
  it('knows which cells a block covers', () => {
    expect(isCellInFootprint({ x: 3, y: 4 }, { x: 3, y: 4 }, TOWER_FOOTPRINT)).toBe(true);
    expect(isCellInFootprint({ x: 4, y: 5 }, { x: 3, y: 4 }, TOWER_FOOTPRINT)).toBe(true);
    expect(isCellInFootprint({ x: 5, y: 4 }, { x: 3, y: 4 }, TOWER_FOOTPRINT)).toBe(false);
    expect(isCellInFootprint({ x: 3, y: 3 }, { x: 3, y: 4 }, TOWER_FOOTPRINT)).toBe(false);
  });

  it('centres a 2x2 block between its four cells', () => {
    expect(getFootprintCenter({ x: 3, y: 4 }, TOWER_FOOTPRINT)).toEqual({ x: 3.5, y: 4.5 });
  });
});

describe('getNearestFootprintAnchor', () => {
  const at = (x: number, y: number): GridPoint | null =>
    getNearestFootprintAnchor(GRID_DIMENSIONS, { x, y }, TOWER_FOOTPRINT);

  it('centres the block on the grid line nearest the pointer', () => {
    // Pointer in the lower-right quarter of cell (5, 5): block covers 5..6.
    expect(at(5.8, 5.8)).toEqual({ x: 5, y: 5 });
    // Pointer in the upper-left quarter of cell (5, 5): block covers 4..5.
    expect(at(5.2, 5.2)).toEqual({ x: 4, y: 4 });
    expect(at(5.2, 5.8)).toEqual({ x: 4, y: 5 });
  });

  it('clamps the block inside the grid at the edges', () => {
    expect(at(0.1, 0.1)).toEqual({ x: 0, y: 0 });
    expect(at(GRID_DIMENSIONS.cols - 0.1, GRID_DIMENSIONS.rows - 0.1)).toEqual({
      x: GRID_DIMENSIONS.cols - TOWER_FOOTPRINT.width,
      y: GRID_DIMENSIONS.rows - TOWER_FOOTPRINT.height,
    });
  });

  it('ignores pointers off the grid', () => {
    expect(at(-0.5, 3)).toBeNull();
    expect(at(3, GRID_DIMENSIONS.rows)).toBeNull();
  });
});

describe('findFootprintAnchorCovering', () => {
  it('finds the accepted anchor whose block covers the cell', () => {
    const anchors = new Set(['3:4', '5:4']);
    const isAnchor = (anchor: GridPoint): boolean => anchors.has(`${anchor.x}:${anchor.y}`);

    expect(findFootprintAnchorCovering({ x: 4, y: 5 }, TOWER_FOOTPRINT, isAnchor)).toEqual({
      x: 3,
      y: 4,
    });
    expect(findFootprintAnchorCovering({ x: 5, y: 5 }, TOWER_FOOTPRINT, isAnchor)).toEqual({
      x: 5,
      y: 4,
    });
    expect(findFootprintAnchorCovering({ x: 7, y: 4 }, TOWER_FOOTPRINT, isAnchor)).toBeNull();
  });
});

describe('withFootprintOccupancy', () => {
  it('walls off and frees exactly the block without touching the source grid', () => {
    const grid = createGridModel(createDefaultEdgeEndpoints());
    const walled = withFootprintOccupancy(grid, { x: 6, y: 6 }, TOWER_FOOTPRINT, true);

    expect(walled.cells.filter((cell) => cell.isOccupied)).toHaveLength(4);
    expect(getCellAt(walled, 7, 7)).toMatchObject({ isOccupied: true, isWalkable: false });
    expect(grid.cells.some((cell) => cell.isOccupied)).toBe(false);

    const freed = withFootprintOccupancy(walled, { x: 6, y: 6 }, TOWER_FOOTPRINT, false);
    expect(freed.cells.some((cell) => cell.isOccupied || !cell.isWalkable)).toBe(false);
  });
});
