import { CREEPS_PER_ROUTE_SAMPLE } from './constants';
import type { RouteGeometry } from './routeGeometry';

/** Creeps next to a target at `sampleIndex` within `radius`, the target included. */
export function expectedCreepsAround(
  geometry: RouteGeometry,
  sampleIndex: number,
  radius: number,
): number {
  const neighbours = geometry.neighbourCounts(radius)[sampleIndex] ?? 1;
  return 1 + Math.max(0, neighbours - 1) * CREEPS_PER_ROUTE_SAMPLE;
}
