import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { createGridModel } from '../../../../shared/lib/grid/createGridModel';
import { withFootprintOccupancy } from '../../../../shared/lib/grid/footprint';
import { generateEdgeEndpoints } from '../../../../shared/lib/grid/generateEdgeEndpoints';
import { canPlaceFootprint } from '../../../../shared/lib/pathfinding/validateFootprintPlacement';
import type { GridModel, GridPoint } from '../../../../shared/types/grid';
import { createMazeEvaluator } from '../maze-evaluation';
import type { MazePlanSearchEffort } from './constants';
import { createMazePlanningBoard } from './mazePlanningBoard';
import { searchMazeWalls } from './searchMazeWalls';
import { createWallCandidates } from './wallCandidates';

const UNCAPPED_EFFORT: MazePlanSearchEffort = { finalistCount: 3, maxExpandedNodes: 1_000_000 };

function plan(grid: GridModel, towerBudget: number, effort = UNCAPPED_EFFORT) {
  const board = createMazePlanningBoard(grid);
  const result = searchMazeWalls({
    board,
    candidates: createWallCandidates(
      grid.cols,
      grid.rows,
      [grid.entrance, grid.exit].map((anchor) => ({
        anchor,
        footprint: grid.endpointZoneFootprint,
      })),
    ),
    towerBudget,
    effort,
  });
  return { ...result, board };
}

function weightedCost(grid: GridModel): number {
  const { routes } = createMazeEvaluator(grid, grid.entrance, grid.exit);
  return (routes.smallRouteCost ?? 0) + (routes.largeRouteCost ?? 0);
}

function withBlocks(grid: GridModel, anchors: readonly GridPoint[]): GridModel {
  return anchors.reduce(
    (current, anchor) => withFootprintOccupancy(current, anchor, TOWER_FOOTPRINT, true),
    grid,
  );
}

/**
 * A rock wall across rows 14-15 with three lanes: two 2-cell gaps near the
 * creeps' straight line and one at the far right edge. Either near gap alone
 * keeps the route short, so no single tower block lengthens it by much; only
 * closing both together sends the creeps the long way round.
 */
function createTwoGapField(): GridModel {
  const openColumns = new Set([0, 1, 6, 7, 18, 19]);
  const grid = createGridModel({ entrance: { x: 4, y: 0 }, exit: { x: 4, y: 28 } });
  return {
    ...grid,
    cells: grid.cells.map((cell) =>
      (cell.y === 14 || cell.y === 15) && !openColumns.has(cell.x)
        ? { ...cell, isWalkable: false }
        : cell,
    ),
  };
}

function bestSingleBlockGain(grid: GridModel): number {
  const evaluator = createMazeEvaluator(grid, grid.entrance, grid.exit);
  let best = 0;
  for (let y = 0; y + TOWER_FOOTPRINT.height <= grid.rows; y += 1) {
    for (let x = 0; x + TOWER_FOOTPRINT.width <= grid.cols; x += 1) {
      const gain = evaluator.routeGainForPlacement({ x, y });
      best = Math.max(best, gain.smallGain + gain.largeGain);
    }
  }
  return best;
}

describe('computer-opponent/maze-planning/searchMazeWalls', () => {
  it('is deterministic', () => {
    const grid = createGridModel(generateEdgeEndpoints(3));

    expect(plan(grid, 20).anchors).toEqual(plan(grid, 20).anchors);
  });

  it('keeps both size-class routes open after every planned block, in plan order', () => {
    for (const seed of [1, 4, 7]) {
      let grid = createGridModel(generateEdgeEndpoints(seed));
      const { anchors } = plan(grid, 30);

      expect(anchors.length).toBeGreaterThan(0);
      for (const anchor of anchors) {
        // The build rule: footprint free and both the 1x1 and 2x2 routes survive.
        expect(canPlaceFootprint(grid, anchor, TOWER_FOOTPRINT)).toBe(true);
        grid = withFootprintOccupancy(grid, anchor, TOWER_FOOTPRINT, true);
      }
    }
  });

  it.each([1, 4, 5])(
    'lengthens the routes far more than its tower count would by scattering on seed %i',
    (seed) => {
      const grid = createGridModel(generateEdgeEndpoints(seed));
      const { anchors } = plan(grid, 20);
      const gain = weightedCost(withBlocks(grid, anchors)) - weightedCost(grid);

      // Every planned block pays its way: at least two cells of route per block.
      // Seeds 4 and 5 once drew a wall along the edge that barely did (tower-def-02k.8).
      expect(gain / anchors.length).toBeGreaterThan(2);
    },
  );

  it('closes a wall where no single block lengthens the route much', () => {
    const grid = createTwoGapField();
    const singleBlockGain = bestSingleBlockGain(grid);
    // Room for exactly the two blocks that close both near gaps.
    const { anchors } = plan(grid, 2);
    const planned = withBlocks(grid, anchors);
    const gain = weightedCost(planned) - weightedCost(grid);
    const { smallRoute } = createMazeEvaluator(planned, planned.entrance, planned.exit).routes;
    const crossing = smallRoute?.find((cell) => cell.y === 14);

    expect(singleBlockGain).toBeLessThan(3);
    expect(anchors).toHaveLength(2);
    expect(crossing?.x).toBeGreaterThanOrEqual(18);
    // Per block, the closed wall is worth several times the best lone block.
    expect(gain / anchors.length).toBeGreaterThan(singleBlockGain * 4);
  });

  it('stops at its effort cap and says it was cut short', () => {
    const grid = createGridModel(generateEdgeEndpoints(2));
    const effort: MazePlanSearchEffort = { finalistCount: 3, maxExpandedNodes: 2_000 };
    const capped = plan(grid, 30, effort);
    const full = plan(grid, 30);

    expect(capped.isExhausted).toBe(false);
    expect(capped.anchors.length).toBeLessThan(full.anchors.length);
  });

  it('reports exhaustion when no wall can lengthen the routes', () => {
    const grid = createTwoGapField();
    const { anchors } = plan(grid, 200);
    const result = plan(withBlocks(grid, anchors), 200);

    expect(result.anchors).toEqual([]);
    expect(result.isExhausted).toBe(true);
  });
});
