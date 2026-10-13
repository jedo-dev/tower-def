import type { GridModel } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';
import { getCellIndex } from '../grid/getCellAt';
import { hasPathBfs } from './hasPathBfs';

function isSamePosition(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

export function validateTowerPlacementPath(grid: GridModel, placement: GridPosition): boolean {
  if (isSamePosition(placement, grid.entrance) || isSamePosition(placement, grid.exit)) {
    return false;
  }

  const targetIndex = getCellIndex(grid, placement.x, placement.y);

  if (targetIndex === -1) {
    return false;
  }

  // Only the placed cell changes; the rest are shared read-only with the source grid.
  const cellsWithPlacement = grid.cells.slice();
  cellsWithPlacement[targetIndex] = {
    ...grid.cells[targetIndex],
    isOccupied: true,
    isWalkable: false,
  };

  const simulatedGrid: GridModel = {
    ...grid,
    cells: cellsWithPlacement,
  };

  return hasPathBfs(simulatedGrid);
}
