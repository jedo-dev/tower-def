import {
  applyComputerBuildStrategy,
  applyComputerSendStrategy,
  buildDecisionContext,
  type ComputerDecisionDebugRecorder,
  type ComputerMazePlanMemory,
  type LeakHistoryEntry,
} from '../../../../../entities/computer-opponent';
import type { Difficulty } from '../../../../../entities/difficulty';
import {
  addCreeps,
  type AddCreepEntry,
  type DuelMatchState,
} from '../../../../../entities/duel-match';
import type { UnitConfig } from '../../../../../entities/unit';
import { generateWaveUnits } from '../../../../../entities/wave';
import { CreepTypeId } from '../../../../types/content-ids';

export type ComputerBuildPhaseDeps = {
  difficulty: Difficulty;
  leakHistory: LeakHistoryEntry[];
  /** The opponent's maze plan, carried from one build phase to the next. */
  mazePlanMemory: ComputerMazePlanMemory;
  debugRecorder: ComputerDecisionDebugRecorder;
  setRegistryValue: (key: string, value: number | readonly unknown[]) => void;
};

/**
 * Runs the computer opponent build and send strategies for the upcoming round
 * and mirrors decision telemetry into the scene registry.
 */
export function applyComputerBuildPhaseStrategies(
  state: DuelMatchState,
  deps: ComputerBuildPhaseDeps,
): DuelMatchState {
  if (state.phase !== 'build') {
    return state;
  }

  // Sends run before builds, and the order is load bearing. Both planners take
  // a share of whatever gold they are handed, so whichever runs second only
  // sees the leftovers. With building first the opponent spent itself down to
  // the point where it could never afford a creep again, its income froze at
  // the starting value, and a frozen income bought exactly one tower a round -
  // no maze, no pressure. Income compounds, so it gets first claim.
  const sendContext = buildDecisionContext({
    matchState: state,
    difficulty: deps.difficulty,
    leakHistory: deps.leakHistory,
  });
  const sendResult = applyComputerSendStrategy({
    state,
    context: sendContext,
    debugRecorder: deps.debugRecorder,
  });
  let nextState = sendResult.state;
  deps.setRegistryValue('duel.opponent.sendCount', sendResult.sentCount);

  const buildContext = buildDecisionContext({
    matchState: nextState,
    difficulty: deps.difficulty,
    leakHistory: deps.leakHistory,
  });
  const buildResult = applyComputerBuildStrategy({
    state: nextState,
    context: buildContext,
    debugRecorder: deps.debugRecorder,
    mazePlan: deps.mazePlanMemory.plan,
  });
  deps.mazePlanMemory.plan = buildResult.mazePlan;
  nextState = buildResult.state;
  deps.setRegistryValue('duel.opponent.builtCount', buildResult.builtCount);
  deps.setRegistryValue('duel.opponent.upgradedCount', buildResult.upgradedCount);
  deps.setRegistryValue('duel.opponent.buildSpentGold', buildResult.spentGold);
  deps.setRegistryValue('duel.opponent.gold', nextState.opponent.gold);
  deps.setRegistryValue('duel.opponent.income', nextState.opponent.income);
  if (import.meta.env.DEV) {
    deps.setRegistryValue('duel.opponent.decisionSnapshots', [
      ...deps.debugRecorder.getSnapshots(),
    ]);
  }

  return nextState;
}

/**
 * Adds the shared baseline wave for the upcoming round to the opponent
 * battlefield so both duelists face the same neutral pressure.
 */
export function addBaselineWaveToOpponentBattlefield(
  state: DuelMatchState,
  waveNumber: number,
  factionUnits: UnitConfig[],
): DuelMatchState {
  const baselineUnits = generateWaveUnits({
    waveNumber,
    factionUnits,
  });
  if (baselineUnits.length === 0) {
    return state;
  }

  const entrance = state.opponent.battlefield.path[0] ?? state.opponent.battlefield.grid.entrance;
  const baselineEntries: AddCreepEntry[] = baselineUnits.map((unit, index) => ({
    id: `baseline:opponent:${state.round + 1}:${index}:${unit.id}`,
    typeId: CreepTypeId.BASIC,
    hp: unit.health,
    speed: unit.speed,
    armor: unit.armor,
    armorType: unit.armorType,
    moveType: unit.moveType,
    entrance,
  }));

  return {
    ...state,
    opponent: {
      ...state.opponent,
      battlefield: addCreeps(state.opponent.battlefield, baselineEntries),
    },
  };
}
