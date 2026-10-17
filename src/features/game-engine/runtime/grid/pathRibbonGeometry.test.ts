import { describe, expect, it } from 'vitest';
import type { GridPoint } from '../../../../shared/types/grid';
import {
  buildPathRibbon,
  buildRibbonCentreline,
  hashRoute,
  ribbonWidthNoise,
  simplifyRouteCorners,
  type PathRibbonGeometryConfig,
} from './pathRibbonGeometry';

const CELL = 16;
const CONFIG: PathRibbonGeometryConfig = {
  cellSize: CELL,
  widthCells: 0.88,
  cornerRadiusCells: 0.9,
  cornerSegments: 7,
  sampleSpacingCells: 0.25,
  widthNoiseAmplitude: 0.08,
  widthNoiseWavelengthCells: 1.5,
};

function steps(from: GridPoint, dx: number, dy: number, count: number): GridPoint[] {
  return Array.from({ length: count + 1 }, (_, index) => ({
    x: from.x + dx * index,
    y: from.y + dy * index,
  }));
}

const centre = (cell: number): number => (cell + 0.5) * CELL;

describe('simplifyRouteCorners', () => {
  it('keeps only the endpoints and the cells where the direction changes', () => {
    const route = [...steps({ x: 0, y: 0 }, 1, 0, 4), ...steps({ x: 5, y: 1 }, 1, 1, 2)];

    expect(simplifyRouteCorners(route)).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 7, y: 3 },
    ]);
  });

  it('drops repeated cells', () => {
    expect(
      simplifyRouteCorners([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
  });
});

describe('buildRibbonCentreline', () => {
  it('keeps a straight run a single straight segment through the cell centres', () => {
    const centreline = buildRibbonCentreline(steps({ x: 2, y: 5 }, 1, 0, 8), CONFIG);

    expect(centreline).toEqual([
      { x: centre(2), y: centre(5) },
      { x: centre(10), y: centre(5) },
    ]);
  });

  it('draws a diagonal run as one 45-degree segment, not a staircase', () => {
    const centreline = buildRibbonCentreline(steps({ x: 1, y: 1 }, 1, 1, 6), CONFIG);

    expect(centreline).toHaveLength(2);
    const [from, to] = centreline;
    expect(Math.atan2(to.y - from.y, to.x - from.x)).toBeCloseTo(Math.PI / 4, 10);
  });

  it('rounds an L-turn: the curve cuts the corner and meets both legs tangentially', () => {
    const route = [...steps({ x: 0, y: 0 }, 1, 0, 6), ...steps({ x: 6, y: 1 }, 0, 1, 5)];
    const centreline = buildRibbonCentreline(route, CONFIG);
    const corner = { x: centre(6), y: centre(0) };

    expect(centreline[0]).toEqual({ x: centre(0), y: centre(0) });
    expect(centreline.at(-1)).toEqual({ x: centre(6), y: centre(6) });
    expect(centreline).toHaveLength(CONFIG.cornerSegments + 2);
    // No point sits on the square corner; the closest one is pulled inside it.
    const closest = Math.min(...centreline.map((p) => Math.hypot(p.x - corner.x, p.y - corner.y)));
    expect(closest).toBeGreaterThan(CELL * 0.2);
    // The curve starts on the first leg and ends on the second one.
    const curve = centreline.slice(1, -1);
    expect(curve[0].y).toBeCloseTo(corner.y, 10);
    expect(curve.at(-1)?.x).toBeCloseTo(corner.x, 10);
    // Heading turns monotonically from east to south: no kinks or loops.
    const headings = centreline
      .slice(1)
      .map((point, index) =>
        Math.atan2(point.y - centreline[index].y, point.x - centreline[index].x),
      );
    headings.slice(1).forEach((heading, index) => {
      expect(heading).toBeGreaterThanOrEqual(headings[index] - 1e-9);
    });
  });

  it('never lets two corners on one short leg overlap', () => {
    // Zig-zag with one-cell legs: each corner may use at most half a leg.
    const route: GridPoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ];
    const centreline = buildRibbonCentreline(route, CONFIG);

    for (let index = 1; index < centreline.length; index += 1) {
      const previous = centreline[index - 1];
      const current = centreline[index];
      // Monotone in both axes: the trail never doubles back.
      expect(current.x).toBeGreaterThanOrEqual(previous.x - 1e-9);
      expect(current.y).toBeGreaterThanOrEqual(previous.y - 1e-9);
    }
  });
});

describe('ribbon width noise', () => {
  const route = [...steps({ x: 0, y: 0 }, 1, 0, 10), ...steps({ x: 11, y: 1 }, 1, 1, 6)];
  const baseHalfWidth = (CONFIG.widthCells * CELL) / 2;

  it('is deterministic per route', () => {
    expect(buildPathRibbon(route, CONFIG)).toEqual(buildPathRibbon(route, CONFIG));
  });

  it('differs between routes and stays within the configured amplitude', () => {
    const shifted = route.map((p) => ({ x: p.x, y: p.y + 1 }));
    const samples = buildPathRibbon(route, CONFIG);
    const other = buildPathRibbon(shifted, CONFIG);

    expect(hashRoute(route)).not.toBe(hashRoute(shifted));
    expect(samples.map((s) => s.halfWidth)).not.toEqual(other.map((s) => s.halfWidth));
    for (const sample of samples) {
      expect(Math.abs(sample.halfWidth / baseHalfWidth - 1)).toBeLessThanOrEqual(
        CONFIG.widthNoiseAmplitude + 1e-9,
      );
    }
    const widths = new Set(samples.map((s) => s.halfWidth.toFixed(3)));
    expect(widths.size).toBeGreaterThan(3);
  });

  it('varies smoothly along the trail', () => {
    for (let distance = 0; distance < 200; distance += 1) {
      const step = Math.abs(
        ribbonWidthNoise(distance + 1, 7, 24) - ribbonWidthNoise(distance, 7, 24),
      );
      expect(step).toBeLessThan(0.2);
    }
  });

  it('keeps straight-run samples on the centreline with a perpendicular normal', () => {
    const samples = buildPathRibbon(steps({ x: 0, y: 3 }, 1, 0, 8), CONFIG);

    expect(samples.length).toBeGreaterThan(8 / CONFIG.sampleSpacingCells);
    for (const sample of samples) {
      expect(sample.y).toBe(centre(3));
      expect(Math.abs(sample.normalX)).toBe(0);
      expect(Math.abs(sample.normalY)).toBe(1);
    }
  });

  it('gives a single-cell route one round cap and an empty route nothing', () => {
    expect(buildPathRibbon([{ x: 2, y: 2 }], CONFIG)).toHaveLength(1);
    expect(buildPathRibbon([], CONFIG)).toEqual([]);
  });
});
