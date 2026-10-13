import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { withFootprintOccupancy } from '../../../../shared/lib/grid/footprint';
import { generateEdgeEndpoints } from '../../../../shared/lib/grid/generateEdgeEndpoints';
import { canPlaceFootprint } from '../../../../shared/lib/pathfinding/validateFootprintPlacement';
import { RaceId } from '../../../../shared/types/content-ids';
import type { GridModel, GridPoint } from '../../../../shared/types/grid';
import { createInitialDuelMatchState } from '../../../duel-match';
import { createMazeEvaluator, type MazeEvaluator } from './createMazeEvaluator';

const SEEDS: readonly (number | null)[] = [null, 3];

/** Rows of wall blocks across the field; the evaluator keeps a gap open where it must. */
const WALL_ROWS: readonly number[] = [5, 11, 17, 23];

function createBoard(seed: number | null): GridModel {
  const endpoints = seed === null ? undefined : generateEdgeEndpoints(seed);
  return createInitialDuelMatchState(RaceId.UNDEAD, RaceId.UNDEAD, endpoints).opponent.battlefield
    .grid;
}

function forEachAnchor(grid: GridModel, visit: (anchor: GridPoint) => void): void {
  for (let y = 0; y + TOWER_FOOTPRINT.height <= grid.rows; y += 1) {
    for (let x = 0; x + TOWER_FOOTPRINT.width <= grid.cols; x += 1) {
      visit({ x, y });
    }
  }
}

/** Grows walls one legal block at a time on both the evaluator and a plain grid. */
function growWalls(grid: GridModel, evaluator: MazeEvaluator, check: (grid: GridModel) => void) {
  let grown = grid;
  for (const y of WALL_ROWS) {
    for (let x = 0; x + TOWER_FOOTPRINT.width <= grid.cols; x += TOWER_FOOTPRINT.width) {
      const anchor = { x, y };
      if (!evaluator.probePlacement(anchor).valid) {
        continue;
      }
      evaluator.place(anchor);
      grown = withFootprintOccupancy(grown, anchor, TOWER_FOOTPRINT, true);
      check(grown);
    }
  }
  return grown;
}

function expectSameRouteCosts(evaluator: MazeEvaluator, fresh: MazeEvaluator): void {
  expect(evaluator.routes.smallRouteCost).toBeCloseTo(fresh.routes.smallRouteCost ?? -1, 9);
  expect(evaluator.routes.largeRouteCost).toBeCloseTo(fresh.routes.largeRouteCost ?? -1, 9);
}

describe('createMazeEvaluator incremental placement', () => {
  it('matches a fresh evaluator after every placed block', () => {
    for (const seed of SEEDS) {
      const grid = createBoard(seed);
      const evaluator = createMazeEvaluator(grid, grid.entrance, grid.exit);
      let placedCount = 0;
      const grown = growWalls(grid, evaluator, (current) => {
        placedCount += 1;
        expectSameRouteCosts(evaluator, createMazeEvaluator(current, grid.entrance, grid.exit));
      });

      // Every probe on the grown board agrees with a fresh evaluator.
      const fresh = createMazeEvaluator(grown, grid.entrance, grid.exit);
      forEachAnchor(grid, (anchor) => {
        const actual = evaluator.routeGainForPlacement(anchor);
        const expected = fresh.routeGainForPlacement(anchor);
        expect(actual.valid, `seed ${seed} @ ${anchor.x},${anchor.y}`).toBe(expected.valid);
        expect(actual.smallGain).toBeCloseTo(expected.smallGain, 9);
        expect(actual.largeGain).toBeCloseTo(expected.largeGain, 9);
      });
      expect(placedCount).toBeGreaterThan(20);
    }
  });

  it('rejects blocks over towers it placed itself', () => {
    const grid = createBoard(null);
    const evaluator = createMazeEvaluator(grid, grid.entrance, grid.exit);
    evaluator.place({ x: 6, y: 6 });

    expect(evaluator.probePlacement({ x: 6, y: 6 }).valid).toBe(false);
    expect(evaluator.probeSmallRoute({ x: 7, y: 7 }).valid).toBe(false);
    expect(evaluator.keepsLargeRouteOpen({ x: 5, y: 5 })).toBe(false);
    expect(evaluator.probePlacement({ x: 8, y: 6 }).valid).toBe(true);
  });

  it('splits a full probe into its small-route probe and the large-route check', () => {
    for (const seed of SEEDS) {
      const grid = createBoard(seed);
      const evaluator = createMazeEvaluator(grid, grid.entrance, grid.exit);
      const grown = growWalls(grid, evaluator, () => undefined);
      let largeOnlyRejections = 0;

      forEachAnchor(grid, (anchor) => {
        const full = evaluator.probePlacement(anchor);
        const small = evaluator.probeSmallRoute(anchor);
        const largeOpen = evaluator.keepsLargeRouteOpen(anchor);
        const label = `seed ${seed} @ ${anchor.x},${anchor.y}`;

        expect(full.valid, label).toBe(small.valid && largeOpen);
        expect(full.valid, label).toBe(canPlaceFootprint(grown, anchor, TOWER_FOOTPRINT));
        if (full.valid) {
          expect(small.smallGain).toBe(full.smallGain);
          expect(small.smallRoute).toEqual(full.smallRoute);
          expect(small.largeGain).toBe(0);
        }
        if (!small.valid) {
          expect(small.smallRoute).toBeNull();
        }
        if (!evaluator.touchesSmallRoute(anchor) && small.valid) {
          expect(small.smallGain).toBe(0);
        }
        largeOnlyRejections += small.valid && !largeOpen ? 1 : 0;
      });
      expect(largeOnlyRejections, `seed ${seed}`).toBeGreaterThan(0);
    }
  });

  it('costs no route search for a block off both routes', () => {
    const grid = createBoard(null);
    const evaluator = createMazeEvaluator(grid, grid.entrance, grid.exit);
    const smallRoute = evaluator.routes.smallRoute;
    const before = evaluator.expandedNodeCount;
    // The default board's route runs along the middle rows; the top corner is far off it.
    evaluator.place({ x: 0, y: 0 });

    expect(evaluator.touchesSmallRoute({ x: 0, y: 0 })).toBe(false);
    expect(evaluator.expandedNodeCount).toBe(before);
    expect(evaluator.routes.smallRoute).toBe(smallRoute);
  });
});
