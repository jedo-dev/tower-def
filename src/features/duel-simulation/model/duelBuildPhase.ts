import type { LeakHistoryEntry, MazePlan } from '../../../entities/computer-opponent';
import type { DuelMatchState } from '../../../entities/duel-match';
import {
  runComputerBuildPhase,
  type ComputerBuildPhaseResult,
} from '../../../shared/lib/phaser/runtime/duel/computerBuildPhase';
import type { DuelSimulationSide } from './duelSimulationConfig';

// Both duelists are computers. The computer strategies always play
// `state.opponent`, so side A (stored as `player`) plays on a mirrored state.
// Both sides plan from the same pre-build state and only their own half of
// each result is kept, so neither sees the other's choices for this round.

/** What one computer duelist remembers between build phases. */
export type ComputerSideMemory = {
  mazePlan: MazePlan | null;
  /** Leaks on this side's own field, newest last. */
  leakHistory: LeakHistoryEntry[];
};

export type DuelBuildPhaseOutcome = {
  state: DuelMatchState;
  sideA: ComputerBuildPhaseResult;
  sideB: ComputerBuildPhaseResult;
};

export function createComputerSideMemory(): ComputerSideMemory {
  return { mazePlan: null, leakHistory: [] };
}

/** Swaps the two duelists, so the computer strategies play side A. */
export function mirrorDuelSides(state: DuelMatchState): DuelMatchState {
  return { ...state, player: state.opponent, opponent: state.player };
}

function runSide(
  state: DuelMatchState,
  side: DuelSimulationSide,
  memory: ComputerSideMemory,
): ComputerBuildPhaseResult {
  const result = runComputerBuildPhase({
    state,
    difficulty: side.difficulty,
    leakHistory: memory.leakHistory,
    mazePlan: memory.mazePlan,
  });
  memory.mazePlan = result.mazePlan;
  return result;
}

/** Sends and builds for both computers; updates each side's maze plan memory. */
export function runDuelBuildPhase(
  state: DuelMatchState,
  sides: { a: DuelSimulationSide; b: DuelSimulationSide },
  memory: { a: ComputerSideMemory; b: ComputerSideMemory },
): DuelBuildPhaseOutcome {
  const sideA = runSide(mirrorDuelSides(state), sides.a, memory.a);
  const sideB = runSide(state, sides.b, memory.b);

  return {
    state: { ...state, player: sideA.state.opponent, opponent: sideB.state.opponent },
    sideA,
    sideB,
  };
}

/** Appends one round of leaks, keeping the newest `limit` entries. */
export function recordLeaks(
  memory: ComputerSideMemory,
  round: number,
  leakedCount: number,
  limit: number,
): void {
  memory.leakHistory.push({ round, leakedCount });
  if (memory.leakHistory.length > limit) {
    memory.leakHistory.shift();
  }
}
