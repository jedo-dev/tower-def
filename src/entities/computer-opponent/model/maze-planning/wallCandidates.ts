import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import type { Footprint, GridPoint } from '../../../../shared/types/grid';
import { MAZE_PLAN_LANE_WIDTH, MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH } from './constants';

/** A wall either runs along a row (across the columns) or along a column. */
export type WallAxis = 'row' | 'column';

/**
 * One straight wall of tower blocks, attached to a board edge and running
 * across the field until only a lane for the largest creeps is left at the
 * far edge. Anchors are ordered from the attached edge outwards, which is
 * also the order that makes a half-built wall already push the route around
 * its tip.
 */
export type WallCandidate = {
  readonly axis: WallAxis;
  /** Anchor row of a row wall, anchor column of a column wall. */
  readonly line: number;
  /** Attached to the left (row wall) or top (column wall) edge. */
  readonly fromLowEdge: boolean;
  readonly anchors: readonly GridPoint[];
};

/** The entrance or exit zone: its top-left anchor and its size. */
export type EndpointZone = {
  readonly anchor: GridPoint;
  readonly footprint: Readonly<Footprint>;
};

/** Anchor offsets along one axis, from the low edge (or the high edge) towards the lane. */
function collectOffsets(size: number, block: number, fromLowEdge: boolean): number[] {
  const offsets: number[] = [];

  if (fromLowEdge) {
    for (let offset = 0; offset + block <= size - MAZE_PLAN_LANE_WIDTH; offset += block) {
      offsets.push(offset);
    }
    return offsets;
  }

  for (let offset = size - block; offset >= MAZE_PLAN_LANE_WIDTH; offset -= block) {
    offsets.push(offset);
  }
  return offsets;
}

/**
 * True when `zone` lies in a narrow strip between `wall` and the board edge
 * the wall runs along (at most `MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH` wide).
 */
function isZoneInEdgeStrip(
  wall: WallCandidate,
  zone: EndpointZone,
  cols: number,
  rows: number,
): boolean {
  const isRow = wall.axis === 'row';
  const size = isRow ? rows : cols;
  const thickness = isRow ? TOWER_FOOTPRINT.height : TOWER_FOOTPRINT.width;
  const zoneStart = isRow ? zone.anchor.y : zone.anchor.x;
  const zoneEnd = zoneStart + (isRow ? zone.footprint.height : zone.footprint.width);
  const wallEnd = wall.line + thickness;

  const isInLowStrip = zoneEnd <= wall.line && wall.line <= MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH;
  const isInHighStrip =
    zoneStart >= wallEnd && size - wallEnd <= MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH;
  return isInLowStrip || isInHighStrip;
}

/**
 * Every edge-attached wall the planner considers, in a fixed order: walls
 * along each tower row (from the left and from the right edge), then walls
 * along each tower column. Alternating walls from opposite edges is what
 * produces a serpentine; which ones, and in what order, is left to the search.
 * Walls that would squeeze an endpoint zone into a strip along the board edge
 * are left out (see `MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH`).
 */
export function createWallCandidates(
  cols: number,
  rows: number,
  endpointZones: readonly EndpointZone[] = [],
): WallCandidate[] {
  const { width, height } = TOWER_FOOTPRINT;
  const candidates: WallCandidate[] = [];

  for (let line = 0; line + height <= rows; line += 1) {
    for (const fromLowEdge of [true, false]) {
      const anchors = collectOffsets(cols, width, fromLowEdge).map((x) => ({ x, y: line }));
      if (anchors.length > 0) {
        candidates.push({ axis: 'row', line, fromLowEdge, anchors });
      }
    }
  }

  for (let line = 0; line + width <= cols; line += 1) {
    for (const fromLowEdge of [true, false]) {
      const anchors = collectOffsets(rows, height, fromLowEdge).map((y) => ({ x: line, y }));
      if (anchors.length > 0) {
        candidates.push({ axis: 'column', line, fromLowEdge, anchors });
      }
    }
  }

  return candidates.filter(
    (wall) => !endpointZones.some((zone) => isZoneInEdgeStrip(wall, zone, cols, rows)),
  );
}

/** Candidates one line either side of `wall`, attached to the same edge. */
export function findNeighborWalls(
  candidates: readonly WallCandidate[],
  wall: WallCandidate,
): WallCandidate[] {
  return candidates.filter(
    (other) =>
      other.axis === wall.axis &&
      other.fromLowEdge === wall.fromLowEdge &&
      Math.abs(other.line - wall.line) === 1,
  );
}
