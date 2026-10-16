import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../../entities/difficulty';
import { RaceId } from '../../../shared/types/content-ids';
import {
  createEqualMatchups,
  createSeedRange,
  DEFAULT_DUEL_BATCH_CONFIG,
  median,
  runDuelBatch,
  summarizeBatch,
  type DuelBatchConfig,
  type DuelMatchSummary,
} from './duelBatch';
import type { DuelSideDevelopment } from './duelBatchDevelopment';
import { formatDuelBatch } from './formatDuelBatch';
import { parseDuelBatchArgs } from './parseDuelBatchArgs';

/** Full batch runs several duels; under full-suite load it can exceed the 5s default. */
const BATCH_RUN_TIMEOUT_MS = 30_000;

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

function summary(overrides: Partial<DuelMatchSummary>): DuelMatchSummary {
  return {
    seed: 1,
    rounds: 20,
    checkpointTowers: { a: 10, b: 12 },
    lateUnspent: { unspentGold: 0, income: 0, sideRounds: 0 },
    winner: 'A',
    endReason: 'lives',
    development: {
      a: side(RaceId.UNDEAD),
      b: side(RaceId.ORC),
    },
    ...overrides,
  };
}

describe('features/duel-simulation/duelBatch', () => {
  it('takes the median, averaging the middle pair of an even list', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('pairs every difficulty with every race pair, both sides equal', () => {
    const matchups = createEqualMatchups(
      [Difficulty.NORMAL, Difficulty.HARD],
      [[RaceId.ORC, RaceId.ELF]],
    );

    expect(matchups).toEqual([
      {
        sideA: { difficulty: Difficulty.NORMAL, raceId: RaceId.ORC },
        sideB: { difficulty: Difficulty.NORMAL, raceId: RaceId.ELF },
      },
      {
        sideA: { difficulty: Difficulty.HARD, raceId: RaceId.ORC },
        sideB: { difficulty: Difficulty.HARD, raceId: RaceId.ELF },
      },
    ]);
  });

  it('counts lengths, checkpoint towers per side, winners, draws and round caps', () => {
    const stats = summarizeBatch([
      summary({ rounds: 10, checkpointTowers: { a: 9, b: 14 } }),
      summary({ rounds: 30, winner: 'B', checkpointTowers: { a: 11, b: 12 } }),
      summary({ rounds: 40, winner: null, endReason: 'max_rounds' }),
      summary({ rounds: 4, winner: null, checkpointTowers: null }),
    ]);

    expect(stats).toMatchObject({
      matches: 4,
      medianRounds: 20,
      minRounds: 4,
      maxRounds: 40,
      checkpointTowers: { medianA: 10, medianB: 12, min: 9, max: 14 },
      endedBeforeCheckpoint: 1,
      winsA: 1,
      winsB: 1,
      draws: 2,
      roundCaps: 1,
      lateUnspent: null,
    });
  });

  it('averages late-game unspent gold and income per side-round', () => {
    const stats = summarizeBatch([
      summary({ lateUnspent: { unspentGold: 300, income: 1000, sideRounds: 4 } }),
      summary({ lateUnspent: { unspentGold: 100, income: 600, sideRounds: 2 } }),
      summary({ rounds: 12 }),
    ]);

    expect(stats.lateUnspent).toEqual({ averageUnspentGold: 400 / 6, averageIncome: 1600 / 6 });
  });

  it(
    'plays every matchup on every map and seed and prints one row each plus the matches',
    () => {
      const config: DuelBatchConfig = {
        ...DEFAULT_DUEL_BATCH_CONFIG,
        seeds: createSeedRange(1, 2),
        maps: ['classic', 'seeded'],
        maxRounds: 6,
        matchups: createEqualMatchups([Difficulty.NORMAL], [[RaceId.UNDEAD, RaceId.ORC]]),
      };
      const result = runDuelBatch(config);
      const report = formatDuelBatch(result);

      expect(result.matchups.map((matchup) => matchup.map)).toEqual(['classic', 'seeded']);
      expect(result.matchups[0].summaries.map((match) => match.seed)).toEqual([1, 2]);
      expect(result.overall.matches).toBe(4);
      expect(report).toContain('maps classic,seeded');
      expect(report).toContain('classic UNDEAD NORMAL vs ORC NORMAL | 2');
      expect(report).toMatch(/seeded UNDEAD NORMAL vs ORC NORMAL +\| 2/);
      expect(report).toContain('overall');
      expect(report).toContain('unspent/income r16+');
      expect(report).toContain('end towers A/B');
      expect(report).toContain('end boards (');
      expect(report).toMatch(/ {2}UNDEAD \(4 sides\): r10 /);
      expect(report).toMatch(/classic UNDEAD NORMAL vs ORC NORMAL: 1:\d+[AB=] 2:\d+[AB=]/);
      expect(formatDuelBatch(runDuelBatch(config))).toBe(report);
    },
    BATCH_RUN_TIMEOUT_MS,
  );
});

describe('features/duel-simulation/parseDuelBatchArgs', () => {
  it('falls back to the default batch without arguments', () => {
    expect(parseDuelBatchArgs([])).toEqual({ ok: true, config: DEFAULT_DUEL_BATCH_CONFIG });
  });

  it('reads seed ranges and lists, difficulties, race pairs and the round limit', () => {
    const parsed = parseDuelBatchArgs([
      '--seeds',
      '3-5',
      '--difficulties',
      'easy,nightmare',
      '--pairs',
      'human:orc',
      '--max-rounds',
      '12',
      '--baseline-race',
      'elf',
      '--maps',
      'classic',
    ]);

    expect(parsed.ok && parsed.config).toEqual({
      seeds: [3, 4, 5],
      maps: ['classic'],
      maxRounds: 12,
      baselineRaceId: RaceId.ELF,
      matchups: createEqualMatchups(
        [Difficulty.EASY, Difficulty.NIGHTMARE],
        [[RaceId.HUMAN, RaceId.ORC]],
      ),
    });
    expect(parseDuelBatchArgs(['--seeds', '1,4,9']).ok && true).toBe(true);
  });

  it('rejects bad seeds, unknown names, malformed pairs and a missing value', () => {
    expect(parseDuelBatchArgs(['--seeds', '9-2']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--seeds', 'a']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--difficulties', 'brutal']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--pairs', 'orc']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--pairs', 'orc:dwarf']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--max-rounds', '0']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--speed', '2']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--seeds']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--maps', 'random']).ok).toBe(false);
    expect(parseDuelBatchArgs(['--maps', 'classic,classic']).ok).toBe(false);
  });
});
