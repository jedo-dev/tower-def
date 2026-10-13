import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerEntity } from '../../tower/model/types';
import {
  computeSpendBudget,
  getCheapestTowerCost,
  SPEND_BUDGET_BY_DIFFICULTY,
} from './buildSpendBudget';
import { computeContextThreatSplit } from './contextThreatSplit';
import { buildByScore, investInPlan, type BuildRoundState } from './buildRoundActions';
import {
  MAZE_PLAN_HORIZON_ROUNDS,
  MAZE_PLAN_SEARCH_EFFORT_BY_DIFFICULTY,
  updateMazePlan,
  type MazePlan,
  type MazePlanUpdate,
} from './maze-planning';
import type { DecisionContext, DecisionOutput } from './types';
import { StrategyIntent } from './types';
import type { ComputerDecisionDebugRecorder } from './decisionDebugSnapshots';

/** Upgrades a defending opponent buys before spending the rest on new firepower. */
const DEFEND_UPGRADES_PER_ROUND = 1;

export type BuildPlannerInput = {
  context: DecisionContext;
  grid: GridModel;
  existingTowers: readonly TowerEntity[];
  path: readonly GridPosition[];
  debugRecorder?: ComputerDecisionDebugRecorder;
  /**
   * The maze plan the opponent kept from its previous build phase. Omitted or
   * null, a fresh plan is made for this board.
   */
  mazePlan?: MazePlan | null;
};

/** A build decision plus the maze plan to keep for the next build phase. */
export type BuildDecisionOutput = DecisionOutput & {
  mazePlan: MazePlan | null;
  /** Route-search cells this decision expanded, planning included. Counts work, not time. */
  mazeSearchExpandedNodes: number;
  /**
   * The part of `mazeSearchExpandedNodes` spent scoring single towers: every
   * build of a defending opponent, and the fallback when the plan is short.
   */
  scoredBuildExpandedNodes: number;
};

function selectIntent(context: DecisionContext, unbuiltPlanBlocks: number): StrategyIntent {
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
  if (isUnderCoverageCap && unbuiltPlanBlocks > 0) {
    return StrategyIntent.EXTEND_MAZE;
  }

  if (context.upgradeableTowerIds.length > 0 && context.mazeCoverage.towerCount >= 3) {
    return StrategyIntent.UPGRADE;
  }

  return StrategyIntent.SAVE_GOLD;
}

/** Blocks the opponent expects to afford over the planning horizon. */
function estimatePlanTowerBudget(context: DecisionContext): number {
  const cheapest = getCheapestTowerCost(context.raceId);
  if (cheapest === null) {
    return 0;
  }
  const expectedGold = context.gold + context.income * MAZE_PLAN_HORIZON_ROUNDS;
  return Math.max(0, Math.floor(expectedGold / cheapest));
}

function refreshMazePlan(input: BuildPlannerInput): MazePlanUpdate {
  return updateMazePlan({
    grid: input.grid,
    plan: input.mazePlan,
    towerBudget: estimatePlanTowerBudget(input.context),
    effort: MAZE_PLAN_SEARCH_EFFORT_BY_DIFFICULTY[input.context.difficulty],
  });
}

/**
 * What this build phase may spend: by threat when the context carries a
 * defence assessment (all it needs when threatened, easing off once the
 * margin is comfortable), the difficulty's fixed spend ratio otherwise.
 */
function computeBuildBudget(context: DecisionContext): number {
  const split = computeContextThreatSplit(context);
  return split ? split.buildBudget : computeSpendBudget(context.gold, context.difficulty);
}

function createSaveDecision(reasoning: string): DecisionOutput {
  return {
    intent: StrategyIntent.SAVE_GOLD,
    actions: [{ kind: 'save' }],
    reasoning,
    confidenceScore: 1,
  };
}

/**
 * One build phase of the computer opponent. Maze growth follows a persistent
 * search-based maze plan (kept, extended or remade every phase); defending
 * scores single towers by route coverage instead.
 */
export function planBuildDecision(input: BuildPlannerInput): BuildDecisionOutput {
  const { context, existingTowers, debugRecorder } = input;

  function finish(
    output: DecisionOutput,
    mazePlan: MazePlan | null,
    expandedNodeCount: number,
    scoredBuildExpandedNodes = 0,
  ): BuildDecisionOutput {
    debugRecorder?.recordBuildDecision(context, output);
    return {
      ...output,
      mazePlan,
      mazeSearchExpandedNodes: expandedNodeCount,
      scoredBuildExpandedNodes,
    };
  }

  if (context.phase !== 'build') {
    const output = createSaveDecision('Not in build phase, cannot take build actions');
    return finish(output, input.mazePlan ?? null, 0);
  }

  // The plan is kept across rounds, so the opponent keeps filling in the same
  // maze instead of starting a new one every time it earns gold.
  const planUpdate = refreshMazePlan(input);
  const { plan, unbuilt } = planUpdate;
  const intent = selectIntent(context, unbuilt.length);
  const budget = computeBuildBudget(context);

  if (budget <= 0) {
    const output = createSaveDecision('No budget available for spending');
    return finish(output, plan, planUpdate.expandedNodeCount);
  }

  const round: BuildRoundState = {
    actions: [],
    reasoning: [`Maze plan ${planUpdate.reason}: ${unbuilt.length} blocks to build`],
    remainingBudget: budget,
    buildCount: 0,
    plannedTowers: [...existingTowers],
    plannedPositions: [],
    grid: input.grid,
    expandedNodeCount: planUpdate.expandedNodeCount,
  };

  const maxBuilds = SPEND_BUDGET_BY_DIFFICULTY[context.difficulty].maxBuildActionsPerRound;
  if (intent === StrategyIntent.DEFEND) {
    // One upgrade for the tower that adds most damage, the rest goes to firepower now.
    investInPlan(round, context, unbuilt, { maxBuilds: 0, maxUpgrades: DEFEND_UPGRADES_PER_ROUND });
  }

  const followsPlan = intent === StrategyIntent.EXTEND_MAZE || intent === StrategyIntent.UPGRADE;
  const isPlanShort = followsPlan && investInPlan(round, context, unbuilt, { maxBuilds });
  // Defending wants firepower on the current route; an unfinished plan with
  // too little buildable right now should not stall the opponent either. A
  // finished plan does not fall back: the maze is done, gold goes to upgrades.
  const expandedBeforeScoring = round.expandedNodeCount;
  if (intent === StrategyIntent.DEFEND || (isPlanShort && !plan.isComplete)) {
    buildByScore(round, context, intent, unbuilt, maxBuilds);
  }

  if (round.actions.length === 0) {
    round.actions.push({ kind: 'save' });
    round.reasoning.push('No beneficial actions within budget, saving gold');
  }

  const output: DecisionOutput = {
    intent,
    actions: round.actions,
    reasoning: round.reasoning.join('; '),
    confidenceScore: 0.8,
  };
  const scoredBuildExpandedNodes = round.expandedNodeCount - expandedBeforeScoring;
  return finish(output, plan, round.expandedNodeCount, scoredBuildExpandedNodes);
}
