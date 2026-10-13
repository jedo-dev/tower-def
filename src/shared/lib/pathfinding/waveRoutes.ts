import { UnitSizeClass } from '../../types/content-ids';
import type { GridModel } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';
import { findRoutesBySizeClass, type RoutesBySizeClass } from './findRouteForSizeClass';

/** A walkable route as anchor cells; empty when no route exists. */
export type WaveRoute = readonly GridPosition[];

/**
 * The routes a wave walks, one per distinct creep footprint. Computed once at
 * wave start; small and medium creeps follow `small`, large ones `large`.
 */
export type WaveRoutes = {
  readonly small: WaveRoute;
  readonly large: WaveRoute;
};

const NO_ROUTE: WaveRoute = [];

export const EMPTY_WAVE_ROUTES: WaveRoutes = { small: NO_ROUTE, large: NO_ROUTE };

export function toWaveRoutes(routes: RoutesBySizeClass): WaveRoutes {
  return { small: routes.small ?? NO_ROUTE, large: routes.large ?? NO_ROUTE };
}

/** Entrance-to-exit routes for both footprints on `grid`. */
export function calculateWaveRoutes(grid: GridModel): WaveRoutes {
  return toWaveRoutes(findRoutesBySizeClass(grid, grid.entrance, grid.exit));
}

/** A wave can start once the single-cell route exists. */
export function hasWaveRoute(routes: WaveRoutes): boolean {
  return routes.small.length > 0;
}

/**
 * Route a creature of `sizeClass` follows. Builds are validated for both
 * footprints, so `large` normally exists whenever `small` does; if it does not,
 * a large creep walks the small route rather than freezing at the entrance.
 */
export function selectWaveRoute(routes: WaveRoutes, sizeClass: UnitSizeClass): WaveRoute {
  if (sizeClass !== UnitSizeClass.LARGE || routes.large.length === 0) {
    return routes.small;
  }
  return routes.large;
}
