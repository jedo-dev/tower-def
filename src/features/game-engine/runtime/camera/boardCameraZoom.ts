/**
 * Pure zoom and pan math for the board camera. Everything is expressed on the
 * same `CameraView` the renderer and the pointer mapping share, so a pointer
 * resolves to the same cell at any zoom and scroll.
 */

import {
  screenToWorldPoint,
  type CameraView,
  type ScreenPoint,
  type WorldSize,
} from './cameraViewMapping';

/** Zoom relative to the fit zoom: 1 shows the whole board, 3 is a close-up. */
export type BoardZoomLimits = {
  minFactor: number;
  maxFactor: number;
};

/** Below this the camera counts as at fit zoom (floating-point slack). */
const ZOOMED_IN_EPSILON = 1e-3;

export function clampZoomFactor(factor: number, limits: BoardZoomLimits): number {
  if (!Number.isFinite(factor)) {
    return limits.minFactor;
  }
  return Math.min(limits.maxFactor, Math.max(limits.minFactor, factor));
}

/** The view's zoom relative to the fit zoom. */
export function resolveZoomFactor(view: CameraView, fitView: CameraView): number {
  return fitView.zoom > 0 ? view.zoom / fitView.zoom : 1;
}

export function isZoomedIn(view: CameraView, fitView: CameraView): boolean {
  return resolveZoomFactor(view, fitView) > 1 + ZOOMED_IN_EPSILON;
}

function clampScrollAxis(
  scroll: number,
  viewportSize: number,
  zoom: number,
  worldSize: number,
): number {
  const origin = viewportSize / 2;
  // Scroll range that keeps the world edges inside the viewport edges.
  const minScroll = origin * (1 / zoom - 1);
  const maxScroll = worldSize - origin * (1 + 1 / zoom);
  if (minScroll >= maxScroll) {
    // The world fits on this axis: letterbox it evenly, as the fit view does.
    return worldSize / 2 - origin;
  }
  return Math.min(maxScroll, Math.max(minScroll, scroll));
}

/**
 * Keeps the board inside the viewport: centred on an axis where it fits,
 * edge-clamped once it overflows, so panning never reveals space past the
 * board's edge.
 */
export function clampCameraScrollToWorld(view: CameraView, world: WorldSize): CameraView {
  return {
    ...view,
    scrollX: clampScrollAxis(view.scrollX, view.viewportWidth, view.zoom, world.width),
    scrollY: clampScrollAxis(view.scrollY, view.viewportHeight, view.zoom, world.height),
  };
}

/** Zooms to `zoom`, keeping the world point under `focus` fixed on screen. */
export function zoomCameraViewAt(
  view: CameraView,
  focus: ScreenPoint,
  zoom: number,
  world: WorldSize,
): CameraView {
  const anchor = screenToWorldPoint(focus, view);
  const originX = view.viewportWidth / 2;
  const originY = view.viewportHeight / 2;

  return clampCameraScrollToWorld(
    {
      ...view,
      zoom,
      scrollX: anchor.x - originX - (focus.x - view.viewportX - originX) / zoom,
      scrollY: anchor.y - originY - (focus.y - view.viewportY - originY) / zoom,
    },
    world,
  );
}

/** Moves the view by a screen-space drag so the board follows the finger. */
export function panCameraView(
  view: CameraView,
  dragDelta: ScreenPoint,
  world: WorldSize,
): CameraView {
  return clampCameraScrollToWorld(
    {
      ...view,
      scrollX: view.scrollX - dragDelta.x / view.zoom,
      scrollY: view.scrollY - dragDelta.y / view.zoom,
    },
    world,
  );
}

/**
 * Carries a zoomed view over to a new fit view after the viewport resized:
 * the zoom factor and the world point at the viewport centre are kept.
 */
export function refitCameraView(
  view: CameraView,
  fitView: CameraView,
  nextFitView: CameraView,
  world: WorldSize,
  limits: BoardZoomLimits,
): CameraView {
  const factor = clampZoomFactor(resolveZoomFactor(view, fitView), limits);
  const centre = screenToWorldPoint(
    {
      x: view.viewportX + view.viewportWidth / 2,
      y: view.viewportY + view.viewportHeight / 2,
    },
    view,
  );

  return clampCameraScrollToWorld(
    {
      ...nextFitView,
      zoom: nextFitView.zoom * factor,
      scrollX: centre.x - nextFitView.viewportWidth / 2,
      scrollY: centre.y - nextFitView.viewportHeight / 2,
    },
    world,
  );
}
