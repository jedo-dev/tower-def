import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { canOccupyFootprint } from '../../../../shared/lib/grid/footprint';
import { findRoutesBySizeClass } from '../../../../shared/lib/pathfinding/findRouteForSizeClass';
import type { GridCell, GridModel, GridPoint } from '../../../../shared/types/grid';
import { createMazeEvaluator } from './createMazeEvaluator';
import { evaluateMaze, routeGainForPlacement } from './evaluateMaze';
import { computeTowerRouteCoverage } from './routeCoverage';
import type { MazeTower } from './types';

/** '.' free, '#' not walkable, 'T' occupied by a tower, 'S' entrance, 'G' exit. */
function parseBoard(rowsText: readonly string[]): GridModel {
  const cells: GridCell[] = [];
  let entrance: GridPoint = { x: 0, y: 0 };
  let exit: GridPoint = { x: 0, y: 0 };

  rowsText.forEach((rowText, y) => {
    [...rowText].forEach((symbol, x) => {
      const role = symbol === 'S' ? 'entrance' : symbol === 'G' ? 'exit' : 'empty';
      if (symbol === 'S') entrance = { x, y };
      if (symbol === 'G') exit = { x, y };
      cells.push({ x, y, role, isWalkable: symbol !== '#', isOccupied: symbol === 'T' });
    });
  });

  return { cols: rowsText[0].length, rows: rowsText.length, cells, entrance, exit };
}

function routeCost(route: readonly GridPoint[] | null): number | null {
  if (route === null) return null;
  let cost = 0;
  for (let step = 1; step < route.length; step += 1) {
    const diagonal = route[step].x !== route[step - 1].x && route[step].y !== route[step - 1].y;
    cost += diagonal ? Math.SQRT2 : 1;
  }
  return cost;
}

/** Brute-force reference: occupy the footprint on a copy and re-route with the shared pathfinder. */
function referenceGain(grid: GridModel, anchor: GridPoint) {
  const before = findRoutesBySizeClass(grid, grid.entrance, grid.exit);
  if (!canOccupyFootprint(grid, anchor, TOWER_FOOTPRINT) || !before.small || !before.large) {
    return { valid: false, smallGain: 0, largeGain: 0 };
  }
  const blocked: GridModel = {
    ...grid,
    cells: grid.cells.map((cell) => {
      const inside =
        cell.x >= anchor.x &&
        cell.x < anchor.x + TOWER_FOOTPRINT.width &&
        cell.y >= anchor.y &&
        cell.y < anchor.y + TOWER_FOOTPRINT.height;
      return inside ? { ...cell, isOccupied: true } : cell;
    }),
  };
  const after = findRoutesBySizeClass(blocked, grid.entrance, grid.exit);
  if (!after.small || !after.large) {
    return { valid: false, smallGain: 0, largeGain: 0 };
  }
  return {
    valid: true,
    smallGain: (routeCost(after.small) ?? 0) - (routeCost(before.small) ?? 0),
    largeGain: (routeCost(after.large) ?? 0) - (routeCost(before.large) ?? 0),
  };
}

const CORRIDOR_BOARD = [
  'G...####',
  '########',
  'S.....G.',
  '........',
  '........',
  '........',
  '########',
  '########',
];

const SERPENTINE_BOARD = [
  'S.......',
  '........',
  '####....',
  '####....',
  '........',
  '........',
  'G...####',
  '....####',
];

const U_TURN_BOARD = ['S.......', '........', 'TTTTTT..', 'TTTTTT..', 'G.......', '........'];

describe('evaluateMaze', () => {
  it('returns the same routes and octile costs as the shared size-class pathfinder', () => {
    for (const board of [CORRIDOR_BOARD, SERPENTINE_BOARD, U_TURN_BOARD]) {
      const grid = parseBoard(board);
      const reference = findRoutesBySizeClass(grid, grid.entrance, grid.exit);
      const evaluation = evaluateMaze(grid, grid.entrance, grid.exit, []);

      expect(evaluation.smallRoute).toEqual(reference.small);
      expect(evaluation.largeRoute).toEqual(reference.large);
      expect(evaluation.smallRouteCost).toBeCloseTo(routeCost(reference.small) ?? -1, 9);
      expect(evaluation.largeRouteCost).toBeCloseTo(routeCost(reference.large) ?? -1, 9);
    }
  });

  it('measures a serpentine maze as longer than a straight corridor', () => {
    const corridor = parseBoard(CORRIDOR_BOARD);
    const serpentine = parseBoard(SERPENTINE_BOARD);
    const straight = evaluateMaze(corridor, corridor.entrance, corridor.exit, []);
    const winding = evaluateMaze(serpentine, serpentine.entrance, serpentine.exit, []);

    expect(straight.smallRouteCost).toBe(6);
    expect(straight.largeRouteCost).toBe(6);
    expect(winding.smallRouteCost ?? 0).toBeGreaterThan(9);
    expect(winding.largeRouteCost ?? 0).toBeGreaterThan(9);
  });

  it('reports null costs and routes when the goal is unreachable', () => {
    const grid = parseBoard(['S.#..', '..#.G']);
    const evaluation = evaluateMaze(grid, grid.entrance, grid.exit, []);

    expect(evaluation.smallRoute).toBeNull();
    expect(evaluation.smallRouteCost).toBeNull();
    expect(evaluation.largeRouteCost).toBeNull();
  });

  it('counts a tower covering both legs of a U-turn twice', () => {
    const grid = parseBoard(U_TURN_BOARD);
    const tower: MazeTower = { anchor: { x: 2, y: 2 }, footprint: TOWER_FOOTPRINT, range: 2.5 };
    const evaluation = evaluateMaze(grid, grid.entrance, grid.exit, [tower]);
    const [coverage] = evaluation.coverageByTower;
    const upperLeg = (evaluation.smallRoute ?? []).filter((point) => point.y < 2);
    const lowerLeg = (evaluation.smallRoute ?? []).filter((point) => point.y >= 4);

    expect(computeTowerRouteCoverage(tower, upperLeg, null).small).toBeGreaterThan(0);
    expect(computeTowerRouteCoverage(tower, lowerLeg, null).small).toBeGreaterThan(0);
    expect(coverage.small).toBe(
      computeTowerRouteCoverage(tower, upperLeg, null).small +
        computeTowerRouteCoverage(tower, lowerLeg, null).small,
    );
    expect(coverage.large).toBeGreaterThan(0);
  });
});

describe('routeGainForPlacement', () => {
  it('is zero beside a straight corridor route and positive across it', () => {
    const grid = parseBoard(CORRIDOR_BOARD);
    const beside = routeGainForPlacement(grid, grid.entrance, grid.exit, { x: 3, y: 4 });
    const across = routeGainForPlacement(grid, grid.entrance, grid.exit, { x: 3, y: 2 });

    expect(beside).toEqual({ valid: true, smallGain: 0, largeGain: 0 });
    expect(across.valid).toBe(true);
    expect(across.smallGain).toBeGreaterThan(0);
    expect(across.largeGain).toBeGreaterThan(0);
  });

  it('rejects a placement that leaves small creeps a path but blocks the large route', () => {
    const grid = parseBoard(CORRIDOR_BOARD);
    const before = findRoutesBySizeClass(grid, grid.entrance, grid.exit);
    expect(before.small).not.toBeNull();

    // Rows 3-4 blocked: row 2 and row 5 stay open for 1x1 creeps, but no 2-row gap remains.
    expect(routeGainForPlacement(grid, grid.entrance, grid.exit, { x: 3, y: 3 })).toEqual({
      valid: false,
      smallGain: 0,
      largeGain: 0,
    });
    expect(referenceGain(grid, { x: 3, y: 3 }).valid).toBe(false);
  });

  it('rejects footprints on walls, towers, endpoints, or out of bounds', () => {
    const grid = parseBoard(U_TURN_BOARD);
    const evaluator = createMazeEvaluator(grid, grid.entrance, grid.exit);

    expect(evaluator.routeGainForPlacement({ x: 1, y: 2 }).valid).toBe(false);
    expect(evaluator.routeGainForPlacement({ x: 0, y: 0 }).valid).toBe(false);
    expect(evaluator.routeGainForPlacement({ x: 7, y: 0 }).valid).toBe(false);
    expect(evaluator.routeGainForPlacement({ x: -1, y: 0 }).valid).toBe(false);
  });

  it('matches a brute-force re-route for every anchor on hand-built boards', () => {
    let lengtheningCount = 0;
    let invalidCount = 0;

    for (const board of [CORRIDOR_BOARD, SERPENTINE_BOARD, U_TURN_BOARD]) {
      const grid = parseBoard(board);
      const evaluator = createMazeEvaluator(grid, grid.entrance, grid.exit);

      for (let y = 0; y < grid.rows; y += 1) {
        for (let x = 0; x < grid.cols; x += 1) {
          const actual = evaluator.routeGainForPlacement({ x, y });
          const expected = referenceGain(grid, { x, y });

          expect(actual.valid, `${board.join('/')} @ ${x},${y}`).toBe(expected.valid);
          expect(actual.smallGain).toBeCloseTo(expected.smallGain, 6);
          expect(actual.largeGain).toBeCloseTo(expected.largeGain, 6);
          lengtheningCount += actual.smallGain > 0 || actual.largeGain > 0 ? 1 : 0;
          invalidCount += actual.valid ? 0 : 1;
        }
      }
    }

    expect(lengtheningCount).toBeGreaterThan(0);
    expect(invalidCount).toBeGreaterThan(0);
  });

  it('is deterministic and leaves the grid and evaluator state untouched', () => {
    const grid = parseBoard(SERPENTINE_BOARD);
    const snapshot = JSON.stringify(grid);
    const evaluator = createMazeEvaluator(grid, grid.entrance, grid.exit);
    const first = evaluator.routeGainForPlacement({ x: 4, y: 2 });
    evaluator.routeGainForPlacement({ x: 2, y: 4 });
    const repeated = evaluator.routeGainForPlacement({ x: 4, y: 2 });
    const fresh = routeGainForPlacement(grid, grid.entrance, grid.exit, { x: 4, y: 2 });

    expect(repeated).toEqual(first);
    expect(fresh).toEqual(first);
    expect(evaluateMaze(grid, grid.entrance, grid.exit, [])).toEqual(
      evaluateMaze(grid, grid.entrance, grid.exit, []),
    );
    expect(JSON.stringify(grid)).toBe(snapshot);
  });
});
