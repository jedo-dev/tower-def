import type { Footprint, GridModel, GridPoint } from '../../types/grid';
import { getCellAt, getCellIndex, isInsideGridBounds } from './getCellAt';

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

/** True when `point` lies inside the footprint anchored at `anchor`. */
export function isCellInFootprint(
  point: GridPoint,
  anchor: GridPoint,
  footprint: Readonly<Footprint>,
): boolean {
  return (
    point.x >= anchor.x &&
    point.x < anchor.x + footprint.width &&
    point.y >= anchor.y &&
    point.y < anchor.y + footprint.height
  );
}

/**
 * Centre of an anchored footprint in cell coordinates, where a single cell's
 * centre is the cell itself: a 2x2 block at (4, 6) is centred on (4.5, 6.5).
 */
export function getFootprintCenter(anchor: GridPoint, footprint: Readonly<Footprint>): GridPoint {
  return {
    x: anchor.x + (footprint.width - 1) / 2,
    y: anchor.y + (footprint.height - 1) / 2,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Anchor of the in-bounds footprint whose centre lies nearest a point given in
 * continuous cell units (world pixels divided by the cell size). Null when the
 * point is off the grid or the footprint cannot fit on it.
 */
export function getNearestFootprintAnchor(
  grid: GridBounds,
  cellSpacePoint: GridPoint,
  footprint: Readonly<Footprint>,
): GridPoint | null {
  const isOnGrid =
    cellSpacePoint.x >= 0 &&
    cellSpacePoint.x < grid.cols &&
    cellSpacePoint.y >= 0 &&
    cellSpacePoint.y < grid.rows;
  const maxX = grid.cols - footprint.width;
  const maxY = grid.rows - footprint.height;

  if (!isOnGrid || !isValidFootprint(footprint) || maxX < 0 || maxY < 0) {
    return null;
  }

  return {
    x: clamp(Math.round(cellSpacePoint.x - footprint.width / 2), 0, maxX),
    y: clamp(Math.round(cellSpacePoint.y - footprint.height / 2), 0, maxY),
  };
}

/**
 * Anchor of the footprint covering `point` among the ones `isAnchor` accepts,
 * or null. Footprints never overlap, so at most one candidate can match.
 */
export function findFootprintAnchorCovering(
  point: GridPoint,
  footprint: Readonly<Footprint>,
  isAnchor: (anchor: GridPoint) => boolean,
): GridPoint | null {
  for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
    for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
      const anchor = { x: point.x - offsetX, y: point.y - offsetY };
      if (isAnchor(anchor)) {
        return anchor;
      }
    }
  }

  return null;
}

/**
 * Copy of the grid with every in-bounds cell of the footprint occupied (and no
 * longer walkable) or freed. Untouched cells are shared with the source grid.
 */
export function withFootprintOccupancy<TGrid extends GridLayout>(
  grid: TGrid,
  anchor: GridPoint,
  footprint: Readonly<Footprint>,
  isOccupied: boolean,
): TGrid {
  const cells = grid.cells.slice();

  for (const point of getFootprintCells(anchor, footprint)) {
    const index = getCellIndex(grid, point.x, point.y);
    if (index !== -1) {
      cells[index] = { ...cells[index], isOccupied, isWalkable: !isOccupied };
    }
  }

  return { ...grid, cells };
}
