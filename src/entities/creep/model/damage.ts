import { ARMOR_TYPE_BONUS, DAMAGE_MITIGATION } from '../../../shared/constants/damage';
import { EFFECT_BALANCE } from '../../../shared/constants/effects';
import { EffectId } from '../../../shared/types/content-ids';
import { getActiveEffects } from './effects';
import { isCreepAlive, setCreepLifeState } from './lifeState';
import type { CreepEntity } from './types';

export type ApplyCreepDamageResult = {
  creep: CreepEntity;
  damageApplied: number;
  killed: boolean;
};

export type ApplyCreepDamageOptions = {
  /**
   * Damage over time bypasses armor: poison and burn are the answer to heavy
   * creeps, direct fire is the answer to fast ones.
   */
  ignoreArmor?: boolean;
};

/**
 * Armor a creep effectively carries right now: its authored value, shifted by
 * its armor class and reduced by any armor break currently running on it.
 */
export function getEffectiveArmor(creep: CreepEntity): number {
  let armorBreak = 0;

  for (const effect of getActiveEffects(creep)) {
    if (effect.id === EffectId.ARMOR_BREAK) {
      armorBreak += effect.magnitude * effect.stacks;
    }
  }

  return Math.max(
    EFFECT_BALANCE.minimumArmor,
    creep.armor + ARMOR_TYPE_BONUS[creep.armorType] - armorBreak,
  );
}

/** See DAMAGE_MITIGATION for the formula and its intent. */
export function calculateMitigatedDamage(rawDamage: number, armor: number): number {
  if (rawDamage <= 0) {
    return 0;
  }

  if (armor <= 0) {
    return rawDamage;
  }

  const factor = armor * DAMAGE_MITIGATION.armorDamageReductionPerPoint;
  const mitigated = rawDamage * (1 - factor / (1 + factor));

  return Math.max(rawDamage * DAMAGE_MITIGATION.minimumDamageFraction, mitigated);
}

export function applyDamageToCreep(
  creep: CreepEntity,
  incomingDamage: number,
  options?: ApplyCreepDamageOptions,
): ApplyCreepDamageResult {
  if (!isCreepAlive(creep)) {
    return {
      creep,
      damageApplied: 0,
      killed: false,
    };
  }

  const mitigatedDamage = options?.ignoreArmor
    ? incomingDamage
    : calculateMitigatedDamage(incomingDamage, getEffectiveArmor(creep));
  const normalizedDamage = Math.max(0, mitigatedDamage);

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
