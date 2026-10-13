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

/** Size of a rectangular object on the grid, in cells. Anchored at its top-left cell. */
export type Footprint = {
  width: number;
  height: number;
};
