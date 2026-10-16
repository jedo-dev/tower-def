import { ARMOR_BOUNDS, DAMAGE_MITIGATION } from '../../../../shared/constants/damage';
import {
  EFFECT_DEFINITIONS,
  resolveEffectArmorKind,
  resolveEffectDamageScope,
  resolveEffectMaxStacks,
} from '../../../../shared/constants/effects';
import { TOWER_ABILITY_BALANCE } from '../../../../shared/constants/towerAbilities';
import {
  ArmorKind,
  DamageScope,
  DamageType,
  EffectId,
  UnitMoveType,
  damageScopeCovers,
} from '../../../../shared/types/content-ids';
import { getArmorDamageMultiplier } from '../../../creep/model/damage';
import type { TowerAbilities } from '../../../tower/model/abilities';
import type { TowerOnHitEffect } from '../../../tower/model/types';
import type { DamageTypeEfficiency } from '../damage-profile';
import { ABILITY_VALUATION } from './constants';
import { expectedCreepsAround } from './routeDensity';
import type { RouteGeometry } from './routeGeometry';

/**
 * What the optional tower abilities and the defense on-hit effects of talent
 * grades are worth to the damage model (docs/07 "AI talent development").
 * Every value is an expectation over a wave, never a roll: crits are a
 * counter, target multipliers apply to a fixed share of hits, extra targets
 * and volleys reach the creeps the route packs around the target.
 */

const MS_PER_SECOND = 1000;

/** Mean damage multiplier of a shot from every-Nth-shot crits. */
export function computeCritFactor(abilities: TowerAbilities | undefined): number {
  const every = abilities?.critEveryNthShot;
  const multiplier = abilities?.critMultiplier;
  if (every === undefined || multiplier === undefined || every <= 0) {
    return 1;
  }
  return 1 + (multiplier - 1) / every;
}

function weighted(multiplier: number | undefined, share: number): number {
  return multiplier === undefined ? 1 : 1 + (multiplier - 1) * share;
}

/**
 * Mean multiplier of the hit-dependent abilities on a lane: air or ground in
 * full (every creep of the lane moves that way), large and full-health
 * targets at their `ABILITY_VALUATION` share of hits.
 */
export function computeTargetMultiplierFactor(
  abilities: TowerAbilities | undefined,
  moveType: UnitMoveType,
): number {
  if (abilities === undefined) {
    return 1;
  }
  const lane =
    moveType === UnitMoveType.AIR
      ? abilities.airDamageMultiplier
      : abilities.groundDamageMultiplier;
  return (
    (lane ?? 1) *
    weighted(abilities.largeTargetMultiplier, ABILITY_VALUATION.largeTargetHitShare) *
    weighted(abilities.fullHealthBonusMultiplier, ABILITY_VALUATION.fullHealthHitShare)
  );
}

/** Extra creeps a single-target shot reaches: its extra targets and the pierced ones. */
type ExtraCreeps = { targets: number; targetShare: number; pierced: number; pierceShare: number };

function computeExtraCreeps(
  abilities: TowerAbilities | undefined,
  range: number,
  geometry: RouteGeometry,
  sampleIndex: number,
): ExtraCreeps {
  const extra: ExtraCreeps = { targets: 0, targetShare: 0, pierced: 0, pierceShare: 0 };
  if (abilities === undefined) {
    return extra;
  }
  if (abilities.extraTargets !== undefined && abilities.extraTargets > 0) {
    const others = expectedCreepsAround(geometry, sampleIndex, range) - 1;
    extra.targets = Math.min(abilities.extraTargets, Math.max(0, others));
    extra.targetShare =
      abilities.extraTargetDamageShare ?? TOWER_ABILITY_BALANCE.defaultExtraTargetDamageShare;
  }
  if (abilities.pierceLine !== undefined && abilities.pierceLine > 0) {
    const others =
      expectedCreepsAround(geometry, sampleIndex, ABILITY_VALUATION.pierceLineReachCells) - 1;
    extra.pierced = Math.max(0, others);
    extra.pierceShare = abilities.pierceLine;
  }
  return extra;
}

/**
 * Extra creeps (in shares of a full hit) a single-target shot at `sampleIndex`
 * also damages: its extra targets among the creeps in range, and the creeps
 * the piercing line passes on either side of the target.
 */
export function computeExtraHitShare(
  abilities: TowerAbilities | undefined,
  range: number,
  geometry: RouteGeometry,
  sampleIndex: number,
): number {
  const extra = computeExtraCreeps(abilities, range, geometry, sampleIndex);
  return extra.targets * extra.targetShare + extra.pierced * extra.pierceShare;
}

/**
 * Extra creeps a single-target shot at `sampleIndex` strikes, counted whole:
 * every creep an extra target or the piercing line reaches takes the shot's
 * on-hit effects in full (poison, burn, chill, stun), whatever its damage share.
 */
export function computeExtraCreepsStruck(
  abilities: TowerAbilities | undefined,
  range: number,
  geometry: RouteGeometry,
  sampleIndex: number,
): number {
  const extra = computeExtraCreeps(abilities, range, geometry, sampleIndex);
  return extra.targets + extra.pierced;
}

/** Raw volley damage per second at `sampleIndex`: every creep in range, once per volley. */
export function computeVolleyDps(
  stats: { damage: number; range: number; abilities?: TowerAbilities },
  geometry: RouteGeometry,
  sampleIndex: number,
): number {
  const every = stats.abilities?.volleyEveryMs;
  if (every === undefined || every <= 0) {
    return 0;
  }
  const share =
    stats.abilities?.volleyDamageShare ?? TOWER_ABILITY_BALANCE.defaultVolleyDamageShare;
  const targets = Math.min(
    ABILITY_VALUATION.maxExpectedVolleyTargets,
    expectedCreepsAround(geometry, sampleIndex, stats.range),
  );
  return ((stats.damage * share * MS_PER_SECOND) / every) * targets;
}

/** Armor of a single creature that lets `efficiency` of a raw point through. */
function equivalentArmor(efficiency: number): number {
  const perPoint = DAMAGE_MITIGATION.armorDamageReductionPerPoint;
  if (efficiency <= 0) {
    return ARMOR_BOUNDS.max;
  }
  if (efficiency < 1) {
    return Math.min(ARMOR_BOUNDS.max, (1 / efficiency - 1) / perPoint);
  }
  // Negative armor amplifies by `f / (1 + f)`, f = |armor| * perPoint.
  const share = Math.min(0.99, efficiency - 1);
  return Math.max(ARMOR_BOUNDS.min, -share / (1 - share) / perPoint);
}

/**
 * Share of extra damage a wave with this efficiency takes when its armor of
 * that type drops by `armorPoints`, through the combat mitigation curve.
 */
export function computeArmorBreakGain(efficiency: number, armorPoints: number): number {
  if (armorPoints <= 0) {
    return 0;
  }
  const armor = equivalentArmor(efficiency);
  const before = getArmorDamageMultiplier(armor);
  return before > 0 ? getArmorDamageMultiplier(armor - armorPoints) / before - 1 : 0;
}

/**
 * Extra damage share a tower's defense effects put on the creeps it hits:
 * `ownGain` on its own damage type, `fieldGain` on the mixed damage of the
 * other towers that shoot the same creeps, for `durationMs` after the hit.
 */
export type DefenceAmplification = { ownGain: number; fieldGain: number; durationMs: number };

const NO_AMPLIFICATION: DefenceAmplification = { ownGain: 0, fieldGain: 0, durationMs: 0 };

function reachableStacks(effect: TowerOnHitEffect, attackCooldownMs: number): number {
  const definition = EFFECT_DEFINITIONS[effect.effectId];
  const durationMs = effect.durationMs ?? definition.durationMs;
  const maxStacks = resolveEffectMaxStacks(effect.effectId, effect.maxStacks);
  return Math.min(maxStacks, Math.max(1, durationMs / Math.max(1, attackCooldownMs)));
}

function vulnerabilityAmplification(effect: TowerOnHitEffect, ownType: DamageType) {
  const magnitude = effect.magnitude ?? EFFECT_DEFINITIONS[effect.effectId].magnitude;
  const scope = effect.damageKind ?? resolveEffectDamageScope(effect.effectId);
  return {
    ownGain: damageScopeCovers(scope, ownType) ? magnitude : 0,
    fieldGain:
      scope === DamageScope.ALL ? magnitude : magnitude * ABILITY_VALUATION.singleTypeFieldShare,
  };
}

function armorBreakAmplification(
  effect: TowerOnHitEffect,
  ownType: DamageType,
  attackCooldownMs: number,
  efficiency: DamageTypeEfficiency,
) {
  const magnitude = effect.magnitude ?? EFFECT_DEFINITIONS[effect.effectId].magnitude;
  const points = magnitude * reachableStacks(effect, attackCooldownMs);
  const kind = effect.armorKind ?? resolveEffectArmorKind(effect.effectId);
  const physical =
    kind === ArmorKind.MAGICAL ? 0 : computeArmorBreakGain(efficiency[DamageType.PHYSICAL], points);
  const magical =
    kind === ArmorKind.PHYSICAL ? 0 : computeArmorBreakGain(efficiency[DamageType.MAGICAL], points);
  const own =
    ownType === DamageType.PHYSICAL ? physical : ownType === DamageType.MAGICAL ? magical : 0;
  return {
    ownGain: own,
    fieldGain: (physical + magical) * ABILITY_VALUATION.singleTypeFieldShare,
  };
}

export function computeDefenceAmplification(
  onHitEffects: readonly TowerOnHitEffect[],
  ownType: DamageType,
  attackCooldownMs: number,
  efficiency: DamageTypeEfficiency,
): DefenceAmplification {
  let ownGain = 0;
  let fieldGain = 0;
  let durationMs = 0;
  for (const effect of onHitEffects) {
    let gain: { ownGain: number; fieldGain: number } | null = null;
    if (effect.effectId === EffectId.VULNERABILITY) {
      gain = vulnerabilityAmplification(effect, ownType);
    } else if (effect.effectId === EffectId.ARMOR_BREAK) {
      gain = armorBreakAmplification(effect, ownType, attackCooldownMs, efficiency);
    }
    if (gain) {
      ownGain += gain.ownGain;
      fieldGain += gain.fieldGain;
      durationMs = Math.max(
        durationMs,
        effect.durationMs ?? EFFECT_DEFINITIONS[effect.effectId].durationMs,
      );
    }
  }
  return ownGain > 0 || fieldGain > 0 ? { ownGain, fieldGain, durationMs } : NO_AMPLIFICATION;
}

/**
 * Mean slow of a chill that freezes every `freezeAtStacks`-th chilling hit
 * for `freezeMs`: the frozen share of the time counts as a full stop.
 */
export function computeFreezeAdjustedSlow(
  slow: number,
  effect: TowerOnHitEffect,
  attackCooldownMs: number,
): number {
  if (effect.freezeAtStacks === undefined || effect.freezeAtStacks <= 0) {
    return slow;
  }
  const freezeMs = effect.freezeMs ?? EFFECT_DEFINITIONS[EffectId.STUN].durationMs;
  const cycleMs = effect.freezeAtStacks * Math.max(1, attackCooldownMs) + freezeMs;
  const frozenShare = freezeMs / cycleMs;
  return slow + (1 - slow) * frozenShare;
}

/**
 * Mean slow of a chill plus a stun of `stunMs` on every hit: the stun stops
 * the creeps it lands on for that share of a reload (it refreshes, never
 * stacks, so it holds at most the whole reload), on top of the chill's slow.
 */
export function computeStunAdjustedSlow(
  slow: number,
  stunMs: number,
  attackCooldownMs: number,
): number {
  if (stunMs <= 0) {
    return slow;
  }
  const stoppedShare = Math.min(1, stunMs / Math.max(1, attackCooldownMs));
  return slow + (1 - slow) * stoppedShare;
}
