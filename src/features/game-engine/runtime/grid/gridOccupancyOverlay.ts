import type Phaser from 'phaser';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import type { GridCell } from '../../../../shared/types/grid';

export type GridOccupancyOverlayConfig = {
  occupiedCellFillColor: number;
  occupiedCellFillAlpha: number;
};

export type GridOccupancyOverlayState = {
  occupancyGraphics: Phaser.GameObjects.Graphics | null;
};

/**
 * Tints every occupied cell of the board in view. The overlay is a single
 * Graphics object that is cleared and refilled as a whole: a Graphics cannot
 * un-fill one rectangle, so per-cell fills accumulated across view switches and
 * left the other board's tower bases showing through as a faint trace.
 *
 * Event-driven: called on full board redraws (view switch, wave start, reset)
 * and once per build or sell command, never per frame.
 */
export function drawGridOccupancyOverlay(
  state: GridOccupancyOverlayState,
  scene: Phaser.Scene,
  config: GridOccupancyOverlayConfig,
  cells: readonly GridCell[],
  renderDepth: number,
): void {
  state.occupancyGraphics ??= scene.add.graphics();
  const overlay = state.occupancyGraphics;
  overlay.clear();
  overlay.setDepth(renderDepth);
  overlay.fillStyle(config.occupiedCellFillColor, config.occupiedCellFillAlpha);

  const { cellSize } = GRID_DIMENSIONS;
  for (const cell of cells) {
    if (cell.isOccupied) {
      overlay.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
    }
  }
}

export function destroyGridOccupancyOverlay(state: GridOccupancyOverlayState): void {
  state.occupancyGraphics?.destroy();
  state.occupancyGraphics = null;
}
