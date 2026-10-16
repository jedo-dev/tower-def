import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { TowerTypeId } from '../../../../shared/types/content-ids';
import type { GridModel } from '../../../../shared/types/grid';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import { createGridModel } from '../../../../shared/lib/grid/createGridModel';
import { createDefaultEdgeEndpoints } from '../../../../shared/lib/grid/generateEdgeEndpoints';
import { getFootprintCells } from '../../../../shared/lib/grid/footprint';
import { getCellAt } from '../../../../shared/lib/grid/getCellAt';
import { checkFootprintPlacementPath } from '../../../../shared/lib/pathfinding/validateFootprintPlacement';
import {
  diagnoseBuildAnchor,
  findPlacedTowerAnchorAt,
  isBuildAnchorValid,
  tryPlaceTowerAtHoveredCell,
  trySellTowerAtHoveredCell,
  type BuildRuntimeDeps,
  type BuildRuntimeState,
} from './gameSceneBuildRuntime';

const TOWER_COST = 50;

function createState(grid: GridModel = createGridModel(createDefaultEdgeEndpoints())) {
  const state: BuildRuntimeState = {
    gridModel: grid,
    hoveredCell: null,
    hoveredBuildAnchor: null,
    playerGold: 1000,
    placedTowerCostsByCellKey: new Map(),
  };
  return state;
}

const DEPS: BuildRuntimeDeps = {
  canPerformPlace: () => true,
  canPerformSell: () => true,
  selectedTowerType: TowerTypeId.SINGLE,
  resolveTowerCost: () => TOWER_COST,
  toGridCellKey: (position) => `${position.x}:${position.y}`,
  toTowerId: (position) => `tower:${position.x}:${position.y}`,
  checkFootprintPlacementPath: (grid, anchor, footprint) =>
    checkFootprintPlacementPath(grid, anchor, footprint),
  sellRefundRatio: 0.5,
};

function place(state: BuildRuntimeState, anchor: GridPosition) {
  state.hoveredBuildAnchor = anchor;
  return tryPlaceTowerAtHoveredCell(state, DEPS);
}

function occupiedCellCount(grid: GridModel): number {
  return grid.cells.filter((cell) => cell.isOccupied).length;
}

describe('player 2x2 tower building', () => {
  it('occupies all four cells of the block and keeps the anchor on the tower', () => {
    const state = createState();
    const result = place(state, { x: 6, y: 4 });

    expect(result.success).toBe(true);
    expect(result.placedTower?.position).toEqual({ x: 6, y: 4 });
    expect(result.changedCells).toHaveLength(4);
    for (const point of getFootprintCells({ x: 6, y: 4 }, TOWER_FOOTPRINT)) {
      const cell = getCellAt(state.gridModel!, point.x, point.y);
      expect(cell?.isOccupied).toBe(true);
      expect(cell?.isWalkable).toBe(false);
    }
    expect(occupiedCellCount(state.gridModel!)).toBe(4);
  });

  it('rejects a block overlapping an existing tower', () => {
    const state = createState();
    place(state, { x: 6, y: 4 });

    for (const anchor of [
      { x: 5, y: 3 },
      { x: 7, y: 5 },
      { x: 6, y: 5 },
    ]) {
      expect(place(state, anchor).success).toBe(false);
    }
    expect(place(state, { x: 8, y: 4 }).success).toBe(true);
    expect(occupiedCellCount(state.gridModel!)).toBe(8);
  });

  it('rejects a block hanging off the grid', () => {
    const state = createState();

    expect(place(state, { x: GRID_DIMENSIONS.cols - 1, y: 3 }).success).toBe(false);
    expect(place(state, { x: 3, y: GRID_DIMENSIONS.rows - 1 }).success).toBe(false);
    expect(place(state, { x: -1, y: 3 }).success).toBe(false);
    expect(occupiedCellCount(state.gridModel!)).toBe(0);
  });

  it('rejects a block over the entrance zone', () => {
    const state = createState();
    const { entrance } = createDefaultEdgeEndpoints();

    expect(place(state, { x: entrance.x + 1, y: entrance.y }).success).toBe(false);
  });

  it('rejects a block that would seal the route', () => {
    const grid = createGridModel(createDefaultEdgeEndpoints());
    // Wall off column 8 except rows 10..11, which the block would close.
    for (const cell of grid.cells) {
      if ((cell.x === 8 || cell.x === 9) && cell.y !== 10 && cell.y !== 11) {
        cell.isOccupied = true;
        cell.isWalkable = false;
      }
    }
    const state = createState(grid);

    expect(isBuildAnchorValid(state, DEPS, { x: 8, y: 10 }, grid)).toBe(false);
    expect(place(state, { x: 8, y: 10 }).success).toBe(false);
  });

  it('rejects a block that leaves large creeps only a one-cell gap', () => {
    const grid = createGridModel(createDefaultEdgeEndpoints());
    // Columns 8..9 walled except rows 10..12; a block at (8, 10) leaves row 12 alone.
    for (const cell of grid.cells) {
      if ((cell.x === 8 || cell.x === 9) && (cell.y < 10 || cell.y > 12)) {
        cell.isOccupied = true;
        cell.isWalkable = false;
      }
    }
    const state = createState(grid);

    expect(place(state, { x: 8, y: 10 }).success).toBe(false);
    expect(place(state, { x: 4, y: 4 }).success).toBe(true);
  });

  it('rejects a block that seals the route by touching another wall at a corner', () => {
    const grid = createGridModel(createDefaultEdgeEndpoints());
    for (const cell of grid.cells) {
      const isUpperWall = (cell.x === 8 || cell.x === 9) && cell.y <= 11;
      const isLowerWall = (cell.x === 10 || cell.x === 11) && cell.y >= 14;
      if (isUpperWall || isLowerWall) {
        cell.isOccupied = true;
        cell.isWalkable = false;
      }
    }
    const state = createState(grid);

    expect(place(state, { x: 8, y: 12 }).success).toBe(false);
  });

  it('sells the tower from any of its four cells and frees all of them', () => {
    for (const tapped of getFootprintCells({ x: 6, y: 4 }, TOWER_FOOTPRINT)) {
      const state = createState();
      place(state, { x: 6, y: 4 });
      state.hoveredCell = tapped;

      const result = trySellTowerAtHoveredCell(state, DEPS);

      expect(result.success).toBe(true);
      expect(result.removedTowerId).toBe('tower:6:4');
      expect(result.refundAmount).toBe(TOWER_COST / 2);
      expect(result.changedCells).toHaveLength(4);
      expect(occupiedCellCount(state.gridModel!)).toBe(0);
      expect(state.placedTowerCostsByCellKey.size).toBe(0);
    }
  });

  it('refunds at the per-tower ratio when one is resolved (an aura sell bonus)', () => {
    const state = createState();
    place(state, { x: 6, y: 4 });
    state.hoveredCell = { x: 6, y: 4 };

    const result = trySellTowerAtHoveredCell(state, {
      ...DEPS,
      resolveSellRefundRatio: (towerId) => (towerId === 'tower:6:4' ? 0.75 : 0.5),
    });

    expect(result.refundAmount).toBe(Math.floor(TOWER_COST * 0.75));
  });

  it('finds the right tower among neighbours', () => {
    const state = createState();
    place(state, { x: 6, y: 4 });
    place(state, { x: 8, y: 4 });

    expect(findPlacedTowerAnchorAt(state, DEPS, { x: 7, y: 5 })).toEqual({ x: 6, y: 4 });
    expect(findPlacedTowerAnchorAt(state, DEPS, { x: 8, y: 5 })).toEqual({ x: 8, y: 4 });
    expect(findPlacedTowerAnchorAt(state, DEPS, { x: 10, y: 5 })).toBeNull();
  });

  it('sells nothing on an empty cell', () => {
    const state = createState();
    state.hoveredCell = { x: 2, y: 2 };

    expect(trySellTowerAtHoveredCell(state, DEPS).success).toBe(false);
  });
});

describe('build rejection reasons', () => {
  /** Walls off columns 8..9 except `gapRows` rows starting at row 10. */
  function createWalledGrid(gapRows: number): GridModel {
    const grid = createGridModel(createDefaultEdgeEndpoints());
    for (const cell of grid.cells) {
      if ((cell.x === 8 || cell.x === 9) && (cell.y < 10 || cell.y >= 10 + gapRows)) {
        cell.isOccupied = true;
        cell.isWalkable = false;
      }
    }
    return grid;
  }

  it('reports occupied cells for an overlapping block', () => {
    const state = createState();
    place(state, { x: 6, y: 4 });

    const result = place(state, { x: 7, y: 5 });

    expect(result.success).toBe(false);
    expect(result.rejectionReason).toBe('cells_occupied');
    expect(result.anchor).toEqual({ x: 7, y: 5 });
  });

  it('reports occupied cells for a block off the grid or over an endpoint zone', () => {
    const state = createState();
    const { entrance } = createDefaultEdgeEndpoints();

    expect(place(state, { x: -1, y: 3 }).rejectionReason).toBe('cells_occupied');
    expect(place(state, { x: entrance.x + 1, y: entrance.y }).rejectionReason).toBe(
      'cells_occupied',
    );
  });

  it('reports missing gold before looking at the route', () => {
    const state = createState();
    state.playerGold = TOWER_COST - 1;

    const result = place(state, { x: 6, y: 4 });

    expect(result.rejectionReason).toBe('insufficient_gold');
    expect(result.playerGold).toBe(TOWER_COST - 1);
  });

  it('reports a sealed route as blocked for small creeps', () => {
    const state = createState(createWalledGrid(2));

    expect(place(state, { x: 8, y: 10 }).rejectionReason).toBe('path_blocked_small');
    expect(diagnoseBuildAnchor(state, DEPS, { x: 8, y: 10 }, state.gridModel!)).toBe(
      'path_blocked_small',
    );
  });

  it('reports a one-cell gap as blocked for large creeps only', () => {
    const state = createState(createWalledGrid(3));

    expect(place(state, { x: 8, y: 10 }).rejectionReason).toBe('path_blocked_large');
    expect(isBuildAnchorValid(state, DEPS, { x: 8, y: 10 }, state.gridModel!)).toBe(false);
  });

  it('labels a refused phase through the scene-provided reason', () => {
    const state = createState();
    state.hoveredBuildAnchor = { x: 6, y: 4 };
    const deps: BuildRuntimeDeps = {
      ...DEPS,
      canPerformPlace: () => false,
      resolvePlaceRejection: () => 'not_build_phase',
    };

    const result = tryPlaceTowerAtHoveredCell(state, deps);

    expect(result.rejectionReason).toBe('not_build_phase');
    expect(result.anchor).toEqual({ x: 6, y: 4 });
    expect(occupiedCellCount(state.gridModel!)).toBe(0);
  });

  it('stays silent for the input cooldown and for taps off the grid', () => {
    const state = createState();
    state.hoveredBuildAnchor = { x: 6, y: 4 };
    const cooldownDeps: BuildRuntimeDeps = {
      ...DEPS,
      canPerformPlace: () => false,
      resolvePlaceRejection: () => null,
    };
    expect(tryPlaceTowerAtHoveredCell(state, cooldownDeps).rejectionReason).toBeNull();

    state.hoveredBuildAnchor = null;
    const offGrid = tryPlaceTowerAtHoveredCell(state, DEPS);
    expect(offGrid.rejectionReason).toBeNull();
    expect(offGrid.anchor).toBeNull();
  });

  it('carries no reason on a successful build', () => {
    const state = createState();

    const result = place(state, { x: 6, y: 4 });

    expect(result.success).toBe(true);
    expect(result.rejectionReason).toBeNull();
    expect(result.anchor).toEqual({ x: 6, y: 4 });
  });
});
