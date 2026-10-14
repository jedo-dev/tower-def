import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import type { Footprint, GridPoint } from '../../../../shared/types/grid';
import { MAZE_PLAN_MAX_CLOSING_WALL_BLOCKS, MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH } from './constants';
import {
  buildChain,
  buildEdgeLine,
  isAttached,
  type WallDirection,
  type WallSiteView,
} from './wallChains';

export type { WallDirection, WallSiteView } from './wallChains';

/**
 * One wall of tower blocks: a chain that starts against an obstacle (a board
 * edge or a standing block) and runs in a straight or diagonal line until
 * only a lane for the largest creeps is left before the next obstacle.
 * Diagonal walls are blocks touching at corners, which seal just like a
 * straight wall (no corner cutting) but span both axes. Anchors are ordered
 * from the attached end outwards, which is also the order that makes a
 * half-built wall already push the route around its tip.
 */
export type WallCandidate = {
  readonly direction: WallDirection;
  readonly start: GridPoint;
  readonly anchors: readonly GridPoint[];
};

/** The entrance or exit zone: its top-left anchor and its size. */
export type EndpointZone = {
  readonly anchor: GridPoint;
  readonly footprint: Readonly<Footprint>;
};

/** Straight directions first, then diagonals; the order breaks ties. */
export const WALL_DIRECTIONS: readonly WallDirection[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: -1 },
];

const { width: BLOCK_WIDTH, height: BLOCK_HEIGHT } = TOWER_FOOTPRINT;

export function isDiagonalWall(wall: WallCandidate): boolean {
  return wall.direction.x !== 0 && wall.direction.y !== 0;
}

/**
 * Index of the line a wall runs along: its anchor row (horizontal wall), its
 * anchor column (vertical wall) or its diagonal. Neighbouring lines differ by 1.
 */
export function getWallLine(wall: WallCandidate): number {
  const { direction, start } = wall;
  if (direction.y === 0) {
    return start.y;
  }
  if (direction.x === 0) {
    return start.x;
  }
  return direction.x === direction.y ? start.x - start.y : start.x + start.y;
}

/**
 * True when `zone` lies in a narrow strip between a straight wall and the
 * board edge the wall runs along (at most `MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH`
 * wide). Creeps walking such a strip pass one face of the wall only.
 */
function isZoneInEdgeStrip(wall: WallCandidate, zone: EndpointZone, view: WallSiteView): boolean {
  if (isDiagonalWall(wall)) {
    return false;
  }
  const isRow = wall.direction.y === 0;
  const line = getWallLine(wall);
  const size = isRow ? view.rows : view.cols;
  const thickness = isRow ? BLOCK_HEIGHT : BLOCK_WIDTH;
  const zoneStart = isRow ? zone.anchor.y : zone.anchor.x;
  const zoneEnd = zoneStart + (isRow ? zone.footprint.height : zone.footprint.width);
  const wallEnd = line + thickness;

  const isInLowStrip = zoneEnd <= line && line <= MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH;
  const isInHighStrip =
    zoneStart >= wallEnd && size - wallEnd <= MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH;
  return isInLowStrip || isInHighStrip;
}

/**
 * Every wall the planner considers on the board as it stands, in a fixed
 * order (direction, then row-major start): straight and diagonal chains from
 * each board edge and from each face of a block already there, short walls
 * that close a passage exactly (see `MAZE_PLAN_MAX_CLOSING_WALL_BLOCKS`) and
 * edge-to-edge lines across obstacles (see `buildEdgeLine`). Attaching to
 * blocks is what lets a short wall branch off an existing one instead of
 * crossing the whole board; alternating walls is what produces a serpentine,
 * and which ones, in what order, is left to the search. Walls that would
 * squeeze an endpoint zone into a strip along the board edge are left out
 * (see `MAZE_PLAN_MAX_ENDPOINT_STRIP_WIDTH`).
 */
export function createWallCandidates(
  view: WallSiteView,
  endpointZones: readonly EndpointZone[] = [],
): WallCandidate[] {
  const candidates: WallCandidate[] = [];
  // A lone block is the same wall whichever way it would have run on.
  const seenSingles = new Set<number>();
  const addCandidate = (direction: WallDirection, start: GridPoint, anchors: GridPoint[]) => {
    const singleKey = anchors.length === 1 ? anchors[0].y * view.cols + anchors[0].x : -1;
    if (anchors.length === 0 || seenSingles.has(singleKey)) {
      return;
    }
    if (singleKey >= 0) {
      seenSingles.add(singleKey);
    }
    candidates.push({ direction, start, anchors });
  };

  for (const direction of WALL_DIRECTIONS) {
    for (let y = 0; y + BLOCK_HEIGHT <= view.rows; y += 1) {
      for (let x = 0; x + BLOCK_WIDTH <= view.cols; x += 1) {
        const start = { x, y };
        if (!isAttached(view, direction, start)) {
          continue;
        }
        const { anchors, closing } = buildChain(view, direction, start);
        addCandidate(direction, start, anchors);
        if (closing !== null && anchors.length < MAZE_PLAN_MAX_CLOSING_WALL_BLOCKS) {
          addCandidate(direction, start, [...anchors, closing]);
        }
        // Only from a start that fits, so the line keeps the edge-gap rule at its root.
        const line =
          anchors.length > 0 || closing !== null ? buildEdgeLine(view, direction, start) : [];
        if (line.length > anchors.length) {
          addCandidate(direction, start, line);
        }
      }
    }
  }

  return candidates.filter(
    (wall) => !endpointZones.some((zone) => isZoneInEdgeStrip(wall, zone, view)),
  );
}

/**
 * Candidates on a line either side of `wall` that run the same way from about
 * the same place: what `wall` would be one cell over.
 */
export function findNeighborWalls(
  candidates: readonly WallCandidate[],
  wall: WallCandidate,
): WallCandidate[] {
  const line = getWallLine(wall);
  return candidates.filter(
    (other) =>
      other.direction === wall.direction &&
      Math.abs(getWallLine(other) - line) === 1 &&
      Math.max(Math.abs(other.start.x - wall.start.x), Math.abs(other.start.y - wall.start.y)) <=
        BLOCK_WIDTH,
  );
}
