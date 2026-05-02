import Phaser from 'phaser';
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
const SELL_REFUND_RATIO = 0.5;
const START_GOLD = 100;
const CREEP_MOVE_SPEED_PX_PER_SEC = 80;
const DEV_ATTACK_TRACE_LIFETIME_MS = 120;

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
  private hoveredCell: GridPosition | null = null;
  private gridModel: GridModel | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private pathOverlay: Phaser.GameObjects.Graphics | null = null;
  private buildPreviewOverlay: Phaser.GameObjects.Graphics | null = null;
  private attackTraceOverlay: Phaser.GameObjects.Graphics | null = null;
  private placedTowerCostsByCellKey = new Map<string, number>();
  private playerGold = START_GOLD;
  private isBuildPhaseActive = true;
  private activeCreepPath: GridPosition[] = [];
  private activeCreeps: CreepRenderState[] = [];
  private activeTowers: TowerRenderState[] = [];
  private activeAttackTraces: AttackTraceState[] = [];

  constructor() {
    super(GameScene.KEY);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#1a1f2c');
    this.drawDebugGrid();
    this.registerGridHoverDetection();
    this.pathOverlay = this.add.graphics();
    this.buildPreviewOverlay = this.add.graphics();
    this.attackTraceOverlay = this.add.graphics();
    this.input.mouse?.disableContextMenu();
    this.registry.set('economy.gold', this.playerGold);
    this.registry.set('phase.build.active', this.isBuildPhaseActive);
  }

  public update(_time: number, delta: number): void {
    this.moveCreepsAlongPath(delta);
    this.updateTowerCombat(delta);
    this.removeDeadCreepsFromActiveWave();
    this.updateAttackTraces(delta);
  }

  private drawDebugGrid(): void {
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
      this.drawDebugPathOverlay(grid);
    }

    this.initializeDebugCreepMovement(grid);
  }

  private drawDebugPathOverlay(grid: ReturnType<typeof createGridModel>): void {
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

  private initializeDebugCreepMovement(grid: GridModel): void {
    const waveStartPath = calculateWaveStartPath(grid);
    this.activeCreepPath = waveStartPath;
    this.activeCreeps.forEach((creep) => creep.sprite.destroy());
    this.activeCreeps = [];
    this.activeTowers = [];

    if (waveStartPath.length === 0) {
      return;
    }

    const startPoint = this.toCellCenter(waveStartPath[0]);
    const debugCreep: CreepEntity = {
      id: 'debug:creep:0',
      type: 'basic',
      hp: 100,
      lifeState: 'alive',
      speed: 1,
      status: 'alive',
      position: { ...waveStartPath[0] },
      pathIndex: 0,
    };

    const sprite = this.add.circle(startPoint.x, startPoint.y, 8, 0x9bd6ff, 1);
    this.activeCreeps.push({
      entity: debugCreep,
      sprite,
    });
  }

  private registerGridHoverDetection(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.hoveredCell = this.toGridCell(pointer.worldX, pointer.worldY);
      this.updateHoveredCellDebug();
      this.updateBuildPreview();
    });

    this.input.on('gameout', () => {
      this.hoveredCell = null;
      this.updateHoveredCellDebug();
      this.updateBuildPreview();
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) {
        this.tryPlaceTowerAtHoveredCell();
        return;
      }

      if (pointer.button !== 2) {
        return;
      }

      this.trySellTowerAtHoveredCell();
    });
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

  private updateHoveredCellDebug(): void {
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

    if (this.playerGold < DEFAULT_TOWER_COST) {
      return false;
    }

    return validateTowerPlacementPath(grid, cellPosition);
  }

  private tryPlaceTowerAtHoveredCell(): void {
    if (!this.canPerformBuildActions()) {
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
    this.playerGold -= DEFAULT_TOWER_COST;
    this.registry.set('economy.gold', this.playerGold);

    this.drawGridCell(targetCell);
    this.updateBuildPreview();

    if (IS_DEV_MODE) {
      this.drawDebugPathOverlay(this.gridModel);
    }
  }

  private trySellTowerAtHoveredCell(): void {
    if (!this.canPerformBuildActions()) {
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
      this.drawDebugPathOverlay(this.gridModel);
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
    return this.isBuildPhaseActive;
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
}
