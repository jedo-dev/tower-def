import type Phaser from 'phaser';
import {
  createBuildRoutePreviewCache,
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
