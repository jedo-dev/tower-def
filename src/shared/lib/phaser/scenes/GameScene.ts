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
  startWave,
  transitionCompletedToBuild,
  transitionToGameOver,
  type WavePhaseState,
} from '../../../../features/wave-phase';
import { ECONOMY_BALANCE } from '../../../constants/economy';
import { GRID_DEFAULT_ROW_CENTER, GRID_DIMENSIONS } from '../../../constants/grid';
import { calculateWaveStartPath } from '../../../../entities/wave';
import { applyDamageToCreep, isCreepDead } from '../../../../entities/creep';
import {
  TOWER_COMBAT_STATS_BY_TYPE,
  canTowerAttack,
  consumeTowerAttack,
  createInitialTowerCombatRuntime,
  selectTowerTarget,
  tickTowerCooldown,
} from '../../../../entities/tower';
import { createGridModel } from '../../grid/createGridModel';
import { findPathBfs } from '../../pathfinding/hasPathBfs';
import { validateTowerPlacementPath } from '../../pathfinding/validateTowerPlacementPath';
import type { GridPosition } from '../../../types/pathfinding';
import type { GridCell, GridModel } from '../../../types/grid';
import type { CreepEntity } from '../../../../entities/creep';
import type { TowerCombatRuntime, TowerEntity } from '../../../../entities/tower';

const ENTRANCE_CELL = { x: 0, y: GRID_DEFAULT_ROW_CENTER };
const EXIT_CELL = { x: GRID_DIMENSIONS.cols - 1, y: GRID_DEFAULT_ROW_CENTER };
const IS_DEV_MODE = import.meta.env.DEV;
const DEFAULT_TOWER_COST = 100;
const SELL_REFUND_RATIO = ECONOMY_BALANCE.towerSellRatio;
const CREEP_MOVE_SPEED_PX_PER_SEC = 80;
const DEV_ATTACK_TRACE_LIFETIME_MS = 120;
const INITIAL_PLAYER_RESOURCES = createInitialPlayerResources();
const EARLY_WAVE_START_BONUS_PLACEHOLDER_ELIGIBLE = false;
const NEXT_WAVE_DELAY_MS = 1200;
const RESTART_DELAY_MS = 1200;

type CreepRenderState = {
  entity: CreepEntity;
  sprite: Phaser.GameObjects.Arc;
};

type TowerRenderState = {
  entity: TowerEntity;
  runtime: TowerCombatRuntime;
};

type AttackTraceState = {
  graphics: Phaser.GameObjects.Graphics;
  remainingMs: number;
};

export class GameScene extends Phaser.Scene {
  public static readonly KEY = 'GameScene';
  private isSceneCleanedUp = false;
  private hoveredCell: GridPosition | null = null;
  private gridModel: GridModel | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private pathOverlay: Phaser.GameObjects.Graphics | null = null;
  private buildPreviewOverlay: Phaser.GameObjects.Graphics | null = null;
  private attackTraceOverlay: Phaser.GameObjects.Graphics | null = null;
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
  private activeTowers: TowerRenderState[] = [];
  private activeAttackTraces: AttackTraceState[] = [];
  private pointerMoveHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private gameOutHandler: (() => void) | null = null;

  constructor() {
    super(GameScene.KEY);
  }

  public create(): void {
    this.isSceneCleanedUp = false;
    this.cameras.main.setBackgroundColor('#1a1f2c');
    this.drawGrid();
    this.registerGridHoverDetection();
    if (IS_DEV_MODE) {
      this.pathOverlay = this.add.graphics();
      this.attackTraceOverlay = this.add.graphics();
    }
    this.buildPreviewOverlay = this.add.graphics();
    this.input.mouse?.disableContextMenu();
    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('economy.lives', this.playerLives);
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.registry.set('phase.game.over', this.isGameOver);
    this.registry.set('economy.earlyWaveStartBonus.granted', false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown, this);
  }

  public update(_time: number, delta: number): void {
    this.tryRestartRun(_time);

    if (this.isGameOver) {
      return;
    }

    this.moveCreepsAlongPath(delta);
    this.updateTowerCombat(delta);
    this.removeDeadCreepsFromActiveWave();
    this.applyWaveCompletionRewardIfResolved();
    this.tryStartNextWave(_time);
    this.updateAttackTraces(delta);
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

      if (IS_DEV_MODE && (cell.role === 'entrance' || cell.role === 'exit')) {
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

    if (IS_DEV_MODE) {
      this.drawPathOverlayDebug(grid);
    }

    this.initializeWaveRuntime(grid);
  }

  private drawPathOverlayDebug(grid: ReturnType<typeof createGridModel>): void {
    if (!this.pathOverlay) {
      return;
    }

    this.pathOverlay.clear();
    const pathResult = findPathBfs(grid);

    if (!pathResult.found) {
      return;
    }

    for (const point of pathResult.path) {
      const x = point.x * GRID_DIMENSIONS.cellSize;
      const y = point.y * GRID_DIMENSIONS.cellSize;

      this.pathOverlay.fillStyle(0xf5d742, 0.2);
      this.pathOverlay.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
    }
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
      return;
    }

    this.spawnWaveCreeps(waveStartPath);
    this.wavePhaseState = startWave(this.wavePhaseState).state;
    this.registry.set('phase.build.active', this.canPerformBuildActions());
  }

  private registerGridHoverDetection(): void {
    this.pointerMoveHandler = this.handlePointerMove.bind(this);
    this.pointerDownHandler = this.handlePointerDown.bind(this);
    this.gameOutHandler = this.handleGameOut.bind(this);

    this.input.on('pointermove', this.pointerMoveHandler);
    this.input.on('pointerdown', this.pointerDownHandler);
    this.input.on('gameout', this.gameOutHandler);
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
    if (!IS_DEV_MODE) {
      return;
    }

    if (this.hoveredCell) {
      this.registry.set('build.hoveredCell', this.hoveredCell);
      return;
    }

    this.registry.remove('build.hoveredCell');
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

    this.buildPreviewOverlay.fillStyle(isBuildCellValid ? 0x2fbf71 : 0xd24a43, 0.35);
    this.buildPreviewOverlay.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
  }

  private moveCreepsAlongPath(deltaMs: number): void {
    if (this.activeCreepPath.length === 0 || this.activeCreeps.length === 0) {
      return;
    }

    const stepDistance = (deltaMs / 1000) * CREEP_MOVE_SPEED_PX_PER_SEC;

    for (const creep of this.activeCreeps) {
      if (creep.entity.status !== 'alive') {
        continue;
      }

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

      if (distanceToNext <= stepDistance) {
        creep.sprite.setPosition(nextCenter.x, nextCenter.y);
        creep.entity.pathIndex = nextPathIndex;
        creep.entity.position = { x: nextPoint.x, y: nextPoint.y };

        if (nextPathIndex >= this.activeCreepPath.length - 1) {
          this.markCreepEscaped(creep);
        }
        continue;
      }

      const ratio = stepDistance / distanceToNext;
      creep.sprite.setPosition(
        creep.sprite.x + dx * ratio,
        creep.sprite.y + dy * ratio,
      );
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

    this.drawGridCell(targetCell);
    this.updateBuildPreview();

    if (IS_DEV_MODE) {
      this.drawPathOverlayDebug(this.gridModel);
    }
  }

  private trySellTowerAtHoveredCell(): void {
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

    this.drawGridCell(targetCell);
    this.updateBuildPreview();

    if (IS_DEV_MODE) {
      this.drawPathOverlayDebug(this.gridModel);
    }
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

    const escapedCount = this.activeCreeps.filter(
      (candidate) => candidate.entity.status === 'escaped',
    ).length;
    this.registry.set('wave.escapedCreeps', escapedCount);
  }

  private removeDeadCreepsFromActiveWave(): void {
    const aliveCreeps: CreepRenderState[] = [];

    for (const creep of this.activeCreeps) {
      if (!isCreepDead(creep.entity)) {
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

    for (const tower of this.activeTowers) {
      tower.runtime = tickTowerCooldown(tower.runtime, deltaMs);

      if (!canTowerAttack(tower.entity, tower.runtime)) {
        continue;
      }

      const targetCreep = selectTowerTarget(
        tower.entity,
        this.activeCreeps.map((creep) => creep.entity),
      );

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

      if (damageResult.killed) {
        const nextResources = addGold(
          { gold: this.playerGold, lives: this.playerLives },
          ECONOMY_BALANCE.creepKillRewardGold,
        );
        this.playerGold = nextResources.gold;
        this.registry.set('economy.gold', this.playerGold);
      }

      tower.runtime = consumeTowerAttack(tower.entity, tower.runtime);
      this.spawnDevAttackTrace(tower.entity.position, targetRenderState.entity.position);
    }
  }

  private spawnDevAttackTrace(
    from: GridPosition,
    to: GridPosition,
  ): void {
    if (!IS_DEV_MODE || !this.attackTraceOverlay) {
      return;
    }

    const fromCenter = this.toCellCenter(from);
    const toCenter = this.toCellCenter(to);
    const trace = this.add.graphics();
    trace.lineStyle(2, 0xffe07a, 1);
    trace.beginPath();
    trace.moveTo(fromCenter.x, fromCenter.y);
    trace.lineTo(toCenter.x, toCenter.y);
    trace.strokePath();
    this.activeAttackTraces.push({
      graphics: trace,
      remainingMs: DEV_ATTACK_TRACE_LIFETIME_MS,
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

      trace.graphics.setAlpha(remainingMs / DEV_ATTACK_TRACE_LIFETIME_MS);
      nextTraces.push({
        graphics: trace.graphics,
        remainingMs,
      });
    }

    this.activeAttackTraces = nextTraces;
  }

  private applyWaveCompletionRewardIfResolved(): void {
    if (this.isWaveCompletionRewardGranted) {
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
    this.nextWaveStartsAtMs ??= this.time.now + NEXT_WAVE_DELAY_MS;
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

    const wavePath = calculateWaveStartPath(this.gridModel);
    if (wavePath.length === 0) {
      this.nextWaveStartsAtMs = null;
      return;
    }

    this.activeCreepPath = wavePath;
    this.spawnWaveCreeps(wavePath);
    this.wavePhaseState = startNextWaveCycle(this.wavePhaseState);
    this.registry.set('phase.build.active', this.canPerformBuildActions());
    this.isWaveCompletionRewardGranted = false;
    this.nextWaveStartsAtMs = null;
    this.currentWaveNumber += 1;
    this.registry.set('wave.number', this.currentWaveNumber);
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
    this.pathOverlay?.clear();
    this.nextWaveStartsAtMs = null;
    this.activeCreepPath = [];
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

    this.drawGrid();
  }

  private spawnWaveCreeps(path: GridPosition[]): void {
    this.destroyAllCreeps();

    const startPoint = this.toCellCenter(path[0]);
    const waveCreep: CreepEntity = {
      id: `wave:creep:${this.currentWaveNumber}`,
      type: 'basic',
      hp: 100,
      lifeState: 'alive',
      speed: 1,
      status: 'alive',
      position: { ...path[0] },
      pathIndex: 0,
    };

    const sprite = this.add.circle(startPoint.x, startPoint.y, 8, 0x9bd6ff, 1);
    this.activeCreeps.push({
      entity: waveCreep,
      sprite,
    });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    this.hoveredCell = this.toGridCell(pointer.worldX, pointer.worldY);
    this.updateHoveredCellDebugRegistry();
    this.updateBuildPreview();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.button === 0) {
      this.tryPlaceTowerAtHoveredCell();
      return;
    }

    if (pointer.button !== 2) {
      return;
    }

    this.trySellTowerAtHoveredCell();
  }

  private handleGameOut(): void {
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

    if (this.gameOutHandler) {
      this.input.off('gameout', this.gameOutHandler);
      this.gameOutHandler = null;
    }

    this.destroyAllCreeps();
    this.destroyAllAttackTraces();
    this.pathOverlay?.destroy();
    this.pathOverlay = null;
    this.buildPreviewOverlay?.destroy();
    this.buildPreviewOverlay = null;
    this.attackTraceOverlay?.destroy();
    this.attackTraceOverlay = null;
    this.gridGraphics?.destroy();
    this.gridGraphics = null;
    this.activeTowers = [];
    this.activeCreepPath = [];
    this.gridModel = null;
    this.nextWaveStartsAtMs = null;
    this.restartScheduledAtMs = null;
    this.placedTowerCostsByCellKey.clear();
    this.hoveredCell = null;
  }
}
