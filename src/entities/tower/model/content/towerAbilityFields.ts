import {
  ARMOR_KINDS,
  DAMAGE_SCOPES,
  EffectId,
  EffectStackingRule,
  type ArmorKind,
  type DamageScope,
} from '../../../../shared/types/content-ids';
import { resolveEffectDefinition } from '../../../../shared/constants/effects';
import {
  ContentValidationError,
  assertKnownKeys,
  readBoundedInteger,
  readNumber,
  readRecord,
  readStringFrom,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import type { TowerAbilities } from '../abilities';
import type { TowerOnHitEffect } from '../types';
import {
  TOWER_ABILITY_BOUNDS,
  TOWER_ABILITY_INTEGER_KEYS,
  TOWER_ABILITY_KEYS,
  TOWER_AURA_EXTENSION_BOUNDS,
  TOWER_AURA_EXTENSION_NUMBER_KEYS,
  TOWER_FREEZE_BOUNDS,
  TOWER_STACK_BOUNDS,
} from './towerAbilities.types';

/**
 * Parsers for the optional tower abilities: a level's `abilities` object, the
 * aura extensions and the extra on-hit effect fields. Each fails naming the
 * file and the tower; a field that only one effect understands fails on any
 * other effect.
 */

/** Fields that only make sense together; the first needs the second. */
const ABILITY_REQUIREMENTS: readonly [keyof TowerAbilities, keyof TowerAbilities][] = [
  ['critEveryNthShot', 'critMultiplier'],
  ['critMultiplier', 'critEveryNthShot'],
  ['extraTargetDamageShare', 'extraTargets'],
  ['volleyDamageShare', 'volleyEveryMs'],
];

function assertAbilityRequirements(abilities: TowerAbilities, location: ContentLocation): void {
  for (const [field, required] of ABILITY_REQUIREMENTS) {
    if (abilities[field] !== undefined && abilities[required] === undefined) {
      throw new ContentValidationError(
        location,
        `ability "${field}" needs "${required}" in the same abilities object`,
      );
    }
  }
}

/**
 * `abilities` of a `levels[]` entry: undefined when absent or empty. `range`
 * is the level's range; a minimum range must stay below it.
 */
export function parseAbilities(
  level: Record<string, unknown>,
  location: ContentLocation,
  range: number,
): TowerAbilities | undefined {
  if (level.abilities === undefined) {
    return undefined;
  }

  const raw = readRecord(level.abilities, location);
  assertKnownKeys(raw, TOWER_ABILITY_KEYS, location);

  const abilities: TowerAbilities = {};

  for (const key of TOWER_ABILITY_KEYS) {
    if (raw[key] === undefined) {
      continue;
    }
    abilities[key] = TOWER_ABILITY_INTEGER_KEYS.includes(key)
      ? readBoundedInteger(raw, key, location, TOWER_ABILITY_BOUNDS[key])
      : readNumber(raw, key, location, TOWER_ABILITY_BOUNDS[key]);
  }

  assertAbilityRequirements(abilities, location);

  if (abilities.minRangeCells !== undefined && abilities.minRangeCells >= range) {
    throw new ContentValidationError(
      location,
      `ability "minRangeCells" (${abilities.minRangeCells}) must be below the level range (${range})`,
    );
  }

  return Object.keys(abilities).length === 0 ? undefined : abilities;
}

export type TowerAuraExtensions = {
  damagePercentBonus?: number;
  damageBonusType?: DamageScope;
  goldPerKill?: number;
  incomePerRound?: number;
  sellRefundBonus?: number;
};

/** The optional economy and damage fields of an aura shape; only the authored ones. */
export function parseAuraExtensions(
  aura: Record<string, unknown>,
  location: ContentLocation,
): TowerAuraExtensions {
  const extensions: TowerAuraExtensions = {};

  for (const key of TOWER_AURA_EXTENSION_NUMBER_KEYS) {
    if (aura[key] !== undefined) {
      extensions[key] = readNumber(aura, key, location, TOWER_AURA_EXTENSION_BOUNDS[key]);
    }
  }

  if (aura.damageBonusType !== undefined) {
    if (extensions.damagePercentBonus === undefined) {
      throw new ContentValidationError(
        location,
        'aura "damageBonusType" needs "damagePercentBonus"',
      );
    }
    extensions.damageBonusType = readStringFrom(aura, 'damageBonusType', location, DAMAGE_SCOPES);
  }

  return extensions;
}

/**
 * `maxStacks` of an on-hit effect: the authoritative stack cap of the
 * application (1 = does not stack), a whole number in `TOWER_STACK_BOUNDS`.
 * Only a stacking effect has stacks to cap, so it fails on any other.
 */
export function parseOnHitEffectMaxStacks(
  effect: Record<string, unknown>,
  effectId: EffectId,
  location: ContentLocation,
): number | undefined {
  if (effect.maxStacks === undefined) {
    return undefined;
  }
  if (resolveEffectDefinition(effectId).stackingRule !== EffectStackingRule.STACK) {
    throw new ContentValidationError(
      location,
      `effect "${effectId}" does not stack and cannot declare "maxStacks"`,
    );
  }
  return readBoundedInteger(effect, 'maxStacks', location, TOWER_STACK_BOUNDS.maxStacks);
}

type OnHitEffectExtensions = Pick<
  TowerOnHitEffect,
  'armorKind' | 'damageKind' | 'freezeAtStacks' | 'freezeMs' | 'groundsFliersMs'
>;

function assertEffectField(
  effect: Record<string, unknown>,
  key: keyof OnHitEffectExtensions,
  effectId: EffectId,
  allowedEffectId: EffectId,
  location: ContentLocation,
): boolean {
  if (effect[key] === undefined) {
    return false;
  }
  if (effectId !== allowedEffectId) {
    throw new ContentValidationError(
      location,
      `effect "${effectId}" cannot declare "${key}"; only "${allowedEffectId}" can`,
    );
  }
  return true;
}

/**
 * Effect-specific on-hit fields: `armorKind` (armor break), `damageKind`
 * (vulnerability), `freezeAtStacks` + `freezeMs` + `groundsFliersMs` (chill).
 */
export function parseOnHitEffectExtensions(
  effect: Record<string, unknown>,
  effectId: EffectId,
  location: ContentLocation,
): OnHitEffectExtensions {
  const extensions: OnHitEffectExtensions = {};

  if (assertEffectField(effect, 'armorKind', effectId, EffectId.ARMOR_BREAK, location)) {
    const armorKind: ArmorKind = readStringFrom(effect, 'armorKind', location, ARMOR_KINDS);
    extensions.armorKind = armorKind;
  }

  if (assertEffectField(effect, 'damageKind', effectId, EffectId.VULNERABILITY, location)) {
    extensions.damageKind = readStringFrom(effect, 'damageKind', location, DAMAGE_SCOPES);
  }

  if (assertEffectField(effect, 'freezeAtStacks', effectId, EffectId.CHILL, location)) {
    extensions.freezeAtStacks = readBoundedInteger(
      effect,
      'freezeAtStacks',
      location,
      TOWER_FREEZE_BOUNDS.freezeAtStacks,
    );
  }

  if (assertEffectField(effect, 'freezeMs', effectId, EffectId.CHILL, location)) {
    if (extensions.freezeAtStacks === undefined) {
      throw new ContentValidationError(location, 'chill "freezeMs" needs "freezeAtStacks"');
    }
    extensions.freezeMs = readNumber(effect, 'freezeMs', location, TOWER_FREEZE_BOUNDS.freezeMs);
  }

  if (assertEffectField(effect, 'groundsFliersMs', effectId, EffectId.CHILL, location)) {
    if (extensions.freezeAtStacks === undefined) {
      throw new ContentValidationError(location, 'chill "groundsFliersMs" needs "freezeAtStacks"');
    }
    extensions.groundsFliersMs = readNumber(
      effect,
      'groundsFliersMs',
      location,
      TOWER_FREEZE_BOUNDS.groundsFliersMs,
    );
  }

  return extensions;
}
