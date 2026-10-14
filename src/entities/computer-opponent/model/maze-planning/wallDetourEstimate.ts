import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import type { GridPoint } from '../../../../shared/types/grid';
import type { WallCandidate } from './wallCandidates';

/** A wall with its estimated detour per block (see `rankWallsByDetour`). */
type EstimatedWall = { wall: WallCandidate; index: number; tail: number; score: number };

function createRouteMask(route: readonly GridPoint[], cols: number, rows: number): Uint8Array {
  const mask = new Uint8Array(cols * rows);
  for (const cell of route) {
    mask[cell.y * cols + cell.x] = 1;
  }
  return mask;
}

function coversRoute(anchor: GridPoint, mask: Uint8Array, cols: number, rows: number): boolean {
  for (let y = anchor.y; y < Math.min(rows, anchor.y + TOWER_FOOTPRINT.height); y += 1) {
    for (let x = anchor.x; x < Math.min(cols, anchor.x + TOWER_FOOTPRINT.width); x += 1) {
      if (mask[y * cols + x] === 1) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Walls most likely to lengthen the route per block, best first; walls that
 * do not cross the current route are left out.
 *
 * A wall is closed at its attached end, so a route it crosses has to walk
 * round its free tip: the blocks from the crossing to the tip (the tail) set
 * the detour, the blocks behind the crossing only seal it. The estimate is
 * the tail times the tail's share of the wall, a stand-in for route per gold
 * that does not let a lone block on the route (which creeps just sidestep)
 * outrank a wall they have to walk the length of. Ties go to the longer tail,
 * then to candidate order. Costs no route search, so the planner can rank
 * every candidate and search only the promising ones.
 */
export function rankWallsByDetour(
  candidates: readonly WallCandidate[],
  route: readonly GridPoint[],
  cols: number,
  rows: number,
): WallCandidate[] {
  const mask = createRouteMask(route, cols, rows);
  const estimated: EstimatedWall[] = [];

  candidates.forEach((wall, index) => {
    const crossing = wall.anchors.findIndex((anchor) => coversRoute(anchor, mask, cols, rows));
    if (crossing >= 0) {
      const tail = wall.anchors.length - crossing;
      estimated.push({ wall, index, tail, score: (tail * tail) / wall.anchors.length });
    }
  });

  return estimated
    .sort(
      (left, right) =>
        right.score - left.score || right.tail - left.tail || left.index - right.index,
    )
    .map((entry) => entry.wall);
}
