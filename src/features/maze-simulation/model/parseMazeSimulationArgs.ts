import { Difficulty } from '../../../entities/difficulty';
import { isRaceId, RaceId } from '../../../shared/types/content-ids';
import type { MazeSimulationConfig } from './simulateMazeBuildRounds';

export enum MazeSimulationDefaults {
  ROUNDS = 10,
}

export const DEFAULT_MAZE_SIMULATION_CONFIG: MazeSimulationConfig = {
  rounds: MazeSimulationDefaults.ROUNDS,
  difficulty: Difficulty.NORMAL,
  raceId: RaceId.UNDEAD,
  seed: null,
};

export const MAZE_SIMULATION_USAGE =
  'usage: npm run sim:maze -- [--seed N] [--rounds R] [--difficulty easy|normal|hard|nightmare] [--race undead|orc|human|elf]';

export type MazeSimulationArgsResult =
  | { ok: true; config: MazeSimulationConfig }
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

function applyFlag(
  config: MazeSimulationConfig,
  flag: string,
  value: string,
): MazeSimulationConfig | string {
  switch (flag) {
    case '--seed': {
      const seed = parseInteger(flag, value, 0);
      return typeof seed === 'string' ? seed : { ...config, seed };
    }
    case '--rounds': {
      const rounds = parseInteger(flag, value, 1);
      return typeof rounds === 'string' ? rounds : { ...config, rounds };
    }
    case '--difficulty': {
      const difficulty = value.toUpperCase();
      return isDifficulty(difficulty) ? { ...config, difficulty } : `unknown difficulty "${value}"`;
    }
    case '--race': {
      const raceId = value.toUpperCase();
      return isRaceId(raceId) ? { ...config, raceId } : `unknown race "${value}"`;
    }
    default:
      return `unknown option "${flag}"`;
  }
}

/** Parses `--flag value` pairs; unknown flags and bad values are errors, never ignored. */
export function parseMazeSimulationArgs(args: readonly string[]): MazeSimulationArgsResult {
  let config = DEFAULT_MAZE_SIMULATION_CONFIG;

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
