import { describe, expect, it } from 'vitest';
import { ENDPOINT_ZONE_FOOTPRINT } from '../../constants/footprint';
import { GridConfig } from '../../constants/grid';
import { findPathBfs } from '../pathfinding/hasPathBfs';
import { createGridModel } from './createGridModel';
import { getFootprintCells } from './footprint';
import { getCellAt } from './getCellAt';
import { createDefaultEdgeEndpoints } from './generateEdgeEndpoints';

describe('shared/lib/grid/createGridModel', () => {
  const { entrance, exit } = createDefaultEdgeEndpoints();
  const grid = createGridModel({ entrance, exit });

  it('builds a 20x30 row-major grid', () => {
    expect(grid.cols).toBe(GridConfig.COLS);
    expect(grid.rows).toBe(GridConfig.ROWS);
    expect(grid.cells).toHaveLength(GridConfig.COLS * GridConfig.ROWS);
    expect(grid.cells[grid.cols + 2]).toMatchObject({ x: 2, y: 1 });
  });

  it('marks every cell of the 2x2 entrance and exit zones with the zone role', () => {
    expect(grid.endpointZoneFootprint).toEqual(ENDPOINT_ZONE_FOOTPRINT);

    for (const point of getFootprintCells(entrance, ENDPOINT_ZONE_FOOTPRINT)) {
      expect(getCellAt(grid, point.x, point.y)?.role).toBe('entrance');
    }
    for (const point of getFootprintCells(exit, ENDPOINT_ZONE_FOOTPRINT)) {
      expect(getCellAt(grid, point.x, point.y)?.role).toBe('exit');
    }

    const zoneCellCount = grid.cells.filter((cell) => cell.role !== 'empty').length;
    expect(zoneCellCount).toBe(ENDPOINT_ZONE_FOOTPRINT.width * ENDPOINT_ZONE_FOOTPRINT.height * 2);
  });

  it('keeps zone cells walkable so the route runs from anchor to anchor', () => {
    const { path } = findPathBfs(grid);

    expect(path[0]).toEqual(entrance);
    expect(path[path.length - 1]).toEqual(exit);
  });

  it('clips a zone that hangs over the grid edge', () => {
    const clipped = createGridModel({ entrance: { x: -1, y: 0 }, exit: exit });

    expect(getCellAt(clipped, 0, 0)?.role).toBe('entrance');
    expect(getCellAt(clipped, 0, 1)?.role).toBe('entrance');
    expect(getCellAt(clipped, 1, 0)?.role).toBe('empty');
  });
});
