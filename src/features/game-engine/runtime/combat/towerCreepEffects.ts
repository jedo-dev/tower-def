import {
  applyDamageToCreep,
  hasEffectDamage,
  tickCreepEffects,
  type EffectDamageByType,
} from '../../../../entities/creep';
import { DAMAGE_TYPES } from '../../../../shared/types/content-ids';
import type { CombatCreep, CombatField, CombatTower, TowerCombatHooks } from './towerCombatTypes';

/**
 * Advances status effects on every living creep and routes damage over time
 * through the same kill path as a tower hit, so a poison kill pays out exactly
 * once. `deltaMs` is used as given; clamping is the caller's job.
 */
export function tickFieldCreepEffects<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  hooks: TowerCombatHooks<C, T>,
  deltaMs: number,
): void {
  for (const creep of field.creeps) {
    if (creep.entity.status !== 'alive') {
      continue;
    }

    const tickResult = tickCreepEffects(creep.entity, deltaMs);

    if (tickResult.creep === creep.entity) {
      continue;
    }

    creep.entity = tickResult.creep;
    hooks.onEffectsTicked(creep);

    if (!hasEffectDamage(tickResult.damageByType)) {
      continue;
    }

    applyEffectTickDamage(creep, tickResult.damageByType, hooks);
  }
}

/**
 * Routes one tick of damage over time through the matching armor per type:
 * magical ticks (the default) meet magical armor, percent ticks take ‰ of
 * maximum health. One feedback number per tick; the kill pays out once.
 */
function applyEffectTickDamage<C extends CombatCreep, T extends CombatTower>(
  creep: C,
  damageByType: EffectDamageByType,
  hooks: TowerCombatHooks<C, T>,
): void {
  let damageApplied = 0;
  let killed = false;

  for (const damageType of DAMAGE_TYPES) {
    const rawDamage = damageByType[damageType];

    if (rawDamage <= 0 || killed) {
      continue;
    }

    const damageResult = applyDamageToCreep(creep.entity, rawDamage, damageType);
    creep.entity = damageResult.creep;
    damageApplied += damageResult.damageApplied;
    killed = damageResult.killed;
  }

  hooks.onDamageDealt(creep.entity.position, Math.round(damageApplied), 'effect');

  if (killed) {
    hooks.onCreepKilled(creep);
  }
}
