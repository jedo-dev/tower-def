import { UnitMoveType, UnitSizeClass } from '../../types/content-ids';
import type { GridModel } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';
import { calculateAirRoute } from './airRoute';
import { findRoutesBySizeClass, type RoutesBySizeClass } from './findRouteForSizeClass';

/** A walkable route as anchor cells; empty when no route exists. */
export type WaveRoute = readonly GridPosition[];

/**
 * The routes a wave walks, one per distinct creep footprint plus the air
 * line. Computed once at wave start; small and medium ground creeps follow
 * `small`, large ones `large`, and every air creep flies `air` straight from
 * the entrance to the exit over whatever stands in between.
 */
export type WaveRoutes = {
  readonly small: WaveRoute;
  readonly large: WaveRoute;
  readonly air: WaveRoute;
};

/** What picking a route needs to know about a creep. */
export type WaveRouteTraits = {
  readonly sizeClass: UnitSizeClass;
  readonly moveType: UnitMoveType;
};

const NO_ROUTE: WaveRoute = [];

export const EMPTY_WAVE_ROUTES: WaveRoutes = { small: NO_ROUTE, large: NO_ROUTE, air: NO_ROUTE };

export function toWaveRoutes(routes: RoutesBySizeClass, air: WaveRoute): WaveRoutes {
  return { small: routes.small ?? NO_ROUTE, large: routes.large ?? NO_ROUTE, air };
}

/** Entrance-to-exit routes for both ground footprints and the air line on `grid`. */
export function calculateWaveRoutes(grid: GridModel): WaveRoutes {
  return toWaveRoutes(
    findRoutesBySizeClass(grid, grid.entrance, grid.exit),
    calculateAirRoute(grid.entrance, grid.exit),
  );
}

/** A wave can start once the single-cell ground route exists; air needs no check. */
export function hasWaveRoute(routes: WaveRoutes): boolean {
  return routes.small.length > 0;
}

/**
 * Route a creature follows. Air creeps fly the air line whatever their size.
 * Ground builds are validated for both footprints, so `large` normally exists
 * whenever `small` does; if it does not, a large creep walks the small route
 * rather than freezing at the entrance.
 */
export function selectWaveRoute(routes: WaveRoutes, traits: WaveRouteTraits): WaveRoute {
  if (traits.moveType === UnitMoveType.AIR) {
    return routes.air;
  }
  if (traits.sizeClass !== UnitSizeClass.LARGE || routes.large.length === 0) {
    return routes.small;
  }
  return routes.large;
}
