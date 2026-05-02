import { isCreepAlive, setCreepLifeState } from './lifeState';
import type { CreepEntity } from './types';

export type ApplyCreepDamageResult = {
  creep: CreepEntity;
  damageApplied: number;
  killed: boolean;
};

export function applyDamageToCreep(
  creep: CreepEntity,
  incomingDamage: number,
): ApplyCreepDamageResult {
  if (!isCreepAlive(creep)) {
    return {
      creep,
      damageApplied: 0,
      killed: false,
    };
  }

  const normalizedDamage = Math.max(0, incomingDamage);

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
