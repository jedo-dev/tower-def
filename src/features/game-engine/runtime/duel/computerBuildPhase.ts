import {
  applyComputerBuildStrategy,
  applyComputerSendStrategy,
  buildDecisionContext,
  type ComputerDecisionDebugRecorder,
  type LeakHistoryEntry,
  type MazePlan,
} from '../../../../entities/computer-opponent';
import type { Difficulty } from '../../../../entities/difficulty';
import type { DuelMatchState } from '../../../../entities/duel-match';

// Renderer-free core of the computer's build phase, shared by the game scene
// (which mirrors the outcome into its registry) and the headless duel
// simulation (which runs it for both sides). It always plays `state.opponent`.

export type ComputerBuildPhaseInput = {
  state: DuelMatchState;
  difficulty: Difficulty;
  leakHistory: readonly LeakHistoryEntry[];
  /** The maze plan from the previous build phase; null makes a fresh one. */
  mazePlan: MazePlan | null;
  debugRecorder?: ComputerDecisionDebugRecorder;
};

export type ComputerBuildPhaseResult = {
  state: DuelMatchState;
  /** The maze plan to hand back on the next build phase. */
  mazePlan: MazePlan | null;
  sentCount: number;
  builtCount: number;
  upgradedCount: number;
  buildSpentGold: number;
};

/**
 * Runs the send strategy, then the build strategy, for the opponent side.
 *
 * Sends run before builds, and the order is load bearing. Both planners take
 * a share of whatever gold they are handed, so whichever runs second only
 * sees the leftovers. With building first the opponent spent itself down to
 * the point where it could never afford a creep again, its income froze at
 * the starting value, and a frozen income bought exactly one tower a round -
 * no maze, no pressure. Income compounds, so it gets first claim.
 */
export function runComputerBuildPhase(input: ComputerBuildPhaseInput): ComputerBuildPhaseResult {
  const leakHistory = [...input.leakHistory];
  const sendContext = buildDecisionContext({
    matchState: input.state,
    difficulty: input.difficulty,
    leakHistory,
  });
  const sendResult = applyComputerSendStrategy({
    state: input.state,
    context: sendContext,
    debugRecorder: input.debugRecorder,
  });

  const buildContext = buildDecisionContext({
    matchState: sendResult.state,
    difficulty: input.difficulty,
    leakHistory,
  });
  const buildResult = applyComputerBuildStrategy({
    state: sendResult.state,
    context: buildContext,
    debugRecorder: input.debugRecorder,
    mazePlan: input.mazePlan,
  });

  return {
    state: buildResult.state,
    mazePlan: buildResult.mazePlan,
    sentCount: sendResult.sentCount,
    builtCount: buildResult.builtCount,
    upgradedCount: buildResult.upgradedCount,
    buildSpentGold: buildResult.spentGold,
  };
}
