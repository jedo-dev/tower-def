import type { GridModel, GridPoint } from '../../../../shared/types/grid';
import { getCellAt } from '../../../../shared/lib/grid/getCellAt';

/** Writes 1 for every free cell (`isWalkable && !isOccupied`), 0 otherwise, row-major. */
export function fillFreeCells(grid: GridModel, free: Uint8Array): void {
  const { cols, rows } = grid;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cell = getCellAt(grid, x, y);
      free[y * cols + x] = cell !== undefined && cell.isWalkable && !cell.isOccupied ? 1 : 0;
    }
  }
}

/**
 * Recomputes capped clearance (edge of the largest free square anchored at a
 * cell, at most `cap`) for the inclusive cell rectangle [minX..maxX] x
 * [minY..maxY], clipped to the grid. Same DP as `computeClearanceMap`; values
 * outside the rectangle are read as-is, so callers pass a rectangle covering
 * every cell whose cap x cap square changed.
 */
export function recomputeCappedClearance(
  free: Uint8Array,
  cols: number,
  rows: number,
  cap: number,
  clearance: Uint8Array,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): void {
  const fromX = Math.max(0, minX);
  const fromY = Math.max(0, minY);
  const toX = Math.min(cols - 1, maxX);
  const toY = Math.min(rows - 1, maxY);

  for (let y = toY; y >= fromY; y -= 1) {
    for (let x = toX; x >= fromX; x -= 1) {
      const index = y * cols + x;

      if (free[index] === 0) {
        clearance[index] = 0;
        continue;
      }

      const hasRight = x + 1 < cols;
      const hasBelow = y + 1 < rows;
      const right = hasRight ? clearance[index + 1] : 0;
      const below = hasBelow ? clearance[index + cols] : 0;
      const belowRight = hasRight && hasBelow ? clearance[index + cols + 1] : 0;
      clearance[index] = Math.min(cap, 1 + Math.min(right, below, belowRight));
    }
  }
}

function markSquare(
  mask: Uint8Array,
  cols: number,
  rows: number,
  anchorX: number,
  anchorY: number,
  size: number,
): void {
  const toX = Math.min(cols, anchorX + size);
  const toY = Math.min(rows, anchorY + size);

  for (let y = Math.max(0, anchorY); y < toY; y += 1) {
    for (let x = Math.max(0, anchorX); x < toX; x += 1) {
      mask[y * cols + x] = 1;
    }
  }
}

/**
 * Marks every cell a route of agentSize x agentSize agents relies on: each
 * anchor's square plus, for diagonal steps, the squares of both orthogonal
 * neighbour anchors (the no-corner-cutting rule). A placement touching none
 * of these cells can neither lengthen nor break the route.
 */
export function markRouteSweep(
  route: readonly GridPoint[],
  agentSize: number,
  cols: number,
  rows: number,
  mask: Uint8Array,
): void {
  mask.fill(0);

  for (let step = 0; step < route.length; step += 1) {
    const current = route[step];
    markSquare(mask, cols, rows, current.x, current.y, agentSize);

    if (step === 0) {
      continue;
    }

    const previous = route[step - 1];

    if (previous.x !== current.x && previous.y !== current.y) {
      markSquare(mask, cols, rows, current.x, previous.y, agentSize);
      markSquare(mask, cols, rows, previous.x, current.y, agentSize);
    }
  }
}

/** True when any in-grid cell of the width x height rectangle at (anchorX, anchorY) is marked. */
export function doesRectangleTouchMask(
  mask: Uint8Array,
  cols: number,
  rows: number,
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
): boolean {
  const toX = Math.min(cols, anchorX + width);
  const toY = Math.min(rows, anchorY + height);

  for (let y = Math.max(0, anchorY); y < toY; y += 1) {
    for (let x = Math.max(0, anchorX); x < toX; x += 1) {
      if (mask[y * cols + x] === 1) {
        return true;
      }
    }
  }

  return false;
}
