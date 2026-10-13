import { describe, expect, it } from 'vitest';
import type { GridCell, GridModel } from '../../types/grid';
import { computeClearanceMap } from './computeClearanceMap';

/** '.' free, '#' not walkable, 'T' occupied, 'E'/'X' walkable entrance/exit. */
function parseGrid(rowsText: readonly string[]): GridModel {
  const cells: GridCell[] = [];

  rowsText.forEach((rowText, y) => {
    [...rowText].forEach((symbol, x) => {
      cells.push({
        x,
        y,
        role: symbol === 'E' ? 'entrance' : symbol === 'X' ? 'exit' : 'empty',
        isWalkable: symbol !== '#',
        isOccupied: symbol === 'T',
      });
    });
  });

  return {
    cols: rowsText[0].length,
    rows: rowsText.length,
    cells,
    entrance: { x: 0, y: 0 },
    exit: { x: rowsText[0].length - 1, y: rowsText.length - 1 },
  };
}

describe('shared/pathfinding/computeClearanceMap', () => {
  it('measures the largest free square anchored at each cell on open ground', () => {
    const clearance = computeClearanceMap(parseGrid(['...', '...', '...']));

    expect([...clearance]).toEqual([3, 2, 1, 2, 2, 1, 1, 1, 1]);
  });

  it('treats unwalkable and occupied cells as zero and shrinks squares above-left of them', () => {
    const clearance = computeClearanceMap(parseGrid(['....', '..#.', '...T']));

    expect([...clearance]).toEqual([2, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1, 0]);
  });

  it('counts walkable entrance and exit cells as free', () => {
    const clearance = computeClearanceMap(parseGrid(['E.', '.X']));

    expect([...clearance]).toEqual([2, 1, 1, 1]);
  });

  it('returns an empty map for an empty grid', () => {
    const grid: GridModel = {
      cols: 0,
      rows: 0,
      cells: [],
      entrance: { x: 0, y: 0 },
      exit: { x: 0, y: 0 },
    };

    expect(computeClearanceMap(grid)).toHaveLength(0);
  });
});
