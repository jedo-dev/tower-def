// Balance-pass CLI: plays equal-difficulty AI duels across a seed range and
// prints one table row per matchup (match length, towers at round 5, winner
// split, draws, round-limit hits). Logic lives in
// src/features/duel-simulation; this file only wires argv and stdout.
//
//   npm run sim:duel-batch -- --seeds 1-10 --difficulties normal,hard --pairs undead:orc,human:elf
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
