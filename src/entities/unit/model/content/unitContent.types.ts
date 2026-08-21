/**
 * Authored creature content contract.
 *
 * Creature stats are hand-tuned data, not a formula of the unit tier: content
 * files live in `src/content/units/<race>.json` and are the single source of
 * truth for the unit registry. Everything here describes the *raw* file shape,
 * so ids, races and tiers stay primitive - narrowing them to `UnitId`,
 * `RaceId` and `UnitTier` is the content validator's job.
 */

import { UnitArmorType, UnitMoveType, UnitSizeClass } from '../../../../shared/types/content-ids';

/** Bumped whenever the authored creature format changes shape. */
export const UNIT_CONTENT_SCHEMA_VERSION = 1;

export type UnitContentEntry = {
  id: string;
  name: string;
  tier: number;
  health: number;
  speed: number;
  armor: number;
  damage: number;
  rewardGold: number;
  spriteKey: string;
  description?: string;
  moveType?: string;
  sizeClass?: string;
  armorType?: string;
};

export type UnitTraits = {
  moveType: UnitMoveType;
  sizeClass: UnitSizeClass;
  armorType: UnitArmorType;
};

/**
 * Traits are optional in content: a creature only declares what makes it
 * different. Everything else is a plain ground footsoldier.
 */
export const UNIT_TRAIT_DEFAULTS: UnitTraits = {
  moveType: UnitMoveType.GROUND,
  sizeClass: UnitSizeClass.MEDIUM,
  armorType: UnitArmorType.LIGHT,
};

export type UnitContentFile = {
  schemaVersion: number;
  race: string;
  units: UnitContentEntry[];
};

export type UnitContentStatKey = 'health' | 'speed' | 'armor' | 'damage' | 'rewardGold';

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
  armor: { min: 0, max: 50 },
  damage: { min: 0, max: 500 },
  rewardGold: { min: 0, max: 500 },
};

export const UNIT_CONTENT_REQUIRED_KEYS: readonly (keyof UnitContentEntry)[] = [
  'id',
  'name',
  'tier',
  'health',
  'speed',
  'armor',
  'damage',
  'rewardGold',
  'spriteKey',
];

export const UNIT_CONTENT_OPTIONAL_KEYS: readonly (keyof UnitContentEntry)[] = [
  'description',
  'moveType',
  'sizeClass',
  'armorType',
];

export const UNIT_CONTENT_FILE_KEYS: readonly (keyof UnitContentFile)[] = [
  'schemaVersion',
  'race',
  'units',
];
