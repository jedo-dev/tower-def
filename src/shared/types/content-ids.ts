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
  ARCHER: 'archer',
  SPLASH: 'splash',
} as const;

export type TowerTypeId = (typeof TowerTypeId)[keyof typeof TowerTypeId];

export const TOWER_TYPE_IDS: readonly TowerTypeId[] = [
  TowerTypeId.ARCHER,
  TowerTypeId.SPLASH,
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
