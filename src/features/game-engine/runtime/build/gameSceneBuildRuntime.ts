import { TowerTypeId } from '../../../../shared/types/content-ids';
import { canSpendGold, spendGold } from '../../../../entities/player-resources';
import type { BuildableTowerConfig, TowerEntity } from '../../../../entities/tower';
import { TOWER_BASE_LEVEL, resolveTowerPlacementStats } from '../../../../entities/tower';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import type { Footprint, GridCell, GridModel } from '../../../../shared/types/grid';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import {
  canOccupyFootprint,
  findFootprintAnchorCovering,
  getFootprintCells,
} from '../../../../shared/lib/grid/footprint';
import { getCellAt } from '../../../../shared/lib/grid/getCellAt';
import type { FootprintPlacementPathCheck } from '../../../../shared/lib/pathfinding/validateFootprintPlacement';
import type { BuildRejectionReason } from '../../../../shared/lib/game-bridge/types';

export type BuildRuntimeState = {
  gridModel: GridModel | null;
  /** Cell under the pointer: picks the tower to sell, whichever cell of it is hit. */
  hoveredCell: GridPosition | null;
  /** Top-left anchor of the tower block the pointer would build. */
  hoveredBuildAnchor: GridPosition | null;
  playerGold: number;
  /** What each placed tower cost, keyed by its anchor cell. */
  placedTowerCostsByCellKey: Map<string, number>;
};

export type BuildRuntimeDeps = {
  canPerformPlace: () => boolean;
  /**
   * Why `canPerformPlace` says no, when the player should hear about it:
   * wrong view, wrong phase or a finished match. Null for the input cooldown,
   * which is not a rejection worth reporting.
   */
  resolvePlaceRejection?: () => BuildRejectionReason | null;
  canPerformSell: () => boolean;
  selectedTowerType: TowerTypeId | null;
  resolveTowerCost: (towerType: TowerTypeId) => number;
  /** Authored tower of the builder race for this archetype, when there is one. */
  resolveBuildableTower?: (towerType: TowerTypeId) => BuildableTowerConfig | null;
  toGridCellKey: (position: GridPosition) => string;
  toTowerId: (position: GridPosition) => string;
  checkFootprintPlacementPath: (
    grid: GridModel,
    anchor: GridPosition,
    footprint: Readonly<Footprint>,
  ) => FootprintPlacementPathCheck;
  sellRefundRatio: number;
};

export type BuildPlacementResult = {
  success: boolean;
  playerGold: number;
  /** Every cell the new tower now stands on. Empty on failure. */
  changedCells: GridCell[];
  placedTower: TowerEntity | null;
  towerType: TowerTypeId | null;
  /** Why the build was refused; null on success and for silent refusals (no anchor, cooldown). */
  rejectionReason: BuildRejectionReason | null;
  /** The block the player tried to build, when the pointer was over the grid. */
  anchor: GridPosition | null;
};

export type BuildSellResult = {
  success: boolean;
  /** Every cell the sold tower freed. Empty on failure. */
  changedCells: GridCell[];
  removedTowerId: string | null;
  refundAmount: number;
};

function resolveSelectedTowerType(deps: BuildRuntimeDeps): TowerTypeId {
  return deps.selectedTowerType ?? TowerTypeId.SINGLE;
}

/** What the selected tower costs: its authored content price, never a shared default. */
export function resolveSelectedTowerCost(deps: BuildRuntimeDeps): number {
  return deps.resolveTowerCost(resolveSelectedTowerType(deps));
}

function failedPlacement(
  playerGold: number,
  rejectionReason: BuildRejectionReason | null,
  anchor: GridPosition | null,
): BuildPlacementResult {
  return {
    success: false,
    playerGold,
    changedCells: [],
    placedTower: null,
    towerType: null,
    rejectionReason,
    anchor,
  };
}

const FAILED_SELL: BuildSellResult = {
  success: false,
  changedCells: [],
  removedTowerId: null,
  refundAmount: 0,
};

/** Cells of the tower block at `anchor` that exist on the grid. */
function getTowerCells(grid: GridModel, anchor: GridPosition): GridCell[] {
  const cells: GridCell[] = [];
  for (const point of getFootprintCells(anchor, TOWER_FOOTPRINT)) {
    const cell = getCellAt(grid, point.x, point.y);
    if (cell) {
      cells.push(cell);
    }
  }
  return cells;
}

function mapPathCheckToRejection(check: FootprintPlacementPathCheck): BuildRejectionReason | null {
  switch (check) {
    case 'open':
      return null;
    case 'blocked_for_small':
      return 'path_blocked_small';
    case 'blocked_for_large':
      return 'path_blocked_large';
    case 'invalid_anchor':
      return 'cells_occupied';
  }
}

/**
 * Build rule for a tower block anchored at `anchor`, as the reason it fails:
 * free cells first, then gold, then an open route for both size classes.
 * Null when the block may be built.
 */
export function diagnoseBuildAnchor(
  state: BuildRuntimeState,
  deps: BuildRuntimeDeps,
  anchor: GridPosition,
  grid: GridModel,
): BuildRejectionReason | null {
  if (!canOccupyFootprint(grid, anchor, TOWER_FOOTPRINT)) return 'cells_occupied';
  if (!canSpendGold({ gold: state.playerGold }, resolveSelectedTowerCost(deps))) {
    return 'insufficient_gold';
  }

  return mapPathCheckToRejection(deps.checkFootprintPlacementPath(grid, anchor, TOWER_FOOTPRINT));
}

/** Build rule for a tower block anchored at `anchor`: free cells, gold, open route. */
export function isBuildAnchorValid(
  state: BuildRuntimeState,
  deps: BuildRuntimeDeps,
  anchor: GridPosition,
  grid: GridModel,
): boolean {
  return diagnoseBuildAnchor(state, deps, anchor, grid) === null;
}

export function tryPlaceTowerAtHoveredCell(
  state: BuildRuntimeState,
  deps: BuildRuntimeDeps,
): BuildPlacementResult {
  const anchor = state.hoveredBuildAnchor;
  if (!deps.canPerformPlace()) {
    return failedPlacement(state.playerGold, deps.resolvePlaceRejection?.() ?? null, anchor);
  }
  if (!anchor || !state.gridModel) {
    return failedPlacement(state.playerGold, null, anchor);
  }

  const rejectionReason = diagnoseBuildAnchor(state, deps, anchor, state.gridModel);
  if (rejectionReason !== null) {
    return failedPlacement(state.playerGold, rejectionReason, anchor);
  }

  const towerType = resolveSelectedTowerType(deps);
  const towerCost = deps.resolveTowerCost(towerType);
  const spendGoldResult = spendGold({ gold: state.playerGold }, towerCost);
  if (!spendGoldResult.spent) {
    return failedPlacement(state.playerGold, 'insufficient_gold', anchor);
  }

  const changedCells = getTowerCells(state.gridModel, anchor);
  for (const cell of changedCells) {
    cell.isOccupied = true;
    cell.isWalkable = false;
  }

  state.placedTowerCostsByCellKey.set(deps.toGridCellKey(anchor), towerCost);

  const authoredTower = deps.resolveBuildableTower?.(towerType) ?? null;

  const towerEntity: TowerEntity = {
    id: deps.toTowerId(anchor),
    position: { x: anchor.x, y: anchor.y },
    cost: towerCost,
    type: towerType,
    ...(authoredTower
      ? { buildableTowerId: authoredTower.id, allowedTargets: authoredTower.allowedTargets }
      : {}),
    level: TOWER_BASE_LEVEL,
    combatStats: resolveTowerPlacementStats(towerType, authoredTower),
  };

  state.playerGold = spendGoldResult.resources.gold;

  return {
    success: true,
    playerGold: state.playerGold,
    changedCells,
    placedTower: towerEntity,
    towerType,
    rejectionReason: null,
    anchor,
  };
}

/** Anchor of the placed tower standing on `cell`, or null. */
export function findPlacedTowerAnchorAt(
  state: BuildRuntimeState,
  deps: Pick<BuildRuntimeDeps, 'toGridCellKey'>,
  cell: GridPosition,
): GridPosition | null {
  const grid = state.gridModel;
  if (!grid) {
    return null;
  }

  return findFootprintAnchorCovering(
    cell,
    TOWER_FOOTPRINT,
    (anchor) =>
      state.placedTowerCostsByCellKey.has(deps.toGridCellKey(anchor)) &&
      getTowerCells(grid, anchor).every(
        (towerCell) => towerCell.role === 'empty' && towerCell.isOccupied,
      ),
  );
}

export function trySellTowerAtHoveredCell(
  state: BuildRuntimeState,
  deps: BuildRuntimeDeps,
): BuildSellResult {
  if (!deps.canPerformSell() || !state.hoveredCell || !state.gridModel) {
    return FAILED_SELL;
  }

  const anchor = findPlacedTowerAnchorAt(state, deps, state.hoveredCell);
  if (!anchor) {
    return FAILED_SELL;
  }

  const anchorKey = deps.toGridCellKey(anchor);
  const towerCost = state.placedTowerCostsByCellKey.get(anchorKey);
  if (towerCost === undefined) {
    return FAILED_SELL;
  }

  const changedCells = getTowerCells(state.gridModel, anchor);
  for (const cell of changedCells) {
    cell.isOccupied = false;
    cell.isWalkable = true;
  }
  state.placedTowerCostsByCellKey.delete(anchorKey);

  return {
    success: true,
    changedCells,
    removedTowerId: deps.toTowerId(anchor),
    refundAmount: Math.floor(towerCost * deps.sellRefundRatio),
  };
}
