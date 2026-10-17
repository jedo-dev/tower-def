import { describe, expect, it } from 'vitest';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { UNIT_SIZE_CLASSES, UnitSizeClass } from '../../../../shared/types/content-ids';
import {
  CREEP_VISUAL_MAX_SIZE_IN_CELLS,
  CREEP_VISUAL_SIZE_IN_CELLS_BY_SIZE_CLASS,
} from '../../scenes/gameScene.constants';
import { getCreepVisualMetrics } from './creepVisualMetrics';

describe('getCreepVisualMetrics', () => {
  it('keeps single-cell creeps centred on their cell', () => {
    expect(getCreepVisualMetrics(UnitSizeClass.SMALL).footprintCenterOffsetPx).toBe(0);
    expect(getCreepVisualMetrics(UnitSizeClass.MEDIUM).footprintCenterOffsetPx).toBe(0);
  });

  it('centres large creeps on their 2x2 footprint', () => {
    expect(getCreepVisualMetrics(UnitSizeClass.LARGE).footprintCenterOffsetPx).toBe(
      GRID_DIMENSIONS.cellSize / 2,
    );
  });

  it('grows with the size class and stays readable on one cell', () => {
    const sizes = UNIT_SIZE_CLASSES.map(
      (sizeClass) => getCreepVisualMetrics(sizeClass).displaySizePx,
    );

    expect(sizes[0]).toBeGreaterThan(GRID_DIMENSIONS.cellSize);
    expect(sizes).toEqual([...sizes].sort((left, right) => left - right));
    expect(getCreepVisualMetrics(UnitSizeClass.LARGE).displaySizePx).toBeGreaterThanOrEqual(
      GRID_DIMENSIONS.cellSize * 2,
    );
  });

  it('snaps the 32px pixel-art sheets to crisp scales on 16px cells', () => {
    expect(getCreepVisualMetrics(UnitSizeClass.SMALL).displaySizePx).toBe(32);
    expect(getCreepVisualMetrics(UnitSizeClass.MEDIUM).displaySizePx).toBe(32);
    // 2x would be four cells over a 2-cell lane: capped at 1.5x, three cells.
    expect(getCreepVisualMetrics(UnitSizeClass.LARGE).displaySizePx).toBe(48);
  });

  it('caps every creep at the lane-friendly maximum', () => {
    for (const sizeClass of UNIT_SIZE_CLASSES) {
      expect(getCreepVisualMetrics(sizeClass).displaySizePx).toBeLessThanOrEqual(
        CREEP_VISUAL_MAX_SIZE_IN_CELLS * GRID_DIMENSIONS.cellSize,
      );
    }
  });

  it('keeps painted frames at the wanted size', () => {
    expect(getCreepVisualMetrics(UnitSizeClass.SMALL, 16, 64).displaySizePx).toBeCloseTo(
      CREEP_VISUAL_SIZE_IN_CELLS_BY_SIZE_CLASS[UnitSizeClass.SMALL] * 16,
    );
  });

  it('scales with the cell size', () => {
    const atDefault = getCreepVisualMetrics(UnitSizeClass.LARGE);
    const atDouble = getCreepVisualMetrics(UnitSizeClass.LARGE, GRID_DIMENSIONS.cellSize * 2);

    expect(atDouble.displaySizePx).toBe(atDefault.displaySizePx * 2);
    expect(atDouble.footprintCenterOffsetPx).toBe(atDefault.footprintCenterOffsetPx * 2);
  });
});
