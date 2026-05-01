export type { StartWaveResult, WavePhase, WavePhaseState } from './model/types';
export {
  completeWaveIfResolved,
  createInitialWavePhaseState,
  isBuildPhase,
  isCompletedPhase,
  isGameOverPhase,
  isWavePhase,
  startWave,
  setWavePhase,
} from './model/state';
