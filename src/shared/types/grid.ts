export type GridPoint = {
  x: number;
  y: number;
};

export type GridCell = GridPoint & {
  role: 'empty' | 'entrance' | 'exit';
  isWalkable: boolean;
  isOccupied: boolean;
};

export type GridModel = {
  cols: number;
  rows: number;
  /** Row-major: the cell at (x, y) lives at `y * cols + x`. Look up via `getCellAt`. */
  cells: GridCell[];
  entrance: GridPoint;
  exit: GridPoint;
};
