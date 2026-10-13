// Maze planner CLI: plays the computer build planner on an empty board and
// prints the ASCII board after every round. Logic lives in
// src/features/maze-simulation; this file only wires argv and stdout.
//
//   npm run sim:maze -- --seed 7 --rounds 12 --difficulty hard
import {
  formatMazeSimulation,
  MAZE_SIMULATION_USAGE,
  parseMazeSimulationArgs,
  simulateMazeBuildRounds,
} from '../src/features/maze-simulation';

const parsed = parseMazeSimulationArgs(process.argv.slice(2));

if (!parsed.ok) {
  process.stderr.write(`${parsed.error}\n${MAZE_SIMULATION_USAGE}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${formatMazeSimulation(simulateMazeBuildRounds(parsed.config))}\n`);
}
