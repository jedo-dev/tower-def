import type { Footprint, GridModel, GridPoint } from '../../types/grid';
import {
  canOccupyFootprint,
  isCellInFootprint,
  isFootprintInBounds,
  withFootprintOccupancy,
} from '../grid/footprint';
import { findRoutesBySizeClass } from './findRouteForSizeClass';

/**
 * True when both creep size classes can still walk from the entrance anchor
 * to the exit anchor with every cell of the footprint walled off: the small
 * (1x1) route and the large (2x2) route, octile movement without corner
 * cutting. Footprints off the grid or over the route anchors never pass.
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

  const routes = findRoutesBySizeClass(
    withFootprintOccupancy(grid, anchor, footprint, true),
    grid.entrance,
    grid.exit,
  );

  return routes.small !== null && routes.large !== null;
}

/** Build rule: every covered cell is free and both size-class routes survive the new block. */
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
