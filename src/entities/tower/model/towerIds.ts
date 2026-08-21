/**
 * Tower id vocabulary. Kept in its own leaf module so the content loader can
 * validate ids without importing the tower types that load content themselves.
 */
export const BUILDABLE_TOWER_IDS = [
  'undead_bone_archer_tower',
  'undead_plague_tower',
  'undead_frost_wyrm_nest',
  'undead_bone_obelisk',
  'orc_spear_watchtower',
  'orc_burning_pit',
  'orc_lightning_totem',
  'orc_tar_pit',
  'human_guard_archer_tower',
  'human_cannon_bastion',
  'human_alchemist_tower',
  'human_guard_post',
  'elf_moon_archer_tower',
  'elf_wisp_bloom',
  'elf_moonwell',
  'elf_thorn_spire',
] as const;

export type BuildableTowerId = (typeof BUILDABLE_TOWER_IDS)[number];
