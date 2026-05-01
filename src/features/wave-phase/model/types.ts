export type WavePhase = 'build' | 'wave' | 'completed' | 'game-over';

export type WavePhaseState = {
  phase: WavePhase;
};

export type StartWaveResult = {
  started: boolean;
  state: WavePhaseState;
};
