export {
  loadSoundProfiles,
  parseDefaultSoundProfile,
  parseRaceSoundProfile,
  type SoundProfileSource,
  type SoundProfileSources,
} from './model/loadSoundProfiles';
export {
  createCreepSoundTable,
  resolveCreepSound,
  resolveTowerSound,
  type ResolvedCreepSounds,
  type SoundingCreature,
} from './model/resolveSound';
export { SOUND_PROFILE_LIBRARY } from './model/soundProfileLibrary';
export { SOUND_PROFILE_SOURCES } from './model/soundProfileSources';
export {
  SOUND_PROFILE_SCHEMA_VERSION,
  type ArchetypeSoundSets,
  type DefaultSoundProfile,
  type RaceSoundProfile,
  type SoundProfileLibrary,
} from './model/soundProfile.types';
