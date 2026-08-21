export type {
  ActiveEffect,
  CreepCombatTraits,
  CreepEntity,
  CreepId,
  CreepLifeState,
  CreepStatus,
  CreepType,
} from './model/types';
export { DEFAULT_CREEP_COMBAT_TRAITS } from './model/types';
export {
  applyEffectToCreep,
  findActiveEffect,
  getActiveEffects,
  getEffectiveSpeedMultiplier,
  removeEffectFromCreep,
  tickCreepEffects,
} from './model/effects';
export type { ApplyEffectInput, CreepEffectTickResult } from './model/effects';
export { applyDamageToCreep } from './model/damage';
export { filterActiveWaveCreeps } from './model/runtime';
export { isCreepAlive, isCreepDead, setCreepLifeState } from './model/lifeState';
export type { ApplyCreepDamageResult } from './model/damage';
