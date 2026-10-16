/**
 * Authored creature content contract.
 *
 * Creature stats are hand-tuned data, not a formula of the unit tier: content
 * files live in `src/content/units/<race>.json` and are the single source of
 * truth for the unit registry. Everything here describes the *raw* file shape,
 * so ids, races and tiers stay primitive - narrowing them to `UnitId`,
 * `RaceId` and `UnitTier` is the content validator's job.
 */

import { ARMOR_BOUNDS } from '../../../../shared/constants/damage';
import { UnitMoveType, UnitSizeClass } from '../../../../shared/types/content-ids';

/**
 * Bumped whenever the authored creature format changes shape. Version 3 (shared
 * with towers, which gained damage types in the same change) replaced the
 * single `armor` and the `armorType` bonus with `physicalArmor` and
 * `magicalArmor`. Version 4 added the required `talentBranches`.
 */
export const UNIT_CONTENT_SCHEMA_VERSION = 4;

/** The two-armor format without talent branches, recognised to explain the migration. */
export const UNIT_CONTENT_NO_TALENTS_SCHEMA_VERSION = 3;

/** The retired single-armor format, recognised only to explain the rejection. */
export const UNIT_CONTENT_SINGLE_ARMOR_SCHEMA_VERSION = 1;

export type UnitContentEntry = {
  id: string;
  name: string;
  tier: number;
  health: number;
  speed: number;
  physicalArmor: number;
  magicalArmor: number;
  damage: number;
  rewardGold: number;
  spriteKey: string;
  description?: string;
  /** Bestiary flavour text in the race's voice; at most `CONTENT_LORE_MAX_LENGTH`. */
  lore?: string;
  moveType?: string;
  sizeClass?: string;
  /** Optional creature abilities, validated by `parseUnitAbilities`. */
  abilities?: unknown;
  talentBranches: UnitTalentBranchContentEntry[];
};

/** One authored grade (1-4) of a creature talent branch. */
export type UnitTalentGradeContentEntry = {
  level: number;
  health: number;
  speed: number;
  physicalArmor: number;
  magicalArmor: number;
  /** Optional creature abilities, validated by `parseCreatureAbilities`. */
  abilities?: unknown;
};

export type UnitTalentBranchContentEntry = {
  id: string;
  name: string;
  description: string;
  grades: UnitTalentGradeContentEntry[];
};

export type UnitTraits = {
  moveType: UnitMoveType;
  sizeClass: UnitSizeClass;
};

/**
 * Traits are optional in content: a creature only declares what makes it
 * different. Everything else is a plain ground footsoldier.
 */
export const UNIT_TRAIT_DEFAULTS: UnitTraits = {
  moveType: UnitMoveType.GROUND,
  sizeClass: UnitSizeClass.MEDIUM,
};

export type UnitContentFile = {
  schemaVersion: number;
  race: string;
  units: UnitContentEntry[];
};

export type UnitContentStatKey = 'health' | 'speed' | 'damage' | 'rewardGold';

export type UnitArmorStatKey = 'physicalArmor' | 'magicalArmor';

export type UnitStatBound = {
  min: number;
  max: number;
};

/**
 * Authoring guard rails. A creature outside these bounds is a typo rather than
 * a design decision, so the validator rejects it instead of shipping a wave
 * that cannot be beaten.
 */
export const UNIT_STAT_BOUNDS: Record<UnitContentStatKey, UnitStatBound> = {
  health: { min: 1, max: 5000 },
  speed: { min: 0.1, max: 6 },
  damage: { min: 0, max: 500 },
  rewardGold: { min: 0, max: 500 },
};

/** Both armors are whole points within `ARMOR_BOUNDS`. */
export const UNIT_ARMOR_BOUNDS: Record<UnitArmorStatKey, UnitStatBound> = {
  physicalArmor: ARMOR_BOUNDS,
  magicalArmor: ARMOR_BOUNDS,
};

export const UNIT_CONTENT_REQUIRED_KEYS: readonly (keyof UnitContentEntry)[] = [
  'id',
  'name',
  'tier',
  'health',
  'speed',
  'physicalArmor',
  'magicalArmor',
  'damage',
  'rewardGold',
  'spriteKey',
  'talentBranches',
];

export const UNIT_CONTENT_OPTIONAL_KEYS: readonly (keyof UnitContentEntry)[] = [
  'description',
  'lore',
  'moveType',
  'sizeClass',
  'abilities',
];

export const UNIT_CONTENT_FILE_KEYS: readonly (keyof UnitContentFile)[] = [
  'schemaVersion',
  'race',
  'units',
];

export const UNIT_TALENT_BRANCH_KEYS: readonly (keyof UnitTalentBranchContentEntry)[] = [
  'id',
  'name',
  'description',
  'grades',
];

export const UNIT_TALENT_GRADE_KEYS: readonly (keyof UnitTalentGradeContentEntry)[] = [
  'level',
  'health',
  'speed',
  'physicalArmor',
  'magicalArmor',
  'abilities',
];
