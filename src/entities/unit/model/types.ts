import type { UnitMoveType, UnitSizeClass } from '../../../shared/types/content-ids';
import { RaceId } from '../../../shared/types/content-ids';

export { RaceId as Faction };

export enum UnitTier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
  TIER_4 = 4,
  TIER_5 = 5,
  TIER_6 = 6,
}

export const UNIT_TIERS: readonly UnitTier[] = [
  UnitTier.TIER_1,
  UnitTier.TIER_2,
  UnitTier.TIER_3,
  UnitTier.TIER_4,
  UnitTier.TIER_5,
  UnitTier.TIER_6,
] as const;

/**
 * Every creature the game knows about. Authored content must resolve to one of
 * these ids, so a renamed or invented id fails validation instead of spawning
 * a creature nothing else can reference.
 */
export const UNIT_IDS = [
  'undead_skeleton',
  'undead_ghoul',
  'undead_crypt_fiend',
  'undead_gargoyle',
  'undead_abomination',
  'undead_necromancer',
  'undead_banshee',
  'undead_frost_wyrm',
  'orc_grunt',
  'orc_peon',
  'orc_wolf_rider',
  'orc_troll',
  'orc_headhunter',
  'orc_shaman',
  'orc_wind_rider',
  'orc_tauren',
  'human_militia',
  'human_peasant',
  'human_footman',
  'human_rifleman',
  'human_siege_engine',
  'human_knight',
  'human_sorceress',
  'human_gryphon_rider',
  'elf_archer',
  'elf_wisp',
  'elf_huntress',
  'elf_dryad',
  'elf_chimera',
  'elf_druid_of_the_claw',
  'elf_hippogryph',
  'elf_mountain_giant',
] as const;

export type UnitId = (typeof UNIT_IDS)[number];

export type UnitConfig = {
  id: UnitId;
  name: string;
  faction: RaceId;
  tier: UnitTier;
  health: number;
  speed: number;
  /** Mitigates physical hits, `ARMOR_BOUNDS` range; negative amplifies. */
  physicalArmor: number;
  /** Mitigates magical hits and damage over time, same range. */
  magicalArmor: number;
  damage: number;
  rewardGold: number;
  spriteKey: string;
  description?: string;
  /** Bestiary flavour text, one or two sentences in the race's voice. */
  lore?: string;
  /** Resolved traits: content may omit them, the loader fills the defaults. */
  moveType: UnitMoveType;
  sizeClass: UnitSizeClass;
};
