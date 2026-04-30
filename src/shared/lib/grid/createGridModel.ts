import type { GridCell, GridModel, GridPoint } from '../../types/grid';

type CreateGridModelParams = {
  cols: number;
  rows: number;
  entrance: GridPoint;
  exit: GridPoint;
};

function createGridCell(x: number, y: number): GridCell {
  return {
    x,
    y,
    isWalkable: true,
    isOccupied: false,
  };
}

export function createGridModel({ cols, rows, entrance, exit }: CreateGridModelParams): GridModel {
  const cells: GridCell[] = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      cells.push(createGridCell(x, y));
    }
  }

  return {
    cols,
    rows,
    cells,
    entrance,
    exit,
  };
}
