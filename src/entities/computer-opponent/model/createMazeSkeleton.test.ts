import { describe, expect, it } from 'vitest';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { createPathProbe } from '../../../shared/lib/pathfinding/createPathProbe';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { createMazeSkeleton } from './createMazeSkeleton';

function blockAll(grid: GridModel, positions: readonly GridPosition[]): GridModel {
  const blockedKeys = new Set(positions.map((p) => `${p.x}:${p.y}`));
  return {
    ...grid,
    cells: grid.cells.map((cell) =>
      blockedKeys.has(`${cell.x}:${cell.y}`)
        ? { ...cell, isOccupied: true, isWalkable: false }
        : cell,
    ),
  };
}

function uniqueColumns(cells: readonly GridPosition[]): number[] {
  return [...new Set(cells.map((cell) => cell.x))].sort((a, b) => a - b);
}

function uniqueRows(cells: readonly GridPosition[]): number[] {
  return [...new Set(cells.map((cell) => cell.y))].sort((a, b) => a - b);
}

describe('entities/computer-opponent/createMazeSkeleton', () => {
  describe('left to right travel', () => {
    const grid = createGridModel({ entrance: { x: 0, y: 7 }, exit: { x: 9, y: 7 } });
    const skeleton = createMazeSkeleton(grid);

    it('lays the teeth across the travel axis with a free lane between them', () => {
      expect(uniqueColumns(skeleton.cells)).toEqual([1, 3, 5, 7]);
    });

    it('keeps a lane next to the entrance and the exit', () => {
      expect(skeleton.cells.some((cell) => cell.x === 0)).toBe(false);
      expect(skeleton.cells.some((cell) => cell.x === 9)).toBe(false);
    });

    it('leaves one gap per tooth, on alternating edges', () => {
      const gapRowByColumn = new Map<number, number[]>();
      for (const column of uniqueColumns(skeleton.cells)) {
        const covered = new Set(
          skeleton.cells.filter((cell) => cell.x === column).map((cell) => cell.y),
        );
        const gaps: number[] = [];
        for (let y = 0; y < grid.rows; y += 1) {
          if (!covered.has(y)) {
            gaps.push(y);
          }
        }
        gapRowByColumn.set(column, gaps);
      }

      expect(gapRowByColumn.get(1)).toEqual([0]);
      expect(gapRowByColumn.get(3)).toEqual([grid.rows - 1]);
      expect(gapRowByColumn.get(5)).toEqual([0]);
      expect(gapRowByColumn.get(7)).toEqual([grid.rows - 1]);
    });

    it('ranks each tooth from its anchored edge towards its gap', () => {
      const firstTooth = skeleton.cells.filter((cell) => cell.x === 1);

      expect(firstTooth[0]).toEqual({ x: 1, y: grid.rows - 1 });
      expect(firstTooth[firstTooth.length - 1]).toEqual({ x: 1, y: 1 });
    });

    it('finishes one tooth before starting the next', () => {
      const firstToothRanks = skeleton.cells
        .filter((cell) => cell.x === 1)
        .map((cell) => skeleton.rankOf(cell) ?? -1);
      const secondToothRanks = skeleton.cells
        .filter((cell) => cell.x === 3)
        .map((cell) => skeleton.rankOf(cell) ?? -1);

      expect(Math.max(...firstToothRanks)).toBeLessThan(Math.min(...secondToothRanks));
    });

    it('scores earlier cells above later ones and off-plan cells at zero', () => {
      expect(skeleton.priorityOf({ x: 1, y: grid.rows - 1 })).toBeGreaterThan(
        skeleton.priorityOf({ x: 7, y: 0 }),
      );
      expect(skeleton.priorityOf({ x: 0, y: 0 })).toBe(0);
      expect(skeleton.rankOf({ x: 0, y: 0 })).toBeNull();
    });

    it('multiplies the route once the whole comb is built', () => {
      const baseLength = createPathProbe(grid).baseLength;
      const built = createPathProbe(blockAll(grid, skeleton.cells)).baseLength;

      expect(built).toBeGreaterThan(baseLength * 4);
    });
  });

  describe('top to bottom travel', () => {
    const grid = createGridModel({ entrance: { x: 4, y: 0 }, exit: { x: 4, y: 14 } });
    const skeleton = createMazeSkeleton(grid);

    it('turns the comb to span the other axis', () => {
      expect(uniqueRows(skeleton.cells)).toEqual([1, 3, 5, 7, 9, 11, 13]);
      expect(skeleton.cells.some((cell) => cell.y === 0)).toBe(false);
      expect(skeleton.cells.some((cell) => cell.y === 14)).toBe(false);
    });

    it('multiplies the route once the whole comb is built', () => {
      const baseLength = createPathProbe(grid).baseLength;
      const built = createPathProbe(blockAll(grid, skeleton.cells)).baseLength;

      expect(built).toBeGreaterThan(baseLength * 4);
    });
  });

  it('skips cells that are already walled off', () => {
    const grid = createGridModel({ entrance: { x: 0, y: 7 }, exit: { x: 9, y: 7 } });
    const withTower = blockAll(grid, [{ x: 1, y: 10 }]);

    const skeleton = createMazeSkeleton(withTower);

    expect(skeleton.cells.some((cell) => cell.x === 1 && cell.y === 10)).toBe(false);
    expect(skeleton.cells.some((cell) => cell.x === 1 && cell.y === 9)).toBe(true);
  });

  it('plans nothing when the endpoints leave no room for a tooth', () => {
    const grid = createGridModel({ entrance: { x: 0, y: 7 }, exit: { x: 1, y: 7 } });

    expect(createMazeSkeleton(grid).cells).toHaveLength(0);
  });
});
