import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import {
  summarizeEndBoards,
  summarizeRaceDevelopment,
  type DevelopmentMatch,
  type DuelSideDevelopment,
} from './duelBatchDevelopment';
import { formatEndBoardLine, formatRaceDevelopment } from './formatDuelBatchDevelopment';

function side(overrides: Partial<DuelSideDevelopment>): DuelSideDevelopment {
  return {
    raceId: RaceId.UNDEAD,
    endTowers: 30,
    endTopGrade: 3,
    topGradeAtEarlyRound: 3,
    topGradeAtLateRound: 3,
    branchIds: [],
    branchChoices: {},
    ...overrides,
  };
}

const MATCHES: DevelopmentMatch[] = [
  {
    winner: 'A',
    development: {
      a: side({
        endTowers: 34,
        endTopGrade: 5,
        topGradeAtLateRound: 5,
        branchIds: ['x_a'],
        branchChoices: { x: 'x_a' },
      }),
      b: side({ raceId: RaceId.ORC, endTowers: 30, endTopGrade: 3 }),
    },
  },
  {
    winner: 'B',
    development: {
      a: side({
        endTowers: 20,
        endTopGrade: 7,
        topGradeAtEarlyRound: 4,
        branchIds: ['x_a'],
        branchChoices: { x: 'x_a' },
      }),
      b: side({ raceId: RaceId.ORC, endTowers: 30, endTopGrade: 3, topGradeAtLateRound: null }),
    },
  },
  {
    winner: null,
    development: {
      a: side({ endTowers: 10, endTopGrade: 3, branchIds: ['x_b'], branchChoices: { x: 'x_b' } }),
      b: side({ raceId: RaceId.ORC, endTowers: 10, endTopGrade: 3 }),
    },
  },
];

describe('features/duel-simulation/duelBatchDevelopment', () => {
  it('averages end boards per seat and compares winners with losers', () => {
    const stats = summarizeEndBoards(MATCHES);

    expect(stats).toEqual({
      averageTowersA: 64 / 3,
      averageTowersB: 70 / 3,
      averageTopGradeA: 5,
      averageTopGradeB: 3,
      decided: 2,
      winnerAverageTowers: 32,
      loserAverageTowers: 25,
      winnerAverageTopGrade: 4,
      loserAverageTopGrade: 5,
      tallerSmallerBoards: 1,
      tallerSmallerWins: 0,
    });
    expect(summarizeEndBoards([])).toBeNull();
    expect(formatEndBoardLine(stats)).toContain('fewer towers + higher grade won 0 of 1');
  });

  it('counts developed sides by the checkpoint rounds and branch picks per race', () => {
    const [undead, orc] = summarizeRaceDevelopment(MATCHES);

    expect(undead).toMatchObject({
      raceId: RaceId.UNDEAD,
      sides: 3,
      reachedEarlyRound: 3,
      developedByEarlyRound: 1,
      reachedLateRound: 3,
      developedByLateRound: 1,
    });
    expect([...undead.branchPicks.entries()]).toEqual([
      ['x_a', 2],
      ['x_b', 1],
    ]);
    expect(orc).toMatchObject({ sides: 3, reachedLateRound: 2, developedByLateRound: 0 });
    const lines = formatRaceDevelopment([undead, orc]);
    expect(lines[1]).toBe('  UNDEAD (3 sides): r10 1/3 (avg 3.3), r20 1/3 (avg 3.7); x_a 2, x_b 1');
    expect(lines[2]).toBe('    x: x_a 2/3 (67%), x_b 1/3 (33%)');
    expect(lines[3]).toContain('; none');
    expect(lines).toHaveLength(4);
  });
});
