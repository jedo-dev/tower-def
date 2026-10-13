import { describe, expect, it } from 'vitest';
import {
  CREEP_FOOTPRINT_BY_SIZE_CLASS,
  ENDPOINT_ZONE_FOOTPRINT,
  SINGLE_CELL_FOOTPRINT,
  TOWER_FOOTPRINT,
  TowerFootprint,
} from '../../constants/footprint';
import { UNIT_SIZE_CLASSES, UnitSizeClass } from '../../types/content-ids';
import type { GridModel, GridPoint } from '../../types/grid';
import { createGridModel } from './createGridModel';
import {
  canOccupyFootprint,
  doFootprintsOverlap,
  getFootprintCells,
  isFootprintInBounds,
} from './footprint';
import { getCellAt } from './getCellAt';

const ENTRANCE: GridPoint = { x: 0, y: 7 };
const EXIT: GridPoint = { x: 9, y: 7 };

function createGrid(): GridModel {
  return createGridModel({ entrance: ENTRANCE, exit: EXIT });
}

function withCell(
  grid: GridModel,
  point: GridPoint,
  patch: { isOccupied?: boolean; isWalkable?: boolean },
): GridModel {
  return {
    ...grid,
    cells: grid.cells.map((cell) =>
      cell.x === point.x && cell.y === point.y ? { ...cell, ...patch } : cell,
    ),
  };
}

describe('footprint constants', () => {
  it('gives towers a 2x2 footprint', () => {
    expect(TowerFootprint.SIZE).toBe(2);
    expect(TOWER_FOOTPRINT).toEqual({ width: 2, height: 2 });
  });

  it('maps every creep size class to a square footprint', () => {
    expect(CREEP_FOOTPRINT_BY_SIZE_CLASS[UnitSizeClass.SMALL]).toEqual({ width: 1, height: 1 });
    expect(CREEP_FOOTPRINT_BY_SIZE_CLASS[UnitSizeClass.LARGE]).toEqual({ width: 2, height: 2 });

    for (const sizeClass of UNIT_SIZE_CLASSES) {
      const footprint = CREEP_FOOTPRINT_BY_SIZE_CLASS[sizeClass];
      expect(footprint.width).toBe(footprint.height);
      expect(footprint.width).toBeGreaterThan(0);
    }
  });
});

describe('getFootprintCells', () => {
  it('covers the anchor cell for a single-cell footprint', () => {
    expect(getFootprintCells({ x: 3, y: 4 }, SINGLE_CELL_FOOTPRINT)).toEqual([{ x: 3, y: 4 }]);
  });

  it('covers a 2x2 block from the top-left anchor, row by row', () => {
    expect(getFootprintCells({ x: 3, y: 4 }, TOWER_FOOTPRINT)).toEqual([
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
    ]);
  });

  it('handles rectangular footprints', () => {
    expect(getFootprintCells({ x: 0, y: 0 }, { width: 3, height: 1 })).toHaveLength(3);
    expect(getFootprintCells({ x: 0, y: 0 }, { width: 1, height: 3 })).toHaveLength(3);
  });

  it('returns no cells for an empty or invalid footprint', () => {
    expect(getFootprintCells({ x: 0, y: 0 }, { width: 0, height: 2 })).toEqual([]);
    expect(getFootprintCells({ x: 0, y: 0 }, { width: 1.5, height: 1 })).toEqual([]);
  });
});

describe('isFootprintInBounds', () => {
  const grid = createGrid();

  it('accepts footprints fully inside the grid, including the far corner', () => {
    expect(isFootprintInBounds(grid, { x: 0, y: 0 }, TOWER_FOOTPRINT)).toBe(true);
    expect(isFootprintInBounds(grid, { x: grid.cols - 2, y: grid.rows - 2 }, TOWER_FOOTPRINT)).toBe(
      true,
    );
  });

  it('rejects footprints that spill over any edge', () => {
    expect(isFootprintInBounds(grid, { x: grid.cols - 1, y: 0 }, TOWER_FOOTPRINT)).toBe(false);
    expect(isFootprintInBounds(grid, { x: 0, y: grid.rows - 1 }, TOWER_FOOTPRINT)).toBe(false);
    expect(isFootprintInBounds(grid, { x: -1, y: 0 }, TOWER_FOOTPRINT)).toBe(false);
    expect(isFootprintInBounds(grid, { x: 0, y: -1 }, TOWER_FOOTPRINT)).toBe(false);
  });

  it('rejects invalid footprints', () => {
    expect(isFootprintInBounds(grid, { x: 0, y: 0 }, { width: 0, height: 0 })).toBe(false);
  });
});

describe('canOccupyFootprint', () => {
  it('accepts a free 2x2 block', () => {
    expect(canOccupyFootprint(createGrid(), { x: 3, y: 3 }, TOWER_FOOTPRINT)).toBe(true);
  });

  it('rejects a block that leaves the grid', () => {
    const grid = createGrid();
    expect(canOccupyFootprint(grid, { x: grid.cols - 1, y: 3 }, TOWER_FOOTPRINT)).toBe(false);
  });

  it('rejects a block overlapping an occupied cell in any corner', () => {
    const anchor: GridPoint = { x: 3, y: 3 };

    for (const covered of getFootprintCells(anchor, TOWER_FOOTPRINT)) {
      const grid = withCell(createGrid(), covered, { isOccupied: true });
      expect(canOccupyFootprint(grid, anchor, TOWER_FOOTPRINT)).toBe(false);
    }
  });

  it('rejects a block covering a non-walkable cell', () => {
    const grid = withCell(createGrid(), { x: 4, y: 4 }, { isWalkable: false });
    expect(canOccupyFootprint(grid, { x: 3, y: 3 }, TOWER_FOOTPRINT)).toBe(false);
  });

  it('rejects blocks covering the entrance or the exit', () => {
    const grid = createGrid();

    expect(getCellAt(grid, ENTRANCE.x, ENTRANCE.y)?.role).toBe('entrance');
    expect(canOccupyFootprint(grid, ENTRANCE, TOWER_FOOTPRINT)).toBe(false);
    expect(canOccupyFootprint(grid, { x: ENTRANCE.x, y: ENTRANCE.y - 1 }, TOWER_FOOTPRINT)).toBe(
      false,
    );
    expect(canOccupyFootprint(grid, { x: EXIT.x - 1, y: EXIT.y }, TOWER_FOOTPRINT)).toBe(false);
    expect(canOccupyFootprint(grid, { x: EXIT.x - 1, y: EXIT.y - 1 }, TOWER_FOOTPRINT)).toBe(false);
  });

  it('lets a block sit right next to the entrance', () => {
    expect(
      canOccupyFootprint(
        createGrid(),
        { x: ENTRANCE.x + ENDPOINT_ZONE_FOOTPRINT.width, y: ENTRANCE.y },
        TOWER_FOOTPRINT,
      ),
    ).toBe(true);
  });
});

describe('doFootprintsOverlap', () => {
  it('detects shared cells between 2x2 blocks', () => {
    expect(
      doFootprintsOverlap({ x: 2, y: 2 }, TOWER_FOOTPRINT, { x: 3, y: 3 }, TOWER_FOOTPRINT),
    ).toBe(true);
    expect(
      doFootprintsOverlap({ x: 2, y: 2 }, TOWER_FOOTPRINT, { x: 2, y: 2 }, TOWER_FOOTPRINT),
    ).toBe(true);
  });

  it('treats edge-adjacent blocks as not overlapping', () => {
    expect(
      doFootprintsOverlap({ x: 2, y: 2 }, TOWER_FOOTPRINT, { x: 4, y: 2 }, TOWER_FOOTPRINT),
    ).toBe(false);
    expect(
      doFootprintsOverlap({ x: 2, y: 2 }, TOWER_FOOTPRINT, { x: 2, y: 4 }, TOWER_FOOTPRINT),
    ).toBe(false);
  });

  it('matches a single cell against a block', () => {
    expect(
      doFootprintsOverlap({ x: 3, y: 3 }, SINGLE_CELL_FOOTPRINT, { x: 2, y: 2 }, TOWER_FOOTPRINT),
    ).toBe(true);
    expect(
      doFootprintsOverlap({ x: 4, y: 3 }, SINGLE_CELL_FOOTPRINT, { x: 2, y: 2 }, TOWER_FOOTPRINT),
    ).toBe(false);
  });
});
