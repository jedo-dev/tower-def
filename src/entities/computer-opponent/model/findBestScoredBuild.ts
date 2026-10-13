import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerEntity } from '../../tower/model/types';
import { getTowerCostForType } from './buildSpendBudget';
import type { PathProbe } from './createPathProbe';
import type { MazePlanPriority } from './maze-planning';
import {
  scoreAllPlacements,
  type PlacementScore,
  type PlacementWeights,
} from './scoreTowerPlacement';
import type { BuildAction, DecisionContext } from './types';

export type FindBestScoredBuildInput = {
  context: DecisionContext;
  grid: GridModel;
  pathProbe: PathProbe;
  mazePlan: MazePlanPriority;
  weights: PlacementWeights;
  existingTowers: readonly TowerEntity[];
  budget: number;
  excludedPositions: readonly GridPosition[];
};

/**
 * Best single tower by placement score per gold: route coverage, maze gain,
 * wall synergy and the maze plan, weighted by the current stance. Used when
 * defending, and whenever the maze plan has nothing buildable to offer.
 */
export function findBestScoredBuild(input: FindBestScoredBuildInput): BuildAction | null {
  const { context, grid, pathProbe, mazePlan, weights, existingTowers, budget } = input;

  if (context.affordableTowers.length === 0 || context.availableBuildPositions.length === 0) {
    return null;
  }

  const candidatePositions = context.availableBuildPositions.filter(
    (position) =>
      !input.excludedPositions.some(
        (excluded) => excluded.x === position.x && excluded.y === position.y,
      ),
  );
  if (candidatePositions.length === 0) {
    return null;
  }

  let bestScore: PlacementScore | null = null;
  let bestValuePerGold = 0;

  for (const towerType of context.affordableTowers) {
    const cost = getTowerCostForType(towerType, context.raceId);
    if (cost === null || cost <= 0 || cost > budget) {
      continue;
    }

    const scores = scoreAllPlacements({
      grid,
      towerType,
      positions: candidatePositions,
      existingTowers,
      path: pathProbe.basePath,
      pathProbe,
      mazePlan,
      weights,
    });

    const bestValid = scores.find((score) => score.isValid);
    if (!bestValid) {
      continue;
    }

    // Value per gold, not raw value: a cheap tower walls a cell just as well
    // as a pricey one, so raw scores would overpay for every brick.
    const valuePerGold = bestValid.totalScore / cost;
    if (valuePerGold > bestValuePerGold) {
      bestValuePerGold = valuePerGold;
      bestScore = bestValid;
    }
  }

  return bestScore
    ? { kind: 'build', towerType: bestScore.towerType, position: bestScore.position }
    : null;
}
