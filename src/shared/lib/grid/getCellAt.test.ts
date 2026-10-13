import { describe, expect, it } from 'vitest';
import { SINGLE_CELL_FOOTPRINT } from '../../constants/footprint';
import type { GridCell, GridModel } from '../../types/grid';
import { createGridModel } from './createGridModel';
import { getCellAt, getCellIndex, isInsideGridBounds } from './getCellAt';

function createOpenGrid(cols: number, rows: number): GridModel {
  const cells: GridCell[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      cells.push({ x, y, role: 'empty', isWalkable: true, isOccupied: false });
    }
  }
  return {
    cols,
    rows,
    cells,
    entrance: { x: 0, y: 0 },
    exit: { x: cols - 1, y: rows - 1 },
    endpointZoneFootprint: SINGLE_CELL_FOOTPRINT,
  };
}

/** Wraps the cells array so every element read is counted. */
function withCountedReads(grid: GridModel): { grid: GridModel; readCount: () => number } {
  let reads = 0;
  const cells = new Proxy(grid.cells, {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/.test(property)) {
        reads += 1;
      }
      return Reflect.get(target, property, receiver);
    },
  });
  return { grid: { ...grid, cells }, readCount: () => reads };
}

describe('getCellAt', () => {
  it('returns the cell at the given coordinates', () => {
    const grid = createGridModel({ entrance: { x: 0, y: 7 }, exit: { x: 9, y: 7 } });

    for (const cell of grid.cells) {
      expect(getCellAt(grid, cell.x, cell.y)).toBe(cell);
    }
  });

  it('returns undefined outside the grid', () => {
    const grid = createGridModel({ entrance: { x: 0, y: 7 }, exit: { x: 9, y: 7 } });

    expect(getCellAt(grid, -1, 0)).toBeUndefined();
    expect(getCellAt(grid, 0, -1)).toBeUndefined();
    expect(getCellAt(grid, grid.cols, 0)).toBeUndefined();
    expect(getCellAt(grid, 0, grid.rows)).toBeUndefined();
    expect(getCellAt(grid, 0.5, 0)).toBeUndefined();
    expect(getCellIndex(grid, grid.cols, 0)).toBe(-1);
    expect(isInsideGridBounds(grid, grid.cols - 1, grid.rows - 1)).toBe(true);
  });

  it('still finds cells when the array is not row-major', () => {
    const base = createOpenGrid(4, 3);
    const grid: GridModel = { ...base, cells: [...base.cells].reverse() };

    expect(getCellAt(grid, 1, 2)).toEqual(expect.objectContaining({ x: 1, y: 2 }));
    expect(getCellAt(grid, 3, 0)).toEqual(expect.objectContaining({ x: 3, y: 0 }));
  });

  it('reads a constant number of cells regardless of grid size', () => {
    const small = withCountedReads(createOpenGrid(10, 10));
    const large = withCountedReads(createOpenGrid(300, 300));

    expect(getCellAt(small.grid, 9, 9)).toEqual(expect.objectContaining({ x: 9, y: 9 }));
    expect(getCellAt(large.grid, 299, 299)).toEqual(expect.objectContaining({ x: 299, y: 299 }));

    expect(small.readCount()).toBe(1);
    expect(large.readCount()).toBe(small.readCount());
  });
});
