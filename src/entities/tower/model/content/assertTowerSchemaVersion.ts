import {
  ContentValidationError,
  assertSchemaVersion,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import {
  TOWER_CONTENT_COARSE_GRID_SCHEMA_VERSION,
  TOWER_CONTENT_SCHEMA_VERSION,
} from './towerContent.types';

/** First entity id of a file, so a stale file names a concrete tower to migrate. */
function findFirstEntityId(file: Record<string, unknown>, listKey: string): string | undefined {
  const list = file[listKey];

  if (!Array.isArray(list)) {
    return undefined;
  }

  const [first] = list as unknown[];

  if (typeof first !== 'object' || first === null) {
    return undefined;
  }

  const id = (first as Record<string, unknown>).id;

  return typeof id === 'string' && id.trim() !== '' ? id : undefined;
}

/**
 * Tower files measure distances in grid cells. Version 1 was authored for the
 * coarse 32px cell, so its ranges are physically twice as long as the same
 * number on the fine grid: loading it would silently halve every range.
 */
export function assertTowerSchemaVersion(
  file: Record<string, unknown>,
  listKey: string,
  location: ContentLocation,
): void {
  if (file.schemaVersion === TOWER_CONTENT_COARSE_GRID_SCHEMA_VERSION) {
    const entityId = findFirstEntityId(file, listKey);

    throw new ContentValidationError(
      entityId === undefined ? location : { ...location, entityId },
      `schemaVersion ${TOWER_CONTENT_COARSE_GRID_SCHEMA_VERSION} measures distances in coarse 32px cells; ` +
        `double every cell-measured value and set schemaVersion ${TOWER_CONTENT_SCHEMA_VERSION}`,
    );
  }

  assertSchemaVersion(file, TOWER_CONTENT_SCHEMA_VERSION, location);
}
