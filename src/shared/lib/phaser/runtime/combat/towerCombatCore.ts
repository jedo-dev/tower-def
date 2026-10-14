import {
  applyDamageToCreep,
  applyEffectToCreep,
  getCreepFootprintCenter,
  tickCreepEffects,
  type ApplyEffectInput,
  type CreepEntity,
} from '../../../../../entities/creep';
import {
  canTowerAttack,
  consumeTowerAttack,
  getTowerArchetype,
  getTowerAttackKind,
  getTowerCenter,
  getTowerOnHitEffects,
  selectTowerTarget,
  tickTowerCooldown,
  type TowerCombatRuntime,
  type TowerEntity,
} from '../../../../../entities/tower';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import { TowerAttackKind, type EffectId } from '../../../../types/content-ids';
import type { GridPosition } from '../../../../types/pathfinding';

// Renderer-free core of tower combat: targeting, single/splash/chain damage,
// on-hit status effects and damage over time. The Phaser combat runtime and
// the headless duel simulation both run these; everything visual or audible
// (hit flash, projectiles, damage numbers, sounds) goes through the hooks.

/** Splash radius, in fine-grid cells, for a splash tower whose content omits one. */
export const DEFAULT_SPLASH_RADIUS_CELLS = 3;

export type CombatCreep = { entity: CreepEntity };

export type CombatTower = { entity: TowerEntity; runtime: TowerCombatRuntime };

/** The part of a battlefield combat reads and writes. */
export type CombatField<C extends CombatCreep, T extends CombatTower> = {
  creeps: C[];
  towers: T[];
};

export type DamageNumberSource = 'hit' | 'effect';

export type TowerCombatHooks<C extends CombatCreep, T extends CombatTower> = {
  toCellCenter: (position: GridPosition) => { x: number; y: number };
  /** A creep took a tower hit (single, splash or chain arc). */
  onCreepHit: (creep: C) => void;
  /** The primary target of a single or splash shot was struck. */
  onTargetStruck: (tower: T) => void;
  onDamageDealt: (position: GridPosition, damage: number, source: DamageNumberSource) => void;
  /** An effect landed and changed the creep. */
  onEffectApplied: (creep: C, effectId: EffectId) => void;
  /** Effects on the creep advanced (expired, ticked or wore off). */
  onEffectsTicked: (creep: C) => void;
  /** Called once per kill, from a hit or from damage over time. */
  onCreepKilled: (creep: C) => void;
  /** The tower attacked; its cooldown is already consumed. */
  onTowerFired: (tower: T, target: C, isSplashTower: boolean) => void;
};

/**
 * Single entry point for putting a tower effect on a creep. Returns false when
 * the application changed nothing (a weaker strongest-wins effect).
 */
export function applyTowerEffect<C extends CombatCreep, T extends CombatTower>(
  creep: C,
  input: ApplyEffectInput,
  hooks: TowerCombatHooks<C, T>,
): boolean {
  const previousEntity = creep.entity;
  creep.entity = applyEffectToCreep(creep.entity, input);

  if (creep.entity === previousEntity) {
    return false;
  }

  hooks.onEffectApplied(creep, input.effectId);
  return true;
}

function applyOnHitEffects<C extends CombatCreep, T extends CombatTower>(
  tower: T,
  creep: C,
  hooks: TowerCombatHooks<C, T>,
): void {
  const onHitEffects =
    tower.entity.combatStats.onHitEffects ?? getTowerOnHitEffects(tower.entity.type);

  if (onHitEffects.length === 0 || creep.entity.status !== 'alive') {
    return;
  }

  for (const effect of onHitEffects) {
    applyTowerEffect(
      creep,
      {
        effectId: effect.effectId,
        magnitude: effect.magnitude,
        durationMs: effect.durationMs,
        maxStacks: effect.maxStacks,
      },
      hooks,
    );
  }
}

/** Damages one creep with a tower hit; returns the damage actually applied. */
function strikeCreep<C extends CombatCreep, T extends CombatTower>(
  tower: T,
  creep: C,
  damage: number,
  hooks: TowerCombatHooks<C, T>,
): { damageApplied: number; killed: boolean } {
  const damageResult = applyDamageToCreep(creep.entity, damage);
  creep.entity = damageResult.creep;
  applyOnHitEffects(tower, creep, hooks);
  hooks.onCreepHit(creep);
  return { damageApplied: damageResult.damageApplied, killed: damageResult.killed };
}

function applySingleTargetDamage<C extends CombatCreep, T extends CombatTower>(
  tower: T,
  target: C,
  hooks: TowerCombatHooks<C, T>,
): void {
  const result = strikeCreep(tower, target, tower.entity.combatStats.damage, hooks);
  hooks.onTargetStruck(tower);
  hooks.onDamageDealt(target.entity.position, Math.round(result.damageApplied), 'hit');

  if (result.killed) {
    hooks.onCreepKilled(target);
  }
}

function applySplashDamage<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  target: C,
  hooks: TowerCombatHooks<C, T>,
): void {
  const splashRadius = tower.entity.combatStats.splashRadius ?? DEFAULT_SPLASH_RADIUS_CELLS;
  const splashRadiusPx = splashRadius * GRID_DIMENSIONS.cellSize;
  const towerCenterPx = hooks.toCellCenter(getTowerCenter(tower.entity));

  const creepsInSplashRadius = field.creeps.filter((creep) => {
    if (creep.entity.status !== 'alive') {
      return false;
    }
    const creepCenter = hooks.toCellCenter(getCreepFootprintCenter(creep.entity));
    const distance = Math.hypot(creepCenter.x - towerCenterPx.x, creepCenter.y - towerCenterPx.y);
    return distance <= splashRadiusPx;
  });

  let totalDamageDealt = 0;
  for (const creep of creepsInSplashRadius) {
    const result = strikeCreep(tower, creep, tower.entity.combatStats.damage, hooks);
    totalDamageDealt += result.damageApplied;

    if (result.killed) {
      hooks.onCreepKilled(creep);
    }
  }

  hooks.onTargetStruck(tower);
  hooks.onDamageDealt(target.entity.position, Math.round(totalDamageDealt), 'hit');
}

/**
 * Picks the creeps an arc jumps to. Selection is by distance and then id, so a
 * given battlefield state always produces the same chain.
 */
function selectChainTargets<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  hooks: TowerCombatHooks<C, T>,
  from: C,
  bounces: number,
  bounceRangeCells: number,
): C[] {
  const visited = new Set<string>([from.entity.id]);
  const chain: C[] = [];
  let current = from;

  for (let bounce = 0; bounce < bounces; bounce += 1) {
    const currentCenter = hooks.toCellCenter(getCreepFootprintCenter(current.entity));
    const rangePx = bounceRangeCells * GRID_DIMENSIONS.cellSize;

    const next = field.creeps
      .filter((creep) => creep.entity.status === 'alive' && !visited.has(creep.entity.id))
      .map((creep) => {
        const center = hooks.toCellCenter(getCreepFootprintCenter(creep.entity));
        return {
          creep,
          distance: Math.hypot(center.x - currentCenter.x, center.y - currentCenter.y),
        };
      })
      .filter((candidate) => candidate.distance <= rangePx)
      .sort((left, right) =>
        left.distance === right.distance
          ? left.creep.entity.id.localeCompare(right.creep.entity.id)
          : left.distance - right.distance,
      )[0];

    if (!next) {
      break;
    }

    visited.add(next.creep.entity.id);
    chain.push(next.creep);
    current = next.creep;
  }

  return chain;
}

function applyChainDamage<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  target: C,
  hooks: TowerCombatHooks<C, T>,
): void {
  const chainShape = getTowerArchetype(tower.entity.type).chain;

  applySingleTargetDamage(tower, target, hooks);

  if (!chainShape) {
    return;
  }

  const chainTargets = selectChainTargets(
    field,
    hooks,
    target,
    chainShape.bounces,
    chainShape.bounceRangeCells,
  );

  let arcDamage = tower.entity.combatStats.damage;

  for (const creep of chainTargets) {
    arcDamage *= 1 - chainShape.damageFalloff;

    const result = strikeCreep(tower, creep, arcDamage, hooks);
    hooks.onDamageDealt(creep.entity.position, Math.round(result.damageApplied), 'hit');

    if (result.killed) {
      hooks.onCreepKilled(creep);
    }
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

    if (isSplashTower && splashRadius > 0) {
      applySplashDamage(field, tower, target, hooks);
    } else if (attackKind === TowerAttackKind.CHAIN) {
      applyChainDamage(field, tower, target, hooks);
    } else {
      applySingleTargetDamage(tower, target, hooks);
    }

    tower.runtime = consumeTowerAttack(tower.entity, tower.runtime);
    hooks.onTowerFired(tower, target, isSplashTower);
  }
}

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

    if (tickResult.damage <= 0) {
      continue;
    }

    const damageResult = applyDamageToCreep(creep.entity, tickResult.damage, { ignoreArmor: true });
    creep.entity = damageResult.creep;
    hooks.onDamageDealt(creep.entity.position, Math.round(tickResult.damage), 'effect');

    if (damageResult.killed) {
      hooks.onCreepKilled(creep);
    }
  }
}
