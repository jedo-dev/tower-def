import type { StartWaveResult, WavePhase, WavePhaseState } from './types';
import type { CreepEntity } from '../../../entities/creep';

export function createInitialWavePhaseState(): WavePhaseState {
  return {
    phase: 'build',
  };
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
