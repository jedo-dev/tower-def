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
import type { MazeRoute, MazeRoutes, PlacementRouteGain } from './types';

/**
 * Board snapshot for scoring many candidate placements against one baseline.
 * Results are deterministic; scratch buffers are owned by the evaluator and
 * restored after every call, so calls are independent of each other.
 */
export type MazeEvaluator = {
  /** Current small/large routes and their costs. */
  readonly routes: MazeRoutes;
  /** Route gain from placing `footprint` at `anchor`, relative to `routes`. */
  routeGainForPlacement(anchor: GridPoint, footprint?: Readonly<Footprint>): PlacementRouteGain;
};

const INVALID_PLACEMENT: Readonly<PlacementRouteGain> = Object.freeze({
  valid: false,
  smallGain: 0,
  largeGain: 0,
});

const UNCHANGED_PLACEMENT: Readonly<PlacementRouteGain> = Object.freeze({
  valid: true,
  smallGain: 0,
  largeGain: 0,
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
): { route: MazeRoute; cost: number | null } {
  const cost = searchMazeRouteCost(buffers, clearance, agentSize, start, goal);

  return Number.isFinite(cost)
    ? { route: readMazeRoute(buffers, goal), cost }
    : { route: null, cost: null };
}

/**
 * Snapshots `grid` (free cells and capped clearance) and computes both
 * baseline routes. The grid is never mutated; later changes to it are not
 * seen, so create a new evaluator after the board changes. Towers already
 * standing must be marked `isOccupied` on the grid.
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
  const routes: MazeRoutes = {
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

  function routeGainForPlacement(
    anchor: GridPoint,
    footprint: Readonly<Footprint> = TOWER_FOOTPRINT,
  ): PlacementRouteGain {
    const baseSmallCost = routes.smallRouteCost;
    const baseLargeCost = routes.largeRouteCost;

    if (baseSmallCost === null || baseLargeCost === null) {
      return INVALID_PLACEMENT;
    }

    if (!canOccupyFootprint(grid, anchor, footprint)) {
      return INVALID_PLACEMENT;
    }

    const { width, height } = footprint;
    const touchesSmall = doesRectangleTouchMask(
      smallSweep,
      cols,
      rows,
      anchor.x,
      anchor.y,
      width,
      height,
    );
    const touchesLarge = doesRectangleTouchMask(
      largeSweep,
      cols,
      rows,
      anchor.x,
      anchor.y,
      width,
      height,
    );

    if (!touchesSmall && !touchesLarge) {
      return UNCHANGED_PLACEMENT;
    }

    setFootprintFree(anchor, footprint, 0);
    const smallCost = touchesSmall
      ? searchMazeRouteCost(buffers, clearance, SMALL_ROUTE_AGENT_SIZE, start, goal)
      : baseSmallCost;
    const largeCost =
      touchesLarge && Number.isFinite(smallCost)
        ? searchMazeRouteCost(buffers, clearance, LARGE_ROUTE_AGENT_SIZE, start, goal)
        : baseLargeCost;
    setFootprintFree(anchor, footprint, 1);

    if (!Number.isFinite(smallCost) || !Number.isFinite(largeCost)) {
      return INVALID_PLACEMENT;
    }

    return {
      valid: true,
      smallGain: snapGain(smallCost - baseSmallCost),
      largeGain: snapGain(largeCost - baseLargeCost),
    };
  }

  return { routes, routeGainForPlacement };
}
