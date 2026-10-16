import { DamageType } from '../types/content-ids';

/**
 * Armor removes a share of a hit rather than a flat amount, so a fast cheap
 * tower stays relevant against armored creeps instead of tickling them. A
 * creature carries two armors, physical and magical; a hit is mitigated by
 * the one matching its damage type:
 *
 *   factor     = |armor| * armorDamageReductionPerPoint
 *   share      = factor / (1 + factor)
 *   armor >= 0 : damage = rawDamage * (1 - share)
 *   armor <  0 : damage = rawDamage * (1 + share)
 *
 * At the current rate, 3 armor removes about 15% of a hit and 10 armor about
 * 37%; -10 armor adds the same 37%. The floor guarantees every hit still lands
 * for a tenth of its damage.
 */
export const DAMAGE_MITIGATION = {
  armorDamageReductionPerPoint: 0.06,
  minimumDamageFraction: 0.1,
} as const;

/**
 * Range of a creature's physical and magical armor, authored and effective
 * alike: armor break cannot push armor below `min`, so negative armor
 * amplifies a hit by at most 60%.
 */
export const ARMOR_BOUNDS = {
  min: -25,
  max: 75,
} as const;

/**
 * Percent damage takes `damage / healthShareDivisor` of the creature's maximum
 * health per hit, ignoring armor: a percent tower with damage 30 removes 3% of
 * maximum health with every hit.
 */
export const PERCENT_DAMAGE = {
  healthShareDivisor: 1000,
} as const;

/**
 * Damage over time (poison, burn) is magical: magical armor reduces it,
 * negative magical armor amplifies it.
 */
export const DAMAGE_OVER_TIME_DAMAGE_TYPE: DamageType = DamageType.MAGICAL;
