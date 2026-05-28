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

export type UnitId =
  | 'undead_skeleton'
  | 'undead_ghoul'
  | 'undead_crypt_fiend'
  | 'undead_gargoyle'
  | 'undead_abomination'
  | 'undead_necromancer'
  | 'undead_banshee'
  | 'undead_frost_wyrm'
  | 'orc_grunt'
  | 'orc_wolf_rider'
  | 'orc_troll'
  | 'orc_headhunter'
  | 'human_militia'
  | 'human_footman'
  | 'human_rifleman'
  | 'human_siege_engine'
  | 'elf_archer'
  | 'elf_huntress'
  | 'elf_dryad'
  | 'elf_chimera';

export type UnitConfig = {
  id: UnitId;
  name: string;
  faction: RaceId;
  tier: UnitTier;
  health: number;
  speed: number;
  armor: number;
  damage: number;
  rewardGold: number;
  spriteKey: string;
  description?: string;
};

