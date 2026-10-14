import type { GridModel, GridPoint } from '../../../../shared/types/grid';
import { MAZE_PLAN_BUILD_WINDOW } from './constants';
import { createMazePlanningBoard, type MazePlanningBoard } from './mazePlanningBoard';

export type PlanBuildSelectionInput = {
  /** The opponent's battlefield as it stands; its towers are marked occupied. */
  grid: GridModel;
  /** Unbuilt planned blocks in plan priority order. */
  candidates: readonly GridPoint[];
  maxBuilds: number;
};

export type PlanBuildSelection = {
  /** Blocks to build this round, in build order. Each keeps both routes open. */
  anchors: GridPoint[];
  /** Weighted route cost each build adds on its own, aligned with `anchors`. */
  gains: number[];
  /** Route-search cells expanded. Counts work, not time. */
  expandedNodeCount: number;
};

type BuildPick = { index: number; gain: number };

/** The next few unbuilt blocks in plan order with their small-route gain. */
function screenWindow(
  board: MazePlanningBoard,
  candidates: readonly GridPoint[],
  taken: ReadonlySet<number>,
): BuildPick[] {
  const baseRoutes = board.saveRoutes();
  const baseSmall = board.evaluateSmall();
  const screened: BuildPick[] = [];

  for (let index = 0; index < candidates.length; index += 1) {
    if (screened.length >= MAZE_PLAN_BUILD_WINDOW) {
      break;
    }
    const anchor = candidates[index];
    if (taken.has(index) || !board.canPlace(anchor)) {
      continue;
    }
    board.place(anchor);
    const small = board.evaluateSmall();
    board.remove(anchor);
    board.restoreRoutes(baseRoutes);
    if (Number.isFinite(small)) {
      screened.push({ index, gain: small - baseSmall });
    }
  }

  // Stable: equal gains keep plan order, which builds each wall from its edge outwards.
  return screened.sort((left, right) => right.gain - left.gain);
}

/** Best screened block that also keeps the large route open, with its full weighted gain. */
function pickNext(
  board: MazePlanningBoard,
  candidates: readonly GridPoint[],
  taken: Set<number>,
  currentCost: number,
): BuildPick | null {
  const baseRoutes = board.saveRoutes();

  for (const screened of screenWindow(board, candidates, taken)) {
    board.place(candidates[screened.index]);
    const costs = board.evaluate();
    board.remove(candidates[screened.index]);
    board.restoreRoutes(baseRoutes);
    if (costs !== null) {
      return { index: screened.index, gain: Math.max(0, costs.weighted - currentCost) };
    }
    // Sealing today; it may fit once the walls around it have moved the routes.
    taken.add(screened.index);
  }

  return null;
}

/**
 * Which planned blocks to build now, and in what order: among the next few
 * blocks of the plan, each pick is the one that lengthens the routes most
 * right away, so a half-built maze already pays; when none does yet (a wall
 * still short of the route), plan order decides. Gains are screened on the
 * small route and confirmed on both; blocks that would seal a route today
 * are skipped.
 */
export function selectPlanBuilds(input: PlanBuildSelectionInput): PlanBuildSelection {
  const { grid, candidates, maxBuilds } = input;
  const board = createMazePlanningBoard(grid);
  // Blocks only ever go up on this board (probes come down again), so the fields stay valid.
  board.pinRouteHeuristics();
  const anchors: GridPoint[] = [];
  const gains: number[] = [];
  const taken = new Set<number>();
  let currentCost = board.evaluate()?.weighted ?? null;

  while (currentCost !== null && anchors.length < maxBuilds) {
    const next = pickNext(board, candidates, taken, currentCost);
    if (next === null) {
      break;
    }
    const anchor = candidates[next.index];
    taken.add(next.index);
    board.place(anchor);
    anchors.push(anchor);
    gains.push(next.gain);
    currentCost += next.gain;
    if (anchors.length < maxBuilds) {
      // Each build reroutes the creeps; probes for the next one search far less on fresh fields.
      board.pinRouteHeuristics();
    }
  }

  return { anchors, gains, expandedNodeCount: board.expandedNodeCount };
}
