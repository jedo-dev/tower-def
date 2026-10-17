/**
 * Elf sounds: bowstrings, air and chimes. Every id starts with `combat.` and
 * its clip lives under `combat/elf/` (see docs/SOUND_ASSET_LIST.md,
 * "Authoring a race").
 */
export const ELF_SOUND_IDS = [
  'combat.attack.single.elf',
  'combat.attack.splash.elf',
  'combat.attack.frost.elf',
  'combat.attack.poison.elf',
  'combat.impact.elf',
  'combat.build.elf',
  'combat.creep_death.elf',
] as const satisfies readonly `combat.${string}`[];

export type ElfSoundId = (typeof ELF_SOUND_IDS)[number];
