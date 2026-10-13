import type { Footprint, GridModel, GridPoint } from '../../types/grid';
import {
  canOccupyFootprint,
  isCellInFootprint,
  isFootprintInBounds,
  withFootprintOccupancy,
} from '../grid/footprint';
import type { GridPosition } from '../../types/pathfinding';
import { findRoutesBySizeClass } from './findRouteForSizeClass';

/** Both size-class routes after a placement; both exist by construction. */
export type ProjectedPlacementRoutes = {
  readonly small: readonly GridPosition[];
  readonly large: readonly GridPosition[];
};

/**
 * Small and large routes as they would be with every cell of the footprint
 * walled off, or null when the footprint cannot be placed path-wise: off the
 * grid, over a route anchor, or cutting either size class off from the exit
 * (octile movement without corner cutting). Callers that only need a yes/no
 * use `validateFootprintPlacementPath`; the build preview draws the routes.
 */
export function projectFootprintPlacementRoutes(
  grid: GridModel,
  anchor: GridPoint,
  footprint: Readonly<Footprint>,
): ProjectedPlacementRoutes | null {
  if (!isFootprintInBounds(grid, anchor, footprint)) {
    return null;
  }

  if (
    isCellInFootprint(grid.entrance, anchor, footprint) ||
    isCellInFootprint(grid.exit, anchor, footprint)
  ) {
    return null;
  }

  const routes = findRoutesBySizeClass(
    withFootprintOccupancy(grid, anchor, footprint, true),
    grid.entrance,
    grid.exit,
  );

  if (routes.small === null || routes.large === null) {
    return null;
  }

  return { small: routes.small, large: routes.large };
}

/** True when both creep size classes can still reach the exit with the footprint placed. */
export function validateFootprintPlacementPath(
  grid: GridModel,
  anchor: GridPoint,
  footprint: Readonly<Footprint>,
): boolean {
  return projectFootprintPlacementRoutes(grid, anchor, footprint) !== null;
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
