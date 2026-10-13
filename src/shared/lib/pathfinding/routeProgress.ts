import type { GridPosition } from '../../types/pathfinding';
import { octileHeuristic } from './octileGrid';

type Route = readonly GridPosition[];

/**
 * Suffix tables keyed by route identity. Wave routes are recomputed (as new
 * arrays) whenever the maze changes, so each table is built once per route per
 * wave and dropped together with its route; per-frame lookups never allocate.
 */
const suffixDistancesByRoute = new WeakMap<Route, Float64Array>();

/** Octile length of the step from `route[index]` to `route[index + 1]`. */
export function getRouteSegmentLength(route: Route, index: number): number {
  const from = route[index];
  const to = route[index + 1];
  return octileHeuristic(from.x, from.y, to.x, to.y);
}

function buildSuffixDistances(route: Route): Float64Array {
  const suffix = new Float64Array(route.length);
  for (let index = route.length - 2; index >= 0; index -= 1) {
    suffix[index] = suffix[index + 1] + getRouteSegmentLength(route, index);
  }
  return suffix;
}

/**
 * `result[i]` is the octile distance from waypoint `i` to the route's exit,
 * walking the route itself. Memoised per route array.
 */
export function getRouteSuffixDistances(route: Route): Float64Array {
  let suffix = suffixDistancesByRoute.get(route);
  if (suffix === undefined) {
    suffix = buildSuffixDistances(route);
    suffixDistancesByRoute.set(route, suffix);
  }
  return suffix;
}

/**
 * Distance (in cells) still to walk to the exit for a creep that last reached
 * waypoint `pathIndex` and has `fractionOfSegmentLeft` (1 = just left the
 * waypoint, 0 = arrived at the next one) of its current segment ahead of it.
 * Comparable across routes of different lengths, unlike `pathIndex`.
 */
export function getRemainingRouteDistance(
  route: Route,
  pathIndex: number,
  fractionOfSegmentLeft: number,
): number {
  if (route.length === 0) {
    return 0;
  }
  const suffix = getRouteSuffixDistances(route);
  if (pathIndex >= route.length - 1) {
    return 0;
  }
  return suffix[pathIndex + 1] + getRouteSegmentLength(route, pathIndex) * fractionOfSegmentLeft;
}
