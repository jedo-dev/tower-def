import Phaser from 'phaser';
import {
  addGold,
  applyEarlyWaveStartBonusPlaceholder,
  canSpendGold,
  createInitialPlayerResources,
  isGameOverByLives,
  spendGold,
  subtractLives,
} from '../../../../entities/player-resources';
import {
  canPerformBuildActions as canPerformBuildActionsByPhase,
  completeWaveIfResolved,
  createInitialWavePhaseState,
  isWaveActionAllowed,
  resetWavePhaseState,
  startNextWaveCycle,
  transitionCompletedToBuild,
  transitionToGameOver,
  type WavePhaseState,
} from '../../../../features/wave-phase';
import { ECONOMY_BALANCE } from '../../../constants/economy';
import { GRID_DEFAULT_ROW_CENTER, GRID_DIMENSIONS } from '../../../constants/grid';
import {
  UNIT_ANIMATION_KEYS,
  UNIT_SPRITE_ASSETS,
  UNIT_SPRITE_KEYS,
  UNIT_SPRITE_SHEET_FRAME,
} from '../../../constants/sprites';
import { calculateWaveStartPath, generateWaveUnits } from '../../../../entities/wave';
import { applyDamageToCreep, isCreepDead } from '../../../../entities/creep';
import { undeadUnits, type UnitConfig } from '../../../../entities/unit';
import {
  TOWER_COMBAT_STATS_BY_TYPE,
  canTowerAttack,
  consumeTowerAttack,
  createInitialTowerCombatRuntime,
  selectTowerTarget,
  tickTowerCooldown,
} from '../../../../entities/tower';
import { createGridModel } from '../../grid/createGridModel';
import { validateTowerPlacementPath } from '../../pathfinding/validateTowerPlacementPath';
import { GameSoundManager } from '../sound/GameSoundManager';
import {
  onGameCommand,
  publishGameHudSnapshot,
} from '../../game-bridge/bridge';
import type { GameHudSnapshot, HudFactionType } from '../../game-bridge/types';
import type { GridPosition } from '../../../types/pathfinding';
import type { GridCell, GridModel } from '../../../types/grid';
import type { CreepEntity } from '../../../../entities/creep';
import type { TowerCombatRuntime, TowerEntity } from '../../../../entities/tower';

const ENTRANCE_CELL = { x: 0, y: GRID_DEFAULT_ROW_CENTER };
const EXIT_CELL = { x: GRID_DIMENSIONS.cols - 1, y: GRID_DEFAULT_ROW_CENTER };
const DEFAULT_TOWER_COST = 50;
const SELL_REFUND_RATIO = ECONOMY_BALANCE.towerSellRatio;
const CREEP_BASE_MOVE_SPEED_PX_PER_SEC = 80;
const CREEP_MAX_SIMULATION_DELTA_MS = 34;
const ATTACK_FEEDBACK_MIN_LIFETIME_MS = 70;
const ATTACK_FEEDBACK_MAX_LIFETIME_MS = 180;
const ATTACK_FEEDBACK_BASE_ALPHA = 0.9;
const INITIAL_PLAYER_RESOURCES = createInitialPlayerResources();
const EARLY_WAVE_START_BONUS_PLACEHOLDER_ELIGIBLE = false;
const AUTO_WAVE_START_DELAY_MS = 30000;
const RESTART_DELAY_MS = 1200;
const ACTION_COOLDOWN_MS = 160;
const TOUCH_TAP_MIN_DURATION_MS = 70;
const TOUCH_TAP_MAX_DURATION_MS = 250;
const TOUCH_TAP_MAX_MOVE_PX = 12;
const TOUCH_LONG_PRESS_MIN_DURATION_MS = 450;
const DEV_FPS_REPORT_INTERVAL_MS = 500;
const PREVIEW_VALID_FILL = 0x3ecf78;
const PREVIEW_VALID_STROKE = 0xaaf5c8;
const PREVIEW_INVALID_FILL = 0xe55a4f;
const PREVIEW_INVALID_STROKE = 0xffb8b2;
const GRID_PIXEL_WIDTH = GRID_DIMENSIONS.cols * GRID_DIMENSIONS.cellSize;
const GRID_PIXEL_HEIGHT = GRID_DIMENSIONS.rows * GRID_DIMENSIONS.cellSize;
const CREEP_BASE_COLOR = 0xffffff;
const CREEP_HIT_FLASH_COLOR = 0xffffff;
const CREEP_HIT_FLASH_DURATION_MS = 90;
const CREEP_DEATH_FADE_DURATION_MS = 180;
const TOWER_ATTACK_PULSE_LIFETIME_MS = 120;
const TOWER_ATTACK_PULSE_COLOR = 0xffe6a6;
const TOWER_ATTACK_PULSE_MAX_LINE_WIDTH = 3;
const DAMAGE_NUMBERS_ENABLED = true;
const DAMAGE_NUMBER_LIFETIME_MS = 420;
const DAMAGE_NUMBER_RISE_PX = 12;
const WAVE_SPAWN_INTERVAL_MS = 350;
const WAVE_FIRST_SPAWN_DELAY_MS = 200;


type CreepRenderState = {
  entity: CreepEntity;
  sprite: Phaser.GameObjects.Sprite;
  hitFlashRemainingMs: number;
  deathFadeRemainingMs: number;
};

type TowerRenderState = {
  entity: TowerEntity;
  runtime: TowerCombatRuntime;
};

type AttackTraceState = {
  graphics: Phaser.GameObjects.Graphics;
  remainingMs: number;
  maxLifetimeMs: number;
};

type DamageNumberState = {
  text: Phaser.GameObjects.Text;
  startY: number;
  remainingMs: number;
};

type TowerAttackPulseState = {
  graphics: Phaser.GameObjects.Graphics;
  remainingMs: number;
};

type PendingWaveSpawn = {
  unit: UnitConfig;
  spawnAtMs: number;
  sequenceIndex: number;
};

export class GameScene extends Phaser.Scene {
  public static readonly KEY = 'GameScene';
  private isSceneCleanedUp = false;
  private hoveredCell: GridPosition | null = null;
  private gridModel: GridModel | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private buildPreviewOverlay: Phaser.GameObjects.Graphics | null = null;
  private attackTraceOverlay: Phaser.GameObjects.Graphics | null = null;
  private towerPulseOverlay: Phaser.GameObjects.Graphics | null = null;
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
  private activeAttackTraces: AttackTraceState[] = [];
  private activeDamageNumbers: DamageNumberState[] = [];
  private activeTowerAttackPulses: TowerAttackPulseState[] = [];
  private pointerMoveHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private scaleResizeHandler: (() => void) | null = null;
  private gameOutHandler: (() => void) | null = null;
  private unsubscribeStartWaveCommand: (() => void) | null = null;
  private unsubscribeTowerSelectCommand: (() => void) | null = null;
  private unsubscribeFactionSelectCommand: (() => void) | null = null;
  private selectedTowerType: 'archer' | null = null;
  private selectedFaction: HudFactionType = 'undead';
  private activeTouchGesture:
    | { startedAtMs: number; startX: number; startY: number; soldByLongPress: boolean }
    | null = null;
  private lastActionAtMs = Number.NEGATIVE_INFINITY;
  private devFpsReportElapsedMs = 0;
  private lastPublishedAutoStartSecondsLeft: number | null = null;
  private soundManager: GameSoundManager | null = null;

  constructor() {
    super(GameScene.KEY);
  }

  public preload(): void {
    Object.entries(UNIT_SPRITE_ASSETS).forEach(([key, assetPath]) => {
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, assetPath, {
          frameWidth: UNIT_SPRITE_SHEET_FRAME.width,
          frameHeight: UNIT_SPRITE_SHEET_FRAME.height,
        });
      }
    });
  }

  public create(): void {
    this.isSceneCleanedUp = false;
    this.cameras.main.setBackgroundColor('#1a1f2c');
    this.cameras.main.roundPixels = true;
    this.registerScaleResizeHandling();
    this.drawGrid();
    this.registerGridHoverDetection();
    this.attackTraceOverlay = this.add.graphics();
    this.towerPulseOverlay = this.add.graphics();
    this.buildPreviewOverlay = this.add.graphics();
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
    this.updateAttackTraces(delta);
    this.updateTowerAttackPulses(delta);
    this.updateDamageNumbers(delta);
    this.updatePerformanceTelemetry(delta);
  }

  private drawGrid(): void {
    this.gridGraphics ??= this.add.graphics();
    this.gridGraphics.clear();

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

        this.add
          .text(
            x + GRID_DIMENSIONS.cellSize / 2,
            y + GRID_DIMENSIONS.cellSize / 2,
            cell.role === 'entrance' ? 'IN' : 'OUT',
            {
              fontFamily: 'Arial',
              fontSize: '10px',
              color: '#ffffff',
            },
          )
          .setOrigin(0.5);
      }
    }

    this.initializeWaveRuntime(grid);
  }

  private initializeWaveRuntime(grid: GridModel): void {
    const waveStartPath = calculateWaveStartPath(grid);
    this.activeCreepPath = waveStartPath;
    this.activeCreeps.forEach((creep) => creep.sprite.destroy());
    this.activeCreeps = [];
    this.activeTowers = [];
    this.isWaveCompletionRewardGranted = false;
    this.applyEarlyWaveStartBonusPlaceholder();

    if (waveStartPath.length === 0) {
      this.nextWaveStartsAtMs = null;
      this.publishHudSnapshot();
      return;
    }

    this.nextWaveStartsAtMs = this.time.now + AUTO_WAVE_START_DELAY_MS;
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.publishHudSnapshot();
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

  private updateBuildPreview(): void {
    if (!this.buildPreviewOverlay) {
      return;
    }

    this.buildPreviewOverlay.clear();

    if (!this.canPerformBuildActions()) {
      return;
    }

    if (!this.hoveredCell || !this.gridModel) {
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
    this.placedTowerCostsByCellKey.set(
      this.toGridCellKey(hoveredCell),
      DEFAULT_TOWER_COST,
    );
    this.activeTowers.push({
      entity: {
        id: this.toTowerId(hoveredCell),
        position: { x: hoveredCell.x, y: hoveredCell.y },
        cost: DEFAULT_TOWER_COST,
        type: 'archer',
        combatStats: TOWER_COMBAT_STATS_BY_TYPE.archer,
      },
      runtime: createInitialTowerCombatRuntime(),
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
    this.activeTowers = this.activeTowers.filter(
      (tower) => tower.entity.id !== this.toTowerId(hoveredCell),
    );

    const refundAmount = Math.floor(towerCost * SELL_REFUND_RATIO);
    this.registry.set('economy.lastSellRefund', refundAmount);
    this.markUserActionProcessed();
    this.publishHudSnapshot();

    this.drawGridCell(targetCell);
    this.updateBuildPreview();

  }

  private drawGridCell(cell: GridCell): void {
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
          : cell.isOccupied
            ? 0x3f4f66
            : 0x253248;

    this.gridGraphics.fillStyle(fillColor, 1);
    this.gridGraphics.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
    this.gridGraphics.lineStyle(1, 0x42597f, 1);
    this.gridGraphics.strokeRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
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
    }
    this.publishHudSnapshot();

    const escapedCount = this.activeCreeps.filter(
      (candidate) => candidate.entity.status === 'escaped',
    ).length;
    this.registry.set('wave.escapedCreeps', escapedCount);
  }

  private removeDeadCreepsFromActiveWave(deltaMs: number): void {
    const aliveCreeps: CreepRenderState[] = [];

    for (const creep of this.activeCreeps) {
      if (!isCreepDead(creep.entity)) {
        aliveCreeps.push(creep);
        continue;
      }

      if (creep.deathFadeRemainingMs <= 0) {
        creep.deathFadeRemainingMs = CREEP_DEATH_FADE_DURATION_MS;
      }

      creep.deathFadeRemainingMs = Math.max(0, creep.deathFadeRemainingMs - deltaMs);
      const alpha = creep.deathFadeRemainingMs / CREEP_DEATH_FADE_DURATION_MS;
      creep.sprite.setAlpha(alpha);

      if (creep.deathFadeRemainingMs > 0) {
        aliveCreeps.push(creep);
        continue;
      }

      creep.sprite.destroy();
    }

    this.activeCreeps = aliveCreeps;
  }

  private updateTowerCombat(deltaMs: number): void {
    if (this.activeTowers.length === 0 || this.activeCreeps.length === 0) {
      return;
    }

    const creepsForTargeting = this.activeCreeps.map((creep) => creep.entity);

    for (const tower of this.activeTowers) {
      tower.runtime = tickTowerCooldown(tower.runtime, deltaMs);

      if (!canTowerAttack(tower.entity, tower.runtime)) {
        continue;
      }

      const targetCreep = selectTowerTarget(tower.entity, creepsForTargeting);

      if (!targetCreep) {
        continue;
      }

      const targetRenderState = this.activeCreeps.find(
        (creep) => creep.entity.id === targetCreep.id,
      );

      if (!targetRenderState) {
        continue;
      }

      const damageResult = applyDamageToCreep(
        targetRenderState.entity,
        tower.entity.combatStats.damage,
      );

      targetRenderState.entity = damageResult.creep;
      this.applyCreepHitFeedback(targetRenderState);
      this.soundManager?.play('hit');
      this.spawnDamageNumber(
        targetRenderState.entity.position,
        tower.entity.combatStats.damage,
      );

      if (damageResult.killed) {
        const nextResources = addGold(
          { gold: this.playerGold, lives: this.playerLives },
          ECONOMY_BALANCE.creepKillRewardGold,
        );
        this.playerGold = nextResources.gold;
        this.registry.set('economy.gold', this.playerGold);
        this.soundManager?.play('death');
        this.publishHudSnapshot();
      }

      tower.runtime = consumeTowerAttack(tower.entity, tower.runtime);
      this.spawnAttackFeedback(tower.entity, targetRenderState.entity.position);
      this.spawnTowerAttackPulse(tower.entity.position);
      this.soundManager?.play('attack');
    }
  }

  private spawnAttackFeedback(
    tower: TowerEntity,
    to: GridPosition,
  ): void {
    if (!this.attackTraceOverlay) {
      return;
    }

    const fromCenter = this.toCellCenter(tower.position);
    const toCenter = this.toCellCenter(to);
    const lifetimeMs = Math.max(
      ATTACK_FEEDBACK_MIN_LIFETIME_MS,
      Math.min(ATTACK_FEEDBACK_MAX_LIFETIME_MS, Math.round(tower.combatStats.attackCooldownMs * 0.28)),
    );
    const trace = this.add.graphics();
    trace.lineStyle(2, 0xffdc88, ATTACK_FEEDBACK_BASE_ALPHA);
    trace.beginPath();
    trace.moveTo(fromCenter.x, fromCenter.y);
    trace.lineTo(toCenter.x, toCenter.y);
    trace.strokePath();
    this.activeAttackTraces.push({
      graphics: trace,
      remainingMs: lifetimeMs,
      maxLifetimeMs: lifetimeMs,
    });
  }

  private updateAttackTraces(deltaMs: number): void {
    if (this.activeAttackTraces.length === 0) {
      return;
    }

    const nextTraces: AttackTraceState[] = [];

    for (const trace of this.activeAttackTraces) {
      const remainingMs = trace.remainingMs - deltaMs;

      if (remainingMs <= 0) {
        trace.graphics.destroy();
        continue;
      }

      trace.graphics.setAlpha(remainingMs / trace.maxLifetimeMs);
      nextTraces.push({
        graphics: trace.graphics,
        remainingMs,
        maxLifetimeMs: trace.maxLifetimeMs,
      });
    }

    this.activeAttackTraces = nextTraces;
  }

  private spawnTowerAttackPulse(position: GridPosition): void {
    if (!this.towerPulseOverlay) {
      return;
    }

    const x = position.x * GRID_DIMENSIONS.cellSize;
    const y = position.y * GRID_DIMENSIONS.cellSize;
    const pulse = this.add.graphics();
    pulse.lineStyle(TOWER_ATTACK_PULSE_MAX_LINE_WIDTH, TOWER_ATTACK_PULSE_COLOR, 0.95);
    pulse.strokeRect(x + 2, y + 2, GRID_DIMENSIONS.cellSize - 4, GRID_DIMENSIONS.cellSize - 4);
    this.activeTowerAttackPulses.push({
      graphics: pulse,
      remainingMs: TOWER_ATTACK_PULSE_LIFETIME_MS,
    });
  }

  private updateTowerAttackPulses(deltaMs: number): void {
    if (this.activeTowerAttackPulses.length === 0) {
      return;
    }

    const nextPulses: TowerAttackPulseState[] = [];

    for (const pulse of this.activeTowerAttackPulses) {
      const remainingMs = pulse.remainingMs - deltaMs;

      if (remainingMs <= 0) {
        pulse.graphics.destroy();
        continue;
      }

      const alpha = remainingMs / TOWER_ATTACK_PULSE_LIFETIME_MS;
      pulse.graphics.setAlpha(alpha);
      nextPulses.push({
        graphics: pulse.graphics,
        remainingMs,
      });
    }

    this.activeTowerAttackPulses = nextPulses;
  }

  private spawnDamageNumber(position: GridPosition, damage: number): void {
    if (!DAMAGE_NUMBERS_ENABLED) {
      return;
    }

    const center = this.toCellCenter(position);
    const text = this.add.text(center.x, center.y - 10, `${damage}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '11px',
      color: '#ffe9a8',
      stroke: '#1d2536',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);

    this.activeDamageNumbers.push({
      text,
      startY: text.y,
      remainingMs: DAMAGE_NUMBER_LIFETIME_MS,
    });
  }

  private updateDamageNumbers(deltaMs: number): void {
    if (this.activeDamageNumbers.length === 0) {
      return;
    }

    const next: DamageNumberState[] = [];

    for (const numberState of this.activeDamageNumbers) {
      const remainingMs = numberState.remainingMs - deltaMs;

      if (remainingMs <= 0) {
        numberState.text.destroy();
        continue;
      }

      const progress = 1 - remainingMs / DAMAGE_NUMBER_LIFETIME_MS;
      numberState.text.setAlpha(1 - progress);
      numberState.text.setY(numberState.startY - DAMAGE_NUMBER_RISE_PX * progress);
      next.push({
        ...numberState,
        remainingMs,
      });
    }

    this.activeDamageNumbers = next;
  }

  private applyCreepHitFeedback(creep: CreepRenderState): void {
    creep.hitFlashRemainingMs = CREEP_HIT_FLASH_DURATION_MS;
    creep.sprite.setTint(CREEP_HIT_FLASH_COLOR);
  }

  private updateCreepHitFeedback(deltaMs: number): void {
    for (const creep of this.activeCreeps) {
      if (creep.hitFlashRemainingMs <= 0) {
        continue;
      }

      creep.hitFlashRemainingMs = Math.max(0, creep.hitFlashRemainingMs - deltaMs);

      if (creep.hitFlashRemainingMs === 0) {
        creep.sprite.setTint(CREEP_BASE_COLOR);
        continue;
      }

      const progress = creep.hitFlashRemainingMs / CREEP_HIT_FLASH_DURATION_MS;
      const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(CREEP_BASE_COLOR),
        Phaser.Display.Color.ValueToColor(CREEP_HIT_FLASH_COLOR),
        100,
        Math.round(progress * 100),
      );
      creep.sprite.setTint(Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b));
    }
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
    if (this.isWaveCompletionRewardGranted) {
      return;
    }

    if (this.pendingWaveSpawns.length > 0) {
      return;
    }

    if (this.activeCreeps.length === 0) {
      return;
    }

    const hasAliveCreep = this.activeCreeps.some(
      (creep) => creep.entity.status === 'alive',
    );

    if (hasAliveCreep) {
      return;
    }

    this.wavePhaseState = completeWaveIfResolved(
      this.wavePhaseState,
      this.activeCreeps.map((creep) => creep.entity),
    );

    const nextResources = addGold(
      { gold: this.playerGold, lives: this.playerLives },
      ECONOMY_BALANCE.waveCompletionRewardGold,
    );
    this.playerGold = nextResources.gold;
    this.registry.set('economy.gold', this.playerGold);
    this.isWaveCompletionRewardGranted = true;
    this.wavePhaseState = transitionCompletedToBuild(this.wavePhaseState);
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.nextWaveStartsAtMs ??= this.time.now + AUTO_WAVE_START_DELAY_MS;
    this.publishHudSnapshot();
  }

  private updateAutoWaveCountdown(nowMs: number): void {
    if (!this.canPerformBuildActions() || this.nextWaveStartsAtMs === null) {
      if (this.lastPublishedAutoStartSecondsLeft !== null) {
        this.lastPublishedAutoStartSecondsLeft = null;
        this.publishHudSnapshot();
      }
      return;
    }

    const nextSecondsLeft = Math.max(
      0,
      Math.ceil((this.nextWaveStartsAtMs - nowMs) / 1000),
    );

    if (this.lastPublishedAutoStartSecondsLeft === nextSecondsLeft) {
      return;
    }

    this.lastPublishedAutoStartSecondsLeft = nextSecondsLeft;
    this.publishHudSnapshot();
  }

  private applyEarlyWaveStartBonusPlaceholder(): void {
    const result = applyEarlyWaveStartBonusPlaceholder(
      { gold: this.playerGold, lives: this.playerLives },
      ECONOMY_BALANCE.earlyWaveStartBonusGold,
      EARLY_WAVE_START_BONUS_PLACEHOLDER_ELIGIBLE,
    );

    this.playerGold = result.resources.gold;
    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.earlyWaveStartBonus.granted', result.granted);
    this.publishHudSnapshot();
  }

  private tryStartNextWave(nowMs: number): void {
    if (this.nextWaveStartsAtMs === null) {
      return;
    }

    if (nowMs < this.nextWaveStartsAtMs) {
      return;
    }

    if (!this.gridModel) {
      this.nextWaveStartsAtMs = null;
      return;
    }

    this.startNextWaveFromBuildState();
  }

  private tryRestartRun(nowMs: number): void {
    if (this.restartScheduledAtMs === null) {
      return;
    }

    if (nowMs < this.restartScheduledAtMs) {
      return;
    }

    this.restartScheduledAtMs = null;
    this.resetRunToInitialState();
  }

  private resetRunToInitialState(): void {
    this.destroyAllCreeps();
    this.destroyAllAttackTraces();
    this.activeTowers = [];
    this.placedTowerCostsByCellKey.clear();
    this.hoveredCell = null;
    this.updateHoveredCellDebugRegistry();
    this.buildPreviewOverlay?.clear();
    this.nextWaveStartsAtMs = null;
    this.activeCreepPath = [];
    this.pendingWaveSpawns = [];
    this.isWaveCompletionRewardGranted = false;

    const initialResources = createInitialPlayerResources();
    this.playerGold = initialResources.gold;
    this.playerLives = initialResources.lives;
    this.wavePhaseState = resetWavePhaseState();
    this.isGameOver = false;
    this.currentWaveNumber = 1;

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
    this.destroyAllCreeps();
    this.pendingWaveSpawns = [];
    const units = generateWaveUnits({
      waveNumber: this.currentWaveNumber,
      factionUnits: this.getSelectedFactionUnits(),
    });

    const firstSpawnAtMs = this.time.now + WAVE_FIRST_SPAWN_DELAY_MS;
    this.pendingWaveSpawns = units.map((unit, index) => ({
      unit,
      sequenceIndex: index,
      spawnAtMs: firstSpawnAtMs + index * WAVE_SPAWN_INTERVAL_MS,
    }));
  }

  private processPendingWaveSpawns(nowMs: number): void {
    if (this.pendingWaveSpawns.length === 0 || this.activeCreepPath.length === 0) {
      return;
    }

    const startPoint = this.toCellCenter(this.activeCreepPath[0]);
    const readySpawns = this.pendingWaveSpawns.filter((spawn) => spawn.spawnAtMs <= nowMs);
    this.pendingWaveSpawns = this.pendingWaveSpawns.filter((spawn) => spawn.spawnAtMs > nowMs);

    for (const spawn of readySpawns) {
      const waveCreep: CreepEntity = {
        id: `wave:creep:${this.currentWaveNumber}:${spawn.sequenceIndex}`,
        type: 'basic',
        hp: spawn.unit.health,
        lifeState: 'alive',
        speed: spawn.unit.speed,
        status: 'alive',
        position: { ...this.activeCreepPath[0] },
        pathIndex: 0,
      };

      const spriteKey = this.getSpriteKeyByUnit(spawn.unit);
      const animationKey = this.getAnimationKeyByUnit(spawn.unit);
      const sprite = this.add.sprite(startPoint.x, startPoint.y, spriteKey, 0);
      sprite.setDisplaySize(24, 24);
      sprite.setTint(CREEP_BASE_COLOR);
      sprite.play(animationKey);

      this.activeCreeps.push({
        entity: waveCreep,
        sprite,
        hitFlashRemainingMs: 0,
        deathFadeRemainingMs: 0,
      });
    }
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

    return UNIT_SPRITE_KEYS.UNDEAD_GHOUL;
  }

  private getAnimationKeyByUnit(unit: UnitConfig): string {
    if (unit.id === 'undead_skeleton') {
      return UNIT_ANIMATION_KEYS.UNDEAD_SKELETON_WALK;
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

  private destroyAllAttackTraces(): void {
    this.activeAttackTraces.forEach((trace) => trace.graphics.destroy());
    this.activeAttackTraces = [];
  }

  private destroyAllTowerAttackPulses(): void {
    this.activeTowerAttackPulses.forEach((pulse) => pulse.graphics.destroy());
    this.activeTowerAttackPulses = [];
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

    const snapshot: GameHudSnapshot = {
      gold: this.playerGold,
      lives: this.playerLives,
      waveNumber: this.currentWaveNumber,
      phase: this.wavePhaseState.phase,
      canStartWave:
        !this.isGameOver
        && this.canPerformBuildActions(),
      selectedTowerType: this.selectedTowerType,
      selectedFaction: this.selectedFaction,
      autoStartSecondsLeft,
    };

    publishGameHudSnapshot(snapshot);
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
    this.destroyAllAttackTraces();
    this.destroyAllTowerAttackPulses();
    this.destroyAllDamageNumbers();
    this.buildPreviewOverlay?.destroy();
    this.buildPreviewOverlay = null;
    this.attackTraceOverlay?.destroy();
    this.attackTraceOverlay = null;
    this.towerPulseOverlay?.destroy();
    this.towerPulseOverlay = null;
    this.gridGraphics?.destroy();
    this.gridGraphics = null;
    this.activeTowers = [];
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
