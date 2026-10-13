import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { withFootprintOccupancy } from '../../../shared/lib/grid/footprint';
import { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { getUpgradeCost } from '../../tower/model/upgrade';
import { findCheapestAffordableTower, getTowerCostForType } from './buildSpendBudget';
import { createPathProbe } from './createPathProbe';
import { findBestScoredBuild } from './findBestScoredBuild';
import { createMazePlanPriority, selectPlanBuilds } from './maze-planning';
import { DEFENSE_PLACEMENT_WEIGHTS, MAZE_PLACEMENT_WEIGHTS } from './scoreTowerPlacement';
import type { ComputerAction, DecisionContext, UpgradeAction } from './types';
import { StrategyIntent } from './types';

/** Running state of one build phase while its actions are chosen. */
export type BuildRoundState = {
  actions: ComputerAction[];
  reasoning: string[];
  remainingBudget: number;
  buildCount: number;
  /** Towers on the field plus the ones chosen this round. */
  plannedTowers: TowerEntity[];
  plannedPositions: GridPosition[];
  /** Grid with this round's chosen blocks walled off. */
  grid: GridModel;
  /** Route-search cells expanded so far this decision. */
  expandedNodeCount: number;
};

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

function recordBuild(
  round: BuildRoundState,
  towerType: TowerTypeId,
  position: GridPosition,
  cost: number,
  note: string,
): void {
  round.actions.push({ kind: 'build', towerType, position });
  round.plannedPositions.push(position);
  round.plannedTowers.push(createPlannedTower(towerType, position, cost));
  round.grid = withFootprintOccupancy(round.grid, position, TOWER_FOOTPRINT, true);
  round.remainingBudget -= cost;
  round.buildCount += 1;
  round.reasoning.push(
    `Building ${towerType} at (${position.x},${position.y}) for ${cost} gold, ${note}`,
  );
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

/** Adds the cheapest affordable upgrade, if any. */
export function addBestUpgrade(
  round: BuildRoundState,
  context: DecisionContext,
  existingTowers: readonly TowerEntity[],
): void {
  const upgrade = findBestUpgrade(context, existingTowers, round.remainingBudget);
  const tower = upgrade && existingTowers.find((t) => t.id === upgrade.towerId);
  const cost = getUpgradeCost(tower?.type ?? TowerTypeId.SINGLE, tower?.level ?? 1);
  if (upgrade && cost !== null) {
    round.actions.push(upgrade);
    round.remainingBudget -= cost;
    round.reasoning.push(`Upgrading tower ${upgrade.towerId} for ${cost} gold`);
  }
}

/**
 * Builds the next planned maze blocks with the cheapest affordable tower
 * type, best immediate gain first. True when the plan ran out of buildable
 * blocks before the round's allowance did.
 */
export function buildFromPlan(
  round: BuildRoundState,
  context: DecisionContext,
  unbuilt: readonly GridPosition[],
  maxBuilds: number,
): boolean {
  const wallTower = findCheapestAffordableTower(
    context.affordableTowers,
    context.raceId,
    round.remainingBudget,
  );
  if (!wallTower) {
    return false;
  }

  const available = new Set(context.availableBuildPositions.map((p) => `${p.x}:${p.y}`));
  const candidates = unbuilt.filter((anchor) => available.has(`${anchor.x}:${anchor.y}`));
  const count = Math.min(maxBuilds, Math.floor(round.remainingBudget / wallTower.cost));
  const selection = selectPlanBuilds({ grid: round.grid, candidates, maxBuilds: count });
  round.expandedNodeCount += selection.expandedNodeCount;

  selection.anchors.forEach((anchor, index) => {
    const note = `maze plan, +${selection.gains[index].toFixed(1)} route cost`;
    recordBuild(round, wallTower.towerType, anchor, wallTower.cost, note);
  });
  return selection.anchors.length < count;
}

/** Single-tower builds by placement score, each placed against the previous ones. */
export function buildByScore(
  round: BuildRoundState,
  context: DecisionContext,
  intent: StrategyIntent,
  unbuilt: readonly GridPosition[],
  maxBuilds: number,
): void {
  const mazePlan = createMazePlanPriority(unbuilt);
  const weights =
    intent === StrategyIntent.DEFEND ? DEFENSE_PLACEMENT_WEIGHTS : MAZE_PLACEMENT_WEIGHTS;

  while (round.buildCount < maxBuilds) {
    const pathProbe = createPathProbe(round.grid);
    const build = findBestScoredBuild({
      context,
      grid: round.grid,
      pathProbe,
      mazePlan,
      weights,
      existingTowers: round.plannedTowers,
      budget: round.remainingBudget,
      excludedPositions: round.plannedPositions,
    });
    const cost = build ? getTowerCostForType(build.towerType, context.raceId) : null;
    const gain = build ? Math.max(0, pathProbe.probeFootprint(build.position).gain) : 0;
    round.expandedNodeCount += pathProbe.expandedNodeCount;
    if (!build || cost === null || cost > round.remainingBudget) {
      return;
    }

    recordBuild(round, build.towerType, build.position, cost, `+${gain.toFixed(1)} route cost`);
  }
}
