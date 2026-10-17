import {
  RACE_IDS,
  RaceId,
  UNIT_MOVE_TYPES,
  UNIT_SIZE_CLASSES,
} from '../../../../shared/types/content-ids';
import {
  CONTENT_LORE_MAX_LENGTH,
  ContentValidationError,
  assertKnownKeys,
  readArray,
  readBoundedInteger,
  readIntegerFrom,
  readNumber,
  readOptionalBoundedString,
  readOptionalString,
  readRecord,
  readString,
  readStringFrom,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import { readSoundSlotSet } from '../../../../shared/lib/content/soundSlotValidation';
import { CREEP_SOUND_SLOTS } from '../../../../shared/types/sound-ids';
import { UNIT_IDS, UNIT_TIERS, type UnitConfig, type UnitId } from '../types';
import {
  UNIT_CONTENT_FILE_KEYS,
  UNIT_CONTENT_OPTIONAL_KEYS,
  UNIT_CONTENT_REQUIRED_KEYS,
  UNIT_ARMOR_BOUNDS,
  UNIT_STAT_BOUNDS,
  UNIT_TRAIT_DEFAULTS,
  type UnitTraits,
} from './unitContent.types';
import { migrateUnitContentFile } from './assertUnitSchemaVersion';
import { parseCreatureTalentBranches } from './creatureTalentContent';
import { parseUnitAbilities } from './unitAbilityFields';

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
    moveType:
      entry.moveType === undefined
        ? UNIT_TRAIT_DEFAULTS.moveType
        : readStringFrom(entry, 'moveType', location, UNIT_MOVE_TYPES),
    sizeClass:
      entry.sizeClass === undefined
        ? UNIT_TRAIT_DEFAULTS.sizeClass
        : readStringFrom(entry, 'sizeClass', location, UNIT_SIZE_CLASSES),
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

  const abilities = parseUnitAbilities(entry, location);
  const sounds = readSoundSlotSet(entry, 'sounds', CREEP_SOUND_SLOTS, location);

  return {
    id,
    name: readString(entry, 'name', location),
    faction: race,
    tier: readIntegerFrom(entry, 'tier', location, UNIT_TIERS),
    health: readNumber(entry, 'health', location, UNIT_STAT_BOUNDS.health),
    speed: readNumber(entry, 'speed', location, UNIT_STAT_BOUNDS.speed),
    physicalArmor: readBoundedInteger(
      entry,
      'physicalArmor',
      location,
      UNIT_ARMOR_BOUNDS.physicalArmor,
    ),
    magicalArmor: readBoundedInteger(
      entry,
      'magicalArmor',
      location,
      UNIT_ARMOR_BOUNDS.magicalArmor,
    ),
    damage: readNumber(entry, 'damage', location, UNIT_STAT_BOUNDS.damage),
    rewardGold: readNumber(entry, 'rewardGold', location, UNIT_STAT_BOUNDS.rewardGold),
    spriteKey: readString(entry, 'spriteKey', location),
    description: readOptionalString(entry, 'description', location),
    lore: readOptionalBoundedString(entry, 'lore', location, CONTENT_LORE_MAX_LENGTH),
    ...parseTraits(entry, location),
    talentBranches: parseCreatureTalentBranches(entry, location, id),
    ...(abilities === undefined ? {} : { abilities }),
    ...(sounds === undefined ? {} : { sounds }),
  };
}

/** Validates one authored race file and returns its creatures. */
export function parseUnitContentFile(source: UnitContentSource): UnitConfig[] {
  const location: ContentLocation = { file: source.file };
  const authoredFile = readRecord(source.data, location);

  assertKnownKeys(authoredFile, UNIT_CONTENT_FILE_KEYS, location);
  const file = migrateUnitContentFile(authoredFile, location);

  const race = readStringFrom(file, 'race', location, RACE_IDS);
  const rawUnits = readArray(file, 'units', location);

  if (rawUnits.length === 0) {
    throw new ContentValidationError(location, 'file declares no units');
  }

  const units = rawUnits.map((rawEntry) => parseUnitEntry(rawEntry, location, race));
  const seenIds = new Set<UnitId>();

  for (const unit of units) {
    if (seenIds.has(unit.id)) {
      throw new ContentValidationError(
        { file: source.file, entityId: unit.id },
        'duplicate unit id',
      );
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
