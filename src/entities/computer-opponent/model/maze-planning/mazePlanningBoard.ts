import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { getCellAt } from '../../../../shared/lib/grid/getCellAt';
import type { GridModel, GridPoint } from '../../../../shared/types/grid';
import {
  LARGE_ROUTE_AGENT_SIZE,
  MAZE_CLEARANCE_CAP,
  MAZE_ROUTE_GAIN_WEIGHTS,
  SMALL_ROUTE_AGENT_SIZE,
} from '../maze-evaluation/constants';
import {
  doesRectangleTouchMask,
  fillFreeCells,
  markRouteSweep,
  recomputeCappedClearance,
} from '../maze-evaluation/mazeClearance';
import {
  createMazeRouteSearchBuffers,
  readMazeRoute,
  searchMazeRouteCost,
  type MazeRouteSearchBuffers,
} from '../maze-evaluation/mazeRouteSearch';
import { collectStandingBlocks, countRouteExposure } from './routeExposure';

/** Both creep routes on the planning board; only defined while both exist. */
export type PlanningRouteCosts = {
  small: number;
  large: number;
  /** `small` and `large` combined with the maze route weights. */
  weighted: number;
};

/**
 * Mutable scratch copy of one battlefield for the maze planner: tower blocks
 * can be placed and lifted again, and each size-class route is re-searched
 * only when a change can affect it. Never touches the grid it came from.
 */
export type MazePlanningBoard = {
  readonly cols: number;
  readonly rows: number;
  /** In bounds and every cell of the block is an empty-role, free cell right now. */
  canPlace(anchor: GridPoint): boolean;
  place(anchor: GridPoint): void;
  remove(anchor: GridPoint): void;
  /** Route costs for the current blocks; null when either size class is sealed. */
  evaluate(): PlanningRouteCosts | null;
  /** Small route cost alone (half the work of `evaluate`); Infinity when sealed. */
  evaluateSmall(): number;
  /**
   * Small-route samples within `range` of every block on the board (standing
   * towers and placed blocks), summed over the blocks; 0 when sealed.
   */
  evaluateExposure(range: number): number;
  /** Copy of the cached routes, to hand back to `restoreRoutes`. */
  saveRoutes(): PlanningRouteSnapshot;
  /**
   * Reinstates routes saved by `saveRoutes`. Only valid once the board holds
   * exactly the blocks it held when they were saved (place, probe, remove).
   */
  restoreRoutes(snapshot: PlanningRouteSnapshot): void;
  /** Route-search cells expanded so far. Counts work, not time. */
  readonly expandedNodeCount: number;
};

/**
 * One size class: its cached cost (undefined when stale, Infinity when
 * sealed) and the cells its current route relies on.
 */
type RouteCache = {
  agentSize: number;
  cost: number | undefined;
  sweep: Uint8Array;
  /** The route behind `cost`; empty when sealed. Never mutated, only replaced. */
  route: readonly GridPoint[];
};

type SavedRoute = Pick<RouteCache, 'cost' | 'sweep' | 'route'>;

export type PlanningRouteSnapshot = {
  readonly small: Readonly<SavedRoute>;
  readonly large: Readonly<SavedRoute>;
};

function copyRouteCache(cache: RouteCache): SavedRoute {
  return { cost: cache.cost, sweep: cache.sweep.slice(), route: cache.route };
}

function restoreRouteCache(cache: RouteCache, saved: SavedRoute): void {
  cache.cost = saved.cost;
  cache.sweep.set(saved.sweep);
  cache.route = saved.route;
}

function createRouteCache(agentSize: number, cellCount: number): RouteCache {
  return { agentSize, cost: undefined, sweep: new Uint8Array(cellCount), route: [] };
}

function markBuildableCells(grid: GridModel, free: Uint8Array, buildable: Uint8Array): void {
  for (let y = 0; y < grid.rows; y += 1) {
    for (let x = 0; x < grid.cols; x += 1) {
      const index = y * grid.cols + x;
      buildable[index] = free[index] === 1 && getCellAt(grid, x, y)?.role === 'empty' ? 1 : 0;
    }
  }
}

export function createMazePlanningBoard(grid: GridModel): MazePlanningBoard {
  const cols = Math.max(0, grid.cols);
  const rows = Math.max(0, grid.rows);
  const start = grid.entrance;
  const goal = grid.exit;
  const free = new Uint8Array(cols * rows);
  const buildable = new Uint8Array(cols * rows);
  const clearance = new Uint8Array(cols * rows);
  const buffers: MazeRouteSearchBuffers = createMazeRouteSearchBuffers(cols, rows);
  const small = createRouteCache(SMALL_ROUTE_AGENT_SIZE, cols * rows);
  const large = createRouteCache(LARGE_ROUTE_AGENT_SIZE, cols * rows);
  const { width, height } = TOWER_FOOTPRINT;
  const blocks = collectStandingBlocks(grid);

  fillFreeCells(grid, free);
  markBuildableCells(grid, free, buildable);
  recomputeCappedClearance(free, cols, rows, MAZE_CLEARANCE_CAP, clearance, 0, 0, cols, rows);

  function setBlock(anchor: GridPoint, value: number): void {
    for (let y = anchor.y; y < anchor.y + height; y += 1) {
      for (let x = anchor.x; x < anchor.x + width; x += 1) {
        free[y * cols + x] = value;
      }
    }
    recomputeCappedClearance(
      free,
      cols,
      rows,
      MAZE_CLEARANCE_CAP,
      clearance,
      anchor.x - MAZE_CLEARANCE_CAP + 1,
      anchor.y - MAZE_CLEARANCE_CAP + 1,
      anchor.x + width - 1,
      anchor.y + height - 1,
    );
  }

  function canPlace(anchor: GridPoint): boolean {
    if (anchor.x < 0 || anchor.y < 0 || anchor.x + width > cols || anchor.y + height > rows) {
      return false;
    }
    for (let y = anchor.y; y < anchor.y + height; y += 1) {
      for (let x = anchor.x; x < anchor.x + width; x += 1) {
        const index = y * cols + x;
        if (buildable[index] === 0 || free[index] === 0) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * A block off the current route leaves it standing and still shortest, so
   * the cached cost survives; a sealed route stays sealed whatever is added.
   */
  function invalidateOnPlace(cache: RouteCache, anchor: GridPoint): void {
    if (cache.cost === undefined || cache.cost === Infinity) {
      return;
    }
    if (doesRectangleTouchMask(cache.sweep, cols, rows, anchor.x, anchor.y, width, height)) {
      cache.cost = undefined;
    }
  }

  function resolveCost(cache: RouteCache): number {
    if (cache.cost === undefined) {
      cache.cost = searchMazeRouteCost(buffers, clearance, cache.agentSize, start, goal);
      cache.route = Number.isFinite(cache.cost) ? readMazeRoute(buffers, goal) : [];
      if (Number.isFinite(cache.cost)) {
        markRouteSweep(cache.route, cache.agentSize, cols, rows, cache.sweep);
      }
    }
    return cache.cost;
  }

  return {
    cols,
    rows,
    canPlace,
    place(anchor: GridPoint): void {
      invalidateOnPlace(small, anchor);
      invalidateOnPlace(large, anchor);
      setBlock(anchor, 0);
      blocks.push(anchor);
    },
    remove(anchor: GridPoint): void {
      setBlock(anchor, 1);
      const index = blocks.findLastIndex((block) => block.x === anchor.x && block.y === anchor.y);
      if (index >= 0) {
        blocks.splice(index, 1);
      }
      small.cost = undefined;
      large.cost = undefined;
    },
    evaluate(): PlanningRouteCosts | null {
      const smallCost = resolveCost(small);
      const largeCost = Number.isFinite(smallCost) ? resolveCost(large) : Infinity;
      if (!Number.isFinite(smallCost) || !Number.isFinite(largeCost)) {
        return null;
      }
      return {
        small: smallCost,
        large: largeCost,
        weighted:
          MAZE_ROUTE_GAIN_WEIGHTS.small * smallCost + MAZE_ROUTE_GAIN_WEIGHTS.large * largeCost,
      };
    },
    evaluateSmall(): number {
      return resolveCost(small);
    },
    evaluateExposure(range: number): number {
      return Number.isFinite(resolveCost(small))
        ? countRouteExposure(small.route, blocks, range)
        : 0;
    },
    saveRoutes(): PlanningRouteSnapshot {
      return { small: copyRouteCache(small), large: copyRouteCache(large) };
    },
    restoreRoutes(snapshot: PlanningRouteSnapshot): void {
      restoreRouteCache(small, snapshot.small);
      restoreRouteCache(large, snapshot.large);
    },
    get expandedNodeCount() {
      return buffers.expandedNodeCount;
    },
  };
}
