import Phaser from 'phaser';
import {
  BOARD_ZOOM_MAX_FACTOR,
  BOARD_ZOOM_MIN_FACTOR,
  GRID_PIXEL_HEIGHT,
  GRID_PIXEL_WIDTH,
} from '../../scenes/gameScene.constants';
import {
  clampZoomFactor,
  isZoomedIn,
  panCameraView,
  refitCameraView,
  resolveZoomFactor,
  zoomCameraViewAt,
  type BoardZoomLimits,
} from './boardCameraZoom';
import {
  computeResponsiveCameraView,
  rebaseScreenPoint,
  screenToWorldPoint,
  type CameraView,
  type CanvasOffset,
  type ScreenPoint,
  type WorldPoint,
} from './cameraViewMapping';

const GRID_WORLD_SIZE = { width: GRID_PIXEL_WIDTH, height: GRID_PIXEL_HEIGHT };

export const BOARD_ZOOM_LIMITS: BoardZoomLimits = {
  minFactor: BOARD_ZOOM_MIN_FACTOR,
  maxFactor: BOARD_ZOOM_MAX_FACTOR,
};

/**
 * The one camera view the board is rendered with and pointers are mapped
 * through. `fitView` shows the whole board; `view` is where zoom and pan
 * left it. The Phaser camera is written from here, never read back.
 */
export type BoardCameraState = {
  fitView: CameraView;
  view: CameraView;
};

/**
 * Pushes a view onto the main camera. The camera viewport is set here too
 * instead of relying on Phaser's CameraManager resize hook, which only
 * resizes a camera whose size still equals the previous game size; this way
 * zoom, scroll and viewport always come from one computation.
 */
function applyCameraView(scene: Phaser.Scene, view: CameraView): void {
  const camera = scene.cameras.main;

  // No camera bounds: with bounds the camera clamps scroll to the grid edge and
  // the grid ends up pinned to the left/top whenever the viewport is wider or
  // taller than the grid. Scroll is clamped by the pure camera math instead.
  camera.removeBounds();
  camera.setViewport(view.viewportX, view.viewportY, view.viewportWidth, view.viewportHeight);
  camera.setZoom(view.zoom);
  camera.setScroll(view.scrollX, view.scrollY);
}

function computeFitView(scene: Phaser.Scene): CameraView {
  return computeResponsiveCameraView(scene.scale.width, scene.scale.height, GRID_WORLD_SIZE);
}

/** Fits the grid into the current scale size and applies it. */
export function createBoardCameraState(scene: Phaser.Scene): BoardCameraState {
  const fitView = computeFitView(scene);
  const state: BoardCameraState = { fitView, view: fitView };
  applyCameraView(scene, state.view);
  return state;
}

/**
 * Keeps the camera in sync with scale resize events: the board is re-fitted
 * and the zoom carried over. Returns a teardown that removes the listener.
 */
export function registerResponsiveCamera(scene: Phaser.Scene, state: BoardCameraState): () => void {
  const scaleResizeHandler = () => {
    const nextFitView = computeFitView(scene);
    state.view = refitCameraView(
      state.view,
      state.fitView,
      nextFitView,
      GRID_WORLD_SIZE,
      BOARD_ZOOM_LIMITS,
    );
    state.fitView = nextFitView;
    applyCameraView(scene, state.view);
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, scaleResizeHandler);
  scaleResizeHandler();
  return () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, scaleResizeHandler);
  };
}

export function getBoardZoomFactor(state: BoardCameraState): number {
  return resolveZoomFactor(state.view, state.fitView);
}

export function isBoardCameraZoomed(state: BoardCameraState): boolean {
  return isZoomedIn(state.view, state.fitView);
}

/** Sets the zoom factor (clamped to the limits), keeping `focus` fixed on screen. */
export function setBoardCameraZoomFactorAt(
  scene: Phaser.Scene,
  state: BoardCameraState,
  factor: number,
  focus: ScreenPoint,
): void {
  const zoom = state.fitView.zoom * clampZoomFactor(factor, BOARD_ZOOM_LIMITS);
  state.view = zoomCameraViewAt(state.view, focus, zoom, GRID_WORLD_SIZE);
  applyCameraView(scene, state.view);
}

/** Multiplies the zoom factor, keeping `focus` fixed on screen. */
export function zoomBoardCameraByAt(
  scene: Phaser.Scene,
  state: BoardCameraState,
  multiplier: number,
  focus: ScreenPoint,
): void {
  setBoardCameraZoomFactorAt(scene, state, getBoardZoomFactor(state) * multiplier, focus);
}

/** The viewport centre: where keyboard zoom steps focus. */
export function getBoardViewportCentre(state: BoardCameraState): ScreenPoint {
  return {
    x: state.view.viewportX + state.view.viewportWidth / 2,
    y: state.view.viewportY + state.view.viewportHeight / 2,
  };
}

export function panBoardCamera(
  scene: Phaser.Scene,
  state: BoardCameraState,
  dragDelta: ScreenPoint,
): void {
  state.view = panCameraView(state.view, dragDelta, GRID_WORLD_SIZE);
  applyCameraView(scene, state.view);
}

export function resetBoardCamera(scene: Phaser.Scene, state: BoardCameraState): void {
  state.view = state.fitView;
  applyCameraView(scene, state.view);
}

/** The canvas' page offset, measured the same way Phaser's ScaleManager does. */
function readCanvasPageOffset(canvas: HTMLCanvasElement): CanvasOffset {
  const rect = canvas.getBoundingClientRect();
  const root = document.documentElement;

  return {
    left: rect.left + window.scrollX - root.clientLeft,
    top: rect.top + window.scrollY - root.clientTop,
  };
}

/**
 * The pointer's canvas position re-based onto the canvas' live page offset.
 * Phaser computes `pointer.x/y` from canvas bounds that are only re-read on
 * window resize or a 500ms parent poll, so after a layout shift they lag.
 */
export function resolvePointerScreenPoint(
  scene: Phaser.Scene,
  pointer: Phaser.Input.Pointer,
): ScreenPoint {
  const scale = scene.scale;
  const staleOffset: CanvasOffset = { left: scale.canvasBounds.left, top: scale.canvasBounds.top };
  const currentOffset = readCanvasPageOffset(scene.game.canvas);

  if (staleOffset.left !== currentOffset.left || staleOffset.top !== currentOffset.top) {
    // Let the scale manager re-read its bounds on the next step.
    scale.dirty = true;
  }

  return rebaseScreenPoint(
    { x: pointer.x, y: pointer.y },
    staleOffset,
    currentOffset,
    scale.displayScale,
  );
}

/**
 * Maps a pointer to the world position under it on screen right now, through
 * the board camera view instead of `pointer.worldX/worldY` (see
 * cameraViewMapping for why those drift).
 */
export function resolvePointerWorldPoint(
  scene: Phaser.Scene,
  state: BoardCameraState,
  pointer: Phaser.Input.Pointer,
): WorldPoint {
  return screenToWorldPoint(resolvePointerScreenPoint(scene, pointer), state.view);
}
