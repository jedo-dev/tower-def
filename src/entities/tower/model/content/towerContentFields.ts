import {
  DAMAGE_TYPES,
  DEFAULT_TOWER_TARGET_SCOPE,
  EFFECT_IDS,
  EffectKind,
  TOWER_TARGET_SCOPES,
  TOWER_AURA_STACKING_RULES,
  type DamageType,
  type EffectId,
  type TowerAuraStacking,
  type TowerTargetScope,
} from '../../../../shared/types/content-ids';
import {
  ContentValidationError,
  assertKnownKeys,
  readArray,
  readNumber,
  readRecord,
  readStringFrom,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import { resolveEffectDefinition } from '../../../../shared/constants/effects';
import { TowerTalentRule } from '../../../../shared/constants/towerTalents';
import type { TowerCombatStats, TowerOnHitEffect } from '../types';
import {
  TOWER_AURA_BOUNDS,
  TOWER_AURA_KEYS,
  TOWER_CHAIN_BOUNDS,
  TOWER_CHAIN_KEYS,
  TOWER_LEVEL_BOUNDS,
  TOWER_LEVEL_KEYS,
  TOWER_ON_HIT_EFFECT_KEYS,
  TOWER_STAT_BOUNDS,
} from './towerContent.types';

/**
 * Field parsers shared by race tower entries and archetype entries. Each reads
 * one authored field (or nested shape) and fails naming the file and tower.
 */

export type TowerChainDefinition = {
  bounces: number;
  bounceRangeCells: number;
  damageFalloff: number;
};

export type TowerAuraDefinition = {
  radiusCells: number;
  attackSpeedBonus: number;
  rangeBonus: number;
  stacking: TowerAuraStacking;
};

export type TowerLevelDefinition = {
  level: number;
  upgradeCostGold: number;
  stats: TowerCombatStats;
};

export function parseOnHitEffects(
  entry: Record<string, unknown>,
  location: ContentLocation,
): TowerOnHitEffect[] {
  if (entry.onHitEffects === undefined) {
    return [];
  }

  const rawEffects = readArray(entry, 'onHitEffects', location);

  return rawEffects.map((rawEffect) => {
    const effect = readRecord(rawEffect, location);
    assertKnownKeys(effect, TOWER_ON_HIT_EFFECT_KEYS, location);

    const effectId: EffectId = readStringFrom(effect, 'effectId', location, EFFECT_IDS);
    const damageType = parseOnHitEffectDamageType(effect, effectId, location);

    return {
      effectId,
      magnitude:
        effect.magnitude === undefined ? undefined : readNumber(effect, 'magnitude', location),
      durationMs:
        effect.durationMs === undefined ? undefined : readNumber(effect, 'durationMs', location),
      maxStacks:
        effect.maxStacks === undefined ? undefined : readNumber(effect, 'maxStacks', location),
      ...(damageType === undefined ? {} : { damageType }),
    };
  });
}

/**
 * `damageType` of an on-hit effect: only damage over time deals damage, so a
 * type on a slow or an armor break is a mistake and fails on load.
 */
function parseOnHitEffectDamageType(
  effect: Record<string, unknown>,
  effectId: EffectId,
  location: ContentLocation,
): DamageType | undefined {
  if (effect.damageType === undefined) {
    return undefined;
  }

  if (resolveEffectDefinition(effectId).kind !== EffectKind.DAMAGE_OVER_TIME) {
    throw new ContentValidationError(
      location,
      `effect "${effectId}" deals no damage over time and cannot declare a damageType`,
    );
  }

  return readStringFrom(effect, 'damageType', location, DAMAGE_TYPES);
}

export function parseOptionalStat(
  entry: Record<string, unknown>,
  key: 'splashRadius',
  location: ContentLocation,
): number | undefined {
  if (entry[key] === undefined) {
    return undefined;
  }

  return readNumber(entry, key, location, TOWER_STAT_BOUNDS[key]);
}

/** `allowedTargets` of a tower or archetype entry; `both` when the content omits it. */
export function parseAllowedTargets(
  entry: Record<string, unknown>,
  location: ContentLocation,
): TowerTargetScope {
  if (entry.allowedTargets === undefined) {
    return DEFAULT_TOWER_TARGET_SCOPE;
  }
  return readStringFrom(entry, 'allowedTargets', location, TOWER_TARGET_SCOPES);
}

export function parseChain(
  entry: Record<string, unknown>,
  location: ContentLocation,
): TowerChainDefinition | undefined {
  if (entry.chain === undefined) {
    return undefined;
  }

  const chain = readRecord(entry.chain, location);
  assertKnownKeys(chain, TOWER_CHAIN_KEYS, location);

  return {
    bounces: readNumber(chain, 'bounces', location, TOWER_CHAIN_BOUNDS.bounces),
    bounceRangeCells: readNumber(
      chain,
      'bounceRangeCells',
      location,
      TOWER_CHAIN_BOUNDS.bounceRangeCells,
    ),
    damageFalloff: readNumber(chain, 'damageFalloff', location, TOWER_CHAIN_BOUNDS.damageFalloff),
  };
}

export function parseAura(
  entry: Record<string, unknown>,
  location: ContentLocation,
): TowerAuraDefinition | undefined {
  if (entry.aura === undefined) {
    return undefined;
  }

  const aura = readRecord(entry.aura, location);
  assertKnownKeys(aura, TOWER_AURA_KEYS, location);

  return {
    radiusCells: readNumber(aura, 'radiusCells', location, TOWER_AURA_BOUNDS.radiusCells),
    attackSpeedBonus: readNumber(
      aura,
      'attackSpeedBonus',
      location,
      TOWER_AURA_BOUNDS.attackSpeedBonus,
    ),
    rangeBonus: readNumber(aura, 'rangeBonus', location, TOWER_AURA_BOUNDS.rangeBonus),
    stacking: readStringFrom(aura, 'stacking', location, TOWER_AURA_STACKING_RULES),
  };
}

/** `damageType` of a race tower entry: an override, or undefined to inherit the archetype. */
export function parseOptionalDamageType(
  entry: Record<string, unknown>,
  location: ContentLocation,
): DamageType | undefined {
  if (entry.damageType === undefined) {
    return undefined;
  }
  return readStringFrom(entry, 'damageType', location, DAMAGE_TYPES);
}

export function parseLevels(
  entry: Record<string, unknown>,
  location: ContentLocation,
): TowerLevelDefinition[] {
  const rawLevels = readArray(entry, 'levels', location);

  if (rawLevels.length !== TowerTalentRule.BRANCH_UNLOCK_GRADE) {
    throw new ContentValidationError(
      location,
      `a level curve must list levels 1-${TowerTalentRule.BRANCH_UNLOCK_GRADE}, ` +
        `talent branches add the grades above; found ${rawLevels.length} levels`,
    );
  }

  return rawLevels.map((rawLevel, index) => {
    const level = readRecord(rawLevel, location);
    assertKnownKeys(level, TOWER_LEVEL_KEYS, location);

    const declaredLevel = readNumber(level, 'level', location);

    if (declaredLevel !== index + 1) {
      throw new ContentValidationError(
        location,
        `levels must be listed in order from 1; found ${declaredLevel} at position ${index + 1}`,
      );
    }

    return {
      level: declaredLevel,
      upgradeCostGold: readNumber(
        level,
        'upgradeCostGold',
        location,
        TOWER_LEVEL_BOUNDS.upgradeCostGold,
      ),
      stats: parseLevelStats(level, location),
    };
  });
}

/**
 * Combat stats of one curve level or talent grade: the numbers every level
 * carries plus the optional splash, effects and aura it may change.
 */
export function parseLevelStats(
  level: Record<string, unknown>,
  location: ContentLocation,
): TowerCombatStats {
  const splashRadius = parseOptionalStat(level, 'splashRadius', location);
  const aura = parseAura(level, location);
  const onHitEffects = parseOnHitEffects(level, location);

  return {
    damage: readNumber(level, 'damage', location, TOWER_STAT_BOUNDS.damage),
    range: readNumber(level, 'range', location, TOWER_STAT_BOUNDS.range),
    attackCooldownMs: readNumber(
      level,
      'attackCooldownMs',
      location,
      TOWER_STAT_BOUNDS.attackCooldownMs,
    ),
    ...(splashRadius === undefined ? {} : { splashRadius }),
    ...(onHitEffects.length === 0 ? {} : { onHitEffects }),
    ...(aura === undefined ? {} : { aura }),
  };
}
