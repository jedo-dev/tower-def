import Phaser from 'phaser';
import { createInitialDuelMatchState, type DuelMatchState } from '../../../entities/duel-match';
import { EMPTY_WAVE_ROUTES } from '../../../entities/wave';
import { type WavePhaseState } from '../../wave-phase';
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
import { resetSentCreepDeathTally } from '../runtime/duel/sentCreepOutcomeTally';
import { handleSendCreepCommand } from '../runtime/duel/gameSceneSendCommand';
import { publishPlayerSendLimits } from '../runtime/duel/gameSceneSendLimits';
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
  type WaveRuntimeState,
  initializeWaveRuntime as initializeWaveRuntimeModule,
  resetRunToInitialState as resetRunToInitialStateRuntime,
} from '../runtime/wave/gameSceneWaveRuntime';
import { advanceGameClock, isGameSpeed } from '../runtime/time/gameClock';
import {
  runGuardedEngineStep,
  type EngineErrorReport,
} from '../runtime/lifecycle/engineErrorGuard';
import { clearFieldWaveSchedule, processPendingWaveSpawns } from '../runtime/wave/fieldWaveSpawns';
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
import { mapEnemyFactionToHudFaction, mapHudFactionToRaceId } from './gameScene.helpers';
import {
  COMBAT_RUNTIME_CONFIG,
  GRID_RENDERER_CONFIG,
  MOVEMENT_RUNTIME_CONFIG,
  WAVE_RUNTIME_CONFIG,
} from './gameScene.runtimeConfigs';
import type { GameSceneInspection } from './gameScene.types';
import {
  applyWaveCompletionRewardIfResolved,
  startWaveOnPlayerRequest,
  tryStartNextWave,
  updateAutoWaveCountdown,
} from './controllers/waveFlowController';
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
} from './controllers/battlefieldViewController';
import {
  getGridRendererDeps,
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
  type GameSceneCore,
} from './controllers/sceneQueries';
import { type GameSceneState } from './controllers/gameSceneState';

export class GameScene extends Phaser.Scene {
  public static readonly KEY = 'GameScene';
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
    updateAutoWaveCountdown(this.ctx, nowMs);

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
    applyWaveCompletionRewardIfResolved(this.ctx);
    tryStartNextWave(this.ctx, nowMs);
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
    startWaveOnPlayerRequest(this.ctx);
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
