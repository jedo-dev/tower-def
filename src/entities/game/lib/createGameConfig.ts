import Phaser from 'phaser';
import { GridConfig } from '../../../shared/constants/grid';
import { GameScene } from './GameScene';

export function createGameConfig(container: HTMLDivElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: container,
    width: GridConfig.COLS * GridConfig.CELL_SIZE,
    height: GridConfig.ROWS * GridConfig.CELL_SIZE,
    backgroundColor: '#1a1f2c',
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
}
