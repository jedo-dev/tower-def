/**
 * Sound vocabulary shared by content validation and the audio runtime.
 *
 * A `SoundId` names exactly one clip, and every clip has its own file
 * (`SOUND_ASSET_PATHS`): two ids never share a file. When two races or towers
 * should sound alike, their sound profiles (`src/content/audio`) point at the
 * same id instead, so the sharing is explicit and visible in content.
 *
 * Ids are split into one group per race plus a race-neutral core, so each
 * race can be authored in its own files. Naming of per-entity ids:
 *
 * - `combat.creep.<unitId>.<hit|death|escape|spawn>`
 * - `combat.tower.<towerId>.<attack|impact|upgrade>`
 */
import { CORE_SOUND_IDS } from './core';
import { ELF_SOUND_IDS } from './elf';
import { HUMAN_SOUND_IDS } from './human';
import { ORC_SOUND_IDS } from './orc';
import { UNDEAD_SOUND_IDS } from './undead';

export { CORE_SOUND_IDS, type CoreSoundId } from './core';
export { ELF_SOUND_IDS, type ElfSoundId } from './elf';
export { HUMAN_SOUND_IDS, type HumanSoundId } from './human';
export { ORC_SOUND_IDS, type OrcSoundId } from './orc';
export { UNDEAD_SOUND_IDS, type UndeadSoundId } from './undead';
export * from './slots';

export const SOUND_IDS = [
  ...CORE_SOUND_IDS,
  ...UNDEAD_SOUND_IDS,
  ...ORC_SOUND_IDS,
  ...HUMAN_SOUND_IDS,
  ...ELF_SOUND_IDS,
] as const;

export type SoundId = (typeof SOUND_IDS)[number];

/** The groups sound ids are authored in: the race-neutral core and one per race. */
export const SOUND_GROUP_IDS = ['core', 'undead', 'orc', 'human', 'elf'] as const;

export type SoundGroupId = (typeof SOUND_GROUP_IDS)[number];

/** A race group: every group except the core. */
export type RaceSoundGroupId = Exclude<SoundGroupId, 'core'>;

export const RACE_SOUND_GROUP_IDS: readonly RaceSoundGroupId[] = ['undead', 'orc', 'human', 'elf'];

export const SOUND_IDS_BY_GROUP: Record<SoundGroupId, readonly SoundId[]> = {
  core: CORE_SOUND_IDS,
  undead: UNDEAD_SOUND_IDS,
  orc: ORC_SOUND_IDS,
  human: HUMAN_SOUND_IDS,
  elf: ELF_SOUND_IDS,
};
