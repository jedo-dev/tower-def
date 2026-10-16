import type { DamageType, RaceId } from '../../../shared/types/content-ids';
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
  /** Tooltip for the physical armor stat: how hard physical hits land. */
  physicalArmorHint: string;
  /** Tooltip for the magical armor stat: how hard magical hits land. */
  magicalArmorHint: string;
  sizeClass: string;
  moveType: string;
  rewardGold: number;
  economy: TierEconomyViewModel;
  description: string | null;
  lore: string | null;
  /** The two talent branches; a side picks one per creature for the match. */
  talentBranches: CreepBranchViewModel[];
};

/** One creature talent grade (1-4) as the card's branch table shows it. */
export type CreepBranchGradeViewModel = {
  level: number;
  /** Wave 1 health at this grade. */
  health: number;
  speed: number;
  physicalArmor: number;
  magicalArmor: number;
  /** The grade's abilities in one line, or a dash. */
  special: string;
};

/** A creature talent branch with its grade 1-4 table. */
export type CreepBranchViewModel = {
  id: string;
  name: string;
  /** Fallback mark when the branch icon fails to load. */
  glyph: string;
  description: string;
  grades: CreepBranchGradeViewModel[];
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

/** The damage type a tower deals, with a glyph, a short label and a tooltip. */
export type DamageTypeViewModel = {
  type: DamageType;
  glyph: string;
  label: string;
  hint: string;
};

/** One talent grade (4-7) as the card's branch table shows it. */
export type TowerBranchGradeViewModel = {
  level: number;
  upgradeCost: number;
  /** Hit damage as shown: points, a share of max HP, or a dash for a support grade. */
  damage: string;
  range: string;
  cooldown: string;
  /** Everything else the grade does in one line, or a dash. */
  special: string;
};

/** A talent branch the tower opens at grade 3, with its grade 4-7 table. */
export type TowerBranchViewModel = {
  id: string;
  name: string;
  /** Fallback mark when the branch icon fails to load. */
  glyph: string;
  description: string;
  grades: TowerBranchGradeViewModel[];
};

export type TowerCardViewModel = {
  id: BuildableTowerId;
  name: string;
  spriteKey: string;
  archetypeName: string;
  cost: number;
  damage: number;
  /** `damage` as the card shows it: a number, or a share of max HP for percent towers. */
  damageLabel: string;
  damageType: DamageTypeViewModel;
  rangeCells: number;
  cooldownMs: number;
  specials: TowerSpecialViewModel[];
  levels: TowerLevelViewModel[];
  /** The two branches; choosing one locks the other for the match. */
  talentBranches: TowerBranchViewModel[];
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
