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
  /** Route start: the top-left anchor cell of the entrance zone. */
  entrance: GridPoint;
  /** Route end: the top-left anchor cell of the exit zone. */
  exit: GridPoint;
  /**
   * Size of the entrance and exit zones. Each zone covers this footprint from
   * its anchor (`entrance` / `exit`), and every covered cell carries the zone role.
   */
  endpointZoneFootprint: Readonly<Footprint>;
};

/** Size of a rectangular object on the grid, in cells. Anchored at its top-left cell. */
export type Footprint = {
  width: number;
  height: number;
};
