import { describe, expect, it } from 'vitest';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { calculateWaveStartPath } from './calculateWavePath';

const ENTRANCE = { x: 0, y: 7 };
const EXIT = { x: 9, y: 7 };

describe('calculateWaveStartPath', () => {
  it('returns full entrance-to-exit path on a valid grid', () => {
    const grid = createGridModel({
      entrance: ENTRANCE,
      exit: EXIT,
    });

    const path = calculateWaveStartPath(grid);

    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual(ENTRANCE);
    expect(path[path.length - 1]).toEqual(EXIT);
  });

  it('returns an empty path when grid is blocked', () => {
    const openGrid = createGridModel({
      entrance: ENTRANCE,
      exit: EXIT,
    });

    const blockedGrid = {
      ...openGrid,
      cells: openGrid.cells.map((cell) => {
        if (cell.x !== 1) {
          return { ...cell };
        }

        return {
          ...cell,
          isWalkable: false,
          isOccupied: true,
        };
      }),
    };

    const path = calculateWaveStartPath(blockedGrid);
    expect(path).toHaveLength(0);
  });
});
