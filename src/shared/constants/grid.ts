export enum GridConfig {
  COLS = 10,
  ROWS = 15,
  CELL_SIZE = 32,
}

export const GRID_DIMENSIONS = {
  cols: GridConfig.COLS,
  rows: GridConfig.ROWS,
  cellSize: GridConfig.CELL_SIZE,
} as const;

export const GRID_DEFAULT_ROW_CENTER = Math.floor((GridConfig.ROWS - 1) / 2);
