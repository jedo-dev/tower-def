import {
  type ComputerDecisionDebugRecorder,
  type ComputerMazePlanMemory,
  type LeakHistoryEntry,
} from '../../../../../entities/computer-opponent';
import type { Difficulty } from '../../../../../entities/difficulty';
import type { DuelMatchState } from '../../../../../entities/duel-match';
import { runComputerBuildPhase } from './computerBuildPhase';
import { publishOpponentSendChanges } from './duelSideEvents';

export type ComputerBuildPhaseDeps = {
  difficulty: Difficulty;
  leakHistory: LeakHistoryEntry[];
  /** The opponent's maze plan, carried from one build phase to the next. */
  mazePlanMemory: ComputerMazePlanMemory;
  debugRecorder: ComputerDecisionDebugRecorder;
  setRegistryValue: (key: string, value: number | readonly unknown[]) => void;
};

/**
 * Runs the computer opponent send and build strategies for the upcoming round
 * (see `runComputerBuildPhase`), mirrors decision telemetry into the scene
 * registry and publishes the computer's queue and income changes to the UI.
 */
export function applyComputerBuildPhaseStrategies(
  state: DuelMatchState,
  deps: ComputerBuildPhaseDeps,
): DuelMatchState {
  if (state.phase !== 'build') {
    return state;
  }

  const result = runComputerBuildPhase({
    state,
    difficulty: deps.difficulty,
    leakHistory: deps.leakHistory,
    mazePlan: deps.mazePlanMemory.plan,
    debugRecorder: deps.debugRecorder,
  });
  deps.mazePlanMemory.plan = result.mazePlan;
  const nextState = result.state;
  deps.setRegistryValue('duel.opponent.sendCount', result.sentCount);
  deps.setRegistryValue('duel.opponent.builtCount', result.builtCount);
  deps.setRegistryValue('duel.opponent.upgradedCount', result.upgradedCount);
  deps.setRegistryValue('duel.opponent.buildSpentGold', result.buildSpentGold);
  deps.setRegistryValue('duel.opponent.gold', nextState.opponent.gold);
  deps.setRegistryValue('duel.opponent.income', nextState.opponent.income);
  publishOpponentSendChanges(state, nextState);
  if (import.meta.env.DEV) {
    deps.setRegistryValue('duel.opponent.decisionSnapshots', [
      ...deps.debugRecorder.getSnapshots(),
    ]);
  }

  return nextState;
}
