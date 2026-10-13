import { CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS } from '../../constants/footprint';
import { UnitSizeClass } from '../../types/content-ids';
import type { GridModel } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';
import { computeClearanceMap } from './computeClearanceMap';
import { findOctilePath } from './findOctilePath';

/** A route is the sequence of anchor (top-left) cells the agent walks through. */
export type SizeClassRoute = readonly GridPosition[] | null;

/**
 * One route per distinct footprint. Small and medium creatures share the
 * single-cell footprint, so medium uses `small`; large uses the 2x2 route.
 */
export type RoutesBySizeClass = {
  small: SizeClassRoute;
  large: SizeClassRoute;
};

function findRouteWithClearance(
  grid: GridModel,
  clearance: Uint8Array,
  start: GridPosition,
  goal: GridPosition,
  footprintSize: number,
): SizeClassRoute {
  return findOctilePath(grid, start, goal, {
    isPassable: (index) => clearance[index] >= footprintSize,
  });
}

/**
 * Clearance-aware 8-direction route for a creature of `sizeClass`.
 *
 * Contract: `start` and `goal` are anchors, i.e. the top-left cell of the
 * agent's k x k footprint. An anchor is passable iff its whole footprint is
 * free (`clearance >= k`). The agent reaches the goal when its anchor equals
 * `goal`, so the goal anchor itself must fit; for a 2x2 creature walking
 * between 2x2 entrance/exit zones anchored at their top-left cell, pass the
 * zone anchors directly and the footprint lands exactly on the exit zone.
 * As with `findOctilePath`, the start anchor only has to lie inside the grid.
 *
 * Diagonal steps require both orthogonal neighbour anchors to fit, so a large
 * agent never squeezes past a corner: the whole swept area must be free.
 */
export function findRouteForSizeClass(
  grid: GridModel,
  start: GridPosition,
  goal: GridPosition,
  sizeClass: UnitSizeClass,
): SizeClassRoute {
  return findRouteWithClearance(
    grid,
    computeClearanceMap(grid),
    start,
    goal,
    CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[sizeClass],
  );
}

export function hasRouteForSizeClass(
  grid: GridModel,
  start: GridPosition,
  goal: GridPosition,
  sizeClass: UnitSizeClass,
): boolean {
  return findRouteForSizeClass(grid, start, goal, sizeClass) !== null;
}

/** Small and large routes from one clearance computation (same anchor contract). */
export function findRoutesBySizeClass(
  grid: GridModel,
  start: GridPosition,
  goal: GridPosition,
): RoutesBySizeClass {
  const clearance = computeClearanceMap(grid);

  return {
    small: findRouteWithClearance(
      grid,
      clearance,
      start,
      goal,
      CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[UnitSizeClass.SMALL],
    ),
    large: findRouteWithClearance(
      grid,
      clearance,
      start,
      goal,
      CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[UnitSizeClass.LARGE],
    ),
  };
}

/** Route a creature of `sizeClass` follows; medium shares the small route. */
export function selectRouteForSizeClass(
  routes: RoutesBySizeClass,
  sizeClass: UnitSizeClass,
): SizeClassRoute {
  return sizeClass === UnitSizeClass.LARGE ? routes.large : routes.small;
}
