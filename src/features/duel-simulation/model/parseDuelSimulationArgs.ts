import { Difficulty } from '../../../entities/difficulty';
import { isRaceId } from '../../../shared/types/content-ids';
import {
  DEFAULT_DUEL_SIMULATION_CONFIG,
  isDuelMapKind,
  type DuelSimulationConfig,
} from './duelSimulationConfig';

export const DUEL_SIMULATION_USAGE =
  'usage: npm run sim:duel -- [--seed N] [--map classic|seeded] [--max-rounds R] ' +
  '[--difficulty-a|--difficulty-b easy|normal|hard|nightmare] ' +
  '[--race-a|--race-b|--baseline-race undead|orc|human|elf]';

export type DuelSimulationArgsResult =
  | { ok: true; config: DuelSimulationConfig }
  | { ok: false; error: string };

function isDifficulty(value: string): value is Difficulty {
  return (Object.values(Difficulty) as string[]).includes(value);
}

function parseInteger(flag: string, value: string, minimum: number): number | string {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    return `${flag} expects an integer >= ${minimum}, got "${value}"`;
  }
  return parsed;
}

function parseDifficulty(value: string): Difficulty | string {
  const difficulty = value.toUpperCase();
  return isDifficulty(difficulty) ? difficulty : `unknown difficulty "${value}"`;
}

function applyFlag(
  config: DuelSimulationConfig,
  flag: string,
  value: string,
): DuelSimulationConfig | string {
  const raceId = value.toUpperCase();
  const unknownRace = `unknown race "${value}"`;

  switch (flag) {
    case '--seed': {
      const seed = parseInteger(flag, value, 0);
      return typeof seed === 'string' ? seed : { ...config, seed };
    }
    case '--map': {
      const map = value.toLowerCase();
      return isDuelMapKind(map) ? { ...config, map } : `unknown map "${value}"`;
    }
    case '--max-rounds': {
      const maxRounds = parseInteger(flag, value, 1);
      return typeof maxRounds === 'string' ? maxRounds : { ...config, maxRounds };
    }
    case '--difficulty-a': {
      const difficulty = parseDifficulty(value);
      return isDifficulty(difficulty)
        ? { ...config, sideA: { ...config.sideA, difficulty } }
        : difficulty;
    }
    case '--difficulty-b': {
      const difficulty = parseDifficulty(value);
      return isDifficulty(difficulty)
        ? { ...config, sideB: { ...config.sideB, difficulty } }
        : difficulty;
    }
    case '--race-a':
      return isRaceId(raceId) ? { ...config, sideA: { ...config.sideA, raceId } } : unknownRace;
    case '--race-b':
      return isRaceId(raceId) ? { ...config, sideB: { ...config.sideB, raceId } } : unknownRace;
    case '--baseline-race':
      return isRaceId(raceId) ? { ...config, baselineRaceId: raceId } : unknownRace;
    default:
      return `unknown option "${flag}"`;
  }
}

/** Parses `--flag value` pairs; unknown flags and bad values are errors, never ignored. */
export function parseDuelSimulationArgs(args: readonly string[]): DuelSimulationArgsResult {
  let config = DEFAULT_DUEL_SIMULATION_CONFIG;

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (value === undefined) {
      return { ok: false, error: `${flag} expects a value` };
    }

    const next = applyFlag(config, flag, value);
    if (typeof next === 'string') {
      return { ok: false, error: next };
    }
    config = next;
  }

  return { ok: true, config };
}
