import { UnitArmorType } from '../types/content-ids';

/**
 * Armor removes a share of a hit rather than a flat amount, so a fast cheap
 * tower stays relevant against armored creeps instead of tickling them:
 *
 *   factor    = armor * armorDamageReductionPerPoint
 *   mitigated = rawDamage * (1 - factor / (1 + factor))
 *
 * At the current rate, 3 armor removes about 15% of a hit and 10 armor about
 * 37%. The floor guarantees every hit still lands for a tenth of its damage.
 */
export const DAMAGE_MITIGATION = {
  armorDamageReductionPerPoint: 0.06,
  minimumDamageFraction: 0.1,
} as const;

/**
 * Armor class shifts the effective armor points a creep carries, so a heavy
 * silhouette resists chip damage even when its authored armor is modest.
 */
export const ARMOR_TYPE_BONUS: Record<UnitArmorType, number> = {
  [UnitArmorType.UNARMORED]: -1,
  [UnitArmorType.LIGHT]: 0,
  [UnitArmorType.HEAVY]: 2,
};
