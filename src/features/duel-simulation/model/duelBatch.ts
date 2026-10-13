import { Difficulty } from '../../../entities/difficulty';
import { RaceId } from '../../../shared/types/content-ids';
import {
  DEFAULT_DUEL_SIMULATION_CONFIG,
  type DuelSimulationConfig,
  type DuelSimulationSide,
} from './duelSimulationConfig';
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
}

export type DuelBatchMatchup = {
  sideA: DuelSimulationSide;
  sideB: DuelSimulationSide;
};

export type DuelBatchConfig = {
  seeds: readonly number[];
  matchups: readonly DuelBatchMatchup[];
  maxRounds: number;
  baselineRaceId: RaceId;
};

/** One duel, reduced to what the batch table needs. */
export type DuelMatchSummary = {
  seed: number;
  rounds: number;
  /** Towers per side after the checkpoint round; null when the match ended earlier. */
  checkpointTowers: { a: number; b: number } | null;
  winner: DuelWinner;
  endReason: DuelEndReason;
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
};

export type DuelBatchMatchupResult = {
  matchup: DuelBatchMatchup;
  summaries: DuelMatchSummary[];
  stats: DuelBatchStats;
};

export type DuelBatchResult = {
  config: DuelBatchConfig;
  matchups: DuelBatchMatchupResult[];
  overall: DuelBatchStats;
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
  matchups: createEqualMatchups(DEFAULT_DUEL_BATCH_DIFFICULTIES, DEFAULT_DUEL_BATCH_RACE_PAIRS),
  maxRounds: DEFAULT_DUEL_SIMULATION_CONFIG.maxRounds,
  baselineRaceId: DEFAULT_DUEL_SIMULATION_CONFIG.baselineRaceId,
};

export function summarizeDuel(result: DuelSimulationResult): DuelMatchSummary {
  const checkpoint = result.rounds[DuelBatchDefaults.TOWER_CHECKPOINT_ROUND - 1];
  return {
    seed: result.config.seed,
    rounds: result.rounds.length,
    checkpointTowers: checkpoint ? { a: checkpoint.a.towers, b: checkpoint.b.towers } : null,
    winner: result.winner,
    endReason: result.endReason,
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
  };
}

function toSimulationConfig(
  config: DuelBatchConfig,
  matchup: DuelBatchMatchup,
  seed: number,
): DuelSimulationConfig {
  return {
    ...DEFAULT_DUEL_SIMULATION_CONFIG,
    seed,
    sideA: matchup.sideA,
    sideB: matchup.sideB,
    maxRounds: config.maxRounds,
    baselineRaceId: config.baselineRaceId,
  };
}

/** Plays every matchup on every seed. Deterministic per config. */
export function runDuelBatch(config: DuelBatchConfig): DuelBatchResult {
  const matchups = config.matchups.map((matchup) => {
    const summaries = config.seeds.map((seed) =>
      summarizeDuel(simulateDuel(toSimulationConfig(config, matchup, seed))),
    );
    return { matchup, summaries, stats: summarizeBatch(summaries) };
  });
  return {
    config,
    matchups,
    overall: summarizeBatch(matchups.flatMap((result) => result.summaries)),
  };
}
