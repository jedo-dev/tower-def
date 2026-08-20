import { endRound, payIncome } from '../../../../../entities/duel-match';
import type { DuelMatchState, DuelRoundEndResult } from '../../../../../entities/duel-match';
import { transitionToGameOver, type WavePhaseState } from '../../../../../features/wave-phase';

export type DuelMatchRuntimeState = {
  duelMatchState: DuelMatchState;
  wavePhaseState: WavePhaseState;
  isGameOver: boolean;
  nextWaveStartsAtMs: number | null;
  restartScheduledAtMs: number | null;
};

export type DuelMatchRuntimeDeps = {
  onDuelMatchStateUpdated: (state: DuelMatchState) => void;
  onGameOverUpdated: (isGameOver: boolean) => void;
  onWavePhaseUpdated: (nextWavePhase: WavePhaseState) => void;
  onBuildStateNeedsRefresh: () => void;
  playGameOverSound: () => void;
};

export type ApplyDuelRoundEndInput = {
  state: DuelMatchRuntimeState;
  deps: DuelMatchRuntimeDeps;
  playerLeakedCreeps: number;
  opponentLeakedCreeps: number;
};

export type ApplyDuelRoundEndResult = DuelRoundEndResult & {
  playerIncomePaid: number;
  opponentIncomePaid: number;
};

export function applyDuelRoundEnd(input: ApplyDuelRoundEndInput): ApplyDuelRoundEndResult {
  const result = endRound(
    input.state.duelMatchState,
    input.playerLeakedCreeps,
    input.opponentLeakedCreeps,
  );

  let playerIncomePaid = 0;
  let opponentIncomePaid = 0;
  let nextState = result.state;
  if (!result.isMatchOver) {
    const payout = payIncome(nextState);
    nextState = payout.state;
    playerIncomePaid = payout.playerIncomePaid;
    opponentIncomePaid = payout.opponentIncomePaid;
  }

  input.state.duelMatchState = nextState;
  input.deps.onDuelMatchStateUpdated(input.state.duelMatchState);

  if (result.isMatchOver) {
    input.state.isGameOver = true;
    input.state.wavePhaseState = transitionToGameOver(input.state.wavePhaseState);
    input.state.nextWaveStartsAtMs = null;
    input.state.restartScheduledAtMs = null;
    input.deps.onWavePhaseUpdated(input.state.wavePhaseState);
    input.deps.onGameOverUpdated(input.state.isGameOver);
    input.deps.onBuildStateNeedsRefresh();
    input.deps.playGameOverSound();
  }

  return {
    ...result,
    state: nextState,
    playerIncomePaid,
    opponentIncomePaid,
  };
}
