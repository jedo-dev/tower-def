import {
  ContentValidationError,
  assertSchemaVersion,
  findFirstEntityId,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import {
  TOWER_CONTENT_BRANCHLESS_SCHEMA_VERSION,
  TOWER_CONTENT_COARSE_GRID_SCHEMA_VERSION,
  TOWER_CONTENT_SCHEMA_VERSION,
  TOWER_CONTENT_UNTYPED_DAMAGE_SCHEMA_VERSION,
} from './towerContent.types';

const ADD_TALENT_BRANCHES =
  'add "talentBranches" (two branches with grades 4-7, see docs/08-content-authoring.md) to every race tower';

/** How to bring a retired file up to date, keyed by its schema version. */
const RETIRED_VERSION_MIGRATIONS: Readonly<Record<number, string>> = {
  [TOWER_CONTENT_COARSE_GRID_SCHEMA_VERSION]:
    `schemaVersion ${TOWER_CONTENT_COARSE_GRID_SCHEMA_VERSION} measures distances in coarse 32px cells; ` +
    `double every cell-measured value, add a "damageType" to every archetype, ${ADD_TALENT_BRANCHES} ` +
    `and set schemaVersion ${TOWER_CONTENT_SCHEMA_VERSION}`,
  [TOWER_CONTENT_UNTYPED_DAMAGE_SCHEMA_VERSION]:
    `schemaVersion ${TOWER_CONTENT_UNTYPED_DAMAGE_SCHEMA_VERSION} has no damage types; ` +
    `add a "damageType" (physical, magical or percent) to every archetype, ${ADD_TALENT_BRANCHES} ` +
    `and set schemaVersion ${TOWER_CONTENT_SCHEMA_VERSION}`,
  [TOWER_CONTENT_BRANCHLESS_SCHEMA_VERSION]:
    `schemaVersion ${TOWER_CONTENT_BRANCHLESS_SCHEMA_VERSION} has no talent branches; ` +
    `${ADD_TALENT_BRANCHES} (the archetype file needs no other change) ` +
    `and set schemaVersion ${TOWER_CONTENT_SCHEMA_VERSION}`,
};

/**
 * Tower files measure distances in grid cells, type their damage and give race
 * towers talent branches. Version 1 was authored for the coarse 32px cell
 * (loading it would silently halve every range); version 2 predates damage
 * types; version 3 predates talent branches. Each fails naming the file and its
 * first tower, with the steps to migrate.
 */
export function assertTowerSchemaVersion(
  file: Record<string, unknown>,
  listKey: string,
  location: ContentLocation,
): void {
  const migration =
    typeof file.schemaVersion === 'number'
      ? RETIRED_VERSION_MIGRATIONS[file.schemaVersion]
      : undefined;

  if (migration !== undefined) {
    const entityId = findFirstEntityId(file, listKey);

    throw new ContentValidationError(
      entityId === undefined ? location : { ...location, entityId },
      migration,
    );
  }

  assertSchemaVersion(file, TOWER_CONTENT_SCHEMA_VERSION, location);
}
