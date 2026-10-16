import {
  ContentValidationError,
  assertKnownKeys,
  readBoundedInteger,
  readNumber,
  readRecord,
  type ContentLocation,
  type NumericBound,
} from '../../../../shared/lib/content/contentValidation';
import { EFFECT_IDS } from '../../../../shared/types/content-ids';
import {
  CREATURE_DAMAGE_SHAPES,
  type CreatureAbilities,
  type CreatureEffectResistance,
  type CreatureIncomingDamageMultipliers,
  type CreatureLowHealthSpeedBoost,
  type CreatureRouteEndSpeedBoost,
  type CreatureSecondLife,
} from '../../../../shared/types/creatureAbilities';
import {
  CREATURE_ABILITY_KEYS,
  CREATURE_EFFECT_RESISTANCE_BOUND,
  CREATURE_INCOMING_DAMAGE_MULTIPLIER_BOUND,
  CREATURE_INTEGER_ABILITY_KEYS,
  CREATURE_NUMBER_ABILITY_BOUNDS,
  CREATURE_NUMBER_ABILITY_KEYS,
  CREATURE_PERCENT_DAMAGE_KEY,
  CREATURE_SECOND_LIFE_BOUNDS,
  CREATURE_SPEED_BOOST_BOUNDS,
} from './unitAbilities.types';

/**
 * Parser for the optional creature abilities: a unit's `abilities` object.
 * Fails naming the file and the creature. Talent grade objects reuse the same
 * field names and can be parsed with `parseCreatureAbilities` directly.
 */

const INCOMING_DAMAGE_KEYS: readonly string[] = [
  ...CREATURE_DAMAGE_SHAPES,
  CREATURE_PERCENT_DAMAGE_KEY,
];

function readBoolean(
  source: Record<string, unknown>,
  key: string,
  location: ContentLocation,
): boolean {
  const value = source[key];
  if (typeof value !== 'boolean') {
    throw new ContentValidationError(location, `"${key}" must be true or false`);
  }
  return value;
}

/** A record of optional numbers, every one within `bound`; only the authored keys. */
function readNumberMap<TKey extends string>(
  value: unknown,
  keys: readonly TKey[],
  bound: NumericBound,
  location: ContentLocation,
): Partial<Record<TKey, number>> {
  const raw = readRecord(value, location);
  assertKnownKeys(raw, keys, location);
  const result: Partial<Record<TKey, number>> = {};
  for (const key of keys) {
    if (raw[key] !== undefined) {
      result[key] = readNumber(raw, key, location, bound);
    }
  }
  return result;
}

function readSpeedBoost<TShareKey extends 'hpShare' | 'routeShare'>(
  value: unknown,
  shareKey: TShareKey,
  location: ContentLocation,
): Record<TShareKey | 'speedMultiplier', number> {
  const raw = readRecord(value, location);
  assertKnownKeys(raw, [shareKey, 'speedMultiplier'], location);
  return {
    [shareKey]: readNumber(raw, shareKey, location, CREATURE_SPEED_BOOST_BOUNDS[shareKey]),
    speedMultiplier: readNumber(
      raw,
      'speedMultiplier',
      location,
      CREATURE_SPEED_BOOST_BOUNDS.speedMultiplier,
    ),
  } as Record<TShareKey | 'speedMultiplier', number>;
}

function readSecondLife(value: unknown, location: ContentLocation): CreatureSecondLife {
  const raw = readRecord(value, location);
  assertKnownKeys(raw, ['hpShare', 'speedMultiplier', 'immuneToChill'], location);
  return {
    hpShare: readNumber(raw, 'hpShare', location, CREATURE_SECOND_LIFE_BOUNDS.hpShare),
    ...(raw.speedMultiplier === undefined
      ? {}
      : {
          speedMultiplier: readNumber(
            raw,
            'speedMultiplier',
            location,
            CREATURE_SECOND_LIFE_BOUNDS.speedMultiplier,
          ),
        }),
    ...(raw.immuneToChill === undefined
      ? {}
      : { immuneToChill: readBoolean(raw, 'immuneToChill', location) }),
  };
}

function readNumberAbilities(
  raw: Record<string, unknown>,
  abilities: CreatureAbilities,
  location: ContentLocation,
): void {
  for (const key of CREATURE_NUMBER_ABILITY_KEYS) {
    if (raw[key] === undefined) {
      continue;
    }
    const bound = CREATURE_NUMBER_ABILITY_BOUNDS[key];
    abilities[key] = CREATURE_INTEGER_ABILITY_KEYS.includes(key)
      ? readBoundedInteger(raw, key, location, bound)
      : readNumber(raw, key, location, bound);
  }
}

function readStructuredAbilities(
  raw: Record<string, unknown>,
  abilities: CreatureAbilities,
  location: ContentLocation,
): void {
  if (raw.effectResistance !== undefined) {
    const resistance: CreatureEffectResistance = readNumberMap(
      raw.effectResistance,
      EFFECT_IDS,
      CREATURE_EFFECT_RESISTANCE_BOUND,
      location,
    );
    abilities.effectResistance = resistance;
  }
  if (raw.incomingDamageMultipliers !== undefined) {
    const multipliers: CreatureIncomingDamageMultipliers = readNumberMap(
      raw.incomingDamageMultipliers,
      INCOMING_DAMAGE_KEYS as readonly (keyof CreatureIncomingDamageMultipliers)[],
      CREATURE_INCOMING_DAMAGE_MULTIPLIER_BOUND,
      location,
    );
    abilities.incomingDamageMultipliers = multipliers;
  }
  if (raw.speedBoostBelowHpShare !== undefined) {
    const boost: CreatureLowHealthSpeedBoost = readSpeedBoost(
      raw.speedBoostBelowHpShare,
      'hpShare',
      location,
    );
    abilities.speedBoostBelowHpShare = boost;
  }
  if (raw.speedBoostLastRouteShare !== undefined) {
    const boost: CreatureRouteEndSpeedBoost = readSpeedBoost(
      raw.speedBoostLastRouteShare,
      'routeShare',
      location,
    );
    abilities.speedBoostLastRouteShare = boost;
  }
  if (raw.secondLife !== undefined) {
    abilities.secondLife = readSecondLife(raw.secondLife, location);
  }
  if (raw.regenPausedByPoison !== undefined) {
    abilities.regenPausedByPoison = readBoolean(raw, 'regenPausedByPoison', location);
  }
}

function assertAbilityRequirements(abilities: CreatureAbilities, location: ContentLocation): void {
  if (abilities.shieldRechargeMs !== undefined && abilities.shieldHp === undefined) {
    throw new ContentValidationError(location, 'ability "shieldRechargeMs" needs "shieldHp"');
  }
  if (abilities.regenPausedByPoison !== undefined && abilities.healthRegenPerSecond === undefined) {
    throw new ContentValidationError(
      location,
      'ability "regenPausedByPoison" needs "healthRegenPerSecond"',
    );
  }
}

/**
 * An `abilities` object (a unit's, or a talent grade's): undefined when empty.
 * Unknown keys and out-of-bound values fail naming `location`.
 */
export function parseCreatureAbilities(
  value: unknown,
  location: ContentLocation,
): CreatureAbilities | undefined {
  const raw = readRecord(value, location);
  assertKnownKeys(raw, CREATURE_ABILITY_KEYS, location);

  const abilities: CreatureAbilities = {};
  readNumberAbilities(raw, abilities, location);
  readStructuredAbilities(raw, abilities, location);
  assertAbilityRequirements(abilities, location);

  return Object.keys(abilities).length === 0 ? undefined : abilities;
}

/** `abilities` of a unit entry: undefined when absent or empty. */
export function parseUnitAbilities(
  entry: Record<string, unknown>,
  location: ContentLocation,
): CreatureAbilities | undefined {
  return entry.abilities === undefined
    ? undefined
    : parseCreatureAbilities(entry.abilities, location);
}
