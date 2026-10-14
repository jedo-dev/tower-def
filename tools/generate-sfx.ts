// Procedural SFX generator: renders every recipe in
// src/shared/lib/sfx-synth/recipes to the wav file its sound id is registered
// with, removes generated files no id points at any more, and prints a size
// report. The two authored ambience loops are never touched.
//
//   npm run gen:sfx
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { SFX_ASSET_ROOT, SOUND_ASSET_PATHS } from '../src/shared/lib/sound-registry/audio.constants';
import {
  GENERATED_SOUND_IDS,
  SFX_RECIPES,
  SFX_SAMPLE_RATE,
  SFX_SIZE_BUDGET_BYTES,
  getRecipeDurationSec,
  renderSfxRecipeToWav,
} from '../src/shared/lib/sfx-synth';

const PUBLIC_DIR = resolve(import.meta.dirname, '..', 'public');
const SFX_DIR = join(PUBLIC_DIR, SFX_ASSET_ROOT);
const AUTHORED_DIRS = new Set(['ambient']);

function listWavFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      return listWavFiles(fullPath);
    }
    return entry.endsWith('.wav') ? [fullPath] : [];
  });
}

function removeStaleFiles(expected: Set<string>): string[] {
  const generatedDirs = readdirSync(SFX_DIR).filter(
    (entry) => !AUTHORED_DIRS.has(entry) && statSync(join(SFX_DIR, entry)).isDirectory(),
  );
  const stale = generatedDirs
    .flatMap((entry) => listWavFiles(join(SFX_DIR, entry)))
    .filter((file) => !expected.has(file));

  stale.forEach((file) => rmSync(file));
  return stale;
}

const written = new Set<string>();
let totalBytes = 0;
const rows: string[] = [];

for (const soundId of GENERATED_SOUND_IDS) {
  const recipe = SFX_RECIPES[soundId];
  const target = join(PUBLIC_DIR, SOUND_ASSET_PATHS[soundId]);
  const bytes = renderSfxRecipeToWav(recipe);

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  written.add(target);
  totalBytes += bytes.length;
  rows.push(
    `${soundId.padEnd(32)} ${getRecipeDurationSec(recipe).toFixed(2)}s ${(bytes.length / 1024)
      .toFixed(1)
      .padStart(6)} KB  ${relative(PUBLIC_DIR, target)}`,
  );
}

const stale = removeStaleFiles(written);

process.stdout.write(`${rows.join('\n')}\n\n`);
process.stdout.write(
  `${written.size} clips, mono 16-bit ${SFX_SAMPLE_RATE} Hz, ${(totalBytes / 1024).toFixed(1)} KB total\n`,
);
if (stale.length > 0) {
  process.stdout.write(`removed ${stale.length} stale file(s):\n  ${stale.join('\n  ')}\n`);
}
if (totalBytes > SFX_SIZE_BUDGET_BYTES) {
  process.stderr.write(`over the ${SFX_SIZE_BUDGET_BYTES} byte budget for generated sfx\n`);
  process.exitCode = 1;
}
