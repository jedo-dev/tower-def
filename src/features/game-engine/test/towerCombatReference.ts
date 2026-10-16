import {
  applyDamageToCreep,
  getCreepFootprintCenter,
  isCreepHidden,
  type CreepEntity,
} from '../../../entities/creep';
import {
  canTowerAttack,
  canTowerTargetCreep,
  consumeTowerAttack,
  getCreepsInTowerRange,
  getTowerAttackKind,
  getTowerCenter,
  getTowerCreepDistanceInCells,
  getTowerOnHitEffects,
  isCreepTargetableByTower,
  resolveShotDamageMultiplier,
  resolveTargetDamageMultiplier,
  resolveTowerDamageType,
  tickTowerCooldown,
  type TowerEntity,
} from '../../../entities/tower';
import { GRID_DIMENSIONS } from '../../../shared/constants/grid';
import { TOWER_ABILITY_BALANCE } from '../../../shared/constants/towerAbilities';
import { TowerAttackKind, UnitMoveType, type DamageType } from '../../../shared/types/content-ids';
import { applyChainDamage, applySingleTargetDamage } from '../runtime/combat/towerAreaAttacks';
import {
  DEFAULT_SPLASH_RADIUS_CELLS,
  type CombatCreep,
  type CombatField,
  type CombatTower,
  type TowerCombatHooks,
} from '../runtime/combat/towerCombatTypes';
import { applyExtraTargets, applyPierceLine } from '../runtime/combat/towerShotAbilities';
import {
  applyTowerEffect,
  resolveTowerDamageShape,
  strikeAndReport,
  toApplyEffectInput,
  type StrikeResult,
} from '../runtime/combat/towerStrike';

// Verbatim copies of the combat paths tower-def-z6m rewrote to stop
// allocating every frame (map/filter/reduce copies, runtime spreads, effect
// inputs built per hit). Tests run them side by side with the live code on
// seeded random fields: same inputs must give the same battlefield. Paths the
// task left alone (chain, extra targets, pierce) are shared, not copied.

type Hooks<C extends CombatCreep, T extends CombatTower> = TowerCombatHooks<C, T>;

function getRemainingDistanceToExit(creep: CreepEntity): number {
  return creep.remainingRouteDistance ?? Number.POSITIVE_INFINITY;
}

/** Pre-rewrite `selectTowerTarget`: filter, then reduce. */
export function referenceSelectTowerTarget(
  tower: TowerEntity,
  creeps: CreepEntity[],
): CreepEntity | null {
  const creepsInRange = getCreepsInTowerRange(tower, creeps);

  if (creepsInRange.length === 0) {
    return null;
  }

  return creepsInRange.reduce((best, candidate) => {
    const candidateRemaining = getRemainingDistanceToExit(candidate);
    const bestRemaining = getRemainingDistanceToExit(best);

    if (candidateRemaining < bestRemaining) {
      return candidate;
    }

    if (candidateRemaining > bestRemaining) {
      return best;
    }

    const candidateFlies = candidate.moveType === UnitMoveType.AIR;
    const bestFlies = best.moveType === UnitMoveType.AIR;
    if (candidateFlies !== bestFlies) {
      return candidateFlies ? candidate : best;
    }

    const bestDistance = getTowerCreepDistanceInCells(tower, best);
    const candidateDistance = getTowerCreepDistanceInCells(tower, candidate);
    return candidateDistance < bestDistance ? candidate : best;
  });
}

/** Pre-rewrite on-hit effects: an effect input built per hit. */
function referenceApplyOnHitEffects<C extends CombatCreep, T extends CombatTower>(
  tower: T,
  creep: C,
  hooks: Hooks<C, T>,
): void {
  const onHitEffects =
    tower.entity.combatStats.onHitEffects ?? getTowerOnHitEffects(tower.entity.type);

  if (onHitEffects.length === 0 || creep.entity.status !== 'alive') {
    return;
  }

  for (const effect of onHitEffects) {
    applyTowerEffect(creep, toApplyEffectInput(effect), hooks);
  }
}

/** Pre-rewrite `strikeCreep`. */
export function referenceStrikeCreep<C extends CombatCreep, T extends CombatTower>(
  tower: T,
  creep: C,
  damage: number,
  damageType: DamageType,
  hooks: Hooks<C, T>,
): StrikeResult {
  const targetMultiplier = resolveTargetDamageMultiplier(
    tower.entity.combatStats.abilities,
    creep.entity,
  );
  const damageResult = applyDamageToCreep(
    creep.entity,
    damage * targetMultiplier,
    damageType,
    resolveTowerDamageShape(tower),
  );
  creep.entity = damageResult.creep;
  if (damageResult.revived === true) {
    hooks.onCreepRevived?.(creep);
  }
  referenceApplyOnHitEffects(tower, creep, hooks);
  hooks.onCreepHit(creep);
  return { damageApplied: damageResult.damageApplied, killed: damageResult.killed };
}

/** Pre-rewrite `applySplashDamage`: a filtered copy of the field per shot. */
export function referenceApplySplashDamage<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  target: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: Hooks<C, T>,
): void {
  const splashRadius = tower.entity.combatStats.splashRadius ?? DEFAULT_SPLASH_RADIUS_CELLS;
  const splashRadiusPx = splashRadius * GRID_DIMENSIONS.cellSize;
  const towerCenterPx = hooks.toCellCenter(getTowerCenter(tower.entity));

  const creepsInSplashRadius = field.creeps.filter((creep) => {
    if (
      creep.entity.status !== 'alive' ||
      isCreepHidden(creep.entity) ||
      !canTowerTargetCreep(tower.entity, creep.entity)
    ) {
      return false;
    }
    const creepCenter = hooks.toCellCenter(getCreepFootprintCenter(creep.entity));
    const distance = Math.hypot(creepCenter.x - towerCenterPx.x, creepCenter.y - towerCenterPx.y);
    return distance <= splashRadiusPx;
  });

  let totalDamageDealt = 0;
  for (const creep of creepsInSplashRadius) {
    const result = referenceStrikeCreep(tower, creep, shotDamage, damageType, hooks);
    totalDamageDealt += result.damageApplied;

    if (result.killed) {
      hooks.onCreepKilled(creep, tower);
    }
  }

  hooks.onTargetStruck(tower);
  hooks.onDamageDealt(target.entity.position, Math.round(totalDamageDealt), 'hit');
}

function hasTargetInRange<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
): boolean {
  for (const creep of field.creeps) {
    if (isCreepTargetableByTower(tower.entity, creep.entity)) {
      return true;
    }
  }
  return false;
}

/** Pre-rewrite `resolveTowerVolley`: the cooldown spread into a new runtime. */
export function referenceResolveTowerVolley<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  hooks: Hooks<C, T>,
  deltaMs: number,
  damageType: DamageType,
): void {
  const abilities = tower.entity.combatStats.abilities;
  const volleyEveryMs = abilities?.volleyEveryMs;

  if (volleyEveryMs === undefined) {
    return;
  }

  const remainingMs = Math.max(0, (tower.runtime.volleyCooldownRemainingMs ?? 0) - deltaMs);

  if (remainingMs > 0 || !hasTargetInRange(field, tower)) {
    if (remainingMs !== tower.runtime.volleyCooldownRemainingMs) {
      tower.runtime = { ...tower.runtime, volleyCooldownRemainingMs: remainingMs };
    }
    return;
  }

  const share = abilities?.volleyDamageShare ?? TOWER_ABILITY_BALANCE.defaultVolleyDamageShare;
  const volleyDamage = tower.entity.combatStats.damage * share;

  for (const creep of field.creeps) {
    if (isCreepTargetableByTower(tower.entity, creep.entity)) {
      strikeAndReport(tower, creep, volleyDamage, damageType, hooks);
    }
  }

  hooks.onTargetStruck(tower);
  tower.runtime = { ...tower.runtime, volleyCooldownRemainingMs: volleyEveryMs };
}

function takeShotDamageMultiplier(tower: CombatTower): number {
  const abilities = tower.entity.combatStats.abilities;

  if (abilities?.critEveryNthShot === undefined) {
    return 1;
  }

  const shotNumber = (tower.runtime.shotCount ?? 0) + 1;
  tower.runtime = { ...tower.runtime, shotCount: shotNumber };
  return resolveShotDamageMultiplier(abilities, shotNumber);
}

function takeDodge(target: CombatCreep): boolean {
  const dodgeEveryNthShot = target.entity.abilities?.dodgeEveryNthShot;

  if (dodgeEveryNthShot === undefined) {
    return false;
  }

  const shotNumber = (target.entity.shotsAimedAt ?? 0) + 1;
  target.entity.shotsAimedAt = shotNumber;
  return shotNumber % dodgeEveryNthShot === 0;
}

function applySingleTargetShot<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  target: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: Hooks<C, T>,
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

/** Pre-rewrite `resolveTowerAttacks`: a mapped entity copy and new runtimes every frame. */
export function referenceResolveTowerAttacks<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  hooks: Hooks<C, T>,
  deltaMs: number,
): void {
  if (field.towers.length === 0 || field.creeps.length === 0) {
    return;
  }

  const creepsForTargeting = field.creeps.map((creep) => creep.entity);

  for (const tower of field.towers) {
    const attackKind = getTowerAttackKind(tower.entity.type);

    if (tower.entity.combatStats.abilities?.volleyEveryMs !== undefined) {
      referenceResolveTowerVolley(
        field,
        tower,
        hooks,
        deltaMs,
        resolveTowerDamageType(tower.entity),
      );
    }

    if (attackKind === TowerAttackKind.AURA) {
      continue;
    }

    tower.runtime = tickTowerCooldown(tower.runtime, deltaMs);

    if (!canTowerAttack(tower.entity, tower.runtime)) {
      continue;
    }

    const targetCreep = referenceSelectTowerTarget(tower.entity, creepsForTargeting);

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
      referenceApplySplashDamage(field, tower, target, shotDamage, damageType, hooks);
    } else if (attackKind === TowerAttackKind.CHAIN) {
      applyChainDamage(field, tower, target, shotDamage, damageType, hooks);
    } else if (takeDodge(target)) {
      hooks.onShotDodged?.(tower, target);
    } else {
      applySingleTargetShot(field, tower, target, shotDamage, damageType, hooks);
    }

    tower.runtime = consumeTowerAttack(tower.entity, tower.runtime);
    hooks.onTowerFired(tower, target, isSplashTower);
  }
}
