import Phaser from 'phaser';
import { GridConfig } from '../../../constants/grid';
import { createGridModel } from '../../grid/createGridModel';

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
    const grid = createGridModel({
      cols: GridConfig.COLS,
      rows: GridConfig.ROWS,
      entrance: ENTRANCE_CELL,
      exit: EXIT_CELL,
    });

    for (const cell of grid.cells) {
      const x = cell.x * GridConfig.CELL_SIZE;
      const y = cell.y * GridConfig.CELL_SIZE;

      const isEntrance = cell.x === grid.entrance.x && cell.y === grid.entrance.y;
      const isExit = cell.x === grid.exit.x && cell.y === grid.exit.y;
      const fillColor = isEntrance ? 0x1e8f48 : isExit ? 0xaf4536 : 0x253248;

      graphics.fillStyle(fillColor, 1);
      graphics.fillRect(x, y, GridConfig.CELL_SIZE, GridConfig.CELL_SIZE);
      graphics.lineStyle(1, 0x42597f, 1);
      graphics.strokeRect(x, y, GridConfig.CELL_SIZE, GridConfig.CELL_SIZE);

      if (isEntrance || isExit) {
        this.add
          .text(
            x + GridConfig.CELL_SIZE / 2,
            y + GridConfig.CELL_SIZE / 2,
            isEntrance ? 'IN' : 'OUT',
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
