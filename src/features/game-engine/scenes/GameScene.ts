import Phaser from 'phaser';
import {
  awardBonusGold,
  createInitialDuelMatchState,
  recordTowerBranchChoice,
  reconcileBattlefieldsForNextRound,
  refreshOpponentRoutesForWaveStart,
  resolveQueuedSendUnits,
  startRound,
  type DuelMatchState,
} from '../../../entities/duel-match';
import { getTowersIncomePerRound, resolveTowerSellRefundRatio } from '../../../entities/tower';
import { calculateWaveRoutes, EMPTY_WAVE_ROUTES, hasWaveRoute } from '../../../entities/wave';
import {
  canPerformBuildActions as canPerformBuildActionsByPhase,
  isWaveActionAllowed,
  startNextWaveCycle,
  type WavePhaseState,
} from '../../wave-phase';
import type { GridCell, GridModel, GridPoint } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  getGameSetupConfig,
  onGameCommand,
  onGameEvent,
  publishGameEvent,
} from '../../../shared/lib/game-bridge/bridge';
import type {
  BoardZoomAction,
  GameCommandMap,
  GameSpeed,
} from '../../../shared/lib/game-bridge/types';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { generateEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import type { SoundId } from '../../../shared/lib/sound-registry/audio.types';
import { checkFootprintPlacementPath } from '../../../shared/lib/pathfinding/validateFootprintPlacement';
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
  setBattlefieldRenderStateVisible,
} from '../runtime/battlefield/battlefieldRenderState';
import { rebuildOpponentBattlefieldRenderState } from '../runtime/battlefield/battlefieldSpriteFactory';
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
  getBoardViewportCentre,
  getBoardZoomFactor,
  isBoardCameraZoomed,
  panBoardCamera,
  registerResponsiveCamera,
  resetBoardCamera,
  resolvePointerScreenPoint,
  resolvePointerWorldPoint,
  setBoardCameraZoomFactorAt,
  zoomBoardCameraByAt,
} from '../runtime/camera/gameSceneCameraRuntime';
import {
  isBuildAnchorValid as isBuildAnchorValidRuntime,
  type BuildRuntimeDeps,
  type BuildRuntimeState,
} from '../runtime/build/gameSceneBuildRuntime';
import { resolvePlacementTap } from '../runtime/build/placementConfirmation';
import {
  handleSellTowerCommand,
  handleUpgradeTowerCommand,
  tryPlaceTowerAtHoveredCell,
  trySelectTowerAtHoveredCell,
  trySellTowerAtHoveredCell,
  type TowerCommandDeps,
} from '../runtime/build/gameSceneTowerCommands';
import { handleChooseTowerBranchCommand } from '../runtime/build/towerBranchCommands';
import {
  handleChooseCreatureBranchCommand,
  handleUpgradeCreatureCommand,
  type CreatureTalentCommandDeps,
} from '../runtime/duel/creatureTalentCommands';
import {
  buildSentCreepOutcomes,
  recordSentCreepDeath,
  resetSentCreepDeathTally,
} from '../runtime/duel/sentCreepOutcomeTally';
import { summarizeFieldLeaks } from '../runtime/duel/fieldLeakSettlement';
import { applyComputerBuildPhaseStrategies } from '../runtime/duel/gameSceneComputerStrategy';
import {
  handleSendCreepCommand,
  type SendCreepCommandDeps,
} from '../runtime/duel/gameSceneSendCommand';
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
  toPointerGridTarget,
  updateBuildPreview as updateBuildPreviewRuntime,
  updateGridOverlayVisualState as updateGridOverlayVisualStateRuntime,
} from '../runtime/grid/gameSceneGridPreviewRuntime';
import {
  attachRoutePreviewGraphics,
  destroyRoutePreviewGraphics,
  getBuildRoutePreviewCurrentRoutes,
  markRoutePreviewLayoutChanged,
  updateBuildRoutePreview,
} from '../runtime/grid/buildRoutePreviewRuntime';
import {
  clearGridLabels as clearGridLabelsRuntime,
  clearTerrainSprites as clearTerrainSpritesRuntime,
  drawGridCell as drawGridCellRuntime,
  drawGrid as drawGridRuntime,
  type GridRendererDeps,
} from '../runtime/grid/gameSceneGridRenderer';
import {
  destroyGridOccupancyOverlay,
  drawGridOccupancyOverlay,
} from '../runtime/grid/gridOccupancyOverlay';
import { refreshPathTiles, selectPlayerPathRoute } from '../runtime/grid/pathTiles';
import {
  registerSceneAudioUnlock,
  registerScenePointerHandlers,
} from '../runtime/input/gameSceneInputBindings';
import {
  canProcessUserAction as canProcessUserActionRuntime,
  createInputControllerState,
  handleGameOut as handleGameOutRuntime,
  handlePointerDown as handlePointerDownRuntime,
  handlePointerMove as handlePointerMoveRuntime,
  handlePointerUp as handlePointerUpRuntime,
  handleWheel as handleWheelRuntime,
  syncHoveredCellFromPointer,
  markUserActionProcessed as markUserActionProcessedRuntime,
  type BoardTapOutcome,
  type InputControllerDependencies,
} from '../runtime/input/gameSceneInputController';
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
import { createGameSoundRouter, type GameSoundRouter } from '../runtime/audio/gameSoundRouting';
import {
  BOARD_ZOOM_KEY_STEP_FACTOR,
  BUILD_PREVIEW_RENDER_DEPTH,
  ROUTE_PREVIEW_RENDER_DEPTH,
  DEFAULT_TOWER_COST,
  DEV_FPS_REPORT_INTERVAL_MS,
  DEFAULT_MAP_SEED,
  ENTRANCE_CELL,
  EXIT_CELL,
  GRID_OVERLAY_RENDER_DEPTH,
  SELL_REFUND_RATIO,
} from './gameScene.constants';
import {
  mapEnemyFactionToHudFaction,
  mapHudFactionToRaceId,
  mapRaceIdToHudFaction,
  resolveBuildableTowerConfig,
  mapDuelEndReasonToOutcomeReason,
  resolveMatchOutcomeStatus,
  resolveTowerRangeCells,
  toGridCellKey,
  toTowerId,
} from './gameScene.helpers';
import { createGameSceneRuntimeWiring } from './gameSceneRuntimeWiring';
import {
  COMBAT_RUNTIME_CONFIG,
  GRID_PREVIEW_CONFIG,
  ROUTE_PREVIEW_CONFIG,
  GRID_RENDERER_CONFIG,
  INPUT_CONTROLLER_CONFIG,
  MOVEMENT_RUNTIME_CONFIG,
  WAVE_RUNTIME_CONFIG,
} from './gameScene.runtimeConfigs';
import type { GameSceneInspection } from './gameScene.types';
import { publishHudSnapshot } from './controllers/hudSnapshotPublisher';
import { ensureBaseAmbientPlaying, handleGameOverUpdated } from './controllers/sceneAudio';
import {
  canPerformBuildActions,
  confirmsTouchPlacement,
  doesFacedRosterHaveAirCreeps,
  getBaselineRaceId,
  getBoardCamera,
  getComputerSendWaveUnits,
  getPreviewAnchor,
  getSelectedFactionUnits,
  getVisibleBuilderFactionId,
  getVisibleGridCells,
  syncDuelPlayerGoldFromWallet,
  type GameSceneCore,
} from './controllers/sceneQueries';
import { createGameSceneState, type GameSceneState } from './controllers/gameSceneState';

export class GameScene extends Phaser.Scene {
  public static readonly KEY = 'GameScene';
  private static readonly OPPONENT_LEAK_HISTORY_LIMIT = 10;
  private readonly state: GameSceneState = createGameSceneState();
  private readonly core: GameSceneCore = { scene: this, state: this.state };

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

  private readonly inputControllerDeps: InputControllerDependencies = {
    nowMs: () => this.time.now,
    toPointerScreenPoint: (pointer) => resolvePointerScreenPoint(this, pointer),
    toPointerWorldPoint: (pointer) =>
      resolvePointerWorldPoint(this, getBoardCamera(this.core), pointer),
    toPointerTarget: (worldX, worldY) => toPointerGridTarget(worldX, worldY),
    setHoveredTarget: (target) => {
      this.state.hoveredCell = target?.cell ?? null;
      this.state.hoveredBuildAnchor = target?.buildAnchor ?? null;
    },
    clearHoveredCell: () => {
      this.state.hoveredCell = null;
      this.state.hoveredBuildAnchor = null;
    },
    updateHoveredCellDebugRegistry: () => undefined,
    updateBuildPreview: () => this.updateBuildPreview(),
    onBoardTap: (pointer) => this.handleBoardTap(pointer),
    trySellTowerAtHoveredCell: () => trySellTowerAtHoveredCell(this.towerCommandDeps),
    isCameraZoomed: () => isBoardCameraZoomed(getBoardCamera(this.core)),
    getCameraZoomFactor: () => getBoardZoomFactor(getBoardCamera(this.core)),
    setCameraZoomFactorAt: (factor, focus) =>
      setBoardCameraZoomFactorAt(this, getBoardCamera(this.core), factor, focus),
    zoomCameraByAt: (multiplier, focus) =>
      zoomBoardCameraByAt(this, getBoardCamera(this.core), multiplier, focus),
    panCameraBy: (dragDelta) => panBoardCamera(this, getBoardCamera(this.core), dragDelta),
    resetCameraZoom: () => resetBoardCamera(this, getBoardCamera(this.core)),
    hasPanModifier: (pointer) => {
      // The harness emits plain pointer objects without a DOM event.
      const event: { shiftKey?: boolean } | undefined = pointer.event;
      return event?.shiftKey === true;
    },
  };

  /** Tower and creature sounds, resolved through the race sound profiles. */
  private readonly soundRouter: GameSoundRouter = createGameSoundRouter(
    (soundId) => this.state.soundManager?.play(soundId),
    () => this.state.selectedBuilderFactionId,
  );

  private readonly wiring = createGameSceneRuntimeWiring({
    scene: this,
    runState: this.state.runState,
    playerField: this.state.playerField,
    opponentField: this.state.opponentField,
    getSoundManager: () => this.state.soundManager,
    soundRouter: this.soundRouter,
    getDuelMatchState: () => this.state.duelMatchState,
    setDuelMatchState: (state) => {
      this.state.duelMatchState = state;
    },
    getComputerSendWaveUnits: () => getComputerSendWaveUnits(this.state),
    gameNowMs: () => this.state.gameClock.nowMs,
    refreshBuildState: () => this.refreshBuildState(),
    publishHudSnapshot: () => publishHudSnapshot(this.state),
    handleGameOverUpdated: (isGameOver) => handleGameOverUpdated(this.core, isGameOver),
    syncOpponentDuelCreepsFromField: () => this.syncOpponentDuelCreepsFromField(),
    recordSentCreepDeath: (field, creep) =>
      recordSentCreepDeath(this.state.sentCreepDeaths, field, creep),
  });

  private readonly towerCommandDeps: TowerCommandDeps = {
    scene: this,
    playerField: this.state.playerField,
    getBuildRuntimeState: () => this.getBuildRuntimeState(),
    getBuildRuntimeDeps: () => this.getBuildRuntimeDeps(),
    isPlayerViewActive: () => this.state.activeBattlefieldView === 'player',
    canManageTowers: () => !this.isGameOver && canPerformBuildActions(this.state),
    getHoveredCell: () => this.state.hoveredCell,
    getGridModel: () => this.state.gridModel,
    getBuilderFactionId: () => this.state.selectedBuilderFactionId,
    getPlayerGold: () => this.playerGold,
    getTowerBranchChoices: () => this.state.duelMatchState.player.towerBranchChoices,
    onTowerBranchChosen: (buildableTowerId, branchId) => {
      this.state.duelMatchState = recordTowerBranchChoice(
        this.state.duelMatchState,
        'player',
        buildableTowerId,
        branchId,
      );
    },
    onGoldUpdated: (nextGold) => {
      this.playerGold = nextGold;
      this.registry.set('economy.gold', nextGold);
    },
    onRefundRecorded: (refundAmount) => {
      this.registry.set('economy.lastSellRefund', refundAmount);
    },
    playSound: (soundId: SoundId) => this.state.soundManager?.play(soundId),
    soundRouter: this.soundRouter,
    markUserActionProcessed: () => this.markUserActionProcessed(),
    onHudChanged: () => publishHudSnapshot(this.state),
    drawGridCell: (cell) => {
      // Tower commands redraw exactly the cells whose occupancy they changed.
      markRoutePreviewLayoutChanged(this.state.routePreview);
      this.state.arePathTilesStale = true;
      this.drawGridCell(cell);
    },
    // Every build/sell ends here once its cells are redrawn: one path refresh
    // and one occupancy overlay redraw per command.
    updateBuildPreview: () => {
      this.redrawOccupancyOverlay();
      this.refreshBuildPhasePathTiles();
      this.updateBuildPreview();
    },
  };

  private readonly sendCreepCommandDeps: SendCreepCommandDeps = {
    syncDuelPlayerGoldFromWallet: () => syncDuelPlayerGoldFromWallet(this.state),
    getDuelMatchState: () => this.state.duelMatchState,
    setDuelMatchState: (state) => {
      this.state.duelMatchState = state;
    },
    isMatchOver: () => this.isGameOver || this.state.matchOutcomeStatus !== 'active',
    canPerformBuildActions: () => canPerformBuildActions(this.state),
    getBuilderFactionId: () => this.state.selectedBuilderFactionId,
    onGoldUpdated: (nextGold) => {
      this.playerGold = nextGold;
      this.registry.set('economy.gold', nextGold);
    },
    onHudChanged: () => publishHudSnapshot(this.state),
  };

  private readonly creatureTalentCommandDeps: CreatureTalentCommandDeps = {
    getDuelMatchState: () => this.state.duelMatchState,
    setDuelMatchState: (state) => {
      this.state.duelMatchState = state;
    },
    isMatchOver: () => this.isGameOver || this.state.matchOutcomeStatus !== 'active',
    getBuilderFactionId: () => this.state.selectedBuilderFactionId,
    playSound: (soundId: SoundId) => this.state.soundManager?.play(soundId),
    onHudChanged: () => publishHudSnapshot(this.state),
  };

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
        onPointerMove: (pointer) => this.handlePointerMove(pointer),
        onPointerDown: (pointer) => this.handlePointerDown(pointer),
        onPointerUp: (pointer) => this.handlePointerUp(pointer),
        onWheel: (pointer, deltaY) => this.handleWheel(pointer, deltaY),
        onGameOut: () => this.handleGameOut(),
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
    this.updateGridOverlayVisualState();
    // Draws the build-phase routes before the first pointer move.
    this.updateBuildPreview();
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

    processPendingWaveSpawns(this.state.runState, this.wiring.waveRuntimeDeps, nowMs);
    processPendingWaveSpawns(this.state.opponentWave, this.wiring.waveRuntimeDeps, nowMs);
    moveBattlefieldCreeps(this.wiring.playerBattlefieldContext, MOVEMENT_RUNTIME_CONFIG, delta);
    moveBattlefieldCreeps(this.wiring.opponentBattlefieldContext, MOVEMENT_RUNTIME_CONFIG, delta);
    updateBattlefieldTowerCombat(
      this.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldTowerCombat(
      this.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldCreepEffects(
      this.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldCreepEffects(
      this.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldCreepHitFeedback(
      this.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldCreepHitFeedback(
      this.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    removeDeadBattlefieldCreeps(this.wiring.playerBattlefieldContext, COMBAT_RUNTIME_CONFIG, delta);
    removeDeadBattlefieldCreeps(
      this.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    this.applyWaveCompletionRewardIfResolved();
    this.tryStartNextWave(nowMs);
    updateBattlefieldProjectiles(
      this.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldProjectiles(
      this.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldImpactEffects(
      this.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldImpactEffects(
      this.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldDamageNumbers(
      this.wiring.playerBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    updateBattlefieldDamageNumbers(
      this.wiring.opponentBattlefieldContext,
      COMBAT_RUNTIME_CONFIG,
      delta,
    );
    this.applyBattlefieldViewVisibility();
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
        handleSendCreepCommand(this.sendCreepCommandDeps, payload.creepTypeId);
      }),
      onCommand('upgrade-tower', (payload) => {
        handleUpgradeTowerCommand(this.towerCommandDeps, payload.towerId);
      }),
      onCommand('choose-tower-branch', (payload) => {
        handleChooseTowerBranchCommand(this.towerCommandDeps, payload.towerId, payload.branchId);
      }),
      onCommand('choose-creature-branch', (payload) => {
        handleChooseCreatureBranchCommand(
          this.creatureTalentCommandDeps,
          payload.unitId,
          payload.branchId,
        );
      }),
      onCommand('upgrade-creature', (payload) => {
        handleUpgradeCreatureCommand(this.creatureTalentCommandDeps, payload.unitId);
      }),
      onCommand('sell-tower', (payload) => {
        handleSellTowerCommand(this.towerCommandDeps, payload.towerId);
      }),
      onCommand('zoom-board', (payload) => {
        this.handleZoomBoardCommand(payload.action);
      }),
      onCommand('restart-match', () => {
        // A restart is also the recover action after an engine error.
        this.state.hasEngineError = false;
        this.state.gameClock.isPaused = false;
        this.applyClockToPhaserSystems();
        this.resetRunToInitialState();
      }),
      onGameEvent('battlefield-view-changed', (payload) => {
        if (!payload.accepted) {
          return;
        }

        this.state.activeBattlefieldView = payload.activeView;
        if (payload.activeView !== 'player') {
          // The opponent view is read-only: close the player's tower actions.
          publishGameEvent('selected-tower', { tower: null });
          this.state.pendingPlacementAnchor = null;
        }
        this.renderVisibleBattlefield();
        publishHudSnapshot(this.state);
      }),
    );
  }

  private drawGrid(): void {
    const grid = drawGridRuntime(
      this.state.gridRendererState,
      this.getGridRendererDeps(),
      GRID_RENDERER_CONFIG,
      GRID_OVERLAY_RENDER_DEPTH,
    );
    this.state.gridModel = grid;
    this.updateGridOverlayVisualState();
    this.initializeWaveRuntime(grid);
    // A fresh board: show its path from match start, not only after the
    // first build or wave start.
    markRoutePreviewLayoutChanged(this.state.routePreview);
    this.state.arePathTilesStale = true;
    this.refreshBuildPhasePathTiles();
  }

  private initializeWaveRuntime(grid: GridModel): void {
    initializeWaveRuntimeModule(
      this.state.runState,
      WAVE_RUNTIME_CONFIG,
      this.wiring.waveRuntimeDeps,
      grid,
    );
    destroyBattlefieldTowers(this.state.playerField);
    destroyBattlefieldRenderState(this.state.opponentField);
    clearFieldWaveSchedule(this.state.opponentWave);
  }

  private refreshBuildState(): void {
    this.registry.set('phase.build.active', canPerformBuildActions(this.state));
    this.updateGridOverlayVisualState();
    this.updateBuildPreview();
  }

  // Mirrors the opponent Phaser render state back into the duel match state,
  // so round resolution and computer decisions observe up-to-date creeps.
  private syncOpponentDuelCreepsFromField(): void {
    this.state.duelMatchState = {
      ...this.state.duelMatchState,
      opponent: {
        ...this.state.duelMatchState.opponent,
        battlefield: {
          ...this.state.duelMatchState.opponent.battlefield,
          creeps: this.state.opponentField.creeps.map((creep) => ({ ...creep.entity })),
        },
      },
    };
  }

  private getBuildRuntimeState(): BuildRuntimeState {
    return {
      gridModel: this.state.gridModel,
      hoveredCell: this.state.hoveredCell,
      hoveredBuildAnchor: this.state.hoveredBuildAnchor,
      playerGold: this.playerGold,
      placedTowerCostsByCellKey: this.state.placedTowerCostsByCellKey,
    };
  }

  private getBuildRuntimeDeps(): BuildRuntimeDeps {
    return {
      canPerformPlace: () =>
        this.state.activeBattlefieldView === 'player' &&
        this.canProcessUserAction() &&
        isWaveActionAllowed(this.wavePhaseState, 'place-tower') &&
        !this.isGameOver,
      resolvePlaceRejection: () => {
        if (this.state.activeBattlefieldView !== 'player') return 'opponent_view';
        if (this.isGameOver) return 'match_over';
        if (!isWaveActionAllowed(this.wavePhaseState, 'place-tower')) return 'not_build_phase';
        return null;
      },
      canPerformSell: () =>
        this.state.activeBattlefieldView === 'player' &&
        this.canProcessUserAction() &&
        isWaveActionAllowed(this.wavePhaseState, 'sell-tower') &&
        !this.isGameOver,
      selectedTowerType: this.state.selectedTowerType,
      resolveTowerCost: (towerType) => {
        const towerConfig = resolveBuildableTowerConfig(
          this.state.selectedBuilderFactionId,
          towerType,
        );
        return towerConfig?.costGold ?? DEFAULT_TOWER_COST;
      },
      resolveBuildableTower: (towerType) =>
        resolveBuildableTowerConfig(this.state.selectedBuilderFactionId, towerType),
      toGridCellKey: (position) => toGridCellKey(position),
      toTowerId: (position) => toTowerId(position),
      checkFootprintPlacementPath: (grid, anchor, footprint) =>
        checkFootprintPlacementPath(grid, anchor, footprint),
      sellRefundRatio: SELL_REFUND_RATIO,
      resolveSellRefundRatio: (towerId) => {
        const tower = this.state.playerField.towers.find(
          (candidate) => candidate.entity.id === towerId,
        );
        return tower
          ? resolveTowerSellRefundRatio(tower.entity, SELL_REFUND_RATIO)
          : SELL_REFUND_RATIO;
      },
    };
  }

  private getGridRendererDeps(): GridRendererDeps {
    return {
      scene: this,
      selectedBuilderFactionId: getVisibleBuilderFactionId(this.state),
      pathCellKeys: this.state.pathCellKeys,
      mapSeed: this.state.mapSeed,
      createGridModel: () =>
        createGridModel({
          entrance: this.state.mapEndpoints.entrance,
          exit: this.state.mapEndpoints.exit,
        }),
    };
  }

  private updateBuildPreview(): void {
    const isHoveredAnchorValid = updateBuildPreviewRuntime(
      {
        overlay: this.state.buildPreviewOverlay,
        gridGraphics: this.state.gridRendererState.gridGraphics,
        gridModel: this.state.gridModel,
        hoveredBuildAnchor: getPreviewAnchor(this.state),
        canPerformBuildActions: canPerformBuildActions(this.state),
        selectedTowerRangeCells: resolveTowerRangeCells(this.state.selectedTowerType),
        isBuildAnchorValid: (anchor, grid) => this.isBuildAnchorValid(anchor, grid),
      },
      GRID_PREVIEW_CONFIG,
    );
    // The preview runtime re-dims the grid lines; keep the overlay in step.
    this.syncOccupancyOverlayAlpha();
    updateBuildRoutePreview(
      this.state.routePreview,
      {
        grid: this.state.gridModel,
        isBuildPhase: canPerformBuildActions(this.state),
        hoveredAnchor: getPreviewAnchor(this.state),
        isHoveredAnchorValid,
        hasAirCreeps: doesFacedRosterHaveAirCreeps(this.state),
      },
      ROUTE_PREVIEW_CONFIG,
    );
  }

  private isBuildAnchorValid(anchor: GridPosition, grid: GridModel): boolean {
    return isBuildAnchorValidRuntime(
      this.getBuildRuntimeState(),
      this.getBuildRuntimeDeps(),
      anchor,
      grid,
    );
  }

  /**
   * Keeps the terrain path tiles on the current small route while building.
   * Shares the route preview's memoised search, so it adds no route search.
   * Outside the build phase the tiles follow the wave's routes (wave start).
   */
  private refreshBuildPhasePathTiles(): void {
    if (
      !this.state.arePathTilesStale ||
      !this.state.gridModel ||
      !canPerformBuildActions(this.state)
    ) {
      return;
    }
    this.state.arePathTilesStale = false;
    refreshPathTiles(
      this.state.gridModel.cells,
      this.state.pathCellKeys,
      this.getPlayerPathRoute(),
      (nextPathCellKeys) => {
        this.state.pathCellKeys = nextPathCellKeys;
      },
      (cell) => this.drawGridCell(cell),
    );
  }

  /** Shares the route preview's memoised search while building. */
  private getPlayerPathRoute(): readonly GridPoint[] {
    const grid = this.state.gridModel;
    return selectPlayerPathRoute(
      grid !== null && !this.isGameOver && canPerformBuildActionsByPhase(this.wavePhaseState),
      () => (grid ? getBuildRoutePreviewCurrentRoutes(this.state.routePreview, grid).small : []),
      this.state.runState.activeCreepRoutes.small,
    );
  }

  private drawGridCell(cell: GridCell): void {
    drawGridCellRuntime(
      this.state.gridRendererState,
      this.getGridRendererDeps(),
      GRID_RENDERER_CONFIG,
      cell,
    );
  }

  private updateGridOverlayVisualState(): void {
    updateGridOverlayVisualStateRuntime(
      this.state.gridRendererState.gridGraphics,
      canPerformBuildActions(this.state),
      GRID_PREVIEW_CONFIG,
    );
    this.syncOccupancyOverlayAlpha();
  }

  /** The occupancy overlay dims with the grid lines during waves. */
  private syncOccupancyOverlayAlpha(): void {
    updateGridOverlayVisualStateRuntime(
      this.state.gridRendererState.occupancyGraphics,
      canPerformBuildActions(this.state),
      GRID_PREVIEW_CONFIG,
    );
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
      this.wiring.waveRuntimeDeps,
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
      deps: this.wiring.duelMatchRuntimeDeps,
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

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) {
      // Back on a mouse: the preview follows the cursor again.
      this.state.isLastPointerTouch = false;
      this.state.pendingPlacementAnchor = null;
    }
    handlePointerMoveRuntime(
      this.state.inputControllerState,
      this.inputControllerDeps,
      INPUT_CONTROLLER_CONFIG,
      pointer,
    );
  }

  private canProcessUserAction(): boolean {
    return canProcessUserActionRuntime(
      this.state.inputControllerState,
      this.time.now,
      INPUT_CONTROLLER_CONFIG.actionCooldownMs,
    );
  }

  private markUserActionProcessed(): void {
    markUserActionProcessedRuntime(this.state.inputControllerState, this.time.now);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.state.isLastPointerTouch = pointer.wasTouch;
    handlePointerDownRuntime(this.state.inputControllerState, this.inputControllerDeps, pointer);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    handlePointerUpRuntime(
      this.state.inputControllerState,
      this.inputControllerDeps,
      INPUT_CONTROLLER_CONFIG,
      pointer,
    );
  }

  private handleWheel(pointer: Phaser.Input.Pointer, deltaY: number): void {
    handleWheelRuntime(this.inputControllerDeps, INPUT_CONTROLLER_CONFIG, pointer, deltaY);
  }

  private handleZoomBoardCommand(action: BoardZoomAction): void {
    const camera = getBoardCamera(this.core);
    if (action === 'reset') {
      resetBoardCamera(this, camera);
      return;
    }
    const multiplier =
      action === 'in' ? BOARD_ZOOM_KEY_STEP_FACTOR : 1 / BOARD_ZOOM_KEY_STEP_FACTOR;
    zoomBoardCameraByAt(this, camera, multiplier, getBoardViewportCentre(camera));
  }

  /**
   * A tap or click that reached the board: a tower under it is selected,
   * otherwise the selection closes and the tap goes to building.
   */
  private handleBoardTap(pointer: Phaser.Input.Pointer): BoardTapOutcome {
    syncHoveredCellFromPointer(this.inputControllerDeps, pointer);
    if (trySelectTowerAtHoveredCell(this.towerCommandDeps)) {
      this.clearPendingPlacement();
      return 'selected-tower';
    }
    if (this.state.hoveredCell) {
      publishGameEvent('selected-tower', { tower: null });
    }

    const isBuildTap =
      this.state.activeBattlefieldView === 'player' && canPerformBuildActions(this.state);
    if (isBuildTap && confirmsTouchPlacement(this.state)) {
      this.handleTwoTapPlacement();
    } else {
      this.state.pendingPlacementAnchor = null;
      tryPlaceTowerAtHoveredCell(this.towerCommandDeps);
    }
    return isBuildTap ? 'build-tap' : 'board-tap';
  }

  private clearPendingPlacement(): void {
    if (!this.state.pendingPlacementAnchor) {
      return;
    }
    this.state.pendingPlacementAnchor = null;
    this.updateBuildPreview();
  }

  /** First tap arms the hovered block; a second tap on it builds (a refusal keeps it armed). */
  private handleTwoTapPlacement(): void {
    if (!this.state.hoveredBuildAnchor) {
      return;
    }
    const decision = resolvePlacementTap(
      this.state.pendingPlacementAnchor,
      this.state.hoveredBuildAnchor,
    );
    if (decision.kind === 'arm') {
      this.state.pendingPlacementAnchor = decision.anchor;
      this.state.soundManager?.play('ui.click');
      this.updateBuildPreview();
      return;
    }

    const towersBefore = this.state.playerField.towers.length;
    tryPlaceTowerAtHoveredCell(this.towerCommandDeps);
    if (this.state.playerField.towers.length > towersBefore) {
      this.state.pendingPlacementAnchor = null;
      this.updateBuildPreview();
    }
  }

  private handleGameOut(): void {
    handleGameOutRuntime(this.state.inputControllerState, this.inputControllerDeps);
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
    this.redrawTerrainTiles();
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
    this.syncOpponentBattlefieldRenderStateFromDuel();
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
    this.updateGridOverlayVisualState();
    this.updateBuildPreview();
    this.state.runState.isWaveCompletionRewardGranted = false;
    this.state.runState.nextWaveStartsAtMs = null;
    this.renderVisibleBattlefield();
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
      this.wiring.waveRuntimeDeps,
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
    this.syncOpponentDuelCreepsFromField();
  }

  private renderVisibleBattlefield(): void {
    const showOpponent = this.state.activeBattlefieldView === 'opponent';
    // The opponent field is built once per wave; rebuilding it on every view
    // toggle would drop escaped creeps (losing their leak damage) and reset
    // tower cooldowns, granting a free volley per toggle.
    if (
      showOpponent &&
      this.state.opponentField.creeps.length === 0 &&
      this.state.opponentField.towers.length === 0
    ) {
      this.syncOpponentBattlefieldRenderStateFromDuel();
    }

    this.applyBattlefieldViewVisibility();

    const visiblePath = showOpponent
      ? this.state.duelMatchState.opponent.battlefield.routes.small
      : this.getPlayerPathRoute();
    if (!showOpponent) this.state.arePathTilesStale = false;
    this.state.pathCellKeys = new Set(visiblePath.map((cell) => `${cell.x}:${cell.y}`));
    this.redrawTerrainTiles();
  }

  private applyBattlefieldViewVisibility(): void {
    const showOpponent = this.state.activeBattlefieldView === 'opponent';
    setBattlefieldRenderStateVisible(this.state.playerField, !showOpponent);
    setBattlefieldRenderStateVisible(this.state.opponentField, showOpponent);
  }

  private syncOpponentBattlefieldRenderStateFromDuel(): void {
    rebuildOpponentBattlefieldRenderState(
      this,
      this.state.opponentField,
      this.state.duelMatchState.opponent,
      this.state.activeBattlefieldView === 'opponent',
    );
  }

  private redrawTerrainTiles(): void {
    if (!this.state.gridModel) {
      return;
    }

    for (const cell of getVisibleGridCells(this.state)) {
      drawGridCellRuntime(
        this.state.gridRendererState,
        this.getGridRendererDeps(),
        GRID_RENDERER_CONFIG,
        cell,
      );
    }
    this.redrawOccupancyOverlay();
  }

  private redrawOccupancyOverlay(): void {
    if (!this.state.gridModel) {
      return;
    }

    drawGridOccupancyOverlay(
      this.state.gridRendererState,
      this,
      GRID_RENDERER_CONFIG,
      getVisibleGridCells(this.state),
      GRID_OVERLAY_RENDER_DEPTH,
    );
    this.syncOccupancyOverlayAlpha();
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
