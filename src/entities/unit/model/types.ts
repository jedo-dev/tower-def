export enum Faction {
  UNDEAD = 'UNDEAD',
  ORC = 'ORC',
  HUMAN = 'HUMAN',
  ELF = 'ELF',
}

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
  | 'undead_frost_wyrm';

export type UnitConfig = {
  id: UnitId;
  name: string;
  faction: Faction;
  tier: UnitTier;
  health: number;
  speed: number;
  armor: number;
  damage: number;
  rewardGold: number;
  spriteKey: string;
  description?: string;
};

