import type Phaser from 'phaser';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import type { GridModel } from '../../../../types/grid';
import type { GridPosition } from '../../../../types/pathfinding';

export type GridPreviewConfig = {
  previewValidFill: number;
  previewValidStroke: number;
  previewInvalidFill: number;
  previewInvalidStroke: number;
  gridBuildAlpha: number;
  gridIdleAlpha: number;
};

export type BuildPreviewContext = {
  overlay: Phaser.GameObjects.Graphics | null;
  gridGraphics: Phaser.GameObjects.Graphics | null;
  gridModel: GridModel | null;
  hoveredCell: GridPosition | null;
  canPerformBuildActions: boolean;
  selectedTowerRangeCells: number;
  isBuildCellValid: (cell: GridPosition, grid: GridModel) => boolean;
};

export function toGridCell(worldX: number, worldY: number): GridPosition | null {
  const x = Math.floor(worldX / GRID_DIMENSIONS.cellSize);
  const y = Math.floor(worldY / GRID_DIMENSIONS.cellSize);

  const isInsideGrid =
    x >= 0 && x < GRID_DIMENSIONS.cols && y >= 0 && y < GRID_DIMENSIONS.rows;

  if (!isInsideGrid) {
    return null;
  }

  return { x, y };
}

export function updateGridOverlayVisualState(
  gridGraphics: Phaser.GameObjects.Graphics | null,
  canPerformBuildActions: boolean,
  config: GridPreviewConfig,
): void {
  if (!gridGraphics) {
    return;
  }

  const targetAlpha = canPerformBuildActions ? config.gridBuildAlpha : config.gridIdleAlpha;
  gridGraphics.setAlpha(targetAlpha);
}

export function updateBuildPreview(context: BuildPreviewContext, config: GridPreviewConfig): void {
  if (!context.overlay) {
    return;
  }

  context.overlay.clear();

  if (!context.canPerformBuildActions) {
    updateGridOverlayVisualState(context.gridGraphics, context.canPerformBuildActions, config);
    return;
  }

  if (!context.hoveredCell || !context.gridModel) {
    updateGridOverlayVisualState(context.gridGraphics, context.canPerformBuildActions, config);
    return;
  }

  const isValid = context.isBuildCellValid(context.hoveredCell, context.gridModel);
  const x = context.hoveredCell.x * GRID_DIMENSIONS.cellSize;
  const y = context.hoveredCell.y * GRID_DIMENSIONS.cellSize;
  const fillColor = isValid ? config.previewValidFill : config.previewInvalidFill;
  const strokeColor = isValid ? config.previewValidStroke : config.previewInvalidStroke;
  const markerSize = GRID_DIMENSIONS.cellSize * 0.2;
  const centerX = x + GRID_DIMENSIONS.cellSize / 2;
  const centerY = y + GRID_DIMENSIONS.cellSize / 2;

  const rangeRadiusPx = context.selectedTowerRangeCells * GRID_DIMENSIONS.cellSize;
  const rangeColor = isValid ? 0x3ecf78 : 0xe55a4f;

  context.overlay.fillStyle(rangeColor, 0.12);
  context.overlay.lineStyle(1, rangeColor, 0.35);
  context.overlay.fillCircle(centerX, centerY, rangeRadiusPx);
  context.overlay.strokeCircle(centerX, centerY, rangeRadiusPx);

  context.overlay.fillStyle(fillColor, 0.42);
  context.overlay.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
  context.overlay.lineStyle(2, strokeColor, 1);
  context.overlay.strokeRect(x + 1, y + 1, GRID_DIMENSIONS.cellSize - 2, GRID_DIMENSIONS.cellSize - 2);

  context.overlay.lineStyle(2, strokeColor, 0.95);
  context.overlay.beginPath();
  context.overlay.moveTo(centerX - markerSize, centerY);
  context.overlay.lineTo(centerX + markerSize, centerY);

  if (isValid) {
    context.overlay.moveTo(centerX, centerY - markerSize);
    context.overlay.lineTo(centerX, centerY + markerSize);
  } else {
    context.overlay.moveTo(centerX - markerSize, centerY - markerSize);
    context.overlay.lineTo(centerX + markerSize, centerY + markerSize);
    context.overlay.moveTo(centerX - markerSize, centerY + markerSize);
    context.overlay.lineTo(centerX + markerSize, centerY - markerSize);
  }

  context.overlay.strokePath();
  updateGridOverlayVisualState(context.gridGraphics, context.canPerformBuildActions, config);
}
