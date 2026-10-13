import { describe, expect, it } from 'vitest';
import type { GridCell, GridModel } from '../../types/grid';
import { SINGLE_CELL_FOOTPRINT } from '../../constants/footprint';
import type { GridPosition } from '../../types/pathfinding';
import { computeOctileDistanceField } from './computeOctileDistanceField';
import { findOctilePath, hasOctilePath, searchOctilePath } from './findOctilePath';
import { findPathBfs } from './hasPathBfs';

function createOpenGrid(
  cols: number,
  rows: number,
  blocked: readonly GridPosition[] = [],
): GridModel {
  const blockedKeys = new Set(blocked.map((position) => `${position.x}:${position.y}`));
  const cells: GridCell[] = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const isBlocked = blockedKeys.has(`${x}:${y}`);
      cells.push({ x, y, role: 'empty', isWalkable: !isBlocked, isOccupied: false });
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

function occupy(grid: GridModel, positions: readonly GridPosition[]): GridModel {
  const keys = new Set(positions.map((position) => `${position.x}:${position.y}`));
  return {
    ...grid,
    cells: grid.cells.map((cell) =>
      keys.has(`${cell.x}:${cell.y}`) ? { ...cell, isOccupied: true } : cell,
    ),
  };
}

function isFree(grid: GridModel, x: number, y: number): boolean {
  const cell = grid.cells[y * grid.cols + x];
  return cell !== undefined && cell.isWalkable && !cell.isOccupied;
}

/** Every step moves one cell (8-neighbourhood) and never cuts a blocked corner. */
function expectLegalPath(grid: GridModel, path: readonly GridPosition[]): void {
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;

    expect(Math.max(Math.abs(deltaX), Math.abs(deltaY))).toBe(1);
    expect(isFree(grid, to.x, to.y)).toBe(true);

    if (deltaX !== 0 && deltaY !== 0) {
      expect(isFree(grid, from.x + deltaX, from.y)).toBe(true);
      expect(isFree(grid, from.x, from.y + deltaY)).toBe(true);
    }
  }
}

describe('shared/pathfinding/findOctilePath', () => {
  it('takes the diagonal shortcut across open ground', () => {
    const grid = createOpenGrid(10, 10);
    const result = searchOctilePath(grid, { x: 0, y: 0 }, { x: 9, y: 9 });
    const bfsPath = findPathBfs(grid).path;

    expect(result.path).not.toBeNull();
    expect(result.path).toHaveLength(10);
    expect(result.cost).toBeCloseTo(9 * Math.SQRT2);
    expect(result.path?.length ?? Infinity).toBeLessThan(bfsPath.length);
    expect(result.path?.[0]).toEqual({ x: 0, y: 0 });
    expect(result.path?.[9]).toEqual({ x: 9, y: 9 });
  });

  it('mixes straight and diagonal steps for the octile optimum', () => {
    const grid = createOpenGrid(8, 4);
    const result = searchOctilePath(grid, { x: 0, y: 0 }, { x: 7, y: 3 });

    expect(result.cost).toBeCloseTo(4 + 3 * Math.SQRT2);
    expectLegalPath(grid, result.path ?? []);
  });

  it('does not cut past a single blocked orthogonal neighbour', () => {
    const grid = occupy(createOpenGrid(2, 2), [{ x: 1, y: 0 }]);
    const path = findOctilePath(grid, { x: 0, y: 0 }, { x: 1, y: 1 });

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
  });

  it('rejects squeezing between two blockers touching at a corner', () => {
    const grid = occupy(createOpenGrid(3, 3), [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);

    expect(findOctilePath(grid, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull();
    expect(hasOctilePath(grid, { x: 0, y: 0 }, { x: 2, y: 2 })).toBe(false);
  });

  it('treats a diagonal line of corner-touching towers as a wall', () => {
    const diagonalWall = [0, 1, 2, 3, 4].map((offset) => ({ x: offset, y: 4 - offset }));
    const grid = occupy(createOpenGrid(5, 5), diagonalWall);

    expect(findOctilePath(grid, { x: 0, y: 0 }, { x: 4, y: 4 })).toBeNull();
  });

  it('routes around obstacles with only legal steps', () => {
    const wall = [0, 1, 2, 3, 4, 5].map((y) => ({ x: 4, y }));
    const grid = occupy(createOpenGrid(9, 8), wall);
    const path = findOctilePath(grid, { x: 0, y: 0 }, { x: 8, y: 0 });

    expect(path).not.toBeNull();
    expectLegalPath(grid, path ?? []);
    expect(path?.some((cell) => cell.x === 4 && cell.y >= 6)).toBe(true);
  });

  it('returns a single cell when start equals goal', () => {
    const grid = createOpenGrid(4, 4);

    expect(findOctilePath(grid, { x: 2, y: 1 }, { x: 2, y: 1 })).toEqual([{ x: 2, y: 1 }]);
    expect(searchOctilePath(grid, { x: 2, y: 1 }, { x: 2, y: 1 }).cost).toBe(0);
  });

  it('returns null when the goal is unreachable, blocked or outside', () => {
    const sealed = occupy(
      createOpenGrid(5, 5),
      [0, 1, 2, 3, 4].map((y) => ({ x: 2, y })),
    );

    expect(findOctilePath(sealed, { x: 0, y: 0 }, { x: 4, y: 4 })).toBeNull();
    expect(findOctilePath(sealed, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull();
    expect(findOctilePath(sealed, { x: 0, y: 0 }, { x: 5, y: 0 })).toBeNull();
    expect(findOctilePath(sealed, { x: -1, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });

  it('honours the extra passability hook', () => {
    const grid = createOpenGrid(3, 3);
    const centerIndex = 1 * 3 + 1;
    const path = findOctilePath(
      grid,
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      {
        isPassable: (index) => index !== centerIndex,
      },
    );

    expect(path).not.toBeNull();
    expect(path?.some((cell) => cell.x === 1 && cell.y === 1)).toBe(false);
    expect(
      findOctilePath(grid, { x: 0, y: 0 }, { x: 2, y: 2 }, { isPassable: () => false }),
    ).toBeNull();
  });

  it('is deterministic across repeated calls and call order', () => {
    const grid = occupy(createOpenGrid(12, 12), [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 5, y: 6 },
    ]);
    const start = { x: 0, y: 0 };
    const goal = { x: 11, y: 11 };

    const first = findOctilePath(grid, start, goal);
    findOctilePath(grid, goal, start);
    findOctilePath(grid, { x: 3, y: 9 }, { x: 10, y: 1 });
    const second = findOctilePath(grid, start, goal);
    const onCopiedGrid = findOctilePath(
      { ...grid, cells: grid.cells.map((cell) => ({ ...cell })) },
      start,
      goal,
    );

    expect(second).toEqual(first);
    expect(onCopiedGrid).toEqual(first);
  });

  it('keeps search work bounded on a 20x30 grid', () => {
    const cellCount = 20 * 30;
    const open = searchOctilePath(createOpenGrid(20, 30), { x: 0, y: 0 }, { x: 19, y: 29 });

    expect(open.path).toHaveLength(30);
    // The octile heuristic is exact on open ground: only cells on the path get expanded.
    expect(open.expandedCount).toBe(30);

    const serpentine: GridPosition[] = [];
    for (let x = 3; x < 19; x += 4) {
      const gapAtBottom = (x - 3) % 8 === 0;
      for (let y = 0; y < 30; y += 1) {
        if (gapAtBottom ? y < 28 : y > 1) {
          serpentine.push({ x, y });
        }
      }
    }
    const maze = searchOctilePath(
      occupy(createOpenGrid(20, 30), serpentine),
      { x: 0, y: 0 },
      { x: 19, y: 0 },
    );

    expect(maze.path).not.toBeNull();
    expect(maze.expandedCount).toBeLessThanOrEqual(cellCount - serpentine.length);
  });
});

describe('shared/pathfinding/computeOctileDistanceField', () => {
  it('matches the A* cost from every reachable cell', () => {
    const grid = occupy(createOpenGrid(6, 6), [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 4 },
    ]);
    const goal = { x: 5, y: 5 };
    const field = computeOctileDistanceField(grid, goal);

    expect(field.distances[goal.y * 6 + goal.x]).toBe(0);
    expect(field.distances[2 * 6 + 2]).toBe(Infinity);

    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        if (!isFree(grid, x, y)) {
          continue;
        }
        const search = searchOctilePath(grid, { x, y }, goal);
        expect(field.distances[y * 6 + x]).toBeCloseTo(search.cost);
      }
    }
  });

  it('marks cells behind a corner wall as unreachable', () => {
    const grid = occupy(createOpenGrid(3, 3), [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    const field = computeOctileDistanceField(grid, { x: 2, y: 2 });

    expect(field.distances[0]).toBe(Infinity);
    expect(field.distances[1 * 3 + 1]).toBeCloseTo(Math.SQRT2);
  });

  it('returns an all-Infinity field for a blocked goal', () => {
    const grid = occupy(createOpenGrid(3, 3), [{ x: 1, y: 1 }]);
    const field = computeOctileDistanceField(grid, { x: 1, y: 1 });

    expect(Array.from(field.distances).every((distance) => distance === Infinity)).toBe(true);
  });
});
