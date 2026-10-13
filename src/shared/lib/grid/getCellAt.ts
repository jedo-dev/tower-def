import type { GridCell, GridModel } from '../../types/grid';

type GridBounds = Pick<GridModel, 'cols' | 'rows'>;
type GridLayout = Pick<GridModel, 'cols' | 'rows' | 'cells'>;

/**
 * Cells arrays whose layout is not row-major (hand-built in tests or shuffled)
 * get a one-off coordinate index, so lookups stay O(1) after the first miss.
 */
const fallbackIndexByCells = new WeakMap<readonly GridCell[], Map<number, number>>();

export function isInsideGridBounds(grid: GridBounds, x: number, y: number): boolean {
  return (
    Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < grid.cols && y >= 0 && y < grid.rows
  );
}

/** Row-major array index for (x, y). Callers must check bounds first. */
export function toRowMajorIndex(grid: Pick<GridModel, 'cols'>, x: number, y: number): number {
  return y * grid.cols + x;
}

function buildFallbackIndex(grid: GridLayout): Map<number, number> {
  const indexByRowMajorIndex = new Map<number, number>();

  grid.cells.forEach((cell, index) => {
    if (isInsideGridBounds(grid, cell.x, cell.y)) {
      indexByRowMajorIndex.set(toRowMajorIndex(grid, cell.x, cell.y), index);
    }
  });

  fallbackIndexByCells.set(grid.cells, indexByRowMajorIndex);
  return indexByRowMajorIndex;
}

/**
 * Array index of the cell at (x, y), or -1 when outside the grid or missing.
 * Grids built by `createGridModel` are row-major (`index = y * cols + x`), so
 * this is a single array read; other layouts fall back to a cached index.
 */
export function getCellIndex(grid: GridLayout, x: number, y: number): number {
  if (!isInsideGridBounds(grid, x, y)) {
    return -1;
  }

  const rowMajorIndex = toRowMajorIndex(grid, x, y);
  const rowMajorCell = grid.cells[rowMajorIndex];

  if (rowMajorCell !== undefined && rowMajorCell.x === x && rowMajorCell.y === y) {
    return rowMajorIndex;
  }

  const fallbackIndex = fallbackIndexByCells.get(grid.cells) ?? buildFallbackIndex(grid);
  return fallbackIndex.get(rowMajorIndex) ?? -1;
}

/** O(1) cell lookup by coordinates; undefined when outside the grid. */
export function getCellAt(grid: GridLayout, x: number, y: number): GridCell | undefined {
  if (!isInsideGridBounds(grid, x, y)) {
    return undefined;
  }

  const rowMajorCell = grid.cells[toRowMajorIndex(grid, x, y)];

  if (rowMajorCell !== undefined && rowMajorCell.x === x && rowMajorCell.y === y) {
    return rowMajorCell;
  }

  const index = getCellIndex(grid, x, y);
  return index === -1 ? undefined : grid.cells[index];
}
