import {
  OCTILE_NEIGHBOR_DX,
  OCTILE_NEIGHBOR_DY,
  OCTILE_STEP_COST,
} from '../../constants/pathfinding';
import type { GridModel } from '../../types/grid';
import { getCellAt } from '../grid/getCellAt';

export type OctileSearchOptions = {
  /**
   * Extra passability check, keyed by row-major index (`y * cols + x`),
   * applied on top of the cell rule (`isWalkable && !isOccupied`). A cell is
   * entered only when both agree. Corner cutting uses the same answer, so a
   * clearance hook here (e.g. "a 2x2 agent anchored at this cell fits")
   * also covers the cells a diagonal step sweeps through.
   */
  isPassable?: (index: number) => boolean;
};

/** Flattened view of a grid for octile searches: 1 = passable, 0 = blocked. */
export type OctileGrid = {
  cols: number;
  rows: number;
  passable: Uint8Array;
};

export const OCTILE_DIRECTION_COUNT = OCTILE_NEIGHBOR_DX.length;
const FIRST_DIAGONAL_DIRECTION = 4;
const DIAGONAL_EXTRA_COST = OCTILE_STEP_COST.diagonal - OCTILE_STEP_COST.orthogonal;

export function createOctileGrid(grid: GridModel, options?: OctileSearchOptions): OctileGrid {
  const cols = Math.max(0, grid.cols);
  const rows = Math.max(0, grid.rows);
  const passable = new Uint8Array(cols * rows);
  const isPassable = options?.isPassable;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cell = getCellAt(grid, x, y);
      const index = y * cols + x;
      const isCellFree = cell !== undefined && cell.isWalkable && !cell.isOccupied;

      if (isCellFree && (isPassable === undefined || isPassable(index))) {
        passable[index] = 1;
      }
    }
  }

  return { cols, rows, passable };
}

export function isInsideOctileGrid(grid: OctileGrid, x: number, y: number): boolean {
  return (
    Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < grid.cols && y >= 0 && y < grid.rows
  );
}

export function isDiagonalDirection(direction: number): boolean {
  return direction >= FIRST_DIAGONAL_DIRECTION;
}

export function getStepCost(direction: number): number {
  return isDiagonalDirection(direction) ? OCTILE_STEP_COST.diagonal : OCTILE_STEP_COST.orthogonal;
}

/**
 * Row-major index reached by stepping from (x, y) in `direction`, or -1 when
 * the target is outside, blocked, or the step is a diagonal whose two
 * orthogonal neighbours are not both passable (no squeezing past corners).
 */
export function getStepTarget(grid: OctileGrid, x: number, y: number, direction: number): number {
  const dx = OCTILE_NEIGHBOR_DX[direction];
  const dy = OCTILE_NEIGHBOR_DY[direction];
  const targetX = x + dx;
  const targetY = y + dy;

  if (targetX < 0 || targetX >= grid.cols || targetY < 0 || targetY >= grid.rows) {
    return -1;
  }

  const { cols, passable } = grid;
  const targetIndex = targetY * cols + targetX;

  if (passable[targetIndex] === 0) {
    return -1;
  }

  if (dx !== 0 && dy !== 0) {
    if (passable[y * cols + targetX] === 0 || passable[targetY * cols + x] === 0) {
      return -1;
    }
  }

  return targetIndex;
}

/** Exact octile distance on an open grid; admissible and consistent for A*. */
export function octileHeuristic(fromX: number, fromY: number, toX: number, toY: number): number {
  const deltaX = Math.abs(fromX - toX);
  const deltaY = Math.abs(fromY - toY);
  const straight = Math.max(deltaX, deltaY) * OCTILE_STEP_COST.orthogonal;
  return straight + Math.min(deltaX, deltaY) * DIAGONAL_EXTRA_COST;
}
