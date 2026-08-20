import Phaser from 'phaser';
import { GRID_DIMENSIONS } from '../../constants/grid';
import { GameScene } from './scenes/GameScene';

export function createGameConfig(container: HTMLDivElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: container,
    width: GRID_DIMENSIONS.cols * GRID_DIMENSIONS.cellSize,
    height: GRID_DIMENSIONS.rows * GRID_DIMENSIONS.cellSize,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    antialiasGL: false,
    backgroundColor: '#1a1f2c',
    scene: [GameScene],
    scale: {
      // Single scaling pipeline: Phaser resizes the canvas to its parent,
      // registerResponsiveCamera re-fits the world zoom on each RESIZE event.
      mode: Phaser.Scale.RESIZE,
    },
  };
}
