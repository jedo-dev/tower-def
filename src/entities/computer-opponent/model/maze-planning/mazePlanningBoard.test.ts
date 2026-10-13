import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { createGridModel } from '../../../../shared/lib/grid/createGridModel';
import { withFootprintOccupancy } from '../../../../shared/lib/grid/footprint';
import { generateEdgeEndpoints } from '../../../../shared/lib/grid/generateEdgeEndpoints';
import type { GridModel, GridPoint } from '../../../../shared/types/grid';
import { createMazeEvaluator } from '../maze-evaluation';
import { createMazePlanningBoard } from './mazePlanningBoard';
import { countRouteExposure } from './routeExposure';

const ENDPOINTS = generateEdgeEndpoints(7);

function withBlocks(grid: GridModel, anchors: readonly GridPoint[]): GridModel {
  return anchors.reduce(
    (current, anchor) => withFootprintOccupancy(current, anchor, TOWER_FOOTPRINT, true),
    grid,
  );
}

function evaluatorCosts(grid: GridModel) {
  const { routes } = createMazeEvaluator(grid, grid.entrance, grid.exit);
  return { small: routes.smallRouteCost, large: routes.largeRouteCost };
}

describe('computer-opponent/maze-planning/mazePlanningBoard', () => {
  it('matches the maze evaluator as blocks come and go', () => {
    const grid = createGridModel(ENDPOINTS);
    const board = createMazePlanningBoard(grid);
    const anchors: GridPoint[] = [
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 4, y: 4 },
      { x: 12, y: 10 },
    ];

    anchors.forEach((anchor, index) => {
      board.place(anchor);
      const expected = evaluatorCosts(withBlocks(grid, anchors.slice(0, index + 1)));
      expect(board.evaluate()).toMatchObject(expected);
    });
    board.remove(anchors[1]);

    const expected = evaluatorCosts(withBlocks(grid, [anchors[0], anchors[2], anchors[3]]));
    expect(board.evaluate()).toMatchObject(expected);
  });

  it('reports a sealed board as null and recovers once the seal is lifted', () => {
    const grid = createGridModel({ entrance: { x: 0, y: 0 }, exit: { x: 18, y: 28 } });
    const board = createMazePlanningBoard(grid);
    const wall = Array.from({ length: 10 }, (_, index) => ({ x: index * 2, y: 10 }));

    wall.forEach((anchor) => board.place(anchor));
    expect(board.evaluate()).toBeNull();
    expect(board.evaluateSmall()).toBe(Infinity);

    board.remove(wall[9]);
    expect(board.evaluate()).not.toBeNull();
  });

  it('refuses blocks over endpoints, other blocks or the edge', () => {
    const grid = createGridModel(ENDPOINTS);
    const board = createMazePlanningBoard(grid);
    board.place({ x: 10, y: 10 });

    expect(board.canPlace(ENDPOINTS.entrance)).toBe(false);
    expect(board.canPlace({ x: 11, y: 11 })).toBe(false);
    expect(board.canPlace({ x: grid.cols - 1, y: 0 })).toBe(false);
    expect(board.canPlace({ x: 12, y: 10 })).toBe(true);
  });

  it('restores saved routes without searching again', () => {
    const board = createMazePlanningBoard(createGridModel(ENDPOINTS));
    const before = board.evaluate();
    const saved = board.saveRoutes();
    const expandedBefore = board.expandedNodeCount;

    board.place({ x: 4, y: 0 });
    board.evaluate();
    board.remove({ x: 4, y: 0 });
    board.restoreRoutes(saved);
    const expandedAfterProbe = board.expandedNodeCount;

    expect(board.evaluate()).toEqual(before);
    expect(expandedAfterProbe).toBeGreaterThan(expandedBefore);
    expect(board.expandedNodeCount).toBe(expandedAfterProbe);
  });

  it('measures route exposure over standing towers and placed blocks', () => {
    const standing = { x: 10, y: 20 };
    const placed = { x: 4, y: 2 };
    const grid = withBlocks(createGridModel(ENDPOINTS), [standing]);
    const board = createMazePlanningBoard(grid);
    board.place(placed);

    const blocked = withBlocks(grid, [placed]);
    const { smallRoute } = createMazeEvaluator(blocked, blocked.entrance, blocked.exit).routes;
    const expected = countRouteExposure(smallRoute ?? [], [standing, placed], 4);

    expect(expected).toBeGreaterThan(0);
    expect(board.evaluateExposure(4)).toBe(expected);

    board.remove(placed);
    const { smallRoute: openRoute } = createMazeEvaluator(grid, grid.entrance, grid.exit).routes;
    expect(board.evaluateExposure(4)).toBe(countRouteExposure(openRoute ?? [], [standing], 4));
  });

  it('skips the search for a block off both routes', () => {
    const board = createMazePlanningBoard(createGridModel(ENDPOINTS));
    const before = board.evaluate();
    const expandedBefore = board.expandedNodeCount;

    board.place({ x: 0, y: 26 });

    expect(board.evaluate()).toEqual(before);
    expect(board.expandedNodeCount).toBe(expandedBefore);
  });
});
