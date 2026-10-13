import { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { getUpgradeCost } from '../../tower/model/upgrade';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { buildableTowers } from '../../tower/model/config/buildableTowers';
import { Difficulty } from '../../difficulty/model/types';
import { createPathProbe, type PathProbe } from '../../../shared/lib/pathfinding/createPathProbe';
import { createMazeSkeleton, type MazeSkeleton } from './createMazeSkeleton';
import type {
  BuildAction,
  ComputerAction,
  DecisionContext,
  DecisionOutput,
  UpgradeAction,
} from './types';
import { StrategyIntent } from './types';
import type { ComputerDecisionDebugRecorder } from './decisionDebugSnapshots';
import {
  scoreAllPlacements,
  DEFENSE_PLACEMENT_WEIGHTS,
  MAZE_PLACEMENT_WEIGHTS,
  type PlacementScore,
  type PlacementWeights,
} from './scoreTowerPlacement';

export type BuildPlannerInput = {
  context: DecisionContext;
  grid: GridModel;
  existingTowers: readonly TowerEntity[];
  path: readonly GridPosition[];
  debugRecorder?: ComputerDecisionDebugRecorder;
};

type SpendBudgetConfig = {
  maxSpendRatioPerRound: number;
  /**
   * Towers per round. The player has no such cap, so this is purely the
   * difficulty dial; set too low it starves the maze once income takes off,
   * because gold piles up faster than the opponent is allowed to spend it.
   */
  maxBuildActionsPerRound: number;
  minGoldReserveRatio: number;
  /**
   * Share of the field the opponent keeps walling before it switches from
   * growing the maze to upgrading what it already has.
   */
  mazeCoverageTarget: number;
};

const SPEND_BUDGET_BY_DIFFICULTY: Record<Difficulty, SpendBudgetConfig> = {
  [Difficulty.EASY]: {
    maxSpendRatioPerRound: 0.4,
    maxBuildActionsPerRound: 2,
    minGoldReserveRatio: 0.35,
    mazeCoverageTarget: 0.25,
  },
  [Difficulty.NORMAL]: {
    maxSpendRatioPerRound: 0.6,
    maxBuildActionsPerRound: 4,
    minGoldReserveRatio: 0.25,
    mazeCoverageTarget: 0.34,
  },
  [Difficulty.HARD]: {
    maxSpendRatioPerRound: 0.85,
    maxBuildActionsPerRound: 6,
    minGoldReserveRatio: 0.15,
    mazeCoverageTarget: 0.42,
  },
  [Difficulty.NIGHTMARE]: {
    maxSpendRatioPerRound: 0.95,
    maxBuildActionsPerRound: 8,
    minGoldReserveRatio: 0.1,
    mazeCoverageTarget: 0.46,
  },
};

function computeSpendBudget(gold: number, difficulty: Difficulty): number {
  const config = SPEND_BUDGET_BY_DIFFICULTY[difficulty];
  const reserveGold = Math.floor(gold * config.minGoldReserveRatio);
  const ratioBudget = Math.floor(gold * config.maxSpendRatioPerRound);
  const reserveBudget = Math.max(0, gold - reserveGold);
  return Math.min(ratioBudget, reserveBudget);
}

function getTowerCostForType(towerType: TowerTypeId, raceId: string): number | null {
  const registry = getRaceRegistry(raceId as never);
  for (const buildableId of registry.buildableTowerIds) {
    const config = buildableTowers.find((t) => t.id === buildableId);
    if (config && config.towerType === towerType) {
      return config.costGold;
    }
  }
  return null;
}

function findBestUpgrade(
  context: DecisionContext,
  existingTowers: readonly TowerEntity[],
  budget: number,
): UpgradeAction | null {
  let bestUpgrade: UpgradeAction | null = null;
  let bestCost = Infinity;

  for (const towerId of context.upgradeableTowerIds) {
    const tower = existingTowers.find((t) => t.id === towerId);
    if (!tower) {
      continue;
    }

    const cost = getUpgradeCost(tower.type, tower.level);
    if (cost === null || cost > budget) {
      continue;
    }

    if (cost < bestCost) {
      bestCost = cost;
      bestUpgrade = { kind: 'upgrade', towerId };
    }
  }

  return bestUpgrade;
}

type FindBestBuildInput = {
  context: DecisionContext;
  grid: GridModel;
  pathProbe: PathProbe;
  mazeSkeleton: MazeSkeleton;
  weights: PlacementWeights;
  existingTowers: readonly TowerEntity[];
  budget: number;
  excludedPositions: readonly GridPosition[];
};

function findBestBuild(input: FindBestBuildInput): BuildAction | null {
  const {
    context,
    grid,
    pathProbe,
    mazeSkeleton,
    weights,
    existingTowers,
    budget,
    excludedPositions,
  } = input;

  if (context.affordableTowers.length === 0 || context.availableBuildPositions.length === 0) {
    return null;
  }

  const candidatePositions = context.availableBuildPositions.filter(
    (position) =>
      !excludedPositions.some(
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
      mazeSkeleton,
      weights,
    });

    const bestValid = scores.find((s) => s.isValid);
    if (!bestValid) {
      continue;
    }

    // Value per gold, not raw value: most cells of a maze are plain wall, and
    // a cheap tower walls one just as well as a pricey one. Comparing raw
    // scores made the opponent pay a premium archetype price for every brick
    // and run out of budget halfway down a tooth.
    const valuePerGold = bestValid.totalScore / cost;
    if (valuePerGold > bestValuePerGold) {
      bestValuePerGold = valuePerGold;
      bestScore = bestValid;
    }
  }

  if (!bestScore) {
    return null;
  }

  return {
    kind: 'build',
    towerType: bestScore.towerType,
    position: bestScore.position,
  };
}

function selectIntent(context: DecisionContext, unbuiltSkeletonCells: number): StrategyIntent {
  if (context.threat.threatLevel === 'high') {
    return StrategyIntent.DEFEND;
  }

  const hasRecentLeaks = context.leakHistory.some((entry) => entry.leakedCount > 0);
  if (hasRecentLeaks) {
    return StrategyIntent.DEFEND;
  }

  // Growing the maze outranks upgrading: a longer route multiplies every tower
  // already on the field, while a level-up only improves one of them. The
  // coverage cap is what stops an endless wall, and it is the one dial that
  // makes an easy opponent settle for a shorter maze than a nightmare one.
  const coverageRatio =
    context.mazeCoverage.totalWalkableCells === 0
      ? 1
      : context.mazeCoverage.occupiedCells / context.mazeCoverage.totalWalkableCells;
  const isUnderCoverageCap =
    coverageRatio < SPEND_BUDGET_BY_DIFFICULTY[context.difficulty].mazeCoverageTarget;
  if (isUnderCoverageCap && unbuiltSkeletonCells > 0) {
    return StrategyIntent.EXTEND_MAZE;
  }

  if (context.upgradeableTowerIds.length > 0 && context.mazeCoverage.towerCount >= 3) {
    return StrategyIntent.UPGRADE;
  }

  return StrategyIntent.SAVE_GOLD;
}

function countUnbuiltSkeletonCells(grid: GridModel, mazeSkeleton: MazeSkeleton): number {
  const freeKeys = new Set<string>();
  for (const cell of grid.cells) {
    if (cell.isWalkable && !cell.isOccupied) {
      freeKeys.add(`${cell.x}:${cell.y}`);
    }
  }

  let unbuilt = 0;
  for (const cell of mazeSkeleton.cells) {
    if (freeKeys.has(`${cell.x}:${cell.y}`)) {
      unbuilt += 1;
    }
  }

  return unbuilt;
}

function selectPlacementWeights(intent: StrategyIntent): PlacementWeights {
  return intent === StrategyIntent.DEFEND ? DEFENSE_PLACEMENT_WEIGHTS : MAZE_PLACEMENT_WEIGHTS;
}

/** Grid with one more cell walled off, so the next placement sees the new wall. */
function withCellBlocked(grid: GridModel, position: GridPosition): GridModel {
  return {
    ...grid,
    cells: grid.cells.map((cell) =>
      cell.x === position.x && cell.y === position.y
        ? { ...cell, isOccupied: true, isWalkable: false }
        : cell,
    ),
  };
}

function createPlannedTower(
  towerType: TowerTypeId,
  position: GridPosition,
  cost: number,
): TowerEntity {
  return {
    id: `planned:tower:${position.x}:${position.y}`,
    position,
    cost,
    type: towerType,
    level: TOWER_BASE_LEVEL,
    combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[towerType] },
  };
}

export function planBuildDecision(input: BuildPlannerInput): DecisionOutput {
  const { context, grid, existingTowers, debugRecorder } = input;

  function finish(output: DecisionOutput): DecisionOutput {
    debugRecorder?.recordBuildDecision(context, output);
    return output;
  }

  if (context.phase !== 'build') {
    return finish({
      intent: StrategyIntent.SAVE_GOLD,
      actions: [{ kind: 'save' }],
      reasoning: 'Not in build phase, cannot take build actions',
      confidenceScore: 1,
    });
  }

  // The comb is a property of the field, not of the towers on it, so it is
  // planned once and kept stable across rounds: the opponent keeps filling the
  // same maze instead of re-planning a different one every time it earns gold.
  const mazeSkeleton = createMazeSkeleton(grid);
  const intent = selectIntent(context, countUnbuiltSkeletonCells(grid, mazeSkeleton));
  const spendConfig = SPEND_BUDGET_BY_DIFFICULTY[context.difficulty];
  const budget = computeSpendBudget(context.gold, context.difficulty);

  if (budget <= 0) {
    return finish({
      intent: StrategyIntent.SAVE_GOLD,
      actions: [{ kind: 'save' }],
      reasoning: 'No budget available for spending',
      confidenceScore: 1,
    });
  }

  const actions: ComputerAction[] = [];
  let remainingBudget = budget;
  let plannedTowerStates = [...existingTowers];
  const plannedBuildPositions: GridPosition[] = [];
  let buildActionsCount = 0;
  const reasoningParts: string[] = [];

  if (intent === StrategyIntent.UPGRADE || intent === StrategyIntent.DEFEND) {
    const upgrade = findBestUpgrade(context, existingTowers, remainingBudget);
    if (upgrade) {
      const upgradedTower = existingTowers.find((t) => t.id === upgrade.towerId);
      const cost = getUpgradeCost(
        upgradedTower?.type ?? TowerTypeId.SINGLE,
        upgradedTower?.level ?? 1,
      );
      if (cost !== null) {
        actions.push(upgrade);
        remainingBudget -= cost;
        reasoningParts.push(`Upgrading tower ${upgrade.towerId} for ${cost} gold`);
      }
    }
  }

  const shouldBuild =
    intent === StrategyIntent.DEFEND ||
    intent === StrategyIntent.EXTEND_MAZE ||
    intent === StrategyIntent.UPGRADE;
  const weights = selectPlacementWeights(intent);
  // Simulated so that each extra tower this round is placed against the wall the
  // previous one just created; otherwise the opponent scatters isolated towers.
  let simulatedGrid = grid;

  while (shouldBuild && buildActionsCount < spendConfig.maxBuildActionsPerRound) {
    const pathProbe = createPathProbe(simulatedGrid);
    const build = findBestBuild({
      context,
      grid: simulatedGrid,
      pathProbe,
      mazeSkeleton,
      weights,
      existingTowers: plannedTowerStates,
      budget: remainingBudget,
      excludedPositions: plannedBuildPositions,
    });
    if (!build) {
      break;
    }

    const cost = getTowerCostForType(build.towerType, context.raceId);
    if (cost === null || cost > remainingBudget) {
      break;
    }

    const mazeGainCells = Math.max(
      0,
      pathProbe.probe(build.position).length - pathProbe.baseLength,
    );

    actions.push(build);
    plannedBuildPositions.push(build.position);
    plannedTowerStates = [
      ...plannedTowerStates,
      createPlannedTower(build.towerType, build.position, cost),
    ];
    simulatedGrid = withCellBlocked(simulatedGrid, build.position);
    remainingBudget -= cost;
    buildActionsCount += 1;
    reasoningParts.push(
      `Building ${build.towerType} at (${build.position.x},${build.position.y}) for ${cost} gold, +${mazeGainCells} path cells`,
    );
  }

  if (actions.length === 0) {
    actions.push({ kind: 'save' });
    reasoningParts.push('No beneficial actions within budget, saving gold');
  }

  return finish({
    intent,
    actions,
    reasoning: reasoningParts.join('; '),
    confidenceScore: 0.8,
  });
}
