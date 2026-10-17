import { CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS } from '../../../../shared/constants/footprint';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { UNIT_SPRITE_SHEET_FRAME } from '../../../../shared/constants/unitSpriteSheetFrame';
import type { UnitSizeClass } from '../../../../shared/types/content-ids';
import {
  CREEP_VISUAL_MAX_SIZE_IN_CELLS,
  CREEP_VISUAL_SIZE_IN_CELLS_BY_SIZE_CLASS,
} from '../../scenes/gameScene.constants';
import { pickCreepDisplaySizePx } from './creepSpriteScale';

/** How a creep of a size class is drawn relative to the cell it stands on. */
export type CreepVisualMetrics = {
  /** Square display size of the sprite in pixels. */
  displaySizePx: number;
  /**
   * Shift from the centre of the creep's anchor (top-left) cell to the centre
   * of its whole footprint, applied on both axes. Hit and target positions use
   * only this, never the display size.
   */
  footprintCenterOffsetPx: number;
};

const CREEP_SHEET_FRAME_SIZE_PX = Math.max(
  UNIT_SPRITE_SHEET_FRAME.width,
  UNIT_SPRITE_SHEET_FRAME.height,
);

export function getCreepVisualMetrics(
  sizeClass: UnitSizeClass,
  cellSizePx: number = GRID_DIMENSIONS.cellSize,
  frameSizePx: number = CREEP_SHEET_FRAME_SIZE_PX,
): CreepVisualMetrics {
  const footprintSizeInCells = CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[sizeClass];

  return {
    displaySizePx: pickCreepDisplaySizePx(
      CREEP_VISUAL_SIZE_IN_CELLS_BY_SIZE_CLASS[sizeClass] * cellSizePx,
      frameSizePx,
      CREEP_VISUAL_MAX_SIZE_IN_CELLS * cellSizePx,
    ),
    footprintCenterOffsetPx: ((footprintSizeInCells - 1) * cellSizePx) / 2,
  };
}
