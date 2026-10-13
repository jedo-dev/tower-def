import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { canOccupyFootprint } from '../../../../shared/lib/grid/footprint';
import type { Footprint, GridModel, GridPoint } from '../../../../shared/types/grid';
import {
  LARGE_ROUTE_AGENT_SIZE,
  MAZE_CLEARANCE_CAP,
  MAZE_ROUTE_GAIN_SNAP_SCALE,
  SMALL_ROUTE_AGENT_SIZE,
} from './constants';
import {
  doesRectangleTouchMask,
  fillFreeCells,
  markRouteSweep,
  recomputeCappedClearance,
} from './mazeClearance';
import {
  createMazeRouteSearchBuffers,
  readMazeRoute,
  searchMazeRouteCost,
  type MazeRouteSearchBuffers,
} from './mazeRouteSearch';
import type { MazeRoute, MazeRoutes, PlacementRouteGain, PlacementRouteProbe } from './types';

/**
 * Board snapshot for scoring many candidate placements against one baseline.
 * Results are deterministic; scratch buffers are owned by the evaluator and
 * restored after every probe, so probes are independent of each other. Only
 * `place` moves the baseline.
 */
export type MazeEvaluator = {
  /** Current small/large routes and their costs, blocks committed with `place` included. */
  readonly routes: MazeRoutes;
  /** Route gain from placing `footprint` at `anchor`, relative to `routes`. */
  routeGainForPlacement(anchor: GridPoint, footprint?: Readonly<Footprint>): PlacementRouteGain;
  /** Same as `routeGainForPlacement`, plus the small route the creeps would walk afterwards. */
  probePlacement(anchor: GridPoint, footprint?: Readonly<Footprint>): PlacementRouteProbe;
  /**
   * `probePlacement` without the large route, at half the search work:
   * `valid` only promises that the block can stand and keeps the small route
   * open, and `largeGain` is 0. Check `keepsLargeRouteOpen` before building.
   */
  probeSmallRoute(anchor: GridPoint, footprint?: Readonly<Footprint>): PlacementRouteProbe;
  /** True when the block can stand and the large route stays open with it. */
  keepsLargeRouteOpen(anchor: GridPoint, footprint?: Readonly<Footprint>): boolean;
  /**
   * True when the block covers a cell the current small route relies on: it
   * may lengthen or seal that route, and probing it costs a route search.
   */
  touchesSmallRoute(anchor: GridPoint, footprint?: Readonly<Footprint>): boolean;
  /**
   * Stands a block for good: later probes and `routes` see it. Only routes
   * the block touches are searched again, so a board that grows one tower at
   * a time never needs a fresh evaluator. The caller makes sure the block is
   * a legal build (see `probePlacement`).
   */
  place(anchor: GridPoint, footprint?: Readonly<Footprint>): void;
  /** Cells expanded by every route search so far, baseline included. Counts work, not time. */
  readonly expandedNodeCount: number;
};

type FoundRoute = { route: MazeRoute; cost: number | null };

const INVALID_PLACEMENT: Readonly<PlacementRouteGain> = Object.freeze({
  valid: false,
  smallGain: 0,
  largeGain: 0,
});

const INVALID_PROBE: Readonly<PlacementRouteProbe> = Object.freeze({
  ...INVALID_PLACEMENT,
  smallRoute: null,
});

function snapGain(gain: number): number {
  return Math.round(gain * MAZE_ROUTE_GAIN_SNAP_SCALE) / MAZE_ROUTE_GAIN_SNAP_SCALE;
}

function findRoute(
  buffers: MazeRouteSearchBuffers,
  clearance: Uint8Array,
  agentSize: number,
  start: GridPoint,
  goal: GridPoint,
): FoundRoute {
  const cost = searchMazeRouteCost(buffers, clearance, agentSize, start, goal);

  return Number.isFinite(cost)
    ? { route: readMazeRoute(buffers, goal), cost }
    : { route: null, cost: null };
}

/**
 * Snapshots `grid` (free cells and capped clearance) and computes both
 * baseline routes. The grid is never mutated and later changes to it are not
 * seen: commit new blocks with `place`, or create a new evaluator. Towers
 * already standing must be marked `isOccupied` on the grid.
 */
export function createMazeEvaluator(
  grid: GridModel,
  start: GridPoint,
  goal: GridPoint,
): MazeEvaluator {
  const cols = Math.max(0, grid.cols);
  const rows = Math.max(0, grid.rows);
  const free = new Uint8Array(cols * rows);
  const clearance = new Uint8Array(cols * rows);
  const buffers = createMazeRouteSearchBuffers(cols, rows);
  fillFreeCells(grid, free);
  recomputeCappedClearance(free, cols, rows, MAZE_CLEARANCE_CAP, clearance, 0, 0, cols, rows);

  const small = findRoute(buffers, clearance, SMALL_ROUTE_AGENT_SIZE, start, goal);
  const large = findRoute(buffers, clearance, LARGE_ROUTE_AGENT_SIZE, start, goal);
  let routes: MazeRoutes = {
    smallRoute: small.route,
    largeRoute: large.route,
    smallRouteCost: small.cost,
    largeRouteCost: large.cost,
  };

  const smallSweep = new Uint8Array(cols * rows);
  const largeSweep = new Uint8Array(cols * rows);
  markRouteSweep(small.route ?? [], SMALL_ROUTE_AGENT_SIZE, cols, rows, smallSweep);
  markRouteSweep(large.route ?? [], LARGE_ROUTE_AGENT_SIZE, cols, rows, largeSweep);

  function setFootprintFree(anchor: GridPoint, footprint: Readonly<Footprint>, value: number) {
    for (let y = anchor.y; y < anchor.y + footprint.height; y += 1) {
      for (let x = anchor.x; x < anchor.x + footprint.width; x += 1) {
        free[y * cols + x] = value;
      }
    }

    // Capped clearance only changes where the cap x cap square overlaps the footprint.
    recomputeCappedClearance(
      free,
      cols,
      rows,
      MAZE_CLEARANCE_CAP,
      clearance,
      anchor.x - MAZE_CLEARANCE_CAP + 1,
      anchor.y - MAZE_CLEARANCE_CAP + 1,
      anchor.x + footprint.width - 1,
      anchor.y + footprint.height - 1,
    );
  }

  /** Free on the snapshot and not covered by a block committed with `place`. */
  function canStand(anchor: GridPoint, footprint: Readonly<Footprint>): boolean {
    if (!canOccupyFootprint(grid, anchor, footprint)) {
      return false;
    }
    for (let y = anchor.y; y < anchor.y + footprint.height; y += 1) {
      for (let x = anchor.x; x < anchor.x + footprint.width; x += 1) {
        if (free[y * cols + x] === 0) {
          return false;
        }
      }
    }
    return true;
  }

  function touches(sweep: Uint8Array, anchor: GridPoint, footprint: Readonly<Footprint>) {
    const { width, height } = footprint;
    return doesRectangleTouchMask(sweep, cols, rows, anchor.x, anchor.y, width, height);
  }

  /** Cost of one size-class route with the block standing; Infinity when sealed. */
  function searchWithBlock(anchor: GridPoint, footprint: Readonly<Footprint>, agentSize: number) {
    setFootprintFree(anchor, footprint, 0);
    const cost = searchMazeRouteCost(buffers, clearance, agentSize, start, goal);
    setFootprintFree(anchor, footprint, 1);
    return cost;
  }

  /**
   * Shared core. Reads the rerouted small route only when `withSmallRoute`
   * asks for it, and skips the large route when `withLargeRoute` is false.
   */
  function evaluatePlacement(
    anchor: GridPoint,
    footprint: Readonly<Footprint>,
    withSmallRoute: boolean,
    withLargeRoute: boolean,
  ): PlacementRouteProbe {
    const baseSmallCost = routes.smallRouteCost;
    const baseLargeCost = withLargeRoute ? routes.largeRouteCost : 0;

    if (baseSmallCost === null || baseLargeCost === null || !canStand(anchor, footprint)) {
      return INVALID_PROBE;
    }

    const touchesSmall = touches(smallSweep, anchor, footprint);
    const touchesLarge = withLargeRoute && touches(largeSweep, anchor, footprint);

    if (!touchesSmall && !touchesLarge) {
      return { valid: true, smallGain: 0, largeGain: 0, smallRoute: routes.smallRoute };
    }

    const smallCost = touchesSmall
      ? searchWithBlock(anchor, footprint, SMALL_ROUTE_AGENT_SIZE)
      : baseSmallCost;
    // Restoring the block leaves the search buffers alone, so the parents of
    // the small search are still there; the large search would overwrite them.
    const smallRoute =
      touchesSmall && withSmallRoute && Number.isFinite(smallCost)
        ? readMazeRoute(buffers, goal)
        : routes.smallRoute;
    const largeCost =
      touchesLarge && Number.isFinite(smallCost)
        ? searchWithBlock(anchor, footprint, LARGE_ROUTE_AGENT_SIZE)
        : baseLargeCost;

    if (!Number.isFinite(smallCost) || !Number.isFinite(largeCost)) {
      return INVALID_PROBE;
    }

    return {
      valid: true,
      smallGain: snapGain(smallCost - baseSmallCost),
      largeGain: snapGain(largeCost - baseLargeCost),
      smallRoute,
    };
  }

  function keepsLargeRouteOpen(anchor: GridPoint, footprint: Readonly<Footprint>): boolean {
    if (routes.largeRouteCost === null || !canStand(anchor, footprint)) {
      return false;
    }
    return (
      !touches(largeSweep, anchor, footprint) ||
      Number.isFinite(searchWithBlock(anchor, footprint, LARGE_ROUTE_AGENT_SIZE))
    );
  }

  /** Searches one size class again on the current board and refreshes its sweep. */
  function researchRoute(agentSize: number, sweep: Uint8Array): FoundRoute {
    const found = findRoute(buffers, clearance, agentSize, start, goal);
    markRouteSweep(found.route ?? [], agentSize, cols, rows, sweep);
    return found;
  }

  function place(anchor: GridPoint, footprint: Readonly<Footprint>): void {
    // A block off a route leaves it standing and still shortest; a sealed
    // route stays sealed whatever is added.
    const touchesSmall = routes.smallRoute !== null && touches(smallSweep, anchor, footprint);
    const touchesLarge = routes.largeRoute !== null && touches(largeSweep, anchor, footprint);
    setFootprintFree(anchor, footprint, 0);
    const nextSmall = touchesSmall ? researchRoute(SMALL_ROUTE_AGENT_SIZE, smallSweep) : null;
    const nextLarge = touchesLarge ? researchRoute(LARGE_ROUTE_AGENT_SIZE, largeSweep) : null;
    routes = {
      smallRoute: nextSmall ? nextSmall.route : routes.smallRoute,
      largeRoute: nextLarge ? nextLarge.route : routes.largeRoute,
      smallRouteCost: nextSmall ? nextSmall.cost : routes.smallRouteCost,
      largeRouteCost: nextLarge ? nextLarge.cost : routes.largeRouteCost,
    };
  }

  return {
    get routes() {
      return routes;
    },
    routeGainForPlacement(anchor, footprint = TOWER_FOOTPRINT) {
      const { valid, smallGain, largeGain } = evaluatePlacement(anchor, footprint, false, true);
      return valid ? { valid, smallGain, largeGain } : INVALID_PLACEMENT;
    },
    probePlacement(anchor, footprint = TOWER_FOOTPRINT) {
      return evaluatePlacement(anchor, footprint, true, true);
    },
    probeSmallRoute(anchor, footprint = TOWER_FOOTPRINT) {
      return evaluatePlacement(anchor, footprint, true, false);
    },
    keepsLargeRouteOpen(anchor, footprint = TOWER_FOOTPRINT) {
      return keepsLargeRouteOpen(anchor, footprint);
    },
    touchesSmallRoute(anchor, footprint = TOWER_FOOTPRINT) {
      return routes.smallRoute !== null && touches(smallSweep, anchor, footprint);
    },
    place(anchor, footprint = TOWER_FOOTPRINT) {
      place(anchor, footprint);
    },
    get expandedNodeCount() {
      return buffers.expandedNodeCount;
    },
  };
}
