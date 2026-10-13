import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { withFootprintOccupancy } from '../../../shared/lib/grid/footprint';
import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { getTowerCostForType } from './buildSpendBudget';
import {
  collectInvestmentTypes,
  collectUpgradeCandidates,
  createPlannedRoute,
  createRouteDamageLedger,
  planRoundInvestments,
  toLedgerTowers,
  toRouteCells,
  type PlannedUpgrade,
} from './damage-placement';
import { DEFEND_REROUTE_PROBE_LIMIT, findBestScoredBuild } from './findBestScoredBuild';
import { createMazeEvaluator } from './maze-evaluation';
import { createMazePlanPriority, selectPlanBuilds } from './maze-planning';
import {
  COVERAGE_PLACEMENT_WEIGHTS,
  DEFENSE_PLACEMENT_WEIGHTS,
  MAZE_PLACEMENT_WEIGHTS,
  type PlacementWeights,
} from './scoreTowerPlacement';
import type { ComputerAction, DecisionContext } from './types';
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

function recordUpgrade(round: BuildRoundState, upgrade: PlannedUpgrade): void {
  round.actions.push({ kind: 'upgrade', towerId: upgrade.towerId });
  // Later passes this round see the new level: its next upgrade, not this one again.
  round.plannedTowers = round.plannedTowers.map((tower) =>
    tower.id === upgrade.towerId ? { ...tower, level: tower.level + 1 } : tower,
  );
  round.remainingBudget -= upgrade.cost;
  round.reasoning.push(
    `Upgrading tower ${upgrade.towerId} for ${upgrade.cost} gold, +${upgrade.value.toFixed(0)} route damage`,
  );
}

export type PlanInvestmentOptions = {
  /** Most new blocks this round. */
  maxBuilds: number;
  /** Most upgrades this round; unlimited when omitted. */
  maxUpgrades?: number;
};

/**
 * Spends the round on the maze plan and on upgrades by marginal value per
 * gold (see `planRoundInvestments`): the next plan blocks are walled with the
 * cheapest tower, the blocks that see the finished route most (turns, the gap
 * between two lanes) get a damage tower instead when the extra gold pays, and
 * upgrades go to the towers whose next level adds the most damage along that
 * route. True when the plan ran out of buildable blocks before the round's
 * allowance did.
 */
export function investInPlan(
  round: BuildRoundState,
  context: DecisionContext,
  unbuilt: readonly GridPosition[],
  options: PlanInvestmentOptions,
): boolean {
  const types = collectInvestmentTypes(context.affordableTowers, context.raceId).filter(
    (type) => type.cost <= round.remainingBudget,
  );
  const wall = types[0] ?? null;
  const upgrades = collectUpgradeCandidates(round.plannedTowers, context.upgradeableTowerIds);
  if (!wall && upgrades.length === 0) {
    return false;
  }

  const available = new Set(context.availableBuildPositions.map((p) => `${p.x}:${p.y}`));
  const candidates = unbuilt.filter((anchor) => available.has(`${anchor.x}:${anchor.y}`));
  const count = wall
    ? Math.min(options.maxBuilds, Math.floor(round.remainingBudget / wall.cost))
    : 0;
  const selection =
    count > 0 ? selectPlanBuilds({ grid: round.grid, candidates, maxBuilds: count }) : null;
  const plannedRoute = createPlannedRoute(round.grid, unbuilt);
  round.expandedNodeCount += (selection?.expandedNodeCount ?? 0) + plannedRoute.expandedNodeCount;

  // A block that lengthens nothing yet still carries its share of the plan.
  const walls = (selection?.anchors ?? []).map((anchor, index) => ({
    anchor,
    routeGain: Math.max(
      toRouteCells(selection?.gains[index] ?? 0),
      plannedRoute.averageGainPerBlock,
    ),
  }));
  const investment = planRoundInvestments({
    ledger: createRouteDamageLedger(plannedRoute.geometry, toLedgerTowers(round.plannedTowers)),
    wall,
    damageTypes: types.slice(1),
    walls,
    upgrades,
    budget: round.remainingBudget,
    maxBuilds: count,
    maxUpgrades: options.maxUpgrades,
  });

  for (const build of investment.builds) {
    const kind = build.towerType === wall?.towerType ? 'maze wall' : 'damage tower';
    const note = `${kind} of the plan, +${build.routeGain.toFixed(1)} route cells`;
    recordBuild(round, build.towerType, build.anchor, build.cost, note);
  }
  investment.upgrades.forEach((upgrade) => recordUpgrade(round, upgrade));
  return (selection?.anchors.length ?? 0) < count;
}

/** How single towers are scored: placement weights and route-cutting anchors probed per tower. */
type ScoringStance = { weights: PlacementWeights; rerouteProbeLimit: number };

/** Only anchors off the current route are scored: the towers never move it. */
const SURPLUS_STANCE: ScoringStance = { weights: COVERAGE_PLACEMENT_WEIGHTS, rerouteProbeLimit: 0 };

/**
 * Single-tower builds by placement score, each placed against the previous
 * ones on one evaluator that grows with them. Defending probes only the most
 * promising route-cutting anchors per tower; the maze fallback probes all.
 */
export function buildByScore(
  round: BuildRoundState,
  context: DecisionContext,
  intent: StrategyIntent,
  unbuilt: readonly GridPosition[],
  maxBuilds: number,
): void {
  const isDefending = intent === StrategyIntent.DEFEND;
  buildScoredTowers(round, context, unbuilt, maxBuilds, {
    weights: isDefending ? DEFENSE_PLACEMENT_WEIGHTS : MAZE_PLACEMENT_WEIGHTS,
    rerouteProbeLimit: isDefending ? DEFEND_REROUTE_PROBE_LIMIT : Infinity,
  });
}

/**
 * Surplus damage towers once the maze is finished: off the route, where they
 * cover the most of it, cheapest type first (upgrades make them stronger).
 */
export function buildCoverageTowers(
  round: BuildRoundState,
  context: DecisionContext,
  maxBuilds: number,
): void {
  buildScoredTowers(round, context, [], maxBuilds, SURPLUS_STANCE);
}

function buildScoredTowers(
  round: BuildRoundState,
  context: DecisionContext,
  unbuilt: readonly GridPosition[],
  maxBuilds: number,
  stance: ScoringStance,
): void {
  const mazePlan = createMazePlanPriority(unbuilt);
  const evaluator = createMazeEvaluator(round.grid, round.grid.entrance, round.grid.exit);

  while (round.buildCount < maxBuilds) {
    const build = findBestScoredBuild({
      context,
      grid: round.grid,
      evaluator,
      mazePlan,
      weights: stance.weights,
      existingTowers: round.plannedTowers,
      budget: round.remainingBudget,
      excludedPositions: round.plannedPositions,
      rerouteProbeLimit: stance.rerouteProbeLimit,
    });
    const cost = build ? getTowerCostForType(build.towerType, context.raceId) : null;
    if (!build || cost === null || cost > round.remainingBudget) {
      break;
    }

    const note = `+${build.routeGain.toFixed(1)} route cost`;
    recordBuild(round, build.towerType, build.position, cost, note);
    // The last tower of the round needs no route search of its own.
    if (round.buildCount < maxBuilds) {
      evaluator.place(build.position);
    }
  }
  round.expandedNodeCount += evaluator.expandedNodeCount;
}
