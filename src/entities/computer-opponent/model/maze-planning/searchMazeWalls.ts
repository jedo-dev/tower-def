import type { GridPoint } from '../../../../shared/types/grid';
import {
  MAZE_PLAN_COST_EPSILON,
  MAZE_PLAN_SCREENING_LINE_STRIDE,
  type MazePlanSearchEffort,
} from './constants';
import type { MazePlanningBoard } from './mazePlanningBoard';
import { findNeighborWalls, type WallCandidate } from './wallCandidates';

export type MazeWallSearchInput = {
  /** Board to plan on; whatever already stands (or is already planned) is placed on it. */
  board: MazePlanningBoard;
  candidates: readonly WallCandidate[];
  /** Tower blocks to plan for. The last wall may run past it; build order absorbs that. */
  towerBudget: number;
  effort: Readonly<MazePlanSearchEffort>;
};

export type MazeWallSearchResult = {
  /** Planned blocks in build-priority order. */
  anchors: GridPoint[];
  /** True when no wall was left that lengthens the routes (not merely out of effort). */
  isExhausted: boolean;
};

/** Walls chosen so far and the weighted route cost with them standing. */
type WallLayout = {
  /** Blocks added on top of the board, wall by wall, each wall from its edge outwards. */
  anchors: readonly GridPoint[];
  cost: number;
};

type ScreenedWall = { wall: WallCandidate; smallGainPerBlock: number };

function placeAll(board: MazePlanningBoard, anchors: readonly GridPoint[]): void {
  for (const anchor of anchors) {
    board.place(anchor);
  }
}

function removeAll(board: MazePlanningBoard, anchors: readonly GridPoint[]): void {
  for (let index = anchors.length - 1; index >= 0; index -= 1) {
    board.remove(anchors[index]);
  }
}

/** Blocks of `wall` that fit on the board right now; placed and returned. */
function placeWall(board: MazePlanningBoard, wall: WallCandidate): GridPoint[] {
  const placed: GridPoint[] = [];
  for (const anchor of wall.anchors) {
    if (board.canPlace(anchor)) {
      board.place(anchor);
      placed.push(anchor);
    }
  }
  return placed;
}

/** Route cost bought per block over the whole layout. */
function efficiency(layout: WallLayout, baseCost: number): number {
  return layout.anchors.length === 0 ? 0 : (layout.cost - baseCost) / layout.anchors.length;
}

/**
 * Cheap first pass, small route only, over every other wall line. Lines next
 * to each other score almost alike, so the skipped ones are recovered by
 * `pickFinalists` (which also catches lane-width parity a lone small route
 * cannot see).
 */
function screenWalls(input: MazeWallSearchInput, isOverBudget: () => boolean): ScreenedWall[] {
  const { board, candidates } = input;
  const baseSmall = board.evaluateSmall();
  const baseRoutes = board.saveRoutes();
  const screened: ScreenedWall[] = [];

  for (const wall of candidates) {
    if (wall.line % MAZE_PLAN_SCREENING_LINE_STRIDE !== 0) {
      continue;
    }
    if (isOverBudget()) {
      break;
    }
    const placed = placeWall(board, wall);
    const small = placed.length > 0 ? board.evaluateSmall() : Infinity;
    removeAll(board, placed);
    board.restoreRoutes(baseRoutes);
    if (Number.isFinite(small) && small > baseSmall + MAZE_PLAN_COST_EPSILON) {
      screened.push({ wall, smallGainPerBlock: (small - baseSmall) / placed.length });
    }
  }

  return screened;
}

/** Best screened walls and the lines either side of them, in candidate order. */
function pickFinalists(input: MazeWallSearchInput, screened: ScreenedWall[]): WallCandidate[] {
  const best = [...screened]
    .sort((left, right) => right.smallGainPerBlock - left.smallGainPerBlock)
    .slice(0, Math.max(1, input.effort.finalistCount))
    .map((entry) => entry.wall);
  const picked = new Set<WallCandidate>();
  for (const wall of best) {
    picked.add(wall);
    for (const neighbor of findNeighborWalls(input.candidates, wall)) {
      picked.add(neighbor);
    }
  }
  return input.candidates.filter((wall) => picked.has(wall));
}

/**
 * The layout plus its most efficient next wall: one that keeps both routes
 * open and makes them longer. Null when no wall qualifies, or once the search
 * has spent its expansion allowance before finding one.
 */
function extendLayout(
  input: MazeWallSearchInput,
  layout: WallLayout,
  baseCost: number,
  isOverBudget: () => boolean,
): WallLayout | null {
  const { board } = input;
  placeAll(board, layout.anchors);
  const finalists = pickFinalists(input, screenWalls(input, isOverBudget));
  const baseRoutes = board.saveRoutes();
  let best: WallLayout | null = null;

  for (const wall of finalists) {
    if (isOverBudget()) {
      break;
    }
    const placed = placeWall(board, wall);
    const costs = placed.length > 0 ? board.evaluate() : null;
    removeAll(board, placed);
    board.restoreRoutes(baseRoutes);
    if (costs === null || costs.weighted <= layout.cost + MAZE_PLAN_COST_EPSILON) {
      continue;
    }
    const child: WallLayout = { anchors: [...layout.anchors, ...placed], cost: costs.weighted };
    // Strictly better only, so candidate order breaks ties deterministically.
    if (best === null || efficiency(child, baseCost) > efficiency(best, baseCost)) {
      best = child;
    }
  }

  removeAll(board, layout.anchors);
  return best;
}

/**
 * Drops blocks whose removal does not shorten either route: wall ends past
 * anything the creeps would ever reach, or blocks a later wall made redundant.
 */
function pruneIdleBlocks(board: MazePlanningBoard, anchors: readonly GridPoint[]): GridPoint[] {
  placeAll(board, anchors);
  const kept = [...anchors];
  let fullCost = board.evaluate()?.weighted ?? 0;

  for (let index = kept.length - 1; index >= 0; index -= 1) {
    const anchor = kept[index];
    board.remove(anchor);
    const without = board.evaluate();
    if (without !== null && without.weighted >= fullCost - MAZE_PLAN_COST_EPSILON) {
      kept.splice(index, 1);
      fullCost = without.weighted;
      continue;
    }
    board.place(anchor);
  }

  removeAll(board, kept);
  return kept;
}

/**
 * Plans whole walls instead of single blocks. A lone block rarely lengthens
 * the route until the wall it belongs to closes against an edge, so a greedy
 * block-by-block search stalls; scoring complete edge-attached walls sees the
 * payoff up front. Walls are added one at a time, each the one that keeps the
 * layout's route cost per block highest, until the tower budget is reached;
 * then blocks that do nothing are pruned and the rest returned in
 * build-priority order (wall by wall, each from its edge outwards).
 *
 * Wall-level greedy on purpose: the plan is built a few blocks per round, so
 * each next wall should pay on its own. A wider beam that optimizes the
 * finished layout picked walls that only paid once the whole plan stood.
 * Deterministic: candidate order breaks every tie, and the effort cap counts
 * expanded cells, not time.
 */
export function searchMazeWalls(input: MazeWallSearchInput): MazeWallSearchResult {
  const { board, towerBudget, effort } = input;
  const baseCosts = board.evaluate();
  if (baseCosts === null || towerBudget <= 0) {
    return { anchors: [], isExhausted: baseCosts === null };
  }

  const startExpanded = board.expandedNodeCount;
  const isOverBudget = () => board.expandedNodeCount - startExpanded >= effort.maxExpandedNodes;
  let layout: WallLayout = { anchors: [], cost: baseCosts.weighted };
  let isExhausted = false;

  while (layout.anchors.length < towerBudget && !isOverBudget()) {
    const next = extendLayout(input, layout, baseCosts.weighted, isOverBudget);
    if (next === null) {
      // Cut short by the effort cap is not the same as nothing left to add.
      isExhausted = !isOverBudget();
      break;
    }
    layout = next;
  }

  const anchors = layout.anchors.length === 0 ? [] : pruneIdleBlocks(board, layout.anchors);
  return { anchors, isExhausted };
}
