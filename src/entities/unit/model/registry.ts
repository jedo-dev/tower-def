import type { UnitConfig, UnitId } from './types';
import { loadUnitContent } from './content/loadUnitContent';
import { UNIT_CONTENT_SOURCES } from './content/unitContentSources';

/**
 * The roster is validated once, here, at module init: a malformed content file
 * throws before the first scene is created rather than mid-wave.
 */
const ALL_UNITS: readonly UnitConfig[] = loadUnitContent(UNIT_CONTENT_SOURCES);

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

/** Mutable roster copy for callers that own and reorder their own list. */
export function selectFactionRoster(faction: UnitConfig['faction']): UnitConfig[] {
  return ALL_UNITS.filter((unit) => unit.faction === faction);
}
