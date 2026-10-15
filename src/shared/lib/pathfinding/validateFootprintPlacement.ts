import type { Footprint, GridModel, GridPoint } from '../../types/grid';
import {
  canOccupyFootprint,
  isCellInFootprint,
  isFootprintInBounds,
  withFootprintOccupancy,
} from '../grid/footprint';
import type { GridPosition } from '../../types/pathfinding';
import { calculateAirRoute } from './airRoute';
import { findRoutesBySizeClass } from './findRouteForSizeClass';

/**
 * Both size-class routes after a placement (both exist by construction) and
 * the air line, which no placement can move.
 */
export type ProjectedPlacementRoutes = {
  readonly small: readonly GridPosition[];
  readonly large: readonly GridPosition[];
  readonly air: readonly GridPosition[];
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

  return {
    small: routes.small,
    large: routes.large,
    air: calculateAirRoute(grid.entrance, grid.exit),
  };
}

/**
 * Path-wise verdict on a placement: open, cut off for one size class (a small
 * block seals the large route too, so `blocked_for_small` wins), or an anchor
 * no route can be searched from (off the grid, over the entrance or exit).
 */
export type FootprintPlacementPathCheck =
  | 'open'
  | 'blocked_for_small'
  | 'blocked_for_large'
  | 'invalid_anchor';

export function checkFootprintPlacementPath(
  grid: GridModel,
  anchor: GridPoint,
  footprint: Readonly<Footprint>,
): FootprintPlacementPathCheck {
  if (
    !isFootprintInBounds(grid, anchor, footprint) ||
    isCellInFootprint(grid.entrance, anchor, footprint) ||
    isCellInFootprint(grid.exit, anchor, footprint)
  ) {
    return 'invalid_anchor';
  }

  const routes = findRoutesBySizeClass(
    withFootprintOccupancy(grid, anchor, footprint, true),
    grid.entrance,
    grid.exit,
  );
  if (routes.small === null) return 'blocked_for_small';
  if (routes.large === null) return 'blocked_for_large';
  return 'open';
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
