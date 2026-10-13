import {
  applyComputerBuildStrategy,
  buildDecisionContext,
  createMazeEvaluator,
  type MazePlan,
  type StrategyIntent,
} from '../../../entities/computer-opponent';
import type { Difficulty } from '../../../entities/difficulty';
import {
  createInitialDuelMatchState,
  DEFAULT_ENTRANCE,
  DEFAULT_EXIT,
  payIncome,
  type BattlefieldState,
  type DuelMatchState,
} from '../../../entities/duel-match';
import { generateEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import type { RaceId } from '../../../shared/types/content-ids';
import type { GridPoint } from '../../../shared/types/grid';

export type MazeSimulationConfig = {
  rounds: number;
  difficulty: Difficulty;
  raceId: RaceId;
  /** Map seed for the entrance and exit; `null` keeps the fixed default map. */
  seed: number | null;
};

export type MazeRoundReport = {
  round: number;
  intent: StrategyIntent;
  goldBeforeBuild: number;
  spentGold: number;
  builtCount: number;
  upgradedCount: number;
  goldAfterBuild: number;
  /** Opponent battlefield after this round's builds. */
  battlefield: BattlefieldState;
  /** Octile route costs on that battlefield, the planner's own yardstick. */
  routeCost: MazeRouteCost;
};

/** Octile cost of each size-class route; null when it is sealed. */
export type MazeRouteCost = {
  small: number | null;
  large: number | null;
};

export type MazeSimulationResult = {
  entrance: GridPoint;
  exit: GridPoint;
  initialBattlefield: BattlefieldState;
  initialRouteCost: MazeRouteCost;
  rounds: MazeRoundReport[];
};

function measureRouteCost(battlefield: BattlefieldState): MazeRouteCost {
  const { grid } = battlefield;
  const { routes } = createMazeEvaluator(grid, grid.entrance, grid.exit);
  return { small: routes.smallRouteCost, large: routes.largeRouteCost };
}

function resolveEndpoints(seed: number | null): { entrance: GridPoint; exit: GridPoint } {
  return seed === null
    ? { entrance: DEFAULT_ENTRANCE, exit: DEFAULT_EXIT }
    : generateEdgeEndpoints(seed);
}

/**
 * Hands the opponent its next round of income without playing a battle: the
 * simulation only exercises the build planner, so nobody sends creeps, nobody
 * leaks, and income stays at the duel starting value.
 */
function advanceToNextBuildPhase(state: DuelMatchState): DuelMatchState {
  const paid = payIncome(state).state;
  return { ...paid, round: paid.round + 1, phase: 'build' };
}

/**
 * Plays `rounds` build phases of the computer opponent on an empty board.
 * Gold follows the duel balance: the opponent opens on its starting purse and
 * earns its income between rounds. Deterministic: the planner has no
 * randomness, and the seed only picks the map endpoints.
 */
export function simulateMazeBuildRounds(config: MazeSimulationConfig): MazeSimulationResult {
  const { entrance, exit } = resolveEndpoints(config.seed);
  let state = createInitialDuelMatchState(config.raceId, config.raceId, { entrance, exit });
  const initialBattlefield = state.opponent.battlefield;
  const rounds: MazeRoundReport[] = [];
  let mazePlan: MazePlan | null = null;

  for (let round = 1; round <= config.rounds; round += 1) {
    if (round > 1) {
      state = advanceToNextBuildPhase(state);
    }

    const goldBeforeBuild = state.opponent.gold;
    const context = buildDecisionContext({
      matchState: state,
      difficulty: config.difficulty,
      leakHistory: [],
    });
    const result = applyComputerBuildStrategy({ state, context, mazePlan });
    mazePlan = result.mazePlan;
    state = result.state;

    rounds.push({
      round,
      intent: result.decision.intent,
      goldBeforeBuild,
      spentGold: result.spentGold,
      builtCount: result.builtCount,
      upgradedCount: result.upgradedCount,
      goldAfterBuild: state.opponent.gold,
      battlefield: state.opponent.battlefield,
      routeCost: measureRouteCost(state.opponent.battlefield),
    });
  }

  return {
    entrance,
    exit,
    initialBattlefield,
    initialRouteCost: measureRouteCost(initialBattlefield),
    rounds,
  };
}
