import { describe, expect, it } from 'vitest';
import { RouteSizeClass } from '../../constants/board-snapshot';
import { createGridModel } from '../grid/createGridModel';
import { findPathBfs } from '../pathfinding/hasPathBfs';
import type { GridCell, GridModel, GridPoint } from '../../types/grid';
import { renderBoardSnapshot } from './renderBoardSnapshot';

function createSmallGrid(
  cols: number,
  rows: number,
  entrance: GridPoint,
  exit: GridPoint,
): GridModel {
  const cells: GridCell[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      cells.push({ x, y, role: 'empty', isWalkable: true, isOccupied: false });
    }
  }
  return { cols, rows, cells, entrance, exit };
}

function withBlockedCells(grid: GridModel, blocked: readonly GridPoint[]): GridModel {
  return {
    ...grid,
    cells: grid.cells.map((cell) =>
      blocked.some((point) => point.x === cell.x && point.y === cell.y)
        ? { ...cell, isOccupied: true, isWalkable: false }
        : cell,
    ),
  };
}

describe('shared/lib/board-snapshot/renderBoardSnapshot', () => {
  it('renders an empty board with only the entrance and the exit', () => {
    const grid = createGridModel({ entrance: { x: 0, y: 7 }, exit: { x: 9, y: 7 } });

    expect(renderBoardSnapshot({ grid })).toMatchInlineSnapshot(`
      "board 10x15
      ..........
      ..........
      ..........
      ..........
      ..........
      ..........
      ..........
      E........X
      ..........
      ..........
      ..........
      ..........
      ..........
      ..........
      .........."
    `);
  });

  it('renders a wall of 1x1 and 2x2 tower footprints', () => {
    const grid = createSmallGrid(6, 5, { x: 0, y: 0 }, { x: 5, y: 4 });

    const snapshot = renderBoardSnapshot({
      grid,
      towers: [
        { anchor: { x: 2, y: 0 } },
        { anchor: { x: 2, y: 1 } },
        { anchor: { x: 2, y: 2 }, width: 2, height: 2 },
      ],
    });

    expect(snapshot).toMatchInlineSnapshot(`
      "board 6x5
      E.#...
      ..#...
      ..##..
      ..##..
      .....X"
    `);
  });

  it('draws a route around a wall and reports its length', () => {
    const grid = withBlockedCells(createSmallGrid(6, 5, { x: 0, y: 2 }, { x: 5, y: 2 }), [
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
    ]);
    const route = findPathBfs(grid).path;

    const snapshot = renderBoardSnapshot({
      grid,
      routes: [{ label: 'route', sizeClass: RouteSizeClass.SMALL, cells: route }],
    });

    expect(snapshot).toMatchInlineSnapshot(`
      "board 6x5 | route (small) 10
      ......
      ...#..
      Ess#.X
      ..s#.s
      ..ssss"
    `);
  });

  it('marks cells shared by a small and a large route', () => {
    const grid = createSmallGrid(5, 3, { x: 0, y: 1 }, { x: 4, y: 1 });

    const snapshot = renderBoardSnapshot({
      grid,
      routes: [
        {
          label: 'small',
          sizeClass: RouteSizeClass.SMALL,
          cells: [0, 1, 2, 3, 4].map((x) => ({ x, y: 1 })),
        },
        {
          label: 'large',
          sizeClass: RouteSizeClass.LARGE,
          cells: [
            { x: 0, y: 1 },
            { x: 1, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
            { x: 3, y: 2 },
            { x: 3, y: 1 },
            { x: 4, y: 1 },
          ],
        },
      ],
    });

    expect(snapshot).toMatchInlineSnapshot(`
      "board 5x3 | small (small) 5 | large (large) 7
      .....
      E*s*X
      .LLL."
    `);
  });

  it('is deterministic for the same input', () => {
    const grid = withBlockedCells(createSmallGrid(4, 4, { x: 0, y: 0 }, { x: 3, y: 3 }), [
      { x: 1, y: 1 },
    ]);
    const input = {
      grid,
      routes: [{ label: 'route', sizeClass: RouteSizeClass.SMALL, cells: findPathBfs(grid).path }],
    };

    expect(renderBoardSnapshot(input)).toBe(renderBoardSnapshot(input));
  });
});
