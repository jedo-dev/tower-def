import type Phaser from 'phaser';
import { TOWER_FOOTPRINT } from '../../../../constants/footprint';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import type { GridModel } from '../../../../types/grid';
import type { GridPosition } from '../../../../types/pathfinding';
import { getFootprintCenter, getNearestFootprintAnchor } from '../../../grid/footprint';

export type GridPreviewConfig = {
  previewValidFill: number;
  previewValidStroke: number;
  previewInvalidFill: number;
  previewInvalidStroke: number;
  gridBuildAlpha: number;
  gridIdleAlpha: number;
};

/** What the pointer is over: the cell itself, and the tower block it would build. */
export type PointerGridTarget = {
  cell: GridPosition;
  buildAnchor: GridPosition;
};

export type BuildPreviewContext = {
  overlay: Phaser.GameObjects.Graphics | null;
  gridGraphics: Phaser.GameObjects.Graphics | null;
  gridModel: GridModel | null;
  hoveredBuildAnchor: GridPosition | null;
  canPerformBuildActions: boolean;
  selectedTowerRangeCells: number;
  isBuildAnchorValid: (anchor: GridPosition, grid: GridModel) => boolean;
};

export function toGridCell(worldX: number, worldY: number): GridPosition | null {
  const x = Math.floor(worldX / GRID_DIMENSIONS.cellSize);
  const y = Math.floor(worldY / GRID_DIMENSIONS.cellSize);

  const isInsideGrid = x >= 0 && x < GRID_DIMENSIONS.cols && y >= 0 && y < GRID_DIMENSIONS.rows;

  if (!isInsideGrid) {
    return null;
  }

  return { x, y };
}

/**
 * Maps a world position to the cell under it and to the anchor of the tower
 * block centred nearest to it, so the block follows the finger smoothly
 * instead of snapping to the cell's top-left corner.
 */
export function toPointerGridTarget(worldX: number, worldY: number): PointerGridTarget | null {
  const cell = toGridCell(worldX, worldY);
  const buildAnchor = getNearestFootprintAnchor(
    GRID_DIMENSIONS,
    { x: worldX / GRID_DIMENSIONS.cellSize, y: worldY / GRID_DIMENSIONS.cellSize },
    TOWER_FOOTPRINT,
  );

  if (!cell || !buildAnchor) {
    return null;
  }

  return { cell, buildAnchor };
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

function drawValidityMarker(
  overlay: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  isValid: boolean,
  strokeColor: number,
): void {
  const markerSize = GRID_DIMENSIONS.cellSize * 0.4;

  overlay.lineStyle(2, strokeColor, 0.95);
  overlay.beginPath();
  overlay.moveTo(centerX - markerSize, centerY);
  overlay.lineTo(centerX + markerSize, centerY);

  if (isValid) {
    overlay.moveTo(centerX, centerY - markerSize);
    overlay.lineTo(centerX, centerY + markerSize);
  } else {
    overlay.moveTo(centerX - markerSize, centerY - markerSize);
    overlay.lineTo(centerX + markerSize, centerY + markerSize);
    overlay.moveTo(centerX - markerSize, centerY + markerSize);
    overlay.lineTo(centerX + markerSize, centerY - markerSize);
  }

  overlay.strokePath();
}

/** Draws the hovered tower block; returns whether that block is a valid build. */
export function updateBuildPreview(
  context: BuildPreviewContext,
  config: GridPreviewConfig,
): boolean {
  if (!context.overlay) {
    return false;
  }

  context.overlay.clear();

  if (!context.canPerformBuildActions || !context.hoveredBuildAnchor || !context.gridModel) {
    updateGridOverlayVisualState(context.gridGraphics, context.canPerformBuildActions, config);
    return false;
  }

  const anchor = context.hoveredBuildAnchor;
  const isValid = context.isBuildAnchorValid(anchor, context.gridModel);
  const { cellSize } = GRID_DIMENSIONS;
  const x = anchor.x * cellSize;
  const y = anchor.y * cellSize;
  const width = TOWER_FOOTPRINT.width * cellSize;
  const height = TOWER_FOOTPRINT.height * cellSize;
  const center = getFootprintCenter(anchor, TOWER_FOOTPRINT);
  const centerX = center.x * cellSize + cellSize / 2;
  const centerY = center.y * cellSize + cellSize / 2;
  const fillColor = isValid ? config.previewValidFill : config.previewInvalidFill;
  const strokeColor = isValid ? config.previewValidStroke : config.previewInvalidStroke;

  const rangeRadiusPx = context.selectedTowerRangeCells * cellSize;
  const rangeColor = isValid ? config.previewValidFill : config.previewInvalidFill;

  context.overlay.fillStyle(rangeColor, 0.12);
  context.overlay.lineStyle(1, rangeColor, 0.35);
  context.overlay.fillCircle(centerX, centerY, rangeRadiusPx);
  context.overlay.strokeCircle(centerX, centerY, rangeRadiusPx);

  context.overlay.fillStyle(fillColor, 0.42);
  context.overlay.fillRect(x, y, width, height);
  context.overlay.lineStyle(2, strokeColor, 1);
  context.overlay.strokeRect(x + 1, y + 1, width - 2, height - 2);

  drawValidityMarker(context.overlay, centerX, centerY, isValid, strokeColor);
  updateGridOverlayVisualState(context.gridGraphics, context.canPerformBuildActions, config);
  return isValid;
}
