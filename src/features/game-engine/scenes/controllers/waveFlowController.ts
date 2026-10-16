import {
  reconcileBattlefieldsForNextRound,
  refreshOpponentRoutesForWaveStart,
  resolveQueuedSendUnits,
  startRound,
} from '../../../../entities/duel-match';
import { calculateWaveRoutes, hasWaveRoute } from '../../../../entities/wave';
import { startNextWaveCycle } from '../../../wave-phase';
import { applyComputerBuildPhaseStrategies } from '../../runtime/duel/gameSceneComputerStrategy';
import { resetSendQueuesForWaveStart } from '../../runtime/duel/gameSceneSendLimits';
import { resetSentCreepDeathTally } from '../../runtime/duel/sentCreepOutcomeTally';
import {
  isFieldWaveResolved,
  resolveWaveSpawnTiming,
  scheduleOpponentFieldWave,
} from '../../runtime/wave/fieldWaveSpawns';
import {
  applyWaveCompletionRewardIfResolved as applyWaveCompletionRewardIfResolvedRuntime,
  spawnWaveCreeps as spawnWaveCreepsRuntime,
  tryStartNextWave as tryStartNextWaveRuntime,
  updateAutoWaveCountdown as updateAutoWaveCountdownRuntime,
} from '../../runtime/wave/gameSceneWaveRuntime';
import { WAVE_RUNTIME_CONFIG } from '../gameScene.runtimeConfigs';
import {
  renderVisibleBattlefield,
  syncOpponentBattlefieldRenderStateFromDuel,
  syncOpponentDuelCreepsFromField,
} from './battlefieldViewController';
import {
  redrawTerrainTiles,
  updateBuildPreview,
  updateGridOverlayVisualState,
} from './boardRenderController';
import type { GameSceneContext } from './gameSceneContext';
import { publishHudSnapshot } from './hudSnapshotPublisher';
import { applyDuelRoundEndFromResolvedWave } from './roundSettlement';
import { playWaveAmbient, returnToBaseAmbient } from './sceneAudio';
import { canPerformBuildActions, getSelectedFactionUnits } from './sceneQueries';

/** The player's "start wave" button: skips the rest of the build countdown. */
export function startWaveOnPlayerRequest(context: GameSceneContext): void {
  const { state } = context;
  if (state.runState.isGameOver || !canPerformBuildActions(state)) {
    return;
  }
  state.soundManager?.play('ui.wave_start');

  state.runState.nextWaveStartsAtMs = null;
  startNextWaveFromBuildState(context);
}

/** The auto-start countdown ran out: the next wave starts on its own. */
export function tryStartNextWave(context: GameSceneContext, nowMs: number): void {
  const { state } = context;
  if (!tryStartNextWaveRuntime(state.runState, nowMs)) return;
  if (!state.gridModel) {
    state.runState.nextWaveStartsAtMs = null;
    return;
  }
  startNextWaveFromBuildState(context);
}

export function updateAutoWaveCountdown(context: GameSceneContext, nowMs: number): void {
  const { state } = context;
  const changed = updateAutoWaveCountdownRuntime(
    state.runState,
    nowMs,
    canPerformBuildActions(state),
  );
  if (changed) {
    publishHudSnapshot(state);
  }
}

/** Settles the round once both fields cleared, then holds the build phase. */
export function applyWaveCompletionRewardIfResolved(context: GameSceneContext): void {
  const { state } = context;
  const wasWaveCompletionRewardGranted = state.runState.isWaveCompletionRewardGranted;
  applyWaveCompletionRewardIfResolvedRuntime(
    state.runState,
    WAVE_RUNTIME_CONFIG,
    context.wiring.waveRuntimeDeps,
    isFieldWaveResolved(state.opponentWave),
  );
  if (!wasWaveCompletionRewardGranted && state.runState.isWaveCompletionRewardGranted) {
    applyDuelRoundEndFromResolvedWave(context);
  }
  if (canPerformBuildActions(state)) {
    // Send queues must NOT be cleared here: this runs every frame of the
    // build phase, which is exactly when the player queues sends. They are
    // consumed and cleared at wave start instead.
    if (state.duelMatchState.phase !== 'build') {
      state.duelMatchState = { ...state.duelMatchState, phase: 'build' };
    }
    returnToBaseAmbient(state);
  }
}

function startNextWaveFromBuildState(context: GameSceneContext): void {
  const { scene, state } = context;
  if (!state.gridModel) {
    return;
  }

  const waveRoutes = calculateWaveRoutes(state.gridModel);
  if (!hasWaveRoute(waveRoutes)) {
    state.runState.nextWaveStartsAtMs = null;
    publishHudSnapshot(state);
    return;
  }

  // From here on this is the wave being fought; the HUD counts it as such.
  state.runState.currentWaveNumber += 1;
  state.runState.waveKillBountyEarned = 0;
  resetSentCreepDeathTally(state.sentCreepDeaths);
  scene.registry.set('wave.number', state.runState.currentWaveNumber);
  state.runState.activeCreepRoutes = waveRoutes;
  // The path preview shows the single-cell route; large creeps may walk wider.
  state.pathCellKeys = new Set(waveRoutes.small.map((cell) => `${cell.x}:${cell.y}`));
  redrawTerrainTiles(context);
  state.duelMatchState = applyComputerBuildPhaseStrategies(state.duelMatchState, {
    difficulty: state.selectedDifficulty,
    leakHistory: state.opponentLeakHistory,
    mazePlanMemory: state.computerMazePlanMemory,
    debugRecorder: state.computerDecisionRecorder,
    setRegistryValue: (key, value) => scene.registry.set(key, value),
  });
  state.opponentSendsThisWave = [...state.duelMatchState.opponent.sendQueue];
  state.duelMatchState = refreshOpponentRoutesForWaveStart(state.duelMatchState);
  state.duelMatchState = reconcileBattlefieldsForNextRound(state.duelMatchState);
  syncOpponentBattlefieldRenderStateFromDuel(context);
  scheduleWaveOnBothFields(context);
  // Queues have now been routed onto battlefields and spawned as creeps.
  state.duelMatchState = resetSendQueuesForWaveStart(
    state.duelMatchState,
    state.selectedBuilderFactionId,
  );
  state.duelMatchState = startRound(state.duelMatchState).state;
  state.runState.wavePhaseState = startNextWaveCycle(state.runState.wavePhaseState);
  playWaveAmbient(state);
  state.pendingPlacementAnchor = null;
  scene.registry.set('phase.build.active', canPerformBuildActions(state));
  updateGridOverlayVisualState(state);
  updateBuildPreview(context);
  state.runState.isWaveCompletionRewardGranted = false;
  state.runState.nextWaveStartsAtMs = null;
  renderVisibleBattlefield(context);
  publishHudSnapshot(state);
}

/**
 * Both fields get the round's one shared baseline plus the other side's
 * sends, released on the same timing from this frame.
 */
function scheduleWaveOnBothFields(context: GameSceneContext): void {
  const { state } = context;
  const waveNumber = state.runState.currentWaveNumber;
  const baselineUnits = state.baselineWaves.rollNextWave(
    waveNumber,
    getSelectedFactionUnits(state),
  );
  spawnWaveCreepsRuntime(
    state.runState,
    WAVE_RUNTIME_CONFIG,
    context.wiring.waveRuntimeDeps,
    baselineUnits,
  );
  scheduleOpponentFieldWave(state.opponentWave, {
    routes: state.duelMatchState.opponent.battlefield.routes,
    waveNumber,
    baselineUnits,
    // Each send spawns at the creature grade it was sent with.
    sentUnits: resolveQueuedSendUnits(state.duelMatchState.player),
    timing: resolveWaveSpawnTiming(state.gameClock.nowMs, WAVE_RUNTIME_CONFIG),
  });
  // The duel state mirrors the field; the old wave's creeps are gone.
  syncOpponentDuelCreepsFromField(state);
}
