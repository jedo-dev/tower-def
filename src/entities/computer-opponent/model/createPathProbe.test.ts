import { describe, expect, it } from 'vitest';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { createDefaultEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import { findRoutesBySizeClass } from '../../../shared/lib/pathfinding/findRouteForSizeClass';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { createPathProbe } from './createPathProbe';

const ENDPOINTS = createDefaultEdgeEndpoints();

/**
 * Measured at about 2,000 expansions (two baseline searches plus re-searches
 * for the few dozen anchors touching a route); the budget leaves headroom for
 * tie-break changes while staying far below one search per anchor (~330,000).
 */
const EMPTY_BOARD_EXPANSION_BUDGET = 4_000;

function createTestGrid(): GridModel {
  return createGridModel(ENDPOINTS);
}

function blockWhere(grid: GridModel, isBlocked: (position: GridPosition) => boolean): GridModel {
  return {
    ...grid,
    cells: grid.cells.map((cell) =>
      isBlocked(cell) ? { ...cell, isOccupied: true, isWalkable: false } : cell,
    ),
  };
}

/** Columns 8..9 walled except rows `fromRow..toRow`. */
function createWallWithGap(fromRow: number, toRow: number): GridModel {
  return blockWhere(
    createTestGrid(),
    ({ x, y }) => (x === 8 || x === 9) && (y < fromRow || y > toRow),
  );
}

function containsCell(path: readonly GridPosition[] | null, cell: GridPosition): boolean {
  return path?.some(({ x, y }) => x === cell.x && y === cell.y) ?? false;
}

describe('computer-opponent/createPathProbe', () => {
  it('reports the small octile route as the base path', () => {
    const grid = createTestGrid();
    const probe = createPathProbe(grid);

    expect(probe.basePath).toEqual(findRoutesBySizeClass(grid, grid.entrance, grid.exit).small);
    // Straight across an open board: one cost unit per column.
    expect(probe.baseCost).toBe(ENDPOINTS.exit.x - ENDPOINTS.entrance.x);
  });

  it('leaves the route unchanged when the block stays off it', () => {
    const probe = createPathProbe(createTestGrid());
    const result = probe.probeFootprint({ x: 8, y: 2 });

    expect(result.path).toEqual(probe.basePath);
    expect(result.cost).toBe(probe.baseCost);
    expect(result.gain).toBe(0);
  });

  it('reports the octile detour when the block sits on the route', () => {
    const probe = createPathProbe(createTestGrid());
    const anchor = { x: 8, y: ENDPOINTS.entrance.y };
    const result = probe.probeFootprint(anchor);

    expect(result.gain).toBeGreaterThan(0);
    expect(result.cost).toBeCloseTo(probe.baseCost + result.gain, 6);
    expect(containsCell(result.path, anchor)).toBe(false);
  });

  it('seals a block that leaves only a one-cell gap, which large creeps cannot pass', () => {
    const probe = createPathProbe(createWallWithGap(10, 12));

    expect(probe.baseCost).toBeGreaterThan(0);
    expect(probe.probeFootprint({ x: 8, y: 10 })).toEqual({ path: null, cost: 0, gain: 0 });
    expect(probe.probeFootprint({ x: 8, y: 11 }).path).toBeNull();
  });

  it('seals a block whose corner touches another wall, since creeps never cut corners', () => {
    const grid = blockWhere(
      createTestGrid(),
      ({ x, y }) => ((x === 8 || x === 9) && y <= 11) || ((x === 10 || x === 11) && y >= 14),
    );
    const probe = createPathProbe(grid);

    expect(probe.baseCost).toBeGreaterThan(0);
    expect(probe.probeFootprint({ x: 8, y: 12 }).path).toBeNull();
  });

  it('accepts a block that keeps a two-cell gap open', () => {
    const probe = createPathProbe(createWallWithGap(10, 13));

    expect(probe.probeFootprint({ x: 8, y: 10 }).path).not.toBeNull();
    expect(probe.probeFootprint({ x: 8, y: 10 }).gain).toBeGreaterThanOrEqual(0);
    // Splitting the gap into two single-cell lanes shuts large creeps out.
    expect(probe.probeFootprint({ x: 8, y: 11 }).path).toBeNull();
  });

  it('treats blocks off the grid, over towers or over the endpoints as sealed', () => {
    const grid = createWallWithGap(10, 13);
    const probe = createPathProbe(grid);

    expect(probe.probeFootprint({ x: grid.cols - 1, y: 0 }).path).toBeNull();
    expect(probe.probeFootprint({ x: 7, y: 0 }).path).toBeNull();
    expect(probe.probeFootprint(ENDPOINTS.entrance).path).toBeNull();
    expect(probe.probeFootprint(ENDPOINTS.exit).path).toBeNull();
  });

  it('treats towers, walls and anything outside the grid as blocked', () => {
    const probe = createPathProbe(blockWhere(createTestGrid(), ({ x, y }) => x === 3 && y === 3));

    expect(probe.isBlocked({ x: 3, y: 3 })).toBe(true);
    expect(probe.isBlocked({ x: 3, y: 4 })).toBe(false);
    expect(probe.isBlocked({ x: -1, y: 4 })).toBe(true);
    expect(probe.isBlocked({ x: 0, y: 99 })).toBe(true);
  });

  it('memoizes repeated probes of one anchor', () => {
    const probe = createPathProbe(createTestGrid());
    const anchor = { x: 8, y: ENDPOINTS.entrance.y };

    const first = probe.probeFootprint(anchor);
    const expandedAfterFirst = probe.expandedNodeCount;
    const second = probe.probeFootprint(anchor);

    expect(second).toBe(first);
    expect(probe.expandedNodeCount).toBe(expandedAfterFirst);
  });

  it('probes every anchor of an empty 20x30 board with bounded search work', () => {
    const grid = createTestGrid();
    const probe = createPathProbe(grid);
    let anchorCount = 0;

    for (let y = 0; y < grid.rows - 1; y += 1) {
      for (let x = 0; x < grid.cols - 1; x += 1) {
        probe.probeFootprint({ x, y });
        anchorCount += 1;
      }
    }

    // Only blocks touching a route trigger searches; the rest reuse the base
    // routes. A full rescan per anchor would be anchorCount * cells.
    expect(anchorCount).toBe(19 * 29);
    expect(probe.expandedNodeCount).toBeLessThanOrEqual(EMPTY_BOARD_EXPANSION_BUDGET);
  });
});
