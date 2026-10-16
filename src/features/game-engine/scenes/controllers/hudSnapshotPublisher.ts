import { publishGameHudSnapshot } from '../../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../../shared/lib/game-bridge/types';
import { resolveAutoStartSecondsLeft } from '../../runtime/wave/autoStartCountdown';
import { countFieldRemainingCreeps } from '../../runtime/wave/opponentFieldCreepsPublisher';
import {
  buildHudSendQueue,
  buildHudWaveQueueWithPending,
  resolveBuilderFaction,
  resolveHudOpponentSends,
  resolveHudWaveNumber,
} from '../gameScene.helpers';
import type { GameSceneState } from './gameSceneState';
import { canPerformBuildActions } from './sceneQueries';

function buildHudSnapshot(state: GameSceneState): GameHudSnapshot {
  const { runState, duelMatchState, gameClock } = state;
  const { isGameOver, wavePhaseState } = runState;
  const autoStartSecondsLeft =
    !isGameOver && canPerformBuildActions(state)
      ? resolveAutoStartSecondsLeft(runState.nextWaveStartsAtMs, gameClock.nowMs)
      : null;

  return {
    gold: runState.playerGold,
    income: duelMatchState.player.income,
    lives: duelMatchState.player.hp,
    opponentGold: duelMatchState.opponent.gold,
    opponentIncome: duelMatchState.opponent.income,
    opponentLives: duelMatchState.opponent.hp,
    matchOutcome: {
      status: state.matchOutcomeStatus,
      winner: state.matchWinner,
      reason: state.matchOutcomeReason,
    },
    builderFactionName: resolveBuilderFaction(state.selectedBuilderFactionId).name,
    waveNumber: resolveHudWaveNumber(runState.currentWaveNumber, wavePhaseState.phase),
    phase: wavePhaseState.phase,
    canStartWave: !isGameOver && canPerformBuildActions(state),
    selectedTowerType: state.selectedTowerType,
    selectedFaction: state.selectedFaction,
    autoStartSecondsLeft,
    waveQueue: buildHudWaveQueueWithPending(state.playerField.creeps, runState.pendingWaveSpawns),
    playerSendQueue: buildHudSendQueue(duelMatchState.player.sendQueue),
    opponentSendQueue: buildHudSendQueue(
      resolveHudOpponentSends(
        wavePhaseState.phase,
        duelMatchState.opponent.sendQueue,
        state.opponentSendsThisWave,
      ),
    ),
    pendingCreepCount:
      runState.pendingWaveSpawns.length +
      state.playerField.creeps.filter((c) => c.entity.status === 'alive').length,
    isPaused: gameClock.isPaused,
    gameSpeed: gameClock.speed,
    towerBranchChoices: { ...duelMatchState.player.towerBranchChoices },
    creatureXpByTier: { ...duelMatchState.player.creatureXpByTier },
    creatureBranchChoices: { ...duelMatchState.player.creatureBranchChoices },
    creatureGrades: { ...duelMatchState.player.creatureGrades },
  };
}

/** Publishes the HUD snapshot; every kill, leak, wave start and restart ends here. */
export function publishHudSnapshot(state: GameSceneState): void {
  publishGameHudSnapshot(buildHudSnapshot(state));
  // Publishes on change only.
  state.opponentFieldCreepsPublisher.update(
    countFieldRemainingCreeps(
      state.opponentField.creeps,
      state.opponentWave.pendingWaveSpawns.length,
    ),
  );
}
