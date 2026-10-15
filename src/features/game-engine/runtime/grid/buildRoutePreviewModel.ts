import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import type { GridModel } from '../../../../shared/types/grid';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import { projectFootprintPlacementRoutes } from '../../../../shared/lib/pathfinding/validateFootprintPlacement';
import {
  calculateWaveRoutes,
  type WaveRoutes,
} from '../../../../shared/lib/pathfinding/waveRoutes';

/** What the route overlay should show; references are compared to skip redundant redraws. */
export type RoutePreviewFrame = {
  readonly isVisible: boolean;
  readonly current: WaveRoutes | null;
  /** Routes with the hovered tower placed; null when not hovering a valid build. */
  readonly projected: WaveRoutes | null;
  /** Draw the straight air line too: the roster the board faces has fliers. */
  readonly showsAirRoute: boolean;
};

export const HIDDEN_ROUTE_PREVIEW: RoutePreviewFrame = {
  isVisible: false,
  current: null,
  projected: null,
  showsAirRoute: false,
};

export type RoutePreviewInput = {
  grid: GridModel | null;
  /** Build phase on the player's own board; routes are hidden during waves. */
  isBuildPhase: boolean;
  hoveredAnchor: GridPosition | null;
  /** Full build rule (free cells, gold, open routes) for the hovered anchor. */
  isHoveredAnchorValid: boolean;
  /** The roster this board faces has air creeps, so the air line is worth showing. */
  hasAirCreeps: boolean;
};

/** Route searches the preview needs; injectable so tests can count them. */
export type BuildRoutePreviewSearches = {
  current: (grid: GridModel) => WaveRoutes;
  projected: (grid: GridModel, anchor: GridPosition) => WaveRoutes | null;
};

/**
 * Memoised routes for the build preview. Pointer moves call into this many
 * times per second, but routes are searched only when the board layout or the
 * hovered tower anchor actually changes. The grid is mutated in place when
 * towers are placed or sold, so callers report that via
 * `invalidateBuildRoutePreview`.
 */
export type BuildRoutePreviewCache = {
  readonly searches: BuildRoutePreviewSearches;
  grid: GridModel | null;
  isLayoutStale: boolean;
  currentRoutes: WaveRoutes | null;
  projectedAnchorX: number;
  projectedAnchorY: number;
  projectedRoutes: WaveRoutes | null;
};

const DEFAULT_SEARCHES: BuildRoutePreviewSearches = {
  current: calculateWaveRoutes,
  projected: (grid, anchor) => projectFootprintPlacementRoutes(grid, anchor, TOWER_FOOTPRINT),
};

const NO_ANCHOR = Number.NaN;

export function createBuildRoutePreviewCache(
  searches: BuildRoutePreviewSearches = DEFAULT_SEARCHES,
): BuildRoutePreviewCache {
  return {
    searches,
    grid: null,
    isLayoutStale: true,
    currentRoutes: null,
    projectedAnchorX: NO_ANCHOR,
    projectedAnchorY: NO_ANCHOR,
    projectedRoutes: null,
  };
}

/** Call after any cell's occupancy changed (tower placed or sold). */
export function invalidateBuildRoutePreview(cache: BuildRoutePreviewCache): void {
  cache.isLayoutStale = true;
}

function refreshLayout(cache: BuildRoutePreviewCache, grid: GridModel): void {
  if (cache.grid === grid && !cache.isLayoutStale) {
    return;
  }
  cache.grid = grid;
  cache.isLayoutStale = false;
  cache.currentRoutes = cache.searches.current(grid);
  cache.projectedAnchorX = NO_ANCHOR;
  cache.projectedAnchorY = NO_ANCHOR;
  cache.projectedRoutes = null;
}

/** Entrance-to-exit routes for both footprints on the board as it stands. */
export function getCurrentPreviewRoutes(
  cache: BuildRoutePreviewCache,
  grid: GridModel,
): WaveRoutes {
  refreshLayout(cache, grid);
  return cache.currentRoutes ?? cache.searches.current(grid);
}

/**
 * Both routes as they would be with a tower block at `anchor`, or null when
 * that block would cut either size class off.
 */
export function getProjectedPreviewRoutes(
  cache: BuildRoutePreviewCache,
  grid: GridModel,
  anchor: GridPosition,
): WaveRoutes | null {
  refreshLayout(cache, grid);
  if (cache.projectedAnchorX !== anchor.x || cache.projectedAnchorY !== anchor.y) {
    cache.projectedAnchorX = anchor.x;
    cache.projectedAnchorY = anchor.y;
    cache.projectedRoutes = cache.searches.projected(grid, anchor);
  }
  return cache.projectedRoutes;
}

/**
 * Decides what the route overlay shows. Waves hide it: creeps then trace the
 * route themselves and the path tiles stay visible, so the overlay would only
 * clutter a small mobile board. The air line is shown only while the roster
 * the board faces has fliers; no placement can move it.
 */
export function resolveRoutePreviewFrame(
  cache: BuildRoutePreviewCache,
  input: RoutePreviewInput,
): RoutePreviewFrame {
  if (!input.isBuildPhase || !input.grid) {
    return HIDDEN_ROUTE_PREVIEW;
  }

  const current = getCurrentPreviewRoutes(cache, input.grid);
  const projected =
    input.hoveredAnchor && input.isHoveredAnchorValid
      ? getProjectedPreviewRoutes(cache, input.grid, input.hoveredAnchor)
      : null;
  return { isVisible: true, current, projected, showsAirRoute: input.hasAirCreeps };
}
