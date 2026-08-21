import { TowerTypeId } from '../../../../types/content-ids';
import { canSpendGold, spendGold } from '../../../../../entities/player-resources';
import type { TowerEntity } from '../../../../../entities/tower';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../../../../entities/tower';
import type { GridCell, GridModel } from '../../../../types/grid';
import type { GridPosition } from '../../../../types/pathfinding';

export type BuildRuntimeState = {
  gridModel: GridModel | null;
  hoveredCell: GridPosition | null;
  playerGold: number;
  playerLives: number;
  placedTowerCostsByCellKey: Map<string, number>;
};

export type BuildRuntimeDeps = {
  canPerformPlace: () => boolean;
  canPerformSell: () => boolean;
  selectedTowerType: TowerTypeId | null;
  resolveTowerCost: (towerType: TowerTypeId) => number;
  toGridCellKey: (position: GridPosition) => string;
  toTowerId: (position: GridPosition) => string;
  validateTowerPlacementPath: (grid: GridModel, position: GridPosition) => boolean;
  sellRefundRatio: number;
  defaultTowerCost: number;
};

export type BuildPlacementResult = {
  success: boolean;
  playerGold: number;
  changedCell: GridCell | null;
  placedTower: TowerEntity | null;
  towerType: TowerTypeId | null;
};

export type BuildSellResult = {
  success: boolean;
  changedCell: GridCell | null;
  removedTowerId: string | null;
  refundAmount: number;
};

export function isBuildCellValid(
  state: BuildRuntimeState,
  deps: BuildRuntimeDeps,
  cellPosition: GridPosition,
  grid: GridModel,
): boolean {
  const cell = grid.cells.find((candidate) => candidate.x === cellPosition.x && candidate.y === cellPosition.y);

  if (!cell) return false;
  if (cell.role !== 'empty') return false;
  if (!cell.isWalkable || cell.isOccupied) return false;
  if (!canSpendGold({ gold: state.playerGold }, deps.defaultTowerCost)) return false;

  return deps.validateTowerPlacementPath(grid, cellPosition);
}

export function tryPlaceTowerAtHoveredCell(
  state: BuildRuntimeState,
  deps: BuildRuntimeDeps,
): BuildPlacementResult {
  if (!deps.canPerformPlace()) {
    return { success: false, playerGold: state.playerGold, changedCell: null, placedTower: null, towerType: null };
  }

  if (!state.hoveredCell || !state.gridModel) {
    return { success: false, playerGold: state.playerGold, changedCell: null, placedTower: null, towerType: null };
  }

  const hoveredCell = state.hoveredCell;
  if (!isBuildCellValid(state, deps, hoveredCell, state.gridModel)) {
    return { success: false, playerGold: state.playerGold, changedCell: null, placedTower: null, towerType: null };
  }

  const targetCell = state.gridModel.cells.find((cell) => cell.x === hoveredCell.x && cell.y === hoveredCell.y);
  if (!targetCell) {
    return { success: false, playerGold: state.playerGold, changedCell: null, placedTower: null, towerType: null };
  }

  const spendGoldResult = spendGold({ gold: state.playerGold, lives: state.playerLives }, deps.defaultTowerCost);
  if (!spendGoldResult.spent) {
    return { success: false, playerGold: state.playerGold, changedCell: null, placedTower: null, towerType: null };
  }

  targetCell.isOccupied = true;
  targetCell.isWalkable = false;

  const towerType = deps.selectedTowerType ?? TowerTypeId.SINGLE;
  const towerCost = deps.resolveTowerCost(towerType);
  state.placedTowerCostsByCellKey.set(deps.toGridCellKey(hoveredCell), towerCost);

  const towerEntity: TowerEntity = {
    id: deps.toTowerId(hoveredCell),
    position: { x: hoveredCell.x, y: hoveredCell.y },
    cost: towerCost,
    type: towerType,
    level: TOWER_BASE_LEVEL,
    combatStats: TOWER_COMBAT_STATS_BY_TYPE[towerType],
  };

  state.playerGold = spendGoldResult.resources.gold;

  return {
    success: true,
    playerGold: state.playerGold,
    changedCell: targetCell,
    placedTower: towerEntity,
    towerType,
  };
}

export function trySellTowerAtHoveredCell(
  state: BuildRuntimeState,
  deps: BuildRuntimeDeps,
): BuildSellResult {
  if (!deps.canPerformSell()) {
    return { success: false, changedCell: null, removedTowerId: null, refundAmount: 0 };
  }

  if (!state.hoveredCell || !state.gridModel) {
    return { success: false, changedCell: null, removedTowerId: null, refundAmount: 0 };
  }

  const hoveredCell = state.hoveredCell;
  const hoveredCellKey = deps.toGridCellKey(hoveredCell);
  const towerCost = state.placedTowerCostsByCellKey.get(hoveredCellKey);

  if (towerCost === undefined) {
    return { success: false, changedCell: null, removedTowerId: null, refundAmount: 0 };
  }

  const targetCell = state.gridModel.cells.find((cell) => cell.x === hoveredCell.x && cell.y === hoveredCell.y);
  if (!targetCell || targetCell.role !== 'empty' || !targetCell.isOccupied) {
    return { success: false, changedCell: null, removedTowerId: null, refundAmount: 0 };
  }

  targetCell.isOccupied = false;
  targetCell.isWalkable = true;
  state.placedTowerCostsByCellKey.delete(hoveredCellKey);

  return {
    success: true,
    changedCell: targetCell,
    removedTowerId: deps.toTowerId(hoveredCell),
    refundAmount: Math.floor(towerCost * deps.sellRefundRatio),
  };
}
