import {
  DuelBatchDefaults,
  type DuelBatchMatchup,
  type DuelBatchMatchupResult,
  type DuelMatchSummary,
  type DuelBatchResult,
  type DuelBatchStats,
} from './duelBatch';
import { summarizeCrossDifficulty, type CrossDifficultyStats } from './duelBatchCrossDifficulty';

const PERCENT = 100;
const COLUMN_SEPARATOR = ' | ';

const HEADER_CELLS = [
  'matchup',
  'n',
  'rounds med (min-max)',
  `towers@r${DuelBatchDefaults.TOWER_CHECKPOINT_ROUND} med A/B (min-max)`,
  'A/B/draw',
  'draw %',
  'round cap %',
  `unspent/income r${DuelBatchDefaults.LATE_GAME_AFTER_ROUND + 1}+`,
];

function formatMatchup(matchup: DuelBatchMatchup): string {
  const { sideA, sideB } = matchup;
  return `${sideA.raceId} ${sideA.difficulty} vs ${sideB.raceId} ${sideB.difficulty}`;
}

function formatShare(count: number, total: number): string {
  return total === 0 ? '0' : `${Math.round((count / total) * PERCENT)}`;
}

function formatTowers(stats: DuelBatchStats): string {
  const towers = stats.checkpointTowers;
  if (towers === null) {
    return 'n/a';
  }
  const early =
    stats.endedBeforeCheckpoint > 0 ? ` [${stats.endedBeforeCheckpoint} ended early]` : '';
  return `${towers.medianA}/${towers.medianB} (${towers.min}-${towers.max})${early}`;
}

/** Average unspent gold over average income per side-round, e.g. `85/240`. */
function formatLateUnspent(stats: DuelBatchStats): string {
  const late = stats.lateUnspent;
  return late === null
    ? 'n/a'
    : `${Math.round(late.averageUnspentGold)}/${Math.round(late.averageIncome)}`;
}

function formatStatsCells(label: string, stats: DuelBatchStats): string[] {
  return [
    label,
    `${stats.matches}`,
    `${stats.medianRounds} (${stats.minRounds}-${stats.maxRounds})`,
    formatTowers(stats),
    `${stats.winsA}/${stats.winsB}/${stats.draws}`,
    formatShare(stats.draws, stats.matches),
    formatShare(stats.roundCaps, stats.matches),
    formatLateUnspent(stats),
  ];
}

function padRows(rows: readonly string[][]): string[] {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map((row) =>
    row
      .map((cell, column) => cell.padEnd(widths[column]))
      .join(COLUMN_SEPARATOR)
      .trimEnd(),
  );
}

const CROSS_HEADER_CELLS = [
  'difficulty matchup',
  'n',
  'higher/lower/draw',
  'higher score %',
  'rounds med',
];

function formatCrossCells(stats: CrossDifficultyStats): string[] {
  return [
    `${stats.higher} vs ${stats.lower}`,
    `${stats.matches}`,
    `${stats.higherWins}/${stats.lowerWins}/${stats.draws}`,
    `${Math.round(stats.higherScore * PERCENT)}`,
    `${stats.medianRounds}`,
  ];
}

/** Win rates per difficulty pair (draws count half); empty without cross-difficulty matchups. */
function formatCrossDifficulty(result: DuelBatchResult): string[] {
  const cross = summarizeCrossDifficulty(result.matchups);
  return cross.length === 0
    ? []
    : ['', ...padRows([CROSS_HEADER_CELLS, ...cross.map(formatCrossCells)])];
}

const WINNER_MARK = { A: 'A', B: 'B', draw: '=' } as const;

/** `seed:rounds+winner`, e.g. `7:24A`; `=` marks a draw. */
function formatMatch(summary: DuelMatchSummary): string {
  const mark = summary.winner === null ? WINNER_MARK.draw : WINNER_MARK[summary.winner];
  return `${summary.seed}:${summary.rounds}${mark}`;
}

function formatMatchLine(result: DuelBatchMatchupResult): string {
  return `${formatMatchup(result.matchup)}: ${result.summaries.map(formatMatch).join(' ')}`;
}

/**
 * One row per matchup plus an overall row; seeds and the round limit head the
 * table. Cross-difficulty batches add a win-rate row per difficulty pair.
 * Below that, every match as `seed:rounds+winner`.
 */
export function formatDuelBatch(result: DuelBatchResult): string {
  const { seeds, maxRounds, baselineRaceId } = result.config;
  const seedLabel = seeds.length > 0 ? `${seeds[0]}..${seeds[seeds.length - 1]}` : 'none';
  const rows = [
    HEADER_CELLS,
    ...result.matchups.map((matchup) =>
      formatStatsCells(formatMatchup(matchup.matchup), matchup.stats),
    ),
    formatStatsCells('overall', result.overall),
  ];
  return [
    `seeds ${seedLabel} (${seeds.length}) | max rounds ${maxRounds} | baseline ${baselineRaceId}`,
    ...padRows(rows),
    ...formatCrossDifficulty(result),
    '',
    ...result.matchups.map(formatMatchLine),
  ].join('\n');
}
