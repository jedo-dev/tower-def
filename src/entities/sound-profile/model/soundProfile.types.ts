import type { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type {
  SoundId,
  SoundSlot,
  SoundSlotSet,
  TowerSoundSet,
} from '../../../shared/types/sound-ids';

/**
 * Authored sound profile contract (`src/content/audio`).
 *
 * `default.json` is the complete fallback: it must name a sound for every
 * slot. Each race file may set race-wide sounds and per-archetype tower sounds;
 * whatever it leaves out falls back to the default profile.
 */
export const SOUND_PROFILE_SCHEMA_VERSION = 1;

/** Per-archetype tower sounds, e.g. `{ "frost": { "attack": "..." } }`. */
export type ArchetypeSoundSets = Partial<Record<TowerTypeId, TowerSoundSet>>;

export type RaceSoundProfile = {
  race: RaceId;
  sounds: SoundSlotSet;
  archetypes: ArchetypeSoundSets;
};

export type DefaultSoundProfile = {
  sounds: Record<SoundSlot, SoundId>;
  archetypes: ArchetypeSoundSets;
};

export type SoundProfileLibrary = {
  defaultProfile: DefaultSoundProfile;
  races: Record<RaceId, RaceSoundProfile>;
};

export const DEFAULT_SOUND_PROFILE_FILE_KEYS: readonly string[] = [
  'schemaVersion',
  'sounds',
  'archetypes',
];

export const RACE_SOUND_PROFILE_FILE_KEYS: readonly string[] = [
  'schemaVersion',
  'race',
  'sounds',
  'archetypes',
];

/** Entity label used in validation messages for the default profile. */
export const DEFAULT_SOUND_PROFILE_ENTITY_ID = 'default';
