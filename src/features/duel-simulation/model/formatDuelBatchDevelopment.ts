import type { TowerBranchShare } from './duelBatchBranchShares';
import {
  DuelDevelopmentDefaults,
  type EndBoardStats,
  type RaceDevelopmentStats,
} from './duelBatchDevelopment';

const DECIMALS = 1;

function formatAverage(value: number): string {
  return value.toFixed(DECIMALS);
}

/** Average towers per seat at match end, e.g. `31.2/29.8`. */
export function formatEndTowers(endBoards: EndBoardStats | null): string {
  return endBoards === null
    ? 'n/a'
    : `${formatAverage(endBoards.averageTowersA)}/${formatAverage(endBoards.averageTowersB)}`;
}

/** Average top grade per seat at match end, e.g. `5.1/4.6`. */
export function formatEndTopGrade(endBoards: EndBoardStats | null): string {
  return endBoards === null
    ? 'n/a'
    : `${formatAverage(endBoards.averageTopGradeA)}/${formatAverage(endBoards.averageTopGradeB)}`;
}

/**
 * Winners against losers at match end, and how often the side with fewer towers
 * and a higher top grade won: the talents-versus-mazing check.
 */
export function formatEndBoardLine(endBoards: EndBoardStats | null): string {
  if (endBoards === null || endBoards.decided === 0) {
    return 'end boards: no decided matches';
  }
  const ratio = endBoards.winnerAverageTowers / Math.max(1, endBoards.loserAverageTowers);
  return (
    `end boards (${endBoards.decided} decided): winner ` +
    `${formatAverage(endBoards.winnerAverageTowers)} towers / grade ` +
    `${formatAverage(endBoards.winnerAverageTopGrade)}, loser ` +
    `${formatAverage(endBoards.loserAverageTowers)} / ` +
    `${formatAverage(endBoards.loserAverageTopGrade)} (towers ratio ${ratio.toFixed(2)}); ` +
    `fewer towers + higher grade won ${endBoards.tallerSmallerWins} of ` +
    `${endBoards.tallerSmallerBoards}`
  );
}

function formatDeveloped(developed: number, reached: number, averageGrade: number): string {
  return reached === 0 ? 'n/a' : `${developed}/${reached} (avg ${formatAverage(averageGrade)})`;
}

function formatBranchPicks(picks: ReadonlyMap<string, number>): string {
  if (picks.size === 0) {
    return 'none';
  }
  return [...picks.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([branchId, count]) => `${branchId} ${count}`)
    .join(', ');
}

const PERCENT = 100;

/** `orc_tar_pit: orc_tar_pit_quagmire 12/20 (60%), orc_tar_pit_sticky 8/20 (40%)`. */
function formatBranchShare(share: TowerBranchShare): string {
  const picks = share.picks.map(
    ({ branchId, count }) =>
      `${branchId} ${count}/${share.sides} (${Math.round((count / share.sides) * PERCENT)}%)`,
  );
  return `${share.towerId}: ${picks.join(', ')}`;
}

/** The race's branch shares, one indented line per tower type it developed. */
function formatBranchShareLines(row: RaceDevelopmentStats): string[] {
  return row.branchShares.map((share) => `    ${formatBranchShare(share)}`);
}

function formatRaceRow(row: RaceDevelopmentStats): string {
  const early = formatDeveloped(
    row.developedByEarlyRound,
    row.reachedEarlyRound,
    row.averageTopGradeAtEarlyRound,
  );
  const late = formatDeveloped(
    row.developedByLateRound,
    row.reachedLateRound,
    row.averageTopGradeAtLateRound,
  );
  return (
    `  ${row.raceId} (${row.sides} sides): r${DuelDevelopmentDefaults.EARLY_ROUND} ${early}, ` +
    `r${DuelDevelopmentDefaults.LATE_ROUND} ${late}; ${formatBranchPicks(row.branchPicks)}`
  );
}

/** One line per race: developed sides by the early and late round, then branch picks. */
export function formatRaceDevelopment(rows: readonly RaceDevelopmentStats[]): string[] {
  const { EARLY_ROUND, LATE_ROUND, DEVELOPED_GRADE } = DuelDevelopmentDefaults;
  return [
    `development (sides at grade ${DEVELOPED_GRADE}+ by round ${EARLY_ROUND} / ${LATE_ROUND}, ` +
      'average top grade; branch picks, then each developed type split by branch):',
    ...rows.flatMap((row) => [formatRaceRow(row), ...formatBranchShareLines(row)]),
  ];
}
