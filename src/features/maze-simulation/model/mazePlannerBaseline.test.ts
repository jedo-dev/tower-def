import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../../entities/difficulty';
import { RaceId } from '../../../shared/types/content-ids';
import { simulateMazeBuildRounds, type MazeRouteCost } from './simulateMazeBuildRounds';

/**
 * Route cost bought per 100 gold spent by the old comb-skeleton planner
 * (tower-def-02k.2 baseline, hard, undead), at rounds 4, 8 and 12:
 * (small + large octile route cost - empty-board cost) / gold spent so far.
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

function totalCost(cost: MazeRouteCost): number {
  return (cost.small ?? 0) + (cost.large ?? 0);
}

describe('features/maze-simulation search planner vs comb baseline', () => {
  it.each(COMB_BASELINE_PER_100_GOLD)(
    'buys more route per gold than the comb on seed $seed',
    ({ seed, byRound }) => {
      const result = simulateMazeBuildRounds({
        rounds: 12,
        difficulty: Difficulty.HARD,
        raceId: RaceId.UNDEAD,
        seed,
      });
      const emptyCost = totalCost(result.initialRouteCost);

      for (const round of CHECKED_ROUNDS) {
        const report = result.rounds[round - 1];
        const spent = result.rounds
          .slice(0, round)
          .reduce((sum, played) => sum + played.spentGold, 0);
        const perHundredGold = ((totalCost(report.routeCost) - emptyCost) / spent) * GOLD_UNIT;

        expect(perHundredGold).toBeGreaterThan(byRound[round]);
      }
    },
  );
});
