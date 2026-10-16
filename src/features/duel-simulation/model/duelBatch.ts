import { Difficulty } from '../../../entities/difficulty';
import { RaceId } from '../../../shared/types/content-ids';
import {
  DEFAULT_DUEL_SIMULATION_CONFIG,
  DUEL_MAP_KINDS,
  type DuelMapKind,
  type DuelSimulationConfig,
  type DuelSimulationSide,
} from './duelSimulationConfig';
import {
  summarizeDevelopment,
  summarizeEndBoards,
  summarizeRaceDevelopment,
  type DuelMatchDevelopment,
  type EndBoardStats,
  type RaceDevelopmentStats,
} from './duelBatchDevelopment';
import {
  summarizeCreatureDevelopment,
  summarizeRaceCreatureDevelopment,
  type DuelMatchCreatureDevelopment,
  type RaceCreatureDevelopmentStats,
} from './duelBatchCreatureDevelopment';
import {
  simulateDuel,
  type DuelEndReason,
  type DuelSimulationResult,
  type DuelWinner,
} from './simulateDuel';

// Batch of headless duels for balance passes: every matchup across a seed
// range, boiled down to the numbers the balance targets are written in
// (match length, towers by the checkpoint round, draws, winner split).

export enum DuelBatchDefaults {
  FIRST_SEED = 1,
  LAST_SEED = 10,
  /** Round whose tower count is the opening checkpoint. */
  TOWER_CHECKPOINT_ROUND = 5,
  /** Rounds after this one count as late game for the unspent-gold metric. */
  LATE_GAME_AFTER_ROUND = 15,
}

export type DuelBatchMatchup = {
  sideA: DuelSimulationSide;
  sideB: DuelSimulationSide;
};

export type DuelBatchConfig = {
  seeds: readonly number[];
  /** Every matchup is played on each of these maps (per seed). */
  maps: readonly DuelMapKind[];
  matchups: readonly DuelBatchMatchup[];
  maxRounds: number;
  baselineRaceId: RaceId;
};

/** Gold left unspent after build phases, and income, summed over some side-rounds. */
export type UnspentGoldTally = {
  unspentGold: number;
  income: number;
  /** Side-rounds summed: two per round, one per side. */
  sideRounds: number;
};

/** One duel, reduced to what the batch table needs. */
export type DuelMatchSummary = {
  seed: number;
  rounds: number;
  /** Towers per side after the checkpoint round; null when the match ended earlier. */
  checkpointTowers: { a: number; b: number } | null;
  /** Both sides, every round after `LATE_GAME_AFTER_ROUND`. */
  lateUnspent: UnspentGoldTally;
  winner: DuelWinner;
  endReason: DuelEndReason;
  /** Boards at match end, top grades at the checkpoint rounds, branch picks. */
  development: DuelMatchDevelopment;
  /** Creature experience, grades, branch picks and leak sources per side. */
  creatureDevelopment: DuelMatchCreatureDevelopment;
};

/** Average unspent gold and income per side-round. */
export type UnspentGoldStats = {
  averageUnspentGold: number;
  averageIncome: number;
};

export type CheckpointTowerStats = {
  medianA: number;
  medianB: number;
  /** Fewest and most towers either side had. */
  min: number;
  max: number;
};

export type DuelBatchStats = {
  matches: number;
  medianRounds: number;
  minRounds: number;
  maxRounds: number;
  /** Towers at the checkpoint over every match that got there; null when none did. */
  checkpointTowers: CheckpointTowerStats | null;
  /** Matches that ended before the checkpoint round. */
  endedBeforeCheckpoint: number;
  winsA: number;
  winsB: number;
  draws: number;
  /** Matches that hit the round limit instead of ending on lives. */
  roundCaps: number;
  /** Late-game unspent gold against income; null when no match got that far. */
  lateUnspent: UnspentGoldStats | null;
  /** Towers and top grade at match end; null for an empty batch. */
  endBoards: EndBoardStats | null;
};

export type DuelBatchMatchupResult = {
  matchup: DuelBatchMatchup;
  map: DuelMapKind;
  summaries: DuelMatchSummary[];
  stats: DuelBatchStats;
};

export type DuelBatchResult = {
  config: DuelBatchConfig;
  matchups: DuelBatchMatchupResult[];
  overall: DuelBatchStats;
  /** Per race over the whole batch. */
  development: RaceDevelopmentStats[];
  creatureDevelopment: RaceCreatureDevelopmentStats[];
};

export const DEFAULT_DUEL_BATCH_RACE_PAIRS: readonly (readonly [RaceId, RaceId])[] = [
  [RaceId.UNDEAD, RaceId.ORC],
  [RaceId.HUMAN, RaceId.ELF],
  [RaceId.ORC, RaceId.HUMAN],
  [RaceId.ELF, RaceId.UNDEAD],
];

export const DEFAULT_DUEL_BATCH_DIFFICULTIES: readonly Difficulty[] = [
  Difficulty.NORMAL,
  Difficulty.HARD,
];

/** Equal-difficulty matchups: every race pair at every difficulty. */
export function createEqualMatchups(
  difficulties: readonly Difficulty[],
  racePairs: readonly (readonly [RaceId, RaceId])[],
): DuelBatchMatchup[] {
  return difficulties.flatMap((difficulty) =>
    racePairs.map(([raceA, raceB]) => ({
      sideA: { difficulty, raceId: raceA },
      sideB: { difficulty, raceId: raceB },
    })),
  );
}

export function createSeedRange(first: number, last: number): number[] {
  const seeds: number[] = [];
  for (let seed = first; seed <= last; seed += 1) {
    seeds.push(seed);
  }
  return seeds;
}

export const DEFAULT_DUEL_BATCH_CONFIG: DuelBatchConfig = {
  seeds: createSeedRange(DuelBatchDefaults.FIRST_SEED, DuelBatchDefaults.LAST_SEED),
  maps: DUEL_MAP_KINDS,
  matchups: createEqualMatchups(DEFAULT_DUEL_BATCH_DIFFICULTIES, DEFAULT_DUEL_BATCH_RACE_PAIRS),
  maxRounds: DEFAULT_DUEL_SIMULATION_CONFIG.maxRounds,
  baselineRaceId: DEFAULT_DUEL_SIMULATION_CONFIG.baselineRaceId,
};

function tallyLateUnspent(result: DuelSimulationResult): UnspentGoldTally {
  const late = result.rounds.slice(DuelBatchDefaults.LATE_GAME_AFTER_ROUND);
  const sides = late.flatMap((round) => [round.a, round.b]);
  return {
    unspentGold: sides.reduce((sum, side) => sum + side.unspentGold, 0),
    income: sides.reduce((sum, side) => sum + side.income, 0),
    sideRounds: sides.length,
  };
}

export function summarizeDuel(result: DuelSimulationResult): DuelMatchSummary {
  const checkpoint = result.rounds[DuelBatchDefaults.TOWER_CHECKPOINT_ROUND - 1];
  return {
    seed: result.config.seed,
    rounds: result.rounds.length,
    checkpointTowers: checkpoint ? { a: checkpoint.a.towers, b: checkpoint.b.towers } : null,
    lateUnspent: tallyLateUnspent(result),
    winner: result.winner,
    endReason: result.endReason,
    development: summarizeDevelopment(result),
    creatureDevelopment: summarizeCreatureDevelopment(result),
  };
}

/** Median of a non-empty list; the mean of the middle pair for an even count. */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function countWhere(
  summaries: readonly DuelMatchSummary[],
  test: (summary: DuelMatchSummary) => boolean,
): number {
  return summaries.filter(test).length;
}

function summarizeCheckpointTowers(
  summaries: readonly DuelMatchSummary[],
): CheckpointTowerStats | null {
  const reached = summaries.flatMap((summary) =>
    summary.checkpointTowers ? [summary.checkpointTowers] : [],
  );
  if (reached.length === 0) {
    return null;
  }
  const sideA = reached.map((towers) => towers.a);
  const sideB = reached.map((towers) => towers.b);
  return {
    medianA: median(sideA),
    medianB: median(sideB),
    min: Math.min(...sideA, ...sideB),
    max: Math.max(...sideA, ...sideB),
  };
}

function summarizeLateUnspent(summaries: readonly DuelMatchSummary[]): UnspentGoldStats | null {
  const sideRounds = summaries.reduce((sum, summary) => sum + summary.lateUnspent.sideRounds, 0);
  if (sideRounds === 0) {
    return null;
  }
  const unspentGold = summaries.reduce((sum, summary) => sum + summary.lateUnspent.unspentGold, 0);
  const income = summaries.reduce((sum, summary) => sum + summary.lateUnspent.income, 0);
  return { averageUnspentGold: unspentGold / sideRounds, averageIncome: income / sideRounds };
}

export function summarizeBatch(summaries: readonly DuelMatchSummary[]): DuelBatchStats {
  const rounds = summaries.map((summary) => summary.rounds);
  return {
    matches: summaries.length,
    medianRounds: rounds.length > 0 ? median(rounds) : 0,
    minRounds: rounds.length > 0 ? Math.min(...rounds) : 0,
    maxRounds: rounds.length > 0 ? Math.max(...rounds) : 0,
    checkpointTowers: summarizeCheckpointTowers(summaries),
    endedBeforeCheckpoint: countWhere(summaries, (summary) => summary.checkpointTowers === null),
    winsA: countWhere(summaries, (summary) => summary.winner === 'A'),
    winsB: countWhere(summaries, (summary) => summary.winner === 'B'),
    draws: countWhere(summaries, (summary) => summary.winner === null),
    roundCaps: countWhere(summaries, (summary) => summary.endReason === 'max_rounds'),
    lateUnspent: summarizeLateUnspent(summaries),
    endBoards: summarizeEndBoards(summaries),
  };
}

function toSimulationConfig(
  config: DuelBatchConfig,
  matchup: DuelBatchMatchup,
  map: DuelMapKind,
  seed: number,
): DuelSimulationConfig {
  return {
    ...DEFAULT_DUEL_SIMULATION_CONFIG,
    seed,
    map,
    sideA: matchup.sideA,
    sideB: matchup.sideB,
    maxRounds: config.maxRounds,
    baselineRaceId: config.baselineRaceId,
  };
}

/** Plays every matchup on every map and seed. Deterministic per config. */
export function runDuelBatch(config: DuelBatchConfig): DuelBatchResult {
  const matchups = config.maps.flatMap((map) =>
    config.matchups.map((matchup) => {
      const summaries = config.seeds.map((seed) =>
        summarizeDuel(simulateDuel(toSimulationConfig(config, matchup, map, seed))),
      );
      return { matchup, map, summaries, stats: summarizeBatch(summaries) };
    }),
  );
  const summaries = matchups.flatMap((result) => result.summaries);
  return {
    config,
    matchups,
    overall: summarizeBatch(summaries),
    development: summarizeRaceDevelopment(summaries),
    creatureDevelopment: summarizeRaceCreatureDevelopment(
      summaries.map((summary) => summary.creatureDevelopment),
    ),
  };
}
