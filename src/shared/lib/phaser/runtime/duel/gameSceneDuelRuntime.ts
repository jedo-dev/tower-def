import { NO_SENT_CREEP_LEAKS, settleRound } from '../../../../../entities/duel-match';
import type {
  DuelMatchState,
  DuelRoundSettlement,
  SentCreepLeaks,
} from '../../../../../entities/duel-match';
import { publishGameEvent } from '../../../game-bridge/bridge';
import { transitionToGameOver, type WavePhaseState } from '../../../../../features/wave-phase';

export type DuelMatchRuntimeState = {
  duelMatchState: DuelMatchState;
  wavePhaseState: WavePhaseState;
  isGameOver: boolean;
  nextWaveStartsAtMs: number | null;
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
  /** How many of those leaks were creeps the other side sent; none when omitted. */
  sentLeaks?: SentCreepLeaks;
};

export type ApplyDuelRoundEndResult = DuelRoundSettlement;

export function applyDuelRoundEnd(input: ApplyDuelRoundEndInput): ApplyDuelRoundEndResult {
  const result = settleRound(
    input.state.duelMatchState,
    input.playerLeakedCreeps,
    input.opponentLeakedCreeps,
    input.sentLeaks ?? NO_SENT_CREEP_LEAKS,
  );
  input.state.duelMatchState = result.state;
  input.deps.onDuelMatchStateUpdated(input.state.duelMatchState);

  if (result.isMatchOver) {
    input.state.isGameOver = true;
    input.state.wavePhaseState = transitionToGameOver(input.state.wavePhaseState);
    input.state.nextWaveStartsAtMs = null;
    input.deps.onWavePhaseUpdated(input.state.wavePhaseState);
    input.deps.onGameOverUpdated(input.state.isGameOver);
    input.deps.onBuildStateNeedsRefresh();
    input.deps.playGameOverSound();
  }

  return result;
}

/**
 * Tells the UI how the round moved both life totals: the opponent's net HP
 * change and any lives either side stole with its sends.
 */
export function publishRoundLifeEvents(
  previousOpponentHp: number,
  result: ApplyDuelRoundEndResult,
): void {
  const opponentHp = result.state.opponent.hp;
  if (opponentHp !== previousOpponentHp) {
    publishGameEvent('opponent-hp-updated', {
      hp: opponentHp,
      previousHp: previousOpponentHp,
      delta: opponentHp - previousOpponentHp,
    });
  }
  if (result.playerLivesStolen > 0) {
    publishGameEvent('lives-stolen', {
      thief: 'player',
      lives: result.playerLivesStolen,
      hp: result.state.player.hp,
    });
  }
  if (result.opponentLivesStolen > 0) {
    publishGameEvent('lives-stolen', {
      thief: 'opponent',
      lives: result.opponentLivesStolen,
      hp: opponentHp,
    });
  }
}
