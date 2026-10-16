import { getArmorDamageMultiplier } from '../../../creep/model/damage';
import type { UnitConfig } from '../../../unit/model/types';

/**
 * Health scaled by what armor is worth against the mitigation curve the combat
 * model actually uses, so the opponent values a tanky creep the same way the
 * battlefield will: the damage it takes to kill it, in unmitigated damage.
 * The defender's damage types are unknown to the planner, so the physical and
 * magical readings are weighted equally.
 */
export function computeEffectiveHealth(
  unit: Pick<UnitConfig, 'health' | 'physicalArmor' | 'magicalArmor'>,
): number {
  const physicalHealth = unit.health / getArmorDamageMultiplier(unit.physicalArmor);
  const magicalHealth = unit.health / getArmorDamageMultiplier(unit.magicalArmor);

  return (physicalHealth + magicalHealth) / 2;
}
