import type Phaser from 'phaser';
import type { GridModel } from '../../../../shared/types/grid';
import type { WaveRoutes } from '../../../../shared/lib/pathfinding/waveRoutes';
import {
  createBuildRoutePreviewCache,
  getCurrentPreviewRoutes,
  HIDDEN_ROUTE_PREVIEW,
  invalidateBuildRoutePreview,
  resolveRoutePreviewFrame,
  type BuildRoutePreviewCache,
  type RoutePreviewInput,
} from './buildRoutePreviewModel';
import {
  createRoutePreviewRenderState,
  renderRoutePreview,
  type RoutePreviewConfig,
  type RoutePreviewRenderState,
} from './routePreviewRenderer';

/** Scene-owned state of the build-phase route overlay. */
export type BuildRoutePreviewRuntime = {
  readonly cache: BuildRoutePreviewCache;
  readonly render: RoutePreviewRenderState;
};

export function createBuildRoutePreviewRuntime(): BuildRoutePreviewRuntime {
  return { cache: createBuildRoutePreviewCache(), render: createRoutePreviewRenderState() };
}

export function attachRoutePreviewGraphics(
  runtime: BuildRoutePreviewRuntime,
  graphics: Phaser.GameObjects.Graphics,
  depth: number,
): void {
  graphics.setDepth(depth);
  runtime.render.graphics = graphics;
  runtime.render.drawn = HIDDEN_ROUTE_PREVIEW;
}

/** Call after a tower was placed or sold: the grid is mutated in place. */
export function markRoutePreviewLayoutChanged(runtime: BuildRoutePreviewRuntime): void {
  invalidateBuildRoutePreview(runtime.cache);
}

/**
 * Routes on the board as it stands, shared with the overlay's memo: after a
 * build or sell the first caller searches once and everyone else reuses it.
 */
export function getBuildRoutePreviewCurrentRoutes(
  runtime: BuildRoutePreviewRuntime,
  grid: GridModel,
): WaveRoutes {
  return getCurrentPreviewRoutes(runtime.cache, grid);
}

/** Cheap when nothing changed: routes are memoised and the overlay redraws only on change. */
export function updateBuildRoutePreview(
  runtime: BuildRoutePreviewRuntime,
  input: RoutePreviewInput,
  config: RoutePreviewConfig,
): void {
  renderRoutePreview(runtime.render, resolveRoutePreviewFrame(runtime.cache, input), config);
}

export function destroyRoutePreviewGraphics(runtime: BuildRoutePreviewRuntime): void {
  runtime.render.graphics?.destroy();
  runtime.render.graphics = null;
  runtime.render.drawn = HIDDEN_ROUTE_PREVIEW;
  invalidateBuildRoutePreview(runtime.cache);
}
