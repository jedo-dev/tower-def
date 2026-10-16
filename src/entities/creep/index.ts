export type {
  ActiveEffect,
  CreepCombatTraits,
  CreepEntity,
  CreepId,
  CreepLifeState,
  CreepSenderSide,
  CreepStatus,
  CreepType,
} from './model/types';
export { DEFAULT_CREEP_COMBAT_TRAITS } from './model/types';
export {
  applyEffectToCreep,
  findActiveEffect,
  getActiveEffects,
  getEffectiveSpeedMultiplier,
  hasEffectDamage,
  removeEffectFromCreep,
  resolveActiveEffectDamageType,
  tickCreepEffects,
} from './model/effects';
export type { ApplyEffectInput, CreepEffectTickResult, EffectDamageByType } from './model/effects';
export {
  applyDamageToCreep,
  armorKindCovers,
  calculateMitigatedDamage,
  getArmorDamageMultiplier,
  getEffectiveArmor,
  getVulnerabilityMultiplier,
  resolveIncomingDamage,
  type CreepArmorKind,
} from './model/damage';
export { filterActiveWaveCreeps } from './model/runtime';
export { isCreepAlive, isCreepDead, setCreepLifeState } from './model/lifeState';
export type { ApplyCreepDamageResult } from './model/damage';
export {
  getCreepFootprintCenter,
  getCreepFootprintCenterOffsetInCells,
} from './model/footprintCenter';
export type { CreepAbilityRuntime } from './model/types';
export {
  createCreepAbilityRuntime,
  getAbilitySpeedMultiplier,
  getCreepLeakLives,
  getEffectResistanceMultiplier,
  isCreepHidden,
  tickCreepAbilities,
} from './model/abilities';
export { getIncomingDamageMultiplier } from './model/abilityDamage';
