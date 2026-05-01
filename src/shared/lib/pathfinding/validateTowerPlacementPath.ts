import type { GridCell, GridModel } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';
import { hasPathBfs } from './hasPathBfs';

function isSamePosition(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

function cloneCell(cell: GridCell): GridCell {
  return { ...cell };
}

export function validateTowerPlacementPath(grid: GridModel, placement: GridPosition): boolean {
  if (isSamePosition(placement, grid.entrance) || isSamePosition(placement, grid.exit)) {
    return false;
  }

  const hasTargetCell = grid.cells.some(
    (cell) => cell.x === placement.x && cell.y === placement.y,
  );

  if (!hasTargetCell) {
    return false;
  }

  const cellsWithPlacement = grid.cells.map((cell) => {
    if (cell.x !== placement.x || cell.y !== placement.y) {
      return cloneCell(cell);
    }

    return {
      ...cloneCell(cell),
      isOccupied: true,
      isWalkable: false,
    };
  });

  const simulatedGrid: GridModel = {
    ...grid,
    cells: cellsWithPlacement,
  };

  return hasPathBfs(simulatedGrid);
}
