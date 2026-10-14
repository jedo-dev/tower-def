import type { GridPoint } from '../../../../shared/types/grid';
import { MAZE_PLAN_COST_EPSILON, MAZE_PLAN_EXPOSURE_RANGE } from './constants';
import type { MazePlanningBoard } from './mazePlanningBoard';
import type { WallCandidate } from './wallCandidates';

// Putting a planned layout of walls on the planning board and taking it off.

/** Walls chosen so far, with the weighted route cost and route exposure they leave. */
export type WallLayout = {
  /** Blocks added on top of the board, wall by wall, each wall from its edge outwards. */
  anchors: readonly GridPoint[];
  cost: number;
  /** Small-route samples in reach of every block on the board, summed over the blocks. */
  exposure: number;
};

export function placeAll(board: MazePlanningBoard, anchors: readonly GridPoint[]): void {
  for (const anchor of anchors) {
    board.place(anchor);
  }
}

export function removeAll(board: MazePlanningBoard, anchors: readonly GridPoint[]): void {
  for (let index = anchors.length - 1; index >= 0; index -= 1) {
    board.remove(anchors[index]);
  }
}

/** Blocks of `wall` that fit on the board right now; placed and returned. */
export function placeWall(board: MazePlanningBoard, wall: WallCandidate): GridPoint[] {
  const placed: GridPoint[] = [];
  for (const anchor of wall.anchors) {
    if (board.canPlace(anchor)) {
      board.place(anchor);
      placed.push(anchor);
    }
  }
  return placed;
}

export function measureExposure(board: MazePlanningBoard, anchors: readonly GridPoint[]): number {
  placeAll(board, anchors);
  const exposure = board.evaluateExposure(MAZE_PLAN_EXPOSURE_RANGE);
  removeAll(board, anchors);
  return exposure;
}

/**
 * Drops blocks whose removal does not shorten either route: wall ends past
 * anything the creeps would ever reach, or blocks a later wall made redundant.
 */
export function pruneIdleBlocks(
  board: MazePlanningBoard,
  anchors: readonly GridPoint[],
): GridPoint[] {
  // Measured before the plan goes up, so lifting plan blocks keeps the fields valid.
  board.pinRouteHeuristics();
  placeAll(board, anchors);
  const kept = [...anchors];
  let full = board.evaluate();

  for (let index = kept.length - 1; index >= 0 && full !== null; index -= 1) {
    const anchor = kept[index];
    board.remove(anchor);
    // Lifting a block can only shorten a route; the small one usually tells.
    const isSmallKept = board.evaluateSmall() >= full.small - MAZE_PLAN_COST_EPSILON;
    const without = isSmallKept ? board.evaluate() : null;
    if (without !== null && without.large >= full.large - MAZE_PLAN_COST_EPSILON) {
      kept.splice(index, 1);
      full = without;
      continue;
    }
    board.place(anchor);
  }

  removeAll(board, kept);
  return kept;
}
