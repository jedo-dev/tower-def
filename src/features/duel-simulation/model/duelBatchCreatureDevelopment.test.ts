import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import {
  computeCreatureXpSpent,
  formatRaceCreatureDevelopment,
  summarizeRaceCreatureDevelopment,
  type DuelSideCreatureDevelopment,
} from './duelBatchCreatureDevelopment';

function side(
  raceId: RaceId,
  overrides: Partial<DuelSideCreatureDevelopment> = {},
): DuelSideCreatureDevelopment {
  return {
    raceId,
    xpSpent: 0,
    topCreatureGradeAtEarlyRound: 0,
    topCreatureGradeAtLateRound: null,
    creatureBranchIds: [],
    sendLeaksCaused: 0,
    baselineLeaksSuffered: 0,
    ...overrides,
  };
}

describe('features/duel-simulation/duelBatchCreatureDevelopment', () => {
  it('prices a branch and its bought grades by the creature tier', () => {
    // Skeleton is tier 1: branch 4, grades 6 + 10.
    expect(
      computeCreatureXpSpent(
        { undead_skeleton: 'undead_skeleton_bone_legion' },
        { undead_skeleton: 2 },
      ),
    ).toBe(20);
    expect(computeCreatureXpSpent({}, {})).toBe(0);
  });

  it('averages each race over its sides and counts its creature branch picks', () => {
    const rows = summarizeRaceCreatureDevelopment([
      {
        a: side(RaceId.ORC, {
          xpSpent: 30,
          topCreatureGradeAtEarlyRound: 1,
          topCreatureGradeAtLateRound: 3,
          creatureBranchIds: ['orc_grunt_rage'],
          sendLeaksCaused: 2,
          baselineLeaksSuffered: 10,
        }),
        b: side(RaceId.ELF, { xpSpent: 10 }),
      },
      {
        a: side(RaceId.ORC, {
          xpSpent: 50,
          topCreatureGradeAtEarlyRound: 2,
          creatureBranchIds: ['orc_grunt_rage'],
          baselineLeaksSuffered: 6,
        }),
        b: side(RaceId.ELF),
      },
    ]);

    const orc = rows.find((row) => row.raceId === RaceId.ORC);
    expect(orc).toMatchObject({
      sides: 2,
      averageXpSpent: 40,
      reachedEarlyRound: 2,
      averageCreatureGradeAtEarlyRound: 1.5,
      reachedLateRound: 1,
      averageCreatureGradeAtLateRound: 3,
      averageSendLeaksCaused: 1,
      averageBaselineLeaksSuffered: 8,
    });
    expect(orc?.creatureBranchPicks.get('orc_grunt_rage')).toBe(2);
    expect(formatRaceCreatureDevelopment(rows)[1]).toBe(
      `  ${RaceId.ORC} (2 sides): xp 40, grade 1.5 / 3.0, leaks 1.0 sent / 8.0 baseline; orc_grunt_rage 2`,
    );
  });
});
