import Phaser from 'phaser';
import {
  canSpendGold,
  isGameOverByLives,
  spendGold,
  subtractLives,
} from '../../../../entities/player-resources';
import {
  canPerformBuildActions as canPerformBuildActionsByPhase,
  createInitialWavePhaseState,
  isWaveActionAllowed,
  startNextWaveCycle,
  transitionToGameOver,
  type WavePhaseState,
} from '../../../../features/wave-phase';
import { TowerCombatConfig } from '../../../constants/tower';
import { GRID_DIMENSIONS } from '../../../constants/grid';
import {
  TerrainAssetKey,
  TERRAIN_TILESET_ASSET_PATHS,
  TERRAIN_TILESET_FRAME,
} from '../../../constants/terrain';
import {
  TOWER_ANIMATION_KEYS,
  TOWER_BONE_ARCHER_ANIMATION_FRAMES,
  TOWER_SPRITE_ASSETS,
  TOWER_SPRITE_KEYS,
  TOWER_SPRITE_SHEET_FRAME,
  UNIT_ANIMATION_KEYS,
  UNIT_SPRITE_ASSETS,
  UNIT_SPRITE_KEYS,
  UNIT_SPRITE_SHEET_FRAME,
} from '../../../constants/sprites';
import { calculateWaveStartPath } from '../../../../entities/wave';
import { undeadUnits, type UnitConfig } from '../../../../entities/unit';
import {
  BuilderFaction,
  builderFactions,
  DEFAULT_BUILDER_FACTION,
  type BuilderFactionConfig,
} from '../../../../entities/builder-faction';
import {
  TOWER_COMBAT_STATS_BY_TYPE,
  createInitialTowerCombatRuntime,
} from '../../../../entities/tower';
import { createGridModel } from '../../grid/createGridModel';
import { validateTowerPlacementPath } from '../../pathfinding/validateTowerPlacementPath';
import { isUndeadDecorationTileIndex, resolveUndeadTerrainTileIndex } from '../terrain/undeadTerrain';
import { GameSoundManager } from '../sound/GameSoundManager';
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
import {
  onGameCommand,
  publishGameHudSnapshot,
  getGameSetupConfig,
} from '../../game-bridge/bridge';
import type { GameHudSnapshot, HudFactionType } from '../../game-bridge/types';
import type { GridPosition } from '../../../types/pathfinding';
import type { GridCell, GridModel } from '../../../types/grid';
import type { TowerEntity } from '../../../../entities/tower';
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
  DAMAGE_NUMBERS_ENABLED,
  DAMAGE_NUMBER_LIFETIME_MS,
  DAMAGE_NUMBER_RISE_PX,
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
import { buildHudWaveQueue, mapEnemyFactionToHudFaction, mapUnitToCreepType } from './gameScene.helpers';
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
  private pendingWaveSpawns: PendingWaveSpawn[] = [];
  private activeTowers: TowerRenderState[] = [];
  private activeProjectiles: ProjectileState[] = [];
  private activeImpactEffects: ImpactEffectState[] = [];
  private activeDamageNumbers: DamageNumberState[] = [];
  private pointerMoveHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private scaleResizeHandler: (() => void) | null = null;
  private gameOutHandler: (() => void) | null = null;
  private unsubscribeStartWaveCommand: (() => void) | null = null;
  private unsubscribeTowerSelectCommand: (() => void) | null = null;
  private unsubscribeFactionSelectCommand: (() => void) | null = null;
  private selectedTowerType: 'archer' | 'splash' | null = null;
  private selectedBuilderFactionId = DEFAULT_BUILDER_FACTION;
  private selectedFaction: HudFactionType = 'undead';
  private activeTouchGesture:
    | { startedAtMs: number; startX: number; startY: number; soldByLongPress: boolean }
    | null = null;
  private lastActionAtMs = Number.NEGATIVE_INFINITY;
  private devFpsReportElapsedMs = 0;
  private lastPublishedAutoStartSecondsLeft: number | null = null;
  private soundManager: GameSoundManager | null = null;
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

  constructor() {
    super(GameScene.KEY);
  }

  public preload(): void {
    if (!this.textures.exists(TerrainAssetKey.UNDEAD_TILESET)) {
      this.load.spritesheet(
        TerrainAssetKey.UNDEAD_TILESET,
        TERRAIN_TILESET_ASSET_PATHS[TerrainAssetKey.UNDEAD_TILESET],
        {
          frameWidth: TERRAIN_TILESET_FRAME.width,
          frameHeight: TERRAIN_TILESET_FRAME.height,
        },
      );
    }

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
    this.soundManager = new GameSoundManager(this);
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
    this.createBoneArcherTowerAnimations();
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
      this.registry.set('wave.selectedFaction', this.selectedFaction);
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
    this.gridGraphics ??= this.add.graphics();
    this.gridGraphics.clear();
    this.gridGraphics.setDepth(GRID_OVERLAY_RENDER_DEPTH);
    this.clearTerrainSprites();
    this.clearGridLabels();

    const grid = createGridModel({
      entrance: ENTRANCE_CELL,
      exit: EXIT_CELL,
    });
    this.gridModel = grid;

    for (const cell of grid.cells) {
      this.drawGridCell(cell);

      if (cell.role === 'entrance' || cell.role === 'exit') {
        const x = cell.x * GRID_DIMENSIONS.cellSize;
        const y = cell.y * GRID_DIMENSIONS.cellSize;

        const label = this.add
          .text(
            x + GRID_DIMENSIONS.cellSize / 2,
            y + GRID_DIMENSIONS.cellSize / 2,
            cell.role === 'entrance' ? 'IN' : 'OUT',
            {
              fontFamily: ENTRANCE_EXIT_LABEL_FONT_FAMILY,
              fontSize: ENTRANCE_EXIT_LABEL_FONT_SIZE_PX,
              color: ENTRANCE_EXIT_LABEL_COLOR,
            },
          )
          .setOrigin(0.5);
        label.setDepth(ENTRANCE_EXIT_LABEL_RENDER_DEPTH);
        this.gridLabels.push(label);
      }
    }

    this.drawGridLines(grid);
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

  private registerScaleResizeHandling(): void {
    this.scaleResizeHandler = this.applyResponsiveCamera.bind(this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.scaleResizeHandler);
    this.applyResponsiveCamera();
  }

  private applyResponsiveCamera(): void {
    const viewportWidth = this.scale.width;
    const viewportHeight = this.scale.height;
    const zoom = Math.min(viewportWidth / GRID_PIXEL_WIDTH, viewportHeight / GRID_PIXEL_HEIGHT);

    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(0, 0, GRID_PIXEL_WIDTH, GRID_PIXEL_HEIGHT, true);
    this.cameras.main.centerOn(GRID_PIXEL_WIDTH / 2, GRID_PIXEL_HEIGHT / 2);
  }

  private toGridCell(worldX: number, worldY: number): GridPosition | null {
    const x = Math.floor(worldX / GRID_DIMENSIONS.cellSize);
    const y = Math.floor(worldY / GRID_DIMENSIONS.cellSize);

    const isInsideGrid =
      x >= 0 && x < GRID_DIMENSIONS.cols && y >= 0 && y < GRID_DIMENSIONS.rows;

    if (!isInsideGrid) {
      return null;
    }

    return { x, y };
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
      playArcherAttackAnimation: (tower) => this.playBoneArcherAttackAnimation(tower),
      playSplashAttackAnimation: (tower) => this.playPlagueAttackAnimation(tower),
      playSound: (key) => this.soundManager?.play(key),
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
    if (!this.buildPreviewOverlay) {
      return;
    }

    this.buildPreviewOverlay.clear();

    if (!this.canPerformBuildActions()) {
      this.updateGridOverlayVisualState();
      return;
    }

    if (!this.hoveredCell || !this.gridModel) {
      this.updateGridOverlayVisualState();
      return;
    }

    const isBuildCellValid = this.isBuildCellValid(this.hoveredCell, this.gridModel);
    const x = this.hoveredCell.x * GRID_DIMENSIONS.cellSize;
    const y = this.hoveredCell.y * GRID_DIMENSIONS.cellSize;
    const fillColor = isBuildCellValid ? PREVIEW_VALID_FILL : PREVIEW_INVALID_FILL;
    const strokeColor = isBuildCellValid ? PREVIEW_VALID_STROKE : PREVIEW_INVALID_STROKE;
    const markerSize = GRID_DIMENSIONS.cellSize * 0.2;
    const centerX = x + GRID_DIMENSIONS.cellSize / 2;
    const centerY = y + GRID_DIMENSIONS.cellSize / 2;

    const rangeCells = this.getSelectedTowerRangeCells();
    const rangeRadiusPx = rangeCells * GRID_DIMENSIONS.cellSize;
    const rangeColor = isBuildCellValid ? 0x3ecf78 : 0xe55a4f;

    this.buildPreviewOverlay.fillStyle(rangeColor, 0.12);
    this.buildPreviewOverlay.lineStyle(1, rangeColor, 0.35);
    this.buildPreviewOverlay.fillCircle(centerX, centerY, rangeRadiusPx);
    this.buildPreviewOverlay.strokeCircle(centerX, centerY, rangeRadiusPx);

    this.buildPreviewOverlay.fillStyle(fillColor, 0.42);
    this.buildPreviewOverlay.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
    this.buildPreviewOverlay.lineStyle(2, strokeColor, 1);
    this.buildPreviewOverlay.strokeRect(x + 1, y + 1, GRID_DIMENSIONS.cellSize - 2, GRID_DIMENSIONS.cellSize - 2);

    this.buildPreviewOverlay.lineStyle(2, strokeColor, 0.95);
    this.buildPreviewOverlay.beginPath();
    this.buildPreviewOverlay.moveTo(centerX - markerSize, centerY);
    this.buildPreviewOverlay.lineTo(centerX + markerSize, centerY);

    if (isBuildCellValid) {
      this.buildPreviewOverlay.moveTo(centerX, centerY - markerSize);
      this.buildPreviewOverlay.lineTo(centerX, centerY + markerSize);
    } else {
      this.buildPreviewOverlay.moveTo(centerX - markerSize, centerY - markerSize);
      this.buildPreviewOverlay.lineTo(centerX + markerSize, centerY + markerSize);
      this.buildPreviewOverlay.moveTo(centerX - markerSize, centerY + markerSize);
      this.buildPreviewOverlay.lineTo(centerX + markerSize, centerY - markerSize);
    }

    this.buildPreviewOverlay.strokePath();
    this.updateGridOverlayVisualState();
  }

  private moveCreepsAlongPath(deltaMs: number): void {
    if (this.activeCreepPath.length === 0 || this.activeCreeps.length === 0) {
      return;
    }

    const normalizedDeltaMs = Math.min(deltaMs, CREEP_MAX_SIMULATION_DELTA_MS);
    for (const creep of this.activeCreeps) {
      if (creep.entity.status !== 'alive') {
        continue;
      }
      const normalizedStepDistance =
        (normalizedDeltaMs / 1000) * CREEP_BASE_MOVE_SPEED_PX_PER_SEC * creep.entity.speed;

      const nextPathIndex = creep.entity.pathIndex + 1;

      if (nextPathIndex >= this.activeCreepPath.length) {
        this.markCreepEscaped(creep);
        continue;
      }

      const nextPoint = this.activeCreepPath[nextPathIndex];
      const nextCenter = this.toCellCenter(nextPoint);
      const dx = nextCenter.x - creep.sprite.x;
      const dy = nextCenter.y - creep.sprite.y;
      const distanceToNext = Math.hypot(dx, dy);

      if (distanceToNext <= normalizedStepDistance) {
        creep.sprite.setPosition(nextCenter.x, nextCenter.y);
        creep.entity.pathIndex = nextPathIndex;
        creep.entity.position = { x: nextPoint.x, y: nextPoint.y };

        if (nextPathIndex >= this.activeCreepPath.length - 1) {
          this.markCreepEscaped(creep);
        }
        continue;
      }

      const ratio = normalizedStepDistance / distanceToNext;
      const nextX = creep.sprite.x + dx * ratio;
      const nextY = creep.sprite.y + dy * ratio;
      creep.sprite.setPosition(nextX, nextY);
      creep.sprite.rotation = Math.atan2(dy, dx);
    }
  }

  private isBuildCellValid(cellPosition: GridPosition, grid: GridModel): boolean {
    const cell = grid.cells.find(
      (candidate) => candidate.x === cellPosition.x && candidate.y === cellPosition.y,
    );

    if (!cell) {
      return false;
    }

    if (cell.role !== 'empty') {
      return false;
    }

    if (!cell.isWalkable || cell.isOccupied) {
      return false;
    }

    if (!canSpendGold({ gold: this.playerGold }, DEFAULT_TOWER_COST)) {
      return false;
    }

    return validateTowerPlacementPath(grid, cellPosition);
  }

  private tryPlaceTowerAtHoveredCell(): void {
    if (!this.canProcessUserAction()) {
      return;
    }

    if (!isWaveActionAllowed(this.wavePhaseState, 'place-tower') || this.isGameOver) {
      return;
    }

    if (!this.hoveredCell || !this.gridModel) {
      return;
    }

    const hoveredCell = this.hoveredCell;

    if (!this.isBuildCellValid(this.hoveredCell, this.gridModel)) {
      return;
    }

    const targetCell = this.gridModel.cells.find(
      (cell) => cell.x === hoveredCell.x && cell.y === hoveredCell.y,
    );

    if (!targetCell) {
      return;
    }

    const spendGoldResult = spendGold(
      { gold: this.playerGold, lives: this.playerLives },
      DEFAULT_TOWER_COST,
    );

    if (!spendGoldResult.spent) {
      return;
    }

    targetCell.isOccupied = true;
    targetCell.isWalkable = false;
    const towerType = this.selectedTowerType ?? 'archer';
    const towerConfig = towerType === 'splash' ? PLAGUE_TOWER_CONFIG : BONE_ARCHER_TOWER_CONFIG;
    const towerCost = towerConfig?.costGold ?? DEFAULT_TOWER_COST;
    this.placedTowerCostsByCellKey.set(
      this.toGridCellKey(hoveredCell),
      towerCost,
    );
    const towerEntity: TowerEntity = {
      id: this.toTowerId(hoveredCell),
      position: { x: hoveredCell.x, y: hoveredCell.y },
      cost: towerCost,
      type: towerType,
      combatStats: TOWER_COMBAT_STATS_BY_TYPE[towerType],
    };
    const towerSprite = towerType === 'splash'
      ? this.createPlacedPlagueSprite(towerEntity.position)
      : this.createPlacedBoneArcherSprite(towerEntity.position);
    this.activeTowers.push({
      entity: towerEntity,
      runtime: createInitialTowerCombatRuntime(),
      sprite: towerSprite,
    });
    this.playerGold = spendGoldResult.resources.gold;
    this.registry.set('economy.gold', this.playerGold);
    this.markUserActionProcessed();
    this.publishHudSnapshot();

    this.drawGridCell(targetCell);
    this.updateBuildPreview();

  }

  private trySellTowerAtHoveredCell(): void {
    if (!this.canProcessUserAction()) {
      return;
    }

    if (!isWaveActionAllowed(this.wavePhaseState, 'sell-tower') || this.isGameOver) {
      return;
    }

    if (!this.hoveredCell || !this.gridModel) {
      return;
    }

    const hoveredCell = this.hoveredCell;
    const hoveredCellKey = this.toGridCellKey(hoveredCell);
    const towerCost = this.placedTowerCostsByCellKey.get(hoveredCellKey);

    if (towerCost === undefined) {
      return;
    }

    const targetCell = this.gridModel.cells.find(
      (cell) => cell.x === hoveredCell.x && cell.y === hoveredCell.y,
    );

    if (!targetCell || targetCell.role !== 'empty' || !targetCell.isOccupied) {
      return;
    }

    targetCell.isOccupied = false;
    targetCell.isWalkable = true;
    this.placedTowerCostsByCellKey.delete(hoveredCellKey);
    this.activeTowers = this.activeTowers.filter((tower) => {
      const shouldKeep = tower.entity.id !== this.toTowerId(hoveredCell);
      if (!shouldKeep) {
        this.playBoneArcherSellAnimation(tower);
      }
      return shouldKeep;
    });

    const refundAmount = Math.floor(towerCost * SELL_REFUND_RATIO);
    this.registry.set('economy.lastSellRefund', refundAmount);
    this.markUserActionProcessed();
    this.publishHudSnapshot();

    this.drawGridCell(targetCell);
    this.updateBuildPreview();

  }

  private drawGridCell(cell: GridCell): void {
    const x = cell.x * GRID_DIMENSIONS.cellSize;
    const y = cell.y * GRID_DIMENSIONS.cellSize;
    this.renderTerrainCell(cell);

    if (!this.gridGraphics) {
      return;
    }

    if (cell.isOccupied) {
      this.gridGraphics.fillStyle(0x263347, 0.55);
      this.gridGraphics.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
    }
  }

  private renderTerrainCell(cell: GridCell): void {
    if (!this.hasUndeadTilesetTexture()) {
      this.renderFallbackTerrainCell(cell);
      return;
    }

    const tileIndex = this.resolveTerrainTileIndexForCell(cell);
    const x = cell.x * GRID_DIMENSIONS.cellSize;
    const y = cell.y * GRID_DIMENSIONS.cellSize;
    const sprite = this.add.image(
      x,
      y,
      TerrainAssetKey.UNDEAD_TILESET,
      tileIndex,
    );
    sprite.setOrigin(0, 0);
    sprite.setDisplaySize(GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
    sprite.setDepth(TERRAIN_RENDER_DEPTH);
    if (isUndeadDecorationTileIndex(tileIndex)) {
      sprite.setAlpha(TERRAIN_DECORATION_TILE_ALPHA);
      sprite.setTint(TERRAIN_DECORATION_TILE_TINT);
    } else {
      sprite.setAlpha(TERRAIN_BASE_TILE_ALPHA);
      sprite.setTint(TERRAIN_BASE_TILE_TINT);
    }
    this.terrainSprites.push(sprite);
  }

  private hasUndeadTilesetTexture(): boolean {
    return this.textures.exists(TerrainAssetKey.UNDEAD_TILESET);
  }

  private renderFallbackTerrainCell(cell: GridCell): void {
    if (!this.gridGraphics) {
      return;
    }

    const x = cell.x * GRID_DIMENSIONS.cellSize;
    const y = cell.y * GRID_DIMENSIONS.cellSize;
    const fillColor =
      cell.role === 'entrance'
        ? 0x1e8f48
        : cell.role === 'exit'
          ? 0xaf4536
          : 0x253248;

    this.gridGraphics.fillStyle(fillColor, 1);
    this.gridGraphics.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
  }

  private resolveTerrainTileIndexForCell(cell: GridCell): number {
    if (this.selectedBuilderFactionId !== BuilderFaction.UNDEAD) {
      return resolveUndeadTerrainTileIndex({
        position: { x: cell.x, y: cell.y },
        entrance: ENTRANCE_CELL,
        exit: EXIT_CELL,
        cols: GRID_DIMENSIONS.cols,
        rows: GRID_DIMENSIONS.rows,
      });
    }

    // TODO: switch terrain resolver per builder faction when non-Undead terrain tilesets are implemented.
    return resolveUndeadTerrainTileIndex({
      position: { x: cell.x, y: cell.y },
      entrance: ENTRANCE_CELL,
      exit: EXIT_CELL,
      cols: GRID_DIMENSIONS.cols,
      rows: GRID_DIMENSIONS.rows,
    });
  }

  private drawGridLines(grid: GridModel): void {
    if (!this.gridGraphics) {
      return;
    }

    this.gridGraphics.lineStyle(GRID_LINE_WIDTH, GRID_LINE_COLOR, GRID_BUILD_ALPHA);
    for (const cell of grid.cells) {
      const x = cell.x * GRID_DIMENSIONS.cellSize;
      const y = cell.y * GRID_DIMENSIONS.cellSize;
      this.gridGraphics.strokeRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
    }
  }

  private updateGridOverlayVisualState(): void {
    if (!this.gridGraphics) {
      return;
    }

    const targetAlpha = this.canPerformBuildActions() ? GRID_BUILD_ALPHA : GRID_IDLE_ALPHA;
    this.gridGraphics.setAlpha(targetAlpha);
  }

  private applyNearestNeighborFiltering(): void {
    if (this.textures.exists(TerrainAssetKey.UNDEAD_TILESET)) {
      this.textures.get(TerrainAssetKey.UNDEAD_TILESET).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
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
    this.terrainSprites.forEach((sprite) => sprite.destroy());
    this.terrainSprites = [];
  }

  private clearGridLabels(): void {
    this.gridLabels.forEach((label) => label.destroy());
    this.gridLabels = [];
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

    return canPerformBuildActionsByPhase(this.wavePhaseState);
  }

  private loadSetupConfig(): void {
    const setupConfig = getGameSetupConfig();
    if (setupConfig) {
      this.selectedBuilderFactionId = setupConfig.builderFaction;
      this.selectedFaction = mapEnemyFactionToHudFaction(setupConfig.enemyFaction);
      this.registry.set('game.setup', setupConfig);
    }
  }

  private toCellCenter(position: GridPosition): { x: number; y: number } {
    return {
      x: position.x * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2,
      y: position.y * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2,
    };
  }

  private markCreepEscaped(creep: CreepRenderState): void {
    if (creep.entity.status === 'escaped') {
      return;
    }

    creep.entity.status = 'escaped';
    const nextResources = subtractLives(
      { gold: this.playerGold, lives: this.playerLives },
      1,
    );
    this.playerLives = nextResources.lives;
    this.registry.set('economy.lives', this.playerLives);

    if (isGameOverByLives({ lives: this.playerLives })) {
      this.isGameOver = true;
      this.wavePhaseState = transitionToGameOver(this.wavePhaseState);
      this.restartScheduledAtMs ??= this.time.now + RESTART_DELAY_MS;
      this.registry.set('phase.build.active', this.canPerformBuildActions());
      this.registry.set('phase.game.over', this.isGameOver);
      this.updateGridOverlayVisualState();
      this.updateBuildPreview();
    }
    this.publishHudSnapshot();

    const escapedCount = this.activeCreeps.filter(
      (candidate) => candidate.entity.status === 'escaped',
    ).length;
    this.registry.set('wave.escapedCreeps', escapedCount);
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
    applyWaveCompletionRewardIfResolvedRuntime(
      state,
      this.waveRuntimeConfig,
      this.getWaveRuntimeDependencies(),
    );
    this.wavePhaseState = state.wavePhaseState;
    this.playerGold = state.playerGold;
    this.isWaveCompletionRewardGranted = state.isWaveCompletionRewardGranted;
    this.nextWaveStartsAtMs = state.nextWaveStartsAtMs;
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
    this.destroyAllProjectiles();
    this.destroyAllImpactEffects();
    this.destroyAllTowerSprites();
    this.placedTowerCostsByCellKey.clear();
    this.hoveredCell = null;
    this.updateHoveredCellDebugRegistry();
    this.buildPreviewOverlay?.clear();
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

    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lives', this.playerLives);
    this.registry.set('phase.game.over', this.isGameOver);
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.registry.set('wave.number', this.currentWaveNumber);
    this.registry.remove('wave.escapedCreeps');
    this.registry.remove('economy.lastSellRefund');
    this.publishHudSnapshot();

    this.drawGrid();
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

  private createBoneArcherTowerAnimations(): void {
    this.createTowerAnimation(
      TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_BUILD,
      TOWER_BONE_ARCHER_ANIMATION_FRAMES.build,
      10,
      0,
    );
    this.createTowerAnimation(
      TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_IDLE,
      TOWER_BONE_ARCHER_ANIMATION_FRAMES.idle,
      8,
      -1,
    );
    this.createTowerAnimation(
      TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_ATTACK,
      TOWER_BONE_ARCHER_ANIMATION_FRAMES.attack,
      14,
      0,
    );
    this.createTowerAnimation(
      TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_HIT_REACTION,
      TOWER_BONE_ARCHER_ANIMATION_FRAMES.hitReaction,
      10,
      0,
    );
    this.createTowerAnimation(
      TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_SELL,
      TOWER_BONE_ARCHER_ANIMATION_FRAMES.sell,
      10,
      0,
    );
  }

  private createTowerAnimation(
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
        key: TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER,
        frame,
      })),
      frameRate,
      repeat,
    });
  }

  private createPlacedBoneArcherSprite(position: GridPosition): Phaser.GameObjects.Sprite {
    const center = this.toCellCenter(position);
    const spriteKey =
      BONE_ARCHER_TOWER_CONFIG?.spriteKey ?? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER;
    const sprite = this.add.sprite(center.x, center.y, spriteKey, 0);
    sprite.setDepth(TOWER_RENDER_DEPTH);
    sprite.setDisplaySize(
      GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS,
      GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS,
    );
    sprite.setOrigin(BONE_ARCHER_ORIGIN_X, BONE_ARCHER_ORIGIN_Y);
    sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_BUILD);
    sprite.once(
      `animationcomplete-${TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_BUILD}`,
      () => {
        if (!sprite.scene) {
          return;
        }
        sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_IDLE);
      },
    );

    return sprite;
  }

  private createPlacedPlagueSprite(position: GridPosition): Phaser.GameObjects.Sprite {
    const center = this.toCellCenter(position);
    const spriteKey =
      PLAGUE_TOWER_CONFIG?.spriteKey ?? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER;
    const sprite = this.add.sprite(center.x, center.y, spriteKey, 0);
    sprite.setDepth(TOWER_RENDER_DEPTH);
    sprite.setDisplaySize(
      GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS * 1.1,
      GRID_DIMENSIONS.cellSize * TOWER_VISUAL_SCALE_IN_CELLS * 1.1,
    );
    sprite.setOrigin(PLAGUE_TOWER_ORIGIN_X, PLAGUE_TOWER_ORIGIN_Y);
    sprite.setTint(0x44aa44);
    sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_BUILD);
    sprite.once(
      `animationcomplete-${TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_BUILD}`,
      () => {
        if (!sprite.scene) {
          return;
        }
        sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_IDLE);
      },
    );

    return sprite;
  }

  private playBoneArcherAttackAnimation(tower: TowerRenderState): void {
    if (tower.entity.type !== 'archer') {
      return;
    }

    if (!tower.sprite.active) {
      return;
    }

    tower.sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_ATTACK, true);
    tower.sprite.once(
      `animationcomplete-${TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_ATTACK}`,
      () => {
        if (!tower.sprite.active) {
          return;
        }
        tower.sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_IDLE, true);
      },
    );
  }

  private playBoneArcherSellAnimation(tower: TowerRenderState): void {
    if (!tower.sprite.active) {
      return;
    }

    tower.sprite.play(TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_SELL, true);
    tower.sprite.once(
      `animationcomplete-${TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_SELL}`,
      () => {
        if (!tower.sprite.active) {
          return;
        }

        tower.sprite.destroy();
      },
    );
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
    this.hoveredCell = this.toGridCell(pointer.worldX, pointer.worldY);
    this.updateHoveredCellDebugRegistry();
    this.updateBuildPreview();

    if (!pointer.primaryDown || !pointer.wasTouch || !this.activeTouchGesture) {
      return;
    }

    const durationMs = this.time.now - this.activeTouchGesture.startedAtMs;
    const moveDistance = Math.hypot(
      pointer.worldX - this.activeTouchGesture.startX,
      pointer.worldY - this.activeTouchGesture.startY,
    );
    const isStillPressingCell = moveDistance <= TOUCH_TAP_MAX_MOVE_PX;

    if (
      !this.activeTouchGesture.soldByLongPress
      && isStillPressingCell
      && durationMs >= TOUCH_LONG_PRESS_MIN_DURATION_MS
    ) {
      this.trySellTowerAtHoveredCell();
      this.activeTouchGesture.soldByLongPress = true;
    }
  }

  private canProcessUserAction(): boolean {
    return this.time.now - this.lastActionAtMs >= ACTION_COOLDOWN_MS;
  }

  private markUserActionProcessed(): void {
    this.lastActionAtMs = this.time.now;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) {
      this.activeTouchGesture = {
        startedAtMs: this.time.now,
        startX: pointer.worldX,
        startY: pointer.worldY,
        soldByLongPress: false,
      };
      return;
    }

    if (pointer.button === 0) {
      this.tryPlaceTowerAtHoveredCell();
      return;
    }

    if (pointer.button !== 2) {
      return;
    }

    this.trySellTowerAtHoveredCell();
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch || !this.activeTouchGesture) {
      return;
    }

    const durationMs = this.time.now - this.activeTouchGesture.startedAtMs;
    const moveDistance = Math.hypot(
      pointer.worldX - this.activeTouchGesture.startX,
      pointer.worldY - this.activeTouchGesture.startY,
    );
    const isTap =
      durationMs >= TOUCH_TAP_MIN_DURATION_MS
      && durationMs <= TOUCH_TAP_MAX_DURATION_MS
      && moveDistance <= TOUCH_TAP_MAX_MOVE_PX;

    if (isTap && !this.activeTouchGesture.soldByLongPress) {
      this.tryPlaceTowerAtHoveredCell();
    }

    this.activeTouchGesture = null;
  }

  private handleGameOut(): void {
    this.activeTouchGesture = null;
    this.hoveredCell = null;
    this.updateHoveredCellDebugRegistry();
    this.updateBuildPreview();
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
    this.spawnWaveCreeps();
    this.wavePhaseState = startNextWaveCycle(this.wavePhaseState);
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.updateGridOverlayVisualState();
    this.updateBuildPreview();
    this.isWaveCompletionRewardGranted = false;
    this.nextWaveStartsAtMs = null;
    this.currentWaveNumber += 1;
    this.registry.set('wave.number', this.currentWaveNumber);
    this.publishHudSnapshot();
  }

  private publishHudSnapshot(): void {
    const autoStartSecondsLeft =
      !this.isGameOver
      && this.canPerformBuildActions()
      && this.nextWaveStartsAtMs !== null
        ? Math.max(0, Math.ceil((this.nextWaveStartsAtMs - this.time.now) / 1000))
        : null;

    const currentBuilderFaction = this.getCurrentBuilderFaction();
    const waveQueue = this.buildWaveQueue();

    const snapshot: GameHudSnapshot = {
      gold: this.playerGold,
      lives: this.playerLives,
      builderFactionName: currentBuilderFaction.name,
      waveNumber: this.currentWaveNumber,
      phase: this.wavePhaseState.phase,
      canStartWave:
        !this.isGameOver
        && this.canPerformBuildActions(),
      selectedTowerType: this.selectedTowerType,
      selectedFaction: this.selectedFaction,
      autoStartSecondsLeft,
      waveQueue,
      pendingCreepCount: this.pendingWaveSpawns.length + this.activeCreeps.filter(c => c.entity.status === 'alive').length,
    };

    publishGameHudSnapshot(snapshot);
  }

  private buildWaveQueue(): { type: 'skeleton' | 'ghoul' | 'crypt_fiend' | 'gargoyle'; index: number }[] {
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

  private getCreepTypeFromUnit(unit: UnitConfig): 'basic' {
    return mapUnitToCreepType(unit);
  }

  private getCurrentBuilderFaction(): BuilderFactionConfig {
    const faction = builderFactions.find((candidate) => candidate.id === this.selectedBuilderFactionId);
    return faction ?? builderFactions[0];
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

    this.destroyAllCreeps();
    this.destroyAllProjectiles();
    this.destroyAllImpactEffects();
    this.destroyAllTowerSprites();
    this.destroyAllDamageNumbers();
    this.buildPreviewOverlay?.destroy();
    this.buildPreviewOverlay = null;
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
    this.activeTouchGesture = null;
    this.lastActionAtMs = Number.NEGATIVE_INFINITY;
    this.devFpsReportElapsedMs = 0;
    this.lastPublishedAutoStartSecondsLeft = null;
    this.soundManager = null;
    this.hoveredCell = null;
  }
}
