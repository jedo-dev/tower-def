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
