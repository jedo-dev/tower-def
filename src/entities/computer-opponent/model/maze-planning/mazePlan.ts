import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { getCellAt } from '../../../../shared/lib/grid/getCellAt';
import type { GridModel, GridPoint } from '../../../../shared/types/grid';
import type { MazePlanSearchEffort } from './constants';
import { createMazePlanningBoard, type MazePlanningBoard } from './mazePlanningBoard';
import { searchMazeWalls } from './searchMazeWalls';
import { createWallCandidates } from './wallCandidates';

/**
 * The maze the computer opponent is working towards, kept across rounds so it
 * keeps filling in the same walls instead of starting a new maze every time
 * it earns gold. Plain data: safe to store, compare and serialize.
 */
export type MazePlan = {
  /** The board the plan was made for (size and endpoints); another board means a new plan. */
  readonly boardKey: string;
  /** Planned tower blocks (top-left anchors) in build priority. Built ones stay listed. */
  readonly anchors: readonly GridPoint[];
  /** True once a search found no wall worth adding; cleared by a fresh plan. */
  readonly isComplete: boolean;
};

export type MazePlanUpdateReason = 'kept' | 'created' | 'extended' | 'replanned';

export type MazePlanUpdate = {
  plan: MazePlan;
  reason: MazePlanUpdateReason;
  /** Planned blocks not built yet, in priority order; all placeable together. */
  unbuilt: GridPoint[];
  /** Route-search cells the update expanded. Counts work, not time. */
  expandedNodeCount: number;
};

export type MazePlanUpdateInput = {
  /** The opponent's battlefield; its towers are marked occupied. */
  grid: GridModel;
  plan: MazePlan | null | undefined;
  /** Blocks the opponent expects to afford over the planning horizon. */
  towerBudget: number;
  effort: Readonly<MazePlanSearchEffort>;
};

export function getMazeBoardKey(grid: GridModel): string {
  const { cols, rows, entrance, exit } = grid;
  return `${cols}x${rows}:${entrance.x},${entrance.y}->${exit.x},${exit.y}`;
}

/** Every cell of the block is taken: the planned tower (or one exactly like it) stands there. */
function isBuiltAt(grid: GridModel, anchor: GridPoint): boolean {
  for (let y = anchor.y; y < anchor.y + TOWER_FOOTPRINT.height; y += 1) {
    for (let x = anchor.x; x < anchor.x + TOWER_FOOTPRINT.width; x += 1) {
      if (!getCellAt(grid, x, y)?.isOccupied) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Places every unbuilt planned block on the board. Returns false (with the
 * board left clean) when one no longer fits or together they seal a route:
 * the board drifted from the plan and it has to be made again.
 */
function placeUnbuilt(board: MazePlanningBoard, unbuilt: readonly GridPoint[]): boolean {
  const placed: GridPoint[] = [];
  let isValid = true;
  for (const anchor of unbuilt) {
    if (!board.canPlace(anchor)) {
      isValid = false;
      break;
    }
    board.place(anchor);
    placed.push(anchor);
  }
  if (isValid && board.evaluate() !== null) {
    return true;
  }
  for (let index = placed.length - 1; index >= 0; index -= 1) {
    board.remove(placed[index]);
  }
  return false;
}

function search(board: MazePlanningBoard, input: MazePlanUpdateInput, budget: number) {
  const { entrance, exit, endpointZoneFootprint } = input.grid;
  const endpointZones = [entrance, exit].map((anchor) => ({
    anchor,
    footprint: endpointZoneFootprint,
  }));
  return searchMazeWalls({
    board,
    candidates: createWallCandidates(board.cols, board.rows, endpointZones),
    towerBudget: budget,
    effort: input.effort,
  });
}

/**
 * Keeps, extends or remakes the opponent's maze plan for the current board.
 * The plan is kept while every unbuilt block still fits and the unbuilt part
 * covers the budget; it is extended (new walls on top of the planned ones)
 * when the budget outgrows it, and made again from scratch when the board no
 * longer matches it. Deterministic for the same inputs.
 */
export function updateMazePlan(input: MazePlanUpdateInput): MazePlanUpdate {
  const { grid, plan, towerBudget } = input;
  const boardKey = getMazeBoardKey(grid);
  const board = createMazePlanningBoard(grid);

  const isSameBoard = plan?.boardKey === boardKey;
  const unbuilt = isSameBoard ? plan.anchors.filter((anchor) => !isBuiltAt(grid, anchor)) : [];
  const isPlanUsable = isSameBoard && placeUnbuilt(board, unbuilt);

  if (!plan || !isPlanUsable) {
    const { anchors, isExhausted } = search(board, input, towerBudget);
    return {
      plan: { boardKey, anchors, isComplete: isExhausted && anchors.length === 0 },
      reason: plan ? 'replanned' : 'created',
      unbuilt: [...anchors],
      expandedNodeCount: board.expandedNodeCount,
    };
  }

  if (unbuilt.length >= towerBudget || plan.isComplete) {
    return { plan, reason: 'kept', unbuilt, expandedNodeCount: board.expandedNodeCount };
  }

  const { anchors: added, isExhausted } = search(board, input, towerBudget - unbuilt.length);
  return {
    plan: {
      boardKey,
      anchors: [...plan.anchors, ...added],
      isComplete: isExhausted && added.length === 0,
    },
    reason: added.length > 0 ? 'extended' : 'kept',
    unbuilt: [...unbuilt, ...added],
    expandedNodeCount: board.expandedNodeCount,
  };
}
