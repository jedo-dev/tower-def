import { ARMOR_BOUNDS, DAMAGE_MITIGATION, PERCENT_DAMAGE } from '../../../shared/constants/damage';
import {
  resolveEffectArmorKind,
  resolveEffectDamageScope,
} from '../../../shared/constants/effects';
import {
  ArmorKind,
  DamageType,
  EffectId,
  damageScopeCovers,
} from '../../../shared/types/content-ids';
import type { CreatureDamageShape } from '../../../shared/types/creatureAbilities';
import {
  getShieldAbsorbedDamage,
  getIncomingDamageMultiplier,
  reviveForSecondLife,
} from './abilityDamage';
import { getActiveEffects } from './effectTicks';
import { isCreepAlive, setCreepLifeState } from './lifeState';
import type { CreepEntity } from './types';

export type ApplyCreepDamageResult = {
  creep: CreepEntity;
  damageApplied: number;
  killed: boolean;
  /** The hit was lethal but the creep used its `secondLife`; no kill was scored. */
  revived?: boolean;
};

/** The two armors a creep carries; percent damage reads neither. */
export type CreepArmorKind = typeof ArmorKind.PHYSICAL | typeof ArmorKind.MAGICAL;

function clampArmor(armor: number): number {
  return Math.min(ARMOR_BOUNDS.max, Math.max(ARMOR_BOUNDS.min, armor));
}

/** Whether an effect lowering `effectKind` armor touches the creep's `armor`. */
export function armorKindCovers(effectKind: ArmorKind, armor: CreepArmorKind): boolean {
  return effectKind === ArmorKind.BOTH || effectKind === armor;
}

function readAuthoredArmor(creep: CreepEntity, kind: CreepArmorKind): number {
  return kind === ArmorKind.PHYSICAL ? creep.physicalArmor : creep.magicalArmor;
}

/**
 * One armor a creep effectively carries right now: its authored value, reduced
 * by every armor break running on it that touches this armor, clamped to
 * `ARMOR_BOUNDS`.
 */
export function getEffectiveArmor(creep: CreepEntity, kind: CreepArmorKind): number {
  let armorBreak = 0;

  for (const effect of getActiveEffects(creep)) {
    if (effect.id !== EffectId.ARMOR_BREAK) {
      continue;
    }

    if (armorKindCovers(effect.armorKind ?? resolveEffectArmorKind(effect.id), kind)) {
      armorBreak += effect.magnitude * effect.stacks;
    }
  }

  return clampArmor(readAuthoredArmor(creep, kind) - armorBreak);
}

/**
 * Scale on incoming damage of `damageType` from every vulnerability running
 * on the creep whose scope covers that type: `1 + sum(magnitude * stacks)`.
 * Applied after armor, to hits and damage-over-time ticks alike.
 */
export function getVulnerabilityMultiplier(creep: CreepEntity, damageType: DamageType): number {
  let bonus = 0;

  for (const effect of getActiveEffects(creep)) {
    if (effect.id !== EffectId.VULNERABILITY) {
      continue;
    }

    if (damageScopeCovers(effect.damageScope ?? resolveEffectDamageScope(effect.id), damageType)) {
      bonus += effect.magnitude * effect.stacks;
    }
  }

  return 1 + bonus;
}

/**
 * Multiplier a hit is scaled by against `armor`; see DAMAGE_MITIGATION for the
 * curve. Positive armor removes a diminishing share, negative armor adds the
 * same share, and armor beyond `ARMOR_BOUNDS` counts as the bound.
 */
export function getArmorDamageMultiplier(armor: number): number {
  const clampedArmor = clampArmor(armor);
  const factor = Math.abs(clampedArmor) * DAMAGE_MITIGATION.armorDamageReductionPerPoint;
  const share = factor / (1 + factor);

  if (clampedArmor >= 0) {
    return Math.max(DAMAGE_MITIGATION.minimumDamageFraction, 1 - share);
  }

  return 1 + share;
}

/** See DAMAGE_MITIGATION for the formula and its intent. */
export function calculateMitigatedDamage(rawDamage: number, armor: number): number {
  if (rawDamage <= 0) {
    return 0;
  }

  return rawDamage * getArmorDamageMultiplier(armor);
}

/** Percent damage: `rawDamage / PERCENT_DAMAGE.healthShareDivisor` of maximum health, armor ignored. */
export function calculatePercentDamage(rawDamage: number, maxHp: number): number {
  if (rawDamage <= 0) {
    return 0;
  }

  return (rawDamage / PERCENT_DAMAGE.healthShareDivisor) * maxHp;
}

/** What one hit reads off its target: both armors and the health it spawned with. */
export type DamageTargetProfile = {
  physicalArmor: number;
  magicalArmor: number;
  maxHp: number;
};

/**
 * Damage a hit of `damageType` deals to a target with these armors and maximum
 * health: the rule combat applies, for estimates that have no creep entity
 * (the computer opponent reasons about creatures before they spawn).
 */
export function calculateDamageAgainst(
  rawDamage: number,
  damageType: DamageType,
  target: DamageTargetProfile,
): number {
  if (damageType === DamageType.PERCENT) {
    return calculatePercentDamage(rawDamage, target.maxHp);
  }

  const armor = damageType === DamageType.PHYSICAL ? target.physicalArmor : target.magicalArmor;

  return calculateMitigatedDamage(rawDamage, armor);
}

/**
 * Damage a hit of `damageType` deals to the creep before hit points are
 * touched: physical and magical hits are mitigated by the matching armor,
 * percent hits take `damage / PERCENT_DAMAGE.healthShareDivisor` of maximum
 * health and ignore armor. Vulnerabilities then scale the result.
 */
export function resolveIncomingDamage(
  creep: CreepEntity,
  incomingDamage: number,
  damageType: DamageType,
): number {
  if (incomingDamage <= 0) {
    return 0;
  }

  const vulnerability = getVulnerabilityMultiplier(creep, damageType);

  if (damageType === DamageType.PERCENT) {
    return calculatePercentDamage(incomingDamage, creep.maxHp ?? creep.hp) * vulnerability;
  }

  const armorKind = damageType === DamageType.PHYSICAL ? ArmorKind.PHYSICAL : ArmorKind.MAGICAL;

  return (
    calculateMitigatedDamage(incomingDamage, getEffectiveArmor(creep, armorKind)) * vulnerability
  );
}

/**
 * One hit or damage-over-time tick on a creep. `shape` says how the damage
 * arrived, for the creature's `incomingDamageMultipliers`; callers that omit
 * it get no shape multiplier. After armor and vulnerability, a shield absorbs
 * first; a lethal hit on a creep with an unused `secondLife` revives it
 * instead (`revived`, not `killed`).
 */
export function applyDamageToCreep(
  creep: CreepEntity,
  incomingDamage: number,
  damageType: DamageType,
  shape?: CreatureDamageShape,
): ApplyCreepDamageResult {
  if (!isCreepAlive(creep)) {
    return { creep, damageApplied: 0, killed: false };
  }

  const normalizedDamage =
    Math.max(0, resolveIncomingDamage(creep, incomingDamage, damageType)) *
    getIncomingDamageMultiplier(creep, damageType, shape);

  if (normalizedDamage === 0) {
    return { creep, damageApplied: 0, killed: false };
  }

  const absorbed = getShieldAbsorbedDamage(creep, normalizedDamage);
  const damageToHealth = normalizedDamage - absorbed;
  const nextHp = Math.max(0, creep.hp - damageToHealth);
  const damageApplied = Math.min(damageToHealth, creep.hp);
  const damagedCreep: CreepEntity = { ...creep, hp: nextHp };

  // Any damage restarts the recharge timer of a creep with a shield ability.
  if (creep.abilities?.shieldHp !== undefined) {
    damagedCreep.shieldHp = (creep.shieldHp ?? 0) - absorbed;
    damagedCreep.msSinceDamage = 0;
  }

  if (nextHp > 0) {
    return { creep: damagedCreep, damageApplied, killed: false };
  }

  const revived = reviveForSecondLife(damagedCreep);
  if (revived) {
    return { creep: revived, damageApplied, killed: false, revived: true };
  }

  return { creep: setCreepLifeState(damagedCreep, 'dead'), damageApplied, killed: true };
}
