import { describe, expect, it } from 'vitest';
import { UnitSizeClass } from '../../types/content-ids';
import { SINGLE_CELL_FOOTPRINT } from '../../constants/footprint';
import type { GridCell, GridModel } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';
import {
  findRouteForSizeClass,
  findRoutesBySizeClass,
  hasRouteForSizeClass,
  selectRouteForSizeClass,
} from './findRouteForSizeClass';

const LARGE_FOOTPRINT = 2;

/** '.' free, '#' not walkable, 'T' occupied by a tower. */
function parseGrid(rowsText: readonly string[]): GridModel {
  const cells: GridCell[] = [];

  rowsText.forEach((rowText, y) => {
    [...rowText].forEach((symbol, x) => {
      cells.push({ x, y, role: 'empty', isWalkable: symbol !== '#', isOccupied: symbol === 'T' });
    });
  });

  return {
    cols: rowsText[0].length,
    rows: rowsText.length,
    cells,
    entrance: { x: 0, y: 0 },
    exit: { x: rowsText[0].length - 1, y: rowsText.length - 1 },
    endpointZoneFootprint: SINGLE_CELL_FOOTPRINT,
  };
}

function isFree(grid: GridModel, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) {
    return false;
  }

  const cell = grid.cells[y * grid.cols + x];
  return cell.isWalkable && !cell.isOccupied;
}

function fits(grid: GridModel, anchor: GridPosition, size: number): boolean {
  for (let offsetY = 0; offsetY < size; offsetY += 1) {
    for (let offsetX = 0; offsetX < size; offsetX += 1) {
      if (!isFree(grid, anchor.x + offsetX, anchor.y + offsetY)) {
        return false;
      }
    }
  }

  return true;
}

/** Each step moves one anchor; every anchor fits; diagonals sweep only free cells. */
function expectLegalRoute(grid: GridModel, route: readonly GridPosition[], size: number): void {
  route.forEach((anchor) => expect(fits(grid, anchor, size)).toBe(true));

  for (let index = 1; index < route.length; index += 1) {
    const from = route[index - 1];
    const deltaX = route[index].x - from.x;
    const deltaY = route[index].y - from.y;

    expect(Math.max(Math.abs(deltaX), Math.abs(deltaY))).toBe(1);

    if (deltaX !== 0 && deltaY !== 0) {
      expect(fits(grid, { x: from.x + deltaX, y: from.y }, size)).toBe(true);
      expect(fits(grid, { x: from.x, y: from.y + deltaY }, size)).toBe(true);
    }
  }
}

// Wall at x = 5 with a one-cell gap at y = 1 and a two-cell gap at y = 7..8.
const TWO_GAP_ROWS: readonly string[] = [
  '.....#....',
  '..........',
  '.....#....',
  '.....#....',
  '.....#....',
  '.....#....',
  '.....#....',
  '..........',
  '..........',
  '.....#....',
];

const ONE_GAP_ROWS = TWO_GAP_ROWS.map((row, y) =>
  y === 7 || y === 8 ? `${row.slice(0, 5)}T${row.slice(6)}` : row,
);

const START: GridPosition = { x: 0, y: 0 };
const GOAL: GridPosition = { x: 8, y: 0 };

describe('shared/pathfinding/findRouteForSizeClass', () => {
  it('lets small creatures through a one-cell gap but not large ones', () => {
    const grid = parseGrid(ONE_GAP_ROWS);

    const small = findRouteForSizeClass(grid, START, GOAL, UnitSizeClass.SMALL);

    expect(small).not.toBeNull();
    expect(small).toContainEqual({ x: 5, y: 1 });
    expect(findRouteForSizeClass(grid, START, GOAL, UnitSizeClass.LARGE)).toBeNull();
    expect(hasRouteForSizeClass(grid, START, GOAL, UnitSizeClass.SMALL)).toBe(true);
    expect(hasRouteForSizeClass(grid, START, GOAL, UnitSizeClass.LARGE)).toBe(false);
  });

  it('sends large creatures the longer way round through a two-cell gap', () => {
    const grid = parseGrid(TWO_GAP_ROWS);

    const small = findRouteForSizeClass(grid, START, GOAL, UnitSizeClass.SMALL);
    const large = findRouteForSizeClass(grid, START, GOAL, UnitSizeClass.LARGE);

    expect(small).not.toBeNull();
    expect(large).not.toBeNull();
    expect(large!.length).toBeGreaterThan(small!.length);
    expect(large).toContainEqual({ x: 5, y: 7 });
    expect(large![0]).toEqual(START);
    expect(large![large!.length - 1]).toEqual(GOAL);
    expectLegalRoute(grid, small!, 1);
    expectLegalRoute(grid, large!, LARGE_FOOTPRINT);
  });

  it('routes medium creatures with the single-cell footprint', () => {
    const grid = parseGrid(ONE_GAP_ROWS);

    expect(findRouteForSizeClass(grid, START, GOAL, UnitSizeClass.MEDIUM)).toEqual(
      findRouteForSizeClass(grid, START, GOAL, UnitSizeClass.SMALL),
    );
  });

  it('never lets a large creature squeeze past a corner', () => {
    // Anchors (0,0) and (1,1) both fit, but the diagonal step between them
    // would sweep the blocked cells (2,0) and (0,2).
    const grid = parseGrid(['..#..', '.....', '#....', '.....', '.....']);
    const goal: GridPosition = { x: 1, y: 1 };

    expect(findRouteForSizeClass(grid, START, goal, UnitSizeClass.LARGE)).toBeNull();
    expect(findRouteForSizeClass(grid, START, goal, UnitSizeClass.SMALL)).toEqual([START, goal]);
  });

  it('keeps every large anchor on a 2x2 free square across a cluttered board', () => {
    const grid = parseGrid([
      '............',
      '........##..',
      '..TT........',
      '..TT..TT....',
      '.##...TT..#.',
      '............',
      '.TT.........',
      '.TT.....TT..',
      '........TT..',
      '............',
    ]);
    const goal: GridPosition = { x: 10, y: 8 };

    const large = findRouteForSizeClass(grid, START, goal, UnitSizeClass.LARGE);

    expect(large).not.toBeNull();
    expectLegalRoute(grid, large!, LARGE_FOOTPRINT);
  });

  it('rejects a goal anchor whose footprint does not fit', () => {
    const grid = parseGrid(TWO_GAP_ROWS);
    const cornerGoal: GridPosition = { x: 9, y: 9 };

    expect(findRouteForSizeClass(grid, START, cornerGoal, UnitSizeClass.LARGE)).toBeNull();
    expect(findRouteForSizeClass(grid, START, cornerGoal, UnitSizeClass.SMALL)).not.toBeNull();
  });

  it('is deterministic across repeated searches', () => {
    const grid = parseGrid(TWO_GAP_ROWS);

    const first = findRouteForSizeClass(grid, START, GOAL, UnitSizeClass.LARGE);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(findRouteForSizeClass(grid, START, GOAL, UnitSizeClass.LARGE)).toEqual(first);
    }
  });
});

describe('shared/pathfinding/findRoutesBySizeClass', () => {
  it('matches the per-size-class searches', () => {
    const grid = parseGrid(TWO_GAP_ROWS);

    expect(findRoutesBySizeClass(grid, START, GOAL)).toEqual({
      small: findRouteForSizeClass(grid, START, GOAL, UnitSizeClass.SMALL),
      large: findRouteForSizeClass(grid, START, GOAL, UnitSizeClass.LARGE),
    });
  });

  it('returns null only for the large route when large creatures cannot pass', () => {
    const routes = findRoutesBySizeClass(parseGrid(ONE_GAP_ROWS), START, GOAL);

    expect(routes.small).not.toBeNull();
    expect(routes.large).toBeNull();
  });

  it('selects the route each size class follows', () => {
    const routes = findRoutesBySizeClass(parseGrid(TWO_GAP_ROWS), START, GOAL);

    expect(selectRouteForSizeClass(routes, UnitSizeClass.SMALL)).toBe(routes.small);
    expect(selectRouteForSizeClass(routes, UnitSizeClass.MEDIUM)).toBe(routes.small);
    expect(selectRouteForSizeClass(routes, UnitSizeClass.LARGE)).toBe(routes.large);
  });
});
