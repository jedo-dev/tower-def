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
  'combat.creep.orc_peon.hit',
  'combat.creep.orc_peon.death',
  'combat.creep.orc_peon.escape',
  'combat.creep.orc_peon.spawn',
  'combat.creep.orc_wolf_rider.hit',
  'combat.creep.orc_wolf_rider.death',
  'combat.creep.orc_wolf_rider.escape',
  'combat.creep.orc_wolf_rider.spawn',
  'combat.creep.orc_troll.hit',
  'combat.creep.orc_troll.death',
  'combat.creep.orc_troll.escape',
  'combat.creep.orc_troll.spawn',
  'combat.creep.orc_headhunter.hit',
  'combat.creep.orc_headhunter.death',
  'combat.creep.orc_headhunter.escape',
  'combat.creep.orc_headhunter.spawn',
  'combat.creep.orc_shaman.hit',
  'combat.creep.orc_shaman.death',
  'combat.creep.orc_shaman.escape',
  'combat.creep.orc_shaman.spawn',
  'combat.creep.orc_wind_rider.hit',
  'combat.creep.orc_wind_rider.death',
  'combat.creep.orc_wind_rider.escape',
  'combat.creep.orc_wind_rider.spawn',
  'combat.creep.orc_tauren.hit',
  'combat.creep.orc_tauren.death',
  'combat.creep.orc_tauren.escape',
  'combat.creep.orc_tauren.spawn',
  // Towers: combat.tower.<towerId>.<attack|impact|upgrade>
  'combat.tower.orc_spear_watchtower.attack',
  'combat.tower.orc_spear_watchtower.impact',
  'combat.tower.orc_burning_pit.attack',
  'combat.tower.orc_burning_pit.impact',
  'combat.tower.orc_lightning_totem.attack',
  'combat.tower.orc_lightning_totem.impact',
  'combat.tower.orc_tar_pit.attack',
  'combat.tower.orc_tar_pit.impact',
] as const satisfies readonly `combat.${string}`[];

export type OrcSoundId = (typeof ORC_SOUND_IDS)[number];
