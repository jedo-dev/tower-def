import { CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS } from '../../../../constants/footprint';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import type { UnitSizeClass } from '../../../../types/content-ids';
import { CREEP_VISUAL_SIZE_IN_CELLS_BY_SIZE_CLASS } from '../../scenes/gameScene.constants';

/** How a creep of a size class is drawn relative to the cell it stands on. */
export type CreepVisualMetrics = {
  /** Square display size of the sprite in pixels. */
  displaySizePx: number;
  /**
   * Shift from the centre of the creep's anchor (top-left) cell to the centre
   * of its whole footprint, applied on both axes.
   */
  footprintCenterOffsetPx: number;
};

export function getCreepVisualMetrics(
  sizeClass: UnitSizeClass,
  cellSizePx: number = GRID_DIMENSIONS.cellSize,
): CreepVisualMetrics {
  const footprintSizeInCells = CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[sizeClass];

  return {
    displaySizePx: CREEP_VISUAL_SIZE_IN_CELLS_BY_SIZE_CLASS[sizeClass] * cellSizePx,
    footprintCenterOffsetPx: ((footprintSizeInCells - 1) * cellSizePx) / 2,
  };
}
