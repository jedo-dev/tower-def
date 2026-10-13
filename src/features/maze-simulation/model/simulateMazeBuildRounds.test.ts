import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../../entities/difficulty';
import { DUEL_MATCH_BALANCE } from '../../../entities/duel-match';
import { generateEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import { RaceId } from '../../../shared/types/content-ids';
import { formatMazeRoundReport, formatMazeSimulation } from './formatMazeRoundReport';
import { simulateMazeBuildRounds, type MazeSimulationConfig } from './simulateMazeBuildRounds';

const CONFIG: MazeSimulationConfig = {
  rounds: 8,
  difficulty: Difficulty.HARD,
  raceId: RaceId.UNDEAD,
  seed: 7,
};

describe('features/maze-simulation/simulateMazeBuildRounds', () => {
  it('opens on the opponent starting gold and earns income between rounds', () => {
    const { rounds } = simulateMazeBuildRounds(CONFIG);

    expect(rounds[0].goldBeforeBuild).toBe(DUEL_MATCH_BALANCE.startingGold);
    for (let index = 1; index < rounds.length; index += 1) {
      expect(rounds[index].goldBeforeBuild).toBe(
        rounds[index - 1].goldAfterBuild + DUEL_MATCH_BALANCE.startingIncome,
      );
    }
  });

  it('places the map endpoints from the seed', () => {
    const result = simulateMazeBuildRounds(CONFIG);

    expect({ entrance: result.entrance, exit: result.exit }).toEqual(generateEdgeEndpoints(7));
  });

  it('grows the maze while keeping a route to the exit', () => {
    const result = simulateMazeBuildRounds(CONFIG);
    const lastRound = result.rounds[result.rounds.length - 1];

    expect(lastRound.battlefield.towers.length).toBeGreaterThan(0);
    expect(lastRound.battlefield.path.length).toBeGreaterThan(
      result.initialBattlefield.path.length,
    );
    expect(lastRound.battlefield.path[0]).toEqual(result.entrance);
    expect(lastRound.battlefield.path[lastRound.battlefield.path.length - 1]).toEqual(result.exit);
  });

  it('is deterministic per seed', () => {
    const first = formatMazeSimulation(simulateMazeBuildRounds(CONFIG));
    const second = formatMazeSimulation(simulateMazeBuildRounds(CONFIG));

    expect(second).toBe(first);
  });

  it('prints a round summary above the board', () => {
    const [firstRound] = simulateMazeBuildRounds({ ...CONFIG, rounds: 1 }).rounds;

    expect(formatMazeRoundReport(firstRound)).toMatchInlineSnapshot(`
      "round 1 | intent extend_maze | gold 500 -> 30 | spent 470 | built 8 | upgraded 0 | towers 8 | route length 34 | route cost small 31.8 large 32.7
      board 20x30 | route (small) 34
      .EEF#...............
      .EE##...............
      ..s##...............
      ..s##...............
      ..s##...............
      ..s##...............
      ..s##...............
      ..s##...............
      ..sS#...............
      ..s##...............
      ..sS#...............
      ..s##..........ssss.
      ..ssssssssssssss##s.
      ................##s.
      ................##XX
      ................##XX
      ....................
      ....................
      ....................
      ....................
      ....................
      ....................
      ....................
      ....................
      ....................
      ....................
      ....................
      ....................
      ....................
      ...................."
    `);
  });
});
