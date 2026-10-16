import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../../entities/difficulty';
import { RaceId } from '../../../shared/types/content-ids';
import { createSeedRange, summarizeBatch, type DuelMatchSummary } from './duelBatch';
import type { DuelSideDevelopment } from './duelBatchDevelopment';
import {
  createCrossDifficultyMatchups,
  summarizeCrossDifficulty,
} from './duelBatchCrossDifficulty';
import { parseDuelBatchArgs } from './parseDuelBatchArgs';
import type { DuelSideCreatureDevelopment } from './duelBatchCreatureDevelopment';

function side(raceId: RaceId): DuelSideDevelopment {
  return {
    raceId,
    endTowers: 20,
    endTopGrade: 3,
    topGradeAtEarlyRound: 3,
    topGradeAtLateRound: 3,
    branchIds: [],
    branchChoices: {},
  };
}

function creatureSide(raceId: RaceId): DuelSideCreatureDevelopment {
  return {
    raceId,
    xpSpent: 0,
    topCreatureGradeAtEarlyRound: 0,
    topCreatureGradeAtLateRound: 0,
    creatureBranchIds: [],
    sendLeaksCaused: 0,
    baselineLeaksSuffered: 0,
  };
}

function summary(winner: DuelMatchSummary['winner'], rounds: number): DuelMatchSummary {
  return {
    seed: 1,
    rounds,
    checkpointTowers: null,
    lateUnspent: { unspentGold: 0, income: 0, sideRounds: 0 },
    winner,
    endReason: 'lives',
    development: {
      a: side(RaceId.UNDEAD),
      b: side(RaceId.ORC),
    },
    creatureDevelopment: {
      a: creatureSide(RaceId.UNDEAD),
      b: creatureSide(RaceId.ORC),
    },
  };
}

describe('features/duel-simulation/duelBatchCrossDifficulty', () => {
  it('plays each difficulty on each race in each seat', () => {
    const matchups = createCrossDifficultyMatchups(
      [[Difficulty.HARD, Difficulty.NORMAL]],
      [[RaceId.ORC, RaceId.ELF]],
    );

    expect(matchups).toEqual([
      {
        sideA: { difficulty: Difficulty.HARD, raceId: RaceId.ORC },
        sideB: { difficulty: Difficulty.NORMAL, raceId: RaceId.ELF },
      },
      {
        sideA: { difficulty: Difficulty.HARD, raceId: RaceId.ELF },
        sideB: { difficulty: Difficulty.NORMAL, raceId: RaceId.ORC },
      },
      {
        sideA: { difficulty: Difficulty.NORMAL, raceId: RaceId.ORC },
        sideB: { difficulty: Difficulty.HARD, raceId: RaceId.ELF },
      },
      {
        sideA: { difficulty: Difficulty.NORMAL, raceId: RaceId.ELF },
        sideB: { difficulty: Difficulty.HARD, raceId: RaceId.ORC },
      },
    ]);
  });

  it('credits wins to the higher difficulty whatever its seat, a draw counting half', () => {
    const [lowerInA, , higherInA] = createCrossDifficultyMatchups(
      [[Difficulty.NORMAL, Difficulty.NIGHTMARE]],
      [[RaceId.ORC, RaceId.ELF]],
    );
    const equal = {
      sideA: { difficulty: Difficulty.EASY, raceId: RaceId.ORC },
      sideB: { difficulty: Difficulty.EASY, raceId: RaceId.ELF },
    };
    const results = [
      { matchup: lowerInA, summaries: [summary('A', 20), summary('B', 22)] },
      { matchup: higherInA, summaries: [summary('A', 24), summary(null, 30)] },
      { matchup: equal, summaries: [summary('A', 99)] },
    ];

    const cross = summarizeCrossDifficulty(
      results.map((result) => ({
        ...result,
        map: 'seeded' as const,
        stats: summarizeBatch(result.summaries),
      })),
    );

    expect(cross).toEqual([
      {
        higher: Difficulty.NIGHTMARE,
        lower: Difficulty.NORMAL,
        matches: 4,
        higherWins: 2,
        lowerWins: 1,
        draws: 1,
        higherScore: 2.5 / 4,
        medianRounds: 23,
      },
    ]);
  });

  it('parses --matchups into cross-difficulty matchups', () => {
    const parsed = parseDuelBatchArgs([
      '--seeds',
      '1-2',
      '--matchups',
      'hard:normal,easy:nightmare',
      '--pairs',
      'orc:elf',
    ]);

    expect(parsed.ok && parsed.config.seeds).toEqual(createSeedRange(1, 2));
    expect(parsed.ok && parsed.config.matchups).toEqual(
      createCrossDifficultyMatchups(
        [
          [Difficulty.HARD, Difficulty.NORMAL],
          [Difficulty.EASY, Difficulty.NIGHTMARE],
        ],
        [[RaceId.ORC, RaceId.ELF]],
      ),
    );
  });

  it('rejects malformed matchups and mixing them with --difficulties', () => {
    expect(parseDuelBatchArgs(['--matchups', 'hard']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--matchups', 'hard:hard']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--matchups', 'hard:brutal']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--matchups', 'hard:normal:easy']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--matchups', 'hard:normal', '--difficulties', 'easy']).ok).toBe(
      false,
    );
  });
});
