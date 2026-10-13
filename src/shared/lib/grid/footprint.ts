import type { Footprint, GridModel, GridPoint } from '../../types/grid';
import { getCellAt, isInsideGridBounds } from './getCellAt';

type GridBounds = Pick<GridModel, 'cols' | 'rows'>;
type GridLayout = Pick<GridModel, 'cols' | 'rows' | 'cells'>;

function isValidFootprint(footprint: Footprint): boolean {
  return (
    Number.isInteger(footprint.width) &&
    Number.isInteger(footprint.height) &&
    footprint.width > 0 &&
    footprint.height > 0
  );
}

/**
 * Cells covered by a footprint anchored at its top-left cell, row by row.
 * Coordinates are not clipped to the grid; pair with `isFootprintInBounds`.
 */
export function getFootprintCells(anchor: GridPoint, footprint: Footprint): GridPoint[] {
  if (!isValidFootprint(footprint)) {
    return [];
  }

  const cells: GridPoint[] = [];

  for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
    for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
      cells.push({ x: anchor.x + offsetX, y: anchor.y + offsetY });
    }
  }

  return cells;
}

/** True when every cell covered by the footprint lies inside the grid. */
export function isFootprintInBounds(
  grid: GridBounds,
  anchor: GridPoint,
  footprint: Footprint,
): boolean {
  if (!isValidFootprint(footprint)) {
    return false;
  }

  return (
    isInsideGridBounds(grid, anchor.x, anchor.y) &&
    isInsideGridBounds(grid, anchor.x + footprint.width - 1, anchor.y + footprint.height - 1)
  );
}

/**
 * True when a footprint can be placed: in bounds and every covered cell is an
 * empty-role, walkable, unoccupied cell. Entrance and exit cells never qualify.
 * Path validation is a separate concern.
 */
export function canOccupyFootprint(
  grid: GridLayout,
  anchor: GridPoint,
  footprint: Footprint,
): boolean {
  if (!isFootprintInBounds(grid, anchor, footprint)) {
    return false;
  }

  for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
    for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
      const cell = getCellAt(grid, anchor.x + offsetX, anchor.y + offsetY);

      if (!cell || cell.role !== 'empty' || !cell.isWalkable || cell.isOccupied) {
        return false;
      }
    }
  }

  return true;
}

/** True when two anchored footprints share at least one cell. */
export function doFootprintsOverlap(
  firstAnchor: GridPoint,
  firstFootprint: Footprint,
  secondAnchor: GridPoint,
  secondFootprint: Footprint,
): boolean {
  if (!isValidFootprint(firstFootprint) || !isValidFootprint(secondFootprint)) {
    return false;
  }

  return (
    firstAnchor.x < secondAnchor.x + secondFootprint.width &&
    secondAnchor.x < firstAnchor.x + firstFootprint.width &&
    firstAnchor.y < secondAnchor.y + secondFootprint.height &&
    secondAnchor.y < firstAnchor.y + firstFootprint.height
  );
}
