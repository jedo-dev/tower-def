import {
  canTowerAttack,
  consumeTowerAttack,
  getTowerAttackKind,
  resolveShotDamageMultiplier,
  resolveTowerDamageType,
  selectTowerTarget,
  tickTowerCooldown,
} from '../../../../entities/tower';
import { TowerAttackKind, type DamageType } from '../../../../shared/types/content-ids';
import { applyChainDamage, applySingleTargetDamage, applySplashDamage } from './towerAreaAttacks';
import type { CombatCreep, CombatField, CombatTower, TowerCombatHooks } from './towerCombatTypes';
import { applyExtraTargets, applyPierceLine, resolveTowerVolley } from './towerShotAbilities';

// Renderer-free core of tower combat: targeting, single/splash/chain damage,
// optional abilities (crit, extra targets, piercing line, volley), on-hit
// status effects and damage over time. The Phaser combat runtime and the
// headless duel simulation both run these; everything visual or audible (hit
// flash, projectiles, damage numbers, sounds) goes through the hooks.

export {
  DEFAULT_SPLASH_RADIUS_CELLS,
  type CombatCreep,
  type CombatField,
  type CombatTower,
  type DamageNumberSource,
  type TowerCombatHooks,
} from './towerCombatTypes';
export { applyTowerEffect } from './towerStrike';
export { tickFieldCreepEffects } from './towerCreepEffects';

/**
 * Counts the shot for `critEveryNthShot` and returns the shot-wide damage
 * multiplier. Towers without the ability keep their runtime untouched.
 */
function takeShotDamageMultiplier(tower: CombatTower): number {
  const abilities = tower.entity.combatStats.abilities;

  if (abilities?.critEveryNthShot === undefined) {
    return 1;
  }

  const shotNumber = (tower.runtime.shotCount ?? 0) + 1;
  tower.runtime = { ...tower.runtime, shotCount: shotNumber };
  return resolveShotDamageMultiplier(abilities, shotNumber);
}

/** A single-target shot plus the abilities that widen it. */
function applySingleTargetShot<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  target: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
): void {
  applySingleTargetDamage(tower, target, shotDamage, damageType, hooks);

  const abilities = tower.entity.combatStats.abilities;

  if (abilities === undefined) {
    return;
  }

  if (abilities.extraTargets !== undefined) {
    applyExtraTargets(field, tower, target, shotDamage, damageType, hooks, abilities);
  }

  if (abilities.pierceLine !== undefined) {
    applyPierceLine(field, tower, target, shotDamage, damageType, hooks, abilities.pierceLine);
  }
}

/** Ticks every tower's cooldown and lets each ready tower attack its target. */
export function resolveTowerAttacks<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  hooks: TowerCombatHooks<C, T>,
  deltaMs: number,
): void {
  if (field.towers.length === 0 || field.creeps.length === 0) {
    return;
  }

  const creepsForTargeting = field.creeps.map((creep) => creep.entity);

  for (const tower of field.towers) {
    const attackKind = getTowerAttackKind(tower.entity.type);

    if (tower.entity.combatStats.abilities?.volleyEveryMs !== undefined) {
      resolveTowerVolley(field, tower, hooks, deltaMs, resolveTowerDamageType(tower.entity));
    }

    // Support towers have no attack of their own; their aura does the work.
    if (attackKind === TowerAttackKind.AURA) {
      continue;
    }

    tower.runtime = tickTowerCooldown(tower.runtime, deltaMs);

    if (!canTowerAttack(tower.entity, tower.runtime)) {
      continue;
    }

    const targetCreep = selectTowerTarget(tower.entity, creepsForTargeting);

    if (!targetCreep) {
      continue;
    }

    const target = field.creeps.find((creep) => creep.entity.id === targetCreep.id);

    if (!target) {
      continue;
    }

    const isSplashTower = attackKind === TowerAttackKind.SPLASH;
    const splashRadius = tower.entity.combatStats.splashRadius ?? 0;
    const damageType = resolveTowerDamageType(tower.entity);
    const shotDamage = tower.entity.combatStats.damage * takeShotDamageMultiplier(tower);

    if (isSplashTower && splashRadius > 0) {
      applySplashDamage(field, tower, target, shotDamage, damageType, hooks);
    } else if (attackKind === TowerAttackKind.CHAIN) {
      applyChainDamage(field, tower, target, shotDamage, damageType, hooks);
    } else {
      applySingleTargetShot(field, tower, target, shotDamage, damageType, hooks);
    }

    tower.runtime = consumeTowerAttack(tower.entity, tower.runtime);
    hooks.onTowerFired(tower, target, isSplashTower);
  }
}
