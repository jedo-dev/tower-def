import type { NumericBound } from '../../../../shared/lib/content/contentValidation';
import type { TowerAbilities } from '../abilities';
import type { TowerAuraDefinition } from './towerContentFields';

/**
 * Authored contract of the optional tower abilities (tower-def-bge.2): the
 * `abilities` object a `levels[]` entry may carry, the optional aura
 * extensions and the extra on-hit effect fields. Talent grade objects reuse
 * the same field names. Values outside the bounds are typos.
 */

export type TowerAbilityKey = keyof TowerAbilities;

export const TOWER_ABILITY_KEYS: readonly TowerAbilityKey[] = [
  'critEveryNthShot',
  'critMultiplier',
  'extraTargets',
  'extraTargetDamageShare',
  'pierceLine',
  'airDamageMultiplier',
  'groundDamageMultiplier',
  'fullHealthBonusMultiplier',
  'largeTargetMultiplier',
  'minRangeCells',
  'volleyEveryMs',
  'volleyDamageShare',
  'coneDegrees',
];

/** Abilities read as whole numbers. */
export const TOWER_ABILITY_INTEGER_KEYS: readonly TowerAbilityKey[] = [
  'critEveryNthShot',
  'extraTargets',
];

export const TOWER_ABILITY_BOUNDS: Record<TowerAbilityKey, NumericBound> = {
  critEveryNthShot: { min: 2, max: 20 },
  critMultiplier: { min: 1, max: 10 },
  extraTargets: { min: 1, max: 6 },
  extraTargetDamageShare: { min: 0, max: 1 },
  pierceLine: { min: 0, max: 1 },
  airDamageMultiplier: { min: 0, max: 5 },
  groundDamageMultiplier: { min: 0, max: 5 },
  fullHealthBonusMultiplier: { min: 0, max: 5 },
  largeTargetMultiplier: { min: 0, max: 5 },
  minRangeCells: { min: 0, max: 12 },
  volleyEveryMs: { min: 500, max: 60_000 },
  volleyDamageShare: { min: 0, max: 5 },
  coneDegrees: { min: 10, max: 180 },
};

export type TowerAuraExtensionNumberKey =
  | 'damagePercentBonus'
  | 'goldPerKill'
  | 'incomePerRound'
  | 'sellRefundBonus';

export const TOWER_AURA_EXTENSION_NUMBER_KEYS: readonly TowerAuraExtensionNumberKey[] = [
  'damagePercentBonus',
  'goldPerKill',
  'incomePerRound',
  'sellRefundBonus',
];

export const TOWER_AURA_EXTENSION_KEYS: readonly (keyof TowerAuraDefinition)[] = [
  ...TOWER_AURA_EXTENSION_NUMBER_KEYS,
  'damageBonusType',
];

export const TOWER_AURA_EXTENSION_BOUNDS: Record<TowerAuraExtensionNumberKey, NumericBound> = {
  damagePercentBonus: { min: 0, max: 2 },
  goldPerKill: { min: 0, max: 50 },
  incomePerRound: { min: 0, max: 200 },
  sellRefundBonus: { min: 0, max: 1 },
};

/** Bound of an on-hit effect's authored stack cap; 1 means it does not stack. */
export const TOWER_STACK_BOUNDS = {
  maxStacks: { min: 1, max: 10 },
} as const;

/** Bounds of the chill freeze fields on an on-hit effect entry. */
export const TOWER_FREEZE_BOUNDS = {
  freezeAtStacks: { min: 2, max: 20 },
  freezeMs: { min: 100, max: 10_000 },
} as const;
