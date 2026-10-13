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
import type { MazePlan } from './maze-planning';
import { planBuildDecision, type BuildDecisionOutput } from './planBuildDecision';

/**
 * Route-search cells one hard build decision may expand on the 20x30 board.
 * Measured at about 60,000 at worst (plan search capped at 40,000, plus
 * pruning and build ordering); at roughly 0.3 microseconds per expansion
 * that is ~20 ms on a desktop, well under the 50 ms budget.
 */
const HARD_DECISION_EXPANSION_BUDGET = 80_000;

const SEEDS: readonly (number | null)[] = [null, 1, 2, 3, 4, 5];

function createMatch(seed: number | null): DuelMatchState {
  const endpoints = seed === null ? undefined : generateEdgeEndpoints(seed);
  return createInitialDuelMatchState(RaceId.UNDEAD, RaceId.UNDEAD, endpoints);
}

function nextBuildPhase(state: DuelMatchState): DuelMatchState {
  const paid = payIncome(state).state;
  return { ...paid, round: paid.round + 1, phase: 'build' };
}

type PlayedRound = { state: DuelMatchState; decision: BuildDecisionOutput; plan: MazePlan | null };

/** Plays build phases with the plan carried over, recording each decision. */
function playRounds(seed: number | null, rounds: number, difficulty: Difficulty): PlayedRound[] {
  let state = createMatch(seed);
  let plan: MazePlan | null = null;
  const played: PlayedRound[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    if (round > 1) {
      state = nextBuildPhase(state);
    }
    const context = buildDecisionContext({ matchState: state, difficulty, leakHistory: [] });
    const before = state;
    const result = applyComputerBuildStrategy({ state, context, mazePlan: plan });
    plan = result.mazePlan;
    state = result.state;
    played.push({ state: before, decision: result.decision as BuildDecisionOutput, plan });
  }

  return played;
}

describe('entities/computer-opponent/planBuildDecision maze plan', () => {
  it('hands back a plan and builds from it', () => {
    const state = createMatch(1);
    const context = buildDecisionContext({
      matchState: state,
      difficulty: Difficulty.HARD,
      leakHistory: [],
    });
    const { battlefield } = state.opponent;
    const decision = planBuildDecision({
      context,
      grid: battlefield.grid,
      existingTowers: battlefield.towers,
      path: battlefield.path,
    });
    const builds = decision.actions.filter((action) => action.kind === 'build');

    expect(decision.mazePlan?.anchors.length).toBeGreaterThan(0);
    expect(builds.length).toBeGreaterThan(0);
    for (const build of builds) {
      expect(decision.mazePlan?.anchors).toContainEqual(build.position);
    }
  });

  it('keeps working towards the same plan across rounds', () => {
    const played = playRounds(3, 6, Difficulty.HARD);
    const firstPlan = played[0].plan?.anchors ?? [];

    // Later plans only ever extend the first one.
    for (const { plan } of played) {
      expect(plan?.anchors.slice(0, firstPlan.length)).toEqual(firstPlan);
    }
  });

  it('is deterministic with the plan carried over', () => {
    const first = playRounds(2, 5, Difficulty.HARD).map(({ decision }) => decision.actions);
    const second = playRounds(2, 5, Difficulty.HARD).map(({ decision }) => decision.actions);

    expect(second).toEqual(first);
  });

  it('only asks for builds that keep both size-class routes open', () => {
    for (const { state, decision } of playRounds(4, 8, Difficulty.HARD)) {
      let grid = state.opponent.battlefield.grid;
      for (const action of decision.actions) {
        if (action.kind === 'build') {
          expect(canPlaceFootprint(grid, action.position, TOWER_FOOTPRINT)).toBe(true);
          grid = withFootprintOccupancy(grid, action.position, TOWER_FOOTPRINT, true);
        }
      }
    }
  });

  it('keeps every hard build decision within its search budget', () => {
    for (const seed of SEEDS) {
      for (const { decision } of playRounds(seed, 12, Difficulty.HARD)) {
        expect(decision.mazeSearchExpandedNodes).toBeLessThan(HARD_DECISION_EXPANSION_BUDGET);
      }
    }
  });
});
