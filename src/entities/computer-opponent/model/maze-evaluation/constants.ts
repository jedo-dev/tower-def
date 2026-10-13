import { CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS } from '../../../../shared/constants/footprint';
import { UnitSizeClass } from '../../../../shared/types/content-ids';
import type { MazeSizeClassWeights } from './types';

/** Footprint edge (cells) of the creatures that walk the small route (small and medium). */
export const SMALL_ROUTE_AGENT_SIZE = CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[UnitSizeClass.SMALL];

/** Footprint edge (cells) of the creatures that walk the large route. */
export const LARGE_ROUTE_AGENT_SIZE = CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[UnitSizeClass.LARGE];

/**
 * Clearance is only ever compared against creep footprints, so it is capped
 * at the largest one. A capped value depends only on the cap x cap square at
 * its cell, which keeps a tower placement's effect on clearance local.
 */
export const MAZE_CLEARANCE_CAP = Math.max(SMALL_ROUTE_AGENT_SIZE, LARGE_ROUTE_AGENT_SIZE);

/** How much one cell of extra route length is worth, per route. */
export const MAZE_ROUTE_GAIN_WEIGHTS: Readonly<MazeSizeClassWeights> = {
  small: 1,
  large: 1,
};

/** How much one covered route sample is worth, per route, in the combined coverage score. */
export const MAZE_COVERAGE_WEIGHTS: Readonly<MazeSizeClassWeights> = {
  small: 1,
  large: 1,
};

/**
 * Route gains are differences of sums of sqrt(2) steps; they are snapped to
 * multiples of 1 / scale so equal-length detours compare as exactly equal.
 */
export const MAZE_ROUTE_GAIN_SNAP_SCALE = 1e6;
