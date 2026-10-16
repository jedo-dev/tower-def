import { TowerAttackKind } from '../../../../shared/types/content-ids';
import { getTowerAttackKind } from '../../../tower/model/types';
import { toArmorNeutralEfficiency, type DamageTypeEfficiency } from '../damage-profile';
import {
  computeDamageOverTimeDps,
  computeEffectiveShotDps,
  type DamageModelTower,
} from './towerDamageModel';

function effectiveDps(tower: DamageModelTower, efficiency: DamageTypeEfficiency): number {
  return computeEffectiveShotDps(tower, efficiency) + computeDamageOverTimeDps(tower, efficiency);
}

/**
 * How well a tower's damage types answer the armor of a wave: its damage per
 * second against the wave over the same against the wave with its two armors
 * averaged. Above 1 when the tower's damage goes through the weaker armor,
 * below 1 when it meets the stronger, 1 when the armors are alike, for pure
 * percent damage (which ignores armor) and for an aura, which deals none.
 * Shots and damage over time each count at their own type, so a tower with
 * physical arrows and percent poison is judged on both.
 */
export function computeArmorCounterFactor(
  tower: DamageModelTower,
  efficiency: DamageTypeEfficiency,
): number {
  if (getTowerAttackKind(tower.towerType) === TowerAttackKind.AURA) {
    return 1;
  }
  const reference = effectiveDps(tower, toArmorNeutralEfficiency(efficiency));
  return reference > 0 ? effectiveDps(tower, efficiency) / reference : 1;
}
