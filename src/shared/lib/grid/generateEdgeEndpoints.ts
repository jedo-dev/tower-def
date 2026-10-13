import type { Footprint, GridPoint } from '../../types/grid';
import { GRID_DIMENSIONS } from '../../constants/grid';
import { ENDPOINT_ZONE_FOOTPRINT } from '../../constants/footprint';
import { hasRouteForSizeClass } from '../pathfinding/findRouteForSizeClass';
import { UnitSizeClass } from '../../types/content-ids';
import { createGridModel } from './createGridModel';
import { doFootprintsOverlap } from './footprint';

/** Top-left anchors of the entrance and exit zones. */
export type EdgeEndpoints = {
  entrance: GridPoint;
  exit: GridPoint;
};

export type GenerateEdgeEndpointsOptions = {
  cols?: number;
  rows?: number;
  /** Minimum manhattan distance between the two zone anchors. */
  minManhattanDistance?: number;
};

export const DEFAULT_EDGE_ENDPOINT_MIN_DISTANCE = Math.max(
  GRID_DIMENSIONS.cols,
  GRID_DIMENSIONS.rows,
);

/** Zones keep at least one free cell between them. */
const ZONE_SEPARATION_CELLS = 1;

// mulberry32: tiny deterministic PRNG so the same seed always yields the
// same endpoints on every client.
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Every anchor whose zone lies inside the grid and touches at least one edge,
 * without duplicates, in a stable order.
 */
export function collectEdgeZoneAnchors(
  cols: number,
  rows: number,
  zone: Readonly<Footprint> = ENDPOINT_ZONE_FOOTPRINT,
): GridPoint[] {
  const maxX = cols - zone.width;
  const maxY = rows - zone.height;
  const anchors: GridPoint[] = [];

  if (maxX < 0 || maxY < 0) {
    return anchors;
  }

  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      if (x === 0 || y === 0 || x === maxX || y === maxY) {
        anchors.push({ x, y });
      }
    }
  }

  return anchors;
}

function manhattanDistance(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** True when two zones overlap or touch (including diagonally). */
export function areZonesTooClose(
  first: GridPoint,
  second: GridPoint,
  zone: Readonly<Footprint> = ENDPOINT_ZONE_FOOTPRINT,
): boolean {
  const paddedAnchor = { x: first.x - ZONE_SEPARATION_CELLS, y: first.y - ZONE_SEPARATION_CELLS };
  const paddedZone = {
    width: zone.width + ZONE_SEPARATION_CELLS * 2,
    height: zone.height + ZONE_SEPARATION_CELLS * 2,
  };
  return doFootprintsOverlap(paddedAnchor, paddedZone, second, zone);
}

/** Entrance zone centred on the left edge, exit zone centred on the right edge. */
export function createDefaultEdgeEndpoints(
  cols: number = GRID_DIMENSIONS.cols,
  rows: number = GRID_DIMENSIONS.rows,
): EdgeEndpoints {
  const zoneTopRow = Math.floor((rows - ENDPOINT_ZONE_FOOTPRINT.height) / 2);

  return {
    entrance: { x: 0, y: zoneTopRow },
    exit: { x: cols - ENDPOINT_ZONE_FOOTPRINT.width, y: zoneTopRow },
  };
}

/**
 * Seeded entrance and exit zone anchors on the map edges. The zones never
 * overlap or touch and sit at least `minManhattanDistance` apart when the grid
 * allows it; otherwise the exit takes the farthest edge anchor.
 */
export function generateEdgeEndpoints(
  seed: number,
  options?: GenerateEdgeEndpointsOptions,
): EdgeEndpoints {
  const cols = options?.cols ?? GRID_DIMENSIONS.cols;
  const rows = options?.rows ?? GRID_DIMENSIONS.rows;
  const minDistance = options?.minManhattanDistance ?? DEFAULT_EDGE_ENDPOINT_MIN_DISTANCE;

  const random = createSeededRandom(seed);
  const edgeAnchors = collectEdgeZoneAnchors(cols, rows);
  if (edgeAnchors.length === 0) {
    return createDefaultEdgeEndpoints(cols, rows);
  }

  const entrance = edgeAnchors[Math.floor(random() * edgeAnchors.length)];
  const separatedAnchors = edgeAnchors.filter((anchor) => !areZonesTooClose(entrance, anchor));
  const exitCandidates = separatedAnchors.filter(
    (anchor) => manhattanDistance(anchor, entrance) >= minDistance,
  );

  let exit: GridPoint;
  if (exitCandidates.length > 0) {
    exit = exitCandidates[Math.floor(random() * exitCandidates.length)];
  } else if (separatedAnchors.length > 0) {
    // Requested distance is unreachable on this grid: take the farthest anchor.
    exit = separatedAnchors.reduce((farthest, anchor) =>
      manhattanDistance(anchor, entrance) > manhattanDistance(farthest, entrance)
        ? anchor
        : farthest,
    );
  } else {
    return createDefaultEdgeEndpoints(cols, rows);
  }

  const isPathable =
    cols === GRID_DIMENSIONS.cols && rows === GRID_DIMENSIONS.rows
      ? // Large creeps need the 2-wide route, so an empty board must carry both sizes.
        hasRouteForSizeClass(
          createGridModel({ entrance, exit }),
          entrance,
          exit,
          UnitSizeClass.LARGE,
        )
      : true;
  if (!isPathable) {
    return createDefaultEdgeEndpoints(cols, rows);
  }

  return { entrance, exit };
}
