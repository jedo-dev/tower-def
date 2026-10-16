import type { CreepEntity } from '../../../../entities/creep';
import {
  canTowerAttack,
  getTowerAttackKind,
  resolveShotDamageMultiplier,
  resolveTowerDamageType,
  selectTowerTarget,
  type TowerCombatRuntime,
} from '../../../../entities/tower';
import { TowerAttackKind, type DamageType } from '../../../../shared/types/content-ids';
import { applyChainDamage, applySingleTargetDamage, applySplashDamage } from './towerAreaAttacks';
import type { CombatCreep, CombatField, CombatTower, TowerCombatHooks } from './towerCombatTypes';
import {
  applyCone,
  applyExtraTargets,
  applyPierceLine,
  resolveTowerVolley,
} from './towerShotAbilities';

// Renderer-free core of tower combat: targeting, single/splash/chain damage,
// optional abilities (crit, extra targets, piercing line, cone, volley), on-hit
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
  // In place: the runtime belongs to this tower alone (see tickCooldownInPlace).
  tower.runtime.shotCount = shotNumber;
  return resolveShotDamageMultiplier(abilities, shotNumber);
}

/**
 * Counts a single-target shot aimed at the creep for `dodgeEveryNthShot` and
 * says whether this one misses. Creeps without the ability are untouched.
 */
function takeDodge(target: CombatCreep): boolean {
  const dodgeEveryNthShot = target.entity.abilities?.dodgeEveryNthShot;

  if (dodgeEveryNthShot === undefined) {
    return false;
  }

  const shotNumber = (target.entity.shotsAimedAt ?? 0) + 1;
  target.entity.shotsAimedAt = shotNumber;
  return shotNumber % dodgeEveryNthShot === 0;
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

  if (abilities.coneDegrees !== undefined) {
    applyCone(field, tower, target, shotDamage, damageType, hooks, abilities.coneDegrees);
  }
}

/**
 * Per-frame working memory: the creep entities towers pick targets from. It
 * is filled once at the start of a frame, so every tower in that frame sees
 * the same snapshot (hits replace `creep.entity` with a new object and never
 * touch the snapshot), exactly as the old per-frame `map` copy did. The array
 * is reused; it only reallocates when the field outgrows it. Slots past the
 * current frame's creep count are cut off, so at most one frame's entities
 * stay referenced between frames.
 */
const creepEntitiesForTargeting: CreepEntity[] = [];

/** The module-wide targeting snapshot buffer; exposed so tests can check reuse. */
export function getCreepEntitiesForTargetingBuffer(): readonly CreepEntity[] {
  return creepEntitiesForTargeting;
}

function snapshotCreepEntitiesForTargeting(creeps: readonly CombatCreep[]): CreepEntity[] {
  const entities = creepEntitiesForTargeting;
  const count = creeps.length;
  for (let index = 0; index < count; index += 1) {
    entities[index] = creeps[index].entity;
  }
  if (entities.length > count) {
    entities.length = count;
  }
  return entities;
}

/**
 * `tickTowerCooldown` without the copy. Mutating is safe because each
 * `TowerCombatRuntime` is created per tower (`createInitialTowerCombatRuntime`)
 * and only ever read through `tower.runtime`: no other system keeps a
 * reference to it or compares it by identity.
 */
function tickCooldownInPlace(runtime: TowerCombatRuntime, deltaMs: number): void {
  if (deltaMs <= 0) {
    return;
  }
  runtime.attackCooldownRemainingMs = Math.max(0, runtime.attackCooldownRemainingMs - deltaMs);
}

/** `consumeTowerAttack` without the copy; see `tickCooldownInPlace` for why it is safe. */
function consumeAttackInPlace(tower: CombatTower): void {
  tower.runtime.attackCooldownRemainingMs = tower.entity.combatStats.attackCooldownMs;
}

function findCreepById<C extends CombatCreep>(creeps: readonly C[], id: string): C | undefined {
  for (let index = 0; index < creeps.length; index += 1) {
    if (creeps[index].entity.id === id) {
      return creeps[index];
    }
  }
  return undefined;
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

  const creepsForTargeting = snapshotCreepEntitiesForTargeting(field.creeps);

  for (let towerIndex = 0; towerIndex < field.towers.length; towerIndex += 1) {
    const tower = field.towers[towerIndex];
    const attackKind = getTowerAttackKind(tower.entity.type);

    if (tower.entity.combatStats.abilities?.volleyEveryMs !== undefined) {
      resolveTowerVolley(field, tower, hooks, deltaMs, resolveTowerDamageType(tower.entity));
    }

    // Support towers have no attack of their own; their aura does the work.
    if (attackKind === TowerAttackKind.AURA) {
      continue;
    }

    tickCooldownInPlace(tower.runtime, deltaMs);

    if (!canTowerAttack(tower.entity, tower.runtime)) {
      continue;
    }

    const targetCreep = selectTowerTarget(tower.entity, creepsForTargeting);

    if (!targetCreep) {
      continue;
    }

    const target = findCreepById(field.creeps, targetCreep.id);

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
    } else if (takeDodge(target)) {
      hooks.onShotDodged?.(tower, target);
    } else {
      applySingleTargetShot(field, tower, target, shotDamage, damageType, hooks);
    }

    consumeAttackInPlace(tower);
    hooks.onTowerFired(tower, target, isSplashTower);
  }
}
