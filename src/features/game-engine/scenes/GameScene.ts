import Phaser from 'phaser';
import {
  awardBonusGold,
  createInitialDuelMatchState,
  reconcileBattlefieldsForNextRound,
  refreshOpponentRoutesForWaveStart,
  resolveQueuedSendUnits,
  startRound,
  type DuelMatchState,
} from '../../../entities/duel-match';
import { getTowersIncomePerRound } from '../../../entities/tower';
import { calculateWaveRoutes, EMPTY_WAVE_ROUTES, hasWaveRoute } from '../../../entities/wave';
import { startNextWaveCycle, type WavePhaseState } from '../../wave-phase';
import type { GridModel } from '../../../shared/types/grid';
import {
  getGameSetupConfig,
  onGameCommand,
  onGameEvent,
  publishGameEvent,
} from '../../../shared/lib/game-bridge/bridge';
import type { GameCommandMap, GameSpeed } from '../../../shared/lib/game-bridge/types';
import { generateEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import {
  createUnitWalkAnimations,
  createTowerAnimations,
} from '../runtime/animation/gameSceneAnimationRuntime';
import {
  applyNearestNeighborFiltering,
  preloadGameSceneAssets,
} from '../runtime/assets/gameSceneAssetLoader';
import { ensurePlaceholderTextures } from '../runtime/assets/placeholderTexture';
import { startMissingArtReport, stopMissingArtReport } from '../runtime/assets/missingArtReport';
import {
  destroyBattlefieldCreeps,
  destroyBattlefieldImpactEffects,
  destroyBattlefieldProjectiles,
  destroyBattlefieldRenderState,
  destroyBattlefieldTowers,
} from '../runtime/battlefield/battlefieldRenderState';
import {
  moveBattlefieldCreeps,
  removeDeadBattlefieldCreeps,
  updateBattlefieldCreepEffects,
  updateBattlefieldCreepHitFeedback,
  updateBattlefieldDamageNumbers,
  updateBattlefieldImpactEffects,
  updateBattlefieldProjectiles,
  updateBattlefieldTowerCombat,
} from '../runtime/battlefield/battlefieldUpdateRuntime';
import {
  getBoardZoomFactor,
  registerResponsiveCamera,
} from '../runtime/camera/gameSceneCameraRuntime';
import {
  handleSellTowerCommand,
  handleUpgradeTowerCommand,
} from '../runtime/build/gameSceneTowerCommands';
import { handleChooseTowerBranchCommand } from '../runtime/build/towerBranchCommands';
import {
  handleChooseCreatureBranchCommand,
  handleUpgradeCreatureCommand,
} from '../runtime/duel/creatureTalentCommands';
import {
  buildSentCreepOutcomes,
  resetSentCreepDeathTally,
} from '../runtime/duel/sentCreepOutcomeTally';
import { summarizeFieldLeaks } from '../runtime/duel/fieldLeakSettlement';
import { applyComputerBuildPhaseStrategies } from '../runtime/duel/gameSceneComputerStrategy';
import { handleSendCreepCommand } from '../runtime/duel/gameSceneSendCommand';
import {
  publishPlayerSendLimits,
  resetSendQueuesForWaveStart,
} from '../runtime/duel/gameSceneSendLimits';
import {
  applyDuelRoundEnd as applyDuelRoundEndRuntime,
  publishRoundLifeEvents,
  publishRoundSettled,
  type DuelMatchRuntimeState,
} from '../runtime/duel/gameSceneDuelRuntime';
import {
  attachRoutePreviewGraphics,
  destroyRoutePreviewGraphics,
  markRoutePreviewLayoutChanged,
} from '../runtime/grid/buildRoutePreviewRuntime';
import {
  clearGridLabels as clearGridLabelsRuntime,
  clearTerrainSprites as clearTerrainSpritesRuntime,
  drawGrid as drawGridRuntime,
} from '../runtime/grid/gameSceneGridRenderer';
import { destroyGridOccupancyOverlay } from '../runtime/grid/gridOccupancyOverlay';
import {
  registerSceneAudioUnlock,
  registerScenePointerHandlers,
} from '../runtime/input/gameSceneInputBindings';
import { createInputControllerState } from '../runtime/input/gameSceneInputController';
import {
  applyWaveCompletionRewardIfResolved as applyWaveCompletionRewardIfResolvedRuntime,
  type WaveRuntimeState,
  initializeWaveRuntime as initializeWaveRuntimeModule,
  resetRunToInitialState as resetRunToInitialStateRuntime,
  spawnWaveCreeps as spawnWaveCreepsRuntime,
  tryStartNextWave as tryStartNextWaveRuntime,
  updateAutoWaveCountdown as updateAutoWaveCountdownRuntime,
} from '../runtime/wave/gameSceneWaveRuntime';
import { advanceGameClock, isGameSpeed } from '../runtime/time/gameClock';
import {
  runGuardedEngineStep,
  type EngineErrorReport,
} from '../runtime/lifecycle/engineErrorGuard';
import {
  clearFieldWaveSchedule,
  isFieldWaveResolved,
  processPendingWaveSpawns,
  resolveWaveSpawnTiming,
  scheduleOpponentFieldWave,
} from '../runtime/wave/fieldWaveSpawns';
import {
  createSharedBaselineWaveSource,
  resolveBaselineWaveSeed,
} from '../runtime/wave/sharedBaselineWave';
import { GameAudioManager } from '../sound/GameAudioManager';
import {
  BUILD_PREVIEW_RENDER_DEPTH,
  ROUTE_PREVIEW_RENDER_DEPTH,
  DEV_FPS_REPORT_INTERVAL_MS,
  DEFAULT_MAP_SEED,
  ENTRANCE_CELL,
  EXIT_CELL,
  GRID_OVERLAY_RENDER_DEPTH,
} from './gameScene.constants';
import {
  mapEnemyFactionToHudFaction,
  mapHudFactionToRaceId,
  mapRaceIdToHudFaction,
  mapDuelEndReasonToOutcomeReason,
  resolveMatchOutcomeStatus,
} from './gameScene.helpers';
import {
  COMBAT_RUNTIME_CONFIG,
  GRID_RENDERER_CONFIG,
  MOVEMENT_RUNTIME_CONFIG,
  WAVE_RUNTIME_CONFIG,
} from './gameScene.runtimeConfigs';
import type { GameSceneInspection } from './gameScene.types';
import { GameSceneContext } from './controllers/gameSceneContext';
import {
  handleGameOut,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleWheel,
  handleZoomBoardCommand,
} from './controllers/inputWiring';
import {
  applyBattlefieldViewVisibility,
  handleBattlefieldViewChanged,
  renderVisibleBattlefield,
  syncOpponentBattlefieldRenderStateFromDuel,
  syncOpponentDuelCreepsFromField,
} from './controllers/battlefieldViewController';
import {
  getGridRendererDeps,
  redrawTerrainTiles,
  refreshBuildPhasePathTiles,
  updateBuildPreview,
  updateGridOverlayVisualState,
} from './controllers/boardRenderController';
import { publishHudSnapshot } from './controllers/hudSnapshotPublisher';
import { ensureBaseAmbientPlaying } from './controllers/sceneAudio';
import {
  canPerformBuildActions,
  getBaselineRaceId,
  getBoardCamera,
  getSelectedFactionUnits,
  syncDuelPlayerGoldFromWallet,
  type GameSceneCore,
} from './controllers/sceneQueries';
import { type GameSceneState } from './controllers/gameSceneState';

export class GameScene extends Phaser.Scene {
  public static readonly KEY = 'GameScene';
  private static readonly OPPONENT_LEAK_HISTORY_LIMIT = 10;
  private readonly ctx = new GameSceneContext(this, {
    handleStartWaveCommand: () => this.handleStartWaveCommand(),
  });
  private readonly state: GameSceneState = this.ctx.state;
  private readonly core: GameSceneCore = this.ctx;

  /** Test seam (sceneHarness): the wave runtime state the wallet lives in. */
  private get runState(): WaveRuntimeState {
    return this.state.runState;
  }

  /** Test seam (sceneHarness): the live duel match state. */
  private get duelMatchState(): DuelMatchState {
    return this.state.duelMatchState;
  }

  private set duelMatchState(state: DuelMatchState) {
    this.state.duelMatchState = state;
  }

  private get playerGold(): number {
    return this.state.runState.playerGold;
  }

  private set playerGold(nextGold: number) {
    this.state.runState.playerGold = nextGold;
  }

  private get wavePhaseState(): WavePhaseState {
    return this.state.runState.wavePhaseState;
  }

  private set wavePhaseState(nextPhase: WavePhaseState) {
    this.state.runState.wavePhaseState = nextPhase;
  }

  private get isGameOver(): boolean {
    return this.state.runState.isGameOver;
  }

  private set isGameOver(nextIsGameOver: boolean) {
    this.state.runState.isGameOver = nextIsGameOver;
  }

  constructor() {
    super(GameScene.KEY);
  }

  /** Test seam: a read-only snapshot of live runtime state (see GameSceneInspection). */
  public inspectRuntimeState(): GameSceneInspection {
    return {
      duelMatchState: this.duelMatchState,
      playerField: this.state.playerField,
      opponentField: this.state.opponentField,
      pendingPlayerSpawns: this.runState.pendingWaveSpawns,
      pendingOpponentSpawns: this.state.opponentWave.pendingWaveSpawns,
      wavePhaseState: this.wavePhaseState,
      waveNumber: this.runState.currentWaveNumber,
      playerGold: this.playerGold,
      isGameOver: this.isGameOver,
      activeBattlefieldView: this.state.activeBattlefieldView,
      gridModel: this.state.gridModel,
      gridRenderer: this.state.gridRendererState,
      cameraView: getBoardCamera(this.core).view,
      cameraZoomFactor: getBoardZoomFactor(getBoardCamera(this.core)),
      pendingPlacementAnchor: this.state.pendingPlacementAnchor,
    };
  }

  public preload(): void {
    this.runGuarded('preload', () => {
      this.state.soundManager = new GameAudioManager(this);
      this.state.soundManager.preload();
      preloadGameSceneAssets(this);
    });
  }

  public create(): void {
    this.runGuarded('create', () => this.createScene());
  }

  /**
   * Phaser hands `update` real frame time; the simulation runs on the game
   * clock instead, so a pause freezes it and 2x doubles every step: movement,
   * combat, spawn timers and the auto-start countdown alike.
   */
  public update(_realTimeMs: number, realDeltaMs: number): void {
    if (this.state.hasEngineError) {
      return;
    }
    const simulationDeltaMs = advanceGameClock(this.state.gameClock, realDeltaMs);
    if (simulationDeltaMs === 0) {
      return;
    }
    this.runGuarded('update', () =>
      this.stepSimulation(this.state.gameClock.nowMs, simulationDeltaMs),
    );
  }

  /** The step a lifecycle guard wraps; a throw here pauses the engine. */
  private runGuarded(phase: EngineErrorReport['phase'], run: () => void): void {
    runGuardedEngineStep(phase, run, (report) => this.handleEngineError(report));
  }

  private handleEngineError(report: EngineErrorReport): void {
    this.state.hasEngineError = true;
    this.state.gameClock.isPaused = true;
    this.applyClockToPhaserSystems();
    publishGameEvent('engine-error', { phase: report.phase, message: report.message });
    // The HUD should show the pause even if the snapshot itself is what broke.
    try {
      publishHudSnapshot(this.state);
    } catch {
      // Already reported; a second failure has nothing new to say.
    }
  }

  private setPaused(isPaused: boolean): void {
    if (this.state.gameClock.isPaused === isPaused) {
      return;
    }
    this.state.gameClock.isPaused = isPaused;
    this.applyClockToPhaserSystems();
    publishHudSnapshot(this.state);
  }

  private setGameSpeed(speed: GameSpeed): void {
    if (this.state.gameClock.speed === speed) {
      return;
    }
    this.state.gameClock.speed = speed;
    this.applyClockToPhaserSystems();
    publishHudSnapshot(this.state);
  }

  /**
   * Sprite animations and the few `delayedCall`s (build flash, sound caps)
   * live on Phaser's own clocks; keep them in step with the game clock.
   */
  private applyClockToPhaserSystems(): void {
    this.time.paused = this.state.gameClock.isPaused;
    this.time.timeScale = this.state.gameClock.speed;
    this.anims.globalTimeScale = this.state.gameClock.speed;
    if (this.state.gameClock.isPaused) {
      this.anims.pauseAll();
    } else {
      this.anims.resumeAll();
    }
  }

  private createScene(): void {
    this.state.isSceneCleanedUp = false;
    startMissingArtReport();
    ensurePlaceholderTextures(this);
    this.loadSetupConfig();
    this.cameras.main.setBackgroundColor('#1a1f2c');
    this.cameras.main.roundPixels = true;
    applyNearestNeighborFiltering(this);
    this.state.boardCamera = null;
    this.state.teardownCallbacks.push(registerResponsiveCamera(this, getBoardCamera(this.core)));
    this.drawGrid();
    // Phaser tracks one touch pointer by default; pinch needs a second one.
    this.input.addPointer(1);
    this.state.teardownCallbacks.push(
      registerScenePointerHandlers(this, {
        onPointerMove: (pointer) => handlePointerMove(this.ctx, pointer),
        onPointerDown: (pointer) => handlePointerDown(this.ctx, pointer),
        onPointerUp: (pointer) => handlePointerUp(this.ctx, pointer),
        onWheel: (pointer, deltaY) => handleWheel(this.ctx, pointer, deltaY),
        onGameOut: () => handleGameOut(this.ctx),
      }),
    );
    this.state.buildPreviewOverlay = this.add.graphics();
    this.state.buildPreviewOverlay.setDepth(BUILD_PREVIEW_RENDER_DEPTH);
    attachRoutePreviewGraphics(
      this.state.routePreview,
      this.add.graphics(),
      ROUTE_PREVIEW_RENDER_DEPTH,
    );
    this.input.mouse?.disableContextMenu();
    this.state.teardownCallbacks.push(
      registerSceneAudioUnlock(
        this,
        () => this.state.soundManager,
        () => ensureBaseAmbientPlaying(this.state),
      ),
    );
    createUnitWalkAnimations(this);
    createTowerAnimations(this);
    this.registerBridgeCommandHandlers();
    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lives', this.state.duelMatchState.player.hp);
    this.registry.set('phase.build.active', canPerformBuildActions(this.state));
    this.registry.set('phase.game.over', this.isGameOver);
    this.registry.set('economy.earlyWaveStartBonus.granted', false);
    updateGridOverlayVisualState(this.state);
    // Draws the build-phase routes before the first pointer move.
    updateBuildPreview(this.core);
    publishHudSnapshot(this.state);
    publishGameEvent('match-started', { trigger: 'setup' });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown, this);
  }

  private stepSimulation(nowMs: number, delta: number): void {
    this.updateAutoWaveCountdown(nowMs);

    if (this.isGameOver) {
      return;
    }

    processPendingWaveSpawns(this.state.runState, this.ctx.wiring.waveRuntimeDeps, nowMs);
    processPendingWaveSpawns(this.state.opponentWave, this.ctx.wiring.waveRuntimeDeps, nowMs);
    moveBattlefieldCreeps(this.ctx.wiring.playerBattlefieldContext, MOVEMENT_RUNTIME_CONFIG, delta);
    moveBattlefieldCreeps(
      this.ctx.wiring.opponentBattlefieldContext,
      MOVEMENT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldTowerCombat(
      this.ctx.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldTowerCombat(
      this.ctx.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldCreepEffects(
      this.ctx.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldCreepEffects(
      this.ctx.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldCreepHitFeedback(
      this.ctx.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldCreepHitFeedback(
      this.ctx.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    removeDeadBattlefieldCreeps(
      this.ctx.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    removeDeadBattlefieldCreeps(
      this.ctx.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    this.applyWaveCompletionRewardIfResolved();
    this.tryStartNextWave(nowMs);
    updateBattlefieldProjectiles(
      this.ctx.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldProjectiles(
      this.ctx.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldImpactEffects(
      this.ctx.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldImpactEffects(
      this.ctx.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldDamageNumbers(
      this.ctx.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldDamageNumbers(
      this.ctx.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    applyBattlefieldViewVisibility(this.state);
    this.updatePerformanceTelemetry(delta);
  }

  /** `onGameCommand` with every handler behind the command error guard. */
  private onGuardedCommand<Name extends keyof GameCommandMap>(
    command: Name,
    handler: (payload: GameCommandMap[Name]) => void,
  ): () => void {
    return onGameCommand(command, (payload) => {
      this.runGuarded('command', () => handler(payload));
    });
  }

  private registerBridgeCommandHandlers(): void {
    const onCommand = this.onGuardedCommand.bind(this);
    this.state.teardownCallbacks.push(
      onCommand('start-wave', () => {
        this.handleStartWaveCommand();
      }),
      onCommand('set-paused', (payload) => {
        this.setPaused(payload.isPaused);
      }),
      onCommand('set-game-speed', (payload) => {
        if (isGameSpeed(payload.speed)) {
          this.setGameSpeed(payload.speed);
        }
      }),
      onCommand('quit-match', () => {
        // The page leaves on this command; freeze the field until it is torn down.
        this.setPaused(true);
      }),
      onCommand('select-tower', (payload) => {
        this.state.selectedTowerType = payload.towerType;
        this.registry.set('ui.selectedTowerType', this.state.selectedTowerType ?? 'none');
        publishHudSnapshot(this.state);
      }),
      onCommand('select-faction', (payload) => {
        this.state.selectedFaction = payload.faction;
        if (canPerformBuildActions(this.state)) {
          this.state.duelMatchState = createInitialDuelMatchState(
            this.state.selectedBuilderFactionId,
            mapHudFactionToRaceId(this.state.selectedFaction),
            { ...this.state.mapEndpoints, baselineRaceId: getBaselineRaceId(this.state) },
          );
          this.registry.set('economy.lives', this.state.duelMatchState.player.hp);
          publishPlayerSendLimits(this.state.duelMatchState, this.state.selectedBuilderFactionId);
        }
        this.registry.set('wave.selectedFaction', this.state.selectedFaction);
        publishHudSnapshot(this.state);
      }),
      onCommand('send-creep', (payload) => {
        handleSendCreepCommand(this.ctx.sendCreepCommandDeps, payload.creepTypeId);
      }),
      onCommand('upgrade-tower', (payload) => {
        handleUpgradeTowerCommand(this.ctx.towerCommandDeps, payload.towerId);
      }),
      onCommand('choose-tower-branch', (payload) => {
        handleChooseTowerBranchCommand(
          this.ctx.towerCommandDeps,
          payload.towerId,
          payload.branchId,
        );
      }),
      onCommand('choose-creature-branch', (payload) => {
        handleChooseCreatureBranchCommand(
          this.ctx.creatureTalentCommandDeps,
          payload.unitId,
          payload.branchId,
        );
      }),
      onCommand('upgrade-creature', (payload) => {
        handleUpgradeCreatureCommand(this.ctx.creatureTalentCommandDeps, payload.unitId);
      }),
      onCommand('sell-tower', (payload) => {
        handleSellTowerCommand(this.ctx.towerCommandDeps, payload.towerId);
      }),
      onCommand('zoom-board', (payload) => {
        handleZoomBoardCommand(this.ctx, payload.action);
      }),
      onCommand('restart-match', () => {
        // A restart is also the recover action after an engine error.
        this.state.hasEngineError = false;
        this.state.gameClock.isPaused = false;
        this.applyClockToPhaserSystems();
        this.resetRunToInitialState();
      }),
      onGameEvent('battlefield-view-changed', (payload) =>
        handleBattlefieldViewChanged(this.core, payload),
      ),
    );
  }

  private drawGrid(): void {
    const grid = drawGridRuntime(
      this.state.gridRendererState,
      getGridRendererDeps(this.core),
      GRID_RENDERER_CONFIG,
      GRID_OVERLAY_RENDER_DEPTH,
    );
    this.state.gridModel = grid;
    updateGridOverlayVisualState(this.state);
    this.initializeWaveRuntime(grid);
    // A fresh board: show its path from match start, not only after the
    // first build or wave start.
    markRoutePreviewLayoutChanged(this.state.routePreview);
    this.state.arePathTilesStale = true;
    refreshBuildPhasePathTiles(this.core);
  }

  private initializeWaveRuntime(grid: GridModel): void {
    initializeWaveRuntimeModule(
      this.state.runState,
      WAVE_RUNTIME_CONFIG,
      this.ctx.wiring.waveRuntimeDeps,
      grid,
    );
    destroyBattlefieldTowers(this.state.playerField);
    destroyBattlefieldRenderState(this.state.opponentField);
    clearFieldWaveSchedule(this.state.opponentWave);
  }

  private loadSetupConfig(): void {
    const setupConfig = getGameSetupConfig();
    if (setupConfig) {
      this.state.selectedBuilderFactionId = setupConfig.builderFaction;
      this.state.selectedFaction = mapEnemyFactionToHudFaction(setupConfig.enemyFaction);
      this.state.selectedDifficulty = setupConfig.difficulty;
      this.registry.set('game.setup', setupConfig);
    }

    this.state.setupEndpoints = setupConfig?.endpoints;
    this.resetBaselineWaves();
    if (setupConfig?.endpoints?.mode === 'dynamic') {
      this.state.mapSeed = setupConfig.endpoints.seed;
      this.state.mapEndpoints = generateEdgeEndpoints(setupConfig.endpoints.seed);
    } else {
      this.state.mapSeed = DEFAULT_MAP_SEED;
      this.state.mapEndpoints = { entrance: ENTRANCE_CELL, exit: EXIT_CELL };
    }

    this.state.duelMatchState = createInitialDuelMatchState(
      this.state.selectedBuilderFactionId,
      mapHudFactionToRaceId(this.state.selectedFaction),
      { ...this.state.mapEndpoints, baselineRaceId: getBaselineRaceId(this.state) },
    );
    publishPlayerSendLimits(this.state.duelMatchState, this.state.selectedBuilderFactionId);
    // The scene wallet is the source of truth: seed it from the duel balance
    // table so both sides start level. Difficulty never tilts the purse.
    this.playerGold = this.state.duelMatchState.player.gold;
    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lives', this.state.duelMatchState.player.hp);
    this.state.opponentLeakHistory = [];
    this.state.computerDecisionRecorder.clear();
    this.state.computerMazePlanMemory.plan = null;
  }

  /** Restarts the match's baseline stream; a fixed map rolls a fresh seed. */
  private resetBaselineWaves(): void {
    this.state.baselineWaves = createSharedBaselineWaveSource(
      resolveBaselineWaveSeed(this.state.setupEndpoints, Math.random),
    );
  }

  private updatePerformanceTelemetry(deltaMs: number): void {
    this.state.devFpsReportElapsedMs += deltaMs;

    if (this.state.devFpsReportElapsedMs < DEV_FPS_REPORT_INTERVAL_MS) {
      return;
    }

    this.state.devFpsReportElapsedMs = 0;
    this.registry.set('performance.fps', Math.round(this.game.loop.actualFps));
  }

  private applyWaveCompletionRewardIfResolved(): void {
    const wasWaveCompletionRewardGranted = this.state.runState.isWaveCompletionRewardGranted;
    applyWaveCompletionRewardIfResolvedRuntime(
      this.state.runState,
      WAVE_RUNTIME_CONFIG,
      this.ctx.wiring.waveRuntimeDeps,
      isFieldWaveResolved(this.state.opponentWave),
    );
    if (!wasWaveCompletionRewardGranted && this.state.runState.isWaveCompletionRewardGranted) {
      this.applyDuelRoundEndFromResolvedWave();
    }
    if (canPerformBuildActions(this.state)) {
      // Send queues must NOT be cleared here: this runs every frame of the
      // build phase, which is exactly when the player queues sends. They are
      // consumed and cleared at wave start instead.
      if (this.state.duelMatchState.phase !== 'build') {
        this.state.duelMatchState = { ...this.state.duelMatchState, phase: 'build' };
      }
      this.state.soundManager?.stopSound('ambient.tension');
      ensureBaseAmbientPlaying(this.state);
    }
  }

  private recordOpponentLeakHistory(round: number, leakedCount: number): void {
    this.state.opponentLeakHistory.push({ round, leakedCount });
    if (this.state.opponentLeakHistory.length > GameScene.OPPONENT_LEAK_HISTORY_LIMIT) {
      this.state.opponentLeakHistory.shift();
    }
  }

  private applyDuelRoundEndFromResolvedWave(): void {
    const duelRuntimeState: DuelMatchRuntimeState = {
      duelMatchState: this.state.duelMatchState,
      wavePhaseState: this.wavePhaseState,
      isGameOver: this.isGameOver,
      nextWaveStartsAtMs: this.state.runState.nextWaveStartsAtMs,
    };
    const opponentLeakedCreeps = this.state.opponentField.creeps.filter(
      (creep) => creep.entity.status === 'escaped',
    ).length;
    this.recordOpponentLeakHistory(this.state.duelMatchState.round, opponentLeakedCreeps);
    const leaks = summarizeFieldLeaks(
      this.state.playerField.creeps.map((c) => c.entity),
      this.state.opponentField.creeps.map((c) => c.entity),
    );
    const result = applyDuelRoundEndRuntime({
      state: duelRuntimeState,
      deps: this.ctx.wiring.duelMatchRuntimeDeps,
      playerLeakedCreeps: leaks.playerLeakedLives,
      opponentLeakedCreeps: leaks.opponentLeakedLives,
      sentLeaks: leaks.sentLeaks,
      towerIncome: {
        player: getTowersIncomePerRound(this.state.playerField.towers.map((tower) => tower.entity)),
        opponent: getTowersIncomePerRound(
          this.state.opponentField.towers.map((tower) => tower.entity),
        ),
      },
      sentOutcomes: buildSentCreepOutcomes(
        this.state.sentCreepDeaths,
        this.state.playerField.creeps.map((creep) => creep.entity),
        this.state.opponentField.creeps.map((creep) => creep.entity),
      ),
    });

    const previousOpponentHp = this.state.duelMatchState.opponent.hp;
    this.state.duelMatchState = awardBonusGold(
      duelRuntimeState.duelMatchState,
      'opponent',
      leaks.leakGoldToOpponent,
    );
    if (leaks.leakGoldToPlayer > 0) {
      this.playerGold += leaks.leakGoldToPlayer;
      this.registry.set('economy.gold', this.playerGold);
    }
    this.wavePhaseState = duelRuntimeState.wavePhaseState;
    this.isGameOver = duelRuntimeState.isGameOver;
    this.state.runState.nextWaveStartsAtMs = duelRuntimeState.nextWaveStartsAtMs;
    publishRoundLifeEvents(previousOpponentHp, result);
    publishRoundSettled(
      {
        round: this.state.runState.currentWaveNumber,
        bountyEarned: this.state.runState.waveKillBountyEarned,
      },
      result,
    );
    if (result.playerIncomePaid > 0) {
      this.playerGold += result.playerIncomePaid;
      this.registry.set('economy.gold', this.playerGold);
    }
    syncDuelPlayerGoldFromWallet(this.state);
    this.state.matchWinner = result.winner === null ? null : mapRaceIdToHudFaction(result.winner);
    this.state.matchOutcomeStatus = resolveMatchOutcomeStatus(
      result.isMatchOver,
      result.winningSide,
    );
    this.state.matchOutcomeReason = mapDuelEndReasonToOutcomeReason(result.endReason);
    this.registry.set('duel.match.outcome', this.state.matchOutcomeStatus);
    if (this.state.matchWinner !== null) {
      this.registry.set('duel.match.winner', this.state.matchWinner);
    } else {
      this.registry.remove('duel.match.winner');
    }
    publishHudSnapshot(this.state);
  }

  private updateAutoWaveCountdown(nowMs: number): void {
    const changed = updateAutoWaveCountdownRuntime(
      this.state.runState,
      nowMs,
      canPerformBuildActions(this.state),
    );
    if (changed) {
      publishHudSnapshot(this.state);
    }
  }

  private tryStartNextWave(nowMs: number): void {
    if (!tryStartNextWaveRuntime(this.state.runState, nowMs)) return;
    if (!this.state.gridModel) {
      this.state.runState.nextWaveStartsAtMs = null;
      return;
    }
    this.startNextWaveFromBuildState();
  }

  private resetRunToInitialState(): void {
    this.state.opponentLeakHistory = [];
    this.state.opponentSendsThisWave = [];
    resetSentCreepDeathTally(this.state.sentCreepDeaths);
    this.state.computerDecisionRecorder.clear();
    this.state.computerMazePlanMemory.plan = null;
    destroyBattlefieldCreeps(this.state.playerField);
    destroyBattlefieldRenderState(this.state.opponentField);
    clearFieldWaveSchedule(this.state.opponentWave);
    destroyBattlefieldProjectiles(this.state.playerField);
    destroyBattlefieldImpactEffects(this.state.playerField);
    destroyBattlefieldTowers(this.state.playerField);
    this.state.placedTowerCostsByCellKey.clear();
    this.state.hoveredCell = null;
    this.state.hoveredBuildAnchor = null;
    this.state.pendingPlacementAnchor = null;
    this.state.buildPreviewOverlay?.clear();
    markRoutePreviewLayoutChanged(this.state.routePreview);
    this.state.pathCellKeys.clear();
    resetRunToInitialStateRuntime(this.state.runState);
    this.resetBaselineWaves();
    this.state.duelMatchState = createInitialDuelMatchState(
      this.state.selectedBuilderFactionId,
      mapHudFactionToRaceId(this.state.selectedFaction),
      // Keep the map the match was set up with; rebuilding with defaults
      // would desync the grid from a generated dynamic layout.
      { ...this.state.mapEndpoints, baselineRaceId: getBaselineRaceId(this.state) },
    );
    publishPlayerSendLimits(this.state.duelMatchState, this.state.selectedBuilderFactionId);
    this.playerGold = this.state.duelMatchState.player.gold;
    this.state.matchOutcomeStatus = 'active';
    this.state.matchWinner = null;
    this.state.matchOutcomeReason = null;
    this.registry.remove('duel.match.winner');
    this.registry.set('duel.match.outcome', this.state.matchOutcomeStatus);

    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lives', this.state.duelMatchState.player.hp);
    this.registry.set('phase.game.over', this.isGameOver);
    this.registry.set('phase.build.active', canPerformBuildActions(this.state));
    this.registry.set('wave.number', this.state.runState.currentWaveNumber);
    this.registry.remove('wave.escapedCreeps');
    this.registry.remove('economy.lastSellRefund');
    publishHudSnapshot(this.state);
    this.state.soundManager?.stopSound('ambient.tension');
    ensureBaseAmbientPlaying(this.state);

    this.drawGrid();
    publishGameEvent('selected-tower', { tower: null });
    // Last, so nothing the reset itself emitted outlives it in per-match UI.
    publishGameEvent('match-started', { trigger: 'restart' });
  }

  private handleStartWaveCommand(): void {
    if (this.isGameOver || !canPerformBuildActions(this.state)) {
      return;
    }
    this.state.soundManager?.play('ui.wave_start');

    this.state.runState.nextWaveStartsAtMs = null;
    this.startNextWaveFromBuildState();
  }

  private startNextWaveFromBuildState(): void {
    if (!this.state.gridModel) {
      return;
    }

    const waveRoutes = calculateWaveRoutes(this.state.gridModel);
    if (!hasWaveRoute(waveRoutes)) {
      this.state.runState.nextWaveStartsAtMs = null;
      publishHudSnapshot(this.state);
      return;
    }

    // From here on this is the wave being fought; the HUD counts it as such.
    this.state.runState.currentWaveNumber += 1;
    this.state.runState.waveKillBountyEarned = 0;
    resetSentCreepDeathTally(this.state.sentCreepDeaths);
    this.registry.set('wave.number', this.state.runState.currentWaveNumber);
    this.state.runState.activeCreepRoutes = waveRoutes;
    // The path preview shows the single-cell route; large creeps may walk wider.
    this.state.pathCellKeys = new Set(waveRoutes.small.map((cell) => `${cell.x}:${cell.y}`));
    redrawTerrainTiles(this.core);
    this.state.duelMatchState = applyComputerBuildPhaseStrategies(this.state.duelMatchState, {
      difficulty: this.state.selectedDifficulty,
      leakHistory: this.state.opponentLeakHistory,
      mazePlanMemory: this.state.computerMazePlanMemory,
      debugRecorder: this.state.computerDecisionRecorder,
      setRegistryValue: (key, value) => this.registry.set(key, value),
    });
    this.state.opponentSendsThisWave = [...this.state.duelMatchState.opponent.sendQueue];
    this.state.duelMatchState = refreshOpponentRoutesForWaveStart(this.state.duelMatchState);
    this.state.duelMatchState = reconcileBattlefieldsForNextRound(this.state.duelMatchState);
    syncOpponentBattlefieldRenderStateFromDuel(this.core);
    this.scheduleWaveOnBothFields();
    // Queues have now been routed onto battlefields and spawned as creeps.
    this.state.duelMatchState = resetSendQueuesForWaveStart(
      this.state.duelMatchState,
      this.state.selectedBuilderFactionId,
    );
    this.state.duelMatchState = startRound(this.state.duelMatchState).state;
    this.wavePhaseState = startNextWaveCycle(this.wavePhaseState);
    ensureBaseAmbientPlaying(this.state);
    if (!this.state.soundManager?.isPlaying('ambient.tension')) {
      this.state.soundManager?.play('ambient.tension');
    }
    this.state.pendingPlacementAnchor = null;
    this.registry.set('phase.build.active', canPerformBuildActions(this.state));
    updateGridOverlayVisualState(this.state);
    updateBuildPreview(this.core);
    this.state.runState.isWaveCompletionRewardGranted = false;
    this.state.runState.nextWaveStartsAtMs = null;
    renderVisibleBattlefield(this.core);
    publishHudSnapshot(this.state);
  }

  /**
   * Both fields get the round's one shared baseline plus the other side's
   * sends, released on the same timing from this frame.
   */
  private scheduleWaveOnBothFields(): void {
    const waveNumber = this.state.runState.currentWaveNumber;
    const baselineUnits = this.state.baselineWaves.rollNextWave(
      waveNumber,
      getSelectedFactionUnits(this.state),
    );
    spawnWaveCreepsRuntime(
      this.state.runState,
      WAVE_RUNTIME_CONFIG,
      this.ctx.wiring.waveRuntimeDeps,
      baselineUnits,
    );
    scheduleOpponentFieldWave(this.state.opponentWave, {
      routes: this.state.duelMatchState.opponent.battlefield.routes,
      waveNumber,
      baselineUnits,
      // Each send spawns at the creature grade it was sent with.
      sentUnits: resolveQueuedSendUnits(this.state.duelMatchState.player),
      timing: resolveWaveSpawnTiming(this.state.gameClock.nowMs, WAVE_RUNTIME_CONFIG),
    });
    // The duel state mirrors the field; the old wave's creeps are gone.
    syncOpponentDuelCreepsFromField(this.state);
  }

  private handleSceneShutdown(): void {
    if (this.state.isSceneCleanedUp) {
      return;
    }

    this.state.isSceneCleanedUp = true;

    stopMissingArtReport();
    this.state.teardownCallbacks.forEach((teardown) => teardown());
    this.state.teardownCallbacks.length = 0;

    destroyBattlefieldRenderState(this.state.playerField);
    destroyBattlefieldRenderState(this.state.opponentField);
    this.state.buildPreviewOverlay?.destroy();
    this.state.buildPreviewOverlay = null;
    destroyRoutePreviewGraphics(this.state.routePreview);
    this.state.pathCellKeys.clear();
    this.state.gridRendererState.gridGraphics?.destroy();
    this.state.gridRendererState.gridGraphics = null;
    destroyGridOccupancyOverlay(this.state.gridRendererState);
    clearTerrainSpritesRuntime(this.state.gridRendererState);
    clearGridLabelsRuntime(this.state.gridRendererState);
    this.state.runState.activeCreepRoutes = EMPTY_WAVE_ROUTES;
    this.state.runState.pendingWaveSpawns = [];
    clearFieldWaveSchedule(this.state.opponentWave);
    this.state.gridModel = null;
    this.state.runState.nextWaveStartsAtMs = null;
    this.state.placedTowerCostsByCellKey.clear();
    this.state.inputControllerState = createInputControllerState();
    this.state.devFpsReportElapsedMs = 0;
    this.state.runState.lastPublishedAutoStartSecondsLeft = null;
    this.state.soundManager?.destroy();
    this.state.soundManager = null;
    this.state.hoveredCell = null;
    this.state.hoveredBuildAnchor = null;
    this.state.pendingPlacementAnchor = null;
  }
}
