import { TowerTypeId } from '../../../shared/types/content-ids';
import Phaser from 'phaser';
import { DEFAULT_BUILDER_FACTION } from '../../../entities/builder-faction';
import {
  createComputerDecisionDebugRecorder,
  createComputerMazePlanMemory,
  type LeakHistoryEntry,
} from '../../../entities/computer-opponent';
import {
  countLeakedSentCreeps,
  createInitialDuelMatchState,
  reconcileBattlefieldsForNextRound,
  refreshOpponentRoutesForWaveStart,
  startRound,
  type DuelMatchState,
} from '../../../entities/duel-match';
import { DEFAULT_DIFFICULTY, type Difficulty } from '../../../entities/difficulty';
import { resolveUnitConfigById, type UnitConfig } from '../../../entities/unit';
import { calculateWaveRoutes, EMPTY_WAVE_ROUTES, hasWaveRoute } from '../../../entities/wave';
import { RaceId, UnitMoveType } from '../../../shared/types/content-ids';
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
  publishGameHudSnapshot,
} from '../../../shared/lib/game-bridge/bridge';
import type {
  BattlefieldView,
  GameHudSnapshot,
  HudFactionType,
  MatchOutcomeReason,
  MatchOutcomeStatus,
} from '../../../shared/lib/game-bridge/types';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import {
  generateEdgeEndpoints,
  type EdgeEndpoints,
} from '../../../shared/lib/grid/generateEdgeEndpoints';
import type { SoundId } from '../../../shared/lib/sound-registry/audio.types';
import { validateFootprintPlacementPath } from '../../../shared/lib/pathfinding/validateFootprintPlacement';
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
  createBattlefieldRenderState,
  destroyBattlefieldCreeps,
  destroyBattlefieldImpactEffects,
  destroyBattlefieldProjectiles,
  destroyBattlefieldRenderState,
  destroyBattlefieldTowers,
  setBattlefieldRenderStateVisible,
  type BattlefieldRenderState,
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
  registerResponsiveCamera,
  resolvePointerWorldPoint,
} from '../runtime/camera/gameSceneCameraRuntime';
import {
  isBuildAnchorValid as isBuildAnchorValidRuntime,
  type BuildRuntimeDeps,
  type BuildRuntimeState,
} from '../runtime/build/gameSceneBuildRuntime';
import {
  handleSellTowerCommand,
  handleUpgradeTowerCommand,
  tryPlaceTowerAtHoveredCell,
  trySelectTowerAtHoveredCell,
  trySellTowerAtHoveredCell,
  type TowerCommandDeps,
} from '../runtime/build/gameSceneTowerCommands';
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
  type DuelMatchRuntimeState,
} from '../runtime/duel/gameSceneDuelRuntime';
import {
  toPointerGridTarget,
  updateBuildPreview as updateBuildPreviewRuntime,
  updateGridOverlayVisualState as updateGridOverlayVisualStateRuntime,
} from '../runtime/grid/gameSceneGridPreviewRuntime';
import {
  attachRoutePreviewGraphics,
  createBuildRoutePreviewRuntime,
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
  type GridRendererState,
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
  handleGameOut as handleGameOutRuntime,
  handlePointerDown as handlePointerDownRuntime,
  handlePointerMove as handlePointerMoveRuntime,
  handlePointerUp as handlePointerUpRuntime,
  syncHoveredCellFromPointer,
  markUserActionProcessed as markUserActionProcessedRuntime,
  type InputControllerDependencies,
  type InputControllerState,
} from '../runtime/input/gameSceneInputController';
import {
  applyWaveCompletionRewardIfResolved as applyWaveCompletionRewardIfResolvedRuntime,
  createPlayerWaveRuntimeState,
  initializeWaveRuntime as initializeWaveRuntimeModule,
  resetRunToInitialState as resetRunToInitialStateRuntime,
  spawnWaveCreeps as spawnWaveCreepsRuntime,
  tryStartNextWave as tryStartNextWaveRuntime,
  updateAutoWaveCountdown as updateAutoWaveCountdownRuntime,
} from '../runtime/wave/gameSceneWaveRuntime';
import {
  clearFieldWaveSchedule,
  createOpponentFieldWaveState,
  isFieldWaveResolved,
  processPendingWaveSpawns,
  resolveWaveSpawnTiming,
  scheduleOpponentFieldWave,
} from '../runtime/wave/fieldWaveSpawns';
import {
  countFieldRemainingCreeps,
  createOpponentFieldCreepsPublisher,
} from '../runtime/wave/opponentFieldCreepsPublisher';
import {
  createSharedBaselineWaveSource,
  resolveBaselineWaveSeed,
  type SharedBaselineWaveSource,
} from '../runtime/wave/sharedBaselineWave';
import type { GameSetupEndpoints } from '../../../shared/config/game-setup';
import { GameAudioManager } from '../sound/GameAudioManager';
import { createGameSoundRouter, type GameSoundRouter } from '../runtime/audio/gameSoundRouting';
import {
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
  buildHudSendQueue,
  buildHudWaveQueueWithPending,
  mapEnemyFactionToHudFaction,
  mapHudFactionToRaceId,
  mapRaceIdToHudFaction,
  resolveBuildableTowerConfig,
  resolveBuilderFaction,
  resolveFactionUnits,
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

export class GameScene extends Phaser.Scene {
  public static readonly KEY = 'GameScene';
  private static readonly OPPONENT_LEAK_HISTORY_LIMIT = 10;
  private isSceneCleanedUp = false;
  private hoveredCell: GridPosition | null = null;
  private hoveredBuildAnchor: GridPosition | null = null;
  private gridModel: GridModel | null = null;
  private readonly gridRendererState: GridRendererState = {
    gridGraphics: null,
    occupancyGraphics: null,
    terrainSprites: [],
    gridLabels: [],
    endpointMarkers: [],
  };
  private buildPreviewOverlay: Phaser.GameObjects.Graphics | null = null;
  private readonly routePreview = createBuildRoutePreviewRuntime();
  private pathCellKeys = new Set<string>();
  /** A build or sell changed the board since the path tiles were last drawn. */
  private arePathTilesStale = false;
  private placedTowerCostsByCellKey = new Map<string, number>();
  private readonly playerField: BattlefieldRenderState = createBattlefieldRenderState();
  private readonly opponentField: BattlefieldRenderState = createBattlefieldRenderState();
  // Long-lived state owned by the wave/movement runtime modules; the player
  // creep list is shared with playerField (see createPlayerWaveRuntimeState).
  private readonly runState = createPlayerWaveRuntimeState(this.playerField);
  // The computer field's spawn schedule; its creep list is opponentField's.
  private readonly opponentWave = createOpponentFieldWaveState(this.opponentField);
  // Lets the HUD say the round still waits on the computer's field.
  private readonly opponentFieldCreepsPublisher = createOpponentFieldCreepsPublisher((remaining) =>
    publishGameEvent('opponent-field-creeps-updated', { remaining }),
  );
  private readonly teardownCallbacks: Array<() => void> = [];
  private selectedTowerType: TowerTypeId | null = null;
  private selectedBuilderFactionId = DEFAULT_BUILDER_FACTION;
  private selectedFaction: HudFactionType = 'undead';
  private selectedDifficulty: Difficulty = DEFAULT_DIFFICULTY;
  private duelMatchState: DuelMatchState = createInitialDuelMatchState(
    RaceId.UNDEAD,
    RaceId.UNDEAD,
  );
  private opponentLeakHistory: LeakHistoryEntry[] = [];
  private readonly computerDecisionRecorder = createComputerDecisionDebugRecorder();
  private readonly computerMazePlanMemory = createComputerMazePlanMemory();
  private matchOutcomeStatus: MatchOutcomeStatus = 'active';
  private matchWinner: HudFactionType | null = null;
  private matchOutcomeReason: MatchOutcomeReason | null = null;
  private activeBattlefieldView: BattlefieldView = 'player';
  private mapSeed = DEFAULT_MAP_SEED;
  private setupEndpoints: GameSetupEndpoints | undefined;
  private baselineWaves: SharedBaselineWaveSource =
    createSharedBaselineWaveSource(DEFAULT_MAP_SEED);
  private mapEndpoints: EdgeEndpoints = { entrance: ENTRANCE_CELL, exit: EXIT_CELL };
  private inputControllerState: InputControllerState = {
    activeTouchGesture: null,
    lastActionAtMs: Number.NEGATIVE_INFINITY,
  };
  private devFpsReportElapsedMs = 0;
  private soundManager: GameAudioManager | null = null;

  private get playerGold(): number {
    return this.runState.playerGold;
  }

  private set playerGold(nextGold: number) {
    this.runState.playerGold = nextGold;
  }

  private get wavePhaseState(): WavePhaseState {
    return this.runState.wavePhaseState;
  }

  private set wavePhaseState(nextPhase: WavePhaseState) {
    this.runState.wavePhaseState = nextPhase;
  }

  private get isGameOver(): boolean {
    return this.runState.isGameOver;
  }

  private set isGameOver(nextIsGameOver: boolean) {
    this.runState.isGameOver = nextIsGameOver;
  }

  private readonly inputControllerDeps: InputControllerDependencies = {
    nowMs: () => this.time.now,
    toPointerWorldPoint: (pointer) => resolvePointerWorldPoint(this, pointer),
    toPointerTarget: (worldX, worldY) => toPointerGridTarget(worldX, worldY),
    setHoveredTarget: (target) => {
      this.hoveredCell = target?.cell ?? null;
      this.hoveredBuildAnchor = target?.buildAnchor ?? null;
    },
    clearHoveredCell: () => {
      this.hoveredCell = null;
      this.hoveredBuildAnchor = null;
    },
    updateHoveredCellDebugRegistry: () => undefined,
    updateBuildPreview: () => this.updateBuildPreview(),
    tryPlaceTowerAtHoveredCell: () => tryPlaceTowerAtHoveredCell(this.towerCommandDeps),
    trySellTowerAtHoveredCell: () => trySellTowerAtHoveredCell(this.towerCommandDeps),
  };

  /** Tower and creature sounds, resolved through the race sound profiles. */
  private readonly soundRouter: GameSoundRouter = createGameSoundRouter(
    (soundId) => this.soundManager?.play(soundId),
    () => this.selectedBuilderFactionId,
  );

  private readonly wiring = createGameSceneRuntimeWiring({
    scene: this,
    runState: this.runState,
    playerField: this.playerField,
    opponentField: this.opponentField,
    getSoundManager: () => this.soundManager,
    soundRouter: this.soundRouter,
    getDuelMatchState: () => this.duelMatchState,
    setDuelMatchState: (state) => {
      this.duelMatchState = state;
    },
    getComputerSendWaveUnits: () => this.getComputerSendWaveUnits(),
    refreshBuildState: () => this.refreshBuildState(),
    publishHudSnapshot: () => this.publishHudSnapshot(),
    handleGameOverUpdated: (isGameOver) => this.handleGameOverUpdated(isGameOver),
    syncOpponentDuelCreepsFromField: () => this.syncOpponentDuelCreepsFromField(),
  });

  private readonly towerCommandDeps: TowerCommandDeps = {
    scene: this,
    playerField: this.playerField,
    getBuildRuntimeState: () => this.getBuildRuntimeState(),
    getBuildRuntimeDeps: () => this.getBuildRuntimeDeps(),
    isPlayerViewActive: () => this.activeBattlefieldView === 'player',
    canManageTowers: () => !this.isGameOver && this.canPerformBuildActions(),
    getHoveredCell: () => this.hoveredCell,
    getGridModel: () => this.gridModel,
    getBuilderFactionId: () => this.selectedBuilderFactionId,
    getPlayerGold: () => this.playerGold,
    onGoldUpdated: (nextGold) => {
      this.playerGold = nextGold;
      this.registry.set('economy.gold', nextGold);
    },
    onRefundRecorded: (refundAmount) => {
      this.registry.set('economy.lastSellRefund', refundAmount);
    },
    playSound: (soundId: SoundId) => this.soundManager?.play(soundId),
    soundRouter: this.soundRouter,
    markUserActionProcessed: () => this.markUserActionProcessed(),
    onHudChanged: () => this.publishHudSnapshot(),
    drawGridCell: (cell) => {
      // Tower commands redraw exactly the cells whose occupancy they changed.
      markRoutePreviewLayoutChanged(this.routePreview);
      this.arePathTilesStale = true;
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
    syncDuelPlayerGoldFromWallet: () => this.syncDuelPlayerGoldFromWallet(),
    getDuelMatchState: () => this.duelMatchState,
    setDuelMatchState: (state) => {
      this.duelMatchState = state;
    },
    isMatchOver: () => this.isGameOver || this.matchOutcomeStatus !== 'active',
    canPerformBuildActions: () => this.canPerformBuildActions(),
    getBuilderFactionId: () => this.selectedBuilderFactionId,
    onGoldUpdated: (nextGold) => {
      this.playerGold = nextGold;
      this.registry.set('economy.gold', nextGold);
    },
    onHudChanged: () => this.publishHudSnapshot(),
  };

  constructor() {
    super(GameScene.KEY);
  }

  /** Test seam: a read-only snapshot of live runtime state (see GameSceneInspection). */
  public inspectRuntimeState(): GameSceneInspection {
    return {
      duelMatchState: this.duelMatchState,
      playerField: this.playerField,
      opponentField: this.opponentField,
      pendingPlayerSpawns: this.runState.pendingWaveSpawns,
      pendingOpponentSpawns: this.opponentWave.pendingWaveSpawns,
      wavePhaseState: this.wavePhaseState,
      waveNumber: this.runState.currentWaveNumber,
      playerGold: this.playerGold,
      isGameOver: this.isGameOver,
      activeBattlefieldView: this.activeBattlefieldView,
      gridModel: this.gridModel,
      gridRenderer: this.gridRendererState,
    };
  }

  public preload(): void {
    this.soundManager = new GameAudioManager(this);
    this.soundManager.preload();
    preloadGameSceneAssets(this);
  }

  public create(): void {
    this.isSceneCleanedUp = false;
    startMissingArtReport();
    ensurePlaceholderTextures(this);
    this.loadSetupConfig();
    this.cameras.main.setBackgroundColor('#1a1f2c');
    this.cameras.main.roundPixels = true;
    applyNearestNeighborFiltering(this);
    this.teardownCallbacks.push(registerResponsiveCamera(this));
    this.drawGrid();
    this.teardownCallbacks.push(
      registerScenePointerHandlers(this, {
        onPointerMove: (pointer) => this.handlePointerMove(pointer),
        onPointerDown: (pointer) => this.handlePointerDown(pointer),
        onPointerUp: (pointer) => this.handlePointerUp(pointer),
        onGameOut: () => this.handleGameOut(),
      }),
    );
    this.buildPreviewOverlay = this.add.graphics();
    this.buildPreviewOverlay.setDepth(BUILD_PREVIEW_RENDER_DEPTH);
    attachRoutePreviewGraphics(this.routePreview, this.add.graphics(), ROUTE_PREVIEW_RENDER_DEPTH);
    this.input.mouse?.disableContextMenu();
    this.teardownCallbacks.push(
      registerSceneAudioUnlock(
        this,
        () => this.soundManager,
        () => this.ensureBaseAmbientPlaying(),
      ),
    );
    createUnitWalkAnimations(this);
    createTowerAnimations(this);
    this.registerBridgeCommandHandlers();
    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lives', this.duelMatchState.player.hp);
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.registry.set('phase.game.over', this.isGameOver);
    this.registry.set('economy.earlyWaveStartBonus.granted', false);
    this.updateGridOverlayVisualState();
    // Draws the build-phase routes before the first pointer move.
    this.updateBuildPreview();
    this.publishHudSnapshot();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown, this);
  }

  public update(_time: number, delta: number): void {
    this.updateAutoWaveCountdown(_time);

    if (this.isGameOver) {
      return;
    }

    processPendingWaveSpawns(this.runState, this.wiring.waveRuntimeDeps, _time);
    processPendingWaveSpawns(this.opponentWave, this.wiring.waveRuntimeDeps, _time);
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
    this.tryStartNextWave(_time);
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

  private registerBridgeCommandHandlers(): void {
    this.teardownCallbacks.push(
      onGameCommand('start-wave', () => {
        this.handleStartWaveCommand();
      }),
      onGameCommand('select-tower', (payload) => {
        this.selectedTowerType = payload.towerType;
        this.registry.set('ui.selectedTowerType', this.selectedTowerType ?? 'none');
        this.publishHudSnapshot();
      }),
      onGameCommand('select-faction', (payload) => {
        this.selectedFaction = payload.faction;
        if (this.canPerformBuildActions()) {
          this.duelMatchState = createInitialDuelMatchState(
            this.selectedBuilderFactionId,
            mapHudFactionToRaceId(this.selectedFaction),
          );
          this.registry.set('economy.lives', this.duelMatchState.player.hp);
          publishPlayerSendLimits(this.duelMatchState, this.selectedBuilderFactionId);
        }
        this.registry.set('wave.selectedFaction', this.selectedFaction);
        this.publishHudSnapshot();
      }),
      onGameCommand('send-creep', (payload) => {
        handleSendCreepCommand(this.sendCreepCommandDeps, payload.creepTypeId);
      }),
      onGameCommand('upgrade-tower', (payload) => {
        handleUpgradeTowerCommand(this.towerCommandDeps, payload.towerId);
      }),
      onGameCommand('sell-tower', (payload) => {
        handleSellTowerCommand(this.towerCommandDeps, payload.towerId);
      }),
      onGameCommand('restart-match', () => {
        this.resetRunToInitialState();
      }),
      onGameEvent('battlefield-view-changed', (payload) => {
        if (!payload.accepted) {
          return;
        }

        this.activeBattlefieldView = payload.activeView;
        this.renderVisibleBattlefield();
        this.publishHudSnapshot();
      }),
    );
  }

  private drawGrid(): void {
    const grid = drawGridRuntime(
      this.gridRendererState,
      this.getGridRendererDeps(),
      GRID_RENDERER_CONFIG,
      GRID_OVERLAY_RENDER_DEPTH,
    );
    this.gridModel = grid;
    this.updateGridOverlayVisualState();
    this.initializeWaveRuntime(grid);
    // A fresh board: show its path from match start, not only after the
    // first build or wave start.
    markRoutePreviewLayoutChanged(this.routePreview);
    this.arePathTilesStale = true;
    this.refreshBuildPhasePathTiles();
  }

  private initializeWaveRuntime(grid: GridModel): void {
    initializeWaveRuntimeModule(
      this.runState,
      WAVE_RUNTIME_CONFIG,
      this.wiring.waveRuntimeDeps,
      grid,
    );
    destroyBattlefieldTowers(this.playerField);
    destroyBattlefieldRenderState(this.opponentField);
    clearFieldWaveSchedule(this.opponentWave);
  }

  private ensureBaseAmbientPlaying(): void {
    if (!this.soundManager?.isPlaying('ambient.map')) {
      this.soundManager?.play('ambient.map');
    }
  }

  private handleGameOverUpdated(isGameOver: boolean): void {
    this.isGameOver = isGameOver;
    this.registry.set('phase.game.over', isGameOver);
    if (isGameOver) {
      this.soundManager?.stopSound('ambient.tension');
      this.ensureBaseAmbientPlaying();
    }
  }

  private refreshBuildState(): void {
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.updateGridOverlayVisualState();
    this.updateBuildPreview();
  }

  // Mirrors the opponent Phaser render state back into the duel match state,
  // so round resolution and computer decisions observe up-to-date creeps.
  private syncOpponentDuelCreepsFromField(): void {
    this.duelMatchState = {
      ...this.duelMatchState,
      opponent: {
        ...this.duelMatchState.opponent,
        battlefield: {
          ...this.duelMatchState.opponent.battlefield,
          creeps: this.opponentField.creeps.map((creep) => ({ ...creep.entity })),
        },
      },
    };
  }

  private getBuildRuntimeState(): BuildRuntimeState {
    return {
      gridModel: this.gridModel,
      hoveredCell: this.hoveredCell,
      hoveredBuildAnchor: this.hoveredBuildAnchor,
      playerGold: this.playerGold,
      placedTowerCostsByCellKey: this.placedTowerCostsByCellKey,
    };
  }

  private getBuildRuntimeDeps(): BuildRuntimeDeps {
    return {
      canPerformPlace: () =>
        this.activeBattlefieldView === 'player' &&
        this.canProcessUserAction() &&
        isWaveActionAllowed(this.wavePhaseState, 'place-tower') &&
        !this.isGameOver,
      canPerformSell: () =>
        this.activeBattlefieldView === 'player' &&
        this.canProcessUserAction() &&
        isWaveActionAllowed(this.wavePhaseState, 'sell-tower') &&
        !this.isGameOver,
      selectedTowerType: this.selectedTowerType,
      resolveTowerCost: (towerType) => {
        const towerConfig = resolveBuildableTowerConfig(this.selectedBuilderFactionId, towerType);
        return towerConfig?.costGold ?? DEFAULT_TOWER_COST;
      },
      resolveBuildableTower: (towerType) =>
        resolveBuildableTowerConfig(this.selectedBuilderFactionId, towerType),
      toGridCellKey: (position) => toGridCellKey(position),
      toTowerId: (position) => toTowerId(position),
      validateFootprintPlacementPath: (grid, anchor, footprint) =>
        validateFootprintPlacementPath(grid, anchor, footprint),
      sellRefundRatio: SELL_REFUND_RATIO,
    };
  }

  private getGridRendererDeps(): GridRendererDeps {
    return {
      scene: this,
      selectedBuilderFactionId: this.getVisibleBuilderFactionId(),
      pathCellKeys: this.pathCellKeys,
      mapSeed: this.mapSeed,
      createGridModel: () =>
        createGridModel({
          entrance: this.mapEndpoints.entrance,
          exit: this.mapEndpoints.exit,
        }),
    };
  }

  private updateBuildPreview(): void {
    const isHoveredAnchorValid = updateBuildPreviewRuntime(
      {
        overlay: this.buildPreviewOverlay,
        gridGraphics: this.gridRendererState.gridGraphics,
        gridModel: this.gridModel,
        hoveredBuildAnchor: this.hoveredBuildAnchor,
        canPerformBuildActions: this.canPerformBuildActions(),
        selectedTowerRangeCells: resolveTowerRangeCells(this.selectedTowerType),
        isBuildAnchorValid: (anchor, grid) => this.isBuildAnchorValid(anchor, grid),
      },
      GRID_PREVIEW_CONFIG,
    );
    // The preview runtime re-dims the grid lines; keep the overlay in step.
    this.syncOccupancyOverlayAlpha();
    updateBuildRoutePreview(
      this.routePreview,
      {
        grid: this.gridModel,
        isBuildPhase: this.canPerformBuildActions(),
        hoveredAnchor: this.hoveredBuildAnchor,
        isHoveredAnchorValid,
        hasAirCreeps: this.doesFacedRosterHaveAirCreeps(),
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
    if (!this.arePathTilesStale || !this.gridModel || !this.canPerformBuildActions()) {
      return;
    }
    this.arePathTilesStale = false;
    refreshPathTiles(
      this.gridModel.cells,
      this.pathCellKeys,
      this.getPlayerPathRoute(),
      (nextPathCellKeys) => {
        this.pathCellKeys = nextPathCellKeys;
      },
      (cell) => this.drawGridCell(cell),
    );
  }

  /** Shares the route preview's memoised search while building. */
  private getPlayerPathRoute(): readonly GridPoint[] {
    const grid = this.gridModel;
    return selectPlayerPathRoute(
      grid !== null && !this.isGameOver && canPerformBuildActionsByPhase(this.wavePhaseState),
      () => (grid ? getBuildRoutePreviewCurrentRoutes(this.routePreview, grid).small : []),
      this.runState.activeCreepRoutes.small,
    );
  }

  private drawGridCell(cell: GridCell): void {
    drawGridCellRuntime(
      this.gridRendererState,
      this.getGridRendererDeps(),
      GRID_RENDERER_CONFIG,
      cell,
    );
  }

  private updateGridOverlayVisualState(): void {
    updateGridOverlayVisualStateRuntime(
      this.gridRendererState.gridGraphics,
      this.canPerformBuildActions(),
      GRID_PREVIEW_CONFIG,
    );
    this.syncOccupancyOverlayAlpha();
  }

  /** The occupancy overlay dims with the grid lines during waves. */
  private syncOccupancyOverlayAlpha(): void {
    updateGridOverlayVisualStateRuntime(
      this.gridRendererState.occupancyGraphics,
      this.canPerformBuildActions(),
      GRID_PREVIEW_CONFIG,
    );
  }

  private canPerformBuildActions(): boolean {
    if (this.isGameOver) {
      return false;
    }

    if (this.activeBattlefieldView !== 'player') {
      return false;
    }

    return canPerformBuildActionsByPhase(this.wavePhaseState);
  }

  private syncDuelPlayerGoldFromWallet(): void {
    if (this.duelMatchState.player.gold === this.playerGold) {
      return;
    }
    this.duelMatchState = {
      ...this.duelMatchState,
      player: { ...this.duelMatchState.player, gold: this.playerGold },
    };
  }

  private loadSetupConfig(): void {
    const setupConfig = getGameSetupConfig();
    if (setupConfig) {
      this.selectedBuilderFactionId = setupConfig.builderFaction;
      this.selectedFaction = mapEnemyFactionToHudFaction(setupConfig.enemyFaction);
      this.selectedDifficulty = setupConfig.difficulty;
      this.registry.set('game.setup', setupConfig);
    }

    this.setupEndpoints = setupConfig?.endpoints;
    this.resetBaselineWaves();
    if (setupConfig?.endpoints?.mode === 'dynamic') {
      this.mapSeed = setupConfig.endpoints.seed;
      this.mapEndpoints = generateEdgeEndpoints(setupConfig.endpoints.seed);
    } else {
      this.mapSeed = DEFAULT_MAP_SEED;
      this.mapEndpoints = { entrance: ENTRANCE_CELL, exit: EXIT_CELL };
    }

    this.duelMatchState = createInitialDuelMatchState(
      this.selectedBuilderFactionId,
      mapHudFactionToRaceId(this.selectedFaction),
      this.mapEndpoints,
    );
    publishPlayerSendLimits(this.duelMatchState, this.selectedBuilderFactionId);
    // The scene wallet is the source of truth: seed it from the duel balance
    // table so both sides start level. Difficulty never tilts the purse.
    this.playerGold = this.duelMatchState.player.gold;
    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lives', this.duelMatchState.player.hp);
    this.opponentLeakHistory = [];
    this.computerDecisionRecorder.clear();
    this.computerMazePlanMemory.plan = null;
  }

  /** Restarts the match's baseline stream; a fixed map rolls a fresh seed. */
  private resetBaselineWaves(): void {
    this.baselineWaves = createSharedBaselineWaveSource(
      resolveBaselineWaveSeed(this.setupEndpoints, Math.random),
    );
  }

  private updatePerformanceTelemetry(deltaMs: number): void {
    this.devFpsReportElapsedMs += deltaMs;

    if (this.devFpsReportElapsedMs < DEV_FPS_REPORT_INTERVAL_MS) {
      return;
    }

    this.devFpsReportElapsedMs = 0;
    this.registry.set('performance.fps', Math.round(this.game.loop.actualFps));
  }

  private applyWaveCompletionRewardIfResolved(): void {
    const wasWaveCompletionRewardGranted = this.runState.isWaveCompletionRewardGranted;
    applyWaveCompletionRewardIfResolvedRuntime(
      this.runState,
      WAVE_RUNTIME_CONFIG,
      this.wiring.waveRuntimeDeps,
      isFieldWaveResolved(this.opponentWave),
    );
    if (!wasWaveCompletionRewardGranted && this.runState.isWaveCompletionRewardGranted) {
      this.applyDuelRoundEndFromResolvedWave();
    }
    if (this.canPerformBuildActions()) {
      // Send queues must NOT be cleared here: this runs every frame of the
      // build phase, which is exactly when the player queues sends. They are
      // consumed and cleared at wave start instead.
      if (this.duelMatchState.phase !== 'build') {
        this.duelMatchState = { ...this.duelMatchState, phase: 'build' };
      }
      this.soundManager?.stopSound('ambient.tension');
      this.ensureBaseAmbientPlaying();
    }
  }

  private recordOpponentLeakHistory(round: number, leakedCount: number): void {
    this.opponentLeakHistory.push({ round, leakedCount });
    if (this.opponentLeakHistory.length > GameScene.OPPONENT_LEAK_HISTORY_LIMIT) {
      this.opponentLeakHistory.shift();
    }
  }

  private applyDuelRoundEndFromResolvedWave(): void {
    const duelRuntimeState: DuelMatchRuntimeState = {
      duelMatchState: this.duelMatchState,
      wavePhaseState: this.wavePhaseState,
      isGameOver: this.isGameOver,
      nextWaveStartsAtMs: this.runState.nextWaveStartsAtMs,
    };
    const playerLeakedCreeps = this.playerField.creeps.filter(
      (creep) => creep.entity.status === 'escaped',
    ).length;
    const opponentLeakedCreeps = this.opponentField.creeps.filter(
      (creep) => creep.entity.status === 'escaped',
    ).length;
    this.recordOpponentLeakHistory(this.duelMatchState.round, opponentLeakedCreeps);
    const result = applyDuelRoundEndRuntime({
      state: duelRuntimeState,
      deps: this.wiring.duelMatchRuntimeDeps,
      playerLeakedCreeps,
      opponentLeakedCreeps,
      sentLeaks: {
        onPlayerField: countLeakedSentCreeps(this.playerField.creeps.map((c) => c.entity)),
        onOpponentField: countLeakedSentCreeps(this.opponentField.creeps.map((c) => c.entity)),
      },
    });

    const previousOpponentHp = this.duelMatchState.opponent.hp;
    this.duelMatchState = duelRuntimeState.duelMatchState;
    this.wavePhaseState = duelRuntimeState.wavePhaseState;
    this.isGameOver = duelRuntimeState.isGameOver;
    this.runState.nextWaveStartsAtMs = duelRuntimeState.nextWaveStartsAtMs;
    publishRoundLifeEvents(previousOpponentHp, result);
    if (result.playerIncomePaid > 0) {
      this.playerGold += result.playerIncomePaid;
      this.registry.set('economy.gold', this.playerGold);
    }
    this.syncDuelPlayerGoldFromWallet();
    this.matchWinner = result.winner === null ? null : mapRaceIdToHudFaction(result.winner);
    this.matchOutcomeStatus = resolveMatchOutcomeStatus(result.isMatchOver, result.winningSide);
    this.matchOutcomeReason = mapDuelEndReasonToOutcomeReason(result.endReason);
    this.registry.set('duel.match.outcome', this.matchOutcomeStatus);
    if (this.matchWinner !== null) {
      this.registry.set('duel.match.winner', this.matchWinner);
    } else {
      this.registry.remove('duel.match.winner');
    }
    this.publishHudSnapshot();
  }

  private updateAutoWaveCountdown(nowMs: number): void {
    const changed = updateAutoWaveCountdownRuntime(
      this.runState,
      nowMs,
      this.canPerformBuildActions(),
    );
    if (changed) {
      this.publishHudSnapshot();
    }
  }

  private tryStartNextWave(nowMs: number): void {
    if (!tryStartNextWaveRuntime(this.runState, nowMs)) return;
    if (!this.gridModel) {
      this.runState.nextWaveStartsAtMs = null;
      return;
    }
    this.startNextWaveFromBuildState();
  }

  private resetRunToInitialState(): void {
    this.opponentLeakHistory = [];
    this.computerDecisionRecorder.clear();
    this.computerMazePlanMemory.plan = null;
    destroyBattlefieldCreeps(this.playerField);
    destroyBattlefieldRenderState(this.opponentField);
    clearFieldWaveSchedule(this.opponentWave);
    destroyBattlefieldProjectiles(this.playerField);
    destroyBattlefieldImpactEffects(this.playerField);
    destroyBattlefieldTowers(this.playerField);
    this.placedTowerCostsByCellKey.clear();
    this.hoveredCell = null;
    this.hoveredBuildAnchor = null;
    this.buildPreviewOverlay?.clear();
    markRoutePreviewLayoutChanged(this.routePreview);
    this.pathCellKeys.clear();
    resetRunToInitialStateRuntime(this.runState);
    this.resetBaselineWaves();
    this.duelMatchState = createInitialDuelMatchState(
      this.selectedBuilderFactionId,
      mapHudFactionToRaceId(this.selectedFaction),
      // Keep the map the match was set up with; rebuilding with defaults
      // would desync the grid from a generated dynamic layout.
      this.mapEndpoints,
    );
    publishPlayerSendLimits(this.duelMatchState, this.selectedBuilderFactionId);
    this.playerGold = this.duelMatchState.player.gold;
    this.matchOutcomeStatus = 'active';
    this.matchWinner = null;
    this.matchOutcomeReason = null;
    this.registry.remove('duel.match.winner');
    this.registry.set('duel.match.outcome', this.matchOutcomeStatus);

    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lives', this.duelMatchState.player.hp);
    this.registry.set('phase.game.over', this.isGameOver);
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.registry.set('wave.number', this.runState.currentWaveNumber);
    this.registry.remove('wave.escapedCreeps');
    this.registry.remove('economy.lastSellRefund');
    this.publishHudSnapshot();
    this.soundManager?.stopSound('ambient.tension');
    this.ensureBaseAmbientPlaying();

    this.drawGrid();
    publishGameEvent('selected-tower', { tower: null });
  }

  private getSelectedFactionUnits(): UnitConfig[] {
    return resolveFactionUnits(mapHudFactionToRaceId(this.selectedFaction));
  }

  /** The baseline waves and the computer's sends both draw from the enemy roster. */
  private doesFacedRosterHaveAirCreeps(): boolean {
    return this.getSelectedFactionUnits().some((unit) => unit.moveType === UnitMoveType.AIR);
  }

  private getComputerSendWaveUnits(): UnitConfig[] {
    return this.duelMatchState.opponent.sendQueue.map((unitId) => resolveUnitConfigById(unitId));
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    handlePointerMoveRuntime(
      this.inputControllerState,
      this.inputControllerDeps,
      INPUT_CONTROLLER_CONFIG,
      pointer,
    );
  }

  private canProcessUserAction(): boolean {
    return canProcessUserActionRuntime(
      this.inputControllerState,
      this.time.now,
      INPUT_CONTROLLER_CONFIG.actionCooldownMs,
    );
  }

  private markUserActionProcessed(): void {
    markUserActionProcessedRuntime(this.inputControllerState, this.time.now);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    syncHoveredCellFromPointer(this.inputControllerDeps, pointer);
    if (trySelectTowerAtHoveredCell(this.towerCommandDeps)) {
      return;
    }

    if (this.hoveredCell) {
      publishGameEvent('selected-tower', { tower: null });
    }

    handlePointerDownRuntime(this.inputControllerState, this.inputControllerDeps, pointer);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) {
      syncHoveredCellFromPointer(this.inputControllerDeps, pointer);
    }
    if (pointer.wasTouch && trySelectTowerAtHoveredCell(this.towerCommandDeps)) {
      this.inputControllerState.activeTouchGesture = null;
      return;
    }

    if (pointer.wasTouch && this.hoveredCell) {
      publishGameEvent('selected-tower', { tower: null });
    }

    handlePointerUpRuntime(
      this.inputControllerState,
      this.inputControllerDeps,
      INPUT_CONTROLLER_CONFIG,
      pointer,
    );
  }

  private handleGameOut(): void {
    handleGameOutRuntime(this.inputControllerState, this.inputControllerDeps);
  }

  private handleStartWaveCommand(): void {
    if (this.isGameOver || !this.canPerformBuildActions()) {
      return;
    }
    this.soundManager?.play('ui.wave_start');

    this.runState.nextWaveStartsAtMs = null;
    this.startNextWaveFromBuildState();
  }

  private startNextWaveFromBuildState(): void {
    if (!this.gridModel) {
      return;
    }

    const waveRoutes = calculateWaveRoutes(this.gridModel);
    if (!hasWaveRoute(waveRoutes)) {
      this.runState.nextWaveStartsAtMs = null;
      this.publishHudSnapshot();
      return;
    }

    this.runState.activeCreepRoutes = waveRoutes;
    // The path preview shows the single-cell route; large creeps may walk wider.
    this.pathCellKeys = new Set(waveRoutes.small.map((cell) => `${cell.x}:${cell.y}`));
    this.redrawTerrainTiles();
    this.duelMatchState = applyComputerBuildPhaseStrategies(this.duelMatchState, {
      difficulty: this.selectedDifficulty,
      leakHistory: this.opponentLeakHistory,
      mazePlanMemory: this.computerMazePlanMemory,
      debugRecorder: this.computerDecisionRecorder,
      setRegistryValue: (key, value) => this.registry.set(key, value),
    });
    this.duelMatchState = refreshOpponentRoutesForWaveStart(this.duelMatchState);
    this.duelMatchState = reconcileBattlefieldsForNextRound(this.duelMatchState);
    this.syncOpponentBattlefieldRenderStateFromDuel();
    this.scheduleWaveOnBothFields();
    // Queues have now been routed onto battlefields and spawned as creeps.
    this.duelMatchState = resetSendQueuesForWaveStart(
      this.duelMatchState,
      this.selectedBuilderFactionId,
    );
    this.duelMatchState = startRound(this.duelMatchState).state;
    this.wavePhaseState = startNextWaveCycle(this.wavePhaseState);
    this.ensureBaseAmbientPlaying();
    if (!this.soundManager?.isPlaying('ambient.tension')) {
      this.soundManager?.play('ambient.tension');
    }
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.updateGridOverlayVisualState();
    this.updateBuildPreview();
    this.runState.isWaveCompletionRewardGranted = false;
    this.runState.nextWaveStartsAtMs = null;
    this.runState.currentWaveNumber += 1;
    this.registry.set('wave.number', this.runState.currentWaveNumber);
    this.renderVisibleBattlefield();
    this.publishHudSnapshot();
  }

  /**
   * Both fields get the round's one shared baseline plus the other side's
   * sends, released on the same timing from this frame.
   */
  private scheduleWaveOnBothFields(): void {
    const waveNumber = this.runState.currentWaveNumber;
    const baselineUnits = this.baselineWaves.rollNextWave(
      waveNumber,
      this.getSelectedFactionUnits(),
    );
    spawnWaveCreepsRuntime(
      this.runState,
      WAVE_RUNTIME_CONFIG,
      this.wiring.waveRuntimeDeps,
      baselineUnits,
    );
    scheduleOpponentFieldWave(this.opponentWave, {
      routes: this.duelMatchState.opponent.battlefield.routes,
      waveNumber,
      baselineUnits,
      sentUnits: this.duelMatchState.player.sendQueue.map((unitId) =>
        resolveUnitConfigById(unitId),
      ),
      timing: resolveWaveSpawnTiming(this.time.now, WAVE_RUNTIME_CONFIG),
    });
    // The duel state mirrors the field; the old wave's creeps are gone.
    this.syncOpponentDuelCreepsFromField();
  }

  private renderVisibleBattlefield(): void {
    const showOpponent = this.activeBattlefieldView === 'opponent';
    // The opponent field is built once per wave; rebuilding it on every view
    // toggle would drop escaped creeps (losing their leak damage) and reset
    // tower cooldowns, granting a free volley per toggle.
    if (
      showOpponent &&
      this.opponentField.creeps.length === 0 &&
      this.opponentField.towers.length === 0
    ) {
      this.syncOpponentBattlefieldRenderStateFromDuel();
    }

    this.applyBattlefieldViewVisibility();

    const visiblePath = showOpponent
      ? this.duelMatchState.opponent.battlefield.routes.small
      : this.getPlayerPathRoute();
    if (!showOpponent) this.arePathTilesStale = false;
    this.pathCellKeys = new Set(visiblePath.map((cell) => `${cell.x}:${cell.y}`));
    this.redrawTerrainTiles();
  }

  private applyBattlefieldViewVisibility(): void {
    const showOpponent = this.activeBattlefieldView === 'opponent';
    setBattlefieldRenderStateVisible(this.playerField, !showOpponent);
    setBattlefieldRenderStateVisible(this.opponentField, showOpponent);
  }

  private syncOpponentBattlefieldRenderStateFromDuel(): void {
    rebuildOpponentBattlefieldRenderState(
      this,
      this.opponentField,
      this.duelMatchState.opponent,
      this.activeBattlefieldView === 'opponent',
    );
  }

  private publishHudSnapshot(): void {
    const autoStartSecondsLeft =
      !this.isGameOver && this.canPerformBuildActions() && this.runState.nextWaveStartsAtMs !== null
        ? Math.max(0, Math.ceil((this.runState.nextWaveStartsAtMs - this.time.now) / 1000))
        : null;

    const snapshot: GameHudSnapshot = {
      gold: this.playerGold,
      income: this.duelMatchState.player.income,
      lives: this.duelMatchState.player.hp,
      opponentGold: this.duelMatchState.opponent.gold,
      opponentIncome: this.duelMatchState.opponent.income,
      opponentLives: this.duelMatchState.opponent.hp,
      matchOutcome: {
        status: this.matchOutcomeStatus,
        winner: this.matchWinner,
        reason: this.matchOutcomeReason,
      },
      builderFactionName: resolveBuilderFaction(this.selectedBuilderFactionId).name,
      waveNumber: this.runState.currentWaveNumber,
      phase: this.wavePhaseState.phase,
      canStartWave: !this.isGameOver && this.canPerformBuildActions(),
      selectedTowerType: this.selectedTowerType,
      selectedFaction: this.selectedFaction,
      autoStartSecondsLeft,
      waveQueue: buildHudWaveQueueWithPending(
        this.playerField.creeps,
        this.runState.pendingWaveSpawns,
      ),
      playerSendQueue: buildHudSendQueue(this.duelMatchState.player.sendQueue),
      opponentSendQueue: buildHudSendQueue(this.duelMatchState.opponent.sendQueue),
      pendingCreepCount:
        this.runState.pendingWaveSpawns.length +
        this.playerField.creeps.filter((c) => c.entity.status === 'alive').length,
    };

    publishGameHudSnapshot(snapshot);
    // Every kill, leak, wave start and restart ends here; publishes on change only.
    this.opponentFieldCreepsPublisher.update(
      countFieldRemainingCreeps(
        this.opponentField.creeps,
        this.opponentWave.pendingWaveSpawns.length,
      ),
    );
  }

  /**
   * Cells of the field currently on screen. The two grids share their size and
   * endpoints, so the same tile positions describe either one; what differs is
   * which cells are walled off. Drawing the player's occupancy under the
   * opponent's towers made the enemy field unreadable: its towers sat on bare
   * ground while the player's own tower bases showed through.
   */
  private getVisibleGridCells(): readonly GridCell[] {
    if (this.activeBattlefieldView === 'opponent') {
      return this.duelMatchState.opponent.battlefield.grid.cells;
    }

    return this.gridModel?.cells ?? [];
  }

  private redrawTerrainTiles(): void {
    if (!this.gridModel) {
      return;
    }

    for (const cell of this.getVisibleGridCells()) {
      drawGridCellRuntime(
        this.gridRendererState,
        this.getGridRendererDeps(),
        GRID_RENDERER_CONFIG,
        cell,
      );
    }
    this.redrawOccupancyOverlay();
  }

  private redrawOccupancyOverlay(): void {
    if (!this.gridModel) {
      return;
    }

    drawGridOccupancyOverlay(
      this.gridRendererState,
      this,
      GRID_RENDERER_CONFIG,
      this.getVisibleGridCells(),
      GRID_OVERLAY_RENDER_DEPTH,
    );
    this.syncOccupancyOverlayAlpha();
  }

  private getVisibleBuilderFactionId(): RaceId {
    return this.activeBattlefieldView === 'opponent'
      ? this.duelMatchState.opponent.raceId
      : this.selectedBuilderFactionId;
  }

  private handleSceneShutdown(): void {
    if (this.isSceneCleanedUp) {
      return;
    }

    this.isSceneCleanedUp = true;

    stopMissingArtReport();
    this.teardownCallbacks.forEach((teardown) => teardown());
    this.teardownCallbacks.length = 0;

    destroyBattlefieldRenderState(this.playerField);
    destroyBattlefieldRenderState(this.opponentField);
    this.buildPreviewOverlay?.destroy();
    this.buildPreviewOverlay = null;
    destroyRoutePreviewGraphics(this.routePreview);
    this.pathCellKeys.clear();
    this.gridRendererState.gridGraphics?.destroy();
    this.gridRendererState.gridGraphics = null;
    destroyGridOccupancyOverlay(this.gridRendererState);
    clearTerrainSpritesRuntime(this.gridRendererState);
    clearGridLabelsRuntime(this.gridRendererState);
    this.runState.activeCreepRoutes = EMPTY_WAVE_ROUTES;
    this.runState.pendingWaveSpawns = [];
    clearFieldWaveSchedule(this.opponentWave);
    this.gridModel = null;
    this.runState.nextWaveStartsAtMs = null;
    this.placedTowerCostsByCellKey.clear();
    this.inputControllerState.activeTouchGesture = null;
    this.inputControllerState.lastActionAtMs = Number.NEGATIVE_INFINITY;
    this.devFpsReportElapsedMs = 0;
    this.runState.lastPublishedAutoStartSecondsLeft = null;
    this.soundManager?.destroy();
    this.soundManager = null;
    this.hoveredCell = null;
    this.hoveredBuildAnchor = null;
  }
}
