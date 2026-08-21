export type {
  CreepCombatTraits,
  CreepEntity,
  CreepId,
  CreepLifeState,
  CreepStatus,
  CreepType,
} from './model/types';
export { DEFAULT_CREEP_COMBAT_TRAITS } from './model/types';
export { applyDamageToCreep } from './model/damage';
export { filterActiveWaveCreeps } from './model/runtime';
export { isCreepAlive, isCreepDead, setCreepLifeState } from './model/lifeState';
export type { ApplyCreepDamageResult } from './model/damage';
