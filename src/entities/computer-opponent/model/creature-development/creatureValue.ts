import { EFFECT_DEFINITIONS } from '../../../../shared/constants/effects';
import { DamageType, EffectId } from '../../../../shared/types/content-ids';
import {
  CreatureDamageShape,
  type CreatureAbilities,
} from '../../../../shared/types/creatureAbilities';
import type { CreatureGradeStats } from '../../../unit/model/content/creatureTalentContent';
import {
  CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED,
  REFERENCE_CREEP_SPEED,
} from '../damage-placement/constants';
import { computeMixedEffectiveHealth } from '../damage-profile';
import { CREATURE_VALUATION as V, CreatureValuation } from './constants';
import type { DefenceProfile } from './defenceProfile';

const MS_PER_SECOND = 1000;
const REFERENCE_EXPOSURE_SECONDS =
  V.EXPOSURE_ROUTE_CELLS / (REFERENCE_CREEP_SPEED * CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED);

export type CreatureValueInput = {
  stats: CreatureGradeStats;
  /** Gold one send of the creature costs. */
  sendCost: number;
  profile: DefenceProfile;
  /** Health multiplier of the wave the sends spawn in. */
  healthMultiplier: number;
  valuation: CreatureValuation;
};

function resistanceOf(abilities: CreatureAbilities, effectId: EffectId): number {
  return abilities.effectResistance?.[effectId] ?? 1;
}

/** Landed damage per raw point of the defence, relative to an unmodified creature. */
export function computeIncomingDamageFactor(
  abilities: CreatureAbilities,
  profile: DefenceProfile,
): number {
  const multipliers = abilities.incomingDamageMultipliers ?? {};
  const shapes = profile.shapeMix;
  const coverage = profile.effectCoverage;
  const dodgeShare =
    abilities.dodgeEveryNthShot === undefined ? 0 : 1 / abilities.dodgeEveryNthShot;
  const overTimeCoverage = coverage[EffectId.POISON] + coverage[EffectId.BURN];
  const overTimeResistance =
    overTimeCoverage > 0
      ? (coverage[EffectId.POISON] * resistanceOf(abilities, EffectId.POISON) +
          coverage[EffectId.BURN] * resistanceOf(abilities, EffectId.BURN)) /
        overTimeCoverage
      : 1;
  const byShape =
    shapes[CreatureDamageShape.SINGLE] * (multipliers.single ?? 1) * (1 - dodgeShare) +
    shapes[CreatureDamageShape.SPLASH] * (multipliers.splash ?? 1) +
    shapes[CreatureDamageShape.CHAIN] * (multipliers.chain ?? 1) +
    shapes[CreatureDamageShape.DOT] * (multipliers.dot ?? 1) * overTimeResistance;
  const percentFactor =
    1 + profile.damageMix[DamageType.PERCENT] * ((multipliers.percent ?? 1) - 1);
  const vulnerability =
    1 +
    EFFECT_DEFINITIONS[EffectId.VULNERABILITY].magnitude *
      coverage[EffectId.VULNERABILITY] *
      V.CONTROL_UPTIME *
      resistanceOf(abilities, EffectId.VULNERABILITY);
  const armorBreak =
    1 +
    V.ARMOR_BREAK_DAMAGE_SHARE *
      coverage[EffectId.ARMOR_BREAK] *
      resistanceOf(abilities, EffectId.ARMOR_BREAK);
  return byShape * percentFactor * vulnerability * armorBreak;
}

/** Seconds the creature walks the exposure route: speed boosts shorten it, chill and stun stretch it. */
export function computeExposureSeconds(
  stats: CreatureGradeStats,
  abilities: CreatureAbilities,
  profile: DefenceProfile,
): number {
  const routeEnd = abilities.speedBoostLastRouteShare;
  const lowHealth = abilities.speedBoostBelowHpShare;
  const routeEndFactor = routeEnd
    ? 1 - routeEnd.routeShare + routeEnd.routeShare / routeEnd.speedMultiplier
    : 1;
  const lowHealthFactor = lowHealth
    ? 1 - lowHealth.hpShare + lowHealth.hpShare / lowHealth.speedMultiplier
    : 1;
  const coverage = profile.effectCoverage;
  const slow = Math.min(
    V.MAX_MEAN_SLOW,
    profile.chillSlow *
      coverage[EffectId.CHILL] *
      V.CONTROL_UPTIME *
      resistanceOf(abilities, EffectId.CHILL) +
      V.STUN_SLOW *
        coverage[EffectId.STUN] *
        V.CONTROL_UPTIME *
        resistanceOf(abilities, EffectId.STUN),
  );
  const walkSeconds =
    V.EXPOSURE_ROUTE_CELLS / (Math.max(0.01, stats.speed) * CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED);
  return (walkSeconds * routeEndFactor * lowHealthFactor) / (1 - slow);
}

/**
 * Share of the time under fire that start invisibility hides: the cells it
 * walks unseen (at its own speed; nothing slows what cannot be targeted) past
 * the approach before the first tower's reach, over the route cells in reach,
 * capped at `MAX_INVISIBLE_SHARE`. A window that ends before the first reach
 * is worth nothing.
 */
export function computeInvisibleExposureShare(
  stats: Pick<CreatureGradeStats, 'speed'>,
  abilities: CreatureAbilities,
): number {
  const invisibleSeconds = (abilities.startInvisibleMs ?? 0) / MS_PER_SECOND;
  const unseenCells =
    invisibleSeconds * Math.max(0, stats.speed) * CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED;
  const hiddenCellsInReach = Math.max(0, unseenCells - V.INVISIBLE_APPROACH_CELLS);
  return Math.min(V.MAX_INVISIBLE_SHARE, hiddenCellsInReach / V.INVISIBLE_ROUTE_CELLS_IN_REACH);
}

/** Health points the creature soaks beyond its own: shield refills, regeneration, a second life. */
function computeExtraLandedHealth(
  health: number,
  abilities: CreatureAbilities,
  profile: DefenceProfile,
  exposureSeconds: number,
): number {
  const shield = abilities.shieldHp ?? 0;
  const refills =
    shield > 0 && abilities.shieldRechargeMs !== undefined
      ? ((exposureSeconds * MS_PER_SECOND) / abilities.shieldRechargeMs) *
        V.SHIELD_REFILLS_PER_RECHARGE_PERIOD
      : 0;
  const regenShare =
    abilities.regenPausedByPoison === true && profile.effectCoverage[EffectId.POISON] > 0
      ? V.POISON_PAUSED_REGEN_SHARE
      : 1;
  const regen = (abilities.healthRegenPerSecond ?? 0) * exposureSeconds * regenShare;
  const secondLife = (abilities.secondLife?.hpShare ?? 0) * health;
  return shield * (1 + refills) + regen + secondLife;
}

/** Gold one send effectively costs once free sends, leak gold and kill penalties pay back. */
export function computeEffectiveSendCost(sendCost: number, abilities: CreatureAbilities): number {
  const freeShare = abilities.freeNthSend === undefined ? 0 : 1 / abilities.freeNthSend;
  const goldBack =
    (abilities.leakGoldToSender ?? 0) * V.EXPECTED_LEAK_SHARE +
    (abilities.killGoldPenaltyToDefender ?? 0) * (1 - V.EXPECTED_LEAK_SHARE);
  return Math.max(V.MIN_EFFECTIVE_COST_SHARE * sendCost, sendCost * (1 - freeShare) - goldBack);
}

/**
 * Pressure value of one send per gold: the defender's raw damage it takes to
 * kill the creature (armor through the combat rule, every life and pool it
 * soaks), scaled by how much less time it spends under fire than a reference
 * creep and by the lives a leak takes, over its effective price. `coarse`
 * reads the four stats only.
 */
export function computeCreatureValue(input: CreatureValueInput): number {
  const { stats, profile } = input;
  const abilities: CreatureAbilities =
    input.valuation === CreatureValuation.FULL ? (stats.abilities ?? {}) : {};
  const health = stats.health * input.healthMultiplier;
  if (health <= 0 || input.sendCost <= 0) {
    return 0;
  }
  const armoredHealth = computeMixedEffectiveHealth(
    { health, physicalArmor: stats.physicalArmor, magicalArmor: stats.magicalArmor },
    profile.damageMix,
  );
  const exposureSeconds = computeExposureSeconds(stats, abilities, profile);
  const landedHealth =
    health + computeExtraLandedHealth(health, abilities, profile, exposureSeconds);
  const rawPool =
    (landedHealth * (armoredHealth / health)) / computeIncomingDamageFactor(abilities, profile);
  const targetableSeconds = exposureSeconds * (1 - computeInvisibleExposureShare(stats, abilities));
  const livesFactor = 1 + ((abilities.leakLivesTaken ?? 1) - 1) * V.EXPECTED_LEAK_SHARE;
  return (
    (rawPool * (REFERENCE_EXPOSURE_SECONDS / targetableSeconds) * livesFactor) /
    computeEffectiveSendCost(input.sendCost, abilities)
  );
}
