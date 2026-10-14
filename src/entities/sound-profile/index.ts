export {
  loadSoundProfiles,
  parseDefaultSoundProfile,
  parseRaceSoundProfile,
  type SoundProfileSource,
  type SoundProfileSources,
} from './model/loadSoundProfiles';
export { resolveCreepSound, resolveTowerSound } from './model/resolveSound';
export { SOUND_PROFILE_LIBRARY } from './model/soundProfileLibrary';
export { SOUND_PROFILE_SOURCES } from './model/soundProfileSources';
export {
  SOUND_PROFILE_SCHEMA_VERSION,
  type ArchetypeSoundSets,
  type DefaultSoundProfile,
  type RaceSoundProfile,
  type SoundProfileLibrary,
} from './model/soundProfile.types';
