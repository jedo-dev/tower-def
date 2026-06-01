import Phaser from 'phaser';
import {
  builderFactions,
  DEFAULT_BUILDER_FACTION,
  type BuilderFactionConfig,
} from '../../../../entities/builder-faction';
import {
  canAffordUpgrade,
  buildableTowers,
  createInitialTowerCombatRuntime,
  getTowerStatsForLevel,
  getUpgradeCost,
  type BuildableTowerConfig,
} from '../../../../entities/tower';
import { spendGold } from '../../../../entities/player-resources';
import { applyComputerSendStrategy } from '../../../../entities/computer-opponent';
import {
  createInitialDuelMatchState,
  routeQueuedSendsToBattlefields,
  startRound,
  type DuelMatchState,
} from '../../../../entities/duel-match';
import { DEFAULT_DIFFICULTY, type Difficulty } from '../../../../entities/difficulty';
import { resolveUnitConfigById, undeadUnits, type UnitConfig } from '../../../../entities/unit';
import { calculateWaveStartPath } from '../../../../entities/wave';
import { RaceId } from '../../../types/content-ids';
import {
  canPerformBuildActions as canPerformBuildActionsByPhase,
  createInitialWavePhaseState,
  isWaveActionAllowed,
  startNextWaveCycle,
  type WavePhaseState,
} from '../../../../features/wave-phase';
import { GRID_DIMENSIONS } from '../../../constants/grid';
import {
  TOWER_ANIMATION_KEYS,
  TOWER_ANIMATION_SETS,
  TOWER_BONE_ARCHER_ANIMATION_FRAMES,
  TOWER_SPRITE_ASSETS,
  TOWER_SPRITE_KEYS,
  TOWER_SPRITE_SHEET_FRAME,
  UNIT_ANIMATION_KEYS,
  UNIT_SPRITE_ASSETS,
  UNIT_SPRITE_KEYS,
  UNIT_SPRITE_SHEET_FRAME,
} from '../../../constants/sprites';
import {
  PROPS,
  TILES,
  type Faction,
} from '../../../../assets/registry';
import { TowerCombatConfig } from '../../../constants/tower';
import type { GridCell, GridModel } from '../../../types/grid';
import type { GridPosition } from '../../../types/pathfinding';
import {
  getGameSetupConfig,
  onGameCommand,
  onGameEvent,
  publishGameEvent,
  publishGameHudSnapshot,
} from '../../game-bridge/bridge';
import type {
  BattlefieldView,
  GameHudSnapshot,
  HudFactionType,
  MatchOutcomeStatus,
  SelectedTowerSnapshot,
} from '../../game-bridge/types';
import { createGridModel } from '../../grid/createGridModel';
import type { SoundId } from '../sound/audio.types';
import { validateTowerPlacementPath } from '../../pathfinding/validateTowerPlacementPath';
import {
  isBuildCellValid as isBuildCellValidRuntime,
  tryPlaceTowerAtHoveredCell as tryPlaceTowerAtHoveredCellRuntime,
  trySellTowerAtHoveredCell as trySellTowerAtHoveredCellRuntime,
  type BuildRuntimeDeps,
  type BuildRuntimeState,
} from '../runtime/build/gameSceneBuildRuntime';
import {
  removeDeadCreepsFromActiveWave as removeDeadCreepsFromCombatRuntime,
  updateCreepHitFeedback as updateCreepHitFeedbackRuntime,
  updateDamageNumbers as updateDamageNumbersRuntime,
  updateImpactEffects as updateImpactEffectsRuntime,
  updateProjectiles as updateProjectilesRuntime,
  updateTowerCombat as updateTowerCombatRuntime,
  type CombatRuntimeConfig,
  type CombatRuntimeDependencies,
  type CombatRuntimeState,
} from '../runtime/combat/gameSceneCombatRuntime';
import {
  toGridCell as toGridCellRuntime,
  updateBuildPreview as updateBuildPreviewRuntime,
  updateGridOverlayVisualState as updateGridOverlayVisualStateRuntime,
  type GridPreviewConfig,
} from '../runtime/grid/gameSceneGridPreviewRuntime';
import {
  clearGridLabels as clearGridLabelsRuntime,
  clearTerrainSprites as clearTerrainSpritesRuntime,
  drawGridCell as drawGridCellRuntime,
  drawGrid as drawGridRuntime,
  type GridRendererConfig,
  type GridRendererDeps,
  type GridRendererState,
} from '../runtime/grid/gameSceneGridRenderer';
import {
  canProcessUserAction as canProcessUserActionRuntime,
  handleGameOut as handleGameOutRuntime,
  handlePointerDown as handlePointerDownRuntime,
  handlePointerMove as handlePointerMoveRuntime,
  handlePointerUp as handlePointerUpRuntime,
  markUserActionProcessed as markUserActionProcessedRuntime,
  type InputControllerConfig,
  type InputControllerDependencies,
  type InputControllerState,
} from '../runtime/input/gameSceneInputController';
import {
  moveCreepsAlongPath as moveCreepsAlongPathRuntime,
  type MovementRuntimeConfig,
  type MovementRuntimeDeps,
  type MovementRuntimeState,
} from '../runtime/movement/gameSceneMovementRuntime';
import {
  applyDuelRoundEnd as applyDuelRoundEndRuntime,
  type DuelMatchRuntimeDeps,
  type DuelMatchRuntimeState,
} from '../runtime/duel/gameSceneDuelRuntime';
import {
  applyWaveCompletionRewardIfResolved as applyWaveCompletionRewardIfResolvedRuntime,
  initializeWaveRuntime as initializeWaveRuntimeModule,
  processPendingWaveSpawns as processPendingWaveSpawnsRuntime,
  resetRunToInitialState as resetRunToInitialStateRuntime,
  spawnWaveCreeps as spawnWaveCreepsRuntime,
  tryRestartRun as tryRestartRunRuntime,
  tryStartNextWave as tryStartNextWaveRuntime,
  updateAutoWaveCountdown as updateAutoWaveCountdownRuntime,
  type WaveRuntimeConfig,
  type WaveRuntimeDependencies,
  type WaveRuntimeState,
} from '../runtime/wave/gameSceneWaveRuntime';
import { GameAudioManager } from '../sound/GameAudioManager';
import {
  ACTION_COOLDOWN_MS,
  ARCHER_PROJECTILE_VISUAL_MODE,
  AUTO_WAVE_START_DELAY_MS,
  BONE_ARCHER_ORIGIN_X,
  BONE_ARCHER_ORIGIN_Y,
  BONE_ARCHER_TOWER_CONFIG,
  BUILD_PREVIEW_RENDER_DEPTH,
  CREEP_BASE_COLOR,
  CREEP_BASE_MOVE_SPEED_PX_PER_SEC,
  CREEP_DEATH_FADE_DURATION_MS,
  CREEP_HIT_FLASH_COLOR,
  CREEP_HIT_FLASH_DURATION_MS,
  CREEP_MAX_SIMULATION_DELTA_MS,
  DAMAGE_NUMBER_LIFETIME_MS,
  DAMAGE_NUMBER_RISE_PX,
  DAMAGE_NUMBERS_ENABLED,
  DEFAULT_TOWER_COST,
  DEV_FPS_REPORT_INTERVAL_MS,
  EARLY_WAVE_START_BONUS_PLACEHOLDER_ELIGIBLE,
  ENTRANCE_CELL,
  ENTRANCE_EXIT_LABEL_COLOR,
  ENTRANCE_EXIT_LABEL_FONT_FAMILY,
  ENTRANCE_EXIT_LABEL_FONT_SIZE_PX,
  ENTRANCE_EXIT_LABEL_RENDER_DEPTH,
  EXIT_CELL,
  GRID_BUILD_ALPHA,
  GRID_IDLE_ALPHA,
  GRID_LINE_COLOR,
  GRID_LINE_WIDTH,
  GRID_OVERLAY_RENDER_DEPTH,
  GRID_PIXEL_HEIGHT,
  GRID_PIXEL_WIDTH,
  IMPACT_EFFECT_LIFETIME_MS,
  IMPACT_EFFECT_RENDER_DEPTH,
  INITIAL_PLAYER_RESOURCES,
  PLAGUE_TOWER_CONFIG,
  PLAGUE_TOWER_ORIGIN_X,
  PLAGUE_TOWER_ORIGIN_Y,
  PREVIEW_INVALID_FILL,
  PREVIEW_INVALID_STROKE,
  PREVIEW_VALID_FILL,
  PREVIEW_VALID_STROKE,
  PROJECTILE_DISPLAY_SIZE_PX,
  PROJECTILE_MAX_LIFETIME_MS,
  PROJECTILE_MIN_LIFETIME_MS,
  PROJECTILE_RENDER_DEPTH,
  RESTART_DELAY_MS,
  SELL_REFUND_RATIO,
  TERRAIN_BASE_TILE_ALPHA,
  TERRAIN_BASE_TILE_TINT,
  TERRAIN_DECORATION_TILE_ALPHA,
  TERRAIN_DECORATION_TILE_TINT,
  TERRAIN_RENDER_DEPTH,
  TOUCH_LONG_PRESS_MIN_DURATION_MS,
  TOUCH_TAP_MAX_DURATION_MS,
  TOUCH_TAP_MAX_MOVE_PX,
  TOUCH_TAP_MIN_DURATION_MS,
  TOWER_RENDER_DEPTH,
  TOWER_VISUAL_SCALE_IN_CELLS,
  WAVE_FIRST_SPAWN_DELAY_MS,
  WAVE_SPAWN_INTERVAL_MS,
} from './gameScene.constants';
import {
  buildHudWaveQueue,
  mapEnemyFactionToHudFaction,
  mapUnitToCreepType,
} from './gameScene.helpers';
import type {
  CreepRenderState,
  DamageNumberState,
  ImpactEffectState,
  PendingWaveSpawn,
  ProjectileState,
  TowerRenderState,
} from './gameScene.types';

export class GameScene extends Phaser.Scene {
  public static readonly KEY = 'GameScene';
  private isSceneCleanedUp = false;
  private hoveredCell: GridPosition | null = null;
  private gridModel: GridModel | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private terrainSprites: Phaser.GameObjects.Image[] = [];
  private gridLabels: Phaser.GameObjects.Text[] = [];
  private buildPreviewOverlay: Phaser.GameObjects.Graphics | null = null;
  private pathCellKeys = new Set<string>();
  private placedTowerCostsByCellKey = new Map<string, number>();
  private playerGold = INITIAL_PLAYER_RESOURCES.gold;
  private playerLives = INITIAL_PLAYER_RESOURCES.lives;
  private wavePhaseState: WavePhaseState = createInitialWavePhaseState();
  private isGameOver = false;
  private isWaveCompletionRewardGranted = false;
  private nextWaveStartsAtMs: number | null = null;
  private restartScheduledAtMs: number | null = null;
  private currentWaveNumber = 1;
  private activeCreepPath: GridPosition[] = [];
  private activeCreeps: CreepRenderState[] = [];
  private opponentCreeps: CreepRenderState[] = [];
  private pendingWaveSpawns: PendingWaveSpawn[] = [];
  private activeTowers: TowerRenderState[] = [];
  private opponentTowers: TowerRenderState[] = [];
  private activeProjectiles: ProjectileState[] = [];
  private activeImpactEffects: ImpactEffectState[] = [];
  private activeDamageNumbers: DamageNumberState[] = [];
  private pointerMoveHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerAudioUnlockHandler: (() => void) | null = null;
  private scaleResizeHandler: (() => void) | null = null;
  private gameOutHandler: (() => void) | null = null;
  private unsubscribeStartWaveCommand: (() => void) | null = null;
  private unsubscribeTowerSelectCommand: (() => void) | null = null;
  private unsubscribeFactionSelectCommand: (() => void) | null = null;
  private unsubscribeUpgradeTowerCommand: (() => void) | null = null;
  private unsubscribeSellTowerCommand: (() => void) | null = null;
  private unsubscribeBattlefieldViewEvent: (() => void) | null = null;
  private selectedTowerType: 'archer' | 'splash' | null = null;
  private selectedBuilderFactionId = DEFAULT_BUILDER_FACTION;
  private selectedFaction: HudFactionType = 'undead';
  private selectedDifficulty: Difficulty = DEFAULT_DIFFICULTY;
  private duelMatchState: DuelMatchState = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.UNDEAD);
  private matchOutcomeStatus: MatchOutcomeStatus = 'active';
  private matchWinner: HudFactionType | null = null;
  private activeBattlefieldView: BattlefieldView = 'player';
  private readonly mapSeed = 1337;
  private inputControllerState: InputControllerState = {
    activeTouchGesture: null,
    lastActionAtMs: Number.NEGATIVE_INFINITY,
  };
  private devFpsReportElapsedMs = 0;
  private lastPublishedAutoStartSecondsLeft: number | null = null;
  private soundManager: GameAudioManager | null = null;
  private readonly combatRuntimeConfig: CombatRuntimeConfig = {
    archerProjectileVisualMode: ARCHER_PROJECTILE_VISUAL_MODE,
    creepBaseColor: CREEP_BASE_COLOR,
    creepHitFlashColor: CREEP_HIT_FLASH_COLOR,
    creepHitFlashDurationMs: CREEP_HIT_FLASH_DURATION_MS,
    creepDeathFadeDurationMs: CREEP_DEATH_FADE_DURATION_MS,
    projectileMinLifetimeMs: PROJECTILE_MIN_LIFETIME_MS,
    projectileMaxLifetimeMs: PROJECTILE_MAX_LIFETIME_MS,
    projectileDisplaySizePx: PROJECTILE_DISPLAY_SIZE_PX,
    projectileRenderDepth: PROJECTILE_RENDER_DEPTH,
    impactEffectLifetimeMs: IMPACT_EFFECT_LIFETIME_MS,
    impactEffectRenderDepth: IMPACT_EFFECT_RENDER_DEPTH,
    damageNumbersEnabled: DAMAGE_NUMBERS_ENABLED,
    damageNumberLifetimeMs: DAMAGE_NUMBER_LIFETIME_MS,
    damageNumberRisePx: DAMAGE_NUMBER_RISE_PX,
  };
  private readonly waveRuntimeConfig: WaveRuntimeConfig = {
    autoWaveStartDelayMs: AUTO_WAVE_START_DELAY_MS,
    waveSpawnIntervalMs: WAVE_SPAWN_INTERVAL_MS,
    waveFirstSpawnDelayMs: WAVE_FIRST_SPAWN_DELAY_MS,
    earlyWaveStartBonusPlaceholderEligible: EARLY_WAVE_START_BONUS_PLACEHOLDER_ELIGIBLE,
  };
  private readonly inputControllerConfig: InputControllerConfig = {
    actionCooldownMs: ACTION_COOLDOWN_MS,
    touchTapMinDurationMs: TOUCH_TAP_MIN_DURATION_MS,
    touchTapMaxDurationMs: TOUCH_TAP_MAX_DURATION_MS,
    touchTapMaxMovePx: TOUCH_TAP_MAX_MOVE_PX,
    touchLongPressMinDurationMs: TOUCH_LONG_PRESS_MIN_DURATION_MS,
  };
  private readonly gridPreviewConfig: GridPreviewConfig = {
    previewValidFill: PREVIEW_VALID_FILL,
    previewValidStroke: PREVIEW_VALID_STROKE,
    previewInvalidFill: PREVIEW_INVALID_FILL,
    previewInvalidStroke: PREVIEW_INVALID_STROKE,
    gridBuildAlpha: GRID_BUILD_ALPHA,
    gridIdleAlpha: GRID_IDLE_ALPHA,
  };
  private readonly gridRendererConfig: GridRendererConfig = {
    terrainRenderDepth: TERRAIN_RENDER_DEPTH,
    terrainBaseTileAlpha: TERRAIN_BASE_TILE_ALPHA,
    terrainDecorationTileAlpha: TERRAIN_DECORATION_TILE_ALPHA,
    terrainBaseTileTint: TERRAIN_BASE_TILE_TINT,
    terrainDecorationTileTint: TERRAIN_DECORATION_TILE_TINT,
    gridLineWidth: GRID_LINE_WIDTH,
    gridLineColor: GRID_LINE_COLOR,
    gridBuildAlpha: GRID_BUILD_ALPHA,
    entranceExitLabelFontFamily: ENTRANCE_EXIT_LABEL_FONT_FAMILY,
    entranceExitLabelFontSizePx: ENTRANCE_EXIT_LABEL_FONT_SIZE_PX,
    entranceExitLabelColor: ENTRANCE_EXIT_LABEL_COLOR,
    entranceExitLabelRenderDepth: ENTRANCE_EXIT_LABEL_RENDER_DEPTH,
  };
  private readonly movementRuntimeConfig: MovementRuntimeConfig = {
    creepMaxSimulationDeltaMs: CREEP_MAX_SIMULATION_DELTA_MS,
    creepBaseMoveSpeedPxPerSec: CREEP_BASE_MOVE_SPEED_PX_PER_SEC,
    restartDelayMs: RESTART_DELAY_MS,
  };

  constructor() {
    super(GameScene.KEY);
  }

  public preload(): void {
    this.soundManager = new GameAudioManager(this);
    this.soundManager.preload();

    const factions = Object.keys(TILES) as Faction[];
    factions.forEach((faction) => {
      const urls = [TILES[faction].ground, TILES[faction].path, ...PROPS[faction]];
      urls.forEach((url) => {
        const textureKey = `terrain:${faction}:${url}`;
        if (!this.textures.exists(textureKey)) {
          this.load.image(textureKey, url);
        }
      });
    });

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      factions.forEach((faction) => {
        const urls = [TILES[faction].ground, TILES[faction].path, ...PROPS[faction]];
        urls.forEach((url) => {
          const textureKey = `terrain:${faction}:${url}`;
          if (this.textures.exists(textureKey)) {
            this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
          }
        });
      });
    });

    Object.entries(UNIT_SPRITE_ASSETS).forEach(([key, assetPath]) => {
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, assetPath, {
          frameWidth: UNIT_SPRITE_SHEET_FRAME.width,
          frameHeight: UNIT_SPRITE_SHEET_FRAME.height,
        });
      }
    });

    Object.entries(TOWER_SPRITE_ASSETS).forEach(([key, assetPath]) => {
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, assetPath, {
          frameWidth: TOWER_SPRITE_SHEET_FRAME.width,
          frameHeight: TOWER_SPRITE_SHEET_FRAME.height,
        });
      }
    });
  }

  public create(): void {
    this.isSceneCleanedUp = false;
    this.loadSetupConfig();
    this.cameras.main.setBackgroundColor('#1a1f2c');
    this.cameras.main.roundPixels = true;
    this.applyNearestNeighborFiltering();
    this.registerScaleResizeHandling();
    this.drawGrid();
    this.registerGridHoverDetection();
    this.buildPreviewOverlay = this.add.graphics();
    this.buildPreviewOverlay.setDepth(BUILD_PREVIEW_RENDER_DEPTH);
    this.input.mouse?.disableContextMenu();
    this.registerMobileAudioUnlock();
    this.registerPointerInteractionForAudio();
    this.soundManager?.setFaction(this.selectedFaction);
    if (!this.anims.exists(UNIT_ANIMATION_KEYS.UNDEAD_SKELETON_WALK)) {
      this.anims.create({
        key: UNIT_ANIMATION_KEYS.UNDEAD_SKELETON_WALK,
        frames: this.anims.generateFrameNumbers(UNIT_SPRITE_KEYS.UNDEAD_SKELETON, {
          start: 0,
          end: 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists(UNIT_ANIMATION_KEYS.UNDEAD_GHOUL_WALK)) {
      this.anims.create({
        key: UNIT_ANIMATION_KEYS.UNDEAD_GHOUL_WALK,
        frames: this.anims.generateFrameNumbers(UNIT_SPRITE_KEYS.UNDEAD_GHOUL, {
          start: 0,
          end: 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists(UNIT_ANIMATION_KEYS.UNDEAD_CRYPT_FIEND_WALK)) {
      this.anims.create({
        key: UNIT_ANIMATION_KEYS.UNDEAD_CRYPT_FIEND_WALK,
        frames: this.anims.generateFrameNumbers(UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND, {
          start: 0,
          end: 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists(UNIT_ANIMATION_KEYS.UNDEAD_GARGOYLE_WALK)) {
      this.anims.create({
        key: UNIT_ANIMATION_KEYS.UNDEAD_GARGOYLE_WALK,
        frames: this.anims.generateFrameNumbers(UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE, {
          start: 0,
          end: 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    this.createTowerAnimations();
    this.unsubscribeStartWaveCommand = onGameCommand('start-wave', () => {
      this.handleStartWaveCommand();
    });
    this.unsubscribeTowerSelectCommand = onGameCommand('select-tower', (payload) => {
      this.selectedTowerType = payload.towerType;
      this.registry.set('ui.selectedTowerType', this.selectedTowerType ?? 'none');
      this.publishHudSnapshot();
    });
    this.unsubscribeFactionSelectCommand = onGameCommand('select-faction', (payload) => {
      this.selectedFaction = payload.faction;
      if (this.canPerformBuildActions()) {
        this.duelMatchState = createInitialDuelMatchState(
          RaceId.UNDEAD,
          this.mapHudFactionToRaceId(this.selectedFaction),
        );
        this.playerLives = this.duelMatchState.player.hp;
      }
      this.soundManager?.setFaction(this.selectedFaction);
      this.registry.set('wave.selectedFaction', this.selectedFaction);
      this.publishHudSnapshot();
    });
    this.unsubscribeUpgradeTowerCommand = onGameCommand('upgrade-tower', (payload) => {
      this.handleUpgradeTowerCommand(payload.towerId);
    });
    this.unsubscribeSellTowerCommand = onGameCommand('sell-tower', (payload) => {
      this.handleSellTowerCommand(payload.towerId);
    });
    this.unsubscribeBattlefieldViewEvent = onGameEvent('battlefield-view-changed', (payload) => {
      if (!payload.accepted) {
        return;
      }

      this.activeBattlefieldView = payload.activeView;
      this.renderVisibleBattlefield();
      this.publishHudSnapshot();
    });
    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lives', this.playerLives);
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.registry.set('phase.game.over', this.isGameOver);
    this.registry.set('economy.earlyWaveStartBonus.granted', false);
    this.updateGridOverlayVisualState();
    this.publishHudSnapshot();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown, this);
  }

  public update(_time: number, delta: number): void {
    this.updateAutoWaveCountdown(_time);
    this.tryRestartRun(_time);

    if (this.isGameOver) {
      return;
    }

    this.processPendingWaveSpawns(_time);
    this.moveCreepsAlongPath(delta);
    this.moveOpponentCreepsAlongPath(delta);
    this.updateTowerCombat(delta);
    this.updateCreepHitFeedback(delta);
    this.removeDeadCreepsFromActiveWave(delta);
    this.applyWaveCompletionRewardIfResolved();
    this.tryStartNextWave(_time);
    this.updateProjectiles(delta);
    this.updateImpactEffects(delta);
    this.updateDamageNumbers(delta);
    this.updatePerformanceTelemetry(delta);
  }

  private drawGrid(): void {
    const rendererState = this.getGridRendererState();
    const grid = drawGridRuntime(
      rendererState,
      this.getGridRendererDeps(),
      this.gridRendererConfig,
      GRID_OVERLAY_RENDER_DEPTH,
    );
    this.applyGridRendererState(rendererState);
    this.gridModel = grid;
    this.updateGridOverlayVisualState();
    this.initializeWaveRuntime(grid);
  }

  private initializeWaveRuntime(grid: GridModel): void {
    const state = this.getWaveRuntimeState();
    initializeWaveRuntimeModule(
      state,
      this.waveRuntimeConfig,
      this.getWaveRuntimeDependencies(),
      grid,
    );
    this.activeCreepPath = state.activeCreepPath;
    this.activeCreeps = state.activeCreeps;
    this.playerGold = state.playerGold;
    this.nextWaveStartsAtMs = state.nextWaveStartsAtMs;
    this.destroyAllTowerSprites();
    this.activeTowers = [];
    this.destroyOpponentBattlefieldRenderState();
    this.isWaveCompletionRewardGranted = state.isWaveCompletionRewardGranted;
  }

  private registerGridHoverDetection(): void {
    this.pointerMoveHandler = this.handlePointerMove.bind(this);
    this.pointerDownHandler = this.handlePointerDown.bind(this);
    this.pointerUpHandler = this.handlePointerUp.bind(this);
    this.gameOutHandler = this.handleGameOut.bind(this);

    this.input.on('pointermove', this.pointerMoveHandler);
    this.input.on('pointerdown', this.pointerDownHandler);
    this.input.on('pointerup', this.pointerUpHandler);
    this.input.on('gameout', this.gameOutHandler);
  }

  private registerMobileAudioUnlock(): void {
    const unlockAudio = () => {
      this.soundManager?.unlock();
      this.ensureBaseAmbientPlaying();
    };

    this.input.once('pointerdown', unlockAudio);
    this.input.keyboard?.once('keydown', unlockAudio);
  }

  private registerPointerInteractionForAudio(): void {
    const handleInteraction = () => {
      if (!this.soundManager) {
        return;
      }
      this.soundManager.unlock();
      this.ensureBaseAmbientPlaying();
    };

    this.pointerAudioUnlockHandler = handleInteraction;
    this.input.on('pointerdown', handleInteraction);
  }

  private ensureBaseAmbientPlaying(): void {
    if (!this.soundManager?.isPlaying('ambient.map')) {
      this.soundManager?.play('ambient.map');
    }
  }

  private registerScaleResizeHandling(): void {
    this.scaleResizeHandler = this.applyResponsiveCamera.bind(this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.scaleResizeHandler);
    this.applyResponsiveCamera();
  }

  private applyResponsiveCamera(): void {
    const viewportWidth = this.scale.width;
    const viewportHeight = this.scale.height;
    const zoom = Math.min(viewportWidth / GRID_PIXEL_WIDTH, viewportHeight / GRID_PIXEL_HEIGHT);
    const worldViewHeight = viewportHeight / zoom;
    const verticalOverflow = Math.max(0, worldViewHeight - GRID_PIXEL_HEIGHT);
    const centerY = GRID_PIXEL_HEIGHT / 2 + verticalOverflow / 2;

    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(0, 0, GRID_PIXEL_WIDTH, GRID_PIXEL_HEIGHT, true);
    this.cameras.main.centerOn(GRID_PIXEL_WIDTH / 2, centerY);
  }

  private toGridCell(worldX: number, worldY: number): GridPosition | null {
    return toGridCellRuntime(worldX, worldY);
  }

  private updateHoveredCellDebugRegistry(): void {
    return;
  }

  private getCombatRuntimeState(): CombatRuntimeState {
    return {
      activeCreeps: this.activeCreeps,
      activeTowers: this.activeTowers,
      activeProjectiles: this.activeProjectiles,
      activeImpactEffects: this.activeImpactEffects,
      activeDamageNumbers: this.activeDamageNumbers,
      playerGold: this.playerGold,
      playerLives: this.playerLives,
    };
  }

  private applyCombatRuntimeState(state: CombatRuntimeState): void {
    this.activeCreeps = state.activeCreeps;
    this.activeTowers = state.activeTowers;
    this.activeProjectiles = state.activeProjectiles;
    this.activeImpactEffects = state.activeImpactEffects;
    this.activeDamageNumbers = state.activeDamageNumbers;
    this.playerGold = state.playerGold;
    this.playerLives = state.playerLives;
  }

  private getWaveRuntimeState(): WaveRuntimeState {
    return {
      activeCreepPath: this.activeCreepPath,
      activeCreeps: this.activeCreeps,
      pendingWaveSpawns: this.pendingWaveSpawns,
      wavePhaseState: this.wavePhaseState,
      isWaveCompletionRewardGranted: this.isWaveCompletionRewardGranted,
      nextWaveStartsAtMs: this.nextWaveStartsAtMs,
      restartScheduledAtMs: this.restartScheduledAtMs,
      playerGold: this.playerGold,
      playerLives: this.playerLives,
      isGameOver: this.isGameOver,
      currentWaveNumber: this.currentWaveNumber,
      lastPublishedAutoStartSecondsLeft: this.lastPublishedAutoStartSecondsLeft,
    };
  }

  private getCombatRuntimeDependencies(): CombatRuntimeDependencies {
    return {
      scene: this,
      toCellCenter: (position) => this.toCellCenter(position),
      playArcherAttackAnimation: (tower) => this.playArcherAttackAnimation(tower),
      playSplashAttackAnimation: (tower) => this.playPlagueAttackAnimation(tower),
      playSound: (soundId: SoundId) => {
        if (soundId === 'combat.tower_attack.archer' || soundId === 'combat.tower_attack.splash') {
          this.soundManager?.playFactionVariant(soundId);
          return;
        }
        this.soundManager?.play(soundId);
      },
      onGoldUpdated: (nextGold) => {
        this.playerGold = nextGold;
        this.registry.set('economy.gold', this.playerGold);
      },
      onHudChanged: () => this.publishHudSnapshot(),
    };
  }

  private getWaveRuntimeDependencies(): WaveRuntimeDependencies {
    return {
      nowMs: () => this.time.now,
      getSelectedFactionUnits: () => this.getSelectedFactionUnits(),
      getAdditionalWaveUnits: () => this.getComputerSendWaveUnits(),
      getSpriteKeyByUnit: (unit) => this.getSpriteKeyByUnit(unit),
      getAnimationKeyByUnit: (unit) => this.getAnimationKeyByUnit(unit),
      getCreepTypeFromUnit: (unit) => this.getCreepTypeFromUnit(unit),
      toCellCenter: (position) => this.toCellCenter(position),
      onGoldUpdated: (nextGold) => {
        this.playerGold = nextGold;
        this.registry.set('economy.gold', this.playerGold);
      },
      onWavePhaseChanged: (nextPhase) => {
        this.wavePhaseState = nextPhase;
      },
      onBuildStateUpdated: () => {
        this.registry.set('phase.build.active', this.canPerformBuildActions());
        this.updateGridOverlayVisualState();
        this.updateBuildPreview();
      },
      onHudChanged: () => this.publishHudSnapshot(),
      createCreepSprite: (x, y, spriteKey) => this.add.sprite(x, y, spriteKey, 0),
      playSound: (soundId: SoundId) => this.soundManager?.play(soundId),
    };
  }

  private getInputControllerDependencies(): InputControllerDependencies {
    return {
      nowMs: () => this.time.now,
      toGridCell: (worldX, worldY) => this.toGridCell(worldX, worldY),
      setHoveredCell: (cell) => {
        this.hoveredCell = cell;
      },
      clearHoveredCell: () => {
        this.hoveredCell = null;
      },
      updateHoveredCellDebugRegistry: () => this.updateHoveredCellDebugRegistry(),
      updateBuildPreview: () => this.updateBuildPreview(),
      tryPlaceTowerAtHoveredCell: () => this.tryPlaceTowerAtHoveredCell(),
      trySellTowerAtHoveredCell: () => this.trySellTowerAtHoveredCell(),
    };
  }

  private getBuildRuntimeState(): BuildRuntimeState {
    return {
      gridModel: this.gridModel,
      hoveredCell: this.hoveredCell,
      playerGold: this.playerGold,
      playerLives: this.playerLives,
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
        const towerConfig = this.getBuildableTowerConfig(towerType);
        return towerConfig?.costGold ?? DEFAULT_TOWER_COST;
      },
      toGridCellKey: (position) => this.toGridCellKey(position),
      toTowerId: (position) => this.toTowerId(position),
      validateTowerPlacementPath: (grid, position) => validateTowerPlacementPath(grid, position),
      sellRefundRatio: SELL_REFUND_RATIO,
      defaultTowerCost: DEFAULT_TOWER_COST,
    };
  }

  private getMovementRuntimeState(): MovementRuntimeState {
    return {
      activeCreeps: this.activeCreeps,
      activeCreepPath: this.activeCreepPath,
      playerGold: this.playerGold,
      playerLives: this.playerLives,
      isGameOver: this.isGameOver,
      restartScheduledAtMs: this.restartScheduledAtMs,
      wavePhaseState: this.wavePhaseState,
    };
  }

  private getMovementRuntimeDeps(): MovementRuntimeDeps {
    return {
      nowMs: () => this.time.now,
      toCellCenter: (position) => this.toCellCenter(position),
      onLivesUpdated: (lives) => {
        this.playerLives = lives;
        this.registry.set('economy.lives', this.duelMatchState.player.hp);
      },
      onGameOverUpdated: (isGameOver) => {
        this.isGameOver = isGameOver;
        this.registry.set('phase.game.over', this.isGameOver);
        if (isGameOver) {
          this.soundManager?.stopSound('ambient.tension');
          this.ensureBaseAmbientPlaying();
        }
      },
      shouldEndRunOnLivesDepleted: () => false,
      onWavePhaseUpdated: (nextWavePhase) => {
        this.wavePhaseState = nextWavePhase;
      },
      onEscapedCountUpdated: (escapedCount) => {
        this.registry.set('wave.escapedCreeps', escapedCount);
      },
      onBuildStateNeedsRefresh: () => {
        this.registry.set('phase.build.active', this.canPerformBuildActions());
        this.updateGridOverlayVisualState();
        this.updateBuildPreview();
      },
      onHudChanged: () => this.publishHudSnapshot(),
      playSound: (soundId: SoundId) => this.soundManager?.play(soundId),
    };
  }

  private getDuelMatchRuntimeState(): DuelMatchRuntimeState {
    return {
      duelMatchState: this.duelMatchState,
      wavePhaseState: this.wavePhaseState,
      isGameOver: this.isGameOver,
      nextWaveStartsAtMs: this.nextWaveStartsAtMs,
      restartScheduledAtMs: this.restartScheduledAtMs,
    };
  }

  private applyDuelMatchRuntimeState(state: DuelMatchRuntimeState): void {
    this.duelMatchState = state.duelMatchState;
    this.wavePhaseState = state.wavePhaseState;
    this.isGameOver = state.isGameOver;
    this.nextWaveStartsAtMs = state.nextWaveStartsAtMs;
    this.restartScheduledAtMs = state.restartScheduledAtMs;
  }

  private getDuelMatchRuntimeDeps(): DuelMatchRuntimeDeps {
    return {
      onDuelMatchStateUpdated: (state) => {
        this.duelMatchState = state;
        this.playerLives = state.player.hp;
        this.registry.set('economy.lives', this.playerLives);
        this.registry.set('duel.opponent.hp', state.opponent.hp);
      },
      onGameOverUpdated: (isGameOver) => {
        this.isGameOver = isGameOver;
        this.registry.set('phase.game.over', this.isGameOver);
        if (isGameOver) {
          this.soundManager?.stopSound('ambient.tension');
          this.ensureBaseAmbientPlaying();
        }
      },
      onWavePhaseUpdated: (nextWavePhase) => {
        this.wavePhaseState = nextWavePhase;
      },
      onBuildStateNeedsRefresh: () => {
        this.registry.set('phase.build.active', this.canPerformBuildActions());
        this.updateGridOverlayVisualState();
        this.updateBuildPreview();
      },
      playGameOverSound: () => this.soundManager?.play('ui.game_over'),
    };
  }

  private getGridRendererState(): GridRendererState {
    return {
      gridGraphics: this.gridGraphics,
      terrainSprites: this.terrainSprites,
      gridLabels: this.gridLabels,
    };
  }

  private applyGridRendererState(state: GridRendererState): void {
    this.gridGraphics = state.gridGraphics;
    this.terrainSprites = state.terrainSprites;
    this.gridLabels = state.gridLabels;
  }

  private getGridRendererDeps(): GridRendererDeps {
    return {
      scene: this,
      selectedBuilderFactionId: this.selectedBuilderFactionId,
      pathCellKeys: this.pathCellKeys,
      mapSeed: this.mapSeed,
      createGridModel: () =>
        createGridModel({
          entrance: ENTRANCE_CELL,
          exit: EXIT_CELL,
        }),
    };
  }

  private getSelectedTowerRangeCells(): number {
    const towerType = this.selectedTowerType ?? 'archer';
    if (towerType === 'splash') {
      return TowerCombatConfig.SPLASH_RANGE_CELLS;
    }
    return TowerCombatConfig.ARCHER_RANGE_CELLS;
  }

  private updateBuildPreview(): void {
    updateBuildPreviewRuntime(
      {
        overlay: this.buildPreviewOverlay,
        gridGraphics: this.gridGraphics,
        gridModel: this.gridModel,
        hoveredCell: this.hoveredCell,
        canPerformBuildActions: this.canPerformBuildActions(),
        selectedTowerRangeCells: this.getSelectedTowerRangeCells(),
        isBuildCellValid: (cellPosition, grid) => this.isBuildCellValid(cellPosition, grid),
      },
      this.gridPreviewConfig,
    );
  }

  private moveCreepsAlongPath(deltaMs: number): void {
    const state = this.getMovementRuntimeState();
    moveCreepsAlongPathRuntime(
      state,
      this.getMovementRuntimeDeps(),
      this.movementRuntimeConfig,
      deltaMs,
    );
    this.playerLives = state.playerLives;
    this.isGameOver = state.isGameOver;
    this.restartScheduledAtMs = state.restartScheduledAtMs;
    this.wavePhaseState = state.wavePhaseState;
  }

  private moveOpponentCreepsAlongPath(deltaMs: number): void {
    if (this.opponentCreeps.length === 0) {
      return;
    }

    const state: MovementRuntimeState = {
      activeCreeps: this.opponentCreeps,
      activeCreepPath: this.duelMatchState.opponent.battlefield.path,
      playerGold: this.duelMatchState.opponent.gold,
      playerLives: this.duelMatchState.opponent.hp,
      isGameOver: this.isGameOver,
      restartScheduledAtMs: this.restartScheduledAtMs,
      wavePhaseState: this.wavePhaseState,
    };

    moveCreepsAlongPathRuntime(
      state,
      {
        ...this.getMovementRuntimeDeps(),
        onLivesUpdated: () => undefined,
        onGameOverUpdated: () => undefined,
        shouldEndRunOnLivesDepleted: () => false,
        onWavePhaseUpdated: () => undefined,
        onEscapedCountUpdated: (escapedCount) => {
          this.registry.set('duel.opponent.escapedCreeps', escapedCount);
        },
        onBuildStateNeedsRefresh: () => undefined,
        onHudChanged: () => this.publishHudSnapshot(),
      },
      this.movementRuntimeConfig,
      deltaMs,
    );

    this.opponentCreeps = state.activeCreeps;
  }

  private isBuildCellValid(cellPosition: GridPosition, grid: GridModel): boolean {
    return isBuildCellValidRuntime(
      this.getBuildRuntimeState(),
      this.getBuildRuntimeDeps(),
      cellPosition,
      grid,
    );
  }

  private tryPlaceTowerAtHoveredCell(): void {
    if (this.activeBattlefieldView !== 'player') {
      return;
    }

    const result = tryPlaceTowerAtHoveredCellRuntime(
      this.getBuildRuntimeState(),
      this.getBuildRuntimeDeps(),
    );
    if (!result.success || !result.changedCell || !result.placedTower || !result.towerType) {
      this.soundManager?.play('combat.invalid_build');
      return;
    }

    const towerSprite =
      result.towerType === 'splash'
        ? this.createPlacedPlagueSprite(result.placedTower.position)
        : this.createPlacedArcherSprite(result.placedTower.position);
    this.activeTowers.push({
      entity: result.placedTower,
      runtime: createInitialTowerCombatRuntime(),
      sprite: towerSprite,
    });
    this.playerGold = result.playerGold;
    this.registry.set('economy.gold', this.playerGold);
    this.soundManager?.play('combat.successful_build');
    this.soundManager?.play('economy.gold_spent');
    this.markUserActionProcessed();
    this.publishHudSnapshot();

    this.drawGridCell(result.changedCell);
    this.updateBuildPreview();
  }

  private trySellTowerAtHoveredCell(): void {
    if (this.activeBattlefieldView !== 'player') {
      return;
    }

    const result = trySellTowerAtHoveredCellRuntime(
      this.getBuildRuntimeState(),
      this.getBuildRuntimeDeps(),
    );
    if (!result.success || !result.changedCell || !result.removedTowerId) {
      return;
    }

    this.activeTowers = this.activeTowers.filter((tower) => {
      const shouldKeep = tower.entity.id !== result.removedTowerId;
      if (!shouldKeep) {
        this.playBoneArcherSellAnimation(tower);
      }
      return shouldKeep;
    });
    this.registry.set('economy.lastSellRefund', result.refundAmount);
    this.soundManager?.play('combat.sell_tower');
    this.soundManager?.play('economy.refund');
    this.markUserActionProcessed();
    this.publishHudSnapshot();
    publishGameEvent('selected-tower', { tower: null });

    this.drawGridCell(result.changedCell);
    this.updateBuildPreview();
  }

  private trySelectTowerAtHoveredCell(): boolean {
    if (!this.hoveredCell || !this.gridModel) {
      return false;
    }

    const tower = this.findTowerAtPosition(this.hoveredCell);
    if (!tower) {
      return false;
    }

    const snapshot: SelectedTowerSnapshot = {
      id: tower.entity.id,
      type: tower.entity.type,
      level: tower.entity.level,
      position: { x: tower.entity.position.x, y: tower.entity.position.y },
      cost: tower.entity.cost,
      combatStats: { ...tower.entity.combatStats },
    };

    publishGameEvent('selected-tower', { tower: snapshot });
    this.soundManager?.play('ui.click');
    return true;
  }

  private findTowerAtPosition(position: GridPosition): TowerRenderState | undefined {
    return this.activeTowers.find(
      (tower) => tower.entity.position.x === position.x && tower.entity.position.y === position.y,
    );
  }

  private handleUpgradeTowerCommand(towerId: string): void {
    if (this.isGameOver || !this.canPerformBuildActions()) {
      return;
    }

    const tower = this.activeTowers.find((t) => t.entity.id === towerId);
    if (!tower) {
      return;
    }

    const { entity } = tower;
    const upgradeCheck = canAffordUpgrade(entity.type, entity.level, this.playerGold);
    if (!upgradeCheck.allowed) {
      this.soundManager?.play('combat.invalid_build');
      return;
    }

    const upgradeCost = getUpgradeCost(entity.type, entity.level);
    if (upgradeCost === null || upgradeCost <= 0) {
      return;
    }

    const nextLevel = entity.level + 1;
    const nextStats = getTowerStatsForLevel(entity.type, nextLevel);
    if (!nextStats) {
      return;
    }

    const spendResult = spendGold(
      { gold: this.playerGold, lives: this.playerLives },
      upgradeCost,
    );
    if (!spendResult.spent) {
      this.soundManager?.play('combat.invalid_build');
      return;
    }

    entity.level = nextLevel;
    entity.combatStats = { ...nextStats };
    this.playerGold = spendResult.resources.gold;
    this.registry.set('economy.gold', this.playerGold);
    this.soundManager?.play('ui.success');
    this.soundManager?.play('economy.gold_spent');
    this.publishHudSnapshot();

    publishGameEvent('selected-tower', {
      tower: {
        id: entity.id,
        type: entity.type,
        level: entity.level,
        position: { x: entity.position.x, y: entity.position.y },
        cost: entity.cost,
        combatStats: { ...entity.combatStats },
      },
    });
  }

  private handleSellTowerCommand(towerId: string): void {
    if (this.isGameOver || !this.canPerformBuildActions()) {
      return;
    }

    const tower = this.activeTowers.find((t) => t.entity.id === towerId);
    if (!tower) {
      return;
    }

    this.activeTowers = this.activeTowers.filter((t) => t.entity.id !== towerId);
    this.playBoneArcherSellAnimation(tower);

    const sellRefundRatio = SELL_REFUND_RATIO;
    const refundAmount = Math.floor(tower.entity.cost * sellRefundRatio);
    this.playerGold += refundAmount;
    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lastSellRefund', refundAmount);

    const cell = this.gridModel?.cells.find(
      (c) => c.x === tower.entity.position.x && c.y === tower.entity.position.y,
    );
    if (cell) {
      cell.isOccupied = false;
      cell.isWalkable = true;
      this.drawGridCell(cell);
    }

    this.soundManager?.play('combat.sell_tower');
    this.soundManager?.play('economy.refund');
    this.publishHudSnapshot();
    publishGameEvent('selected-tower', { tower: null });
    this.updateBuildPreview();
  }

  private drawGridCell(cell: GridCell): void {
    const rendererState = this.getGridRendererState();
    drawGridCellRuntime(rendererState, this.getGridRendererDeps(), this.gridRendererConfig, cell);
    this.applyGridRendererState(rendererState);
  }

  private updateGridOverlayVisualState(): void {
    updateGridOverlayVisualStateRuntime(
      this.gridGraphics,
      this.canPerformBuildActions(),
      this.gridPreviewConfig,
    );
  }

  private applyNearestNeighborFiltering(): void {
    Object.values(UNIT_SPRITE_KEYS).forEach((spriteKey) => {
      if (this.textures.exists(spriteKey)) {
        this.textures.get(spriteKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });
    Object.values(TOWER_SPRITE_KEYS).forEach((spriteKey) => {
      if (this.textures.exists(spriteKey)) {
        this.textures.get(spriteKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });
  }

  private clearTerrainSprites(): void {
    const rendererState = this.getGridRendererState();
    clearTerrainSpritesRuntime(rendererState);
    this.applyGridRendererState(rendererState);
  }

  private clearGridLabels(): void {
    const rendererState = this.getGridRendererState();
    clearGridLabelsRuntime(rendererState);
    this.applyGridRendererState(rendererState);
  }

  private toGridCellKey(position: GridPosition): string {
    return `${position.x}:${position.y}`;
  }

  private toTowerId(position: GridPosition): string {
    return `tower:${position.x}:${position.y}`;
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

  private loadSetupConfig(): void {
    const setupConfig = getGameSetupConfig();
    if (setupConfig) {
      this.selectedBuilderFactionId = setupConfig.builderFaction;
      this.selectedFaction = mapEnemyFactionToHudFaction(setupConfig.enemyFaction);
      this.selectedDifficulty = setupConfig.difficulty;
      this.registry.set('game.setup', setupConfig);
    }

    this.duelMatchState = createInitialDuelMatchState(
      RaceId.UNDEAD,
      this.mapHudFactionToRaceId(this.selectedFaction),
    );
  }

  private toCellCenter(position: GridPosition): { x: number; y: number } {
    return {
      x: position.x * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2,
      y: position.y * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2,
    };
  }

  private removeDeadCreepsFromActiveWave(deltaMs: number): void {
    this.activeCreeps = removeDeadCreepsFromCombatRuntime(
      this.activeCreeps,
      deltaMs,
      this.combatRuntimeConfig.creepDeathFadeDurationMs,
    );
  }

  private updateTowerCombat(deltaMs: number): void {
    const state = this.getCombatRuntimeState();
    updateTowerCombatRuntime(
      state,
      this.getCombatRuntimeDependencies(),
      this.combatRuntimeConfig,
      deltaMs,
    );
    this.applyCombatRuntimeState(state);
  }

  private updateProjectiles(deltaMs: number): void {
    const state = this.getCombatRuntimeState();
    updateProjectilesRuntime(
      state,
      this.getCombatRuntimeDependencies(),
      this.combatRuntimeConfig,
      deltaMs,
    );
    this.applyCombatRuntimeState(state);
  }

  private updateImpactEffects(deltaMs: number): void {
    const state = this.getCombatRuntimeState();
    updateImpactEffectsRuntime(state, deltaMs);
    this.applyCombatRuntimeState(state);
  }

  private updateDamageNumbers(deltaMs: number): void {
    const state = this.getCombatRuntimeState();
    updateDamageNumbersRuntime(state, this.combatRuntimeConfig, deltaMs);
    this.applyCombatRuntimeState(state);
  }

  private updateCreepHitFeedback(deltaMs: number): void {
    updateCreepHitFeedbackRuntime(this.activeCreeps, this.combatRuntimeConfig, deltaMs);
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
    const state = this.getWaveRuntimeState();
    const wasWaveCompletionRewardGranted = state.isWaveCompletionRewardGranted;
    applyWaveCompletionRewardIfResolvedRuntime(
      state,
      this.waveRuntimeConfig,
      this.getWaveRuntimeDependencies(),
    );
    this.wavePhaseState = state.wavePhaseState;
    this.playerGold = state.playerGold;
    this.isWaveCompletionRewardGranted = state.isWaveCompletionRewardGranted;
    this.nextWaveStartsAtMs = state.nextWaveStartsAtMs;
    if (!wasWaveCompletionRewardGranted && state.isWaveCompletionRewardGranted) {
      this.applyDuelRoundEndFromResolvedWave();
    }
    if (this.canPerformBuildActions()) {
      this.duelMatchState = {
        ...this.duelMatchState,
        phase: 'build',
        player: { ...this.duelMatchState.player, sendQueue: [] },
        opponent: { ...this.duelMatchState.opponent, sendQueue: [] },
      };
    }
    if (this.canPerformBuildActions()) {
      this.soundManager?.stopSound('ambient.tension');
      this.ensureBaseAmbientPlaying();
    }
  }

  private applyDuelRoundEndFromResolvedWave(): void {
    const duelRuntimeState = this.getDuelMatchRuntimeState();
    const playerLeakedCreeps = this.activeCreeps.filter(
      (creep) => creep.entity.status === 'escaped',
    ).length;
    const opponentLeakedCreeps = this.duelMatchState.player.sendQueue.length;
    const result = applyDuelRoundEndRuntime({
      state: duelRuntimeState,
      deps: this.getDuelMatchRuntimeDeps(),
      playerLeakedCreeps,
      opponentLeakedCreeps,
    });

    this.applyDuelMatchRuntimeState(duelRuntimeState);
    this.matchWinner = result.winner === null ? null : this.mapRaceIdToHudFaction(result.winner);
    this.matchOutcomeStatus = this.resolveMatchOutcomeStatus(result.isMatchOver);
    this.registry.set('duel.match.outcome', this.matchOutcomeStatus);
    if (this.matchWinner !== null) {
      this.registry.set('duel.match.winner', this.matchWinner);
    } else {
      this.registry.remove('duel.match.winner');
    }
    this.publishHudSnapshot();
  }

  private updateAutoWaveCountdown(nowMs: number): void {
    const state = this.getWaveRuntimeState();
    const changed = updateAutoWaveCountdownRuntime(state, nowMs, this.canPerformBuildActions());
    this.lastPublishedAutoStartSecondsLeft = state.lastPublishedAutoStartSecondsLeft;
    if (changed) {
      this.publishHudSnapshot();
    }
  }

  private tryStartNextWave(nowMs: number): void {
    const state = this.getWaveRuntimeState();
    if (!tryStartNextWaveRuntime(state, nowMs)) return;
    this.nextWaveStartsAtMs = state.nextWaveStartsAtMs;
    if (!this.gridModel) {
      this.nextWaveStartsAtMs = null;
      return;
    }
    this.startNextWaveFromBuildState();
  }

  private tryRestartRun(nowMs: number): void {
    const state = this.getWaveRuntimeState();
    const shouldRestart = tryRestartRunRuntime(state, nowMs);
    this.restartScheduledAtMs = state.restartScheduledAtMs;
    if (shouldRestart) this.resetRunToInitialState();
  }

  private resetRunToInitialState(): void {
    this.destroyAllCreeps();
    this.destroyOpponentBattlefieldRenderState();
    this.destroyAllProjectiles();
    this.destroyAllImpactEffects();
    this.destroyAllTowerSprites();
    this.placedTowerCostsByCellKey.clear();
    this.hoveredCell = null;
    this.updateHoveredCellDebugRegistry();
    this.buildPreviewOverlay?.clear();
    this.pathCellKeys.clear();
    const state = this.getWaveRuntimeState();
    resetRunToInitialStateRuntime(state);
    this.nextWaveStartsAtMs = state.nextWaveStartsAtMs;
    this.activeCreepPath = state.activeCreepPath;
    this.pendingWaveSpawns = state.pendingWaveSpawns;
    this.isWaveCompletionRewardGranted = state.isWaveCompletionRewardGranted;
    this.playerGold = state.playerGold;
    this.playerLives = state.playerLives;
    this.wavePhaseState = state.wavePhaseState;
    this.isGameOver = state.isGameOver;
    this.currentWaveNumber = state.currentWaveNumber;
    this.lastPublishedAutoStartSecondsLeft = state.lastPublishedAutoStartSecondsLeft;
    this.duelMatchState = createInitialDuelMatchState(
      RaceId.UNDEAD,
      this.mapHudFactionToRaceId(this.selectedFaction),
    );
    this.playerLives = this.duelMatchState.player.hp;
    this.matchOutcomeStatus = 'active';
    this.matchWinner = null;

    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lives', this.playerLives);
    this.registry.set('phase.game.over', this.isGameOver);
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.registry.set('wave.number', this.currentWaveNumber);
    this.registry.remove('wave.escapedCreeps');
    this.registry.remove('economy.lastSellRefund');
    this.publishHudSnapshot();
    this.soundManager?.stopSound('ambient.tension');
    this.ensureBaseAmbientPlaying();

    this.drawGrid();
    publishGameEvent('selected-tower', { tower: null });
  }

  private spawnWaveCreeps(): void {
    const state = this.getWaveRuntimeState();
    spawnWaveCreepsRuntime(state, this.waveRuntimeConfig, this.getWaveRuntimeDependencies());
    this.activeCreeps = state.activeCreeps;
    this.pendingWaveSpawns = state.pendingWaveSpawns;
  }

  private processPendingWaveSpawns(nowMs: number): void {
    const state = this.getWaveRuntimeState();
    processPendingWaveSpawnsRuntime(state, this.getWaveRuntimeDependencies(), nowMs);
    this.pendingWaveSpawns = state.pendingWaveSpawns;
    this.activeCreeps = state.activeCreeps;
  }

  private getSelectedFactionUnits(): UnitConfig[] {
    if (this.selectedFaction === 'undead') {
      return undeadUnits;
    }

    return undeadUnits;
  }

  private getSpriteKeyByUnit(unit: UnitConfig): string {
    if (unit.id === 'undead_skeleton') {
      return UNIT_SPRITE_KEYS.UNDEAD_SKELETON;
    }
    if (unit.id === 'undead_crypt_fiend') {
      return UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND;
    }
    if (unit.id === 'undead_gargoyle') {
      return UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE;
    }

    return UNIT_SPRITE_KEYS.UNDEAD_GHOUL;
  }

  private createTowerAnimations(): void {
    Object.values(TOWER_SPRITE_KEYS).forEach((spriteKey) => {
      const animationSet = this.getTowerAnimationSet(spriteKey);
      this.createTowerAnimation(spriteKey, animationSet.build, TOWER_BONE_ARCHER_ANIMATION_FRAMES.build, 10, 0);
      this.createTowerAnimation(spriteKey, animationSet.idle, TOWER_BONE_ARCHER_ANIMATION_FRAMES.idle, 8, -1);
      this.createTowerAnimation(spriteKey, animationSet.attack, TOWER_BONE_ARCHER_ANIMATION_FRAMES.attack, 14, 0);
      this.createTowerAnimation(
        spriteKey,
        animationSet.hitReaction,
        TOWER_BONE_ARCHER_ANIMATION_FRAMES.hitReaction,
        10,
        0,
      );
      this.createTowerAnimation(spriteKey, animationSet.sell, TOWER_BONE_ARCHER_ANIMATION_FRAMES.sell, 10, 0);
    });
  }

  private createTowerAnimation(
    spriteKey: string,
    key: string,
    frameIndexes: readonly number[],
    frameRate: number,
    repeat: number,
  ): void {
    if (this.anims.exists(key)) {
      return;
    }

    this.anims.create({
      key,
      frames: frameIndexes.map((frame) => ({
        key: spriteKey,
        frame,
      })),
      frameRate,
      repeat,
    });
  }

  private resolveTowerRenderDepth(position: GridPosition): number {
    return TOWER_RENDER_DEPTH + position.y * 10 + position.x * 0.01;
  }

  private createPlacedArcherSprite(position: GridPosition): Phaser.GameObjects.Sprite {
    const center = this.toCellCenter(position);
    const spriteKey = this.getArcherTowerSpriteKey();
    const animationSet = this.getTowerAnimationSet(spriteKey);
    const sprite = this.add.sprite(center.x, center.y, spriteKey, 0);
    sprite.setDepth(this.resolveTowerRenderDepth(position));
    sprite.setDisplaySize(
      GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS,
      GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS,
    );
    sprite.setOrigin(BONE_ARCHER_ORIGIN_X, BONE_ARCHER_ORIGIN_Y);
    sprite.play(animationSet.build);
    sprite.once(`animationcomplete-${animationSet.build}`, () => {
      if (!sprite.scene) {
        return;
      }
      sprite.play(animationSet.idle);
    });

    return sprite;
  }

  private createPlacedPlagueSprite(position: GridPosition): Phaser.GameObjects.Sprite {
    const center = this.toCellCenter(position);
    const spriteKey = PLAGUE_TOWER_CONFIG?.spriteKey ?? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER;
    const sprite = this.add.sprite(center.x, center.y, spriteKey, 0);
    sprite.setDepth(this.resolveTowerRenderDepth(position));
    sprite.setDisplaySize(
      GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS * 1.1,
      GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS * 1.1,
    );
    sprite.setOrigin(PLAGUE_TOWER_ORIGIN_X, PLAGUE_TOWER_ORIGIN_Y);
    sprite.setTint(0x44aa44);
    sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_BUILD);
    sprite.once(`animationcomplete-${TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_BUILD}`, () => {
      if (!sprite.scene) {
        return;
      }
      sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_IDLE);
    });

    return sprite;
  }

  private playArcherAttackAnimation(tower: TowerRenderState): void {
    if (tower.entity.type !== 'archer') {
      return;
    }

    if (!tower.sprite.active) {
      return;
    }

    const animationSet = this.getTowerAnimationSet(tower.sprite.texture.key);
    tower.sprite.play(animationSet.attack, true);
    tower.sprite.once(`animationcomplete-${animationSet.attack}`, () => {
      if (!tower.sprite.active) {
        return;
      }
      tower.sprite.play(animationSet.idle, true);
    });
  }

  private playBoneArcherSellAnimation(tower: TowerRenderState): void {
    if (!tower.sprite.active) {
      return;
    }

    const animationSet = this.getTowerAnimationSet(tower.sprite.texture.key);
    tower.sprite.play(animationSet.sell, true);
    tower.sprite.once(`animationcomplete-${animationSet.sell}`, () => {
      if (!tower.sprite.active) {
        return;
      }

      tower.sprite.destroy();
    });
  }

  private playPlagueAttackAnimation(tower: TowerRenderState): void {
    if (tower.entity.type !== 'splash') {
      return;
    }

    if (!tower.sprite.active) {
      return;
    }

    tower.sprite.setTint(0x66ff66);
    this.time.delayedCall(150, () => {
      if (tower.sprite.active) {
        tower.sprite.setTint(0x44aa44);
      }
    });
  }

  private getAnimationKeyByUnit(unit: UnitConfig): string {
    if (unit.id === 'undead_skeleton') {
      return UNIT_ANIMATION_KEYS.UNDEAD_SKELETON_WALK;
    }
    if (unit.id === 'undead_crypt_fiend') {
      return UNIT_ANIMATION_KEYS.UNDEAD_CRYPT_FIEND_WALK;
    }
    if (unit.id === 'undead_gargoyle') {
      return UNIT_ANIMATION_KEYS.UNDEAD_GARGOYLE_WALK;
    }

    return UNIT_ANIMATION_KEYS.UNDEAD_GHOUL_WALK;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    handlePointerMoveRuntime(
      this.inputControllerState,
      this.getInputControllerDependencies(),
      this.inputControllerConfig,
      pointer,
    );
  }

  private canProcessUserAction(): boolean {
    return canProcessUserActionRuntime(
      this.inputControllerState,
      this.time.now,
      this.inputControllerConfig.actionCooldownMs,
    );
  }

  private markUserActionProcessed(): void {
    markUserActionProcessedRuntime(this.inputControllerState, this.time.now);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.trySelectTowerAtHoveredCell()) {
      return;
    }

    if (this.hoveredCell) {
      publishGameEvent('selected-tower', { tower: null });
    }

    handlePointerDownRuntime(
      this.inputControllerState,
      this.getInputControllerDependencies(),
      pointer,
    );
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch && this.trySelectTowerAtHoveredCell()) {
      this.inputControllerState.activeTouchGesture = null;
      return;
    }

    if (pointer.wasTouch && this.hoveredCell) {
      publishGameEvent('selected-tower', { tower: null });
    }

    handlePointerUpRuntime(
      this.inputControllerState,
      this.getInputControllerDependencies(),
      this.inputControllerConfig,
      pointer,
    );
  }

  private handleGameOut(): void {
    handleGameOutRuntime(this.inputControllerState, this.getInputControllerDependencies());
  }

  private destroyAllCreeps(): void {
    this.activeCreeps.forEach((creep) => creep.sprite.destroy());
    this.activeCreeps = [];
  }

  private destroyAllTowerSprites(): void {
    this.activeTowers.forEach((tower) => tower.sprite.destroy());
    this.activeTowers = [];
  }

  private destroyAllProjectiles(): void {
    this.activeProjectiles.forEach((projectile) => projectile.sprite.destroy());
    this.activeProjectiles = [];
  }

  private destroyAllImpactEffects(): void {
    this.activeImpactEffects.forEach((effect) => effect.sprite.destroy());
    this.activeImpactEffects = [];
  }

  private destroyAllDamageNumbers(): void {
    this.activeDamageNumbers.forEach((numberState) => numberState.text.destroy());
    this.activeDamageNumbers = [];
  }

  private handleStartWaveCommand(): void {
    if (this.isGameOver || !this.canPerformBuildActions()) {
      return;
    }
    this.soundManager?.play('ui.wave_start');

    this.nextWaveStartsAtMs = null;
    this.startNextWaveFromBuildState();
  }

  private startNextWaveFromBuildState(): void {
    if (!this.gridModel) {
      return;
    }

    const wavePath = calculateWaveStartPath(this.gridModel);
    if (wavePath.length === 0) {
      this.nextWaveStartsAtMs = null;
      this.publishHudSnapshot();
      return;
    }

    this.activeCreepPath = wavePath;
    this.pathCellKeys = new Set(wavePath.map((cell) => `${cell.x}:${cell.y}`));
    this.redrawTerrainTiles();
    this.applyComputerBuildPhaseSendStrategy();
    this.duelMatchState = routeQueuedSendsToBattlefields(this.duelMatchState);
    this.syncOpponentBattlefieldRenderStateFromDuel();
    this.spawnWaveCreeps();
    this.duelMatchState = startRound(this.duelMatchState).state;
    this.wavePhaseState = startNextWaveCycle(this.wavePhaseState);
    this.ensureBaseAmbientPlaying();
    if (!this.soundManager?.isPlaying('ambient.tension')) {
      this.soundManager?.play('ambient.tension');
    }
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.updateGridOverlayVisualState();
    this.updateBuildPreview();
    this.isWaveCompletionRewardGranted = false;
    this.nextWaveStartsAtMs = null;
    this.currentWaveNumber += 1;
    this.registry.set('wave.number', this.currentWaveNumber);
    this.renderVisibleBattlefield();
    this.publishHudSnapshot();
  }

  private renderVisibleBattlefield(): void {
    const showOpponent = this.activeBattlefieldView === 'opponent';

    this.activeTowers.forEach((tower) => tower.sprite.setVisible(!showOpponent));
    this.activeCreeps.forEach((creep) => creep.sprite.setVisible(!showOpponent));
    this.activeProjectiles.forEach((projectile) => projectile.sprite.setVisible(!showOpponent));
    this.activeImpactEffects.forEach((effect) => effect.sprite.setVisible(!showOpponent));
    this.activeDamageNumbers.forEach((numberState) => numberState.text.setVisible(!showOpponent));

    this.opponentTowers.forEach((tower) => tower.sprite.setVisible(showOpponent));
    this.opponentCreeps.forEach((creep) => creep.sprite.setVisible(showOpponent));

    const visiblePath = showOpponent
      ? this.duelMatchState.opponent.battlefield.path
      : this.activeCreepPath;
    this.pathCellKeys = new Set(visiblePath.map((cell) => `${cell.x}:${cell.y}`));
    this.redrawTerrainTiles();
  }

  private syncOpponentBattlefieldRenderStateFromDuel(): void {
    this.destroyOpponentBattlefieldRenderState();

    const opponentBattlefield = this.duelMatchState.opponent.battlefield;
    this.opponentTowers = opponentBattlefield.towers.map((tower) => {
      const sprite =
        tower.type === 'splash'
          ? this.createPlacedPlagueSprite(tower.position)
          : this.createPlacedArcherSprite(tower.position);
      const runtime = createInitialTowerCombatRuntime();
      sprite.setVisible(this.activeBattlefieldView === 'opponent');
      return {
        entity: tower,
        runtime,
        sprite,
      };
    });

    this.opponentCreeps = opponentBattlefield.creeps
      .filter((creep) => creep.lifeState === 'alive')
      .map((creep) => {
        const position = this.toCellCenter(creep.position);
        const sprite = this.createOpponentCreepSprite(position.x, position.y);
        sprite.setVisible(this.activeBattlefieldView === 'opponent');
        return {
          entity: { ...creep },
          sprite,
          hitFlashRemainingMs: 0,
          deathFadeRemainingMs: 0,
        };
      });
  }

  private createOpponentCreepSprite(x: number, y: number): Phaser.GameObjects.Sprite {
    const sprite = this.add.sprite(x, y, UNIT_SPRITE_KEYS.UNDEAD_SKELETON, 0);
    sprite.setDisplaySize(PROJECTILE_DISPLAY_SIZE_PX, PROJECTILE_DISPLAY_SIZE_PX);
    sprite.setDepth(TOWER_RENDER_DEPTH - 1);
    sprite.play(UNIT_ANIMATION_KEYS.UNDEAD_SKELETON_WALK);
    return sprite;
  }

  private destroyOpponentBattlefieldRenderState(): void {
    this.opponentCreeps.forEach((creep) => creep.sprite.destroy());
    this.opponentCreeps = [];
    this.opponentTowers.forEach((tower) => tower.sprite.destroy());
    this.opponentTowers = [];
  }

  private publishHudSnapshot(): void {
    const autoStartSecondsLeft =
      !this.isGameOver && this.canPerformBuildActions() && this.nextWaveStartsAtMs !== null
        ? Math.max(0, Math.ceil((this.nextWaveStartsAtMs - this.time.now) / 1000))
        : null;

    const currentBuilderFaction = this.getCurrentBuilderFaction();
    const waveQueue = this.buildWaveQueue();

    const snapshot: GameHudSnapshot = {
      gold: this.playerGold,
      lives: this.duelMatchState.player.hp,
      opponentGold: this.duelMatchState.opponent.gold,
      opponentIncome: this.duelMatchState.opponent.income,
      opponentLives: this.duelMatchState.opponent.hp,
      matchOutcome: {
        status: this.matchOutcomeStatus,
        winner: this.matchWinner,
      },
      builderFactionName: currentBuilderFaction.name,
      waveNumber: this.currentWaveNumber,
      phase: this.wavePhaseState.phase,
      canStartWave: !this.isGameOver && this.canPerformBuildActions(),
      selectedTowerType: this.selectedTowerType,
      selectedFaction: this.selectedFaction,
      autoStartSecondsLeft,
      waveQueue,
      opponentSendQueue: this.buildOpponentSendQueue(),
      pendingCreepCount:
        this.pendingWaveSpawns.length +
        this.activeCreeps.filter((c) => c.entity.status === 'alive').length,
    };

    publishGameHudSnapshot(snapshot);
  }

  private redrawTerrainTiles(): void {
    if (!this.gridModel) {
      return;
    }

    const rendererState = this.getGridRendererState();
    for (const cell of this.gridModel.cells) {
      drawGridCellRuntime(rendererState, this.getGridRendererDeps(), this.gridRendererConfig, cell);
    }
    this.applyGridRendererState(rendererState);
  }

  private buildWaveQueue(): {
    type: 'skeleton' | 'ghoul' | 'crypt_fiend' | 'gargoyle';
    index: number;
  }[] {
    const queue = buildHudWaveQueue(this.activeCreeps);

    for (const spawn of this.pendingWaveSpawns) {
      if (spawn.unit.id.includes('ghoul')) {
        queue.push({ type: 'ghoul', index: queue.length });
        continue;
      }
      if (spawn.unit.id.includes('crypt_fiend')) {
        queue.push({ type: 'crypt_fiend', index: queue.length });
        continue;
      }
      if (spawn.unit.id.includes('gargoyle')) {
        queue.push({ type: 'gargoyle', index: queue.length });
        continue;
      }
      queue.push({ type: 'skeleton', index: queue.length });
    }

    return queue;
  }

  private buildOpponentSendQueue(): {
    type: 'skeleton' | 'ghoul' | 'crypt_fiend' | 'gargoyle';
    index: number;
  }[] {
    return this.duelMatchState.opponent.sendQueue.map((unitId, index) => ({
      type: this.mapUnitIdToHudCreepType(unitId),
      index,
    }));
  }

  private getComputerSendWaveUnits(): UnitConfig[] {
    return this.duelMatchState.opponent.sendQueue.map((unitId) => resolveUnitConfigById(unitId));
  }

  private applyComputerBuildPhaseSendStrategy(): void {
    if (this.duelMatchState.phase !== 'build') {
      return;
    }

    const opponent = this.duelMatchState.opponent;
    const totalWalkableCells = opponent.battlefield.grid.cells.filter((cell) => cell.isWalkable).length;
    const occupiedCells = opponent.battlefield.grid.cells.filter((cell) => cell.isOccupied).length;
    const result = applyComputerSendStrategy({
      state: this.duelMatchState,
      context: {
        gold: opponent.gold,
        income: opponent.income,
        hp: opponent.hp,
        raceId: opponent.raceId,
        difficulty: this.selectedDifficulty,
        round: this.currentWaveNumber,
        phase: 'build',
        mazeCoverage: {
          totalWalkableCells,
          occupiedCells,
          towerCount: opponent.battlefield.towers.length,
        },
        threat: {
          incomingCreepCount: this.duelMatchState.player.sendQueue.length,
          estimatedLeakCount: 0,
          threatLevel: 'low',
        },
        leakHistory: [],
        affordableTowers: [],
        upgradeableTowerIds: [],
        availableBuildPositions: [],
      },
    });
    this.duelMatchState = result.state;
    this.registry.set('duel.opponent.sendCount', result.sentCount);
    this.registry.set('duel.opponent.gold', this.duelMatchState.opponent.gold);
    this.registry.set('duel.opponent.income', this.duelMatchState.opponent.income);
  }

  private mapUnitIdToHudCreepType(unitId: string): 'skeleton' | 'ghoul' | 'crypt_fiend' | 'gargoyle' {
    if (
      unitId.includes('ghoul') ||
      unitId.includes('grunt') ||
      unitId.includes('footman') ||
      unitId.includes('huntress')
    ) {
      return 'ghoul';
    }
    if (
      unitId.includes('crypt_fiend') ||
      unitId.includes('troll') ||
      unitId.includes('rifleman') ||
      unitId.includes('dryad')
    ) {
      return 'crypt_fiend';
    }
    if (
      unitId.includes('gargoyle') ||
      unitId.includes('rider') ||
      unitId.includes('engine') ||
      unitId.includes('chimera')
    ) {
      return 'gargoyle';
    }
    return 'skeleton';
  }

  private mapHudFactionToRaceId(faction: HudFactionType): RaceId {
    switch (faction) {
      case 'orc':
        return RaceId.ORC;
      case 'human':
        return RaceId.HUMAN;
      case 'elf':
        return RaceId.ELF;
      case 'undead':
        return RaceId.UNDEAD;
    }
  }

  private mapRaceIdToHudFaction(raceId: RaceId): HudFactionType {
    switch (raceId) {
      case RaceId.ORC:
        return 'orc';
      case RaceId.HUMAN:
        return 'human';
      case RaceId.ELF:
        return 'elf';
      case RaceId.UNDEAD:
        return 'undead';
    }
  }

  private resolveMatchOutcomeStatus(isMatchOver: boolean): MatchOutcomeStatus {
    if (!isMatchOver) {
      return 'active';
    }
    const isPlayerDead = this.duelMatchState.player.hp <= 0;
    const isOpponentDead = this.duelMatchState.opponent.hp <= 0;
    if (isPlayerDead && isOpponentDead) {
      return 'draw';
    }
    return isOpponentDead ? 'player-won' : 'player-lost';
  }

  private getCreepTypeFromUnit(unit: UnitConfig): 'basic' {
    return mapUnitToCreepType(unit);
  }

  private getCurrentBuilderFaction(): BuilderFactionConfig {
    const faction = builderFactions.find(
      (candidate) => candidate.id === this.selectedBuilderFactionId,
    );
    return faction ?? builderFactions[0];
  }

  private getBuildableTowerConfig(towerType: 'archer' | 'splash'): BuildableTowerConfig | null {
    const factionTower = buildableTowers.find(
      (tower) => tower.faction === this.selectedBuilderFactionId && tower.towerType === towerType,
    );
    if (factionTower) {
      return factionTower;
    }

    return towerType === 'splash' ? PLAGUE_TOWER_CONFIG : BONE_ARCHER_TOWER_CONFIG;
  }

  private getArcherTowerSpriteKey(): string {
    const spriteKey = this.getBuildableTowerConfig('archer')?.spriteKey ?? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER;
    if (this.textures.exists(spriteKey)) {
      return spriteKey;
    }

    return TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER;
  }

  private getTowerAnimationSet(spriteKey: string): (typeof TOWER_ANIMATION_SETS)[keyof typeof TOWER_ANIMATION_SETS] {
    return (
      TOWER_ANIMATION_SETS[spriteKey as keyof typeof TOWER_ANIMATION_SETS] ??
      TOWER_ANIMATION_SETS[TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER]
    );
  }

  private handleSceneShutdown(): void {
    if (this.isSceneCleanedUp) {
      return;
    }

    this.isSceneCleanedUp = true;

    if (this.pointerMoveHandler) {
      this.input.off('pointermove', this.pointerMoveHandler);
      this.pointerMoveHandler = null;
    }

    if (this.pointerDownHandler) {
      this.input.off('pointerdown', this.pointerDownHandler);
      this.pointerDownHandler = null;
    }

    if (this.pointerUpHandler) {
      this.input.off('pointerup', this.pointerUpHandler);
      this.pointerUpHandler = null;
    }
    if (this.pointerAudioUnlockHandler) {
      this.input.off('pointerdown', this.pointerAudioUnlockHandler);
      this.pointerAudioUnlockHandler = null;
    }

    if (this.gameOutHandler) {
      this.input.off('gameout', this.gameOutHandler);
      this.gameOutHandler = null;
    }
    if (this.scaleResizeHandler) {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.scaleResizeHandler);
      this.scaleResizeHandler = null;
    }
    if (this.unsubscribeStartWaveCommand) {
      this.unsubscribeStartWaveCommand();
      this.unsubscribeStartWaveCommand = null;
    }
    if (this.unsubscribeTowerSelectCommand) {
      this.unsubscribeTowerSelectCommand();
      this.unsubscribeTowerSelectCommand = null;
    }
    if (this.unsubscribeFactionSelectCommand) {
      this.unsubscribeFactionSelectCommand();
      this.unsubscribeFactionSelectCommand = null;
    }
    if (this.unsubscribeUpgradeTowerCommand) {
      this.unsubscribeUpgradeTowerCommand();
      this.unsubscribeUpgradeTowerCommand = null;
    }
    if (this.unsubscribeSellTowerCommand) {
      this.unsubscribeSellTowerCommand();
      this.unsubscribeSellTowerCommand = null;
    }
    if (this.unsubscribeBattlefieldViewEvent) {
      this.unsubscribeBattlefieldViewEvent();
      this.unsubscribeBattlefieldViewEvent = null;
    }

    this.destroyAllCreeps();
    this.destroyAllProjectiles();
    this.destroyAllImpactEffects();
    this.destroyAllTowerSprites();
    this.destroyOpponentBattlefieldRenderState();
    this.destroyAllDamageNumbers();
    this.buildPreviewOverlay?.destroy();
    this.buildPreviewOverlay = null;
    this.pathCellKeys.clear();
    this.gridGraphics?.destroy();
    this.gridGraphics = null;
    this.clearTerrainSprites();
    this.clearGridLabels();
    this.activeCreepPath = [];
    this.pendingWaveSpawns = [];
    this.gridModel = null;
    this.nextWaveStartsAtMs = null;
    this.restartScheduledAtMs = null;
    this.placedTowerCostsByCellKey.clear();
    this.inputControllerState.activeTouchGesture = null;
    this.inputControllerState.lastActionAtMs = Number.NEGATIVE_INFINITY;
    this.devFpsReportElapsedMs = 0;
    this.lastPublishedAutoStartSecondsLeft = null;
    this.soundManager?.destroy();
    this.soundManager = null;
    this.hoveredCell = null;
  }
}
