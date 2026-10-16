import { ARMOR_BOUNDS, DAMAGE_MITIGATION, PERCENT_DAMAGE } from '../../../shared/constants/damage';
import { resolveEffectArmorKind } from '../../../shared/constants/effects';
import { ArmorKind, DamageType, EffectId } from '../../../shared/types/content-ids';
import { getActiveEffects } from './effects';
import { isCreepAlive, setCreepLifeState } from './lifeState';
import type { CreepEntity } from './types';

export type ApplyCreepDamageResult = {
  creep: CreepEntity;
  damageApplied: number;
  killed: boolean;
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

    if (armorKindCovers(resolveEffectArmorKind(effect.id), kind)) {
      armorBreak += effect.magnitude * effect.stacks;
    }
  }

  return clampArmor(readAuthoredArmor(creep, kind) - armorBreak);
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

/**
 * Damage a hit of `damageType` deals to the creep before hit points are
 * touched: physical and magical hits are mitigated by the matching armor,
 * percent hits take `damage / PERCENT_DAMAGE.healthShareDivisor` of maximum
 * health and ignore armor.
 */
export function resolveIncomingDamage(
  creep: CreepEntity,
  incomingDamage: number,
  damageType: DamageType,
): number {
  if (incomingDamage <= 0) {
    return 0;
  }

  if (damageType === DamageType.PERCENT) {
    const maxHp = creep.maxHp ?? creep.hp;
    return (incomingDamage / PERCENT_DAMAGE.healthShareDivisor) * maxHp;
  }

  const armorKind = damageType === DamageType.PHYSICAL ? ArmorKind.PHYSICAL : ArmorKind.MAGICAL;

  return calculateMitigatedDamage(incomingDamage, getEffectiveArmor(creep, armorKind));
}

export function applyDamageToCreep(
  creep: CreepEntity,
  incomingDamage: number,
  damageType: DamageType,
): ApplyCreepDamageResult {
  if (!isCreepAlive(creep)) {
    return {
      creep,
      damageApplied: 0,
      killed: false,
    };
  }

  const normalizedDamage = Math.max(0, resolveIncomingDamage(creep, incomingDamage, damageType));

  if (normalizedDamage === 0) {
    return {
      creep,
      damageApplied: 0,
      killed: false,
    };
  }

  const nextHp = Math.max(0, creep.hp - normalizedDamage);
  const damagedCreep: CreepEntity = {
    ...creep,
    hp: nextHp,
  };

  if (nextHp > 0) {
    return {
      creep: damagedCreep,
      damageApplied: Math.min(normalizedDamage, creep.hp),
      killed: false,
    };
  }

  return {
    creep: setCreepLifeState(damagedCreep, 'dead'),
    damageApplied: Math.min(normalizedDamage, creep.hp),
    killed: true,
  };
}
