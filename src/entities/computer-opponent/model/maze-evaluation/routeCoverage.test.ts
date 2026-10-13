import { describe, expect, it } from 'vitest';
import type { GridPoint } from '../../../../shared/types/grid';
import { MAZE_COVERAGE_WEIGHTS, MAZE_ROUTE_GAIN_WEIGHTS } from './constants';
import { gainPerGold } from './gainPerGold';
import { computeTowerRouteCoverage, countRouteSamplesInRange } from './routeCoverage';
import type { MazeTower } from './types';

function horizontalLeg(fromX: number, toX: number, y: number): GridPoint[] {
  const step = fromX <= toX ? 1 : -1;
  const leg: GridPoint[] = [];
  for (let x = fromX; x !== toX + step; x += step) leg.push({ x, y });
  return leg;
}

// Right along row 0, down column 4, back left along row 2.
const U_TURN_ROUTE: GridPoint[] = [
  ...horizontalLeg(0, 4, 0),
  { x: 4, y: 1 },
  ...horizontalLeg(4, 0, 2),
];

// Centre (2, 1.5): reaches cells 1-2 of row 0 and of row 2 within range 1.2.
const TOWER: MazeTower = { anchor: { x: 1, y: 0 }, footprint: { width: 2, height: 3 }, range: 1.2 };

describe('countRouteSamplesInRange', () => {
  it('counts each pass of a U-turn separately', () => {
    const oneLeg = countRouteSamplesInRange(horizontalLeg(0, 4, 0), 1, 2, 1.5, 1.2);

    expect(oneLeg).toBe(2);
    expect(countRouteSamplesInRange(U_TURN_ROUTE, 1, 2, 1.5, 1.2)).toBe(2 * oneLeg);
  });

  it('measures large agents from their 2x2 centre and includes the range boundary', () => {
    expect(countRouteSamplesInRange([{ x: 0, y: 0 }], 2, 3, 1, 2)).toBe(1);
    expect(countRouteSamplesInRange([{ x: 0, y: 0 }], 2, 3.01, 1, 2)).toBe(0);
  });

  it('returns 0 for a missing route or negative range', () => {
    expect(countRouteSamplesInRange(null, 1, 0, 0, 5)).toBe(0);
    expect(countRouteSamplesInRange(U_TURN_ROUTE, 1, 0, 0, -1)).toBe(0);
  });
});

describe('computeTowerRouteCoverage', () => {
  it('combines per-route coverage with the coverage weights', () => {
    const coverage = computeTowerRouteCoverage(TOWER, U_TURN_ROUTE, [{ x: 1, y: 0 }]);

    expect(coverage.small).toBe(4);
    expect(coverage.large).toBe(1);
    expect(coverage.combined).toBe(MAZE_COVERAGE_WEIGHTS.small * 4 + MAZE_COVERAGE_WEIGHTS.large);
    expect(computeTowerRouteCoverage(TOWER, U_TURN_ROUTE, null, { small: 0.5, large: 3 })).toEqual({
      small: 4,
      large: 0,
      combined: 2,
    });
  });
});

describe('gainPerGold', () => {
  it('divides the weighted route gain by the tower cost', () => {
    const gain = { valid: true, smallGain: 4, largeGain: 2 };
    const weighted = MAZE_ROUTE_GAIN_WEIGHTS.small * 4 + MAZE_ROUTE_GAIN_WEIGHTS.large * 2;

    expect(gainPerGold(gain, 10)).toBeCloseTo(weighted / 10, 12);
    expect(gainPerGold(gain, 10, { small: 1, large: 3 })).toBeCloseTo(1, 12);
  });

  it('scores invalid placements and non-positive costs as 0', () => {
    expect(gainPerGold({ valid: false, smallGain: 4, largeGain: 2 }, 10)).toBe(0);
    expect(gainPerGold({ valid: true, smallGain: 4, largeGain: 2 }, 0)).toBe(0);
    expect(gainPerGold({ valid: true, smallGain: 4, largeGain: 2 }, Number.NaN)).toBe(0);
  });
});
