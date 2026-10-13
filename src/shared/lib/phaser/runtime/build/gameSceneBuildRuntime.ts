import { TowerTypeId } from '../../../../types/content-ids';
import { canSpendGold, spendGold } from '../../../../../entities/player-resources';
import type {
  BuildableTowerConfig,
  TowerCombatStats,
  TowerEntity,
} from '../../../../../entities/tower';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../../../../entities/tower';
import { TOWER_FOOTPRINT } from '../../../../constants/footprint';
import type { Footprint, GridCell, GridModel } from '../../../../types/grid';
import type { GridPosition } from '../../../../types/pathfinding';
import {
  canOccupyFootprint,
  findFootprintAnchorCovering,
  getFootprintCells,
} from '../../../grid/footprint';
import { getCellAt } from '../../../grid/getCellAt';

export type BuildRuntimeState = {
  gridModel: GridModel | null;
  /** Cell under the pointer: picks the tower to sell, whichever cell of it is hit. */
  hoveredCell: GridPosition | null;
  /** Top-left anchor of the tower block the pointer would build. */
  hoveredBuildAnchor: GridPosition | null;
  playerGold: number;
  playerLives: number;
  /** What each placed tower cost, keyed by its anchor cell. */
  placedTowerCostsByCellKey: Map<string, number>;
};

export type BuildRuntimeDeps = {
  canPerformPlace: () => boolean;
  canPerformSell: () => boolean;
  selectedTowerType: TowerTypeId | null;
  resolveTowerCost: (towerType: TowerTypeId) => number;
  /** Authored tower of the builder race for this archetype, when there is one. */
  resolveBuildableTower?: (towerType: TowerTypeId) => BuildableTowerConfig | null;
  toGridCellKey: (position: GridPosition) => string;
  toTowerId: (position: GridPosition) => string;
  validateFootprintPlacementPath: (
    grid: GridModel,
    anchor: GridPosition,
    footprint: Readonly<Footprint>,
  ) => boolean;
  sellRefundRatio: number;
};

export type BuildPlacementResult = {
  success: boolean;
  playerGold: number;
  /** Every cell the new tower now stands on. Empty on failure. */
  changedCells: GridCell[];
  placedTower: TowerEntity | null;
  towerType: TowerTypeId | null;
};

export type BuildSellResult = {
  success: boolean;
  /** Every cell the sold tower freed. Empty on failure. */
  changedCells: GridCell[];
  removedTowerId: string | null;
  refundAmount: number;
};

/**
 * A tower fights with its authored numbers when content declares them, and with
 * the archetype defaults otherwise.
 */
function resolvePlacementStats(
  towerType: TowerTypeId,
  authoredTower: BuildableTowerConfig | null,
): TowerCombatStats {
  const archetypeStats = TOWER_COMBAT_STATS_BY_TYPE[towerType];

  if (!authoredTower) {
    return { ...archetypeStats };
  }

  const authoredLevelOne = authoredTower.levels?.[0]?.stats;

  return {
    ...archetypeStats,
    ...(authoredLevelOne ?? {}),
    damage: authoredLevelOne?.damage ?? authoredTower.damage,
    range: authoredLevelOne?.range ?? authoredTower.range,
    attackCooldownMs: authoredLevelOne?.attackCooldownMs ?? authoredTower.attackCooldownMs,
    ...(authoredTower.splashRadius === undefined
      ? {}
      : { splashRadius: authoredTower.splashRadius }),
    ...(authoredTower.onHitEffects.length === 0
      ? {}
      : { onHitEffects: authoredTower.onHitEffects }),
  };
}

function resolveSelectedTowerType(deps: BuildRuntimeDeps): TowerTypeId {
  return deps.selectedTowerType ?? TowerTypeId.SINGLE;
}

/** What the selected tower costs: its authored content price, never a shared default. */
export function resolveSelectedTowerCost(deps: BuildRuntimeDeps): number {
  return deps.resolveTowerCost(resolveSelectedTowerType(deps));
}

function failedPlacement(playerGold: number): BuildPlacementResult {
  return { success: false, playerGold, changedCells: [], placedTower: null, towerType: null };
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

/** Build rule for a tower block anchored at `anchor`: free cells, gold, open route. */
export function isBuildAnchorValid(
  state: BuildRuntimeState,
  deps: BuildRuntimeDeps,
  anchor: GridPosition,
  grid: GridModel,
): boolean {
  if (!canOccupyFootprint(grid, anchor, TOWER_FOOTPRINT)) return false;
  if (!canSpendGold({ gold: state.playerGold }, resolveSelectedTowerCost(deps))) return false;

  return deps.validateFootprintPlacementPath(grid, anchor, TOWER_FOOTPRINT);
}

export function tryPlaceTowerAtHoveredCell(
  state: BuildRuntimeState,
  deps: BuildRuntimeDeps,
): BuildPlacementResult {
  const anchor = state.hoveredBuildAnchor;
  if (!deps.canPerformPlace() || !anchor || !state.gridModel) {
    return failedPlacement(state.playerGold);
  }

  if (!isBuildAnchorValid(state, deps, anchor, state.gridModel)) {
    return failedPlacement(state.playerGold);
  }

  const towerType = resolveSelectedTowerType(deps);
  const towerCost = deps.resolveTowerCost(towerType);
  const spendGoldResult = spendGold(
    { gold: state.playerGold, lives: state.playerLives },
    towerCost,
  );
  if (!spendGoldResult.spent) {
    return failedPlacement(state.playerGold);
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
    ...(authoredTower ? { buildableTowerId: authoredTower.id } : {}),
    level: TOWER_BASE_LEVEL,
    combatStats: resolvePlacementStats(towerType, authoredTower),
  };

  state.playerGold = spendGoldResult.resources.gold;

  return {
    success: true,
    playerGold: state.playerGold,
    changedCells,
    placedTower: towerEntity,
    towerType,
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
