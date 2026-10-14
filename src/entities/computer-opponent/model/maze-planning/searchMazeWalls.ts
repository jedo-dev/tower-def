import type { GridPoint } from '../../../../shared/types/grid';
import { MAZE_ROUTE_GAIN_WEIGHTS } from '../maze-evaluation/constants';
import {
  MAZE_PLAN_COST_EPSILON,
  MAZE_PLAN_EXPOSURE_PER_ROUTE_CELL_CAP,
  MAZE_PLAN_EXPOSURE_RANGE,
  MAZE_PLAN_MIN_GAIN_PER_BLOCK,
  MAZE_PLAN_ROUTE_CELL_EXPOSURE,
  type MazePlanSearchEffort,
} from './constants';
import type { MazePlanningBoard, PlanningRouteSnapshot } from './mazePlanningBoard';
import { rankWallsByDetour } from './wallDetourEstimate';
import {
  measureExposure,
  placeAll,
  placeWall,
  pruneIdleBlocks,
  removeAll,
  type WallLayout,
} from './wallLayout';
import {
  createWallCandidates,
  findNeighborWalls,
  type EndpointZone,
  type WallCandidate,
} from './wallCandidates';

export type MazeWallSearchInput = {
  /** Board to plan on; whatever already stands (or is already planned) is placed on it. */
  board: MazePlanningBoard;
  /** Entrance and exit zones; walls squeezing one against an edge are skipped. */
  endpointZones: readonly EndpointZone[];
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

type ScreenedWall = { wall: WallCandidate; valuePerBlock: number };

/**
 * The small route stands in for both on the cheap screen: weighted route cost
 * is both routes combined, and they mostly lengthen together.
 */
const SCREEN_COST_SCALE = MAZE_ROUTE_GAIN_WEIGHTS.small + MAZE_ROUTE_GAIN_WEIGHTS.large;

/**
 * What `blocks` new blocks buy: the route exposure they add (route the blocks
 * get to shoot at) plus the route cost (route future towers will), per block.
 * Route cost alone favours walls whose route runs past one face of the wall
 * and then away from it, so the towers that wall is made of barely fire. The
 * exposure a wall may claim is capped per cell of route it adds, or a wall
 * that only nudges the route to run alongside it (lining it, no maze) wins.
 */
function valuePerBlock(exposureGain: number, costGain: number, blocks: number): number {
  if (blocks === 0) {
    return 0;
  }
  const claimedExposure = Math.min(
    exposureGain,
    MAZE_PLAN_EXPOSURE_PER_ROUTE_CELL_CAP * Math.max(0, costGain),
  );
  return (claimedExposure + MAZE_PLAN_ROUTE_CELL_EXPOSURE * costGain) / blocks;
}

/** Value bought per block over the whole layout. */
function efficiency(layout: WallLayout, base: WallLayout): number {
  return valuePerBlock(
    layout.exposure - base.exposure,
    layout.cost - base.cost,
    layout.anchors.length,
  );
}

/** Small-route value of each wall that lengthens the route, in the order given. */
function screenWalls(
  board: MazePlanningBoard,
  walls: readonly WallCandidate[],
  isOverBudget: () => boolean,
): ScreenedWall[] {
  const baseSmall = board.evaluateSmall();
  const baseExposure = board.evaluateExposure(MAZE_PLAN_EXPOSURE_RANGE);
  const baseRoutes = board.saveRoutes();
  const screened: ScreenedWall[] = [];

  for (const wall of walls) {
    if (isOverBudget()) {
      break;
    }
    const placed = placeWall(board, wall);
    const small = placed.length > 0 ? board.evaluateSmall() : Infinity;
    const isLonger = Number.isFinite(small) && small > baseSmall + MAZE_PLAN_COST_EPSILON;
    const exposure = isLonger ? board.evaluateExposure(MAZE_PLAN_EXPOSURE_RANGE) : 0;
    removeAll(board, placed);
    board.restoreRoutes(baseRoutes);
    if (isLonger) {
      const costGain = (small - baseSmall) * SCREEN_COST_SCALE;
      screened.push({
        wall,
        valuePerBlock: valuePerBlock(exposure - baseExposure, costGain, placed.length),
      });
    }
  }

  return screened;
}

/**
 * `wall` on top of the layout (already on the board), evaluated on both
 * routes: the grown layout, or null when the wall seals a route or lengthens
 * them by less than `MAZE_PLAN_MIN_GAIN_PER_BLOCK` per block. Leaves the
 * board and its cached routes as it found them.
 */
function evaluateWall(
  board: MazePlanningBoard,
  wall: WallCandidate,
  layout: WallLayout,
  baseRoutes: PlanningRouteSnapshot,
): WallLayout | null {
  const placed = placeWall(board, wall);
  const costs = placed.length > 0 ? board.evaluate() : null;
  const exposure = costs === null ? 0 : board.evaluateExposure(MAZE_PLAN_EXPOSURE_RANGE);
  removeAll(board, placed);
  board.restoreRoutes(baseRoutes);
  const minGain = Math.max(MAZE_PLAN_COST_EPSILON, MAZE_PLAN_MIN_GAIN_PER_BLOCK * placed.length);
  if (costs === null || costs.weighted - layout.cost < minGain) {
    return null;
  }
  return { anchors: [...layout.anchors, ...placed], cost: costs.weighted, exposure };
}

/**
 * The best wall among the finalists: screened walls best first, each with the
 * lines either side of it, evaluated on both routes until `finalistCount` of
 * those groups held a wall that qualifies. A wall that seals the large route
 * (which the small-route screen cannot see) does not use up a finalist slot.
 */
function pickBestWall(
  input: MazeWallSearchInput,
  candidates: readonly WallCandidate[],
  screened: readonly ScreenedWall[],
  layout: WallLayout,
  base: WallLayout,
  isOverBudget: () => boolean,
): WallLayout | null {
  const { board } = input;
  const order = new Map(candidates.map((wall, index) => [wall, index]));
  const byIndex = (left: WallCandidate, right: WallCandidate) =>
    (order.get(left) ?? 0) - (order.get(right) ?? 0);
  const leaders = [...screened]
    .sort((left, right) => right.valuePerBlock - left.valuePerBlock)
    .map((entry) => entry.wall);
  const evaluated = new Set<WallCandidate>();
  const baseRoutes = board.saveRoutes();
  const slots = Math.max(1, input.effort.finalistCount);
  let best: WallLayout | null = null;
  let qualifiedGroups = 0;

  for (const leader of leaders) {
    if (qualifiedGroups >= slots || isOverBudget()) {
      break;
    }
    const group = [leader, ...findNeighborWalls(candidates, leader)]
      .filter((wall) => !evaluated.has(wall))
      .sort(byIndex);
    let isGroupQualified = false;
    for (const wall of group) {
      evaluated.add(wall);
      const child = evaluateWall(board, wall, layout, baseRoutes);
      isGroupQualified ||= child !== null;
      // Strictly better only, so evaluation order breaks ties deterministically.
      if (child !== null && (best === null || efficiency(child, base) > efficiency(best, base))) {
        best = child;
      }
    }
    qualifiedGroups += isGroupQualified ? 1 : 0;
  }

  return best;
}

/**
 * The layout plus its most efficient next wall: one that keeps both routes
 * open and makes them longer. Null when no wall qualifies, or once the search
 * has spent its expansion allowance before finding one.
 */
function extendLayout(
  input: MazeWallSearchInput,
  layout: WallLayout,
  base: WallLayout,
  isOverBudget: () => boolean,
): WallLayout | null {
  const { board } = input;
  placeAll(board, layout.anchors);
  board.pinRouteHeuristics();
  const candidates = createWallCandidates(board, input.endpointZones);
  const ranked = rankWallsByDetour(candidates, board.smallRoute(), board.cols, board.rows);
  const pageSize = Math.max(1, input.effort.screenedWallCount);
  let best: WallLayout | null = null;
  // Most promising first; the next page only when none on this one qualified,
  // so a plan is called complete only once every crossing wall has been tried.
  for (let start = 0; best === null && start < ranked.length && !isOverBudget();) {
    const page = ranked.slice(start, start + pageSize);
    start += pageSize;
    const screened = screenWalls(board, page, isOverBudget);
    best = pickBestWall(input, candidates, screened, layout, base, isOverBudget);
  }
  removeAll(board, layout.anchors);
  return best;
}

/**
 * Plans whole walls instead of single blocks. A lone block rarely lengthens
 * the route until the wall it belongs to closes against something, so a
 * greedy block-by-block search stalls; scoring complete walls sees the payoff
 * up front. Candidates are straight and diagonal walls from the edges and
 * from the walls already planned (see `createWallCandidates`), so a short
 * wall can branch off a long one instead of crossing the whole board again.
 * Walls are added one at a time, each the one that keeps the layout's value
 * per block highest (route exposure plus route cost, see `valuePerBlock`),
 * until the tower budget is reached; then blocks that do nothing for the
 * route cost are pruned and the rest returned in build-priority order (wall
 * by wall, each from its attached end outwards). Only walls that lengthen the
 * route by `MAZE_PLAN_MIN_GAIN_PER_BLOCK` per block qualify, so exposure picks
 * between mazes and never buys a row of towers that merely lines the route.
 *
 * Wall-level greedy on purpose: the plan is built a few blocks per round, so
 * each next wall should pay on its own. A wider beam that optimizes the
 * finished layout picked walls that only paid once the whole plan stood, and
 * so did scoring a wall together with the parallel wall that would turn it
 * into a serpentine.
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
  const baseExposure = board.evaluateExposure(MAZE_PLAN_EXPOSURE_RANGE);
  const base: WallLayout = { anchors: [], cost: baseCosts.weighted, exposure: baseExposure };
  let layout = base;

  for (;;) {
    let isExhausted = false;
    while (layout.anchors.length < towerBudget && !isOverBudget()) {
      const next = extendLayout(input, layout, base, isOverBudget);
      if (next === null) {
        // Cut short by the effort cap is not the same as nothing left to add.
        isExhausted = !isOverBudget();
        break;
      }
      layout = next;
    }

    const anchors = layout.anchors.length === 0 ? [] : pruneIdleBlocks(board, layout.anchors);
    if (!isExhausted || anchors.length === layout.anchors.length) {
      return { anchors, isExhausted };
    }
    // Pruning freed cells a wall may now use: keep looking before calling it exhausted.
    layout = { anchors, cost: layout.cost, exposure: measureExposure(board, anchors) };
  }
}
