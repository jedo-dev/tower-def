import { RACE_IDS, TOWER_TYPE_IDS, type RaceId } from '../../../shared/types/content-ids';
import {
  SOUND_SLOTS,
  TOWER_SOUND_SLOTS,
  type SoundId,
  type SoundSlot,
} from '../../../shared/types/sound-ids';
import {
  ContentValidationError,
  assertKnownKeys,
  assertSchemaVersion,
  readRecord,
  readStringFrom,
  type ContentLocation,
} from '../../../shared/lib/content/contentValidation';
import { readSoundSlotSet } from '../../../shared/lib/content/soundSlotValidation';
import {
  DEFAULT_SOUND_PROFILE_ENTITY_ID,
  DEFAULT_SOUND_PROFILE_FILE_KEYS,
  RACE_SOUND_PROFILE_FILE_KEYS,
  SOUND_PROFILE_SCHEMA_VERSION,
  type ArchetypeSoundSets,
  type DefaultSoundProfile,
  type RaceSoundProfile,
  type SoundProfileLibrary,
} from './soundProfile.types';

export type SoundProfileSource = {
  file: string;
  data: unknown;
};

export type SoundProfileSources = {
  defaultProfile: SoundProfileSource;
  races: readonly SoundProfileSource[];
};

function parseArchetypeSoundSets(
  file: Record<string, unknown>,
  location: ContentLocation,
): ArchetypeSoundSets {
  if (file.archetypes === undefined) {
    return {};
  }

  const rawArchetypes = readRecord(file.archetypes, location);
  assertKnownKeys(rawArchetypes, TOWER_TYPE_IDS, location);

  const archetypes: ArchetypeSoundSets = {};

  for (const archetype of TOWER_TYPE_IDS) {
    const archetypeLocation: ContentLocation = {
      file: location.file,
      entityId: `${location.entityId ?? ''}/${archetype}`,
    };
    const soundSet = readSoundSlotSet(
      rawArchetypes,
      archetype,
      TOWER_SOUND_SLOTS,
      archetypeLocation,
    );

    if (soundSet) {
      archetypes[archetype] = soundSet;
    }
  }

  return archetypes;
}

/** The default profile is the last fallback, so it must cover every slot. */
export function parseDefaultSoundProfile(source: SoundProfileSource): DefaultSoundProfile {
  const location: ContentLocation = {
    file: source.file,
    entityId: DEFAULT_SOUND_PROFILE_ENTITY_ID,
  };
  const file = readRecord(source.data, location);

  assertKnownKeys(file, DEFAULT_SOUND_PROFILE_FILE_KEYS, location);
  assertSchemaVersion(file, SOUND_PROFILE_SCHEMA_VERSION, location);

  const soundSet = readSoundSlotSet(file, 'sounds', SOUND_SLOTS, location) ?? {};
  const missing = SOUND_SLOTS.filter((slot) => soundSet[slot] === undefined);

  if (missing.length > 0) {
    throw new ContentValidationError(
      location,
      `the default profile must name a sound for every slot; missing: ${missing.join(', ')}`,
    );
  }

  return {
    sounds: soundSet as Record<SoundSlot, SoundId>,
    archetypes: parseArchetypeSoundSets(file, location),
  };
}

export function parseRaceSoundProfile(source: SoundProfileSource): RaceSoundProfile {
  const fileLocation: ContentLocation = { file: source.file };
  const file = readRecord(source.data, fileLocation);
  const race = readStringFrom(file, 'race', fileLocation, RACE_IDS);
  const location: ContentLocation = { file: source.file, entityId: race };

  assertKnownKeys(file, RACE_SOUND_PROFILE_FILE_KEYS, location);
  assertSchemaVersion(file, SOUND_PROFILE_SCHEMA_VERSION, location);

  return {
    race,
    sounds: readSoundSlotSet(file, 'sounds', SOUND_SLOTS, location) ?? {},
    archetypes: parseArchetypeSoundSets(file, location),
  };
}

/**
 * Validates every profile. Each race needs exactly one file: a race without a
 * profile would quietly sound like every other race.
 */
export function loadSoundProfiles(sources: SoundProfileSources): SoundProfileLibrary {
  const defaultProfile = parseDefaultSoundProfile(sources.defaultProfile);
  const races = new Map<RaceId, RaceSoundProfile>();
  const fileByRace = new Map<RaceId, string>();

  for (const source of sources.races) {
    const profile = parseRaceSoundProfile(source);
    const existingFile = fileByRace.get(profile.race);

    if (existingFile !== undefined) {
      throw new ContentValidationError(
        { file: source.file, entityId: profile.race },
        `duplicate race sound profile, already declared in ${existingFile}`,
      );
    }

    fileByRace.set(profile.race, source.file);
    races.set(profile.race, profile);
  }

  const missingRaces = RACE_IDS.filter((race) => !races.has(race));

  if (missingRaces.length > 0) {
    throw new ContentValidationError(
      { file: sources.defaultProfile.file },
      `missing race sound profiles for: ${missingRaces.join(', ')}`,
    );
  }

  return {
    defaultProfile,
    races: Object.fromEntries(races) as Record<RaceId, RaceSoundProfile>,
  };
}
