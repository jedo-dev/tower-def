// Procedural SFX generator: renders every recipe in
// src/shared/lib/sfx-synth/recipes to the wav file its sound id is registered
// with, removes generated files no id points at any more, and prints a size
// report per group. The two authored ambience loops are never touched.
//
//   npm run gen:sfx                  every group
//   npm run gen:sfx -- --race orc    only the orc group (combat/orc/)
//   npm run gen:sfx -- --race core   only the race-neutral clips
//
// A filtered run writes, deletes and budgets only the files of its group.
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { SFX_ASSET_ROOT, SOUND_ASSET_PATHS } from '../src/shared/lib/sound-registry/audio.constants';
import {
  SFX_GROUP_BUDGET_BYTES,
  SFX_RECIPES,
  SFX_SAMPLE_RATE,
  findSfxBudgetViolations,
  getGeneratedSoundIdsOfGroup,
  getRecipeDurationSec,
  parseSfxGroupArgument,
  renderSfxRecipeToWav,
  selectStaleSfxFiles,
} from '../src/shared/lib/sfx-synth';
import { SOUND_GROUP_IDS, type SoundGroupId } from '../src/shared/types/sound-ids';

const PUBLIC_DIR = resolve(import.meta.dirname, '..', 'public');
const SFX_DIR = join(PUBLIC_DIR, SFX_ASSET_ROOT);
const KILOBYTE = 1024;

function listWavFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      return listWavFiles(fullPath);
    }
    return entry.endsWith('.wav') ? [fullPath] : [];
  });
}

/** Path relative to the sfx root with forward slashes, e.g. `combat/orc/impact.wav`. */
function toSfxRelative(fullPath: string): string {
  return relative(SFX_DIR, fullPath).replaceAll('\\', '/');
}

function formatKilobytes(bytes: number): string {
  return `${(bytes / KILOBYTE).toFixed(1)} KB`;
}

function readSelectedGroup(): SoundGroupId | undefined {
  try {
    return parseSfxGroupArgument(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

const selectedGroup = readSelectedGroup();
const groups: readonly SoundGroupId[] = selectedGroup ? [selectedGroup] : SOUND_GROUP_IDS;

const written = new Set<string>();
const bytesByGroup: Partial<Record<SoundGroupId, number>> = {};
const rows: string[] = [];

for (const group of groups) {
  let groupBytes = 0;

  for (const soundId of getGeneratedSoundIdsOfGroup(group)) {
    const recipe = SFX_RECIPES[soundId];
    const target = join(PUBLIC_DIR, SOUND_ASSET_PATHS[soundId]);
    const bytes = renderSfxRecipeToWav(recipe);

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
    written.add(toSfxRelative(target));
    groupBytes += bytes.length;
    rows.push(
      `${soundId.padEnd(44)} ${getRecipeDurationSec(recipe).toFixed(2)}s ${(bytes.length / KILOBYTE)
        .toFixed(1)
        .padStart(6)} KB  ${relative(PUBLIC_DIR, target)}`,
    );
  }

  bytesByGroup[group] = groupBytes;
}

const stale = selectStaleSfxFiles(listWavFiles(SFX_DIR).map(toSfxRelative), written, selectedGroup);
stale.forEach((file) => rmSync(join(SFX_DIR, file)));

process.stdout.write(`${rows.join('\n')}\n\n`);
for (const group of groups) {
  const bytes = bytesByGroup[group] ?? 0;
  process.stdout.write(
    `${group.padEnd(7)} ${formatKilobytes(bytes).padStart(10)} of ${formatKilobytes(SFX_GROUP_BUDGET_BYTES[group])}\n`,
  );
}
process.stdout.write(`${written.size} clips, mono 16-bit ${SFX_SAMPLE_RATE} Hz\n`);
if (stale.length > 0) {
  process.stdout.write(`removed ${stale.length} stale file(s):\n  ${stale.join('\n  ')}\n`);
}

for (const violation of findSfxBudgetViolations(bytesByGroup)) {
  process.stderr.write(
    `${violation.group} is over its budget: ${formatKilobytes(violation.bytes)} of ${formatKilobytes(violation.budgetBytes)}\n`,
  );
  process.exitCode = 1;
}
