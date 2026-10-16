import { DAMAGE_TYPES, DamageType, TowerAttackKind } from '../../../../shared/types/content-ids';
import { getTowerAttackKind } from '../../../tower/model/types';
import { normalizeDamageMix, type DamageTypeMix } from '../damage-profile';
import {
  computeDamageOverTimeDpsByType,
  computeShotDps,
  resolveDamageModelDamageType,
  type DamageModelTower,
} from './towerDamageModel';

/**
 * The damage types a field of towers deals, as shares of its raw damage per
 * second: each tower's shots at their own type, damage over time at each
 * effect's tick type. Route geometry is left out on purpose: a sender only
 * needs to know which armor the defence goes through, not how well it is
 * placed. The even mix when the field deals no damage (an empty field tells
 * nothing).
 */
export function computeDefenceDamageMix(towers: readonly DamageModelTower[]): DamageTypeMix {
  const rawDamage: Record<DamageType, number> = {
    [DamageType.PHYSICAL]: 0,
    [DamageType.MAGICAL]: 0,
    [DamageType.PERCENT]: 0,
  };
  for (const tower of towers) {
    // An aura deals no damage of its own; it only speeds up the others.
    if (getTowerAttackKind(tower.towerType) === TowerAttackKind.AURA) {
      continue;
    }
    rawDamage[resolveDamageModelDamageType(tower)] += computeShotDps(tower.stats);
    const overTime = computeDamageOverTimeDpsByType(tower);
    for (const damageType of DAMAGE_TYPES) {
      rawDamage[damageType] += overTime[damageType];
    }
  }
  return normalizeDamageMix(rawDamage);
}
