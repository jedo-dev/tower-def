import { describe, expect, it } from 'vitest';
import { GRID_DIMENSIONS } from '../../constants/grid';
import { hasPathBfs } from '../pathfinding/hasPathBfs';
import { createGridModel } from './createGridModel';
import {
  DEFAULT_EDGE_ENDPOINT_MIN_DISTANCE,
  generateEdgeEndpoints,
} from './generateEdgeEndpoints';

const SAMPLE_SEEDS = Array.from({ length: 50 }, (_, index) => index * 7919 + 1);

function isEdgeCell(point: { x: number; y: number }): boolean {
  return (
    point.x === 0 ||
    point.y === 0 ||
    point.x === GRID_DIMENSIONS.cols - 1 ||
    point.y === GRID_DIMENSIONS.rows - 1
  );
}

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

describe('shared/lib/grid/generateEdgeEndpoints', () => {
  it('places entrance and exit on map edges for many seeds', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { entrance, exit } = generateEdgeEndpoints(seed);
      expect(isEdgeCell(entrance)).toBe(true);
      expect(isEdgeCell(exit)).toBe(true);
    }
  });

  it('keeps at least the minimum manhattan separation', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { entrance, exit } = generateEdgeEndpoints(seed);
      expect(manhattan(entrance, exit)).toBeGreaterThanOrEqual(
        DEFAULT_EDGE_ENDPOINT_MIN_DISTANCE,
      );
    }
  });

  it('never returns adjacent or identical endpoints', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { entrance, exit } = generateEdgeEndpoints(seed, { minManhattanDistance: 2 });
      const isAdjacent =
        Math.abs(entrance.x - exit.x) <= 1 && Math.abs(entrance.y - exit.y) <= 1;
      expect(isAdjacent).toBe(false);
    }
  });

  it('is deterministic for the same seed and differs across seeds', () => {
    const first = generateEdgeEndpoints(1337);
    const second = generateEdgeEndpoints(1337);
    expect(second).toEqual(first);

    const variants = new Set(
      SAMPLE_SEEDS.map((seed) => {
        const { entrance, exit } = generateEdgeEndpoints(seed);
        return `${entrance.x}:${entrance.y}->${exit.x}:${exit.y}`;
      }),
    );
    expect(variants.size).toBeGreaterThan(1);
  });

  it('produces endpoints with a valid initial path', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { entrance, exit } = generateEdgeEndpoints(seed);
      expect(hasPathBfs(createGridModel({ entrance, exit }))).toBe(true);
    }
  });

  it('falls back to the farthest edge cell when min distance is unreachable', () => {
    const { entrance, exit } = generateEdgeEndpoints(42, { minManhattanDistance: 1000 });
    expect(isEdgeCell(entrance)).toBe(true);
    expect(isEdgeCell(exit)).toBe(true);
    expect(manhattan(entrance, exit)).toBeGreaterThan(0);
  });
});
