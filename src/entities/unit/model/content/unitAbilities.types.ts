import type { NumericBound } from '../../../../shared/lib/content/contentValidation';
import type { CreatureAbilities } from '../../../../shared/types/creatureAbilities';

/**
 * Authored contract of the optional creature abilities (tower-def-716.2): the
 * `abilities` object a unit entry may carry. Talent grade objects reuse the
 * same field names. Values outside the bounds are typos.
 */

export type CreatureAbilityKey = keyof CreatureAbilities;

export const CREATURE_ABILITY_KEYS: readonly CreatureAbilityKey[] = [
  'effectResistance',
  'dodgeEveryNthShot',
  'healthRegenPerSecond',
  'regenPausedByPoison',
  'incomingDamageMultipliers',
  'speedBoostBelowHpShare',
  'speedBoostLastRouteShare',
  'startInvisibleMs',
  'leakLivesTaken',
  'leakGoldToSender',
  'killGoldPenaltyToDefender',
  'shieldHp',
  'shieldRechargeMs',
  'secondLife',
  'freeNthSend',
];

/** Plain number abilities and their bounds. */
export type CreatureNumberAbilityKey =
  | 'dodgeEveryNthShot'
  | 'healthRegenPerSecond'
  | 'startInvisibleMs'
  | 'leakLivesTaken'
  | 'leakGoldToSender'
  | 'killGoldPenaltyToDefender'
  | 'shieldHp'
  | 'shieldRechargeMs'
  | 'freeNthSend';

export const CREATURE_NUMBER_ABILITY_KEYS: readonly CreatureNumberAbilityKey[] = [
  'dodgeEveryNthShot',
  'healthRegenPerSecond',
  'startInvisibleMs',
  'leakLivesTaken',
  'leakGoldToSender',
  'killGoldPenaltyToDefender',
  'shieldHp',
  'shieldRechargeMs',
  'freeNthSend',
];

/** Abilities read as whole numbers. */
export const CREATURE_INTEGER_ABILITY_KEYS: readonly CreatureNumberAbilityKey[] = [
  'dodgeEveryNthShot',
  'leakLivesTaken',
  'leakGoldToSender',
  'killGoldPenaltyToDefender',
  'freeNthSend',
];

export const CREATURE_NUMBER_ABILITY_BOUNDS: Record<CreatureNumberAbilityKey, NumericBound> = {
  dodgeEveryNthShot: { min: 2, max: 20 },
  healthRegenPerSecond: { min: 0, max: 500 },
  startInvisibleMs: { min: 100, max: 60_000 },
  leakLivesTaken: { min: 1, max: 10 },
  leakGoldToSender: { min: 0, max: 200 },
  killGoldPenaltyToDefender: { min: 0, max: 200 },
  shieldHp: { min: 1, max: 5000 },
  shieldRechargeMs: { min: 100, max: 60_000 },
  freeNthSend: { min: 2, max: 20 },
};

/** Each effect resistance multiplier: 0 (immune) to 1 (no resistance). */
export const CREATURE_EFFECT_RESISTANCE_BOUND: NumericBound = { min: 0, max: 1 };

/** Each incoming damage multiplier. */
export const CREATURE_INCOMING_DAMAGE_MULTIPLIER_BOUND: NumericBound = { min: 0, max: 2 };

/** `percent` joins the attack shapes in `incomingDamageMultipliers`. */
export const CREATURE_PERCENT_DAMAGE_KEY = 'percent';

export const CREATURE_SPEED_BOOST_BOUNDS = {
  hpShare: { min: 0.01, max: 1 },
  routeShare: { min: 0.01, max: 1 },
  speedMultiplier: { min: 0.1, max: 5 },
} as const;

export const CREATURE_SECOND_LIFE_BOUNDS = {
  hpShare: { min: 0.01, max: 1 },
  speedMultiplier: { min: 0.1, max: 5 },
} as const;
