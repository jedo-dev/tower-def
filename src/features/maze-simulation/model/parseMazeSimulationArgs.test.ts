import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../../entities/difficulty';
import { RaceId } from '../../../shared/types/content-ids';
import { DEFAULT_MAZE_SIMULATION_CONFIG, parseMazeSimulationArgs } from './parseMazeSimulationArgs';

describe('features/maze-simulation/parseMazeSimulationArgs', () => {
  it('falls back to the defaults without arguments', () => {
    expect(parseMazeSimulationArgs([])).toEqual({
      ok: true,
      config: DEFAULT_MAZE_SIMULATION_CONFIG,
    });
  });

  it('reads seed, rounds, difficulty and race', () => {
    const result = parseMazeSimulationArgs([
      '--seed',
      '42',
      '--rounds',
      '5',
      '--difficulty',
      'nightmare',
      '--race',
      'orc',
    ]);

    expect(result).toEqual({
      ok: true,
      config: { seed: 42, rounds: 5, difficulty: Difficulty.NIGHTMARE, raceId: RaceId.ORC },
    });
  });

  it.each([
    [['--rounds', '0']],
    [['--seed', 'abc']],
    [['--difficulty', 'impossible']],
    [['--race', 'murloc']],
    [['--speed', '2']],
    [['--rounds']],
  ])('rejects %j', (args) => {
    expect(parseMazeSimulationArgs(args).ok).toBe(false);
  });
});
