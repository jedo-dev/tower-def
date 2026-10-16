import type { RaceId } from '../../../shared/types/content-ids';
import type { FactionThemeName } from '../../../shared/constants/theme';
import type { UnitId, UnitTier } from '../../../entities/unit';
import type { BuildableTowerId } from '../../../entities/tower';

/** Economy of sending one creep of a tier, read from the duel balance tables. */
export type TierEconomyViewModel = {
  sendCost: number;
  incomeBonus: number;
  /** Most creeps of one type a side may queue per wave. */
  perWaveCap: number;
  /** First baseline wave the tier appears in. */
  unlockWave: number;
};

export type CreepCardViewModel = {
  id: UnitId;
  name: string;
  tier: UnitTier;
  /** Authored health, what the creep has in wave 1 before wave growth. */
  health: number;
  speed: number;
  physicalArmor: number;
  magicalArmor: number;
  sizeClass: string;
  moveType: string;
  rewardGold: number;
  economy: TierEconomyViewModel;
  description: string | null;
  lore: string | null;
};

export type TowerSpecialViewModel = {
  key: string;
  label: string;
  value: string;
};

export type TowerLevelViewModel = {
  level: number;
  /** Null for the level the tower is built with. */
  upgradeCost: number | null;
  summary: string;
};

export type TowerCardViewModel = {
  id: BuildableTowerId;
  name: string;
  spriteKey: string;
  archetypeName: string;
  cost: number;
  damage: number;
  rangeCells: number;
  cooldownMs: number;
  specials: TowerSpecialViewModel[];
  levels: TowerLevelViewModel[];
  description: string;
  lore: string | null;
};

export type RaceBestiaryViewModel = {
  raceId: RaceId;
  name: string;
  description: string;
  faction: FactionThemeName;
  /** Theme token reference (never a raw colour), for the race accent. */
  themeColor: string;
  creeps: CreepCardViewModel[];
  towers: TowerCardViewModel[];
};

export type BestiaryViewModel = {
  races: RaceBestiaryViewModel[];
};
