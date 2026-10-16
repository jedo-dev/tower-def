import {
  ContentValidationError,
  assertSchemaVersion,
  findFirstEntityId,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import {
  UNIT_CONTENT_SCHEMA_VERSION,
  UNIT_CONTENT_SINGLE_ARMOR_SCHEMA_VERSION,
} from './unitContent.types';

/**
 * Version 1 creature files carry one `armor` plus an `armorType` bonus. Loading
 * one would leave both new armors unset, so it fails naming the file and its
 * first creature, with the steps to migrate.
 */
export function assertUnitSchemaVersion(
  file: Record<string, unknown>,
  location: ContentLocation,
): void {
  if (file.schemaVersion === UNIT_CONTENT_SINGLE_ARMOR_SCHEMA_VERSION) {
    const entityId = findFirstEntityId(file, 'units');

    throw new ContentValidationError(
      entityId === undefined ? location : { ...location, entityId },
      `schemaVersion ${UNIT_CONTENT_SINGLE_ARMOR_SCHEMA_VERSION} has a single "armor" and an "armorType"; ` +
        'replace them with "physicalArmor" and "magicalArmor" (whole points, armor plus the old ' +
        `armorType bonus: unarmored -1, light 0, heavy 2) and set schemaVersion ${UNIT_CONTENT_SCHEMA_VERSION}`,
    );
  }

  assertSchemaVersion(file, UNIT_CONTENT_SCHEMA_VERSION, location);
}
