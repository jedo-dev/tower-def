import Phaser from 'phaser';
import { GRID_PIXEL_HEIGHT, GRID_PIXEL_WIDTH } from '../../scenes/gameScene.constants';

export function applyResponsiveCamera(scene: Phaser.Scene): void {
  const viewportWidth = scene.scale.width;
  const viewportHeight = scene.scale.height;
  const zoom = Math.min(viewportWidth / GRID_PIXEL_WIDTH, viewportHeight / GRID_PIXEL_HEIGHT);

  // No camera bounds: with bounds the camera clamps scroll to the grid edge and
  // the grid ends up pinned to the left/top whenever the viewport is wider or
  // taller than the grid. Without them centerOn() letterboxes evenly.
  scene.cameras.main.setZoom(zoom);
  scene.cameras.main.removeBounds();
  scene.cameras.main.centerOn(GRID_PIXEL_WIDTH / 2, GRID_PIXEL_HEIGHT / 2);
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
