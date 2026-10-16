import type { RaceId } from '../../../shared/types/content-ids';
import type { DuelSimulationResult, DuelWinner } from './simulateDuel';

// Talent development in a batch (tower-def-bge.6): how big and how developed
// each board ends, whether the winner is the side with fewer towers and
// higher grades, and how far each race climbs by the checkpoint rounds.

export enum DuelDevelopmentDefaults {
  /** Rounds whose top grade the development table reports. */
  EARLY_ROUND = 10,
  LATE_ROUND = 20,
  /** A side counts as developed once a tower passes grade 3. */
  DEVELOPED_GRADE = 4,
}

export type DuelSideDevelopment = {
  raceId: RaceId;
  endTowers: number;
  endTopGrade: number;
  /** Top grade after the early / late round; null when the match ended before it. */
  topGradeAtEarlyRound: number | null;
  topGradeAtLateRound: number | null;
  /** Branch ids the side picked over the match. */
  branchIds: readonly string[];
};

export type DuelMatchDevelopment = { a: DuelSideDevelopment; b: DuelSideDevelopment };

type SideKey = 'a' | 'b';

function topGradeAfterRound(
  result: DuelSimulationResult,
  side: SideKey,
  round: number,
): number | null {
  const report = result.rounds[round - 1];
  return report ? report[side].topGrade : null;
}

function describeSide(result: DuelSimulationResult, side: SideKey): DuelSideDevelopment {
  const last = result.rounds[result.rounds.length - 1];
  const duelist = side === 'a' ? result.finalState.player : result.finalState.opponent;
  return {
    raceId: side === 'a' ? result.config.sideA.raceId : result.config.sideB.raceId,
    endTowers: last ? last[side].towers : 0,
    endTopGrade: last ? last[side].topGrade : 0,
    topGradeAtEarlyRound: topGradeAfterRound(result, side, DuelDevelopmentDefaults.EARLY_ROUND),
    topGradeAtLateRound: topGradeAfterRound(result, side, DuelDevelopmentDefaults.LATE_ROUND),
    branchIds: Object.values(duelist.towerBranchChoices).filter(
      (branchId): branchId is NonNullable<typeof branchId> => branchId !== undefined,
    ),
  };
}

export function summarizeDevelopment(result: DuelSimulationResult): DuelMatchDevelopment {
  return { a: describeSide(result, 'a'), b: describeSide(result, 'b') };
}

export type DevelopmentMatch = { development: DuelMatchDevelopment; winner: DuelWinner };

/** Board size and grade at match end, per seat and for winners against losers. */
export type EndBoardStats = {
  averageTowersA: number;
  averageTowersB: number;
  averageTopGradeA: number;
  averageTopGradeB: number;
  /** Over decided matches only. */
  decided: number;
  winnerAverageTowers: number;
  loserAverageTowers: number;
  winnerAverageTopGrade: number;
  loserAverageTopGrade: number;
  /** Decided matches where one side had fewer towers and a higher top grade. */
  tallerSmallerBoards: number;
  /** ...and that side won. */
  tallerSmallerWins: number;
};

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isTallerSmaller(side: DuelSideDevelopment, other: DuelSideDevelopment): boolean {
  return side.endTowers < other.endTowers && side.endTopGrade > other.endTopGrade;
}

export function summarizeEndBoards(matches: readonly DevelopmentMatch[]): EndBoardStats | null {
  if (matches.length === 0) {
    return null;
  }
  const sides = matches.map((match) => match.development);
  const decided = matches.flatMap((match) => {
    if (match.winner === null) {
      return [];
    }
    const { a, b } = match.development;
    return [match.winner === 'A' ? { winner: a, loser: b } : { winner: b, loser: a }];
  });
  const tallerSmaller = decided.filter(
    ({ winner, loser }) => isTallerSmaller(winner, loser) || isTallerSmaller(loser, winner),
  );
  return {
    averageTowersA: average(sides.map((side) => side.a.endTowers)),
    averageTowersB: average(sides.map((side) => side.b.endTowers)),
    averageTopGradeA: average(sides.map((side) => side.a.endTopGrade)),
    averageTopGradeB: average(sides.map((side) => side.b.endTopGrade)),
    decided: decided.length,
    winnerAverageTowers: average(decided.map(({ winner }) => winner.endTowers)),
    loserAverageTowers: average(decided.map(({ loser }) => loser.endTowers)),
    winnerAverageTopGrade: average(decided.map(({ winner }) => winner.endTopGrade)),
    loserAverageTopGrade: average(decided.map(({ loser }) => loser.endTopGrade)),
    tallerSmallerBoards: tallerSmaller.length,
    tallerSmallerWins: tallerSmaller.filter(({ winner, loser }) => isTallerSmaller(winner, loser))
      .length,
  };
}

/** How one race develops over every side it played in the batch. */
export type RaceDevelopmentStats = {
  raceId: RaceId;
  sides: number;
  /** Sides still playing at the early / late round, and those developed by then. */
  reachedEarlyRound: number;
  developedByEarlyRound: number;
  averageTopGradeAtEarlyRound: number;
  reachedLateRound: number;
  developedByLateRound: number;
  averageTopGradeAtLateRound: number;
  /** Times each branch was picked, in first-seen order. */
  branchPicks: ReadonlyMap<string, number>;
};

function countBranches(sides: readonly DuelSideDevelopment[]): Map<string, number> {
  const picks = new Map<string, number>();
  for (const side of sides) {
    for (const branchId of side.branchIds) {
      picks.set(branchId, (picks.get(branchId) ?? 0) + 1);
    }
  }
  return picks;
}

function summarizeRace(
  raceId: RaceId,
  sides: readonly DuelSideDevelopment[],
): RaceDevelopmentStats {
  const early = sides.flatMap((side) =>
    side.topGradeAtEarlyRound === null ? [] : [side.topGradeAtEarlyRound],
  );
  const late = sides.flatMap((side) =>
    side.topGradeAtLateRound === null ? [] : [side.topGradeAtLateRound],
  );
  const developed = (grades: readonly number[]): number =>
    grades.filter((grade) => grade >= DuelDevelopmentDefaults.DEVELOPED_GRADE).length;
  return {
    raceId,
    sides: sides.length,
    reachedEarlyRound: early.length,
    developedByEarlyRound: developed(early),
    averageTopGradeAtEarlyRound: average(early),
    reachedLateRound: late.length,
    developedByLateRound: developed(late),
    averageTopGradeAtLateRound: average(late),
    branchPicks: countBranches(sides),
  };
}

/** One row per race that played, in first-seen order. */
export function summarizeRaceDevelopment(
  matches: readonly DevelopmentMatch[],
): RaceDevelopmentStats[] {
  const byRace = new Map<RaceId, DuelSideDevelopment[]>();
  for (const { development } of matches) {
    for (const side of [development.a, development.b]) {
      byRace.set(side.raceId, [...(byRace.get(side.raceId) ?? []), side]);
    }
  }
  return [...byRace.entries()].map(([raceId, sides]) => summarizeRace(raceId, sides));
}
