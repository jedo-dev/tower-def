import { DAMAGE_TYPES } from '../../../../shared/types/content-ids';
import {
  ContentValidationError,
  assertKnownKeys,
  readNumber,
  readRecord,
  readStringFrom,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import type { TowerGroundZone } from '../abilities';
import { TOWER_GROUND_ZONE_BOUNDS, TOWER_GROUND_ZONE_KEYS } from './towerAbilities.types';

/**
 * `abilities.groundZone` (tower-def-bge.9): the zone a shot leaves on the
 * ground. Undefined when absent. Every number is bounded; a zone must either
 * deal damage or slow, and a tick may not outlast the zone.
 */
export function parseGroundZone(
  abilities: Record<string, unknown>,
  location: ContentLocation,
): TowerGroundZone | undefined {
  if (abilities.groundZone === undefined) {
    return undefined;
  }

  const raw = readRecord(abilities.groundZone, location);
  assertKnownKeys(raw, TOWER_GROUND_ZONE_KEYS, location);

  const zone: TowerGroundZone = {
    radiusCells: readNumber(raw, 'radiusCells', location, TOWER_GROUND_ZONE_BOUNDS.radiusCells),
    durationMs: readNumber(raw, 'durationMs', location, TOWER_GROUND_ZONE_BOUNDS.durationMs),
    tickMs: readNumber(raw, 'tickMs', location, TOWER_GROUND_ZONE_BOUNDS.tickMs),
    damage: readNumber(raw, 'damage', location, TOWER_GROUND_ZONE_BOUNDS.damage),
    damageType: readStringFrom(raw, 'damageType', location, DAMAGE_TYPES),
    ...(raw.chill === undefined
      ? {}
      : { chill: readNumber(raw, 'chill', location, TOWER_GROUND_ZONE_BOUNDS.chill) }),
  };

  if (zone.damage === 0 && zone.chill === undefined) {
    throw new ContentValidationError(location, '"groundZone" must deal damage or chill');
  }
  if (zone.tickMs > zone.durationMs) {
    throw new ContentValidationError(
      location,
      `"groundZone" tickMs (${zone.tickMs}) must not exceed its durationMs (${zone.durationMs})`,
    );
  }

  return zone;
}
