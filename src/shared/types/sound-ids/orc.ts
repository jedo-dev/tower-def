/**
 * Orc sounds: thuds, drums and fire. Every id starts with `combat.` and its
 * clip lives under `combat/orc/` (see docs/SOUND_ASSET_LIST.md, "Authoring a
 * race").
 */
export const ORC_SOUND_IDS = [
  'combat.attack.single.orc',
  'combat.attack.splash.orc',
  'combat.attack.chain.orc',
  'combat.attack.frost.orc',
  'combat.impact.orc',
  'combat.build.orc',
  'combat.creep_death.orc',
  // Creatures: combat.creep.<unitId>.<hit|death|escape|spawn>
  'combat.creep.orc_grunt.hit',
  'combat.creep.orc_grunt.death',
  'combat.creep.orc_grunt.escape',
  'combat.creep.orc_grunt.spawn',
  // Towers: combat.tower.<towerId>.<attack|impact|upgrade>
  'combat.tower.orc_spear_watchtower.attack',
  'combat.tower.orc_spear_watchtower.impact',
] as const satisfies readonly `combat.${string}`[];

export type OrcSoundId = (typeof ORC_SOUND_IDS)[number];
