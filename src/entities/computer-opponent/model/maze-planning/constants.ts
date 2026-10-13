import { CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS } from '../../../../shared/constants/footprint';
import { UnitSizeClass } from '../../../../shared/types/content-ids';
import { Difficulty } from '../../../difficulty/model/types';

/**
 * Lane a wall leaves open at its far end: exactly wide enough for the largest
 * creeps. Any narrower and large creeps are sealed out (an illegal build); any
 * wider and every wall costs towers that lengthen nothing.
 */
export const MAZE_PLAN_LANE_WIDTH = CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[UnitSizeClass.LARGE];

/** Route-cost differences below this are rounding noise, not a longer maze. */
export const MAZE_PLAN_COST_EPSILON = 1e-6;

/**
 * Wall lines screened on the cheap first pass: every other one. Neighbouring
 * lines score almost alike, and the finalists' neighbours are evaluated fully.
 */
export const MAZE_PLAN_SCREENING_LINE_STRIDE = 2;

/**
 * Unbuilt plan blocks, in plan order, weighed against each other for the next
 * build. Wide enough to reach past a wall's dead start to the block that pays
 * now, narrow enough to keep a build decision cheap.
 */
export const MAZE_PLAN_BUILD_WINDOW = 8;

/**
 * Rounds of income the planner budgets a maze for. Long enough that it plans
 * whole walls instead of single blocks, short enough that the plan still fits
 * the board it will actually be built on.
 */
export const MAZE_PLAN_HORIZON_ROUNDS = 6;

/** How hard the planner searches; the difficulty dial of maze quality. */
export type MazePlanSearchEffort = {
  /**
   * Screened walls promoted to a full (small and large route) evaluation per
   * added wall, each with the lines either side of it. More finalists catch
   * walls the small-route screen underrates.
   */
  finalistCount: number;
  /**
   * Route-search cells one planning call may expand before it settles for the
   * walls found so far. Counts work, not time, so the result is deterministic
   * and one build decision stays bounded.
   */
  maxExpandedNodes: number;
};

export const MAZE_PLAN_SEARCH_EFFORT_BY_DIFFICULTY: Readonly<
  Record<Difficulty, Readonly<MazePlanSearchEffort>>
> = {
  [Difficulty.EASY]: { finalistCount: 1, maxExpandedNodes: 30_000 },
  [Difficulty.NORMAL]: { finalistCount: 2, maxExpandedNodes: 35_000 },
  [Difficulty.HARD]: { finalistCount: 3, maxExpandedNodes: 40_000 },
  [Difficulty.NIGHTMARE]: { finalistCount: 4, maxExpandedNodes: 50_000 },
};
