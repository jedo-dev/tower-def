// Balance-pass CLI: plays AI duels across a seed range, on the classic lane
// and on seeded maps (`--maps`), and prints one table row per map and matchup
// (match length, towers at round 5, winner split, draws, round-limit hits).
// `--matchups` plays difficulties against each other (each on each race, in
// each seat) and adds a win-rate row per pair. Logic lives in
// src/features/duel-simulation; this file only wires argv and stdout.
//
//   npm run sim:duel-batch -- --seeds 1-10 --difficulties normal,hard --pairs undead:orc,human:elf
//   npm run sim:duel-batch -- --seeds 1-10 --maps classic --difficulties hard
//   npm run sim:duel-batch -- --seeds 1-20 --matchups normal:easy,hard:normal,nightmare:hard
import {
  DUEL_BATCH_USAGE,
  formatDuelBatch,
  parseDuelBatchArgs,
  runDuelBatch,
} from '../src/features/duel-simulation';

const parsed = parseDuelBatchArgs(process.argv.slice(2));

if (!parsed.ok) {
  process.stderr.write(`${parsed.error}\n${DUEL_BATCH_USAGE}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${formatDuelBatch(runDuelBatch(parsed.config))}\n`);
}
