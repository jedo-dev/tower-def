import type { Footprint, GridModel, GridPoint } from '../../types/grid';
import {
  canOccupyFootprint,
  isCellInFootprint,
  isFootprintInBounds,
  withFootprintOccupancy,
} from '../grid/footprint';
import { hasPathBfs } from './hasPathBfs';

/**
 * True when creeps can still walk from the entrance to the exit with every
 * cell of the footprint walled off. Footprints off the grid or over the route
 * anchors never pass.
 */
export function validateFootprintPlacementPath(
  grid: GridModel,
  anchor: GridPoint,
  footprint: Readonly<Footprint>,
): boolean {
  if (!isFootprintInBounds(grid, anchor, footprint)) {
    return false;
  }

  if (
    isCellInFootprint(grid.entrance, anchor, footprint) ||
    isCellInFootprint(grid.exit, anchor, footprint)
  ) {
    return false;
  }

  return hasPathBfs(withFootprintOccupancy(grid, anchor, footprint, true));
}

/** Build rule: every covered cell is free and the route survives the new block. */
export function canPlaceFootprint(
  grid: GridModel,
  anchor: GridPoint,
  footprint: Readonly<Footprint>,
): boolean {
  return (
    canOccupyFootprint(grid, anchor, footprint) &&
    validateFootprintPlacementPath(grid, anchor, footprint)
  );
}
