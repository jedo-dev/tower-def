import {
  RACE_IDS,
  RaceId,
  UNIT_ARMOR_TYPES,
  UNIT_MOVE_TYPES,
  UNIT_SIZE_CLASSES,
} from '../../../../shared/types/content-ids';
import {
  ContentValidationError,
  assertKnownKeys,
  assertSchemaVersion,
  readArray,
  readIntegerFrom,
  readNumber,
  readOptionalString,
  readRecord,
  readString,
  readStringFrom,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import { UNIT_IDS, UNIT_TIERS, type UnitConfig, type UnitId } from '../types';
import {
  UNIT_CONTENT_FILE_KEYS,
  UNIT_CONTENT_OPTIONAL_KEYS,
  UNIT_CONTENT_REQUIRED_KEYS,
  UNIT_CONTENT_SCHEMA_VERSION,
  UNIT_STAT_BOUNDS,
  UNIT_TRAIT_DEFAULTS,
  type UnitTraits,
} from './unitContent.types';

export type UnitContentSource = {
  /** Authored file path, used verbatim in validation errors. */
  file: string;
  data: unknown;
};

const ENTRY_KEYS: readonly string[] = [
  ...UNIT_CONTENT_REQUIRED_KEYS,
  ...UNIT_CONTENT_OPTIONAL_KEYS,
];

function parseTraits(entry: Record<string, unknown>, location: ContentLocation): UnitTraits {
  return {
    moveType: entry.moveType === undefined
      ? UNIT_TRAIT_DEFAULTS.moveType
      : readStringFrom(entry, 'moveType', location, UNIT_MOVE_TYPES),
    sizeClass: entry.sizeClass === undefined
      ? UNIT_TRAIT_DEFAULTS.sizeClass
      : readStringFrom(entry, 'sizeClass', location, UNIT_SIZE_CLASSES),
    armorType: entry.armorType === undefined
      ? UNIT_TRAIT_DEFAULTS.armorType
      : readStringFrom(entry, 'armorType', location, UNIT_ARMOR_TYPES),
  };
}

function parseUnitEntry(
  rawEntry: unknown,
  fileLocation: ContentLocation,
  race: RaceId,
): UnitConfig {
  const entry = readRecord(rawEntry, fileLocation);
  const id = readStringFrom(entry, 'id', fileLocation, UNIT_IDS);
  const location: ContentLocation = { file: fileLocation.file, entityId: id };

  assertKnownKeys(entry, ENTRY_KEYS, location);

  if (!id.startsWith(`${race.toLowerCase()}_`)) {
    throw new ContentValidationError(location, `id does not belong to race ${race}`);
  }

  return {
    id,
    name: readString(entry, 'name', location),
    faction: race,
    tier: readIntegerFrom(entry, 'tier', location, UNIT_TIERS),
    health: readNumber(entry, 'health', location, UNIT_STAT_BOUNDS.health),
    speed: readNumber(entry, 'speed', location, UNIT_STAT_BOUNDS.speed),
    armor: readNumber(entry, 'armor', location, UNIT_STAT_BOUNDS.armor),
    damage: readNumber(entry, 'damage', location, UNIT_STAT_BOUNDS.damage),
    rewardGold: readNumber(entry, 'rewardGold', location, UNIT_STAT_BOUNDS.rewardGold),
    spriteKey: readString(entry, 'spriteKey', location),
    description: readOptionalString(entry, 'description', location),
    ...parseTraits(entry, location),
  };
}

/** Validates one authored race file and returns its creatures. */
export function parseUnitContentFile(source: UnitContentSource): UnitConfig[] {
  const location: ContentLocation = { file: source.file };
  const file = readRecord(source.data, location);

  assertKnownKeys(file, UNIT_CONTENT_FILE_KEYS, location);
  assertSchemaVersion(file, UNIT_CONTENT_SCHEMA_VERSION, location);

  const race = readStringFrom(file, 'race', location, RACE_IDS);
  const rawUnits = readArray(file, 'units', location);

  if (rawUnits.length === 0) {
    throw new ContentValidationError(location, 'file declares no units');
  }

  const units = rawUnits.map((rawEntry) => parseUnitEntry(rawEntry, location, race));
  const seenIds = new Set<UnitId>();

  for (const unit of units) {
    if (seenIds.has(unit.id)) {
      throw new ContentValidationError({ file: source.file, entityId: unit.id }, 'duplicate unit id');
    }
    seenIds.add(unit.id);
  }

  return units;
}

/**
 * Validates every authored race file and returns the full roster. Runs once at
 * module init, never inside the game loop.
 */
export function loadUnitContent(sources: readonly UnitContentSource[]): UnitConfig[] {
  const units: UnitConfig[] = [];
  const fileByUnitId = new Map<UnitId, string>();

  for (const source of sources) {
    for (const unit of parseUnitContentFile(source)) {
      const existingFile = fileByUnitId.get(unit.id);

      if (existingFile !== undefined) {
        throw new ContentValidationError(
          { file: source.file, entityId: unit.id },
          `duplicate unit id, already declared in ${existingFile}`,
        );
      }

      fileByUnitId.set(unit.id, source.file);
      units.push(unit);
    }
  }

  return units;
}
