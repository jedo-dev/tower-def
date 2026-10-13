export {
  LARGE_ROUTE_AGENT_SIZE,
  MAZE_COVERAGE_WEIGHTS,
  MAZE_ROUTE_GAIN_WEIGHTS,
  SMALL_ROUTE_AGENT_SIZE,
} from './constants';
export { createMazeEvaluator } from './createMazeEvaluator';
export { evaluateMaze, routeGainForPlacement } from './evaluateMaze';
export { gainPerGold } from './gainPerGold';
export { computeTowerRouteCoverage, countRouteSamplesInRange } from './routeCoverage';

export type { MazeEvaluator } from './createMazeEvaluator';
export type {
  MazeEvaluation,
  MazeRoute,
  MazeRoutes,
  MazeSizeClassWeights,
  MazeTower,
  PlacementRouteGain,
  TowerRouteCoverage,
} from './types';
