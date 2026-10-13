import { describe, expect, it } from 'vitest';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import { UNIT_SIZE_CLASSES, UnitSizeClass } from '../../../../types/content-ids';
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

  it('scales with the cell size', () => {
    const atDefault = getCreepVisualMetrics(UnitSizeClass.LARGE);
    const atDouble = getCreepVisualMetrics(UnitSizeClass.LARGE, GRID_DIMENSIONS.cellSize * 2);

    expect(atDouble.displaySizePx).toBe(atDefault.displaySizePx * 2);
    expect(atDouble.footprintCenterOffsetPx).toBe(atDefault.footprintCenterOffsetPx * 2);
  });
});
