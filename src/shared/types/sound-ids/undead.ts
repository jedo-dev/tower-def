/**
 * Undead sounds: bony clicks and necrotic hiss. Every id starts with `combat.`
 * and its clip lives under `combat/undead/` (see docs/SOUND_ASSET_LIST.md,
 * "Authoring a race").
 */
export const UNDEAD_SOUND_IDS = [
  'combat.attack.single.undead',
  'combat.attack.splash.undead',
  'combat.attack.frost.undead',
  'combat.impact.undead',
  'combat.build.undead',
  'combat.creep_death.undead',
] as const satisfies readonly `combat.${string}`[];

export type UndeadSoundId = (typeof UNDEAD_SOUND_IDS)[number];
