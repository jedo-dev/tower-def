import { describe, expect, it } from 'vitest';
import { createGridModel } from '../grid/createGridModel';
import { findPathBfs } from './hasPathBfs';
import { createPathProbe } from './createPathProbe';
import type { GridModel } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';

const ENTRANCE = { x: 0, y: 7 };
const EXIT = { x: 9, y: 7 };

function createTestGrid(): GridModel {
  return createGridModel({ entrance: ENTRANCE, exit: EXIT });
}

function block(grid: GridModel, positions: readonly GridPosition[]): GridModel {
  const blockedKeys = new Set(positions.map((p) => `${p.x}:${p.y}`));
  return {
    ...grid,
    cells: grid.cells.map((cell) =>
      blockedKeys.has(`${cell.x}:${cell.y}`)
        ? { ...cell, isOccupied: true, isWalkable: false }
        : cell,
    ),
  };
}

describe('shared/pathfinding/createPathProbe', () => {
  it('reports the same base path as the reference search', () => {
    const grid = createTestGrid();
    const probe = createPathProbe(grid);

    expect(probe.basePath).toEqual(findPathBfs(grid).path);
    expect(probe.baseLength).toBe(findPathBfs(grid).path.length);
  });

  it('leaves the length unchanged when the blocked cell is off the route', () => {
    const grid = createTestGrid();
    const probe = createPathProbe(grid);

    const result = probe.probe({ x: 4, y: 0 });

    expect(result.path).not.toBeNull();
    expect(result.length).toBe(probe.baseLength);
  });

  it('lengthens the route when the blocked cell sits on it', () => {
    const grid = createTestGrid();
    const probe = createPathProbe(grid);

    const result = probe.probe({ x: 4, y: 7 });

    expect(result.length).toBeGreaterThan(probe.baseLength);
    expect(result.path?.some((cell) => cell.x === 4 && cell.y === 7)).toBe(false);
  });

  it('reports a sealed field when the blocked cell is the last way through', () => {
    // Wall across the whole grid at x=4 except a single gap at y=7.
    const wall: GridPosition[] = [];
    for (let y = 0; y < createTestGrid().rows; y += 1) {
      if (y !== 7) {
        wall.push({ x: 4, y });
      }
    }
    const probe = createPathProbe(block(createTestGrid(), wall));

    expect(probe.baseLength).toBeGreaterThan(0);
    expect(probe.probe({ x: 4, y: 7 })).toEqual({ path: null, length: 0 });
  });

  it('never lets the entrance or the exit be walled off', () => {
    const probe = createPathProbe(createTestGrid());

    expect(probe.probe(ENTRANCE).path).toBeNull();
    expect(probe.probe(EXIT).path).toBeNull();
  });

  it('treats towers, walls and anything outside the grid as blocked', () => {
    const grid = block(createTestGrid(), [{ x: 3, y: 3 }]);
    const probe = createPathProbe(grid);

    expect(probe.isBlocked({ x: 3, y: 3 })).toBe(true);
    expect(probe.isBlocked({ x: 3, y: 4 })).toBe(false);
    expect(probe.isBlocked({ x: -1, y: 4 })).toBe(true);
    expect(probe.isBlocked({ x: 0, y: 99 })).toBe(true);
  });

  it('returns the same result on repeated probes of one cell', () => {
    const probe = createPathProbe(createTestGrid());

    const first = probe.probe({ x: 4, y: 7 });
    const second = probe.probe({ x: 4, y: 7 });

    expect(second.length).toBe(first.length);
    expect(second.path).toEqual(first.path);
  });

  it('agrees with the reference search on a grid that already has walls', () => {
    const grid = block(createTestGrid(), [
      { x: 4, y: 7 },
      { x: 4, y: 6 },
    ]);
    const probe = createPathProbe(grid);

    expect(probe.basePath).toEqual(findPathBfs(grid).path);
  });
});
