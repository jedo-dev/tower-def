import type { GridPoint } from '../../../../shared/types/grid';

/**
 * Pure geometry of the worn path trail: route cells -> smooth centreline ->
 * width-varying ribbon samples. No rendering here; pathRibbonRenderer paints
 * the samples. Everything is deterministic for a given route and seed.
 */

export type RibbonPoint = {
  x: number;
  y: number;
};

/** A centreline point with its unit normal and the ribbon's half width there. */
export type RibbonSample = RibbonPoint & {
  normalX: number;
  normalY: number;
  halfWidth: number;
};

export type PathRibbonGeometryConfig = {
  /** World units per grid cell. */
  cellSize: number;
  /** Ribbon width as a fraction of a cell (before noise). */
  widthCells: number;
  /** Radius corners are rounded with, in cells; short legs shrink it. */
  cornerRadiusCells: number;
  /** Points each rounded corner is drawn with (the curve, endpoints included). */
  cornerSegments: number;
  /** Spacing of the width samples along the centreline, in cells. */
  sampleSpacingCells: number;
  /** Width noise as a fraction of the half width (0.08 = +-8%). */
  widthNoiseAmplitude: number;
  /** Distance between independent width-noise values, in cells. */
  widthNoiseWavelengthCells: number;
};

/**
 * Keeps the route's endpoints and the cells where its direction changes, so
 * every straight or 45-degree run becomes one segment.
 */
export function simplifyRouteCorners(fullRoute: readonly GridPoint[]): GridPoint[] {
  const route = fullRoute.filter(
    (point, index) =>
      index === 0 || point.x !== fullRoute[index - 1].x || point.y !== fullRoute[index - 1].y,
  );
  if (route.length <= 2) {
    return route.map((point) => ({ x: point.x, y: point.y }));
  }

  const corners: GridPoint[] = [{ x: route[0].x, y: route[0].y }];
  for (let index = 1; index < route.length - 1; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const next = route[index + 1];
    const isSameDirection =
      Math.sign(current.x - previous.x) === Math.sign(next.x - current.x) &&
      Math.sign(current.y - previous.y) === Math.sign(next.y - current.y);
    if (!isSameDirection) {
      corners.push({ x: current.x, y: current.y });
    }
  }
  const last = route[route.length - 1];
  corners.push({ x: last.x, y: last.y });
  return corners;
}

function toCellCentre(point: GridPoint, cellSize: number): RibbonPoint {
  return { x: (point.x + 0.5) * cellSize, y: (point.y + 0.5) * cellSize };
}

function pushDistinct(points: RibbonPoint[], point: RibbonPoint): void {
  const last = points[points.length - 1];
  if (!last || Math.hypot(last.x - point.x, last.y - point.y) > 1e-6) {
    points.push(point);
  }
}

/**
 * Smooth centreline through the route's cell centres, in world units. Straight
 * runs stay single segments; each corner is replaced by a quadratic curve
 * that starts and ends on the adjacent legs (a fillet), sized by the corner
 * radius but never taking more than half of an inner leg, so consecutive
 * corners never overlap.
 */
export function buildRibbonCentreline(
  route: readonly GridPoint[],
  config: PathRibbonGeometryConfig,
): RibbonPoint[] {
  const corners = simplifyRouteCorners(route).map((point) => toCellCentre(point, config.cellSize));
  if (corners.length <= 2) {
    return corners;
  }

  const radius = config.cornerRadiusCells * config.cellSize;
  const centreline: RibbonPoint[] = [corners[0]];
  for (let index = 1; index < corners.length - 1; index += 1) {
    const previous = corners[index - 1];
    const vertex = corners[index];
    const next = corners[index + 1];
    const inLength = Math.hypot(vertex.x - previous.x, vertex.y - previous.y);
    const outLength = Math.hypot(next.x - vertex.x, next.y - vertex.y);
    const inX = (vertex.x - previous.x) / inLength;
    const inY = (vertex.y - previous.y) / inLength;
    const outX = (next.x - vertex.x) / outLength;
    const outY = (next.y - vertex.y) / outLength;
    const turnAngle = Math.acos(Math.max(-1, Math.min(1, inX * outX + inY * outY)));
    const inShare = index === 1 ? inLength : inLength / 2;
    const outShare = index === corners.length - 2 ? outLength : outLength / 2;
    const tangentLength = Math.min(radius * Math.tan(turnAngle / 2), inShare, outShare);
    const start = { x: vertex.x - inX * tangentLength, y: vertex.y - inY * tangentLength };
    const end = { x: vertex.x + outX * tangentLength, y: vertex.y + outY * tangentLength };

    for (let step = 0; step < config.cornerSegments; step += 1) {
      const t = step / (config.cornerSegments - 1);
      const inverse = 1 - t;
      pushDistinct(centreline, {
        x: inverse * inverse * start.x + 2 * inverse * t * vertex.x + t * t * end.x,
        y: inverse * inverse * start.y + 2 * inverse * t * vertex.y + t * t * end.y,
      });
    }
  }
  pushDistinct(centreline, corners[corners.length - 1]);
  return centreline;
}

/** FNV-1a over the route's cells: the width-noise seed of one route. */
export function hashRoute(route: readonly GridPoint[]): number {
  let hash = 0x811c9dc5;
  for (const point of route) {
    hash = Math.imul(hash ^ (point.x & 0xffff), 0x01000193);
    hash = Math.imul(hash ^ (point.y & 0xffff), 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic value in [-1, 1] for an integer knot and seed. */
function hashToUnit(knot: number, seed: number): number {
  let value = Math.imul(knot ^ seed, 0x27d4eb2d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  return ((value >>> 0) / 0xffffffff) * 2 - 1;
}

/**
 * Smooth 1D value noise in [-1, 1] along the centreline: random knots one
 * wavelength apart, blended with smoothstep.
 */
export function ribbonWidthNoise(distance: number, seed: number, wavelength: number): number {
  const position = distance / wavelength;
  const knot = Math.floor(position);
  const fraction = position - knot;
  const blend = fraction * fraction * (3 - 2 * fraction);
  const from = hashToUnit(knot, seed);
  const to = hashToUnit(knot + 1, seed);
  return from + (to - from) * blend;
}

function segmentNormal(from: RibbonPoint, to: RibbonPoint): RibbonPoint {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  return length === 0
    ? { x: 0, y: -1 }
    : { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
}

/**
 * Walks the centreline and emits samples at least every `sampleSpacingCells`
 * (plus every centreline point, so curves keep their shape), each with the
 * local normal and a seeded, smoothly varying half width.
 */
export function sampleRibbon(
  centreline: readonly RibbonPoint[],
  seed: number,
  config: PathRibbonGeometryConfig,
): RibbonSample[] {
  const baseHalfWidth = (config.widthCells * config.cellSize) / 2;
  const wavelength = config.widthNoiseWavelengthCells * config.cellSize;
  const spacing = config.sampleSpacingCells * config.cellSize;
  const toSample = (point: RibbonPoint, normal: RibbonPoint, distance: number): RibbonSample => ({
    x: point.x,
    y: point.y,
    normalX: normal.x,
    normalY: normal.y,
    halfWidth:
      baseHalfWidth *
      (1 + config.widthNoiseAmplitude * ribbonWidthNoise(distance, seed, wavelength)),
  });

  if (centreline.length === 1) {
    return [toSample(centreline[0], { x: 0, y: -1 }, 0)];
  }

  const samples: RibbonSample[] = [];
  let travelled = 0;
  for (let index = 0; index < centreline.length - 1; index += 1) {
    const from = centreline[index];
    const to = centreline[index + 1];
    const normal = segmentNormal(from, to);
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(length / spacing));
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      samples.push(
        toSample(
          { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
          normal,
          travelled + length * t,
        ),
      );
    }
    travelled += length;
  }
  const last = centreline[centreline.length - 1];
  const lastNormal = segmentNormal(centreline[centreline.length - 2], last);
  samples.push(toSample(last, lastNormal, travelled));
  return samples;
}

/** Route -> ribbon samples in world units, seeded by the route itself. */
export function buildPathRibbon(
  route: readonly GridPoint[],
  config: PathRibbonGeometryConfig,
): RibbonSample[] {
  if (route.length === 0) {
    return [];
  }
  return sampleRibbon(buildRibbonCentreline(route, config), hashRoute(route), config);
}
