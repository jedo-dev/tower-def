import type { Footprint, GridCell, GridModel, GridPoint } from '../../types/grid';
import { GRID_DIMENSIONS } from '../../constants/grid';
import { ENDPOINT_ZONE_FOOTPRINT } from '../../constants/footprint';
import { getFootprintCells } from './footprint';
import { getCellAt } from './getCellAt';

type CreateGridModelParams = {
  /** Top-left anchor of the entrance zone; creep routes start here. */
  entrance: GridPoint;
  /** Top-left anchor of the exit zone; creep routes end here. */
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

function markZone(
  grid: GridModel,
  anchor: GridPoint,
  footprint: Readonly<Footprint>,
  role: GridCell['role'],
): void {
  for (const point of getFootprintCells(anchor, footprint)) {
    const cell = getCellAt(grid, point.x, point.y);
    if (cell) {
      cell.role = role;
    }
  }
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
    endpointZoneFootprint: ENDPOINT_ZONE_FOOTPRINT,
  };

  markZone(grid, entrance, ENDPOINT_ZONE_FOOTPRINT, 'entrance');
  markZone(grid, exit, ENDPOINT_ZONE_FOOTPRINT, 'exit');

  return grid;
}
