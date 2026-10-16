import { createInitialDuelMatchState, type DuelMatchState } from '../../../../entities/duel-match';
import { getGameSetupConfig, publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import { generateEdgeEndpoints } from '../../../../shared/lib/grid/generateEdgeEndpoints';
import type { GridModel } from '../../../../shared/types/grid';
import {
  destroyBattlefieldCreeps,
  destroyBattlefieldImpactEffects,
  destroyBattlefieldProjectiles,
  destroyBattlefieldRenderState,
  destroyBattlefieldTowers,
} from '../../runtime/battlefield/battlefieldRenderState';
import { publishPlayerSendLimits } from '../../runtime/duel/gameSceneSendLimits';
import { resetSentCreepDeathTally } from '../../runtime/duel/sentCreepOutcomeTally';
import { markRoutePreviewLayoutChanged } from '../../runtime/grid/buildRoutePreviewRuntime';
import { drawGrid as drawGridRuntime } from '../../runtime/grid/gameSceneGridRenderer';
import { clearFieldWaveSchedule } from '../../runtime/wave/fieldWaveSpawns';
import {
  initializeWaveRuntime as initializeWaveRuntimeModule,
  resetRunToInitialState as resetRunToInitialStateRuntime,
} from '../../runtime/wave/gameSceneWaveRuntime';
import {
  createSharedBaselineWaveSource,
  resolveBaselineWaveSeed,
} from '../../runtime/wave/sharedBaselineWave';
import {
  DEFAULT_MAP_SEED,
  ENTRANCE_CELL,
  EXIT_CELL,
  GRID_OVERLAY_RENDER_DEPTH,
} from '../gameScene.constants';
import { mapEnemyFactionToHudFaction, mapHudFactionToRaceId } from '../gameScene.helpers';
import { GRID_RENDERER_CONFIG, WAVE_RUNTIME_CONFIG } from '../gameScene.runtimeConfigs';
import {
  getGridRendererDeps,
  refreshBuildPhasePathTiles,
  updateGridOverlayVisualState,
} from './boardRenderController';
import type { GameSceneContext } from './gameSceneContext';
import type { GameSceneState } from './gameSceneState';
import { publishHudSnapshot } from './hudSnapshotPublisher';
import { returnToBaseAmbient } from './sceneAudio';
import { canPerformBuildActions, getBaselineRaceId, type GameSceneCore } from './sceneQueries';

/**
 * A fresh duel for the selected factions on the map the match was set up
 * with; rebuilding with default endpoints would desync the grid from a
 * generated dynamic layout.
 */
export function createMatchDuelState(state: GameSceneState): DuelMatchState {
  return createInitialDuelMatchState(
    state.selectedBuilderFactionId,
    mapHudFactionToRaceId(state.selectedFaction),
    { ...state.mapEndpoints, baselineRaceId: getBaselineRaceId(state) },
  );
}

/** Restarts the match's baseline stream; a fixed map rolls a fresh seed. */
function resetBaselineWaves(state: GameSceneState): void {
  state.baselineWaves = createSharedBaselineWaveSource(
    resolveBaselineWaveSeed(state.setupEndpoints, Math.random),
  );
}

export function loadSetupConfig({ scene, state }: GameSceneCore): void {
  const setupConfig = getGameSetupConfig();
  if (setupConfig) {
    state.selectedBuilderFactionId = setupConfig.builderFaction;
    state.selectedFaction = mapEnemyFactionToHudFaction(setupConfig.enemyFaction);
    state.selectedDifficulty = setupConfig.difficulty;
    scene.registry.set('game.setup', setupConfig);
  }

  state.setupEndpoints = setupConfig?.endpoints;
  resetBaselineWaves(state);
  if (setupConfig?.endpoints?.mode === 'dynamic') {
    state.mapSeed = setupConfig.endpoints.seed;
    state.mapEndpoints = generateEdgeEndpoints(setupConfig.endpoints.seed);
  } else {
    state.mapSeed = DEFAULT_MAP_SEED;
    state.mapEndpoints = { entrance: ENTRANCE_CELL, exit: EXIT_CELL };
  }

  state.duelMatchState = createMatchDuelState(state);
  publishPlayerSendLimits(state.duelMatchState, state.selectedBuilderFactionId);
  // The scene wallet is the source of truth: seed it from the duel balance
  // table so both sides start level. Difficulty never tilts the purse.
  state.runState.playerGold = state.duelMatchState.player.gold;
  scene.registry.set('economy.gold', state.runState.playerGold);
  scene.registry.set('economy.lives', state.duelMatchState.player.hp);
  state.opponentLeakHistory = [];
  state.computerDecisionRecorder.clear();
  state.computerMazePlanMemory.plan = null;
}

function initializeWaveRuntime(context: GameSceneContext, grid: GridModel): void {
  const { state } = context;
  initializeWaveRuntimeModule(
    state.runState,
    WAVE_RUNTIME_CONFIG,
    context.wiring.waveRuntimeDeps,
    grid,
  );
  destroyBattlefieldTowers(state.playerField);
  destroyBattlefieldRenderState(state.opponentField);
  clearFieldWaveSchedule(state.opponentWave);
}

export function drawGrid(context: GameSceneContext): void {
  const { state } = context;
  const grid = drawGridRuntime(
    state.gridRendererState,
    getGridRendererDeps(context),
    GRID_RENDERER_CONFIG,
    GRID_OVERLAY_RENDER_DEPTH,
  );
  state.gridModel = grid;
  updateGridOverlayVisualState(state);
  initializeWaveRuntime(context, grid);
  // A fresh board: show its path from match start, not only after the
  // first build or wave start.
  markRoutePreviewLayoutChanged(state.routePreview);
  state.arePathTilesStale = true;
  refreshBuildPhasePathTiles(context);
}

function clearMatchRuntime(state: GameSceneState): void {
  state.opponentLeakHistory = [];
  state.opponentSendsThisWave = [];
  resetSentCreepDeathTally(state.sentCreepDeaths);
  state.computerDecisionRecorder.clear();
  state.computerMazePlanMemory.plan = null;
  destroyBattlefieldCreeps(state.playerField);
  destroyBattlefieldRenderState(state.opponentField);
  clearFieldWaveSchedule(state.opponentWave);
  destroyBattlefieldProjectiles(state.playerField);
  destroyBattlefieldImpactEffects(state.playerField);
  destroyBattlefieldTowers(state.playerField);
  state.placedTowerCostsByCellKey.clear();
  state.hoveredCell = null;
  state.hoveredBuildAnchor = null;
  state.pendingPlacementAnchor = null;
  state.buildPreviewOverlay?.clear();
  markRoutePreviewLayoutChanged(state.routePreview);
  state.pathCellKeys.clear();
  resetRunToInitialStateRuntime(state.runState);
  resetBaselineWaves(state);
}

/** The restart-match command: a new match on the same map and factions. */
export function resetRunToInitialState(context: GameSceneContext): void {
  const { scene, state } = context;
  const { registry } = scene;
  clearMatchRuntime(state);
  state.duelMatchState = createMatchDuelState(state);
  publishPlayerSendLimits(state.duelMatchState, state.selectedBuilderFactionId);
  state.runState.playerGold = state.duelMatchState.player.gold;
  state.matchOutcomeStatus = 'active';
  state.matchWinner = null;
  state.matchOutcomeReason = null;
  registry.remove('duel.match.winner');
  registry.set('duel.match.outcome', state.matchOutcomeStatus);

  registry.set('economy.gold', state.runState.playerGold);
  registry.set('economy.lives', state.duelMatchState.player.hp);
  registry.set('phase.game.over', state.runState.isGameOver);
  registry.set('phase.build.active', canPerformBuildActions(state));
  registry.set('wave.number', state.runState.currentWaveNumber);
  registry.remove('wave.escapedCreeps');
  registry.remove('economy.lastSellRefund');
  publishHudSnapshot(state);
  returnToBaseAmbient(state);

  drawGrid(context);
  publishGameEvent('selected-tower', { tower: null });
  // Last, so nothing the reset itself emitted outlives it in per-match UI.
  publishGameEvent('match-started', { trigger: 'restart' });
}
