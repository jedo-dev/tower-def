import type { GamePhase } from '../../../shared/lib/game-bridge/types';

export type WavePhaseState = {
  phase: GamePhase;
};

export type StartWaveResult = {
  started: boolean;
  state: WavePhaseState;
};
