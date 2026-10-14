import { describe, expect, it, vi } from 'vitest';
import type { GridCell } from '../../../../shared/types/grid';
import {
  findPathTileChanges,
  refreshPathTiles,
  selectPlayerPathRoute,
  toPathCellKeys,
} from './pathTiles';

function createRow(length: number): GridCell[] {
  return Array.from({ length }, (_, x) => ({
    x,
    y: 0,
    role: 'empty',
    isWalkable: true,
    isOccupied: false,
  }));
}

describe('findPathTileChanges', () => {
  it('returns only cells that joined or left the path', () => {
    const cells = createRow(5);
    const previous = toPathCellKeys([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    const next = toPathCellKeys([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 2, y: 0 },
    ]);

    expect(findPathTileChanges(cells, previous, next).map((cell) => cell.x)).toEqual([1, 3]);
  });

  it('returns nothing when the route is unchanged', () => {
    const cells = createRow(3);
    const keys = toPathCellKeys([{ x: 1, y: 0 }]);

    expect(findPathTileChanges(cells, keys, new Set(keys))).toEqual([]);
  });
});

describe('refreshPathTiles', () => {
  it('publishes the new path before redrawing the changed tiles against it', () => {
    const cells = createRow(4);
    let shownPath: ReadonlySet<string> = toPathCellKeys([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    const drawnAsPath: Array<[number, boolean]> = [];

    refreshPathTiles(
      cells,
      shownPath,
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
      (next) => {
        shownPath = next;
      },
      (cell) => drawnAsPath.push([cell.x, shownPath.has(`${cell.x}:${cell.y}`)]),
    );

    expect(drawnAsPath).toEqual([
      [1, false],
      [2, true],
    ]);
  });

  it('redraws no tile when a build leaves the route as it was', () => {
    const cells = createRow(3);
    const route = [{ x: 1, y: 0 }];
    const drawCell = vi.fn();

    refreshPathTiles(cells, toPathCellKeys(route), route, () => undefined, drawCell);

    expect(drawCell).not.toHaveBeenCalled();
  });
});

describe('selectPlayerPathRoute', () => {
  const buildRoute = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ];
  const waveRoute = [{ x: 4, y: 0 }];

  it('follows the current board while building, even before any wave routed', () => {
    expect(selectPlayerPathRoute(true, () => buildRoute, [])).toBe(buildRoute);
  });

  it('keeps the wave route during a wave without searching the board', () => {
    const resolveBuildPhaseRoute = vi.fn(() => buildRoute);

    expect(selectPlayerPathRoute(false, resolveBuildPhaseRoute, waveRoute)).toBe(waveRoute);
    expect(resolveBuildPhaseRoute).not.toHaveBeenCalled();
  });
});
