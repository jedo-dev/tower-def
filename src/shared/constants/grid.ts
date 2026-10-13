import { EndpointZoneFootprint } from './footprint';

export enum GridConfig {
  COLS = 20,
  ROWS = 30,
  CELL_SIZE = 16,
}

export const GRID_DIMENSIONS = {
  cols: GridConfig.COLS,
  rows: GridConfig.ROWS,
  cellSize: GridConfig.CELL_SIZE,
} as const;

/** Top row of an entrance or exit zone centred vertically on a side edge. */
export const GRID_DEFAULT_ROW_CENTER = Math.floor(
  (GridConfig.ROWS - EndpointZoneFootprint.SIZE) / 2,
);
