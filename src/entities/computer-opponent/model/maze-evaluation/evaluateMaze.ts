import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import type { Footprint, GridModel, GridPoint } from '../../../../shared/types/grid';
import { createMazeEvaluator } from './createMazeEvaluator';
import { computeTowerRouteCoverage } from './routeCoverage';
import type { MazeEvaluation, MazeTower, PlacementRouteGain } from './types';

/**
 * Both creep routes from `start` to `goal` (anchor contract of
 * `findRouteForSizeClass`), their octile costs, and how much of them each
 * tower covers. `towers` are only used for coverage; they must already be
 * marked occupied on `grid`.
 */
export function evaluateMaze(
  grid: GridModel,
  start: GridPoint,
  goal: GridPoint,
  towers: readonly MazeTower[],
): MazeEvaluation {
  const { routes } = createMazeEvaluator(grid, start, goal);

  return {
    ...routes,
    coverageByTower: towers.map((tower) =>
      computeTowerRouteCoverage(tower, routes.smallRoute, routes.largeRoute),
    ),
  };
}

/**
 * One-off route gain for a single candidate. To score many candidates on the
 * same board, create one `createMazeEvaluator` and reuse it instead.
 */
export function routeGainForPlacement(
  grid: GridModel,
  start: GridPoint,
  goal: GridPoint,
  anchor: GridPoint,
  footprint: Readonly<Footprint> = TOWER_FOOTPRINT,
): PlacementRouteGain {
  return createMazeEvaluator(grid, start, goal).routeGainForPlacement(anchor, footprint);
}
