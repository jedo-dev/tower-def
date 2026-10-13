import { describe, expect, it } from 'vitest';
import { SINGLE_CELL_FOOTPRINT } from '../../constants/footprint';
import type { GridCell, GridModel } from '../../types/grid';
import { createGridModel } from '../grid/createGridModel';
import { findPathBfs } from './hasPathBfs';
import { validateTowerPlacementPath } from './validateTowerPlacementPath';

const ENTRANCE = { x: 0, y: 7 };
const EXIT = { x: 9, y: 7 };

describe('pathfinding', () => {
  it('finds a valid path on a clear grid', () => {
    const grid = createGridModel({
      entrance: ENTRANCE,
      exit: EXIT,
    });

    const result = findPathBfs(grid);

    expect(result.found).toBe(true);
    expect(result.path.length).toBeGreaterThan(0);
    expect(result.path[0]).toEqual(ENTRANCE);
    expect(result.path[result.path.length - 1]).toEqual(EXIT);
  });

  it('returns no path when a full blocking wall is present', () => {
    const baseGrid = createGridModel({
      entrance: ENTRANCE,
      exit: EXIT,
    });

    const blockedGrid = {
      ...baseGrid,
      cells: baseGrid.cells.map((cell) => {
        if (cell.x !== 1) {
          return { ...cell };
        }

        return {
          ...cell,
          isWalkable: false,
          isOccupied: true,
        };
      }),
    };

    const result = findPathBfs(blockedGrid);

    expect(result.found).toBe(false);
    expect(result.path).toHaveLength(0);
  });

  it('validates tower placement by path availability', () => {
    const openGrid = createGridModel({
      entrance: ENTRANCE,
      exit: EXIT,
    });

    const isOpenPlacementValid = validateTowerPlacementPath(openGrid, { x: 1, y: 1 });
    expect(isOpenPlacementValid).toBe(true);

    const corridorGrid = {
      ...openGrid,
      cells: openGrid.cells.map((cell) => {
        if (cell.y === ENTRANCE.y) {
          return {
            ...cell,
            isWalkable: true,
            isOccupied: false,
          };
        }

        return {
          ...cell,
          isWalkable: false,
          isOccupied: true,
        };
      }),
    };

    const isBlockingPlacementValid = validateTowerPlacementPath(corridorGrid, { x: 5, y: 7 });
    expect(isBlockingPlacementValid).toBe(false);
  });

  it('reads each cell a bounded number of times, so BFS stays linear in grid size', () => {
    const countCellReadsOnOpenGrid = (size: number): number => {
      const cells: GridCell[] = [];
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          cells.push({ x, y, role: 'empty', isWalkable: true, isOccupied: false });
        }
      }
      let reads = 0;
      const countedCells = new Proxy(cells, {
        get(target, property, receiver) {
          if (typeof property === 'string' && /^\d+$/.test(property)) {
            reads += 1;
          }
          return Reflect.get(target, property, receiver);
        },
      });
      const grid: GridModel = {
        cols: size,
        rows: size,
        cells: countedCells,
        entrance: { x: 0, y: 0 },
        exit: { x: size - 1, y: size - 1 },
        endpointZoneFootprint: SINGLE_CELL_FOOTPRINT,
      };

      expect(findPathBfs(grid).found).toBe(true);
      return reads;
    };

    const size = 80;
    // Four neighbour checks per visited cell, one array read per check.
    expect(countCellReadsOnOpenGrid(size)).toBeLessThanOrEqual(4 * size * size);
  });
});
