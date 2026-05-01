import { describe, expect, it } from 'vitest';
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
});
