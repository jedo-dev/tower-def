import { DAMAGE_TYPES, DamageType } from '../../../../shared/types/content-ids';
import { calculateDamageAgainst } from '../../../creep/model/damage';
import type { ArmoredHealth, DamageTypeEfficiency } from './armorProfile';

/**
 * Share of a defence's raw damage per damage type; the shares sum to 1.
 * What the other duelist's towers throw at a creep, so a sender can tell
 * which armor matters.
 */
export type DamageTypeMix = Readonly<Record<DamageType, number>>;

/** A defence the estimate knows nothing about: physical and magical alike. */
export const EVEN_DAMAGE_MIX: DamageTypeMix = Object.freeze({
  [DamageType.PHYSICAL]: 0.5,
  [DamageType.MAGICAL]: 0.5,
  [DamageType.PERCENT]: 0,
});

/** Shares from raw damage per type; the even mix when there is no damage at all. */
export function normalizeDamageMix(rawDamageByType: Readonly<Record<DamageType, number>>) {
  let total = 0;
  for (const damageType of DAMAGE_TYPES) {
    total += Math.max(0, rawDamageByType[damageType]);
  }
  if (total <= 0) {
    return EVEN_DAMAGE_MIX;
  }
  return {
    [DamageType.PHYSICAL]: Math.max(0, rawDamageByType[DamageType.PHYSICAL]) / total,
    [DamageType.MAGICAL]: Math.max(0, rawDamageByType[DamageType.MAGICAL]) / total,
    [DamageType.PERCENT]: Math.max(0, rawDamageByType[DamageType.PERCENT]) / total,
  } satisfies DamageTypeMix;
}

/**
 * Raw damage of `mix` it takes to kill `creature`: its health over the hit
 * points one raw point of the mix removes, each type through the combat rule.
 */
export function computeMixedEffectiveHealth(creature: ArmoredHealth, mix: DamageTypeMix): number {
  if (creature.health <= 0) {
    return 0;
  }
  const target = {
    physicalArmor: creature.physicalArmor,
    magicalArmor: creature.magicalArmor,
    maxHp: creature.health,
  };
  let landedPerPoint = 0;
  for (const damageType of DAMAGE_TYPES) {
    landedPerPoint += mix[damageType] * calculateDamageAgainst(1, damageType, target);
  }
  return landedPerPoint > 0 ? creature.health / landedPerPoint : creature.health;
}

/**
 * How well `damageType` does against a wave compared with the armor-typed
 * damage on offer (the mean of physical and magical): 1 when the wave's two
 * armors are alike, above 1 for the type that goes through its weaker armor.
 */
export function computeRelativeDamageEfficiency(
  efficiency: DamageTypeEfficiency,
  damageType: DamageType,
): number {
  const reference = (efficiency[DamageType.PHYSICAL] + efficiency[DamageType.MAGICAL]) / 2;
  return reference > 0 ? efficiency[damageType] / reference : 1;
}
