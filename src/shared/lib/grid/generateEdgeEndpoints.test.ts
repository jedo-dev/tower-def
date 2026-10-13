import { describe, expect, it } from 'vitest';
import { ENDPOINT_ZONE_FOOTPRINT } from '../../constants/footprint';
import { GRID_DEFAULT_ROW_CENTER, GRID_DIMENSIONS } from '../../constants/grid';
import type { GridPoint } from '../../types/grid';
import { hasPathBfs } from '../pathfinding/hasPathBfs';
import { createGridModel } from './createGridModel';
import { doFootprintsOverlap, isFootprintInBounds } from './footprint';
import {
  DEFAULT_EDGE_ENDPOINT_MIN_DISTANCE,
  collectEdgeZoneAnchors,
  createDefaultEdgeEndpoints,
  generateEdgeEndpoints,
} from './generateEdgeEndpoints';

const SAMPLE_SEEDS = Array.from({ length: 50 }, (_, index) => index * 7919 + 1);

function isZoneOnEdge(anchor: GridPoint): boolean {
  return (
    isFootprintInBounds(GRID_DIMENSIONS, anchor, ENDPOINT_ZONE_FOOTPRINT) &&
    (anchor.x === 0 ||
      anchor.y === 0 ||
      anchor.x + ENDPOINT_ZONE_FOOTPRINT.width === GRID_DIMENSIONS.cols ||
      anchor.y + ENDPOINT_ZONE_FOOTPRINT.height === GRID_DIMENSIONS.rows)
  );
}

function manhattan(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

describe('shared/lib/grid/generateEdgeEndpoints', () => {
  it('places entrance and exit zones on map edges for many seeds', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { entrance, exit } = generateEdgeEndpoints(seed);
      expect(isZoneOnEdge(entrance)).toBe(true);
      expect(isZoneOnEdge(exit)).toBe(true);
    }
  });

  it('keeps at least the minimum manhattan separation', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { entrance, exit } = generateEdgeEndpoints(seed);
      expect(manhattan(entrance, exit)).toBeGreaterThanOrEqual(DEFAULT_EDGE_ENDPOINT_MIN_DISTANCE);
    }
  });

  it('never returns overlapping or touching zones', () => {
    for (const seed of SAMPLE_SEEDS) {
      const { entrance, exit } = generateEdgeEndpoints(seed, { minManhattanDistance: 2 });
      const paddedEntrance = { x: entrance.x - 1, y: entrance.y - 1 };
      const paddedZone = {
        width: ENDPOINT_ZONE_FOOTPRINT.width + 2,
        height: ENDPOINT_ZONE_FOOTPRINT.height + 2,
      };
      expect(doFootprintsOverlap(paddedEntrance, paddedZone, exit, ENDPOINT_ZONE_FOOTPRINT)).toBe(
        false,
      );
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

  it('falls back to the farthest edge zone when min distance is unreachable', () => {
    const { entrance, exit } = generateEdgeEndpoints(42, { minManhattanDistance: 1000 });
    expect(isZoneOnEdge(entrance)).toBe(true);
    expect(isZoneOnEdge(exit)).toBe(true);
    expect(manhattan(entrance, exit)).toBeGreaterThan(ENDPOINT_ZONE_FOOTPRINT.width);
  });

  it('lists each edge zone anchor once', () => {
    const anchors = collectEdgeZoneAnchors(GRID_DIMENSIONS.cols, GRID_DIMENSIONS.rows);
    const keys = new Set(anchors.map((anchor) => `${anchor.x}:${anchor.y}`));
    expect(keys.size).toBe(anchors.length);
    expect(anchors.every(isZoneOnEdge)).toBe(true);
  });

  it('centres the default zones on the left and right edges', () => {
    expect(createDefaultEdgeEndpoints()).toEqual({
      entrance: { x: 0, y: GRID_DEFAULT_ROW_CENTER },
      exit: { x: GRID_DIMENSIONS.cols - ENDPOINT_ZONE_FOOTPRINT.width, y: GRID_DEFAULT_ROW_CENTER },
    });
  });
});
