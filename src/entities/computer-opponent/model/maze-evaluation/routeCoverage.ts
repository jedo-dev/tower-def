import { LARGE_ROUTE_AGENT_SIZE, MAZE_COVERAGE_WEIGHTS, SMALL_ROUTE_AGENT_SIZE } from './constants';
import type { MazeRoute, MazeSizeClassWeights, MazeTower, TowerRouteCoverage } from './types';

/**
 * Route samples whose agent centre lies within `range` (inclusive, Euclidean)
 * of (centreX, centreY). The route is sampled once per anchor cell, so a
 * route that passes the same area twice is counted twice. Coordinates are in
 * cell units with cell (x, y) spanning [x, x + 1) x [y, y + 1).
 */
export function countRouteSamplesInRange(
  route: MazeRoute,
  agentSize: number,
  centreX: number,
  centreY: number,
  range: number,
): number {
  if (route === null || !(range >= 0)) {
    return 0;
  }

  const rangeSquared = range * range;
  const halfAgent = agentSize / 2;
  let count = 0;

  for (let step = 0; step < route.length; step += 1) {
    const deltaX = route[step].x + halfAgent - centreX;
    const deltaY = route[step].y + halfAgent - centreY;

    if (deltaX * deltaX + deltaY * deltaY <= rangeSquared) {
      count += 1;
    }
  }

  return count;
}

/** How many small- and large-route samples a tower reaches, plus a weighted combined score. */
export function computeTowerRouteCoverage(
  tower: MazeTower,
  smallRoute: MazeRoute,
  largeRoute: MazeRoute,
  weights: Readonly<MazeSizeClassWeights> = MAZE_COVERAGE_WEIGHTS,
): TowerRouteCoverage {
  const centreX = tower.anchor.x + tower.footprint.width / 2;
  const centreY = tower.anchor.y + tower.footprint.height / 2;
  const small = countRouteSamplesInRange(
    smallRoute,
    SMALL_ROUTE_AGENT_SIZE,
    centreX,
    centreY,
    tower.range,
  );
  const large = countRouteSamplesInRange(
    largeRoute,
    LARGE_ROUTE_AGENT_SIZE,
    centreX,
    centreY,
    tower.range,
  );

  return { small, large, combined: weights.small * small + weights.large * large };
}
