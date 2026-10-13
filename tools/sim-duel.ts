// Headless AI-vs-AI duel CLI: two computer opponents play a whole duel without
// Phaser and the result prints as one line per round, both final boards and
// the winner. Logic lives in src/features/duel-simulation; this file only
// wires argv and stdout.
//
//   npm run sim:duel -- --seed 7 --difficulty-a hard --difficulty-b normal --race-a undead --race-b orc --max-rounds 40
import {
  DUEL_SIMULATION_USAGE,
  formatDuelSimulation,
  parseDuelSimulationArgs,
  simulateDuel,
} from '../src/features/duel-simulation';

const parsed = parseDuelSimulationArgs(process.argv.slice(2));

if (!parsed.ok) {
  process.stderr.write(`${parsed.error}\n${DUEL_SIMULATION_USAGE}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${formatDuelSimulation(simulateDuel(parsed.config))}\n`);
}
