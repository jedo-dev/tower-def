import { describe, expect, it } from 'vitest';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { toPointerGridTarget } from './gameSceneGridPreviewRuntime';

const CELL = GRID_DIMENSIONS.cellSize;

describe('toPointerGridTarget', () => {
  it('keeps the cell under the pointer and centres the build block nearest to it', () => {
    // Lower-right quarter of cell (5, 5): the block covers cells 5..6.
    expect(toPointerGridTarget(5.8 * CELL, 5.8 * CELL)).toEqual({
      cell: { x: 5, y: 5 },
      buildAnchor: { x: 5, y: 5 },
    });
    // Upper-left quarter of the same cell: the block covers cells 4..5.
    expect(toPointerGridTarget(5.2 * CELL, 5.2 * CELL)).toEqual({
      cell: { x: 5, y: 5 },
      buildAnchor: { x: 4, y: 4 },
    });
  });

  it('keeps the block on the board at the edges', () => {
    const target = toPointerGridTarget(
      GRID_DIMENSIONS.cols * CELL - 1,
      GRID_DIMENSIONS.rows * CELL - 1,
    );

    expect(target?.cell).toEqual({ x: GRID_DIMENSIONS.cols - 1, y: GRID_DIMENSIONS.rows - 1 });
    expect(target?.buildAnchor).toEqual({
      x: GRID_DIMENSIONS.cols - 2,
      y: GRID_DIMENSIONS.rows - 2,
    });
  });

  it('ignores pointers off the board', () => {
    expect(toPointerGridTarget(-1, 10)).toBeNull();
    expect(toPointerGridTarget(10, GRID_DIMENSIONS.rows * CELL)).toBeNull();
  });
});
