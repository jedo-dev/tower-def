/**
 * Tower id vocabulary. Kept in its own leaf module so the content loader can
 * validate ids without importing the tower types that load content themselves.
 */
export const BUILDABLE_TOWER_IDS = [
  'undead_bone_archer_tower',
  'undead_plague_tower',
  'orc_spear_watchtower',
  'human_guard_archer_tower',
  'elf_moon_archer_tower',
] as const;

export type BuildableTowerId = (typeof BUILDABLE_TOWER_IDS)[number];
