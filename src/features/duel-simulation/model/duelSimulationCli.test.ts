import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../../entities/difficulty';
import { RaceId } from '../../../shared/types/content-ids';
import { DEFAULT_DUEL_SIMULATION_CONFIG } from './duelSimulationConfig';
import { formatDuelSimulation } from './formatDuelSimulation';
import { parseDuelSimulationArgs } from './parseDuelSimulationArgs';
import { simulateDuel } from './simulateDuel';

describe('features/duel-simulation/parseDuelSimulationArgs', () => {
  it('falls back to the defaults without arguments', () => {
    expect(parseDuelSimulationArgs([])).toEqual({
      ok: true,
      config: DEFAULT_DUEL_SIMULATION_CONFIG,
    });
  });

  it('reads both sides, the seed and the round limit', () => {
    const parsed = parseDuelSimulationArgs([
      '--seed',
      '7',
      '--difficulty-a',
      'nightmare',
      '--difficulty-b',
      'easy',
      '--race-a',
      'human',
      '--race-b',
      'elf',
      '--max-rounds',
      '5',
      '--baseline-race',
      'orc',
      '--map',
      'classic',
    ]);

    expect(parsed.ok && parsed.config).toMatchObject({
      seed: 7,
      map: 'classic',
      maxRounds: 5,
      baselineRaceId: RaceId.ORC,
      sideA: { difficulty: Difficulty.NIGHTMARE, raceId: RaceId.HUMAN },
      sideB: { difficulty: Difficulty.EASY, raceId: RaceId.ELF },
    });
  });

  it('rejects unknown flags, bad values and a missing value', () => {
    expect(parseDuelSimulationArgs(['--speed', '2']).ok).toBe(false);
    expect(parseDuelSimulationArgs(['--race-a', 'dwarf']).ok).toBe(false);
    expect(parseDuelSimulationArgs(['--max-rounds', '0']).ok).toBe(false);
    expect(parseDuelSimulationArgs(['--seed']).ok).toBe(false);
    expect(parseDuelSimulationArgs(['--map', 'random']).ok).toBe(false);
  });
});

describe('features/duel-simulation smoke', () => {
  const config = { ...DEFAULT_DUEL_SIMULATION_CONFIG, seed: 7, maxRounds: 8 };

  it('prints the same report for the same seed', () => {
    const first = formatDuelSimulation(simulateDuel(config));

    expect(formatDuelSimulation(simulateDuel(config))).toBe(first);
  });

  it('prints one line per round, both boards and the outcome', () => {
    const result = simulateDuel(config);
    const text = formatDuelSimulation(result);

    expect(text.split('\n').filter((line) => line.startsWith('round '))).toHaveLength(
      result.rounds.length,
    );
    expect(text).toContain('board A');
    expect(text).toContain('board B');
    expect(text).toMatch(/^(winner|draw) /m);
  });

  it('stays inside the tick budget', () => {
    const result = simulateDuel(config);

    expect(result.totalTicks).toBeGreaterThan(0);
    expect(result.totalTicks).toBeLessThanOrEqual(config.maxRounds * config.maxWaveTicks);
  });
});
