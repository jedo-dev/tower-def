import Phaser from 'phaser';
import { GridConfig } from '../../../constants/grid';

const ENTRANCE_CELL = { x: 0, y: 7 };
const EXIT_CELL = { x: GridConfig.COLS - 1, y: 7 };

export class GameScene extends Phaser.Scene {
  public static readonly KEY = 'GameScene';

  constructor() {
    super(GameScene.KEY);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#1a1f2c');
    this.drawDebugGrid();
  }

  private drawDebugGrid(): void {
    const graphics = this.add.graphics();

    for (let row = 0; row < GridConfig.ROWS; row += 1) {
      for (let col = 0; col < GridConfig.COLS; col += 1) {
        const x = col * GridConfig.CELL_SIZE;
        const y = row * GridConfig.CELL_SIZE;

        const isEntrance = col === ENTRANCE_CELL.x && row === ENTRANCE_CELL.y;
        const isExit = col === EXIT_CELL.x && row === EXIT_CELL.y;
        const fillColor = isEntrance ? 0x1e8f48 : isExit ? 0xaf4536 : 0x253248;

        graphics.fillStyle(fillColor, 1);
        graphics.fillRect(x, y, GridConfig.CELL_SIZE, GridConfig.CELL_SIZE);
        graphics.lineStyle(1, 0x42597f, 1);
        graphics.strokeRect(x, y, GridConfig.CELL_SIZE, GridConfig.CELL_SIZE);
      }
    }
  }
}
