import { EFFECT_DEFINITIONS } from '../../../../shared/constants/effects';
import { EffectKind, TowerAttackKind, TowerTypeId } from '../../../../shared/types/content-ids';
import type { TowerCombatStats, TowerOnHitEffect } from '../../../tower/model/types';
import { getTowerArchetype } from '../../../tower/model/types';
import {
  CREEPS_PER_ROUTE_SAMPLE,
  MAX_EXPECTED_SPLASH_TARGETS,
  POISON_STACK_UPTIME,
} from './constants';
import type { RouteGeometry } from './routeGeometry';

/** Slow beyond this is a stun, which the model does not try to value. */
const MAX_MODELLED_SLOW = 0.75;
const MS_PER_SECOND = 1000;

/** A tower as the damage model sees it: archetype plus the stats of its level. */
export type DamageModelTower = {
  towerType: TowerTypeId;
  stats: TowerCombatStats;
};

function resolveOnHitEffects(tower: DamageModelTower): readonly TowerOnHitEffect[] {
  return tower.stats.onHitEffects ?? getTowerArchetype(tower.towerType).onHitEffects;
}

/** Raw damage per second of the tower's own shots, before targets and armor. */
export function computeShotDps(stats: TowerCombatStats): number {
  return stats.attackCooldownMs > 0 ? (stats.damage * MS_PER_SECOND) / stats.attackCooldownMs : 0;
}

/** Damage per second the tower's damage-over-time effects add on the creep it is shooting. */
export function computeDamageOverTimeDps(tower: DamageModelTower): number {
  let dps = 0;
  for (const effect of resolveOnHitEffects(tower)) {
    const definition = EFFECT_DEFINITIONS[effect.effectId];
    if (definition.kind !== EffectKind.DAMAGE_OVER_TIME || definition.tickIntervalMs <= 0) {
      continue;
    }
    const magnitude = effect.magnitude ?? definition.magnitude;
    const durationMs = effect.durationMs ?? definition.durationMs;
    const maxStacks = effect.maxStacks ?? definition.maxStacks;
    const reachableStacks = Math.min(
      maxStacks,
      Math.max(1, durationMs / Math.max(1, tower.stats.attackCooldownMs)),
    );
    const perStackDps = (magnitude * MS_PER_SECOND) / definition.tickIntervalMs;
    dps += perStackDps * Math.max(1, reachableStacks * POISON_STACK_UPTIME);
  }
  return dps;
}

/** Slow the tower puts on what it hits (0..MAX_MODELLED_SLOW) and for how long. */
export function computeChill(tower: DamageModelTower): { magnitude: number; durationMs: number } {
  let magnitude = 0;
  let durationMs = 0;
  for (const effect of resolveOnHitEffects(tower)) {
    const definition = EFFECT_DEFINITIONS[effect.effectId];
    if (definition.kind !== EffectKind.MOVEMENT) {
      continue;
    }
    const slow = Math.min(MAX_MODELLED_SLOW, effect.magnitude ?? definition.magnitude);
    if (slow > magnitude) {
      magnitude = slow;
      durationMs = effect.durationMs ?? definition.durationMs;
    }
  }
  return { magnitude, durationMs };
}

/** Attack speed bonus and radius of the tower's aura; zero when it projects none. */
export function computeAura(tower: DamageModelTower): { bonus: number; radius: number } {
  const aura = tower.stats.aura ?? getTowerArchetype(tower.towerType).aura;
  return aura
    ? { bonus: aura.attackSpeedBonus, radius: aura.radiusCells }
    : { bonus: 0, radius: 0 };
}

/** Creeps next to a target at `sampleIndex` within `radius`, the target included. */
function expectedCreepsAround(geometry: RouteGeometry, sampleIndex: number, radius: number) {
  const neighbours = geometry.neighbourCounts(radius)[sampleIndex] ?? 1;
  return 1 + Math.max(0, neighbours - 1) * CREEPS_PER_ROUTE_SAMPLE;
}

/** Creeps one shot is expected to damage when its target stands at `sampleIndex`. */
export function computeTargetsPerShot(
  tower: DamageModelTower,
  geometry: RouteGeometry,
  sampleIndex: number,
): number {
  const archetype = getTowerArchetype(tower.towerType);

  if (archetype.attackKind === TowerAttackKind.SPLASH) {
    const radius = tower.stats.splashRadius ?? archetype.splashRadius ?? 0;
    return Math.min(
      MAX_EXPECTED_SPLASH_TARGETS,
      expectedCreepsAround(geometry, sampleIndex, radius),
    );
  }

  if (archetype.attackKind === TowerAttackKind.CHAIN && archetype.chain) {
    const { bounces, bounceRangeCells, damageFalloff } = archetype.chain;
    const available = expectedCreepsAround(geometry, sampleIndex, bounceRangeCells);
    let targets = 1;
    let arcShare = 1;
    for (let bounce = 1; bounce <= bounces; bounce += 1) {
      arcShare *= 1 - damageFalloff;
      targets += Math.min(1, Math.max(0, available - bounce)) * arcShare;
    }
    return targets;
  }

  return 1;
}

/**
 * Damage per second the tower deals while its target stands at `sampleIndex`,
 * summed over every creep the shot reaches. Auras deal none of their own.
 */
export function computeSampleDamageRate(
  tower: DamageModelTower,
  geometry: RouteGeometry,
  sampleIndex: number,
): number {
  if (getTowerArchetype(tower.towerType).attackKind === TowerAttackKind.AURA) {
    return 0;
  }
  const shots = computeShotDps(tower.stats) * computeTargetsPerShot(tower, geometry, sampleIndex);
  return shots + computeDamageOverTimeDps(tower);
}
