import type { GridCell, GridModel, GridPoint } from '../../types/grid';
import { GRID_DIMENSIONS } from '../../constants/grid';
import { getCellAt } from './getCellAt';

type CreateGridModelParams = {
  entrance: GridPoint;
  exit: GridPoint;
};

function createGridCell(x: number, y: number): GridCell {
  return {
    x,
    y,
    role: 'empty',
    isWalkable: true,
    isOccupied: false,
  };
}

export function createGridModel({ entrance, exit }: CreateGridModelParams): GridModel {
  const cells: GridCell[] = [];

  for (let y = 0; y < GRID_DIMENSIONS.rows; y += 1) {
    for (let x = 0; x < GRID_DIMENSIONS.cols; x += 1) {
      cells.push(createGridCell(x, y));
    }
  }

  const grid: GridModel = {
    cols: GRID_DIMENSIONS.cols,
    rows: GRID_DIMENSIONS.rows,
    cells,
    entrance,
    exit,
  };

  const entranceCell = getCellAt(grid, entrance.x, entrance.y);
  if (entranceCell) {
    entranceCell.role = 'entrance';
  }

  const exitCell = getCellAt(grid, exit.x, exit.y);
  if (exitCell) {
    exitCell.role = 'exit';
  }

  return grid;
}
