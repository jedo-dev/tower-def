import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { getCellAt } from '../../../shared/lib/grid/getCellAt';
import type { Footprint, GridModel, GridPoint } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { createMazeEvaluator } from './maze-evaluation';

/**
 * The small creep route after a tower block is placed. `path` is null when the
 * block is not a legal build: it overlaps something, or it seals the small
 * (1x1) or the large (2x2) route from the entrance to the exit anchor.
 */
export type PathProbeResult = {
  path: readonly GridPosition[] | null;
  /** Octile cost of the small route (1 per straight, sqrt(2) per diagonal step). 0 when sealed. */
  cost: number;
  /** Extra small-route cost the block forces, snapped so equal detours compare equal. 0 when sealed. */
  gain: number;
};

export type PathProbe = {
  /** Small route with nothing extra blocked; empty when it is already sealed. */
  readonly basePath: readonly GridPosition[];
  /** Octile cost of `basePath`; 0 when it is already sealed. */
  readonly baseCost: number;
  /** Result of placing a block anchored at its top-left cell. Memoized per anchor and size. */
  probeFootprint(anchor: GridPoint, footprint?: Readonly<Footprint>): PathProbeResult;
  /** True for towers, non-walkable cells and anything outside the grid. */
  isBlocked(position: GridPosition): boolean;
  /** Route-search cells expanded so far, baseline included. Counts work, not time. */
  readonly expandedNodeCount: number;
};

const SEALED: PathProbeResult = Object.freeze({ path: null, cost: 0, gain: 0 });

/**
 * Repeated "what happens if a tower stands here" queries over one grid, for
 * the opponent's build planner. Validity and route gains come from the maze
 * evaluator (octile movement, no corner cutting, both size classes), so the
 * planner and the build rule agree on what seals the field.
 */
export function createPathProbe(grid: GridModel): PathProbe {
  const evaluator = createMazeEvaluator(grid, grid.entrance, grid.exit);
  const { smallRoute, smallRouteCost } = evaluator.routes;
  const baseCost = smallRouteCost ?? 0;
  const cache = new Map<string, PathProbeResult>();

  function probeFootprint(
    anchor: GridPoint,
    footprint: Readonly<Footprint> = TOWER_FOOTPRINT,
  ): PathProbeResult {
    const cacheKey = `${anchor.x}:${anchor.y}:${footprint.width}x${footprint.height}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const probe = evaluator.probePlacement(anchor, footprint);
    const result: PathProbeResult =
      probe.valid && probe.smallRoute
        ? { path: probe.smallRoute, cost: baseCost + probe.smallGain, gain: probe.smallGain }
        : SEALED;
    cache.set(cacheKey, result);
    return result;
  }

  return {
    basePath: smallRoute ?? [],
    baseCost,
    probeFootprint,
    isBlocked(position: GridPosition): boolean {
      const cell = getCellAt(grid, position.x, position.y);
      return !cell || !cell.isWalkable || cell.isOccupied;
    },
    get expandedNodeCount() {
      return evaluator.expandedNodeCount;
    },
  };
}
