import type { Footprint, GridPoint } from '../../../../shared/types/grid';

/** One weight per distinct creep route: small (small + medium creeps) and large. */
export type MazeSizeClassWeights = {
  small: number;
  large: number;
};

/** A route as the anchor (top-left) cells the agent walks through; null when unreachable. */
export type MazeRoute = readonly GridPoint[] | null;

/** A tower as the maze evaluator sees it: where it stands and how far it shoots. */
export type MazeTower = {
  /** Top-left cell of the tower footprint. */
  anchor: GridPoint;
  footprint: Readonly<Footprint>;
  /** Attack range in cells, measured from the footprint centre (Euclidean). */
  range: number;
};

export type TowerRouteCoverage = {
  /** Small-route samples within range; a route passing twice counts twice. */
  small: number;
  /** Large-route samples within range; a route passing twice counts twice. */
  large: number;
  /** `small` and `large` combined with the coverage weights. */
  combined: number;
};

export type MazeRoutes = {
  smallRoute: MazeRoute;
  largeRoute: MazeRoute;
  /** Octile cost of the small route (1 per orthogonal, sqrt(2) per diagonal step); null when unreachable. */
  smallRouteCost: number | null;
  /** Octile cost of the large (2x2) route; null when unreachable. */
  largeRouteCost: number | null;
};

export type MazeEvaluation = MazeRoutes & {
  /** Coverage of each input tower, in input order. */
  coverageByTower: TowerRouteCoverage[];
};

export type PlacementRouteGain = {
  /**
   * True when the footprint can be occupied and both the small and the large
   * route existed before and still exist afterwards.
   */
  valid: boolean;
  /** Extra small-route cost the placement forces; 0 when invalid. */
  smallGain: number;
  /** Extra large-route cost the placement forces; 0 when invalid. */
  largeGain: number;
};

export type PlacementRouteProbe = PlacementRouteGain & {
  /** Small route once the placement stands; null when the placement is invalid. */
  smallRoute: MazeRoute;
};
