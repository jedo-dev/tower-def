import {
  applyComputerBuildStrategy,
  applyComputerSendStrategy,
  buildDecisionContext,
  type ComputerDecisionDebugRecorder,
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

  const buildContext = buildDecisionContext({
    matchState: state,
    difficulty: deps.difficulty,
    leakHistory: deps.leakHistory,
  });
  const buildResult = applyComputerBuildStrategy({
    state,
    context: buildContext,
    debugRecorder: deps.debugRecorder,
  });
  let nextState = buildResult.state;
  deps.setRegistryValue('duel.opponent.builtCount', buildResult.builtCount);
  deps.setRegistryValue('duel.opponent.upgradedCount', buildResult.upgradedCount);
  deps.setRegistryValue('duel.opponent.buildSpentGold', buildResult.spentGold);

  const sendContext = buildDecisionContext({
    matchState: nextState,
    difficulty: deps.difficulty,
    leakHistory: deps.leakHistory,
  });
  const sendResult = applyComputerSendStrategy({
    state: nextState,
    context: sendContext,
    debugRecorder: deps.debugRecorder,
  });
  nextState = sendResult.state;
  deps.setRegistryValue('duel.opponent.sendCount', sendResult.sentCount);
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
