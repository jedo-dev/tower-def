import { Difficulty } from '../../../entities/difficulty';
import { isRaceId, type RaceId } from '../../../shared/types/content-ids';
import {
  createEqualMatchups,
  createSeedRange,
  DEFAULT_DUEL_BATCH_CONFIG,
  DEFAULT_DUEL_BATCH_DIFFICULTIES,
  DEFAULT_DUEL_BATCH_RACE_PAIRS,
  type DuelBatchConfig,
} from './duelBatch';
import { createCrossDifficultyMatchups, type DifficultyMatchup } from './duelBatchCrossDifficulty';
import { isDuelMapKind, type DuelMapKind } from './duelSimulationConfig';

export const DUEL_BATCH_USAGE =
  'usage: npm run sim:duel-batch -- [--seeds 1-10|1,4,9] [--max-rounds R] ' +
  '[--difficulties normal,hard | --matchups hard:normal,nightmare:hard] ' +
  '[--pairs undead:orc,human:elf] [--maps classic,seeded] ' +
  '[--baseline-race undead|orc|human|elf]';

export type DuelBatchArgsResult =
  | { ok: true; config: DuelBatchConfig }
  | { ok: false; error: string };

type BatchOptions = {
  seeds: readonly number[];
  maps: readonly DuelMapKind[];
  maxRounds: number;
  baselineRaceId: RaceId;
  difficulties: readonly Difficulty[] | null;
  matchups: readonly DifficultyMatchup[] | null;
  pairs: readonly (readonly [RaceId, RaceId])[] | null;
};

const SEED_RANGE_PATTERN = /^(\d+)-(\d+)$/;
const SEED_LIST_PATTERN = /^\d+(,\d+)*$/;

function parseSeeds(value: string): number[] | string {
  const range = SEED_RANGE_PATTERN.exec(value);
  if (range) {
    const first = Number(range[1]);
    const last = Number(range[2]);
    return first <= last ? createSeedRange(first, last) : `--seeds range "${value}" is reversed`;
  }
  if (SEED_LIST_PATTERN.test(value)) {
    return value.split(',').map(Number);
  }
  return `--seeds expects "first-last" or a comma list, got "${value}"`;
}

function parseDifficulties(value: string): Difficulty[] | string {
  const known = Object.values(Difficulty) as string[];
  const difficulties: Difficulty[] = [];
  for (const item of value.split(',')) {
    const difficulty = item.toUpperCase();
    if (!known.includes(difficulty)) {
      return `unknown difficulty "${item}"`;
    }
    difficulties.push(difficulty as Difficulty);
  }
  return difficulties;
}

function parseMatchups(value: string): DifficultyMatchup[] | string {
  const matchups: DifficultyMatchup[] = [];
  for (const item of value.split(',')) {
    const [first, second, extra] = item.split(':');
    const parsed =
      extra === undefined && first && second ? parseDifficulties(`${first},${second}`) : null;
    if (parsed === null || typeof parsed === 'string' || parsed[0] === parsed[1]) {
      return `--matchups expects "difficulty:otherDifficulty" items, got "${item}"`;
    }
    matchups.push([parsed[0], parsed[1]]);
  }
  return matchups;
}

function parseMaps(value: string): DuelMapKind[] | string {
  const maps: DuelMapKind[] = [];
  for (const item of value.toLowerCase().split(',')) {
    if (!isDuelMapKind(item) || maps.includes(item)) {
      return `--maps expects distinct classic or seeded items, got "${value}"`;
    }
    maps.push(item);
  }
  return maps;
}

function parsePairs(value: string): [RaceId, RaceId][] | string {
  const pairs: [RaceId, RaceId][] = [];
  for (const item of value.split(',')) {
    const [raceA, raceB, extra] = item.toUpperCase().split(':');
    if (extra !== undefined || !raceA || !raceB || !isRaceId(raceA) || !isRaceId(raceB)) {
      return `--pairs expects "raceA:raceB" items, got "${item}"`;
    }
    pairs.push([raceA, raceB]);
  }
  return pairs;
}

function applyFlag(options: BatchOptions, flag: string, value: string): BatchOptions | string {
  switch (flag) {
    case '--seeds': {
      const seeds = parseSeeds(value);
      return typeof seeds === 'string' ? seeds : { ...options, seeds };
    }
    case '--maps': {
      const maps = parseMaps(value);
      return typeof maps === 'string' ? maps : { ...options, maps };
    }
    case '--max-rounds': {
      const maxRounds = Number(value);
      return Number.isInteger(maxRounds) && maxRounds >= 1
        ? { ...options, maxRounds }
        : `--max-rounds expects an integer >= 1, got "${value}"`;
    }
    case '--difficulties': {
      const difficulties = parseDifficulties(value);
      return typeof difficulties === 'string' ? difficulties : { ...options, difficulties };
    }
    case '--matchups': {
      const matchups = parseMatchups(value);
      return typeof matchups === 'string' ? matchups : { ...options, matchups };
    }
    case '--pairs': {
      const pairs = parsePairs(value);
      return typeof pairs === 'string' ? pairs : { ...options, pairs };
    }
    case '--baseline-race': {
      const raceId = value.toUpperCase();
      return isRaceId(raceId) ? { ...options, baselineRaceId: raceId } : `unknown race "${value}"`;
    }
    default:
      return `unknown option "${flag}"`;
  }
}

function toBatchConfig(options: BatchOptions): DuelBatchConfig {
  const pairs = options.pairs ?? DEFAULT_DUEL_BATCH_RACE_PAIRS;
  return {
    seeds: options.seeds,
    maps: options.maps,
    maxRounds: options.maxRounds,
    baselineRaceId: options.baselineRaceId,
    matchups: options.matchups
      ? createCrossDifficultyMatchups(options.matchups, pairs)
      : createEqualMatchups(options.difficulties ?? DEFAULT_DUEL_BATCH_DIFFICULTIES, pairs),
  };
}

/** Parses `--flag value` pairs; unknown flags and bad values are errors, never ignored. */
export function parseDuelBatchArgs(args: readonly string[]): DuelBatchArgsResult {
  let options: BatchOptions = {
    seeds: DEFAULT_DUEL_BATCH_CONFIG.seeds,
    maps: DEFAULT_DUEL_BATCH_CONFIG.maps,
    maxRounds: DEFAULT_DUEL_BATCH_CONFIG.maxRounds,
    baselineRaceId: DEFAULT_DUEL_BATCH_CONFIG.baselineRaceId,
    difficulties: null,
    matchups: null,
    pairs: null,
  };

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (value === undefined) {
      return { ok: false, error: `${flag} expects a value` };
    }
    const next = applyFlag(options, flag, value);
    if (typeof next === 'string') {
      return { ok: false, error: next };
    }
    options = next;
  }

  if (options.difficulties && options.matchups) {
    return { ok: false, error: '--difficulties and --matchups cannot be combined' };
  }
  return { ok: true, config: toBatchConfig(options) };
}
