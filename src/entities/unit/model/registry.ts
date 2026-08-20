import type { UnitConfig, UnitId } from './types';
import { undeadUnits } from './config/undead';
import { orcUnits } from './config/orc';
import { humanUnits } from './config/human';
import { elfUnits } from './config/elf';

const ALL_UNITS: readonly UnitConfig[] = [
  ...undeadUnits,
  ...orcUnits,
  ...humanUnits,
  ...elfUnits,
];

const UNIT_BY_ID = new Map<UnitId, UnitConfig>(
  ALL_UNITS.map((unit) => [unit.id, unit]),
);

export function resolveUnitConfigById(unitId: UnitId): UnitConfig {
  const config = UNIT_BY_ID.get(unitId);
  if (!config) {
    throw new Error(`Missing unit config for id: ${unitId}`);
  }
  return config;
}

export function tryResolveUnitConfigById(unitId: UnitId): UnitConfig | undefined {
  return UNIT_BY_ID.get(unitId);
}

export function getAllUnitConfigs(): readonly UnitConfig[] {
  return ALL_UNITS;
}

export function getUnitsByFaction(faction: UnitConfig['faction']): readonly UnitConfig[] {
  return ALL_UNITS.filter((unit) => unit.faction === faction);
}
