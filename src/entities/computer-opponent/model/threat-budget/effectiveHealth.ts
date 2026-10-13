import { DAMAGE_MITIGATION } from '../../../../shared/constants/damage';
import type { UnitConfig } from '../../../unit/model/types';

/**
 * Health scaled by what armor is worth against the mitigation curve the combat
 * model actually uses, so the opponent values a tanky creep the same way the
 * battlefield will: the damage it takes to kill it, in unmitigated damage.
 */
export function computeEffectiveHealth(unit: Pick<UnitConfig, 'health' | 'armor'>): number {
  const armorFactor = Math.max(0, unit.armor) * DAMAGE_MITIGATION.armorDamageReductionPerPoint;
  return unit.health * (1 + armorFactor);
}
