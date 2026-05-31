import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerEntity } from '../../tower/model/types';
import { getUpgradeCost } from '../../tower/model/upgrade';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { buildableTowers } from '../../tower/model/config/buildableTowers';
import { Difficulty } from '../../difficulty/model/types';
import type {
  BuildAction,
  ComputerAction,
  DecisionContext,
  DecisionOutput,
  UpgradeAction,
} from './types';
import { StrategyIntent } from './types';
import type { ComputerDecisionDebugRecorder } from './decisionDebugSnapshots';
import { scoreAllPlacements, type PlacementScore } from './scoreTowerPlacement';

export type BuildPlannerInput = {
  context: DecisionContext;
  grid: GridModel;
  existingTowers: readonly TowerEntity[];
  path: readonly GridPosition[];
  debugRecorder?: ComputerDecisionDebugRecorder;
};

type SpendBudgetConfig = {
  maxSpendRatioPerRound: number;
};

const SPEND_BUDGET_BY_DIFFICULTY: Record<Difficulty, SpendBudgetConfig> = {
  [Difficulty.EASY]: { maxSpendRatioPerRound: 0.3 },
  [Difficulty.NORMAL]: { maxSpendRatioPerRound: 0.5 },
  [Difficulty.HARD]: { maxSpendRatioPerRound: 0.7 },
  [Difficulty.NIGHTMARE]: { maxSpendRatioPerRound: 0.9 },
};

function computeSpendBudget(gold: number, difficulty: Difficulty): number {
  const config = SPEND_BUDGET_BY_DIFFICULTY[difficulty];
  return Math.floor(gold * config.maxSpendRatioPerRound);
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

function findBestBuild(
  context: DecisionContext,
  grid: GridModel,
  existingTowers: readonly TowerEntity[],
  path: readonly GridPosition[],
  budget: number,
): BuildAction | null {
  if (context.affordableTowers.length === 0 || context.availableBuildPositions.length === 0) {
    return null;
  }

  let bestScore: PlacementScore | null = null;

  for (const towerType of context.affordableTowers) {
    const cost = getTowerCostForType(towerType, context.raceId);
    if (cost === null || cost > budget) {
      continue;
    }

    const scores = scoreAllPlacements({
      grid,
      towerType,
      positions: context.availableBuildPositions,
      existingTowers,
      path,
    });

    const bestValid = scores.find((s) => s.isValid);
    if (!bestValid) {
      continue;
    }

    if (bestValid.totalScore > (bestScore?.totalScore ?? 0)) {
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

function selectIntent(context: DecisionContext): StrategyIntent {
  if (context.threat.threatLevel === 'high') {
    return StrategyIntent.DEFEND;
  }

  const hasRecentLeaks = context.leakHistory.some((entry) => entry.leakedCount > 0);
  if (hasRecentLeaks) {
    return StrategyIntent.DEFEND;
  }

  if (context.upgradeableTowerIds.length > 0 && context.mazeCoverage.towerCount >= 3) {
    return StrategyIntent.UPGRADE;
  }

  const coverageRatio = context.mazeCoverage.occupiedCells / context.mazeCoverage.totalWalkableCells;
  if (coverageRatio < 0.15) {
    return StrategyIntent.EXTEND_MAZE;
  }

  return StrategyIntent.SAVE_GOLD;
}

export function planBuildDecision(input: BuildPlannerInput): DecisionOutput {
  const { context, grid, existingTowers, path, debugRecorder } = input;

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

  const intent = selectIntent(context);
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
  const reasoningParts: string[] = [];

  if (intent === StrategyIntent.UPGRADE || intent === StrategyIntent.DEFEND) {
    const upgrade = findBestUpgrade(context, existingTowers, remainingBudget);
    if (upgrade) {
      const cost = getUpgradeCost(
        existingTowers.find((t) => t.id === upgrade.towerId)?.type ?? 'archer',
        existingTowers.find((t) => t.id === upgrade.towerId)?.level ?? 1,
      );
      if (cost !== null) {
        actions.push(upgrade);
        remainingBudget -= cost;
        reasoningParts.push(`Upgrading tower ${upgrade.towerId} for ${cost} gold`);
      }
    }
  }

  if (intent === StrategyIntent.DEFEND || intent === StrategyIntent.EXTEND_MAZE) {
    const build = findBestBuild(context, grid, existingTowers, path, remainingBudget);
    if (build) {
      const cost = getTowerCostForType(build.towerType, context.raceId);
      if (cost !== null) {
        actions.push(build);
        reasoningParts.push(`Building ${build.towerType} at (${build.position.x},${build.position.y}) for ${cost} gold`);
      }
    }
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
