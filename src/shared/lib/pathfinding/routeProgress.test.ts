import { describe, expect, it } from 'vitest';
import {
  getRemainingRouteDistance,
  getRouteSegmentLength,
  getRouteSuffixDistances,
} from './routeProgress';

const MIXED_ROUTE = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 1 },
  { x: 2, y: 2 },
];

describe('route progress', () => {
  it('measures each step as orthogonal 1 or diagonal sqrt 2', () => {
    expect(getRouteSegmentLength(MIXED_ROUTE, 0)).toBe(1);
    expect(getRouteSegmentLength(MIXED_ROUTE, 1)).toBeCloseTo(Math.SQRT2, 12);
  });

  it('builds suffix distances to the exit along the route', () => {
    const suffix = getRouteSuffixDistances(MIXED_ROUTE);

    expect(Array.from(suffix)).toEqual([2 + Math.SQRT2, 1 + Math.SQRT2, 1, 0]);
  });

  it('builds the table once per route array', () => {
    expect(getRouteSuffixDistances(MIXED_ROUTE)).toBe(getRouteSuffixDistances(MIXED_ROUTE));
  });

  it('interpolates within the current segment', () => {
    expect(getRemainingRouteDistance(MIXED_ROUTE, 0, 1)).toBeCloseTo(2 + Math.SQRT2, 12);
    expect(getRemainingRouteDistance(MIXED_ROUTE, 1, 0.5)).toBeCloseTo(1 + Math.SQRT2 / 2, 12);
    expect(getRemainingRouteDistance(MIXED_ROUTE, 2, 0)).toBe(0);
  });

  it('reports zero at the exit and for an empty route', () => {
    expect(getRemainingRouteDistance(MIXED_ROUTE, 3, 1)).toBe(0);
    expect(getRemainingRouteDistance([], 0, 1)).toBe(0);
  });
});
