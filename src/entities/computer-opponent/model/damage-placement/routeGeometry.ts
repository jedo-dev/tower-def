import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import type { GridPoint } from '../../../../shared/types/grid';
import { SMALL_ROUTE_AGENT_SIZE } from '../maze-evaluation/constants';

/**
 * A creep route as the damage model reads it: one sample per anchor cell the
 * agent walks through, so a route passing the same area twice is sampled
 * twice. Lookups are cached; the route itself is never mutated.
 */
export type RouteGeometry = {
  readonly length: number;
  /** Indices of the samples whose agent centre is within `range` of a tower block at `anchor`. */
  coveredSamples(anchor: GridPoint, range: number): readonly number[];
  /** For every sample, how many samples (itself included) lie within `radius` of it. */
  neighbourCounts(radius: number): Int32Array;
};

const EMPTY_SAMPLES: readonly number[] = Object.freeze([]);

/** Cell units: cell (x, y) spans [x, x + 1) x [y, y + 1). */
export function createRouteGeometry(
  route: readonly GridPoint[] | null,
  agentSize: number = SMALL_ROUTE_AGENT_SIZE,
): RouteGeometry {
  const samples = route ?? [];
  const halfAgent = agentSize / 2;
  const centreX = Float64Array.from(samples, (point) => point.x + halfAgent);
  const centreY = Float64Array.from(samples, (point) => point.y + halfAgent);
  const coveredCache = new Map<string, readonly number[]>();
  const neighbourCache = new Map<number, Int32Array>();

  function coveredSamples(anchor: GridPoint, range: number): readonly number[] {
    if (!(range >= 0) || samples.length === 0) {
      return EMPTY_SAMPLES;
    }
    const key = `${anchor.x}:${anchor.y}:${range}`;
    const cached = coveredCache.get(key);
    if (cached) {
      return cached;
    }

    const towerX = anchor.x + TOWER_FOOTPRINT.width / 2;
    const towerY = anchor.y + TOWER_FOOTPRINT.height / 2;
    const rangeSquared = range * range;
    const covered: number[] = [];
    for (let index = 0; index < samples.length; index += 1) {
      const deltaX = centreX[index] - towerX;
      const deltaY = centreY[index] - towerY;
      if (deltaX * deltaX + deltaY * deltaY <= rangeSquared) {
        covered.push(index);
      }
    }
    coveredCache.set(key, covered);
    return covered;
  }

  function neighbourCounts(radius: number): Int32Array {
    const cached = neighbourCache.get(radius);
    if (cached) {
      return cached;
    }

    const radiusSquared = radius * radius;
    const counts = new Int32Array(samples.length);
    for (let index = 0; index < samples.length; index += 1) {
      let count = 0;
      for (let other = 0; other < samples.length; other += 1) {
        const deltaX = centreX[index] - centreX[other];
        const deltaY = centreY[index] - centreY[other];
        if (deltaX * deltaX + deltaY * deltaY <= radiusSquared) {
          count += 1;
        }
      }
      counts[index] = count;
    }
    neighbourCache.set(radius, counts);
    return counts;
  }

  return { length: samples.length, coveredSamples, neighbourCounts };
}
