import type { GridCell, GridModel, GridPoint } from '../../types/grid';
import { GRID_DIMENSIONS } from '../../constants/grid';

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

  for (const cell of cells) {
    if (cell.x === entrance.x && cell.y === entrance.y) {
      cell.role = 'entrance';
    }

    if (cell.x === exit.x && cell.y === exit.y) {
      cell.role = 'exit';
    }
  }

  return {
    cols: GRID_DIMENSIONS.cols,
    rows: GRID_DIMENSIONS.rows,
    cells,
    entrance,
    exit,
  };
}
