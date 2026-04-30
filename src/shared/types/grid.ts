export type GridPoint = {
  x: number;
  y: number;
};

export type GridCell = GridPoint & {
  isWalkable: boolean;
  isOccupied: boolean;
};

export type GridModel = {
  cols: number;
  rows: number;
  cells: GridCell[];
  entrance: GridPoint;
  exit: GridPoint;
};
