import type { StartWaveResult, WavePhase, WavePhaseState } from './types';
import type { CreepEntity } from '../../../entities/creep';

export type WaveAction = 'place-tower' | 'sell-tower';

export function createInitialWavePhaseState(): WavePhaseState {
  return {
    phase: 'build',
  };
}

export function resetWavePhaseState(): WavePhaseState {
  return createInitialWavePhaseState();
}

export function setWavePhase(state: WavePhaseState, phase: WavePhase): WavePhaseState {
  return {
    ...state,
    phase,
  };
}

export function isBuildPhase(state: WavePhaseState): boolean {
  return state.phase === 'build';
}

export function isWavePhase(state: WavePhaseState): boolean {
  return state.phase === 'wave';
}

export function isCompletedPhase(state: WavePhaseState): boolean {
  return state.phase === 'completed';
}

export function isGameOverPhase(state: WavePhaseState): boolean {
  return state.phase === 'game-over';
}

export function canPerformBuildActions(state: WavePhaseState): boolean {
  return isBuildPhase(state);
}

export function isWaveActionAllowed(
  state: WavePhaseState,
  action: WaveAction,
): boolean {
  if (action === 'place-tower' || action === 'sell-tower') {
    return canPerformBuildActions(state);
  }

  return false;
}

export function startWave(state: WavePhaseState): StartWaveResult {
  if (!isBuildPhase(state)) {
    return {
      started: false,
      state,
    };
  }

  return {
    started: true,
    state: setWavePhase(state, 'wave'),
  };
}

export function completeWaveIfResolved(
  state: WavePhaseState,
  creeps: CreepEntity[],
): WavePhaseState {
  if (!isWavePhase(state)) {
    return state;
  }

  const hasAliveCreeps = creeps.some((creep) => creep.status === 'alive');

  if (hasAliveCreeps) {
    return state;
  }

  return setWavePhase(state, 'completed');
}

export function transitionCompletedToBuild(state: WavePhaseState): WavePhaseState {
  if (!isCompletedPhase(state)) {
    return state;
  }

  return setWavePhase(state, 'build');
}

export function transitionToGameOver(state: WavePhaseState): WavePhaseState {
  if (isGameOverPhase(state)) {
    return state;
  }

  return setWavePhase(state, 'game-over');
}

export function startNextWaveCycle(state: WavePhaseState): WavePhaseState {
  const preparedState = transitionCompletedToBuild(state);
  const result = startWave(preparedState);
  return result.state;
}
