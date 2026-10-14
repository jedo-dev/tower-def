import Phaser from 'phaser';
import { GRID_PIXEL_HEIGHT, GRID_PIXEL_WIDTH } from '../../scenes/gameScene.constants';
import {
  computeResponsiveCameraView,
  rebaseScreenPoint,
  screenToWorldPoint,
  type CameraView,
  type CanvasOffset,
  type WorldPoint,
} from './cameraViewMapping';

const GRID_WORLD_SIZE = { width: GRID_PIXEL_WIDTH, height: GRID_PIXEL_HEIGHT };

/**
 * Fits the grid into the current scale size. The camera viewport is set here
 * too instead of relying on Phaser's CameraManager resize hook, which only
 * resizes a camera whose size still equals the previous game size; this way
 * zoom, scroll and viewport always come from one computation.
 */
export function applyResponsiveCamera(scene: Phaser.Scene): void {
  const view = computeResponsiveCameraView(scene.scale.width, scene.scale.height, GRID_WORLD_SIZE);
  const camera = scene.cameras.main;

  // No camera bounds: with bounds the camera clamps scroll to the grid edge and
  // the grid ends up pinned to the left/top whenever the viewport is wider or
  // taller than the grid. Without them the view letterboxes evenly.
  camera.removeBounds();
  camera.setViewport(view.viewportX, view.viewportY, view.viewportWidth, view.viewportHeight);
  camera.setZoom(view.zoom);
  camera.setScroll(view.scrollX, view.scrollY);
}

/**
 * Applies the responsive camera immediately and keeps it in sync with scale
 * resize events. Returns a teardown that removes the resize listener.
 */
export function registerResponsiveCamera(scene: Phaser.Scene): () => void {
  const scaleResizeHandler = () => applyResponsiveCamera(scene);
  scene.scale.on(Phaser.Scale.Events.RESIZE, scaleResizeHandler);
  applyResponsiveCamera(scene);
  return () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, scaleResizeHandler);
  };
}

function readCameraView(camera: Phaser.Cameras.Scene2D.Camera): CameraView {
  return {
    viewportX: camera.x,
    viewportY: camera.y,
    viewportWidth: camera.width,
    viewportHeight: camera.height,
    zoom: camera.zoom,
    scrollX: camera.scrollX,
    scrollY: camera.scrollY,
  };
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
 * Maps a pointer to the world position under it on screen right now: the
 * pointer's canvas position is re-based onto the canvas' live page offset and
 * inverted through the current camera view, instead of reading
 * `pointer.worldX/worldY` (see cameraViewMapping for why those drift).
 */
export function resolvePointerWorldPoint(
  scene: Phaser.Scene,
  pointer: Phaser.Input.Pointer,
): WorldPoint {
  const scale = scene.scale;
  const staleOffset: CanvasOffset = { left: scale.canvasBounds.left, top: scale.canvasBounds.top };
  const currentOffset = readCanvasPageOffset(scene.game.canvas);

  if (staleOffset.left !== currentOffset.left || staleOffset.top !== currentOffset.top) {
    // Let the scale manager re-read its bounds on the next step.
    scale.dirty = true;
  }

  const screen = rebaseScreenPoint(
    { x: pointer.x, y: pointer.y },
    staleOffset,
    currentOffset,
    scale.displayScale,
  );

  return screenToWorldPoint(screen, readCameraView(scene.cameras.main));
}
