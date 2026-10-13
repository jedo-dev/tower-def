/** Step costs for 8-direction (octile) movement on the grid. */
export const OCTILE_STEP_COST = {
  orthogonal: 1,
  diagonal: Math.SQRT2,
} as const;

/**
 * Neighbour order used by the octile pathfinder, as parallel x/y offset lists.
 * Fixed so equal-cost paths always resolve the same way: east, west, south,
 * north (the BFS order), then the four diagonals.
 */
export const OCTILE_NEIGHBOR_DX: readonly number[] = [1, -1, 0, 0, 1, -1, 1, -1];
export const OCTILE_NEIGHBOR_DY: readonly number[] = [0, 0, 1, -1, 1, 1, -1, -1];

/**
 * Open-set priorities are snapped to multiples of 1 / scale so floating-point
 * noise from summed diagonal costs cannot break ties between equal paths.
 */
export const OCTILE_PRIORITY_KEY_SCALE = 1e6;

/** Clearance values are stored in a Uint8Array, so larger squares are capped. */
export const MAX_CLEARANCE = 255;
