import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { withFootprintOccupancy } from '../../../shared/lib/grid/footprint';
import { generateEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import { canPlaceFootprint } from '../../../shared/lib/pathfinding/validateFootprintPlacement';
import { RaceId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import { createInitialDuelMatchState, payIncome, type DuelMatchState } from '../../duel-match';
import { applyComputerBuildStrategy } from './applyComputerBuildStrategy';
import { buildDecisionContext } from './buildDecisionContext';
import { getTowerCostForType } from './buildSpendBudget';
import { createPathProbe } from './createPathProbe';
import { DEFEND_REROUTE_PROBE_LIMIT, findBestScoredBuild } from './findBestScoredBuild';
import { createMazeEvaluator } from './maze-evaluation';
import { createMazePlanPriority, type MazePlan, type MazePlanPriority } from './maze-planning';
import type { BuildDecisionOutput } from './planBuildDecision';
import { DEFENSE_PLACEMENT_WEIGHTS, scoreAllPlacements } from './scoreTowerPlacement';
import type { BuildAction, DecisionContext } from './types';
import { StrategyIntent } from './types';

/**
 * Route-search cells the single-tower scoring of one defending decision may
 * expand on the 20x30 board. Probing every route-cutting anchor for every
 * tower measured ~260,000 at worst (hard, seed 3, round 1); screening first
 * and probing the best few brings that to ~15,000.
 */
const DEFEND_SCORING_EXPANSION_BUDGET = 40_000;
/** The exhaustive reference search is deliberately slow; it compares every candidate. */
const EXHAUSTIVE_COMPARISON_TIMEOUT_MS = 30_000;

const SEEDS: readonly (number | null)[] = [null, 1, 2, 3, 4, 5];
const ROUNDS = 12;
/** Route cells a defender's maze must have grown by over `ROUNDS` defending rounds. */
const MIN_DEFENDING_ROUTE_GROWTH = 20;

type PlayedRound = {
  state: DuelMatchState;
  context: DecisionContext;
  decision: BuildDecisionOutput;
  plan: MazePlan | null;
};

function createMatch(seed: number | null): DuelMatchState {
  const endpoints = seed === null ? undefined : generateEdgeEndpoints(seed);
  return createInitialDuelMatchState(RaceId.UNDEAD, RaceId.UNDEAD, endpoints);
}

/** Plays build phases after a leak every round, so the opponent defends throughout. */
function playDefendingRounds(seed: number | null, difficulty: Difficulty): PlayedRound[] {
  let state = createMatch(seed);
  let plan: MazePlan | null = null;
  const played: PlayedRound[] = [];

  for (let round = 1; round <= ROUNDS; round += 1) {
    if (round > 1) {
      const paid = payIncome(state).state;
      state = { ...paid, round: paid.round + 1, phase: 'build' };
    }
    const leakHistory = [{ round: round - 1, leakedCount: 3 }];
    const context = buildDecisionContext({ matchState: state, difficulty, leakHistory });
    const before = state;
    const result = applyComputerBuildStrategy({ state, context, mazePlan: plan });
    played.push({ state: before, context, decision: result.decision as BuildDecisionOutput, plan });
    plan = result.mazePlan;
    state = result.state;
  }

  return played;
}

/** The scoring before screening: every candidate probed, best value per gold wins. */
function findBestBuildByFullProbe(
  context: DecisionContext,
  state: DuelMatchState,
  mazePlan: MazePlanPriority,
): BuildAction | null {
  const { grid, towers } = state.opponent.battlefield;
  const pathProbe = createPathProbe(grid);
  let best: BuildAction | null = null;
  let bestValuePerGold = 0;

  for (const towerType of context.affordableTowers) {
    const cost = getTowerCostForType(towerType, context.raceId);
    if (cost === null || cost <= 0 || cost > context.gold) {
      continue;
    }
    const top = scoreAllPlacements({
      grid,
      towerType,
      positions: context.availableBuildPositions,
      existingTowers: towers,
      path: pathProbe.basePath,
      pathProbe,
      mazePlan,
      weights: DEFENSE_PLACEMENT_WEIGHTS,
    }).find((score) => score.isValid);
    if (top && top.totalScore / cost > bestValuePerGold) {
      bestValuePerGold = top.totalScore / cost;
      best = { kind: 'build', towerType, position: top.position };
    }
  }
  return best;
}

function findBestBuild(
  context: DecisionContext,
  state: DuelMatchState,
  mazePlan: MazePlanPriority,
  rerouteProbeLimit: number,
): BuildAction | null {
  const { grid, towers } = state.opponent.battlefield;
  const build = findBestScoredBuild({
    context,
    grid,
    evaluator: createMazeEvaluator(grid, grid.entrance, grid.exit),
    mazePlan,
    weights: DEFENSE_PLACEMENT_WEIGHTS,
    existingTowers: towers,
    budget: context.gold,
    excludedPositions: [],
    rerouteProbeLimit,
  });
  return build ? { kind: 'build', towerType: build.towerType, position: build.position } : null;
}

describe('entities/computer-opponent/planBuildDecision defending', () => {
  it('keeps every defending decision within its search budget', () => {
    for (const difficulty of [Difficulty.HARD, Difficulty.NIGHTMARE]) {
      for (const seed of SEEDS) {
        for (const [index, { decision }] of playDefendingRounds(seed, difficulty).entries()) {
          const label = `${difficulty} seed ${seed} round ${index + 1}`;
          expect(decision.intent, label).toBe(StrategyIntent.DEFEND);
          expect(decision.scoredBuildExpandedNodes, label).toBeLessThanOrEqual(
            DEFEND_SCORING_EXPANSION_BUDGET,
          );
          // Once the maze plan is kept rather than made, the whole decision fits as well.
          if (index > 0) {
            expect(decision.mazeSearchExpandedNodes, label).toBeLessThanOrEqual(
              DEFEND_SCORING_EXPANSION_BUDGET,
            );
          }
        }
      }
    }
  });

  it('keeps walling its maze plan while it defends', () => {
    for (const seed of [1, 4, 5]) {
      const played = playDefendingRounds(seed, Difficulty.HARD);
      const planBuilds = played.flatMap(({ decision, plan }) =>
        decision.actions.filter(
          (action) =>
            action.kind === 'build' &&
            (decision.mazePlan?.anchors ?? plan?.anchors ?? []).some(
              (anchor) => anchor.x === action.position.x && anchor.y === action.position.y,
            ),
        ),
      );
      const first = played[0].state.opponent.battlefield.grid;
      const last = played[played.length - 1].state.opponent.battlefield.grid;
      const startCost = createPathProbe(first).baseCost;
      const endCost = createPathProbe(last).baseCost;

      // A leak no longer freezes the maze for the whole leak window.
      expect(planBuilds.length, `seed ${seed}`).toBeGreaterThan(ROUNDS);
      expect(endCost - startCost, `seed ${seed}`).toBeGreaterThan(MIN_DEFENDING_ROUTE_GROWTH);
    }
  });

  it('only asks for builds that keep both size-class routes open', () => {
    let buildCount = 0;
    for (const seed of SEEDS) {
      for (const { state, decision } of playDefendingRounds(seed, Difficulty.HARD)) {
        let grid = state.opponent.battlefield.grid;
        for (const action of decision.actions) {
          if (action.kind === 'build') {
            expect(canPlaceFootprint(grid, action.position, TOWER_FOOTPRINT)).toBe(true);
            grid = withFootprintOccupancy(grid, action.position, TOWER_FOOTPRINT, true);
            buildCount += 1;
          }
        }
      }
    }
    expect(buildCount).toBeGreaterThan(SEEDS.length * 6);
  });

  it(
    'picks what probing every candidate picks',
    () => {
      let comparedCount = 0;
      for (const seed of SEEDS) {
        // Rounds that bought nothing hand the next one the same board.
        const seenBoards = new Set<string>();
        for (const { state, context, plan } of playDefendingRounds(seed, Difficulty.HARD)) {
          const towerAnchors = state.opponent.battlefield.towers.map(({ position }) => position);
          const boardKey = JSON.stringify([towerAnchors, context.affordableTowers]);
          if (context.affordableTowers.length === 0 || seenBoards.has(boardKey)) {
            continue;
          }
          seenBoards.add(boardKey);
          const mazePlan = createMazePlanPriority(plan?.anchors ?? []);
          const reference = findBestBuildByFullProbe(context, state, mazePlan);
          const label = `seed ${seed} round ${context.round}`;

          expect(findBestBuild(context, state, mazePlan, Infinity), label).toEqual(reference);
          expect(
            findBestBuild(context, state, mazePlan, DEFEND_REROUTE_PROBE_LIMIT),
            label,
          ).toEqual(reference);
          comparedCount += 1;
        }
      }
      expect(comparedCount).toBeGreaterThan(SEEDS.length);
    },
    EXHAUSTIVE_COMPARISON_TIMEOUT_MS,
  );
});
