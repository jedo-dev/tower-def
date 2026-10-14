import { Difficulty } from '../../../entities/difficulty';
import {
  CREEP_BASE_MOVE_SPEED_PX_PER_SEC,
  WAVE_FIRST_SPAWN_DELAY_MS,
  WAVE_SPAWN_INTERVAL_MS,
} from '../../game-engine/scenes/gameScene.constants';
import { RaceId } from '../../../shared/types/content-ids';

export enum DuelSimulationDefaults {
  /** Fixed simulation step; the game runs variable frames of about 16 ms. */
  TICK_MS = 50,
  MAX_ROUNDS = 40,
  /** A wave that has not resolved after this many ticks (10 minutes) is cut off. */
  MAX_WAVE_TICKS = 12_000,
  SEED = 1,
  /** Leak history the computer keeps, the same window the game scene keeps. */
  LEAK_HISTORY_LIMIT = 10,
}

/** Spawn cadence shared with the game scene's wave runtime. */
export type DuelSimulationTiming = {
  firstSpawnDelayMs: number;
  spawnIntervalMs: number;
};

export const DUEL_SIMULATION_TIMING: DuelSimulationTiming = {
  firstSpawnDelayMs: WAVE_FIRST_SPAWN_DELAY_MS,
  spawnIntervalMs: WAVE_SPAWN_INTERVAL_MS,
};

export const DUEL_SIMULATION_BASE_MOVE_SPEED_PX_PER_SEC = CREEP_BASE_MOVE_SPEED_PX_PER_SEC;

/**
 * Which map a duel is played on: `classic` is the fixed lane the game uses
 * when dynamic entrances are off (entrance left-middle, exit right-middle);
 * `seeded` draws edge endpoints from the duel seed.
 */
export type DuelMapKind = 'classic' | 'seeded';

export const DUEL_MAP_KINDS: readonly DuelMapKind[] = ['classic', 'seeded'];

export function isDuelMapKind(value: string): value is DuelMapKind {
  return (DUEL_MAP_KINDS as readonly string[]).includes(value);
}

/** One computer duelist. */
export type DuelSimulationSide = {
  difficulty: Difficulty;
  raceId: RaceId;
};

export type DuelSimulationConfig = {
  /** Seeds the baseline waves, and the map endpoints on a `seeded` map. */
  seed: number;
  map: DuelMapKind;
  sideA: DuelSimulationSide;
  sideB: DuelSimulationSide;
  maxRounds: number;
  /** Faction of the neutral baseline wave both fields face. */
  baselineRaceId: RaceId;
  tickMs: number;
  maxWaveTicks: number;
};

export const DEFAULT_DUEL_SIMULATION_CONFIG: DuelSimulationConfig = {
  seed: DuelSimulationDefaults.SEED,
  map: 'seeded',
  sideA: { difficulty: Difficulty.HARD, raceId: RaceId.UNDEAD },
  sideB: { difficulty: Difficulty.NORMAL, raceId: RaceId.ORC },
  maxRounds: DuelSimulationDefaults.MAX_ROUNDS,
  baselineRaceId: RaceId.UNDEAD,
  tickMs: DuelSimulationDefaults.TICK_MS,
  maxWaveTicks: DuelSimulationDefaults.MAX_WAVE_TICKS,
};
