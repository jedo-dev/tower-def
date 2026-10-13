import { Difficulty } from '../../../entities/difficulty';
import type { RaceId } from '../../../shared/types/content-ids';
import { median, type DuelBatchMatchup, type DuelBatchMatchupResult } from './duelBatch';

// Cross-difficulty duels: which preset is stronger. Each difficulty pair
// plays every race pair four ways (each difficulty on each race, in each
// seat), so race and seat imbalance cancel out of the win rate.

/** Two difficulties to play against each other, e.g. hard against normal. */
export type DifficultyMatchup = readonly [Difficulty, Difficulty];

/** One difficulty pair over every match it played; the stronger preset is `higher`. */
export type CrossDifficultyStats = {
  higher: Difficulty;
  lower: Difficulty;
  matches: number;
  higherWins: number;
  lowerWins: number;
  draws: number;
  /** Share of points the higher difficulty took, a draw counting half: 0..1. */
  higherScore: number;
  medianRounds: number;
};

const DIFFICULTY_ORDER: readonly Difficulty[] = Object.values(Difficulty);

function rankOf(difficulty: Difficulty): number {
  return DIFFICULTY_ORDER.indexOf(difficulty);
}

/**
 * Every difficulty pair against every race pair, four ways: the first
 * difficulty on the first race and on the second, each in seat A and seat B.
 */
export function createCrossDifficultyMatchups(
  difficultyMatchups: readonly DifficultyMatchup[],
  racePairs: readonly (readonly [RaceId, RaceId])[],
): DuelBatchMatchup[] {
  return difficultyMatchups.flatMap(([first, second]) =>
    racePairs.flatMap(([raceA, raceB]) => [
      { sideA: { difficulty: first, raceId: raceA }, sideB: { difficulty: second, raceId: raceB } },
      { sideA: { difficulty: first, raceId: raceB }, sideB: { difficulty: second, raceId: raceA } },
      { sideA: { difficulty: second, raceId: raceA }, sideB: { difficulty: first, raceId: raceB } },
      { sideA: { difficulty: second, raceId: raceB }, sideB: { difficulty: first, raceId: raceA } },
    ]),
  );
}

type CrossTally = {
  higher: Difficulty;
  lower: Difficulty;
  higherWins: number;
  lowerWins: number;
  draws: number;
  rounds: number[];
};

function tallyMatchup(tally: CrossTally, result: DuelBatchMatchupResult): void {
  const higherSeat = result.matchup.sideA.difficulty === tally.higher ? 'A' : 'B';
  for (const summary of result.summaries) {
    tally.rounds.push(summary.rounds);
    if (summary.winner === null) {
      tally.draws += 1;
    } else if (summary.winner === higherSeat) {
      tally.higherWins += 1;
    } else {
      tally.lowerWins += 1;
    }
  }
}

/**
 * Win rates of every difficulty pair that met in the batch, in the order the
 * pairs first appear. Equal-difficulty matchups are skipped.
 */
export function summarizeCrossDifficulty(
  results: readonly DuelBatchMatchupResult[],
): CrossDifficultyStats[] {
  const tallies = new Map<string, CrossTally>();
  for (const result of results) {
    const { sideA, sideB } = result.matchup;
    if (sideA.difficulty === sideB.difficulty) {
      continue;
    }
    const isAHigher = rankOf(sideA.difficulty) > rankOf(sideB.difficulty);
    const higher = isAHigher ? sideA.difficulty : sideB.difficulty;
    const lower = isAHigher ? sideB.difficulty : sideA.difficulty;
    const key = `${higher}:${lower}`;
    const tally = tallies.get(key) ?? {
      higher,
      lower,
      higherWins: 0,
      lowerWins: 0,
      draws: 0,
      rounds: [],
    };
    tallies.set(key, tally);
    tallyMatchup(tally, result);
  }

  return [...tallies.values()].map((tally) => {
    const matches = tally.rounds.length;
    return {
      higher: tally.higher,
      lower: tally.lower,
      matches,
      higherWins: tally.higherWins,
      lowerWins: tally.lowerWins,
      draws: tally.draws,
      higherScore: matches === 0 ? 0 : (tally.higherWins + tally.draws / 2) / matches,
      medianRounds: matches === 0 ? 0 : median(tally.rounds),
    };
  });
}
