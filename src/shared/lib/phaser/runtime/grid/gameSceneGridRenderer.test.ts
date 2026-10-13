import { describe, expect, it } from 'vitest';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import { TowerFootprint } from '../../../../constants/footprint';
import { partitionGridLineIndices } from './gameSceneGridRenderer';

describe('partitionGridLineIndices', () => {
  it('marks every tower-sized step as a major line, edges included', () => {
    const { minor, major } = partitionGridLineIndices(6, 2);

    expect(major).toEqual([0, 2, 4, 6]);
    expect(minor).toEqual([1, 3, 5]);
  });

  it('draws each board line exactly once', () => {
    const { minor, major } = partitionGridLineIndices(GRID_DIMENSIONS.cols, TowerFootprint.SIZE);
    const all = [...minor, ...major].sort((left, right) => left - right);

    expect(all).toHaveLength(GRID_DIMENSIONS.cols + 1);
    expect(new Set(all).size).toBe(all.length);
  });
});
