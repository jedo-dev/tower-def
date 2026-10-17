import {
  RACE_SOUND_GROUP_IDS,
  SOUND_GROUP_IDS,
  type RaceSoundGroupId,
  type SoundGroupId,
} from '../../types/sound-ids';

/**
 * Generated clips are authored in groups: the race-neutral core and one group
 * per race. Each group owns its own files and its own size budget, so four
 * race authors can work side by side without touching each other's clips.
 */

const KILOBYTE = 1024;

/**
 * Size budget per group, in bytes. Generated wavs are 22050 Hz mono 16-bit,
 * about 44 KB per second of sound.
 */
export const SFX_GROUP_BUDGET_BYTES: Record<SoundGroupId, number> = {
  core: 800 * KILOBYTE,
  undead: 900 * KILOBYTE,
  orc: 900 * KILOBYTE,
  human: 900 * KILOBYTE,
  elf: 900 * KILOBYTE,
};

/** All generated clips together: the sum of the group budgets. */
export const SFX_TOTAL_BUDGET_BYTES = SOUND_GROUP_IDS.reduce(
  (total, group) => total + SFX_GROUP_BUDGET_BYTES[group],
  0,
);

/** Folder (under the sfx root) of the clips that are authored, never generated. */
export const SFX_AUTHORED_FOLDERS: readonly string[] = ['ambient'];

function isRaceGroup(value: string): value is RaceSoundGroupId {
  return (RACE_SOUND_GROUP_IDS as readonly string[]).includes(value);
}

/**
 * The group a clip file belongs to, from its path relative to the sfx root
 * (`combat/orc/impact.wav`). Race clips live under `combat/<race>/`; every
 * other generated file belongs to the core. Authored folders belong to none.
 */
export function getSfxGroupOfFile(relativePath: string): SoundGroupId | undefined {
  const [folder, raceFolder] = relativePath.replaceAll('\\', '/').split('/');

  if (SFX_AUTHORED_FOLDERS.includes(folder)) {
    return undefined;
  }

  return folder === 'combat' && raceFolder !== undefined && isRaceGroup(raceFolder)
    ? raceFolder
    : 'core';
}

/**
 * Generated files to delete: those inside the selected group (all groups when
 * `group` is undefined) that no registered id points at. Files of other
 * groups are never touched, so a filtered run leaves them alone.
 */
export function selectStaleSfxFiles(
  existingFiles: readonly string[],
  expectedFiles: ReadonlySet<string>,
  group: SoundGroupId | undefined,
): string[] {
  return existingFiles.filter((file) => {
    const fileGroup = getSfxGroupOfFile(file);
    if (fileGroup === undefined || expectedFiles.has(file)) {
      return false;
    }
    return group === undefined || fileGroup === group;
  });
}

/**
 * Reads `--race <group>` from the generator arguments. No flag means every
 * group; an unknown group fails instead of silently rendering nothing.
 */
export function parseSfxGroupArgument(args: readonly string[]): SoundGroupId | undefined {
  const flagIndex = args.indexOf('--race');
  if (flagIndex === -1) {
    return undefined;
  }

  const value = args[flagIndex + 1];
  const group = SOUND_GROUP_IDS.find((candidate) => candidate === value);
  if (group === undefined) {
    throw new Error(
      `--race expects one of ${SOUND_GROUP_IDS.join(', ')}; got ${value ?? 'nothing'}`,
    );
  }
  return group;
}

export type SfxBudgetViolation = {
  group: SoundGroupId | 'total';
  bytes: number;
  budgetBytes: number;
};

/** Groups over their budget, and the total when every group was measured. */
export function findSfxBudgetViolations(
  bytesByGroup: Partial<Record<SoundGroupId, number>>,
): SfxBudgetViolation[] {
  const violations: SfxBudgetViolation[] = [];
  let totalBytes = 0;

  for (const group of SOUND_GROUP_IDS) {
    const bytes = bytesByGroup[group];
    if (bytes === undefined) {
      continue;
    }
    totalBytes += bytes;
    if (bytes > SFX_GROUP_BUDGET_BYTES[group]) {
      violations.push({ group, bytes, budgetBytes: SFX_GROUP_BUDGET_BYTES[group] });
    }
  }

  if (totalBytes > SFX_TOTAL_BUDGET_BYTES) {
    violations.push({ group: 'total', bytes: totalBytes, budgetBytes: SFX_TOTAL_BUDGET_BYTES });
  }

  return violations;
}
