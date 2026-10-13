import {
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
import { runComputerBuildPhase } from './computerBuildPhase';

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
 * (see `runComputerBuildPhase`) and mirrors decision telemetry into the scene
 * registry.
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
    sizeClass: unit.sizeClass,
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
