import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import type { GridPoint } from '../../../../shared/types/grid';
import { MAZE_PLAN_LANE_WIDTH } from './constants';

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
 * Every edge-attached wall the planner considers, in a fixed order: walls
 * along each tower row (from the left and from the right edge), then walls
 * along each tower column. Alternating walls from opposite edges is what
 * produces a serpentine; which ones, and in what order, is left to the search.
 */
export function createWallCandidates(cols: number, rows: number): WallCandidate[] {
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

  return candidates;
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
