import {
  ContentValidationError,
  assertSchemaVersion,
  findFirstEntityId,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import {
  UNIT_CONTENT_NO_TALENTS_SCHEMA_VERSION,
  UNIT_CONTENT_SCHEMA_VERSION,
  UNIT_CONTENT_SINGLE_ARMOR_SCHEMA_VERSION,
} from './unitContent.types';

function locateFirstUnit(
  file: Record<string, unknown>,
  location: ContentLocation,
): ContentLocation {
  const entityId = findFirstEntityId(file, 'units');
  return entityId === undefined ? location : { ...location, entityId };
}

/**
 * Version 1 creature files carry one `armor` plus an `armorType` bonus, version
 * 3 files have no talent branches. Loading either would leave fields unset, so
 * it fails naming the file and its first creature, with the steps to migrate.
 */
export function assertUnitSchemaVersion(
  file: Record<string, unknown>,
  location: ContentLocation,
): void {
  if (file.schemaVersion === UNIT_CONTENT_NO_TALENTS_SCHEMA_VERSION) {
    throw new ContentValidationError(
      locateFirstUnit(file, location),
      `schemaVersion ${UNIT_CONTENT_NO_TALENTS_SCHEMA_VERSION} has no talent branches; add ` +
        '"talentBranches" (two branches, grades 1-4, see docs/08 "Creature talents") to every ' +
        `creature and set schemaVersion ${UNIT_CONTENT_SCHEMA_VERSION}`,
    );
  }

  if (file.schemaVersion === UNIT_CONTENT_SINGLE_ARMOR_SCHEMA_VERSION) {
    throw new ContentValidationError(
      locateFirstUnit(file, location),
      `schemaVersion ${UNIT_CONTENT_SINGLE_ARMOR_SCHEMA_VERSION} has a single "armor" and an "armorType"; ` +
        'replace them with "physicalArmor" and "magicalArmor" (whole points, armor plus the old ' +
        `armorType bonus: unarmored -1, light 0, heavy 2), add "talentBranches" to every creature ` +
        `and set schemaVersion ${UNIT_CONTENT_SCHEMA_VERSION}`,
    );
  }

  assertSchemaVersion(file, UNIT_CONTENT_SCHEMA_VERSION, location);
}
