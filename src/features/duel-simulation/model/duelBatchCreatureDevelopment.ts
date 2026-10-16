import {
  getCreatureBranchCost,
  getNextCreatureGradeCost,
  resolveUnitConfigById,
  type CreatureGrade,
  type UnitId,
} from '../../../entities/unit';
import type { RaceId } from '../../../shared/types/content-ids';
import { DuelDevelopmentDefaults } from './duelBatchDevelopment';
import type { DuelSimulationResult } from './simulateDuel';

// Creature talent development in a batch (tower-def-716.6): how much creature
// experience each race spends, how far its creatures climb by the checkpoint
// rounds, which creature branches it picks, and whether its sends or the
// shared baseline wave take the lives.

export type DuelSideCreatureDevelopment = {
  raceId: RaceId;
  /** Experience spent on branches and grades over the match, all tiers. */
  xpSpent: number;
  /** Top creature grade after the early / late round; null when the match ended before it. */
  topCreatureGradeAtEarlyRound: number | null;
  topCreatureGradeAtLateRound: number | null;
  creatureBranchIds: readonly string[];
  /** Leaks this side's sends caused on the other field over the match. */
  sendLeaksCaused: number;
  /** Baseline (unsent) creeps that leaked on this side's own field. */
  baselineLeaksSuffered: number;
};

export type DuelMatchCreatureDevelopment = {
  a: DuelSideCreatureDevelopment;
  b: DuelSideCreatureDevelopment;
};

type SideKey = 'a' | 'b';

/** Experience the chosen branches and their bought grades cost. */
export function computeCreatureXpSpent(
  branchChoices: Readonly<Partial<Record<UnitId, string>>>,
  grades: Readonly<Partial<Record<UnitId, CreatureGrade>>>,
): number {
  let spent = 0;
  for (const unitId of Object.keys(branchChoices) as UnitId[]) {
    const { tier } = resolveUnitConfigById(unitId);
    spent += getCreatureBranchCost(tier);
    const grade = grades[unitId] ?? 0;
    for (let bought = 0; bought < grade; bought += 1) {
      spent += getNextCreatureGradeCost(tier, bought as CreatureGrade) ?? 0;
    }
  }
  return spent;
}

function topCreatureGradeAfterRound(
  result: DuelSimulationResult,
  side: SideKey,
  round: number,
): number | null {
  const report = result.rounds[round - 1];
  return report ? report[side].topCreatureGrade : null;
}

function describeSide(result: DuelSimulationResult, side: SideKey): DuelSideCreatureDevelopment {
  const other: SideKey = side === 'a' ? 'b' : 'a';
  const duelist = side === 'a' ? result.finalState.player : result.finalState.opponent;
  const branchIds = Object.values(duelist.creatureBranchChoices).flatMap((branchId) =>
    branchId === undefined ? [] : [branchId],
  );
  return {
    raceId: side === 'a' ? result.config.sideA.raceId : result.config.sideB.raceId,
    xpSpent: computeCreatureXpSpent(duelist.creatureBranchChoices, duelist.creatureGrades),
    topCreatureGradeAtEarlyRound: topCreatureGradeAfterRound(
      result,
      side,
      DuelDevelopmentDefaults.EARLY_ROUND,
    ),
    topCreatureGradeAtLateRound: topCreatureGradeAfterRound(
      result,
      side,
      DuelDevelopmentDefaults.LATE_ROUND,
    ),
    creatureBranchIds: branchIds,
    sendLeaksCaused: result.rounds.reduce((sum, round) => sum + round[other].sentLeaks, 0),
    baselineLeaksSuffered: result.rounds.reduce(
      (sum, round) => sum + round[side].leaks - round[side].sentLeaks,
      0,
    ),
  };
}

export function summarizeCreatureDevelopment(
  result: DuelSimulationResult,
): DuelMatchCreatureDevelopment {
  return { a: describeSide(result, 'a'), b: describeSide(result, 'b') };
}

/** How one race develops its creatures over every side it played in the batch. */
export type RaceCreatureDevelopmentStats = {
  raceId: RaceId;
  sides: number;
  averageXpSpent: number;
  reachedEarlyRound: number;
  averageCreatureGradeAtEarlyRound: number;
  reachedLateRound: number;
  averageCreatureGradeAtLateRound: number;
  averageSendLeaksCaused: number;
  averageBaselineLeaksSuffered: number;
  /** Times each creature branch was picked. */
  creatureBranchPicks: ReadonlyMap<string, number>;
};

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeRace(
  raceId: RaceId,
  sides: readonly DuelSideCreatureDevelopment[],
): RaceCreatureDevelopmentStats {
  const early = sides.flatMap((side) =>
    side.topCreatureGradeAtEarlyRound === null ? [] : [side.topCreatureGradeAtEarlyRound],
  );
  const late = sides.flatMap((side) =>
    side.topCreatureGradeAtLateRound === null ? [] : [side.topCreatureGradeAtLateRound],
  );
  const picks = new Map<string, number>();
  for (const side of sides) {
    for (const branchId of side.creatureBranchIds) {
      picks.set(branchId, (picks.get(branchId) ?? 0) + 1);
    }
  }
  return {
    raceId,
    sides: sides.length,
    averageXpSpent: average(sides.map((side) => side.xpSpent)),
    reachedEarlyRound: early.length,
    averageCreatureGradeAtEarlyRound: average(early),
    reachedLateRound: late.length,
    averageCreatureGradeAtLateRound: average(late),
    averageSendLeaksCaused: average(sides.map((side) => side.sendLeaksCaused)),
    averageBaselineLeaksSuffered: average(sides.map((side) => side.baselineLeaksSuffered)),
    creatureBranchPicks: picks,
  };
}

/** One row per race that played, in first-seen order. */
export function summarizeRaceCreatureDevelopment(
  matches: readonly DuelMatchCreatureDevelopment[],
): RaceCreatureDevelopmentStats[] {
  const byRace = new Map<RaceId, DuelSideCreatureDevelopment[]>();
  for (const match of matches) {
    for (const side of [match.a, match.b]) {
      byRace.set(side.raceId, [...(byRace.get(side.raceId) ?? []), side]);
    }
  }
  return [...byRace.entries()].map(([raceId, sides]) => summarizeRace(raceId, sides));
}

function formatPicks(picks: ReadonlyMap<string, number>): string {
  if (picks.size === 0) {
    return 'none';
  }
  return [...picks.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([branchId, count]) => `${branchId} ${count}`)
    .join(', ');
}

function formatGrade(reached: number, averageGrade: number): string {
  return reached === 0 ? 'n/a' : averageGrade.toFixed(1);
}

/** One line per race: experience spent, creature grades, leaks, then creature branch picks. */
export function formatRaceCreatureDevelopment(
  rows: readonly RaceCreatureDevelopmentStats[],
): string[] {
  const { EARLY_ROUND, LATE_ROUND } = DuelDevelopmentDefaults;
  return [
    `creatures (average xp spent, top creature grade at round ${EARLY_ROUND} / ${LATE_ROUND}, ` +
      'leaks its sends caused / baseline leaks it suffered per side; creature branch picks):',
    ...rows.map(
      (row) =>
        `  ${row.raceId} (${row.sides} sides): xp ${row.averageXpSpent.toFixed(0)}, grade ` +
        `${formatGrade(row.reachedEarlyRound, row.averageCreatureGradeAtEarlyRound)} / ` +
        `${formatGrade(row.reachedLateRound, row.averageCreatureGradeAtLateRound)}, leaks ` +
        `${row.averageSendLeaksCaused.toFixed(1)} sent / ` +
        `${row.averageBaselineLeaksSuffered.toFixed(1)} baseline; ` +
        formatPicks(row.creatureBranchPicks),
    ),
  ];
}
