import { UnitMoveType } from '../../../shared/types/content-ids';
import { calculateAirRoute } from '../../../shared/lib/pathfinding/airRoute';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { TowerTalentRule } from '../../../shared/constants/towerTalents';
import {
  collectBranchCandidates,
  TALENT_VALUATION_BY_DIFFICULTY,
  TalentValuation,
} from './talent-development';
import { recordBranch, recordBuild, recordUpgrade, type BuildRoundState } from './buildRoundState';
import { getTowerCostForType } from './buildSpendBudget';
import {
  collectInvestmentTypes,
  collectUpgradeCandidates,
  createDualRouteLedger,
  createPlannedRoute,
  createRouteDamageLedger,
  createRouteGeometry,
  planRoundInvestments,
  toLedgerTowers,
  toRouteCells,
  type LedgerTower,
  type PlannedRoute,
  type RouteDamageLedger,
} from './damage-placement';
import { NEUTRAL_DAMAGE_EFFICIENCY } from './damage-profile';
import { resolveAirThreatShare } from './threat-budget/resolveAirThreatShare';
import { DEFEND_REROUTE_PROBE_LIMIT, findBestScoredBuild } from './findBestScoredBuild';
import { createMazeEvaluator } from './maze-evaluation';
import { createMazePlanPriority, selectPlanBuilds } from './maze-planning';
import {
  COVERAGE_PLACEMENT_WEIGHTS,
  DEFENSE_PLACEMENT_WEIGHTS,
  MAZE_PLACEMENT_WEIGHTS,
  type PlacementWeights,
} from './scoreTowerPlacement';
import type { DecisionContext } from './types';

export type { BuildRoundState } from './buildRoundState';
import { StrategyIntent } from './types';

/**
 * The damage ledger a round invests against: the planned ground route, and
 * when the next wave has fliers, the straight air line as a second lane
 * weighted by the share of the wave that flies. Each lane values tower damage
 * against its own expected creeps' armor, so the damage type that counters
 * the wave wins the blocks.
 */
function createInvestmentLedger(
  round: BuildRoundState,
  context: DecisionContext,
  plannedRoute: PlannedRoute,
): RouteDamageLedger {
  const towers: LedgerTower[] = toLedgerTowers(round.plannedTowers, round.towerBranchChoices);
  const ground = createRouteDamageLedger(
    plannedRoute.geometry,
    towers,
    UnitMoveType.GROUND,
    context.defence?.damageEfficiency ?? NEUTRAL_DAMAGE_EFFICIENCY,
  );
  const airShare = resolveAirThreatShare(context);
  if (airShare <= 0) {
    return ground;
  }
  const { entrance, exit } = round.grid;
  const air = createRouteDamageLedger(
    createRouteGeometry(calculateAirRoute(entrance, exit)),
    towers,
    UnitMoveType.AIR,
    context.defence?.air?.damageEfficiency ?? NEUTRAL_DAMAGE_EFFICIENCY,
  );
  return createDualRouteLedger(ground, air, airShare);
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
  const upgrades = collectUpgradeCandidates(
    round.plannedTowers,
    [...context.upgradeableTowerIds, ...round.unlockedTowerIds],
    round.towerBranchChoices,
  );
  const valuation = TALENT_VALUATION_BY_DIFFICULTY[context.difficulty];
  const mayDevelop =
    valuation !== TalentValuation.NONE &&
    round.plannedTowers.some(
      (tower) =>
        tower.level === TowerTalentRule.BRANCH_UNLOCK_GRADE &&
        tower.buildableTowerId !== undefined &&
        round.towerBranchChoices[tower.buildableTowerId] === undefined,
    );
  if (!wall && upgrades.length === 0 && !mayDevelop) {
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
  const ledger = createInvestmentLedger(round, context, plannedRoute);
  const branches = collectBranchCandidates({
    towers: round.plannedTowers,
    ledger,
    choices: round.towerBranchChoices,
    valuation,
  });
  const investment = planRoundInvestments({
    ledger,
    wall,
    damageTypes: types.slice(1),
    walls,
    upgrades,
    budget: round.remainingBudget,
    maxBuilds: count,
    maxUpgrades: options.maxUpgrades,
    branches,
  });

  for (const build of investment.builds) {
    const kind = build.towerType === wall?.towerType ? 'maze wall' : 'damage tower';
    const note = `${kind} of the plan, +${build.routeGain.toFixed(1)} route cells`;
    recordBuild(round, context.raceId, build.towerType, build.anchor, build.cost, note);
  }
  investment.branches.forEach((branch) => recordBranch(round, branch));
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
    recordBuild(round, context.raceId, build.towerType, build.position, cost, note);
    // The last tower of the round needs no route search of its own.
    if (round.buildCount < maxBuilds) {
      evaluator.place(build.position);
    }
  }
  round.expandedNodeCount += evaluator.expandedNodeCount;
}
