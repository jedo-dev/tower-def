import Phaser from 'phaser';
import { GRID_DEFAULT_ROW_CENTER, GRID_DIMENSIONS } from '../../../constants/grid';
import { createGridModel } from '../../grid/createGridModel';

const ENTRANCE_CELL = { x: 0, y: GRID_DEFAULT_ROW_CENTER };
const EXIT_CELL = { x: GRID_DIMENSIONS.cols - 1, y: GRID_DEFAULT_ROW_CENTER };
const IS_DEV_MODE = import.meta.env.DEV;

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
    const grid = createGridModel({
      entrance: ENTRANCE_CELL,
      exit: EXIT_CELL,
    });

    for (const cell of grid.cells) {
      const x = cell.x * GRID_DIMENSIONS.cellSize;
      const y = cell.y * GRID_DIMENSIONS.cellSize;
      const fillColor =
        cell.role === 'entrance' ? 0x1e8f48 : cell.role === 'exit' ? 0xaf4536 : 0x253248;

      graphics.fillStyle(fillColor, 1);
      graphics.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
      graphics.lineStyle(1, 0x42597f, 1);
      graphics.strokeRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);

      if (IS_DEV_MODE && (cell.role === 'entrance' || cell.role === 'exit')) {
        this.add
          .text(
            x + GRID_DIMENSIONS.cellSize / 2,
            y + GRID_DIMENSIONS.cellSize / 2,
            cell.role === 'entrance' ? 'IN' : 'OUT',
            {
              fontFamily: 'Arial',
              fontSize: '10px',
              color: '#ffffff',
            },
          )
          .setOrigin(0.5);
      }
    }
  }
}
