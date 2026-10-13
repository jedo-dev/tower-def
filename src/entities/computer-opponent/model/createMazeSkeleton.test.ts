import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { doFootprintsOverlap, withFootprintOccupancy } from '../../../shared/lib/grid/footprint';
import { createPathProbe } from './createPathProbe';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { createMazeSkeleton } from './createMazeSkeleton';

function buildAll(grid: GridModel, anchors: readonly GridPosition[]): GridModel {
  return anchors.reduce(
    (current, anchor) => withFootprintOccupancy(current, anchor, TOWER_FOOTPRINT, true),
    grid,
  );
}

function uniqueColumns(anchors: readonly GridPosition[]): number[] {
  return [...new Set(anchors.map((anchor) => anchor.x))].sort((a, b) => a - b);
}

function uniqueRows(anchors: readonly GridPosition[]): number[] {
  return [...new Set(anchors.map((anchor) => anchor.y))].sort((a, b) => a - b);
}

/** Rows of a horizontal-travel tooth left uncovered by its blocks. */
function gapRows(grid: GridModel, anchors: readonly GridPosition[], column: number): number[] {
  const covered = new Set<number>();
  for (const anchor of anchors.filter((candidate) => candidate.x === column)) {
    for (let offset = 0; offset < TOWER_FOOTPRINT.height; offset += 1) {
      covered.add(anchor.y + offset);
    }
  }
  return Array.from({ length: grid.rows }, (_, row) => row).filter((row) => !covered.has(row));
}

describe('entities/computer-opponent/createMazeSkeleton', () => {
  describe('left to right travel', () => {
    const grid = createGridModel({ entrance: { x: 0, y: 14 }, exit: { x: 18, y: 14 } });
    const skeleton = createMazeSkeleton(grid);

    it('lays 2-cell teeth across the travel axis with 2-cell lanes between them', () => {
      expect(uniqueColumns(skeleton.anchors)).toEqual([2, 6, 10, 14]);
    });

    it('plans 2x2 blocks that never overlap', () => {
      skeleton.anchors.forEach((first, firstIndex) => {
        skeleton.anchors.slice(firstIndex + 1).forEach((second) => {
          expect(doFootprintsOverlap(first, TOWER_FOOTPRINT, second, TOWER_FOOTPRINT)).toBe(false);
        });
      });
    });

    it('keeps a lane next to the entrance and the exit zones', () => {
      expect(skeleton.anchors.some((anchor) => anchor.x <= 1)).toBe(false);
      expect(skeleton.anchors.some((anchor) => anchor.x + TOWER_FOOTPRINT.width > 18)).toBe(false);
    });

    it('leaves one 2-cell gap per tooth, on alternating edges', () => {
      expect(gapRows(grid, skeleton.anchors, 2)).toEqual([0, 1]);
      expect(gapRows(grid, skeleton.anchors, 6)).toEqual([grid.rows - 2, grid.rows - 1]);
      expect(gapRows(grid, skeleton.anchors, 10)).toEqual([0, 1]);
      expect(gapRows(grid, skeleton.anchors, 14)).toEqual([grid.rows - 2, grid.rows - 1]);
    });

    it('ranks each tooth from its anchored edge towards its gap', () => {
      const firstTooth = skeleton.anchors.filter((anchor) => anchor.x === 2);

      expect(firstTooth[0]).toEqual({ x: 2, y: grid.rows - 2 });
      expect(firstTooth[firstTooth.length - 1]).toEqual({ x: 2, y: 2 });
    });

    it('finishes one tooth before starting the next', () => {
      const ranksOf = (column: number): number[] =>
        skeleton.anchors
          .filter((anchor) => anchor.x === column)
          .map((anchor) => skeleton.rankOf(anchor) ?? -1);

      expect(Math.max(...ranksOf(2))).toBeLessThan(Math.min(...ranksOf(6)));
    });

    it('scores earlier blocks above later ones and off-plan anchors at zero', () => {
      expect(skeleton.priorityOf({ x: 2, y: grid.rows - 2 })).toBeGreaterThan(
        skeleton.priorityOf({ x: 14, y: grid.rows - 2 }),
      );
      expect(skeleton.priorityOf({ x: 3, y: 0 })).toBe(0);
      expect(skeleton.rankOf({ x: 3, y: 0 })).toBeNull();
    });

    it('multiplies the route once the whole comb is built', () => {
      const baseLength = createPathProbe(grid).baseCost;
      const built = createPathProbe(buildAll(grid, skeleton.anchors)).baseCost;

      expect(built).toBeGreaterThan(baseLength * 4);
    });
  });

  describe('top to bottom travel', () => {
    const grid = createGridModel({ entrance: { x: 9, y: 0 }, exit: { x: 9, y: 28 } });
    const skeleton = createMazeSkeleton(grid);

    it('turns the comb to span the other axis', () => {
      expect(uniqueRows(skeleton.anchors)).toEqual([2, 6, 10, 14, 18, 22, 26]);
      expect(skeleton.anchors.some((anchor) => anchor.y <= 1)).toBe(false);
      expect(skeleton.anchors.some((anchor) => anchor.y + TOWER_FOOTPRINT.height > 28)).toBe(false);
    });

    it('multiplies the route once the whole comb is built', () => {
      const baseLength = createPathProbe(grid).baseCost;
      const built = createPathProbe(buildAll(grid, skeleton.anchors)).baseCost;

      expect(built).toBeGreaterThan(baseLength * 4);
    });
  });

  it('drops blocks that something already stands on', () => {
    const grid = createGridModel({ entrance: { x: 0, y: 14 }, exit: { x: 18, y: 14 } });
    const withTower = withFootprintOccupancy(grid, { x: 3, y: 10 }, TOWER_FOOTPRINT, true);

    const skeleton = createMazeSkeleton(withTower);

    expect(skeleton.anchors.some((anchor) => anchor.x === 2 && anchor.y === 10)).toBe(false);
    expect(skeleton.anchors.some((anchor) => anchor.x === 2 && anchor.y === 8)).toBe(true);
  });

  it('plans nothing when the endpoints leave no room for a tooth', () => {
    const grid = createGridModel({ entrance: { x: 0, y: 7 }, exit: { x: 3, y: 7 } });

    expect(createMazeSkeleton(grid).anchors).toHaveLength(0);
  });
});
