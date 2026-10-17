import {
  ContentValidationError,
  assertSchemaVersion,
  findFirstEntityId,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import {
  UNIT_CONTENT_NO_SOUNDS_SCHEMA_VERSION,
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

/** The first creature of a version 4 file that already authors `sounds`, if any. */
function findUnitWithSounds(file: Record<string, unknown>): string | undefined {
  const units = Array.isArray(file.units) ? (file.units as unknown[]) : [];

  for (const unit of units) {
    if (typeof unit === 'object' && unit !== null && 'sounds' in unit) {
      const id = (unit as Record<string, unknown>).id;
      return typeof id === 'string' ? id : '';
    }
  }
  return undefined;
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

/**
 * Brings an older but still readable creature file up to the current schema.
 * A version 4 file is a version 5 file without creature `sounds`, so it is
 * upgraded as is; a version 4 file that already authors `sounds` fails, since
 * its author meant the new format and forgot the bump. Every other version
 * goes through `assertUnitSchemaVersion`.
 */
export function migrateUnitContentFile(
  file: Record<string, unknown>,
  location: ContentLocation,
): Record<string, unknown> {
  if (file.schemaVersion !== UNIT_CONTENT_NO_SOUNDS_SCHEMA_VERSION) {
    assertUnitSchemaVersion(file, location);
    return file;
  }

  const unitWithSounds = findUnitWithSounds(file);
  if (unitWithSounds !== undefined) {
    throw new ContentValidationError(
      { ...location, entityId: unitWithSounds },
      `"sounds" needs schemaVersion ${UNIT_CONTENT_SCHEMA_VERSION}; this file declares ` +
        `schemaVersion ${UNIT_CONTENT_NO_SOUNDS_SCHEMA_VERSION}`,
    );
  }

  return { ...file, schemaVersion: UNIT_CONTENT_SCHEMA_VERSION };
}
