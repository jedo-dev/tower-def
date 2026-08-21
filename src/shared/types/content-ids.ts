export enum RaceId {
  UNDEAD = 'UNDEAD',
  ORC = 'ORC',
  HUMAN = 'HUMAN',
  ELF = 'ELF',
}

export const RACE_IDS: readonly RaceId[] = [
  RaceId.UNDEAD,
  RaceId.ORC,
  RaceId.HUMAN,
  RaceId.ELF,
] as const;

export const TowerTypeId = {
  SINGLE: 'single',
  SPLASH: 'splash',
  FROST: 'frost',
  POISON: 'poison',
} as const;

export type TowerTypeId = (typeof TowerTypeId)[keyof typeof TowerTypeId];

export const TOWER_TYPE_IDS: readonly TowerTypeId[] = [
  TowerTypeId.SINGLE,
  TowerTypeId.SPLASH,
  TowerTypeId.FROST,
  TowerTypeId.POISON,
] as const;

/**
 * How an archetype delivers its damage. Archetypes differ by stats and on-hit
 * effects; the attack kind is what the combat runtime dispatches on, so adding
 * a frost tower does not mean adding a branch.
 */
export const TowerAttackKind = {
  SINGLE_TARGET: 'single-target',
  SPLASH: 'splash',
} as const;

export type TowerAttackKind = (typeof TowerAttackKind)[keyof typeof TowerAttackKind];

export const TOWER_ATTACK_KINDS: readonly TowerAttackKind[] = [
  TowerAttackKind.SINGLE_TARGET,
  TowerAttackKind.SPLASH,
] as const;

export const CreepTypeId = {
  BASIC: 'basic',
} as const;

export type CreepTypeId = (typeof CreepTypeId)[keyof typeof CreepTypeId];

export const CREEP_TYPE_IDS: readonly CreepTypeId[] = [CreepTypeId.BASIC] as const;

/** How a creature travels the path. Ground creatures can be blocked by terrain rules, air ones read differently to towers. */
export const UnitMoveType = {
  GROUND: 'ground',
  AIR: 'air',
} as const;

export type UnitMoveType = (typeof UnitMoveType)[keyof typeof UnitMoveType];

export const UNIT_MOVE_TYPES: readonly UnitMoveType[] = [
  UnitMoveType.GROUND,
  UnitMoveType.AIR,
] as const;

/** Silhouette of a creature, used for hit feedback scale and future splash rules. */
export const UnitSizeClass = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

export type UnitSizeClass = (typeof UnitSizeClass)[keyof typeof UnitSizeClass];

export const UNIT_SIZE_CLASSES: readonly UnitSizeClass[] = [
  UnitSizeClass.SMALL,
  UnitSizeClass.MEDIUM,
  UnitSizeClass.LARGE,
] as const;

/** Defense class a creature carries on top of its flat armor value. */
export const UnitArmorType = {
  UNARMORED: 'unarmored',
  LIGHT: 'light',
  HEAVY: 'heavy',
} as const;

export type UnitArmorType = (typeof UnitArmorType)[keyof typeof UnitArmorType];

export const UNIT_ARMOR_TYPES: readonly UnitArmorType[] = [
  UnitArmorType.UNARMORED,
  UnitArmorType.LIGHT,
  UnitArmorType.HEAVY,
] as const;

/** Timed effects a tower can put on a creep. */
export const EffectId = {
  CHILL: 'chill',
  POISON: 'poison',
  BURN: 'burn',
  STUN: 'stun',
  ARMOR_BREAK: 'armor_break',
} as const;

export type EffectId = (typeof EffectId)[keyof typeof EffectId];

export const EFFECT_IDS: readonly EffectId[] = [
  EffectId.CHILL,
  EffectId.POISON,
  EffectId.BURN,
  EffectId.STUN,
  EffectId.ARMOR_BREAK,
] as const;

/** What part of the creep an effect acts on. */
export const EffectKind = {
  MOVEMENT: 'movement',
  DAMAGE_OVER_TIME: 'damage-over-time',
  DEFENSE: 'defense',
} as const;

export type EffectKind = (typeof EffectKind)[keyof typeof EffectKind];

/** What happens when an effect is applied to a creep that already has it. */
export const EffectStackingRule = {
  /** Reset the timer, keep one instance. */
  REFRESH: 'refresh',
  /** Add a stack up to the cap, each stack contributing its magnitude. */
  STACK: 'stack',
  /** Keep whichever application is stronger and drop the other. */
  STRONGEST: 'strongest',
} as const;

export type EffectStackingRule = (typeof EffectStackingRule)[keyof typeof EffectStackingRule];

declare const modifierIdBrand: unique symbol;

export type ModifierId = string & { readonly [modifierIdBrand]: 'ModifierId' };

export function createModifierId(value: string): ModifierId {
  return value as ModifierId;
}

export function isRaceId(value: string): value is RaceId {
  return (RACE_IDS as readonly string[]).includes(value);
}

export function isTowerTypeId(value: string): value is TowerTypeId {
  return (TOWER_TYPE_IDS as readonly string[]).includes(value);
}

export function isCreepTypeId(value: string): value is CreepTypeId {
  return (CREEP_TYPE_IDS as readonly string[]).includes(value);
}

export function isEffectId(value: string): value is EffectId {
  return (EFFECT_IDS as readonly string[]).includes(value);
}
