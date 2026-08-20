import Phaser from 'phaser';
import { GRID_PIXEL_HEIGHT, GRID_PIXEL_WIDTH } from '../../scenes/gameScene.constants';

export function applyResponsiveCamera(scene: Phaser.Scene): void {
  const viewportWidth = scene.scale.width;
  const viewportHeight = scene.scale.height;
  const zoom = Math.min(viewportWidth / GRID_PIXEL_WIDTH, viewportHeight / GRID_PIXEL_HEIGHT);
  const worldViewHeight = viewportHeight / zoom;
  const verticalOverflow = Math.max(0, worldViewHeight - GRID_PIXEL_HEIGHT);
  const centerY = GRID_PIXEL_HEIGHT / 2 + verticalOverflow / 2;

  scene.cameras.main.setZoom(zoom);
  scene.cameras.main.setBounds(0, 0, GRID_PIXEL_WIDTH, GRID_PIXEL_HEIGHT, true);
  scene.cameras.main.centerOn(GRID_PIXEL_WIDTH / 2, centerY);
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
