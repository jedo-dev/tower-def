/**
 * Human sounds: steel, powder and glass. Every id starts with `combat.` and
 * its clip lives under `combat/human/` (see docs/SOUND_ASSET_LIST.md,
 * "Authoring a race").
 */
export const HUMAN_SOUND_IDS = [
  'combat.attack.single.human',
  'combat.attack.splash.human',
  'combat.attack.poison.human',
  'combat.impact.human',
  'combat.build.human',
  'combat.creep_death.human',
] as const satisfies readonly `combat.${string}`[];

export type HumanSoundId = (typeof HUMAN_SOUND_IDS)[number];
