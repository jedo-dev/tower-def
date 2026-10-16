import { DAMAGE_OVER_TIME_DAMAGE_TYPE } from '../../../../shared/constants/damage';
import { EFFECT_DEFINITIONS, resolveEffectMaxStacks } from '../../../../shared/constants/effects';
import {
  canTargetScopeHitMoveType,
  EffectKind,
  TowerAttackKind,
  TowerTypeId,
  DamageType,
  DamageScope,
  type TowerTargetScope,
  UnitMoveType,
  damageScopeCovers,
} from '../../../../shared/types/content-ids';
import type { TowerChainDefinition } from '../../../tower/model/content/loadTowerContent';
import type { TowerCombatStats, TowerOnHitEffect } from '../../../tower/model/types';
import { getTowerArchetype } from '../../../tower/model/types';
import { NEUTRAL_DAMAGE_EFFICIENCY, type DamageTypeEfficiency } from '../damage-profile';
import {
  computeCritFactor,
  computeExtraHitShare,
  computeFreezeAdjustedSlow,
  computeTargetMultiplierFactor,
  computeVolleyDps,
} from './abilityDamageModel';
import { MAX_EXPECTED_SPLASH_TARGETS, POISON_STACK_UPTIME } from './constants';
import { computeConeExtraHitShare } from './deferredMechanicsValue';
import { expectedCreepsAround } from './routeDensity';
import type { RouteGeometry } from './routeGeometry';

/** Slow beyond this is a stun, which the model does not try to value. */
const MAX_MODELLED_SLOW = 0.75;
/** A chill that freezes stops creeps part of the time: valued up to this mean slow. */
const MAX_MODELLED_FREEZE_SLOW = 0.85;
const MS_PER_SECOND = 1000;

/** Stats of a level as the model reads them; talent grades may carry their own chain shape. */
export type DamageModelStats = TowerCombatStats & { chain?: TowerChainDefinition };

/** A tower as the damage model sees it: archetype plus the stats of its level. */
export type DamageModelTower = {
  towerType: TowerTypeId;
  stats: DamageModelStats;
  /** Authored target scope; the archetype's when absent. */
  allowedTargets?: TowerTargetScope;
  /** Authored damage type of its shots; the archetype's when absent. */
  damageType?: DamageType;
};

/** Damage type of the tower's own shots: the authored one, the archetype's otherwise. */
export function resolveDamageModelDamageType(tower: DamageModelTower): DamageType {
  return tower.damageType ?? getTowerArchetype(tower.towerType).damageType;
}

/**
 * Whether the tower can shoot creeps that move by `moveType`: its level's or
 * grade's `allowedTargets` first, then its own, then the archetype's.
 */
export function canDamageModelTowerHit(tower: DamageModelTower, moveType: UnitMoveType): boolean {
  const scope =
    tower.stats.allowedTargets ??
    tower.allowedTargets ??
    getTowerArchetype(tower.towerType).allowedTargets;
  return canTargetScopeHitMoveType(scope, moveType);
}

export function resolveOnHitEffects(tower: DamageModelTower): readonly TowerOnHitEffect[] {
  return tower.stats.onHitEffects ?? getTowerArchetype(tower.towerType).onHitEffects;
}

/** Raw damage per second of the tower's own shots, before targets and armor. */
export function computeShotDps(stats: TowerCombatStats): number {
  return stats.attackCooldownMs > 0 ? (stats.damage * MS_PER_SECOND) / stats.attackCooldownMs : 0;
}

/**
 * Shot damage per second against a wave, in its hit points: raw shot damage
 * times what the shot's damage type is worth against the wave's armor.
 */
export function computeEffectiveShotDps(
  tower: DamageModelTower,
  efficiency: DamageTypeEfficiency,
): number {
  return computeShotDps(tower.stats) * efficiency[resolveDamageModelDamageType(tower)];
}

/**
 * Damage per second the tower's damage-over-time effects add on the creep it
 * is shooting, in hit points of the wave `efficiency` describes: each effect
 * at its own tick type (`damageType`, magical when absent), so a percent
 * poison is worth its ‰ of maximum health per stack and tick. With the
 * neutral efficiency it is the raw tick damage per second.
 */
export function computeDamageOverTimeDps(
  tower: DamageModelTower,
  efficiency: DamageTypeEfficiency = NEUTRAL_DAMAGE_EFFICIENCY,
): number {
  let dps = 0;
  for (const effect of resolveOnHitEffects(tower)) {
    const definition = EFFECT_DEFINITIONS[effect.effectId];
    if (definition.kind !== EffectKind.DAMAGE_OVER_TIME || definition.tickIntervalMs <= 0) {
      continue;
    }
    const magnitude = effect.magnitude ?? definition.magnitude;
    const durationMs = effect.durationMs ?? definition.durationMs;
    const maxStacks = resolveEffectMaxStacks(effect.effectId, effect.maxStacks);
    const reachableStacks = Math.min(
      maxStacks,
      Math.max(1, durationMs / Math.max(1, tower.stats.attackCooldownMs)),
    );
    const perStackDps = (magnitude * MS_PER_SECOND) / definition.tickIntervalMs;
    const tickType = effect.damageType ?? DAMAGE_OVER_TIME_DAMAGE_TYPE;
    dps += perStackDps * Math.max(1, reachableStacks * POISON_STACK_UPTIME) * efficiency[tickType];
  }
  return dps;
}

const PERCENT_ONLY: DamageTypeEfficiency = {
  [DamageType.PHYSICAL]: 0,
  [DamageType.MAGICAL]: 0,
  [DamageType.PERCENT]: 1,
};
const PHYSICAL_ONLY: DamageTypeEfficiency = {
  [DamageType.PHYSICAL]: 1,
  [DamageType.MAGICAL]: 0,
  [DamageType.PERCENT]: 0,
};
const MAGICAL_ONLY: DamageTypeEfficiency = {
  [DamageType.PHYSICAL]: 0,
  [DamageType.MAGICAL]: 1,
  [DamageType.PERCENT]: 0,
};

/** Raw damage-over-time damage per second of each tick type (percent in ‰ points). */
export function computeDamageOverTimeDpsByType(
  tower: DamageModelTower,
): Readonly<Record<DamageType, number>> {
  return {
    [DamageType.PHYSICAL]: computeDamageOverTimeDps(tower, PHYSICAL_ONLY),
    [DamageType.MAGICAL]: computeDamageOverTimeDps(tower, MAGICAL_ONLY),
    [DamageType.PERCENT]: computeDamageOverTimeDps(tower, PERCENT_ONLY),
  };
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
    const slow = Math.min(
      MAX_MODELLED_FREEZE_SLOW,
      computeFreezeAdjustedSlow(
        Math.min(MAX_MODELLED_SLOW, effect.magnitude ?? definition.magnitude),
        effect,
        tower.stats.attackCooldownMs,
      ),
    );
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

/**
 * What `support`'s aura adds to the damage rate of `neighbour` (in range or
 * not): its attack speed bonus plus its damage bonus when the bonus's damage
 * type covers the neighbour's shots.
 */
export function computeAuraBoostFor(
  support: DamageModelTower,
  neighbour: DamageModelTower,
): number {
  const aura = support.stats.aura ?? getTowerArchetype(support.towerType).aura;
  if (!aura) {
    return 0;
  }
  const damageBonus = aura.damagePercentBonus ?? 0;
  const coversNeighbour =
    damageBonus > 0 &&
    damageScopeCovers(
      aura.damageBonusType ?? DamageScope.ALL,
      resolveDamageModelDamageType(neighbour),
    );
  return aura.attackSpeedBonus + (coversNeighbour ? damageBonus : 0);
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

  const chain = tower.stats.chain ?? archetype.chain;
  if (archetype.attackKind === TowerAttackKind.CHAIN && chain) {
    const { bounces, bounceRangeCells, damageFalloff } = chain;
    const available = expectedCreepsAround(geometry, sampleIndex, bounceRangeCells);
    let targets = 1;
    let arcShare = 1;
    for (let bounce = 1; bounce <= bounces; bounce += 1) {
      arcShare *= 1 - damageFalloff;
      targets += Math.min(1, Math.max(0, available - bounce)) * arcShare;
    }
    return targets;
  }

  const { abilities, range } = tower.stats;
  return (
    1 +
    computeExtraHitShare(abilities, range, geometry, sampleIndex) +
    computeConeExtraHitShare(abilities, range, geometry, sampleIndex)
  );
}

/**
 * Damage per second the tower deals while its target stands at `sampleIndex`,
 * summed over every creep the shot reaches, in hit points of the wave
 * `efficiency` describes: shots count at their own damage type (with their
 * crits and the target multipliers of a `moveType` lane), volleys hit the
 * creeps around the target, damage over time counts at its tick type. Auras
 * deal none of their own, but a support tower's volley does.
 */
export function computeSampleDamageRate(
  tower: DamageModelTower,
  geometry: RouteGeometry,
  sampleIndex: number,
  efficiency: DamageTypeEfficiency = NEUTRAL_DAMAGE_EFFICIENCY,
  moveType: UnitMoveType = UnitMoveType.GROUND,
): number {
  const typeEfficiency = efficiency[resolveDamageModelDamageType(tower)];
  const hitFactor = computeTargetMultiplierFactor(tower.stats.abilities, moveType);
  const volley = computeVolleyDps(tower.stats, geometry, sampleIndex) * typeEfficiency * hitFactor;
  if (getTowerArchetype(tower.towerType).attackKind === TowerAttackKind.AURA) {
    return volley;
  }
  const shots =
    computeShotDps(tower.stats) *
    typeEfficiency *
    computeCritFactor(tower.stats.abilities) *
    hitFactor *
    computeTargetsPerShot(tower, geometry, sampleIndex);
  return shots + volley + computeDamageOverTimeDps(tower, efficiency);
}
