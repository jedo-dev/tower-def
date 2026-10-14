/**
 * Pure camera math shared by the responsive camera and pointer input.
 *
 * Rendering and pointer mapping must agree on one camera view. Phaser's own
 * `pointer.worldX/worldY` is computed from the camera matrix of the last
 * rendered frame, only while the pointer is inside a camera viewport, and from
 * canvas bounds that are only re-read on window resize or a 500ms parent poll.
 * After a viewport resize those inputs can disagree with what is on screen, so
 * the scene maps pointers through these functions instead.
 */

export type ScreenPoint = {
  x: number;
  y: number;
};

export type WorldPoint = {
  x: number;
  y: number;
};

/** A camera viewport on the canvas and what it looks at, origin at its centre. */
export type CameraView = {
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
};

export type WorldSize = {
  width: number;
  height: number;
};

export type CanvasOffset = {
  left: number;
  top: number;
};

/**
 * Fits the whole world into a viewport of the given size and centres it, so
 * the board letterboxes evenly on whichever axis has spare room.
 */
export function computeResponsiveCameraView(
  viewportWidth: number,
  viewportHeight: number,
  world: WorldSize,
): CameraView {
  const zoom = Math.min(viewportWidth / world.width, viewportHeight / world.height);

  return {
    viewportX: 0,
    viewportY: 0,
    viewportWidth,
    viewportHeight,
    zoom,
    scrollX: world.width / 2 - viewportWidth / 2,
    scrollY: world.height / 2 - viewportHeight / 2,
  };
}

/** Canvas pixel -> world position, the inverse of how the camera renders. */
export function screenToWorldPoint(screen: ScreenPoint, view: CameraView): WorldPoint {
  const originX = view.viewportWidth / 2;
  const originY = view.viewportHeight / 2;

  return {
    x: view.scrollX + originX + (screen.x - view.viewportX - originX) / view.zoom,
    y: view.scrollY + originY + (screen.y - view.viewportY - originY) / view.zoom,
  };
}

/** World position -> canvas pixel, matching how the camera renders it. */
export function worldToScreenPoint(world: WorldPoint, view: CameraView): ScreenPoint {
  const originX = view.viewportWidth / 2;
  const originY = view.viewportHeight / 2;

  return {
    x: view.viewportX + originX + (world.x - view.scrollX - originX) * view.zoom,
    y: view.viewportY + originY + (world.y - view.scrollY - originY) * view.zoom,
  };
}

/**
 * Re-bases a canvas-space pointer position that was computed against stale
 * canvas page offsets onto the canvas' current offsets (the canvas moved, for
 * example a centred layout shifted after a resize, before Phaser re-read it).
 */
export function rebaseScreenPoint(
  screen: ScreenPoint,
  staleOffset: CanvasOffset,
  currentOffset: CanvasOffset,
  displayScale: ScreenPoint,
): ScreenPoint {
  return {
    x: screen.x + (staleOffset.left - currentOffset.left) * displayScale.x,
    y: screen.y + (staleOffset.top - currentOffset.top) * displayScale.y,
  };
}
