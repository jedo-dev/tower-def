import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { withFootprintOccupancy } from '../../../../shared/lib/grid/footprint';
import type { RaceId, TowerTypeId } from '../../../../shared/types/content-ids';
import type { GridModel, GridPoint } from '../../../../shared/types/grid';
import type { TowerCombatStats, TowerEntity } from '../../../tower/model/types';
import {
  resolveBuildableTowerDamageType,
  resolveTowerDamageType,
} from '../../../tower/model/damageType';
import { resolveTowerPlacementStats } from '../../../tower/model/placementStats';
import { NO_TOWER_BRANCH_CHOICES, type TowerBranchChoices } from '../../../tower/model/talents';
import {
  getTowerStatsForTowerLevel,
  getUpgradeCost,
  resolveTowerUpgradeConfig,
} from '../../../tower/model/upgrade';
import { TowerTalentRule } from '../../../../shared/constants/towerTalents';
import { getRaceTowerConfig } from '../buildSpendBudget';
import { MAZE_ROUTE_GAIN_WEIGHTS } from '../maze-evaluation/constants';
import { createMazeEvaluator } from '../maze-evaluation/createMazeEvaluator';
import type { MazeRoutes } from '../maze-evaluation/types';
import type { InvestmentTowerType, UpgradeCandidate } from './planRoundInvestments';
import type { LedgerTower } from './routeDamageLedger';
import { createRouteGeometry, type RouteGeometry } from './routeGeometry';

/** The route the finished maze plan will make, and what building it is worth per block. */
export type PlannedRoute = {
  geometry: RouteGeometry;
  /** Route cells (mean over both size classes) each unbuilt block adds on average. */
  averageGainPerBlock: number;
  expandedNodeCount: number;
};

const ROUTE_WEIGHT_TOTAL = MAZE_ROUTE_GAIN_WEIGHTS.small + MAZE_ROUTE_GAIN_WEIGHTS.large;

/** Weighted route gain in plain route cells, averaged over the two size classes. */
export function toRouteCells(weightedGain: number): number {
  return ROUTE_WEIGHT_TOTAL > 0 ? weightedGain / ROUTE_WEIGHT_TOTAL : 0;
}

function weightedCost(routes: MazeRoutes): number | null {
  if (routes.smallRouteCost === null || routes.largeRouteCost === null) {
    return null;
  }
  return (
    MAZE_ROUTE_GAIN_WEIGHTS.small * routes.smallRouteCost +
    MAZE_ROUTE_GAIN_WEIGHTS.large * routes.largeRouteCost
  );
}

/**
 * Towers stand for the rest of the match, so they are placed against the
 * route the whole plan will make, not today's. Falls back to today's route
 * when the planned blocks no longer fit together.
 */
export function createPlannedRoute(grid: GridModel, unbuilt: readonly GridPoint[]): PlannedRoute {
  const current = createMazeEvaluator(grid, grid.entrance, grid.exit);
  let plannedGrid = grid;
  for (const anchor of unbuilt) {
    plannedGrid = withFootprintOccupancy(plannedGrid, anchor, TOWER_FOOTPRINT, true);
  }
  const planned = createMazeEvaluator(plannedGrid, grid.entrance, grid.exit);
  const currentCost = weightedCost(current.routes);
  const plannedCost = weightedCost(planned.routes);
  const isPlanOpen = planned.routes.smallRoute !== null && plannedCost !== null;
  const totalGain = isPlanOpen && currentCost !== null ? plannedCost - currentCost : 0;

  return {
    geometry: createRouteGeometry(
      isPlanOpen ? planned.routes.smallRoute : current.routes.smallRoute,
    ),
    averageGainPerBlock:
      unbuilt.length > 0 ? toRouteCells(Math.max(0, totalGain)) / unbuilt.length : 0,
    expandedNodeCount: current.expandedNodeCount + planned.expandedNodeCount,
  };
}

/**
 * The tower's own stats at its level (its race's authored curve when it has
 * one, grades 4-7 from its side's chosen branch), before auras.
 */
function statsAtLevel(tower: TowerEntity, choices: TowerBranchChoices): TowerCombatStats {
  return (
    getTowerStatsForTowerLevel(tower, tower.level, choices) ??
    tower.baseCombatStats ??
    tower.combatStats
  );
}

export function toLedgerTowers(
  towers: readonly TowerEntity[],
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
): LedgerTower[] {
  return towers.map((tower) => ({
    anchor: tower.position,
    towerType: tower.type,
    stats: statsAtLevel(tower, choices),
    ...(tower.allowedTargets === undefined ? {} : { allowedTargets: tower.allowedTargets }),
    damageType: resolveTowerDamageType(tower),
  }));
}

/** The rest of the tower's chosen branch: its top grade and the gold up to it. */
function branchPath(
  tower: TowerEntity,
  choices: TowerBranchChoices,
): UpgradeCandidate['path'] | undefined {
  const levels = resolveTowerUpgradeConfig(tower, choices).levels;
  const top = levels[levels.length - 1];
  const remaining = levels.filter((level) => level.level > tower.level);
  if (!top || remaining.length === 0) {
    return undefined;
  }
  return {
    topStats: top.stats,
    cost: remaining.reduce((sum, level) => sum + level.upgradeCostGold, 0),
  };
}

/**
 * Upgrades the opponent can afford, indexed into a ledger made from `towers`;
 * past grade 3 only along the branch `choices` holds for the tower's type.
 */
export function collectUpgradeCandidates(
  towers: readonly TowerEntity[],
  upgradeableTowerIds: readonly string[],
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
): UpgradeCandidate[] {
  const candidates: UpgradeCandidate[] = [];
  towers.forEach((tower, ledgerIndex) => {
    if (!upgradeableTowerIds.includes(tower.id)) {
      return;
    }
    const cost = getUpgradeCost(tower, tower.level, choices);
    const nextStats = getTowerStatsForTowerLevel(tower, tower.level + 1, choices);
    if (cost !== null && cost > 0 && nextStats) {
      const path =
        tower.level >= TowerTalentRule.BRANCH_UNLOCK_GRADE ? branchPath(tower, choices) : undefined;
      candidates.push({
        towerId: tower.id,
        ledgerIndex,
        cost,
        nextStats,
        ...(path ? { path } : {}),
      });
    }
  });
  return candidates;
}

/**
 * Every affordable type with its race price, level 1 stats and the race's
 * authored target scope, cheapest first.
 */
export function collectInvestmentTypes(
  towerTypes: readonly TowerTypeId[],
  raceId: RaceId,
): InvestmentTowerType[] {
  const types: InvestmentTowerType[] = [];
  for (const towerType of towerTypes) {
    const authored = getRaceTowerConfig(towerType, raceId);
    if (authored && authored.costGold > 0) {
      types.push({
        towerType,
        cost: authored.costGold,
        stats: resolveTowerPlacementStats(towerType, authored),
        allowedTargets: authored.allowedTargets,
        damageType: resolveBuildableTowerDamageType(authored),
      });
    }
  }
  return types.sort((left, right) => left.cost - right.cost);
}
