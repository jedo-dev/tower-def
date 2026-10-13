import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../../entities/difficulty';
import { getBuildableTowersByFaction } from '../../../entities/tower';
import { RaceId } from '../../../shared/types/content-ids';
import { simulateMazeBuildRounds, type MazeRouteCost } from './simulateMazeBuildRounds';

/**
 * Route cost bought per 100 gold of walls by the old comb-skeleton planner
 * (tower-def-02k.2 baseline, hard, undead), at rounds 4, 8 and 12:
 * (small + large octile route cost - empty-board cost) / wall gold so far.
 * The comb only ever built the cheapest tower, so its wall gold was all its
 * gold; the planner now also buys damage (pricier types on the blocks that
 * see the route most, upgrades), which buys no route and is not counted.
 */
const COMB_BASELINE_PER_100_GOLD: ReadonlyArray<{
  seed: number | null;
  byRound: Readonly<Record<4 | 8 | 12, number>>;
}> = [
  { seed: null, byRound: { 4: 2.45, 8: 4.53, 12: 4.45 } },
  { seed: 1, byRound: { 4: 2.33, 8: 4.44, 12: 6.45 } },
  { seed: 2, byRound: { 4: 2.9, 8: 4.86, 12: 6.23 } },
  { seed: 3, byRound: { 4: 3.96, 8: 5.64, 12: 6.91 } },
  { seed: 4, byRound: { 4: 4.04, 8: 4.1, 12: 5.34 } },
  { seed: 5, byRound: { 4: 2.69, 8: 4.2, 12: 4.51 } },
];

const CHECKED_ROUNDS = [4, 8, 12] as const;
const GOLD_UNIT = 100;
const RACE = RaceId.UNDEAD;
/** Every block priced as the cheapest tower: what walling it costs at least. */
const WALL_PRICE = Math.min(...getBuildableTowersByFaction(RACE).map((tower) => tower.costGold));

function totalCost(cost: MazeRouteCost): number {
  return (cost.small ?? 0) + (cost.large ?? 0);
}

describe('features/maze-simulation search planner vs comb baseline', () => {
  it.each(COMB_BASELINE_PER_100_GOLD)(
    'buys more route per wall gold than the comb on seed $seed',
    ({ seed, byRound }) => {
      const result = simulateMazeBuildRounds({
        rounds: 12,
        difficulty: Difficulty.HARD,
        raceId: RACE,
        seed,
      });
      const emptyCost = totalCost(result.initialRouteCost);

      for (const round of CHECKED_ROUNDS) {
        const report = result.rounds[round - 1];
        const wallGold = result.rounds
          .slice(0, round)
          .reduce((sum, played) => sum + played.builtCount * WALL_PRICE, 0);
        const perHundredGold = ((totalCost(report.routeCost) - emptyCost) / wallGold) * GOLD_UNIT;

        expect(perHundredGold).toBeGreaterThan(byRound[round]);
      }
    },
  );
});

/** Seeds whose endpoints once drew a useless edge-strip wall (tower-def-02k.8). */
const EDGE_STRIP_SEEDS = [4, 5] as const;
const SEED_RANGE = Array.from({ length: 10 }, (_, index) => index + 1);
const STRIP_CHECK_ROUND = 8;
/** Share of the seed-range median route cost those seeds must reach. */
const MIN_SHARE_OF_MEDIAN = 0.8;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

describe('features/maze-simulation search planner on edge-strip maps', () => {
  it('keeps seeds 4 and 5 within 20% of the seed 1-10 median route cost at round 8', () => {
    const costBySeed = new Map(
      SEED_RANGE.map((seed) => {
        const result = simulateMazeBuildRounds({
          rounds: STRIP_CHECK_ROUND,
          difficulty: Difficulty.HARD,
          raceId: RACE,
          seed,
        });
        return [seed, totalCost(result.rounds[STRIP_CHECK_ROUND - 1].routeCost)];
      }),
    );
    const medianCost = median([...costBySeed.values()]);

    for (const seed of EDGE_STRIP_SEEDS) {
      expect(costBySeed.get(seed), `seed ${seed}`).toBeGreaterThanOrEqual(
        medianCost * MIN_SHARE_OF_MEDIAN,
      );
    }
  });
});
