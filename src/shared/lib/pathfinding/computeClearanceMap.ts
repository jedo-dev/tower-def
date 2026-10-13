import { MAX_CLEARANCE } from '../../constants/pathfinding';
import type { GridModel } from '../../types/grid';
import { getCellAt } from '../grid/getCellAt';

/**
 * True clearance per cell, row-major (`y * cols + x`): the edge length of the
 * largest free square whose top-left cell is (x, y). A cell is free when
 * `isWalkable && !isOccupied`; its role (entrance/exit) does not matter, so
 * walkable entrance and exit cells count as free. A k x k agent anchored at a
 * cell fits iff its clearance is at least k. Values are capped at
 * `MAX_CLEARANCE`.
 *
 * Bottom-up DP: clearance(x, y) = 1 + min(right, below, below-right) for a
 * free cell, 0 otherwise; cells outside the grid count as 0.
 */
export function computeClearanceMap(grid: GridModel): Uint8Array {
  const cols = Math.max(0, grid.cols);
  const rows = Math.max(0, grid.rows);
  const clearance = new Uint8Array(cols * rows);

  for (let y = rows - 1; y >= 0; y -= 1) {
    for (let x = cols - 1; x >= 0; x -= 1) {
      const cell = getCellAt(grid, x, y);

      if (cell === undefined || !cell.isWalkable || cell.isOccupied) {
        continue;
      }

      const hasRight = x + 1 < cols;
      const hasBelow = y + 1 < rows;
      const right = hasRight ? clearance[y * cols + x + 1] : 0;
      const below = hasBelow ? clearance[(y + 1) * cols + x] : 0;
      const belowRight = hasRight && hasBelow ? clearance[(y + 1) * cols + x + 1] : 0;

      clearance[y * cols + x] = Math.min(MAX_CLEARANCE, 1 + Math.min(right, below, belowRight));
    }
  }

  return clearance;
}
