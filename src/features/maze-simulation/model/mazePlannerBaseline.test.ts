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
